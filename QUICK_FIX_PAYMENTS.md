# ⚡ Быстрое решение проблемы с оплатами

## Проблема
Оплаты проходят, но деньги не зачисляются на баланс.

## Причина
Webhook не настроен в CryptoPay.

## Решение (2 минуты)

### 1. Откройте @CryptoBot в Telegram
👉 https://t.me/CryptoBot

### 2. Отправьте команду:
```
/pay
```

### 3. Выберите:
- **"Crypto Pay"** → **"My Apps"** → Ваше приложение

### 4. Нажмите:
- **"Webhooks..."** → **"🌕 Enable Webhooks"**

### 5. Введите URL:
```
https://app.championvpn.fun/api/payment/cryptopay/webhook
```

### 6. Сохраните

---

## ✅ Готово!

Теперь все оплаты будут автоматически обрабатываться:
- Платёж → `completed`
- Подписка → `active`  
- VPN → создан в Marzban

---

## 📋 Проверка

```bash
pm2 logs championvpn-3001 --lines 20
```

Должны быть сообщения:
```
✅ VPN user created/extended successfully!
```

---

📄 **Подробная инструкция:** `/root/championvpn/CRYPTOPAY_WEBHOOK_SETUP.md`
