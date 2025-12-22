# TN Wizard Step 4 Migration Summary

## Overview
Successfully migrated TN Wizard Step 4 (Practice Sessions) validation to use the unified error system.

## Changes Made

### 1. Refactored `validateStep4()` Function

**Location:** `public/js/tn_wizard.js` (lines 5818-5860)

#### Key Changes:

1. **Replaced `showError()` and `hideError()`** → `window.errorSystem.showFormErrors()`

2. **Changed validation functions to return error arrays:**
   - `checkForDuplicates()` now returns array of error objects
   - `validatePracticeRequired()` now returns array of error objects (was returning string)

3. **Unified error collection:**
   ```javascript
   const errors = [];
   const duplicateErrors = checkForDuplicates();
   const practiceErrors = validatePracticeRequired();
   errors.push(...duplicateErrors, ...practiceErrors);
   ```

4. **Added fallback** to old error methods if `errorSystem` not available

---

### 2. Refactored `checkForDuplicates()` Function

**Location:** `public/js/tn_wizard.js` (lines 3487-3529)

#### Key Changes:

1. **Changed return type:** Now returns array of error objects instead of void

2. **Error structure:**
   ```javascript
   {
     field: select.id,  // e.g., 'slotPref2h_1', 'slotPref1h_2'
     messageKey: 'duplicateSlotSelection'
   }
   ```

3. **Uses error system** when available, falls back to legacy `showSlotError()` method

4. **Maintains backward compatibility** with legacy error display

---

### 3. Refactored `validatePracticeRequired()` Function

**Location:** `public/js/tn_wizard.js` (lines 4638-4736)

#### Key Changes:

1. **Changed return type:** Now returns array of error objects instead of string message

2. **Error structure:**
   ```javascript
   {
     field: `practiceTeam${teamNum}`,  // e.g., 'practiceTeam1', 'practiceTeam2'
     messageKey: 'practiceSelectionRequired',
     params: { teamNum: 1, teamName: 'Team Name' }
   }
   ```

3. **Validation checks:**
   - **Practice dates:** At least one practice date required
   - **Slot preferences:** At least one slot preference required
   - **Minimum hours:** Total practice hours must be >= 12
   - **Date validity:** Each practice date must have valid date, duration, and helper

4. **Team-level errors:** All errors for a team use field ID `practiceTeam{teamNum}`

---

### 4. Updated `showSlotError()` Function

**Location:** `public/js/tn_wizard.js` (lines 3551-3571)

#### Key Changes:

1. **Uses error system** when available:
   ```javascript
   if (window.errorSystem && select.id) {
     window.errorSystem.showFieldError(select.id, 'duplicateSlotSelection');
     return;
   }
   ```

2. **Falls back** to legacy DOM manipulation if error system not available

---

### 5. Updated `clearSlotErrors()` Function

**Location:** `public/js/tn_wizard.js` (lines 3576-3605)

#### Key Changes:

1. **Uses error system** to clear errors from all slot selects

2. **Falls back** to legacy method if error system not available

---

### 6. Added i18n Messages

**Location:** `public/js/i18n/translations.js`

#### English Messages:
```javascript
practiceSelectionRequired: "Team {teamNum} ({teamName}): Please select at least one practice date",
practiceTimeSlotRequired: "Team {teamNum} ({teamName}): Please select at least one time slot preference",
practiceDateInvalid: "Team {teamNum} ({teamName}): Practice date {dateIndex} is missing or invalid",
practiceDurationInvalid: "Team {teamNum} ({teamName}): Practice date {dateIndex} duration must be 1h or 2h",
practiceHelperRequired: "Team {teamNum} ({teamName}): Practice date {dateIndex} helper selection required",
practiceHoursMinimum: "Team {teamNum} ({teamName}): Total practice hours ({hours}h) must be at least {min}h",
duplicateSlotSelection: "This time slot is already selected in another preference",
```

#### Traditional Chinese Messages:
```javascript
practiceSelectionRequired: "第 {teamNum} 隊 ({teamName})：請選擇至少一個練習日期",
practiceTimeSlotRequired: "第 {teamNum} 隊 ({teamName})：請選擇至少一個時段偏好",
practiceDateInvalid: "第 {teamNum} 隊 ({teamName})：練習日期 {dateIndex} 缺失或無效",
practiceDurationInvalid: "第 {teamNum} 隊 ({teamName})：練習日期 {dateIndex} 的時長必須為 1 小時或 2 小時",
practiceHelperRequired: "第 {teamNum} 隊 ({teamName})：練習日期 {dateIndex} 需要選擇助手",
practiceHoursMinimum: "第 {teamNum} 隊 ({teamName})：總練習時數 ({hours} 小時) 必須至少為 {min} 小時",
duplicateSlotSelection: "此時段已在其他偏好中選擇",
```

---

## Before/After Comparison

### Before (Old Code):

```javascript
function validateStep4() {
  checkForDuplicates();
  const practiceError = validatePracticeRequired();
  if (practiceError) {
    showError(practiceError);
    return false;
  }
  hideError();
  return true;
}

function validatePracticeRequired() {
  // ... validation logic ...
  if (errors.length > 0) {
    return `Practice booking incomplete for the following teams:\n${errors.join('\n')}`;
  }
  return null;
}
```

### After (New Code):

