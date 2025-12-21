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

-- 3) Remove old 2025 events (cleanup before seeding 2026)
DELETE FROM public.annual_event_division_map WHERE event_short_ref LIKE '%2025';
DELETE FROM public.annual_event_config WHERE season = 2025;
DELETE FROM public.annual_event_config WHERE event_short_ref LIKE '%2025';

-- Verify only 2026 events remain (optional check - comment out in production)
-- SELECT event_short_ref, event_long_name_en, season 
-- FROM public.annual_event_config 
-- ORDER BY event_short_ref;

-- 3a) Seed / Upsert events with practice window + flags
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
