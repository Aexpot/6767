import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin'
import { query } from '@/lib/db'

const ADMIN_PASSWORD = process.env.ADMIN_DELETE_PASSWORD || 'DELETE_ALL_2026'

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { admin_password } = await request.json()

    // Verify admin password
    if (admin_password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный админ пароль' }, { status: 401 })
    }

    console.log('⚠️ DELETING ALL DATA - Admin action')

    // Delete in correct order (respecting foreign keys)

    // 1. Delete promocode uses
    const promocodeUsesResult = await query('DELETE FROM promocode_uses')
    console.log('Deleted promocode_uses:', promocodeUsesResult.rowCount)

    // 2. Delete promocodes
    const promocodesResult = await query('DELETE FROM promocodes')
    console.log('Deleted promocodes:', promocodesResult.rowCount)

    // 3. Delete payments
    const paymentsResult = await query('DELETE FROM payments')
    console.log('Deleted payments:', paymentsResult.rowCount)

    // 4. Delete subscriptions
    const subscriptionsResult = await query('DELETE FROM subscriptions')
    console.log('Deleted subscriptions:', subscriptionsResult.rowCount)

    // 5. Delete referrals
    const referralsResult = await query('DELETE FROM referrals')
    console.log('Deleted referrals:', referralsResult.rowCount)

    // 6. Delete users (keep admins)
    const usersResult = await query('DELETE FROM users WHERE is_admin = false')
    console.log('Deleted users:', usersResult.rowCount)

    console.log('✅ All data deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Все данные успешно удалены',
      deleted: {
        promocode_uses: promocodeUsesResult.rowCount,
        promocodes: promocodesResult.rowCount,
        payments: paymentsResult.rowCount,
        subscriptions: subscriptionsResult.rowCount,
        referrals: referralsResult.rowCount,
        users: usersResult.rowCount
      }
    })
  } catch (error) {
    console.error('Delete all data error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
