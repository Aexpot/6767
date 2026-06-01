import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to manually trigger webhook processing
export async function POST(request: NextRequest) {
  try {
    const { invoice_id } = await request.json()

    if (!invoice_id) {
      return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })
    }

    console.log('Testing webhook for invoice:', invoice_id)

    // Call the actual webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/crystalpay/webhook`

    const testPayload = {
      id: invoice_id,
      state: 'payed',
      amount: '100',
      extra: JSON.stringify({
        telegram_id: 'test',
        subscription_id: 'test',
        plan_id: 'test'
      })
    }

    console.log('Sending test webhook payload:', testPayload)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      webhook_response: result,
      webhook_status: response.status
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
