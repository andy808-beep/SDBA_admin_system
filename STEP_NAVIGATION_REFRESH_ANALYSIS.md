# Step Navigation & Page Refresh Analysis

This document analyzes step navigation, page refresh handling, and warnings in the registration wizards.

---

## 1. Can Users Click on Step Indicators to Jump to Previous Steps?

### **NO - Step indicators are NOT clickable**

#### Visual Evidence

**Stepper steps have `cursor: default` (not clickable):**

```css
/* From tn_wizard.js (line 237) */
#tnScope .step {
  padding: 0.75rem 1.5rem;
  background: #e9ecef;
  color: #6c757d;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: default;  /* ← NOT clickable */
  transition: all 0.3s ease;
  white-space: nowrap;
}
```

#### Code Evidence

**No click event listeners on stepper steps:**

```javascript
// From tn_wizard.js (initStepNavigation, lines 206-216)
stepper.innerHTML = `
  <div class="stepper-container">
    <div class="stepper-steps">
      <div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1">...</div>
      <div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2">...</div>
      <div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3">...</div>
      <div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4">...</div>
      <div class="step ${currentStep >= 5 ? 'active' : ''}" data-step="5">...</div>
    </div>
  </div>
`;
// NO event listeners added to .step elements
```

**Search Results:**
- No matches for `.step.*click` or `addEventListener.*step`
- No click handlers on stepper elements

#### Stepper Purpose

**The stepper is purely visual - shows progress only:**

- **Active step** - Highlighted (blue/gold background)
- **Completed steps** - Green background
- **Future steps** - Gray background
- **No interaction** - Just a progress indicator

---

## 2. Must Users Use Back/Next Buttons?

### **YES - Navigation is ONLY via Back/Next buttons**

#### Navigation Implementation

**TN Wizard Navigation:**

```javascript
// From tn_wizard.js (setupStepNavigation, lines 5461-5493)
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

const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
  nextBtn.addEventListener('click', async () => {
    if (validateCurrentStep()) {
      saveCurrentStepData();
      if (currentStep < totalSteps) {
        await loadStep(currentStep + 1);
      }
    }
  });
}
```

**WU/SC Wizard Navigation:**

```javascript
// From wu_sc_wizard.js (setupStepNavigation, lines 1661-1693)
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      loadStep(currentStep - 1);
    }
  });
}

const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        loadStep(currentStep + 1);
      }
    }
  });
}
```

#### Navigation Flow

**Forward Navigation (Next):**
1. User clicks "Next" button
2. `validateCurrentStep()` is called
3. If valid: `saveCurrentStepData()` saves to sessionStorage
4. `loadStep(currentStep + 1)` loads next step
5. Previous step is removed from DOM

**Backward Navigation (Back):**
1. User clicks "Back" button
2. `clearStepDataFromHere(targetStep)` clears data from target step onwards
3. `loadStep(currentStep - 1)` loads previous step
4. Data is restored from sessionStorage when step initializes

#### Deep Linking (URL Parameter)

**TN Wizard supports URL step parameter, but it's limited:**

```javascript
// From tn_wizard.js (initDeepLinking, lines 394-415)
function initDeepLinking() {
  // Handle URL step parameter
  const urlParams = new URLSearchParams(window.location.search);
  const stepParam = urlParams.get('step');
  if (stepParam) {
    const step = parseInt(stepParam, 10);
    if (step >= 0 && step <= totalSteps) {
      currentStep = step;  // Sets variable, but doesn't load step
    }
  }
  
  // Update URL when step changes
  function updateURL(step) {
    const url = new URL(window.location);
    url.searchParams.set('step', step);
    window.history.replaceState({}, '', url);
  }
  
  window.updateTNStepURL = updateURL;
}
```

**Important:** The URL parameter sets `currentStep` variable, but the wizard always starts at step 0:

```javascript
// From tn_wizard.js (initTNWizard, line 164)
loadStep(0);  // Always loads step 0 first
```

**Note:** Deep linking is set up AFTER `loadStep(0)`, so URL parameter is read but step 0 is still loaded first.

---

## 3. What Happens if User Refreshes the Page Mid-Form?

### **Data is Preserved in sessionStorage, but User Returns to Step 0**

#### Current Step Tracking

**Step number is saved to sessionStorage:**

```javascript
// From tn_wizard.js (loadStep, line 496)
sessionStorage.setItem('tn_current_step', step.toString());

// From wu_sc_wizard.js (loadStep, line 387)
sessionStorage.setItem(`${eventType}_current_step`, step.toString());
```

#### Page Refresh Behavior

**On page refresh:**

1. **Wizard reinitializes** - `initTNWizard()` or `initWUSCWizard()` is called
2. **Always starts at Step 0** - `loadStep(0)` is called
3. **Form data preserved** - All form data remains in sessionStorage
4. **Step number NOT restored** - User must navigate back to their previous step manually

**Code Evidence:**

```javascript
// From tn_wizard.js (initTNWizard, lines 140-164)
export function initTNWizard() {
  // ... initialization ...
  
  // Load step 0 (Race Info) first
  loadStep(0);  // ← Always starts at step 0, ignores sessionStorage
  
  // Set up deep linking (reads URL parameter, but step 0 already loaded)
  initDeepLinking();
}
```

**Note:** Even though `tn_current_step` is saved in sessionStorage, it's **not read on initialization**.

#### Data Preservation

**All form data is preserved in sessionStorage:**

