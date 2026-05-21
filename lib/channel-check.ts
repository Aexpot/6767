import { query } from '@/lib/db'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

export async function checkChannelSubscription(userId: number): Promise<boolean> {
  if (!TELEGRAM_CHANNEL_ID) {
    console.warn('TELEGRAM_CHANNEL_ID not set, skipping channel check')
    return true
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${TELEGRAM_CHANNEL_ID}&user_id=${userId}`
    )

    const data = await response.json()

    if (!data.ok) {
      console.error('Failed to check channel subscription:', data)
      return false
    }

    const status = data.result.status
    return ['member', 'administrator', 'creator'].includes(status)
  } catch (error) {
    console.error('Error checking channel subscription:', error)
    return false
  }
}

export async function updateUserChannelStatus(telegramId: string, isSubscribed: boolean) {
  try {
    await query(
      `UPDATE users
       SET channel_subscribed = $1,
           channel_subscribed_at = CASE WHEN $1 = true THEN NOW() ELSE channel_subscribed_at END,
           updated_at = NOW()
       WHERE telegram_id = $2`,
      [isSubscribed, telegramId]
    )
  } catch (error) {
    console.error('Failed to update channel status:', error)
  }
}
