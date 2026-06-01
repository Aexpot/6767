// Setup CryptoPay webhook
require('dotenv').config({ path: '.env' })
const crypto = require('crypto')

const CRYPTOPAY_API_TOKEN = process.env.CRYPTOPAY_API_TOKEN
const WEBHOOK_URL = 'https://app.championvpn.fun/api/payment/cryptopay/webhook'

async function setupWebhook() {
  console.log('=== Setting up CryptoPay Webhook ===\n')
  
  if (!CRYPTOPAY_API_TOKEN) {
    console.error('❌ CRYPTOPAY_API_TOKEN not found in .env')
    process.exit(1)
  }

  // Generate webhook secret
  const webhookSecret = crypto.randomBytes(32).toString('hex')
  console.log('✅ Generated webhook secret:', webhookSecret)
  console.log()

  // Set webhook URL
  try {
    const response = await fetch('https://pay.crypt.bot/api/setWebhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': CRYPTOPAY_API_TOKEN
      },
      body: JSON.stringify({
        webhook_url: WEBHOOK_URL
      })
    })

    const data = await response.json()
    
    if (data.ok) {
      console.log('✅ Webhook URL set successfully!')
      console.log('Webhook URL:', WEBHOOK_URL)
      console.log()
      console.log('📝 Add this to your .env file:')
      console.log(`CRYPTOPAY_WEBHOOK_SECRET=${webhookSecret}`)
      console.log()
      console.log('Then restart PM2:')
      console.log('pm2 restart all')
    } else {
      console.error('❌ Failed to set webhook:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

setupWebhook()
