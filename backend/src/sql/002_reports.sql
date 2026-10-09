-- ============================================================
-- PharmaLink — customer reports (Pharmacy Admin "Reports" page)
-- Run once in Supabase: Dashboard → SQL Editor → New query → Run.
-- Safe to run again. Nothing is deleted.
-- ============================================================


-- ------------------------------------------------------------
-- 1. New columns
-- ------------------------------------------------------------

alter table public.reports add column if not exists report_type text not null default 'COMPLAINT';
alter table public.reports add column if not exists medicine_id bigint;
alter table public.reports add column if not exists response    text;
alter table public.reports add column if not exists reviewed_by bigint;
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists updated_at  timestamptz default now();


-- ------------------------------------------------------------
-- 2. Allowed report types
-- ------------------------------------------------------------

do $$
begin
  alter table public.reports
    add constraint reports_report_type_check
    check (report_type in ('COMPLAINT', 'SIDE_EFFECT', 'SUGGESTION', 'OTHER'))
    not valid;
exception
  when duplicate_object then null;
end $$;


-- ------------------------------------------------------------
-- 3. Allowed statuses: PENDING, REVIEWED, RESOLVED, DISMISSED
--    (works for a text column with CHECK or an enum type)
-- ------------------------------------------------------------

do $$
declare
  v_data_type text;
  v_udt_schema text;
  v_udt_name text;
  v_value text;
  r record;
begin
  select data_type, udt_schema, udt_name
    into v_data_type, v_udt_schema, v_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'reports'
    and column_name = 'status';

  if v_data_type = 'USER-DEFINED' then
    foreach v_value in array array['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] loop
      execute format('alter type %I.%I add value if not exists %L', v_udt_schema, v_udt_name, v_value);
    end loop;
  else
    for r in
      select conname
      from pg_constraint
      where conrelid = 'public.reports'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status%'
    loop
      execute format('alter table public.reports drop constraint %I', r.conname);
    end loop;

    alter table public.reports
      add constraint reports_status_check
      check (status in ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'))
      not valid;
  end if;
end $$;


-- ------------------------------------------------------------
-- 4. Index for the pharmacy list
-- ------------------------------------------------------------

create index if not exists reports_pharmacy_created_idx
  on public.reports (pharmacy_id, created_at desc);
