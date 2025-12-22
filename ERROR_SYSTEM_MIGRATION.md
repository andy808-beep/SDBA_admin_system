# Error System - Migration Guide

## Table of Contents

1. [Overview](#overview)
2. [Migration Checklist](#migration-checklist)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Common Patterns](#common-patterns)
5. [Code Examples](#code-examples)
6. [Troubleshooting](#troubleshooting)

---

## Overview

This guide helps you migrate from the legacy error handling system to the unified error system. The migration involves:

- Replacing `showError()` calls with `errorSystem.showFormErrors()` or `errorSystem.showSystemError()`
- Replacing `highlightField()` calls with `errorSystem.showFieldError()`
- Replacing `clearFieldHighlighting()` with `errorSystem.clearFormErrors()`
- Adding error message divs to HTML templates
- Updating validation functions to use structured error objects

---

## Migration Checklist

### Pre-Migration

- [ ] Review existing error handling code
- [ ] Identify all `showError()`, `highlightField()`, `clearFieldHighlighting()` calls
- [ ] List all error messages that need i18n keys
- [ ] Identify HTML templates that need error divs

### During Migration

- [ ] Ensure `error-system.js` and `error-system.css` are loaded
- [ ] Add error message divs to HTML templates
- [ ] Replace `showError()` with appropriate error system method
- [ ] Replace `highlightField()` with `showFieldError()`
- [ ] Replace `clearFieldHighlighting()` with `clearFormErrors()`
- [ ] Update validation functions to return structured error objects
- [ ] Add i18n keys for all error messages
- [ ] Test error display in all scenarios

### Post-Migration

- [ ] Remove legacy error functions (if safe)
- [ ] Test all error scenarios
- [ ] Verify accessibility (screen readers, keyboard navigation)
- [ ] Test on mobile devices
- [ ] Verify i18n translations work correctly

---

## Step-by-Step Migration

### Step 1: Include Error System Files

Ensure the error system is loaded in your HTML:

```html
<!-- In register.html or main HTML file -->
<link rel="stylesheet" href="css/error-system.css?v=1.0.0-mj5lf93y" />
<script type="module" src="./js/error-system.js?v=1.0.0-mj5lf93y"></script>
```

### Step 2: Add Error Message Divs to HTML

Add error message divs after form fields in your templates:

#### Before (No Error Div)

```html
<input type="email" id="email" name="email" />
```

#### After (With Error Div)

```html
<input type="email" id="email" name="email" />
<div class="field-error-message" id="error-email"></div>
```

#### For Dynamic Fields

If fields are created dynamically, add error divs in JavaScript:

```javascript
function createEmailField() {
  const input = document.createElement('input');
  input.type = 'email';
  input.id = 'email';
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error-message';
  errorDiv.id = 'error-email';
  
  container.appendChild(input);
  container.appendChild(errorDiv);
}
```

### Step 3: Replace `showError()` Calls

#### Pattern 1: Single Field Error

**Before:**
```javascript
if (!email.value.trim()) {
  showError('Email is required');
  highlightField(email);
  return false;
}
```

**After:**
```javascript
if (!email.value.trim()) {
  if (window.errorSystem) {
    window.errorSystem.showFieldError('email', 'emailRequired', {
      scrollTo: true,
      focus: true
    });
  } else {
    alert('Email is required');
  }
  return false;
}
```

#### Pattern 2: Multiple Field Errors

**Before:**
```javascript
const missingFields = [];
if (!email.value.trim()) {
  missingFields.push('Email');
  highlightField(email);
}
if (!phone.value.trim()) {
  missingFields.push('Phone');
  highlightField(phone);
}

if (missingFields.length > 0) {
  showError(`Please complete: ${missingFields.join(', ')}`);
  return false;
}
```

**After:**
```javascript
const errors = [];
if (!email.value.trim()) {
  errors.push({ field: 'email', messageKey: 'emailRequired' });
}
if (!phone.value.trim()) {
  errors.push({ field: 'phone', messageKey: 'phoneRequired' });
}

if (errors.length > 0) {
  if (window.errorSystem) {
    window.errorSystem.showFormErrors(errors, {
      containerId: 'myForm',
      scrollTo: true
    });
  } else {
    alert('Please complete all required fields');
  }
  return false;
}
```

#### Pattern 3: API/Network Errors

**Before:**
```javascript
try {
  const response = await fetch('/api/submit', { method: 'POST' });
  if (!response.ok) {
    showError('Submission failed. Please try again.');
    return;
  }
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

**After:**
```javascript
try {
  const response = await fetch('/api/submit', { method: 'POST' });
  if (!response.ok) {
    if (window.errorSystem) {
      if (response.status === 429) {
        window.errorSystem.showSystemError('rateLimitExceeded', {
          persistent: true,
          dismissible: true
        });
      } else if (response.status >= 500) {
        window.errorSystem.showSystemError('serverErrorDetailed', {
          dismissible: true
        });
      } else {
        window.errorSystem.showSystemError('serverErrorDetailed', {
          dismissible: true
        });
      }
    } else {
      alert('Submission failed. Please try again.');
    }
    return;
  }
} catch (error) {
  if (window.errorSystem) {
    window.errorSystem.showSystemError('networkErrorDetailed', {
      dismissible: true
    });
  } else {
    alert('Network error. Please check your connection.');
  }
}
```

### Step 4: Replace `highlightField()` Calls

**Before:**
```javascript
if (!email.value.trim()) {
  highlightField(email);
  showError('Email is required');
}
```

**After:**
```javascript
if (!email.value.trim()) {
  if (window.errorSystem) {
    window.errorSystem.showFieldError('email', 'emailRequired');
  }
}
```

**Note:** `showFieldError()` automatically adds the `.field-error` class, so `highlightField()` is no longer needed.

### Step 5: Replace `clearFieldHighlighting()` Calls

**Before:**
```javascript
function validateForm() {
  clearFieldHighlighting();
  // ... validation logic
}
```

**After:**
```javascript
function validateForm() {
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  // ... validation logic
}
```

### Step 6: Update Validation Functions

#### Before: Direct DOM Manipulation

```javascript
function validateEmail() {
  const email = document.getElementById('email');
  const errorDiv = document.getElementById('emailError');
  
  if (!email.value.trim()) {
    email.classList.add('field-error');
    errorDiv.textContent = 'Email is required';
    errorDiv.style.display = 'block';
    return false;
  }
  
  if (!isValidEmail(email.value)) {
    email.classList.add('field-error');
    errorDiv.textContent = 'Invalid email format';
    errorDiv.style.display = 'block';
    return false;
  }
  
  email.classList.remove('field-error');
  errorDiv.style.display = 'none';
  return true;
}
```

#### After: Using Error System

```javascript
function validateEmail() {
  const email = document.getElementById('email');
  
  if (!email.value.trim()) {
    if (window.errorSystem) {
      window.errorSystem.showFieldError('email', 'emailRequired');
    }
    return false;
  }
  
  if (!isValidEmail(email.value)) {
    if (window.errorSystem) {
      window.errorSystem.showFieldError('email', 'invalidEmail');
    }
    return false;
  }
  
  if (window.errorSystem) {
    window.errorSystem.clearFieldError('email');
  }
  return true;
}
```

### Step 7: Add i18n Keys

Add all error message keys to `public/js/i18n/translations.js`:

```javascript
const translations = {
  en: {
    // ... existing keys
    emailRequired: "Email is required",
    invalidEmail: "Please enter a valid email address",
    phoneRequired: "Phone number is required",
    invalidPhone: "Please enter a valid phone number"
  },
  tc: {
    // ... existing keys
    emailRequired: "請輸入電子郵件",
    invalidEmail: "請輸入有效的電子郵件地址",
    phoneRequired: "請輸入電話號碼",
    invalidPhone: "請輸入有效的電話號碼"
  }
};
```

### Step 8: Real-Time Validation Migration

#### Before: Manual Event Listeners

```javascript
const email = document.getElementById('email');
email.addEventListener('blur', () => {
  if (!isValidEmail(email.value)) {
    highlightField(email);
    showError('Invalid email');
  }
});

email.addEventListener('input', () => {
  clearFieldHighlighting();
});
```

#### After: Using `bindFieldValidation()`

```javascript
if (window.errorSystem) {
  window.errorSystem.bindFieldValidation('email', (value) => {
    if (!value.trim()) {
      return 'emailRequired';
    }
    if (!isValidEmail(value)) {
      return 'invalidEmail';
    }
    return true; // Valid
  }, {
    validateOnBlur: true,
    clearOnInput: true,
    debounceMs: 300
  });
}
```

---

## Common Patterns

### Pattern 1: Form Submission Validation

#### Before:
```javascript
function submitForm() {
  clearFieldHighlighting();
  const errors = [];
  
  if (!email.value.trim()) {
    errors.push('Email');
    highlightField(email);
  }
  if (!phone.value.trim()) {
    errors.push('Phone');
    highlightField(phone);
  }
  
  if (errors.length > 0) {
    showError(`Please complete: ${errors.join(', ')}`);
    return false;
  }
  
  return true;
}
```

#### After:
```javascript
function submitForm() {
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  if (!email.value.trim()) {
    errors.push({ field: 'email', messageKey: 'emailRequired' });
  }
  if (!phone.value.trim()) {
    errors.push({ field: 'phone', messageKey: 'phoneRequired' });
  }
  
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'myForm',
        scrollTo: true
      });
    } else {
      alert('Please complete all required fields');
    }
    return false;
  }
  
  return true;
}
```

### Pattern 2: Duplicate Detection

#### Before:
```javascript
const duplicates = findDuplicates(teamNames);
if (duplicates.length > 0) {
  duplicates.forEach(team => {
    highlightField(document.getElementById(`teamName${team.index}`));
  });
  showError(`Duplicate team names: ${duplicates.map(t => t.name).join(', ')}`);
}
```

#### After:
```javascript
const duplicates = findDuplicates(teamNames);
if (duplicates.length > 0) {
  const errors = duplicates.map(team => ({
    field: `teamName${team.index}`,
    messageKey: 'duplicateTeamName',
    params: { 
      num: team.index,
      category: team.category 
    }
  }));
  
  if (window.errorSystem) {
    window.errorSystem.showFormErrors(errors, {
      containerId: 'teamForm',
      scrollTo: true
    });
  }
}
```

### Pattern 3: Conditional Validation

#### Before:
```javascript
if (requiresPhone && !phone.value.trim()) {
  highlightField(phone);
  showError('Phone number is required');
  return false;
}
```

#### After:
```javascript
if (requiresPhone && !phone.value.trim()) {
  if (window.errorSystem) {
    window.errorSystem.showFieldError('phone', 'phoneRequired', {
      scrollTo: true
    });
  }
  return false;
}
```

### Pattern 4: Quantity Validation

#### Before:
```javascript
const quantity = parseInt(input.value, 10);
if (quantity < 0) {
  highlightField(input);
  showError('Quantity must be positive');
} else if (quantity > maxQty) {
  highlightField(input);
  showError(`Quantity cannot exceed ${maxQty}`);
}
```

#### After:
```javascript
const quantity = parseInt(input.value, 10);
if (quantity < 0) {
  if (window.errorSystem) {
    window.errorSystem.showFieldError(input.id, 'quantityMustBePositive');
  }
} else if (quantity > maxQty) {
  if (window.errorSystem) {
    window.errorSystem.showFieldError(input.id, 'quantityExceedsMax', {
      params: { max: maxQty }
    });
  }
}
```

---

## Code Examples

### Complete Form Validation Example

#### Before:
```javascript
function validateRegistrationForm() {
  clearFieldHighlighting();
  const missingFields = [];
  
  // Validate email
  const email = document.getElementById('email');
  if (!email.value.trim()) {
    missingFields.push('Email');
    highlightField(email);
  } else if (!isValidEmail(email.value)) {
    showError('Invalid email format');
    highlightField(email);
    return false;
  }
  
  // Validate phone
  const phone = document.getElementById('phone');
  if (!phone.value.trim()) {
    missingFields.push('Phone');
    highlightField(phone);
  } else if (!isValidHKPhone(phone.value)) {
    showError('Invalid phone format');
    highlightField(phone);
    return false;
  }
  
  // Show errors
  if (missingFields.length > 0) {
    showError(`Please complete: ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
}
```

#### After:
```javascript
function validateRegistrationForm() {
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  // Validate email
  const email = document.getElementById('email');
  if (!email.value.trim()) {
    errors.push({ field: 'email', messageKey: 'emailRequired' });
  } else if (!isValidEmail(email.value)) {
    errors.push({ field: 'email', messageKey: 'invalidEmail' });
  }
  
  // Validate phone
  const phone = document.getElementById('phone');
  if (!phone.value.trim()) {
    errors.push({ field: 'phone', messageKey: 'phoneRequired' });
  } else if (!isValidHKPhone(phone.value)) {
    errors.push({ field: 'phone', messageKey: 'invalidPhone' });
  }
  
  // Show errors if any
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'registrationForm',
        scrollTo: true
      });
    } else {
      alert('Please fix the errors in the form');
    }
    return false;
  }
  
  return true;
}
```

### API Error Handling Example

#### Before:
```javascript
async function submitForm() {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        showError('Too many requests. Please wait and try again.');
      } else if (response.status >= 500) {
        showError('Server error. Please try again later.');
      } else {
        showError('Submission failed. Please try again.');
      }
      return;
    }
    
    // Success...
  } catch (error) {
    showError('Network error. Please check your connection.');
  }
}
```

#### After:
```javascript
async function submitForm() {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      if (window.errorSystem) {
        if (response.status === 429) {
          window.errorSystem.showSystemError('rateLimitExceeded', {
            persistent: true,
            dismissible: true
          });
        } else if (response.status >= 500) {
          window.errorSystem.showSystemError('serverErrorDetailed', {
            dismissible: true
          });
        } else if (response.status === 409) {
          window.errorSystem.showSystemError('duplicateRegistration', {
            dismissible: true
          });
        } else {
          window.errorSystem.showSystemError('serverErrorDetailed', {
            dismissible: true
          });
        }
      } else {
        alert('Submission failed. Please try again.');
      }
      return;
    }
    
    // Success...
  } catch (error) {
    if (window.errorSystem) {
      window.errorSystem.showSystemError('networkErrorDetailed', {
        dismissible: true
      });
    } else {
      alert('Network error. Please check your connection.');
    }
  }
}
```

---

## Troubleshooting

### Problem: Errors Not Displaying

**Symptoms:** Error system methods are called but no errors appear

**Solutions:**
1. Check that `error-system.css` is loaded
2. Verify field IDs match between HTML and JavaScript
3. Check browser console for warnings
4. Ensure error message divs exist in HTML (or are created dynamically)
5. Verify `window.errorSystem` is available

### Problem: Error Messages Not Translated

**Symptoms:** Translation keys shown instead of messages

**Solutions:**
1. Verify `window.i18n` is available and initialized
2. Check that translation keys exist in `translations.js`
3. Verify i18n system is loaded before error system
4. Check browser console for translation errors

### Problem: Errors Not Clearing

**Symptoms:** Errors persist after fixing fields

**Solutions:**
1. Ensure `clearFormErrors()` is called before new validation
2. Check that real-time validation is properly bound
3. Verify `clearOnInput: true` in `bindFieldValidation()` options
4. Check for JavaScript errors preventing cleanup

### Problem: Form Summary Not Appearing

**Symptoms:** Multiple errors but no summary shown

**Solutions:**
1. Verify at least 2 errors are in the array
2. Check that `containerId` is correct or container can be auto-detected
3. Verify container element exists in DOM
4. Check browser console for warnings

### Problem: System Error Not Dismissing

**Symptoms:** System error stays visible

**Solutions:**
1. Check `persistent` option (should be `false` for auto-dismiss)
2. Verify `autoDismiss` value is greater than 0
3. Check for JavaScript errors preventing timer
4. Manually dismiss with close button

### Problem: Performance Issues

**Symptoms:** Slow error display or page lag

**Solutions:**
1. Ensure error system is using latest version with optimizations
2. Check for excessive error system calls
3. Verify debouncing is enabled for real-time validation
4. Check browser performance profiler

### Problem: Accessibility Issues

**Symptoms:** Screen readers not announcing errors

**Solutions:**
1. Verify ARIA attributes are set (`aria-invalid`, `aria-describedby`)
2. Check that error elements have `role="alert"` or `aria-live`
3. Test with screen reader (NVDA, JAWS, VoiceOver)
4. Verify keyboard navigation works

---

## Migration Best Practices

### 1. Migrate Incrementally

Don't migrate everything at once. Start with one form or one validation function, test it, then move to the next.

### 2. Keep Fallbacks

Always provide fallback behavior when `window.errorSystem` is not available:

```javascript
if (window.errorSystem) {
  window.errorSystem.showFormErrors(errors);
} else {
  // Fallback
  alert('Please fix the errors in the form');
}
```

### 3. Test Thoroughly

Test all error scenarios:
- Single field errors
- Multiple field errors
- Real-time validation
- API errors
- Network errors
- Edge cases

### 4. Verify i18n

Ensure all error messages are translated:
- Add keys to `translations.js`
- Test in both languages
- Verify parameters work correctly

### 5. Check Accessibility

Test with:
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard navigation
- Focus management
- ARIA announcements

---

## Post-Migration Cleanup

After successful migration, you can optionally:

1. **Remove Legacy Functions** - Delete old `showError()`, `highlightField()`, `clearFieldHighlighting()` functions
2. **Remove Legacy CSS** - Remove old error styling if no longer needed
3. **Update Documentation** - Update any internal documentation referencing old error system

**Note:** Keep fallback functions if you want backward compatibility during transition period.

---

## See Also

- **[API Reference](ERROR_SYSTEM_API.md)** - Complete method documentation
- **[README](ERROR_SYSTEM_README.md)** - Overview and quick start
- **[Styling Guide](ERROR_SYSTEM_STYLING.md)** - Customize appearance
- **[Accessibility Guide](ERROR_SYSTEM_ACCESSIBILITY.md)** - A11y features and testing
