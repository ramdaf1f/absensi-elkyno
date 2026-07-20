-- TASK-02: Create employee_offices table for multi-office employee assignments.

create table if not exists public.employee_offices (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (employee_id, office_id)
);

alter table public.employee_offices
  alter column is_primary set default false,
  alter column created_at set default now();

create unique index if not exists employee_offices_employee_id_office_id_key
  on public.employee_offices (employee_id, office_id);

create unique index if not exists employee_offices_one_primary_per_employee
  on public.employee_offices (employee_id)
  where is_primary = true;

create index if not exists idx_employee_offices_employee_id
  on public.employee_offices (employee_id);

create index if not exists idx_employee_offices_office_id
  on public.employee_offices (office_id);
