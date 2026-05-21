# Восстановление статусов подписок после миграции

## Проблема
При добавлении статуса 'trial' в constraint, все подписки со статусами 'trial' и 'pending' были ошибочно изменены на 'active'.

## Решение

### 1. Восстановлены триальные подписки
```sql
UPDATE subscriptions 
SET status = 'trial' 
WHERE status = 'active' 
  AND expires_at IS NOT NULL
  AND expires_at - starts_at <= interval '3 days 1 hour'
  AND expires_at - starts_at >= interval '2 days 23 hours';
```
**Результат:** 20 подписок восстановлены как 'trial'

### 2. Добавлен статус 'pending' в constraint
```sql
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'trial'::text, 'pending'::text]));
```

### 3. Восстановлены pending подписки
```sql
UPDATE subscriptions 
SET status = 'pending' 
WHERE expires_at IS NULL AND status = 'active';
```
**Результат:** 22 подписки восстановлены как 'pending'

## Итоговое состояние
- **active**: 9 подписок (оплаченные, активные)
- **trial**: 20 подписок (триальные на 3 дня)
- **pending**: 22 подписки (ожидают оплаты)

## Дата восстановления
2026-05-13 15:52
