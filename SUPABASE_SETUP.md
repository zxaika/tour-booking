# Настройка Supabase

1. Создай проект в Supabase.
2. Открой **SQL Editor** и выполни файл `supabase_schema.sql`.
3. В `.env` укажи:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

4. Установи зависимости и запусти:

```bash
npm install
npm start
```

## Где теперь данные

JSON больше не используется для бронирований, цен, закрытых дат, состояния Telegram и админов.

- `bookings` — все бронирования.
- `app_settings` — цены, закрытые даты, правила динамических цен, состояние Telegram.
- `admin_accounts` — несколько админ-аккаунтов.

## Как добавить ещё админа

В Supabase SQL Editor выполни:

```sql
insert into public.admin_accounts (username, password_hash, is_active)
values ('roma', encode(digest('NEW_PASSWORD_HERE', 'sha256'), 'hex'), true)
on conflict (username) do update
set password_hash = excluded.password_hash,
    is_active = true;
```

После перезапуска сервера новый аккаунт будет доступен. Также можно добавить админа через API `/api/admin/admins/create`, если уже вошёл существующим админом.

## Важно для хостинга

На хостинге обязательно добавь переменные окружения `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`. Service Role ключ должен быть только на сервере, не в браузере.
