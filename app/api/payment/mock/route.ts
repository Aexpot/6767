import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, telegram_id, plan_id, devices_count = 1, payment_method = 'sbp' } = body

    // Support both user_id and telegram_id
    let userId = user_id
    if (!userId && telegram_id) {
      // Get user_id from telegram_id
      try {
        const userResult = await query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id])
        if (userResult.rows.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        userId = userResult.rows[0].id
      } catch (dbError) {
        // If database fails, just use telegram_id as userId for mock
        userId = telegram_id.toString()
      }
    }

    if (!userId || !plan_id) {
      return NextResponse.json({ error: 'user_id and plan_id are required' }, { status: 400 })
    }

    // Mock payment URL
    const mockPaymentUrl = `https://demo-payment.xovpn.in/pay/${Date.now()}`

    return NextResponse.json({
      success: true,
      payment_id: `mock_${Date.now()}`,
      payment_url: mockPaymentUrl,
      amount: 199,
      message: 'Mock payment created (database not configured)'
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
