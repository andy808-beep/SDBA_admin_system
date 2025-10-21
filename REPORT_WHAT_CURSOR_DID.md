# REPORT: What Cursor Did to Your Universal Form Project

## 1) How routing works now (entry → mode)

### Boot Sequence (files + functions):
```
register.html → event_bootstrap.js:boot() → resolveInitialRef() → attemptLoad()
```

**Entry Points:**
- `register.html:56` - TN links to `1_category.html` (standalone legacy)
- `register.html:65` - WU links to `universal_form.html?e=wu` 
- `register.html:74` - SC links to `universal_form.html?e=sc`

**Event Resolution:**
```javascript
// event_bootstrap.js:265-270
function resolveInitialRef() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('e');
  if (fromUrl) return fromUrl;
  try { return localStorage.getItem(LS_EVENT_KEY) || ''; } catch { return ''; }
}
```

**Mode Decision:**
```javascript
// event_bootstrap.js:238-243
if (ref === 'tn') {
  // TN Legacy Wizard Path - Create fallback config
  createTNConfig();
  await loadTNTemplates();
  await initTNWizard();
} else {
  // WU/SC Single Page Form Path - Load from database
  const cfg = await loadEventConfig(ref, { useCache: true });
```

**Key Issue:** TN mode is only triggered by `?e=tn` URL parameter, but TN standalone files (`1_category.html`) don't have this parameter.

## 2) Why TN is "taking over"

**TN Mode Conditions:**
- `?e=tn` URL parameter (event_bootstrap.js:238)
- `window.__CONFIG.event.event_short_ref === 'tn'` (ui_bindings.js:17)

**Event Picker Bypass:**
- `register.html` is now a simple race selector, not a universal form
- No event picker logic - just static links to different files
- TN goes to standalone `1_category.html`, not universal form

**UI Guards (Early Returns):**
```javascript
// ui_bindings.js:200, 244, 309, 345, 376, 427, 523
if (isTNMode()) return;
```
All universal form renderers are disabled for TN mode.

## 3) TN templates: are they actually cloned?

**Template File:** `tn_templates.html` exists with 5 templates:
- `tn-step-1` through `tn-step-5` (tn_templates.html:4, 69, 96, 153, 226)

**Template Loading:**
```javascript
// event_bootstrap.js:112-142
async function loadTNTemplates() {
  const response = await fetch('./tn_templates.html');
  const html = await response.text();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const templates = tempDiv.querySelectorAll('template');
  templates.forEach(template => {
    document.head.appendChild(template.cloneNode(true));
  });
}
```

**Template Cloning:**
```javascript
// tn_wizard.js:224-244
function loadStepContent(step) {
  const templateId = `tn-step-${step}`;
  const template = document.getElementById(templateId);
  const content = template.content.cloneNode(true);
  wizardMount.innerHTML = '';
  wizardMount.appendChild(content);
}
```

**Critical Issue:** TN templates are only loaded when `?e=tn` is present, but standalone TN files don't have this parameter.

## 4) Calendar: container exists vs UI init

**Calendar Container in Template:**
```html
<!-- tn_templates.html:171 -->
<div id="calendarContainer" class="calendar-wrapper"></div>
```

**Calendar Initialization:**
```javascript
// tn_wizard.js:427-439
function initCalendarContainer() {
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) return;
  
  if (window.initCalendar && typeof window.initCalendar === 'function') {
    window.initCalendar();
  } else {
    createTNCalendar(calendarEl);
  }
}
```

**Calendar Creation:**
```javascript
// tn_wizard.js:445-464
function createTNCalendar(container) {
  const practiceConfig = window.__CONFIG?.practice || {};
  // ... generates months and calendar UI
}
```

**Critical Issue:** `window.initCalendar()` doesn't exist in standalone TN files, so calendar falls back to `createTNCalendar()`, but this only works in universal form context.

## 5) Slot ranking: what's populating those selects?

**Slot Selectors in Template:**
```html
<!-- tn_templates.html:188-200 -->
<select id="slotPref2h_1" required><option value="">-- Select --</option></select>
<select id="slotPref1h_1"><option value="">-- Select --</option></select>
```

**Slot Population Code:**
```javascript
// tn_wizard.js:500-520
function populateSlotSelects() {
  const config = window.__CONFIG?.practice?.slots || [];
  const rank2hSelects = ['#slotPref2h_1', '#slotPref2h_2', '#slotPref2h_3'];
  const rank1hSelects = ['#slotPref1h_1', '#slotPref1h_2', '#slotPref1h_3'];
  // ... populates from config
}
```

