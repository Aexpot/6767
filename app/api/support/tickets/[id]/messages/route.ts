import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/support/tickets/[id]/messages?telegram_id=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const telegramId = searchParams.get('telegram_id')
  if (!telegramId) return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })

  const tid = parseInt(telegramId)
  if (isNaN(tid)) return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })

  try {
    // Resolve user_id
    const userRes = await query(`SELECT user_id FROM users WHERE telegram_id = $1 LIMIT 1`, [tid])
    if (!userRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const userId = userRes.rows[0].user_id

    // Verify ticket ownership via user_id
    const ticketRes = await query(
      `SELECT ticket_id AS id, subject, status, category, priority, created_at, updated_at
       FROM support_tickets WHERE ticket_id = $1 AND user_id = $2`,
      [parseInt(id), userId]
    )
    if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const msgsRes = await query(
      `SELECT
         message_id AS id,
         ticket_id,
         author_role,
         author_user_id,
         CASE WHEN author_role = 'admin' THEN true ELSE false END AS is_admin,
         body,
         created_at
       FROM support_ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [parseInt(id)]
    )

    // Mark user messages as read
    await query(
      `UPDATE support_tickets SET unread_user_count = 0 WHERE ticket_id = $1`,
      [parseInt(id)]
    ).catch(() => {})

    return NextResponse.json({ ticket: ticketRes.rows[0], messages: msgsRes.rows })
  } catch (err) {
    console.error('messages GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/support/tickets/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { telegram_id, message } = await req.json()
    if (!telegram_id || !message?.trim()) {
      return NextResponse.json({ error: 'telegram_id and message are required' }, { status: 400 })
    }

    const tid = parseInt(String(telegram_id))
    if (isNaN(tid)) return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })

    // Resolve user_id
    const userRes = await query(`SELECT user_id FROM users WHERE telegram_id = $1 LIMIT 1`, [tid])
    if (!userRes.rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const userId = userRes.rows[0].user_id

    // Verify ticket ownership
    const ticketRes = await query(
      `SELECT ticket_id, status FROM support_tickets WHERE ticket_id = $1 AND user_id = $2`,
      [parseInt(id), userId]
    )
    if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const ticket = ticketRes.rows[0]
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 })
    }

    const msgRes = await query(
      `INSERT INTO support_ticket_messages (ticket_id, author_role, author_user_id, body, is_internal_note)
       VALUES ($1, 'user', $2, $3, false)
       RETURNING message_id AS id, ticket_id, author_role, author_user_id, body, created_at, false AS is_admin`,
      [parseInt(id), userId, message.trim()]
    )

    // Update ticket: reopen if pending, bump last_message_at, increment admin unread
    await query(
      `UPDATE support_tickets
       SET last_message_at = NOW(),
           last_message_role = 'user',
           updated_at = NOW(),
           status = CASE WHEN status = 'pending' THEN 'open' ELSE status END,
           unread_admin_count = unread_admin_count + 1
       WHERE ticket_id = $1`,
      [parseInt(id)]
    )

    // Notify admins
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const adminIds = (process.env.ADMIN_IDS || process.env.ADMIN_TELEGRAM_IDS || '')
        .split(',').map(s => s.trim()).filter(Boolean)
      if (botToken && adminIds.length) {
        const text =
          `💬 <b>Новое сообщение в тикете #${id}</b>\n` +
          `👤 <code>${tid}</code>\n\n` +
          message.trim()
        for (const adminId of adminIds) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: adminId, text, parse_mode: 'HTML' }),
          }).catch(() => {})
        }
      }
    } catch {}

    return NextResponse.json({ message: msgRes.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('messages POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
