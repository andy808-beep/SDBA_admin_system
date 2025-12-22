# TN Wizard Step 1 Validation - Migration Plan to Unified Error System

## Overview

This document provides a detailed migration plan for converting `validateStep1()` in `tn_wizard.js` from the current error display system to the unified ErrorSystem class.

**Current Function:** `validateStep1()` (lines 5407-5511)  
**Target:** Migrate to use `errorSystem.showFormErrors()` and `errorSystem.showFieldError()`

---

## 1. Fields Being Validated

### 1.1 Team Count Selection
- **Field ID:** `teamCount`
- **Element Type:** `<select>` or `<input type="number">`
- **Validation:** Must have a value and be >= 1
- **Current Error:** "Please select number of teams"
- **i18n Key Needed:** `pleaseSelectNumberOfTeams` (already exists)

### 1.2 Per-Team Fields (Loop: i = 1 to teamCount)

For each team, the following fields are validated:

#### Team Name (English)
- **Field ID:** `teamNameEn${i}` (e.g., `teamNameEn1`, `teamNameEn2`)
- **Element Type:** `<input type="text">`
- **Validation:** Must not be empty (trimmed)
- **Current Error:** `Team ${i} name (English)`
- **i18n Key Needed:** `teamNameRequired` (already exists) or `pleaseEnterTeamName` (already exists with {num} param)

#### Team Name (Chinese)
- **Field ID:** `teamNameTc${i}` (e.g., `teamNameTc1`, `teamNameTc2`)
- **Element Type:** `<input type="text">`
- **Validation:** Optional (not validated in current code)
- **Current Error:** None
- **i18n Key Needed:** None (optional field)

#### Race Category
- **Field ID:** `teamCategory${i}` (e.g., `teamCategory1`, `teamCategory2`)
- **Element Type:** `<select>`
- **Validation:** Must have a selected value
- **Current Error:** `Team ${i} race category`
- **i18n Key Needed:** `categoryRequired` (already exists) or `pleaseSelectCategory` (already exists with {num} param)

#### Entry Option
- **Field ID:** `teamOption${i}` (radio button group)
- **Element Type:** Radio buttons with `name="teamOption${i}"`
- **Container ID:** `teamOptionGroup${i}`
- **Validation:** Must have at least one checked radio button
- **Current Error:** `Team ${i} entry option`
- **i18n Key Needed:** `entryOptionRequired` (already exists) or `pleaseSelectEntryOption` (already exists with {num} param)

### 1.3 Duplicate Team Name Check

- **Validation Logic:** Check for duplicate team names within the same category
- **Scope:** All teams with valid names and categories
- **Current Error:** `Team ${team.index} name (duplicate in ${category})`
- **i18n Key Needed:** `duplicateTeamName` (already exists) - but needs category context

---

## 2. Current Error Display Methods

### 2.1 Form-Level Error Display

**Method:** `showError(message)`
- **Location:** Line 5411, 5506
- **Element:** `#formMsg`
- **Usage:**
  - Line 5411: Single error for missing team count
  - Line 5506: Combined error message for multiple missing fields

**Current Implementation:**
```javascript
// Single error
showError('Please select number of teams');

// Multiple errors - concatenated
const message = missingFields.length === 1 
  ? `Please complete: ${missingFields[0]}`
  : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
showError(message);
```

**Message Format:**
- Single error: "Please complete: Team 1 name (English)"
- Multiple errors: "Please complete: Team 1 name (English), Team 2 race category and Team 3 entry option"

### 2.2 Field Highlighting

**Method:** `highlightField(field)`
- **Location:** Lines 5433, 5438, 5453, 5496
- **Function:** Adds `field-error` class to field element
- **Also:** Calls `field.focus()` on the field

**Current Implementation:**
```javascript
function highlightField(field) {
  if (field) {
    field.classList.add('field-error');
    field.focus();
  }
}
```

**Usage:**
- Line 5433: `highlightField(teamNameEn)` - Missing team name
- Line 5438: `highlightField(teamCategory)` - Missing category
- Line 5453: `highlightField(teamOptionGroup)` - Missing entry option
- Line 5496: `highlightField(team.nameElement)` - Duplicate team name

