-- Extensions
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- case-insensitive text

-- =========================================================
-- INCLUDE ALL REQUIRED TABLES AND VIEWS
-- =========================================================

-- Note: Other SQL files need to be run separately in Supabase SQL Editor
-- DB Config/event.sql
-- DB Config/annual.sql  
-- DB Config/division.sql
-- DB Config/order.sql
-- DB Config/secdef.sql
-- DB Config/ui_text.sql
-- DB Config/unique_client_tx_id.sql
-- DB Config/rpc.sql
-- DB Config/view.sql

-- ---------- DROP (safe order) ----------
-- TN (Main Race) Views
drop view  if exists public.men_open_team_list cascade;
drop view  if exists public.ladies_open_team_list cascade;
drop view  if exists public.mixed_open_team_list cascade;
drop view  if exists public.mixed_corporate_team_list cascade;

-- WU (Warm-Up) Views
drop view  if exists public.wu_men_std_team_list cascade;
drop view  if exists public.wu_ladies_std_team_list cascade;
drop view  if exists public.wu_mixed_std_team_list cascade;
drop view  if exists public.wu_men_smallboat_team_list cascade;
drop view  if exists public.wu_ladies_smallboat_team_list cascade;
drop view  if exists public.wu_mixed_smallboat_team_list cascade;
drop view  if exists public.wu_youth_open_team_list cascade;
drop view  if exists public.wu_youth_ladies_team_list cascade;
drop view  if exists public.wu_disciplinary_forces_team_list cascade;

-- SC (Short Course) Views
drop view  if exists public.sc_men_std_team_list cascade;
drop view  if exists public.sc_ladies_std_team_list cascade;
drop view  if exists public.sc_mixed_std_team_list cascade;
drop view  if exists public.sc_men_smallboat_team_list cascade;
drop view  if exists public.sc_ladies_smallboat_team_list cascade;
drop view  if exists public.sc_mixed_smallboat_team_list cascade;
drop view  if exists public.sc_post_secondary_team_list cascade;
drop view  if exists public.sc_hku_invitational_team_list cascade;

drop table if exists public.practice_preferences cascade;
drop table if exists public.race_day_requests cascade;
drop table if exists public.registration_meta cascade;
drop table if exists public.team_meta cascade;
drop table if exists public.team_meta_audit cascade;
drop table if exists public.wu_team_meta cascade;
drop table if exists public.sc_team_meta cascade;
drop table if exists public.timeslot_catalog cascade;

-- =========================================================
-- HELPERS
-- =========================================================

-- updated_at auto-stamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if row(new.*) is distinct from row(old.*) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Category-letter mapper
create or replace function public._cat_letter(cat text)
returns text
language sql
immutable
as $$
  select case replace(lower(btrim(cat)),' ','_')
    when 'men_open'        then 'M'
    when 'ladies_open'     then 'L'
    when 'mixed_open'      then 'X'
    when 'mixed_corporate' then 'C'
    else null
  end
$$;

-- =========================================================
-- TIMESLOT CATALOG  (adds duration_hours, day_of_week, sort_order)
-- =========================================================
create table public.timeslot_catalog (
  slot_code      text primary key,         -- e.g., 'SAT2_0800_1000'
  label          text not null,            -- English label, e.g., 'Saturday 8:00–10:00 (2h)'
  label_tc       text,                     -- Traditional Chinese label, e.g., '星期六 8:00–10:00 (2小時)'
  start_time     time not null,
  end_time       time not null,
  duration_hours int  not null check (duration_hours in (1,2)),
  -- day_of_week uses Postgres convention: 0=Sun .. 6=Sat.
  -- For "Weekday" generic slots, we leave this NULL to mean "Mon–Fri".
  day_of_week    int,
  is_active      boolean not null default true,
  sort_order     int     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_time > start_time)
);

-- (Re)create updated_at trigger
drop trigger if exists trg_timeslot_catalog_updated_at on public.timeslot_catalog;
create trigger trg_timeslot_catalog_updated_at
before update on public.timeslot_catalog
for each row execute function public.set_updated_at();

-- Helpful indexes for UI queries
create index if not exists idx_timeslot_active_sort
  on public.timeslot_catalog(is_active, sort_order);
create index if not exists idx_timeslot_group_time
  on public.timeslot_catalog(duration_hours, day_of_week, start_time);

-- Reset and seed
delete from public.timeslot_catalog;

