# Validation Code Report

## Summary
- **Files with duration/helper validation:** 1
- **Total validation references:** 8
- **Functions affected:** 2
- **Error clearing listeners:** 2

---

## Detailed Findings

### File: `public/js/tn_wizard.js`

#### Function: `validatePracticeRequired()` - Lines 5816-5913

**Purpose:** Validates practice booking requirements for all teams

**Duration Validation (Lines 5844-5886):**

**Current Code:**
```javascript
// 2. Validate total practice hours (minimum 12 hours)
let totalHours = 0;
let hasMissingDuration = false;
let hasMissingHelper = false;

for (const r of rows) {
  const hours = Number(r.duration_hours) || 0;
  totalHours += hours;
  
  // Check if duration is missing or invalid
  if (!hours || ![1, 2].includes(hours)) {
    hasMissingDuration = true;
  }
  
  // Check if helper is missing or invalid
  if (!r.helper || !['NONE', 'S', 'T', 'ST'].includes(r.helper)) {
    hasMissingHelper = true;
  }
}

// ... (12 hours check) ...

// 3. Validate duration dropdown (if any date is missing duration)
if (hasMissingDuration) {
  errors.push({
    field: `duration-team-${teamNum}`,
    messageKey: 'durationRequired',
    params: { 
      teamNum: teamNum,
      teamName: teamName 
    }
  });
}
```

**Analysis:**
- ✅ **Uses old terminology:** No (just checks data structure)
- ✅ **Validates required:** Yes (checks if duration is missing/invalid)
- ❌ **Should be removed:** Yes - fields now have defaults (2h for duration, NONE for helper)
- **Action needed:** Remove the validation checks for missing duration/helper since defaults ensure values always exist

---

**Helper/Steersman Validation (Lines 5847-5898):**

**Current Code:**
```javascript
let hasMissingHelper = false;

for (const r of rows) {
  // ...
  
  // Check if helper is missing or invalid
  if (!r.helper || !['NONE', 'S', 'T', 'ST'].includes(r.helper)) {
    hasMissingHelper = true;
  }
}

// ... (12 hours check) ...

// 4. Validate helper dropdown (if any date is missing helper)
if (hasMissingHelper) {
  errors.push({
    field: `helper-team-${teamNum}`,
    messageKey: 'helperRequired',
    params: { 
      teamNum: teamNum,
      teamName: teamName 
    }
  });
}
```

**Analysis:**
- ✅ **Uses old terminology:** Yes (`helperRequired` messageKey)
- ✅ **Validates required:** Yes (checks if helper is missing/invalid)
- ❌ **Should be removed:** Yes - fields now have defaults (NONE for helper)
- **Action needed:** 
  1. Remove the validation check for missing helper
  2. Update messageKey from `helperRequired` to `steersmanCoachRequired` (if validation is kept for invalid values)
  3. Update comments: "helper" → "steersman & coach"

---

#### Function: `setupCalendarEventListeners()` - Lines 5918-5998

**Purpose:** Sets up event listeners for calendar interactions including error clearing

**Duration Error Clearing (Lines 5964-5969):**

**Current Code:**
```javascript
if (target.classList.contains('duration')) {
  rows[rowIndex].duration_hours = Number(target.value) || 1;
  // Clear duration error when user selects duration
  if (window.errorSystem && typeof window.errorSystem.clearErrors === 'function') {
    window.errorSystem.clearErrors(`duration-team-${teamNum}`);
  }
}
```

**Analysis:**
- ✅ **Uses old terminology:** No (just "duration")
- ✅ **Error clearing works:** Yes
- ✅ **Field ID correct:** Yes (`duration-team-${teamNum}`)
- **Action needed:** Update comment for clarity (optional)

---

**Helper/Steersman Error Clearing (Lines 5970-5975):**

**Current Code:**
```javascript
} else if (target.classList.contains('helpers')) {
  rows[rowIndex].helper = target.value || 'NONE';
  // Clear helper error when user selects helper
  if (window.errorSystem && typeof window.errorSystem.clearErrors === 'function') {
    window.errorSystem.clearErrors(`helper-team-${teamNum}`);
  }
}
```

**Analysis:**
- ✅ **Uses old terminology:** Yes (comment says "helper")
- ✅ **Error clearing works:** Yes
- ✅ **Field ID correct:** Yes (`helper-team-${teamNum}`)
- **Action needed:** 
  1. Update comment: "helper" → "steersman & coach"
  2. Variable name could be updated for clarity (optional)

---

#### Function: `validateStep4()` - Lines 7216-7303

**Purpose:** Main Step 4 validation function

**Current Code:**
```javascript
function validateStep4() {
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  // Check for duplicate slot selections
  const duplicateErrors = checkForDuplicates();
  if (duplicateErrors.length > 0) {
    errors.push(...duplicateErrors);
  }
  
  // Validate practice requirements
  const practiceErrors = validatePracticeRequired();
  if (practiceErrors.length > 0) {
    errors.push(...practiceErrors);
  }
  
  // Display errors if any found
  // ... (error display logic) ...
}
```

**Analysis:**
- ✅ **Calls validatePracticeRequired():** Yes
- ✅ **No direct duration/helper validation:** Correct (delegates to validatePracticeRequired)
- **Action needed:** None - this function is fine, changes will be in validatePracticeRequired()

---

## Comments That Need Updating

### File: `public/js/tn_wizard.js`

