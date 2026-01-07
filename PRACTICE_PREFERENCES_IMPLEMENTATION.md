# Practice Preferences Implementation Plan

## Schema Analysis

### 1. `practice_preferences` Table Structure
```sql
create table public.practice_preferences (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_meta(id) on delete cascade,  -- FK to team_meta, NOT registration_meta
  
  pref_date date not null,
  duration_hours int not null check (duration_hours in (1,2)),
  need_steersman boolean not null default false,
  need_coach     boolean not null default false,
  
  pref1_slot_code text references public.timeslot_catalog(slot_code),
  pref2_slot_code text references public.timeslot_catalog(slot_code),
  pref3_slot_code text references public.timeslot_catalog(slot_code),
  
  notes text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (team_id, pref_date)
);
```

**Key Points:**
- `team_id` references `team_meta(id)`, NOT `registration_meta`
- One row per team per date (unique constraint)
- Slot preferences stored as `pref1_slot_code`, `pref2_slot_code`, `pref3_slot_code`
- Helper needs stored as boolean flags: `need_steersman`, `need_coach`

### 2. `registration_meta` Table
- **Does NOT have** a `practice_data` column currently
- Stores team info, race day data, but practice data is validated but not stored

### 3. Relationship
- `practice_preferences.team_id` → `team_meta.id` (created during approval)
- Practice data can only be inserted AFTER `team_meta` is created
- Therefore: Store practice data in `registration_meta` at submission, then insert into `practice_preferences` at approval

---

## Implementation Steps

### Step 1: Add `practice_data` Column to `registration_meta`

**File:** `db_schema/main.sql`

Add after line 587 (after `speed_boat_license_nos`):

```sql
  -- Practice preferences data (JSONB) - stored at submission, inserted into practice_preferences at approval
  -- Structure: { "team_key": "t1", "dates": [...], "slot_ranks": [...] }
  -- Only populated for TN events
  practice_data jsonb,
```

### Step 2: Store Practice Data at Submission

**File:** `supabase/functions/submit_registration/index.ts`

**Location:** After practice validation (around line 564), before inserting into `registration_meta`

Add practice_data to each registration record:

```typescript
// After practice validation (line 564)
// Map practice data to registration records
// Practice data structure: { teams: [{ team_key: "t1", dates: [...], slot_ranks: [...] }] }

let practiceDataMap = new Map<string, any>();

if (eventType === 'tn' && practice && typeof practice === 'object' && 'teams' in practice) {
  const tnPractice = practice as { teams: TNPracticeTeam[] };
  
  // Map practice data by team_key (t1, t2, etc.) to team index
  for (const team of tnPractice.teams) {
    // Extract team index from team_key (e.g., "t1" -> 0, "t2" -> 1)
    const teamIndexMatch = team.team_key?.match(/^t(\d+)$/);
    if (teamIndexMatch) {
      const teamIndex = parseInt(teamIndexMatch[1], 10) - 1; // Convert to 0-based index
      practiceDataMap.set(teamIndex.toString(), {
        team_key: team.team_key,
        dates: team.dates || [],
        slot_ranks: team.slot_ranks || []
      });
    }
  }
}

// Then in registrationsToInsert mapping (around line 582 for TN, line 669 for WU/SC):
// For TN events:
registrationsToInsert = namesEn.map((team_name_en, idx) => {
  // ... existing fields ...
  practice_data: practiceDataMap.get(idx.toString()) || null,  // Add this line
  status: 'pending'
});

// For WU/SC events (practice_data should be null):
registrationsToInsert = teams.map((team: any, idx: number) => {
  // ... existing fields ...
  practice_data: null,  // WU/SC don't have practice
  status: 'pending'
});
```

### Step 3: Insert Practice Data into `practice_preferences` at Approval

**File:** `db_schema/main.sql`

**Location:** In `approve_registration` function, after `team_meta` is created (after line 1147 for TN)

Add practice preferences insertion logic:

