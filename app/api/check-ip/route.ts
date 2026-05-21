import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')

    if (!ip) {
      return NextResponse.json({ allowed: false })
    }

    const result = await pool.query(
      'SELECT id FROM allowed_ips WHERE ip_address = $1',
      [ip]
    )

    return NextResponse.json({ allowed: result.rows.length > 0 })
  } catch (error) {
    console.error('Error checking IP:', error)
    return NextResponse.json({ allowed: false })
  }
}
