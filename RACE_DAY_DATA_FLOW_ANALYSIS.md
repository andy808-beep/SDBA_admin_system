# Race Day Data Flow Analysis - BREAK POINT IDENTIFIED

## Problem Statement
Race day request data (marquee, steerer, junk boat, speedboat) is NOT being saved to the database.

## Complete Data Flow Trace

### 1. FORM INPUT COLLECTION (ui_bindings.js)

**Location:** `public/js/ui_bindings.js` lines 778-803

**How race day quantities are collected:**
```javascript
// Race day
if (!raceDayHidden) {
    const rdInputs = dom.qa('[data-group="race_day"]');
    for (const el of rdInputs) {
        const item_code = el.getAttribute('data-code');
        const qty = Number(el.value || 0);
        if (item_code && qty > 0) {
            const raceDayItem = { item_code, qty };
            // Collect boat_no for junk and speed boats
            if (item_code === 'rd_junk' || item_code === 'junk_boat' || item_code === 'rd_junk_boat') {
                const boatNoInput = dom.q('#junkBoatNo') || dom.q('[name="junkBoatNo"]') || dom.q('[id*="junkBoatNo"]');
                if (boatNoInput && boatNoInput.value) {
                    raceDayItem.boat_no = boatNoInput.value.trim();
                }
            } else if (item_code === 'rd_speedboat' || item_code === 'speed_boat' || item_code === 'rd_speed_boat') {
                const boatNoInput = dom.q('#speedBoatNo') || dom.q('[name="speedBoatNo"]') || dom.q('[id*="speedBoatNo"]');
                if (boatNoInput && boatNoInput.value) {
                    raceDayItem.boat_no = boatNoInput.value.trim();
                }
            }
            state.race_day.push(raceDayItem);
        }
    }
}
```

**DOM Elements/Selectors:**
- Inputs with `data-group="race_day"` attribute
- `data-code` attribute contains the item code (e.g., 'rd_marquee', 'rd_steerer', 'rd_junk', 'rd_speedboat')
- Boat number fields: `#junkBoatNo`, `#speedBoatNo`

**State Object Structure:**
```javascript
state.race_day = [
    { item_code: 'rd_marquee', qty: 1 },
    { item_code: 'rd_steerer', qty: 2 },
    { item_code: 'rd_junk', qty: 1, boat_no: 'ABC123' },
    { item_code: 'rd_speedboat', qty: 1, boat_no: 'XYZ789' }
]
```

**NOTE:** This is for WU/SC events. For TN events, the flow is different (see below).

---

### 2. TN WIZARD DATA COLLECTION (tn_wizard.js)

**Location:** `public/js/tn_wizard.js`

#### 2a. Form Input Creation (lines 2990-2996)
```javascript
<input type="number" 
       id="${item.item_code}Qty" 
       name="${item.item_code}Qty" 
       min="${item.min_qty || 0}" 
       max="${item.max_qty || ''}"
       value="0" 
       class="qty-input" />
```

**Input IDs created:**
- `marqueeQty` (for item_code='marquee' or 'rd_marquee')
- `steer_withQty` (for item_code='steer_with' or 'rd_steerer')
- `steer_withoutQty` (for item_code='steer_without' or 'rd_steerer_no_practice')
- `junk_boatQty` or `junkBoatQty` (for junk boat)
- `speedboatQty` or `speed_boatQty` (for speed boat)

#### 2b. Data Saving to SessionStorage (lines 8070-8107)
```javascript
function saveStep3Data() {
    const raceDayData = {};
    
    // Get all quantity inputs and save their values
    const qtyInputs = document.querySelectorAll('.qty-input');
    
    qtyInputs.forEach(input => {
        const value = parseInt(input.value, 10) || 0;
        raceDayData[input.id] = value;  // e.g., raceDayData['marqueeQty'] = 1
    });
    
    // Save boat numbers
    const junkBoatNo = document.getElementById('junkBoatNo');
    const speedBoatNo = document.getElementById('speedBoatNo');
    
    if (junkBoatNo) {
        raceDayData.junkBoatNo = junkBoatNo.value || '';
    }
    
    if (speedBoatNo) {
        raceDayData.speedBoatNo = speedBoatNo.value || '';
    }
    
    sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
}
```

**SessionStorage Structure:**
```javascript
{
    "marqueeQty": 1,
    "steerWithQty": 2,
    "steerWithoutQty": 0,
    "junkBoatQty": 1,
    "junkBoatNo": "ABC123",
    "speedboatQty": 1,
    "speedBoatNo": "XYZ789"
}
```

