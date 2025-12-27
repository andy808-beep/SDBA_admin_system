# Dropdown Locations Report

## Summary
- **Duration dropdowns found:** 0 (static HTML) / Dynamic generation in JavaScript
- **Helper/Steersman-Coach dropdowns found:** 0 (static HTML) / Dynamic generation in JavaScript
- **Files affected:** 2
  - `public/js/tn_wizard.js` - Dynamic dropdown generation
  - `public/tn_templates.html` - Error divs already exist

---

## Key Finding: Dynamic Generation

**Important:** The duration and helper dropdowns are **NOT** in static HTML templates. They are **dynamically generated** via JavaScript in `tn_wizard.js`.

### Location: `public/js/tn_wizard.js`

#### Function: `createDayContent(day)` - Lines 3639-3683

This function generates HTML for each calendar day, including the dropdowns.

**Current Duration Dropdown (Lines 3670-3673):**
```javascript
<select class="duration">
  <option value="1" data-i18n="oneHour">${t('oneHour')}</option>
  <option value="2" data-i18n="twoHours">${t('twoHours')}</option>
</select>
```

**Analysis:**
- ✅ **No blank option** - Good!
- ❌ **No default selection** - Needs `selected` on value="2"
- ✅ **Has i18n attributes** - Good!
- ❌ **No `required` attribute** - Not needed (already removed)
- ❌ **No label** - Not needed (dropdowns appear inline with calendar)

**Current Helper Dropdown (Lines 3674-3679):**
```javascript
<select class="helpers">
  <option value="NONE" data-i18n="helperNone">${t('helperNone')}</option>
  <option value="S" data-i18n="helperS">${t('helperS')}</option>
  <option value="T" data-i18n="helperT">${t('helperT')}</option>
  <option value="ST" data-i18n="helperST">${t('helperST')}</option>
</select>
```

**Analysis:**
- ✅ **No blank option** - Good!
- ❌ **No default selection** - Needs `selected` on value="NONE"
- ❌ **Uses old i18n keys** - Needs update to `steersmanCoach*` keys
- ❌ **No `required` attribute** - Not needed (already removed)
- ❌ **No label** - Not needed (dropdowns appear inline with calendar)

---

## Static HTML Templates

### File: `public/tn_templates.html`

**Finding:** No static duration or helper dropdowns found in HTML.

**Error Divs Status:**
- ✅ **Error divs already exist** (Lines 191-219)
  - `error-duration-team-1` through `error-duration-team-10` (10 divs)
  - `error-helper-team-1` through `error-helper-team-10` (10 divs)
  - All properly configured with `class="field-error"`, `role="alert"`, `aria-live="polite"`

**Note:** These error divs are team-level, but the dropdowns are date-level (one per calendar date). The error divs are used for team-level validation errors.

---

### File: `public/wu_sc_templates.html`

**Finding:** No duration or helper dropdowns found.

**Reason:** WU/SC forms do not have practice booking functionality. Practice booking is TN-only.

---

## JavaScript Code References

### Files That Reference These Dropdowns:

1. **`public/js/tn_wizard.js`** - Main generation and handling
   - Line 3639-3683: `createDayContent()` - Generates dropdowns
   - Line 3799-3800: Query selectors for `.duration` and `.helpers`
   - Line 5794-5795: Query selectors in save functions
   - Line 6031-6032: Query selectors in date selection logic
   - Line 6089-6090: Query selectors in calendar update
   - Line 6268-6270: Helper dropdown value setting

2. **`public/js/submit.js`** - Submission handling
   - Line 96: Helper value in submission payload

3. **`public/js/tn_map.js`** - State mapping
   - Line 266: Helper in data structure

**Note:** All JavaScript code uses class selectors (`.duration`, `.helpers`), not IDs. This is correct since dropdowns are generated per calendar date.

---

## Detailed Findings

### Duration Dropdown - Dynamic Generation

**Location:** `public/js/tn_wizard.js:3670-3673`

**Current Structure:**
```javascript
<select class="duration">
  <option value="1" data-i18n="oneHour">${t('oneHour')}</option>
  <option value="2" data-i18n="twoHours">${t('twoHours')}</option>
</select>
```

