-- Re-publishing must be idempotent: ingest skips rows whose primary key already exists.
create or replace function public.ascora_ingest(p_token text, p_table text, p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  n integer;
  cols text;
  allowed text[] := array['mentors','students','source_links','academic','attendance','lms_activity',
    'engagement','placement','skills','feedback','raw_uploads','data_quality_log','conflicts',
    'segments','student_scores','insights','analytics_artifacts','llm_cache','interventions'];
begin
  if not exists (select 1 from private.ingest_secret
                 where token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'invalid ingest token' using errcode = '42501';
  end if;
  if not (p_table = any(allowed)) then
    raise exception 'table % not allowed', p_table;
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;
  select string_agg(quote_ident(c.column_name), ',') into cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = p_table
    and c.column_name in (select jsonb_object_keys(p_rows -> 0));
  execute format(
    'insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing',
    p_table, cols, cols, p_table)
  using p_rows;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ascora_ingest(text, text, jsonb) from public;
grant execute on function public.ascora_ingest(text, text, jsonb) to anon, authenticated;
