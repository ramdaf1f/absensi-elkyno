create or replace function public.debug_office_policy_check()
returns table (
  auth_uid text,
  app_user_id text,
  app_role text,
  is_admin boolean
)
language sql
security definer
set search_path = public
as $$
  select
    auth.uid()::text,
    u.id,
    u.role::text,
    (u.role = 'admin') as is_admin
  from public.users u
  where u.id = auth.uid()::text;
$$;
