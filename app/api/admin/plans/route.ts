import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin'
import { query } from '@/lib/db'

export async function PATCH(request: NextRequest) {
  try {
    // Check admin access from .env
    const { isAdmin } = checkAdminAccess(request)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { plans } = body

    if (!plans || typeof plans !== 'object') {
      return NextResponse.json({ error: 'plans object is required' }, { status: 400 })
    }

    // Update each plan price
    const updates = []
    for (const [planId, price] of Object.entries(plans)) {
      if (typeof price === 'number' && price >= 0) {
        const result = await query(
          'UPDATE subscription_plans SET price_rub = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [price, planId]
        )
        if (result.rows.length > 0) {
          updates.push(result.rows[0])
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} plan(s)`,
      plans: updates
    })
  } catch (error) {
    console.error('Admin plans update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
