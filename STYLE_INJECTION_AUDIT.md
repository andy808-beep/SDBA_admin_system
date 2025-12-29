# Style Tag Injection Audit

## Summary
This audit identifies all places where `<style>` tags are created and injected into the DOM, and whether they are cleaned up when leaving steps.

## Findings

### 1. Style Tag Creation Locations

#### A. `initStepNavigation()` - Line 373
**File:** `public/js/tn_wizard.js`  
**Function:** `initStepNavigation()`  
**When Called:** Once during wizard initialization (called from `initTNWizard()`)  
**Style ID:** None (no ID assigned)  
**Styles Injected:**
- Stepper container styles
- Step indicator styles (active/completed states)
- Navigation button styles (TN theme colors)
- Race Info page styles (Step 0)
- **Does NOT include:** Package options styles (`.package-options`, `.package-box`)

**Cleanup:** ❌ **NEVER REMOVED** - Persists for entire session

**Code:**
```javascript
const style = document.createElement('style');
style.textContent = `...`; // ~165 lines of CSS
document.head.appendChild(style);
```

---

#### B. `addCalendarStyles()` - Line 4209
**File:** `public/js/tn_wizard.js`  
**Function:** `addCalendarStyles()`  
**When Called:** From `createTNCalendar()` (line 3823) when calendar is initialized  
**Style ID:** `'tn-calendar-styles'`  
**Check Before Adding:** ✅ Checks if `#tn-calendar-styles` already exists (line 3822)

**Styles Injected:**
- Calendar month block styles
- Calendar day styles
- Dropdown styles
- **Package options styles** (`.package-options`, `.package-box`) - Lines 4390-4518
- Team field styles
- Form styles
- Organization form styles
- Race day form styles
- Error message styles
- **Total: ~600 lines of CSS**

**Cleanup:** ❌ **NEVER REMOVED** - Persists after leaving Step 4

**Code:**
```javascript
function addCalendarStyles() {
  const style = document.createElement('style');
  style.id = 'tn-calendar-styles';
  style.textContent = `...`; // ~600 lines of CSS including package-options
  document.head.appendChild(style);
}
```

**Called From:**
- `createTNCalendar()` (line 3822-3823) - Only if `#tn-calendar-styles` doesn't exist
- `createTNCalendar()` is called from `initCalendarContainer()` (line 3651)
- `initCalendarContainer()` is called from `initStep4()` (line 3460)

---

#### C. Loading Overlay Styles - Line 8558
**File:** `public/js/tn_wizard.js`  
**Function:** Inside `submitTNForm()` function  
**When Called:** When form submission starts  
**Style ID:** None  
**Styles Injected:**
- Loading overlay styles
- Loading spinner styles

**Cleanup:** ❌ **NEVER REMOVED** - Persists after submission

**Code:**
```javascript
const style = document.createElement('style');
style.textContent = `...`; // Loading overlay CSS
document.head.appendChild(style);
```

---

### 2. Step 1 Entry Option Styles

**Location:** Lines 4390-4518 in `addCalendarStyles()` function  
**Problem:** ❌ **Step 1 styles are injected by Step 4!**

**Styles Include:**
- `.package-options` (grid layout)
- `.package-box` (border, padding, hover effects)
- `.package-option.selected` (selection state)
- `.package-header`, `.package-price`, `.package-details`

**When Injected:**
- Step 4 initialization calls `initStep4()`
- `initStep4()` calls `initCalendarContainer()` (line 3460)
- `initCalendarContainer()` calls `createTNCalendar()` (line 3651)
- `createTNCalendar()` calls `addCalendarStyles()` (line 3823)
- `addCalendarStyles()` injects ALL styles including package options

**Result:** Step 1 package option styles are injected when visiting Step 4, and **never removed**.

---

### 3. Step 4 Calendar Styles

**Location:** Lines 4220-4335 in `addCalendarStyles()` function  
**Styles Include:**
- `.month-block`, `.month-toggle`, `.month-content`
- `.weekdays`, `.month-grid`
- `.calendar-day`, `.day-checkbox`
- `.dropdowns`, `.dropdowns.hide`

