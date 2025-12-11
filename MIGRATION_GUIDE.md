# SQL Migration Best Practices Guide

## Overview

This guide explains how to safely patch your production database while keeping `main.sql` as your single source of truth.

**Note:** Currently not in production - using `main.sql` as single source of truth. This guide is for future production deployments.

---

## The Problem

- **Development:** `main.sql` is perfect - it's the complete schema
- **Production:** You can't just run `main.sql` because:
  - It has `DROP TABLE` statements (would delete all data!)
  - It recreates everything from scratch
  - You need incremental, safe changes

---

## The Solution: Two-Track Approach

### Track 1: `main.sql` (Source of Truth)
- **Purpose:** Complete schema definition
- **Use:** New environments, development, documentation
- **Never run directly on production!**

### Track 2: Migration Files (Production Patches)
- **Purpose:** Incremental, safe changes
- **Use:** Production updates, hotfixes
- **Properties:** Idempotent, non-destructive, reversible

---

## Migration File Naming Convention

```
migrations/
  ├── 001_initial_schema.sql          (baseline - matches main.sql)
  ├── 002_fix_approve_function.sql    (your current fix)
  ├── 003_add_index_performance.sql   (future migrations)
  └── ...
```

**Format:** `{number}_{descriptive_name}.sql`

---

## Migration Best Practices

### ✅ DO: Make Migrations Idempotent

**Idempotent = Safe to run multiple times**

```sql
-- ✅ GOOD: Idempotent
CREATE OR REPLACE FUNCTION public.approve_registration(...) AS $$ ... $$;

-- ✅ GOOD: Idempotent
CREATE INDEX IF NOT EXISTS idx_team_season ON team_meta(season);

-- ✅ GOOD: Idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_meta' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE team_meta ADD COLUMN new_column text;
  END IF;
END $$;
```

### ❌ DON'T: Destructive Operations Without Checks

```sql
-- ❌ BAD: Will fail if already exists
CREATE FUNCTION public.approve_registration(...) AS $$ ... $$;

-- ❌ BAD: Will drop data if run twice
DROP TABLE IF EXISTS registration_meta CASCADE;
CREATE TABLE registration_meta (...);

-- ❌ BAD: Will fail if column doesn't exist
ALTER TABLE team_meta DROP COLUMN old_column;
```

### ✅ DO: Use Transactions

```sql
BEGIN;

-- Your migration here
CREATE OR REPLACE FUNCTION ...;
CREATE INDEX IF NOT EXISTS ...;

COMMIT;
-- If anything fails, everything rolls back
```

### ✅ DO: Check Before Modifying

```sql
-- Check if function exists before modifying
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'approve_registration'
  ) THEN
    -- Safe to replace
    CREATE OR REPLACE FUNCTION ...;
  END IF;
END $$;
```

---

## Migration Tracking System

### Option 1: Simple Migration Table (Recommended)

Create a table to track which migrations have been applied:

```sql
-- Run this ONCE to create the tracking table
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- In each migration file, add at the end:
INSERT INTO public.schema_migrations (version, description)
VALUES ('002_fix_approve_function', 'Fix approve_registration to remove team_name_normalized')
ON CONFLICT (version) DO NOTHING;
```

### Option 2: Supabase Migration System

If using Supabase CLI, migrations are automatically tracked in `.supabase/migrations/`

---

## Your Current Fix: Production-Safe Version

Here's how to structure your current fix as a safe migration:

