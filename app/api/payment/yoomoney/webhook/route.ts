import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function validateYooMoneyNotification(notification: any): boolean {
  const YOOMONEY_SECRET = process.env.YOOMONEY_SECRET

  if (!YOOMONEY_SECRET) {
    console.error('[YooMoney Webhook] YOOMONEY_SECRET not set')
    return false
  }

  const {
    notification_type,
    operation_id,
    amount,
    currency,
    datetime,
    sender,
    codepro,
    label,
    sha1_hash
  } = notification

  const string = [
    notification_type,
    operation_id,
    amount,
    currency,
    datetime,
    sender,
    codepro === 'true' ? 'true' : 'false',
    YOOMONEY_SECRET,
    label
  ].join('&')

  const hash = crypto.createHash('sha1').update(string).digest('hex')

  return hash === sha1_hash
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

    const notification = {
      notification_type: params.get('notification_type'),
      operation_id: params.get('operation_id'),
      amount: params.get('amount'),
      currency: params.get('currency'),
      datetime: params.get('datetime'),
      sender: params.get('sender'),
      codepro: params.get('codepro'),
      label: params.get('label'),
      sha1_hash: params.get('sha1_hash'),
    }

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
        console.error('[YooMoney Webhook] Payment not found:', paymentId)
        return new NextResponse('Payment not found', { status: 404 })
      }

      const payment = paymentResult.rows[0]

      // Update payment status
      await query(
        `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      )

      // Update subscription status
      await query(
        `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [payment.subscription_id]
      )

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
