import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function ensureTablesExist() {
  await query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id          SERIAL PRIMARY KEY,
      user_id     TEXT NOT NULL,
      telegram_id BIGINT NOT NULL,
      subject     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'open',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id         SERIAL PRIMARY KEY,
      ticket_id  INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_id  TEXT NOT NULL,
      is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_telegram ON support_tickets(telegram_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id)`)
}

// GET /api/support/tickets?telegram_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const telegramId = searchParams.get('telegram_id')
  if (!telegramId) return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })

  try {
    await ensureTablesExist()

    const result = await query(
      `SELECT t.*,
        (SELECT body FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) AS message_count
       FROM support_tickets t
       WHERE t.telegram_id = $1
       ORDER BY t.updated_at DESC`,
      [parseInt(telegramId)]
    )

    return NextResponse.json({ tickets: result.rows })
  } catch (err) {
    console.error('support tickets GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/support/tickets
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, subject, message } = await req.json()
    if (!telegram_id || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'telegram_id, subject and message are required' }, { status: 400 })
    }

    await ensureTablesExist()

    // Resolve user_id from telegram_id
    const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [telegram_id])
    const userId = userRes.rows[0]?.id ?? `tg-${telegram_id}`

    const ticketRes = await query(
      `INSERT INTO support_tickets (user_id, telegram_id, subject, status)
       VALUES ($1, $2, $3, 'open') RETURNING *`,
      [userId, telegram_id, subject.trim()]
    )
    const ticket = ticketRes.rows[0]

    await query(
      `INSERT INTO support_messages (ticket_id, sender_id, is_admin, body)
       VALUES ($1, $2, FALSE, $3)`,
      [ticket.id, userId, message.trim()]
    )

    // Notify admins via Telegram bot
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(s => s.trim()).filter(Boolean) || []
      if (botToken && adminIds.length) {
        const text =
          `🎫 <b>Новый тикет #${ticket.id}</b>\n` +
          `👤 Пользователь: <code>${telegram_id}</code>\n` +
          `📋 Тема: ${subject.trim()}\n\n` +
          `💬 ${message.trim()}`
        for (const adminId of adminIds) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: adminId, text, parse_mode: 'HTML' }),
          }).catch(() => {})
        }
      }
    } catch {}

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    console.error('support tickets POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