-- 2h — Saturday (day_of_week = 6) — sort 110..150
insert into public.timeslot_catalog (slot_code, label, label_tc, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SAT2_0800_1000', 'Saturday 8:00–10:00 (2h)',  '星期六 8:00–10:00 (2小時)', '08:00', '10:00', 2, 6, true, 110),
('SAT2_1000_1200', 'Saturday 10:00–12:00 (2h)', '星期六 10:00–12:00 (2小時)', '10:00', '12:00', 2, 6, true, 120),
('SAT2_1215_1415', 'Saturday 12:15–14:15 (2h)', '星期六 12:15–14:15 (2小時)', '12:15', '14:15', 2, 6, true, 130),
('SAT2_1415_1615', 'Saturday 14:15–16:15 (2h)', '星期六 14:15–16:15 (2小時)', '14:15', '16:15', 2, 6, true, 140),
('SAT2_1615_1815', 'Saturday 16:15–18:15 (2h)', '星期六 16:15–18:15 (2小時)', '16:15', '18:15', 2, 6, true, 150);

-- 2h — Sunday (day_of_week = 0) — sort 210..250
insert into public.timeslot_catalog (slot_code, label, label_tc, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SUN2_0900_1100', 'Sunday 9:00–11:00 (2h)',   '星期日 9:00–11:00 (2小時)', '09:00', '11:00', 2, 0, true, 210),
('SUN2_1100_1300', 'Sunday 11:00–13:00 (2h)',  '星期日 11:00–13:00 (2小時)', '11:00', '13:00', 2, 0, true, 220),
('SUN2_1315_1515', 'Sunday 13:15–15:15 (2h)',  '星期日 13:15–15:15 (2小時)', '13:15', '15:15', 2, 0, true, 230),
('SUN2_1515_1715', 'Sunday 15:15–17:15 (2h)',  '星期日 15:15–17:15 (2小時)', '15:15', '17:15', 2, 0, true, 240),
('SUN2_1715_1915', 'Sunday 17:15–19:15 (2h)',  '星期日 17:15–19:15 (2小時)', '17:15', '19:15', 2, 0, true, 250);

-- 2h — Weekday (Mon–Fri; day_of_week = NULL) — sort 310..350
insert into public.timeslot_catalog (slot_code, label, label_tc, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('WKD2_0800_1000', 'Weekday 8:00–10:00 (2h)',  '平日 8:00–10:00 (2小時)', '08:00', '10:00', 2, NULL, true, 310),
('WKD2_1000_1200', 'Weekday 10:00–12:00 (2h)', '平日 10:00–12:00 (2小時)', '10:00', '12:00', 2, NULL, true, 320),
('WKD2_1200_1400', 'Weekday 12:00–14:00 (2h)', '平日 12:00–14:00 (2小時)', '12:00', '14:00', 2, NULL, true, 330),
('WKD2_1400_1600', 'Weekday 14:00–16:00 (2h)', '平日 14:00–16:00 (2小時)', '14:00', '16:00', 2, NULL, true, 340),
('WKD2_1600_1800', 'Weekday 16:00–18:00 (2h)', '平日 16:00–18:00 (2小時)', '16:00', '18:00', 2, NULL, true, 350);

-- 1h — Saturday (day_of_week = 6) — sort 410..510
insert into public.timeslot_catalog (slot_code, label, label_tc, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SAT1_0800_0900', 'Saturday 8:00–9:00 (1h)',   '星期六 8:00–9:00 (1小時)', '08:00', '09:00', 1, 6, true, 410),
('SAT1_0900_1000', 'Saturday 9:00–10:00 (1h)',  '星期六 9:00–10:00 (1小時)', '09:00', '10:00', 1, 6, true, 420),
('SAT1_1000_1100', 'Saturday 10:00–11:00 (1h)', '星期六 10:00–11:00 (1小時)', '10:00', '11:00', 1, 6, true, 430),
('SAT1_1100_1200', 'Saturday 11:00–12:00 (1h)', '星期六 11:00–12:00 (1小時)', '11:00', '12:00', 1, 6, true, 440),
('SAT1_1215_1315', 'Saturday 12:15–13:15 (1h)', '星期六 12:15–13:15 (1小時)', '12:15', '13:15', 1, 6, true, 450),
('SAT1_1315_1415', 'Saturday 13:15–14:15 (1h)', '星期六 13:15–14:15 (1小時)', '13:15', '14:15', 1, 6, true, 460),
('SAT1_1415_1515', 'Saturday 14:15–15:15 (1h)', '星期六 14:15–15:15 (1小時)', '14:15', '15:15', 1, 6, true, 470),
('SAT1_1515_1615', 'Saturday 15:15–16:15 (1h)', '星期六 15:15–16:15 (1小時)', '15:15', '16:15', 1, 6, true, 480),
('SAT1_1615_1715', 'Saturday 16:15–17:15 (1h)', '星期六 16:15–17:15 (1小時)', '16:15', '17:15', 1, 6, true, 490),
('SAT1_1715_1815', 'Saturday 17:15–18:15 (1h)', '星期六 17:15–18:15 (1小時)', '17:15', '18:15', 1, 6, true, 500),
('SAT1_1815_1915', 'Saturday 18:15–19:15 (1h)', '星期六 18:15–19:15 (1小時)', '18:15', '19:15', 1, 6, true, 510);

-- 1h — Sunday (day_of_week = 0) — sort 610..710
insert into public.timeslot_catalog (slot_code, label, label_tc, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SUN1_0800_0900', 'Sunday 8:00–9:00 (1h)',    '星期日 8:00–9:00 (1小時)', '08:00', '09:00', 1, 0, true, 610),
('SUN1_0900_1000', 'Sunday 9:00–10:00 (1h)',   '星期日 9:00–10:00 (1小時)', '09:00', '10:00', 1, 0, true, 620),
('SUN1_1000_1100', 'Sunday 10:00–11:00 (1h)',  '星期日 10:00–11:00 (1小時)', '10:00', '11:00', 1, 0, true, 630),
('SUN1_1100_1200', 'Sunday 11:00–12:00 (1h)',  '星期日 11:00–12:00 (1小時)', '11:00', '12:00', 1, 0, true, 640),
('SUN1_1215_1315', 'Sunday 12:15–13:15 (1h)',  '星期日 12:15–13:15 (1小時)', '12:15', '13:15', 1, 0, true, 650),
('SUN1_1315_1415', 'Sunday 13:15–14:15 (1h)',  '星期日 13:15–14:15 (1小時)', '13:15', '14:15', 1, 0, true, 660),
('SUN1_1415_1515', 'Sunday 14:15–15:15 (1h)',  '星期日 14:15–15:15 (1小時)', '14:15', '15:15', 1, 0, true, 670),
('SUN1_1515_1615', 'Sunday 15:15–16:15 (1h)',  '星期日 15:15–16:15 (1小時)', '15:15', '16:15', 1, 0, true, 680),
('SUN1_1615_1715', 'Sunday 16:15–17:15 (1h)',  '星期日 16:15–17:15 (1小時)', '16:00', '17:15', 1, 0, true, 690),
('SUN1_1715_1815', 'Sunday 17:15–18:15 (1h)',  '星期日 17:15–18:15 (1小時)', '17:15', '18:15', 1, 0, true, 700),
('SUN1_1815_1915', 'Sunday 18:15–19:15 (1h)',  '星期日 18:15–19:15 (1小時)', '18:15', '19:15', 1, 0, true, 710);

-- 1h — Weekday (Mon–Fri; day_of_week = NULL) — sort 810..910
insert into public.timeslot_catalog (slot_code, label, label_tc, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('WKD1_0800_0900', 'Weekday 8:00–9:00 (1h)',   '平日 8:00–9:00 (1小時)', '08:00', '09:00', 1, NULL, true, 810),
('WKD1_0900_1000', 'Weekday 9:00–10:00 (1h)',  '平日 9:00–10:00 (1小時)', '09:00', '10:00', 1, NULL, true, 820),
('WKD1_1000_1100', 'Weekday 10:00–11:00 (1h)', '平日 10:00–11:00 (1小時)', '10:00', '11:00', 1, NULL, true, 830),
('WKD1_1100_1200', 'Weekday 11:00–12:00 (1h)', '平日 11:00–12:00 (1小時)', '11:00', '12:00', 1, NULL, true, 840),
('WKD1_1200_1300', 'Weekday 12:00–13:00 (1h)', '平日 12:00–13:00 (1小時)', '12:00', '13:00', 1, NULL, true, 850),
('WKD1_1300_1400', 'Weekday 13:00–14:00 (1h)', '平日 13:00–14:00 (1小時)', '13:00', '14:00', 1, NULL, true, 860),
('WKD1_1400_1500', 'Weekday 14:00–15:00 (1h)', '平日 14:00–15:00 (1小時)', '14:00', '15:00', 1, NULL, true, 870),
('WKD1_1500_1600', 'Weekday 15:00–16:00 (1h)', '平日 15:00–16:00 (1小時)', '15:00', '16:00', 1, NULL, true, 880),
('WKD1_1600_1700', 'Weekday 16:00–17:00 (1h)', '平日 16:00–17:00 (1小時)', '16:00', '17:00', 1, NULL, true, 890),
('WKD1_1700_1800', 'Weekday 17:00–18:00 (1h)', '平日 17:00–18:00 (1小時)', '17:00', '18:00', 1, NULL, true, 900),
('WKD1_1800_1900', 'Weekday 18:00–19:00 (1h)', '平日 18:00–19:00 (1小時)', '18:00', '19:00', 1, NULL, true, 910);

-- =========================================================
-- TIMESLOT PUBLIC VIEW (for frontend config loading)
-- =========================================================
drop view if exists public.v_timeslots_public;
create view public.v_timeslots_public as
select
  slot_code,
  label as label_en,
  coalesce(label_tc, label) as label_tc,
  -- Computed day name in English
  case day_of_week
    when 0 then 'Sunday'
    when 1 then 'Monday'
    when 2 then 'Tuesday'
    when 3 then 'Wednesday'
    when 4 then 'Thursday'
    when 5 then 'Friday'
    when 6 then 'Saturday'
    else 'Weekday'
  end as day_name_en,
  -- Computed day name in Traditional Chinese
  case day_of_week
    when 0 then '星期日'
    when 1 then '星期一'
    when 2 then '星期二'
    when 3 then '星期三'
    when 4 then '星期四'
    when 5 then '星期五'
    when 6 then '星期六'
    else '平日'
  end as day_name_tc,
  start_time,
  end_time,
  day_of_week,
  duration_hours,
  sort_order
from public.timeslot_catalog
where is_active = true
order by sort_order;

-- =========================================================
-- TEAM META (Page 1–2 → 1 row per team)
-- =========================================================

-- helper (safe if already exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- 1) Base table
CREATE TABLE IF NOT EXISTS public.team_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  season   int  NOT NULL CHECK (season BETWEEN 2000 AND 2100),

  -- legacy category kept for compatibility; prefer division_code going forward
  category text,
  division_code text,                -- e.g. 'M','L','X','C'

  option_choice text NOT NULL CHECK (option_choice IN ('Option 1','Option 2')),
  team_code     text NOT NULL,       -- assigned/validated by trigger
  team_name_en  citext NOT NULL,
  team_name_tc  citext,

  -- normalized for uniqueness (case/space insensitive)
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name_en::text), '\s+', ' ', 'g') )
    ) STORED,

  -- Org info (client uses organization_name/address via view)
  org_name    text,
  org_address text,

  -- Managers
  team_manager_1 text NOT NULL,
  mobile_1       text,
  email_1        text,
  team_manager_2 text NOT NULL,
  mobile_2       text,
  email_2        text,
  team_manager_3 text,
  mobile_3       text,
  email_3        text,

  -- Link back to header registration (optional)
  registration_id uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uniq_teamcode_global UNIQUE (team_code),
  CONSTRAINT uniq_teamname_per_div_season_norm UNIQUE (season, division_code, team_name_normalized),
  CHECK (length(btrim(team_name_en::text)) > 0),
  CHECK (length(btrim(team_code)) > 0)
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_teammeta_season_div ON public.team_meta (season, division_code);
CREATE INDEX IF NOT EXISTS idx_teammeta_user       ON public.team_meta (user_id);

-- 3) Backfill division_code from legacy category (safe if empty)
UPDATE public.team_meta
SET division_code = CASE replace(lower(btrim(category)),' ','_')
  WHEN 'men_open'        THEN 'M'
  WHEN 'ladies_open'     THEN 'L'
  WHEN 'mixed_open'      THEN 'X'
  WHEN 'mixed_corporate' THEN 'C'
  ELSE division_code
END
WHERE division_code IS NULL;

-- 4) Category-to-letter helper (fallback path)
CREATE OR REPLACE FUNCTION public._cat_letter(cat text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE replace(lower(btrim(cat)),' ','_')
    WHEN 'men_open'        THEN 'M'
    WHEN 'ladies_open'     THEN 'L'
    WHEN 'mixed_open'      THEN 'X'
    WHEN 'mixed_corporate' THEN 'C'
    ELSE NULL
  END
$$;

-- 5) Team-code generator (prefers division_code; falls back to category)
CREATE OR REPLACE FUNCTION public.team_meta_normalize_and_assign()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cat_norm   text;
  yy         text;
  prefix     text;
  max_num    int;
  bucket_key int;
  eff_letter text;
