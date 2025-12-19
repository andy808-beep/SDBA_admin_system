# Step 1 "Next" Button Click Flow Trace

## Complete Flow Diagram

```
User Clicks "Next" Button (nextToStep2)
    │
    ▼
[Line 983] Event Listener: nextButton.addEventListener('click', ...)
    │
    ▼
[Line 987] Call: validateStep1()
    │
    ├─► [Line 5410] Check: teamCount?.value exists?
    │   │
    │   └─► NO → showError('Please select number of teams') → return false
    │
    ▼
[Line 5417] Call: clearFieldHighlighting()
    │
    ├─► [Line 1181] Query: document.querySelectorAll('#tnScope .field-error')
    │   ├─► Remove 'field-error' class from all elements
    │   └─► Clear duplicate warning message
    │
    ▼
[Line 5420] Calculate: teamCountValue = parseInt(teamCount.value, 10)
    │
    ▼
[Line 5425] Loop: for (let i = 1; i <= teamCountValue; i++)
    │
    ├─► [Line 5426] Get: teamNameEn = document.getElementById(`teamNameEn${i}`)
    ├─► [Line 5427] Get: teamNameTc = document.getElementById(`teamNameTc${i}`)
    ├─► [Line 5428] Get: teamCategory = document.getElementById(`teamCategory${i}`)
    ├─► [Line 5429] Get: teamOption = document.getElementById(`teamOption${i}`)
    │
    ├─► [Line 5431] Check: !teamNameEn?.value?.trim()
    │   │
    │   └─► TRUE → [Line 5433] Call: highlightField(teamNameEn)
    │       │
    │       └─► [Line 1197-1202] highlightField() function:
    │           ├─► Check: if (field) exists?
    │           ├─► Add class: field.classList.add('field-error')
    │           └─► Call: field.focus()  ⚠️ POTENTIAL ISSUE: focus() on missing field?
    │
    ├─► [Line 5436] Check: !teamCategory?.value
    │   │
    │   └─► TRUE → [Line 5438] Call: highlightField(teamCategory)
    │
    ├─► [Line 5442] Query: document.querySelectorAll(`input[name="teamOption${i}"]:checked`)
    │   │
    │   └─► [Line 5448] Check: teamOptionRadios.length === 0
    │       │
    │       └─► TRUE → [Line 5451] Get: teamOptionGroup = document.getElementById(`teamOptionGroup${i}`)
    │           └─► [Line 5453] Call: highlightField(teamOptionGroup)
    │
    ▼
[Line 5469] Check for duplicate team names (second pass)
    │
    ▼
[Line 5502] Check: missingFields.length > 0
    │
    ├─► TRUE → [Line 5506] Call: showError(message)
    │   │
    │   │   └─► [Line 6385-6400] showError() function:
    │   │       ├─► Get: msgEl = document.getElementById('formMsg')
    │   │       ├─► Set: msgEl.textContent = message
    │   │       ├─► Set: msgEl.className = 'msg error'
    │   │       ├─► Set: msgEl.style.display = 'block'
    │   │       └─► Call: msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    │   │
    │   └─► [Line 5507] return false  ⚠️ VALIDATION FAILED
    │
    └─► FALSE → [Line 5510] return true
```

## What Happens After Validation Fails (return false)

### In the Event Listener (Line 987-993)
```javascript
if (validateStep1()) {
  // Validation passed
  saveStep1Data();
  loadStep(2);
} else {
  // Validation failed - return false
  Logger.debug('🎯 initStep1: Validation failed, staying on step 1');
  // ⚠️ NOTHING ELSE HAPPENS HERE - NO FIELD RESTORATION, NO RELOAD
}
```

### After return false:
1. **No save happens** - `saveStep1Data()` is NOT called
2. **No step navigation** - User stays on step 1
3. **Error message is displayed** - `showError()` was called during validation
4. **Fields are highlighted** - `highlightField()` was called for missing fields
5. **BUT fields should still exist in DOM** - No explicit removal code runs

## Functions Called by validateStep1()

### 1. clearFieldHighlighting() [Line 5417]
**Location**: Lines 1180-1192

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

**What it does**:
- Removes 'field-error' class from previously highlighted fields
- Clears duplicate warning message
- **Does NOT remove fields from DOM**