```sql
-- After team_meta is created (line 1147)
-- Insert practice preferences if practice_data exists
IF reg_record.practice_data IS NOT NULL AND reg_record.event_type = 'tn' THEN
  -- Extract practice data
  DECLARE
    practice_team_key text;
    practice_dates jsonb;
    practice_slot_ranks jsonb;
    practice_date jsonb;
    practice_slot_rank jsonb;
    date_record record;
    slot_rank_record record;
    need_steersman_val boolean;
    need_coach_val boolean;
    slot_ranks_by_date map<date, jsonb[]>;  -- Map date to slot ranks for that date's duration
  BEGIN
    -- Get team_key from practice_data
    practice_team_key := reg_record.practice_data->>'team_key';
    practice_dates := reg_record.practice_data->'dates';
    practice_slot_ranks := reg_record.practice_data->'slot_ranks';
    
    -- Build map of slot ranks by date and duration
    -- Note: Slot ranks are global per team, not per date
    -- We need to match slot ranks to dates based on duration
    
    -- Insert each practice date
    FOR practice_date IN SELECT * FROM jsonb_array_elements(practice_dates)
    LOOP
      -- Extract date fields
      date_record := jsonb_populate_record(null::record, practice_date);
      
      -- Convert helper string to boolean flags
      need_steersman_val := (date_record.helper = 'S' OR date_record.helper = 'ST');
      need_coach_val := (date_record.helper = 'T' OR date_record.helper = 'ST');
      
      -- Find matching slot ranks for this date's duration
      -- Slot ranks are stored globally, but we need to match by duration
      -- We'll need to look up slot duration from timeslot_catalog
      
      -- Insert practice preference row
      INSERT INTO public.practice_preferences (
        team_id,
        pref_date,
        duration_hours,
        need_steersman,
        need_coach,
        pref1_slot_code,
        pref2_slot_code,
        pref3_slot_code
      )
      SELECT
        new_team_id,
        (practice_date->>'pref_date')::date,
        (practice_date->>'duration_hours')::int,
        need_steersman_val,
        need_coach_val,
        -- Get slot codes for this duration, ordered by rank
        (SELECT slot_code FROM jsonb_array_elements(practice_slot_ranks) AS rank_obj
         WHERE (rank_obj->>'rank')::int = 1
         AND EXISTS (
           SELECT 1 FROM public.timeslot_catalog tc
           WHERE tc.slot_code = rank_obj->>'slot_code'
           AND tc.duration_hours = (practice_date->>'duration_hours')::int
           AND tc.is_active = true
         )
         LIMIT 1) AS pref1_slot_code,
        (SELECT slot_code FROM jsonb_array_elements(practice_slot_ranks) AS rank_obj
         WHERE (rank_obj->>'rank')::int = 2
         AND EXISTS (
           SELECT 1 FROM public.timeslot_catalog tc
           WHERE tc.slot_code = rank_obj->>'slot_code'
           AND tc.duration_hours = (practice_date->>'duration_hours')::int
           AND tc.is_active = true
         )
         LIMIT 1) AS pref2_slot_code,
        (SELECT slot_code FROM jsonb_array_elements(practice_slot_ranks) AS rank_obj
         WHERE (rank_obj->>'rank')::int = 3
         AND EXISTS (
           SELECT 1 FROM public.timeslot_catalog tc
           WHERE tc.slot_code = rank_obj->>'slot_code'
           AND tc.duration_hours = (practice_date->>'duration_hours')::int
           AND tc.is_active = true
         )
         LIMIT 1) AS pref3_slot_code
      ON CONFLICT (team_id, pref_date) DO UPDATE SET
        duration_hours = EXCLUDED.duration_hours,
        need_steersman = EXCLUDED.need_steersman,
        need_coach = EXCLUDED.need_coach,
        pref1_slot_code = EXCLUDED.pref1_slot_code,
        pref2_slot_code = EXCLUDED.pref2_slot_code,
        pref3_slot_code = EXCLUDED.pref3_slot_code,
        updated_at = now();
    END LOOP;
  END;
END IF;
```

**Simplified Version (Better Approach):**

Actually, the above is too complex. Here's a cleaner approach using a helper function:

