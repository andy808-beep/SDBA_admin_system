# HTML Steps Analysis

This document analyzes the HTML files (`register.html`, `tn_templates.html`, `wu_sc_templates.html`) to answer:
1. How many steps are there exactly? (Review says 4 steps)
2. What data is collected at each step?
3. Are all steps visible at once or shown/hidden with JavaScript?

---

## 1. Number of Steps

### **TN Wizard: 6 Steps Total (0-5)**

**Note:** The review mentioning "4 steps" likely refers to the main form steps (1-4), excluding Step 0 (Race Info) and Step 5 (Summary).

#### Step Breakdown
- **Step 0**: Race Info (generated dynamically, no template)
- **Step 1**: Category & Team Selection (`tn-step-1` template)
- **Step 2**: Organization & Managers (`tn-step-2` template)
- **Step 3**: Race Day Arrangement (`tn-step-3` template)
- **Step 4**: Practice Booking (`tn-step-4` template)
- **Step 5**: Summary & Submit (`tn-step-5` template)

**JavaScript Configuration:**
```javascript
// From tn_wizard.js (line 110)
let currentStep = 0; // Start at step 0 (Race Info)
let totalSteps = 5;  // Steps 1-5 (excluding step 0 in count)
```

### **WU/SC Wizard: 5 Steps Total (0-4)**

**Note:** The review mentioning "4 steps" likely refers to the main form steps (1-4), excluding Step 0 (Race Info).

#### Step Breakdown
- **Step 0**: Race Info (generated dynamically, no template)
- **Step 1**: Team Details (`wu-sc-step-1` template)
- **Step 2**: Organization & Managers (`wu-sc-step-2` template)
- **Step 3**: Race Day Arrangement (`wu-sc-step-3` template)
- **Step 4**: Summary & Submit (`wu-sc-step-4` template)

**JavaScript Configuration:**
```javascript
// From wu_sc_wizard.js (lines 23-24)
let currentStep = 0; // Start at step 0 (Race Info)
let totalSteps = 4; // Step 1: Team Details, Step 2: Team Info, Step 3: Race Day, Step 4: Summary
```

---

## 2. Data Collected at Each Step

### TN Wizard Data Collection

#### Step 0: Race Info
**Purpose:** Display race information (read-only)
**Data Collected:** None (display only)
**Template:** None (generated dynamically)

**Content:**
- Event name (bilingual)
- Event date (bilingual)
- Event time (bilingual)
- Event venue (bilingual)
- Race course (bilingual)
- Application deadline (bilingual)
- Registration appendix link

#### Step 1: Category & Team Selection
**Template:** `tn-step-1` (`tn_templates.html` lines 4-67)
**Data Collected:**

```html
<!-- Race Category -->
<select id="raceCategory" required>
  <option value="men_open">Men Open</option>
  <option value="ladies_open">Ladies Open</option>
  <option value="mixed_open">Mixed Open</option>
  <option value="mixed_corporate">Mixed Corporate</option>
</select>

<!-- Team Count -->
<input type="number" id="teamCount" min="1" required />

<!-- Entry Options (shown after category/team count selected) -->
<input type="number" id="opt1Count" min="0" value="0" required />  <!-- Option 1 count -->
<input type="number" id="opt2Count" min="0" value="0" required />  <!-- Option 2 count -->
```

**Fields:**
- `raceCategory` - Race category selection
- `teamCount` - Number of teams to register
- `opt1Count` - Number of teams choosing Option 1
- `opt2Count` - Number of teams choosing Option 2

**Note:** Team name fields are dynamically generated after team count is selected.

#### Step 2: Organization & Managers
**Template:** `tn-step-2` (`tn_templates.html` lines 69-94)
**Data Collected:**

