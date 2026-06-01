import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Check if user is admin
async function isAdmin(telegramId: string): Promise<boolean> {
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => id.trim()) || []
  return adminIds.includes(telegramId)
}

// GET - Get all allowed IPs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id || !(await isAdmin(telegram_id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const result = await pool.query(`
      SELECT
        ai.*,
        u.username as created_by_username
      FROM allowed_ips ai
      LEFT JOIN users u ON ai.created_by_telegram_id = u.telegram_id
      ORDER BY ai.created_at DESC
    `)

    return NextResponse.json({ ips: result.rows })
  } catch (error) {
    console.error('Error fetching allowed IPs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new allowed IP
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id || !(await isAdmin(telegram_id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { ip_address, description } = body

    if (!ip_address) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 })
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip_address)) {
      return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO allowed_ips (ip_address, description, created_by_telegram_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip_address) DO UPDATE
       SET description = $2, updated_at = NOW()
       RETURNING *`,
      [ip_address, description || null, telegram_id]
    )

    return NextResponse.json({
      success: true,
      ip: result.rows[0]
    })
  } catch (error) {
    console.error('Error adding allowed IP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove allowed IP
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get('telegram_id')
    const ip_id = searchParams.get('id')

    if (!telegram_id || !(await isAdmin(telegram_id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!ip_id) {
      return NextResponse.json({ error: 'IP ID is required' }, { status: 400 })
    }

    await pool.query('DELETE FROM allowed_ips WHERE id = $1', [ip_id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting allowed IP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