BEGIN
  -- normalize legacy category
  IF NEW.category IS NOT NULL THEN
    NEW.category := replace(lower(btrim(NEW.category)), ' ','_');
  END IF;
  cat_norm := NEW.category;

  IF NEW.team_code IS NOT NULL THEN
    NEW.team_code := upper(btrim(NEW.team_code));
  END IF;

  -- Prefer division_code → first letter; else map from category
  IF NEW.division_code IS NOT NULL AND btrim(NEW.division_code) <> '' THEN
    eff_letter := upper(substring(btrim(NEW.division_code) from 1 for 1));
  ELSE
    eff_letter := public._cat_letter(cat_norm);
  END IF;

  IF eff_letter IS NULL THEN
    RAISE EXCEPTION 'Cannot derive division letter (division_code=%, category=%)',
      NEW.division_code, NEW.category;
  END IF;

  yy := lpad((NEW.season % 100)::text, 2, '0');
  prefix := 'S' || yy || '-' || eff_letter;

  -- advisory lock per (season, letter)
  bucket_key := ascii(eff_letter);
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    PERFORM pg_advisory_xact_lock(NEW.season, bucket_key);

    SELECT COALESCE(MAX((substring(team_code from '^[S][0-9]{2}-[A-Z]([0-9]{3})$'))::int), 0)
      INTO max_num
    FROM public.team_meta
    WHERE season = NEW.season
      AND team_code ~ ('^' || prefix || '[0-9]{3}$');

    NEW.team_code := prefix || lpad((max_num + 1)::text, 3, '0');
  END IF;

  IF NEW.team_code !~ ('^' || prefix || '[0-9]{3}$') THEN
    RAISE EXCEPTION 'team_code % does not match expected pattern %### for season %',
      NEW.team_code, prefix, NEW.season;  -- <-- include prefix here (3 args for 3 %)
  END IF;

  RETURN NEW;
