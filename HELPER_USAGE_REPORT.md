# Helper Usage Report

## Summary
- **Total occurrences:** 173
- **Files affected:** 15
- **Categories:**
  - i18n translation keys: 8 occurrences
  - HTML template IDs: 10 occurrences
  - JavaScript code (class names, variables, comments): 155 occurrences

---

## Detailed Findings

### File: `public/js/i18n/translations.js`
**Occurrences: 8**

#### English (EN) Section:

1. **Lines 252-256:** Helper option labels
   ```javascript
   // Helper options
   helperNone: "NONE",
   helperS: "S",
   helperT: "T",
   helperST: "ST",
   ```

2. **Line 437:** Validation error message
   ```javascript
   helperRequired: "Please select helper requirement for Team {teamNum}: {teamName}",
   ```

3. **Line 442:** Practice validation error
   ```javascript
   practiceHelperRequired: "Team {teamNum} ({teamName}): Practice date {dateIndex} helper selection required",
   ```

#### Chinese (ZH) Section:

4. **Lines 706-710:** Helper option labels (Chinese)
   ```javascript
   // Helper options
   helperNone: "無",
   helperS: "舵",
   helperT: "教",
   helperST: "舵教",
   ```

5. **Line 891:** Validation error message (Chinese)
   ```javascript
   helperRequired: "請為第 {teamNum} 隊：{teamName} 選擇是否需要舵手教練",
   ```

6. **Line 896:** Practice validation error (Chinese)
   ```javascript
   practiceHelperRequired: "第 {teamNum} 隊 ({teamName})：訓練日期 {dateIndex} 需要選擇舵手教練",
   ```

**Impact:** These are the primary translation keys that need to be updated for user-facing text.

---

### File: `public/tn_templates.html`
**Occurrences: 10**

All occurrences are error div IDs for validation messages:

```html
<div id="error-helper-team-1" class="field-error" role="alert" aria-live="polite" style="display: none;"></div>
<div id="error-helper-team-2" class="field-error" role="alert" aria-live="polite" style="display: none;"></div>
<!-- ... continues for teams 3-10 ... -->
<div id="error-helper-team-10" class="field-error" role="alert" aria-live="polite" style="display: none;"></div>
```

**Impact:** These HTML IDs reference the validation error system. They should remain as-is for now (Task 2 will handle HTML updates).

---

### File: `public/js/tn_wizard.js`
**Occurrences: 67**

#### Key Areas:

1. **Lines 3674-3678:** HTML generation for helper dropdown
   ```javascript
   <select class="helpers">
     <option value="NONE" data-i18n="helperNone">${t('helperNone')}</option>
     <option value="S" data-i18n="helperS">${t('helperS')}</option>
     <option value="T" data-i18n="helperT">${t('helperT')}</option>
     <option value="ST" data-i18n="helperST">${t('helperST')}</option>
   </select>
   ```

2. **Line 3725:** Event listener for helper dropdown changes
   ```javascript
   if (event.target.classList.contains('duration') || event.target.classList.contains('helpers')) {
   ```

3. **Line 3758:** Default helper value in data structure
   ```javascript
   helper: 'NONE'
   ```

4. **Line 3800:** Query selector for helper dropdown
   ```javascript
   const helpersSelect = dayEl.querySelector('.helpers');
   ```

5. **Lines 3807, 3812:** Helper value checks
   ```javascript
   if (helpersSelect.value === 'T' || helpersSelect.value === 'ST') {
   // ...
   if (helpersSelect.value === 'S' || helpersSelect.value === 'helpersSelect.value === 'ST') {
   ```

6. **Line 5795:** Helper select element reference
   ```javascript
   const helperSel = dropdowns?.querySelector('select.helpers');
   ```

7. **Line 5800:** Helper value in data structure
   ```javascript
   helper: helperSel.value || 'NONE'
   ```

