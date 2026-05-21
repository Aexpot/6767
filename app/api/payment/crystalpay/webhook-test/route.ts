import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint to verify webhook is accessible
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'CrystalPay webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/crystalpay/webhook`
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log('Test webhook POST received:', body)

  return NextResponse.json({
    status: 'ok',
    message: 'Test webhook received',
    received: body,
    timestamp: new Date().toISOString()
  })
}
