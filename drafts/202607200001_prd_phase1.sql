-- PRD phase 1 foundation: attendance guards, personal windows, roles, and multi-office tables.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum ('on_time', 'late', 'present', 'alpha', 'leave', 'sick', 'cuti');
  end if;
  if not exists (select 1 from pg_type where typname = 'attendance_input_method') then
    create type attendance_input_method as enum ('self', 'manual_admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'holiday_type') then
    create type holiday_type as enum ('national', 'joint_leave', 'office');
  end if;
exception
  when duplicate_object then null;
end $$;

alter table users
  add column if not exists department varchar(191),
  add column if not exists check_in_window_start varchar(5) not null default '06:00',
  add column if not exists check_in_window_end varchar(5) not null default '10:00',
  add column if not exists check_out_window_start varchar(5) not null default '15:00',
  add column if not exists check_out_window_end varchar(5) not null default '23:00',
  add column if not exists standard_check_in_time varchar(5) not null default '08:00',
  add column if not exists is_global_admin boolean not null default false,
  add column if not exists is_test_account boolean not null default false;

alter table users drop constraint if exists users_role_check;
alter table users
  add constraint users_role_check check (role in ('employee', 'admin', 'superadmin'));

create table if not exists offices (
  id text primary key default gen_random_uuid()::text,
  name varchar(191) not null,
  address text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  radius_m integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.office_settings') is not null and not exists (select 1 from offices) then
    insert into offices (name, latitude, longitude, radius_m)
    select name, latitude, longitude, radius_m
    from office_settings;
  end if;
end $$;

create table if not exists employee_offices (
  employee_id text not null references users(id) on delete cascade,
  office_id text not null references offices(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, office_id)
);

create table if not exists admin_offices (
  admin_id text not null references users(id) on delete cascade,
  office_id text not null references offices(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (admin_id, office_id)
);

insert into employee_offices (employee_id, office_id)
select users.id, offices.id
from users
cross join lateral (select id from offices order by created_at limit 1) offices
where users.role = 'employee'
on conflict do nothing;

alter table attendance
  add column if not exists office_id text references offices(id),
  add column if not exists photo_url text,
  add column if not exists status attendance_status not null default 'present',
  add column if not exists input_method attendance_input_method not null default 'self',
  add column if not exists input_by text references users(id),
  add column if not exists checkout_missed boolean not null default false;

update attendance
set office_id = (select id from offices order by created_at limit 1)
where office_id is null
  and exists (select 1 from offices);

create unique index if not exists uniq_attendance_user_type_day
  on attendance (user_id, type, ((created_at at time zone 'Asia/Jakarta')::date));

alter table holidays
  add column if not exists type holiday_type not null default 'national',
  add column if not exists office_id text references offices(id);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text references users(id),
  action varchar(191) not null,
  entity_type varchar(191) not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on audit_logs(actor_id);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
