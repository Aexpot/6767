import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Get user
    const userResult = await query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [parseInt(telegram_id)]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ transactions: [] })
    }

    const userId = userResult.rows[0].id

    // Get transactions
    const transactionsResult = await query(
      `SELECT
        p.id,
        p.amount_rub,
        p.status,
        p.payment_method,
        p.created_at,
        json_build_object(
          'name', sp.name
        ) as subscription_plans
      FROM payments p
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50`,
      [userId]
    )

    return NextResponse.json({
      transactions: transactionsResult.rows
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
