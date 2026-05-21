import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const payment_id = searchParams.get('payment_id')

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id is required' }, { status: 400 })
    }

    // Check specific payment status - try both provider_payment_id and id
    const result = await query(
      `SELECT p.*, s.status as subscription_status, s.expires_at
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.provider_payment_id = $1 OR p.id::text = $1`,
      [payment_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        error: 'Payment not found'
      }, { status: 404 })
    }

    const payment = result.rows[0]

    return NextResponse.json({
      payment_id: payment.provider_payment_id || payment.id,
      payment_status: payment.status,
      subscription_status: payment.subscription_status,
      is_paid: payment.status === 'completed',
      is_active: payment.subscription_status === 'active',
      expires_at: payment.expires_at
    })
  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
