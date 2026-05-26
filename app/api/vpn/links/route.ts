import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Bot DB: check subscription
    const subResult = await query(
      `SELECT s.subscription_id, s.end_date, s.duration_months, s.tariff_key, s.panel_user_uuid
       FROM subscriptions s
       WHERE s.user_id = $1
       AND s.is_active = true
       AND s.end_date > NOW()
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [parseInt(telegram_id)]
    )

    if (subResult.rows.length === 0) {
      return NextResponse.json({
        active: false,
        message: 'Нет активной подписки'
      })
    }

    const subscription = subResult.rows[0]

    // Get VPN subscription URL from Remnawave
    if (isRemnawaveConfigured()) {
      try {
        const vpnData = await remnawave.checkSubscription(parseInt(telegram_id))

        if (vpnData && vpnData.active) {
          return NextResponse.json({
            active: true,
            links: vpnData.links || [],
            subscription_url: vpnData.subscriptionUrl,
            expiresAt: vpnData.expiresAt,
            usedTraffic: vpnData.usedTraffic,
            dataLimit: vpnData.dataLimit,
            subscription: {
              name: subscription.tariff_key || `${subscription.duration_months || 1} мес`,
              expires_at: subscription.end_date
            }
          })
        }
      } catch (error) {
        console.error('Remnawave error:', error)
      }
    }

    // Fallback if Remnawave is not available
    let subscriptionUrl = ''
    try {
      subscriptionUrl = await remnawave.getSubscriptionUrlWithToken(parseInt(telegram_id))
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
        name: subscription.tariff_key || `${subscription.duration_months || 1} мес`,
        expires_at: subscription.end_date
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
