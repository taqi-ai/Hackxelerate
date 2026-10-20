-- Migration 0013: account provisioning and deprovisioning (no service-role key anywhere in the web app).
--
-- An admin invites an email address with a role inside their own institution. The person creates an account with
-- that email (Supabase Auth); on sign-in, public.claim_invite() turns a pending invite into a profile, only once the
-- email address is confirmed. An admin can deactivate an account: every access helper ignores deactivated profiles,
-- so access ends on the next request. Every provisioning action is written to the audit log.

alter table public.profiles add column if not exists disabled_at timestamptz;
-- shared evaluation accounts (their passwords are public) may look at account management but never change it
alter table public.profiles add column if not exists shared_demo boolean not null default false;
update public.profiles p set shared_demo = true from auth.users u where u.id = p.id and u.email like '%@ascora.test';
alter table public.audit_log add column if not exists detail jsonb;

create table if not exists public.account_invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name text not null check (length(full_name) between 2 and 120),
  role text not null check (role in ('admin', 'mentor', 'student')),
  mentor_id text,
  student_id text,
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  check (role <> 'mentor' or mentor_id is not null),
  check (role <> 'student' or student_id is not null)
);
-- one pending invite per email per institution
create unique index if not exists uniq_pending_invite on public.account_invites (institution_id, email)
  where accepted_at is null and revoked_at is null;
alter table public.account_invites enable row level security;

-- access helpers: a deactivated profile is nobody
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and disabled_at is null);
$$;
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor') and disabled_at is null);
$$;
create or replace function private.my_mentor_id() returns text
language sql stable security definer set search_path = public as $$
  select mentor_id from public.profiles where id = auth.uid() and disabled_at is null;
$$;
create or replace function private.my_student_id() returns text
language sql stable security definer set search_path = public as $$
  select student_id from public.profiles where id = auth.uid() and role = 'student' and disabled_at is null;
$$;
create or replace function private.my_institution() returns uuid
language sql stable security definer set search_path = public as $$
  select institution_id from public.profiles where id = auth.uid() and disabled_at is null;
$$;

create or replace function private.can_provision() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and role = 'admin' and disabled_at is null and not shared_demo);
$$;
revoke all on function private.can_provision() from public, anon;
grant execute on function private.can_provision() to authenticated;

-- accounts of the caller's institution, for admins; emails are masked for shared evaluation accounts
create or replace function public.list_accounts()
returns table (id uuid, full_name text, role text, mentor_id text, student_id text, email text,
               disabled_at timestamptz, shared_demo boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role, p.mentor_id, p.student_id,
         case when private.can_provision() then u.email
              else left(split_part(u.email, '@', 1), 2) || '****@' || split_part(u.email, '@', 2) end,
         p.disabled_at, p.shared_demo, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
   where private.is_admin() and p.institution_id = private.my_institution()
   order by p.role, p.full_name;
$$;
revoke all on function public.list_accounts() from public, anon;
grant execute on function public.list_accounts() to authenticated;

create policy "admins read invites of own institution" on public.account_invites for select to authenticated
  using (private.can_provision() and institution_id = private.my_institution());

-- writes go through these functions only (validation + audit), never direct table access
create or replace function public.invite_account(p_email text, p_full_name text, p_role text,
                                                 p_mentor_id text default null, p_student_id text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_inst uuid := private.my_institution(); v_id uuid; v_email text := lower(trim(p_email));
begin
  if not private.can_provision() then
    raise exception 'only an admin can invite accounts' using errcode = '42501';
  end if;
  if p_role = 'mentor' and not exists (select 1 from public.mentors where id = p_mentor_id and institution_id = v_inst) then
    raise exception 'unknown mentor %', p_mentor_id using errcode = '22023';
  end if;
  if p_role = 'student' and not exists (select 1 from public.students where id = p_student_id and institution_id = v_inst) then
    raise exception 'unknown student %', p_student_id using errcode = '22023';
  end if;
  if p_role = 'student' and exists (select 1 from public.profiles where student_id = p_student_id) then
    raise exception 'student % already has an account', p_student_id using errcode = '23505';
  end if;
  if exists (select 1 from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = v_email) then
    raise exception 'an account with this email already exists' using errcode = '23505';
  end if;
  insert into public.account_invites (institution_id, email, full_name, role, mentor_id, student_id)
  values (v_inst, v_email, trim(p_full_name), p_role,
          case when p_role = 'mentor' then p_mentor_id end, case when p_role = 'student' then p_student_id end)
  returning id into v_id;
  insert into public.audit_log (action, student_id, detail, institution_id)
  values ('invite_account', case when p_role = 'student' then p_student_id end,
          jsonb_build_object('invite_id', v_id, 'role', p_role), v_inst);
  return v_id;
end $$;

create or replace function public.revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_inst uuid := private.my_institution();
begin
  if not private.can_provision() then
    raise exception 'only an admin can revoke invites' using errcode = '42501';
  end if;
  update public.account_invites set revoked_at = now()
   where id = p_invite and institution_id = v_inst and accepted_at is null and revoked_at is null;
  if not found then
    raise exception 'no pending invite %', p_invite using errcode = '22023';
  end if;
  insert into public.audit_log (action, detail, institution_id)
  values ('revoke_invite', jsonb_build_object('invite_id', p_invite), v_inst);
end $$;

create or replace function public.set_account_disabled(p_user uuid, p_disabled boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_inst uuid := private.my_institution();
begin
  if not private.can_provision() then
    raise exception 'only an admin can change accounts' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'you cannot deactivate your own account' using errcode = '22023';
  end if;
  update public.profiles set disabled_at = case when p_disabled then coalesce(disabled_at, now()) end
   where id = p_user and institution_id = v_inst;
  if not found then
    raise exception 'no such account in your institution' using errcode = '22023';
  end if;
  insert into public.audit_log (action, detail, institution_id)
  values (case when p_disabled then 'disable_account' else 'enable_account' end, jsonb_build_object('user_id', p_user), v_inst);
end $$;

-- called by the signed-in user; creates their profile from a pending invite for their confirmed email
create or replace function public.claim_invite() returns text
language plpgsql security definer set search_path = public as $$
declare inv public.account_invites; v_email text; v_confirmed timestamptz;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return (select role from public.profiles where id = auth.uid());
  end if;
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = auth.uid();
  if v_confirmed is null then
    return null;   -- an unconfirmed address proves nothing
  end if;
  select * into inv from public.account_invites
   where email = v_email and accepted_at is null and revoked_at is null and expires_at > now()
   order by created_at desc limit 1
   for update;
  if inv.id is null then
    return null;
  end if;
  insert into public.profiles (id, full_name, role, mentor_id, student_id, institution_id)
  values (auth.uid(), inv.full_name, inv.role, inv.mentor_id, inv.student_id, inv.institution_id);
  update public.account_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  insert into public.audit_log (action, student_id, detail, institution_id)
  values ('claim_invite', inv.student_id, jsonb_build_object('invite_id', inv.id, 'role', inv.role), inv.institution_id);
  return inv.role;
end $$;

revoke all on function public.invite_account(text, text, text, text, text), public.revoke_invite(uuid),
  public.set_account_disabled(uuid, boolean), public.claim_invite() from public, anon;
grant execute on function public.invite_account(text, text, text, text, text), public.revoke_invite(uuid),
  public.set_account_disabled(uuid, boolean), public.claim_invite() to authenticated;
