# Registration Number Implementation

## Overview
This document describes the implementation of the `registration_number` column in the `registration_meta` table with auto-generation logic.

## Current Schema

### registration_meta Table (from `db_schema/main.sql`)
```sql
create table public.registration_meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  season int NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  event_type text NOT NULL DEFAULT 'tn' CHECK (event_type IN ('tn', 'wu', 'sc')),
  category text,
  division_code text,
  option_choice text CHECK (option_choice IN ('Option 1','Option 2')),
  team_code text NOT NULL,
  team_name_en citext NOT NULL,
  team_name_tc citext,
  team_name_normalized citext GENERATED ALWAYS AS (...) STORED,
  org_name text,
  org_address text,
  team_manager_1 text NOT NULL,
  mobile_1 text,
  email_1 text,
  team_manager_2 text NOT NULL,
  mobile_2 text,
  email_2 text,
  team_manager_3 text,
  mobile_3 text,
  email_3 text,
  package_choice text,
  team_size int CHECK (team_size BETWEEN 8 AND 25),
  registration_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  client_tx_id text,
  event_short_ref text,
  marquee_qty INTEGER DEFAULT 0 CHECK (marquee_qty >= 0),
  race_day_steersman_option TEXT CHECK (race_day_steersman_option IN ('with_practice', 'no_practice', 'not_required')),
  junk_boat_qty INTEGER DEFAULT 0 CHECK (junk_boat_qty >= 0),
  junk_boat_license_nos TEXT[],
  speed_boat_qty INTEGER DEFAULT 0 CHECK (speed_boat_qty >= 0),
  speed_boat_license_nos TEXT[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ...
);
```

**Note:** The `registration_number` column is NOT currently in the table. It will be added by the migration script.

---

## Implementation

### File: `db_schema/add_registration_number.sql`

This script:
1. Adds the `registration_number` column
2. Creates the `generate_registration_number()` function
3. Backfills existing NULL values
4. Adds unique constraint and index
5. Creates trigger for auto-generation

### Registration Number Format
- **TN events:** `TN2026-001`, `TN2026-002`, `TN2026-003`...
- **WU events:** `WU2026-001`, `WU2026-002`, `WU2026-003`...
- **SC events:** `SC2026-001`, `SC2026-002`, `SC2026-003`...

### Counter Logic
- Separate counter for each event type (TN/WU/SC)
- Separate counter for each year (2026, 2027, etc.)
- Counter starts at 001 for each event type + year combination
- Zero-padded to 3 digits (001, 002, ... 010, ... 100, etc.)

---

## Migration Steps

### 1. Run the Migration Script

Execute `db_schema/add_registration_number.sql` in your Supabase SQL Editor.

The script will:
- Add the column (nullable initially)
- Create the generation function
- Backfill existing rows with registration numbers
- Add unique constraint
- Create index
- Create trigger for future inserts

### 2. Verify Implementation

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'registration_meta'
  AND column_name = 'registration_number';

-- Check unique constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.registration_meta'::regclass
  AND conname = 'uniq_registration_number';

-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'registration_meta'
  AND indexname = 'idx_registration_number';

-- Check trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.registration_meta'::regclass
  AND tgname = 'trigger_auto_registration_number';

-- Test function
SELECT public.generate_registration_number('tn', 2026);  -- Should return TN2026-001
SELECT public.generate_registration_number('wu', 2026);  -- Should return WU2026-001
SELECT public.generate_registration_number('sc', 2026);  -- Should return SC2026-001
```

### 3. Test Auto-Generation

```sql
-- Test insert (registration_number should be auto-generated)
INSERT INTO public.registration_meta (
  season, event_type, division_code, team_code, team_name_en,
  team_manager_1, team_manager_2
) VALUES (
  2026, 'tn', 'M', 'M001', 'Test Team',
  'Manager 1', 'Manager 2'
) RETURNING registration_number;

-- Should return: TN2026-001 (or next in sequence)
```

---

## Function Details

### `generate_registration_number(p_event_type, p_year)`

**Parameters:**
- `p_event_type` (TEXT): Event type ('tn', 'wu', or 'sc')
- `p_year` (INTEGER): Year (defaults to current year)

**Returns:**
- TEXT: Registration number in format `TN2026-001`

**Logic:**
1. Determines prefix (TN, WU, or SC) based on event_type
2. Finds maximum existing number for that prefix + year combination
3. Increments by 1
4. Formats with zero-padding (3 digits)
5. Checks for uniqueness (double-check safety)
6. Returns formatted registration number

**Thread Safety:**
- Uses MAX() query which is safe for concurrent inserts
- Double-checks uniqueness before returning
- Collision detection with retry logic

### `auto_generate_registration_number()` (Trigger Function)

**Trigger:** `trigger_auto_registration_number`
**Timing:** BEFORE INSERT
**Logic:**
- Only generates if `registration_number` is NULL or empty
- Uses `event_type` and `season` (or `created_at` year) to generate number
- Calls `generate_registration_number()` function

---

## Usage

### Automatic (Recommended)
Just insert rows without specifying `registration_number`:
```sql
INSERT INTO registration_meta (season, event_type, ...)
VALUES (2026, 'tn', ...);
-- registration_number will be auto-generated
```

### Manual (Optional)
You can manually set `registration_number` if needed:
```sql
INSERT INTO registration_meta (registration_number, season, event_type, ...)
VALUES ('TN2026-999', 2026, 'tn', ...);
-- Trigger will NOT override manually set values
```

---

## Constraints

- **UNIQUE:** `registration_number` must be unique across all rows
- **Format:** Must match pattern `^[TN|WU|SC][0-9]{4}-[0-9]{3}$`
- **Nullable:** Column allows NULL, but trigger generates value on insert

---

## Notes

1. **Backfilling:** The script backfills existing NULL values based on `created_at` order
2. **Concurrency:** Safe for concurrent inserts (uses MAX() with COALESCE)
3. **Error Handling:** Backfill script uses exception handling to continue on errors
4. **Performance:** Index on `registration_number` ensures fast lookups

---

## Rollback

If you need to remove this feature:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_auto_registration_number ON public.registration_meta;

-- Remove functions
DROP FUNCTION IF EXISTS public.auto_generate_registration_number();
DROP FUNCTION IF EXISTS public.generate_registration_number(TEXT, INTEGER);

-- Remove constraint and column
ALTER TABLE public.registration_meta DROP CONSTRAINT IF EXISTS uniq_registration_number;
DROP INDEX IF EXISTS idx_registration_number;
ALTER TABLE public.registration_meta DROP COLUMN IF EXISTS registration_number;
```

