-- TASK-02: Create employee_offices table for multi-office employee assignments.

create table if not exists public.employee_offices (
  employee_id text not null references public.users(id) on delete cascade,
  office_id text not null references public.offices(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  primary key (employee_id, office_id)
);

create unique index if not exists employee_offices_one_primary_per_employee
  on public.employee_offices (employee_id)
  where is_primary = true;

create index if not exists idx_employee_offices_employee_id
  on public.employee_offices (employee_id);

create index if not exists idx_employee_offices_office_id
  on public.employee_offices (office_id);