### 2.3 Error Clearing

**Method:** `clearFieldHighlighting()`
- **Location:** Line 5417 (start of validation)
- **Function:** Removes `field-error` class from all fields

**Current Implementation:**
```javascript
function clearFieldHighlighting() {
  const highlightedFields = document.querySelectorAll('#tnScope .field-error');
  highlightedFields.forEach(field => {
    field.classList.remove('field-error');
  });
  
  // Also clear duplicate warning
  const msgEl = document.getElementById('formMsg');
  if (msgEl && msgEl.textContent.includes('Duplicate team names')) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
  }
}
```

---

## 3. Error Message Patterns

### 3.1 Error Messages Currently Used

| Error Type | Current Message | i18n Key Available | Notes |
|------------|----------------|-------------------|-------|
| Missing team count | "Please select number of teams" | `pleaseSelectNumberOfTeams` | ✅ Exists |
| Missing team name (English) | "Team {i} name (English)" | `pleaseEnterTeamName` with `{num: i}` | ✅ Exists |
| Missing race category | "Team {i} race category" | `pleaseSelectCategory` with `{num: i}` | ✅ Exists |
| Missing entry option | "Team {i} entry option" | `pleaseSelectEntryOption` with `{num: i}` | ✅ Exists |
| Duplicate team name | "Team {i} name (duplicate in {category})" | `duplicateTeamName` | ✅ Exists, but needs category param |

### 3.2 Message Concatenation Pattern

**Current Pattern:**
```javascript
// Build array of error descriptions
missingFields.push(`Team ${i} name (English)`);
missingFields.push(`Team ${i} race category`);

// Concatenate into single message
const message = missingFields.length === 1 
  ? `Please complete: ${missingFields[0]}`
  : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
```

**Examples:**
- 1 error: "Please complete: Team 1 name (English)"
- 2 errors: "Please complete: Team 1 name (English) and Team 2 race category"
- 3+ errors: "Please complete: Team 1 name (English), Team 2 race category and Team 3 entry option"

### 3.3 Field Reference Pattern

**Current Pattern:**
- Fields are referenced by element objects
- Error messages are text descriptions
- No direct link between error message and field ID

**New Pattern (ErrorSystem):**
- Fields referenced by ID string
- Error messages use i18n keys
- Direct link between error and field for scrolling/focusing

---

## 4. Migration Plan

### 4.1 Replace `showError()` Calls

#### 4.1.1 Team Count Validation (Line 5411)

**Current Code:**
```javascript
if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
  showError('Please select number of teams');
  teamCount?.focus();
  return false;
}
```

**New Code:**
```javascript
if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
  errorSystem.showFormErrors([
    { field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' }
  ], {
    containerId: 'categoryForm', // or appropriate container
    scrollTo: true
  });
  return false;
}
```

**Changes:**
- Replace `showError()` with `errorSystem.showFormErrors()`
- Use i18n key `pleaseSelectNumberOfTeams`
- Remove manual `focus()` call (handled by ErrorSystem)
- Single error will scroll to field automatically

#### 4.1.2 Multiple Field Errors (Line 5506)

**Current Code:**
```javascript
if (missingFields.length > 0) {
  const message = missingFields.length === 1 
    ? `Please complete: ${missingFields[0]}`
    : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
  showError(message);
  return false;
}
```

**New Code:**
```javascript
if (errors.length > 0) {
  errorSystem.showFormErrors(errors, {
    containerId: 'categoryForm', // or appropriate container
    scrollTo: true,
    titleKey: 'formErrorsTitle'
  });
  return false;
}
```

**Changes:**
- Build `errors` array instead of `missingFields` array
- Each error object: `{ field: fieldId, messageKey: i18nKey, params: {...} }`
- ErrorSystem handles message formatting and display
- Form error summary automatically created for 2+ errors

### 4.2 Replace `highlightField()` Calls

#### 4.2.1 Missing Team Name (Line 5433)