**When Injected:**
- Same path as Step 1 styles (see above)
- Only injected once (checked by ID `#tn-calendar-styles`)

**Cleanup:** ❌ **NEVER REMOVED**

---

### 4. Style Cleanup Analysis

**Searched For:**
- `removeChild` with style elements
- `removeElement` with style elements
- Style cleanup code
- Step exit handlers

**Result:** ❌ **NO CLEANUP CODE FOUND**

**No cleanup happens when:**
- Leaving Step 1
- Leaving Step 4
- Navigating between steps
- Form submission completes

---

## Critical Issues

### Issue 1: Step 1 Styles Injected by Step 4
**Problem:** Package option styles (`.package-options`, `.package-box`) are injected when Step 4 loads, not Step 1.

**Impact:**
- Step 1 may not have styles when first visited
- Styles persist after leaving Step 4
- Could cause styling conflicts

**Evidence:**
- `addCalendarStyles()` contains package option styles (lines 4390-4518)
- `addCalendarStyles()` is only called from `createTNCalendar()` (Step 4)
- No separate function injects Step 1 styles

### Issue 2: No Style Cleanup
**Problem:** All injected styles persist for the entire session.

**Impact:**
- Styles accumulate in `<head>`
- Potential CSS conflicts
- Memory leak (minor)

**Evidence:**
- No `removeChild()` calls for style elements
- No cleanup in step exit handlers
- Styles remain in DOM after navigation

### Issue 3: Duplicate Style Check Only for Calendar
**Problem:** Only `addCalendarStyles()` checks for existing styles before injecting.

**Impact:**
- `initStepNavigation()` styles could be injected multiple times
- Loading overlay styles could be duplicated

**Evidence:**
- Line 3822: `if (!document.getElementById('tn-calendar-styles'))` ✅
- Line 373: No check before appending ✅
- Line 8558: No check before appending ✅

---

## Recommendations

### Fix 1: Separate Step 1 Styles
Create a separate function `addStep1Styles()` that injects package option styles when Step 1 loads:

```javascript
function addStep1Styles() {
  if (document.getElementById('tn-step1-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'tn-step1-styles';
  style.textContent = `
    /* Package Options Styles */
    #tnScope .package-options { ... }
    #tnScope .package-box { ... }
    /* ... other Step 1 styles ... */
  `;
  document.head.appendChild(style);
}
```

Call from `initStep1()` instead of relying on Step 4.

### Fix 2: Remove Package Styles from Calendar Styles
Remove lines 4390-4518 from `addCalendarStyles()` since they belong to Step 1, not Step 4.

### Fix 3: Add Style Cleanup
Add cleanup when leaving steps:

```javascript
function cleanupStepStyles(step) {
  if (step === 1) {
    const style = document.getElementById('tn-step1-styles');
    if (style) style.remove();
  }
  if (step === 4) {
    const style = document.getElementById('tn-calendar-styles');
    if (style) style.remove();
  }
}
```

Call from `loadStep()` before loading new step.

### Fix 4: Add IDs to All Style Tags
Add unique IDs to all style tags for easier management:

```javascript
// initStepNavigation()
style.id = 'tn-navigation-styles';

// Loading overlay
style.id = 'tn-loading-overlay-styles';
```

---

## File Locations Summary

| Line | Function | Style ID | When Called | Cleanup |
|------|----------|----------|-------------|---------|
| 373 | `initStepNavigation()` | None | Wizard init | ❌ Never |
| 4209 | `addCalendarStyles()` | `tn-calendar-styles` | Step 4 init | ❌ Never |
| 8558 | `submitTNForm()` | None | Form submit | ❌ Never |

---

## Conclusion

**Root Cause of Step 1/2 Issues After Step 4:**
Step 4's `addCalendarStyles()` function injects package option styles that should belong to Step 1. These styles persist after leaving Step 4 and may interfere with Step 1/2 restoration or styling.

**Immediate Fix:**
1. Remove package option styles from `addCalendarStyles()`
2. Create separate `addStep1Styles()` function
3. Call `addStep1Styles()` from `initStep1()`
4. Add cleanup when leaving steps



