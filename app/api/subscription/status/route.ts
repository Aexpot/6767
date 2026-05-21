import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Get user's active subscription
    const result = await query(
      `SELECT s.*, sp.name, sp.duration_months, sp.price_rub
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = (SELECT id FROM users WHERE telegram_id = $1)
       AND s.status = 'active'
       AND s.expires_at > NOW()
       ORDER BY s.expires_at DESC
       LIMIT 1`,
      [telegram_id]
    )

    if (result.rows.length > 0) {
      return NextResponse.json({
        hasActiveSubscription: true,
        subscription: result.rows[0]
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
