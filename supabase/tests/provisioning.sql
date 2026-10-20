-- Account provisioning (migration 0013). Runs in CI after rls_seed.sql and always rolls back.
-- Seed: admin 1111..., mentor 2222... (M01). Two new sign-ups: 3333... (email confirmed), 4444... (not confirmed).
begin;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('33333333-3333-3333-3333-333333333333', 'new.mentor@example.invalid', 'authenticated', 'authenticated', now()),
  ('44444444-4444-4444-4444-444444444444', 'new.student@example.invalid', 'authenticated', 'authenticated', null);
create temp table t_inv (student_invite uuid);
grant all on t_inv to authenticated;

-- 1. admin invites ------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ begin
  perform public.invite_account('New.Mentor@example.invalid', 'New Mentor', 'mentor', 'M02');
  insert into t_inv select public.invite_account('new.student@example.invalid', 'New Student', 'student', null, 'CU25CSE0002');
  begin
    perform public.invite_account('x@example.invalid', 'Nobody', 'mentor', 'M99');
    raise exception 'FAIL 1a: invite for an unknown mentor accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.invite_account('new.mentor@example.invalid', 'Again', 'mentor', 'M02');
    raise exception 'FAIL 1b: second pending invite for the same email accepted';
  exception when unique_violation then null;
  end;
  begin
    perform public.invite_account('ci-mentor@example.invalid', 'Existing', 'mentor', 'M01');
    raise exception 'FAIL 1c: invite for an email that already has an account accepted';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.account_invites) <> 2 then raise exception 'FAIL 1d: admin cannot read own invites'; end if;
end $$;

-- 2. a mentor can neither invite nor read invites -------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.invite_account('m@example.invalid', 'Sneaky', 'admin');
    raise exception 'FAIL 2: mentor created an invite';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.account_invites) <> 0 then raise exception 'FAIL 2b: mentor reads invites'; end if;
  if (select count(*) from public.profiles where id <> auth.uid()) <> 0 then raise exception 'FAIL 2c: mentor reads other profiles'; end if;
end $$;

-- 3. confirmed sign-up claims its invite; unconfirmed one does not ---------------------------------------------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$ begin
  if public.claim_invite() is distinct from 'mentor' then raise exception 'FAIL 3: confirmed invitee could not claim'; end if;
  if public.claim_invite() is distinct from 'mentor' then raise exception 'FAIL 3b: second claim not idempotent'; end if;
  if (select mentor_id from public.profiles where id = auth.uid()) is distinct from 'M02' then raise exception 'FAIL 3c: wrong mentor link'; end if;
  if (select count(*) from public.students) = 0 then raise exception 'FAIL 3d: new mentor sees none of their students'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
do $$ begin
  if public.claim_invite() is not null then raise exception 'FAIL 3e: unconfirmed email claimed an invite'; end if;
  if (select count(*) from public.students) <> 0 then raise exception 'FAIL 3f: profile-less user sees students'; end if;
end $$;

-- 4. deactivation ends access; an admin cannot deactivate themselves --------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ begin
  perform public.set_account_disabled('33333333-3333-3333-3333-333333333333', true);
  begin
    perform public.set_account_disabled('11111111-1111-1111-1111-111111111111', true);
    raise exception 'FAIL 4: admin deactivated themselves';
  exception when invalid_parameter_value then null;
  end;
  perform public.revoke_invite((select student_invite from t_inv));
end $$;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.students) <> 0 then raise exception 'FAIL 4b: deactivated account still sees students'; end if;
  if (select count(*) from public.student_scores) <> 0 then raise exception 'FAIL 4c: deactivated account still sees scores'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ begin perform public.set_account_disabled('33333333-3333-3333-3333-333333333333', false); end $$;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.students) = 0 then raise exception 'FAIL 4d: re-enabled account still locked out'; end if;
end $$;

-- 5. a revoked invite cannot be claimed, even after the email is confirmed; actions are audited -------------------
reset role;
update auth.users set email_confirmed_at = now() where id = '44444444-4444-4444-4444-444444444444';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
do $$ begin
  if public.claim_invite() is not null then raise exception 'FAIL 5: revoked invite claimed'; end if;
end $$;
-- 6. a shared evaluation admin can list accounts (emails masked) but cannot change anything ----------------------
reset role;
update public.profiles set shared_demo = true where id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.list_accounts()) < 3 then raise exception 'FAIL 6: admin cannot list accounts'; end if;
  if exists (select 1 from public.list_accounts() where email like 'ci-mentor@%') then raise exception 'FAIL 6b: emails not masked for a shared account'; end if;
  begin
    perform public.invite_account('demo@example.invalid', 'Demo Invite', 'mentor', 'M01');
    raise exception 'FAIL 6c: shared evaluation admin created an invite';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_account_disabled('22222222-2222-2222-2222-222222222222', true);
    raise exception 'FAIL 6d: shared evaluation admin deactivated an account';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.list_accounts()) <> 0 then raise exception 'FAIL 6e: mentor lists accounts'; end if;
end $$;

reset role;
do $$ begin
  if (select count(*) from public.audit_log where action in ('invite_account', 'claim_invite', 'disable_account', 'enable_account', 'revoke_invite')) < 6 then
    raise exception 'FAIL 5b: provisioning actions not audited';
  end if;
  raise notice 'provisioning: all checks passed';
end $$;

rollback;
