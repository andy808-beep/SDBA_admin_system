# Step 4 Investigation Report: Why Steps 1 & 2 Break After Visiting Step 4

## Problem Summary
- **Symptom**: After visiting Step 4, navigation to Steps 1 and 2 breaks
- **Trigger**: Single click from Step 4 (no rapid clicking needed)
- **Working**: Step 3 → 2 → 1 (backward navigation) works perfectly ✅
- **Broken**: After Step 4, Steps 2 and 1 break ❌

## Investigation Findings

### 1. Step 4 Back Button Handler

**Location**: `public/js/tn_wizard.js` lines 5938-5979

**Code**:
```javascript
backBtn.addEventListener('click', async function(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // ... debounce checks ...
  
  try {
    console.log('🔙 Step 4: Back button clicked, going to step 3');
    saveStep4Data(); // ← SAVES DATA BEFORE NAVIGATION
    await showStep(3);
  } catch (error) {
    console.error('❌ Step 4: Navigation error:', error);
    throw error;
  }
});
```

**Analysis**: 
- Calls `saveStep4Data()` before navigation
- This is correct behavior - saves practice data
- Does NOT modify `currentStep` directly
- Does NOT clear team count or Step 1/2 data

### 2. saveStep4Data() Function

**Location**: `public/js/tn_wizard.js` lines 7925-7936

**Code**:
```javascript
function saveStep4Data() {
  // Save current team's data before collecting all
  saveCurrentTeamPracticeData(); // ← Saves current team
  
  // Collect all team practice data
  const allTeamPracticeData = collectAllTeamPracticeData();
  
  // Save aggregated data for submission
  sessionStorage.setItem('tn_practice_all_teams', JSON.stringify(allTeamPracticeData));
}
```

**Analysis**:
- Reads `tn_team_count` from sessionStorage (line 7943)
- Does NOT modify `tn_team_count`
- Only writes `tn_practice_all_teams` key
- Does NOT touch Step 1/2 data keys (`tn_team_name_en_*`, `tn_team_category_*`, etc.)

### 3. saveCurrentTeamPracticeData() Function

**Location**: `public/js/tn_wizard.js` lines 6141-6162

**Code**:
```javascript
function saveCurrentTeamPracticeData() {
  const currentTeamKey = getCurrentTeamKey(); // ← Gets from 'tn.practice.current_team'
  const rows = [];
  // ... collects calendar data ...
  writeTeamRows(currentTeamKey, rows); // ← Writes to 'tn_practice_team_t1', etc.
}
```

**Analysis**:
- Uses `getCurrentTeamKey()` which reads `tn.practice.current_team` from sessionStorage
- Writes to `tn_practice_team_t1`, `tn_practice_team_t2`, etc.
- Does NOT modify `tn_team_count` or Step 1/2 data

### 4. Practice Store Functions

**Location**: `public/js/tn_practice_store.js`

**Keys Used**:
- `tn.practice.current_team` - Current team key (e.g., 't1', 't2')
- `tn_practice_team_t1`, `tn_practice_team_t2`, etc. - Practice data per team
- `tn_slot_ranks_t1`, `tn_slot_ranks_t2`, etc. - Slot preference ranks

**Analysis**:
- Practice store keys are **separate** from Step 1/2 data keys
- No key collision: `tn_practice_team_t1` ≠ `tn_team_name_en_1`
- Does NOT interfere with `tn_team_count` or team data

### 5. initStep4() Function

**Location**: `public/js/tn_wizard.js` lines 3414-3500

**Key Operations**:
1. Initializes practice configuration
2. Sets up calendar container
3. Calls `initTeamSelector()` (line 3479)
4. Calls `restorePracticeData()` after 200ms delay (line 3496-3498)

**Potential Issue**: `restorePracticeData()` triggers team selector change event

### 6. restorePracticeData() Function

**Location**: `public/js/tn_wizard.js` lines 3505-3543

