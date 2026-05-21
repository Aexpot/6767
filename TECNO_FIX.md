# Исправление проблемы доступа для TECNO KL7

## Проблема
Пользователь с IP 178.66.85.0 на телефоне TECNO KL7 заходит через Telegram, но видит сообщение "Доступно только в Telegram".

## Причины
1. **Telegram WebApp API не инициализируется** на некоторых устройствах (TECNO, некоторые Android)
2. **Бот не имеет настроенного Main Web App** (`has_main_web_app: false`)
3. Fallback логика создавала демо-пользователя вместо реального

## Исправления

### 1. Улучшена fallback логика (contexts/user-context.tsx)
- Добавлено детальное логирование для отладки
- Добавлено извлечение данных пользователя из URL параметров (`tgWebAppData`)
- Убран демо-пользователь, вместо него показывается ошибка с инструкцией

### 2. Необходимо настроить Mini App в боте

**Инструкция для настройки:**

1. Откройте @BotFather в Telegram
2. Отправьте команду `/mybots`
3. Выберите бота `@x0vpn_bot`
4. Выберите "Bot Settings" → "Menu Button"
5. Выберите "Configure menu button"
6. Введите:
   - **Text**: "Открыть VPN"
   - **URL**: `https://web.x0vpn.xyz`

Или используйте команду:
```bash
curl -X POST "https://api.telegram.org/bot8626021046:AAHIES2b4-NaO-t-MvleZbK4AiwJ0yWOVtE/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Открыть VPN",
      "web_app": {
        "url": "https://web.x0vpn.xyz"
      }
    }
  }'
```

### 3. Альтернативный способ запуска

Если проблема сохраняется, пользователь может открыть приложение через inline кнопку:

1. Отправьте пользователю сообщение с inline кнопкой:
```python
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(
        text="🚀 Открыть VPN",
        web_app=WebAppInfo(url="https://web.x0vpn.xyz")
    )]
])

await bot.send_message(
    chat_id=USER_TELEGRAM_ID,
    text="Нажмите кнопку ниже, чтобы открыть VPN приложение:",
    reply_markup=keyboard
)
```

## Проверка

После настройки проверьте:
```bash
curl "https://api.telegram.org/bot8626021046:AAHIES2b4-NaO-t-MvleZbK4AiwJ0yWOVtE/getChatMenuButton"
```

Должно вернуть:
```json
{
  "ok": true,
  "result": {
    "type": "web_app",
    "text": "Открыть VPN",
    "web_app": {
      "url": "https://web.x0vpn.xyz"
    }
  }
}
```

## Логи для отладки

Теперь в консоли браузера будут видны логи:
- `[Telegram Fallback] WebApp detected but no initData`
- `[Telegram Fallback] Telegram User: ...`
- `[Telegram Fallback] Extracted user from URL: ...`

Попросите пользователя:
1. Открыть приложение через бота
2. Открыть DevTools (если возможно)
3. Посмотреть консоль и отправить скриншот

## Дата исправления
2026-05-13 19:26 UTC
