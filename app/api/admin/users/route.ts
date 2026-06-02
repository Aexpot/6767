import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin'
import { query } from '@/lib/db'
import { logAdminAction } from '@/lib/admin-logger'

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
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, active, inactive, banned, admin
    const offset = (page - 1) * limit

    let sql = `
      SELECT
        u.user_id AS id,
        u.user_id,
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.language_code,
        COALESCE(u.registration_date, NOW()) AS created_at,
        COALESCE(u.is_banned, FALSE) AS is_banned,
        FALSE AS is_admin,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.subscription_id,
              'status', CASE WHEN s.is_active AND s.end_date > NOW() THEN 'active' ELSE 'expired' END,
              'started_at', s.start_date,
              'created_at', s.start_date,
              'expires_at', s.end_date,
              'subscription_plans', json_build_object(
                'name', COALESCE(NULLIF(s.tariff_key, ''), 'Подписка'),
                'duration_months', s.duration_months
              )
            ) ORDER BY s.start_date DESC NULLS LAST
          ) FILTER (WHERE s.subscription_id IS NOT NULL),
          '[]'
        ) as subscriptions
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM subscriptions
        WHERE user_id = u.user_id
        ORDER BY start_date DESC NULLS LAST, subscription_id DESC
        LIMIT 1
      ) s ON true
    `

    const params: any[] = []
    const conditions: string[] = []

    if (search) {
      conditions.push(`(u.username ILIKE $${params.length + 1} OR u.first_name ILIKE $${params.length + 1} OR u.telegram_id::text = $${params.length + 2})`)
      params.push(`%${search}%`, search)
    }

    // Apply filters
    if (filter === 'active') {
      conditions.push(`s.is_active = TRUE AND s.end_date > NOW()`)
    } else if (filter === 'inactive') {
      conditions.push(`(s.subscription_id IS NULL OR s.is_active = FALSE OR s.end_date <= NOW())`)
    } else if (filter === 'banned') {
      conditions.push(`u.is_banned = true`)
    } else if (filter === 'admin') {
      conditions.push(`FALSE`)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ')
    }

    sql += ` GROUP BY u.user_id ORDER BY COALESCE(u.registration_date, NOW()) DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)

    // admin_logs is optional in the deployed schema.
    const adminResult = await query('SELECT user_id FROM users WHERE telegram_id = $1', [request.nextUrl.searchParams.get('telegram_id')]).catch(() => ({ rows: [] as any[] }))
    if (adminResult.rows.length > 0) {
      await logAdminAction({
        admin_id: String(adminResult.rows[0].user_id),
        action: 'users_list_view',
        details: { filter, search, page, limit },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined
      })
    }

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM users'
    const countParams: any[] = []
    if (search) {
      countSql += ' WHERE username ILIKE $1 OR first_name ILIKE $1 OR telegram_id::text = $2'
      countParams.push(`%${search}%`, search)
    }
    const countResult = await query(countSql, countParams)
    const total = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      users: result.rows || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check admin access from .env
    const { isAdmin, telegramId } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Get admin ID
    const adminResult = await query('SELECT id FROM users WHERE telegram_id = $1', [telegramId])
    const adminId = adminResult.rows[0]?.id

    const body = await request.json()
    const { user_id, user_ids, is_admin, is_banned, action, message } = body

    // Handle send_message action separately
    if (action === 'send_message') {
      if (!user_id || !message?.trim()) {
        return NextResponse.json({ error: 'user_id and message are required' }, { status: 400 })
      }
      const userRes = await query('SELECT telegram_id FROM users WHERE id = $1', [user_id])
      if (!userRes.rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (!botToken) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userRes.rows[0].telegram_id, text: message.trim(), parse_mode: 'HTML' }),
      })
      const tgData = await tgRes.json()
      if (!tgData.ok) return NextResponse.json({ error: tgData.description || 'Telegram error' }, { status: 502 })
      return NextResponse.json({ ok: true })
    }

    // Bulk action
    if (user_ids && Array.isArray(user_ids)) {
      const updates: string[] = ['updated_at = NOW()']
      const params: any[] = []
      let paramIndex = 1

      if (typeof is_admin === 'boolean') {
        updates.push(`is_admin = $${paramIndex++}`)
        params.push(is_admin)
      }
      if (typeof is_banned === 'boolean') {
        updates.push(`is_banned = $${paramIndex++}`)
        params.push(is_banned)
      }

      params.push(user_ids)

      const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ANY($${paramIndex}) RETURNING *`,
        params
      )

      if (adminId) {
        await logAdminAction({
          admin_id: adminId,
          action: 'users_bulk_update',
          details: { user_ids, is_admin, is_banned, count: result.rowCount },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          user_agent: request.headers.get('user-agent') || undefined
        })
      }

      return NextResponse.json({
        success: true,
        updated: result.rowCount,
        users: result.rows
      })
    }

    // Single user action
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const updates: string[] = ['updated_at = NOW()']
    const params: any[] = []
    let paramIndex = 1

    if (typeof is_admin === 'boolean') {
      updates.push(`is_admin = $${paramIndex++}`)
      params.push(is_admin)
    }
    if (typeof is_banned === 'boolean') {
      updates.push(`is_banned = $${paramIndex++}`)
      params.push(is_banned)
    }

    params.push(user_id)

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (adminId) {
      await logAdminAction({
        admin_id: adminId,
        action: 'user_update',
        entity_type: 'user',
        entity_id: user_id,
        details: { is_admin, is_banned },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined
      })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
