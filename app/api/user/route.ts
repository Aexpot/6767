import { NextRequest, NextResponse } from 'next/server'
import { generateReferralCode } from '@/lib/telegram'
import { query } from '@/lib/db'
import { checkChannelSubscription, updateUserChannelStatus } from '@/lib/channel-check'

const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

function createFallbackUser(data: {
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  photo_url?: string
  language_code?: string
}) {
  return {
    id: `demo-${data.telegram_id}`,
    telegram_id: data.telegram_id,
    username: data.username || null,
    first_name: data.first_name || 'User',
    last_name: data.last_name || null,
    photo_url: data.photo_url || null,
    language_code: data.language_code || 'ru',
    is_admin: false,
    is_banned: false,
    referral_code: `ref${data.telegram_id}`,
    referred_by: null,
    created_at: new Date().toISOString(),
    subscription: null,
    referral_stats: { invited_count: 0, bonus_days: 0 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, username, first_name, last_name, photo_url, language_code, referral_code } = body

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Check if user exists
    const existingUserResult = await query(
      `SELECT u.* FROM users u WHERE u.telegram_id = $1`,
      [telegram_id]
    )

    if (existingUserResult.rows.length > 0) {
      // Check channel subscription
      const isSubscribed = await checkChannelSubscription(telegram_id)
      await updateUserChannelStatus(telegram_id.toString(), isSubscribed)

      if (!isSubscribed && TELEGRAM_CHANNEL_ID) {
        return NextResponse.json({
          ...existingUserResult.rows[0],
          channel_required: true,
          channel_subscribed: false,
          channel_id: TELEGRAM_CHANNEL_ID,
          subscriptions: [],
          subscription: null
        })
      }

      // Update user info
      const updateResult = await query(
        `UPDATE users
         SET username = $1, first_name = $2, last_name = $3,
             photo_url = $4, language_code = $5, updated_at = NOW()
         WHERE telegram_id = $6
         RETURNING *`,
        [username, first_name, last_name, photo_url, language_code, telegram_id]
      )

      const updatedUser = updateResult.rows[0]

      const subsResult = await query(
        `SELECT s.*,
          json_build_object(
            'name', sp.name,
            'duration_months', sp.duration_months,
            'price_rub', sp.price_rub
          ) as subscription_plans
        FROM subscriptions s
        JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.user_id = $1`,
        [updatedUser.id]
      )

      const referralResult = await query(
        `SELECT COUNT(*) as invited_count FROM referrals WHERE referrer_id = $1`,
        [updatedUser.id]
      )

      const activeSubscription = subsResult.rows.find(
        (s: any) => s.status === 'active'
      )

      return NextResponse.json({
        ...updatedUser,
        subscriptions: subsResult.rows,
        subscription: activeSubscription || null,
        referral_stats: { invited_count: parseInt(referralResult.rows[0]?.invited_count || '0'), bonus_days: 0 }
      })
    }

    // Create new user
    let referredById = null
    if (referral_code) {
      const referrerResult = await query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referral_code]
      )
      if (referrerResult.rows.length > 0) {
        referredById = referrerResult.rows[0].id
      }
    }

    const newReferralCode = generateReferralCode(telegram_id)

    const newUserResult = await query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, language_code, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [telegram_id, username, first_name, last_name, photo_url, language_code || 'ru', newReferralCode, referredById]
    )

    const newUser = newUserResult.rows[0]

    const isSubscribed = await checkChannelSubscription(telegram_id)
    await updateUserChannelStatus(telegram_id.toString(), isSubscribed)

    if (!isSubscribed && TELEGRAM_CHANNEL_ID) {
      return NextResponse.json({
        ...newUser,
        channel_required: true,
        channel_subscribed: false,
        channel_id: TELEGRAM_CHANNEL_ID,
        subscriptions: [],
        subscription: null,
        referral_stats: { invited_count: 0, bonus_days: 0 }
      })
    }

    // Create referral record if referred
    if (referredById) {
      await query(
        `INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [referredById, newUser.id]
      )

      try {
        const referrer = await query('SELECT telegram_id, first_name FROM users WHERE id = $1', [referredById])
        if (referrer.rows.length > 0 && process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: referrer.rows[0].telegram_id,
              text: `🎉 <b>У вас новый реферал!</b>\n\n👤 ${[first_name, last_name].filter(Boolean).join(' ') || 'Пользователь'}\n🔖 ${username ? `@${username}` : `#${telegram_id}`}`,
              parse_mode: 'HTML'
            })
          }).catch(() => {})
        }
      } catch {}
    }

    return NextResponse.json({
      ...newUser,
      subscriptions: [],
      subscription: null,
      referral_stats: { invited_count: 0, bonus_days: 0 }
    })
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

    const userResult = await query(
      `SELECT u.* FROM users u WHERE u.telegram_id = $1`,
      [parseInt(telegram_id)]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(createFallbackUser({ telegram_id: parseInt(telegram_id) }))
    }

    const user = userResult.rows[0]

    const isSubscribed = await checkChannelSubscription(parseInt(telegram_id))
    await updateUserChannelStatus(telegram_id, isSubscribed)

    if (!isSubscribed && TELEGRAM_CHANNEL_ID) {
      return NextResponse.json({
        ...user,
        channel_required: true,
        channel_subscribed: false,
        channel_id: TELEGRAM_CHANNEL_ID,
        subscriptions: [],
        subscription: null
      })
    }

    const subsResult = await query(
      `SELECT s.*,
        json_build_object(
          'name', sp.name,
          'duration_months', sp.duration_months,
          'price_rub', sp.price_rub
        ) as subscription_plans
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = $1`,
      [user.id]
    )

    const referralResult = await query(
      `SELECT COUNT(*) as invited_count FROM referrals WHERE referrer_id = $1`,
      [user.id]
    )

    const activeSubscription = subsResult.rows.find(
      (s: any) => s.status === 'active'
    )

    return NextResponse.json({
      ...user,
      subscriptions: subsResult.rows,
      subscription: activeSubscription || null,
      referral_stats: { invited_count: parseInt(referralResult.rows[0]?.invited_count || '0'), bonus_days: 0 }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
