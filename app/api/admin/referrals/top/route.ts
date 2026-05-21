import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegram_id')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')

    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await query(`
      SELECT
        u.telegram_id,
        u.username,
        u.first_name,
        u.referral_code,
        COUNT(r.id) as referrals_count,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_referrals,
        COALESCE(SUM(p.amount_rub), 0) as total_revenue
      FROM users u
      LEFT JOIN users r ON r.referred_by = u.referral_code
      LEFT JOIN subscriptions s ON r.id = s.user_id AND s.status = 'active'
      LEFT JOIN payments p ON r.id = p.user_id AND p.status = 'completed'
      GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.referral_code
      HAVING COUNT(r.id) > 0
      ORDER BY referrals_count DESC, total_revenue DESC
      LIMIT $1
    `, [limit])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching top referrals:', error)
    return NextResponse.json({ error: 'Failed to fetch top referrals' }, { status: 500 })
  }
}
