import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/support/tickets?telegram_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const telegramId = searchParams.get('telegram_id')
  if (!telegramId) return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })

  const tid = parseInt(telegramId)
  if (isNaN(tid)) return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })

  try {
    // Resolve user_id from users table (bot DB uses user_id=telegram_id for Telegram users)
    const userRes = await query(
      `SELECT user_id FROM users WHERE telegram_id = $1 LIMIT 1`,
      [tid]
    )
    if (userRes.rows.length === 0) {
      return NextResponse.json({ tickets: [] })
    }
    const userId = userRes.rows[0].user_id

    const result = await query(
      `SELECT
         t.ticket_id  AS id,
         t.subject,
         t.status,
         t.category,
         t.priority,
         t.created_at,
         t.updated_at,
         t.last_message_at,
         t.unread_user_count,
         (SELECT body FROM support_ticket_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = t.ticket_id) AS message_count
       FROM support_tickets t
       WHERE t.user_id = $1
       ORDER BY t.last_message_at DESC NULLS LAST, t.created_at DESC`,
      [userId]
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
    const { telegram_id, subject, message, category = 'general' } = await req.json()
    if (!telegram_id || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'telegram_id, subject and message are required' },
        { status: 400 }
      )
    }

    const tid = parseInt(String(telegram_id))
    if (isNaN(tid)) return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })

    // Resolve user_id from telegram_id
    const userRes = await query(
      `SELECT user_id FROM users WHERE telegram_id = $1 LIMIT 1`,
      [tid]
    )
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found. Please open the bot first.' }, { status: 404 })
    }
    const userId = userRes.rows[0].user_id

    // Validate category
    const validCategories = ['general', 'billing', 'technical', 'other']
    const safeCategory = validCategories.includes(category) ? category : 'general'

    const ticketRes = await query(
      `INSERT INTO support_tickets (user_id, subject, category, priority, status, unread_admin_count, unread_user_count)
       VALUES ($1, $2, $3, 'normal', 'open', 1, 0)
       RETURNING ticket_id, subject, status, category, priority, created_at`,
      [userId, subject.trim(), safeCategory]
    )
    const ticket = ticketRes.rows[0]

    await query(
      `INSERT INTO support_ticket_messages (ticket_id, author_role, author_user_id, body, is_internal_note)
       VALUES ($1, 'user', $2, $3, false)`,
      [ticket.ticket_id, userId, message.trim()]
    )

    // Update last_message_at
    await query(
      `UPDATE support_tickets SET last_message_at = NOW(), last_message_role = 'user', updated_at = NOW() WHERE ticket_id = $1`,
      [ticket.ticket_id]
    )

    // Notify admins via Telegram bot
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const adminIds = (process.env.ADMIN_IDS || process.env.ADMIN_TELEGRAM_IDS || '')
        .split(',').map(s => s.trim()).filter(Boolean)
      if (botToken && adminIds.length) {
        const text =
          `🎫 <b>Новый тикет #${ticket.ticket_id}</b>\n` +
          `👤 Пользователь: <code>${tid}</code>\n` +
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

    return NextResponse.json({ ticket: { ...ticket, id: ticket.ticket_id } }, { status: 201 })
  } catch (err) {
    console.error('support tickets POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
