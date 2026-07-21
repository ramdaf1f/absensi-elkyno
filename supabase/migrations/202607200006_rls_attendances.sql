alter table public.attendance enable row level security;

drop policy if exists attendance_select_own on public.attendance;
drop policy if exists attendance_insert_own on public.attendance;
drop policy if exists attendance_update_own on public.attendance;

create policy attendance_select_own
on public.attendance
for select
to authenticated
using (user_id = auth.uid()::text);

create policy attendance_insert_own
on public.attendance
for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy attendance_update_own
on public.attendance
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);
