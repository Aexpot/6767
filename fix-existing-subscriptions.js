// Fix existing subscriptions by creating Marzban users
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

async function createMarzbanUser(token, telegramId, expiresAt) {
  const username = `tg_${telegramId}`
  const expireTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000)

  console.log(`  Creating user: ${username}`)
  console.log(`  Expires: ${expiresAt} (timestamp: ${expireTimestamp})`)

  const response = await fetch(`${MARZBAN_API_URL}/api/user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      proxies: {
        vless: {},
        shadowsocks: {},
      },
      inbounds: {
        vless: ['OZON'],
        shadowsocks: ['Shadowsocks TCP'],
      },
      expire: expireTimestamp,
      status: 'active',
      note: `Telegram ID: ${telegramId} (Fixed on ${new Date().toISOString()})`,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create user: ${response.status} - ${errorText}`)
  }

  return response.json()
}

async function fixExistingSubscriptions() {
  console.log('=== Fixing Existing Subscriptions ===\n')

  try {
    // Get all active subscriptions without VPN users
    console.log('Step 1: Finding active subscriptions...')
    const subsResult = await pool.query(`
      SELECT s.*, u.telegram_id, sp.name as plan_name, sp.duration_months
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active' AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `)

    console.log(`Found ${subsResult.rows.length} active subscriptions\n`)

    if (subsResult.rows.length === 0) {
      console.log('No active subscriptions to fix')
      return
    }

    // Get Marzban token
    console.log('Step 2: Authenticating with Marzban...')
    const token = await getMarzbanToken()
    console.log('✅ Authenticated\n')

    // Create VPN users for each subscription
    console.log('Step 3: Creating VPN users...\n')
    let successCount = 0
    let errorCount = 0

    for (const sub of subsResult.rows) {
      console.log(`Processing subscription #${sub.id}:`)
      console.log(`  Telegram ID: ${sub.telegram_id}`)
      console.log(`  Plan: ${sub.plan_name}`)
      console.log(`  Expires: ${sub.expires_at}`)

      try {
        const user = await createMarzbanUser(token, sub.telegram_id, sub.expires_at)
        console.log(`  ✅ VPN user created successfully!`)
        console.log(`     Username: ${user.username}`)
        console.log(`     Status: ${user.status}`)
        console.log(`     Links: ${user.links?.length || 0}`)
        console.log(`     Subscription URL: ${MARZBAN_API_URL}${user.subscription_url}`)
        successCount++
      } catch (error) {
        console.error(`  ❌ Failed to create VPN user:`, error.message)
        errorCount++
      }
      console.log('')
    }

    console.log('=== Summary ===')
    console.log(`✅ Successfully created: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`\nAll existing subscriptions have been fixed!`)
    console.log(`Users can now get their VPN links from the bot.`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

fixExistingSubscriptions()
