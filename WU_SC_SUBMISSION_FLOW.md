# WU/SC Form Submission Flow - Complete Trace

## Complete Flow from Button Click to API Call

### 1. Button Click Handler (Line 2286-2292)
**Location:** `setupStepNavigation()` function

```javascript
if (submitBtn) {
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      submitWUSCForm();  // ← Called directly
    }
  });
}
```

**Trigger:** User clicks submit button on Step 4 (Summary)

---

### 2. Submit Function (Line 2599-2693)
**Function:** `submitWUSCForm()`

```javascript
async function submitWUSCForm() {
  Logger.debug('🎯 submitWUSCForm: Submitting WU/SC form');
  
  try {
    // Step 1: Collect form data from sessionStorage
    const formData = collectFormData();  // ← Gets payload from collectFormData()
    Logger.debug('🎯 Form data collected:', formData);
    
    // Step 2: Generate client transaction ID
    const clientTxId = getClientTxId();
    formData.client_tx_id = clientTxId;  // ← Only modification: adds client_tx_id
    
    Logger.debug('🎯 Submitting to edge function:', EDGE_URL);
    
    // Step 3: Submit to edge function
    const result = await fetchWithErrorHandling(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),  // ← Direct stringification, no transformation
      context: 'wu_sc_form_submission',
      timeout: 60000
    });
    
    // ... error handling ...
  }
}
```

**Key Points:**
- `formData` is retrieved from `collectFormData()` (line 2604)
- Only modification: adds `client_tx_id` (line 2609)
- **No transformation of `race_day` field**
- Directly stringified and sent to API (line 2619)

---

### 3. Collect Form Data Function (Line 2698-2801)
**Function:** `collectFormData()`

```javascript
function collectFormData() {
  const cfg = window.__CONFIG;
  const teamCount = parseInt(sessionStorage.getItem(`${eventType}_team_count`) || 0);
  const teams = [];
  
  // Collect team data (lines 2704-2724)
  for (let i = 1; i <= teamCount; i++) {
    // ... team data collection ...
    teams.push({ ... });
  }
  
  // Collect organization data (lines 2727-2729)
  const orgName = sessionStorage.getItem(`${eventType}_orgName`);
  const orgAddress = sessionStorage.getItem(`${eventType}_mailingAddress`);
  
  // Collect manager data (lines 2732-2753)
  const managers = [ ... ];
  
  // Collect race day data and convert to array format (lines 2755-2790)
  const raceDayData = {
    marqueeQty: parseInt(sessionStorage.getItem(`${eventType}_marqueeQty`) || 0),
    steerWithQty: parseInt(sessionStorage.getItem(`${eventType}_steerWithQty`) || 0),
    steerWithoutQty: parseInt(sessionStorage.getItem(`${eventType}_steerWithoutQty`) || 0),
    junkBoatNo: sessionStorage.getItem(`${eventType}_junkBoatNo`) || '',
    junkBoatQty: parseInt(sessionStorage.getItem(`${eventType}_junkBoatQty`) || 0),
    speedBoatNo: sessionStorage.getItem(`${eventType}_speedBoatNo`) || '',
    speedboatQty: parseInt(sessionStorage.getItem(`${eventType}_speedboatQty`) || 0)
  };
  
  // Convert object format to array format (only include items with qty > 0)
  const raceDayArray = [];
  if (raceDayData.marqueeQty > 0) {
    raceDayArray.push({ item_code: 'marquee', qty: raceDayData.marqueeQty });
  }
  if (raceDayData.steerWithQty > 0) {
    raceDayArray.push({ item_code: 'steer_with', qty: raceDayData.steerWithQty });
  }
  if (raceDayData.steerWithoutQty > 0) {
    raceDayArray.push({ item_code: 'steer_without', qty: raceDayData.steerWithoutQty });
  }
  if (raceDayData.junkBoatQty > 0) {
    const junkBoatItem = { item_code: 'junk_boat', qty: raceDayData.junkBoatQty };
    if (raceDayData.junkBoatNo) {
      junkBoatItem.boat_no = raceDayData.junkBoatNo;
    }
    raceDayArray.push(junkBoatItem);
  }
  if (raceDayData.speedboatQty > 0) {
    const speedBoatItem = { item_code: 'speed_boat', qty: raceDayData.speedboatQty };
    if (raceDayData.speedBoatNo) {
      speedBoatItem.boat_no = raceDayData.speedBoatNo;
    }
    raceDayArray.push(speedBoatItem);
  }
  
  // Return payload with race_day as array
  return {
    eventShortRef: eventType.toUpperCase() + '2026',
    category: teams[0]?.category || 'warm_up',
    season: cfg?.event?.season || 2026,
    org_name: orgName,
    org_address: orgAddress,
    teams: teams,
    managers: managers,
    race_day: raceDayArray.length > 0 ? raceDayArray : null  // ← Array format!
  };
}
```

**Key Points:**
- `race_day` is built as an **ARRAY** (line 2800)
- Only items with `qty > 0` are included
- Returns `null` if array is empty
- This is the **ONLY place** where `race_day` is set in the payload

---

### 4. API Call (Line 2614-2622)
**Location:** Inside `submitWUSCForm()`

```javascript
const result = await fetchWithErrorHandling(EDGE_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(formData),  // ← Direct stringification
  context: 'wu_sc_form_submission',
  timeout: 60000
});
```

**EDGE_URL:** `${window.ENV?.SUPABASE_URL}/functions/v1/submit_registration`

**Key Points:**
- `formData` is directly stringified - no transformation
- No intermediate processing
- Direct fetch to edge function

---

## Complete Data Flow Summary

```
User clicks Submit Button
    ↓
setupStepNavigation() → submitBtn click handler (line 2287)
    ↓
submitWUSCForm() called (line 2290)
    ↓
collectFormData() called (line 2604)
    ↓
race_day built as ARRAY in collectFormData() (lines 2767-2790)
    ↓
formData returned with race_day: raceDayArray (line 2800)
    ↓
formData.client_tx_id added (line 2609)
    ↓
JSON.stringify(formData) → sent to API (line 2619)
    ↓
Edge function receives: race_day as ARRAY ✅
```

## Verification

### ✅ Race Day Format is Correct

1. **collectFormData()** (line 2800):
   ```javascript
   race_day: raceDayArray.length > 0 ? raceDayArray : null
   ```
   - Returns **ARRAY** format ✅
   - Returns `null` if empty ✅

2. **No Modification After Collection:**
   - `submitWUSCForm()` only adds `client_tx_id` (line 2609)
   - No transformation of `race_day` field ✅
   - Direct stringification (line 2619) ✅

3. **No Other References:**
   - Grep search found **NO** modifications to `formData.race_day` ✅
   - `collectFormData()` is the **ONLY** place where `race_day` is set ✅

## Conclusion

The code is **CORRECT**. The `race_day` field is:
- Built as an **ARRAY** in `collectFormData()` (line 2800)
- Not modified after collection
- Sent directly to the API as an array

If you're seeing an object format in the API, it's likely:
1. Cached/old code in browser
2. A different code path (check browser DevTools Network tab)
3. The edge function might be receiving correct data but logging it incorrectly