```sql
-- migrations/002_fix_approve_function.sql
-- Description: Fix approve_registration function to remove team_name_normalized insert
-- Date: 2024-XX-XX
-- Safe to run: Yes (idempotent)

BEGIN;

-- Fix the function (CREATE OR REPLACE is idempotent)
CREATE OR REPLACE FUNCTION public.approve_registration(
  reg_id uuid,
  admin_user_id uuid,
  notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reg_record record;
  new_team_id uuid;
BEGIN
  -- Fetch with row-level lock (prevents race conditions)
  SELECT * INTO reg_record
  FROM public.registration_meta
  WHERE id = reg_id AND status = 'pending'
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION USING 
      ERRCODE = 'P0001',
      MESSAGE = 'Registration not found or not pending',
      HINT = format('Registration %s is not in pending status', reg_id);
  END IF;
  
  -- Route by event_type (team_name_normalized removed - it's GENERATED ALWAYS)
  IF reg_record.event_type = 'tn' THEN
    INSERT INTO public.team_meta (
      user_id, season, category, division_code, option_choice,
      team_code, team_name, org_name, org_address,
      team_manager_1, mobile_1, email_1,
      team_manager_2, mobile_2, email_2,
      team_manager_3, mobile_3, email_3,
      registration_id
    ) VALUES (
      reg_record.user_id, reg_record.season, reg_record.category, 
      reg_record.division_code, reg_record.option_choice,
      reg_record.team_code, reg_record.team_name, 
      reg_record.org_name, reg_record.org_address,
      reg_record.team_manager_1, reg_record.mobile_1, reg_record.email_1,
      reg_record.team_manager_2, reg_record.mobile_2, reg_record.email_2,
      reg_record.team_manager_3, reg_record.mobile_3, reg_record.email_3,
      reg_record.id
    ) RETURNING id INTO new_team_id;
    
  ELSIF reg_record.event_type = 'wu' THEN
    INSERT INTO public.wu_team_meta (
      user_id, season, division_code,
      team_code, team_name,
      package_choice, team_size,
      team_manager, mobile, email,
      org_name, org_address,
      registration_id
    ) VALUES (
      reg_record.user_id, reg_record.season, reg_record.division_code,
      '', reg_record.team_name,
      reg_record.package_choice, reg_record.team_size,
      reg_record.team_manager_1, reg_record.mobile_1, reg_record.email_1,
      reg_record.org_name, reg_record.org_address,
      reg_record.id
    ) RETURNING id INTO new_team_id;
    
  ELSIF reg_record.event_type = 'sc' THEN
    INSERT INTO public.sc_team_meta (
      user_id, season, division_code,
      team_code, team_name,
      package_choice, team_size,
      team_manager, mobile, email,
      org_name, org_address,
      registration_id
    ) VALUES (
      reg_record.user_id, reg_record.season, reg_record.division_code,
      '', reg_record.team_name,
      reg_record.package_choice, reg_record.team_size,
      reg_record.team_manager_1, reg_record.mobile_1, reg_record.email_1,
      reg_record.org_name, reg_record.org_address,
      reg_record.id
    ) RETURNING id INTO new_team_id;
    
  ELSE
    RAISE EXCEPTION 'Unknown event_type: %', reg_record.event_type;
  END IF;
  
  -- Update registration status
  UPDATE public.registration_meta
  SET status = 'approved',
      approved_by = admin_user_id,
      approved_at = now(),
      admin_notes = notes
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update registration status for %', reg_id;
  END IF;
  
  RETURN new_team_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Track this migration
INSERT INTO public.schema_migrations (version, description)
VALUES ('002_fix_approve_function', 'Fix approve_registration: remove team_name_normalized insert, add row locking')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

---

## Workflow: How to Apply Migrations

### Step 1: Test in Development First

```bash
# 1. Apply migration to dev database
psql $DEV_DATABASE_URL -f migrations/002_fix_approve_function.sql

# 2. Test the fix
# - Try approving a registration
# - Verify no errors
# - Check data integrity
```

### Step 2: Apply to Production

```bash
# Option A: Via Supabase Dashboard SQL Editor
# - Copy migration file contents
# - Paste into SQL Editor
# - Review carefully
# - Execute

# Option B: Via Supabase CLI (if using)
supabase db push

