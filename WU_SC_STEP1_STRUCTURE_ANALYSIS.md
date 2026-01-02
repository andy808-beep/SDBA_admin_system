# WU/SC Step 1 Current Structure Analysis

## 1. HTML Structure

### Complete Step 1 HTML Template
```html
<template id="wu-sc-step-1">
  <div class="card">
    <form id="categoryForm">
      <h2 data-i18n="selectTeamDetails">Team Details</h2>

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
      <!-- Navigation -->
      <div class="nav-buttons" id="step1Actions" style="display: flex; justify-content: space-between; gap: 1rem; visibility: hidden;">
        <button type="button" id="backToRaceInfo" data-i18n="backButton">← Back</button>
        <button type="submit" id="nextBtn" data-i18n="nextButton">Next →</button>
      </div>
    </form>
  </div>
</template>
```

### Dynamically Generated Team HTML (from renderTeamDetails function)
For each team (1, 2, 3, etc.), the following HTML is generated:

```html
<div class="entry-option">
  <strong data-i18n="teamLabel" data-i18n-params='{"num":"1"}'>Team 1</strong>
  <div class="form-group">
    <label for="teamNameEn1" data-i18n="teamNameEnLabel">Team Name (English)</label>
    <input type="text" id="teamNameEn1" name="teamNameEn1" required placeholder="Enter team name in English" data-i18n-placeholder="teamNameEnPlaceholder" />
    <div class="field-error-message" id="error-teamNameEn1"></div>
  </div>
  <div class="form-group">
    <label for="teamNameTc1" data-i18n="teamNameTcLabel">Team Name (Traditional Chinese)</label>
    <input type="text" id="teamNameTc1" name="teamNameTc1" placeholder="Enter team name in Traditional Chinese" data-i18n-placeholder="teamNameTcPlaceholder" />
  </div>
  <div class="form-group">
    <label for="entryGroup1" style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;" data-i18n="entryGroupLabel">Entry Group</label>
    <div id="entryGroupContainer1">
      <!-- Dropdown will be rendered here by JavaScript -->
    </div>
    <div class="field-error-message" id="error-entryGroup1"></div>
  </div>
</div>
```

### Entry Group Dropdown HTML (dynamically generated)
```html
<select id="entryGroup1" name="entryGroup1" required class="form-select" data-i18n-placeholder="selectEntryGroup">
  <option value="" disabled selected>Select Entry Group</option>
  <!-- Options dynamically generated from config -->
  <option value="WM" data-price="..." data-boat-type-en="..." data-label-en="Standard Boat – Men">Standard Boat – Men</option>
  <!-- More options... -->
</select>
```

### Key Elements Found
- **Step 1 container**: `<div class="card">` wrapping the entire step
- **Form element**: `<form id="categoryForm">`
- **Title elements**: 
  - `<h2 data-i18n="selectTeamDetails">Team Details</h2>` (main title)
  - `<h3 data-i18n="teamInformation">Team Information</h3>` (section title inside teamDetailsContainer)
- **Number of team sections**: Dynamic (1-3+ teams based on user selection)
- **Card structure**: Yes, each team is wrapped in `<div class="entry-option">` (not a card, but styled container)
- **Team container**: `<div id="teamDetailsContainer" hidden>` wraps all teams
- **Team list container**: `<div id="teamDetailsList"></div>` where individual teams are appended

## 2. Entry Group Field

### Current HTML
```html
<div class="form-group">
  <label for="entryGroup1" style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;" data-i18n="entryGroupLabel">Entry Group</label>
  <div id="entryGroupContainer1">
    <select id="entryGroup1" name="entryGroup1" required class="form-select" data-i18n-placeholder="selectEntryGroup">
      <option value="" disabled selected>Select Entry Group</option>
      <!-- Options from config -->
    </select>
  </div>
  <div class="field-error-message" id="error-entryGroup1"></div>
</div>
```

