# WU/SC Wizard Migration - Key Changes

## Summary
Migrated WU/SC wizard to use unified error system, following TN wizard patterns. All validation and submission error handling now uses `errorSystem`.

---

## 1. Error Divs Added

### renderTeamDetails() - Team Fields
```html
<!-- Added after teamNameEn input -->
<div class="field-error-message" id="error-teamNameEn${i}"></div>

<!-- Added after boatType/division container -->
<div class="field-error-message" id="error-boatType${i}"></div>
<div class="field-error-message" id="error-division${i}"></div>
```

### renderManagerFields() - Manager Fields
```html
<!-- Changed from: -->
<div class="field-error" id="manager1PhoneError"></div>

<!-- To: -->
<div class="field-error-message" id="error-manager1Phone"></div>
```

### addOrganizationErrorDivs() - Organization Fields
Dynamically adds error divs in `initStep2()`:
```javascript
function addOrganizationErrorDivs() {
  // Adds error-orgName and error-mailingAddress divs
}
```

---

## 2. validateStep1() - Migrated

### Before:
```javascript
function validateStep1() {
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

### After:
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
    
    if (!boatType) {
      errors.push({
        field: `boatType${i}`,
        messageKey: 'pleaseSelectDivision',
        params: { num: i }
      });
    }
    
    if (!division) {
      errors.push({
        field: `division${i}`,
        messageKey: 'pleaseSelectEntryGroup',
        params: { num: i }
      });
    }
  }
  
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'categoryForm',
        scrollTo: true
      });
    } else {
      // Fallback
      showError(message);
    }
    return false;
  }
  return true;
}
```

**Key Changes:**
- ✅ Collects all errors before displaying
- ✅ Uses error objects with field IDs and i18n keys
- ✅ Shows form error summary for 2+ errors
- ✅ Falls back to old method if errorSystem not available

---

## 3. validateStep2() - Migrated

### Before:
```javascript
function validateStep2() {
  if (!orgName || !orgName.value.trim()) {
    showError('Please enter organization name');
    return false;
  }
  
  if (!manager1Phone || !manager1Phone.value.trim()) {
    showError('Please enter manager phone');
    return false;
  } else if (!isValidHKPhone(manager1Phone.value.trim())) {
    showError('Invalid phone');
    if (manager1PhoneError) {
      manager1PhoneError.textContent = 'Invalid phone';
      manager1PhoneError.style.display = 'block';
    }
    return false;
  }
  // ... more validation with early returns
}
```

### After:
```javascript
function validateStep2() {
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  // Organization fields
  if (!orgName || !orgName.value.trim()) {
    errors.push({ field: 'orgName', messageKey: 'organizationRequired' });
  }
  
  if (!mailingAddress || !mailingAddress.value.trim()) {
    errors.push({ field: 'mailingAddress', messageKey: 'addressRequired' });
  }
  
  // Manager 1
  if (!manager1Name || !manager1Name.value.trim()) {
    errors.push({ field: 'manager1Name', messageKey: 'managerNameRequired' });
  }
  
  if (!manager1Phone || !manager1Phone.value.trim()) {
    errors.push({ field: 'manager1Phone', messageKey: 'managerPhoneRequired' });
  } else if (!isValidHKPhone(manager1Phone.value.trim())) {
    errors.push({ field: 'manager1Phone', messageKey: 'invalidPhone' });
  }
  
  // ... Manager 2 and 3 validation (same pattern)
  
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'teamInfoForm',
        scrollTo: true
      });
    } else {
      // Fallback
      showError(message);
    }
    return false;
  }
  
  // Save data...
  return true;
}
```

**Key Changes:**
- ✅ Removed all direct DOM manipulation (`textContent`, `style.display`)
- ✅ Collects all errors before displaying
- ✅ Uses i18n keys for all messages
- ✅ Shows form error summary for 2+ errors

---

## 4. setupStep2Validation() - Enhanced

### Before:
```javascript
function setupStep2Validation() {
  setupEmailValidation('manager1Email');
  setupPhoneValidation('manager1Phone');
  // ... uses legacy validation.js functions
}
```

### After:
```javascript
function setupStep2Validation() {
  if (!window.errorSystem) {
    // Fallback to legacy methods
    setupEmailValidation('manager1Email');
    setupPhoneValidation('manager1Phone');
    return;
  }
  
  // Real-time validation with error system
  ['manager1Email', 'manager2Email', 'manager3Email'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    
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
  });
  
  // Similar for phone fields...
}
```

**Key Changes:**
- ✅ Uses error system for real-time validation
- ✅ Clears errors on input
- ✅ Validates on blur
- ✅ Falls back to legacy methods if errorSystem not available

---

## 5. submitWUSCForm() - Migrated

### Before:
```javascript
async function submitWUSCForm() {
  try {
    const result = await fetchWithErrorHandling(EDGE_URL, {...});
    
    if (result.ok) {
      showConfirmation(result.data);
    } else {
      throw new Error(result.error || 'Submission failed');
    }
  } catch (error) {
    showError(error.message || 'Submission failed. Please try again.');
  }
}
```

### After:
```javascript
async function submitWUSCForm() {
  try {
    const result = await fetchWithErrorHandling(EDGE_URL, {...});
    
    if (result.ok) {
      showConfirmation(result.data);
    } else {
      const status = result.status;
      if (window.errorSystem) {
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
        } else {
          window.errorSystem.showSystemError('serverErrorDetailed', {
            dismissible: true
          });
        }
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    }
  } catch (error) {
    if (window.errorSystem) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        window.errorSystem.showSystemError('networkErrorDetailed', {
          dismissible: true
        });
      } else if (error.message && error.message.includes('timeout')) {
        window.errorSystem.showSystemError('timeoutErrorDetailed', {
          dismissible: true
        });
      } else {
        window.errorSystem.showSystemError('networkErrorDetailed', {
          dismissible: true
        });
      }
    } else {
      showError(error.message || 'Submission failed. Please try again.');
    }
  }
}
```

**Key Changes:**
- ✅ Status-based error routing (429, 500+, 409)
- ✅ Network error detection
- ✅ Timeout error handling
- ✅ Uses system errors (fixed position at top)
- ✅ Falls back to old method if errorSystem not available

---

## 6. showError() Function

**Status:** **KEPT** (for backward compatibility)

**Reason:** All `showError()` calls are now in fallback paths (when `errorSystem` is not available). The function is simpler than TN's version and serves as a safety net.

**Current usage:** Only called in `else` blocks when `window.errorSystem` is not available.

---

## Error System Integration

### Container IDs:
- **Step 1:** `categoryForm` (form element)
- **Step 2:** `teamInfoForm` (form element)

### Error Field IDs:
- Team fields: `teamNameEn${i}`, `boatType${i}`, `division${i}`
- Organization: `orgName`, `mailingAddress`
- Managers: `manager1Name`, `manager1Phone`, `manager1Email`, etc.

### Error Div IDs:
Follow pattern: `error-{fieldId}` (e.g., `error-teamNameEn1`, `error-manager1Phone`)

---

## Migration Complete ✅

All validation and submission error handling in WU/SC wizard now uses the unified error system, matching TN wizard patterns.

**Benefits:**
- Consistent error display across TN and WU/SC wizards
- Form error summaries for multiple errors
- Inline field errors with better visual feedback
- Real-time validation
- i18n support
- Accessibility features