1. **Line 5853:** `// Check if duration is missing or invalid`
   - **Action:** Update to clarify this is for data validation, not required field validation

2. **Line 5858:** `// Check if helper is missing or invalid`
   - **Action:** Update to "steersman & coach" terminology

3. **Line 5876:** `// 3. Validate duration dropdown (if any date is missing duration)`
   - **Action:** Remove or update - validation no longer needed

4. **Line 5888:** `// 4. Validate helper dropdown (if any date is missing helper)`
   - **Action:** Remove or update - validation no longer needed, update terminology

5. **Line 5954:** `// Handle dropdown changes (duration, helpers)`
   - **Action:** Update "helpers" → "steersman & coach"

6. **Line 5966:** `// Clear duration error when user selects duration`
   - **Action:** Keep as-is (optional: clarify it's for clearing existing errors)

7. **Line 5972:** `// Clear helper error when user selects helper`
   - **Action:** Update "helper" → "steersman & coach"

8. **Line 6030:** `// Look for duration and helper selects within the same date container`
   - **Action:** Update "helper" → "steersman & coach"

9. **Line 6267:** `// Set helper dropdown`
   - **Action:** Update "helper" → "steersman & coach"

10. **Line 6693:** `// XSS FIX: Escape helper value (could be user-selected)`
    - **Action:** Update "helper" → "steersman & coach"

---

## Summary of Required Changes

### 1. Remove Required Field Validation

**Location:** `validatePracticeRequired()` function

**Remove:**
- Lines 5846-5847: `hasMissingDuration` and `hasMissingHelper` flags
- Lines 5853-5856: Duration missing/invalid check
- Lines 5858-5861: Helper missing/invalid check
- Lines 5876-5886: Duration validation error push
- Lines 5888-5898: Helper validation error push

**Reason:** Fields now have defaults (2h for duration, NONE for helper), so they can never be missing.

---

### 2. Keep Data Validation (Optional)

**Location:** `validatePracticeRequired()` function

**Keep but update:**
- The loop that checks `duration_hours` and `helper` values for validity
- This ensures data integrity (values are 1/2 for duration, S/T/ST/NONE for helper)
- But don't push errors - just log or handle silently

**OR Remove entirely** if we trust the defaults always work.

---

### 3. Update Comments

**Locations:** Multiple lines in `tn_wizard.js`

**Update all comments:**
- "helper" → "steersman & coach"
- "helpers" → "steersman & coach"
- Clarify that validation is for data integrity, not required fields

---

### 4. Update Error Clearing Comments

**Location:** `setupCalendarEventListeners()` function

**Update:**
- Line 5972: Comment from "helper" → "steersman & coach"

---

## Files That Do NOT Need Changes

### `public/js/wu_sc_wizard.js`
- **validateStep4()** returns `true` (no validation)
- No practice booking for WU/SC forms
- **Action:** None needed

### `public/js/tn_verification.js`
- **Status:** File not found or doesn't exist
- **Action:** None needed

### `public/js/validation.js`
- **Status:** File not found or doesn't exist
- **Action:** None needed

---

## Validation Logic Flow

### Current Flow:
1. User selects calendar dates
2. Each date gets duration/helper dropdowns (with defaults)
3. User can change values or leave defaults
4. On "Next" click → `validateStep4()` called
5. `validateStep4()` calls `validatePracticeRequired()`
6. `validatePracticeRequired()` checks:
   - If dates selected (required)
   - If total hours >= 12 (required)
   - If any date missing duration (should be removed)
   - If any date missing helper (should be removed)

### New Flow (After Changes):
1. User selects calendar dates
2. Each date gets duration/helper dropdowns (with defaults: 2h, NONE)
3. User can change values or leave defaults
4. On "Next" click → `validateStep4()` called
5. `validateStep4()` calls `validatePracticeRequired()`
6. `validatePracticeRequired()` checks:
   - If dates selected (required)
   - If total hours >= 12 (required)
   - ~~If any date missing duration~~ (REMOVED - defaults ensure value exists)
   - ~~If any date missing helper~~ (REMOVED - defaults ensure value exists)

---

## Error Message Keys Used

### Currently Used:
- `durationRequired` - Used in validation (should be removed)
- `helperRequired` - Used in validation (should be removed)

### Available but Not Used:
- `steersmanCoachRequired` - Exists in translations.js but not used
- `practiceSteersmanCoachRequired` - Exists in translations.js but not used

### Still Used (Keep):
- `practiceSelectionRequired` - For calendar date selection
- `practiceMinimumRequired` - For 12-hour minimum

---

## Field ID Mapping

### Field IDs (Unchanged):
- `duration-team-${teamNum}` - Duration error div ID
- `helper-team-${teamNum}` - Helper/steersman error div ID
- `error-duration-team-${teamNum}` - Duration error div
- `error-helper-team-${teamNum}` - Helper error div

**Note:** Field IDs stay the same (database column names unchanged)

---

## Next Steps

1. ✅ Generate this report
2. ⏳ Await approval
3. ⏳ Remove required validation for duration/helper
4. ⏳ Update comments to use "steersman & coach" terminology
5. ⏳ Update error clearing comments
6. ⏳ Generate change summary

---

## Verification After Changes

Test in browser:
1. Select calendar dates
2. Verify defaults are applied (2h, NONE)
3. Change values
4. Click "Next"
5. Verify no errors appear for duration/helper (since they have defaults)
6. Verify errors still appear for missing dates or < 12 hours

