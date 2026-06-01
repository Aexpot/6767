import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verify2FAToken, verifyBackupCode, enable2FA, createAdminSession } from '@/lib/admin-2fa'
import { logAdminAction } from '@/lib/admin-logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, token, is_backup_code = false } = body

    if (!telegram_id || !token) {
      return NextResponse.json({ error: 'telegram_id and token are required' }, { status: 400 })
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

    // Verify token
    let isValid = false
    if (is_backup_code) {
      isValid = await verifyBackupCode(user.id, token)
    } else {
      isValid = await verify2FAToken(user.id, token)
    }

    if (!isValid) {
      await logAdminAction({
        admin_id: user.id,
        action: '2fa_verify_failed',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Enable 2FA if first time
    await enable2FA(user.id)

    // Create session
    const sessionToken = await createAdminSession(
      user.id,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    )

    await logAdminAction({
      admin_id: user.id,
      action: '2fa_enabled',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      message: '2FA enabled successfully'
    })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
