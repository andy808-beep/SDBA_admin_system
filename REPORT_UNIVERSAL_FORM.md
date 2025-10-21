# Universal Form Implementation Analysis Report

## 1. High-level Summary

The universal form system in `register.html` uses a completely different rendering approach compared to the legacy `main_form/*.html` pages. The legacy system used multi-step wizard pages (p1.html, p2.html, p3.html, etc.) with pre-existing HTML markup, while the universal form dynamically generates all form elements from scratch using JavaScript modules.

For TN (and all events), the universal form creates entirely new DOM elements rather than hydrating existing legacy markup. The system loads event configuration via `loadEventConfig()` and then calls `initFormForEvent()` to dynamically build form sections using `document.createElement()` and innerHTML operations.

## 2. TN vs Legacy: Structure & Selector Diff

### Legacy Page Structure Analysis

**main_form/1_category.html** (redirects to register.html):
```html
<!-- Legacy had: -->
<select id="raceCategory" required>
  <option value="">-- Please choose --</option>
  <option value="wu">WU (Women's University)</option>
  <option value="tn">TN (Traditional)</option>
  <option value="sc">SC (School)</option>
</select>
```

**main_form/2_teaminfo.html** (redirects to register.html):
```html
<!-- Legacy had: -->
<div id="teamNameFields"></div>
<div class="form-group">
  <label for="orgName">Organization / Group Name</label>
  <input type="text" id="orgName" name="orgName" placeholder="" required />
</div>
<div id="managerFields"></div>
```

**main_form/4_booking.html** (redirects to register.html):
```html
<!-- Legacy had: -->
<div id="calendarContainer" class="calendar-wrapper"></div>
<div class="slot-preferences">
  <table class="slot-table">
    <tbody>
      <tr>
        <td>1st Choice</td>
        <td><select id="slotPref2h_1" required><option value="">-- Select --</option></select></td>
        <td><select id="slotPref1h_1"><option value="">-- Select --</option></select></td>
      </tr>
    </tbody>
  </table>
</div>
<div id="practiceSummary" class="summary-box"></div>
```

### Current Universal Form Structure

**register.html** (lines 377-400):
```html
<!-- Universal form has: -->
<div id="contactSection" class="form-section">
  <div id="contactMount"></div>
</div>
<div id="teamsSection" class="form-section">
  <div id="teamsMount"></div>
</div>
<div id="raceDaySection" class="form-section">
  <div id="raceDayMount"></div>
</div>
<div id="practiceSection" class="form-section">
  <div id="practiceMount"></div>
</div>
```

### Selector Mapping Table

| Legacy Selector | Current Selector | Status |
|---|---|---|
| `#raceCategory` | Event picker (dynamic) | **Replaced** - Now uses event picker grid |
| `#teamNameFields` | `#teamsMount` | **Replaced** - New dynamic team rows |
| `#orgName` | `contact_name` | **Missing** - No organization field |
| `#managerFields` | `contact_email`, `contact_phone` | **Replaced** - Simplified contact |
| `#calendarContainer` | `#practiceList` | **Replaced** - New practice row system |
| `#slotPref2h_1` | `practice_item_1`, `practice_qty_1` | **Replaced** - Different practice structure |
| `#practiceSummary` | `#summaryMount` | **Replaced** - New summary system |

## 3. Rendering Approach Used for TN

### Single-Page Renderer (Not Multi-Step)

**File: main_form/js/event_bootstrap.js:112**
```javascript
initFormForEvent(ref);
```

**File: main_form/js/ui_bindings.js:518-534**
```javascript
export function initFormForEvent(eventShortRef) {
  const cfg = assertConfig();
  // Apply label/help text bindings from config
  applyCopyBindings(cfg);
  // Apply visibility/required based on config + profile precedence
  applyVisibilityAndRequired(cfg);
  // Render sections
  renderContactSection(cfg);
  renderTeamSection(cfg);
  renderRaceDaySection(cfg);
  renderPracticeSection(cfg);
  renderSummarySection(cfg);
}
```

### Dynamic Element Creation

**File: main_form/js/ui_bindings.js:149-161**
```javascript
function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (v !== undefined && v !== null) el.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child == null) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}
```

### Team Row Creation

