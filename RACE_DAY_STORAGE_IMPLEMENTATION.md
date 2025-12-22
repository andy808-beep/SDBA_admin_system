# Race Day Order Quantities Storage - Implementation Summary

## Overview
Implemented storage of race day order quantities that were previously being lost after form submission. The data is now stored once per registration on the primary team and preserved through the approval workflow.

## Changes Made

### 1. Database Schema (`db_schema/main.sql`)

**Added JSONB column to `registration_meta`:**
```sql
-- Race day order quantities (only populated on primary team - first team in registration)
race_day_quantities jsonb,
```

**Added column comment:**
```sql
COMMENT ON COLUMN public.registration_meta.race_day_quantities IS 
'Race day order quantities for this registration group. Only populated on primary team (first team in registration). Format: { marquee_qty, steer_with_qty, steer_without_qty, junk_boat_qty, junk_boat_no, speed_boat_qty, speed_boat_no }';
```

### 2. Edge Function (`supabase/functions/submit_registration/index.ts`)

**Added transformation function:**
- `transformRaceDayToQuantities()` - Converts race_day array to JSONB object
- Handles multiple item_code formats (e.g., 'rd_marquee' or 'marquee')
- Extracts boat_no values for junk and speed boats

**Updated registration insertion:**
- Transforms race_day array before building registrations
- Stores `race_day_quantities` only on primary team (index 0)
- All other teams get `race_day_quantities: null`

**Updated Payload type:**
- Changed from object format to array format to match actual payload:
```typescript
race_day?: Array<{ item_code: string; qty: number; boat_no?: string }> | null;
```

### 3. Approval Function (`db_schema/main.sql`)

**Updated `approve_registration()` function:**
- Finds primary team's `race_day_quantities` by matching `client_tx_id` and `event_short_ref`
- Only creates `race_day_requests` record if:
  - Event type is 'tn' (race_day_requests links to team_meta)
  - This is the primary team (first team in registration group)
  - `race_day_quantities` exists
- Uses `ON CONFLICT` to handle updates if record already exists

### 4. Frontend Collection (`public/js/ui_bindings.js`)

**Enhanced race day collection:**
- Now collects `boat_no` values for junk and speed boats
- Looks for boat number fields by ID, name, or partial ID match
- Includes boat_no in race_day array items when present

## Data Flow

### Before Implementation
```
User fills form → Frontend collects → Payload sent → Edge function receives → ❌ DATA LOST
```

### After Implementation
```
User fills form
    ↓
Frontend collects race_day quantities (including boat_no)
    ↓
Payload sent to edge function
    ↓
Edge function transforms race_day array to JSONB
    ↓
✅ Stored in registration_meta.race_day_quantities (primary team only)
    ↓
Admin approval workflow
    ↓
✅ Copied to race_day_requests (primary team only, TN events)
```

## Storage Format

### In `registration_meta.race_day_quantities` (JSONB):
```json
{
  "marquee_qty": 5,
  "steer_with_qty": 4,
  "steer_without_qty": 1,
  "junk_boat_qty": 1,
  "junk_boat_no": "ABC-123",
  "speed_boat_qty": 2,
  "speed_boat_no": "XYZ-456"
}
```

### In `race_day_requests` (after approval):
- Same structure, but stored in separate columns
- Links to `team_meta.id` (primary team only)

## Item Code Mapping

The transform function handles multiple item_code formats:

| Item | Supported Codes |
|------|----------------|
| Marquee | `rd_marquee`, `marquee` |
| Steerer (with practice) | `rd_steerer`, `steer_with` |
| Steerer (without practice) | `rd_steerer_no_practice`, `steer_without` |
| Junk Boat | `rd_junk`, `junk_boat`, `rd_junk_boat` |
| Speed Boat | `rd_speedboat`, `speed_boat`, `rd_speed_boat` |

## Test Case

**Registration:**
- 5 teams (A, B, C, D, E)
- 5 marquees
- 4 with-practice-steerers
- 1 without-practice-steerer
- 1 junk boat (license: ABC-123)
- 2 speedboats (license: XYZ-456)

**Expected Result:**
- Team A (primary): `race_day_quantities` = full JSONB object
- Teams B, C, D, E: `race_day_quantities` = NULL
- After approval: `race_day_requests` record created for Team A only

## Notes

1. **Primary Team Identification:**
   - Primary team is the first team (index 0) in the registration
   - Identified by matching `client_tx_id` and `event_short_ref`
   - Only primary team gets `race_day_quantities` populated

2. **Event Type Limitation:**
   - `race_day_requests` table only links to `team_meta` (TN events)
   - WU/SC events use different team tables (`wu_team_meta`, `sc_team_meta`)
   - Race day requests are only created for TN events after approval

3. **Boat Number Collection:**
   - Frontend now searches for boat number fields by multiple selectors
   - Handles variations in field IDs/names
   - Only includes boat_no if field exists and has value

4. **Backward Compatibility:**
   - Transform function handles both old and new item_code formats
   - Existing registrations without race_day_quantities continue to work
   - Approval function gracefully handles missing race_day_quantities

## Migration Notes

When deploying:
1. Run the schema change to add `race_day_quantities` column
2. Deploy updated edge function
3. Deploy updated approval function
4. Frontend changes are backward compatible

Existing registrations will have `race_day_quantities = NULL`, which is expected and handled gracefully.
