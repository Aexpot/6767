import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

const DEFAULT_WL_LIMIT_BYTES = 15 * 1024 * 1024 * 1024 // 15 GB

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

    // Try to get whitelist traffic from subscriptions table
    let wlUsed = 0
    let wlLimit = DEFAULT_WL_LIMIT_BYTES
    let active = false

    try {
      const subResult = await query(
        `SELECT s.is_active, s.end_date,
                COALESCE(s.whitelist_traffic_used, 0) as whitelist_traffic_used,
                COALESCE(s.whitelist_traffic_limit, $2) as whitelist_traffic_limit
         FROM subscriptions s
         WHERE s.user_id = $1 AND s.is_active = true AND s.end_date > NOW()
         ORDER BY s.end_date DESC LIMIT 1`,
        [tid, DEFAULT_WL_LIMIT_BYTES]
      )

      if (subResult.rows.length > 0) {
        const sub = subResult.rows[0]
        wlUsed  = Number(sub.whitelist_traffic_used)  || 0
        wlLimit = Number(sub.whitelist_traffic_limit) || DEFAULT_WL_LIMIT_BYTES
        active  = true
      }
    } catch {
      // Columns may not exist yet — return defaults gracefully
      const fallbackResult = await query(
        `SELECT is_active FROM subscriptions
         WHERE user_id = $1 AND is_active = true AND end_date > NOW()
         LIMIT 1`,
        [tid]
      )
      active = fallbackResult.rows.length > 0
    }

    return NextResponse.json({
      active,
      whitelist_traffic_used: wlUsed,
      whitelist_traffic_limit: wlLimit,
      whitelist_traffic_left: Math.max(0, wlLimit - wlUsed),
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

    // Determine price if not provided: 10 ₽/ГБ
    const pricePerGb = 10
    const finalPrice = amount_rub ?? Math.round(gb * pricePerGb)

    // Create payment via CryptoPay by default
    let apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/payment/cryptopay/create`
    if (payment_method === 'yoomoney') {
      apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/payment/yoomoney/create`
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
