import { query } from '@/lib/db'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'

export async function generate2FASecret(userId: string) {
  const secret = speakeasy.generateSecret({
    name: `ChampionVPN Admin (${userId})`,
    length: 32
  })

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  )

  // Save to database
  await query(
    `INSERT INTO admin_2fa (user_id, secret, backup_codes, is_enabled)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (user_id)
     DO UPDATE SET secret = $2, backup_codes = $3, is_enabled = false, updated_at = NOW()`,
    [userId, secret.base32, backupCodes]
  )

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!)

  return {
    secret: secret.base32,
    qrCode,
    backupCodes
  }
}

export async function verify2FAToken(userId: string, token: string): Promise<boolean> {
  const result = await query(
    'SELECT secret, is_enabled FROM admin_2fa WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    return false
  }

  const { secret } = result.rows[0]

  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  })
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const result = await query(
    'SELECT backup_codes FROM admin_2fa WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    return false
  }

  const backupCodes = result.rows[0].backup_codes

  if (!backupCodes.includes(code)) {
    return false
  }

  // Remove used backup code
  const updatedCodes = backupCodes.filter((c: string) => c !== code)
  await query(
    'UPDATE admin_2fa SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
    [updatedCodes, userId]
  )

  return true
}

export async function enable2FA(userId: string) {
  await query(
    'UPDATE admin_2fa SET is_enabled = true, updated_at = NOW() WHERE user_id = $1',
    [userId]
  )
}

export async function disable2FA(userId: string) {
  await query(
    'UPDATE admin_2fa SET is_enabled = false, updated_at = NOW() WHERE user_id = $1',
    [userId]
  )
}

export async function is2FAEnabled(userId: string): Promise<boolean> {
  const result = await query(
    'SELECT is_enabled FROM admin_2fa WHERE user_id = $1',
    [userId]
  )

  return result.rows.length > 0 && result.rows[0].is_enabled
}

export async function createAdminSession(userId: string, ipAddress?: string, userAgent?: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await query(
    `INSERT INTO admin_sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, token, ipAddress, userAgent, expiresAt]
  )

  return token
}

export async function verifyAdminSession(token: string): Promise<string | null> {
  const result = await query(
    `SELECT user_id FROM admin_sessions
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  )

  return result.rows.length > 0 ? result.rows[0].user_id : null
}

export async function deleteAdminSession(token: string) {
  await query('DELETE FROM admin_sessions WHERE token = $1', [token])
}

export async function cleanExpiredSessions() {
  await query('DELETE FROM admin_sessions WHERE expires_at <= NOW()')
}
