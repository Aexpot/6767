import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, telegram_id, plan_id, devices_count = 1 } = body

    // Support both user_id and telegram_id
    let userId = user_id
    if (!userId && telegram_id) {
      // Get user_id from telegram_id
      const userResult = await query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id])
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      userId = userResult.rows[0].id
    }

    if (!userId || !plan_id) {
      return NextResponse.json({ error: 'user_id and plan_id are required' }, { status: 400 })
    }

    // Get user
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId])

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    // Get plan - support both UUID and sort_order
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan_id);

    let planResult;
    if (isUUID) {
      planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
    } else {
      planResult = await query('SELECT * FROM subscription_plans WHERE sort_order = $1', [parseInt(plan_id)]);
    }

    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const plan = planResult.rows[0]

    // Calculate total amount
    const amount = plan.price_rub

    // Create subscription record
    const subResult = await query(
      `INSERT INTO subscriptions (user_id, plan_id, devices_count, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, plan_id, devices_count]
    )

    const subscription = subResult.rows[0]

    // Create payment record
    const paymentResult = await query(
      `INSERT INTO payments (user_id, subscription_id, amount_rub, payment_method, payment_provider, status, metadata)
       VALUES ($1, $2, $3, 'sbp', 'manual', 'pending', $4)
       RETURNING *`,
      [
        userId,
        subscription.id,
        amount,
        JSON.stringify({
          plan_name: plan.name,
          devices_count,
          duration_months: plan.duration_months
        })
      ]
    )

    const payment = paymentResult.rows[0]

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      payment_url: null, // Manual payment doesn't have payment URL
      payment_method: 'manual',
      amount: amount,
      subscription_id: subscription.id,
      plan,
      devices_count,
      expires_at: new Date(Date.now() + plan.duration_months * 30 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Для оплаты свяжитесь с поддержкой или используйте криптовалютные методы оплаты'
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
