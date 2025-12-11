# Problem Summary: Registration Approval Error

## The Error

```
Error: cannot insert a non-DEFAULT value into column "team_name_normalized"
```

**Location:** `/api/admin/approve` endpoint when approving a registration

**Impact:** Admins cannot approve registrations - the API returns 500 error

---

## Root Cause

The `approve_registration()` database function was trying to manually insert into `team_name_normalized`, which is a **GENERATED ALWAYS** column in PostgreSQL.

**Problematic Code:**
```sql
INSERT INTO public.team_meta (
  ...
  team_name, team_name_normalized,  -- ❌ Cannot insert into GENERATED ALWAYS
  ...
) VALUES (
  ...
  reg_record.team_name, reg_record.team_name_normalized,  -- ❌ This fails
  ...
)
```

**Why it fails:**
- `team_name_normalized` is defined as `GENERATED ALWAYS AS (...)` 
- PostgreSQL automatically generates this value from `team_name`
- You cannot manually insert into GENERATED ALWAYS columns

---

## The Fix

**Solution:** Remove `team_name_normalized` from the INSERT statement - let PostgreSQL generate it automatically.

**Fixed Code:**
```sql
INSERT INTO public.team_meta (
  ...
  team_name,  -- ✅ Only insert team_name
  ...
) VALUES (
  ...
  reg_record.team_name,  -- ✅ Normalized version auto-generated
  ...
)
```

**Additional Improvements Made:**
1. Added row-level locking (`FOR UPDATE SKIP LOCKED`) to prevent race conditions
2. Improved error handling with specific PostgreSQL error codes
3. Added validation to ensure UPDATE succeeds

---

## Migration Strategy Question

**Challenge:** How to safely patch production database while keeping `main.sql` as single source of truth?

**Concerns:**
- `main.sql` has `DROP TABLE` statements (would delete production data!)
- Need incremental, safe patches for production
- Want to keep single `main.sql` file for simplicity

**Solution Implemented:**
- **Two-track approach:**
  - `main.sql` = Source of truth (complete schema, for new environments)
  - `migrations/` = Incremental patches (for production updates)
- **Migration file created:** `migrations/002_fix_approve_function.sql`
- **Properties:** Idempotent, transaction-wrapped, tracked in `schema_migrations` table

---

## Files Involved

1. **Database Function:** `db_schema/main.sql` (lines ~905-994)
   - Contains the `approve_registration()` function definition
   - Updated to remove `team_name_normalized` from INSERT

2. **API Route:** `app/api/admin/approve/route.ts`
   - Calls the database function
   - No changes needed (error was in database layer)

3. **Migration File:** `migrations/002_fix_approve_function.sql`
   - Production-safe patch
   - Can be run directly in Supabase SQL Editor

---

## Current Status

✅ **Fixed in code:**
- `main.sql` updated with corrected function
- Migration file created for production deployment

⏳ **Needs deployment:**
- Run `migrations/002_fix_approve_function.sql` in production database
- Verify migration was applied
- Test approval functionality

---

## Next Steps

1. **Deploy the fix:**
   - Copy `migrations/002_fix_approve_function.sql` contents
   - Run in Supabase SQL Editor
   - Verify with `migrations/check_migrations.sql`

2. **Test:**
   - Try approving a registration
   - Should work without errors

3. **Future migrations:**
   - Follow pattern in `MIGRATION_GUIDE.md`
   - Keep `main.sql` updated after each migration

---

## Key Learnings

1. **GENERATED ALWAYS columns** cannot be manually inserted
2. **Migration strategy** needed for production safety
3. **Idempotent migrations** are essential (safe to run multiple times)
4. **Two-track approach** balances simplicity with production safety

---

## Related Files

- `MIGRATION_GUIDE.md` - Complete migration best practices guide
- `APPROVAL_PROCESS_REVIEW.md` - Detailed review of approval process (includes race condition analysis)
- `migrations/002_fix_approve_function.sql` - The fix to deploy
- `migrations/check_migrations.sql` - Utility to verify migrations

