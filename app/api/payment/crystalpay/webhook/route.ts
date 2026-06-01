import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { crystalPay } from '@/lib/crystalpay'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('=== CrystalPay webhook received ===')
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('Headers:', Object.fromEntries(request.headers.entries()))

    // Verify signature - CrystalPay sends signature in body, not header
    const signature = body.signature
    if (!signature) {
      console.error('Missing signature in body')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    console.log('Signature from body:', signature)

    const isValid = crystalPay.verifyWebhookSignature(body, signature)
    console.log('Signature valid:', isValid)

    if (!isValid) {
      console.error('Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // CrystalPay sends payment info in body
    const { id, state, extra, amount } = body

    console.log('Payment details:', { id, state, amount, extra })

    // Only process if payment is actually paid
    if (state !== 'payed') {
      console.log('Payment not completed, state:', state)
      return NextResponse.json({ ok: true, message: 'Payment not completed yet' })
    }

    // Double-check payment status via API
    try {
      console.log('Verifying invoice status via API for id:', id)
      const invoiceInfo = await crystalPay.getInvoice(id)
      console.log('Invoice info from API:', invoiceInfo)

      if (invoiceInfo.status !== 'payed') {
        console.log('Invoice not paid according to API, status:', invoiceInfo.status)
        return NextResponse.json({ ok: true, message: 'Invoice not paid yet' })
      }
    } catch (apiError) {
      console.error('Failed to verify invoice status:', apiError)
      // Continue anyway if API check fails
    }

    // Parse extra data
    const extraData = JSON.parse(extra || '{}')
    const { telegram_id, subscription_id, plan_id } = extraData

    console.log('Parsed extra data:', { telegram_id, subscription_id, plan_id })

    if (!subscription_id || !telegram_id) {
      console.error('Missing subscription_id or telegram_id in webhook')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('Processing payment:', { id, telegram_id, subscription_id, plan_id })

    // Update payment status
    console.log('Updating payment status for provider_payment_id:', id)
    const paymentResult = await query(
      `UPDATE payments
       SET status = 'completed',
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{crystalpay_payment}',
             $1::jsonb
           ),
           updated_at = NOW()
       WHERE provider_payment_id = $2 AND status = 'pending'
       RETURNING *`,
      [
        JSON.stringify({
          payment_id: id,
          state: state,
          paid_at: new Date().toISOString()
        }),
        id
      ]
    )

    console.log('Payment update result:', paymentResult.rows.length > 0 ? 'Success' : 'Not found')

    if (paymentResult.rows.length === 0) {
      console.error('Payment not found or already processed:', id)
      return NextResponse.json({ error: 'Payment not found or already processed' }, { status: 404 })
    }

    console.log('Payment updated:', paymentResult.rows[0])

    // Get subscription details
    console.log('Fetching subscription details for id:', subscription_id)
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
    console.log('Subscription found:', subscription)

    // Check if user has existing active subscription
    console.log('Checking for existing active subscriptions')
    const existingSubResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = (SELECT user_id FROM subscriptions WHERE id = $1)
       AND status = 'active'
       AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [subscription_id]
    )

    console.log('Existing active subscriptions found:', existingSubResult.rows.length)

    let expiresAt: Date
    let startsAt: Date

    if (existingSubResult.rows.length > 0) {
      // User has active subscription - add time to it
      const existingSub = existingSubResult.rows[0]

      if (existingSub.id === subscription_id) {
        // This is the same subscription being activated - start from now
        console.log('Activating current subscription')
        startsAt = new Date()
        expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + subscription.duration_months)
      } else {
        // User has another active subscription - extend it
        console.log('Extending existing subscription:', existingSub.id)
        expiresAt = new Date(existingSub.expires_at)
        expiresAt.setMonth(expiresAt.getMonth() + subscription.duration_months)
        startsAt = new Date(existingSub.started_at)

        // Update the existing subscription instead of the new one
        await query(
          `UPDATE subscriptions
           SET expires_at = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [expiresAt.toISOString(), existingSub.id]
        )

        console.log('Extended existing subscription to:', expiresAt)
      }
    } else {
      // No active subscription - start from now
      console.log('Creating new subscription period')
      startsAt = new Date()
      expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + subscription.duration_months)
    }

    console.log('Subscription dates:', { startsAt, expiresAt })

    // Update subscription status
    console.log('Activating subscription:', subscription_id)
    const updateResult = await query(
      `UPDATE subscriptions
       SET status = 'active',
           started_at = $1,
           expires_at = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [startsAt.toISOString(), expiresAt.toISOString(), subscription_id]
    )

    console.log('Subscription activated:', updateResult.rows[0])

    // Create VPN user via Remnawave
    if (isRemnawaveConfigured()) {
      try {
        console.log('=== Creating VPN user in Remnawave ===')
        console.log('Telegram ID:', telegram_id)
        console.log('Duration (months):', subscription.duration_months)
        console.log('Remnawave URL:', process.env.REMNAWAVE_API_URL)

        const vpnUser = await remnawave.createVpnUser(telegram_id, subscription.duration_months)

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

    console.log('=== Webhook processing completed successfully ===')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('=== Webhook error ===')
    console.error('Error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
