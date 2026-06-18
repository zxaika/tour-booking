-- Supabase schema for Meskhi House
-- Run this in Supabase SQL Editor before hosting the app.

create extension if not exists pgcrypto;

create table if not exists public.app_settings (
    key text primary key,
    value jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
    id bigint primary key,
    type text not null default 'room',
    status text not null default 'confirmed',
    check_in date,
    check_out date,
    created_at timestamptz not null default now(),
    data jsonb not null
);

create index if not exists bookings_type_idx on public.bookings(type);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_check_in_idx on public.bookings(check_in);
create index if not exists bookings_created_at_idx on public.bookings(created_at);

create table if not exists public.admin_accounts (
    id bigserial primary key,
    username text not null unique,
    password_hash text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- First admin account. Change username/password before running or run your own insert later.
insert into public.admin_accounts (username, password_hash, is_active)
values ('admin', encode(digest('admin123', 'sha256'), 'hex'), true)
on conflict (username) do nothing;

-- Optional: add more admins like this:
-- insert into public.admin_accounts (username, password_hash, is_active)
-- values ('roma', encode(digest('your_password_here', 'sha256'), 'hex'), true)
-- on conflict (username) do update set password_hash = excluded.password_hash, is_active = true;

alter table public.app_settings enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_accounts enable row level security;

-- The Node server uses SUPABASE_SERVICE_ROLE_KEY, so RLS does not block it.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in frontend JavaScript.