**Duplicate Prevention:**
```javascript
// tn_wizard.js:18
let selectedSlots = new Set(); // Track selected slots for duplicate prevention
```

**Critical Issue:** Slot population depends on `window.__CONFIG` which is only set in universal form context.

## 6) Selectors and mapping (legacy vs current)

| Legacy Selector | Used by TN now? | Where Referenced | Status |
|---|---|---|---|
| `#orgName` | ✅ | tn_map.js:10 | OK |
| `#contactEmail` | ✅ | tn_map.js:11 | OK |
| `#contactPhone` | ✅ | tn_map.js:12 | OK |
| `#teamNameFields` | ✅ | tn_map.js:14 | OK |
| `#calendarContainer` | ✅ | tn_map.js:30 | OK |
| `#slotPref2h_1` | ✅ | tn_map.js:32 | OK |
| `#slotPref1h_1` | ✅ | tn_map.js:33 | OK |

**Critical Issue:** All selectors exist in templates, but TN wizard only initializes in universal form context.

## 7) CSS scoping & visual drift

**TN Legacy CSS:** `css/tn_legacy.css` exists with `#tnScope` prefixing:
```css
/* css/tn_legacy.css:7-13 */
#tnScope body {
  margin: 0;
  padding: 0;
  background: #f2f5f9;
  font-family: Arial, Helvetica, sans-serif;
}
```

**Calendar CSS:**
```css
/* css/tn_legacy.css:108-112 */
#tnScope .calendar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
```

**Critical Issue:** TN legacy CSS is scoped to `#tnScope` but standalone TN files don't have this container.

## 8) Diff summary (non-destructive)

**Files Added:**
- `js/tn_wizard.js` - TN wizard implementation
- `js/tn_map.js` - TN selector mapping
- `js/tn_verification.js` - TN verification tools
- `css/tn_legacy.css` - Scoped TN styles
- `tn_templates.html` - TN template clones
- `universal_form.html` - WU/SC universal form

**Files Modified:**
- `register.html` - Changed from universal form to race selector
- `1_category.html` through `5_summary.html` - Restored as standalone files

**Guards Added:**
```javascript
// ui_bindings.js:200, 244, 309, 345, 376, 427, 523
if (isTNMode()) return;
```

**Template Content:** Not modified - only cloned from existing files.

## 9) Minimal reproducer commands (no code changes)

**Current event + mode:**
```javascript
console.log('event=', window.__CONFIG?.event?.short_ref, 'mode=', window.__MODE);
```

**Calendar mount visibility:**
```javascript
(el=>el?{visible:!!(el.offsetParent),rect:el.getBoundingClientRect()}:null)(document.querySelector('#calendarContainer'))
```

**Current step:**
```javascript
console.log('step=', sessionStorage.getItem('tn.step') || new URL(location.href).searchParams.get('step'))
```

## 10) Concrete reasons TN "looks off" + quick, no-code hypotheses

1. **Missing TN Scope Container** - Standalone TN files don't have `#tnScope` div, so TN legacy CSS doesn't apply
2. **No TN Wizard Initialization** - `initTNWizard()` only called with `?e=tn` parameter, not in standalone files
3. **Missing Calendar Init** - `window.initCalendar()` doesn't exist, `createTNCalendar()` not called
4. **No Config Object** - `window.__CONFIG` not set in standalone files, breaking slot population
5. **Wrong CSS Loading** - Standalone files load `main_form.css` instead of `tn_legacy.css`

## 11) Next-step plan (checklist)

1. **Add TN scope container to standalone files** - Wrap content in `<div id="tnScope">` (safe to automate)
2. **Load TN legacy CSS in standalone files** - Add `<link rel="stylesheet" href="css/tn_legacy.css" />` (safe to automate)
3. **Initialize TN wizard in standalone files** - Add `initTNWizard()` call after DOM ready (needs approval)
4. **Set TN config in standalone files** - Add `createTNConfig()` call before wizard init (needs approval)
5. **Remove universal form scripts from standalone files** - Remove `main_form.js` import (safe to automate)
6. **Add TN wizard scripts to standalone files** - Add `tn_wizard.js` and `tn_map.js` imports (needs approval)
7. **Test calendar functionality** - Verify step 4 calendar renders and functions (manual testing)
8. **Verify slot population** - Check that ranking selects are populated from config (manual testing)

**Safe to automate:** Items 1, 2, 5
**Need approval:** Items 3, 4, 6
**Manual testing:** Items 7, 8