### Current Styling
- **Label classes**: No classes, only inline styles: `style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;"`
- **Label color**: `#0f6ec7` (blue)
- **Has asterisk**: **NO** (label text is just "Entry Group")
- **Required attribute**: **YES** (`required` on select element)
- **Select classes**: `form-select`
- **Container**: Wrapped in `<div class="form-group">` and nested `<div id="entryGroupContainer1">`

## 3. Team Name Fields

### Team 1 (and all teams follow same pattern)
```html
<div class="entry-option">
  <strong data-i18n="teamLabel" data-i18n-params='{"num":"1"}'>Team 1</strong>
  <div class="form-group">
    <label for="teamNameEn1" data-i18n="teamNameEnLabel">Team Name (English)</label>
    <input type="text" id="teamNameEn1" name="teamNameEn1" required placeholder="Enter team name in English" data-i18n-placeholder="teamNameEnPlaceholder" />
    <div class="field-error-message" id="error-teamNameEn1"></div>
  </div>
  <div class="form-group">
    <label for="teamNameTc1" data-i18n="teamNameTcLabel">Team Name (Traditional Chinese)</label>
    <input type="text" id="teamNameTc1" name="teamNameTc1" placeholder="Enter team name in Traditional Chinese" data-i18n-placeholder="teamNameTcPlaceholder" />
  </div>
  <!-- Entry Group field follows... -->
</div>
```

### Team Name Field Details
- **Label text (English)**: "Team Name (English)" (from i18n key `teamNameEnLabel`)
- **Label text (Chinese)**: "Team Name (Traditional Chinese)" (from i18n key `teamNameTcLabel`)
- **Has asterisk**: **NO** (but English field is required)
- **Label classes**: No classes, just `data-i18n` attribute
- **Container structure**: 
  - Each team wrapped in `<div class="entry-option">`
  - Each field wrapped in `<div class="form-group">`
  - All teams inside `<div id="teamDetailsList"></div>`
  - Team list inside `<div id="teamDetailsContainer" hidden>`
- **Team headers/titles**: `<strong>` element with "Team 1", "Team 2", etc. (from i18n key `teamLabel`)

### Team 2
Same structure as Team 1, with IDs: `teamNameEn2`, `teamNameTc2`, `entryGroup2`, etc.

### Team 3
Same structure as Team 1, with IDs: `teamNameEn3`, `teamNameTc2`, `entryGroup3`, etc.

## 4. Relevant CSS

### From styles.css
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
  margin-bottom: 6px;
}

/* Entry option spacing - more compact */
.entry-option {
  margin-bottom: 1rem;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow-wrap: break-word;
}

.entry-option:last-child {
  margin-bottom: 0.5rem;
}

.entry-option strong {
  display: block;
  margin-bottom: 0.5rem;
}

/* Team details container spacing */
#teamDetailsContainer {
  margin-top: 0.75rem;
}

#teamDetailsContainer h3 {
  margin-bottom: 0.75rem;
}

/* Form group styling */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input[type="text"]:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
```

### From theme.css
```css
/* Headers with theme color */
h1, h2 {
  color: #2c3e50;
}

h3 {
  color: var(--theme-primary-dark);
}

/* Event-specific header colors */
body[data-event="wu"] h1,
body[data-event="wu"] h2 {
  color: #005090;
}

body[data-event="sc"] h1,
body[data-event="sc"] h2 {
  color: #007a3d;
}

