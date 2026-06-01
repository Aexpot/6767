import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, plan_id, extra_devices = 0, promocode_id, promocode } = body
    const extraDevices = Math.max(0, Math.min(5, parseInt(extra_devices) || 0))
    const devices_count = 1 + extraDevices
    const EXTRA_DEVICE_PRICE = 90

    console.log('YooMoney create request:', { telegram_id, plan_id, extraDevices, promocode_id })

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

    // Calculate amount in RUB: plan + extra devices
    let amountRub = Number(plan.price_rub) + extraDevices * EXTRA_DEVICE_PRICE
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

    // Create YooMoney payment URL
    const YOOMONEY_WALLET = process.env.YOOMONEY_WALLET || process.env.YOOMONEY_WALLET_ID
    const paymentId = `${subscription.id}_${Date.now()}`

    if (!YOOMONEY_WALLET) {
      return NextResponse.json({ error: 'YOOMONEY_WALLET not configured' }, { status: 500 })
    }

    const targets = `ChampionVPN ${plan.name}${extraDevices ? ` + ${extraDevices} устр.` : ''}`
    const paymentUrl = `https://yoomoney.ru/quickpay/confirm?` +
      `receiver=${YOOMONEY_WALLET}` +
      `&quickpay-form=button` +
      `&targets=${encodeURIComponent(targets)}` +
      `&paymentType=SB` +
      `&sum=${amountRub}` +
      `&label=${encodeURIComponent(paymentId)}`

    console.log('YooMoney payment URL created:', paymentUrl)

    // Create payment record
    const paymentResult = await query(
      `INSERT INTO payments (user_id, subscription_id, amount_rub, payment_method, payment_provider, provider_payment_id, status, metadata)
       VALUES ($1, $2, $3, 'yoomoney', 'yoomoney', $4, 'pending', $5)
       RETURNING id`,
      [
        user_id,
        subscription.id,
        amountRub,
        paymentId,
        JSON.stringify({
          plan_name: plan.name,
          devices_count,
          extra_devices: extraDevices,
          duration_months: plan.duration_months,
          payment_url: paymentUrl,
          promocode_id: promocode_id || promocode || null,
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
      payment_id: paymentId,
      payment_url: paymentUrl,
      amount: amountRub,
      plan,
      devices_count,
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
