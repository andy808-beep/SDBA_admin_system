# Relevant Code for Button Outline & Radio Button Overflow Issues

## Issue 1: Faint Blue Rectangle Around Button
## Issue 2: Radio Button Text Overflow (Selection Context Pushed Out of Page Boundary)

---

## 1. Button Styles (public/styles.css)

### Button Base Styles (Lines 68-114)
```css
/* Theme-aware button styles */
button[type="submit"],
button#nextBtn,
button#submitBtn,
.nav-buttons button:not(#backBtn) {
  background: var(--theme-primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.3s ease;
  outline: none;
  box-shadow: none;
}

button[type="submit"]:focus,
button#nextBtn:focus,
button#submitBtn:focus,
.nav-buttons button:not(#backBtn):focus {
  outline: none;
  box-shadow: none;
}

button[type="submit"]:hover,
button#nextBtn:hover,
button#submitBtn:hover,
.nav-buttons button:not(#backBtn):hover {
  background: var(--theme-primary-dark);
}

button#backBtn,
.nav-buttons button#backBtn {
  background: var(--theme-primary-dark);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.3s ease;
}

button#backBtn:hover,
.nav-buttons button#backBtn:hover {
  background: var(--theme-primary);
  opacity: 0.9;
}
```

### Navigation Buttons Container (Lines 138-143)
```css
/* Navigation buttons container - reduce spacing */
.nav-buttons {
  margin-top: 0.75rem;
  margin-bottom: 0;
  padding: 0;
}
```

---

## 2. Card Container Styles (public/styles.css)

### Card Base Styles (Lines 116-136)
```css
/* Card container - reduce padding for WU/SC forms */
.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.card h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
}
```

---

## 3. Radio Button Styles (public/styles.css)

### Radio Group Container (Lines 191-199)
```css
/* Radio button styles */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}
```

### Radio Button Container Wrappers (Lines 201-216)
```css
/* Radio button container wrapper - constrain width */
#boatTypeContainer,
[id^="boatTypeContainer"] {
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* Entry group container - constrain width */
#entryGroupContainer,
[id^="entryGroupContainer"] {
  max-width: calc(100% - 1.5rem);
  box-sizing: border-box;
  overflow: hidden;
}
```

### Radio Label Styles (Lines 248-274)
```css
/* Radio labels for WU/SC forms */
.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  cursor: pointer;
  font-weight: 500;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.radio-label input[type="radio"] {
  margin: 0;
  cursor: pointer;
  transform: scale(1.1);
  flex-shrink: 0;
}

.radio-label > *:not(input) {
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
```

---

## 4. Form Group Styles (public/styles.css)

### Form Group Container (Lines 294-308)
```css
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
```

---

## 5. HTML Template (public/wu_sc_templates.html)

### Step 1 Template (Lines 3-31)
```html
<template id="wu-sc-step-1">
  <div class="card">
    <form id="categoryForm">
      <h2 data-i18n="selectTeamDetails">Select Team Details</h2>

      <label for="teamCount" data-i18n="howManyTeamsQuestion">How many teams do you want to register?</label>
      <select id="teamCount" name="teamCount" required>
        <option value="" data-i18n="selectNumberOfTeams">-- Select number of teams --</option>
        <!-- Options will be generated dynamically in initStep1() -->
      </select>

      <hr />

      <div id="teamDetailsContainer" hidden>
        <h3 data-i18n="teamInformation">Team Information</h3>
        <div id="teamDetailsList"></div>
      </div>

      <!-- Honeypot field -->
      <input type="text" name="website" id="website_hp" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px;" />

      <p class="msg" id="formMsg"></p>
      <!-- 🔄 Navigation -->
      <div class="nav-buttons" id="step1Actions" style="display: none;">
        <button type="submit" id="nextBtn" data-i18n="nextButton">Next →</button>
      </div>
    </form>
  </div>
</template>
```

---

## 6. JavaScript - Team Details Rendering (public/js/wu_sc_wizard.js)