END;
$$;

-- 6) Triggers
DROP TRIGGER IF EXISTS trg_team_meta_before ON public.team_meta;
CREATE TRIGGER trg_team_meta_before
BEFORE INSERT OR UPDATE ON public.team_meta
FOR EACH ROW EXECUTE FUNCTION public.team_meta_normalize_and_assign();

DROP TRIGGER IF EXISTS trg_team_meta_updated_at ON public.team_meta;
CREATE TRIGGER trg_team_meta_updated_at
BEFORE UPDATE ON public.team_meta
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Client alias view (organization_name / address)
DROP VIEW IF EXISTS public.v_team_meta_client;
CREATE VIEW public.v_team_meta_client AS
SELECT
  id,
  user_id,
  season,
  category,
  division_code,
  option_choice,
  team_code,
  team_name_en,
  team_name_tc,
  team_name_normalized,
  org_name    AS organization_name,
  org_address AS address,
  team_manager_1, mobile_1, email_1,
  team_manager_2, mobile_2, email_2,
  team_manager_3, mobile_3, email_3,
  registration_id,
  created_at,
  updated_at
FROM public.team_meta;
-- =========================================================
-- TEAM META AUDIT  (RLS intentionally disabled for reliability)
-- =========================================================
create table public.team_meta_audit (
  id bigserial primary key,
  action text not null check (action in ('insert','update','delete')),
  row_id uuid,
  old_row jsonb,
  new_row jsonb,
  changed_at timestamptz not null default now()
);

