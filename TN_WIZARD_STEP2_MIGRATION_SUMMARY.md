# TN Wizard Step 2 Migration Summary

## Overview
Successfully migrated TN Wizard Step 2 (Organization & Team Manager Information) validation to use the unified error system.

## Changes Made

### 1. Updated `createOrganizationForm()` - Added Error Div Placeholders

**Location:** `public/js/tn_wizard.js` (lines 1572-1702)

Added `<div class="field-error-message" id="error-{fieldId}"></div>` after each form field:

#### Organization Fields:
- `orgName` → `<div class="field-error-message" id="error-orgName"></div>`
- `orgAddress` → `<div class="field-error-message" id="error-orgAddress"></div>`

#### Manager 1 Fields (Required):
- `manager1Name` → `<div class="field-error-message" id="error-manager1Name"></div>`
- `manager1Phone` → `<div class="field-error-message" id="error-manager1Phone"></div>`
- `manager1Email` → `<div class="field-error-message" id="error-manager1Email"></div>`

#### Manager 2 Fields (Required):
- `manager2Name` → `<div class="field-error-message" id="error-manager2Name"></div>`
- `manager2Phone` → `<div class="field-error-message" id="error-manager2Phone"></div>`
- `manager2Email` → `<div class="field-error-message" id="error-manager2Email"></div>`

#### Manager 3 Fields (Optional):
- `manager3Name` → `<div class="field-error-message" id="error-manager3Name"></div>`
- `manager3Phone` → `<div class="field-error-message" id="error-manager3Phone"></div>`
- `manager3Email` → `<div class="field-error-message" id="error-manager3Email"></div>`

**Note:** Replaced old error divs with class `field-error` and IDs like `manager1PhoneError` with new unified error divs using class `field-error-message` and IDs following pattern `error-{fieldId}`.

---

### 2. Refactored `validateStep2()` Function

**Location:** `public/js/tn_wizard.js` (lines 5557-5723)

#### Key Changes:

1. **Replaced `clearFieldHighlighting()`** → `window.errorSystem.clearFormErrors()`

2. **Replaced `missingFields` array** → `errors` array with structured error objects:
   ```javascript
   errors.push({
     field: 'orgName',
     messageKey: 'organizationRequired'
   });
   ```

3. **Removed all direct DOM manipulation:**
   - ❌ Removed: `highlightField(field)` calls
   - ❌ Removed: `manager1PhoneError.textContent = '...'`
   - ❌ Removed: `manager1PhoneError.style.display = 'block'`
   - ✅ Replaced with: Error objects in array

4. **Replaced `showError()`** → `window.errorSystem.showFormErrors()`

5. **Added fallback** to old error methods if `errorSystem` not available

#### Error Structure:

All errors follow this pattern:
```javascript
{
  field: string,        // Field ID (e.g., 'orgName', 'manager1Phone')
  messageKey: string    // i18n translation key
}
```

#### i18n Keys Used:

- `organizationRequired` - Organization name validation
- `addressRequired` - Address validation
- `managerNameRequired` - Manager name validation
- `managerPhoneRequired` - Manager phone validation (required)
- `managerEmailRequired` - Manager email validation (required)
- `invalidPhone` - Invalid phone format
- `invalidEmail` - Invalid email format

#### Validation Logic:

**Organization Fields:**
- `orgName`: Required, uses `organizationRequired`
- `orgAddress`: Required, uses `addressRequired`

**Manager 1 & 2 (Required):**
- Name: Required, uses `managerNameRequired`
- Phone: Required, uses `managerPhoneRequired`; if provided but invalid, uses `invalidPhone`
- Email: Required, uses `managerEmailRequired`; if provided but invalid, uses `invalidEmail`

**Manager 3 (Optional):**
- If name provided: Phone and email become required
- If phone/email provided: Name becomes required
- Format validation applies if any field is provided

---

### 3. Enhanced `setupStep2Validation()` for Real-Time Validation

**Location:** `public/js/tn_wizard.js` (lines 1707-1770)

#### Changes:

1. **Added error system integration** for real-time validation
2. **Email fields:** Validate on blur, clear on input
3. **Phone fields:** Enforce digits-only on input, validate on blur, clear on input
4. **Fallback:** Uses legacy validation methods if `errorSystem` not available

#### Implementation:

```javascript
// Email validation
field.addEventListener('blur', () => {
  if (field.value.trim()) {
    if (!isValidEmail(field.value.trim())) {
      window.errorSystem.showFieldError(fieldId, 'invalidEmail');
    } else {
      window.errorSystem.clearFieldError(fieldId);
    }
  }
});

field.addEventListener('input', () => {
  window.errorSystem.clearFieldError(fieldId);
});
```

---

