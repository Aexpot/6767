import { NextResponse } from 'next/server'

const PLANS = [
  { id: '1', name: '1 месяц', duration_months: 1, price_rub: 149, price_per_month: 149, is_popular: false, is_active: true, created_at: new Date().toISOString() },
  { id: '2', name: '3 месяца', duration_months: 3, price_rub: 399, price_per_month: 133, is_popular: false, is_active: true, created_at: new Date().toISOString() },
  { id: '3', name: '6 месяцев', duration_months: 6, price_rub: 699, price_per_month: 117, is_popular: true, is_active: true, created_at: new Date().toISOString() },
  { id: '4', name: '1 год', duration_months: 12, price_rub: 1190, price_per_month: 99, is_popular: false, is_active: true, created_at: new Date().toISOString() },
]

export async function GET() {
  return NextResponse.json({ plans: PLANS })
}
