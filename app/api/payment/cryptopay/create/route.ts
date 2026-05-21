import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { cryptoPay } from '@/lib/cryptopay'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, plan_id, devices_count = 1, asset = 'USDT' } = body

    console.log('CryptoPay create request:', { telegram_id, plan_id, devices_count, asset })

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

    // Try to get plan from database - support both UUID and sort_order
    let plan = null
    try {
      // Check if plan_id is a UUID or a number
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan_id);

      let result;
      if (isUUID) {
        result = await query(
          'SELECT * FROM subscription_plans WHERE id = $1',
          [plan_id]
        );
      } else {
        // Treat as sort_order (1, 2, 3, 4)
        result = await query(
          'SELECT * FROM subscription_plans WHERE sort_order = $1',
          [parseInt(plan_id)]
        );
      }

      if (result.rows.length > 0) {
        plan = result.rows[0]
      }
    } catch (dbError) {
      console.log('Database not available, using mock plans')
    }

    // Fallback to mock plans if database fails
    if (!plan) {
      const mockPlans: Record<string, any> = {
        '1': { id: '1', name: '1 месяц', price_rub: 149, duration_months: 1 },
        '2': { id: '2', name: '3 месяца', price_rub: 399, duration_months: 3 },
        '3': { id: '3', name: '6 месяцев', price_rub: 699, duration_months: 6 },
        '4': { id: '4', name: '1 год', price_rub: 1190, duration_months: 12 },
      }

      // Try to match by plan_id or use first plan as fallback
      plan = mockPlans[String(plan_id)] || mockPlans['1']
    }

    console.log('Using plan:', plan)

    // Calculate amount in crypto (convert RUB to USD approximately)
    const amountRub = plan.price_rub
    const amountUsd = (amountRub / 95).toFixed(2) // Approximate RUB to USD conversion

    console.log('Creating CryptoPay invoice:', { asset, amount: amountUsd, description: `ChampionVPN ${plan.name}` })

    // Create subscription record first
    const subResult = await query(
      `INSERT INTO subscriptions (user_id, plan_id, devices_count, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [user_id, plan.id, devices_count]
    )

    const subscription = subResult.rows[0]

    // Create CryptoPay invoice
    const invoice = await cryptoPay.createInvoice({
      asset: asset,
      amount: amountUsd,
      description: `ChampionVPN ${plan.name}`,
      payload: JSON.stringify({
        telegram_id,
        subscription_id: subscription.id,
        plan_id
      })
    })

    console.log('CryptoPay invoice created:', invoice)

    // Create payment record
    await query(
      `INSERT INTO payments (user_id, subscription_id, amount_rub, payment_method, payment_provider, provider_payment_id, status, metadata)
       VALUES ($1, $2, $3, 'crypto', 'cryptopay', $4, 'pending', $5)`,
      [
        user_id,
        subscription.id,
        amountRub,
        invoice.invoice_id.toString(),
        JSON.stringify({
          plan_name: plan.name,
          crypto_asset: asset,
          crypto_amount: amountUsd,
          devices_count,
          duration_months: plan.duration_months
        })
      ]
    )

    return NextResponse.json({
      success: true,
      payment_id: invoice.invoice_id.toString(),
      payment_url: invoice.bot_invoice_url,
      bot_invoice_url: invoice.bot_invoice_url,
      mini_app_invoice_url: invoice.mini_app_invoice_url,
      web_app_invoice_url: invoice.web_app_invoice_url,
      amount: amountRub,
      crypto_amount: amountUsd,
      crypto_asset: asset,
      plan,
      devices_count,
      invoice_id: invoice.invoice_id,
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
