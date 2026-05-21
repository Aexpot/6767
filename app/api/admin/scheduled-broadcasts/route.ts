import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Validate Telegram init data
function validateInitData(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null

    params.delete('hash')

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(TELEGRAM_BOT_TOKEN!)
      .digest()

    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    if (hash !== calculatedHash) return null

    const userParam = params.get('user')
    if (!userParam) return null

    const user = JSON.parse(userParam)
    return user.id
  } catch (error) {
    console.error('Init data validation error:', error)
    return null
  }
}

// GET - List scheduled broadcasts
export async function GET(request: NextRequest) {
  try {
    const initData = request.headers.get('x-telegram-init-data')
    if (!initData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const telegramId = validateInitData(initData)
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid init data' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await query(`
      SELECT * FROM scheduled_broadcasts
      ORDER BY scheduled_at DESC
      LIMIT 50
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching scheduled broadcasts:', error)
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
  }
}

// POST - Create scheduled broadcast
export async function POST(request: NextRequest) {
  try {
    const initData = request.headers.get('x-telegram-init-data')
    if (!initData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const telegramId = validateInitData(initData)
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid init data' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { message, image_file_id, scheduled_at, target_filter } = body

    if (!message || !scheduled_at) {
      return NextResponse.json({ error: 'Message and scheduled_at required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO scheduled_broadcasts (message, image_file_id, scheduled_at, target_filter, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [message, image_file_id || null, scheduled_at, JSON.stringify(target_filter || {}), telegramId]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating scheduled broadcast:', error)
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
  }
}

// DELETE - Cancel scheduled broadcast
export async function DELETE(request: NextRequest) {
  try {
    const initData = request.headers.get('x-telegram-init-data')
    const id = request.nextUrl.searchParams.get('id')

    if (!initData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const telegramId = validateInitData(initData)
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid init data' }, { status: 401 })
    }

    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await query(
      `UPDATE scheduled_broadcasts SET status = 'cancelled' WHERE id = $1 AND status = 'pending'`,
      [id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling broadcast:', error)
    return NextResponse.json({ error: 'Failed to cancel broadcast' }, { status: 500 })
  }
}
