create extension if not exists pgcrypto;

create table if not exists public.offices (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  radius_m integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
