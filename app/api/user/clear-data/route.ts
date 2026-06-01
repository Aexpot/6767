import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { telegram_id, confirm } = await request.json()

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
    }

    if (confirm !== 'DELETE_ALL_DATA') {
      return NextResponse.json({
        error: 'Confirmation required',
        message: 'Send { "telegram_id": "xxx", "confirm": "DELETE_ALL_DATA" }'
      }, { status: 400 })
    }

    console.log('Clearing all data for telegram_id:', telegram_id)

    // Get user_id
    const userResult = await query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user_id = userResult.rows[0].id

    // Delete in correct order (respecting foreign keys)

    // 1. Delete promocode uses
    const promocodeUsesResult = await query(
      'DELETE FROM promocode_uses WHERE user_id = $1',
      [user_id]
    )

    // 2. Delete payments
    const paymentsResult = await query(
      'DELETE FROM payments WHERE user_id = $1',
      [user_id]
    )

    // 3. Delete subscriptions
    const subscriptionsResult = await query(
      'DELETE FROM subscriptions WHERE user_id = $1',
      [user_id]
    )

    // 4. Delete referrals (as referrer)
    const referralsResult = await query(
      'DELETE FROM referrals WHERE referrer_id = $1',
      [user_id]
    )

    // 5. Delete referrals (as referred)
    const referredResult = await query(
      'DELETE FROM referrals WHERE referred_id = $1',
      [user_id]
    )

    // 6. Reset user data (keep user but clear sensitive info)
    const userUpdateResult = await query(
      `UPDATE users
       SET first_name = 'Deleted',
           last_name = NULL,
           username = NULL,
           photo_url = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user_id]
    )

    console.log('Data cleared successfully:', {
      promocode_uses: promocodeUsesResult.rowCount,
      payments: paymentsResult.rowCount,
      subscriptions: subscriptionsResult.rowCount,
      referrals_as_referrer: referralsResult.rowCount,
      referrals_as_referred: referredResult.rowCount,
      user_updated: userUpdateResult.rowCount
    })

    return NextResponse.json({
      success: true,
      message: 'All user data cleared',
      deleted: {
        promocode_uses: promocodeUsesResult.rowCount,
        payments: paymentsResult.rowCount,
        subscriptions: subscriptionsResult.rowCount,
        referrals: (referralsResult.rowCount || 0) + (referredResult.rowCount || 0)
      }
    })
  } catch (error) {
    console.error('Clear data error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
