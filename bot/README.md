# MidasVPN Telegram Bot

Python-бот в стиле приложенных экранов: личный кабинет, промокоды, реферальная система, подписка, устройства и покупка тарифа.

## Запуск

1. Установите зависимости:

```bash
pip install -r requirements.txt
```

2. Создайте `.env` из примера:

```bash
copy .env.example .env
```

3. Вставьте токен от BotFather в `BOT_TOKEN`.

4. Запустите:

```bash
python -m bot.main
```

Данные пользователей хранятся в `data/users.json`.
