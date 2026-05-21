// Check real Marzban subscription URL
require('dotenv').config({ path: '.env' })

const MARZBAN_API_URL = process.env.MARZBAN_API_URL?.replace(/\/$/, '')
const MARZBAN_USERNAME = process.env.MARZBAN_USERNAME
const MARZBAN_PASSWORD = process.env.MARZBAN_PASSWORD

async function checkRealSubscriptionUrl() {
  console.log('=== Проверка реального subscription URL из Marzban ===\n')

  try {
    // Get token
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

    const { access_token } = await authResponse.json()
    console.log('✅ Authenticated\n')

    // Get user
    const username = 'tg_8329401174'
    const userResponse = await fetch(`${MARZBAN_API_URL}/api/user/${username}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    const user = await userResponse.json()

    console.log('Username:', user.username)
    console.log('Status:', user.status)
    console.log('Expires:', user.expire ? new Date(user.expire * 1000).toISOString() : 'Never')
    console.log('')
    console.log('subscription_url from Marzban:', user.subscription_url)
    console.log('Full URL:', MARZBAN_API_URL + user.subscription_url)
    console.log('')
    console.log('Links count:', user.links?.length || 0)

    if (user.links && user.links.length > 0) {
      console.log('\nПервые 3 ключа:')
      user.links.slice(0, 3).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.substring(0, 60)}...`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkRealSubscriptionUrl()
