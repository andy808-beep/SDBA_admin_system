-- =========================================================
-- ADMIN EDIT FUNCTIONALITY FOR REGISTRATIONS
-- =========================================================
-- This migration adds:
-- 1. registration_meta_audit table for tracking changes
-- 2. Audit trigger function and trigger
-- 3. update_registration function for admin edits
-- =========================================================

-- =========================================================
-- 1. REGISTRATION META AUDIT TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.registration_meta_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  row_id uuid,
  old_row jsonb,
  new_row jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS but don't add policies (trigger needs to write freely)
ALTER TABLE public.registration_meta_audit ENABLE ROW LEVEL SECURITY;

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_registration_meta_audit_row_id ON public.registration_meta_audit (row_id);
CREATE INDEX IF NOT EXISTS idx_registration_meta_audit_changed_at ON public.registration_meta_audit (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_meta_audit_changed_by ON public.registration_meta_audit (changed_by);

-- =========================================================
-- 2. AUDIT TRIGGER FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION public.trg_audit_registration_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.registration_meta_audit(action, row_id, old_row, new_row)
    VALUES ('insert', new.id, null, to_jsonb(new));
    RETURN new;
  ELSIF tg_op = 'UPDATE' THEN
    INSERT INTO public.registration_meta_audit(action, row_id, old_row, new_row)
    VALUES ('update', new.id, to_jsonb(old), to_jsonb(new));
    RETURN new;
  ELSE
    INSERT INTO public.registration_meta_audit(action, row_id, old_row, new_row)
    VALUES ('delete', old.id, to_jsonb(old), null);
    RETURN old;
  END IF;
END;
$$;

-- =========================================================
-- 3. AUDIT TRIGGER
-- =========================================================
DROP TRIGGER IF EXISTS trg_registration_meta_audit ON public.registration_meta;
CREATE TRIGGER trg_registration_meta_audit
AFTER INSERT OR UPDATE OR DELETE ON public.registration_meta
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_registration_meta();

-- =========================================================
-- 4. UPDATE REGISTRATION FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_registration(
  reg_id uuid,
  admin_user_id uuid,
  updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg_record public.registration_meta%ROWTYPE;
  editable_fields text[] := ARRAY[
    'team_name_en', 'team_name_tc', 'division_code',
    'option_choice', 'package_choice',
    'org_name', 'org_address',
    'team_manager_1', 'mobile_1', 'email_1',
    'team_manager_2', 'mobile_2', 'email_2',
    'team_manager_3', 'mobile_3', 'email_3',
    'marquee_qty', 'race_day_steersman_option',
    'junk_boat_qty', 'junk_boat_license_nos',
    'speed_boat_qty', 'speed_boat_license_nos',
    'admin_notes'
  ];
  update_key text;
  team_updated boolean := false;
  race_day_updated boolean := false;
  team_id_val uuid;
  race_day_fields text[] := ARRAY['marquee_qty', 'race_day_steersman_option', 'junk_boat_qty', 'junk_boat_license_nos', 'speed_boat_qty', 'speed_boat_license_nos'];
BEGIN
  -- a. Get registration with row-level lock
  SELECT * INTO reg_record
  FROM public.registration_meta
  WHERE id = reg_id
  FOR UPDATE SKIP LOCKED;
  
  -- b. Return error if not found or locked
  IF NOT FOUND THEN
    RAISE EXCEPTION USING 
      ERRCODE = 'P0001',
      MESSAGE = 'Registration not found or locked',
      HINT = format('Registration %s does not exist or is being processed by another admin', reg_id);
  END IF;
  
  -- c. Validate all keys in updates are in editable_fields array
  FOR update_key IN SELECT jsonb_object_keys(updates)
  LOOP
    IF NOT (update_key = ANY(editable_fields)) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23502',
        MESSAGE = format('Field %s is not editable', update_key),
        HINT = format('Editable fields are: %s', array_to_string(editable_fields, ', '));
    END IF;
  END LOOP;
  
  -- Check if any race day fields are being updated
  race_day_updated := EXISTS (
    SELECT 1 FROM jsonb_object_keys(updates) AS key
    WHERE key = ANY(race_day_fields)
  );
  
  -- d. UPDATE registration_meta with COALESCE pattern for each field
  UPDATE public.registration_meta
  SET
    team_name_en = COALESCE((updates->>'team_name_en')::citext, team_name_en),
    team_name_tc = COALESCE((updates->>'team_name_tc')::citext, team_name_tc),
    division_code = COALESCE(updates->>'division_code', division_code),
    option_choice = COALESCE(updates->>'option_choice', option_choice),
    package_choice = COALESCE(updates->>'package_choice', package_choice),
    org_name = COALESCE(updates->>'org_name', org_name),
    org_address = COALESCE(updates->>'org_address', org_address),
    team_manager_1 = COALESCE(updates->>'team_manager_1', team_manager_1),
    mobile_1 = COALESCE(updates->>'mobile_1', mobile_1),
    email_1 = COALESCE(updates->>'email_1', email_1),
    team_manager_2 = COALESCE(updates->>'team_manager_2', team_manager_2),
    mobile_2 = COALESCE(updates->>'mobile_2', mobile_2),
    email_2 = COALESCE(updates->>'email_2', email_2),
    team_manager_3 = COALESCE(updates->>'team_manager_3', team_manager_3),
    mobile_3 = COALESCE(updates->>'mobile_3', mobile_3),
    email_3 = COALESCE(updates->>'email_3', email_3),
    marquee_qty = COALESCE((updates->>'marquee_qty')::int, marquee_qty),
    race_day_steersman_option = COALESCE(updates->>'race_day_steersman_option', race_day_steersman_option),
    junk_boat_qty = COALESCE((updates->>'junk_boat_qty')::int, junk_boat_qty),
    junk_boat_license_nos = COALESCE((updates->'junk_boat_license_nos')::text[], junk_boat_license_nos),
    speed_boat_qty = COALESCE((updates->>'speed_boat_qty')::int, speed_boat_qty),
    speed_boat_license_nos = COALESCE((updates->'speed_boat_license_nos')::text[], speed_boat_license_nos),
    admin_notes = COALESCE(updates->>'admin_notes', admin_notes)
  WHERE id = reg_id;
  
  -- Update the most recent audit record with changed_by (created by the trigger)
  -- Use the max ID to get the most recent record created in this transaction
  UPDATE public.registration_meta_audit
  SET changed_by = admin_user_id
  WHERE id = (
    SELECT MAX(id)
    FROM public.registration_meta_audit
    WHERE row_id = reg_id
      AND action = 'update'
      AND changed_by IS NULL
  );
  
  -- e. If status = 'approved', also update the appropriate team table
  IF reg_record.status = 'approved' THEN
    IF reg_record.event_type = 'tn' THEN
      -- Update team_meta for TN
      UPDATE public.team_meta
      SET
        team_name_en = COALESCE((updates->>'team_name_en')::citext, team_name_en),
        team_name_tc = COALESCE((updates->>'team_name_tc')::citext, team_name_tc),
        division_code = COALESCE(updates->>'division_code', division_code),
        option_choice = COALESCE(updates->>'option_choice', option_choice),
        org_name = COALESCE(updates->>'org_name', org_name),
        org_address = COALESCE(updates->>'org_address', org_address),
        team_manager_1 = COALESCE(updates->>'team_manager_1', team_manager_1),
        mobile_1 = COALESCE(updates->>'mobile_1', mobile_1),
        email_1 = COALESCE(updates->>'email_1', email_1),
        team_manager_2 = COALESCE(updates->>'team_manager_2', team_manager_2),
        mobile_2 = COALESCE(updates->>'mobile_2', mobile_2),
        email_2 = COALESCE(updates->>'email_2', email_2),
        team_manager_3 = COALESCE(updates->>'team_manager_3', team_manager_3),
        mobile_3 = COALESCE(updates->>'mobile_3', mobile_3),
        email_3 = COALESCE(updates->>'email_3', email_3)
      WHERE registration_id = reg_id;
      
      IF FOUND THEN
        team_updated := true;
      END IF;
      
    ELSIF reg_record.event_type = 'wu' THEN
      -- Update wu_team_meta for WU (map from team_manager_1/mobile_1/email_1 to team_manager/mobile/email)
      UPDATE public.wu_team_meta
      SET
        team_name_en = COALESCE((updates->>'team_name_en')::citext, team_name_en),
        team_name_tc = COALESCE((updates->>'team_name_tc')::citext, team_name_tc),
        division_code = COALESCE(updates->>'division_code', division_code),
        package_choice = COALESCE(updates->>'package_choice', package_choice),
        org_name = COALESCE(updates->>'org_name', org_name),
        org_address = COALESCE(updates->>'org_address', org_address),
        team_manager = COALESCE(updates->>'team_manager_1', team_manager),
        mobile = COALESCE(updates->>'mobile_1', mobile),
        email = COALESCE(updates->>'email_1', email)
      WHERE registration_id = reg_id;
      
      IF FOUND THEN
        team_updated := true;
      END IF;
      
    ELSIF reg_record.event_type = 'sc' THEN
      -- Update sc_team_meta for SC (map from team_manager_1/mobile_1/email_1 to team_manager/mobile/email)
      UPDATE public.sc_team_meta
      SET
        team_name_en = COALESCE((updates->>'team_name_en')::citext, team_name_en),
        team_name_tc = COALESCE((updates->>'team_name_tc')::citext, team_name_tc),
        division_code = COALESCE(updates->>'division_code', division_code),
        package_choice = COALESCE(updates->>'package_choice', package_choice),
        org_name = COALESCE(updates->>'org_name', org_name),
        org_address = COALESCE(updates->>'org_address', org_address),
        team_manager = COALESCE(updates->>'team_manager_1', team_manager),
        mobile = COALESCE(updates->>'mobile_1', mobile),
        email = COALESCE(updates->>'email_1', email)
      WHERE registration_id = reg_id;
      
      IF FOUND THEN
        team_updated := true;
      END IF;
    END IF;
    
    -- f. If status = 'approved' AND race day fields changed, also update race day requests
    IF race_day_updated THEN
      IF reg_record.event_type = 'tn' THEN
        -- Get team_id from team_meta
        SELECT id INTO team_id_val
        FROM public.team_meta
        WHERE registration_id = reg_id
        LIMIT 1;
        
        IF team_id_val IS NOT NULL THEN
          -- Use UPDATE with conditional updates based on whether keys exist in updates
          UPDATE public.tn_race_day_requests
          SET
            marquee_qty = CASE WHEN updates ? 'marquee_qty' THEN (updates->>'marquee_qty')::int ELSE marquee_qty END,
            race_day_steersman_option = CASE WHEN updates ? 'race_day_steersman_option' THEN updates->>'race_day_steersman_option' ELSE race_day_steersman_option END,
            junk_boat_qty = CASE WHEN updates ? 'junk_boat_qty' THEN (updates->>'junk_boat_qty')::int ELSE junk_boat_qty END,
            junk_boat_license_nos = CASE WHEN updates ? 'junk_boat_license_nos' THEN (updates->'junk_boat_license_nos')::text[] ELSE junk_boat_license_nos END,
            speed_boat_qty = CASE WHEN updates ? 'speed_boat_qty' THEN (updates->>'speed_boat_qty')::int ELSE speed_boat_qty END,
            speed_boat_license_nos = CASE WHEN updates ? 'speed_boat_license_nos' THEN (updates->'speed_boat_license_nos')::text[] ELSE speed_boat_license_nos END
          WHERE team_id = team_id_val;
          
          -- If no row exists, insert one
          IF NOT FOUND THEN
            INSERT INTO public.tn_race_day_requests (
              team_id, marquee_qty, race_day_steersman_option,
              junk_boat_qty, junk_boat_license_nos,
              speed_boat_qty, speed_boat_license_nos
            )
            VALUES (
              team_id_val,
              COALESCE((updates->>'marquee_qty')::int, 0),
              COALESCE(updates->>'race_day_steersman_option', NULL),
              COALESCE((updates->>'junk_boat_qty')::int, 0),
              COALESCE((updates->'junk_boat_license_nos')::text[], ARRAY[]::text[]),
              COALESCE((updates->>'speed_boat_qty')::int, 0),
              COALESCE((updates->'speed_boat_license_nos')::text[], ARRAY[]::text[])
            );
          END IF;
        END IF;
        
      ELSIF reg_record.event_type = 'wu' THEN
        -- Get team_id from wu_team_meta
        SELECT id INTO team_id_val
        FROM public.wu_team_meta
        WHERE registration_id = reg_id
        LIMIT 1;
        
        IF team_id_val IS NOT NULL THEN
          -- Use UPDATE with conditional updates based on whether keys exist in updates
          UPDATE public.wu_race_day_requests
          SET
            marquee_qty = CASE WHEN updates ? 'marquee_qty' THEN (updates->>'marquee_qty')::int ELSE marquee_qty END,
            race_day_steersman_option = CASE WHEN updates ? 'race_day_steersman_option' THEN updates->>'race_day_steersman_option' ELSE race_day_steersman_option END,
            junk_boat_qty = CASE WHEN updates ? 'junk_boat_qty' THEN (updates->>'junk_boat_qty')::int ELSE junk_boat_qty END,
            junk_boat_license_nos = CASE WHEN updates ? 'junk_boat_license_nos' THEN (updates->'junk_boat_license_nos')::text[] ELSE junk_boat_license_nos END,
            speed_boat_qty = CASE WHEN updates ? 'speed_boat_qty' THEN (updates->>'speed_boat_qty')::int ELSE speed_boat_qty END,
            speed_boat_license_nos = CASE WHEN updates ? 'speed_boat_license_nos' THEN (updates->'speed_boat_license_nos')::text[] ELSE speed_boat_license_nos END
          WHERE team_id = team_id_val;
          
          -- If no row exists, insert one
          IF NOT FOUND THEN
            INSERT INTO public.wu_race_day_requests (
              team_id, marquee_qty, race_day_steersman_option,
              junk_boat_qty, junk_boat_license_nos,
              speed_boat_qty, speed_boat_license_nos
            )
            VALUES (
              team_id_val,
              COALESCE((updates->>'marquee_qty')::int, 0),
              COALESCE(updates->>'race_day_steersman_option', NULL),
              COALESCE((updates->>'junk_boat_qty')::int, 0),
              COALESCE((updates->'junk_boat_license_nos')::text[], ARRAY[]::text[]),
              COALESCE((updates->>'speed_boat_qty')::int, 0),
              COALESCE((updates->'speed_boat_license_nos')::text[], ARRAY[]::text[])
            );
          END IF;
        END IF;
        
      ELSIF reg_record.event_type = 'sc' THEN
        -- Get team_id from sc_team_meta
        SELECT id INTO team_id_val
        FROM public.sc_team_meta
        WHERE registration_id = reg_id
        LIMIT 1;
        
        IF team_id_val IS NOT NULL THEN
          -- Use UPDATE with conditional updates based on whether keys exist in updates
          UPDATE public.sc_race_day_requests
          SET
            marquee_qty = CASE WHEN updates ? 'marquee_qty' THEN (updates->>'marquee_qty')::int ELSE marquee_qty END,
            race_day_steersman_option = CASE WHEN updates ? 'race_day_steersman_option' THEN updates->>'race_day_steersman_option' ELSE race_day_steersman_option END,
            junk_boat_qty = CASE WHEN updates ? 'junk_boat_qty' THEN (updates->>'junk_boat_qty')::int ELSE junk_boat_qty END,
            junk_boat_license_nos = CASE WHEN updates ? 'junk_boat_license_nos' THEN (updates->'junk_boat_license_nos')::text[] ELSE junk_boat_license_nos END,
            speed_boat_qty = CASE WHEN updates ? 'speed_boat_qty' THEN (updates->>'speed_boat_qty')::int ELSE speed_boat_qty END,
            speed_boat_license_nos = CASE WHEN updates ? 'speed_boat_license_nos' THEN (updates->'speed_boat_license_nos')::text[] ELSE speed_boat_license_nos END
          WHERE team_id = team_id_val;
          
          -- If no row exists, insert one
          IF NOT FOUND THEN
            INSERT INTO public.sc_race_day_requests (
              team_id, marquee_qty, race_day_steersman_option,
              junk_boat_qty, junk_boat_license_nos,
              speed_boat_qty, speed_boat_license_nos
            )
            VALUES (
              team_id_val,
              COALESCE((updates->>'marquee_qty')::int, 0),
              COALESCE(updates->>'race_day_steersman_option', NULL),
              COALESCE((updates->>'junk_boat_qty')::int, 0),
              COALESCE((updates->'junk_boat_license_nos')::text[], ARRAY[]::text[]),
              COALESCE((updates->>'speed_boat_qty')::int, 0),
              COALESCE((updates->'speed_boat_license_nos')::text[], ARRAY[]::text[])
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Get updated registration status and event_type
  SELECT status, event_type INTO reg_record.status, reg_record.event_type
  FROM public.registration_meta
  WHERE id = reg_id;
  
  -- g. Return jsonb with success, registration_id, status, event_type, team_updated
  RETURN jsonb_build_object(
    'success', true,
    'registration_id', reg_id,
    'status', reg_record.status,
    'event_type', reg_record.event_type,
    'team_updated', team_updated
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with context
    RAISE;
END;
$$;

-- =========================================================
-- 5. FUNCTION COMMENT
-- =========================================================
COMMENT ON FUNCTION public.update_registration(uuid, uuid, jsonb) IS 
'Updates a registration record with admin-provided changes. 
Validates that only editable fields are updated.
If the registration status is "approved", also updates the corresponding team table (team_meta, wu_team_meta, or sc_team_meta).
If race day fields are updated and status is "approved", also updates the corresponding race_day_requests table.
Uses row-level locking (FOR UPDATE SKIP LOCKED) to prevent concurrent edits.
Returns a jsonb object with success status, registration_id, status, event_type, and team_updated flag.';

