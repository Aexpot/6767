// Create Marzban subscriptions for all active users including admins
require('dotenv').config({ path: '.env' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const MARZBAN_API_URL = process.env.MARZBAN_API_URL?.replace(/\/$/, '')
const MARZBAN_USERNAME = process.env.MARZBAN_USERNAME
const MARZBAN_PASSWORD = process.env.MARZBAN_PASSWORD

// Admin telegram IDs from .env
const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => id.trim()) || []

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

async function getMarzbanUser(token, telegramId) {
  const username = `tg_${telegramId}`
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

async function createMarzbanUser(token, telegramId, expiresAt) {
  const username = `tg_${telegramId}`
  const expireTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000)

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
      note: `Telegram ID: ${telegramId} (Created: ${new Date().toISOString()})`,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create user: ${response.status} - ${errorText}`)
  }

  return response.json()
}

async function updateMarzbanUser(token, telegramId, expiresAt) {
  const username = `tg_${telegramId}`
  const expireTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000)

  const response = await fetch(`${MARZBAN_API_URL}/api/user/${username}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expire: expireTimestamp,
      status: 'active',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update user: ${response.status} - ${errorText}`)
  }

  return response.json()
}

async function createSubscriptionsForAll() {
  console.log('=== Создание VPN подписок для всех активных пользователей ===\n')
  console.log('Админы:', ADMIN_IDS.join(', '), '\n')

  try {
    // Get Marzban token
    console.log('Шаг 1: Аутентификация в Marzban...')
    const token = await getMarzbanToken()
    console.log('✅ Аутентифицирован\n')

    // Get all active subscriptions
    console.log('Шаг 2: Получение активных подписок из БД...')
    const result = await pool.query(`
      SELECT DISTINCT u.telegram_id, u.username, s.expires_at, sp.name as plan_name, sp.duration_months
      FROM users u
      JOIN subscriptions s ON u.id = s.user_id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active' AND s.expires_at > NOW()
      ORDER BY u.telegram_id
    `)

    console.log(`Найдено активных подписок: ${result.rows.length}\n`)

    // Process each user
    console.log('Шаг 3: Создание/обновление VPN пользователей...\n')
    let created = 0
    let updated = 0
    let errors = 0

    for (const user of result.rows) {
      const isAdmin = ADMIN_IDS.includes(String(user.telegram_id))
      console.log(`Обработка: ${user.telegram_id} (${user.username || 'N/A'})${isAdmin ? ' [ADMIN]' : ''}`)
      console.log(`  План: ${user.plan_name}`)
      console.log(`  Истекает: ${user.expires_at}`)

      try {
        // Check if user exists in Marzban
        const existingUser = await getMarzbanUser(token, user.telegram_id)

        if (existingUser) {
          // Update existing user
          const updatedUser = await updateMarzbanUser(token, user.telegram_id, user.expires_at)
          console.log(`  ✅ Обновлен в Marzban`)
          console.log(`     Status: ${updatedUser.status}`)
          console.log(`     Expires: ${new Date(updatedUser.expire * 1000).toISOString()}`)
          console.log(`     Links: ${updatedUser.links?.length || 0}`)
          updated++
        } else {
          // Create new user
          const newUser = await createMarzbanUser(token, user.telegram_id, user.expires_at)
          console.log(`  ✅ Создан в Marzban`)
          console.log(`     Username: ${newUser.username}`)
          console.log(`     Status: ${newUser.status}`)
          console.log(`     Expires: ${new Date(newUser.expire * 1000).toISOString()}`)
          console.log(`     Links: ${newUser.links?.length || 0}`)
          console.log(`     Subscription URL: ${MARZBAN_API_URL}${newUser.subscription_url}`)
          created++
        }
      } catch (error) {
        console.error(`  ❌ Ошибка:`, error.message)
        errors++
      }
      console.log('')
    }

    console.log('=== Итоги ===')
    console.log(`✅ Создано новых: ${created}`)
    console.log(`✅ Обновлено: ${updated}`)
    console.log(`❌ Ошибок: ${errors}`)
    console.log(`\nВсего обработано: ${result.rows.length}`)

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

createSubscriptionsForAll()
