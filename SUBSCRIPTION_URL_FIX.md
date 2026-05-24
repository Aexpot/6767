# Исправление Subscription URL

## Дата: 2026-05-21

---

## 🎯 ПРОБЛЕМА

API возвращал простой subscription URL (`/sub/tg_XXXXX`) вместо закодированного (`/sub/dGdfODMyO...`), который Marzban генерирует с токеном.

---

## ✅ ЧТО БЫЛО СДЕЛАНО

### 1. Обновлен код для использования subscription_url из Marzban

**lib/marzban.ts:**
- ✅ Функция `checkSubscription` теперь возвращает `subscriptionUrl` из Marzban
- ✅ Добавлено логирование для отладки
- ✅ Используется `user.subscription_url` из API Marzban

**app/api/vpn/links/route.ts:**
- ✅ API использует `vpnData.subscriptionUrl` из `checkSubscription`
- ✅ Fallback на `getSubscriptionUrlWithToken` если Marzban недоступен

### 2. Исправлены технические проблемы

- ✅ **PostgreSQL**: Восстановлен после падения из-за нехватки места на диске
- ✅ **Диск**: Очищено ~3GB места (удалены старые бэкапы)
- ✅ **PM2**: Создан `ecosystem.config.js` с правильными переменными окружения
- ✅ **iOS Setup**: Обновлен на 2 кнопки для скачивания HApp (RU / Global)

### 3. Обновлены переменные окружения

**.env:**
```bash
# iOS HApp URLs (вместо старых ios_configs)
NEXT_PUBLIC_IOS_HAPP_RU_URL=
NEXT_PUBLIC_IOS_HAPP_GLOBAL_URL=
```

---

## 🔧 ТЕКУЩИЙ СТАТУС

### ✅ Работает:
- PostgreSQL запущен и работает
- PM2 процессы с правильными переменными окружения
- Subscription URL правильно формируется в коде

### ⚠️ Временная проблема:
- **Marzban API временно недоступен** (проблемы с подключением)
- Когда Marzban недоступен, API использует fallback с простым URL

---

## 📝 ЧТО НУЖНО ПРОВЕРИТЬ КОГДА MARZBAN ВОССТАНОВИТСЯ

1. **Проверить тестовый API:**
   ```bash
   curl "http://localhost:3001/api/test-marzban?telegram_id=8329401174"
   ```
   Должен вернуть закодированный subscription_url из Marzban

2. **Проверить основной API:**
   ```bash
   curl "http://localhost:3001/api/vpn/links?telegram_id=8329401174"
   ```
   Должен вернуть:
   ```json
   {
     "subscription_url": "https://dashboard.championvpn.fun/sub/dGdfODMyO..."
   }
   ```

3. **Проверить в приложении:**
   - Открыть профиль пользователя
   - Subscription URL должен быть закодированным

---

## 🚀 ФИНАЛЬНЫЕ ШАГИ

### 1. Добавить ссылки на HApp в .env:
```bash
nano /root/championvpn/.env
```

Заполнить:
```
NEXT_PUBLIC_IOS_HAPP_RU_URL=<ссылка на RU версию HApp>
NEXT_PUBLIC_IOS_HAPP_GLOBAL_URL=<ссылка на Global версию HApp>
```

Перезапустить:
```bash
cd /root/championvpn
pm2 restart all
```

### 2. Проверить доступность Marzban:
```bash
cd /root/championvpn
node check-real-subscription.js
```

### 3. Если Marzban недоступен - проверить:
- Запущен ли Marzban Docker контейнер
- Доступен ли домен dashboard.championvpn.fun
- Правильны ли credentials в .env

---

## 📊 АРХИТЕКТУРА РЕШЕНИЯ

```
Telegram User Request
       ↓
  API /api/vpn/links
       ↓
  marzban.checkSubscription()
       ↓
  marzban.getUser() → Marzban API
       ↓
  user.subscription_url → "/sub/dGdfODMyO..."
       ↓
  Full URL: baseUrl + subscription_url
       ↓
  Return to client
```

**Fallback** (если Marzban недоступен):
```
  getSubscriptionUrlWithToken()
       ↓
  Try getUser() → catch → return simple URL
```

---

## 🔍 ЛОГИ ДЛЯ ОТЛАДКИ

```bash
# Посмотреть логи PM2
pm2 logs championvpn-3001 --lines 50

# Посмотреть статус
pm2 list

# Проверить переменные окружения
pm2 env 1 | grep MARZBAN
```

---

## ✨ ИТОГО

Код исправлен и готов к работе. Как только Marzban API восстановится, subscription URL будет возвращаться в правильном закодированном формате из Marzban.

**Важно:** Простой URL (`/sub/tg_XXX`) тоже работает, но он не содержит токен и может не обновляться автоматически при изменении конфигурации. Закодированный URL с токеном - правильный формат, который Marzban генерирует специально для безопасности и автоматических обновлений.