**File: main_form/js/ui_bindings.js:406-423**
```javascript
function addTeamRow(cfg) {
  const list = dom.q('#practiceList') || dom.q('#practiceMount');
  if (!list) return;
  const tpl = document.getElementById('teamRowTpl');
  let row;
  if (tpl && tpl.content) {
    row = tpl.content.firstElementChild.cloneNode(true);
  } else {
    const i = nextTeamIndex();
    row = createEl('div', { class: 'team-row', 'data-row': 'team' });
    const name = createEl('input', { type: 'text', id: `team_${i}_name`, name: `team_${i}_name`, 'data-name': `team_${i}_name` });
    const divSel = createEl('select', { id: `team_${i}_division`, name: `team_${i}_division`, 'data-name': `team_${i}_division` });
    const pkgSel = createEl('select', { id: `team_${i}_package`, name: `team_${i}_package`, 'data-name': `team_${i}_package` });
    // ... more element creation
  }
  row.setAttribute('data-row', 'team');
  list.appendChild(row);
}
```

### Practice Row Creation

**File: main_form/js/ui_bindings.js:414-423**
```javascript
const itemSel = createEl('select', { id: `practice_item_${i}`, name: `practice_item_${i}`, 'data-name': `practice_${i}_item` });
const qty = createEl('input', { type: 'number', min: '0', value: '0', id: `practice_qty_${i}`, name: `practice_qty_${i}`, 'data-name': `practice_${i}_qty` });
dom.fillSelect(itemSel, (assertConfig().practice || []).map(it => ({ id: it.item_code ?? it.code ?? '', label: it.title_en ?? (it.item_code ?? '') })));
```

## 4. Config-driven Bindings vs Hardcoding

### Config Usage

**File: main_form/js/ui_bindings.js:67-80**
```javascript
const copyBindings = {
  '#formTitle': 'labels.form_title',
  '#formSubtitle': 'labels.form_subtitle',
  '#teamsHint': 'labels.teams_hint',
  '#formHeader': 'labels.form_title',
  '#confirmationTitle': 'labels.confirmation_title',
  '#registrationIdLabel': 'labels.registration_id_label',
  '#teamCodesLabel': 'labels.team_codes_label',
  '#copyBtn': 'labels.copy_button',
  '#shareBtn': 'labels.share_button',
  '#prevBtn': 'labels.prev_button',
  '#nextBtn': 'labels.next_button',
  '#submitBtn': 'labels.submit_button'
};
```

**File: main_form/js/ui_bindings.js:87-104**
```javascript
function applyCopyBindings(cfg) {
  Object.entries(copyBindings).forEach(([sel, path]) => {
    const val = getByPath(cfg, path);
    if (val == null || val === '') return;
    const node = dom.q(sel);
    if (!node) {
      console.debug('applyCopyBindings: node not found', sel);
      return;
    }
    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
      node.setAttribute('placeholder', String(val || '—'));
    } else if (node.tagName === 'BUTTON') {
      dom.setText(node, String(val || '—'));
    } else {
      dom.setText(node, String(val || ''));
    }
  });
}
```

### Hardcoded Elements

**File: main_form/js/ui_bindings.js:205-229**
```javascript
// Name field
const nameField = renderField('contact_name', { 
  type: 'text', 
  required: true, 
  label: getLabel(labels, 'contact_name', 'Name'),
  placeholder: getLabel(labels, 'contact_name_placeholder', 'Enter your name')
}, labels);
// Email field
const emailField = renderField('contact_email', { 
  type: 'email', 
  required: true, 
  label: getLabel(labels, 'contact_email', 'Email'),
  placeholder: getLabel(labels, 'contact_email_placeholder', 'Enter your email')
}, labels);
// Phone field
const phoneField = renderField('contact_phone', { 
  type: 'tel', 
  required: false, 
  label: getLabel(labels, 'contact_phone', 'Phone'),
  placeholder: getLabel(labels, 'contact_phone_placeholder', 'Enter your phone number')
}, labels);
```

## 5. Practice Section (Critical)

### Legacy Practice Structure

**File: main_form/4_booking.html:40-73**
```html
<div id="calendarContainer" class="calendar-wrapper"></div>
<div class="slot-preferences">
  <h3>Time Slot Preference Ranking</h3>
  <table class="slot-table">
    <thead>
      <tr>
        <th>Rank</th>
        <th>2-Hour Session</th>
        <th>1-Hour Session</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1st Choice</td>
        <td><select id="slotPref2h_1" required><option value="">-- Select --</option></select></td>
        <td><select id="slotPref1h_1"><option value="">-- Select --</option></select></td>
      </tr>
    </tbody>
  </table>
</div>
```

