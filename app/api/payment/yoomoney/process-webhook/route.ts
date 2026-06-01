import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { paymentId, amount, notification } = await request.json();

    console.log('[YooMoney Process Webhook] Processing mini-app payment:', { paymentId, amount });

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    // Find payment by provider_payment_id
    const paymentResult = await query(
      `SELECT p.*, s.user_id, s.plan_id, s.devices_count
       FROM payments p
       JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.provider_payment_id = $1 AND p.status = 'pending'`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      console.error('[YooMoney Process Webhook] Payment not found:', paymentId);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = paymentResult.rows[0];

    // Update payment status
    await query(
      `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [payment.id]
    );

    // Update subscription status
    await query(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [payment.subscription_id]
    );

    console.log('[YooMoney Process Webhook] Mini-app payment processed successfully:', {
      paymentId,
      userId: payment.user_id,
      amount: payment.amount_rub
    });

    return NextResponse.json({ message: 'Payment processed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[YooMoney Process Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