### Team Details HTML Structure (Lines 870-888)
```javascript
const teamDiv = document.createElement('div');
teamDiv.className = 'entry-option';
teamDiv.innerHTML = `
  <strong data-i18n="teamLabel" data-i18n-params='{"num":"${i}"}'>${t('teamLabel', { num: i })}</strong>
  <div class="form-group">
    <label for="teamName${i}" data-i18n="teamName">${t('teamName')}</label>
    <input type="text" id="teamName${i}" name="teamName${i}" required placeholder="${t('enterTeamName')}" data-i18n-placeholder="enterTeamName" />
  </div>
  <div class="form-group">
    <label style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;" data-i18n="divisionLabel">${t('divisionLabel')}</label>
    <div id="boatTypeContainer${i}">
      <div id="boatType${i}" class="radio-group"></div>
      <div class="form-group" id="entryGroupContainer${i}" style="margin-left: 1.5rem; padding-left: 1rem; border-left: 3px solid #e0e0e0; margin-top: 0.25rem; max-width: calc(100% - 1.5rem); box-sizing: border-box; overflow: hidden;" hidden>
        <label style="font-weight: normal; font-size: 0.95em; color: #555;" data-i18n="entryGroupLabel">${t('entryGroupLabel')}</label>
        <div id="division${i}" class="radio-group"></div>
      </div>
    </div>
  </div>
`;
```

### Boat Type Radio Button Creation (Lines 972-999)
```javascript
validPackages.forEach((pkg, index) => {
  const label = document.createElement('label');
  label.className = 'radio-label';
  // Use localized title (title_en or title_tc)
  const displayTitle = isZh ? (pkg.title_tc || pkg.title_en) : pkg.title_en;
  // XSS FIX: Escape package data before inserting into HTML
  const safeDisplayTitle = SafeDOM.escapeHtml(displayTitle);
  // Store title_en as value for filtering divisions (they match by English name)
  const safeTitleEn = SafeDOM.escapeHtml(pkg.title_en);
  const price = pkg.listed_unit_price ? pkg.listed_unit_price.toLocaleString() : '0';
  const hkDollar = window.i18n?.t?.('hkDollar') || 'HK$';
  label.innerHTML = `
    <input type="radio" id="boatType${teamIndex}_${index}" name="boatType${teamIndex}" value="${safeTitleEn}" required />
    ${safeDisplayTitle} - ${hkDollar}${price}
  `;
  container.appendChild(label);

  // Show divisions when boat type is selected
  const radio = label.querySelector('input');
  if (radio) {
    radio.addEventListener('change', () => {
      Logger.debug(`Boat type selected for team ${teamIndex}: ${safeTitleEn}`);
      // Move entry group container after the selected radio button
      label.parentNode.appendChild(entryGroupContainer);
      showDivisionRow(teamIndex);
    });
  }
});
```

### Division Radio Button Creation (Lines 1102-1119)
```javascript
filteredDivisions.forEach((div, index) => {
  const label = document.createElement('label');
  label.className = 'radio-label';

  // Use localized name from the view (name_en or name_tc)
  const displayName = isZh ? (div.name_tc || div.name_en || '') : (div.name_en || '');

  // XSS FIX: Escape division data before inserting into HTML
  const safeDisplayName = SafeDOM.escapeHtml(displayName);
  // Store division_code as value for submission, display localized name
  const divisionCode = div.division_code || div.name_en || '';
  const safeDivisionCode = SafeDOM.escapeHtml(divisionCode);
  label.innerHTML = `
    <input type="radio" id="division${teamIndex}_${index}" name="division${teamIndex}" value="${safeDivisionCode}" required />
    ${safeDisplayName}
  `;
  divisionContainer.appendChild(label);
});
```

---

## Key Issues Identified:

1. **Button Blue Rectangle**: 
   - CSS has `outline: none` and `box-shadow: none` but may be overridden
   - Could be browser default focus styles or parent container styles
   - May need `!important` or more specific selectors

2. **Radio Button Overflow**:
   - Entry group container has `margin-left: 1.5rem` + `padding-left: 1rem` = 2.5rem total left spacing
   - `max-width: calc(100% - 1.5rem)` may not account for all spacing
   - Text content is directly in label.innerHTML without wrapping element
   - `overflow: hidden` hides overflow instead of wrapping
   - Parent containers may not be properly constrained

3. **Potential Missing Constraints**:
   - `#teamDetailsList` container may need width constraints
   - `.entry-option` container may need width constraints
   - Form container may need width constraints


