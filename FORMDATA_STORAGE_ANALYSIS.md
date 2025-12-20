# FormData Storage Analysis

This document analyzes how form data is stored and managed across the three main wizard/form files:
- `public/js/tn_wizard.js` (TN Wizard - 202 KB)
- `public/js/wu_sc_wizard.js` (WU/SC Wizard)
- `public/js/ui_bindings.js` (Universal Form Bindings)

## Summary

| File | Storage Mechanism | Auto-Save | Navigation Back |
|------|------------------|-----------|----------------|
| `tn_wizard.js` | `sessionStorage` (keys prefixed `tn_`) | ❌ No - only on "Next" click | ✅ Yes - via `loadStep(step - 1)` |
| `wu_sc_wizard.js` | `sessionStorage` (keys prefixed `wu_`/`sc_`) | ❌ No - only on "Next" click | ✅ Yes - via `loadStep(step - 1)` |
| `ui_bindings.js` | ❌ No storage - only `collectStateFromForm()` | ❌ No | N/A (single-page form) |

---

## 1. tn_wizard.js

### Storage Mechanism

**Uses `sessionStorage` exclusively** - no `window.formData` or `localStorage` for form state.

#### Storage Keys Pattern
All keys are prefixed with `tn_`:
- `tn_current_step` - Current step number
- `tn_team_count` - Number of teams
- `tn_team_name_en_{i}`, `tn_team_name_tc_{i}` - Team names (English/Traditional Chinese)
- `tn_team_category_{i}`, `tn_team_option_{i}` - Team category and option
- `tn_org_name`, `tn_org_address` - Organization details
- `tn_manager1_name`, `tn_manager1_phone`, `tn_manager1_email` - Manager 1 details
- `tn_manager2_name`, `tn_manager2_phone`, `tn_manager2_email` - Manager 2 details
- `tn_manager3_name`, `tn_manager3_phone`, `tn_manager3_email` - Manager 3 details (optional)
- `tn_race_day` - JSON stringified race day data
- `tn_practice_all_teams` - JSON stringified practice data for all teams
- `tn_practice_team_{teamKey}`, `tn_slot_ranks_{teamKey}` - Individual team practice data

#### Storage Functions

**Save Functions:**
- `saveCurrentStepData()` - Routes to step-specific save function based on `currentStep`
- `saveStep1Data()` - Saves team count and team data
- `saveStep2Data()` - Saves organization and manager data
- `saveStep3Data()` - Saves race day arrangement data
- `saveStep4Data()` - Saves practice data for all teams
- `saveTeamData()` - Helper to save individual team fields

**Load Functions:**
- `loadTeamData()` - Restores team data from sessionStorage when step is loaded
- `loadStep2Data()` - Restores organization and manager data
- `loadRaceDayData()` - Restores race day data from JSON string

### Auto-Save Mechanism

**❌ No automatic auto-save exists.**

Data is only saved when:
1. User clicks "Next" button and validation passes
2. `saveCurrentStepData()` is called explicitly
3. Step validation functions call save functions (e.g., `validateStep1()` → `saveStep1Data()`)

**Input/Change Event Listeners:**
- Lines 1065-1090: Event listeners exist for `input` and `change` events, but they only:
  - Clear error messages
  - Check for duplicate team names
  - **Do NOT save data automatically**

### Navigation Back

**✅ Navigation back is fully supported.**

**Implementation:**
```javascript
// Line 5461-5469
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', async () => {
    if (currentStep > 1) {
      const targetStep = currentStep - 1;
      clearStepDataFromHere(targetStep); // Clear target step and all after
      await loadStep(targetStep);
    }
  });
}
```

**How it works:**
1. When "Back" button is clicked, `loadStep(currentStep - 1)` is called
2. `loadStep()` updates `currentStep` and calls `loadStepContent(step)`
3. Each step's initialization function (e.g., `initStep1()`, `initStep2()`) calls restore functions:
   - `initStep1()` restores team count from `sessionStorage.getItem('tn_team_count')`
   - `initStep2()` calls `loadStep2Data()` to restore organization/manager fields
   - `initStep3()` calls `loadRaceDayData()` to restore race day fields
4. Data is restored from sessionStorage into form fields

**Current Step Tracking:**
- Line 496: `sessionStorage.setItem('tn_current_step', step.toString())` - Saved on every step navigation

---

## 2. wu_sc_wizard.js

### Storage Mechanism

**Uses `sessionStorage` exclusively** - no `window.formData` or `localStorage` for form state.

