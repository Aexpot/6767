import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

const EXTRA_DEVICE_PRICE_RUB = 90

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, plan_id, extra_devices = 0 } = body
    const extraDevices = Math.max(0, Math.min(5, parseInt(extra_devices) || 0))
    const devicesCount = 1 + extraDevices

    if (!telegram_id || !plan_id) {
      return NextResponse.json({ error: 'telegram_id and plan_id are required' }, { status: 400 })
    }

    // Get user
    const userResult = await query(
      'SELECT id, balance_rub FROM users WHERE telegram_id = $1',
      [telegram_id],
    )
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userResult.rows[0]
    const balance = Number(user.balance_rub) || 0

    // Get plan (UUID or sort_order)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan_id)
    const planResult = isUUID
      ? await query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id])
      : await query('SELECT * FROM subscription_plans WHERE sort_order = $1', [parseInt(plan_id)])
    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    const plan = planResult.rows[0]
    const totalPrice = Number(plan.price_rub) + extraDevices * EXTRA_DEVICE_PRICE_RUB

    if (balance < totalPrice) {
      return NextResponse.json({
        error: 'Недостаточно средств на балансе',
        balance, required: totalPrice,
      }, { status: 400 })
    }

    // Determine new expires_at: extend from active sub if any, else now
    const activeSubResult = await query(
      `SELECT id, expires_at FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [user.id],
    )
    const baseDate = activeSubResult.rows[0]?.expires_at
      ? new Date(activeSubResult.rows[0].expires_at)
      : new Date()
    const expiresAt = new Date(baseDate)
    expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months)

    // Atomic: deduct balance, upsert subscription, log payment
    let subscriptionId: string
    if (activeSubResult.rows[0]) {
      // Extend existing active subscription
      subscriptionId = activeSubResult.rows[0].id
      await query(
        `UPDATE subscriptions
         SET expires_at = $1, devices_count = $2, plan_id = $3, updated_at = NOW()
         WHERE id = $4`,
        [expiresAt.toISOString(), devicesCount, plan.id, subscriptionId],
      )
    } else {
      const ins = await query(
        `INSERT INTO subscriptions (user_id, plan_id, devices_count, status, started_at, expires_at)
         VALUES ($1, $2, $3, 'active', NOW(), $4)
         RETURNING id`,
        [user.id, plan.id, devicesCount, expiresAt.toISOString()],
      )
      subscriptionId = ins.rows[0].id
    }

    // Deduct balance
    await query(
      `UPDATE users SET balance_rub = COALESCE(balance_rub, 0) - $1, updated_at = NOW() WHERE id = $2`,
      [totalPrice, user.id],
    )

    // Log payment as completed (paid from balance)
    await query(
      `INSERT INTO payments (user_id, subscription_id, amount_rub, payment_method, payment_provider, status, metadata)
       VALUES ($1, $2, $3, 'balance', 'internal', 'completed', $4)`,
      [
        user.id,
        subscriptionId,
        totalPrice,
        JSON.stringify({
          plan_name: plan.name,
          duration_months: plan.duration_months,
          devices_count: devicesCount,
          extra_devices: extraDevices,
          paid_from: 'balance',
        }),
      ],
    )

    // Provision in Remnawave
    if (isRemnawaveConfigured()) {
      try {
        await remnawave.createVpnUser(Number(telegram_id), plan.duration_months, devicesCount)
      } catch (e) {
        console.error('[extend-from-balance] Remnawave error:', e)
      }
    }

    const newBalanceRow = await query('SELECT balance_rub FROM users WHERE id = $1', [user.id])

    return NextResponse.json({
      success: true,
      expires_at: expiresAt.toISOString(),
      devices_count: devicesCount,
      balance_rub: Number(newBalanceRow.rows[0]?.balance_rub) || 0,
    })
  } catch (error) {
    console.error('[extend-from-balance] error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