#### 2c. Data Collection for Submission (lines 8220-8250)
```javascript
function collectRaceDayData() {
    const raceDayData = JSON.parse(sessionStorage.getItem('tn_race_day') || '{}');
    
    const items = [];
    if (raceDayData.marqueeQty > 0) {
        items.push({ code: 'marquee', qty: raceDayData.marqueeQty });
    }
    if (raceDayData.steerWithQty > 0) {
        items.push({ code: 'steer_with', qty: raceDayData.steerWithQty });
    }
    if (raceDayData.steerWithoutQty > 0) {
        items.push({ code: 'steer_without', qty: raceDayData.steerWithoutQty });
    }
    if (raceDayData.junkBoatQty > 0) {
        items.push({ 
            code: 'junk_boat', 
            qty: raceDayData.junkBoatQty,
            boat_no: raceDayData.junkBoatNo 
        });
    }
    if (raceDayData.speedboatQty > 0) {
        items.push({ 
            code: 'speed_boat', 
            qty: raceDayData.speedboatQty,
            boat_no: raceDayData.speedBoatNo 
        });
    }
    
    return items;  // Returns array format: [{ code, qty, boat_no? }]
}
```

**Return Value:**
```javascript
[
    { code: 'marquee', qty: 1 },
    { code: 'steer_with', qty: 2 },
    { code: 'junk_boat', qty: 1, boat_no: 'ABC123' },
    { code: 'speed_boat', qty: 1, boat_no: 'XYZ789' }
]
```

#### 2d. Payload Building (lines 8333-8369) - **BREAK POINT HERE**
```javascript
const raceDay = collectRaceDayData();  // Returns array format ✅

// Build payload in server-expected format
const payload = {
    // ... other fields ...
    race_day: raceDay.length > 0 ? {
        marqueeQty: raceDay.find(r => r.code === 'marquee')?.qty || 0,
        steerWithQty: raceDay.find(r => r.code === 'steer_with')?.qty || 0,
        steerWithoutQty: raceDay.find(r => r.code === 'steer_without')?.qty || 0,
        junkBoatQty: raceDay.find(r => r.code === 'junk_boat')?.qty || 0,
        junkBoatNo: raceDay.find(r => r.code === 'junk_boat')?.boat_no || '',
        speedboatQty: raceDay.find(r => r.code === 'speed_boat')?.qty || 0,
        speedBoatNo: raceDay.find(r => r.code === 'speed_boat')?.boat_no || ''
    } : null,  // ❌ CONVERTS ARRAY TO OBJECT!
    // ...
};
```

**Payload Sent:**
```javascript
{
    race_day: {
        marqueeQty: 1,
        steerWithQty: 2,
        steerWithoutQty: 0,
        junkBoatQty: 1,
        junkBoatNo: "ABC123",
        speedboatQty: 1,
        speedBoatNo: "XYZ789"
    }
}
```

**PROBLEM:** The payload converts the array back to an object format, but the edge function expects an array!

---

### 3. EDGE FUNCTION PROCESSING (submit_registration/index.ts)

#### 3a. Payload Extraction (line 243)
```typescript
const {
    eventShortRef, category, season, org_name, org_address,
    counts, team_names = [], team_names_en = [], team_names_tc = [], team_options = [], managers = [], race_day = null, practice: initialPractice = [],
} = payload ?? {} as Payload;
```

**Type Definition (line 95):**
```typescript
race_day?: Array<{ item_code: string; qty: number; boat_no?: string }> | null;
```

**Expected Format:**
```typescript
race_day: [
    { item_code: 'marquee', qty: 1 },
    { item_code: 'steer_with', qty: 2 },
    { item_code: 'junk_boat', qty: 1, boat_no: 'ABC123' },
    { item_code: 'speed_boat', qty: 1, boat_no: 'XYZ789' }
]
```

**Actual Format Received:**
```typescript
race_day: {
    marqueeQty: 1,
    steerWithQty: 2,
    junkBoatQty: 1,
    junkBoatNo: "ABC123",
    speedboatQty: 1,
    speedBoatNo: "XYZ789"
}
```

