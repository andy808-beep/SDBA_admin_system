# TN vs WU/SC Question 1 Layout Comparison

## INVESTIGATION RESULTS

### 1. WU/SC Form Question 1 Structure

**Location:** `public/wu_sc_templates.html` (lines 3-32)

**HTML Structure:**
```html
<template id="wu-sc-step-1">
  <div class="card">
    <form id="categoryForm">
      <h2 data-i18n="selectTeamDetails">Select Team Details</h2>

      <label for="teamCount" data-i18n="howManyTeamsQuestion">How many teams do you want to register?</label>
      <select id="teamCount" name="teamCount" required>
        <option value="" data-i18n="selectNumberOfTeams">-- Select number of teams --</option>
        <!-- Options generated dynamically -->
      </select>

      <hr />

      <div id="teamDetailsContainer" hidden>
        <h3 data-i18n="teamInformation">Team Information</h3>
        <div id="teamDetailsList"></div>
      </div>
      <!-- ... rest of form ... -->
    </form>
  </div>
</template>
```

**Key Characteristics:**
- ✅ Label and select are **siblings** (not wrapped in any container)
- ✅ Label comes **before** select
- ✅ **No `form-group` wrapper** around label/select
- ✅ Label uses `for="teamCount"` attribute
- ✅ Select has `id="teamCount"` and `name="teamCount"`

**CSS Classes Used:**
- `.card` - container
- `#categoryForm` - form element
- `#teamCount` - select element
- No special wrapper classes

---

### 2. WU/SC Form Styling

**Location:** `public/styles.css`

**Relevant CSS:**
```css
/* Form group styles (but WU/SC doesn't use form-group for team count) */
.form-group {
  flex: 1;
  margin-bottom: 0.75rem;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 500;
  color: #495057;
}

.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}
```

**Note:** Since WU/SC doesn't wrap label/select in `.form-group`, the label uses default styling and appears inline with the select naturally.

**No Special Inline Styling Found:**
- No `addWuScStyles()` function found
- No inline styles in `wu_sc_wizard.js` for team count
- Label and select appear inline because they're siblings without a block wrapper

---

### 3. TN Form Question 1 Current Structure

**Location:** `public/js/tn_wizard.js` - `createTeamCountSelector()` function (lines 1334-1404)

**Current HTML Generated:**
```javascript
container.innerHTML = `
  <div class="form-group">
    <label for="teamCount" data-i18n="howManyTeamsQuestion">${t('howManyTeamsQuestion')}</label>
    <select id="teamCount" name="teamCount" required>
      <option value="" data-i18n="selectNumberOfTeams">${t('selectNumberOfTeams')}</option>
      ${teamOptions.join('')}
    </select>
  </div>
  <div id="teamFieldsContainer" style="display: none;">
    <!-- Team fields will be generated here -->
  </div>
  <div id="formMsg" class="error-message" style="display: none;"></div>
  <div class="nav-buttons" id="step1Actions" style="display: none;">
    <button type="button" id="backToRaceInfo" data-i18n="backButton">← Back</button>
    <button type="button" id="nextToStep2" data-i18n="nextButton">Next →</button>
  </div>
`;
```

**Current CSS Applied:**
From `addStep1Styles()` in `tn_wizard.js` (lines 4381-4405):
```css
#tnScope .form-group {
  display: flex;
  flex-direction: column;  /* ← This makes label and select stack vertically */
}

#tnScope .form-group label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
}

#tnScope .form-group input,
#tnScope .form-group select {
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
```

**Key Characteristics:**
- ❌ Label and select are **wrapped in `<div class="form-group">`**
- ❌ `form-group` uses `flex-direction: column` → **stacks vertically**
- ❌ Label has `margin-bottom: 0.5rem` → creates vertical spacing

---

### 4. EXACT DIFFERENCES

#### HTML Structure Differences:

| Aspect | WU/SC | TN (Current) |
|--------|-------|--------------|
| **Wrapper** | None (siblings) | `<div class="form-group">` |
| **Label position** | Before select, sibling | Inside form-group, before select |
| **Select position** | After label, sibling | Inside form-group, after label |
| **Container** | Direct children of `<form>` | Wrapped in form-group div |

#### CSS/Styling Differences:

| Aspect | WU/SC | TN (Current) |
|--------|-------|--------------|
| **Layout direction** | Inline (default) | Vertical (flex column) |
| **Label display** | Default (inline) | Block (via form-group) |
| **Spacing** | Natural inline spacing | `margin-bottom: 0.5rem` on label |
| **Wrapper styling** | N/A | `display: flex; flex-direction: column` |

#### Wrapper Elements:

**WU/SC has:**
- No wrapper around label/select
- Label and select are direct children of `<form>`

**TN has:**
- `<div class="form-group">` wrapper around label/select
- This wrapper forces vertical layout

---

## WHAT NEEDS TO CHANGE IN TN

### Option 1: Remove form-group wrapper (Match WU/SC exactly)

**Change in `createTeamCountSelector()`:**
```javascript
// BEFORE:
container.innerHTML = `
  <div class="form-group">
    <label for="teamCount" data-i18n="howManyTeamsQuestion">${t('howManyTeamsQuestion')}</label>
    <select id="teamCount" name="teamCount" required>
      ...
    </select>
  </div>
  ...
`;

// AFTER:
container.innerHTML = `
  <label for="teamCount" data-i18n="howManyTeamsQuestion">${t('howManyTeamsQuestion')}</label>
  <select id="teamCount" name="teamCount" required>
    <option value="" data-i18n="selectNumberOfTeams">${t('selectNumberOfTeams')}</option>
    ${teamOptions.join('')}
  </select>
  <div id="teamFieldsContainer" style="display: none;">
    <!-- Team fields will be generated here -->
  </div>
  <div id="formMsg" class="error-message" style="display: none;"></div>
  <div class="nav-buttons" id="step1Actions" style="display: none;">
    <button type="button" id="backToRaceInfo" data-i18n="backButton">← Back</button>
    <button type="button" id="nextToStep2" data-i18n="nextButton">Next →</button>
  </div>
`;
```

### Option 2: Keep form-group but make it inline (Alternative)

If you want to keep the form-group wrapper for consistency but make it inline:

**Add CSS to `addStep1Styles()`:**
```css
#tnScope #teamCountSection > .form-group:first-child {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

#tnScope #teamCountSection > .form-group:first-child label {
  margin-bottom: 0;
  white-space: nowrap;
}

#tnScope #teamCountSection > .form-group:first-child select {
  width: auto;
  min-width: 200px;
}
```

---

## RECOMMENDATION

**Use Option 1** - Remove the form-group wrapper to match WU/SC exactly:
1. ✅ Simpler structure
2. ✅ Matches WU/SC format exactly
3. ✅ No special CSS needed
4. ✅ Label and select appear inline naturally

**File to modify:**
- `public/js/tn_wizard.js` - `createTeamCountSelector()` function (around line 1385)

**Change required:**
- Remove `<div class="form-group">` wrapper
- Make label and select direct children of container
- Keep all other elements (teamFieldsContainer, formMsg, nav-buttons) as-is


