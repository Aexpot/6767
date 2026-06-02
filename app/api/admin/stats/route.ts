import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check admin access from .env
    const { isAdmin, telegramId } = checkAdminAccess(request)

    if (!isAdmin || !telegramId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Get total users
    const totalUsersResult = await query('SELECT COUNT(*) FROM users')
    const totalUsers = parseInt(totalUsersResult.rows[0].count)

    const activeSubsResult = await query(
      "SELECT COUNT(*) FROM subscriptions WHERE is_active = TRUE AND end_date > NOW()"
    )
    const activeSubscriptions = parseInt(activeSubsResult.rows[0].count)

    // Get total revenue
    const totalRevenueResult = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"
    )
    const totalRevenue = parseFloat(totalRevenueResult.rows[0].total)

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayUsersResult = await query(
      'SELECT COUNT(*) FROM users WHERE registration_date >= $1',
      [today.toISOString()]
    )
    const todayUsers = parseInt(todayUsersResult.rows[0].count)

    const todayRevenueResult = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND created_at >= $1",
      [today.toISOString()]
    )
    const todayRevenue = parseFloat(todayRevenueResult.rows[0].total)

    // Get monthly stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const monthlyRevenueResult = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND created_at >= $1",
      [thirtyDaysAgo.toISOString()]
    )
    const monthlyRevenue = parseFloat(monthlyRevenueResult.rows[0].total)

    // Get pending payments
    const pendingPaymentsResult = await query(
      "SELECT COUNT(*) FROM payments WHERE status IN ('pending', 'processing')"
    )
    const pendingPayments = parseInt(pendingPaymentsResult.rows[0].count)

    return NextResponse.json({
      total_users: totalUsers,
      active_subscriptions: activeSubscriptions,
      total_revenue: totalRevenue,
      today_users: todayUsers,
      today_revenue: todayRevenue,
      monthly_revenue: monthlyRevenue,
      pending_payments: pendingPayments
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