#### 3b. Transformation Function (lines 189-222)
```typescript
function transformRaceDayToQuantities(raceDay: Array<{ item_code: string; qty: number; boat_no?: string }> | null): Record<string, any> | null {
    if (!raceDay || !Array.isArray(raceDay) || raceDay.length === 0) return null;  // ❌ FAILS HERE!
    
    const quantities: Record<string, any> = {};
    
    for (const item of raceDay) {
        switch (item.item_code) {
            case 'rd_marquee':
            case 'marquee':
                quantities.marquee_qty = item.qty;
                break;
            case 'rd_steerer':
            case 'steer_with':
                quantities.steer_with_qty = item.qty;
                break;
            // ... etc
        }
    }
    
    return Object.keys(quantities).length > 0 ? quantities : null;
}
```

**Problem:** Since `race_day` is an object (not an array), the check `!Array.isArray(raceDay)` returns `true`, so the function immediately returns `null`.

#### 3c. Database Insert (lines 548, 580, 655)
```typescript
// Transform race_day array to JSONB object for primary team
const raceDayQuantities = transformRaceDayToQuantities(race_day);  // Returns null ❌

// Insert into registration_meta
registrationsToInsert = namesEn.map((team_name_en, idx) => ({
    // ... other fields ...
    race_day_quantities: idx === 0 ? raceDayQuantities : null,  // null is inserted ❌
    status: 'pending'
}));
```

**Result:** `race_day_quantities` is set to `null` for all teams, so nothing is saved to the database.

---

## BREAK POINT IDENTIFIED

**Location:** `public/js/tn_wizard.js` lines 8361-8369

**Issue:** The payload building code converts the correctly formatted array from `collectRaceDayData()` back into an object format that the edge function cannot process.

**Root Cause:**
1. `collectRaceDayData()` correctly returns an array: `[{ code, qty, boat_no? }]`
2. `submitTNForm()` incorrectly converts it to an object: `{ marqueeQty, steerWithQty, ... }`
3. Edge function expects an array but receives an object
4. `transformRaceDayToQuantities()` returns `null` because it's not an array
5. Database insert receives `null` for `race_day_quantities`

---

## SOLUTION

**Fix in `tn_wizard.js` line 8361:**

**Current (BROKEN):**
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

**Fixed:**
```javascript
race_day: raceDay.length > 0 ? raceDay.map(item => ({
    item_code: item.code,  // Map 'code' to 'item_code' for edge function
    qty: item.qty,
    boat_no: item.boat_no || undefined
})).filter(item => item.qty > 0) : null,  // Only include items with qty > 0
```

**Alternative (if edge function needs specific item_code values):**
```javascript
race_day: raceDay.length > 0 ? raceDay.map(item => {
    // Map code values to item_code values expected by edge function
    const itemCodeMap = {
        'marquee': 'marquee',
        'steer_with': 'steer_with',
        'steer_without': 'steer_without',
        'junk_boat': 'junk_boat',
        'speed_boat': 'speed_boat'
    };
    
    return {
        item_code: itemCodeMap[item.code] || item.code,
        qty: item.qty,
        boat_no: item.boat_no || undefined
    };
}).filter(item => item.qty > 0) : null,
```

---

## Data Flow Summary

```
Form Input (DOM)
    ↓
SessionStorage (saveStep3Data)
    ↓
Array Collection (collectRaceDayData) ✅
    ↓
Payload Building (submitTNForm) ❌ CONVERTS TO OBJECT
    ↓
Edge Function (receives object, expects array) ❌
    ↓
Transform Function (returns null) ❌
    ↓
Database Insert (race_day_quantities = null) ❌
```

**After Fix:**
```
Form Input (DOM)
    ↓
SessionStorage (saveStep3Data)
    ↓
Array Collection (collectRaceDayData) ✅
    ↓
Payload Building (submitTNForm) ✅ KEEPS AS ARRAY
    ↓
Edge Function (receives array, expects array) ✅
    ↓
Transform Function (returns quantities object) ✅
    ↓
Database Insert (race_day_quantities = {...}) ✅
```

---

## Additional Notes

1. **WU/SC Events:** The `ui_bindings.js` code (lines 778-803) correctly collects race_day data as an array, so those events should work fine.

2. **TN Events:** Only TN events are affected because they use the `tn_wizard.js` submission flow.

3. **Database Schema:** The `race_day_quantities` field in `registration_meta` is a JSONB column that stores:
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

4. **Future Processing:** According to the comment in the edge function (line 679), `race_day_requests` will be created after admin approval when teams are moved to `team_meta`. This is a separate process and not part of the current issue.