**Current Code:**
```javascript
if (!teamNameEn?.value?.trim()) {
  missingFields.push(`Team ${i} name (English)`);
  highlightField(teamNameEn);
}
```

**New Code:**
```javascript
if (!teamNameEn?.value?.trim()) {
  errors.push({
    field: `teamNameEn${i}`,
    messageKey: 'pleaseEnterTeamName',
    params: { num: i }
  });
}
```

**Changes:**
- Replace `highlightField()` call with error object in array
- Use field ID string instead of element object
- Use i18n key with parameters
- Field highlighting handled by `errorSystem.showFieldError()`

#### 4.2.2 Missing Race Category (Line 5438)

**Current Code:**
```javascript
if (!teamCategory?.value) {
  missingFields.push(`Team ${i} race category`);
  highlightField(teamCategory);
}
```

**New Code:**
```javascript
if (!teamCategory?.value) {
  errors.push({
    field: `teamCategory${i}`,
    messageKey: 'pleaseSelectCategory',
    params: { num: i }
  });
}
```

**Changes:**
- Same pattern as team name
- Use `pleaseSelectCategory` i18n key

#### 4.2.3 Missing Entry Option (Line 5453)

**Current Code:**
```javascript
if (teamOptionRadios.length === 0) {
  missingFields.push(`Team ${i} entry option`);
  const teamOptionGroup = document.getElementById(`teamOptionGroup${i}`);
  if (teamOptionGroup) {
    highlightField(teamOptionGroup);
  }
}
```

**New Code:**
```javascript
if (teamOptionRadios.length === 0) {
  errors.push({
    field: `teamOptionGroup${i}`, // Use container ID for radio groups
    messageKey: 'pleaseSelectEntryOption',
    params: { num: i }
  });
}
```

**Changes:**
- Use container ID (`teamOptionGroup${i}`) instead of individual radio buttons
- ErrorSystem will highlight the container div
- Use `pleaseSelectEntryOption` i18n key

#### 4.2.4 Duplicate Team Names (Line 5496)

**Current Code:**
```javascript
nameCounts[name].forEach(team => {
  missingFields.push(`Team ${team.index} name (duplicate in ${category})`);
  highlightField(team.nameElement);
});
```

**New Code:**
```javascript
nameCounts[name].forEach(team => {
  errors.push({
    field: `teamNameEn${team.index}`,
    messageKey: 'duplicateTeamName',
    params: { 
      num: team.index,
      category: category // Need to get category display name
    }
  });
}
```

**Changes:**
- Use field ID instead of element object
- Use `duplicateTeamName` i18n key
- Pass category as parameter (may need to get category display name)
- **Note:** May need to add category parameter support to `duplicateTeamName` translation

### 4.3 Replace `clearFieldHighlighting()` Call

**Current Code:**
```javascript
// Clear any previous field highlighting
clearFieldHighlighting();
```

**New Code:**
```javascript
// Clear any previous errors
errorSystem.clearFormErrors();
```

**Changes:**
- Replace `clearFieldHighlighting()` with `errorSystem.clearFormErrors()`
- This clears both field errors and form error summary

---

## 5. Before/After Code Comparison

### 5.1 Complete Function - Before (Current)

