import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function GET(request: NextRequest) {
  const telegramId = request.nextUrl.searchParams.get('telegram_id')

  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
  }

  // First check bot DB for active subscription
  const subResult = await query(
    `SELECT s.end_date, s.panel_user_uuid FROM subscriptions s
     WHERE s.user_id = $1 AND s.is_active = true AND s.end_date > NOW()
     ORDER BY s.end_date DESC LIMIT 1`,
    [parseInt(telegramId)]
  )

  const hasSubscription = subResult.rows.length > 0

  if (!hasSubscription) {
    return NextResponse.json({
      active: false,
      expiresAt: null,
      usedTraffic: 0,
      dataLimit: null,
      links: [],
      subscriptionUrl: null,
    })
  }

  // Check Remnawave for VPN details
  if (isRemnawaveConfigured()) {
    try {
      const status = await remnawave.checkSubscription(parseInt(telegramId))

      if (status) {
        return NextResponse.json({
          active: status.active,
          expiresAt: status.expiresAt?.toISOString() || null,
          usedTraffic: status.usedTraffic,
          dataLimit: status.dataLimit,
          links: status.links,
          subscriptionUrl: remnawave.getSubscriptionUrl(`tg_${telegramId}`),
        })
      }
    } catch (error) {
      console.error('Error fetching VPN status from Remnawave:', error)
    }
  }

  // Fallback: subscription exists in DB but Remnawave not available
  return NextResponse.json({
    active: true,
    expiresAt: subResult.rows[0].end_date,
    usedTraffic: 0,
    dataLimit: null,
    links: [],
    subscriptionUrl: null,
  })
}
