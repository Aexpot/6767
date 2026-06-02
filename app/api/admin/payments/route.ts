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
        p.payment_id AS id,
        p.payment_id,
        p.user_id,
        p.status,
        p.provider AS payment_provider,
        p.provider AS payment_method,
        p.amount AS amount_rub,
        p.currency,
        p.description,
        p.created_at,
        p.updated_at,
        json_build_object(
          'telegram_id', u.telegram_id,
          'username', u.username,
          'first_name', u.first_name
        ) as users,
        json_build_object(
          'id', s.subscription_id,
          'status', CASE WHEN s.is_active AND s.end_date > NOW() THEN 'active' ELSE 'expired' END,
          'subscription_plans', json_build_object(
            'name', COALESCE(NULLIF(s.tariff_key, ''), 'Подписка'),
            'duration_months', s.duration_months,
            'price_rub', p.amount
          )
        ) as subscriptions
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM subscriptions
        WHERE user_id = p.user_id
        ORDER BY start_date DESC NULLS LAST, subscription_id DESC
        LIMIT 1
      ) s ON true
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
       WHERE payment_id = $2
       RETURNING *`,
      [status, payment_id]
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = updateResult.rows[0]

    // If marking as completed, activate the subscription
    if (status === 'completed' && payment.user_id) {
      const subResult = await query(
        `SELECT s.*, s.duration_months, COALESCE(NULLIF(s.tariff_key, ''), 'Подписка') AS name
         FROM subscriptions s
         WHERE s.user_id = $1
         ORDER BY s.start_date DESC NULLS LAST, s.subscription_id DESC
         LIMIT 1`,
        [payment.user_id]
      )

      if (subResult.rows.length > 0) {
        const plan = subResult.rows[0]
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months)

        await query(
          `UPDATE subscriptions
           SET is_active = TRUE,
               start_date = COALESCE(start_date, NOW()),
               end_date = $1
           WHERE subscription_id = $2`,
          [expiresAt.toISOString(), plan.subscription_id]
        )

        // Provision VPN user in Remnawave
        if (isRemnawaveConfigured()) {
          try {
            const userResult = await query(
              'SELECT telegram_id FROM users WHERE user_id = $1',
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
        p.payment_id AS id,
        p.payment_id,
        p.user_id,
        p.status,
        p.provider AS payment_provider,
        p.provider AS payment_method,
        p.amount AS amount_rub,
        p.currency,
        p.description,
        p.created_at,
        p.updated_at,
        json_build_object(
          'telegram_id', u.telegram_id,
          'username', u.username,
          'first_name', u.first_name
        ) as users,
        json_build_object(
          'id', s.subscription_id,
          'status', CASE WHEN s.is_active AND s.end_date > NOW() THEN 'active' ELSE 'expired' END,
          'subscription_plans', json_build_object(
            'name', COALESCE(NULLIF(s.tariff_key, ''), 'Подписка')
          )
        ) as subscriptions
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN subscriptions s ON s.user_id = p.user_id
      WHERE p.payment_id = $1
      ORDER BY s.start_date DESC NULLS LAST, s.subscription_id DESC
      LIMIT 1`,
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
      'DELETE FROM payments WHERE payment_id = $1 RETURNING *',
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
