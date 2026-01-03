# Race Day Data Fix - Summary

## Problem Fixed
Race day request data (marquee, steerer, junk boat, speedboat) was not being saved to the database because the payload was being sent in the wrong format.

## Root Cause
The `submitTNForm()` function (and related test functions) were converting the correctly formatted array from `collectRaceDayData()` into an object format that the edge function couldn't process.

## Changes Made

### Fixed 4 locations in `public/js/tn_wizard.js`:

1. **Line 8361** - Main `submitTNForm()` function (CRITICAL - production code)
2. **Line 5741** - `testSubmissionWithCurrentData()` function (test/debug)
3. **Line 8913** - State getter function
4. **Line 8963** - `simulateSubmission()` function (test)

### Before (BROKEN):
```javascript
race_day: raceDay.length > 0 ? {
    marqueeQty: raceDay.find(r => r.code === 'marquee')?.qty || 0,
    steerWithQty: raceDay.find(r => r.code === 'steer_with')?.qty || 0,
    steerWithoutQty: raceDay.find(r => r.code === 'steer_without')?.qty || 0,
    junkBoatQty: raceDay.find(r => r.code === 'junk_boat')?.qty || 0,
    junkBoatNo: raceDay.find(r => r.code === 'junk_boat')?.boat_no || '',
    speedboatQty: raceDay.find(r => r.code === 'speed_boat')?.qty || 0,
    speedBoatNo: raceDay.find(r => r.code === 'speed_boat')?.boat_no || ''
} : null,
```

### After (FIXED):
```javascript
race_day: raceDay.length > 0 ? raceDay.map(item => ({
    item_code: item.code,
    qty: item.qty,
    ...(item.boat_no && { boat_no: item.boat_no })
})).filter(item => item.qty > 0) : null,
```

## Expected Payload Format

The edge function now receives:
```javascript
race_day: [
    { item_code: 'marquee', qty: 1 },
    { item_code: 'steer_with', qty: 2 },
    { item_code: 'steer_without', qty: 0 },  // Filtered out (qty > 0)
    { item_code: 'junk_boat', qty: 1, boat_no: 'ABC123' },
    { item_code: 'speed_boat', qty: 1, boat_no: 'XYZ789' }
]
```

## Complete Data Flow (After Fix)

1. **Form Input** → User enters quantities in Step 3
2. **SessionStorage** → `saveStep3Data()` saves to `tn_race_day` key
3. **Array Collection** → `collectRaceDayData()` converts to array format ✅
4. **Payload Building** → `submitTNForm()` now preserves array format ✅
5. **Edge Function** → Receives array, processes correctly ✅
6. **Transform** → `transformRaceDayToQuantities()` converts to JSONB object ✅
7. **Database Insert** → Stores in `registration_meta.race_day_quantities` JSONB column ✅
8. **Admin Approval** → Database trigger creates `race_day_requests` records ✅

## Edge Function Processing

The edge function's `transformRaceDayToQuantities()` function handles these `item_code` values:
- `'marquee'` or `'rd_marquee'` → `marquee_qty`
- `'steer_with'` or `'rd_steerer'` → `steer_with_qty`
- `'steer_without'` or `'rd_steerer_no_practice'` → `steer_without_qty`
- `'junk_boat'` or `'rd_junk'` → `junk_boat_qty` + `junk_boat_no`
- `'speed_boat'` or `'rd_speedboat'` → `speed_boat_qty` + `speed_boat_no`

## Database Storage

### Immediate Storage (on submission):
- **Table:** `registration_meta`
- **Column:** `race_day_quantities` (JSONB)
- **Format:**
  ```json
  {
    "marquee_qty": 1,
    "steer_with_qty": 2,
    "junk_boat_qty": 1,
    "junk_boat_no": "ABC123",
    "speed_boat_qty": 1,
    "speed_boat_no": "XYZ789"
  }
  ```
- **Team:** Only stored on primary team (index 0)

### After Admin Approval:
- **Table:** `race_day_requests`
- **Created by:** Database trigger function `approve_registration()`
- **Columns:** Individual columns for each quantity type
- **Link:** `team_id` references `team_meta.id`

## Testing

To verify the fix works:

1. Fill out TN registration form including race day items
2. Submit the form
3. Check `registration_meta` table:
   ```sql
   SELECT id, team_name_en, race_day_quantities 
   FROM registration_meta 
   WHERE client_tx_id = '<your_tx_id>'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. Verify `race_day_quantities` is NOT null and contains the expected quantities
5. After admin approval, check `race_day_requests` table:
   ```sql
   SELECT * FROM race_day_requests 
   WHERE team_id IN (
     SELECT id FROM team_meta 
     WHERE registration_id = '<registration_id>'
   );
   ```

## Notes

- The fix preserves the array format throughout the submission process
- Only items with `qty > 0` are included in the payload (filtered)
- Boat numbers are conditionally included only when present
- The edge function already had the correct processing logic - it just needed the correct input format
- Database trigger handles the creation of `race_day_requests` records automatically on approval

