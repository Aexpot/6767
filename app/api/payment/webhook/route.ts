import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { marzban, isMarzbanConfigured } from '@/lib/marzban'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payment_id, status, provider_payment_id } = body

    // In production, verify Pally webhook signature here

    if (!payment_id || !status) {
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
    }

    // Get payment with subscription and plan details
    const paymentResult = await query(
      `SELECT p.*, s.id as subscription_id, s.user_id as sub_user_id, sp.name as plan_name, sp.duration_months
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE p.id = $1`,
      [payment_id]
    )

    if (paymentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentResult.rows[0]

    if (status === 'completed' || status === 'success') {
      if (payment.subscription_id && payment.plan_name) {
        // Activate subscription
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + payment.duration_months)

        await query(
          `UPDATE subscriptions
           SET status = 'active',
               started_at = NOW(),
               expires_at = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [expiresAt.toISOString(), payment.subscription_id]
        )

        // Update payment status
        await query(
          `UPDATE payments
           SET status = 'completed',
               provider_payment_id = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [provider_payment_id, payment_id]
        )

        // Create transaction record
        await query(
          `INSERT INTO transactions (user_id, payment_id, type, amount_rub, description)
           VALUES ($1, $2, 'payment', $3, $4)`,
          [payment.user_id, payment_id, payment.amount_rub, `Оплата подписки: ${payment.plan_name}`]
        )

        // Create VPN user via Marzban
        if (isMarzbanConfigured()) {
          try {
            const userResult = await query(
              'SELECT telegram_id FROM users WHERE id = $1',
              [payment.user_id]
            )

            if (userResult.rows.length > 0) {
              const telegram_id = userResult.rows[0].telegram_id

              console.log('=== Creating VPN user in Marzban ===')
              console.log('Telegram ID:', telegram_id)
              console.log('Duration (months):', payment.duration_months)
              console.log('Marzban URL:', process.env.MARZBAN_API_URL)

              const vpnUser = await marzban.createVpnUser(telegram_id, payment.duration_months)

              console.log('✅ VPN user created/extended successfully!')
              console.log('Username:', vpnUser.username)
              console.log('Status:', vpnUser.status)
              console.log('Expires:', vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never')
              console.log('Links count:', vpnUser.links?.length || 0)
            }
          } catch (vpnError) {
            console.error('❌ Failed to create VPN user:', vpnError)
            console.error('Error details:', vpnError instanceof Error ? vpnError.message : 'Unknown error')
            // Don't fail the webhook if VPN creation fails
          }
        } else {
          console.error('⚠️  Marzban not configured! VPN user will NOT be created.')
          console.error('Missing env vars:', {
            MARZBAN_API_URL: !!process.env.MARZBAN_API_URL,
            MARZBAN_USERNAME: !!process.env.MARZBAN_USERNAME,
            MARZBAN_PASSWORD: !!process.env.MARZBAN_PASSWORD
          })
        }

        // Check for referral bonus
        const userResult = await query(
          'SELECT referred_by FROM users WHERE id = $1',
          [payment.user_id]
        )

        if (userResult.rows.length > 0 && userResult.rows[0].referred_by) {
          const referred_by = userResult.rows[0].referred_by
          
          // Award 15% bonus days to referrer
          const bonusDays = Math.ceil(payment.duration_months * 30 * 0.15)
          
          await query(
            `INSERT INTO referral_bonuses (referrer_id, referred_id, bonus_days, payment_id)
             VALUES ($1, $2, $3, $4)`,
            [referred_by, payment.user_id, bonusDays, payment_id]
          )

          // Extend referrer's subscription
          const referrerSubResult = await query(
            `SELECT * FROM subscriptions
             WHERE user_id = $1 AND status = 'active'
             LIMIT 1`,
            [referred_by]
          )

          if (referrerSubResult.rows.length > 0) {
            const referrerSub = referrerSubResult.rows[0]
            const newExpiry = new Date(referrerSub.expires_at)
            newExpiry.setDate(newExpiry.getDate() + bonusDays)

            await query(
              `UPDATE subscriptions
               SET expires_at = $1, updated_at = NOW()
               WHERE id = $2`,
              [newExpiry.toISOString(), referrerSub.id]
            )
          }
        }
      }
    } else if (status === 'failed') {
      await query(
        `UPDATE payments
         SET status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [payment_id]
      )

      if (payment.subscription_id) {
        await query(
          `UPDATE subscriptions
           SET status = 'cancelled', updated_at = NOW()
           WHERE id = $1`,
          [payment.subscription_id]
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
