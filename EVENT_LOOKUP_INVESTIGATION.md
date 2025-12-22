# Event Lookup Investigation - "Event TN2026 not found"

## 1. Exact Query (Lines 353-357)

```typescript
const { data: eventRows, error: eventError } = await admin
  .from('v_event_config_public')
  .select('event_short_ref, season, form_enabled, practice_start_date, practice_end_date')
  .eq('event_short_ref', eventShortRef)
  .limit(1);
```

**Query Details:**
- **Table/View**: `v_event_config_public` (view, not base table)
- **Select columns**: `event_short_ref, season, form_enabled, practice_start_date, practice_end_date`
- **Filter**: `.eq('event_short_ref', eventShortRef)` (uses variable, not hardcoded)
- **Limit**: 1 row

## 2. View vs Base Table

**Querying:** `v_event_config_public` (view)

**View Definition** (`DB Config/view.sql` lines 11-29):
```sql
CREATE VIEW public.v_event_config_public AS
SELECT
  event_short_ref,
  season,
  form_enabled,
  practice_start_date,
  practice_end_date,
  banner_text_en,
  banner_text_tc,
  config_version,
  updated_at,
  event_long_name_en,
  event_long_name_tc,
  event_date_en,
  event_date_tc,
  event_date,
  event_location_en,
  event_location_tc
FROM public.annual_event_config;
```

**Base Table:** `annual_event_config`
- Data exists: ✅ TN2026 is seeded (lines 237-269 in `annual.sql`)
- View is created conditionally (only if table exists)

## 3. Supabase Client Type

**Client Used:** `admin` (service role)

**Definition** (lines 14-16):
```typescript
export const admin = createClient(SUPABASE_URL, SERVICE_ROLE!, {
  auth: { persistSession: false },
});
```

**Key Points:**
- ✅ Uses `SERVICE_ROLE_KEY` - bypasses RLS
- ✅ Should have full access to all tables/views
- ✅ Not affected by row-level security policies

## 4. Filters That Might Exclude Row

**Query filters:**
- ✅ `.eq('event_short_ref', eventShortRef)` - exact match on event_short_ref
- ✅ No other filters applied

**Potential Issues:**

1. **View doesn't exist** - The view is created conditionally in `view.sql`:
   ```sql
   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_event_config')
   ```
   If the view creation SQL hasn't been run, the view won't exist.

2. **View is stale** - If the view was created before TN2026 was inserted, and the view hasn't been refreshed (though views should be dynamic).

3. **Column mismatch** - The view selects all columns from `annual_event_config`, so all columns should be available.

4. **Case sensitivity** - `event_short_ref` is `text` type (not case-insensitive citext in the view), but both should be 'TN2026'.

## 5. Edge Function Deployment

**No deployment timestamp available** from code inspection. Check:
- Supabase dashboard → Edge Functions → `submit_registration`
- Git commit history for last deployment
- Function logs for deployment timestamps

## Additional Issue Found

**Line 430-432** - Practice validation query tries to select `allowed_weekdays`:
```typescript
const { data: eventConfig } = await admin
  .from('v_event_config_public')
  .select('practice_start_date, practice_end_date, allowed_weekdays')
  .eq('event_short_ref', eventShortRef)
  .single();
```

**Problem:** `allowed_weekdays` column does NOT exist in:
- ❌ `v_event_config_public` view (not in SELECT list)
- ❌ `annual_event_config` table (not in schema)

This will cause an error, but only when practice validation runs (for TN events with practice data).

## Troubleshooting Steps

### 1. Verify View Exists
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'v_event_config_public'
);
```

### 2. Verify Data in View
```sql
SELECT * FROM v_event_config_public WHERE event_short_ref = 'TN2026';
```

### 3. Verify Data in Base Table
```sql
SELECT event_short_ref, season, form_enabled 
FROM annual_event_config 
WHERE event_short_ref = 'TN2026';
```

### 4. Check View Definition
```sql
SELECT pg_get_viewdef('public.v_event_config_public', true);
```

### 5. Test Query with Service Role
Use Supabase SQL Editor with service role to test the exact query:
```sql
SELECT event_short_ref, season, form_enabled, practice_start_date, practice_end_date
FROM v_event_config_public
WHERE event_short_ref = 'TN2026'
LIMIT 1;
```

## Most Likely Causes

1. **View doesn't exist** - `view.sql` hasn't been executed in Supabase SQL Editor
2. **View creation failed** - The conditional check failed or there was an error during view creation
3. **RLS on base table blocking view** - Even though admin should bypass RLS, if there's a restrictive policy, it might affect the view query

## Recommended Fix

**Option 1: Query base table directly (temporary workaround)**
```typescript
.from('annual_event_config')  // Instead of 'v_event_config_public'
```

**Option 2: Ensure view exists**
- Run `DB Config/view.sql` in Supabase SQL Editor
- Verify view creation: `\dv v_event_config_public` in psql

**Option 3: Check error details**
Add logging before the query:
```typescript
console.log('🔍 Looking up event:', eventShortRef);
console.log('🔍 Using admin client:', !!admin);
const { data: eventRows, error: eventError } = await admin...
console.log('🔍 Query result:', { data: eventRows, error: eventError });
```

## Error Message Context

The error is thrown at **line 360**:
```typescript
if (!eventRows.length) throw new Error(`Event ${eventShortRef} not found`);
```

This means:
- ✅ No error from Supabase (error is null/undefined)
- ✅ Query executed successfully
- ❌ But returned 0 rows (empty array)

This confirms the query runs, but finds no matching rows - either:
- View doesn't have the data (view issue)
- View filters it out somehow (unlikely, view has no WHERE clause)
- Data doesn't match the filter (typo or case mismatch)

