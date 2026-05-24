import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { remnawave } from '@/lib/remnawave'

// Check if user is admin
function checkAdminAccess(request: NextRequest) {
  const telegramId = request.nextUrl.searchParams.get('telegram_id')
  const adminIds = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []
  const isAdmin = telegramId ? adminIds.includes(parseInt(telegramId)) : false
  return { isAdmin, telegramId }
}

// POST - Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, plan_id, status, devices_count, duration_months, duration_days } = body

    if (!user_id || !plan_id) {
      return NextResponse.json({ error: 'user_id and plan_id are required' }, { status: 400 })
    }

    // Get user telegram_id
    const userResult = await query('SELECT telegram_id FROM users WHERE id = $1', [user_id])
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const telegramId = userResult.rows[0].telegram_id

    // Check if user has active subscription
    const existingSubResult = await query(
      `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [user_id]
    )

    const now = new Date()
    const expiresAt = new Date(now)

    // Calculate expiry based on duration_days or duration_months
    if (duration_days) {
      expiresAt.setDate(expiresAt.getDate() + duration_days)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + (duration_months || 1))
    }

    let subscriptionResult

    if (existingSubResult.rows.length > 0) {
      // Update existing subscription
      const subId = existingSubResult.rows[0].id
      subscriptionResult = await query(
        `UPDATE subscriptions
         SET plan_id = $1, status = $2, devices_count = $3, expires_at = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [plan_id, status || 'active', devices_count || 5, expiresAt, subId]
      )
    } else {
      // Create new subscription
      subscriptionResult = await query(
        `INSERT INTO subscriptions (user_id, plan_id, status, devices_count, started_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         RETURNING *`,
        [user_id, plan_id, status || 'active', devices_count || 5, expiresAt]
      )
    }

    // Create VPN user in Remnawave
    try {
      console.log('=== Admin: Creating VPN user in Remnawave ===')
      console.log('Telegram ID:', telegramId)
      console.log('Expires at:', expiresAt.toISOString())
      console.log('Remnawave URL:', process.env.REMNAWAVE_API_URL)

      const expiryTimestamp = Math.floor(expiresAt.getTime() / 1000)
      const vpnUser = await remnawave.createOrUpdateUser(telegramId, expiryTimestamp, 0) // 0 = unlimited traffic

      console.log('✅ VPN user created/updated by admin!')
      console.log('Username:', vpnUser.username)
      console.log('Status:', vpnUser.status)
      console.log('Expires:', vpnUser.expire ? new Date(vpnUser.expire * 1000).toISOString() : 'Never')
      console.log('Links count:', vpnUser.links?.length || 0)
    } catch (vpnError) {
      console.error('❌ Error creating VPN user:', vpnError)
      console.error('Error details:', vpnError instanceof Error ? vpnError.message : 'Unknown error')
      // Continue anyway, subscription is created
    }

    return NextResponse.json({ success: true, subscription: subscriptionResult.rows[0] })
  } catch (error) {
    console.error('Admin subscription create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user telegram_id
    const userResult = await query('SELECT telegram_id FROM users WHERE id = $1', [user_id])
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const telegramId = userResult.rows[0].telegram_id

    // Update subscription status to expired
    const result = await query(
      `UPDATE subscriptions
       SET status = 'expired', expires_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'
       RETURNING *`,
      [user_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Disable VPN user in Remnawave
    try {
      await remnawave.disableUser(telegramId)
    } catch (vpnError) {
      console.error('Error disabling VPN user:', vpnError)
      // Continue anyway, subscription is cancelled
    }

    return NextResponse.json({ success: true, subscription: result.rows[0] })
  } catch (error) {
    console.error('Admin subscription cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
