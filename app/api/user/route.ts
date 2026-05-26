import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

// Bot DB schema: users.user_id = telegram_id (bigint PK)
// subscriptions: user_id FK -> users.user_id, is_active, end_date

function formatUser(row: any, subscription: any = null, referralCount: number = 0) {
  return {
    id: String(row.user_id),
    telegram_id: row.telegram_id || row.user_id,
    username: row.username || null,
    first_name: row.first_name || 'User',
    last_name: row.last_name || null,
    photo_url: row.telegram_photo_url || null,
    language_code: row.language_code || 'ru',
    is_admin: ADMIN_IDS.includes(Number(row.telegram_id || row.user_id)),
    is_banned: row.is_banned || false,
    referral_code: row.referral_code || null,
    referred_by: row.referred_by_id ? String(row.referred_by_id) : null,
    created_at: row.registration_date || new Date().toISOString(),
    channel_subscribed: row.channel_subscription_verified || false,
    channel_required: false,
    subscription: subscription,
    subscriptions: subscription ? [subscription] : [],
    referral_stats: { invited_count: referralCount, bonus_days: 0 }
  }
}

function createFallbackUser(telegram_id: number) {
  return {
    id: `new-${telegram_id}`,
    telegram_id,
    username: null,
    first_name: 'User',
    last_name: null,
    photo_url: null,
    language_code: 'ru',
    is_admin: ADMIN_IDS.includes(telegram_id),
    is_banned: false,
    referral_code: null,
    referred_by: null,
    created_at: new Date().toISOString(),
    channel_subscribed: false,
    channel_required: false,
    subscription: null,
    subscriptions: [],
    referral_stats: { invited_count: 0, bonus_days: 0 }
  }
}

async function getActiveSubscription(userId: number) {
  const result = await query(
    `SELECT s.*, s.end_date as expires_at, s.duration_months,
            s.tariff_key, s.panel_user_uuid
     FROM subscriptions s
     WHERE s.user_id = $1 AND s.is_active = true AND s.end_date > NOW()
     ORDER BY s.end_date DESC
     LIMIT 1`,
    [userId]
  )

  if (result.rows.length === 0) return null

  const sub = result.rows[0]
  return {
    id: String(sub.subscription_id),
    user_id: String(sub.user_id),
    status: 'active',
    started_at: sub.start_date,
    expires_at: sub.end_date,
    config_url: null,
    vpn_username: sub.panel_user_uuid,
    auto_renew: sub.auto_renew_enabled || false,
    subscription_plans: {
      name: sub.tariff_key || `${sub.duration_months || 1} мес`,
      duration_months: sub.duration_months || 1,
      price_rub: 0
    }
  }
}

async function getReferralCount(userId: number) {
  const result = await query(
    `SELECT COUNT(*) as cnt FROM users WHERE referred_by_id = $1`,
    [userId]
  )
  return parseInt(result.rows[0]?.cnt || '0')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, username, first_name, last_name, photo_url, language_code } = body

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // In bot's DB, user_id = telegram_id
    const userResult = await query(
      `SELECT * FROM users WHERE user_id = $1`,
      [telegram_id]
    )

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0]

      // Update user info
      await query(
        `UPDATE users SET username = $1, first_name = $2, last_name = $3, telegram_photo_url = $4, language_code = $5
         WHERE user_id = $6`,
        [username || user.username, first_name || user.first_name, last_name || user.last_name, photo_url || user.telegram_photo_url, language_code || user.language_code, telegram_id]
      )

      const subscription = await getActiveSubscription(telegram_id)
      const referralCount = await getReferralCount(telegram_id)

      return NextResponse.json(formatUser(user, subscription, referralCount))
    }

    // User not found in bot's DB — create one
    try {
      await query(
        `INSERT INTO users (user_id, telegram_id, username, first_name, last_name, telegram_photo_url, language_code, registration_date)
         VALUES ($1, $1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [telegram_id, username, first_name, last_name, photo_url, language_code || 'ru']
      )

      const newUserResult = await query(`SELECT * FROM users WHERE user_id = $1`, [telegram_id])
      if (newUserResult.rows.length > 0) {
        return NextResponse.json(formatUser(newUserResult.rows[0], null, 0))
      }
    } catch (err) {
      console.error('Error creating user in bot DB:', err)
    }

    return NextResponse.json(createFallbackUser(telegram_id))
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    const tid = parseInt(telegram_id)

    const userResult = await query(
      `SELECT * FROM users WHERE user_id = $1`,
      [tid]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(createFallbackUser(tid))
    }

    const user = userResult.rows[0]
    const subscription = await getActiveSubscription(tid)
    const referralCount = await getReferralCount(tid)

    return NextResponse.json(formatUser(user, subscription, referralCount))
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