**Code**:
```javascript
function restorePracticeData() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  // ...
  const teamSelect = document.getElementById('teamSelect');
  // ...
  teamSelect.value = teamIndex.toString();
  // Trigger team change to load practice data
  const changeEvent = new Event('change', { bubbles: true });
  teamSelect.dispatchEvent(changeEvent); // ← TRIGGERS CHANGE EVENT
}
```

**Analysis**:
- Reads `tn_team_count` (does NOT modify)
- Triggers `change` event on team selector
- This could trigger handlers that affect state

### 7. initTeamSelector() Function

**Location**: `public/js/tn_wizard.js` lines 5039-5090

**Key Operations**:
1. Populates team selector with team names from sessionStorage
2. Sets default to Team 1: `teamSelect.value = '0'` (line 5064)
3. Sets current team key: `setCurrentTeamKey('t1')` (line 5068)
4. Adds change handler (lines 5072-5090)

**Change Handler**:
```javascript
teamSelect.addEventListener('change', () => {
  const selectedIndex = parseInt(teamSelect.value, 10);
  const teamKey = `t${selectedIndex + 1}`;
  setCurrentTeamKey(teamKey); // ← Sets 'tn.practice.current_team'
  updateCalendarForTeam(selectedIndex);
  updateSlotPreferencesForTeam(selectedIndex);
  updatePracticeSummary();
});
```

**Analysis**:
- Only modifies practice-related state
- Does NOT touch `tn_team_count` or Step 1/2 data
- Sets `tn.practice.current_team` key

### 8. State Pollution Check

**Searched for**:
- `currentStep =` assignments: Only in `showStep()` and `loadStep()` - correct
- `tn_team_count` modifications: Only in Step 1 handlers - correct
- `removeItem('tn_team_*')`: Only in `clearStepDataFromHere()` which is DISABLED (line 516)

**Result**: No direct state pollution found

## Hypothesis: Timing/Async Issue

### Possible Root Cause

**Theory**: Step 4's initialization or restoration might be interfering with Step 1/2 restoration timing.

**Evidence**:
1. `restorePracticeData()` runs 200ms after Step 4 init (line 3496-3498)
2. Step 1 restoration waits for fields to exist (recently fixed)
3. If Step 4's async operations are still running when navigating back, they might interfere

**Potential Issues**:
1. **Event Listener Pollution**: Step 4 might attach listeners that persist after navigation
2. **Async Operation Interference**: Step 4's calendar/slot initialization might conflict with Step 1/2 field generation
3. **DOM Element Conflicts**: Step 4 might create/modify DOM elements that Step 1/2 expect to be in a certain state

### Next Steps to Investigate

1. **Check for Event Listener Leaks**:
   - Does Step 4 attach listeners that aren't removed?
   - Do these listeners fire when navigating to Step 1/2?

2. **Check for DOM State Conflicts**:
   - Does Step 4 modify `wizardMount` in a way that breaks Step 1/2?
   - Are there leftover DOM elements from Step 4?

3. **Check for Async Race Conditions**:
   - Does Step 4's `restorePracticeData()` async operation complete before navigation?
   - Could it be modifying sessionStorage while Step 1/2 are reading it?

4. **Check Console Logs**:
   - What errors appear when navigating Step 4 → 3 → 2 → 1?
   - Are there any "field not found" or "team count missing" messages?

## Recommended Debugging Steps

1. Add logging to `saveStep4Data()` to verify it's not modifying team count
2. Add logging to `restorePracticeData()` to see if it's still running when navigating back
3. Check if `teamSelect` element persists in DOM after leaving Step 4
4. Verify that Step 4's event listeners are properly cleaned up
5. Check if `tn.practice.current_team` key is interfering with Step 1/2 restoration

## Code Locations Summary

- **Step 4 Back Button**: Lines 5938-5979
- **saveStep4Data()**: Lines 7925-7936
- **saveCurrentTeamPracticeData()**: Lines 6141-6162
- **initStep4()**: Lines 3414-3500
- **restorePracticeData()**: Lines 3505-3543
- **initTeamSelector()**: Lines 5039-5090
- **Practice Store**: `public/js/tn_practice_store.js`