### Current Practice Structure

**File: main_form/js/ui_bindings.js:357-396**
```javascript
function renderPracticeSection(cfg) {
  const mount = dom.q('#practiceSection');
  if (!mount) return;

  // Clear existing content
  mount.innerHTML = '';
  
  // Create practice list container
  const list = createEl('div', { id: 'practiceList', class: 'practice-list' });
  mount.appendChild(list);
  
  // Create add button
  const addBtn = createEl('button', { 
    id: 'addPracticeBtn', 
    type: 'button', 
    class: 'btn-secondary',
    text: getLabel(cfg.labels || {}, 'add_practice', 'Add Practice')
  });
  mount.appendChild(addBtn);
```

### Practice Row Creation

**File: main_form/js/ui_bindings.js:414-423**
```javascript
const i = nextPracticeIndex();
row = createEl('div', { class: 'practice-row', 'data-row': 'practice' });
const itemSel = createEl('select', { id: `practice_item_${i}`, name: `practice_item_${i}`, 'data-name': `practice_${i}_item` });
const qty = createEl('input', { type: 'number', min: '0', value: '0', id: `practice_qty_${i}`, name: `practice_qty_${i}`, 'data-name': `practice_${i}_qty` });
dom.fillSelect(itemSel, (assertConfig().practice || []).map(it => ({ id: it.item_code ?? it.code ?? '', label: it.title_en ?? (it.item_code ?? '') })));
```

## 6. Submission & Totals Wiring (TN)

### State Collection

**File: main_form/js/ui_bindings.js:427-496**
```javascript
export function collectStateFromForm() {
  // Build a structured payload using current markup conventions
  const state = { contact: { name: '', email: '', phone: '' }, teams: [], race_day: [], practice: [], packages: [] };
  const cfg = assertConfig();

  // Section visibility tolerance
  const teamsHidden = dom.q('#teamsSection')?.classList.contains('hidden');
  const practiceHidden = dom.q('#practiceSection')?.classList.contains('hidden');
  const raceDayHidden = dom.q('#raceDaySection')?.classList.contains('hidden');

  // Contact: try specific IDs first, then data-name fallbacks
  const nameEl = dom.q('#contact_name') || dom.q('#contactName') || dom.q('[data-name="contact_name"]');
  const emailEl = dom.q('#contact_email') || dom.q('#contactEmail') || dom.q('[data-name="contact_email"]');
  const phoneEl = dom.q('#contact_phone') || dom.q('#contactPhone') || dom.q('[data-name="contact_phone"]');
  state.contact.name = nameEl?.value?.trim?.() ?? '';
  state.contact.email = emailEl?.value?.trim?.() ?? '';
  state.contact.phone = phoneEl?.value?.trim?.() ?? '';
```

### Totals Calculation

**File: main_form/js/totals.js:10-15**
```javascript
import { collectStateFromForm } from './ui_bindings.js';

function assertConfig() {
  const cfg = window.__CONFIG || null;
  if (!cfg || typeof cfg !== 'object') throw new Error('Configuration not loaded');
  return cfg;
}
```

**File: main_form/js/totals.js:35-50**
```javascript
function recomputeTotals() {
  const cfg = assertConfig();
  const state = collectStateFromForm();
  
  let total = 0;
  
  // Practice rules from config
  const rules = 
    cfg.practice_rules ||
    (cfg.practice && cfg.practice.rules) ||
    cfg.limits?.practice_rules ||
    {};
```

## 7. Redirects & Coexistence

### Legacy Page Redirects

**File: main_form/1_category.html:5**
```html
<meta http-equiv="refresh" content="0;url=./register.html" />
```

**File: main_form/2_teaminfo.html:5**
```html
<meta http-equiv="refresh" content="0;url=./register.html" />
```

**File: main_form/3_raceday.html:5**
```html
<meta http-equiv="refresh" content="0;url=./register.html" />
```

**File: main_form/4_booking.html:5**
```html
<meta http-equiv="refresh" content="0;url=./register.html" />
```

**File: main_form/5_summary.html:5**
```html
<meta http-equiv="refresh" content="0;url=./register.html" />
```

