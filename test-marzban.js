// Test Marzban API connection
require('dotenv').config({ path: '.env' })

const MARZBAN_API_URL = process.env.MARZBAN_API_URL?.replace(/\/$/, '')
const MARZBAN_USERNAME = process.env.MARZBAN_USERNAME
const MARZBAN_PASSWORD = process.env.MARZBAN_PASSWORD

async function testMarzbanConnection() {
  console.log('=== Testing Marzban Connection ===')
  console.log('API URL:', MARZBAN_API_URL)
  console.log('Username:', MARZBAN_USERNAME)
  console.log('Password:', MARZBAN_PASSWORD ? '***' + MARZBAN_PASSWORD.slice(-4) : 'NOT SET')
  console.log('')

  if (!MARZBAN_API_URL || !MARZBAN_USERNAME || !MARZBAN_PASSWORD) {
    console.error('❌ Marzban credentials not configured!')
    return
  }

  try {
    // Step 1: Get authentication token
    console.log('Step 1: Authenticating...')
    const authResponse = await fetch(`${MARZBAN_API_URL}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: MARZBAN_USERNAME,
        password: MARZBAN_PASSWORD,
      }),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('❌ Authentication failed:', authResponse.status, errorText)
      return
    }

    const authData = await authResponse.json()
    console.log('✅ Authentication successful!')
    console.log('Token:', authData.access_token.substring(0, 20) + '...')
    console.log('')

    // Step 2: Get system stats
    console.log('Step 2: Getting system stats...')
    const statsResponse = await fetch(`${MARZBAN_API_URL}/api/system`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
      },
    })

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text()
      console.error('❌ Failed to get system stats:', statsResponse.status, errorText)
      return
    }

    const stats = await statsResponse.json()
    console.log('✅ System stats retrieved!')
    console.log('Version:', stats.version)
    console.log('Total users:', stats.total_user)
    console.log('Active users:', stats.users_active)
    console.log('')

    // Step 3: Get inbounds
    console.log('Step 3: Getting inbounds...')
    const inboundsResponse = await fetch(`${MARZBAN_API_URL}/api/inbounds`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
      },
    })

    if (!inboundsResponse.ok) {
      const errorText = await inboundsResponse.text()
      console.error('❌ Failed to get inbounds:', inboundsResponse.status, errorText)
      return
    }

    const inbounds = await inboundsResponse.json()
    console.log('✅ Inbounds retrieved!')
    console.log('Available inbounds:', JSON.stringify(inbounds, null, 2))
    console.log('')

    // Step 4: Test creating a user
    console.log('Step 4: Testing user creation...')
    const testUsername = `test_${Date.now()}`
    const expireTimestamp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days

    const createUserResponse = await fetch(`${MARZBAN_API_URL}/api/user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUsername,
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
        note: 'Test user from API',
      }),
    })

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text()
      console.error('❌ Failed to create user:', createUserResponse.status, errorText)
      return
    }

    const user = await createUserResponse.json()
    console.log('✅ Test user created successfully!')
    console.log('Username:', user.username)
    console.log('Status:', user.status)
    console.log('Expires:', user.expire ? new Date(user.expire * 1000).toISOString() : 'Never')
    console.log('Subscription URL:', user.subscription_url)
    console.log('Links count:', user.links?.length || 0)
    console.log('')

    // Step 5: Delete test user
    console.log('Step 5: Cleaning up test user...')
    const deleteResponse = await fetch(`${MARZBAN_API_URL}/api/user/${testUsername}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
      },
    })

    if (!deleteResponse.ok) {
      console.error('⚠️  Failed to delete test user:', deleteResponse.status)
    } else {
      console.log('✅ Test user deleted')
    }

    console.log('')
    console.log('=== All tests passed! Marzban is configured correctly ===')
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

testMarzbanConnection()
