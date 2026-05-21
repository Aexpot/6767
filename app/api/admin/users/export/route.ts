import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logAdminAction } from '@/lib/admin-logger'

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')
    const filter = request.nextUrl.searchParams.get('filter') || 'all'

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

    // Build query based on filter
    let whereClause = ''
    if (filter === 'active') {
      whereClause = "AND s.status = 'active' AND s.expires_at > NOW()"
    } else if (filter === 'inactive') {
      whereClause = "AND (s.status IS NULL OR s.status != 'active' OR s.expires_at <= NOW())"
    } else if (filter === 'banned') {
      whereClause = "AND u.is_banned = true"
    }

    const result = await query(`
      SELECT
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.is_admin,
        u.is_banned,
        u.referral_code,
        u.created_at,
        s.status as subscription_status,
        s.expires_at as subscription_expires,
        sp.name as plan_name,
        (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = u.id) as referrals_count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM subscriptions
        WHERE user_id = u.id
        ORDER BY expires_at DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE 1=1 ${whereClause}
      ORDER BY u.created_at DESC
    `)

    // Generate CSV
    const headers = [
      'Telegram ID',
      'Username',
      'Имя',
      'Фамилия',
      'Админ',
      'Забанен',
      'Реферальный код',
      'Дата регистрации',
      'Статус подписки',
      'Подписка до',
      'План',
      'Рефералов'
    ]

    const rows = result.rows.map(row => [
      row.telegram_id,
      row.username || '',
      row.first_name || '',
      row.last_name || '',
      row.is_admin ? 'Да' : 'Нет',
      row.is_banned ? 'Да' : 'Нет',
      row.referral_code || '',
      new Date(row.created_at).toLocaleString('ru-RU'),
      row.subscription_status || 'Нет',
      row.subscription_expires ? new Date(row.subscription_expires).toLocaleString('ru-RU') : '',
      row.plan_name || '',
      row.referrals_count
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Add BOM for proper UTF-8 encoding in Excel
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    await logAdminAction({
      admin_id: adminId,
      action: 'users_export',
      details: { filter, count: result.rows.length },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting users:', error)
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 })
  }
}
