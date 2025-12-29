# Duplicate Form Templates Analysis

## Problem Summary
Duplicate form templates appear in two scenarios:
1. After a failed form submission, clicking the back navigation button shows duplicated templates
2. During initial page load, duplicated templates briefly appear before configs load, then get replaced

---

## Question 1: How are templates included in the page?

### Answer: Templates are loaded TWICE from different locations

**Location 1: `register.html` (lines 690-715)**
```javascript
// Load TN templates
fetch('tn_templates.html?v=1.0.0-mj5lf93y')
  .then(response => response.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const templates = doc.querySelectorAll('template');
    templates.forEach(template => {
      document.body.appendChild(template);  // ⚠️ Appends to body
    });
  });
```

**Location 2: `event_bootstrap.js` (lines 115-170)**
```javascript
async function loadTNTemplates() {
  // ... checks for existing templates ...
  
  const result = await fetchWithErrorHandling('./tn_templates.html', {
    method: 'GET',
    context: 'load_tn_templates',
    maxRetries: 2
  });
  
  const html = typeof result.data === 'string' ? result.data : '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const templates = tempDiv.querySelectorAll('template');
  
  templates.forEach(template => {
    const templateId = template.id;
    if (!document.getElementById(templateId)) {
      document.head.appendChild(template.cloneNode(true));  // ⚠️ Appends to head
    }
  });
}
```

**Analysis:**
- `register.html` loads templates into `document.body` (no duplicate check)
- `event_bootstrap.js` loads templates into `document.head` (has duplicate check, but only checks if template ID exists)
- **RACE CONDITION**: Both scripts run asynchronously. If `register.html` script runs first, templates are in body. Then `event_bootstrap.js` checks `document.getElementById()` which finds templates in body, but then appends to head anyway (because the check happens before append).
- **DUPLICATION RISK**: High - templates can end up in both `body` and `head`

---

## Question 2: Where is the form container / wizard mount?

### Answer: `#wizardMount` inside `#tnScope`

**File: `register.html` (lines 484-491)**
```html
<!-- TN Wizard Container (scoped for legacy styles) -->
<div id="tnScope" hidden>
  <!-- TN Stepper Navigation -->
  <div id="stepper"></div>
  
  <!-- TN Wizard Mount Point -->
  <div id="wizardMount"></div>
</div>
```

**Analysis:**
- Mount point: `#wizardMount` (line 490)
- Parent container: `#tnScope` (line 485)
- Templates are cloned into `#wizardMount` by `loadStepContent()`

---

## Question 3: What functions load/render templates?

### Answer: Multiple functions clone templates

**Function 1: `loadStepContent()` in `tn_wizard.js` (lines 605-712)**
```javascript
async function loadStepContent(step) {
  // ...
  const templateId = `tn-step-${step}`;
  const template = document.getElementById(templateId);
  
  // Clone template content
  const content = template.content.cloneNode(true);
  wizardMount.innerHTML = '';  // ⚠️ Clears mount
  wizardMount.appendChild(content);  // ⚠️ Appends cloned content
}
```
- **Location**: `public/js/tn_wizard.js:665`
- **Action**: Clones template content and appends to `#wizardMount`
- **Clears mount first**: Yes (`wizardMount.innerHTML = ''`)

**Function 2: `loadTNTemplates()` in `event_bootstrap.js` (lines 115-170)**
- **Location**: `public/js/event_bootstrap.js:157`
- **Action**: Loads templates into DOM (head or body)
- **Uses**: `template.cloneNode(true)` and `document.head.appendChild()`

**Function 3: Inline script in `register.html` (lines 693-702)**
- **Location**: `public/register.html:700`
- **Action**: Loads templates into `document.body`
- **Uses**: Direct `appendChild()` (no clone)

**Analysis:**
- `loadStepContent()` properly clears `wizardMount.innerHTML = ''` before appending
- However, if templates are duplicated in the DOM (from double-loading), `getElementById(templateId)` might return the wrong template element
- **DUPLICATION RISK**: Medium - `loadStepContent()` clears mount, but if called multiple times rapidly, could cause flicker/duplication

---

## Question 4: What happens on failed submission?

### Answer: Error is shown, but no re-initialization. Back button triggers template reload.

**File: `public/js/submit.js` (lines 424-473)**
```javascript
// On submission failure:
if (status !== 200) {
  const errorMessage = data?.error_message || mapError(code);
  
  // Show error using error system
  if (window.errorSystem) {
    window.errorSystem.showSystemError('serverErrorDetailed', {
      dismissible: true
    });
  }
  
  btn.dataset.busy = '0';
  btn.disabled = false;  // Re-enable submit button
  // ⚠️ NO re-initialization or template reload here
}
```

