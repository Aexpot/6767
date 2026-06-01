import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { crystalPay } from '@/lib/crystalpay'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, plan_id, devices_count = 1, promocode_id } = body

    console.log('CrystalPay create request:', { telegram_id, plan_id, devices_count, promocode_id })

    if (!telegram_id || !plan_id) {
      return NextResponse.json({ error: 'telegram_id and plan_id are required' }, { status: 400 })
    }

    // Get user by telegram_id
    const userResult = await query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user_id = userResult.rows[0].id

    // Get plan from database - support both UUID and sort_order
    let planResult;

    // Check if plan_id is a UUID or a number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan_id);

    if (isUUID) {
      planResult = await query(
        'SELECT * FROM subscription_plans WHERE id = $1',
        [plan_id]
      );
    } else {
      // Treat as sort_order (1, 2, 3, 4)
      planResult = await query(
        'SELECT * FROM subscription_plans WHERE sort_order = $1',
        [parseInt(plan_id)]
      );
    }

    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const plan = planResult.rows[0]

    console.log('Using plan:', plan)

    // Calculate amount in RUB
    let amountRub = plan.price_rub
    let discountAmount = 0

    // Apply promocode if provided
    if (promocode_id) {
      const promocodeResult = await query(
        `SELECT * FROM promocodes
         WHERE id = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR current_uses < max_uses)`,
        [promocode_id]
      )

      if (promocodeResult.rows.length > 0) {
        const promocode = promocodeResult.rows[0]

        if (promocode.discount_type === 'percentage') {
          discountAmount = (amountRub * promocode.discount_value) / 100
        } else {
          discountAmount = promocode.discount_value
        }

        discountAmount = Math.min(discountAmount, amountRub)
        amountRub = Math.max(0, amountRub - discountAmount)

        // Increment promocode usage
        await query(
          'UPDATE promocodes SET current_uses = current_uses + 1, updated_at = NOW() WHERE id = $1',
          [promocode_id]
        )
      }
    }

    // Create subscription record first
    const subResult = await query(
      `INSERT INTO subscriptions (user_id, plan_id, devices_count, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [user_id, plan.id, devices_count]
    )

    const subscription = subResult.rows[0]

    // Create CrystalPay invoice
    const invoice = await crystalPay.createInvoice({
      amount: parseFloat(amountRub),
      description: `ChampionVPN ${plan.name}`,
      extra: JSON.stringify({
        telegram_id,
        subscription_id: subscription.id,
        plan_id
      }),
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/crystalpay/webhook`
    })

    console.log('CrystalPay invoice created:', invoice)

    // Create payment record
    const paymentResult = await query(
      `INSERT INTO payments (user_id, subscription_id, amount_rub, payment_method, payment_provider, provider_payment_id, status, metadata)
       VALUES ($1, $2, $3, 'crypto', 'crystalpay', $4, 'pending', $5)
       RETURNING id`,
      [
        user_id,
        subscription.id,
        amountRub,
        invoice.id,
        JSON.stringify({
          plan_name: plan.name,
          devices_count,
          duration_months: plan.duration_months,
          invoice_url: invoice.url,
          promocode_id: promocode_id || null,
          discount_amount: discountAmount
        })
      ]
    )

    const payment_id = paymentResult.rows[0].id

    // Save promocode usage if applied
    if (promocode_id && discountAmount > 0) {
      await query(
        `INSERT INTO promocode_uses (promocode_id, user_id, discount_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (promocode_id, user_id) DO NOTHING`,
        [promocode_id, user_id, discountAmount]
      )
    }

    return NextResponse.json({
      success: true,
      payment_id: invoice.id,
      payment_url: invoice.url,
      amount: amountRub,
      plan,
      devices_count,
      invoice_id: invoice.id,
      expires_at: new Date(Date.now() + plan.duration_months * 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
