# Race Day Storage Scope Analysis

## Summary

**Race day arrangement storage is PARTIALLY implemented:**
- ✅ **Storage at submission**: Works for ALL event types (TN, WU, SC)
- ✅ **Stored in**: `registration_meta.race_day_quantities` (JSONB column)
- ❌ **Storage after approval**: Only works for TN events
- ❌ **WU/SC**: Data is stored during submission but LOST after approval

---

## 1. Edge Function Processing (submit_registration/index.ts)

### Race Day Extraction (Line 243)

```typescript
race_day = null,  // Extracted from payload for ALL event types
```

**Processed for:** ✅ ALL event types (no filtering by event type)

### Race Day Transformation (Line 547-548)

```typescript
// Transform race_day array to JSONB object for primary team
const raceDayQuantities = transformRaceDayToQuantities(race_day);
```

**Transform function** (Lines 188-222):
- Processes race_day array regardless of event type
- Handles: marquee, steerer (with/without practice), junk boat, speedboat
- Returns JSONB object with quantities

**Applied to:** ✅ ALL event types

### Storage in Registration Meta

**TN Events** (Line 580):
```typescript
race_day_quantities: idx === 0 ? raceDayQuantities : null,  // Only primary team (index 0)
```

**WU/SC Events** (Line 655):
```typescript
race_day_quantities: idx === 0 ? raceDayQuantities : null,  // Only primary team (index 0)
```

**Result:** ✅ Both TN and WU/SC store `race_day_quantities` in `registration_meta`

---

## 2. Database Schema (db_schema/main.sql)

### registration_meta Table

**Column:** `race_day_quantities jsonb` (Line 574)
- ✅ Present for all event types
- ✅ Stores data during submission for TN, WU, and SC

### race_day_requests Table (Lines 1290-1306)

```sql
create table public.race_day_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_meta(id) on delete cascade,  -- ❌ ONLY links to team_meta
  
  marquee_qty int not null default 0,
  steer_with_qty int not null default 0,
  steer_without_qty int not null default 0,
  junk_boat_no text,
  junk_boat_qty int not null default 0,
  speed_boat_no text,
  speed_boat_qty int not null default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (team_id)
);
```

**Key Finding:**
- ❌ **Foreign Key**: `team_id` references ONLY `team_meta(id)` 
- ❌ **No separate tables**: No `wu_race_day_requests` or `sc_race_day_requests`
- ❌ **No polymorphic support**: Cannot link to `wu_team_meta` or `sc_team_meta`

### Approval Function (Lines 1061-1179)

**Race Day Handling** (Lines 1149-1179):
```sql
-- Copy race_day_quantities to race_day_requests if this is the primary team
-- Only create race_day_requests for TN events (race_day_requests table links to team_meta)
IF reg_record.event_type = 'tn' AND v_race_day_quantities IS NOT NULL AND reg_id = v_primary_reg_id THEN
  INSERT INTO public.race_day_requests (
    team_id,  -- Links to team_meta.id
    ...
  ) VALUES (
    new_team_id,  -- From team_meta INSERT
    ...
  );
END IF;
```

**Critical Comment** (Line 1150):
```sql
-- Only create race_day_requests for TN events (race_day_requests table links to team_meta)
```

**Result:**
- ✅ TN events: Data copied from `registration_meta.race_day_quantities` → `race_day_requests`
- ❌ WU events: Data stays in `registration_meta.race_day_quantities` (not copied)
- ❌ SC events: Data stays in `registration_meta.race_day_quantities` (not copied)

---

## 3. Current Data Flow for Each Event Type

### TN (Main Race) Form

```
User fills form with race day items
    ↓
Edge function transforms race_day array
    ↓
✅ Stored in registration_meta.race_day_quantities (primary team only)
    ↓
Admin approves registration
    ↓
✅ Copied to race_day_requests (links to team_meta.id)
    ↓
✅ Data available in race_day_requests table
```

**Status:** ✅ **FULLY WORKING**

### WU (Warm-Up) Form

```
User fills form with race day items
    ↓
Edge function transforms race_day array
    ↓
✅ Stored in registration_meta.race_day_quantities (primary team only)
    ↓
Admin approves registration
    ↓
❌ NOT copied (approval function skips WU events)
    ↓
❌ Data remains in registration_meta.race_day_quantities
    ↓
⚠️  No way to query it from wu_team_meta
```

**Status:** ⚠️ **PARTIALLY WORKING** (stored but not accessible after approval)

### SC (Short Course) Form

```
User fills form with race day items
    ↓
Edge function transforms race_day array
    ↓
✅ Stored in registration_meta.race_day_quantities (primary team only)
    ↓
Admin approves registration
    ↓
❌ NOT copied (approval function skips SC events)
    ↓
❌ Data remains in registration_meta.race_day_quantities
    ↓
⚠️  No way to query it from sc_team_meta
```

**Status:** ⚠️ **PARTIALLY WORKING** (stored but not accessible after approval)

---

## 4. Changes Needed to Support WU/SC

### Option 1: Create Separate Tables (Recommended)

