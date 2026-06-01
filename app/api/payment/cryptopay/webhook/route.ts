import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { cryptoPay } from '@/lib/cryptopay'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('crypto-pay-api-signature')
    const body = await request.text()

    console.log('[WEBHOOK] Received webhook, signature:', signature ? 'present' : 'missing')
    console.log('[WEBHOOK] Body length:', body.length)

    // Verify webhook signature
    if (!signature || !cryptoPay.verifyWebhookSignature(body, signature)) {
      console.error('[WEBHOOK] Invalid or missing signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body)
    const { update_type, payload: invoice } = data

    if (update_type !== 'invoice_paid') {
      return NextResponse.json({ ok: true })
    }

    // Parse payload from invoice
    const payloadData = JSON.parse(invoice.payload || '{}')
    const { subscription_id, telegram_id } = payloadData

    if (!subscription_id || !telegram_id) {
      console.error('Missing subscription_id or telegram_id in webhook payload')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Update payment status
    const paymentResult = await query(
      `UPDATE payments
       SET status = 'completed',
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{crypto_payment}',
             $1::jsonb
           ),
           updated_at = NOW()
       WHERE subscription_id = $2 AND status = 'pending'
       RETURNING *`,
      [
        JSON.stringify({
          crypto_paid_at: invoice.paid_at,
          crypto_invoice_id: invoice.invoice_id,
          crypto_hash: invoice.hash,
          crypto_asset: invoice.asset,
          crypto_amount: invoice.amount
        }),
        subscription_id
      ]
    )

    if (paymentResult.rows.length === 0) {
      console.error('Payment not found for subscription:', subscription_id)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const paidPayment = paymentResult.rows[0]

    // Get subscription details
    const subResult = await query(
      `SELECT s.*, sp.name, sp.duration_months, sp.price_rub
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.id = $1`,
      [subscription_id]
    )

    if (subResult.rows.length === 0) {
      console.error('Subscription not found:', subscription_id)
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const subscription = subResult.rows[0]
    const devicesCount = Math.max(1, parseInt(subscription.devices_count) || 1)

    // Extend if user has active subscription, else start from now
    const activeSubResult = await query(
      `SELECT expires_at FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [subscription.user_id]
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
      [expiresAt.toISOString(), subscription_id, devicesCount]
    )

    // Create VPN user via Remnawave
    if (isRemnawaveConfigured()) {
      try {
        console.log('=== Creating VPN user in Remnawave ===', { telegram_id, months: subscription.duration_months, devicesCount })

        const vpnUser = await remnawave.createVpnUser(telegram_id, subscription.duration_months, devicesCount)

        console.log('✅ VPN user created/extended successfully!')
        console.log('Username:', vpnUser.username)
        console.log('Status:', vpnUser.status)
        console.log('Expires:', vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never')
        console.log('Links count:', vpnUser.links?.length || 0)
        console.log('Subscription URL:', vpnUser.subscription_url)
      } catch (remnawaveError) {
        console.error('❌ Remnawave error:', remnawaveError)
        console.error('Error details:', remnawaveError instanceof Error ? remnawaveError.message : 'Unknown error')
        console.error('Stack:', remnawaveError instanceof Error ? remnawaveError.stack : 'No stack')
        // Don't fail the webhook if Remnawave fails
      }
    } else {
      console.error('⚠️  Remnawave not configured! VPN user will NOT be created.')
      console.error('Missing env vars:', {
        REMNAWAVE_API_URL: !!process.env.REMNAWAVE_API_URL,
        REMNAWAVE_API_TOKEN: !!process.env.REMNAWAVE_API_TOKEN,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
