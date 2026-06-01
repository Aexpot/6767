import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logAdminAction } from '@/lib/admin-logger'

// GET - List all promocodes
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')

    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await query(`
      SELECT
        p.*,
        COUNT(pu.id) as total_uses,
        COALESCE(SUM(pu.discount_amount), 0) as total_discount
      FROM promocodes p
      LEFT JOIN promocode_uses pu ON p.id = pu.promocode_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching promocodes:', error)
    return NextResponse.json({ error: 'Failed to fetch promocodes' }, { status: 500 })
  }
}

// POST - Create promocode
export async function POST(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')

    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT id, is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = adminCheck.rows[0].id

    const body = await request.json()
    const { code, discount_type, discount_value, max_uses, expires_at } = body

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if code already exists
    const existing = await query('SELECT id FROM promocodes WHERE code = $1', [code])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Promocode already exists' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO promocodes (code, discount_type, discount_value, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, discount_type, discount_value, max_uses || null, expires_at || null]
    )

    await logAdminAction({
      admin_id: userId,
      action: 'promocode_create',
      entity_type: 'promocode',
      entity_id: result.rows[0].id,
      details: { code, discount_type, discount_value, max_uses, expires_at },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating promocode:', error)
    return NextResponse.json({ error: 'Failed to create promocode' }, { status: 500 })
  }
}

// PATCH - Update promocode
export async function PATCH(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')

    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT id, is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminId = adminCheck.rows[0].id
    const body = await request.json()
    const { id, is_active } = body

    const result = await query(
      'UPDATE promocodes SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [is_active, id]
    )

    await logAdminAction({
      admin_id: adminId,
      action: 'promocode_update',
      entity_type: 'promocode',
      entity_id: id,
      details: { is_active },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating promocode:', error)
    return NextResponse.json({ error: 'Failed to update promocode' }, { status: 500 })
  }
}

// DELETE - Delete promocode
export async function DELETE(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')
    const id = request.nextUrl.searchParams.get('id')

    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT id, is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminId = adminCheck.rows[0].id

    await query('DELETE FROM promocodes WHERE id = $1', [id])

    await logAdminAction({
      admin_id: adminId,
      action: 'promocode_delete',
      entity_type: 'promocode',
      entity_id: id,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promocode:', error)
    return NextResponse.json({ error: 'Failed to delete promocode' }, { status: 500 })
  }
}
