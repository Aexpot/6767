import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function isAdmin(telegramId: string | null): Promise<boolean> {
  if (!telegramId) return false
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(s => s.trim()) || []
  if (adminIds.includes(telegramId)) return true
  const res = await query(`SELECT is_admin FROM users WHERE telegram_id = $1`, [parseInt(telegramId)])
  return res.rows[0]?.is_admin === true
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
      const ticketRes = await query(`SELECT * FROM support_tickets WHERE id = $1`, [parseInt(ticketId)])
      if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const msgsRes = await query(
        `SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [parseInt(ticketId)]
      )
      return NextResponse.json({ ticket: ticketRes.rows[0], messages: msgsRes.rows })
    }

    // Return ticket list
    const where = status === 'all' ? '' : `WHERE t.status = '${status === 'open' ? 'open' : 'closed'}'`
    const result = await query(
      `SELECT t.*,
         u.username, u.first_name, u.last_name,
         (SELECT body       FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT is_admin   FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_is_admin,
         (SELECT COUNT(*)   FROM support_messages WHERE ticket_id = t.id) AS message_count,
         (SELECT COUNT(*)   FROM support_messages WHERE ticket_id = t.id AND is_admin = FALSE
            AND created_at > COALESCE(
              (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = t.id AND is_admin = TRUE), '2000-01-01'
            )) AS unread_count
       FROM support_tickets t
       LEFT JOIN users u ON u.telegram_id = t.telegram_id
       ${where}
       ORDER BY t.updated_at DESC
       LIMIT 100`
    )
    return NextResponse.json({ tickets: result.rows })
  } catch (err) {
    console.error('admin support GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/support  — reply or close
// body: { telegram_id, ticket_id, action: 'reply'|'close'|'reopen', message? }
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, ticket_id, action, message } = await req.json()

    if (!(await isAdmin(String(telegram_id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticketRes = await query(`SELECT * FROM support_tickets WHERE id = $1`, [ticket_id])
    if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'reply') {
      if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

      const msgRes = await query(
        `INSERT INTO support_messages (ticket_id, sender_id, is_admin, body)
         VALUES ($1, $2, TRUE, $3) RETURNING *`,
        [ticket_id, `admin-${telegram_id}`, message.trim()]
      )
      await query(
        `UPDATE support_tickets SET updated_at = NOW(), status = 'open' WHERE id = $1`,
        [ticket_id]
      )

      // Notify user via Telegram bot
      try {
        const ticket = ticketRes.rows[0]
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (botToken && ticket.telegram_id) {
          const text =
            `💬 <b>Ответ от поддержки</b>\n` +
            `Тикет #${ticket_id}: ${ticket.subject}\n\n` +
            message.trim()
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ticket.telegram_id, text, parse_mode: 'HTML' }),
          }).catch(() => {})
        }
      } catch {}

      return NextResponse.json({ message: msgRes.rows[0] }, { status: 201 })
    }

    if (action === 'close') {
      await query(`UPDATE support_tickets SET status = 'closed', updated_at = NOW() WHERE id = $1`, [ticket_id])
      // Notify user
      try {
        const ticket = ticketRes.rows[0]
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (botToken && ticket.telegram_id) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ticket.telegram_id,
              text: `🔒 <b>Тикет закрыт</b>\n\nВаш тикет #${ticket_id} «${ticket.subject}» был закрыт.\n\nЕсли проблема не решена, вы можете открыть новый обращение в разделе Поддержка.`,
              parse_mode: 'HTML',
            }),
          }).catch(() => {})
        }
      } catch {}
      return NextResponse.json({ ok: true })
    }

    if (action === 'reopen') {
      await query(`UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1`, [ticket_id])
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('admin support POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
