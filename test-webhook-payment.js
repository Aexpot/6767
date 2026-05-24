// Test webhook payment processing
require('dotenv').config({ path: '.env' })

async function testWebhook() {
  console.log('=== Testing Webhook Payment Processing ===\n')
  
  // Get last pending payment
  const { query } = require('./lib/db')
  
  const result = await query(
    `SELECT p.*, s.plan_id, sp.duration_months, u.telegram_id
     FROM payments p
     JOIN subscriptions s ON p.subscription_id = s.id
     JOIN subscription_plans sp ON s.plan_id = sp.id
     JOIN users u ON p.user_id = u.id
     WHERE p.status = 'pending'
     ORDER BY p.created_at DESC
     LIMIT 1`
  )
  
  if (result.rows.length === 0) {
    console.log('❌ No pending payments found')
    return
  }
  
  const payment = result.rows[0]
  console.log('Found pending payment:')
  console.log('- Payment ID:', payment.id)
  console.log('- Subscription ID:', payment.subscription_id)
  console.log('- Telegram ID:', payment.telegram_id)
  console.log('- Amount:', payment.amount_rub, 'RUB')
  console.log('- Duration:', payment.duration_months, 'months')
  console.log()
  
  // Simulate webhook payload
  const webhookPayload = {
    update_type: 'invoice_paid',
    payload: {
      invoice_id: 'test_' + Date.now(),
      hash: 'TEST_HASH',
      asset: 'USDT',
      amount: '1.57',
      paid_at: new Date().toISOString(),
      payload: JSON.stringify({
        telegram_id: payment.telegram_id,
        subscription_id: payment.subscription_id,
        plan_id: payment.plan_id
      })
    }
  }
  
  console.log('Sending webhook to localhost...')
  
  const response = await fetch('http://localhost:3001/api/payment/cryptopay/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(webhookPayload)
  })
  
  const responseData = await response.json()
  console.log('Response:', response.status, responseData)
  console.log()
  
  // Check payment status
  const checkResult = await query(
    'SELECT status, updated_at FROM payments WHERE id = $1',
    [payment.id]
  )
  
  console.log('Payment status after webhook:', checkResult.rows[0].status)
  
  // Check subscription status
  const subResult = await query(
    'SELECT status, expires_at FROM subscriptions WHERE id = $1',
    [payment.subscription_id]
  )
  
  console.log('Subscription status:', subResult.rows[0].status)
  console.log('Expires at:', subResult.rows[0].expires_at)
  
  process.exit(0)
}

testWebhook().catch(console.error)
