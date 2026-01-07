# Migration: Replace JSONB race_day_quantities with Individual Columns

## Overview

This migration replaces the JSONB `race_day_quantities` column in `registration_meta` with 7 individual columns that match the `race_day_requests` table structure.

## Changes Made

### 1. Database Schema Migration
**File:** `db_schema/migration_race_day_columns.sql`

- Adds 7 new columns to `registration_meta`:
  - `marquee_qty INTEGER DEFAULT 0`
  - `steer_with_qty INTEGER DEFAULT 0`
  - `steer_without_qty INTEGER DEFAULT 0`
  - `junk_boat_qty INTEGER DEFAULT 0`
  - `junk_boat_no TEXT`
  - `speed_boat_qty INTEGER DEFAULT 0`
  - `speed_boat_no TEXT`

- Migrates existing JSONB data to new columns
- Updates `approve_registration()` function to use new columns
- Drops old `race_day_quantities` JSONB column (commented out - uncomment after verification)

### 2. Edge Function Update
**File:** `supabase/functions/submit_registration/index.ts`

- Renamed `transformRaceDayToQuantities()` → `transformRaceDayToColumns()`
- Changed return type from JSONB object to individual column values
- Updated INSERT statements to use individual columns instead of JSONB
- Applied to both TN and WU/SC event types

## Migration Steps

### Step 1: Run Migration SQL
```sql
-- Run the migration file
\i db_schema/migration_race_day_columns.sql
```

Or execute the SQL file contents in your database client.

### Step 2: Verify Migration
Run these verification queries:

```sql
-- Check column counts
SELECT 
  COUNT(*) as total_rows,
  COUNT(marquee_qty) as has_marquee,
  COUNT(steer_with_qty) as has_steer_with,
  COUNT(junk_boat_qty) as has_junk_boat,
  COUNT(speed_boat_qty) as has_speed_boat
FROM registration_meta;

-- Check for rows with race day data
SELECT id, team_name_en, marquee_qty, steer_with_qty, junk_boat_qty, speed_boat_qty
FROM registration_meta
WHERE marquee_qty > 0 OR steer_with_qty > 0 OR steer_without_qty > 0 OR junk_boat_qty > 0 OR speed_boat_qty > 0
LIMIT 10;

-- Verify no data loss (compare counts)
SELECT 
  (SELECT COUNT(*) FROM registration_meta WHERE race_day_quantities IS NOT NULL) as old_jsonb_count,
  (SELECT COUNT(*) FROM registration_meta WHERE marquee_qty > 0 OR steer_with_qty > 0 OR steer_without_qty > 0 OR junk_boat_qty > 0 OR speed_boat_qty > 0) as new_column_count;
```

### Step 3: Test Edge Function
1. Submit a test registration with race day items
2. Verify data is inserted into the new columns
3. Check that `approve_registration()` function works correctly

### Step 4: Drop Old Column (After Verification)
Once you've verified everything works:
1. Uncomment the DROP COLUMN statement in the migration file
2. Run it:
```sql
ALTER TABLE public.registration_meta DROP COLUMN IF EXISTS race_day_quantities;
```

## Code Changes Summary

### Database Function: `approve_registration()`

**Before:**
- Read from JSONB: `v_race_day_quantities jsonb`
- Extract values: `(v_race_day_quantities->>'marquee_qty')::int`

**After:**
- Read directly from columns: `reg_record.marquee_qty`
- Check for data: `v_has_race_day_data := (reg_id = v_primary_reg_id)`
- Use column values directly: `COALESCE(reg_record.marquee_qty, 0)`

### Edge Function: `submit_registration/index.ts`

**Before:**
```typescript
const raceDayQuantities = transformRaceDayToQuantities(race_day);
// Returns: { marquee_qty: 1, steer_with_qty: 2, ... }

race_day_quantities: idx === 0 ? raceDayQuantities : null
```

**After:**
```typescript
const raceDayColumns = transformRaceDayToColumns(race_day);
// Returns: { marquee_qty: 1, steer_with_qty: 2, junk_boat_no: "ABC", ... }

...(idx === 0 && raceDayColumns ? {
  marquee_qty: raceDayColumns.marquee_qty,
  steer_with_qty: raceDayColumns.steer_with_qty,
  // ... etc
} : {})
```

## Benefits

1. **Normalized Schema**: Individual columns are more efficient than JSONB
2. **Type Safety**: Database enforces INTEGER types and CHECK constraints
3. **Better Querying**: Can index and query individual columns
4. **Consistency**: Matches `race_day_requests` table structure
5. **Performance**: Direct column access is faster than JSONB extraction

## Rollback Plan

If you need to rollback:

1. **Restore JSONB column:**
```sql
ALTER TABLE public.registration_meta 
  ADD COLUMN race_day_quantities jsonb;
```

2. **Migrate data back:**
```sql
UPDATE registration_meta
SET race_day_quantities = jsonb_build_object(
  'marquee_qty', marquee_qty,
  'steer_with_qty', steer_with_qty,
  'steer_without_qty', steer_without_qty,
  'junk_boat_qty', junk_boat_qty,
  'junk_boat_no', junk_boat_no,
  'speed_boat_qty', speed_boat_qty,
  'speed_boat_no', speed_boat_no
)
WHERE marquee_qty > 0 OR steer_with_qty > 0 OR steer_without_qty > 0 
   OR junk_boat_qty > 0 OR speed_boat_qty > 0;
```

3. **Revert edge function** to previous version
4. **Revert database function** to previous version

## Files Modified

1. ✅ `db_schema/migration_race_day_columns.sql` - New migration file
2. ✅ `supabase/functions/submit_registration/index.ts` - Updated edge function
3. ⚠️ `db_schema/main.sql` - Should be updated to reflect new column structure (optional - for documentation)

## Next Steps

1. Review the migration SQL
2. Run migration in development/staging environment first
3. Verify data migration
4. Test edge function submissions
5. Test approve_registration function
6. Deploy to production
7. Drop old JSONB column after verification period


