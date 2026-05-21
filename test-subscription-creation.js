// Test subscription creation via payment and admin grant
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

async function testSubscriptionCreation() {
  console.log('=== Тест создания подписок ===\n')

  try {
    const token = await getMarzbanToken()

    // Test 1: Check recent payments and their VPN users
    console.log('Тест 1: Проверка подписок после оплаты\n')
    console.log('Проверяем последние 5 завершенных платежей...\n')

    const paymentsResult = await pool.query(`
      SELECT p.*, u.telegram_id, u.username, s.expires_at, sp.name as plan_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE p.status = 'completed'
      ORDER BY p.created_at DESC
      LIMIT 5
    `)

    if (paymentsResult.rows.length === 0) {
      console.log('⚠️  Нет завершенных платежей для проверки\n')
    } else {
      for (const payment of paymentsResult.rows) {
        console.log(`Платеж #${payment.id}:`)
        console.log(`  Telegram ID: ${payment.telegram_id}`)
        console.log(`  Username: ${payment.username || 'N/A'}`)
        console.log(`  План: ${payment.plan_name || 'N/A'}`)
        console.log(`  Сумма: ${payment.amount_rub} ₽`)
        console.log(`  Дата: ${payment.created_at}`)

        if (payment.telegram_id) {
          const vpnUser = await getMarzbanUser(token, payment.telegram_id)
          if (vpnUser) {
            console.log(`  ✅ VPN пользователь существует в Marzban`)
            console.log(`     Status: ${vpnUser.status}`)
            console.log(`     Expires: ${vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never'}`)
            console.log(`     Links: ${vpnUser.links?.length || 0}`)
          } else {
            console.log(`  ❌ VPN пользователь НЕ найден в Marzban!`)
            console.log(`     Это означает, что webhook не создал подписку`)
          }
        }
        console.log('')
      }
    }

    // Test 2: Check all active subscriptions
    console.log('\nТест 2: Проверка всех активных подписок\n')
    console.log('Проверяем все активные подписки в БД...\n')

    const subsResult = await pool.query(`
      SELECT u.telegram_id, u.username, s.status, s.expires_at, sp.name as plan_name,
             s.created_at, s.started_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active' AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `)

    console.log(`Найдено активных подписок: ${subsResult.rows.length}\n`)

    let withVPN = 0
    let withoutVPN = 0

    for (const sub of subsResult.rows) {
      console.log(`Подписка: ${sub.telegram_id} (${sub.username || 'N/A'})`)
      console.log(`  План: ${sub.plan_name}`)
      console.log(`  Создана: ${sub.created_at}`)
      console.log(`  Истекает: ${sub.expires_at}`)

      const vpnUser = await getMarzbanUser(token, sub.telegram_id)
      if (vpnUser) {
        console.log(`  ✅ VPN: Активен`)
        console.log(`     Expires: ${vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never'}`)
        withVPN++
      } else {
        console.log(`  ❌ VPN: Отсутствует`)
        withoutVPN++
      }
      console.log('')
    }

    // Summary
    console.log('=== Итоги ===')
    console.log(`Активных подписок в БД: ${subsResult.rows.length}`)
    console.log(`С VPN в Marzban: ${withVPN} ✅`)
    console.log(`Без VPN в Marzban: ${withoutVPN} ${withoutVPN > 0 ? '❌' : ''}`)
    console.log('')

    if (withoutVPN > 0) {
      console.log('⚠️  ПРОБЛЕМА: Есть подписки без VPN доступа!')
      console.log('Запустите: node fix-existing-subscriptions.js')
    } else {
      console.log('✅ Все подписки имеют VPN доступ!')
    }

    console.log('')
    console.log('=== Рекомендации для тестирования ===')
    console.log('1. Создайте тестовый платеж через бота')
    console.log('2. Проверьте логи: pm2 logs championvpn --lines 50')
    console.log('3. Запустите этот скрипт снова для проверки')
    console.log('4. Или выдайте подписку через админ панель')

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

testSubscriptionCreation()
