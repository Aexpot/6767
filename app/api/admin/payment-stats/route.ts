import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Check if user is admin
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get payment stats by payment method
    const paymentMethodStats = await query(`
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(amount_rub) as total_amount,
        AVG(amount_rub) as avg_amount
      FROM payments
      WHERE status = 'completed'
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `)

    // Get payment stats by subscription plan
    const planStats = await query(`
      SELECT
        sp.name as plan_name,
        sp.duration_months,
        COUNT(p.id) as count,
        SUM(p.amount_rub) as total_amount,
        AVG(p.amount_rub) as avg_amount
      FROM payments p
      JOIN subscriptions s ON p.subscription_id = s.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE p.status = 'completed'
      GROUP BY sp.id, sp.name, sp.duration_months
      ORDER BY total_amount DESC
    `)

    // Get daily revenue for last 30 days
    const dailyRevenue = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(amount_rub) as total_amount
      FROM payments
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

    // Get monthly revenue for last 12 months
    const monthlyRevenue = await query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count,
        SUM(amount_rub) as total_amount
      FROM payments
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `)

    // Get payment status distribution
    const statusStats = await query(`
      SELECT
        status,
        COUNT(*) as count,
        SUM(amount_rub) as total_amount
      FROM payments
      GROUP BY status
      ORDER BY count DESC
    `)

    return NextResponse.json({
      payment_methods: paymentMethodStats.rows,
      plans: planStats.rows,
      daily_revenue: dailyRevenue.rows,
      monthly_revenue: monthlyRevenue.rows,
      status_distribution: statusStats.rows
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
