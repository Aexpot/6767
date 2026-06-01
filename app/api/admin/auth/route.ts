import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

/* ─────────── In-memory OTP store (TTL 5 min) ─────────── */
interface OtpEntry {
  code: string
  telegramId: number
  expires: number
}
const otpStore = new Map<number, OtpEntry>()

/* ─────────── In-memory session store (TTL 8 hours) ─────────── */
interface SessionEntry {
  telegramId: number
  expires: number
}
const sessionStore = new Map<string, SessionEntry>()

/* cleanup expired entries */
function pruneExpired() {
  const now = Date.now()
  for (const [k, v] of otpStore) if (v.expires < now) otpStore.delete(k)
  for (const [k, v] of sessionStore) if (v.expires < now) sessionStore.delete(k)
}

/* generate 6-digit numeric code */
function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/* generate session token */
function genToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/* send Telegram message */
async function sendTelegram(chatId: number, text: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    return r.ok
  } catch {
    return false
  }
}

/* check admin in DB */
async function isAdmin(telegramId: number): Promise<boolean> {
  const r = await query('SELECT is_admin FROM users WHERE telegram_id = $1', [telegramId])
  return r.rows[0]?.is_admin === true
}

/* ═══════════ POST /api/admin/auth ═══════════
   body: { action: 'request', telegram_id: number }
      or { action: 'verify',  telegram_id: number, code: string }
*/
export async function POST(request: NextRequest) {
  pruneExpired()

  try {
    const body = await request.json()
    const { action, telegram_id, code } = body

    if (!telegram_id || typeof telegram_id !== 'number') {
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
    }

    /* ── STEP 1: request code ── */
    if (action === 'request') {
      const admin = await isAdmin(telegram_id)
      if (!admin) {
        // Return same error to avoid enumeration
        return NextResponse.json({ error: 'Пользователь не найден или не имеет прав администратора' }, { status: 403 })
      }

      const otp = genCode()
      otpStore.set(telegram_id, {
        code: otp,
        telegramId: telegram_id,
        expires: Date.now() + 5 * 60 * 1000, // 5 min
      })

      const sent = await sendTelegram(
        telegram_id,
        `<b>ChampionVPN Admin</b>\n\nКод подтверждения:\n\n<code>${otp}</code>\n\nДействителен 5 минут. Никому не сообщайте.`
      )

      if (!sent) {
        otpStore.delete(telegram_id)
        return NextResponse.json({ error: 'Не удалось отправить сообщение в Telegram. Убедитесь что вы начали диалог с ботом.' }, { status: 502 })
      }

      return NextResponse.json({ ok: true, message: 'Код отправлен в Telegram' })
    }

    /* ── STEP 2: verify code ── */
    if (action === 'verify') {
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'code required' }, { status: 400 })
      }

      const entry = otpStore.get(telegram_id)

      if (!entry) {
        return NextResponse.json({ error: 'Код не найден. Запросите новый.' }, { status: 400 })
      }

      if (entry.expires < Date.now()) {
        otpStore.delete(telegram_id)
        return NextResponse.json({ error: 'Код истёк. Запросите новый.' }, { status: 400 })
      }

      if (entry.code !== code.trim()) {
        return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
      }

      // Code correct — issue session
      otpStore.delete(telegram_id)
      const token = genToken()
      sessionStore.set(token, {
        telegramId: telegram_id,
        expires: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      })

      return NextResponse.json({ ok: true, token, telegram_id })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('Admin auth error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ═══════════ GET /api/admin/auth?token=... — verify session ═══════════ */
export async function GET(request: NextRequest) {
  pruneExpired()
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const session = sessionStore.get(token)
  if (!session || session.expires < Date.now()) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  return NextResponse.json({ ok: true, telegram_id: session.telegramId })
}

/* Export session store so other routes can look up token → telegram_id */
export { sessionStore }