/* Form input focus states */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--theme-primary) !important;
  box-shadow: 0 0 0 3px var(--theme-primary-light) !important;
}
```

## 5. JavaScript Logic

### Entry Group Handler
**Function**: `renderEntryGroupDropdown(teamIndex, cfg)`
**Location**: `public/js/wu_sc_wizard.js` (lines 1044-1157)

```javascript
async function renderEntryGroupDropdown(teamIndex, cfg) {
  // Gets container element
  const container = document.getElementById(`entryGroupContainer${teamIndex}`);
  
  // Builds options from config using DropdownOptionsBuilder
  const options = window.DropdownOptionsBuilder.buildEntryGroupOptions(cfg, lang);
  
  // Creates select element
  const select = document.createElement('select');
  select.id = `entryGroup${teamIndex}`;
  select.name = `entryGroup${teamIndex}`;
  select.required = true;
  select.className = 'form-select';
  
  // Adds placeholder and options
  // Sets up change handler to save to sessionStorage
  select.addEventListener('change', (e) => {
    sessionStorage.setItem(`${eventType}_team${teamIndex}_entryGroup`, select.value);
    sessionStorage.setItem(`${eventType}_team${teamIndex}_entryGroupLabel`, selectedOption.dataset.labelEn);
  });
}
```

### Team Visibility Logic
**Function**: `initStep1()`
**Location**: `public/js/wu_sc_wizard.js` (lines 810-912)

```javascript
function initStep1() {
  const teamCountSelect = document.getElementById('teamCount');
  const teamDetailsContainer = document.getElementById('teamDetailsContainer');
  const teamDetailsList = document.getElementById('teamDetailsList');
  
  // Handler for team count change
  const handleTeamCountChange = async (e) => {
    const count = parseInt(e.target.value, 10);
    if (count > 0) {
      teamDetailsContainer.hidden = false;  // Show container
      await renderTeamDetails(count);        // Render teams
      // Show next button
    } else {
      teamDetailsContainer.hidden = true;   // Hide container
      teamDetailsList.innerHTML = '';       // Clear teams
    }
  };
  
  teamCountSelect.addEventListener('change', handleTeamCountChange);
}
```

**Function**: `renderTeamDetails(count)`
**Location**: `public/js/wu_sc_wizard.js` (lines 915-1036)

```javascript
async function renderTeamDetails(count) {
  const teamDetailsList = document.getElementById('teamDetailsList');
  teamDetailsList.innerHTML = '';  // Clear existing
  
  // Loop through count (1, 2, 3, etc.)
  for (let i = 1; i <= count; i++) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'entry-option';
    teamDiv.innerHTML = `...`;  // HTML structure shown above
    
    teamDetailsList.appendChild(teamDiv);
    
    // Render entry group dropdown for this team
    await renderEntryGroupDropdown(i, cfg);
  }
}
```

### Validation Functions
**Function**: `validateStep1()`
**Location**: `public/js/wu_sc_wizard.js` (lines 2318-2380)

```javascript
function validateStep1() {
  // Validates team count
  const teamCount = document.getElementById('teamCount');
  if (!teamCount || !teamCount.value) {
    // Show error
    return false;
  }
  
  const count = parseInt(teamCount.value);
  
  // Validate each team
  for (let i = 1; i <= count; i++) {
    // Validate team name (English) - required
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    if (!teamNameEn || !teamNameEn.value.trim()) {
      // Show error
      return false;
    }
    
    // Validate entry group - required
    const entryGroupSelect = document.getElementById(`entryGroup${i}`);
    if (!entryGroupSelect || !entryGroupSelect.value || entryGroupSelect.value === '') {
      // Show error
      return false;
    }
  }
  
  // Save to sessionStorage
  // Return true if all valid
}
```

### Key Function Names
- `initStep1()` - Initializes Step 1, sets up event handlers
- `renderTeamDetails(count)` - Renders HTML for N teams
- `renderEntryGroupDropdown(teamIndex, cfg)` - Renders entry group dropdown for a team
- `validateStep1()` - Validates all Step 1 fields
- `restoreTeamDetails()` - Restores saved data from sessionStorage
- `handleTeamCountChange(e)` - Handles team count selection change

## 6. Comparison with TN Form

### Structure Differences
**TN Form Step 1**:
- Uses `<div id="teamCountSection">` for team count selector
- Teams are rendered with boat type selection (radio buttons) and division selection
- Entry Group is called "Division" in TN
- No "Team Information" h3 header

**WU/SC Form Step 1**:
- Uses `<select id="teamCount">` for team count
- Teams are rendered with just team names and entry group dropdown
- Entry Group is a dropdown (not radio buttons)
- Has "Team Information" h3 header inside `teamDetailsContainer`

### CSS Differences
**TN Form**:
- Uses `#tnScope` prefix for scoped styles
- Has more complex styling for boat type radio buttons
- Entry group styled as radio options

