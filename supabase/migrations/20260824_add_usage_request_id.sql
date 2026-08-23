begin;

alter table public.usage_records
  add column if not exists request_id uuid;

create unique index if not exists usage_records_request_id_unique
  on public.usage_records(request_id)
  where request_id is not null;

alter function public.record_gemini_usage(
  uuid, uuid, text, bigint, bigint, numeric, uuid
) owner to postgres;

commit;