#### Storage Keys Pattern
Keys are prefixed with event type (`wu_` or `sc_`):
- `{eventType}_current_step` - Current step number (e.g., `wu_current_step`, `sc_current_step`)
- `{eventType}_team_count` - Number of teams
- `{eventType}_team{i}_name_en`, `{eventType}_team{i}_name_tc` - Team names
- `{eventType}_team{i}_boatType`, `{eventType}_team{i}_division` - Team boat type and division
- `{eventType}_orgName`, `{eventType}_mailingAddress` - Organization details
- `{eventType}_manager1Name`, `{eventType}_manager1Phone`, `{eventType}_manager1Email` - Manager 1
- `{eventType}_manager2Name`, `{eventType}_manager2Phone`, `{eventType}_manager2Email` - Manager 2
- `{eventType}_manager3Name`, `{eventType}_manager3Phone`, `{eventType}_manager3Email` - Manager 3 (optional)
- `{eventType}_marqueeQty`, `{eventType}_steerWithQty`, `{eventType}_steerWithoutQty` - Race day quantities
- `{eventType}_junkBoatNo`, `{eventType}_junkBoatQty` - Junk boat details
- `{eventType}_speedBoatNo`, `{eventType}_speedboatQty` - Speed boat details

#### Storage Functions

**Save Functions:**
- Data is saved within validation functions:
  - `validateStep1()` - Saves team count and team data (lines 1742-1789)
  - `validateStep2()` - Saves organization and manager data (lines 1919-1952)
  - `validateStep3()` - Saves race day data (lines 1958-1981)

**Load Functions:**
- `initStep1()` - Restores team count from sessionStorage (line 770)
- `initStep2()` - Calls `renderTeamNameFields()` which reads from sessionStorage (line 1306)
- `populateSummary()` - Reads all data from sessionStorage for summary display

### Auto-Save Mechanism

**❌ No automatic auto-save exists.**

Data is only saved when:
1. User clicks "Next" button and validation passes
2. Validation functions (`validateStep1()`, `validateStep2()`, `validateStep3()`) save data to sessionStorage

**Input/Change Event Listeners:**
- Lines 1229-1282: Event listeners exist for email/phone validation, but they only:
  - Validate field values in real-time
  - Show/clear error messages
  - **Do NOT save data automatically**

### Navigation Back

**✅ Navigation back is fully supported.**

**Implementation:**
```javascript
// Line 1667-1671
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      loadStep(currentStep - 1);
    }
  });
}
```

**How it works:**
1. When "Back" button is clicked, `loadStep(currentStep - 1)` is called
2. `loadStep()` updates `currentStep` and calls `loadStepContent(step)`
3. Each step's initialization function restores data:
   - `initStep1()` restores team count from `sessionStorage.getItem('{eventType}_team_count')` (line 770)
   - `initStep2()` renders team names from sessionStorage (line 1306)
   - Form fields are populated from sessionStorage when steps are loaded

**Current Step Tracking:**
- Line 387: `sessionStorage.setItem('{eventType}_current_step', step.toString())` - Saved on every step navigation

---

## 3. ui_bindings.js

### Storage Mechanism

**❌ No storage mechanism exists.**

This file provides:
- `collectStateFromForm()` - Function to collect current form state from DOM
- Form rendering functions for single-page forms
- **No persistence** - data exists only in DOM while form is active

**Note:** This file is used for non-wizard single-page forms. For TN mode, it explicitly skips rendering (line 250) and defers to `tn_wizard.js`. For WU/SC mode, it defers to `wu_sc_wizard.js` (line 862).

### Auto-Save Mechanism

**❌ Not applicable** - no storage exists.

### Navigation Back

**N/A** - This is for single-page forms, not multi-step wizards.

---

## Key Findings

### 1. Storage Strategy
- **Both wizards use `sessionStorage` exclusively** - data persists only for the browser session
- **No `window.formData` object** - all data is stored in sessionStorage with prefixed keys
- **No `localStorage` for form state** - localStorage is only used for:
  - Config caching (`raceApp:config:{eventRef}`)
  - Client transaction ID (`raceApp:client_tx_id`)

### 2. Auto-Save Behavior
- **No automatic auto-save on input/change events**
- Data is saved only when:
  - User clicks "Next" button
  - Validation passes
  - Explicit save functions are called

### 3. Navigation Back
- **Both wizards fully support back navigation**
- Data is restored from sessionStorage when steps are loaded
- Current step is tracked in sessionStorage
- When going back, subsequent steps' data may be cleared (in TN wizard via `clearStepDataFromHere()`)

### 4. Data Persistence
- **Session-scoped only** - data is lost when:
  - Browser tab is closed
  - Session expires
  - User clears browser data
- **No cross-session persistence** - users cannot resume a form after closing the browser

### 5. Data Structure
- **Flat key-value pairs** in sessionStorage
- Complex data (race day, practice) is JSON stringified
- Keys are prefixed to avoid conflicts (`tn_`, `wu_`, `sc_`)

---

## Recommendations for Auto-Save Implementation

If implementing auto-save, consider:

1. **Debounced auto-save** - Save on input/change events with debouncing (e.g., 500ms delay)
2. **Save on blur** - Save individual fields when they lose focus
3. **Periodic auto-save** - Save every N seconds if form has unsaved changes
4. **Visual indicator** - Show "Saving..." or "Saved" status to user
5. **Error handling** - Handle sessionStorage quota exceeded errors gracefully

Example implementation pattern:
```javascript
// Debounced auto-save
let saveTimeout;
document.addEventListener('input', (e) => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveCurrentStepData();
  }, 500);
});
```