### 2. highlightField(field) [Lines 5433, 5438, 5453, 5496]
**Location**: Lines 1197-1202

```javascript
function highlightField(field) {
  if (field) {
    field.classList.add('field-error');
    field.focus();  // ⚠️ POTENTIAL ISSUE: If field is null/undefined, this is skipped
  }
}
```

**What it does**:
- Adds 'field-error' class to the field
- Calls `field.focus()` to focus the field
- **If field is null/undefined, nothing happens (silent failure)**

### 3. showError(message) [Line 5506]
**Location**: Lines 6385-6400

```javascript
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';
    msgEl.style.display = 'block';
    msgEl.style.backgroundColor = '#fee';
    msgEl.style.border = '2px solid #dc3545';
    msgEl.style.color = '#721c24';
    msgEl.style.padding = '1rem';
    msgEl.style.margin = '1rem 0';
    msgEl.style.borderRadius = '4px';
    msgEl.style.whiteSpace = 'pre-wrap';
    msgEl.style.fontWeight = 'bold';
    
    // Scroll to error message
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    Logger.error('Validation Error:', message);
  }
}
```

**What it does**:
- Updates the error message element
- Scrolls to show the error message
- **Does NOT remove fields from DOM**

## Async Operations or Callbacks

### During Validation:
- **None** - `validateStep1()` is synchronous

### After Validation Fails:
- **None** - The event handler simply returns, no async operations triggered

### Potential Triggers (NOT directly in validation flow):

1. **Language Change Event** (Line 170-176)
   ```javascript
   window.addEventListener('languageChanged', () => {
     loadStepContent(currentStep);  // ⚠️ This would reload step 1 and clear fields!
   });
   ```

2. **i18n.updateUI()** (Line 603-606)
   ```javascript
   if (window.i18n && typeof window.i18n.updateUI === 'function') {
     window.i18n.updateUI();  // ⚠️ Might trigger DOM manipulation
   }
   ```

3. **Error Clearing Listeners** (Line 1057-1091)
   ```javascript
   document.addEventListener('input', (event) => {
     if (event.target.id && (event.target.id.startsWith('teamNameEn') || ...)) {
       clearErrors();  // Clears error message, but doesn't affect fields
     }
   });
   ```

## Critical Discovery: Where Fields Disappear

Based on the code trace, **fields should NOT disappear from the validation flow itself**. The validation functions:
- ✅ `clearFieldHighlighting()` - Only removes CSS classes
- ✅ `highlightField()` - Only adds CSS classes and focuses
- ✅ `showError()` - Only updates error message element

**None of these functions remove fields from the DOM.**

### Possible Causes of Field Disappearance:

1. **Something triggers `loadStepContent(1)`** after validation fails
   - Language change event
   - i18n.updateUI() side effects
   - Some other event listener

2. **Something triggers `createTeamCountSelector()`** which clears container
   - Line 922: `container.innerHTML = '';`

3. **Something triggers `generateTeamFields()`** which clears teamFieldsContainer
   - Line 1221: `container.innerHTML = '';`

4. **Browser behavior with HTML5 `required` attribute**
   - Browser might be removing invalid required fields?
   - Unlikely but possible

5. **CSS hiding fields** (not removing, but making them invisible)
   - Field-error class might have CSS that hides elements
   - Or some other CSS rule

## Missing Field Scenario Analysis

### When `teamNameEn` is null/undefined:

1. **Line 5431**: `if (!teamNameEn?.value?.trim())`
   - Uses optional chaining, so if `teamNameEn` is null, condition is TRUE
   
2. **Line 5433**: `highlightField(teamNameEn)`
   - Passes null to highlightField
   - highlightField checks `if (field)` - FALSE, so nothing happens
   - **Field is never highlighted, but also never removed**

3. **Field was already missing** - This suggests fields disappear BEFORE validation runs, not during

## Conclusion

**The validation flow itself does NOT remove fields from the DOM.** If fields disappear after clicking "Next", it must be caused by:

1. **An external trigger** (event listener, async callback) that reloads/clears step 1
2. **Fields were already missing** when validation ran
3. **CSS hiding fields** (not DOM removal)
4. **Browser native HTML5 validation** interference
5. **Form submission** - If the button is inside a form and triggers native form submission