```html
<!-- Organization Info -->
<input type="text" id="orgName" name="orgName" required />
<textarea id="mailingAddress" name="mailingAddress" rows="3" required></textarea>

<!-- Manager Fields (dynamically rendered) -->
<!-- Manager 1 (Required) -->
<input type="text" id="manager1Name" required />
<input type="tel" id="manager1Phone" required />
<input type="email" id="manager1Email" required />

<!-- Manager 2 (Required) -->
<input type="text" id="manager2Name" required />
<input type="tel" id="manager2Phone" required />
<input type="email" id="manager2Email" required />

<!-- Manager 3 (Optional) -->
<input type="text" id="manager3Name" />
<input type="tel" id="manager3Phone" />
<input type="email" id="manager3Email" />
```

**Fields:**
- `orgName` - Organization/Group name
- `mailingAddress` - Mailing address
- `manager1Name`, `manager1Phone`, `manager1Email` - Manager 1 contact (required)
- `manager2Name`, `manager2Phone`, `manager2Email` - Manager 2 contact (required)
- `manager3Name`, `manager3Phone`, `manager3Email` - Manager 3 contact (optional)

**Note:** Team name fields are displayed as read-only (from Step 1).

#### Step 3: Race Day Arrangement
**Template:** `tn-step-3` (`tn_templates.html` lines 96-151)
**Data Collected:**

```html
<!-- Athlete Marquee -->
<input type="number" id="marqueeQty" name="marqueeQty" min="0" value="0" />

<!-- Official Steersman -->
<input type="number" id="steerWithQty" name="steerWithQty" min="0" value="0" />      <!-- With practice -->
<input type="number" id="steerWithoutQty" name="steerWithoutQty" min="0" value="0" /> <!-- Without practice -->

<!-- Junk Registration -->
<input type="text" id="junkBoatNo" name="junkBoatNo" />
<input type="number" id="junkBoatQty" name="junkBoatQty" min="0" value="0"/>

<!-- Speed Boat Registration -->
<input type="text" id="speedBoatNo" name="speedBoatNo" />
<input type="number" id="speedboatQty" name="speedboatQty" min="0" value="0"/>
```

**Fields:**
- `marqueeQty` - Athlete marquee quantity
- `steerWithQty` - Official steersman (with practice) quantity
- `steerWithoutQty` - Official steersman (without practice) quantity
- `junkBoatNo` - Pleasure boat number
- `junkBoatQty` - Junk boat quantity
- `speedBoatNo` - Speed boat number
- `speedboatQty` - Speed boat quantity

#### Step 4: Practice Booking
**Template:** `tn-step-4` (`tn_templates.html` lines 153-224)
**Data Collected:**

```html
<!-- Team Selection -->
<select id="teamSelect"></select>  <!-- Dynamically populated -->

<!-- Calendar Container (dynamically generated) -->
<div id="calendarContainer" class="calendar-wrapper"></div>

<!-- Time Slot Preferences -->
<select id="slotPref2h_1" required>  <!-- 2-hour session, 1st choice -->
<select id="slotPref1h_1">           <!-- 1-hour session, 1st choice -->
<select id="slotPref2h_2">           <!-- 2-hour session, 2nd choice -->
<select id="slotPref1h_2">           <!-- 1-hour session, 2nd choice -->
<select id="slotPref2h_3">           <!-- 2-hour session, 3rd choice -->
<select id="slotPref1h_3">           <!-- 1-hour session, 3rd choice -->
```

**Fields:**
- `teamSelect` - Team selection dropdown (per team)
- Practice dates (from calendar) - Selected dates with duration and helper type
- `slotPref2h_1`, `slotPref2h_2`, `slotPref2h_3` - 2-hour session preferences (rank 1-3)
- `slotPref1h_1`, `slotPref1h_2`, `slotPref1h_3` - 1-hour session preferences (rank 1-3)

**Note:** Practice data is collected per team, with multiple dates possible per team.

#### Step 5: Summary & Submit
**Template:** `tn-step-5` (`tn_templates.html` lines 226-301)
**Data Collected:** None (read-only display)

**Displays:**
- Basics: Season, Organization, Mailing Address
- Teams: Team names, entry options
- Managers: Manager contact information
- Race Day: All race day arrangements
- Practice: Practice booking summary per team

**Action:**
- Submit button triggers final form submission

---

### WU/SC Wizard Data Collection

#### Step 0: Race Info
**Purpose:** Display race information (read-only)
**Data Collected:** None (display only)
**Template:** None (generated dynamically)