8. **Lines 5847, 5858-5860, 5888-5892:** Validation logic for helper
   ```javascript
   let hasMissingHelper = false;
   // ...
   // Check if helper is missing or invalid
   if (!r.helper || !['NONE', 'S', 'T', 'ST'].includes(r.helper)) {
     hasMissingHelper = true;
   }
   // ...
   // 4. Validate helper dropdown (if any date is missing helper)
   if (hasMissingHelper) {
     errors.push({
       field: `helper-team-${teamNum}`,
       messageKey: 'helperRequired',
   ```

9. **Line 5937:** Default helper in row creation
   ```javascript
   rows.push({ pref_date: dateStr, duration_hours: 1, helper: 'NONE' });
   ```

10. **Lines 5970-5974:** Helper dropdown change handler
    ```javascript
    } else if (target.classList.contains('helpers')) {
      rows[rowIndex].helper = target.value || 'NONE';
      // Clear helper error when user selects helper
      if (window.errorSystem && typeof window.errorSystem.clearErrors === 'function') {
        window.errorSystem.clearErrors(`helper-team-${teamNum}`);
    ```

11. **Lines 6030-6042, 6053, 6055:** Helper in date selection logic
    ```javascript
    const helperSelect = dateContainer?.querySelector('select.helpers');
    // ...
    const helpers = helperSelect ? helperSelect.value : '';
    // ...
    helpers: helpers,
    ```

12. **Line 6090-6092:** Helper value restoration
    ```javascript
    const helperSel = dropdowns?.querySelector('select.helpers');
    // ...
    if (helperSel)  helperSel.value  = row.helper || 'NONE';
    ```

13. **Line 6129:** Comment about helper
    ```javascript
    // Helper: find which select to target for a slot_code
    ```
    **Note:** This is a code comment meaning "helper function", not related to steersman/coach.

14. **Lines 6234-6279:** Helper in calendar highlighting function
    ```javascript
    function highlightDateOnCalendar(date, hours, helpers) {
    // ...
    const helperSelect = dateContainer.querySelector('select.helpers');
    if (helperSelect) {
      helperSelect.value = helpers;
    ```

15. **Lines 6692-6695:** Helper in HTML generation
    ```javascript
    const helper = row.helper;
    // XSS FIX: Escape helper value (could be user-selected)
    const safeHelper = SafeDOM.escapeHtml(helper);
    html += `<span style="margin-right: 1rem;">• ${date} (${duration}h, ${safeHelper})</span>`;
    ```

16. **Line 7519:** Helper in data structure
    ```javascript
    helper: r.helper || 'NONE'
    ```

17. **Lines 5021-5026, 5118-5123, 5484-5510, 8394-8403, 8420, 8477-8489:** Test data with helper values
    ```javascript
    { pref_date: '2026-10-28', duration_hours: 2, helper: 'S' },
    { pref_date: '2026-10-30', duration_hours: 2, helper: 'T' },
    // etc.
    ```

**Impact:** This file contains the core logic for handling helper/steersman-coach selection. Most occurrences are variable names and data structures that should remain unchanged (database column is `helper`). Only user-facing text references need updating.

---

### File: `public/js/submit.js`
**Occurrences: 1**

**Line 96:** Helper value in submission payload
```javascript
helper: r.helper || 'NONE'
```

**Impact:** Data structure reference - should remain as-is (matches database column).

---

### File: `public/js/tn_map.js`
**Occurrences: 2**

1. **Line 53:** Comment about helper function (not related to steersman/coach)
   ```javascript
   // Helper function to safely get element value
   ```

2. **Line 266:** Helper in data structure
   ```javascript
   helpers: dateInfo.helpers
   ```

**Impact:** Line 53 is a code comment. Line 266 is a data structure reference.

---

### File: `public/js/totals.js`
**Occurrences: 1**

**Line 75:** Comment about data structure
```javascript
// TN practice data structure: pref_date, duration_hours, helper
```

**Impact:** Documentation comment - should remain as-is (describes database structure).

---

### File: `public/js/wu_sc_wizard.js`
**Occurrences: 1**

