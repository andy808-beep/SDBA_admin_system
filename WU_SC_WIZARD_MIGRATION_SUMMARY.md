# WU/SC Wizard Migration Summary

## Overview
Successfully migrated WU/SC Wizard (`wu_sc_wizard.js`) to use the unified error system, following the same patterns as TN wizard.

## Changes Made

### 1. Added Error Divs to Form Generation

#### renderTeamDetails() - Team Fields
**Location:** `public/js/wu_sc_wizard.js` (lines 787-911)

Added error divs after team fields:
- `teamNameEn${i}` → `<div class="field-error-message" id="error-teamNameEn${i}"></div>`
- `boatType${i}` → `<div class="field-error-message" id="error-boatType${i}"></div>`
- `division${i}` → `<div class="field-error-message" id="error-division${i}"></div>`

#### renderManagerFields() - Manager Fields
**Location:** `public/js/wu_sc_wizard.js` (lines 1225-1301)

Updated error divs to use unified error system class:
- Changed from `class="field-error"` → `class="field-error-message"`
- Changed IDs from `manager1PhoneError` → `error-manager1Phone`
- Added error divs for all manager name fields

**Fields with error divs:**
- Manager 1: `manager1Name`, `manager1Phone`, `manager1Email`
- Manager 2: `manager2Name`, `manager2Phone`, `manager2Email`
- Manager 3: `manager3Name`, `manager3Phone`, `manager3Email`

#### addOrganizationErrorDivs() - Organization Fields
**Location:** `public/js/wu_sc_wizard.js` (new function)

Added function to dynamically add error divs for organization fields:
- `orgName` → `<div class="field-error-message" id="error-orgName"></div>`
- `mailingAddress` → `<div class="field-error-message" id="error-mailingAddress"></div>`

Called from `initStep2()` after form is rendered.

---

### 2. Migrated `validateStep1()` Function

**Location:** `public/js/wu_sc_wizard.js` (lines 1619-1720)

#### Key Changes:

1. **Replaced `showError()`** → `window.errorSystem.showFormErrors()`

2. **Changed to errors array pattern:**
   ```javascript
   const errors = [];
   
   if (!teamNameEn || !teamNameEn.value.trim()) {
     errors.push({
       field: `teamNameEn${i}`,
       messageKey: 'pleaseEnterTeamName',
       params: { num: i }
     });
   }
   ```

3. **Removed early returns** - Now collects all errors before displaying

4. **Added fallback** to old `showError()` method if errorSystem not available

#### Validation Checks:
- Team count selection → `pleaseSelectNumberOfTeams`
- Team name (English) → `pleaseEnterTeamName` with `{num: i}`
- Boat type selection → `pleaseSelectDivision` with `{num: i}`
- Division selection → `pleaseSelectEntryGroup` with `{num: i}`

---

### 3. Migrated `validateStep2()` Function

**Location:** `public/js/wu_sc_wizard.js` (lines 1663-1945)

#### Key Changes:

1. **Replaced all `showError()` calls** → Error objects in array

2. **Removed direct DOM manipulation:**
   - ❌ Removed: `manager1PhoneError.textContent = invalidPhoneMsg`
   - ❌ Removed: `manager1PhoneError.style.display = 'block'`
   - ✅ Replaced with: Error objects in array

3. **Unified error collection:**
   ```javascript
   const errors = [];
   
   // Organization fields
   if (!orgName || !orgName.value.trim()) {
     errors.push({ field: 'orgName', messageKey: 'organizationRequired' });
   }
   
   // Manager fields
   if (!manager1Name || !manager1Name.value.trim()) {
     errors.push({ field: 'manager1Name', messageKey: 'managerNameRequired' });
   }
   ```

4. **Removed early returns** - Collects all errors before displaying

5. **Added fallback** to old method if errorSystem not available

#### Validation Checks:
- Organization name → `organizationRequired`
- Mailing address → `addressRequired`
- Manager names → `managerNameRequired`
- Manager phones → `managerPhoneRequired` or `invalidPhone`
- Manager emails → `managerEmailRequired` or `invalidEmail`

---

### 4. Enhanced `setupStep2Validation()` Function

**Location:** `public/js/wu_sc_wizard.js` (lines 1176-1230)

#### Key Changes:

1. **Uses error system** for real-time validation when available

2. **Email fields:** Validate on blur, clear on input
3. **Phone fields:** Enforce digits-only, validate on blur, clear on input