**Content:** Same as TN Step 0

#### Step 1: Team Details
**Template:** `wu-sc-step-1` (`wu_sc_templates.html` lines 3-31)
**Data Collected:**

```html
<!-- Team Count -->
<select id="teamCount" name="teamCount" required>
  <!-- Options generated dynamically -->
</select>

<!-- Team Details (shown after team count selected) -->
<!-- Dynamically generated for each team: -->
<input type="text" id="teamNameEn${i}" name="teamNameEn${i}" required />
<input type="text" id="teamNameTc${i}" name="teamNameTc${i}" />
<input type="radio" name="boatType${i}" value="Standard Boat" required />
<input type="radio" name="boatType${i}" value="Small Boat" required />
<input type="radio" name="division${i}" value="..." required />  <!-- Shown after boat type selected -->
```

**Fields:**
- `teamCount` - Number of teams to register
- For each team (dynamically generated):
  - `teamNameEn${i}` - Team name (English)
  - `teamNameTc${i}` - Team name (Traditional Chinese)
  - `boatType${i}` - Boat type selection (Standard Boat / Small Boat)
  - `division${i}` - Division/Entry Group selection (shown after boat type)

#### Step 2: Organization & Managers
**Template:** `wu-sc-step-2` (`wu_sc_templates.html` lines 33-58)
**Data Collected:** Same as TN Step 2

```html
<!-- Organization Info -->
<input type="text" id="orgName" name="orgName" required />
<textarea id="mailingAddress" name="mailingAddress" rows="3" required></textarea>

<!-- Manager Fields (dynamically rendered) -->
<!-- Manager 1, 2, 3 (same structure as TN) -->
```

**Fields:**
- `orgName` - Organization/Group name
- `mailingAddress` - Mailing address
- `manager1Name`, `manager1Phone`, `manager1Email` - Manager 1 (required)
- `manager2Name`, `manager2Phone`, `manager2Email` - Manager 2 (required)
- `manager3Name`, `manager3Phone`, `manager3Email` - Manager 3 (optional)

#### Step 3: Race Day Arrangement
**Template:** `wu-sc-step-3` (`wu_sc_templates.html` lines 60-115)
**Data Collected:** Same as TN Step 3

```html
<!-- Same fields as TN Step 3 -->
<input type="number" id="marqueeQty" name="marqueeQty" min="0" value="0" />
<input type="number" id="steerWithQty" name="steerWithQty" min="0" value="0" />
<input type="number" id="steerWithoutQty" name="steerWithoutQty" min="0" value="0" />
<input type="text" id="junkBoatNo" name="junkBoatNo" />
<input type="number" id="junkBoatQty" name="junkBoatQty" min="0" value="0"/>
<input type="text" id="speedBoatNo" name="speedBoatNo" />
<input type="number" id="speedboatQty" name="speedboatQty" min="0" value="0"/>
```

**Fields:** Same as TN Step 3

#### Step 4: Summary & Submit
**Template:** `wu-sc-step-4` (`wu_sc_templates.html` lines 117-179)
**Data Collected:** None (read-only display)

**Displays:**
- Basics: Season, Organization, Mailing Address
- Teams: Team names, boat types, divisions
- Managers: Manager contact information
- Race Day: All race day arrangements
- Total Cost: Calculated total

**Action:**
- Submit button triggers final form submission

---

## 3. Step Visibility: Shown/Hidden with JavaScript

### **Only ONE step is visible at a time**

#### Implementation

**Steps are NOT all visible at once.** Only the current step is rendered in the DOM.

**How it works:**

1. **Templates are stored in HTML** (`tn_templates.html`, `wu_sc_templates.html`)
   - Templates use `<template>` elements
   - Templates are hidden by default (browser behavior)
   - Templates are loaded into the page but not displayed

2. **JavaScript dynamically loads one step at a time:**

```javascript
// From tn_wizard.js (loadStepContent function, lines 568-571)
const templateId = `tn-step-${step}`;
const template = document.getElementById(templateId);
const content = template.content.cloneNode(true);
wizardMount.innerHTML = '';  // Clear previous step
wizardMount.appendChild(content);  // Add new step
```

