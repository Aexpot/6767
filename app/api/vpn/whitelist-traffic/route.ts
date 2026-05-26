import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { remnawave } from '@/lib/remnawave'

// "Белые списки" = обход режима белых списков РКН (ограничения мобильного интернета).
// В Remnawave реализовано через "premium" серверы (нода с "белым" IP, которую пропускает ТСПУ).
// Трафик через эти серверы = premium_used_bytes, лимит = premium_limit_bytes (baseline + topup).
//
// Поля из get_active_subscription_details():
//   premium_used_bytes        — использованный премиум-трафик (байты)
//   premium_limit_bytes       — эффективный лимит (baseline + topup_balance + bonus)
//   premium_baseline_bytes    — базовый месячный лимит (из тарифа)
//   premium_topup_balance_bytes — докупленный запас (байты)
//
// Если premium_baseline_bytes == 0 — тариф без белых списков / нет тарифа с premium_squad.

const DEFAULT_WL_LIMIT_BYTES = 15 * 1024 * 1024 * 1024 // 15 GB fallback

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    const tid = parseInt(telegram_id)
    if (isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })
    }

    // 1. Check if user has an active subscription in our DB
    const subResult = await query(
      `SELECT s.is_active, s.end_date, s.panel_user_uuid
       FROM subscriptions s
       WHERE s.user_id = $1 AND s.is_active = true AND s.end_date > NOW()
       ORDER BY s.end_date DESC LIMIT 1`,
      [tid]
    )

    if (subResult.rows.length === 0) {
      return NextResponse.json({
        active: false,
        whitelist_available: false,
        whitelist_traffic_used: 0,
        whitelist_traffic_limit: 0,
        whitelist_traffic_left: 0,
        message: 'Нет активной подписки'
      })
    }

    // 2. Query Remnawave panel for premium (bypass) traffic data
    let wlUsed = 0
    let wlLimit = 0
    let wlBaseline = 0
    let wlTopupBalance = 0
    let whitelistAvailable = false

    try {
      const username = `tg_${tid}`
      // getRawUser is internal — use checkSubscription as lightweight way to find user
      // then fetch premium fields from the panel raw user data
      const panelUsername = username
      const rawUser = await (remnawave as any).getRawByUsername(panelUsername)
      // Raw Remnawave user doesn't contain premium traffic directly —
      // that's calculated by the bot's subscription_service from local DB + tariff config.
      // The MiniApp doesn't have tariff config, so we read the bot DB directly via pg.
      // The bot stores premium_used_bytes and premium_topup_balance_bytes in subscriptions table.
      const premiumResult = await query(
        `SELECT
           COALESCE(s.premium_used_bytes, 0)           AS premium_used_bytes,
           COALESCE(s.premium_topup_balance_bytes, 0)  AS premium_topup_balance_bytes,
           COALESCE(s.tier_baseline_bytes, 0)          AS tier_baseline_bytes,
           COALESCE(s.premium_bonus_bytes, 0)          AS premium_bonus_bytes,
           COALESCE(s.premium_unlimited_override, false) AS premium_unlimited_override
         FROM subscriptions s
         WHERE s.user_id = $1 AND s.is_active = true AND s.end_date > NOW()
         ORDER BY s.end_date DESC LIMIT 1`,
        [tid]
      )

      if (premiumResult.rows.length > 0) {
        const row = premiumResult.rows[0]
        wlUsed         = Number(row.premium_used_bytes)          || 0
        wlTopupBalance = Number(row.premium_topup_balance_bytes) || 0
        wlBaseline     = Number(row.tier_baseline_bytes)         || 0
        const bonusBytes = Number(row.premium_bonus_bytes)       || 0
        const unlimited  = Boolean(row.premium_unlimited_override)

        if (unlimited) {
          wlLimit = 0 // 0 = unlimited
          whitelistAvailable = true
        } else if (wlBaseline > 0 || wlTopupBalance > 0 || bonusBytes > 0) {
          wlLimit = wlBaseline + wlTopupBalance + bonusBytes
          whitelistAvailable = true
        }
      }
    } catch (panelErr) {
      console.error('[whitelist-traffic] Error fetching premium data:', panelErr)
      // Fallback: subscription is active but we can't determine premium traffic
    }

    return NextResponse.json({
      active: true,
      whitelist_available: whitelistAvailable,
      whitelist_traffic_used: wlUsed,
      whitelist_traffic_limit: wlLimit,
      whitelist_traffic_left: wlLimit > 0 ? Math.max(0, wlLimit - wlUsed) : null,
      whitelist_baseline_bytes: wlBaseline,
      whitelist_topup_balance_bytes: wlTopupBalance,
    })
  } catch (error) {
    console.error('Whitelist traffic GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, whitelist_traffic_gb, payment_method = 'crypto', amount_rub } = body

    if (!telegram_id || !whitelist_traffic_gb) {
      return NextResponse.json({ error: 'telegram_id and whitelist_traffic_gb are required' }, { status: 400 })
    }

    const tid = parseInt(String(telegram_id))
    const gb  = parseFloat(String(whitelist_traffic_gb))

    if (isNaN(tid) || isNaN(gb) || gb <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Load price from settings, fallback 10 ₽/ГБ
    let pricePerGb = 10
    try {
      const settingsRow = await query(
        `SELECT value FROM settings WHERE key = 'wl_traffic_settings' LIMIT 1`,
        []
      )
      if (settingsRow.rows.length > 0) {
        const wlSettings = JSON.parse(settingsRow.rows[0].value)
        if (wlSettings?.price_per_gb) pricePerGb = Number(wlSettings.price_per_gb)
      }
    } catch { /* ignore */ }

    const finalPrice = amount_rub ?? Math.round(gb * pricePerGb)

    // Create payment via CryptoPay by default
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    let apiUrl = `${appUrl}/api/payment/cryptopay/create`
    if (payment_method === 'yoomoney') {
      apiUrl = `${appUrl}/api/payment/yoomoney/create`
    }

    const paymentBody: Record<string, unknown> = {
      telegram_id: tid,
      amount_rub: finalPrice,
      type: 'whitelist_traffic',
      whitelist_traffic_gb: gb,
      asset: 'USDT',
    }

    const payRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentBody),
    })

    if (!payRes.ok) {
      const errText = await payRes.text()
      return NextResponse.json({ error: `Payment service error: ${errText}` }, { status: 502 })
    }

    const payData = await payRes.json()

    return NextResponse.json({
      success: true,
      payment_url: payData.payment_url,
      payment_id: payData.payment_id,
      gb,
      price_rub: finalPrice,
    })
  } catch (error) {
    console.error('Whitelist traffic POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