```sql
-- Add this helper function before approve_registration
CREATE OR REPLACE FUNCTION public.insert_practice_preferences(
  p_team_id uuid,
  p_practice_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  practice_date jsonb;
  practice_slot_rank jsonb;
  date_record record;
  need_steersman_val boolean;
  need_coach_val boolean;
  duration_val int;
  slot_ranks_1hr jsonb[] := ARRAY[]::jsonb[];
  slot_ranks_2hr jsonb[] := ARRAY[]::jsonb[];
  pref1_code text;
  pref2_code text;
  pref3_code text;
BEGIN
  -- Separate slot ranks by duration
  FOR practice_slot_rank IN SELECT * FROM jsonb_array_elements(p_practice_data->'slot_ranks')
  LOOP
    -- Get slot duration from catalog
    SELECT duration_hours INTO duration_val
    FROM public.timeslot_catalog
    WHERE slot_code = practice_slot_rank->>'slot_code'
    AND is_active = true
    LIMIT 1;
    
    IF duration_val = 1 THEN
      slot_ranks_1hr := array_append(slot_ranks_1hr, practice_slot_rank);
    ELSIF duration_val = 2 THEN
      slot_ranks_2hr := array_append(slot_ranks_2hr, practice_slot_rank);
    END IF;
  END LOOP;
  
  -- Sort by rank
  SELECT array_agg(slot ORDER BY (slot->>'rank')::int)
  INTO slot_ranks_1hr
  FROM unnest(slot_ranks_1hr) AS slot;
  
  SELECT array_agg(slot ORDER BY (slot->>'rank')::int)
  INTO slot_ranks_2hr
  FROM unnest(slot_ranks_2hr) AS slot;
  
  -- Insert each practice date
  FOR practice_date IN SELECT * FROM jsonb_array_elements(p_practice_data->'dates')
  LOOP
    duration_val := (practice_date->>'duration_hours')::int;
    
    -- Convert helper to boolean flags
    need_steersman_val := (practice_date->>'helper' = 'S' OR practice_date->>'helper' = 'ST');
    need_coach_val := (practice_date->>'helper' = 'T' OR practice_date->>'helper' = 'ST');
    
    -- Get slot codes for this duration
    IF duration_val = 1 THEN
      pref1_code := CASE WHEN array_length(slot_ranks_1hr, 1) >= 1 THEN slot_ranks_1hr[1]->>'slot_code' ELSE NULL END;
      pref2_code := CASE WHEN array_length(slot_ranks_1hr, 1) >= 2 THEN slot_ranks_1hr[2]->>'slot_code' ELSE NULL END;
      pref3_code := CASE WHEN array_length(slot_ranks_1hr, 1) >= 3 THEN slot_ranks_1hr[3]->>'slot_code' ELSE NULL END;
    ELSIF duration_val = 2 THEN
      pref1_code := CASE WHEN array_length(slot_ranks_2hr, 1) >= 1 THEN slot_ranks_2hr[1]->>'slot_code' ELSE NULL END;
      pref2_code := CASE WHEN array_length(slot_ranks_2hr, 1) >= 2 THEN slot_ranks_2hr[2]->>'slot_code' ELSE NULL END;
      pref3_code := CASE WHEN array_length(slot_ranks_2hr, 1) >= 3 THEN slot_ranks_2hr[3]->>'slot_code' ELSE NULL END;
    END IF;
    
    -- Insert practice preference
    INSERT INTO public.practice_preferences (
      team_id,
      pref_date,
      duration_hours,
      need_steersman,
      need_coach,
      pref1_slot_code,
      pref2_slot_code,
      pref3_slot_code
    ) VALUES (
      p_team_id,
      (practice_date->>'pref_date')::date,
      duration_val,
      need_steersman_val,
      need_coach_val,
      pref1_code,
      pref2_code,
      pref3_code
    )
    ON CONFLICT (team_id, pref_date) DO UPDATE SET
      duration_hours = EXCLUDED.duration_hours,
      need_steersman = EXCLUDED.need_steersman,
      need_coach = EXCLUDED.need_coach,
      pref1_slot_code = EXCLUDED.pref1_slot_code,
      pref2_slot_code = EXCLUDED.pref2_slot_code,
      pref3_slot_code = EXCLUDED.pref3_slot_code,
      updated_at = now();
  END LOOP;
END;
$$;

-- Then in approve_registration, after team_meta is created (after line 1147):
IF reg_record.practice_data IS NOT NULL AND reg_record.event_type = 'tn' THEN
  PERFORM public.insert_practice_preferences(new_team_id, reg_record.practice_data);
END IF;
```

---

## Summary

### Schema Changes
1. Add `practice_data jsonb` column to `registration_meta` table

### Code Changes

1. **`supabase/functions/submit_registration/index.ts`**:
   - Map practice data by team index
   - Store `practice_data` in each `registration_meta` record

2. **`db_schema/main.sql`**:
   - Add `practice_data jsonb` column to `registration_meta`
   - Create helper function `insert_practice_preferences()`
   - Call helper function in `approve_registration()` after `team_meta` is created

### Data Flow
1. **Submission**: Practice data validated → stored in `registration_meta.practice_data` (JSONB)
2. **Approval**: `approve_registration()` creates `team_meta` → calls `insert_practice_preferences()` → inserts rows into `practice_preferences`

### Notes
- Practice data is only for TN events (WU/SC don't have practice)
- Slot ranks are global per team, but matched to dates by duration
- Uses `ON CONFLICT` to handle updates if practice data changes
- Helper function simplifies the complex JSONB processing


