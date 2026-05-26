import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Bot DB: user_id = telegram_id, subscriptions.is_active + end_date
    const result = await query(
      `SELECT s.subscription_id, s.user_id, s.start_date, s.end_date,
              s.duration_months, s.is_active, s.tariff_key, s.panel_user_uuid,
              s.auto_renew_enabled
       FROM subscriptions s
       WHERE s.user_id = $1
       AND s.is_active = true
       AND s.end_date > NOW()
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [parseInt(telegram_id)]
    )

    if (result.rows.length > 0) {
      const sub = result.rows[0]
      return NextResponse.json({
        hasActiveSubscription: true,
        subscription: {
          id: String(sub.subscription_id),
          user_id: String(sub.user_id),
          status: 'active',
          started_at: sub.start_date,
          expires_at: sub.end_date,
          name: sub.tariff_key || `${sub.duration_months || 1} мес`,
          duration_months: sub.duration_months || 1,
          price_rub: 0,
          auto_renew: sub.auto_renew_enabled || false
        }
      })
    }

    return NextResponse.json({
      hasActiveSubscription: false,
      subscription: null
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