**WU/SC Form**:
- Uses universal styles (no scope prefix)
- Simpler structure with just form groups
- Entry group is a dropdown select

### Label Styling Differences
**TN Form**:
- Labels follow standard `.form-group label` styling
- No special styling for entry group label

**WU/SC Form**:
- Entry Group label has inline styles: `font-weight: bold; font-size: 1.05em; color: #0f6ec7;`
- Other labels use standard `.form-group label` styling

## 7. Changes Needed

Based on the analysis, here's what needs to change to restructure Step 1:

1. **Remove "Team Information" h3 header**
   - Currently: `<h3 data-i18n="teamInformation">Team Information</h3>` inside `teamDetailsContainer`
   - Action: Remove this h3 element

2. **Move Entry Group field to top (before team names)**
   - Currently: Entry Group is after Team Name (English) and Team Name (Chinese)
   - Action: Reorder fields in `renderTeamDetails()` function

3. **Add asterisk to Entry Group label**
   - Currently: Label has no asterisk
   - Action: Add `*` to label text or use CSS `::after` pseudo-element

4. **Update Entry Group label styling**
   - Currently: Inline styles `font-weight: bold; font-size: 1.05em; color: #0f6ec7;`
   - Action: Move to CSS class or update to match TN form styling (if that's the goal)

5. **Restructure team containers (if moving to cards)**
   - Currently: Teams in `<div class="entry-option">`
   - Action: If moving to cards, wrap each team in a card-like container

6. **Update CSS for new structure**
   - May need new styles for card-based team layout
   - May need to update spacing if structure changes

7. **Update JavaScript validation**
   - Ensure validation still works after field reordering
   - Ensure sessionStorage keys remain consistent

8. **Update restore functions**
   - Ensure `restoreTeamDetails()` still works with new field order
   - Ensure entry group restoration happens at correct time

## 8. Current Data Flow

### SessionStorage Keys Used
- `${eventType}_team_count` - Number of teams (e.g., "wu_team_count")
- `${eventType}_team${i}_name_en` - Team name English (e.g., "wu_team1_name_en")
- `${eventType}_team${i}_name_tc` - Team name Chinese (e.g., "wu_team1_name_tc")
- `${eventType}_team${i}_entryGroup` - Entry group code (e.g., "wu_team1_entryGroup")
- `${eventType}_team${i}_entryGroupLabel` - Entry group label (e.g., "wu_team1_entryGroupLabel")

### Field IDs Pattern
- Team count: `teamCount`
- Team name English: `teamNameEn${i}` (e.g., `teamNameEn1`)
- Team name Chinese: `teamNameTc${i}` (e.g., `teamNameTc1`)
- Entry group: `entryGroup${i}` (e.g., `entryGroup1`)
- Entry group container: `entryGroupContainer${i}` (e.g., `entryGroupContainer1`)
- Error messages: `error-teamNameEn${i}`, `error-entryGroup${i}`

## 9. Template Location

**Template File**: `public/wu_sc_templates.html`
- Template ID: `wu-sc-step-1`
- Loaded by: `event_bootstrap.js` (via `loadWUSCTemplates()`)
- Cloned and inserted into: `#wuScWizardMount` by `loadStepContent(1)`

## 10. Summary

**Current Step 1 Structure**:
1. Card container
2. Form with "Team Details" h2
3. Team count dropdown
4. HR separator
5. Team Details Container (hidden initially)
   - "Team Information" h3 (to be removed)
   - Team Details List
     - For each team:
       - Entry option div
       - Team label (strong)
       - Team Name (English) - required
       - Team Name (Chinese) - optional
       - Entry Group dropdown - required

**Key Points**:
- Entry Group is currently at the bottom of each team's fields
- Entry Group label has special blue styling (inline)
- No asterisk on Entry Group label (but field is required)
- "Team Information" h3 exists and should be removed
- Teams are in `.entry-option` divs, not cards
- All styling is in `styles.css` and `theme.css`
- JavaScript handles dynamic rendering and validation

