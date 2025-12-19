# Step 1 Bug Analysis: Input Fields Disappear After Validation Error

## Problem Description

When a user clicks "Next" on step 1 without filling required fields (specifically **Team Name (English)** or **Entry Option**), validation fails and shows an error message. However, the input fields themselves disappear from the DOM - they are completely removed, not just empty. The user can no longer type in the Team Name (English) field or select an Entry Option, making it impossible to fix the errors and proceed. 

**Important Observation**: Team Name (Chinese) field does NOT have this problem, likely because it doesn't have the `required` attribute.

## Root Cause Analysis

The bug occurs because when validation fails, the code tries to highlight missing fields using `highlightField()`, but if those fields don't exist in the DOM (or become null/undefined), the highlighting fails silently. More critically, **something causes the fields to be removed from the DOM after validation fails**, leaving the user unable to interact with them.

### Critical Code Flow When Validation Fails

1. **User clicks "Next" button** (line 983-994)
   ```javascript
   nextButton.addEventListener('click', () => {
     if (validateStep1()) {
       saveStep1Data();
       loadStep(2);
     } else {
       // Validation failed - NO SAVE, stays on step 1
     }
   });
   ```

2. **validateStep1() is called** (line 5407-5511)
   ```javascript
   function validateStep1() {
     // ...
     for (let i = 1; i <= teamCountValue; i++) {
       const teamNameEn = document.getElementById(`teamNameEn${i}`);
       // ...
       
       if (!teamNameEn?.value?.trim()) {
         missingFields.push(`Team ${i} name (English)`);
         highlightField(teamNameEn);  // ⚠️ If teamNameEn is null, this does nothing
       }
       
       if (!teamCategory?.value) {
         missingFields.push(`Team ${i} race category`);
         highlightField(teamCategory);
       }
       
       // Entry options validation
       const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
       if (teamOptionRadios.length === 0) {
         missingFields.push(`Team ${i} entry option`);
         const teamOptionGroup = document.getElementById(`teamOptionGroup${i}`);
         if (teamOptionGroup) {
           highlightField(teamOptionGroup);
         }
       }
     }
     
     if (missingFields.length > 0) {
       showError(message);
       return false;  // Validation failed
     }
   }
   ```

3. **highlightField() is called** (line 1197-1202)
   ```javascript
   function highlightField(field) {
     if (field) {  // ⚠️ If field is null/undefined, nothing happens
       field.classList.add('field-error');
       field.focus();
     }
   }
   ```

### The Problem

When validation fails:
- Fields that are missing/empty get passed to `highlightField()`
- If those fields are null or don't exist in DOM, `highlightField()` silently does nothing
- **More critically: The fields disappear from the DOM entirely**

### Why Fields Disappear

Looking at the code, there are several places where fields could be cleared:

1. **generateTeamFields() clears container** (line 1221)
   ```javascript
   container.innerHTML = '';  // Clears all team fields
   ```
   If `generateTeamFields()` is called after validation fails, it would wipe out all fields.

2. **createTeamCountSelector() clears container** (line 922)
   ```javascript
   container.innerHTML = '';  // Clears wizardMount completely
   container.appendChild(teamCountSection);
   ```
   This creates a fresh structure, removing all existing fields.

3. **loadStepContent() clears wizardMount** (line 570)
   ```javascript
   wizardMount.innerHTML = '';  // Clears everything
   ```
   If step 1 is reloaded for any reason, fields are wiped.

### Why Team Name (Chinese) Doesn't Have This Problem

Team Name (Chinese) field does NOT have the `required` attribute (line 1323):
```javascript
<input type="text" id="teamNameTc${i}" name="teamNameTc${i}" 
       placeholder="..." />
```

Whereas Team Name (English) DOES have `required` (line 1317):
```javascript
<input type="text" id="teamNameEn${i}" name="teamNameEn${i}" required 
       placeholder="..." />
```

This suggests that **the `required` attribute might be triggering some browser behavior or the validation logic is specifically targeting required fields in a way that causes them to disappear**.

### Potential Causes

