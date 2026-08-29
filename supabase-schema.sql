-- ============================================================================
-- Trackzo — Supabase schema
-- Run this ONCE in your Supabase project:  SQL Editor  →  New query  →  paste  →  Run
-- Creates all business tables. Numeric columns use double precision / bigint so
-- values come back to the browser as real numbers (not strings). IDs are assigned
-- by the app (client-side), so id is a plain bigint primary key.
-- ============================================================================

create table if not exists clients (
  id bigint primary key,
  name text, company text, email text, phone text,
  address text, city text, status text,
  joined_date text, created_at text
);

create table if not exists projects (
  id bigint primary key,
  name text, client_id bigint, site_address text, type text, status text,
  budget double precision, spent double precision, progress double precision,
  start_date text, end_date text,
  area double precision, floors double precision,
  manager text, description text, created_at text
);

create table if not exists materials (
  id bigint primary key,
  name text, category text, unit text,
  stock double precision, min_stock double precision, rate double precision,
  supplier text, last_updated text
);

create table if not exists purchase_orders (
  id bigint primary key,
  supplier text, item text,
  qty double precision, rate double precision, total double precision,
  status text, order_date text, expected_date text, project_id bigint
);

create table if not exists transactions (
  id bigint primary key,
  txn_date text, description text, category text, type text,
  amount double precision, status text, project_id bigint
);

create table if not exists accounts (
  id bigint primary key,
  name text, type text, balance double precision,
  currency text, last_transaction text
);

create table if not exists calendar_events (
  id bigint primary key,
  title text, event_date text, type text, event_time text, project_id bigint
);

create table if not exists estimation_items (
  id bigint primary key,
  description text, unit text,
  qty double precision, rate double precision, tax double precision, discount double precision
);

create table if not exists project_details (
  project_id bigint primary key,
  customer_name text, customer_company text, customer_email text, customer_phone text,
  owner_name text, owner_email text, owner_phone text, owner_address text,
  site_address text, site_city text, site_state text, site_pincode text, site_maplink text,
  plot_length double precision, plot_width double precision, plot_area double precision, builtup_sqft double precision,
  construction_type text, structure_type text, foundation_type text, roofing_type text,
  num_floors double precision, num_units double precision, construction_notes text
);

create table if not exists project_materials (
  id bigint primary key,
  project_id bigint, name text, category text,
  quantity double precision, unit text, cost double precision,
  supplier text, purchase_date text,
  used_qty double precision, total_cost double precision
);

create table if not exists project_expenses (
  id bigint primary key,
  project_id bigint, exp_date text, category text, description text, amount double precision
);

create table if not exists project_estimates (
  id bigint primary key,
  project_id bigint, description text, unit text,
  qty double precision, rate double precision, amount double precision
);

create table if not exists project_progress (
  id bigint primary key,
  project_id bigint, log_date text, stage text, percent double precision, status text, note text
);

create table if not exists project_documents (
  id bigint primary key,
  project_id bigint, title text, category text, doc_date text, filename text, note text
);

create table if not exists project_notes (
  id bigint primary key,
  project_id bigint, body text, created_at text
);

-- ============================================================================
-- Access: allow the public "anon" key (used by the browser) to read/write.
-- This is the standard prototype setup. See SETUP notes for hardening later
-- (real auth + row-level security scoped per user).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','materials','purchase_orders','transactions','accounts',
    'calendar_events','estimation_items','project_details','project_materials',
    'project_expenses','project_estimates','project_progress','project_documents','project_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "trackzo_all" on public.%I;', t);
    execute format('create policy "trackzo_all" on public.%I for all using (true) with check (true);', t);
    execute format('grant all on public.%I to anon, authenticated;', t);
  end loop;
end $$;