# Option C: Via psql (if you have direct access)
psql $PROD_DATABASE_URL -f migrations/002_fix_approve_function.sql
```

### Step 3: Verify

```sql
-- Check migration was applied
SELECT * FROM public.schema_migrations 
WHERE version = '002_fix_approve_function';

-- Verify function exists and is correct
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'approve_registration';
```

---

## Keeping main.sql in Sync

### After Each Migration:

1. **Update `main.sql`** to reflect the new state
   - This keeps it as the source of truth
   - New environments will get the latest schema

2. **Document the change** in `main.sql`:

```sql
-- =========================================================
-- APPROVE REGISTRATION FUNCTION
-- =========================================================
-- Version: 2 (2024-XX-XX)
-- Changes: 
--   - Removed team_name_normalized from INSERT (GENERATED ALWAYS)
--   - Added FOR UPDATE SKIP LOCKED for race condition protection
-- Migration: 002_fix_approve_function.sql
-- =========================================================
CREATE OR REPLACE FUNCTION public.approve_registration(...) AS $$ ... $$;
```

---

## Rollback Strategy

### Option 1: Create Rollback Migration

```sql
-- migrations/002_rollback_fix_approve_function.sql
-- Only use if you need to revert

BEGIN;

-- Revert to previous version (if you saved it)
CREATE OR REPLACE FUNCTION public.approve_registration(...) AS $$ 
  -- Previous version here
$$;

DELETE FROM public.schema_migrations 
WHERE version = '002_fix_approve_function';

COMMIT;
```

### Option 2: Keep Previous Versions

Store previous function versions in comments or separate files:

```sql
-- migrations/002_fix_approve_function.sql
-- Previous version saved in: migrations/backups/001_approve_function_original.sql
```

---

## Safety Checklist Before Production

- [ ] Migration is idempotent (can run multiple times safely)
- [ ] No `DROP TABLE` or `DROP COLUMN` without backups
- [ ] Tested in development/staging first
- [ ] Transaction wrapped (BEGIN/COMMIT)
- [ ] Migration tracking entry included
- [ ] `main.sql` updated to reflect changes
- [ ] Rollback plan documented
- [ ] Backup taken before applying

---

## Common Patterns

### Pattern 1: Adding a Column

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_meta'
      AND column_name = 'new_field'
  ) THEN
    ALTER TABLE public.team_meta 
    ADD COLUMN new_field text;
  END IF;
END $$;
```

### Pattern 2: Modifying a Function

```sql
-- Always use CREATE OR REPLACE (idempotent)
CREATE OR REPLACE FUNCTION public.my_function(...) AS $$ ... $$;
```

### Pattern 3: Adding an Index

```sql
-- IF NOT EXISTS makes it idempotent
CREATE INDEX IF NOT EXISTS idx_team_season 
ON public.team_meta(season);
```

### Pattern 4: Adding a Constraint

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'my_constraint'
  ) THEN
    ALTER TABLE public.team_meta
    ADD CONSTRAINT my_constraint CHECK (...);
  END IF;
END $$;
```

---

## Recommended File Structure

```
project/
├── db_schema/
│   └── main.sql                    # Source of truth (complete schema)
├── migrations/
│   ├── 001_initial_schema.sql      # Baseline (matches main.sql)
│   ├── 002_fix_approve_function.sql
│   ├── 003_add_performance_index.sql
│   └── README.md                   # Migration notes
└── MIGRATION_GUIDE.md              # This file
```

---

## Summary

1. **`main.sql`** = Source of truth, complete schema
2. **`migrations/`** = Incremental, production-safe patches
3. **Always make migrations idempotent**
4. **Test in dev first, then production**
5. **Keep `main.sql` updated** after each migration
6. **Track migrations** with a migration table
7. **Have a rollback plan**

This approach gives you:
- ✅ Single source of truth (`main.sql`)
- ✅ Safe production patches (migrations)
- ✅ Easy to track what's been applied
- ✅ Can rollback if needed
- ✅ New environments get latest schema from `main.sql`

