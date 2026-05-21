import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminLogs } from '@/lib/admin-logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get('telegram_id')
    const action = searchParams.get('action')
    const entity_type = searchParams.get('entity_type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Verify admin
    const userResult = await query(
      'SELECT id, is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get logs
    const logs = await getAdminLogs({
      action: action || undefined,
      entity_type: entity_type || undefined,
      limit,
      offset
    })

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM admin_logs'
    )

    return NextResponse.json({
      success: true,
      logs,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    })
  } catch (error) {
    console.error('Get logs error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
