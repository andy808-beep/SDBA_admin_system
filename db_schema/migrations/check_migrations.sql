-- =========================================================
-- Migration Status Checker
-- Run this to see which migrations have been applied
-- =========================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- Show all applied migrations
SELECT 
  version,
  applied_at,
  description,
  now() - applied_at AS age
FROM public.schema_migrations
ORDER BY applied_at DESC;

-- Show migration files that should exist
-- (You'll need to manually compare with files in db_schema/migrations/ directory)
-- Note: Currently no migrations - this is for future production use
SELECT 
  'Expected migrations:' AS info,
  'None yet - migrations will be added when production deployments begin' AS version;

