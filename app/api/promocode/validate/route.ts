import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const plan_id = request.nextUrl.searchParams.get('plan_id')

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Промокод не указан' }, { status: 400 })
    }

    // Get promocode
    const result = await query(
      `SELECT * FROM promocodes
       WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code.toUpperCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false, error: 'Промокод недействителен или истек' }, { status: 200 })
    }

    const promocode = result.rows[0]

    // Get plan price
    const planResult = await query('SELECT price_rub FROM subscription_plans WHERE id = $1', [plan_id])

    if (planResult.rows.length === 0) {
      return NextResponse.json({ valid: false, error: 'План не найден' }, { status: 200 })
    }

    const originalPrice = parseFloat(planResult.rows[0].price_rub)
    let discountAmount = 0

    if (promocode.discount_type === 'percentage') {
      discountAmount = (originalPrice * parseFloat(promocode.discount_value)) / 100
    } else {
      discountAmount = parseFloat(promocode.discount_value)
    }

    // Ensure discount doesn't exceed price
    discountAmount = Math.min(discountAmount, originalPrice)
    const finalPrice = Math.max(0, originalPrice - discountAmount)

    return NextResponse.json({
      valid: true,
      promocode_id: promocode.id,
      discount_type: promocode.discount_type,
      discount_value: parseFloat(promocode.discount_value),
      discount_amount: Math.round(discountAmount),
      original_price: originalPrice,
      final_price: finalPrice
    })
  } catch (error) {
    console.error('Error validating promocode:', error)
    return NextResponse.json({ valid: false, error: 'Ошибка проверки промокода' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, plan_id } = body

    if (!code) {
      return NextResponse.json({ error: 'Promocode required' }, { status: 400 })
    }

    // Get promocode
    const result = await query(
      `SELECT * FROM promocodes
       WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code.toUpperCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Промокод недействителен или истек' }, { status: 404 })
    }

    const promocode = result.rows[0]

    // Get plan price
    const planResult = await query('SELECT price_rub FROM subscription_plans WHERE id = $1', [plan_id])

    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const originalPrice = planResult.rows[0].price_rub
    let discountAmount = 0

    if (promocode.discount_type === 'percentage') {
      discountAmount = (originalPrice * promocode.discount_value) / 100
    } else {
      discountAmount = promocode.discount_value
    }

    // Ensure discount doesn't exceed price
    discountAmount = Math.min(discountAmount, originalPrice)
    const finalPrice = Math.max(0, originalPrice - discountAmount)

    return NextResponse.json({
      valid: true,
      promocode_id: promocode.id,
      discount_type: promocode.discount_type,
      discount_value: promocode.discount_value,
      discount_amount: discountAmount,
      original_price: originalPrice,
      final_price: finalPrice
    })
  } catch (error) {
    console.error('Error validating promocode:', error)
    return NextResponse.json({ error: 'Failed to validate promocode' }, { status: 500 })
  }
}
