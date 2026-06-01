import { NextRequest, NextResponse } from 'next/server'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function POST(request: NextRequest) {
  try {
    if (!isRemnawaveConfigured()) {
      return NextResponse.json({ error: 'VPN-сервис временно недоступен' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({})) as { telegram_id?: number | string }
    const telegramId = Number(body.telegram_id || body.telegramId)

    if (!telegramId || Number.isNaN(telegramId)) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    const updated = await remnawave.revokeUserSubscription(telegramId)
    const subscriptionUrl = await remnawave.getSubscriptionUrlWithToken(telegramId)

    return NextResponse.json({
      success: true,
      message: 'Ссылка подписки успешно перевыпущена!',
      subscription_url: subscriptionUrl,
      revoked: true,
    })
  } catch (error) {
    console.error('Reissue VPN link error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Не удалось перевыпустить ссылку',
    }, { status: 500 })
  }
}