**When user clicks back button after failure:**
- Back button handler calls `showStep()` → `loadStep()` → `loadStepContent()`
- `loadStepContent()` clones template again
- **DUPLICATION RISK**: If templates are duplicated in DOM, or if `loadStepContent()` is called multiple times, duplication can occur

**Analysis:**
- Failed submission doesn't directly cause duplication
- But clicking back after failure triggers `loadStepContent()` which can cause duplication if:
  1. Templates are already duplicated in DOM (from initial load)
  2. `loadStepContent()` is called multiple times rapidly
  3. `wizardMount.innerHTML = ''` doesn't clear properly (unlikely but possible)

---

## Question 5: What happens when back button is clicked?

### Answer: `showStep()` → `loadStep()` → `loadStepContent()` → template cloned again

**File: `public/js/tn_wizard.js` (lines 6882-6914)**
```javascript
function showStep(stepNumber) {
  console.log(`📍 showStep: Showing step ${stepNumber}`);
  
  // Force containers visible
  if (tnScope) {
    tnScope.style.display = 'block';
    // ...
  }
  if (wizardMount) {
    wizardMount.style.display = 'block';
    // ...
  }
  
  // Load step content (async but we don't await here)
  loadStep(stepNumber);  // ⚠️ Calls loadStep()
}
```

**File: `public/js/tn_wizard.js` (lines 551-580)**
```javascript
async function loadStep(step) {
  currentStep = step;
  updateStepper();
  await loadStepContent(step);  // ⚠️ Calls loadStepContent()
  // ...
}
```

**File: `public/js/tn_wizard.js` (lines 605-712)**
```javascript
async function loadStepContent(step) {
  // ...
  const templateId = `tn-step-${step}`;
  const template = document.getElementById(templateId);
  const content = template.content.cloneNode(true);
  wizardMount.innerHTML = '';  // ⚠️ Clears mount
  wizardMount.appendChild(content);  // ⚠️ Appends cloned content
  // ...
}
```

**Back button handlers (examples):**

**Step 3 back button (`tn_wizard.js:2944-2950`)**
```javascript
backBtn.addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log('🔙 Step 3: Back button clicked, going to step 2');
  saveStep3Data();
  showStep(2);  // ⚠️ Triggers template reload
});
```

**Step 5 back button (`tn_wizard.js:6476-6481`)**
```javascript
newBackBtn.addEventListener('click', function(e) {
  e.preventDefault();
  console.log('🔙 Step 5: Back button clicked, going to step 4');
  showStep(4);  // ⚠️ Triggers template reload
});
```

**Analysis:**
- Back button → `showStep()` → `loadStep()` → `loadStepContent()`
- `loadStepContent()` clears mount with `innerHTML = ''` then appends cloned content
- **DUPLICATION RISK**: High if:
  1. `loadStepContent()` is called multiple times before first call completes (race condition)
  2. Templates are duplicated in DOM (from initial double-load)
  3. `wizardMount.innerHTML = ''` doesn't execute before `appendChild()` (timing issue)

---

## Question 6: What happens during initial page load?

### Answer: Templates are loaded TWICE, creating a race condition

**Initialization sequence:**

1. **`register.html` loads** (lines 690-715)
   - Inline script fetches `tn_templates.html`
   - Appends templates to `document.body`
   - No duplicate check

2. **`event_bootstrap.js` loads** (line 685)
   - Calls `boot()` function
   - If `e=tn` parameter exists, calls `attemptLoad('tn')` (line 602)
   - `attemptLoad()` calls `loadTNTemplates()` (line 497)
   - `loadTNTemplates()` fetches `tn_templates.html` again
   - Checks for existing templates, but check might fail if `register.html` script hasn't finished
   - Appends templates to `document.head`

3. **`initTNWizard()` is called** (line 498)
   - Calls `loadStep(0)` or `loadStep(restoredDraft.step)`
   - Eventually calls `loadStepContent()` which clones templates

**Race condition timeline:**
```
Time 0ms:  register.html inline script starts fetching tn_templates.html
Time 50ms: event_bootstrap.js boot() starts
Time 100ms: event_bootstrap.js loadTNTemplates() starts fetching tn_templates.html
Time 150ms: register.html script finishes, appends templates to body
Time 200ms: event_bootstrap.js finishes, checks for templates (finds in body), appends to head
Time 250ms: initTNWizard() calls loadStepContent(), finds duplicate templates
```

