// Скрипт для проверки доступа через Telegram
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8626021046:AAHIES2b4-NaO-t-MvleZbK4AiwJ0yWOVtE';
const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://web.championvpn.xyz';

console.log('Checking Telegram WebApp configuration...');
console.log('Bot Token:', BOT_TOKEN.substring(0, 10) + '...');
console.log('WebApp URL:', WEBAPP_URL);

// Check webhook info
https.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nWebhook Info:', JSON.parse(data));
  });
});

// Check bot info
https.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nBot Info:', JSON.parse(data));
  });
});
