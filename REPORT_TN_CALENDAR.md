# TN Calendar Visibility Analysis Report

## 1) Runtime mode & step

### Mode Decision
**File:** `public/js/event_bootstrap.js:296-336`
```javascript
if (ref === 'tn') {
  // TN Legacy Wizard Path
  console.log('🎯 TN Mode: Loading templates and initializing wizard');
  // ... config loading ...
  await loadTNTemplates();
  await initTNWizard();
}
```

**Mode is determined by URL parameter `?e=tn`** and routes to `tn_wizard` mode.

### Step Management
**File:** `public/js/tn_wizard.js:224-266`
```javascript
function loadStepContent(step) {
  console.log(`loadStepContent: Loading step ${step}`);
  // ... template cloning ...
  switch (step) {
    case 4:
      initStep4();
      break;
  }
}
```

**Step 4 handler calls `initStep4()`** which should initialize the calendar.

## 2) Template presence & mount timing

### Template Verification
**File:** `public/tn_templates.html:153-171`
```html
<template id="tn-step-4">
  <div class="card">
    <h2>🛶 Practice Booking (Jan–Jul 2026)</h2>
    <!-- ... -->
    <div id="calendarContainer" class="calendar-wrapper"></div>
    <!-- ... -->
  </div>
</template>
```

**Template exists with `id="tn-step-4"` and contains `#calendarContainer`**.

### Mount Process
**File:** `public/js/tn_wizard.js:241-247`
```javascript
// Clone template content
const content = template.content.cloneNode(true);
wizardMount.innerHTML = '';
wizardMount.appendChild(content);

// Ensure content is properly scoped within #tnScope
console.log('loadStepContent: Content loaded into #tnScope container');
```

**Content is cloned and appended to `#wizardMount`**, then `initStep4()` is called.

## 3) Calendar init path

### Calendar Initialization Flow
**File:** `public/js/tn_wizard.js:430-463`
```javascript
function initCalendarContainer() {
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) return;
  
  // Guard against double-init if the user navigates back/forward
  if (calendarEl.dataset.initialized === 'true') {
    console.log('initCalendarContainer: Calendar already initialized, skipping');
    return;
  }
  
  // Check if there's existing calendar initialization (legacy)
  if (window.initCalendar && typeof window.initCalendar === 'function') {
    console.log('initCalendarContainer: Using legacy window.initCalendar');
    window.initCalendar();
    calendarEl.dataset.initialized = 'true';
    return;
  }
  
  // Use new initTNCalendar function
  console.log('initCalendarContainer: Using initTNCalendar');
  const p = window.__CONFIG?.practice || {};
  initTNCalendar({
    mount: '#calendarContainer',
    windowStart: p.practice_start_date || p.window_start,
    windowEnd: p.practice_end_date || p.window_end,
    allowedWeekdays: p.allowed_weekdays || [1,2,3,4,5,6,0]
  });
  
  // Mark as initialized to prevent double-init
  calendarEl.dataset.initialized = 'true';
  
  // Dev logger
  logCalendarState();
}
```

**Calendar init path exists** with legacy fallback and new `initTNCalendar` function.

### Dev Logger
**File:** `public/js/tn_wizard.js:490-498`
```javascript
function logCalendarState() {
  console.log('📅 Calendar State:');
  console.log('  - Config:', window.__CONFIG?.practice);
  console.log('  - Container:', document.getElementById('calendarContainer'));
  console.log('  - Initialized:', document.getElementById('calendarContainer')?.dataset.initialized);
  console.log('  - Window start:', window.__CONFIG?.practice?.practice_start_date);
  console.log('  - Window end:', window.__CONFIG?.practice?.practice_end_date);
  console.log('  - Allowed weekdays:', window.__CONFIG?.practice?.allowed_weekdays);
}
```

**`logCalendarState()` is called** after calendar initialization.

## 4) Config required for fallback

