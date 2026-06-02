import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || process.env.ADMIN_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    if (!adminIds.includes(String(telegram_id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get payment stats by payment method
    const paymentMethodStats = await query(`
      SELECT
        COALESCE(provider, 'unknown') as payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payments
      WHERE status = 'completed'
      GROUP BY COALESCE(provider, 'unknown')
      ORDER BY total_amount DESC
    `)

    // Get payment stats by subscription plan
    const planStats = await query(`
      SELECT
        COALESCE(NULLIF(p.tariff_key, ''), 'Подписка') as plan_name,
        COALESCE(p.subscription_duration_months, 1) as duration_months,
        COUNT(p.payment_id) as count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as avg_amount
      FROM payments p
      WHERE p.status = 'completed'
      GROUP BY COALESCE(NULLIF(p.tariff_key, ''), 'Подписка'), COALESCE(p.subscription_duration_months, 1)
      ORDER BY total_amount DESC
    `)

    // Get daily revenue for last 30 days
    const dailyRevenue = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as total_amount
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
        SUM(amount) as total_amount
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
        SUM(amount) as total_amount
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