create or replace function public.trg_audit_team_meta()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.team_meta_audit(action, row_id, old_row, new_row)
    values ('insert', new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.team_meta_audit(action, row_id, old_row, new_row)
    values ('update', new.id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.team_meta_audit(action, row_id, old_row, new_row)
    values ('delete', old.id, to_jsonb(old), null);
    return old;
  end if;
end;
$$;

create trigger trg_team_meta_audit
after insert or update or delete on public.team_meta
for each row execute function public.trg_audit_team_meta();

-- =========================================================
-- CATEGORY VIEWS (security_invoker)
-- =========================================================

-- ==================== TN (Main Race) - 4 Divisions ====================
create or replace view public.men_open_team_list
with (security_invoker = true) as
select * from public.team_meta where category = 'men_open';

create or replace view public.ladies_open_team_list
with (security_invoker = true) as
select * from public.team_meta where category = 'ladies_open';

create or replace view public.mixed_open_team_list
with (security_invoker = true) as
select * from public.team_meta where category = 'mixed_open';

create or replace view public.mixed_corporate_team_list
with (security_invoker = true) as
select * from public.team_meta where category = 'mixed_corporate';

-- =========================================================
-- PRACTICE PREFERENCES (1 row per team per date)
-- =========================================================
create table public.practice_preferences (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_meta(id) on delete cascade,

  pref_date date not null,
  duration_hours int not null check (duration_hours in (1,2)),
  need_steersman boolean not null default false,
  need_coach     boolean not null default false,

  pref1_slot_code text references public.timeslot_catalog(slot_code),
  pref2_slot_code text references public.timeslot_catalog(slot_code),
  pref3_slot_code text references public.timeslot_catalog(slot_code),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (team_id, pref_date)
);

create trigger trg_practice_preferences_updated_at
before update on public.practice_preferences
for each row execute function public.set_updated_at();

-- =========================================================
-- REGISTRATION META (Individual team registrations for admin approval)
-- =========================================================

-- Backup existing data before migration (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registration_meta') THEN
        DROP TABLE IF EXISTS public.registration_meta_backup;
        CREATE TABLE public.registration_meta_backup AS 
        SELECT * FROM public.registration_meta;
    END IF;
END $$;

-- Drop existing registration_meta table and recreate with new structure
DROP TABLE IF EXISTS public.registration_meta CASCADE;

create table public.registration_meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  season   int  NOT NULL CHECK (season BETWEEN 2000 AND 2100),

  -- Event type to distinguish TN/WU/SC
  event_type text NOT NULL DEFAULT 'tn' CHECK (event_type IN ('tn', 'wu', 'sc')),

  -- legacy category kept for compatibility; prefer division_code going forward
  category text,
  division_code text,                -- e.g. 'M','L','X','C' for TN; 'WM','WL','WX','WPM','WPL','WPX','Y','YL','D' for WU; 'SM','SL','SX','SU','HKU','SPM','SPL','SPX' for SC

  option_choice text CHECK (option_choice IN ('Option 1','Option 2')),  -- Only required for TN events
  team_code     text NOT NULL,       -- assigned/validated by trigger
  team_name_en  citext NOT NULL,
  team_name_tc  citext,

  -- normalized for uniqueness (case/space insensitive)
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name_en::text), '\s+', ' ', 'g') )
    ) STORED,

  -- Org info (client uses organization_name/address via view)
  org_name    text,
  org_address text,

  -- Managers
  team_manager_1 text NOT NULL,
  mobile_1       text,
  email_1        text,
  team_manager_2 text NOT NULL,
  mobile_2       text,
  email_2        text,
  team_manager_3 text,
  mobile_3       text,
  email_3        text,

  -- WU/SC specific fields (nullable for TN compatibility)
  package_choice text,               -- WU/SC package selection
  team_size int CHECK (team_size BETWEEN 8 AND 25), -- WU/SC team size

  -- Link back to header registration (optional)
  registration_id uuid,

  -- Admin approval workflow fields
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,

  -- Client transaction tracking
  client_tx_id text,
  event_short_ref text,

  -- Race day order quantities (only populated on primary team - first team in registration)
  race_day_quantities jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uniq_registration_teamcode_global UNIQUE (team_code),
  CONSTRAINT uniq_registration_teamname_per_div_season_norm UNIQUE (season, division_code, team_name_normalized),
  -- Removed uniq_registration_client_tx constraint to allow multiple teams per submission
  CHECK (length(btrim(team_name_en::text)) > 0),
  CHECK (length(btrim(team_code)) > 0),
  -- TN events require option_choice, WU/SC events don't
  CONSTRAINT ck_option_choice_required_for_tn CHECK (
    (event_type = 'tn' AND option_choice IS NOT NULL) OR
    (event_type IN ('wu', 'sc'))
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registration_meta_season_div ON public.registration_meta (season, division_code);
CREATE INDEX IF NOT EXISTS idx_registration_meta_user ON public.registration_meta (user_id);
CREATE INDEX IF NOT EXISTS idx_registration_meta_status ON public.registration_meta (status);
CREATE INDEX IF NOT EXISTS idx_registration_meta_event_type ON public.registration_meta (event_type);
CREATE INDEX IF NOT EXISTS idx_registration_meta_client_tx ON public.registration_meta (event_short_ref, client_tx_id);

-- Triggers
CREATE TRIGGER trg_registration_meta_updated_at
BEFORE UPDATE ON public.registration_meta
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Team code assignment and normalization trigger (same as team_meta)
CREATE OR REPLACE FUNCTION public.registration_meta_normalize_and_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cat_norm text;
  yy text;
  prefix text;
  max_num int;
  bucket_key int;
  eff_letter text;
BEGIN
  -- normalize legacy category
  IF NEW.category IS NOT NULL THEN
    NEW.category := replace(lower(btrim(NEW.category)), ' ','_');
  END IF;
  cat_norm := NEW.category;

  IF NEW.team_code IS NOT NULL THEN
    NEW.team_code := upper(btrim(NEW.team_code));
  END IF;

  -- Handle division code based on event type
  IF NEW.event_type = 'tn' THEN
    -- TN: Use first letter of division_code or map from category
    IF NEW.division_code IS NOT NULL AND btrim(NEW.division_code) <> '' THEN
      eff_letter := upper(substring(btrim(NEW.division_code) from 1 for 1));
    ELSE
      eff_letter := public._cat_letter(cat_norm);
    END IF;
  ELSE
    -- WU/SC: Use full division_code prefix from division_config_general
    IF NEW.division_code IS NOT NULL AND btrim(NEW.division_code) <> '' THEN
      eff_letter := upper(btrim(NEW.division_code));
    ELSE
      -- Default fallback based on event type
      IF NEW.event_type = 'wu' THEN
        eff_letter := 'W';
      ELSIF NEW.event_type = 'sc' THEN
        eff_letter := 'S';
      ELSE
        eff_letter := 'T';
      END IF;
    END IF;
  END IF;

  IF eff_letter IS NULL THEN
    RAISE EXCEPTION 'Cannot derive division letter (division_code=%, category=%, event_type=%)',
      NEW.division_code, NEW.category, NEW.event_type;
  END IF;

  yy := lpad((NEW.season % 100)::text, 2, '0');
  prefix := 'S' || yy || '-' || eff_letter;

  -- advisory lock per (season, letter) - use hash for multi-char codes
  bucket_key := hashtext(eff_letter);
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    PERFORM pg_advisory_xact_lock(NEW.season, bucket_key);

    SELECT COALESCE(MAX((substring(team_code from '^[S][0-9]{2}-[A-Z]+([0-9]{3})$'))::int), 0)
      INTO max_num
    FROM public.registration_meta
    WHERE season = NEW.season
      AND team_code ~ ('^' || prefix || '[0-9]{3}$');

    NEW.team_code := prefix || lpad((max_num + 1)::text, 3, '0');
  END IF;

  IF NEW.team_code !~ ('^' || prefix || '[0-9]{3}$') THEN
    RAISE EXCEPTION 'team_code % does not match expected pattern %### for season %',
      NEW.team_code, prefix, NEW.season;
  END IF;

  -- Normalize team name for uniqueness constraint
  IF NEW.team_name_en IS NOT NULL THEN
    NEW.team_name_normalized := upper(replace(replace(replace(btrim(NEW.team_name_en), ' ', ''), '-', ''), '_', ''));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_meta_before
BEFORE INSERT OR UPDATE ON public.registration_meta
FOR EACH ROW EXECUTE FUNCTION public.registration_meta_normalize_and_assign();

-- =========================================================
-- WU TEAM META (Warm-Up Event Teams)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.wu_team_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  season int NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  division_code text, -- WU-specific divisions (e.g., 'WM', 'WL', 'WX', 'WPM', 'WPL', 'WPX', 'Y', 'YL', 'D')

  team_code text NOT NULL,
  team_name_en citext NOT NULL,
  team_name_tc citext,
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name_en::text), '\s+', ' ', 'g') )
    ) STORED,

  -- WU-specific fields (simpler than TN)
  package_choice text NOT NULL, -- 'basic_wu', 'premium_wu'
  team_size int DEFAULT 20 CHECK (team_size BETWEEN 10 AND 25),

  -- Contact info (simplified - single manager)
  team_manager text NOT NULL,
  mobile text,
  email text,

  -- Organization info
  org_name text,
  org_address text,

  -- Link back to registration
  registration_id uuid REFERENCES public.registration_meta(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uniq_wu_teamcode_global UNIQUE (team_code),
  CONSTRAINT uniq_wu_teamname_per_div_season_norm UNIQUE (season, division_code, team_name_normalized),
  CHECK (length(btrim(team_name_en::text)) > 0),
  CHECK (length(btrim(team_code)) > 0)
);

-- WU Team Meta Indexes
CREATE INDEX IF NOT EXISTS idx_wu_teammeta_season_div ON public.wu_team_meta (season, division_code);
CREATE INDEX IF NOT EXISTS idx_wu_teammeta_user ON public.wu_team_meta (user_id);
CREATE INDEX IF NOT EXISTS idx_wu_teammeta_registration ON public.wu_team_meta (registration_id);

-- WU Team code generator
CREATE OR REPLACE FUNCTION public.wu_team_meta_normalize_and_assign()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  yy text;
  prefix text;
  max_num int;
  bucket_key int;
  eff_letter text;