### Config Reading
**File:** `public/js/tn_wizard.js:450-456`
```javascript
const p = window.__CONFIG?.practice || {};
initTNCalendar({
  mount: '#calendarContainer',
  windowStart: p.practice_start_date || p.window_start,
  windowEnd: p.practice_end_date || p.window_end,
  allowedWeekdays: p.allowed_weekdays || [1,2,3,4,5,6,0]
});
```

**Config is read from `window.__CONFIG?.practice`** with fallback values.

### TN Config Creation
**File:** `public/js/event_bootstrap.js:25-106`
```javascript
export function createTNConfig() {
  const tnConfig = {
    event: {
      event_short_ref: 'tn',
      event_long_name_en: 'TN Legacy Registration',
      form_enabled: true,
      practice_start_date: '2025-01-01',
      practice_end_date: '2025-07-31'
    },
    // ... more config
    practice: {
      practice_start_date: '2025-01-01',
      practice_end_date: '2025-07-31',
      min_rows: 1,
      max_rows: 3,
      window_rules: {
        weekdays_only: true,
        advance_booking_days: 7
      }
    },
    config_version: 1
  };
  
  // Set the config globally
  window.__CONFIG = tnConfig;
}
```

**TN config includes practice settings** with fallback dates and rules.

## 5) Visibility & CSS scoping

### TN Scope Container
**File:** `public/register.html:208-214`
```html
<div id="tnScope" style="display: none;">
  <!-- TN Stepper Navigation -->
  <div id="stepper"></div>
  
  <!-- TN Wizard Mount Point -->
  <div id="wizardMount"></div>
</div>
```

**`#tnScope` exists but is hidden by default** (`style="display: none;"`).

### CSS Scoping
**File:** `public/register.html:267-282`
```javascript
if (eventShortRef === 'tn') {
  // Set body dataset for TN legacy CSS scoping
  document.body.dataset.event = 'tn';
  
  // Show TN legacy CSS
  const tnLegacyCSS = document.getElementById('tnLegacyCSS');
  if (tnLegacyCSS) {
    tnLegacyCSS.style.display = 'block';
  }
  
  // Show TN scope container, hide WU/SC container
  const tnScope = document.getElementById('tnScope');
  const wuScContainer = document.getElementById('wuScContainer');
  
  if (tnScope) tnScope.style.display = 'block';
  if (wuScContainer) wuScContainer.style.display = 'none';
}
```

**TN scope should be shown** when `?e=tn` parameter is present.

### Calendar CSS
**File:** `public/css/tn_legacy.css:108-112`
```css
#tnScope .calendar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
```

**Calendar wrapper has proper CSS** with flex layout.

## 6) Errors & guards

### Early Returns
**File:** `public/js/tn_wizard.js:431-432`
```javascript
function initCalendarContainer() {
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) return;
```

**Calendar init returns early** if `#calendarContainer` is not found.

### Double-Init Guard
**File:** `public/js/tn_wizard.js:434-438`
```javascript
// Guard against double-init if the user navigates back/forward
if (calendarEl.dataset.initialized === 'true') {
  console.log('initCalendarContainer: Calendar already initialized, skipping');
  return;
}
```

**Double-init guard exists** and could prevent first render if flag is set.

### TN Mode Guards
**File:** `public/js/ui_bindings.js:15-18`
```javascript
const isTNMode = () => {
  const cfg = window.__CONFIG;
  return cfg?.event?.event_short_ref === 'tn';
};
```

**TN mode detection exists** and should prevent single-page renderer interference.

## 7) Slot ranking population (sanity)

### Slot Population
**File:** `public/js/tn_wizard.js:391-397`
```javascript
function initStep4() {
  // Initialize practice configuration
  initPracticeConfig();
  
  // Set up calendar container
  initCalendarContainer();
  
  // Populate slot preference selects
  populateSlotPreferences();
```

**`populateSlotPreferences()` is called** after calendar initialization.

## 8) Minimal runtime checks (no code changes)

### Console Snippets for Testing:

```javascript
// A) Confirm event & mode
console.log('event=', window.__CONFIG?.event?.event_short_ref, 'mode=', window.__MODE);
```

