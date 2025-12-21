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

-- RACE-DAY ARRANGEMENTS (TN2026)
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, listed_unit_price,
 min_order_qty, max_order_qty, show_on_app_form, sort_order, is_active)
VALUES
-- Athlete Marquee (HK$800 from Excel Row 50)
('TN2026', 'race_day_arrangement', 'rd_marquee', '[RD] Marquee',
 'Athlete Marquee', '帳篷', 800, 0, 20, true, 1, true),
-- Official Steersman With Practice (HK$800 from Excel Row 52)
('TN2026', 'race_day_arrangement', 'rd_steerer', '[RD] Steerer',
 'Official Steerer', '大會舵手', 800, 0, 1, true, 2, true),
-- Official Steersman Without Practice (HK$1500 from Excel Row 53)
('TN2026', 'race_day_arrangement', 'rd_steerer_no_practice', '[RD] Steerer (X Practice)',
 'Official Steerer', '大會舵手', 1500, 0, 1, true, 3, true),
-- Boat registrations
('TN2026', 'race_day_arrangement', 'rd_junk', '[RD] Junk',
 'Junk Registration', '遊艇登記', 2500, 0, 5, true, 4, true),
('TN2026', 'race_day_arrangement', 'rd_speedboat', '[RD] Speedboat',
 'Speed Boat Registration', '快艇登記', 1500, 0, 5, true, 5, true)
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

-- PRACTICE FEES (TN2026)
INSERT INTO public.annual_event_order_item_config
(event_short_ref, order_item_type, order_item_code, order_item_short_ref,
 order_item_title_en, order_item_title_tc, listed_unit_price,
 min_order_qty, max_order_qty, show_on_app_form, sort_order, is_active)
VALUES
('TN2026', 'practice', 'extra_practice_hr_regular', '[P] Extra Practice (Std)', 'Extra Practice – Standard Boat Rental (Per Hr)', '額外練習 – 標準龍租船費 (每小時)', 600, 0, 999, true, 1, true),
('TN2026', 'practice', 'morning_night_practice_extra', '[P] Morning/Night Practice', 'Early Morning/Night Practice - Extra Charge (Per Hr)', '清晨/晚間練習 - 額外收費 (每小時)', 800, 0, 999, true, 2, true),
('TN2026', 'practice', 'practice_trainer', '[P] Trainer', 'Practice - Official Trainer', '練習 - 大會教練', 550, 0, 999, true, 3, true),
('TN2026', 'practice', 'practice_steerer', '[P] Steerer', 'Practice - Official Steerer', '練習 - 大會舵手', 350, 0, 999, true, 4, true),
('TN2026', 'practice', 'practice_steerer_onsite', '[P] Steerer - On Site', 'Practice - Official Steerer - On Site Request', '練習 - 大會舵手 - 練習即日聘用', 700, 0, 999, true, 5, true),
('TN2026', 'practice', 'practice_admin_charge', '[P] Admin Charge', 'Admin Charge', '行政費', 500, 0, 999, false, 99, true)
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