4. **Falls back** to legacy `setupEmailValidation()` and `setupPhoneValidation()` if errorSystem not available

---

### 5. Migrated `submitWUSCForm()` Error Handling

**Location:** `public/js/wu_sc_wizard.js` (lines 1859-1911)

#### Key Changes:

1. **Replaced `showError()`** → `window.errorSystem.showSystemError()`

2. **Status-based error routing:**
   ```javascript
   if (status === 429) {
     window.errorSystem.showSystemError('rateLimitExceeded', {
       persistent: true,
       dismissible: true
     });
   } else if (status >= 500) {
     window.errorSystem.showSystemError('serverErrorDetailed', {
       dismissible: true
     });
   } else if (status === 409) {
     window.errorSystem.showSystemError('duplicateRegistration', {
       dismissible: true
     });
   }
   ```

3. **Network error handling:**
   ```javascript
   catch (error) {
     if (error.name === 'TypeError' && error.message.includes('fetch')) {
       window.errorSystem.showSystemError('networkErrorDetailed');
     } else if (error.message.includes('timeout')) {
       window.errorSystem.showSystemError('timeoutErrorDetailed');
     }
   }
   ```

4. **Added fallback** to old `showError()` method

---

### 6. Legacy `showError()` Function

**Status:** **KEPT** (for backward compatibility)

**Location:** `public/js/wu_sc_wizard.js` (lines 1989-1994)

The `showError()` function is **not removed** because:

1. **Fallback support** - Used when `errorSystem` is not available
2. **Simpler implementation** - WU/SC's showError() is simpler than TN's (no inline styles)
3. **Gradual migration** - Allows gradual migration of remaining error displays

**Current implementation:**
```javascript
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';
  }
}
```

---

## Before/After Comparison

### Before (Old Code):

```javascript
function validateStep1() {
  const teamCount = document.getElementById('teamCount');
  if (!teamCount || !teamCount.value) {
    showError('Please select number of teams');
    return false;
  }
  
  for (let i = 1; i <= count; i++) {
    if (!teamNameEn || !teamNameEn.value.trim()) {
      showError(`Please enter team name (English) for Team ${i}`);
      return false;
    }
  }
  return true;
}
```

### After (New Code):

```javascript
function validateStep1() {
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  if (!teamCount || !teamCount.value) {
    errors.push({ field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' });
  }
  
  for (let i = 1; i <= count; i++) {
    if (!teamNameEn || !teamNameEn.value.trim()) {
      errors.push({
        field: `teamNameEn${i}`,
        messageKey: 'pleaseEnterTeamName',
        params: { num: i }
      });
    }
  }
  
  if (errors.length > 0) {
    window.errorSystem.showFormErrors(errors, {
      containerId: 'categoryForm',
      scrollTo: true
    });
    return false;
  }
  return true;
}
```

---

## i18n Keys Used

### Existing Keys (Already in translations.js):
- `pleaseSelectNumberOfTeams` - Team count validation
- `pleaseEnterTeamName` - Team name validation (with `{num}` param)
- `pleaseSelectDivision` - Boat type/division validation (with `{num}` param)
- `pleaseSelectEntryGroup` - Entry group validation (with `{num}` param)
- `organizationRequired` - Organization name validation
- `addressRequired` - Address validation
- `managerNameRequired` - Manager name validation
- `managerPhoneRequired` - Manager phone validation
- `managerEmailRequired` - Manager email validation
- `invalidPhone` - Invalid phone format
- `invalidEmail` - Invalid email format
- `serverErrorDetailed` - Server errors
- `networkErrorDetailed` - Network errors
- `rateLimitExceeded` - Rate limit errors
- `duplicateRegistration` - Duplicate registration errors
- `timeoutErrorDetailed` - Timeout errors

**Note:** All required i18n keys already exist from TN wizard migration.

---

## Error Field IDs

### Step 1 (Team Details):
- `teamCount` - Team count selection
- `teamNameEn${i}` - Team name (English) for team i
- `boatType${i}` - Boat type selection for team i
- `division${i}` - Division selection for team i

### Step 2 (Team Information):
- `orgName` - Organization name
- `mailingAddress` - Mailing address
- `manager1Name`, `manager1Phone`, `manager1Email` - Manager 1 fields
- `manager2Name`, `manager2Phone`, `manager2Email` - Manager 2 fields
- `manager3Name`, `manager3Phone`, `manager3Email` - Manager 3 fields

---

## Benefits