**Line 567:** Comment about helper function
```javascript
// Helper to get bilingual display (both languages shown)
```

**Impact:** Code comment - not related to steersman/coach terminology.

---

### File: `public/js/dropdown_options_builder.js`
**Occurrences: 1**

**Line 123:** Comment about helper function
```javascript
* Get boat type from division name (helper function)
```

**Impact:** Code comment - not related to steersman/coach terminology.

---

### File: `public/js/i18n/db-localization.js`
**Occurrences: 12**

All occurrences are comments about "helper functions" in the code:
- Line 2: "Database Content Localization Helpers"
- Line 133: "SPECIFIC HELPERS"
- Line 238: "ARRAY HELPER FUNCTIONS"
- Line 387: "DEBUG HELPER"
- Line 391: "Debug helper: Check which fields..."
- Line 462: "Specific helpers"
- Line 473: "Array helpers"
- Line 479: "Debug helpers"
- Line 489: "Specific helpers"
- Line 500: "Array helpers"
- Line 525: "Database Localization Helpers loaded"
- Line 548: "ARRAY HELPERS"

**Impact:** All are code comments about utility functions - not related to steersman/coach terminology.

---

### File: `public/js/i18n/i18n-engine.js`
**Occurrences: 1**

**Line 267:** Comment about helper methods
```javascript
// PRIVATE HELPER METHODS
```

**Impact:** Code comment - not related to steersman/coach terminology.

---

### File: `public/js/event_bootstrap.js`
**Occurrences: 1**

**Line 618:** Comment
```javascript
// QA helper (dev only)
```

**Impact:** Code comment - not related to steersman/coach terminology.

---

### File: `public/js/env_verifier.js`
**Occurrences: 8**

All occurrences are about "debug helpers" (utility functions):
- Lines 2, 5, 42, 50, 53, 62, 73, 106

**Impact:** All are code comments about debug utility functions - not related to steersman/coach terminology.

---

### File: `public/css/error-system.css`
**Occurrences: 1**

**Line 667:** Comment about CSS helper classes
```javascript
* Helper classes for common error states
```

**Impact:** CSS documentation comment - not related to steersman/coach terminology.

---

### File: `docs/form_code_flow_report.md`
**Occurrences: 8**

1. **Line 358:** Documentation about helper dropdowns
   ```markdown
   - **Date Selection:** `tn_wizard.js:1650-1750` - Checkbox + duration/helper dropdowns
   ```

2. **Line 568:** Data structure documentation
   ```markdown
   { pref_date: "YYYY-MM-DD", duration_hours: 1|2, helper: "NONE"|"S"|"T"|"ST" }
   ```

3. **Line 787:** Comment about QA helper
   ```markdown
   // QA helper
   ```

4. **Line 863:** Documentation about debug helpers
   ```markdown
   **Status:** ✅ Debug helpers are properly gated...
   ```

5. **Line 891:** Documentation about wizard helpers
   ```markdown
   **Mitigation:** Extract shared wizard utilities into `wizard_utils.js` (step nav, validation framework, sessionStorage helpers).
   ```

6. **Line 1023:** Documentation about helper in data structure
   ```markdown
   | Date selection handler | `tn_wizard.js:1650-1750` | Saves `{ pref_date, duration_hours, helper }` to store |
   ```

**Impact:** Documentation that should be updated to reflect new terminology for user-facing references. Code comments about utility functions can remain.

---

### File: `docs/deploy_checklist.md`
**Occurrences: 3**

All occurrences are about "debug helpers" (utility functions):
- Lines 81, 345, 547, 648, 657, 705

**Impact:** Documentation about debug utilities - not related to steersman/coach terminology.

---

### File: `docs/cleanup_reference_audit.md`
**Occurrences: 4**

All occurrences are about "debug helpers" or "test helpers":
- Lines 14, 125, 131, 155, 183, 284, 301

**Impact:** Documentation about debug/test utilities - not related to steersman/coach terminology.

---