1. **Browser HTML5 Validation Interference**: The `required` attribute might trigger native browser validation that interferes with JavaScript validation, causing fields to be removed or hidden.

2. **Field Regeneration Issue**: If something triggers field regeneration after validation fails (e.g., `generateTeamFields()` being called), and the fields weren't properly preserved, they would be wiped and regenerated incorrectly.

3. **DOM Manipulation Race Condition**: Multiple operations trying to manipulate the DOM simultaneously (validation, error display, field highlighting) might cause fields to be removed.

4. **Event Handler Issues**: Something in the error handling or validation flow might be triggering an event that causes fields to be cleared or hidden.

## Relevant Code Sections

### Field Generation (lines 1310-1342)
```javascript
teamField.innerHTML = `
  <div class="team-inputs">
    <div class="form-group">
      <label for="teamNameEn${i}">Team Name (English)</label>
      <input type="text" id="teamNameEn${i}" name="teamNameEn${i}" required />  <!-- REQUIRED -->
    </div>
    
    <div class="form-group">
      <label for="teamNameTc${i}">Team Name (Chinese)</label>
      <input type="text" id="teamNameTc${i}" name="teamNameTc${i}" />  <!-- NOT REQUIRED -->
    </div>
    
    <div class="form-group">
      <label for="teamCategory${i}">Race Category</label>
      <select id="teamCategory${i}" name="teamCategory${i}" required>  <!-- REQUIRED -->
        <!-- options -->
      </select>
    </div>
    
    <div class="form-group" id="teamOptionGroup${i}" style="display: none;">
      <label>Entry Option</label>
      <div id="teamOptionBoxes${i}" class="package-options">
        <!-- Radio buttons with required attribute -->
      </div>
    </div>
  </div>
`;
```

### Validation Logic (lines 5424-5455)
```javascript
for (let i = 1; i <= teamCountValue; i++) {
  const teamNameEn = document.getElementById(`teamNameEn${i}`);
  const teamCategory = document.getElementById(`teamCategory${i}`);
  
  // Validate Team Name (English) - REQUIRED
  if (!teamNameEn?.value?.trim()) {
    missingFields.push(`Team ${i} name (English)`);
    highlightField(teamNameEn);  // ⚠️ If field missing from DOM, this does nothing
  }
  
  // Validate Race Category - REQUIRED
  if (!teamCategory?.value) {
    missingFields.push(`Team ${i} race category`);
    highlightField(teamCategory);
  }
  
  // Validate Entry Option - REQUIRED (radio buttons)
  const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
  if (teamOptionRadios.length === 0) {
    missingFields.push(`Team ${i} entry option`);
    const teamOptionGroup = document.getElementById(`teamOptionGroup${i}`);
    if (teamOptionGroup) {
      highlightField(teamOptionGroup);
    }
  }
}
```

### Highlight Function (lines 1197-1202)
```javascript
function highlightField(field) {
  if (field) {  // ⚠️ Silent failure if field is null
    field.classList.add('field-error');
    field.focus();  // ⚠️ If field doesn't exist, focus() might cause issues
  }
}
```

## The Actual Bug

**When validation fails for required fields (Team Name English, Race Category, Entry Option), those specific input/select elements disappear from the DOM entirely. The labels remain, but the actual interactive elements (input fields, select dropdowns, radio buttons) are removed, making it impossible for the user to fill them in.**

## Questions to Investigate

1. **Does `generateTeamFields()` get called after validation fails?** If so, why?
2. **Does `createTeamCountSelector()` get called?** This would wipe all fields.
3. **Does `loadStepContent(1)` get triggered?** This would clear the entire step.
4. **Is there any CSS or JavaScript that hides/removes invalid required fields?**
5. **Does the browser's native HTML5 validation interfere with the custom validation?**

## Solution Direction

The fix needs to:
1. **Prevent fields from being removed** after validation fails
2. **Ensure fields remain in the DOM** and are accessible for user input
3. **Handle the case where fields might be null** in validation logic more gracefully
4. **Investigate what triggers field removal** - is it intentional or a bug?

The fact that non-required fields (Team Name Chinese) don't have this problem suggests the issue is specifically related to how required fields are handled during validation failure.
