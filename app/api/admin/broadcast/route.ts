import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logAdminAction } from '@/lib/admin-logger'
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

async function sendTelegramMessage(chatId: string, message: string, photoFileId?: string) {
  try {
    const url = photoFileId
      ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
      : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const body = photoFileId
      ? {
          chat_id: chatId,
          photo: photoFileId,
          caption: message,
          parse_mode: 'HTML'
        }
      : {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return response.ok
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth: accept either Telegram initData (mini-app) or telegram_id query param (web admin)
    let resolvedTelegramId: number | null = null

    const initData = request.headers.get('x-telegram-init-data')
    const telegramIdParam = request.nextUrl.searchParams.get('telegram_id')

    if (initData) {
      resolvedTelegramId = validateInitData(initData)
      if (!resolvedTelegramId) {
        return NextResponse.json({ error: 'Invalid init data' }, { status: 401 })
      }
    } else if (telegramIdParam) {
      resolvedTelegramId = parseInt(telegramIdParam, 10)
      if (isNaN(resolvedTelegramId)) {
        return NextResponse.json({ error: 'Invalid telegram_id' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const telegramId = resolvedTelegramId

    // Check admin permission
    const adminCheck = await query(
      'SELECT id, is_admin FROM users WHERE telegram_id = $1',
      [telegramId]
    )

    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminId = adminCheck.rows[0].id

    const formData = await request.formData()
    const message = formData.get('message') as string
    const imageFile = formData.get('image') as File | null

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Upload image to Telegram if provided
    let photoFileId: string | undefined

    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Telegram to get file_id
      const uploadFormData = new FormData()
      uploadFormData.append('chat_id', telegramId.toString())
      uploadFormData.append('photo', new Blob([buffer]), imageFile.name)

      const uploadResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          body: uploadFormData,
        }
      )

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json()
        // Get the largest photo size
        const photos = uploadData.result.photo
        const largestPhoto = photos[photos.length - 1]
        photoFileId = largestPhoto.file_id
      }
    }

    // Get all users
    const usersResult = await query(
      'SELECT telegram_id FROM users WHERE is_banned = false'
    )

    let successCount = 0
    let failedCount = 0

    // Send to all users with delay to avoid rate limits
    for (const user of usersResult.rows) {
      const success = await sendTelegramMessage(
        user.telegram_id,
        message,
        photoFileId
      )

      if (success) {
        successCount++
      } else {
        failedCount++
      }

      // Delay to avoid Telegram rate limits (30 messages per second)
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    await logAdminAction({
      admin_id: adminId,
      action: 'broadcast_send',
      details: {
        message_preview: message.substring(0, 100),
        has_image: !!photoFileId,
        success: successCount,
        failed: failedCount,
        total: usersResult.rows.length
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: usersResult.rows.length
    })

  } catch (error) {
    console.error('Broadcast error:', error)
    return NextResponse.json(
      { error: 'Failed to send broadcast' },
      { status: 500 }
    )
  }
}