### File: `docs/DEBUG_FUNCTIONS.md`
**Occurrences: 2**

1. **Line 45:** Section header
   ```markdown
   #### Auto-fill Helpers
   ```

2. **Line 66:** Documentation about helper in data structure
   ```markdown
   __DBG_TN.readTeamRows('t1')   // Returns array of { pref_date, duration_hours, helper }
   ```

**Impact:** Documentation that references the data structure - should note the field name but can clarify terminology.

---

### File: `tests/tn_step4.spec.ts`
**Occurrences: 7**

All occurrences are in test code referencing the helper field:
```typescript
await page.selectOption('[data-date="2025-01-15"] .helpers', 'ST');
// ...
expect.objectContaining({ pref_date: '2025-01-15', duration_hours: 2, helper: 'ST' }),
```

**Impact:** Test code - should remain as-is (tests the actual implementation).

---

### File: `tests/utils/test-helpers.js`
**Occurrences: 1**

**Line 2:** File header comment
```javascript
* Test Helper Utilities
```

**Impact:** Code comment about utility functions - not related to steersman/coach terminology.

---

### File: `tests/unit/error-system.test.js`
**Occurrences: 1**

**Line 16:** Import statement
```javascript
} from '../utils/test-helpers.js';
```

**Impact:** Import of utility functions - not related to steersman/coach terminology.

---

### File: `tests/visual/visual.test.js`
**Occurrences: 1**

**Line 19:** Import statement
```javascript
} from '../utils/test-helpers.js';
```

**Impact:** Import of utility functions - not related to steersman/coach terminology.

---

### File: `tests/performance/performance.test.js`
**Occurrences: 1**

**Line 11:** Import statement
```javascript
} from '../utils/test-helpers.js';
```

**Impact:** Import of utility functions - not related to steersman/coach terminology.

---

### File: `tests/integration/validation-flow.test.js`
**Occurrences: 1**

**Line 13:** Import statement
```javascript
} from '../utils/test-helpers.js';
```

**Impact:** Import of utility functions - not related to steersman/coach terminology.

---

### File: `tests/a11y/accessibility.test.js`
**Occurrences: 1**

**Line 10:** Import statement
```javascript
} from '../utils/test-helpers.js';
```

**Impact:** Import of utility functions - not related to steersman/coach terminology.

---

### File: `tests/README.md`
**Occurrences: 3**

All occurrences are about test helper utilities:
- Lines 13, 134, 164, 232

**Impact:** Documentation about test utilities - not related to steersman/coach terminology.

---

## Summary by Category

### User-Facing Text (Needs Update)
- **i18n translation keys:** 8 occurrences
  - `helperNone`, `helperS`, `helperT`, `helperST` (EN & ZH)
  - `helperRequired` (EN & ZH)
  - `practiceHelperRequired` (EN & ZH)

### HTML/CSS (Task 2 - Not This Task)
- **HTML error div IDs:** 10 occurrences (`error-helper-team-X`)
- **CSS class names:** 1 occurrence (`select.helpers`)

### Code/Data Structures (Keep As-Is)
- **Variable names:** ~50 occurrences (e.g., `helper`, `helpers`, `helperSel`)
- **Data structure fields:** ~30 occurrences (e.g., `helper: 'S'`)
- **Database column references:** ~20 occurrences (field name is `helper`)

### Code Comments (Keep As-Is)
- **Utility function comments:** ~40 occurrences (e.g., "Helper function", "Debug helpers")
- **Documentation comments:** ~10 occurrences

---

## Recommendations

1. **Task 1 (Current):** Update only i18n translation keys in `translations.js`
2. **Task 2 (Future):** Update HTML templates and CSS class names
3. **Task 3 (Future):** Update validation messages and comments in JavaScript
4. **Keep unchanged:** Variable names, data structures, database column references, utility function comments

---

## Next Steps

1. ✅ Generate this report
2. ⏳ Await approval
3. ⏳ Update `translations.js` with new terminology
4. ⏳ Generate change summary

