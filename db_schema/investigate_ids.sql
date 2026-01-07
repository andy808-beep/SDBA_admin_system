-- =========================================================
-- INVESTIGATION: ID/Code Columns Analysis
-- =========================================================
-- Run these queries in Supabase SQL Editor to understand
-- the current state of ID/code columns
-- =========================================================

-- Query 1: Get ALL columns in registration_meta
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  col_description('registration_meta'::regclass, ordinal_position) as description
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registration_meta'
ORDER BY ordinal_position;

-- Query 2: Get ALL columns in team_meta
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  col_description('team_meta'::regclass, ordinal_position) as description
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_meta'
ORDER BY ordinal_position;

-- Query 3: Check actual data to see how columns are populated
SELECT 
  rm.id as registration_uuid,
  rm.registration_id,
  rm.team_code as reg_meta_team_code,
  rm.registration_number,
  rm.approved_at,
  rm.created_at,
  rm.status,
  tm.id as team_meta_id,
  tm.team_code as team_meta_team_code,
  tm.team_name
FROM registration_meta rm
LEFT JOIN team_meta tm ON rm.team_meta_id = tm.id
ORDER BY rm.created_at DESC
LIMIT 10;

-- Query 4: Check if team_code exists in BOTH tables
SELECT 
  'registration_meta' as table_name,
  COUNT(*) as has_team_code_column
FROM information_schema.columns
WHERE table_name = 'registration_meta' AND column_name = 'team_code'
UNION ALL
SELECT 
  'team_meta' as table_name,
  COUNT(*) as has_team_code_column
FROM information_schema.columns
WHERE table_name = 'team_meta' AND column_name = 'team_code';

-- Query 5: Check for team codes before approval (this is WRONG if it happens)
SELECT 
  rm.id,
  rm.registration_number,
  rm.team_code as reg_meta_team_code,
  rm.approved_at,
  rm.status,
  tm.team_code as team_meta_team_code,
  tm.created_at as team_created_at,
  CASE 
    WHEN rm.team_code IS NOT NULL AND rm.approved_at IS NULL 
      THEN '❌ ERROR: Team code in registration_meta before approval!'
    WHEN tm.team_code IS NOT NULL AND rm.approved_at IS NULL 
      THEN '❌ ERROR: Team code in team_meta before approval!'
    WHEN tm.team_code IS NOT NULL AND rm.approved_at IS NOT NULL 
      THEN '✅ CORRECT: Team code after approval'
    ELSE '⏳ Pending approval (no code yet - correct)'
  END as status
FROM registration_meta rm
LEFT JOIN team_meta tm ON rm.team_meta_id = tm.id
ORDER BY rm.created_at DESC
LIMIT 10;

-- Query 6: Check if registration_id is redundant with id
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN id = registration_id THEN 1 END) as matching,
  COUNT(CASE WHEN id != registration_id THEN 1 END) as different,
  COUNT(CASE WHEN registration_id IS NULL THEN 1 END) as null_registration_id
FROM registration_meta
WHERE registration_id IS NOT NULL;

-- Query 7: Find functions that use registration_id
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%registration_id%'
LIMIT 5;


