import { NextRequest, NextResponse } from 'next/server'
import { marzban, isMarzbanConfigured } from '@/lib/marzban'
import { validateInitData } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  const initData = request.headers.get('X-Telegram-Init-Data')
  
  // Validate Telegram init data in production
  if (process.env.NODE_ENV === 'production' && process.env.TELEGRAM_BOT_TOKEN) {
    if (!initData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const isValid = await validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid init data' }, { status: 401 })
    }
  }

  try {
    const body = await request.json()
    const { telegram_id, months } = body

    if (!telegram_id || !months) {
      return NextResponse.json({ error: 'telegram_id and months required' }, { status: 400 })
    }

    // Check if Marzban is configured
    if (!isMarzbanConfigured()) {
      // Return demo data
      return NextResponse.json({
        success: true,
        username: `tg_${telegram_id}`,
        expiresAt: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString(),
        links: ['vless://demo-config-link'],
        subscriptionUrl: `https://demo.xovpn.app/sub/tg_${telegram_id}`,
      })
    }

    // Create or update VPN user in Marzban
    const user = await marzban.createVpnUser(telegram_id, months)

    return NextResponse.json({
      success: true,
      username: user.username,
      expiresAt: user.expire ? new Date(user.expire * 1000).toISOString() : null,
      links: user.links,
      subscriptionUrl: marzban.getSubscriptionUrl(user.username),
    })
  } catch (error) {
    console.error('Error creating VPN user:', error)
    return NextResponse.json({ error: 'Failed to create VPN user' }, { status: 500 })
  }
}
