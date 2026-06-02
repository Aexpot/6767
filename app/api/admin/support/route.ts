import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function isAdmin(telegramId: string | null): Promise<boolean> {
  if (!telegramId) return false
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (adminIds.includes(telegramId)) return true

  const tid = Number(telegramId)
  if (!Number.isFinite(tid)) return false

  try {
    const result = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1 LIMIT 1',
      [tid],
    )
    return Boolean(result.rows[0]?.is_admin)
  } catch {
    return false
  }
}

// GET /api/admin/support?telegram_id=xxx[&status=open|closed|all][&ticket_id=123]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const telegramId = searchParams.get('telegram_id')
  const status     = searchParams.get('status') || 'all'
  const ticketId   = searchParams.get('ticket_id')

  if (!(await isAdmin(telegramId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (ticketId) {
      // Return single ticket + messages
      const ticketRes = await query(
        `SELECT t.*, t.ticket_id AS id, u.telegram_id, u.username, u.first_name, u.last_name
         FROM support_tickets t
         JOIN users u ON u.user_id = t.user_id
         WHERE t.ticket_id = $1`,
        [parseInt(ticketId)]
      )
      if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const msgsRes = await query(
        `SELECT m.*, m.message_id AS id, u.username, u.first_name, u.telegram_id
         FROM support_ticket_messages m
         LEFT JOIN users u ON u.user_id = m.author_user_id
         WHERE m.ticket_id = $1
         ORDER BY m.created_at ASC`,
        [parseInt(ticketId)]
      )

      // Mark messages as read by admin
      await query(
        `UPDATE support_ticket_messages
         SET read_by_admin_at = NOW()
         WHERE ticket_id = $1 AND read_by_admin_at IS NULL`,
        [parseInt(ticketId)]
      ).catch(() => {})

      // Reset admin unread counter
      await query(
        `UPDATE support_tickets SET unread_admin_count = 0 WHERE ticket_id = $1`,
        [parseInt(ticketId)]
      ).catch(() => {})

      return NextResponse.json({ ticket: ticketRes.rows[0], messages: msgsRes.rows })
    }

    // Return ticket list
    const whereClause = status === 'all'
      ? ''
      : `WHERE t.status = '${status === 'open' ? 'open' : 'closed'}'`

    const result = await query(
      `SELECT t.*, t.ticket_id AS id,
         u.telegram_id, u.username, u.first_name, u.last_name,
         (SELECT body        FROM support_ticket_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT author_role FROM support_ticket_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) AS last_message_role_msg,
         (SELECT COUNT(*)    FROM support_ticket_messages WHERE ticket_id = t.ticket_id) AS message_count
       FROM support_tickets t
       JOIN users u ON u.user_id = t.user_id
       ${whereClause}
       ORDER BY t.last_message_at DESC NULLS LAST, t.created_at DESC
       LIMIT 100`
    )
    return NextResponse.json({ tickets: result.rows })
  } catch (err) {
    console.error('admin support GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/support
// body: { telegram_id, ticket_id, action: 'reply'|'close'|'reopen', message? }
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, ticket_id, action, message } = await req.json()

    if (!(await isAdmin(String(telegram_id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticketRes = await query(
      `SELECT t.*, u.telegram_id AS user_telegram_id
       FROM support_tickets t
       JOIN users u ON u.user_id = t.user_id
       WHERE t.ticket_id = $1`,
      [ticket_id]
    )
    if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const ticket = ticketRes.rows[0]

    if (action === 'reply') {
      if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

      const msgRes = await query(
        `INSERT INTO support_ticket_messages (ticket_id, author_role, body, is_internal_note)
         VALUES ($1, 'admin', $2, FALSE)
         RETURNING *, message_id AS id`,
        [ticket_id, message.trim()]
      )

      await query(
        `UPDATE support_tickets
         SET updated_at = NOW(),
             last_message_at = NOW(),
             last_message_role = 'admin',
             status = 'open',
             unread_user_count = unread_user_count + 1
         WHERE ticket_id = $1`,
        [ticket_id]
      )

      // Notify user via Telegram
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (botToken && ticket.user_telegram_id) {
          const text =
            `💬 <b>Ответ от поддержки</b>\n` +
            `Тикет #${ticket_id}: ${ticket.subject}\n\n` +
            message.trim()
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ticket.user_telegram_id, text, parse_mode: 'HTML' }),
          }).catch(() => {})
        }
      } catch {}

      return NextResponse.json({ message: msgRes.rows[0] }, { status: 201 })
    }

    if (action === 'close') {
      await query(
        `UPDATE support_tickets
         SET status = 'closed', updated_at = NOW(), closed_at = NOW(), closed_by_admin_id = $2
         WHERE ticket_id = $1`,
        [ticket_id, null]
      )
      // Notify user
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (botToken && ticket.user_telegram_id) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ticket.user_telegram_id,
              text: `🔒 <b>Тикет закрыт</b>\n\nВаш тикет #${ticket_id} «${ticket.subject}» был закрыт.\n\nЕсли проблема не решена, вы можете открыть новое обращение в разделе Поддержка.`,
              parse_mode: 'HTML',
            }),
          }).catch(() => {})
        }
      } catch {}
      return NextResponse.json({ ok: true })
    }

    if (action === 'reopen') {
      await query(
        `UPDATE support_tickets SET status = 'open', updated_at = NOW(), closed_at = NULL WHERE ticket_id = $1`,
        [ticket_id]
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('admin support POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
