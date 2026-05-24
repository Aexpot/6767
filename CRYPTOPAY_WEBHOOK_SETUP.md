# Настройка CryptoPay Webhook

## Дата: 2026-05-21

---

## 🎯 ПРОБЛЕМА

Оплаты создаются, но не обрабатываются. Все платежи остаются в статусе `pending`.

**Причина:** Webhook не настроен в CryptoPay, поэтому уведомления об оплате не приходят на сервер.

---

## ✅ РЕШЕНИЕ

### 1. Настройка Webhook в CryptoPay

1. **Откройте @CryptoBot в Telegram**
   - Для основной сети: [@CryptoBot](https://t.me/CryptoBot)
   - Для тестовой сети: [@CryptoTestnetBot](https://t.me/CryptoTestnetBot)

2. **Перейдите в раздел приложений:**
   - Отправьте команду: `/pay`
   - Выберите **"Crypto Pay"**
   - Выберите **"My Apps"**

3. **Выберите ваше приложение:**
   - Найдите приложение с токеном: `584845:AAWhNLZX3GKHt0pUDEs7...`

4. **Настройте Webhooks:**
   - Нажмите **"Webhooks..."**
   - Нажмите **"🌕 Enable Webhooks"**
   - Введите URL:
     ```
     https://app.championvpn.fun/api/payment/cryptopay/webhook
     ```
   - Сохраните настройки

### 2. Проверка работы

После настройки webhook:

1. Создайте тестовый платёж в боте
2. Оплатите его через CryptoPay
3. Webhook автоматически обработает оплату:
   - ✅ Платёж перейдёт в статус `completed`
   - ✅ Подписка активируется
   - ✅ VPN пользователь создастся в Marzban
   - ✅ Пользователь получит доступ к серверам

---

## 🔍 КАК ЭТО РАБОТАЕТ

### Webhook Flow:

```
Пользователь оплачивает → CryptoPay
                            ↓
            POST запрос с подписью
                            ↓
    /api/payment/cryptopay/webhook
                            ↓
          Проверка подписи (SHA256)
                            ↓
              Обработка платежа
                            ↓
         ┌────────────────┼────────────────┐
         ↓                ↓                ↓
  Payment:completed  Subscription:active  VPN User
```

### Проверка подписи:

Webhook использует **HMAC-SHA256** для проверки подлинности:

```javascript
const secret = crypto.createHash('sha256').update(API_TOKEN).digest()
const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
// Сравнивается с заголовком 'crypto-pay-api-signature'
```

**Важно:** Secret - это SHA256 хеш от API токена, не нужно его вводить вручную!

---

## 📊 ТЕСТИРОВАНИЕ

### Проверить, что webhook работает:

1. **Посмотреть логи:**
   ```bash
   pm2 logs championvpn-3001 --lines 50
   ```

   Должны быть такие сообщения:
   ```
   === Creating VPN user in Marzban ===
   Telegram ID: 6720850486
   Duration (months): 1
   ✅ VPN user created/extended successfully!
   ```

2. **Проверить статус платежа:**
   ```bash
   psql "postgresql://championvpn_user:championvpn_secure_pass@localhost:5432/championvpn" \
     -c "SELECT id, status, updated_at FROM payments ORDER BY created_at DESC LIMIT 5;"
   ```

   Оплаченные платежи должны иметь статус `completed`.

3. **Проверить подписку:**
   ```bash
   psql "postgresql://championvpn_user:championvpn_secure_pass@localhost:5432/championvpn" \
     -c "SELECT id, status, expires_at FROM subscriptions WHERE status = 'active' LIMIT 5;"
   ```

---

## 🚨 ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### 1. **Webhook не приходит**

**Причины:**
- URL неправильный
- Сервер недоступен извне
- Firewall блокирует запросы

**Проверка:**
```bash
# Проверить, что сервер доступен
curl -I https://app.championvpn.fun/api/payment/cryptopay/webhook

# Должен вернуть: 405 Method Not Allowed (это нормально для GET)
```

### 2. **Ошибка "Invalid signature"**

**Причины:**
- Неправильный API токен
- Тело запроса изменено

**Решение:**
- Проверить API токен в .env
- Посмотреть логи для детальной информации

### 3. **Webhook отключился автоматически**

CryptoPay автоматически отключает webhook, если сервер не отвечает после 17 попыток в течение 3 дней.

**Решение:**
1. Проверить, что сервер работает
2. Снова включить webhook в @CryptoBot
3. Проверить логи PM2

---

## 📝 ТЕКУЩИЙ СТАТУС

### ✅ Реализовано:

- ✅ Webhook endpoint: `/api/payment/cryptopay/webhook`
- ✅ Проверка подписи HMAC-SHA256
- ✅ Обработка события `invoice_paid`
- ✅ Обновление статуса платежа
- ✅ Активация подписки
- ✅ Создание VPN пользователя в Marzban
- ✅ Retry logic от CryptoPay (17 попыток / 3 дня)

### ⚠️ Требуется:

- ⚠️ Настроить Webhook URL в @CryptoBot (см. инструкцию выше)

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- [CryptoPay API Документация](https://help.crypt.bot/crypto-pay-api)
- [Webhook Updates](https://help.crypt.bot/crypto-pay-api#webhooks)
- [@CryptoBot в Telegram](https://t.me/CryptoBot)
- [Developers Chat](https://t.me/CryptoPayDevelopers)

---

## 🎉 ПОСЛЕ НАСТРОЙКИ

После того, как вы настроите webhook в @CryptoBot:

1. Все новые оплаты будут автоматически обрабатываться
2. Старые pending платежи останутся в этом статусе (можно обработать вручную)
3. Пользователи сразу получат доступ к VPN после оплаты

**Всё работает!** 🚀
