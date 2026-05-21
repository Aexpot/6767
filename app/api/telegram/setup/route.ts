import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

export async function GET(request: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  if (!APP_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })
  }

  const webhookUrl = `${APP_URL}/api/telegram/webhook`

  try {
    // Set webhook
    const setWebhookResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true
        })
      }
    )

    const webhookResult = await setWebhookResponse.json()

    // Set bot commands
    const commandsResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Запустить бота' },
            { command: 'status', description: 'Статус подписки' },
            { command: 'help', description: 'Помощь' },
            { command: 'support', description: 'Связаться с поддержкой' }
          ]
        })
      }
    )

    const commandsResult = await commandsResponse.json()

    // Get bot info
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    )
    const botInfo = await botInfoResponse.json()

    // Set Web App menu button
    if (botInfo.ok) {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_button: {
              type: 'web_app',
              text: 'Открыть приложение',
              web_app: { url: APP_URL }
            }
          })
        }
      )
    }

    return NextResponse.json({
      success: true,
      webhook: webhookResult,
      commands: commandsResult,
      bot: botInfo.result,
      webhookUrl
    })
  } catch (error) {
    console.error('Error setting up bot:', error)
    return NextResponse.json({ 
      error: 'Failed to setup bot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Delete webhook (for debugging)
export async function DELETE() {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_pending_updates: true })
      }
    )

    const result = await response.json()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}
