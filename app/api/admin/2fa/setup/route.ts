import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { generate2FASecret } from '@/lib/admin-2fa'

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

    // Generate 2FA secret
    const { secret, qrCode, backupCodes } = await generate2FASecret(user.id)

    return NextResponse.json({
      success: true,
      qrCode,
      backupCodes,
      message: 'Scan QR code with Google Authenticator or Authy'
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