BEGIN
  IF NEW.team_code IS NOT NULL THEN
    NEW.team_code := upper(btrim(NEW.team_code));
  END IF;

  -- Use division code prefix from division_config_general (e.g., 'WM', 'WL', 'WPM')
  IF NEW.division_code IS NOT NULL AND btrim(NEW.division_code) <> '' THEN
    eff_letter := upper(btrim(NEW.division_code));
  ELSE
    eff_letter := 'W'; -- Default to 'W' for WU
  END IF;

  yy := lpad((NEW.season % 100)::text, 2, '0');
  prefix := 'S' || yy || '-' || eff_letter;

  -- advisory lock per (season, letter)
  bucket_key := ascii(eff_letter);
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    PERFORM pg_advisory_xact_lock(NEW.season, bucket_key);

    SELECT COALESCE(MAX((substring(team_code from '^[S][0-9]{2}-[A-Z]([0-9]{3})$'))::int), 0)
      INTO max_num
    FROM public.wu_team_meta
    WHERE season = NEW.season
      AND team_code ~ ('^' || prefix || '[0-9]{3}$');

    NEW.team_code := prefix || lpad((max_num + 1)::text, 3, '0');
  END IF;

  IF NEW.team_code !~ ('^' || prefix || '[0-9]{3}$') THEN
    RAISE EXCEPTION 'WU team_code % does not match expected pattern %### for season %',
      NEW.team_code, prefix, NEW.season;
  END IF;

  RETURN NEW;
END;
$$;

-- WU Team Meta Triggers
DROP TRIGGER IF EXISTS trg_wu_team_meta_before ON public.wu_team_meta;
CREATE TRIGGER trg_wu_team_meta_before
BEFORE INSERT OR UPDATE ON public.wu_team_meta
FOR EACH ROW EXECUTE FUNCTION public.wu_team_meta_normalize_and_assign();

DROP TRIGGER IF EXISTS trg_wu_team_meta_updated_at ON public.wu_team_meta;
CREATE TRIGGER trg_wu_team_meta_updated_at
BEFORE UPDATE ON public.wu_team_meta
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- SC TEAM META (Short Course Event Teams)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sc_team_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  season int NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  division_code text, -- SC-specific divisions (e.g., 'SM', 'SL', 'SX', 'SU', 'HKU', 'SPM', 'SPL', 'SPX')

  team_code text NOT NULL,
  team_name_en citext NOT NULL,
  team_name_tc citext,
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name_en::text), '\s+', ' ', 'g') )
    ) STORED,

  -- SC-specific fields (simpler than TN)
  package_choice text NOT NULL, -- 'basic_sc', 'premium_sc'
  team_size int DEFAULT 15 CHECK (team_size BETWEEN 8 AND 20),

  -- Contact info (simplified - single manager)
  team_manager text NOT NULL,
  mobile text,
  email text,

  -- Organization info
  org_name text,
  org_address text,

  -- Link back to registration
  registration_id uuid REFERENCES public.registration_meta(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uniq_sc_teamcode_global UNIQUE (team_code),
  CONSTRAINT uniq_sc_teamname_per_div_season_norm UNIQUE (season, division_code, team_name_normalized),
  CHECK (length(btrim(team_name_en::text)) > 0),
  CHECK (length(btrim(team_code)) > 0)
);

-- SC Team Meta Indexes
CREATE INDEX IF NOT EXISTS idx_sc_teammeta_season_div ON public.sc_team_meta (season, division_code);
CREATE INDEX IF NOT EXISTS idx_sc_teammeta_user ON public.sc_team_meta (user_id);
CREATE INDEX IF NOT EXISTS idx_sc_teammeta_registration ON public.sc_team_meta (registration_id);

-- SC Team code generator
CREATE OR REPLACE FUNCTION public.sc_team_meta_normalize_and_assign()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  yy text;
  prefix text;
  max_num int;
  bucket_key int;
  eff_letter text;
BEGIN
  IF NEW.team_code IS NOT NULL THEN
    NEW.team_code := upper(btrim(NEW.team_code));
  END IF;

  -- Use division code prefix from division_config_general (e.g., 'SM', 'SL', 'SPM')
  IF NEW.division_code IS NOT NULL AND btrim(NEW.division_code) <> '' THEN
    eff_letter := upper(btrim(NEW.division_code));
  ELSE
    eff_letter := 'S'; -- Default to 'S' for SC
  END IF;

  yy := lpad((NEW.season % 100)::text, 2, '0');
  prefix := 'S' || yy || '-' || eff_letter;

  -- advisory lock per (season, letter)
  bucket_key := ascii(eff_letter);
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    PERFORM pg_advisory_xact_lock(NEW.season, bucket_key);

    SELECT COALESCE(MAX((substring(team_code from '^[S][0-9]{2}-[A-Z]([0-9]{3})$'))::int), 0)
      INTO max_num
    FROM public.sc_team_meta
    WHERE season = NEW.season
      AND team_code ~ ('^' || prefix || '[0-9]{3}$');

    NEW.team_code := prefix || lpad((max_num + 1)::text, 3, '0');
  END IF;

  IF NEW.team_code !~ ('^' || prefix || '[0-9]{3}$') THEN
    RAISE EXCEPTION 'SC team_code % does not match expected pattern %### for season %',
      NEW.team_code, prefix, NEW.season;
  END IF;

  RETURN NEW;
END;
$$;

-- SC Team Meta Triggers
DROP TRIGGER IF EXISTS trg_sc_team_meta_before ON public.sc_team_meta;
CREATE TRIGGER trg_sc_team_meta_before
BEFORE INSERT OR UPDATE ON public.sc_team_meta
FOR EACH ROW EXECUTE FUNCTION public.sc_team_meta_normalize_and_assign();

DROP TRIGGER IF EXISTS trg_sc_team_meta_updated_at ON public.sc_team_meta;
CREATE TRIGGER trg_sc_team_meta_updated_at
BEFORE UPDATE ON public.sc_team_meta
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== WU (Warm-Up) - 9 Divisions ====================

-- Standard Boat Divisions
create or replace view public.wu_men_std_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'WM';

create or replace view public.wu_ladies_std_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'WL';

create or replace view public.wu_mixed_std_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'WX';

-- Small Boat Divisions
create or replace view public.wu_men_smallboat_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'WPM';

create or replace view public.wu_ladies_smallboat_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'WPL';

