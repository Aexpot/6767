#!/bin/bash

# Update Telegram Bot Commands
# This script updates the bot commands to include the /admin command

echo "🔄 Updating Telegram bot commands..."

# Load environment variables
source /root/championvpn/.env

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN not found in .env"
  exit 1
fi

# Set bot commands
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Запустить бота"},
      {"command": "help", "description": "Помощь и инструкция"},
      {"command": "account", "description": "Личный кабинет"},
      {"command": "referral", "description": "Реферальная программа"},
      {"command": "support", "description": "Поддержка"},
      {"command": "admin", "description": "🛡️ Админ-панель (только для админов)"}
    ]
  }'

echo ""
echo "✅ Bot commands updated successfully!"
echo ""
echo "Available commands:"
echo "  /start - Запустить бота"
echo "  /help - Помощь и инструкция"
echo "  /account - Личный кабинет"
echo "  /referral - Реферальная программа"
echo "  /support - Поддержка"
echo "  /admin - 🛡️ Админ-панель (только для админов)"
