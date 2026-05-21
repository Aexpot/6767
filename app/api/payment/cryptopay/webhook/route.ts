import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { cryptoPay } from '@/lib/cryptopay'
import { marzban, isMarzbanConfigured } from '@/lib/marzban'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('crypto-pay-api-signature')
    const body = await request.text()

    // Skip signature verification for testing if CRYPTOPAY_WEBHOOK_SECRET is not set
    const requireSignature = process.env.NODE_ENV === 'production' || process.env.CRYPTOPAY_WEBHOOK_SECRET

    if (requireSignature) {
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }

      // Verify webhook signature
      const isValid = cryptoPay.verifyWebhookSignature(body, signature)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('Webhook signature verification skipped - CRYPTOPAY_WEBHOOK_SECRET not set')
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

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + subscription.duration_months)

    // Update subscription status
    await query(
      `UPDATE subscriptions
       SET status = 'active',
           started_at = NOW(),
           expires_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [expiresAt.toISOString(), subscription_id]
    )

    // Create VPN user via Marzban
    if (isMarzbanConfigured()) {
      try {
        console.log('=== Creating VPN user in Marzban ===')
        console.log('Telegram ID:', telegram_id)
        console.log('Duration (months):', subscription.duration_months)
        console.log('Marzban URL:', process.env.MARZBAN_API_URL)

        const vpnUser = await marzban.createVpnUser(telegram_id, subscription.duration_months)

        console.log('✅ VPN user created/extended successfully!')
        console.log('Username:', vpnUser.username)
        console.log('Status:', vpnUser.status)
        console.log('Expires:', vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never')
        console.log('Links count:', vpnUser.links?.length || 0)
        console.log('Subscription URL:', vpnUser.subscription_url)
      } catch (marzbanError) {
        console.error('❌ Marzban error:', marzbanError)
        console.error('Error details:', marzbanError instanceof Error ? marzbanError.message : 'Unknown error')
        console.error('Stack:', marzbanError instanceof Error ? marzbanError.stack : 'No stack')
        // Don't fail the webhook if Marzban fails
      }
    } else {
      console.error('⚠️  Marzban not configured! VPN user will NOT be created.')
      console.error('Missing env vars:', {
        MARZBAN_API_URL: !!process.env.MARZBAN_API_URL,
        MARZBAN_USERNAME: !!process.env.MARZBAN_USERNAME,
        MARZBAN_PASSWORD: !!process.env.MARZBAN_PASSWORD
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
