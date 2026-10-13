-- Product renamed Pragati -> Ascora (0001 file already uses the new names for fresh installs).
alter function public.pragati_ingest(text, text, jsonb) rename to ascora_ingest;
alter function public.pragati_reset(text, boolean) rename to ascora_reset;
