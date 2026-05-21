import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { marzban, isMarzbanConfigured } from '@/lib/marzban'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Check if user has active subscription (including trial)
    const subResult = await query(
      `SELECT s.*, sp.name, sp.duration_months
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = (SELECT id FROM users WHERE telegram_id = $1)
       AND s.status = 'active'
       AND s.expires_at > NOW()
       ORDER BY s.expires_at DESC
       LIMIT 1`,
      [telegram_id]
    )

    if (subResult.rows.length === 0) {
      return NextResponse.json({
        active: false,
        message: 'Нет активной подписки'
      })
    }

    const subscription = subResult.rows[0]

    // Get VPN subscription URL from Marzban
    if (isMarzbanConfigured()) {
      try {
        const vpnData = await marzban.checkSubscription(parseInt(telegram_id))

        if (vpnData && vpnData.active) {
          return NextResponse.json({
            active: true,
            links: vpnData.links || [],
            subscription_url: vpnData.subscriptionUrl,
            expiresAt: vpnData.expiresAt,
            usedTraffic: vpnData.usedTraffic,
            dataLimit: vpnData.dataLimit,
            subscription: {
              name: subscription.name,
              expires_at: subscription.expires_at
            }
          })
        }
      } catch (error) {
        console.error('Marzban error:', error)
      }
    }

    // Fallback if Marzban is not available
    // Try to get subscription URL anyway
    let subscriptionUrl = ''
    try {
      subscriptionUrl = await marzban.getSubscriptionUrlWithToken(parseInt(telegram_id))
    } catch (err) {
      console.error('Failed to get subscription URL:', err)
    }

    return NextResponse.json({
      active: true,
      links: [],
      subscription_url: subscriptionUrl,
      ios_configs: {
        ru: process.env.NEXT_PUBLIC_IOS_CONFIG_RU || '',
        global: process.env.NEXT_PUBLIC_IOS_CONFIG_GLOBAL || ''
      },
      message: subscriptionUrl ? '' : 'VPN настраивается, попробуйте через несколько минут',
      subscription: {
        name: subscription.name,
        expires_at: subscription.expires_at
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
