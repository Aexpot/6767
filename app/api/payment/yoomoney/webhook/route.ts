import { query, botQuery, getBotDb } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'
import crypto from 'crypto'

// ── helper: отправить сообщение через бот-API ─────────────────────────────────
async function sendBotMessage(telegramId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('[sendBotMessage] error:', e)
  }
}

// ── helper: склонение месяцев ─────────────────────────────────────────────────
function fmtMonths(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} месяц`
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return `${n} месяца`
  return `${n} месяцев`
}

function getYooMoneySecrets(): string[] {
  return [
    process.env.YOOMONEY_SECRET,
    ...(process.env.YOOMONEY_OLD_SECRETS || '').split(','),
  ]
    .map((secret) => secret?.trim())
    .filter((secret): secret is string => Boolean(secret))
}

function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    '%' + char.charCodeAt(0).toString(16).toUpperCase()
  )
}

function safeCompareHex(receivedHash: string | undefined, expectedHash: string): boolean {
  if (!receivedHash || receivedHash.length !== expectedHash.length) {
    return false
  }

  const received = receivedHash.toLowerCase()
  const expected = expectedHash.toLowerCase()

  if (!/^[a-f0-9]+$/.test(received) || !/^[a-f0-9]+$/.test(expected)) {
    return false
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch (error) {
    console.error('[YooMoney Webhook] Error comparing hashes:', error)
    return false
  }
}

function buildHmacParamString(data: Record<string, unknown>, includeSha1Hash: boolean): string {
  return Object.keys(data)
    .filter((key) => key !== 'sign')
    .filter((key) => includeSha1Hash || key !== 'sha1_hash')
    .filter((key) => data[key] !== undefined)
    .sort()
    .map((key) => key + '=' + rfc3986Encode(String(data[key] ?? '')))
    .join('&')
}

function buildSha1String(data: Record<string, unknown>, secret: string): string {
  return [
    data.notification_type ?? '',
    data.operation_id ?? '',
    data.amount ?? '',
    data.currency ?? '',
    data.datetime ?? '',
    data.sender ?? '',
    data.codepro ?? '',
    secret,
    data.label ?? '',
  ].join('&')
}

function validateYooMoneyNotification(notification: Record<string, unknown>): boolean {
  const secrets = getYooMoneySecrets()

  if (secrets.length === 0) {
    console.error('[YooMoney Webhook] YOOMONEY_SECRET not set')
    return false
  }

  const receivedSign = typeof notification.sign === 'string' ? notification.sign : undefined
  const receivedSha1 = typeof notification.sha1_hash === 'string' ? notification.sha1_hash : undefined

  if (!receivedSign && !receivedSha1) {
    console.error('[YooMoney Webhook] No sign or sha1_hash in webhook data')
    return false
  }

  for (const secret of secrets) {
    if (receivedSign) {
      const hmacVariants = [
        { name: 'official-with-sha1_hash', value: buildHmacParamString(notification, true) },
        { name: 'fallback-without-sha1_hash', value: buildHmacParamString(notification, false) },
      ]

      for (const variant of hmacVariants) {
        const expectedSign = crypto
          .createHmac('sha256', secret)
          .update(variant.value, 'utf8')
          .digest('hex')

        if (safeCompareHex(receivedSign, expectedSign)) {
          console.log('[YooMoney Webhook] HMAC-SHA256 validation passed:', variant.name)
          return true
        }
      }
    }

    if (receivedSha1) {
      const expectedSha1 = crypto
        .createHash('sha1')
        .update(buildSha1String(notification, secret), 'utf8')
        .digest('hex')

      if (safeCompareHex(receivedSha1, expectedSha1)) {
        console.log('[YooMoney Webhook] SHA1 validation passed')
        return true
      }
    }
  }

  console.error('[YooMoney Webhook] Invalid signature')
  console.error('[YooMoney Webhook] Received sign:', receivedSign || 'none')
  console.error('[YooMoney Webhook] Received sha1_hash:', receivedSha1 || 'none')
  return false
}
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Проверяем тип запроса
    // Telegram отправляет application/json
    // YooMoney отправляет application/x-www-form-urlencoded

    if (contentType.includes('application/json')) {
      // Это Telegram webhook - игнорируем в этом проекте
      console.log('[Unified Webhook] Telegram update received, ignoring');
      return NextResponse.json({ ok: true });
    }

    // Это YooMoney webhook
    const body = await request.text()
    const params = new URLSearchParams(body)

    const notification: Record<string, string> = {}
    params.forEach((value, key) => {
      notification[key] = value
    })

    console.log('[YooMoney Webhook] Received notification:', notification)

    // Validate signature
    if (!validateYooMoneyNotification(notification)) {
      console.error('[YooMoney Webhook] Invalid signature')
      return new NextResponse('Invalid signature', { status: 403 })
    }

    // Check if payment is accepted
    const unaccepted = params.get('unaccepted')
    if (unaccepted === 'true') {
      console.log('[YooMoney Webhook] Payment not accepted yet')
      return new NextResponse('OK', { status: 200 })
    }

    const paymentId = notification.label
    const amount = parseFloat(notification.amount || '0')

    if (!paymentId) {
      console.error('[YooMoney Webhook] Missing payment ID')
      return new NextResponse('Missing payment ID', { status: 400 })
    }

    // Определяем какой проект по формату label
    // Если label содержит UUID - это мини-апп (subscription_id)
    // Если label это transaction ID из Prisma - это dashboard

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId.split('_')[0]);

    if (isUUID) {
      // Это мини-апп (PostgreSQL)
      console.log('[YooMoney Webhook] Processing mini-app payment')

      const paymentResult = await query(
        `SELECT p.*, s.user_id, s.plan_id, s.devices_count
         FROM payments p
         JOIN subscriptions s ON p.subscription_id = s.id
         WHERE p.provider_payment_id = $1 AND p.status = 'pending'`,
        [paymentId]
      )

      if (paymentResult.rows.length === 0) {
        // Не нашли в мини-апа БД — проверяем бот-БД
        console.log('[YooMoney Webhook] Not in webapp DB, checking bot DB:', paymentId)
        try {
          const botDb = getBotDb()
          if (botDb) {
            const botPayment = await botQuery(
              `SELECT p.*, u.telegram_id
               FROM payments p
               JOIN users u ON u.id = p.user_id
               WHERE p.id = $1 AND p.status = 'pending'`,
              [paymentId]
            )
            if (botPayment.rows.length > 0) {
              const bp = botPayment.rows[0]
              const meta = typeof bp.metadata === 'string' ? JSON.parse(bp.metadata) : (bp.metadata || {})
              const months: number = meta.months || 1
              const devices: number = meta.devices || 1
              const bypassGb: number = meta.bypass_gb || 15
              const telegramId: number = Number(bp.telegram_id)

              console.log('[YooMoney Webhook] Bot payment found, activating VPN:', { telegramId, months, devices, bypassGb })

              // Активируем VPN через Remnawave
              let subUrl = ''
              if (isRemnawaveConfigured()) {
                try {
                  const vpnUser = await remnawave.createVpnUser(telegramId, months, devices)
                  subUrl = vpnUser?.subscription_url || ''
                  console.log('[YooMoney Webhook] Bot VPN activated:', { subUrl })
                } catch (e) {
                  console.error('[YooMoney Webhook] Remnawave error for bot payment:', e)
                }
              }

              // Отмечаем платёж как выполненный в бот-БД
              await botQuery(
                `UPDATE payments SET status='completed', updated_at=NOW() WHERE id=$1`,
                [paymentId]
              )

              // Уведомляем пользователя через бот
              const bypassStr = bypassGb === 0 ? '♾ Безлимит' : `${bypassGb} ГБ`
              if (subUrl) {
                await sendBotMessage(
                  telegramId,
                  `🎉 <b>Подписка активирована!</b>\n\n` +
                  `🗓 Срок подписки: <b>${fmtMonths(months)}</b>\n` +
                  `⚙️ Кол-во устройств: <b>${devices}</b>\n` +
                  `☁️ Трафик обходов: <b>${bypassStr}</b>\n\n` +
                  `🔗 <b>Ваша ссылка подписки:</b>\n` +
                  `<code>${subUrl}</code>`
                )
              } else {
                await sendBotMessage(
                  telegramId,
                  `✅ <b>Оплата принята!</b>\n\n` +
                  `⚠️ При активации VPN произошла ошибка. Менеджер выдаст подписку вручную.`
                )
              }

              return new NextResponse('OK', { status: 200 })
            }
          }
        } catch (botErr) {
          console.error('[YooMoney Webhook] Bot DB lookup error:', botErr)
        }

        console.error('[YooMoney Webhook] Payment not found in any DB:', paymentId)
        return new NextResponse('Payment not found', { status: 404 })
      }

      const payment = paymentResult.rows[0]

      // Update payment status
      await query(
        `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      )

      // Get subscription details with plan
      const subResult = await query(
        `SELECT s.*, sp.duration_months, u.telegram_id
         FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1`,
        [payment.subscription_id]
      )

      if (subResult.rows.length === 0) {
        console.error('[YooMoney Webhook] Subscription not found')
        return new NextResponse('Subscription not found', { status: 404 })
      }

      const subscription = subResult.rows[0]
      const devicesCount = Math.max(1, parseInt(subscription.devices_count) || 1)

      // If user already has an active subscription, extend it; else start from now
      const activeSubResult = await query(
        `SELECT expires_at FROM subscriptions
         WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1`,
        [payment.user_id]
      )
      const baseDate = activeSubResult.rows[0]?.expires_at
        ? new Date(activeSubResult.rows[0].expires_at)
        : new Date()
      const expiresAt = new Date(baseDate)
      expiresAt.setMonth(expiresAt.getMonth() + subscription.duration_months)

      // Update subscription status
      await query(
        `UPDATE subscriptions
         SET status = 'active',
             started_at = NOW(),
             expires_at = $1,
             devices_count = $3,
             updated_at = NOW()
         WHERE id = $2`,
        [expiresAt.toISOString(), payment.subscription_id, devicesCount]
      )

      // Create/extend VPN user via Remnawave with correct device limit
      if (isRemnawaveConfigured()) {
        try {
          console.log('[YooMoney Webhook] Creating/extending VPN user in Remnawave', { devicesCount })
          await remnawave.createVpnUser(subscription.telegram_id, subscription.duration_months, devicesCount)
          console.log('[YooMoney Webhook] ✅ VPN user provisioned')
        } catch (remnawaveError) {
          console.error('[YooMoney Webhook] ❌ Remnawave error:', remnawaveError)
        }
      }

      console.log('[YooMoney Webhook] Mini-app payment processed successfully:', {
        paymentId,
        userId: payment.user_id,
        amount: payment.amount_rub
      })
    } else {
      // Это dashboard (Prisma/SQLite)
      console.log('[YooMoney Webhook] Processing dashboard payment')

      // Используем fetch для обращения к dashboard API
      const dashboardUrl = process.env.DASHBOARD_API_URL || 'http://localhost:3000'

      try {
        const response = await fetch(`${dashboardUrl}/api/payment/yoomoney/process-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: paymentId,
            amount,
            notification
          })
        })

        if (!response.ok) {
          console.error('[YooMoney Webhook] Dashboard processing failed')
          return new NextResponse('Dashboard processing failed', { status: 500 })
        }

        console.log('[YooMoney Webhook] Dashboard payment processed successfully')
      } catch (error) {
        console.error('[YooMoney Webhook] Error calling dashboard API:', error)
        return new NextResponse('Error processing dashboard payment', { status: 500 })
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error: any) {
    console.error('[Unified Webhook] Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