```javascript
function validateStep1() {
  const teamCount = document.getElementById('teamCount');
  
  if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
    showError('Please select number of teams');
    teamCount?.focus();
    return false;
  }
  
  // Clear any previous field highlighting
  clearFieldHighlighting();
  
  // Validate team fields if they exist
  const teamCountValue = parseInt(teamCount.value, 10);
  const missingFields = [];
  const teamData = [];
  
  // First pass: collect all team data and check for missing fields
  for (let i = 1; i <= teamCountValue; i++) {
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    const teamNameTc = document.getElementById(`teamNameTc${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);
    const teamOption = document.getElementById(`teamOption${i}`);
    
    if (!teamNameEn?.value?.trim()) {
      missingFields.push(`Team ${i} name (English)`);
      highlightField(teamNameEn);
    }
    
    if (!teamCategory?.value) {
      missingFields.push(`Team ${i} race category`);
      highlightField(teamCategory);
    }
    
    // Check for selected radio button in the team option group
    const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
    
    if (teamOptionRadios.length === 0) {
      missingFields.push(`Team ${i} entry option`);
      const teamOptionGroup = document.getElementById(`teamOptionGroup${i}`);
      if (teamOptionGroup) {
        highlightField(teamOptionGroup);
      }
    }
    
    // Collect team data for duplicate checking
    if (teamNameEn?.value?.trim() && teamCategory?.value) {
      teamData.push({
        index: i,
        name: teamNameEn.value.trim(),
        category: teamCategory.value,
        nameElement: teamNameEn,
        categoryElement: teamCategory
      });
    }
  }
  
  // Second pass: check for duplicate team names within same category
  const categoryGroups = {};
  teamData.forEach(team => {
    if (!categoryGroups[team.category]) {
      categoryGroups[team.category] = [];
    }
    categoryGroups[team.category].push(team);
  });
  
  // Check for duplicates within each category
  Object.keys(categoryGroups).forEach(category => {
    const teamsInCategory = categoryGroups[category];
    const nameCounts = {};
    
    teamsInCategory.forEach(team => {
      const name = team.name.toLowerCase();
      if (!nameCounts[name]) {
        nameCounts[name] = [];
      }
      nameCounts[name].push(team);
    });
    
    // Find duplicates
    Object.keys(nameCounts).forEach(name => {
      if (nameCounts[name].length > 1) {
        nameCounts[name].forEach(team => {
          missingFields.push(`Team ${team.index} name (duplicate in ${category})`);
          highlightField(team.nameElement);
        });
      }
    });
  });
  
  if (missingFields.length > 0) {
    const message = missingFields.length === 1 
      ? `Please complete: ${missingFields[0]}`
      : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
    showError(message);
    return false;
  }
  
  return true;
}
```

### 5.2 Complete Function - After (Migrated)

```javascript
function validateStep1() {
  const teamCount = document.getElementById('teamCount');
  
  // Clear any previous errors
  errorSystem.clearFormErrors();
  
  if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
    errorSystem.showFormErrors([
      { field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' }
    ], {
      containerId: 'categoryForm',
      scrollTo: true
    });
    return false;
  }
  
  // Validate team fields if they exist
  const teamCountValue = parseInt(teamCount.value, 10);
  const errors = [];
  const teamData = [];
  
  // First pass: collect all team data and check for missing fields
  for (let i = 1; i <= teamCountValue; i++) {
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    const teamNameTc = document.getElementById(`teamNameTc${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);
    
    if (!teamNameEn?.value?.trim()) {
      errors.push({
        field: `teamNameEn${i}`,
        messageKey: 'pleaseEnterTeamName',
        params: { num: i }
      });
    }
    
    if (!teamCategory?.value) {
      errors.push({
        field: `teamCategory${i}`,
        messageKey: 'pleaseSelectCategory',
        params: { num: i }
      });
    }
    
    // Check for selected radio button in the team option group
    const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
    
    if (teamOptionRadios.length === 0) {
      errors.push({
        field: `teamOptionGroup${i}`,
        messageKey: 'pleaseSelectEntryOption',
        params: { num: i }
      });
    }
    
    // Collect team data for duplicate checking
    if (teamNameEn?.value?.trim() && teamCategory?.value) {
      teamData.push({
        index: i,
        name: teamNameEn.value.trim(),
        category: teamCategory.value,
        categoryDisplayName: teamCategory.options[teamCategory.selectedIndex]?.text || teamCategory.value
      });
    }
  }
  
  // Second pass: check for duplicate team names within same category
  const categoryGroups = {};
  teamData.forEach(team => {
    if (!categoryGroups[team.category]) {
      categoryGroups[team.category] = [];
    }
    categoryGroups[team.category].push(team);
  });
  
  // Check for duplicates within each category
  Object.keys(categoryGroups).forEach(category => {
    const teamsInCategory = categoryGroups[category];
    const nameCounts = {};
    
    teamsInCategory.forEach(team => {
      const name = team.name.toLowerCase();
      if (!nameCounts[name]) {
        nameCounts[name] = [];
      }
      nameCounts[name].push(team);
    });
    
    // Find duplicates
    Object.keys(nameCounts).forEach(name => {
      if (nameCounts[name].length > 1) {
        const categoryDisplayName = teamsInCategory[0].categoryDisplayName;
        nameCounts[name].forEach(team => {
          errors.push({
            field: `teamNameEn${team.index}`,
            messageKey: 'duplicateTeamName',
            params: { 
              num: team.index,
              category: categoryDisplayName
            }
          });
        });
      }
    });
  });
  
  if (errors.length > 0) {
    errorSystem.showFormErrors(errors, {
      containerId: 'categoryForm',
      scrollTo: true,
      titleKey: 'formErrorsTitle'
    });
    return false;
  }
  
  return true;
}
```

### 5.3 Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Error Storage** | `missingFields` array (strings) | `errors` array (objects with field, messageKey, params) |
| **Error Display** | `showError(message)` - single concatenated message | `errorSystem.showFormErrors(errors)` - individual field errors + summary |
| **Field Highlighting** | `highlightField(field)` - manual class addition | Automatic via `errorSystem.showFieldError()` |
| **Error Clearing** | `clearFieldHighlighting()` - manual class removal | `errorSystem.clearFormErrors()` - clears all |
| **i18n Support** | Hardcoded English messages | i18n keys with parameters |
| **Error Summary** | Single concatenated message | Form error summary with clickable links (2+ errors) |
| **Focus Management** | Manual `field.focus()` calls | Automatic via ErrorSystem options |
| **Scroll Behavior** | Manual scrolling in `showError()` | Automatic scrolling via ErrorSystem |

---

## 6. Required i18n Keys

### 6.1 Keys Already Available

✅ **Already in translations.js:**
- `pleaseSelectNumberOfTeams` - "Please select number of teams" / "請選擇隊伍數量"
- `pleaseEnterTeamName` - "Please enter team name for Team {num}" / "請輸入第 {num} 隊的隊名"
- `pleaseSelectCategory` - "Please select category for Team {num}" / "請選擇第 {num} 隊的組別"
- `pleaseSelectEntryOption` - "Please select entry option for Team {num}" / "請選擇第 {num} 隊的報名選項"
- `duplicateTeamName` - "Team name must be unique" / "隊伍名稱必須唯一"
- `formErrorsTitle` - "Please correct the following errors:" / "請更正以下錯誤："

### 6.2 Keys That May Need Enhancement

⚠️ **May need category parameter:**
- `duplicateTeamName` - Currently doesn't support category parameter
  - **Current:** "Team name must be unique"
  - **Enhanced:** "Team name must be unique in {category}" / "隊伍名稱在 {category} 中必須唯一"

**Recommendation:** Update translation to:
```javascript
duplicateTeamName: "Team {num} name must be unique in {category}" / "第 {num} 隊的隊名在 {category} 中必須唯一"
```

---

## 7. Error Array Structure

### 7.1 Error Object Format

Each error in the `errors` array should follow this structure:

```javascript
{
  field: string,        // Field ID (e.g., 'teamNameEn1', 'teamCategory2')
  messageKey: string,  // i18n translation key
  params: object       // Optional parameters for translation (e.g., { num: 1, category: 'Men Open' })
}
```

### 7.2 Example Error Arrays

#### Single Error (Team Count)
```javascript
const errors = [
  { field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' }
];
```

#### Multiple Errors (Missing Fields)
```javascript
const errors = [
  { field: 'teamNameEn1', messageKey: 'pleaseEnterTeamName', params: { num: 1 } },
  { field: 'teamCategory2', messageKey: 'pleaseSelectCategory', params: { num: 2 } },
  { field: 'teamOptionGroup3', messageKey: 'pleaseSelectEntryOption', params: { num: 3 } }
];
```

#### Duplicate Errors
```javascript
const errors = [
  { 
    field: 'teamNameEn1', 
    messageKey: 'duplicateTeamName', 
    params: { num: 1, category: 'Men Open' } 
  },
  { 
    field: 'teamNameEn2', 
    messageKey: 'duplicateTeamName', 
    params: { num: 2, category: 'Men Open' } 
  }
];
```

---

## 8. Container ID for Form Error Summary

### 8.1 Finding the Container

The form error summary needs to be inserted at the top of the form container. Options:

1. **Form Element:** `document.getElementById('categoryForm')`
2. **Card Container:** `document.querySelector('#tnScope .card')`
3. **Step Container:** `document.getElementById('wizardMount')` or similar

**Recommendation:** Use the form element ID if available, otherwise use the card container.

### 8.2 Current HTML Structure

From `tn_templates.html`:
```html
<template id="tn-step-1">
  <div class="card">
    <form id="categoryForm">
      <h2>Select Race Category</h2>
      <!-- Form fields -->
      <p class="msg" id="formMsg"></p>
      <!-- Navigation buttons -->
    </form>
  </div>
</template>
```

**Best Container:** `categoryForm` (the `<form>` element)

---

## 9. Migration Steps

### Step 1: Import ErrorSystem
```javascript
// At top of tn_wizard.js
import errorSystem from './error-system.js';
// Or if loaded globally:
// const errorSystem = window.errorSystem;
```

### Step 2: Replace clearFieldHighlighting()
- Find: `clearFieldHighlighting();`
- Replace: `errorSystem.clearFormErrors();`

### Step 3: Replace showError() for Team Count
- Convert single error to error array format
- Use `errorSystem.showFormErrors()`

### Step 4: Convert missingFields Array to errors Array
- Change from string array to object array
- Each object: `{ field, messageKey, params }`

### Step 5: Replace highlightField() Calls
- Remove all `highlightField()` calls
- Add error objects to `errors` array instead

### Step 6: Replace Final showError() Call
- Use `errorSystem.showFormErrors(errors, options)`

### Step 7: Update Duplicate Error Handling
- Use field ID instead of element object
- Add category parameter to translation

### Step 8: Test
- Test with 0 teams (should show error)
- Test with 1 team missing fields
- Test with multiple teams missing fields
- Test with duplicate team names
- Test error clearing when user fixes fields

---

## 10. Edge Cases and Considerations

### 10.1 Radio Button Groups

**Issue:** Entry options use radio buttons, not a single field

**Solution:** Use container ID (`teamOptionGroup${i}`) as the field ID. ErrorSystem will highlight the container div.

### 10.2 Category Display Name

**Issue:** Duplicate error needs category display name, but we only have category value

**Solution:** Get display name from select option:
```javascript
categoryDisplayName: teamCategory.options[teamCategory.selectedIndex]?.text || teamCategory.value
```

### 10.3 Field Focus Behavior

**Current:** `highlightField()` calls `field.focus()`

**New:** ErrorSystem handles focus automatically when `focus: true` option is set. For single errors, focus is automatic. For multiple errors, user clicks link in summary.

### 10.4 Error Clearing on Input

**Current:** `setupErrorClearing()` clears errors when user types

**New:** Can use `errorSystem.bindFieldValidation()` for automatic clearing, or manually call `errorSystem.clearFieldError(fieldId)` in input handlers.

### 10.5 Team Count Change

**Current:** Errors cleared when team count changes

**New:** Call `errorSystem.clearFormErrors()` in team count change handler.

---

## 11. Testing Checklist

After migration, test the following scenarios:

- [ ] **No team count selected** - Shows error on teamCount field
- [ ] **Team count = 0** - Shows error on teamCount field
- [ ] **Single team, missing name** - Shows field error + form error summary
- [ ] **Single team, missing category** - Shows field error
- [ ] **Single team, missing entry option** - Shows field error on container
- [ ] **Multiple teams, various missing fields** - Shows form error summary with all errors
- [ ] **Duplicate team names in same category** - Shows errors on both duplicate fields
- [ ] **Duplicate team names in different categories** - No error (allowed)
- [ ] **Fix one error** - Error clears, others remain
- [ ] **Fix all errors** - All errors clear, form proceeds
- [ ] **Change team count** - All errors clear
- [ ] **Error summary links** - Clicking link scrolls to and focuses field
- [ ] **Error summary close button** - Dismisses summary (but keeps field errors)
- [ ] **Language switching** - Error messages update to new language
- [ ] **Mobile view** - Error summary displays correctly on small screens

---

## 12. Benefits of Migration

### 12.1 User Experience
- ✅ **Better error visibility** - Form error summary shows all errors at once
- ✅ **Clickable links** - Users can jump directly to problematic fields
- ✅ **Consistent styling** - Unified error appearance across all forms
- ✅ **Accessibility** - ARIA attributes for screen readers
- ✅ **i18n support** - Automatic language switching

### 12.2 Developer Experience
- ✅ **Centralized error handling** - One system for all errors
- ✅ **Less code duplication** - No need to manually manage error display
- ✅ **Type safety** - Structured error objects instead of strings
- ✅ **Easier maintenance** - Changes to error system affect all forms
- ✅ **Better testing** - Can test error system independently

### 12.3 Code Quality
- ✅ **Separation of concerns** - Validation logic separate from display
- ✅ **Reusability** - Error system can be used across all forms
- ✅ **Consistency** - Same error patterns everywhere
- ✅ **Maintainability** - Easier to update error messages

---

## 13. Potential Issues and Solutions

### Issue 1: Radio Button Group Highlighting

**Problem:** Radio buttons don't have a single field ID

**Solution:** Use container div ID (`teamOptionGroup${i}`). ErrorSystem CSS will highlight the container.

### Issue 2: Category Display Name for Duplicates

**Problem:** Need human-readable category name, not just value

**Solution:** Store `categoryDisplayName` in teamData object, get from select option text.

### Issue 3: Error Clearing Timing

**Problem:** When should errors clear? On input? On blur? On field change?

**Solution:** 
- Use `errorSystem.bindFieldValidation()` for automatic clearing on input
- Or manually call `errorSystem.clearFieldError()` in existing input handlers

### Issue 4: Form Container ID

**Problem:** Need to find correct container for error summary

**Solution:** Use `categoryForm` (form element ID) or fallback to `.card` container.

---

## 14. Migration Timeline Estimate

- **Analysis:** ✅ Complete (this document)
- **Code Migration:** ~2-3 hours
- **Testing:** ~2-3 hours
- **Bug Fixes:** ~1-2 hours
- **Total:** ~5-8 hours

---

## 15. Next Steps

1. ✅ **Analysis Complete** - This migration plan
2. ⏳ **Review Plan** - Get approval for migration approach
3. ⏳ **Update i18n** - Enhance `duplicateTeamName` key if needed
4. ⏳ **Implement Migration** - Update `validateStep1()` function
5. ⏳ **Test Thoroughly** - Run through all test scenarios
6. ⏳ **Update Other Steps** - Migrate Step 2, 3, 4 validation functions
7. ⏳ **Remove Legacy Code** - Remove `showError()`, `highlightField()`, `clearFieldHighlighting()` if no longer used

---

## Appendix: Code Snippets for Reference

### A.1 Error Array Building Pattern

```javascript
// Instead of:
missingFields.push(`Team ${i} name (English)`);

// Use:
errors.push({
  field: `teamNameEn${i}`,
  messageKey: 'pleaseEnterTeamName',
  params: { num: i }
});
```

### A.2 Form Error Summary Options

```javascript
errorSystem.showFormErrors(errors, {
  containerId: 'categoryForm',  // Where to insert summary
  scrollTo: true,                // Auto-scroll to summary
  titleKey: 'formErrorsTitle'     // i18n key for summary title
});
```

### A.3 Single vs Multiple Errors

```javascript
// Single error - scrolls to field, focuses it
if (errors.length === 1) {
  errorSystem.showFormErrors(errors, {
    scrollTo: true  // Will scroll to the single field
  });
}

// Multiple errors - shows summary at top
if (errors.length >= 2) {
  errorSystem.showFormErrors(errors, {
    containerId: 'categoryForm',
    scrollTo: true,  // Will scroll to summary
    titleKey: 'formErrorsTitle'
  });
}
```
