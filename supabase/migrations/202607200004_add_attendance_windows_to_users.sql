-- TASK: Add attendance windows and admin flags to public.users.

alter table public.users
  add column if not exists department varchar(191),
  add column if not exists check_in_window_start varchar(5) not null default '06:00',
  add column if not exists check_in_window_end varchar(5) not null default '10:00',
  add column if not exists check_out_window_start varchar(5) not null default '15:00',
  add column if not exists check_out_window_end varchar(5) not null default '23:00',
  add column if not exists standard_check_in_time varchar(5) not null default '08:00',
  add column if not exists is_global_admin boolean not null default false,
  add column if not exists is_test_account boolean not null default false;