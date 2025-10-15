-- Extensions
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- case-insensitive text

-- ---------- DROP (safe order) ----------
drop view  if exists public.men_open_team_list cascade;
drop view  if exists public.ladies_open_team_list cascade;
drop view  if exists public.mixed_open_team_list cascade;
drop view  if exists public.mixed_corporate_team_list cascade;

drop table if exists public.practice_preferences cascade;
drop table if exists public.race_day_requests cascade;
drop table if exists public.registration_meta cascade;
drop table if exists public.team_meta cascade;
drop table if exists public.team_meta_audit cascade;
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
  label          text not null,            -- e.g., 'Saturday 8:00–10:00 (2h)'
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
insert into public.timeslot_catalog (slot_code, label, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SAT2_0800_1000', 'Saturday 8:00–10:00 (2h)',  '08:00', '10:00', 2, 6, true, 110),
('SAT2_1000_1200', 'Saturday 10:00–12:00 (2h)', '10:00', '12:00', 2, 6, true, 120),
('SAT2_1215_1415', 'Saturday 12:15–14:15 (2h)', '12:15', '14:15', 2, 6, true, 130),
('SAT2_1415_1615', 'Saturday 14:15–16:15 (2h)', '14:15', '16:15', 2, 6, true, 140),
('SAT2_1615_1815', 'Saturday 16:15–18:15 (2h)', '16:15', '18:15', 2, 6, true, 150);

-- 2h — Sunday (day_of_week = 0) — sort 210..250
insert into public.timeslot_catalog (slot_code, label, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SUN2_0900_1100', 'Sunday 9:00–11:00 (2h)',   '09:00', '11:00', 2, 0, true, 210),
('SUN2_1100_1300', 'Sunday 11:00–13:00 (2h)',  '11:00', '13:00', 2, 0, true, 220),
('SUN2_1315_1515', 'Sunday 13:15–15:15 (2h)',  '13:15', '15:15', 2, 0, true, 230),
('SUN2_1515_1715', 'Sunday 15:15–17:15 (2h)',  '15:15', '17:15', 2, 0, true, 240),
('SUN2_1715_1915', 'Sunday 17:15–19:15 (2h)',  '17:15', '19:15', 2, 0, true, 250);

-- 2h — Weekday (Mon–Fri; day_of_week = NULL) — sort 310..350
insert into public.timeslot_catalog (slot_code, label, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('WKD2_0800_1000', 'Weekday 8:00–10:00 (2h)',  '08:00', '10:00', 2, NULL, true, 310),
('WKD2_1000_1200', 'Weekday 10:00–12:00 (2h)', '10:00', '12:00', 2, NULL, true, 320),
('WKD2_1200_1400', 'Weekday 12:00–14:00 (2h)', '12:00', '14:00', 2, NULL, true, 330),
('WKD2_1400_1600', 'Weekday 14:00–16:00 (2h)', '14:00', '16:00', 2, NULL, true, 340),
('WKD2_1600_1800', 'Weekday 16:00–18:00 (2h)', '16:00', '18:00', 2, NULL, true, 350);

-- 1h — Saturday (day_of_week = 6) — sort 410..510
insert into public.timeslot_catalog (slot_code, label, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SAT1_0800_0900', 'Saturday 8:00–9:00 (1h)',    '08:00', '09:00', 1, 6, true, 410),
('SAT1_0900_1000', 'Saturday 9:00–10:00 (1h)',   '09:00', '10:00', 1, 6, true, 420),
('SAT1_1000_1100', 'Saturday 10:00–11:00 (1h)',  '10:00', '11:00', 1, 6, true, 430),
('SAT1_1100_1200', 'Saturday 11:00–12:00 (1h)',  '11:00', '12:00', 1, 6, true, 440),
('SAT1_1215_1315', 'Saturday 12:15–13:15 (1h)',  '12:15', '13:15', 1, 6, true, 450),
('SAT1_1315_1415', 'Saturday 13:15–14:15 (1h)',  '13:15', '14:15', 1, 6, true, 460),
('SAT1_1415_1515', 'Saturday 14:15–15:15 (1h)',  '14:15', '15:15', 1, 6, true, 470),
('SAT1_1515_1615', 'Saturday 15:15–16:15 (1h)',  '15:15', '16:15', 1, 6, true, 480),
('SAT1_1615_1715', 'Saturday 16:15–17:15 (1h)',  '16:15', '17:15', 1, 6, true, 490),
('SAT1_1715_1815', 'Saturday 17:15–18:15 (1h)',  '17:15', '18:15', 1, 6, true, 500),
('SAT1_1815_1915', 'Saturday 18:15–19:15 (1h)',  '18:15', '19:15', 1, 6, true, 510);

-- 1h — Sunday (day_of_week = 0) — sort 610..710
insert into public.timeslot_catalog (slot_code, label, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('SUN1_0800_0900', 'Sunday 8:00–9:00 (1h)',     '08:00', '09:00', 1, 0, true, 610),
('SUN1_0900_1000', 'Sunday 9:00–10:00 (1h)',    '09:00', '10:00', 1, 0, true, 620),
('SUN1_1000_1100', 'Sunday 10:00–11:00 (1h)',   '10:00', '11:00', 1, 0, true, 630),
('SUN1_1100_1200', 'Sunday 11:00–12:00 (1h)',   '11:00', '12:00', 1, 0, true, 640),
('SUN1_1215_1315', 'Sunday 12:15–13:15 (1h)',   '12:15', '13:15', 1, 0, true, 650),
('SUN1_1315_1415', 'Sunday 13:15–14:15 (1h)',   '13:15', '14:15', 1, 0, true, 660),
('SUN1_1415_1515', 'Sunday 14:15–15:15 (1h)',   '14:15', '15:15', 1, 0, true, 670),
('SUN1_1515_1615', 'Sunday 15:15–16:15 (1h)',   '15:15', '16:15', 1, 0, true, 680),
('SUN1_1615_1715', 'Sunday 16:15–17:15 (1h)',   '16:00', '17:15', 1, 0, true, 690),
('SUN1_1715_1815', 'Sunday 17:15–18:15 (1h)',   '17:15', '18:15', 1, 0, true, 700),
('SUN1_1815_1915', 'Sunday 18:15–19:15 (1h)',   '18:15', '19:15', 1, 0, true, 710);

-- 1h — Weekday (Mon–Fri; day_of_week = NULL) — sort 810..910
insert into public.timeslot_catalog (slot_code, label, start_time, end_time, duration_hours, day_of_week, is_active, sort_order) values
('WKD1_0800_0900', 'Weekday 8:00–9:00 (1h)',    '08:00', '09:00', 1, NULL, true, 810),
('WKD1_0900_1000', 'Weekday 9:00–10:00 (1h)',   '09:00', '10:00', 1, NULL, true, 820),
('WKD1_1000_1100', 'Weekday 10:00–11:00 (1h)',  '10:00', '11:00', 1, NULL, true, 830),
('WKD1_1100_1200', 'Weekday 11:00–12:00 (1h)',  '11:00', '12:00', 1, NULL, true, 840),
('WKD1_1200_1300', 'Weekday 12:00–13:00 (1h)',  '12:00', '13:00', 1, NULL, true, 850),
('WKD1_1300_1400', 'Weekday 13:00–14:00 (1h)',  '13:00', '14:00', 1, NULL, true, 860),
('WKD1_1400_1500', 'Weekday 14:00–15:00 (1h)',  '14:00', '15:00', 1, NULL, true, 870),
('WKD1_1500_1600', 'Weekday 15:00–16:00 (1h)',  '15:00', '16:00', 1, NULL, true, 880),
('WKD1_1600_1700', 'Weekday 16:00–17:00 (1h)',  '16:00', '17:00', 1, NULL, true, 890),
('WKD1_1700_1800', 'Weekday 17:00–18:00 (1h)',  '17:00', '18:00', 1, NULL, true, 900),
('WKD1_1800_1900', 'Weekday 18:00–19:00 (1h)',  '18:00', '19:00', 1, NULL, true, 910);

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
  team_name     citext NOT NULL,

  -- normalized for uniqueness (case/space insensitive)
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name::text), '\s+', ' ', 'g') )
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
  CHECK (length(btrim(team_name::text)) > 0),
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
  team_name,
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
-- REGISTRATION META (Page 1–2 header snapshot)
-- =========================================================
create table public.registration_meta (
  id uuid primary key default gen_random_uuid(),

  -- Page 1
  race_category text not null check (race_category in ('men_open','ladies_open','mixed_open','mixed_corporate')),
  num_teams int not null check (num_teams >= 1),
  num_teams_opt1 int not null default 0 check (num_teams_opt1 >= 0),
  num_teams_opt2 int not null default 0 check (num_teams_opt2 >= 0),
  season int not null check (season between 2000 and 2100),

  -- Page 2
  org_name text not null,
  org_address text,
  managers_json jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_registration_meta_updated_at
before update on public.registration_meta
for each row execute function public.set_updated_at();

-- FK from team_meta.registration_id -> registration_meta(id)
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
-- NOTE: RLS intentionally NOT enabled on team_meta_audit (trigger needs to write freely)
-- alter table public.team_meta_audit   enable row level security;
alter table public.timeslot_catalog     enable row level security;
alter table public.practice_preferences enable row level security;
alter table public.registration_meta    enable row level security;
alter table public.race_day_requests    enable row level security;

-- With RLS on and no policies, anon/auth clients cannot read/write.
-- Your server code (Edge Functions with service-role) or SECURITY DEFINER RPCs should perform all access.