## Integration with Existing validation.js Functions

### Current Status:

The `setupEmailValidation()` and `setupPhoneValidation()` functions in `validation.js` still use the old DOM manipulation approach. They are **not** updated to use the error system because:

1. They are **shared functions** used across multiple forms (TN, WU, SC)
2. They have **fallback behavior** - create error elements if they don't exist
3. **Step 2 now uses custom validation** in `setupStep2Validation()` that integrates with error system

### How They Work Together:

1. **Step 2 uses `setupStep2Validation()`** which:
   - Uses error system when available
   - Falls back to legacy methods if error system not available

2. **Other steps/forms can still use** `setupEmailValidation()` and `setupPhoneValidation()` from `validation.js`:
   - They will create error divs if needed
   - They work independently of error system

3. **Future migration:** When other forms are migrated, they can:
   - Option A: Update `setupEmailValidation()` and `setupPhoneValidation()` to use error system
   - Option B: Create form-specific validation functions like `setupStep2Validation()`

---

## Before/After Comparison

### Before (Old Code):

```javascript
// Direct DOM manipulation
const manager1PhoneError = document.getElementById('manager1PhoneError');
if (manager1PhoneError) {
  manager1PhoneError.textContent = 'Please enter an 8-digit Hong Kong phone number.';
  manager1PhoneError.style.display = 'block';
}

// Field highlighting
highlightField(manager1Phone);

// Error message concatenation
missingFields.push('Team Manager 1 phone (must be 8 digits)');
showError(`Please complete: ${missingFields.join(', ')}`);
```

### After (New Code):

```javascript
// Structured error objects
errors.push({
  field: 'manager1Phone',
  messageKey: 'invalidPhone'
});

// Unified error display
window.errorSystem.showFormErrors(errors, {
  containerId: 'wizardMount',
  scrollTo: true
});
```

---

## Benefits

### User Experience:
- ✅ **Form error summary** shows all errors at once (2+ errors)
- ✅ **Clickable links** to jump to problematic fields
- ✅ **Real-time validation** clears errors as user types
- ✅ **Consistent styling** across all error types
- ✅ **i18n support** for all error messages
- ✅ **Accessibility** with ARIA attributes

### Developer Experience:
- ✅ **Less code duplication** - no manual DOM manipulation
- ✅ **Centralized error handling** - one system for all errors
- ✅ **Type safety** - structured error objects
- ✅ **Easier maintenance** - changes to error system affect all forms
- ✅ **Better testing** - can test error system independently

---

## Testing Checklist

After migration, test the following scenarios:

- [ ] **Empty form submission** - Shows all required field errors
- [ ] **Organization name missing** - Shows error on orgName field
- [ ] **Address missing** - Shows error on orgAddress field
- [ ] **Manager 1 name missing** - Shows error on manager1Name field
- [ ] **Manager 1 phone invalid format** - Shows invalidPhone error
- [ ] **Manager 1 email invalid format** - Shows invalidEmail error
- [ ] **Manager 2 validation** - Same as Manager 1
- [ ] **Manager 3 optional validation** - Only validates if any field provided
- [ ] **Manager 3 partial completion** - Shows appropriate errors
- [ ] **Multiple errors** - Shows form error summary with clickable links
- [ ] **Single error** - Scrolls to and focuses field
- [ ] **Real-time validation** - Errors clear on input, validate on blur
- [ ] **Error summary links** - Clicking link scrolls to and focuses field
- [ ] **Error summary close button** - Dismisses summary (keeps field errors)
- [ ] **Language switching** - Error messages update to new language
- [ ] **Mobile view** - Error summary displays correctly on small screens

---

## Files Modified

1. **`public/js/tn_wizard.js`**
   - Updated `createOrganizationForm()` - Added error div placeholders
   - Refactored `validateStep2()` - Uses error system
   - Enhanced `setupStep2Validation()` - Real-time validation with error system

---

## Next Steps

1. ✅ **Step 1 Migration** - Complete
2. ✅ **Step 2 Migration** - Complete
3. ⏳ **Step 3 Migration** - Race Day validation
4. ⏳ **Step 4 Migration** - Practice booking validation
5. ⏳ **Step 5 Migration** - Summary validation
6. ⏳ **Remove Legacy Code** - Remove `showError()`, `highlightField()`, `clearFieldHighlighting()` if no longer used

---

## Notes

- Field IDs in code use `orgName` and `orgAddress` (not `organizationName` and `mailingAddress`)
- Error div IDs follow pattern: `error-{fieldId}` (e.g., `error-orgName`)
- Error divs use class: `field-error-message` (unified error system class)
- Container for error summary: `wizardMount` (contains the organization form)
- All error messages use i18n keys for translation support
