// Script to check and notify users about expiring subscriptions
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://championvpn_user:championvpn_secure_pass@localhost:5432/championvpn'
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://web.championvpn.xyz';

async function sendTelegramMessage(telegramId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body = {
    chat_id: telegramId,
    text: text,
    parse_mode: 'HTML',
    ...replyMarkup
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (!data.ok) {
      console.error(`Failed to send message to ${telegramId}:`, data);
    }
    return data.ok;
  } catch (error) {
    console.error(`Error sending message to ${telegramId}:`, error);
    return false;
  }
}

async function checkExpiringSubscriptions() {
  try {
    console.log('Checking for expiring subscriptions...');

    // First, update all expired subscriptions
    const expiredResult = await pool.query(`
      UPDATE subscriptions
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('active', 'trial')
        AND expires_at < NOW()
      RETURNING id
    `);
    console.log(`Updated ${expiredResult.rowCount} expired subscriptions`);

    // Check subscriptions expiring in 3 days
    const threeDaysResult = await pool.query(`
      SELECT u.id as user_id, u.telegram_id, u.first_name, s.id as subscription_id, s.expires_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('active', 'trial')
        AND s.expires_at > NOW()
        AND s.expires_at <= NOW() + INTERVAL '3 days'
        AND s.expires_at > NOW() + INTERVAL '2 days'
        AND NOT EXISTS (
          SELECT 1 FROM notification_log
          WHERE subscription_id = s.id
          AND notification_type = 'expiring_3days'
        )
    `);

    console.log(`Found ${threeDaysResult.rows.length} subscriptions expiring in 3 days`);

    for (const row of threeDaysResult.rows) {
      const expiryDate = new Date(row.expires_at).toLocaleDateString('ru-RU');
      const message = `⚠️ <b>Ой-ой! Ваш VPN заканчивается!</b>\n\n` +
        `Ваша подписка истекает <b>${expiryDate}</b>\n\n` +
        `Не теряйте доступ к безопасному интернету! 🔒`;

      const replyMarkup = {
        reply_markup: {
          inline_keyboard: [[
            { text: '💳 Пополнить', web_app: { url: APP_URL } }
          ]]
        }
      };

      const sent = await sendTelegramMessage(row.telegram_id, message, replyMarkup);
      
      if (sent) {
        // Log notification
        await pool.query(
          `INSERT INTO notification_log (notification_type, user_id, subscription_id)
           VALUES ($1, $2, $3)`,
          ['expiring_3days', row.user_id, row.subscription_id]
        );
        console.log(`Notified user ${row.telegram_id} (3 days)`);
      }
    }

    // Check subscriptions expiring in 1 day
    const oneDayResult = await pool.query(`
      SELECT u.id as user_id, u.telegram_id, u.first_name, s.id as subscription_id, s.expires_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('active', 'trial')
        AND s.expires_at > NOW()
        AND s.expires_at <= NOW() + INTERVAL '1 day'
        AND NOT EXISTS (
          SELECT 1 FROM notification_log
          WHERE subscription_id = s.id
          AND notification_type = 'expiring_1day'
        )
    `);

    console.log(`Found ${oneDayResult.rows.length} subscriptions expiring in 1 day`);

    for (const row of oneDayResult.rows) {
      const expiryDate = new Date(row.expires_at).toLocaleDateString('ru-RU');
      const message = `🚨 <b>СРОЧНО! Ваш VPN заканчивается завтра!</b>\n\n` +
        `Ваша подписка истекает <b>${expiryDate}</b>\n\n` +
        `Осталось меньше суток! Продлите прямо сейчас! ⚡`;

      const replyMarkup = {
        reply_markup: {
          inline_keyboard: [[
            { text: '💳 Пополнить сейчас', web_app: { url: APP_URL } }
          ]]
        }
      };

      const sent = await sendTelegramMessage(row.telegram_id, message, replyMarkup);
      
      if (sent) {
        // Log notification
        await pool.query(
          `INSERT INTO notification_log (notification_type, user_id, subscription_id)
           VALUES ($1, $2, $3)`,
          ['expiring_1day', row.user_id, row.subscription_id]
        );
        console.log(`Notified user ${row.telegram_id} (1 day)`);
      }
    }

    console.log('Finished checking expiring subscriptions');
  } catch (error) {
    console.error('Error checking expiring subscriptions:', error);
  } finally {
    await pool.end();
  }
}

checkExpiringSubscriptions();
