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
      division_code, name_en, name_tc, is_corporate, sort_order, is_active
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