create or replace view public.wu_mixed_smallboat_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'WPX';

-- Special Divisions (By Invitation)
create or replace view public.wu_youth_open_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'Y';

create or replace view public.wu_youth_ladies_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'YL';

create or replace view public.wu_disciplinary_forces_team_list
with (security_invoker = true) as
select * from public.wu_team_meta where division_code = 'D';

-- ==================== SC (Short Course) - 8 Divisions ====================

-- Standard Boat Divisions
create or replace view public.sc_men_std_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SM';

create or replace view public.sc_ladies_std_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SL';

create or replace view public.sc_mixed_std_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SX';

-- Small Boat Divisions
create or replace view public.sc_men_smallboat_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SPM';

create or replace view public.sc_ladies_smallboat_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SPL';

create or replace view public.sc_mixed_smallboat_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SPX';

-- Special Divisions (By Invitation)
create or replace view public.sc_post_secondary_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'SU';

create or replace view public.sc_hku_invitational_team_list
with (security_invoker = true) as
select * from public.sc_team_meta where division_code = 'HKU';

-- =========================================================
-- ADMIN VIEWS FOR REGISTRATION APPROVAL WORKFLOW
-- =========================================================

-- View for pending registrations
CREATE OR REPLACE VIEW public.v_pending_registrations
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  season,
  event_type,
  category,
  division_code,
  option_choice,
  team_code,
  team_name_en,
  team_name_tc,
  team_name_normalized,
  org_name,
  org_address,
  team_manager_1, mobile_1, email_1,
  team_manager_2, mobile_2, email_2,
  team_manager_3, mobile_3, email_3,
  package_choice,
  team_size,
  status,
  admin_notes,
  approved_by,
  approved_at,
  client_tx_id,
  event_short_ref,
  created_at,
  updated_at
FROM public.registration_meta
WHERE status = 'pending'
ORDER BY created_at DESC;

-- View for approved registrations (ready to move to team_meta)
CREATE OR REPLACE VIEW public.v_approved_registrations
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  season,
  event_type,
  category,
  division_code,
  option_choice,
  team_code,
  team_name_en,
  team_name_tc,
  team_name_normalized,
  org_name,
  org_address,
  team_manager_1, mobile_1, email_1,
  team_manager_2, mobile_2, email_2,
  team_manager_3, mobile_3, email_3,
  package_choice,
  team_size,
  status,
  admin_notes,
  approved_by,
  approved_at,
  client_tx_id,
  event_short_ref,
  created_at,
  updated_at
FROM public.registration_meta
WHERE status = 'approved'
ORDER BY approved_at DESC;

-- =========================================================
-- HELPER FUNCTIONS FOR ADMIN WORKFLOW
-- =========================================================

