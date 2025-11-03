-- Verification queries for testing
-- Run these after approving a TN registration

-- 1. Check that TN approval created a row in team_meta with same team_code
SELECT 
  tm.id as team_meta_id,
  tm.team_code,
  tm.team_name,
  tm.season,
  tm.category,
  tm.division_code,
  rm.id as registration_id,
  rm.team_code as registration_team_code,
  rm.status as registration_status,
  rm.approved_by,
  rm.approved_at
FROM public.team_meta tm
LEFT JOIN public.registration_meta rm ON tm.registration_id = rm.id
WHERE rm.event_type = 'tn' 
  AND rm.status = 'approved'
ORDER BY rm.approved_at DESC
LIMIT 5;

-- 2. Check that registration_meta status was updated after approval
SELECT 
  id,
  event_type,
  division_code,
  team_name,
  team_code,
  status,
  approved_by,
  approved_at,
  admin_notes
FROM public.registration_meta
WHERE status IN ('approved', 'rejected')
ORDER BY approved_at DESC
LIMIT 10;

-- 3. Count pending registrations
SELECT 
  event_type,
  division_code,
  COUNT(*) as pending_count
FROM public.registration_meta
WHERE status = 'pending'
GROUP BY event_type, division_code
ORDER BY event_type, division_code;

