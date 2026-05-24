import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { remnawave } from '@/lib/remnawave'

// Check if user is admin
async function isAdmin(telegramId: number): Promise<boolean> {
  const result = await query(
    'SELECT is_admin FROM users WHERE telegram_id = $1',
    [telegramId]
  )
  return result.rows[0]?.is_admin || false
}

// GET - Get settings (public endpoint for maintenance check)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegramId = searchParams.get('telegram_id')

    // Get settings from database
    const result = await query('SELECT * FROM system_settings WHERE id = 1')
    const settings = result.rows[0]

    // Public response (maintenance mode only)
    const publicResponse = {
      maintenance_mode: settings?.maintenance_mode || false,
      maintenance_message: settings?.maintenance_message || 'Ведутся технические работы'
    }

    // If admin, include additional info
    if (telegramId && Number(telegramId) > 0 && (await isAdmin(Number(telegramId)))) {
      return NextResponse.json({
        ...publicResponse,
        remnawave_configured: !!(process.env.REMNAWAVE_API_URL && process.env.REMNAWAVE_API_TOKEN)
      })
    }

    return NextResponse.json(publicResponse)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegramId = searchParams.get('telegram_id')

    if (!telegramId || !(await isAdmin(Number(telegramId)))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { maintenance_mode, maintenance_message } = body

    // Update settings
    const result = await query(
      `INSERT INTO system_settings (id, maintenance_mode, maintenance_message, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE
       SET maintenance_mode = $1, maintenance_message = $2, updated_at = NOW()
       RETURNING *`,
      [maintenance_mode, maintenance_message]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Check Remnawave server status
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegramId = searchParams.get('telegram_id')

    if (!telegramId || !(await isAdmin(Number(telegramId)))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'check_remnawave') {
      try {
        console.log('Checking Remnawave status...')
        console.log('REMNAWAVE_API_URL:', process.env.REMNAWAVE_API_URL)
        console.log('REMNAWAVE_API_TOKEN:', process.env.REMNAWAVE_API_TOKEN)

        const stats = await remnawave.getSystemStats()
        return NextResponse.json({
          success: true,
          status: 'online',
          data: {
            version: stats.version,
            total_users: stats.total_user,
            active_users: stats.users_active,
            cpu_usage: stats.cpu_usage,
            mem_used: stats.mem_used,
            mem_total: stats.mem_total,
            cpu_cores: stats.cpu_cores
          }
        })
      } catch (error: any) {
        console.error('Remnawave check error:', error.message)
        return NextResponse.json({
          success: false,
          status: 'offline',
          error: error.message
        })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in settings action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