### User Experience:
- ✅ **Form error summary** shows all errors at once (2+ errors)
- ✅ **Clickable links** to jump to problematic fields
- ✅ **Inline error messages** appear below each field
- ✅ **Real-time validation** clears errors as user types
- ✅ **Consistent styling** with TN wizard
- ✅ **i18n support** for all error messages
- ✅ **Accessibility** with ARIA attributes

### Developer Experience:
- ✅ **Consistent patterns** - Same error handling as TN wizard
- ✅ **Less code duplication** - No manual DOM manipulation
- ✅ **Centralized error handling** - One system for all errors
- ✅ **Easier maintenance** - Changes to error system affect all forms
- ✅ **Better testing** - Can test error system independently

---

## Testing Checklist

After migration, test the following scenarios:

### Step 1:
- [ ] **No team count selected** - Shows error on teamCount field
- [ ] **Missing team name** - Shows error on teamNameEn field
- [ ] **Missing boat type** - Shows error on boatType field
- [ ] **Missing division** - Shows error on division field
- [ ] **Multiple teams with errors** - Shows form error summary

### Step 2:
- [ ] **Missing organization name** - Shows error on orgName field
- [ ] **Missing address** - Shows error on mailingAddress field
- [ ] **Missing manager 1 name** - Shows error on manager1Name field
- [ ] **Invalid manager 1 phone** - Shows invalidPhone error
- [ ] **Invalid manager 1 email** - Shows invalidEmail error
- [ ] **Manager 2 validation** - Same as Manager 1
- [ ] **Manager 3 optional validation** - Only validates if any field provided
- [ ] **Multiple errors** - Shows form error summary

### Submission:
- [ ] **Network error** - Shows networkErrorDetailed system error
- [ ] **Server error (500)** - Shows serverErrorDetailed system error
- [ ] **Rate limit (429)** - Shows rateLimitExceeded system error (persistent)
- [ ] **Duplicate registration (409)** - Shows duplicateRegistration system error
- [ ] **Timeout error** - Shows timeoutErrorDetailed system error

### General:
- [ ] **Error summary links** - Clicking link scrolls to and focuses field
- [ ] **Error summary close button** - Dismisses summary (keeps field errors)
- [ ] **Real-time validation** - Errors clear on input, validate on blur
- [ ] **Language switching** - Error messages update to new language
- [ ] **Mobile view** - Error summary displays correctly on small screens

---

## Files Modified

1. **`public/js/wu_sc_wizard.js`**
   - Updated `renderTeamDetails()` - Added error divs (lines 787-911)
   - Updated `renderManagerFields()` - Updated error divs (lines 1225-1301)
   - Added `addOrganizationErrorDivs()` - New function (lines 1175-1195)
   - Updated `initStep2()` - Calls addOrganizationErrorDivs() (lines 1163-1174)
   - Refactored `validateStep1()` - Uses error system (lines 1619-1720)
   - Refactored `validateStep2()` - Uses error system (lines 1663-1945)
   - Enhanced `setupStep2Validation()` - Uses error system (lines 1176-1230)
   - Migrated `submitWUSCForm()` - Uses error system (lines 1859-1911)
   - **Kept** `showError()` - For backward compatibility (lines 1989-1994)

---

## Differences from TN Wizard

### WU/SC Specific:
1. **Boat Type & Division** - WU/SC uses boat type (Standard/Small) and division (radio buttons) instead of category dropdown
2. **Simpler showError()** - WU/SC's showError() doesn't have inline styles or scrolling (simpler implementation)
3. **Template-based** - Organization fields are in template, error divs added dynamically

### Same Patterns:
- Error array structure
- Error system API usage
- i18n key usage
- Fallback behavior
- Real-time validation

---

## Next Steps

1. ✅ **WU/SC Step 1 Migration** - Complete
2. ✅ **WU/SC Step 2 Migration** - Complete
3. ⏳ **WU/SC Step 3 Migration** - Race Day validation (if needed)
4. ⏳ **Remove Legacy showError()** - Once all errors are migrated and tested
5. ⏳ **Test all error scenarios** - Comprehensive testing

---

## Notes

- **Error div creation:** Organization fields get error divs added dynamically in `initStep2()`
- **Radio button groups:** Boat type and division use radio buttons, error divs placed after container
- **Container IDs:** Step 1 uses `categoryForm`, Step 2 uses `teamInfoForm`
- **Backward compatibility:** All functions maintain fallback to legacy methods if error system not available
- **i18n keys:** All required keys already exist from TN wizard migration
