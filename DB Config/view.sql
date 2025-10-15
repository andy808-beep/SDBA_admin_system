-- ============================================
-- Public views (client read-only)
-- ============================================

-- 1) v_event_config_public
CREATE OR REPLACE VIEW public.v_event_config_public AS
SELECT
  event_short_ref,
  season,
  form_enabled,
  practice_start_date,
  practice_end_date,
  banner_text_en,
  banner_text_tc,
  config_version,
  updated_at
FROM public.annual_event_config;
-- client filters by event_short_ref

-- 2) v_divisions_public
--   division_code = div_code_prefix
--   name_* = main [– sub] (if sub present)
--   is_active derived from status='active'
CREATE OR REPLACE VIEW public.v_divisions_public AS
SELECT
  aedm.event_short_ref,
  d.div_code_prefix          AS division_code,
  CASE WHEN d.div_sub_name_en IS NOT NULL AND btrim(d.div_sub_name_en) <> ''
       THEN d.div_main_name_en || ' – ' || d.div_sub_name_en
       ELSE d.div_main_name_en
  END                         AS name_en,
  CASE WHEN d.div_sub_name_tc IS NOT NULL AND btrim(d.div_sub_name_tc) <> ''
       THEN d.div_main_name_tc || ' – ' || d.div_sub_name_tc
       ELSE d.div_main_name_tc
  END                         AS name_tc,
  d.is_corporate,
  COALESCE(d.sort_order,0)   AS sort_order,
  (d.status = 'active')      AS is_active
FROM public.annual_event_division_map aedm
JOIN public.division_config_general d
  ON d.div_id = aedm.div_id
WHERE d.status = 'active'
ORDER BY COALESCE(d.sort_order,0), d.div_main_name_en;

-- 3) v_packages_public (order_item_type='package')
--   included_practice_hours_per_team ← practice_hr_std
--   tees_qty ← package_souvenir_tshirt
--   padded_shorts_qty ← package_padded_shorts
--   dry_bag_qty ← package_dry_bag
--   is_active aliased from show_on_app_form (until is_active column exists)
CREATE OR REPLACE VIEW public.v_packages_public AS
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
WHERE order_item_type = 'package'
  AND show_on_app_form = true
ORDER BY COALESCE(sort_order,0);

-- 4) v_race_day_items_public (order_item_type='race_day_arrangement')
--   min_qty/max_qty ← min_order_qty/max_order_qty
CREATE OR REPLACE VIEW public.v_race_day_items_public AS
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
WHERE order_item_type = 'race_day_arrangement'
  AND show_on_app_form = true
ORDER BY COALESCE(sort_order,0);

-- 5) v_practice_items_public (order_item_type='practice')
--   is_active aliased from show_on_app_form (until is_active column exists)
CREATE OR REPLACE VIEW public.v_practice_items_public AS
SELECT
  event_short_ref,
  order_item_code     AS item_code,
  order_item_title_en AS title_en,
  order_item_title_tc AS title_tc,
  listed_unit_price,
  COALESCE(sort_order,0) AS sort_order,
  show_on_app_form       AS is_active
FROM public.annual_event_order_item_config
WHERE order_item_type = 'practice'
  AND show_on_app_form = true
ORDER BY COALESCE(sort_order,0);

-- 6) v_timeslots_public
CREATE OR REPLACE VIEW public.v_timeslots_public AS
SELECT
  slot_code,
  label,
  start_time,
  end_time,
  day_of_week,
  duration_hours,
  COALESCE(sort_order,0) AS sort_order
FROM public.timeslot_catalog
WHERE is_active = true
ORDER BY duration_hours, day_of_week NULLS LAST, start_time;

-- 7) v_ui_texts_public
CREATE OR REPLACE VIEW public.v_ui_texts_public AS
SELECT
  event_short_ref,
  screen,
  key,
  text_en,
  text_tc,
  COALESCE(sort_order,0) AS sort_order
FROM public.ui_texts
WHERE is_active = true
ORDER BY screen, COALESCE(sort_order,0);
