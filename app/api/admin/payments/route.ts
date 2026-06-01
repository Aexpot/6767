import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin'
import { query } from '@/lib/db'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function GET(request: NextRequest) {
  try {
    // Check admin access from .env
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    let sql = `
      SELECT
        p.*,
        json_build_object(
          'telegram_id', u.telegram_id,
          'username', u.username,
          'first_name', u.first_name
        ) as users,
        json_build_object(
          'id', s.id,
          'status', s.status,
          'subscription_plans', json_build_object(
            'name', sp.name,
            'duration_months', sp.duration_months,
            'price_rub', sp.price_rub
          )
        ) as subscriptions
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    `

    const params: any[] = []
    if (status) {
      sql += ` WHERE p.status = $1`
      params.push(status)
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM payments'
    const countParams: any[] = []
    if (status) {
      countSql += ' WHERE status = $1'
      countParams.push(status)
    }
    const countResult = await query(countSql, countParams)
    const total = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      payments: result.rows || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check admin access from .env
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { payment_id, status } = body

    if (!payment_id || !status) {
      return NextResponse.json({ error: 'payment_id and status are required' }, { status: 400 })
    }

    // Update payment status
    const updateResult = await query(
      `UPDATE payments
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, payment_id]
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = updateResult.rows[0]

    // If marking as completed, activate the subscription
    if (status === 'completed' && payment.subscription_id) {
      const subResult = await query(
        `SELECT s.*, sp.duration_months, sp.name
         FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.id = $1`,
        [payment.subscription_id]
      )

      if (subResult.rows.length > 0) {
        const plan = subResult.rows[0]
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months)

        await query(
          `UPDATE subscriptions
           SET status = 'active',
               started_at = NOW(),
               expires_at = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [expiresAt.toISOString(), payment.subscription_id]
        )

        // Provision VPN user in Remnawave
        if (isRemnawaveConfigured()) {
          try {
            const userResult = await query(
              'SELECT telegram_id FROM users WHERE id = $1',
              [payment.user_id]
            )
            if (userResult.rows.length > 0) {
              const devicesCount = Math.max(1, parseInt(plan.devices_count) || 1)
              await remnawave.createVpnUser(userResult.rows[0].telegram_id, plan.duration_months, devicesCount)
            }
          } catch (vpnError) {
            console.error('Admin payment confirm — Remnawave error:', vpnError)
          }
        }
      }
    }

    // Get updated payment with relations
    const fullPayment = await query(
      `SELECT
        p.*,
        json_build_object(
          'telegram_id', u.telegram_id,
          'username', u.username,
          'first_name', u.first_name
        ) as users,
        json_build_object(
          'id', s.id,
          'status', s.status,
          'subscription_plans', json_build_object(
            'name', sp.name
          )
        ) as subscriptions
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE p.id = $1`,
      [payment_id]
    )

    return NextResponse.json(fullPayment.rows[0])
  } catch (error) {
    console.error('Admin payment update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin access from .env
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const payment_id = searchParams.get('payment_id')

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id is required' }, { status: 400 })
    }

    // Delete payment
    const deleteResult = await query(
      'DELETE FROM payments WHERE id = $1 RETURNING *',
      [payment_id]
    )

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
      payment: deleteResult.rows[0]
    })
  } catch (error) {
    console.error('Admin payment delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