**Create new tables:**
```sql
-- WU Race Day Requests
CREATE TABLE public.wu_race_day_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.wu_team_meta(id) ON DELETE CASCADE,
  
  marquee_qty int NOT NULL DEFAULT 0,
  steer_with_qty int NOT NULL DEFAULT 0,
  steer_without_qty int NOT NULL DEFAULT 0,
  junk_boat_no text,
  junk_boat_qty int NOT NULL DEFAULT 0,
  speed_boat_no text,
  speed_boat_qty int NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id)
);

-- SC Race Day Requests
CREATE TABLE public.sc_race_day_requests (
  -- Same structure as wu_race_day_requests
  -- Links to sc_team_meta(id)
);
```

**Update approval function:**
```sql
ELSIF reg_record.event_type = 'wu' THEN
  -- ... existing wu_team_meta insert ...
  
  -- Copy race_day_quantities to wu_race_day_requests
  IF v_race_day_quantities IS NOT NULL AND reg_id = v_primary_reg_id THEN
    INSERT INTO public.wu_race_day_requests (...) VALUES (...);
  END IF;

ELSIF reg_record.event_type = 'sc' THEN
  -- ... existing sc_team_meta insert ...
  
  -- Copy race_day_quantities to sc_race_day_requests
  IF v_race_day_quantities IS NOT NULL AND reg_id = v_primary_reg_id THEN
    INSERT INTO public.sc_race_day_requests (...) VALUES (...);
  END IF;
```

**Pros:**
- ✅ Clear separation by event type
- ✅ Maintains referential integrity
- ✅ Easy to query per event type
- ✅ Follows existing pattern (separate team tables)

**Cons:**
- ⚠️ More tables to maintain
- ⚠️ Similar structure duplicated

### Option 2: Polymorphic/Generic Table

**Modify race_day_requests:**
```sql
ALTER TABLE public.race_day_requests 
  DROP CONSTRAINT race_day_requests_team_id_fkey,
  ADD COLUMN event_type text NOT NULL DEFAULT 'tn',
  ADD COLUMN team_meta_id uuid,  -- Generic UUID (no FK)
  ADD CONSTRAINT ck_race_day_team_source CHECK (
    (event_type = 'tn' AND team_meta_id IN (SELECT id FROM team_meta)) OR
    (event_type = 'wu' AND team_meta_id IN (SELECT id FROM wu_team_meta)) OR
    (event_type = 'sc' AND team_meta_id IN (SELECT id FROM sc_team_meta))
  );
```

**Pros:**
- ✅ Single table for all event types
- ✅ Easier to query across events

**Cons:**
- ⚠️ No true foreign key constraint (PostgreSQL doesn't support polymorphic FKs)
- ⚠️ More complex validation
- ⚠️ Requires CHECK constraint or triggers for integrity

### Option 3: Keep Data in registration_meta (Simple but Limited)

**No changes needed** - data already stored in `registration_meta.race_day_quantities`

**Query pattern:**
```sql
-- Get race day quantities for WU team
SELECT rm.race_day_quantities
FROM registration_meta rm
JOIN wu_team_meta wtm ON wtm.registration_id = rm.id
WHERE wtm.id = :team_id;
```

**Pros:**
- ✅ No schema changes needed
- ✅ Data is already stored

**Cons:**
- ⚠️ Requires join to access (less efficient)
- ⚠️ Not normalized (data in registration table, not team table)
- ⚠️ Inconsistent with TN approach (TN uses separate table)

---

## 5. Recommended Solution

**Option 1 (Separate Tables)** is recommended because:
1. Matches existing architecture pattern (separate tables per event type)
2. Maintains referential integrity with foreign keys
3. Consistent with how teams are stored (team_meta, wu_team_meta, sc_team_meta)
4. Easy to query: `SELECT * FROM wu_race_day_requests WHERE team_id = ?`
5. Clear separation of concerns

---

## 6. Current State Summary

| Event Type | Submission Storage | Post-Approval Storage | Status |
|------------|-------------------|----------------------|--------|
| TN | ✅ registration_meta.race_day_quantities | ✅ race_day_requests | ✅ Complete |
| WU | ✅ registration_meta.race_day_quantities | ❌ Not copied | ⚠️ Partial |
| SC | ✅ registration_meta.race_day_quantities | ❌ Not copied | ⚠️ Partial |

---

## 7. Code References

### Edge Function
- **Extraction**: Line 243 (`race_day = null`)
- **Transformation**: Line 548 (`transformRaceDayToQuantities(race_day)`)
- **TN Storage**: Line 580 (`race_day_quantities: idx === 0 ? raceDayQuantities : null`)
- **WU/SC Storage**: Line 655 (`race_day_quantities: idx === 0 ? raceDayQuantities : null`)

### Database Schema
- **Column**: Line 574 (`race_day_quantities jsonb`)
- **Table**: Lines 1290-1306 (`race_day_requests`)
- **FK Constraint**: Line 1292 (`team_id uuid not null references public.team_meta(id)`)
- **Approval Logic**: Lines 1149-1179 (TN only)

### Approval Function
- **Finding primary team**: Lines 1081-1088
- **TN copy logic**: Lines 1151-1179
- **WU/SC**: No copy logic (skipped)