**Issues:**
1. ❌ No default selection (should default to "2")
2. ✅ No blank option (good)
3. ✅ Has i18n attributes (good)
4. ✅ No `required` attribute (good - not needed)

**Required Changes:**
- Add `selected` to value="2" option
- Verify i18n keys exist (`oneHour`, `twoHours`)

---

### Helper/Steersman-Coach Dropdown - Dynamic Generation

**Location:** `public/js/tn_wizard.js:3674-3679`

**Current Structure:**
```javascript
<select class="helpers">
  <option value="NONE" data-i18n="helperNone">${t('helperNone')}</option>
  <option value="S" data-i18n="helperS">${t('helperS')}</option>
  <option value="T" data-i18n="helperT">${t('helperT')}</option>
  <option value="ST" data-i18n="helperST">${t('helperST')}</option>
</select>
```

**Issues:**
1. ❌ No default selection (should default to "NONE")
2. ❌ Uses old i18n keys (`helperNone`, `helperS`, etc.)
3. ✅ No blank option (good)
4. ✅ Values are correct (S/T/ST/NONE)
5. ✅ No `required` attribute (good - not needed)

**Required Changes:**
- Add `selected` to value="NONE" option
- Update i18n keys to new `steersmanCoach*` keys:
  - `helperNone` → `steersmanCoachNone`
  - `helperS` → `steersmanCoachS`
  - `helperT` → `steersmanCoachT`
  - `helperST` → `steersmanCoachST`

---

## Error Divs Status

### File: `public/tn_templates.html`

**Lines 191-219:** Error divs already exist for all teams (1-10)

**Duration Error Divs:**
- `error-duration-team-1` through `error-duration-team-10`
- All properly configured

**Helper Error Divs:**
- `error-helper-team-1` through `error-helper-team-10`
- All properly configured

**Note:** These are team-level error divs. The dropdowns themselves are date-level (one per calendar date), so these error divs are used for team-level validation messages (e.g., "Team 1 needs to select duration for at least one date").

---

## Summary of Required Changes

### 1. Duration Dropdown (`public/js/tn_wizard.js:3670-3673`)
- ✅ No blank option (already correct)
- ❌ Add `selected` to value="2" option
- ✅ Keep i18n attributes
- ✅ No `required` attribute (already correct)

### 2. Helper/Steersman-Coach Dropdown (`public/js/tn_wizard.js:3674-3679`)
- ✅ No blank option (already correct)
- ❌ Add `selected` to value="NONE" option
- ❌ Update i18n keys to `steersmanCoach*` keys
- ✅ Values are correct (S/T/ST/NONE)
- ✅ No `required` attribute (already correct)

### 3. Error Divs (`public/tn_templates.html`)
- ✅ Already exist (no changes needed)

---

## Files That Need Updates

1. **`public/js/tn_wizard.js`** - Update `createDayContent()` function
   - Set default for duration dropdown (value="2")
   - Set default for helper dropdown (value="NONE")
   - Update i18n keys for helper dropdown

2. **No HTML template changes needed** - Dropdowns are dynamically generated

---

## Verification Checklist

After changes, verify:
- [ ] Duration dropdown defaults to "2" when calendar date is selected
- [ ] Helper dropdown defaults to "NONE" when calendar date is selected
- [ ] Helper dropdown shows new terminology (Steersman & Coach)
- [ ] No blank options appear in either dropdown
- [ ] Error divs still exist and work correctly
- [ ] i18n translations work for both languages (EN/ZH)

---

## Notes

1. **No Static HTML Dropdowns:** All dropdowns are generated dynamically, so no HTML template changes are needed.

2. **Error Divs Are Team-Level:** The error divs in the HTML template are for team-level validation errors, not per-date errors. This is correct for the validation system.

3. **Class Selectors:** JavaScript uses class selectors (`.duration`, `.helpers`) which is correct since there are multiple dropdowns (one per calendar date).

4. **WU/SC Forms:** No practice booking, so no dropdowns to update.

---

## Next Steps

1. ✅ Generate this report
2. ⏳ Await approval
3. ⏳ Update `public/js/tn_wizard.js` `createDayContent()` function
4. ⏳ Test in browser to verify defaults work
5. ⏳ Generate change summary

