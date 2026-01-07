-- =========================================================
-- MIGRATION: Add registration_number column with auto-generation
-- =========================================================
-- This migration adds the registration_number column to registration_meta
-- and sets up auto-generation via trigger (format: TN2026-001, WU2026-001, SC2026-001)
--
-- Run this in Supabase SQL Editor
-- =========================================================

-- 1. Add registration_number column (if not exists)
ALTER TABLE public.registration_meta 
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(20);

-- 2. Add unique constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uniq_registration_number' 
    AND conrelid = 'public.registration_meta'::regclass
  ) THEN
    ALTER TABLE public.registration_meta 
    ADD CONSTRAINT uniq_registration_number UNIQUE (registration_number);
  END IF;
END $$;

-- 3. Add index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_registration_number 
ON public.registration_meta(registration_number);

-- 4. Create function to generate unique registration numbers
CREATE OR REPLACE FUNCTION public.generate_registration_number(
  p_event_type TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_registration_number TEXT;
  v_pattern TEXT;
BEGIN
  -- Validate event type and determine prefix
  IF UPPER(p_event_type) = 'TN' OR LOWER(p_event_type) = 'tn' THEN
    v_prefix := 'TN';
  ELSIF UPPER(p_event_type) = 'WU' OR LOWER(p_event_type) = 'wu' THEN
    v_prefix := 'WU';
  ELSIF UPPER(p_event_type) = 'SC' OR LOWER(p_event_type) = 'sc' THEN
    v_prefix := 'SC';
  ELSE
    RAISE EXCEPTION 'Invalid event_type: %. Must be TN, WU, or SC', p_event_type;
  END IF;

  -- Build pattern for matching existing registration numbers
  v_pattern := '^' || v_prefix || p_year::TEXT || '-([0-9]+)$';

  -- Get the next sequence number for this event type and year
  -- Find the maximum number already used for this prefix+year combination
  SELECT COALESCE(
    MAX(
      CAST(
        (regexp_match(registration_number, v_pattern))[1]
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO v_next_number
  FROM public.registration_meta
  WHERE registration_number IS NOT NULL
    AND registration_number ~ v_pattern;

  -- Format the registration number with zero-padding (001, 002, etc.)
  v_registration_number := v_prefix || p_year::TEXT || '-' || LPAD(v_next_number::TEXT, 3, '0');

  -- Check for uniqueness (should be unique due to MAX + 1, but double-check for safety)
  IF EXISTS (SELECT 1 FROM public.registration_meta WHERE registration_number = v_registration_number) THEN
    -- If collision occurs, try next number (shouldn't happen, but safety check)
    v_next_number := v_next_number + 1;
    v_registration_number := v_prefix || p_year::TEXT || '-' || LPAD(v_next_number::TEXT, 3, '0');
    
    -- If still exists, raise exception
    IF EXISTS (SELECT 1 FROM public.registration_meta WHERE registration_number = v_registration_number) THEN
      RAISE EXCEPTION 'Registration number collision detected for %. Please retry.', v_registration_number;
    END IF;
  END IF;

  RETURN v_registration_number;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.generate_registration_number IS 
'Generates unique registration numbers in format: TN2026-001, WU2026-001, SC2026-001. Counter is separate for each event type and year.';

-- 5. Create trigger function to auto-generate registration_number on insert
CREATE OR REPLACE FUNCTION public.auto_generate_registration_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only generate if registration_number is NULL or empty
  IF NEW.registration_number IS NULL OR TRIM(COALESCE(NEW.registration_number, '')) = '' THEN
    -- Extract year from created_at or use season or current year
    NEW.registration_number := public.generate_registration_number(
      COALESCE(NEW.event_type, 'tn'),
      COALESCE(NEW.season, EXTRACT(YEAR FROM COALESCE(NEW.created_at, CURRENT_TIMESTAMP))::INTEGER)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.auto_generate_registration_number IS 
'Trigger function that automatically generates registration_number before insert if it is NULL';

-- 6. Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trigger_auto_registration_number ON public.registration_meta;

CREATE TRIGGER trigger_auto_registration_number
  BEFORE INSERT ON public.registration_meta
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_registration_number();

-- Add comment
COMMENT ON TRIGGER trigger_auto_registration_number ON public.registration_meta IS 
'Automatically generates registration_number before insert if not provided';

-- Add column comment
COMMENT ON COLUMN public.registration_meta.registration_number IS 
'Unique registration ID in format: TN2026-001, WU2026-001, SC2026-001';

-- 7. Backfill existing rows (generate registration numbers for existing registrations)
DO $$
DECLARE
  rec RECORD;
  new_reg_num TEXT;
BEGIN
  -- Generate registration numbers for existing rows that don't have one
  FOR rec IN 
    SELECT id, event_type, season, created_at 
    FROM public.registration_meta 
    WHERE registration_number IS NULL OR TRIM(COALESCE(registration_number, '')) = ''
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Generate registration number for this row
      new_reg_num := public.generate_registration_number(
        rec.event_type,
        rec.season
      );
      
      -- Update the row
      UPDATE public.registration_meta
      SET registration_number = new_reg_num
      WHERE id = rec.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other rows
        RAISE WARNING 'Failed to generate registration_number for id %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- 8. Test the function (optional - comment out if you don't want test output)
-- SELECT public.generate_registration_number('TN', 2026) AS tn_test;
-- SELECT public.generate_registration_number('WU', 2026) AS wu_test;
-- SELECT public.generate_registration_number('SC', 2026) AS sc_test;

-- 9. Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'registration_meta' 
  AND column_name = 'registration_number';

-- 10. Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'registration_meta'
  AND trigger_name = 'trigger_auto_registration_number';


