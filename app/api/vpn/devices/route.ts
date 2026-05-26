import { NextRequest, NextResponse } from 'next/server'
import { remnawave, isRemnawaveConfigured } from '@/lib/remnawave'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    const tid = parseInt(telegram_id)
    if (isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })
    }

    // Check active subscription in DB
    const subResult = await query(
      `SELECT s.subscription_id, s.panel_user_uuid, s.devices_count
       FROM subscriptions s
       WHERE s.user_id = $1 AND s.is_active = true AND s.end_date > NOW()
       ORDER BY s.end_date DESC LIMIT 1`,
      [tid]
    )

    if (subResult.rows.length === 0) {
      return NextResponse.json({
        devices: [],
        max_devices: 1,
        current_count: 0,
        active: false,
      })
    }

    const sub = subResult.rows[0]
    const maxDevices = sub.devices_count ?? 3

    if (!isRemnawaveConfigured()) {
      return NextResponse.json({
        devices: [],
        max_devices: maxDevices,
        current_count: 0,
        active: true,
        message: 'VPN panel not configured',
      })
    }

    const devices = await remnawave.getUserDevices(tid)

    return NextResponse.json({
      devices,
      max_devices: maxDevices,
      current_count: devices.length,
      active: true,
    })
  } catch (error) {
    console.error('Devices API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const telegram_id = searchParams.get('telegram_id')
    const hwid        = searchParams.get('hwid')

    if (!telegram_id || !hwid) {
      return NextResponse.json({ error: 'telegram_id and hwid are required' }, { status: 400 })
    }

    const tid = parseInt(telegram_id)
    if (isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 400 })
    }

    if (!isRemnawaveConfigured()) {
      return NextResponse.json({ error: 'VPN panel not configured' }, { status: 503 })
    }

    const success = await remnawave.disconnectDevice(tid, hwid)

    if (success) {
      return NextResponse.json({ success: true, message: 'Device disconnected' })
    } else {
      return NextResponse.json({ error: 'Failed to disconnect device' }, { status: 500 })
    }
  } catch (error) {
    console.error('Device disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