The most likely culprit is something triggering a step reload (`loadStepContent(1)`) which clears `wizardMount.innerHTML = ''` (line 570), destroying all fields.

## Button Type Check

The Next button is created at line 915:
```javascript
<button type="button" id="nextToStep2" class="btn btn-primary" data-i18n="nextTeamInfo">
```

**Good**: The button has `type="button"` which prevents form submission. This is NOT the cause.

## Visual Flow Diagram: User Click → Validation → Field Disappearance

```
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS "NEXT" BUTTON (nextToStep2)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ [Line 983] Event Listener Executes                         │
│   nextButton.addEventListener('click', () => { ... })       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ [Line 987] Call: validateStep1()                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────────┐
│ [Line 5410]      │         │ [Line 5417]          │
│ Check teamCount  │         │ clearFieldHighlighting()│
│ value exists?    │         │ - Remove .field-error│
│                  │         │   class from fields  │
│ NO → showError() │         │ - Clear warnings     │
│ return false ────┼─────────┼→ Continue           │
└──────────────────┘         └──────┬───────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │ [Line 5425] Loop through   │
                        │ teams (i = 1 to count)     │
                        └──────┬─────────────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │ For each team:                              │
        │   [Line 5426-5429] Get field elements       │
        │   [Line 5431] Check teamNameEn value        │
        │   [Line 5436] Check teamCategory value      │
        │   [Line 5448] Check entry option selected   │
        │                                             │
        │   If missing → highlightField(field)        │
        │     - Add 'field-error' class               │
        │     - Call field.focus()                    │
        └──────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ [Line 5502] Check: missingFields.length > 0?                │
└──────┬────────────────────────────┬─────────────────────────┘
       │                            │
   YES │                            │ NO
       │                            │
       ▼                            ▼
┌──────────────────┐      ┌─────────────────────┐
│ [Line 5506]      │      │ [Line 5510]         │
│ showError(msg)   │      │ return true         │
│ - Display error  │      │                     │
│ - Scroll to msg  │      │ ✅ VALIDATION PASSED│
│                  │      └─────────────────────┘
│ [Line 5507]      │
│ return false ────┼────────────────────────────┐
└──────────────────┘                            │
                                                │
                       ⚠️ VALIDATION FAILED     │
                                                │
                        ┌───────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ [Line 992] Event Handler: Validation failed                 │
│   Logger.debug('Validation failed, staying on step 1')      │
│   // NO OTHER CODE RUNS HERE                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ ❓ FIELDS SHOULD STILL EXIST IN DOM                         │
│                                                              │
│ But user reports: FIELDS DISAPPEAR                          │
│                                                              │
│ ⚠️ SOMETHING ELSE MUST BE TRIGGERING FIELD REMOVAL         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐
│ Language     │ │ i18n.    │ │ Form        │ │ Browser     │
│ Change Event │ │ updateUI │ │ Submission? │ │ HTML5 Valid │
│ [Line 170]   │ │ [Line 605]│ │ (unlikely)  │ │ (unlikely)  │
│              │ │          │ │             │ │             │
│ Triggers:    │ │ Might    │ │ Button has  │ │ Native      │
│ loadStep     │ │ trigger  │ │ type=button │ │ validation  │
│ Content(1)   │ │ DOM      │ │ (no submit) │ │ might hide  │
│              │ │ changes  │ │             │ │ invalid req │
│ ⚠️ CLEARS    │ │ ⚠️ MAY   │ │             │ │ fields?     │
│ ALL FIELDS   │ │ AFFECT   │ │             │ │             │
└──────────────┘ └──────────┘ └─────────────┘ └─────────────┘
```

## Key Insight

**The validation code path does NOT remove fields. Fields disappear because something ELSE is triggered that clears the DOM. The most likely candidates are:**

1. **Language change event** (line 170) → triggers `loadStepContent(1)` → clears all fields
2. **i18n.updateUI()** (line 605) → might manipulate DOM in unexpected ways
3. **Browser native validation** → might hide/remove invalid required fields

**To debug this, we need to:**
- Add logging to see if `loadStepContent(1)` is called after validation fails
- Check if `createTeamCountSelector()` is called
- Check if `generateTeamFields()` is called
- Verify if language change events are firing

