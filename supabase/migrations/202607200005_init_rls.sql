-- TASK-04: Initial RLS policies for core tables.

alter table public.users enable row level security;
alter table public.offices enable row level security;
alter table public.employee_offices enable row level security;
alter table public.attendance enable row level security;
alter table public.holidays enable row level security;
alter table public.audit_logs enable row level security;

-- users: self-access only

drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users
  for select
  to authenticated
  using (id = auth.uid()::text);

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users
  for update
  to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

-- attendance: self-access only

drop policy if exists attendance_select_own on public.attendance;
create policy attendance_select_own
  on public.attendance
  for select
  to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists attendance_insert_own on public.attendance;
create policy attendance_insert_own
  on public.attendance
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists attendance_update_own on public.attendance;
create policy attendance_update_own
  on public.attendance
  for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- offices: readable only when linked through employee_offices

drop policy if exists offices_select_linked on public.offices;
create policy offices_select_linked
  on public.offices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employee_offices
      where employee_offices.office_id = offices.id
        and employee_offices.employee_id = auth.uid()::text
    )
  );

-- employee_offices: self rows only

drop policy if exists employee_offices_select_own on public.employee_offices;
create policy employee_offices_select_own
  on public.employee_offices
  for select
  to authenticated
  using (employee_id = auth.uid()::text);