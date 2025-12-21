# Database Configuration SQL Files

This document contains all SQL configuration files for the SDBA system combined into a single reference.

**Last Updated:** 2026 Season

---

## Table of Contents

1. [event.sql](#1-eventsql) - Event General Catalog
2. [annual.sql](#2-annualsql) - Annual Event Configuration
3. [division.sql](#3-divisionsql) - Division Configuration
4. [order.sql](#4-ordersql) - Order Items Configuration
5. [ui_text.sql](#5-ui_textsql) - UI Texts (i18n)
6. [rpc.sql](#6-rpcsql) - Remote Procedure Calls
7. [view.sql](#7-viewsql) - Database Views
8. [secdef.sql](#8-secdefsql) - Security Definitions
9. [unique_client_tx_id.sql](#9-unique_client_tx_idsql) - Unique Client Transaction ID

---

## 1. event.sql

Event General Catalog - Defines the three event types (Warm-Up, Main Race, Short Course).

```sql
DROP TABLE IF EXISTS event_general_catalog CASCADE;

CREATE TABLE event_general_catalog (
  event_type text PRIMARY KEY,
  event_type_short_code_general text,
  event_type_ref_name_general_en text NOT NULL,
  event_type_ref_name_general_tc text,
  active boolean DEFAULT true
);

INSERT INTO event_general_catalog (
  event_type,
  event_type_short_code_general,
  event_type_ref_name_general_en,
  event_type_ref_name_general_tc,
  active
) VALUES
  ('warm_up', 'WU', 'Stanley Dragon Boat Warm-Up Races', '赤柱龍舟熱身賽', true),
  ('main_race', 'TN', 'Stanley International Dragon Boat Championships', '赤柱國際龍舟錦標賽', true),
  ('short_course', 'SC', 'Hong Kong Dragon Boat Short Course Races', '香港龍舟短途賽', true);
```

---

## 2. annual.sql

Annual Event Configuration - Configures event details, practice windows, form flags, and division mappings for each annual event (WU2026, TN2026, SC2026).

```sql
-- ============================================
-- Event config: practice window, form flag, banner, versioning
-- Idempotent + non-destructive
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 0) Ensure PK on event_general_catalog(event_type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='event_general_catalog'
      AND constraint_type='PRIMARY KEY'
  ) THEN
    ALTER TABLE public.event_general_catalog
      ADD CONSTRAINT event_general_catalog_pkey PRIMARY KEY (event_type);
  END IF;
END $$;

-- 1) Create annual_event_config if missing (includes new columns)
CREATE TABLE IF NOT EXISTS public.annual_event_config (
  event_short_ref        text   PRIMARY KEY,  -- e.g. 'TN2026'
  ref_event_type         citext NOT NULL REFERENCES public.event_general_catalog(event_type),
  season                 int    NOT NULL CHECK (season BETWEEN 2000 AND 2100),

  event_long_name_en     text   NOT NULL,
  event_long_name_tc     text,

  event_date_en          text,
  event_date_tc          text,
  event_date             date,

  event_location_en      text,
  event_location_tc      text,

  course_length_en       text,
  course_length_tc       text,

  event_time_en          text,
  event_time_tc          text,

  reg_deadline_date_en   text,
  reg_deadline_date_tc   text,

  event_colour_code_hex  text   CHECK (event_colour_code_hex ~ '^[0-9A-Fa-f]{6}$'),
  reg_form_status        text   NOT NULL CHECK (reg_form_status IN ('Live','Archived')),

  -- NEW FIELDS
  practice_start_date    date,
  practice_end_date      date,
  form_enabled           boolean NOT NULL DEFAULT true,
  banner_text_en         text,
  banner_text_tc         text,
  config_version         int     NOT NULL DEFAULT 1,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- 1a) If table already existed, add new columns (safe to rerun)
DO $$
BEGIN
  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='practice_start_date';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN practice_start_date date;
  END IF;

  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='practice_end_date';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN practice_end_date date;
  END IF;

  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='form_enabled';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN form_enabled boolean NOT NULL DEFAULT true;
  END IF;

  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='banner_text_en';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN banner_text_en text;
  END IF;

  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='banner_text_tc';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN banner_text_tc text;
  END IF;

  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='config_version';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN config_version int NOT NULL DEFAULT 1;
  END IF;

  -- add created_at/updated_at if missing (nice to have)
  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='created_at';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  PERFORM 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='annual_event_config' AND column_name='updated_at';
  IF NOT FOUND THEN
    ALTER TABLE public.annual_event_config ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- 1b) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_event_config_updated_at ON public.annual_event_config;
CREATE TRIGGER trg_event_config_updated_at
BEFORE UPDATE ON public.annual_event_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1c) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_annual_event_by_type   ON public.annual_event_config(ref_event_type);
CREATE INDEX IF NOT EXISTS idx_annual_event_by_season ON public.annual_event_config(season);

-- 2) Annual event ↔ division mapping (ensure we reference division_config_general)

-- 2a) Ensure divisions composite uniqueness exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='division_config_general'
      AND constraint_name='uq_divcfg_id_code'
  ) THEN
    ALTER TABLE public.division_config_general
      ADD CONSTRAINT uq_divcfg_id_code UNIQUE (div_id, div_code_prefix);
  END IF;
END $$;

-- 2b) Drop old mapping (it may point to division_general_catalog) and recreate
DROP TABLE IF EXISTS public.annual_event_division_map CASCADE;

CREATE TABLE public.annual_event_division_map (
  event_short_ref  text NOT NULL
    REFERENCES public.annual_event_config(event_short_ref) ON DELETE CASCADE,
  div_id           uuid NOT NULL
    REFERENCES public.division_config_general(div_id),
  div_code_prefix  text NOT NULL
    REFERENCES public.division_config_general(div_code_prefix),
  CONSTRAINT fk_divcfg_pair
    FOREIGN KEY (div_id, div_code_prefix)
    REFERENCES public.division_config_general(div_id, div_code_prefix),
  PRIMARY KEY (event_short_ref, div_id)
);

CREATE INDEX IF NOT EXISTS idx_aedm_event ON public.annual_event_division_map(event_short_ref);
CREATE INDEX IF NOT EXISTS idx_aedm_div   ON public.annual_event_division_map(div_id);
CREATE INDEX IF NOT EXISTS idx_aedm_code  ON public.annual_event_division_map(div_code_prefix);

-- 3) Seed / Upsert events with practice window + flags
INSERT INTO public.annual_event_config (
  event_short_ref, ref_event_type, season,
  event_long_name_en, event_long_name_tc,
  event_date_en, event_date_tc, event_date,
  event_location_en, event_location_tc,
  course_length_en, course_length_tc,
  event_time_en, event_time_tc,
  reg_deadline_date_en, reg_deadline_date_tc,
  event_colour_code_hex, reg_form_status,
  practice_start_date, practice_end_date, form_enabled, banner_text_en, banner_text_tc, config_version
) VALUES
('WU2026', 'warm_up', 2026,
 'Stanley Dragon Boat Warm-Up Races 2026', '赤柱龍舟熱身賽 2026',
 '2 May, 2026, Saturday', '2026 年 5 月 2 日, 星期六', DATE '2026-05-02',
 'Stanley Main Beach', '赤柱正灘',
 '250m', '250 米',
 '8am - 5 pm', '上午八時至下午五時',
 '20 April, 2026', '2026 年 4 月 20 日',
 '3B3EC0', 'Live',
 DATE '2026-01-01', DATE '2026-07-31', true, NULL, NULL, 1)
ON CONFLICT (event_short_ref) DO UPDATE
SET ref_event_type        = EXCLUDED.ref_event_type,
    season                = EXCLUDED.season,
    event_long_name_en    = EXCLUDED.event_long_name_en,
    event_long_name_tc    = EXCLUDED.event_long_name_tc,
    event_date_en         = EXCLUDED.event_date_en,
    event_date_tc         = EXCLUDED.event_date_tc,
    event_date            = EXCLUDED.event_date,
    event_location_en     = EXCLUDED.event_location_en,
    event_location_tc     = EXCLUDED.event_location_tc,
    course_length_en      = EXCLUDED.course_length_en,
    course_length_tc      = EXCLUDED.course_length_tc,
    event_time_en         = EXCLUDED.event_time_en,
    event_time_tc         = EXCLUDED.event_time_tc,
    reg_deadline_date_en  = EXCLUDED.reg_deadline_date_en,
    reg_deadline_date_tc  = EXCLUDED.reg_deadline_date_tc,
    event_colour_code_hex = EXCLUDED.event_colour_code_hex,
    reg_form_status       = EXCLUDED.reg_form_status,
    practice_start_date   = EXCLUDED.practice_start_date,
    practice_end_date     = EXCLUDED.practice_end_date,
    form_enabled          = EXCLUDED.form_enabled,
    banner_text_en        = EXCLUDED.banner_text_en,
    banner_text_tc        = EXCLUDED.banner_text_tc,
    config_version        = EXCLUDED.config_version;

INSERT INTO public.annual_event_config (
  event_short_ref, ref_event_type, season,
  event_long_name_en, event_long_name_tc,
  event_date_en, event_date_tc, event_date,
  event_location_en, event_location_tc,
  course_length_en, course_length_tc,
  event_time_en, event_time_tc,
  reg_deadline_date_en, reg_deadline_date_tc,
  event_colour_code_hex, reg_form_status,
  practice_start_date, practice_end_date, form_enabled, banner_text_en, banner_text_tc, config_version
) VALUES
('TN2026', 'main_race', 2026,
 'Stanley International Dragon Boat Championships 2026', '赤柱國際龍舟錦標賽2026',
 '30 May, 2026, Saturday', '2026 年 5 月 30 日, 星期六', DATE '2026-05-30',
 'Stanley Main Beach', '赤柱正灘',
 '270m', '270 米',
 '8am - 5 pm', '上午八時至下午五時',
 '8 May, 2026', '2026 年 5 月 8 日',
 'E9BF00', 'Live',
 DATE '2026-01-01', DATE '2026-07-31', true, NULL, NULL, 1)
ON CONFLICT (event_short_ref) DO UPDATE
SET ref_event_type        = EXCLUDED.ref_event_type,
    season                = EXCLUDED.season,
    event_long_name_en    = EXCLUDED.event_long_name_en,
    event_long_name_tc    = EXCLUDED.event_long_name_tc,
    event_date_en         = EXCLUDED.event_date_en,
    event_date_tc         = EXCLUDED.event_date_tc,
    event_date            = EXCLUDED.event_date,
    event_location_en     = EXCLUDED.event_location_en,
    event_location_tc     = EXCLUDED.event_location_tc,
    course_length_en      = EXCLUDED.course_length_en,
    course_length_tc      = EXCLUDED.course_length_tc,
    event_time_en         = EXCLUDED.event_time_en,
    event_time_tc         = EXCLUDED.event_time_tc,
    reg_deadline_date_en  = EXCLUDED.reg_deadline_date_en,
    reg_deadline_date_tc  = EXCLUDED.reg_deadline_date_tc,
    event_colour_code_hex = EXCLUDED.event_colour_code_hex,
    reg_form_status       = EXCLUDED.reg_form_status,
    practice_start_date   = EXCLUDED.practice_start_date,
    practice_end_date     = EXCLUDED.practice_end_date,
    form_enabled          = EXCLUDED.form_enabled,
    banner_text_en        = EXCLUDED.banner_text_en,
    banner_text_tc        = EXCLUDED.banner_text_tc,
    config_version        = EXCLUDED.config_version;

INSERT INTO public.annual_event_config (
  event_short_ref, ref_event_type, season,
  event_long_name_en, event_long_name_tc,
  event_date_en, event_date_tc, event_date,
  event_location_en, event_location_tc,
  course_length_en, course_length_tc,
  event_time_en, event_time_tc,
  reg_deadline_date_en, reg_deadline_date_tc,
  event_colour_code_hex, reg_form_status,
  practice_start_date, practice_end_date, form_enabled, banner_text_en, banner_text_tc, config_version
) VALUES
('SC2026', 'short_course', 2026,
 'The 24th Hong Kong Dragon Boat Short Course Races', '第二十四屆香港龍舟短途賽',
 '14 June, 2026, Sunday', '2026 年 6 月 14 日, 星期日', DATE '2026-06-14',
 'Stanley Main Beach', '赤柱正灘',
 '200m', '200 米',
 '9am - 5 pm', '上午九時至下午五時',
 '1 June, 2026', '2026 年 6 月 1 日',
 '538136', 'Live',
 DATE '2026-01-01', DATE '2026-08-31', true, NULL, NULL, 1)
ON CONFLICT (event_short_ref) DO UPDATE
SET ref_event_type        = EXCLUDED.ref_event_type,
    season                = EXCLUDED.season,
    event_long_name_en    = EXCLUDED.event_long_name_en,
    event_long_name_tc    = EXCLUDED.event_long_name_tc,
    event_date_en         = EXCLUDED.event_date_en,
    event_date_tc         = EXCLUDED.event_date_tc,
    event_date            = EXCLUDED.event_date,
    event_location_en     = EXCLUDED.event_location_en,
    event_location_tc     = EXCLUDED.event_location_tc,
    course_length_en      = EXCLUDED.course_length_en,
    course_length_tc      = EXCLUDED.course_length_tc,
    event_time_en         = EXCLUDED.event_time_en,
    event_time_tc         = EXCLUDED.event_time_tc,
    reg_deadline_date_en  = EXCLUDED.reg_deadline_date_en,
    reg_deadline_date_tc  = EXCLUDED.reg_deadline_date_tc,
    event_colour_code_hex = EXCLUDED.event_colour_code_hex,
    reg_form_status       = EXCLUDED.reg_form_status,
    practice_start_date   = EXCLUDED.practice_start_date,
    practice_end_date     = EXCLUDED.practice_end_date,
    form_enabled          = EXCLUDED.form_enabled,
    banner_text_en        = EXCLUDED.banner_text_en,
    banner_text_tc        = EXCLUDED.banner_text_tc,
    config_version        = EXCLUDED.config_version;

-- 4) Map divisions per event (using division_config_general)
INSERT INTO public.annual_event_division_map (event_short_ref, div_id, div_code_prefix)
SELECT 'WU2026', d.div_id, d.div_code_prefix
FROM public.division_config_general d
WHERE d.div_code_prefix IN ('WM','WL','WX','WPM','WPL','WPX','Y','YL','D')
ON CONFLICT DO NOTHING;

INSERT INTO public.annual_event_division_map (event_short_ref, div_id, div_code_prefix)
SELECT 'TN2026', d.div_id, d.div_code_prefix
FROM public.division_config_general d
WHERE d.div_code_prefix IN ('M','L','X','C')
ON CONFLICT DO NOTHING;

INSERT INTO public.annual_event_division_map (event_short_ref, div_id, div_code_prefix)
SELECT 'SC2026', d.div_id, d.div_code_prefix
FROM public.division_config_general d
WHERE d.div_code_prefix IN ('SM','SL','SX','SU','SPM','SPL','SPX','HKU')
ON CONFLICT DO NOTHING;

-- 5) Optional sanity check
-- SELECT a.event_short_ref, d.div_code_prefix
-- FROM public.annual_event_division_map a
-- JOIN public.division_config_general d USING (div_id)
-- ORDER BY a.event_short_ref, d.div_code_prefix;
```

---

## 3. division.sql

Division Configuration - Defines all divisions for each event type (Warm-Up, Main Race, Short Course) with sort order and corporate flags.

```sql
-- ============================================
-- Divisions: add sort_order + is_corporate and seed data
-- Safe to run multiple times
-- ============================================

create extension if not exists pgcrypto;

-- Create table if missing (includes new columns).
-- If your table already exists, we add the columns below.
create table if not exists public.division_config_general (
  div_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  div_code_prefix text unique not null,
  div_short_ref text not null,
  div_main_name_en text not null,
  div_main_name_tc text,
  div_sub_name_en text,
  div_sub_name_tc text,
  div_colour_code_hex text check (div_colour_code_hex ~ '^[0-9A-Fa-f]{6}$'),
  by_invitation_only boolean not null default false,
  status text not null check (status in ('active','inactive')),
  -- NEW
  sort_order int not null default 0,
  is_corporate boolean not null default false
);

-- If the table existed already without the new columns, add them.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='division_config_general' and column_name='sort_order'
  ) then
    alter table public.division_config_general add column sort_order int not null default 0;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='division_config_general' and column_name='is_corporate'
  ) then
    alter table public.division_config_general add column is_corporate boolean not null default false;
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_division_config_event_type on public.division_config_general(event_type);
create index if not exists idx_division_config_status on public.division_config_general(status);
create index if not exists idx_division_config_event_sort on public.division_config_general(event_type, sort_order);

-- ======================
-- Seed / Upsert rows
-- Note: we upsert on div_code_prefix (unique)
-- ======================

-- Warm-Up Race Divisions (sort_order 1..9)
insert into public.division_config_general (
  event_type, div_code_prefix, div_short_ref,
  div_main_name_en, div_main_name_tc,
  div_sub_name_en, div_sub_name_tc,
  div_colour_code_hex, by_invitation_only, status,
  sort_order, is_corporate
) values
('warm_up', 'WM',  'Men Std',    'Standard Boat', '標準龍', 'Men',    '男子', '0070C0', false, 'active', 1, false),
('warm_up', 'WL',  'Ladies Std', 'Standard Boat', '標準龍', 'Ladies', '女子', 'FF0000', false, 'active', 2, false),
('warm_up', 'WX',  'Mixed Std',  'Standard Boat', '標準龍', 'Mixed',  '混合', '99CC00', false, 'active', 3, false),
('warm_up', 'WPM', 'Men SB',     'Small Boat',    '小籠',   'Men',    '男子', 'CCFFFF', false, 'active', 4, false),
('warm_up', 'WPL', 'Ladies SB',  'Small Boat',    '小籠',   'Ladies', '女子', 'FF99CC', false, 'active', 5, false),
('warm_up', 'WPX', 'Mixed SB',   'Small Boat',    '小籠',   'Mixed',  '混合', 'CCFFCC', false, 'active', 6, false),
('warm_up', 'Y',   'Youth Grp Open','Standard Boat','標準龍', 'Hong Kong Youth Group - Open','青少年團體 - 公開', 'CC99FF', true,  'active', 7, false),
('warm_up', 'YL',  'Youth Grp Ladies','Standard Boat','標準龍', 'Hong Kong Youth Group - Ladies','青少年團體 - 女子', 'CC99FF', true,  'active', 8, false),
('warm_up', 'D',   'Disc Force', 'Standard Boat', '標準龍', 'Disciplinary Forces', '紀律部隊', 'C0C0C0', true, 'active', 9, false)
on conflict (div_code_prefix) do update
set event_type = excluded.event_type,
    div_short_ref = excluded.div_short_ref,
    div_main_name_en = excluded.div_main_name_en,
    div_main_name_tc = excluded.div_main_name_tc,
    div_sub_name_en = excluded.div_sub_name_en,
    div_sub_name_tc = excluded.div_sub_name_tc,
    div_colour_code_hex = excluded.div_colour_code_hex,
    by_invitation_only = excluded.by_invitation_only,
    status = excluded.status,
    sort_order = excluded.sort_order,
    is_corporate = excluded.is_corporate;

-- Main Race Divisions (sort_order 1..4) — Mixed Corp is_corporate = true
insert into public.division_config_general (
  event_type, div_code_prefix, div_short_ref,
  div_main_name_en, div_main_name_tc,
  div_sub_name_en, div_sub_name_tc,
  div_colour_code_hex, by_invitation_only, status,
  sort_order, is_corporate
) values
('main_race', 'M', 'Men Open',    'Open Division',  '公開組', 'Men',    '男子', '00133A', false, 'active', 1, false),
('main_race', 'L', 'Ladies Open', 'Open Division',  '公開組', 'Ladies', '女子', 'FF0000', false, 'active', 2, false),
('main_race', 'X', 'Mixed Open',  'Mixed Division', '混合組', 'Open',   '公開', 'C6E0B4', false, 'active', 3, false),
('main_race', 'C', 'Mixed Corp',  'Mixed Division', '混合組', 'Corporate','商行','008000', false, 'active', 4, true)
on conflict (div_code_prefix) do update
set event_type = excluded.event_type,
    div_short_ref = excluded.div_short_ref,
    div_main_name_en = excluded.div_main_name_en,
    div_main_name_tc = excluded.div_main_name_tc,
    div_sub_name_en = excluded.div_sub_name_en,
    div_sub_name_tc = excluded.div_sub_name_tc,
    div_colour_code_hex = excluded.div_colour_code_hex,
    by_invitation_only = excluded.by_invitation_only,
    status = excluded.status,
    sort_order = excluded.sort_order,
    is_corporate = excluded.is_corporate;

-- Short Course Divisions (sort_order 1..9)
insert into public.division_config_general (
  event_type, div_code_prefix, div_short_ref,
  div_main_name_en, div_main_name_tc,
  div_sub_name_en, div_sub_name_tc,
  div_colour_code_hex, by_invitation_only, status,
  sort_order, is_corporate
) values
('short_course', 'SM',  'Men Std',   'Standard Boat', '標準龍', 'Men',     '男子', '000080', false, 'active', 1, false),
('short_course', 'SL',  'Ladies Std','Standard Boat', '標準龍', 'Ladies',  '女子', 'FF0000', false, 'active', 2, false),
('short_course', 'SX',  'Mixed Std', 'Standard Boat', '標準龍', 'Mixed',   '混合', '008000', false, 'active', 3, false),
('short_course', 'SU',  'Post-Sec',  'Standard Boat', '標準龍', 'Post-Secondary','大專', 'FFFF99', true,  'active', 4, false),
('short_course', 'HKU', 'HKU',       'Standard Boat', '標準龍', 'HKU Invitational Cup','香港大學邀請賽', 'FFCC00', true,  'active', 5, false),
('short_course', 'SPM', 'Men SB',    'Small Boat',    '小籠',   'Men',     '男子', '99CCFF', false, 'active', 6, false),
('short_course', 'SPL', 'Ladies SB', 'Small Boat',    '小籠',   'Ladies',  '女子', 'FF99CC', false, 'active', 7, false),
('short_course', 'SPX', 'Mixed SB',  'Small Boat',    '小籠',   'Mixed',   '混合', '99CC00', false, 'active', 8, false)
on conflict (div_code_prefix) do update
set event_type = excluded.event_type,
    div_short_ref = excluded.div_short_ref,
    div_main_name_en = excluded.div_main_name_en,
    div_main_name_tc = excluded.div_main_name_tc,
    div_sub_name_en = excluded.div_sub_name_en,
    div_sub_name_tc = excluded.div_sub_name_tc,
    div_colour_code_hex = excluded.div_colour_code_hex,
    by_invitation_only = excluded.by_invitation_only,
    status = excluded.status,
    sort_order = excluded.sort_order,
    is_corporate = excluded.is_corporate;
```

---

## 4. order.sql

Order Items Configuration - Defines packages, race-day arrangements, and practice fees for each event (WU2026, TN2026, SC2026).

```sql
-- ============================================
-- Order Items hardening + seed (idempotent)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 0) Ensure referenced tables exist (light check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='annual_event_config'
  ) THEN
    RAISE EXCEPTION 'annual_event_config not found (needed for FK event_short_ref)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='division_config_general'
  ) THEN
    RAISE EXCEPTION 'division_config_general not found (needed for FK div_id)';
  END IF;
END $$;

-- 1) Create table if missing, otherwise ALTER to add new columns
CREATE TABLE IF NOT EXISTS public.annual_event_order_item_config (
  order_item_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_short_ref       text NOT NULL REFERENCES public.annual_event_config(event_short_ref) ON DELETE CASCADE,
  order_item_type       text NOT NULL CHECK (order_item_type IN ('package','race_day_arrangement','practice','others')),
  order_item_code       text NOT NULL,
  order_item_short_ref  text,
  order_item_title_en   text NOT NULL,
  order_item_title_tc   text,
  package_description_long text,
  additional_info_req_desc text,
  div_id                uuid REFERENCES public.division_config_general(div_id),
  listed_unit_price     numeric(12,2) DEFAULT 0 CHECK (listed_unit_price >= 0),
  -- legacy per-type qty fields (keep if you still use)
  rd_marquee_unit       int,
  rd_marquee_location_unit int,
  rd_steerer_unit       int,
  rd_junk_unit          int,
  rd_speed_boat_unit    int,
  rd_single_day_p_steerer_unit int,
  practice_hr_std       int,
  practice_hr_sb        int,
  practice_trainer_hr   int,
  practice_steerer_hr   int,
  other_qty             int,
  min_order_qty         int DEFAULT 0 CHECK (min_order_qty >= 0),
  max_order_qty         int DEFAULT 999 CHECK (max_order_qty >= 0),
  show_on_app_form      boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  CONSTRAINT uq_order_item_per_event UNIQUE (event_short_ref, order_item_code)
);

-- 1a) Add/ensure new columns (additive, safe to rerun)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annual_event_order_item_config' AND column_name='sort_order'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config ADD COLUMN sort_order int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annual_event_order_item_config' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Package freebies & caps (package scope)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annual_event_order_item_config' AND column_name='included_practice_hours_per_team'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config ADD COLUMN included_practice_hours_per_team int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annual_event_order_item_config' AND column_name='tees_qty'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config ADD COLUMN tees_qty int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annual_event_order_item_config' AND column_name='padded_shorts_qty'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config ADD COLUMN padded_shorts_qty int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annual_event_order_item_config' AND column_name='dry_bag_qty'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config ADD COLUMN dry_bag_qty int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 1b) Validate constraint: max >= min (recreate to be safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'annual_event_order_item_config_max_gte_min'
  ) THEN
    ALTER TABLE public.annual_event_order_item_config
      DROP CONSTRAINT annual_event_order_item_config_max_gte_min;
  END IF;

  ALTER TABLE public.annual_event_order_item_config
    ADD CONSTRAINT annual_event_order_item_config_max_gte_min
    CHECK (max_order_qty IS NULL OR max_order_qty >= min_order_qty);
END $$;

-- 2) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orderitem_updated_at ON public.annual_event_order_item_config;
CREATE TRIGGER trg_orderitem_updated_at
BEFORE UPDATE ON public.annual_event_order_item_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orderitem_event              ON public.annual_event_order_item_config(event_short_ref);
CREATE INDEX IF NOT EXISTS idx_orderitem_type               ON public.annual_event_order_item_config(order_item_type);
CREATE INDEX IF NOT EXISTS idx_orderitem_code               ON public.annual_event_order_item_config(order_item_code);
CREATE INDEX IF NOT EXISTS idx_orderitem_div                ON public.annual_event_order_item_config(div_id);
CREATE INDEX IF NOT EXISTS idx_orderitem_event_type_sort    ON public.annual_event_order_item_config(event_short_ref, order_item_type, sort_order);

-- ======================
-- 4) Seed / Upsert rows
-- ======================

-- WARM-UP (WU2026) packages
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, listed_unit_price,
 min_order_qty, max_order_qty, show_on_app_form, sort_order, is_active)
VALUES
('WU2026', 'package', 'std_wu', 'Std (WU)', 'Standard Boat', '標準龍', 4600, 0, 1, true, 1, true),
('WU2026', 'package', 'sb_wu',  'SB (WU)',  'Small Boat',    '小籠',   2800, 0, 1, true, 2, true),
('WU2026', 'package', 'invitation_wu', 'Invitation (WU)', 'By Invitation', '邀請賽', 0, 0, 1, true, 99, true)
ON CONFLICT (event_short_ref, order_item_code) DO UPDATE
SET order_item_type = EXCLUDED.order_item_type,
    order_item_short_ref = EXCLUDED.order_item_short_ref,
    order_item_title_en  = EXCLUDED.order_item_title_en,
    order_item_title_tc  = EXCLUDED.order_item_title_tc,
    listed_unit_price    = EXCLUDED.listed_unit_price,
    min_order_qty        = EXCLUDED.min_order_qty,
    max_order_qty        = EXCLUDED.max_order_qty,
    show_on_app_form     = EXCLUDED.show_on_app_form,
    sort_order           = EXCLUDED.sort_order,
    is_active            = EXCLUDED.is_active;

-- MAIN RACE (TN2026) packages — include freebies/caps
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, package_description_long,
 listed_unit_price, tees_qty, padded_shorts_qty, dry_bag_qty,
 included_practice_hours_per_team, min_order_qty, max_order_qty, show_on_app_form,
 sort_order, is_active)
VALUES
('TN2026', 'package', 'option_1_non_corp', 'Option I', 'Option I', '選項 I',
 '- Entry Fee 參賽費\n- Practice with equipment 練習及器材 X 12 hrs\n- Souvenir Tee 龍舟紀念 T 恤 X 20 pieces\n- Padded Shorts 龍舟專用短褲 X 20 pieces\n- 20L Dry Bag 防水袋 X 1 piece',
 20900, 20, 20, 1, 12, 0, 1, true, 1, true),
('TN2026', 'package', 'option_1_corp', 'Option I', 'Option I', '選項 I',
 '- Entry Fee 參賽費\n- Practice with equipment 練習及器材 X 12 hrs\n- Souvenir Tee 龍舟紀念 T 恤 X 20 pieces\n- Padded Shorts 龍舟專用短褲 X 20 pieces\n- 20L Dry Bag 防水袋 X 1 piece',
 21900, 20, 20, 1, 12, 0, 1, true, 2, true),
('TN2026', 'package', 'option_2_non_corp', 'Option II', 'Option II', '選項 II',
 '- Entry Fee 參賽費\n- Practice with equipment 練習及器材 X 12 hrs\n- Souvenir Tee 龍舟紀念 T 恤 X 20 pieces\n- 20L Dry Bag 防水袋 X 1 piece',
 17500, 20, 0, 1, 12, 0, NULL, true, 3, true),
('TN2026', 'package', 'option_2_corp', 'Option II', 'Option II', '選項 II',
 '- Entry Fee 參賽費\n- Practice with equipment 練習及器材 X 12 hrs\n- Souvenir Tee 龍舟紀念 T 恤 X 20 pieces\n- 20L Dry Bag 防水袋 X 1 piece',
 18500, 20, 0, 1, 12, 0, NULL, true, 4, true)
ON CONFLICT (event_short_ref, order_item_code) DO UPDATE
SET order_item_type = EXCLUDED.order_item_type,
    order_item_short_ref = EXCLUDED.order_item_short_ref,
    order_item_title_en  = EXCLUDED.order_item_title_en,
    order_item_title_tc  = EXCLUDED.order_item_title_tc,
    package_description_long = EXCLUDED.package_description_long,
    listed_unit_price    = EXCLUDED.listed_unit_price,
    tees_qty             = EXCLUDED.tees_qty,
    padded_shorts_qty    = EXCLUDED.padded_shorts_qty,
    dry_bag_qty          = EXCLUDED.dry_bag_qty,
    included_practice_hours_per_team = EXCLUDED.included_practice_hours_per_team,
    min_order_qty        = EXCLUDED.min_order_qty,
    max_order_qty        = EXCLUDED.max_order_qty,
    show_on_app_form     = EXCLUDED.show_on_app_form,
    sort_order           = EXCLUDED.sort_order,
    is_active            = EXCLUDED.is_active;

-- SHORT COURSE (SC2026) packages
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, listed_unit_price,
 min_order_qty, max_order_qty, show_on_app_form, sort_order, is_active)
VALUES
('SC2026', 'package', 'std_sc', 'Std (SC)', 'Standard Boat', '標準龍', 4600, 0, 1, true, 1, true),
('SC2026', 'package', 'sb_sc', 'SB (SC)', 'Small Boat', '小籠', 2800, 0, 1, true, 2, true),
('SC2026', 'package', 'postsec_pkg_sc', 'Post-Sec Pkg (SC)', 'Post-Secondary w/ Package', '大專組 連 Package', 5500, 0, 1, true, 3, true),
('SC2026', 'package', 'invitation_sc', 'Invitation (SC)', 'By Invitation', '邀請賽', 0, 0, 1, true, 99, true)
ON CONFLICT (event_short_ref, order_item_code) DO UPDATE
SET order_item_type = EXCLUDED.order_item_type,
    order_item_short_ref = EXCLUDED.order_item_short_ref,
    order_item_title_en  = EXCLUDED.order_item_title_en,
    order_item_title_tc  = EXCLUDED.order_item_title_tc,
    listed_unit_price    = EXCLUDED.listed_unit_price,
    min_order_qty        = EXCLUDED.min_order_qty,
    max_order_qty        = EXCLUDED.max_order_qty,
    show_on_app_form     = EXCLUDED.show_on_app_form,
    sort_order           = EXCLUDED.sort_order,
    is_active            = EXCLUDED.is_active;

-- RACE-DAY ARRANGEMENTS (WU2026)
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, listed_unit_price,
 min_order_qty, max_order_qty, show_on_app_form, sort_order, is_active)
VALUES
('WU2026', 'race_day_arrangement', 'rd_marquee', '[RD] Marquee', 'Athlete Marquee', '帳篷', 800, 0, 20, true, 1, true),
('WU2026', 'race_day_arrangement', 'rd_marquee_location', '[RD] Marquee Special', 'Athlete Marquee - Specific Location', '帳篷 - 預留位置', 500, 0, 999, false, 2, true),
('WU2026', 'race_day_arrangement', 'rd_steerer', '[RD] Steerer', 'Official Steerer', '大會舵手', 800, 0, 1, true, 3, true),
('WU2026', 'race_day_arrangement', 'rd_steerer_no_practice', '[RD] Steerer (X Practice)', 'Official Steerer', '大會舵手', 1500, 0, 1, true, 4, true),
('WU2026', 'race_day_arrangement', 'rd_junk', '[RD] Junk', 'Junk Registration', '遊艇登記', 2500, 0, 5, true, 5, true),
('WU2026', 'race_day_arrangement', 'rd_speedboat', '[RD] Speedboat', 'Speed Boat Registration', '快艇登記', 1500, 0, 5, true, 6, true),
('WU2026', 'race_day_arrangement', 'rd_advertisement_10000', '[RD] Ads', 'Advertisement Charge', '廣告費', 10000, 0, 999, false, 99, true)
ON CONFLICT (event_short_ref, order_item_code) DO UPDATE
SET order_item_type = EXCLUDED.order_item_type,
    order_item_short_ref = EXCLUDED.order_item_short_ref,
    order_item_title_en  = EXCLUDED.order_item_title_en,
    order_item_title_tc  = EXCLUDED.order_item_title_tc,
    listed_unit_price    = EXCLUDED.listed_unit_price,
    min_order_qty        = EXCLUDED.min_order_qty,
    max_order_qty        = EXCLUDED.max_order_qty,
    show_on_app_form     = EXCLUDED.show_on_app_form,
    sort_order           = EXCLUDED.sort_order,
    is_active            = EXCLUDED.is_active;

-- PRACTICE FEES (WU2026)
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, listed_unit_price,
 min_order_qty, max_order_qty, show_on_app_form, sort_order, is_active)
VALUES
('WU2026', 'practice', 'extra_practice_hr_regular', '[P] Extra Practice (Std)', 'Extra Practice – Standard Boat Rental (Per Hr)', '額外練習 – 標準龍租船費 (每小時)', 600, 0, 999, true, 1, true),
('WU2026', 'practice', 'extra_practice_sb_hr_regular', '[P] Extra Practice (SB)', 'Extra Practice – Small Boat Rental (Per Hr)', '額外練習 – 小龍租船費 (每小時)', 1150, 0, 999, true, 2, true),
('WU2026', 'practice', 'morning_night_practice_extra', '[P] Morning/Night Practice', 'Early Morning/Night Practice - Extra Charge (Per Hr)', '清晨/晚間練習 - 額外收費 (每小時)', 800, 0, 999, true, 3, true),
('WU2026', 'practice', 'practice_trainer', '[P] Trainer', 'Practice - Official Trainer', '練習 - 大會教練', 550, 0, 999, true, 4, true),
('WU2026', 'practice', 'practice_steerer', '[P] Steerer', 'Practice - Official Steerer', '練習 - 大會舵手', 350, 0, 999, true, 5, true),
('WU2026', 'practice', 'practice_steerer_onsite', '[P] Steerer - On Site', 'Practice - Official Steerer - On Site Request', '練習 - 大會舵手 - 練習即日聘用', 700, 0, 999, true, 6, true),
('WU2026', 'practice', 'practice_admin_charge', '[P] Admin Charge', 'Admin Charge', '行政費', 500, 0, 999, false, 99, true)
ON CONFLICT (event_short_ref, order_item_code) DO UPDATE
SET order_item_type = EXCLUDED.order_item_type,
    order_item_short_ref = EXCLUDED.order_item_short_ref,
    order_item_title_en  = EXCLUDED.order_item_title_en,
    order_item_title_tc  = EXCLUDED.order_item_title_tc,
    listed_unit_price    = EXCLUDED.listed_unit_price,
    min_order_qty        = EXCLUDED.min_order_qty,
    max_order_qty        = EXCLUDED.max_order_qty,
    show_on_app_form     = EXCLUDED.show_on_app_form,
    sort_order           = EXCLUDED.sort_order,
    is_active            = EXCLUDED.is_active;

-- 5) Sanity: quick peek
-- SELECT event_short_ref, order_item_type, order_item_code, listed_unit_price, sort_order, is_active
-- FROM public.annual_event_order_item_config
-- ORDER BY event_short_ref, order_item_type, sort_order;
```

---

## 5. ui_text.sql

UI Texts (i18n) - Defines localized UI text strings for the application forms.

```sql
-- ============================================
-- UI Texts (i18n) + public view
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Table
CREATE TABLE IF NOT EXISTS public.ui_texts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_short_ref text    NOT NULL,                 -- e.g. 'TN2026'; can also use a wildcard like 'GLOBAL'
  screen          text    NOT NULL,                 -- e.g. 'p1_category', 'p2_teaminfo', 'p3_raceday', 'p4_booking', 'common'
  key             text    NOT NULL,                 -- e.g. 'title', 'subtitle', 'label_org_name', 'btn_next'
  text_en         text    NOT NULL,
  text_tc         text,
  sort_order      int     NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ui_text UNIQUE (event_short_ref, screen, key)
);

-- 1a) Add columns if table existed without them (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ui_texts' AND column_name='sort_order'
  ) THEN
    ALTER TABLE public.ui_texts ADD COLUMN sort_order int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ui_texts' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.ui_texts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='ui_texts' AND constraint_name='uq_ui_text'
  ) THEN
    ALTER TABLE public.ui_texts
      ADD CONSTRAINT uq_ui_text UNIQUE (event_short_ref, screen, key);
  END IF;
END $$;

-- 1b) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ui_texts_updated_at ON public.ui_texts;
CREATE TRIGGER trg_ui_texts_updated_at
BEFORE UPDATE ON public.ui_texts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_ui_texts_event    ON public.ui_texts(event_short_ref);
CREATE INDEX IF NOT EXISTS idx_ui_texts_screen   ON public.ui_texts(screen);
CREATE INDEX IF NOT EXISTS idx_ui_texts_active   ON public.ui_texts(is_active, sort_order);

-- 3) Seed (minimal examples you can extend)
-- Tip: keep screen/key stable; change only text values per event.
INSERT INTO public.ui_texts (event_short_ref, screen, key, text_en, text_tc, sort_order)
VALUES
-- Common buttons
('TN2026','common','btn_back','Back','返回',10),
('TN2026','common','btn_next','Next','下一步',20),

-- Page 1: Category
('TN2026','p1_category','title','Select Race Category','選擇參賽組別',10),
('TN2026','p1_category','entry_options','Entry Options','報名選項',20),
('TN2026','p1_category','teams_label','How many teams?','隊伍數量',30),

-- Page 2: Team info
('TN2026','p2_teaminfo','title','Team & Organization Info','隊伍及機構資料',10),
('TN2026','p2_teaminfo','label_org_name','Organization / Group Name','機構 / 團體名稱',20),
('TN2026','p2_teaminfo','label_address','Mailing Address','通訊地址',30),

-- Page 3: Race-day
('TN2026','p3_raceday','title','Race-Day Arrangements','比賽日安排',10),

-- Page 4: Booking
('TN2026','p4_booking','title','Practice Booking','練習預約',10),
('TN2026','p4_booking','window_hint','Practice window: Jan–Jul (from config)','練習時段：一月至七月（由設定提供）',20)
ON CONFLICT (event_short_ref, screen, key) DO UPDATE
SET text_en   = EXCLUDED.text_en,
    text_tc   = EXCLUDED.text_tc,
    sort_order= EXCLUDED.sort_order,
    is_active = true;

-- 4) Public view (read-only for client)
-- Exposes only non-sensitive, active rows; client can filter by event_short_ref.
CREATE OR REPLACE VIEW public.v_ui_texts_public
AS
SELECT event_short_ref, screen, key, text_en, text_tc, sort_order
FROM public.ui_texts
WHERE is_active = true;

-- (Optional) You can GRANT anon SELECT on the view while keeping RLS on the base table.
-- Example (Supabase):
-- alter table public.ui_texts enable row level security;
-- create policy "ui_texts_read_admin_only" on public.ui_texts
--   for select using (false);  -- deny direct table reads
-- grant select on public.v_ui_texts_public to anon, authenticated;
```

---

## 6. rpc.sql

Remote Procedure Calls - Defines the RPC function to load event configuration as JSON.

```sql
-- ============================================
-- RPC: rpc_load_event_config(event_short_ref text) → jsonb
-- ============================================

CREATE OR REPLACE FUNCTION public.rpc_load_event_config(p_event_short_ref text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event         jsonb;
  _divisions     jsonb;
  _packages      jsonb;
  _race_day      jsonb;
  _practice      jsonb;
  _timeslots     jsonb;
  _ui_texts      jsonb;
BEGIN
  -- 1) Single event row (object)
  SELECT to_jsonb(t)
  INTO _event
  FROM (
    SELECT
      event_short_ref, season, form_enabled,
      practice_start_date, practice_end_date,
      banner_text_en, banner_text_tc,
      config_version, updated_at
    FROM public.v_event_config_public
    WHERE event_short_ref = p_event_short_ref
    LIMIT 1
  ) AS t;

  IF _event IS NULL THEN
    RAISE EXCEPTION 'Event "%" not found in v_event_config_public', p_event_short_ref
      USING ERRCODE = 'NO_DATA_FOUND';
  END IF;

  -- 2) Arrays
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO _divisions
  FROM (
    SELECT
      division_code, name_en, name_tc, is_corporate, sort_order, is_active, by_invitation_only
    FROM public.v_divisions_public
    WHERE event_short_ref = p_event_short_ref
    ORDER BY sort_order, name_en
  ) AS t;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO _packages
  FROM (
    SELECT
      package_code, title_en, title_tc, listed_unit_price,
      included_practice_hours_per_team, tees_qty, padded_shorts_qty, dry_bag_qty,
      sort_order, is_active
    FROM public.v_packages_public
    WHERE event_short_ref = p_event_short_ref
    ORDER BY sort_order
  ) AS t;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO _race_day
  FROM (
    SELECT
      item_code, title_en, title_tc, listed_unit_price,
      min_qty, max_qty, sort_order
    FROM public.v_race_day_items_public
    WHERE event_short_ref = p_event_short_ref
    ORDER BY sort_order
  ) AS t;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO _practice
  FROM (
    SELECT
      item_code, title_en, title_tc, listed_unit_price,
      sort_order, is_active
    FROM public.v_practice_items_public
    WHERE event_short_ref = p_event_short_ref
    ORDER BY sort_order
  ) AS t;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO _timeslots
  FROM (
    SELECT
      slot_code, label, start_time, end_time,
      day_of_week, duration_hours, sort_order
    FROM public.v_timeslots_public
    ORDER BY duration_hours, day_of_week NULLS LAST, start_time
  ) AS t;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO _ui_texts
  FROM (
    SELECT
      screen, key, text_en, text_tc, sort_order
    FROM public.v_ui_texts_public
    WHERE event_short_ref = p_event_short_ref
    ORDER BY screen, sort_order
  ) AS t;

  -- 3) Final payload
  RETURN jsonb_build_object(
    'event',         _event,
    'divisions',     _divisions,
    'packages',      _packages,
    'raceDay',       _race_day,
    'practiceItems', _practice,
    'timeslots',     _timeslots,
    'uiTexts',       _ui_texts
  );
END;
$$;

-- Optional: ensure the function owner can read the views
-- (In Supabase this is usually already true for the postgres owner.)

-- Allow clients to call it
GRANT EXECUTE ON FUNCTION public.rpc_load_event_config(text) TO anon, authenticated;
```

---

## 7. view.sql

Database Views - Creates public read-only views for client applications.

```sql
-- ============================================
-- Public views (client read-only)
-- ============================================

-- 1) v_event_config_public
-- Only create if annual_event_config table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_event_config') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_event_config_public';
    EXECUTE 'CREATE VIEW public.v_event_config_public AS
    SELECT
      event_short_ref,
      season,
      form_enabled,
      practice_start_date,
      practice_end_date,
      banner_text_en,
      banner_text_tc,
      config_version,
      updated_at,
      event_long_name_en,
      event_long_name_tc,
      event_date_en,
      event_date_tc,
      event_date,
      event_location_en,
      event_location_tc
    FROM public.annual_event_config';
  END IF;
END $$;
-- client filters by event_short_ref

-- 2) v_divisions_public
--   division_code = div_code_prefix
--   name_* = main [– sub] (if sub present)
--   is_active derived from status='active'
-- Only create if required tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_event_division_map') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'division_config_general') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_divisions_public';
    EXECUTE 'CREATE VIEW public.v_divisions_public AS
    SELECT
      aedm.event_short_ref,
      d.div_code_prefix          AS division_code,
      CASE WHEN d.div_sub_name_en IS NOT NULL AND btrim(d.div_sub_name_en) <> ''''
           THEN d.div_main_name_en || '' – '' || d.div_sub_name_en
           ELSE d.div_main_name_en
      END                         AS name_en,
      CASE WHEN d.div_sub_name_tc IS NOT NULL AND btrim(d.div_sub_name_tc) <> ''''
           THEN d.div_main_name_tc || '' – '' || d.div_sub_name_tc
           ELSE d.div_main_name_tc
      END                         AS name_tc,
      d.is_corporate,
      COALESCE(d.sort_order,0)   AS sort_order,
      (d.status = ''active'')      AS is_active,
      d.by_invitation_only
    FROM public.annual_event_division_map aedm
    JOIN public.division_config_general d
      ON d.div_id = aedm.div_id
    WHERE d.status = ''active''
    ORDER BY COALESCE(d.sort_order,0), d.div_main_name_en';
  END IF;
END $$;

-- 3) v_packages_public (order_item_type='package')
--   included_practice_hours_per_team ← practice_hr_std
--   tees_qty ← package_souvenir_tshirt
--   padded_shorts_qty ← package_padded_shorts
--   dry_bag_qty ← package_dry_bag
--   is_active aliased from show_on_app_form (until is_active column exists)
-- Only create if annual_event_order_item_config table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_event_order_item_config') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_packages_public';
    EXECUTE 'CREATE VIEW public.v_packages_public AS
    SELECT
      event_short_ref,
      order_item_code                         AS package_code,
      order_item_title_en                     AS title_en,
      order_item_title_tc                     AS title_tc,
      listed_unit_price,
      COALESCE(practice_hr_std,0)             AS included_practice_hours_per_team,
      COALESCE(package_souvenir_tshirt,0)     AS tees_qty,
      COALESCE(package_padded_shorts,0)       AS padded_shorts_qty,
      COALESCE(package_dry_bag,0)             AS dry_bag_qty,
      COALESCE(sort_order,0)                  AS sort_order,
      show_on_app_form                        AS is_active
    FROM public.annual_event_order_item_config
    WHERE order_item_type = ''package''
      AND show_on_app_form = true
    ORDER BY COALESCE(sort_order,0)';
  END IF;
END $$;

-- 4) v_race_day_items_public (order_item_type='race_day_arrangement')
--   min_qty/max_qty ← min_order_qty/max_order_qty
-- Only create if annual_event_order_item_config table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_event_order_item_config') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_race_day_items_public';
    EXECUTE 'CREATE VIEW public.v_race_day_items_public AS
    SELECT
      event_short_ref,
      order_item_code         AS item_code,
      order_item_title_en     AS title_en,
      order_item_title_tc     AS title_tc,
      listed_unit_price,
      COALESCE(min_order_qty,0)  AS min_qty,
      max_order_qty              AS max_qty,
      COALESCE(sort_order,0)     AS sort_order
    FROM public.annual_event_order_item_config
    WHERE order_item_type = ''race_day_arrangement''
      AND show_on_app_form = true
    ORDER BY COALESCE(sort_order,0)';
  END IF;
END $$;

-- 5) v_practice_items_public (order_item_type='practice')
--   is_active aliased from show_on_app_form (until is_active column exists)
-- Only create if annual_event_order_item_config table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_event_order_item_config') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_practice_items_public';
    EXECUTE 'CREATE VIEW public.v_practice_items_public AS
    SELECT
      event_short_ref,
      order_item_code     AS item_code,
      order_item_title_en AS title_en,
      order_item_title_tc AS title_tc,
      listed_unit_price,
      COALESCE(sort_order,0) AS sort_order,
      show_on_app_form       AS is_active
    FROM public.annual_event_order_item_config
    WHERE order_item_type = ''practice''
      AND show_on_app_form = true
    ORDER BY COALESCE(sort_order,0)';
  END IF;
END $$;

-- 6) v_timeslots_public (bilingual support)
-- Only create if timeslot_catalog table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timeslot_catalog') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_timeslots_public';
    EXECUTE 'CREATE VIEW public.v_timeslots_public AS
    SELECT
      slot_code,
      label AS label_en,
      COALESCE(label_tc, label) AS label_tc,
      -- Computed day name in English
      CASE day_of_week
        WHEN 0 THEN ''Sunday''
        WHEN 1 THEN ''Monday''
        WHEN 2 THEN ''Tuesday''
        WHEN 3 THEN ''Wednesday''
        WHEN 4 THEN ''Thursday''
        WHEN 5 THEN ''Friday''
        WHEN 6 THEN ''Saturday''
        ELSE ''Weekday''
      END AS day_name_en,
      -- Computed day name in Traditional Chinese
      CASE day_of_week
        WHEN 0 THEN ''星期日''
        WHEN 1 THEN ''星期一''
        WHEN 2 THEN ''星期二''
        WHEN 3 THEN ''星期三''
        WHEN 4 THEN ''星期四''
        WHEN 5 THEN ''星期五''
        WHEN 6 THEN ''星期六''
        ELSE ''平日''
      END AS day_name_tc,
      start_time,
      end_time,
      day_of_week,
      duration_hours,
      COALESCE(sort_order,0) AS sort_order
    FROM public.timeslot_catalog
    WHERE is_active = true
    ORDER BY COALESCE(sort_order,0)';
  END IF;
END $$;

-- 7) v_ui_texts_public
-- Only create if ui_texts table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ui_texts') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_ui_texts_public';
    EXECUTE 'CREATE VIEW public.v_ui_texts_public AS
    SELECT
      event_short_ref,
      screen,
      key,
      text_en,
      text_tc,
      COALESCE(sort_order,0) AS sort_order
    FROM public.ui_texts
    WHERE is_active = true
    ORDER BY screen, COALESCE(sort_order,0)';
  END IF;
END $$;
```

---

## 8. secdef.sql

Security Definitions - Configures RLS policies and function permissions for secure access.

```sql
-- 0) Sanity: make sure the function exists
-- \df+ public.rpc_load_event_config

-- 1) Set the function owner to a powerful role (usually "postgres" in Supabase)
ALTER FUNCTION public.rpc_load_event_config(text) OWNER TO postgres;

-- 2) (Defense-in-depth) Ensure the function has a fixed search_path (already in the CREATE, but enforce anyway)
-- If you need to rewrite: CREATE OR REPLACE FUNCTION ... SECURITY DEFINER SET search_path = public ...

-- 3) Revoke broad execute; then grant narrowly
REVOKE ALL ON FUNCTION public.rpc_load_event_config(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_load_event_config(text) TO anon, authenticated;

-- 4) Deny direct reads on the public views if you want RPC-only access
GRANT SELECT ON
  public.v_event_config_public,
  public.v_divisions_public,
  public.v_packages_public,
  public.v_race_day_items_public,
  public.v_practice_items_public,
  public.v_timeslots_public,
  public.v_ui_texts_public
TO anon, authenticated;

-- 5) Enable RLS on base tables (if not already) and ensure there are no permissive policies
-- (Views don't have RLS; base tables do. The postgres owner bypasses RLS when executing the function.)
ALTER TABLE public.annual_event_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_event_division_map      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.division_config_general        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_event_order_item_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeslot_catalog               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_texts                       ENABLE ROW LEVEL SECURITY;

-- Add permissive policies for public read access through views
CREATE POLICY "allow_public_read_annual_event_config" ON public.annual_event_config 
  FOR SELECT USING (true);

CREATE POLICY "allow_public_read_division_config" ON public.division_config_general 
  FOR SELECT USING (true);

CREATE POLICY "allow_public_read_order_item_config" ON public.annual_event_order_item_config 
  FOR SELECT USING (true);

CREATE POLICY "allow_public_read_timeslot_catalog" ON public.timeslot_catalog 
  FOR SELECT USING (true);

CREATE POLICY "allow_public_read_ui_texts" ON public.ui_texts 
  FOR SELECT USING (true);
```

---

## 9. unique_client_tx_id.sql

Unique Client Transaction ID - Adds unique constraint to prevent duplicate form submissions.

```sql
-- Add unique constraint on (event_short_ref, client_tx_id) to prevent duplicate submissions
-- This ensures idempotency for form submissions

-- First, add the client_tx_id column if it doesn't exist
ALTER TABLE public.registration_meta 
ADD COLUMN IF NOT EXISTS client_tx_id text;

-- Add unique constraint to prevent duplicate submissions
ALTER TABLE public.registration_meta 
ADD CONSTRAINT uniq_registration_client_tx 
UNIQUE (event_short_ref, client_tx_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_registration_meta_client_tx 
ON public.registration_meta (event_short_ref, client_tx_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT uniq_registration_client_tx ON public.registration_meta 
IS 'Ensures idempotency: same client_tx_id + event_short_ref cannot be submitted twice';
```

---

## Execution Order

The recommended execution order for these SQL files is:

1. `event.sql` - Creates event type catalog
2. `division.sql` - Creates division configurations
3. `annual.sql` - Creates annual event configs and division mappings
4. `order.sql` - Creates order item configurations (depends on annual_event_config and division_config_general)
5. `ui_text.sql` - Creates UI text translations
6. `view.sql` - Creates public views (depends on all base tables)
7. `rpc.sql` - Creates RPC function (depends on views)
8. `secdef.sql` - Configures security (depends on RPC function and views)
9. `unique_client_tx_id.sql` - Adds idempotency constraint (independent)

---

**End of Configuration Files**
