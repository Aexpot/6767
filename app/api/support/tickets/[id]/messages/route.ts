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

  try {
    // Verify ownership
    const ticketRes = await query(
      `SELECT * FROM support_tickets WHERE id = $1 AND telegram_id = $2`,
      [parseInt(id), parseInt(telegramId)]
    )
    if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const msgsRes = await query(
      `SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [parseInt(id)]
    )

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

    // Verify ownership
    const ticketRes = await query(
      `SELECT * FROM support_tickets WHERE id = $1 AND telegram_id = $2`,
      [parseInt(id), parseInt(telegram_id)]
    )
    if (!ticketRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const ticket = ticketRes.rows[0]
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 })
    }

    const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [telegram_id])
    const userId = userRes.rows[0]?.id ?? `tg-${telegram_id}`

    const msgRes = await query(
      `INSERT INTO support_messages (ticket_id, sender_id, is_admin, body)
       VALUES ($1, $2, FALSE, $3) RETURNING *`,
      [parseInt(id), userId, message.trim()]
    )

    // Bump updated_at so ticket floats to top
    await query(`UPDATE support_tickets SET updated_at = NOW(), status = 'open' WHERE id = $1`, [parseInt(id)])

    // Notify admins
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(s => s.trim()).filter(Boolean) || []
      if (botToken && adminIds.length) {
        const text =
          `💬 <b>Новое сообщение в тикете #${id}</b>\n` +
          `👤 <code>${telegram_id}</code>\n\n` +
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