### Event Resolution

**File: main_form/js/event_bootstrap.js:25-45**
```javascript
async function boot() {
  const urlParams = new URLSearchParams(location.search);
  const eventRef = urlParams.get('e');
  
  if (eventRef) {
    // Direct event specified
    await loadEventForRef(eventRef);
  } else {
    // Show event picker
    await showEventPicker();
  }
}
```

## 8. Concrete Reasons TN ≠ Legacy

• **Creates new `div.practice-row` instead of using legacy `#calendarContainer`** (ui_bindings.js:414)
• **Ignores legacy `#slotPref2h_1` selectors** - creates new `practice_item_1` instead (ui_bindings.js:415)
• **Replaces legacy team structure** - creates new `#teamsList` instead of using `#teamNameFields` (ui_bindings.js:242)
• **Missing organization field** - legacy had `#orgName` but universal form only has basic contact (ui_bindings.js:205-229)
• **No calendar widget** - legacy had `#calendarContainer` but universal form has simple practice rows (ui_bindings.js:357-396)
• **Different practice structure** - legacy used ranking table, universal form uses simple item/quantity pairs (ui_bindings.js:414-423)
• **Hardcoded field structure** - universal form creates fixed contact fields instead of using config-driven field definitions (ui_bindings.js:205-229)
• **No template cloning** - universal form uses `createElement()` instead of cloning existing templates (ui_bindings.js:149-161)

## 9. Minimal Alignment Plan

1. **Preserve legacy HTML structure** - Keep existing `main_form/*.html` pages as templates
2. **Create template cloning system** - Use `<template>` elements in legacy pages for dynamic content
3. **Map legacy selectors to universal form** - Update `ui_bindings.js` to target legacy selectors instead of creating new ones
4. **Add missing fields** - Include organization field and other legacy-specific inputs
5. **Implement calendar widget** - Restore `#calendarContainer` functionality for practice booking
6. **Restore practice ranking** - Use legacy slot preference table instead of simple item/quantity pairs
7. **Config-driven field definitions** - Replace hardcoded contact fields with config-based field rendering
8. **Template-based rendering** - Use `cloneNode()` on existing templates instead of `createElement()`

## 10. File Inventory & Grep

### Directory Structure
```
main_form/
├── register.html (universal form)
├── 1_category.html (redirect stub)
├── 2_teaminfo.html (redirect stub)
├── 3_raceday.html (redirect stub)
├── 4_booking.html (redirect stub)
├── 5_summary.html (redirect stub)
├── main_form.js (legacy, blocked out)
├── main_form.css
├── env.js
├── supabase_config.js
└── js/
    ├── config_loader.js
    ├── ui_bindings.js
    ├── totals.js
    ├── submit.js
    └── event_bootstrap.js
```

### Key Grep Results

**initFormForEvent usage:**
- `main_form/js/event_bootstrap.js:112` - Called during boot sequence
- `main_form/js/event_bootstrap.js:164` - Called in refreshConfig
- `main_form/js/ui_bindings.js:518` - Function definition

**createElement usage:**
- `main_form/js/ui_bindings.js:149` - createEl helper function
- `main_form/js/ui_bindings.js:242` - Creates teamsList container
- `main_form/js/ui_bindings.js:365` - Creates practiceList container
- `main_form/js/ui_bindings.js:414` - Creates practice row elements

**innerHTML usage:**
- `main_form/js/ui_bindings.js:239` - Clears teams section
- `main_form/js/ui_bindings.js:334` - Clears race day section
- `main_form/js/ui_bindings.js:362` - Clears practice section
- `main_form/js/ui_bindings.js:503` - Clears summary section

**collectStateFromForm usage:**
- `main_form/js/ui_bindings.js:427` - Function definition
- `main_form/js/submit.js:10` - Imported for submission
- `main_form/js/totals.js:10` - Imported for totals calculation
- `main_form/js/event_bootstrap.js:150` - Used in debug helper

**Legacy redirects:**
- `main_form/1_category.html:5` - Meta refresh to register.html
- `main_form/2_teaminfo.html:5` - Meta refresh to register.html
- `main_form/3_raceday.html:5` - Meta refresh to register.html
- `main_form/4_booking.html:5` - Meta refresh to register.html
- `main_form/5_summary.html:5` - Meta refresh to register.html
