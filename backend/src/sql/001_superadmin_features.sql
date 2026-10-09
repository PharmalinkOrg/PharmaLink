-- ============================================================
-- PharmaLink — Super Admin features migration
-- Run once in Supabase: Dashboard → SQL Editor → New query → Run.
-- Safe to run again. Nothing is deleted.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Pharmacy statuses
--    Allow PENDING (waiting for approval) and REJECTED, next to
--    ACTIVE / INACTIVE / SUSPENDED. Works whether status is an
--    enum type or a text column with a CHECK constraint.
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
    and table_name = 'pharmacies'
    and column_name = 'status';

  if v_data_type = 'USER-DEFINED' then
    foreach v_value in array array['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED'] loop
      execute format('alter type %I.%I add value if not exists %L', v_udt_schema, v_udt_name, v_value);
    end loop;
  else
    -- Replace the existing status CHECK constraint(s).
    for r in
      select conname
      from pg_constraint
      where conrelid = 'public.pharmacies'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status%'
    loop
      execute format('alter table public.pharmacies drop constraint %I', r.conname);
    end loop;

    alter table public.pharmacies
      add constraint pharmacies_status_check
      check (status in ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED'))
      not valid;
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. Global medicine catalog
--    medicines.pharmacy_id IS NULL  → catalog medicine (Super Admin)
--    medicines.pharmacy_id = X      → medicine added by pharmacy X
--    Existing rows are unchanged.
-- ------------------------------------------------------------

alter table public.medicines
  alter column pharmacy_id drop not null;

-- No two identical catalog medicines.
do $$
begin
  create unique index if not exists medicines_catalog_unique_idx
    on public.medicines (
      lower(generic_name),
      lower(coalesce(brand_name, '')),
      lower(dosage),
      lower(dosage_form)
    )
    where pharmacy_id is null;
exception
  when unique_violation then
    raise notice 'Duplicate catalog medicines exist; unique index skipped. Remove the duplicates and run again.';
end $$;


-- ------------------------------------------------------------
-- 3. Medicine categories
-- ------------------------------------------------------------

alter table public.medicine_categories
  add column if not exists description text;

do $$
begin
  create unique index if not exists medicine_categories_name_unique_idx
    on public.medicine_categories (lower(name));
exception
  when unique_violation then
    raise notice 'Duplicate category names exist; unique index skipped.';
  when undefined_column then
    raise notice 'medicine_categories has no "name" column; unique index skipped.';
end $$;


-- ------------------------------------------------------------
-- 4. Audit log (existing audit_logs table)
--    Super Admin actions are written here too. They may not
--    belong to a pharmacy, and they keep extra details
--    (reason, before/after) in a new metadata column.
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.audit_logs') is null then
    raise notice 'audit_logs table not found; section 4 skipped.';
    return;
  end if;

  alter table public.audit_logs add column if not exists metadata jsonb;
  alter table public.audit_logs alter column pharmacy_id drop not null;

  create index if not exists audit_logs_created_at_idx
    on public.audit_logs (created_at desc);
end $$;


-- ------------------------------------------------------------
-- 5. Indexes for the Reports page (date-range queries)
-- ------------------------------------------------------------

create index if not exists reservations_created_at_idx on public.reservations (created_at);
create index if not exists sales_sale_date_idx on public.sales (sale_date);
create index if not exists users_created_at_idx on public.users (created_at);


-- ------------------------------------------------------------
-- Check: should list PENDING and REJECTED among allowed values
-- ------------------------------------------------------------

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.pharmacies'::regclass
  and contype = 'c';
