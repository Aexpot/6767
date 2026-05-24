import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { crystalPay } from '@/lib/crystalpay'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

export async function POST(request: NextRequest) {
  try {
    const { payment_id } = await request.json()

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id required' }, { status: 400 })
    }

    console.log('Manual payment check for:', payment_id)

    // Check payment status via CrystalPay API
    const invoice = await crystalPay.getInvoice(payment_id)

    console.log('Invoice status from CrystalPay:', invoice.status)

    if (invoice.status !== 'payed' && invoice.status !== 'paid') {
      return NextResponse.json({
        success: false,
        message: 'Платеж еще не оплачен',
        status: invoice.status
      })
    }

    // Get payment from DB
    const paymentResult = await query(
      `SELECT p.*, s.id as subscription_id, s.user_id, sp.duration_months
       FROM payments p
       JOIN subscriptions s ON p.subscription_id = s.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE p.provider_payment_id = $1`,
      [payment_id]
    )

    if (paymentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentResult.rows[0]

    // Check if already completed
    if (payment.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Платеж уже обработан',
        already_completed: true
      })
    }

    // Update payment status
    await query(
      `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE provider_payment_id = $1`,
      [payment_id]
    )

    // Activate subscription
    const startsAt = new Date()
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + payment.duration_months)

    await query(
      `UPDATE subscriptions
       SET status = 'active',
           started_at = $1,
           expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [startsAt.toISOString(), expiresAt.toISOString(), payment.subscription_id]
    )

    // Get telegram_id
    const userResult = await query(
      `SELECT telegram_id FROM users WHERE id = $1`,
      [payment.user_id]
    )

    if (userResult.rows.length > 0) {
      const telegram_id = userResult.rows[0].telegram_id

      // Create VPN user
      if (isRemnawaveConfigured()) {
        try {
          console.log('=== Creating VPN user in Remnawave ===')
          console.log('Telegram ID:', telegram_id)
          console.log('Duration (months):', payment.duration_months)
          console.log('Remnawave URL:', process.env.REMNAWAVE_API_URL)

          const vpnUser = await remnawave.createVpnUser(telegram_id, payment.duration_months)

          console.log('✅ VPN user created/extended successfully!')
          console.log('Username:', vpnUser.username)
          console.log('Status:', vpnUser.status)
          console.log('Expires:', vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never')
          console.log('Links count:', vpnUser.links?.length || 0)
        } catch (error) {
          console.error('❌ Remnawave error:', error)
          console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
        }
      } else {
        console.error('⚠️  Remnawave not configured! VPN user will NOT be created.')
        console.error('Missing env vars:', {
          REMNAWAVE_API_URL: !!process.env.REMNAWAVE_API_URL,
          REMNAWAVE_API_TOKEN: !!process.env.REMNAWAVE_API_TOKEN,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Платеж успешно активирован',
      expires_at: expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Manual check error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