```javascript
// B) Confirm step
console.log('step=', sessionStorage.getItem('tn.step') || new URL(location.href).searchParams.get('step'));
```

```javascript
// C) Calendar mount presence & geometry
(() => {
  const el = document.querySelector('#calendarContainer');
  return el ? {exists:true, visible: !!el.offsetParent, rect: el.getBoundingClientRect()} : {exists:false};
})();
```

```javascript
// D) Practice config present?
(() => {
  const p = window.__CONFIG?.practice || null;
  return p ? {has:true, window_start:p.practice_start_date, window_end:p.practice_end_date, allowed_weekdays:p.allowed_weekdays} : {has:false};
})();
```

## 9) Root cause(s) with source evidence

### **Primary Cause: TN Scope Container Hidden**
**File:** `public/register.html:208`
```html
<div id="tnScope" style="display: none;">
```

**Evidence:** The `#tnScope` container is hidden by default and may not be shown when `?e=tn` is present.

### **Secondary Cause: Calendar Container Not Found**
**File:** `public/js/tn_wizard.js:431-432`
```javascript
const calendarEl = document.getElementById('calendarContainer');
if (!calendarEl) return;
```

**Evidence:** If `#tnScope` is hidden, `#calendarContainer` won't be found, causing early return.

### **Tertiary Cause: Double-Init Guard**
**File:** `public/js/tn_wizard.js:434-438`
```javascript
if (calendarEl.dataset.initialized === 'true') {
  console.log('initCalendarContainer: Calendar already initialized, skipping');
  return;
}
```

**Evidence:** Guard could prevent initialization if flag is incorrectly set.

### **Quaternary Cause: Missing Config**
**File:** `public/js/tn_wizard.js:450`
```javascript
const p = window.__CONFIG?.practice || {};
```

**Evidence:** If `window.__CONFIG` is undefined, calendar gets empty config.

### **Quinary Cause: CSS Not Loaded**
**File:** `public/register.html:9`
```html
<link rel="stylesheet" href="css/tn_legacy.css" id="tnLegacyCSS" style="display: none;" />
```

**Evidence:** TN legacy CSS is hidden by default and may not be shown.

## 10) Fix plan (no edits now)

### **High Priority (Safe/Low-Risk):**

1. **Verify TN scope visibility** - Check if `#tnScope` is shown when `?e=tn` parameter is present
   - **Location:** `public/register.html:267-282`
   - **Action:** Ensure `tnScope.style.display = 'block'` is executed

2. **Verify CSS loading** - Check if TN legacy CSS is loaded for TN mode
   - **Location:** `public/register.html:272-275`
   - **Action:** Ensure `tnLegacyCSS.style.display = 'block'` is executed

3. **Clear double-init guard** - Reset calendar initialization flag if needed
   - **Location:** `public/js/tn_wizard.js:435`
   - **Action:** Clear `calendarEl.dataset.initialized` before first init

### **Medium Priority (Requires Review):**

4. **Verify config loading** - Ensure `window.__CONFIG` is set before calendar init
   - **Location:** `public/js/event_bootstrap.js:315-320`
   - **Action:** Ensure `createTNConfig()` or `loadEventConfig('tn')` is called

5. **Add debug logging** - Add more detailed logging to track initialization flow
   - **Location:** `public/js/tn_wizard.js:383-398`
   - **Action:** Add console logs to `initStep4()` function

### **Low Priority (Requires Review):**

6. **Verify template loading** - Ensure `tn_templates.html` is loaded before step 4
   - **Location:** `public/js/event_bootstrap.js:322-323`
   - **Action:** Ensure `loadTNTemplates()` completes before `initTNWizard()`

7. **Check for JavaScript errors** - Verify no errors are thrown during initialization
   - **Location:** Browser console
   - **Action:** Check for any JavaScript errors that might prevent execution

### **Risk Assessment:**
- **Items 1-3:** Safe/Low-Risk (visibility and CSS issues)
- **Items 4-7:** Require Review (config and template loading)
