import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'

const execAsync = promisify(exec)

const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []

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

    // Check Remnawave connection via the shared client (avoids duplicating auth logic)
    let remnawaveConnected = false
    let remnawaveMessage = 'Не настроено'

    if (isRemnawaveConfigured()) {
      try {
        await remnawave.getSystemStats()
        remnawaveConnected = true
        remnawaveMessage = 'Подключено'
      } catch (error: any) {
        remnawaveMessage = `Ошибка соединения: ${error.message}`
      }
    } else {
      remnawaveMessage = 'Не настроены переменные окружения'
    }

    return NextResponse.json({
      remnawave_connected: remnawaveConnected,
      remnawave_message: remnawaveMessage
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