-- Function to approve a registration (move to appropriate team table based on event_type)
CREATE OR REPLACE FUNCTION public.approve_registration(reg_id uuid, admin_user_id uuid, notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reg_record public.registration_meta%ROWTYPE;
  new_team_id uuid;
  v_race_day_quantities jsonb;
  v_primary_reg_id uuid;
BEGIN
  -- Get the registration record
  SELECT * INTO reg_record
  FROM public.registration_meta
  WHERE id = reg_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found or not pending: %', reg_id;
  END IF;
  
  -- Find primary team's race_day_quantities (first team with matching client_tx_id and event_short_ref)
  SELECT id, race_day_quantities INTO v_primary_reg_id, v_race_day_quantities
  FROM public.registration_meta
  WHERE client_tx_id = reg_record.client_tx_id
    AND event_short_ref = reg_record.event_short_ref
    AND race_day_quantities IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Route to appropriate team table based on event_type
  IF reg_record.event_type = 'tn' THEN
    -- Insert into team_meta for TN
    INSERT INTO public.team_meta (
      user_id, season, category, division_code, option_choice,
      team_code, team_name_en, team_name_tc, team_name_normalized, org_name, org_address,
      team_manager_1, mobile_1, email_1,
      team_manager_2, mobile_2, email_2,
      team_manager_3, mobile_3, email_3,
      registration_id
    ) VALUES (
      reg_record.user_id, reg_record.season, reg_record.category, reg_record.division_code, reg_record.option_choice,
      reg_record.team_code, reg_record.team_name_en, reg_record.team_name_tc, reg_record.team_name_normalized, reg_record.org_name, reg_record.org_address,
      reg_record.team_manager_1, reg_record.mobile_1, reg_record.email_1,
      reg_record.team_manager_2, reg_record.mobile_2, reg_record.email_2,
      reg_record.team_manager_3, reg_record.mobile_3, reg_record.email_3,
      reg_record.id
    ) RETURNING id INTO new_team_id;
    
  ELSIF reg_record.event_type = 'wu' THEN
    -- Insert into wu_team_meta for WU (team_code will be auto-generated by trigger)
    INSERT INTO public.wu_team_meta (
      user_id, season, division_code,
      team_code, team_name_en, team_name_tc,
      package_choice, team_size,
      team_manager, mobile, email,
      org_name, org_address,
      registration_id
    ) VALUES (
      reg_record.user_id, reg_record.season, reg_record.division_code,
      '', reg_record.team_name_en, reg_record.team_name_tc,  -- Empty team_code will trigger auto-generation
      reg_record.package_choice, reg_record.team_size,
      reg_record.team_manager_1, reg_record.mobile_1, reg_record.email_1,
      reg_record.org_name, reg_record.org_address,
      reg_record.id
    ) RETURNING id INTO new_team_id;
    
  ELSIF reg_record.event_type = 'sc' THEN
    -- Insert into sc_team_meta for SC (team_code will be auto-generated by trigger)
    INSERT INTO public.sc_team_meta (
      user_id, season, division_code,
      team_code, team_name_en, team_name_tc,
      package_choice, team_size,
      team_manager, mobile, email,
      org_name, org_address,
      registration_id
    ) VALUES (
      reg_record.user_id, reg_record.season, reg_record.division_code,
      '', reg_record.team_name_en, reg_record.team_name_tc,  -- Empty team_code will trigger auto-generation
      reg_record.package_choice, reg_record.team_size,
      reg_record.team_manager_1, reg_record.mobile_1, reg_record.email_1,
      reg_record.org_name, reg_record.org_address,
      reg_record.id
    ) RETURNING id INTO new_team_id;
    
  ELSE
    RAISE EXCEPTION 'Unknown event_type: %', reg_record.event_type;
  END IF;
  
  -- Copy race_day_quantities to race_day_requests if this is the primary team
  -- Only create race_day_requests for TN events (race_day_requests table links to team_meta)
  IF reg_record.event_type = 'tn' AND v_race_day_quantities IS NOT NULL AND reg_id = v_primary_reg_id THEN
    INSERT INTO public.race_day_requests (
      team_id,
      marquee_qty,
      steer_with_qty,
      steer_without_qty,
      junk_boat_no,
      junk_boat_qty,
      speed_boat_no,
      speed_boat_qty
    ) VALUES (
      new_team_id,
      COALESCE((v_race_day_quantities->>'marquee_qty')::int, 0),
      COALESCE((v_race_day_quantities->>'steer_with_qty')::int, 0),
      COALESCE((v_race_day_quantities->>'steer_without_qty')::int, 0),
      NULLIF(v_race_day_quantities->>'junk_boat_no', ''),
      COALESCE((v_race_day_quantities->>'junk_boat_qty')::int, 0),
      NULLIF(v_race_day_quantities->>'speed_boat_no', ''),
      COALESCE((v_race_day_quantities->>'speed_boat_qty')::int, 0)
    )
    ON CONFLICT (team_id) DO UPDATE SET
      marquee_qty = EXCLUDED.marquee_qty,
      steer_with_qty = EXCLUDED.steer_with_qty,
      steer_without_qty = EXCLUDED.steer_without_qty,
      junk_boat_no = EXCLUDED.junk_boat_no,
      junk_boat_qty = EXCLUDED.junk_boat_qty,
      speed_boat_no = EXCLUDED.speed_boat_no,
      speed_boat_qty = EXCLUDED.speed_boat_qty;
  END IF;
  
  -- Update registration status
  UPDATE public.registration_meta
  SET 
    status = 'approved',
    admin_notes = notes,
    approved_by = admin_user_id,
    approved_at = now()
  WHERE id = reg_id;
  
  RETURN new_team_id;
END;
$$;

-- Function to reject a registration
CREATE OR REPLACE FUNCTION public.reject_registration(reg_id uuid, admin_user_id uuid, notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.registration_meta
  SET 
    status = 'rejected',
    admin_notes = notes,
    approved_by = admin_user_id,
    approved_at = now()
  WHERE id = reg_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found or not pending: %', reg_id;
  END IF;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.registration_meta IS 'Registration submissions awaiting admin approval. Identical structure to team_meta for seamless data transfer.';
COMMENT ON COLUMN public.registration_meta.status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN public.registration_meta.admin_notes IS 'Admin notes for approval/rejection';
COMMENT ON COLUMN public.registration_meta.approved_by IS 'Admin user who approved/rejected';
COMMENT ON COLUMN public.registration_meta.approved_at IS 'When the registration was approved/rejected';
COMMENT ON COLUMN public.registration_meta.client_tx_id IS 'Client transaction ID for idempotency';
COMMENT ON COLUMN public.registration_meta.event_short_ref IS 'Event reference for grouping';
COMMENT ON COLUMN public.registration_meta.race_day_quantities IS 'Race day order quantities for this registration group. Only populated on primary team (first team in registration). Format: { marquee_qty, steer_with_qty, steer_without_qty, junk_boat_qty, junk_boat_no, speed_boat_qty, speed_boat_no }';

-- =========================================================
-- ROW LEVEL SECURITY POLICIES FOR REGISTRATION_META
-- =========================================================

-- Enable RLS
ALTER TABLE public.registration_meta ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous inserts (form submissions)
CREATE POLICY "Allow anonymous inserts" ON public.registration_meta
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- Policy for authenticated users to view their own registrations
CREATE POLICY "Users can view own registrations" ON public.registration_meta
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy for service role to do everything (Edge Functions)
CREATE POLICY "Service role full access" ON public.registration_meta
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Policy for admins to view all registrations
CREATE POLICY "Admins can view all registrations" ON public.registration_meta
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy for admins to update registrations (approve/reject)
CREATE POLICY "Admins can update registrations" ON public.registration_meta
    FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- FK from team_meta.registration_id -> registration_meta(id)
-- Drop existing constraint first (if it exists)
ALTER TABLE public.team_meta DROP CONSTRAINT IF EXISTS team_meta_registration_id_fkey;

-- Add the constraint back
alter table public.team_meta
  add constraint team_meta_registration_id_fkey
  foreign key (registration_id) references public.registration_meta(id)
  on delete set null;

create index idx_team_meta_registration on public.team_meta (registration_id);

-- =========================================================
-- RACE DAY REQUESTS (Page 3 spec; 1 row per team)
-- =========================================================
create table public.race_day_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_meta(id) on delete cascade,

  marquee_qty int not null default 0 check (marquee_qty >= 0),
  steer_with_qty int not null default 0 check (steer_with_qty >= 0),
  steer_without_qty int not null default 0 check (steer_without_qty >= 0),
  junk_boat_no text,
  junk_boat_qty int not null default 0 check (junk_boat_qty >= 0),
  speed_boat_no text,
  speed_boat_qty int not null default 0 check (speed_boat_qty >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (team_id)
);

create trigger trg_race_day_requests_updated_at
before update on public.race_day_requests
for each row execute function public.set_updated_at();

-- =========================================================
-- RLS: ENABLE & DENY (service-role or SECURITY DEFINER only)
-- =========================================================
alter table public.team_meta            enable row level security;
alter table public.wu_team_meta         enable row level security;
alter table public.sc_team_meta          enable row level security;
-- NOTE: RLS intentionally NOT enabled on team_meta_audit (trigger needs to write freely)
-- alter table public.team_meta_audit   enable row level security;
alter table public.timeslot_catalog     enable row level security;

-- Allow anyone to read timeslot catalog (public config data)
drop policy if exists "Allow public read access to timeslots" on public.timeslot_catalog;
create policy "Allow public read access to timeslots" on public.timeslot_catalog
    for select
    to anon, authenticated
    using (true);

alter table public.practice_preferences enable row level security;
alter table public.registration_meta    enable row level security;
alter table public.race_day_requests    enable row level security;

-- With RLS on and no policies, anon/auth clients cannot read/write.
-- Your server code (Edge Functions with service-role) or SECURITY DEFINER RPCs should perform all access.
