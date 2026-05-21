import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { disable2FA } from '@/lib/admin-2fa'
import { logAdminAction } from '@/lib/admin-logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id } = body

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Get user
    const userResult = await query(
      'SELECT id, is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    if (!user.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await disable2FA(user.id)

    await logAdminAction({
      admin_id: user.id,
      action: '2fa_disabled',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