**TN Form Data:**
- `tn_team_count`
- `tn_team_name_en_{i}`, `tn_team_name_tc_{i}`
- `tn_team_category_{i}`, `tn_team_option_{i}`
- `tn_org_name`, `tn_mailing_address`
- `tn_manager1_name`, `tn_manager1_phone`, `tn_manager1_email`
- `tn_manager2_name`, `tn_manager2_phone`, `tn_manager2_email`
- `tn_manager3_name`, `tn_manager3_phone`, `tn_manager3_email`
- `tn_race_day` (JSON)
- `tn_practice_all_teams` (JSON)

**WU/SC Form Data:**
- `{eventType}_team_count`
- `{eventType}_team{i}_name_en`, `{eventType}_team{i}_name_tc`
- `{eventType}_team{i}_boatType`, `{eventType}_team{i}_division`
- `{eventType}_orgName`, `{eventType}_mailingAddress`
- `{eventType}_manager1Name`, `{eventType}_manager1Phone`, `{eventType}_manager1Email`
- `{eventType}_manager2Name`, `{eventType}_manager2Phone`, `{eventType}_manager2Email`
- `{eventType}_manager3Name`, `{eventType}_manager3Phone`, `{eventType}_manager3Email`
- `{eventType}_marqueeQty`, `{eventType}_steerWithQty`, etc.

**When navigating back to a step, data is restored:**

```javascript
// From tn_wizard.js (initStep1, line 551)
const savedTeamCount = sessionStorage.getItem('tn_team_count');
if (savedTeamCount) {
  const count = parseInt(savedTeamCount, 10);
  if (count > 0 && count <= 10) {
    teamCountSelect.value = count;
    // Trigger change handler to render team details
    handleTeamCountChange({ target: teamCountSelect });
  }
}
```

#### Summary of Refresh Behavior

| Aspect | Behavior |
|--------|----------|
| **Form Data** | ✅ Preserved in sessionStorage |
| **Current Step** | ❌ NOT restored - always returns to Step 0 |
| **User Experience** | ⚠️ User must click "Next" multiple times to return to previous step |
| **Data Loss** | ❌ No data loss, but navigation is lost |

---

## 4. Any Existing Warning Before Leaving Page?

### **NO - No beforeunload warning exists**

#### Search Results

**No beforeunload event handlers found:**

```bash
# Search results: 0 matches
grep -i "beforeunload|unload|pagehide|visibilitychange" public/js/*
# No matches found
```

#### Current Implementation

**No page leave warnings:**

- ❌ No `beforeunload` event listener
- ❌ No `unload` event listener
- ❌ No `pagehide` event listener
- ❌ No `visibilitychange` event listener
- ❌ No warning dialogs before page refresh/close

#### Submission Warning

**Only warning is during submission (visual, not beforeunload):**

```javascript
// From tn_wizard.js (showLoadingIndicator, lines 6565-6635)
function showLoadingIndicator() {
  loadingOverlay.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Submitting your application...</p>
      <p class="loading-subtext">Please do not close or refresh this page</p>
    </div>
  `;
}
```

**This is:**
- ✅ Visual warning (text message)
- ❌ NOT a browser beforeunload dialog
- ❌ User can still close/refresh (no browser-level prevention)

---

## Summary

### 1. Step Indicator Clickability
- ❌ **Step indicators are NOT clickable**
- ✅ **Visual indicator only** (`cursor: default`)
- ✅ **No click event listeners**
- ✅ **Must use Back/Next buttons**

### 2. Navigation Method
- ✅ **Only Back/Next buttons** for navigation
- ✅ **Validation required** before proceeding forward
- ✅ **Data cleared** when going back (from target step onwards)
- ⚠️ **Deep linking exists** but doesn't work as expected (always starts at step 0)

### 3. Page Refresh Behavior
- ✅ **Form data preserved** in sessionStorage
- ❌ **Step NOT restored** - always returns to Step 0
- ⚠️ **User must navigate manually** back to previous step
- ✅ **Data is restored** when navigating to steps (from sessionStorage)

### 4. Page Leave Warnings
- ❌ **No beforeunload warning**
- ❌ **No browser-level prevention**
- ✅ **Visual warning during submission** (text only, not blocking)

---

## Implications

### For Auto-Save Implementation

1. **Step restoration on refresh** - Would need to:
   - Read `tn_current_step` from sessionStorage on init
   - Load that step instead of always loading step 0
   - Restore form data when step loads

2. **Step indicator clickability** - Could add:
   - Click handlers on stepper steps
   - Allow jumping to completed steps
   - Prevent jumping to future steps

3. **Page leave warnings** - Could add:
   - `beforeunload` event listener
   - Warn if form has unsaved changes
   - Differentiate between saved and unsaved data

### Current Limitations

1. **No step restoration** - Users lose navigation progress on refresh
2. **No quick navigation** - Must click Back/Next multiple times
3. **No data loss prevention** - No warning before leaving page
4. **Deep linking incomplete** - URL parameter exists but doesn't restore step

---

## Related Files

- `public/js/tn_wizard.js` - TN wizard navigation (lines 184-415, 468-497, 5461-5493)
- `public/js/wu_sc_wizard.js` - WU/SC wizard navigation (lines 331-407, 1661-1693)
- `public/register.html` - Main HTML structure
- `public/tn_templates.html` - TN step templates
- `public/wu_sc_templates.html` - WU/SC step templates

