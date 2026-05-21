import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []
const MARZBAN_API_URL = process.env.MARZBAN_API_URL
const MARZBAN_USERNAME = process.env.MARZBAN_USERNAME
const MARZBAN_PASSWORD = process.env.MARZBAN_PASSWORD

function isAdmin(telegramId: number): boolean {
  return ADMIN_IDS.includes(telegramId)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = parseInt(searchParams.get('telegram_id') || '0')

    // Check admin access
    if (!isAdmin(telegramId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check Marzban connection
    let marzbanConnected = false
    let marzbanMessage = 'Не настроено'

    if (MARZBAN_API_URL && MARZBAN_USERNAME && MARZBAN_PASSWORD) {
      try {
        const response = await fetch(`${MARZBAN_API_URL}/api/user`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${MARZBAN_USERNAME}:${MARZBAN_PASSWORD}`).toString('base64')}`
          }
        })

        if (response.ok) {
          marzbanConnected = true
          marzbanMessage = 'Подключено'
        } else {
          marzbanMessage = `Ошибка: ${response.status}`
        }
      } catch (error: any) {
        marzbanMessage = `Ошибка соединения: ${error.message}`
      }
    } else {
      marzbanMessage = 'Не настроены переменные окружения'
    }

    return NextResponse.json({
      marzban_connected: marzbanConnected,
      marzban_message: marzbanMessage
    })
  } catch (error: any) {
    console.error('System API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = parseInt(searchParams.get('telegram_id') || '0')

    // Check admin access
    if (!isAdmin(telegramId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'restart') {
      // Restart the application using PM2
      try {
        // Check if PM2 is available
        const { stdout: pm2List } = await execAsync('pm2 list')

        if (pm2List.includes('ChampionVPN')) {
          // Restart using PM2
          await execAsync('pm2 restart ChampionVPN')

          return NextResponse.json({
            success: true,
            message: 'Server restarted successfully via PM2'
          })
        } else {
          // Try to restart using systemd or other methods
          try {
            await execAsync('systemctl restart ChampionVPN')
            return NextResponse.json({
              success: true,
              message: 'Server restarted successfully via systemd'
            })
          } catch {
            return NextResponse.json({
              success: false,
              error: 'No restart method available (PM2 or systemd)'
            }, { status: 500 })
          }
        }
      } catch (error: any) {
        console.error('Restart error:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('System API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