**Analysis:**
- **DUPLICATION RISK**: Very High
- Templates loaded twice (body + head)
- `getElementById('tn-step-1')` might return template from body or head (unpredictable)
- If `loadStepContent()` runs before templates finish loading, it might fail or use wrong template
- Brief duplication visible if templates render before `wizardMount.innerHTML = ''` clears

---

## Question 7: Are there duplicate template IDs?

### Answer: No duplicates in HTML files, but templates are loaded twice into DOM

**File: `public/tn_templates.html`**
- Line 4: `<template id="tn-step-1">`
- Line 70: `<template id="tn-step-2">`
- Line 101: `<template id="tn-step-3">`
- Line 170: `<template id="tn-step-4">`
- Line 275: `<template id="tn-step-5">`

**No duplicate IDs in source file** ✅

**But templates are loaded twice into DOM:**
1. `register.html` script → `document.body` (no duplicate check)
2. `event_bootstrap.js` → `document.head` (has duplicate check, but might not catch body templates)

**Analysis:**
- HTML5 spec: `getElementById()` returns first element with matching ID
- If templates exist in both body and head, `getElementById('tn-step-1')` returns first one found
- **DUPLICATION RISK**: Medium - templates in DOM are duplicated, but `getElementById()` should still work (returns first match)

---

## Root Cause Analysis

### Primary Issues:

1. **Double Template Loading**
   - `register.html` loads templates into `body`
   - `event_bootstrap.js` loads templates into `head`
   - Both run asynchronously, creating race condition

2. **No Guard Against Concurrent `loadStepContent()` Calls**
   - `loadStepContent()` is async but not awaited in `showStep()`
   - Multiple rapid back button clicks could trigger multiple concurrent calls
   - Each call does `innerHTML = ''` then `appendChild()`, but timing could cause duplication

3. **Template Location Inconsistency**
   - Templates in `body` vs `head` creates confusion
   - `getElementById()` behavior is unpredictable when duplicates exist

### Secondary Issues:

4. **No Debouncing on Back Button**
   - Back button handlers don't prevent multiple rapid clicks
   - Could trigger multiple `loadStepContent()` calls

5. **Initial Load Race Condition**
   - Templates might not be loaded when `initTNWizard()` runs
   - `loadStepContent()` might fail or use wrong template

---

## Recommended Fixes

### Fix 1: Remove duplicate template loading
- Remove inline script from `register.html` (lines 690-715)
- Keep only `event_bootstrap.js` `loadTNTemplates()` function
- Ensure `loadTNTemplates()` runs before `initTNWizard()`

### Fix 2: Add guard to `loadStepContent()`
- Add loading flag to prevent concurrent calls
- Use `Promise` to queue calls

### Fix 3: Standardize template location
- Always load templates to `document.head` (or `document.body`, but be consistent)
- Update `loadTNTemplates()` to check both locations

### Fix 4: Add debouncing to back button
- Disable back button while `loadStepContent()` is running
- Use `AbortController` to cancel in-flight requests

### Fix 5: Ensure templates loaded before wizard init
- Make `loadTNTemplates()` return a Promise
- Await template loading before calling `initTNWizard()`

---

## Code Locations Summary

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `loadTNTemplates()` | `public/js/event_bootstrap.js` | 115-170 | Loads templates into DOM |
| `loadStepContent()` | `public/js/tn_wizard.js` | 605-712 | Clones template into wizard mount |
| `showStep()` | `public/js/tn_wizard.js` | 6882-6914 | Triggers step load |
| `loadStep()` | `public/js/tn_wizard.js` | 551-580 | Wrapper for loadStepContent |
| Inline template loader | `public/register.html` | 690-715 | Loads templates into body |
| Back button handlers | `public/js/tn_wizard.js` | Various | Trigger showStep() |

---

## Evidence of Duplication

**Scenario 1: After failed submission + back button**
- Submission fails → user clicks back → `showStep()` → `loadStepContent()` → template cloned
- If templates duplicated in DOM, or `loadStepContent()` called multiple times → duplication visible

**Scenario 2: Initial page load**
- `register.html` script loads templates → `event_bootstrap.js` loads templates → both in DOM
- `initTNWizard()` runs → `loadStepContent()` clones template
- Brief duplication visible before `wizardMount.innerHTML = ''` clears

