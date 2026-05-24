import { NextRequest, NextResponse } from 'next/server'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function GET(request: NextRequest) {
  const telegramId = request.nextUrl.searchParams.get('telegram_id')

  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
  }

  // Check if Remnawave is configured
  if (!isRemnawaveConfigured()) {
    // Return demo data
    return NextResponse.json({
      active: true,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      usedTraffic: 1024 * 1024 * 500, // 500 MB
      dataLimit: null,
      links: [
        'vless://demo-config-link',
      ],
      subscriptionUrl: `https://demo.xovpn.app/sub/tg_${telegramId}`,
    })
  }

  try {
    const status = await remnawave.checkSubscription(parseInt(telegramId))

    if (!status) {
      return NextResponse.json({
        active: false,
        expiresAt: null,
        usedTraffic: 0,
        dataLimit: null,
        links: [],
        subscriptionUrl: null,
      })
    }

    return NextResponse.json({
      active: status.active,
      expiresAt: status.expiresAt?.toISOString() || null,
      usedTraffic: status.usedTraffic,
      dataLimit: status.dataLimit,
      links: status.links,
      subscriptionUrl: remnawave.getSubscriptionUrl(`tg_${telegramId}`),
    })
  } catch (error) {
    console.error('Error fetching VPN status:', error)
    return NextResponse.json({ error: 'Failed to fetch VPN status' }, { status: 500 })
  }
}
