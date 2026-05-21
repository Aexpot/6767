// Test full subscription flow with Marzban
require('dotenv').config({ path: '.env' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const MARZBAN_API_URL = process.env.MARZBAN_API_URL?.replace(/\/$/, '')
const MARZBAN_USERNAME = process.env.MARZBAN_USERNAME
const MARZBAN_PASSWORD = process.env.MARZBAN_PASSWORD

async function getMarzbanToken() {
  const response = await fetch(`${MARZBAN_API_URL}/api/admin/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: MARZBAN_USERNAME,
      password: MARZBAN_PASSWORD,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to authenticate with Marzban')
  }

  const data = await response.json()
  return data.access_token
}

async function getMarzbanUser(token, username) {
  const response = await fetch(`${MARZBAN_API_URL}/api/user/${username}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

async function testSubscriptionFlow() {
  console.log('=== Testing Subscription Flow ===\n')

  try {
    // Step 1: Check existing subscriptions in DB
    console.log('Step 1: Checking database for active subscriptions...')
    const subsResult = await pool.query(`
      SELECT s.*, u.telegram_id, sp.name as plan_name, sp.duration_months
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 5
    `)

    console.log(`Found ${subsResult.rows.length} active subscriptions\n`)

    if (subsResult.rows.length === 0) {
      console.log('⚠️  No active subscriptions found in database')
      console.log('Please make a test payment first to check the flow\n')
      return
    }

    // Step 2: Check each subscription in Marzban
    console.log('Step 2: Verifying subscriptions in Marzban...\n')
    const token = await getMarzbanToken()

    for (const sub of subsResult.rows) {
      console.log(`Checking subscription #${sub.id}:`)
      console.log(`  User: ${sub.telegram_id}`)
      console.log(`  Plan: ${sub.plan_name} (${sub.duration_months} months)`)
      console.log(`  Status: ${sub.status}`)
      console.log(`  Expires: ${sub.expires_at}`)

      const marzbanUsername = `tg_${sub.telegram_id}`
      const marzbanUser = await getMarzbanUser(token, marzbanUsername)

      if (marzbanUser) {
        console.log(`  ✅ Marzban user exists!`)
        console.log(`     Status: ${marzbanUser.status}`)
        console.log(`     Expires: ${marzbanUser.expire ? new Date(marzbanUser.expire * 1000).toISOString() : 'Never'}`)
        console.log(`     Links: ${marzbanUser.links?.length || 0}`)
        console.log(`     Subscription URL: ${marzbanUser.subscription_url}`)
      } else {
        console.log(`  ❌ Marzban user NOT found!`)
        console.log(`     Expected username: ${marzbanUsername}`)
        console.log(`     This subscription was paid but VPN access was not created!`)
      }
      console.log('')
    }

    // Step 3: Check recent payments
    console.log('Step 3: Checking recent payments...')
    const paymentsResult = await pool.query(`
      SELECT p.*, s.id as subscription_id, u.telegram_id
      FROM payments p
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY p.created_at DESC
      LIMIT 10
    `)

    console.log(`Found ${paymentsResult.rows.length} payments in last 24 hours\n`)

    const completedPayments = paymentsResult.rows.filter(p => p.status === 'completed')
    const pendingPayments = paymentsResult.rows.filter(p => p.status === 'pending')

    console.log(`  Completed: ${completedPayments.length}`)
    console.log(`  Pending: ${pendingPayments.length}`)

    if (completedPayments.length > 0) {
      console.log('\nRecent completed payments:')
      for (const payment of completedPayments.slice(0, 3)) {
        console.log(`  - Payment #${payment.id}: ${payment.amount_rub} RUB`)
        console.log(`    Telegram ID: ${payment.telegram_id}`)
        console.log(`    Provider: ${payment.provider}`)
        console.log(`    Subscription: ${payment.subscription_id || 'N/A'}`)
      }
    }

    console.log('\n=== Summary ===')
    console.log(`✅ Marzban is configured and accessible`)
    console.log(`✅ Database has ${subsResult.rows.length} active subscriptions`)
    console.log(`✅ ${completedPayments.length} payments completed in last 24h`)
    console.log('\nIf you see "Marzban user NOT found" above, that means:')
    console.log('- The payment webhook did not create the VPN user')
    console.log('- Check PM2 logs for errors: pm2 logs championvpn')
    console.log('- The fix we just applied should prevent this in future payments')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

testSubscriptionFlow()