```javascript
function validateStep4() {
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  const duplicateErrors = checkForDuplicates();
  const practiceErrors = validatePracticeRequired();
  errors.push(...duplicateErrors, ...practiceErrors);
  
  if (errors.length > 0) {
    window.errorSystem.showFormErrors(errors, {
      containerId: 'wizardMount',
      scrollTo: true
    });
    return false;
  }
  return true;
}

function validatePracticeRequired() {
  const errors = [];
  // ... validation logic ...
  errors.push({
    field: `practiceTeam${teamNum}`,
    messageKey: 'practiceSelectionRequired',
    params: { teamNum: 1, teamName: 'Team Name' }
  });
  return errors;
}
```

---

## Validated Fields

### Slot Preference Selects:
- `slotPref2h_1`, `slotPref2h_2`, `slotPref2h_3` - 2-hour session preferences
- `slotPref1h_1`, `slotPref1h_2`, `slotPref1h_3` - 1-hour session preferences

**Validation:** No duplicate slot selections across all preferences

### Team Practice Data (Virtual Fields):
- `practiceTeam1`, `practiceTeam2`, ..., `practiceTeamN` - Team-level practice validation

**Validation:**
- At least one practice date selected
- At least one slot preference selected
- Total practice hours >= 12
- Each practice date has valid date, duration (1h or 2h), and helper selection

---

## Error Field IDs

### Slot Duplicate Errors:
- Field ID: Select element ID (e.g., `slotPref2h_1`)
- Error div: Created automatically by error system
- Location: Below the select element

### Team Practice Errors:
- Field ID: `practiceTeam{teamNum}` (e.g., `practiceTeam1`)
- Error div: Created automatically by error system
- Location: Error system will find appropriate container or create div

**Note:** Since `practiceTeam{teamNum}` is a virtual field ID (not an actual DOM element), the error system will create the error div in a sensible location (typically near the calendar container or team selector).

---

## Benefits

### User Experience:
- ✅ **Form error summary** shows all errors at once (2+ errors)
- ✅ **Clickable links** to jump to problematic fields
- ✅ **Inline error messages** for slot selects
- ✅ **Team-level error messages** clearly identify which team has issues
- ✅ **Consistent styling** across all error types
- ✅ **i18n support** for all error messages
- ✅ **Accessibility** with ARIA attributes

### Developer Experience:
- ✅ **Less code duplication** - no manual DOM manipulation
- ✅ **Centralized error handling** - one system for all errors
- ✅ **Type safety** - structured error objects
- ✅ **Easier maintenance** - changes to error system affect all forms
- ✅ **Better testing** - can test error system independently
- ✅ **Backward compatible** - falls back to legacy methods if needed

---

## Testing Checklist

After migration, test the following scenarios:

- [ ] **No practice dates selected** - Shows "practiceSelectionRequired" error
- [ ] **No slot preferences selected** - Shows "practiceTimeSlotRequired" error
- [ ] **Less than 12 hours total** - Shows "practiceHoursMinimum" error
- [ ] **Duplicate slot selections** - Shows "duplicateSlotSelection" on affected selects
- [ ] **Invalid practice date** - Shows "practiceDateInvalid" error
- [ ] **Invalid duration** - Shows "practiceDurationInvalid" error
- [ ] **Missing helper selection** - Shows "practiceHelperRequired" error
- [ ] **Multiple teams with errors** - Shows form error summary with all errors
- [ ] **Single team error** - Scrolls to and focuses appropriate area
- [ ] **Error summary links** - Clicking link scrolls to field/team
- [ ] **Error summary close button** - Dismisses summary (keeps field errors)
- [ ] **Language switching** - Error messages update to new language
- [ ] **Mobile view** - Error summary displays correctly on small screens
- [ ] **Team switching** - Errors clear when switching teams (if applicable)

---

## Files Modified

1. **`public/js/tn_wizard.js`**
   - Refactored `validateStep4()` - Uses error system (lines 5818-5860)
   - Refactored `checkForDuplicates()` - Returns error array (lines 3487-3529)
   - Refactored `validatePracticeRequired()` - Returns error array (lines 4638-4736)
   - Updated `showSlotError()` - Uses error system when available (lines 3551-3571)
   - Updated `clearSlotErrors()` - Uses error system when available (lines 3576-3605)

2. **`public/js/i18n/translations.js`**
   - Added practice validation messages (English & Traditional Chinese)

---

## Next Steps

1. ✅ **Step 1 Migration** - Complete
2. ✅ **Step 2 Migration** - Complete
3. ✅ **Step 3 Migration** - Complete
4. ✅ **Step 4 Migration** - Complete
5. ⏳ **Step 5 Migration** - Summary validation (if needed)
6. ⏳ **Remove Legacy Code** - Remove `showError()`, `hideError()`, `highlightField()`, `clearFieldHighlighting()` if no longer used

---

## Notes

- **Virtual field IDs:** Team practice errors use `practiceTeam{teamNum}` which is not an actual DOM element. The error system will create error divs automatically.
- **Slot select errors:** Use actual select element IDs (`slotPref2h_1`, etc.) for precise error placement.
- **Backward compatibility:** All functions maintain fallback to legacy methods if error system not available.
- **Error div creation:** Error system automatically creates error divs with class `field-error-message` and ID `error-{fieldId}`.
- **Container for error summary:** Uses `wizardMount` (contains the practice form).
- **Team name in errors:** Uses `tn_team_name_en_{teamNum}` if available, falls back to `tn_team_name_{teamNum}`, then `Team {teamNum}`.