3. **Step switching process:**

```javascript
// When user clicks "Next" or "Back"
async function loadStep(step) {
  currentStep = step;
  updateStepper();  // Update visual stepper
  await loadStepContent(step);  // Load new step content
  sessionStorage.setItem('tn_current_step', step.toString());
}
```

**Key Points:**
- `wizardMount.innerHTML = ''` - **Clears the previous step completely**
- Only the current step's content exists in the DOM
- Previous steps are removed from DOM (not just hidden)
- Data is preserved in `sessionStorage` when navigating

#### Visual Stepper

**The stepper navigation bar shows all steps, but only one step content is visible:**

```html
<!-- From register.html - Stepper is always visible (except step 0) -->
<div class="stepper-container">
  <div class="stepper-steps">
    <div class="step active">1. Teams</div>
    <div class="step">2. Organization</div>
    <div class="step">3. Race Day</div>
    <div class="step">4. Practice</div>
    <div class="step">5. Summary</div>
  </div>
</div>
```

**Stepper states:**
- `.active` - Current step (blue background)
- `.completed` - Past steps (green background)
- Default - Future steps (gray background)

#### Step 0 Special Handling

**Step 0 (Race Info) is generated dynamically and hides the stepper:**

```javascript
// From tn_wizard.js (initStepNavigation, lines 195-201)
if (currentStep === 0) {
  // Hide stepper on step 0 (Race Info page)
  if (stepper) stepper.style.display = 'none';
  return;
}
```

---

## Summary

### 1. Number of Steps

| Wizard | Total Steps | Step 0 | Form Steps | Step 5/4 |
|--------|-------------|--------|------------|----------|
| **TN** | 6 (0-5) | Race Info | 4 (1-4) | Summary |
| **WU/SC** | 5 (0-4) | Race Info | 4 (1-4) | Summary |

**Review Note:** The "4 steps" mentioned in reviews likely refers to the main form steps (1-4), excluding:
- Step 0 (Race Info - informational only)
- Final step (Summary - read-only)

### 2. Data Collection Summary

| Step | TN Wizard | WU/SC Wizard |
|------|-----------|--------------|
| **0** | None (display only) | None (display only) |
| **1** | Category, Team Count, Entry Options | Team Count, Team Names, Boat Types, Divisions |
| **2** | Organization, Managers (3) | Organization, Managers (3) |
| **3** | Race Day Items (6 fields) | Race Day Items (6 fields) |
| **4** | Practice Booking (per team) | Summary (read-only) |
| **5** | Summary (read-only) | N/A |

### 3. Visibility Mechanism

- ✅ **Only ONE step visible at a time**
- ✅ **Steps are dynamically loaded** from templates
- ✅ **Previous step is completely removed** from DOM (`innerHTML = ''`)
- ✅ **Data preserved in sessionStorage** when navigating
- ✅ **Stepper navigation bar** shows all steps (visual indicator only)
- ✅ **Step 0 hides stepper** (special case)

---

## Template Structure

### Template Loading

**Templates are loaded via fetch and injected into DOM:**

```javascript
// From register.html (lines 551-574)
fetch('tn_templates.html')
  .then(response => response.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const templates = doc.querySelectorAll('template');
    templates.forEach(template => {
      document.body.appendChild(template);  // Add to DOM (hidden)
    });
  });
```

**Template Elements:**
- `<template id="tn-step-1">` through `<template id="tn-step-5">`
- `<template id="wu-sc-step-1">` through `<template id="wu-sc-step-4">`
- Templates are in DOM but hidden (browser default behavior)
- Content is cloned when step is loaded

---

## Related Files

- `public/register.html` - Main entry point, container structure
- `public/tn_templates.html` - TN wizard templates (steps 1-5)
- `public/wu_sc_templates.html` - WU/SC wizard templates (steps 1-4)
- `public/js/tn_wizard.js` - TN wizard logic (step loading, navigation)
- `public/js/wu_sc_wizard.js` - WU/SC wizard logic (step loading, navigation)

