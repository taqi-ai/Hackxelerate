-- Product renamed Pragati -> Ascora. 0001 was later edited to use the new names, so on a fresh database the old
-- functions never exist: rename only when they do (keeps "migrations apply to an empty database" true).
do $$
begin
  if to_regprocedure('public.pragati_ingest(text, text, jsonb)') is not null then
    alter function public.pragati_ingest(text, text, jsonb) rename to ascora_ingest;
  end if;
  if to_regprocedure('public.pragati_reset(text, boolean)') is not null then
    alter function public.pragati_reset(text, boolean) rename to ascora_reset;
  end if;
end $$;
