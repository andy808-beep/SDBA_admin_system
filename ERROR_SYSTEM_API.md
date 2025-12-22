# Error System - Complete API Reference

## Table of Contents

1. [ErrorSystem Class](#errorsystem-class)
2. [Field-Level Errors](#field-level-errors)
3. [Form-Level Errors](#form-level-errors)
4. [System-Level Errors](#system-level-errors)
5. [Validation Binding](#validation-binding)
6. [Utility Methods](#utility-methods)
7. [Error Types Reference](#error-types-reference)
8. [CSS Classes Reference](#css-classes-reference)
9. [i18n Message Keys](#i18n-message-keys)

---

## ErrorSystem Class

### Singleton Instance

The ErrorSystem is a singleton instance available globally:

```javascript
// Global access
window.errorSystem

// ES6 module import
import errorSystem from './js/error-system.js';
```

### Constructor

```javascript
const errorSystem = new ErrorSystem();
```

**Note:** The singleton instance is created automatically. You should use `window.errorSystem` instead of creating new instances.

---

## Field-Level Errors

### `showFieldError(fieldId, messageKey, options)`

Display an inline error message for a specific form field.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `fieldId` | `string` | Yes | - | ID of the form field element |
| `messageKey` | `string` | Yes | - | Translation key for error message |
| `options` | `Object` | No | `{}` | Additional options (see below) |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `params` | `Object` | `{}` | Parameters for message translation |
| `scrollTo` | `boolean` | `false` | Whether to scroll to the field |
| `focus` | `boolean` | `false` | Whether to focus the field |
| `containerId` | `string` | `null` | Container ID for error message (defaults to field's parent) |

#### Returns

`boolean` - `true` if error was shown, `false` if field not found

#### Examples

```javascript
// Basic field error
errorSystem.showFieldError('email', 'invalidEmail');

// With parameters
errorSystem.showFieldError('quantity', 'quantityExceedsMax', {
  params: { max: 10 }
});

// With scroll and focus
errorSystem.showFieldError('username', 'usernameRequired', {
  scrollTo: true,
  focus: true
});

// Custom container
errorSystem.showFieldError('email', 'invalidEmail', {
  containerId: 'emailContainer'
});
```

#### Behavior

- Adds `.field-error` class to the field
- Sets `aria-invalid="true"` on the field
- Creates or updates error message div with ID `error-{fieldId}`
- Sets `aria-describedby` on the field to reference error message
- Scrolls to field if `scrollTo: true`
- Focuses field if `focus: true`

---

### `clearFieldError(fieldId)`

Remove error display for a specific field.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fieldId` | `string` | Yes | ID of the form field |

#### Returns

`boolean` - `true` if error was cleared, `false` if field not found or had no error

#### Examples

```javascript
// Clear single field error
errorSystem.clearFieldError('email');

// Clear after validation passes
if (isValidEmail(email.value)) {
  errorSystem.clearFieldError('email');
}
```

#### Behavior

- Removes `.field-error` class from field
- Removes `aria-invalid` attribute
- Removes error message div from DOM
- Cleans up `aria-describedby` reference
- Removes event listeners if validation was bound
- Clears debounce timers

---

## Form-Level Errors

### `showFormErrors(errors, options)`

Display multiple field errors and optionally show a form error summary.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `errors` | `Array<Object>` | Yes | - | Array of error objects |
| `options` | `Object` | No | `{}` | Additional options (see below) |

#### Error Object Structure

```javascript
{
  field: string | HTMLElement,  // Field ID or element
  messageKey: string,            // Translation key
  params: Object                 // Optional parameters for translation
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerId` | `string` | `null` | Container ID to insert summary (defaults to form) |
| `scrollTo` | `boolean` | `true` | Whether to scroll to summary |
| `titleKey` | `string` | `'formErrorsTitle'` | Translation key for summary title |

#### Returns

`boolean` - `true` if errors were shown, `false` if errors array is empty

#### Examples

```javascript
// Multiple field errors
const errors = [
  { field: 'email', messageKey: 'invalidEmail' },
  { field: 'phone', messageKey: 'invalidPhone' },
  { field: 'name', messageKey: 'nameRequired' }
];

errorSystem.showFormErrors(errors, {
  containerId: 'registrationForm',
  scrollTo: true
});

// With parameters
const errors = [
  { 
    field: 'quantity', 
    messageKey: 'quantityExceedsMax',
    params: { max: 10 }
  }
];

errorSystem.showFormErrors(errors);

// Using field elements
const emailField = document.getElementById('email');
const errors = [
  { field: emailField, messageKey: 'invalidEmail' }
];

errorSystem.showFormErrors(errors);
```

#### Behavior

- Clears existing form error summary
- Shows individual field errors for each error in array
- If 2+ errors, creates form error summary at top of container
- Summary includes clickable links to each error field
- Clicking link scrolls to and focuses the field
- Summary is dismissible with close button
- Uses batch DOM updates for performance

---

### `clearFormErrorSummary()`

Remove the form error summary (but not individual field errors).

#### Returns

`boolean` - `true` if summary was cleared, `false` if no summary existed

#### Examples

```javascript
// Clear summary only
errorSystem.clearFormErrorSummary();

// Clear summary when form is reset
function resetForm() {
  errorSystem.clearFormErrorSummary();
  // ... reset form fields
}
```

---

### `clearFormErrors()`

Clear all form errors (summary + all field errors).

#### Returns

`void`

#### Examples

```javascript
// Clear all errors
errorSystem.clearFormErrors();

// Clear before new validation
function validateForm() {
  errorSystem.clearFormErrors();
  // ... perform validation
  if (errors.length > 0) {
    errorSystem.showFormErrors(errors);
  }
}
```

---

## System-Level Errors

### `showSystemError(messageKey, options)`

Display a system-level error notification (API errors, network issues, etc.).

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `messageKey` | `string` | Yes | - | Translation key for error message |
| `options` | `Object` | No | `{}` | Additional options (see below) |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `params` | `Object` | `{}` | Parameters for message translation |
| `titleKey` | `string` | `'systemErrorTitle'` | Translation key for title |
| `persistent` | `boolean` | `false` | Whether error should persist (no auto-dismiss) |
| `autoDismiss` | `number` | `10000` | Auto-dismiss timeout in milliseconds (0 = no auto-dismiss) |
| `dismissible` | `boolean` | `true` | Whether error can be dismissed (always true) |

#### Returns

`boolean` - `true` if error was shown

#### Examples

```javascript
// Basic system error
errorSystem.showSystemError('networkErrorDetailed');

// Persistent error (no auto-dismiss)
errorSystem.showSystemError('rateLimitExceeded', {
  persistent: true,
  dismissible: true
});

// Custom auto-dismiss time
errorSystem.showSystemError('serverErrorDetailed', {
  autoDismiss: 15000
});

// With parameters
errorSystem.showSystemError('serverErrorDetailed', {
  params: { status: 500 }
});
```

#### Behavior

- Clears existing system error
- Creates notification at top of page
- Shows icon, message, and close button
- Auto-dismisses after timeout (if not persistent)
- Smooth slide-in animation
- Accessible with ARIA attributes

---

### `clearSystemError()`

Remove the system error notification.

#### Returns

`boolean` - `true` if error was cleared, `false` if no error existed

#### Examples

```javascript
// Clear system error
errorSystem.clearSystemError();

// Clear before showing new error
errorSystem.clearSystemError();
errorSystem.showSystemError('newError');
```

#### Behavior

- Clears auto-dismiss timer
- Smooth fade-out animation
- Removes element from DOM

---

## Validation Binding

### `bindFieldValidation(fieldId, validationFn, options)`

Bind real-time validation to a form field.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fieldId` | `string` | Yes | ID of the form field |
| `validationFn` | `Function` | Yes | Validation function (see below) |
| `options` | `Object` | No | Additional options (see below) |

#### Validation Function

The validation function receives the field value and element, and returns:

- `true`, `null`, or `undefined` - Field is valid (clears error)
- `string` - Error message key (shows error)
- `Object` - Error object with `{ messageKey, params?, scrollTo?, focus? }`

```javascript
function validationFn(value, field) {
  if (!value.trim()) {
    return 'fieldRequired';
  }
  if (value.length < 3) {
    return 'fieldTooShort';
  }
  return true; // Valid
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `validateOnBlur` | `boolean` | `true` | Validate on blur event |
| `clearOnInput` | `boolean` | `true` | Clear error on input event |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds |

#### Returns

`boolean` - `true` if binding was successful, `false` if field not found

#### Examples

```javascript
// Basic validation
errorSystem.bindFieldValidation('email', (value) => {
  if (!value.trim()) {
    return 'emailRequired';
  }
  if (!isValidEmail(value)) {
    return 'invalidEmail';
  }
  return true;
});

// With options
errorSystem.bindFieldValidation('email', (value) => {
  if (!isValidEmail(value)) {
    return 'invalidEmail';
  }
  return true;
}, {
  validateOnBlur: true,
  clearOnInput: true,
  debounceMs: 500
});

// Return error object
errorSystem.bindFieldValidation('quantity', (value) => {
  const num = parseInt(value, 10);
  if (num > 10) {
    return {
      messageKey: 'quantityExceedsMax',
      params: { max: 10 },
      scrollTo: true
    };
  }
  return true;
});

// Validate on input (not blur)
errorSystem.bindFieldValidation('username', (value) => {
  if (value.length < 3) {
    return 'usernameTooShort';
  }
  return true;
}, {
  validateOnBlur: false,
  clearOnInput: true,
  debounceMs: 300
});
```

#### Behavior

- Unbinds existing validation if any
- Validates on blur (immediate) or input (debounced)
- Clears error on input if `clearOnInput: true`
- Debounces input validation to reduce calls
- Properly cleans up event listeners on unbind

---

### `unbindFieldValidation(fieldId)`

Remove validation binding from a field.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fieldId` | `string` | Yes | ID of the form field |

#### Returns

`boolean` - `true` if validation was unbound, `false` if not bound

#### Examples

```javascript
// Unbind validation
errorSystem.unbindFieldValidation('email');

// Unbind before rebinding
errorSystem.unbindFieldValidation('email');
errorSystem.bindFieldValidation('email', newValidationFn);
```

#### Behavior

- Clears debounce timer
- Removes event listeners
- Removes validation function
- Does not clear existing errors

---

## Utility Methods

### `getMessage(key, params)`

Get translated error message.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `key` | `string` | Yes | - | Translation key |
| `params` | `Object` | No | `{}` | Parameters for translation |

#### Returns

`string` - Translated message or key as fallback

#### Examples

```javascript
// Get message
const message = errorSystem.getMessage('invalidEmail');

// With parameters
const message = errorSystem.getMessage('quantityExceedsMax', { max: 10 });
```

---

### `getErrors()`

Get all current field errors.

#### Returns

`Array<Object>` - Array of error objects with `{ fieldId, field, errorDiv, messageKey, params, message }`

#### Examples

```javascript
// Get all errors
const errors = errorSystem.getErrors();
console.log('Current errors:', errors);

// Check specific field
const emailError = errors.find(e => e.fieldId === 'email');
if (emailError) {
  console.log('Email error:', emailError.message);
}
```

---

### `hasError(fieldId)`

Check if a field has an error.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fieldId` | `string` | Yes | ID of the form field |

#### Returns

`boolean` - `true` if field has error, `false` otherwise

#### Examples

```javascript
// Check if field has error
if (errorSystem.hasError('email')) {
  console.log('Email field has an error');
}

// Conditional logic
if (!errorSystem.hasError('email') && !errorSystem.hasError('phone')) {
  submitForm();
}
```

---

### `getErrorCount()`

Get the number of current field errors.

#### Returns

`number` - Number of current errors

#### Examples

```javascript
// Get error count
const count = errorSystem.getErrorCount();
console.log(`Form has ${count} errors`);

// Conditional submission
if (errorSystem.getErrorCount() === 0) {
  submitForm();
}
```

---

## Error Types Reference

### When to Use Each Type

| Error Type | Use Case | Example |
|------------|----------|---------|
| **Field Error** | Single field validation | Email format, required field |
| **Form Summary** | Multiple validation errors (2+) | Form submission with multiple issues |
| **System Error** | API/network/server errors | Network failure, rate limit, server error |

### Error Type Comparison

| Feature | Field Error | Form Summary | System Error |
|---------|------------|-------------|--------------|
| **Location** | Next to field | Top of form | Top of page |
| **Auto-dismiss** | No | No | Yes (configurable) |
| **Dismissible** | Auto-clears on input | Yes (close button) | Yes (close button) |
| **Scroll** | Optional | Optional | No |
| **Focus** | Optional | Links focus fields | No |
| **Animation** | Instant | Fade-in | Slide-in/out |

---

## CSS Classes Reference

### Field-Level Classes

| Class | Applied To | Purpose |
|-------|------------|---------|
| `.field-error` | `input`, `select`, `textarea` | Highlights field with error |
| `.field-error-message` | Error message `div` | Styles error message text |

### Form Summary Classes

| Class | Applied To | Purpose |
|-------|------------|---------|
| `.form-error-summary` | Summary container `div` | Main summary container |
| `.error-summary-header` | Header `div` | Summary header with title and close button |
| `.error-list` | Error list `ul` | List of error links |
| `.error-close` | Close button `button` | Close button styling |

### System Error Classes

| Class | Applied To | Purpose |
|-------|------------|---------|
| `.system-error` | System error container `div` | Main system error container |
| `.system-error-content` | Content `div` | Icon and message container |
| `.system-error-icon` | Icon `span` | Warning icon |
| `.system-error-message` | Message `span` | Error message text |
| `.system-error-close` | Close button `button` | Close button styling |

### Legacy Classes

| Class | Applied To | Purpose |
|-------|------------|---------|
| `.invalid` | `input`, `select`, `textarea` | Legacy validation class (still used by validation.js) |

---

## i18n Message Keys

### System Keys

| Key | Default (EN) | Default (TC) | Description |
|-----|--------------|--------------|-------------|
| `systemErrorTitle` | "System Error" | "系統錯誤" | System error title |
| `formErrorsTitle` | "Please correct the following errors:" | "請更正以下錯誤：" | Form error summary title |
| `closeError` | "Close error" | "關閉錯誤" | Close button aria-label |
| `closeErrorSummary` | "Close error summary" | "關閉錯誤摘要" | Close summary button aria-label |

### Common Validation Keys

| Key | Typical Usage |
|-----|---------------|
| `emailRequired` | Required email field |
| `invalidEmail` | Invalid email format |
| `phoneRequired` | Required phone field |
| `invalidPhone` | Invalid phone format |
| `nameRequired` | Required name field |
| `quantityMustBePositive` | Quantity validation |
| `quantityExceedsMax` | Quantity max validation |

### Adding Custom Keys

Add keys to `public/js/i18n/translations.js`:

```javascript
const translations = {
  en: {
    // ... existing keys
    myCustomError: "Custom error message"
  },
  tc: {
    // ... existing keys
    myCustomError: "自定義錯誤訊息"
  }
};
```

---

## Performance Considerations

### DOM Element Caching

The error system caches frequently accessed DOM elements for faster lookups:

```javascript
// First lookup: DOM query
const field1 = errorSystem.getField('email'); // Queries DOM

// Subsequent lookups: Cache hit
const field2 = errorSystem.getField('email'); // Uses cache
```

### Batch DOM Updates

Form error summaries use DocumentFragment for batch DOM insertions:

```javascript
// All list items created in fragment
// Single DOM insertion
errorList.appendChild(fragment);
```

### Debounced Validation

Input validation is debounced to reduce function calls:

```javascript
// Typing "test" triggers validation once after 300ms pause
// Not on every keystroke
```

---

## Error Handling

### Field Not Found

If a field is not found, methods return `false` and log a warning:

```javascript
const result = errorSystem.showFieldError('nonexistent', 'error');
// Returns false
// Console: "ErrorSystem: Field not found: nonexistent"
```

### Translation Key Not Found

If a translation key is not found, the key itself is used as fallback:

```javascript
errorSystem.showFieldError('email', 'nonexistentKey');
// Displays: "nonexistentKey"
```

### Error System Not Available

Always check for error system availability:

```javascript
if (window.errorSystem) {
  window.errorSystem.showFormErrors(errors);
} else {
  // Fallback
  alert('Please fix the errors in the form');
}
```

---

## Complete Example

```javascript
// Real-time email validation
errorSystem.bindFieldValidation('email', (value) => {
  if (!value.trim()) {
    return 'emailRequired';
  }
  if (!isValidEmail(value)) {
    return 'invalidEmail';
  }
  return true;
}, {
  validateOnBlur: true,
  clearOnInput: true,
  debounceMs: 300
});

// Form submission validation
function submitForm() {
  // Clear previous errors
  errorSystem.clearFormErrors();
  
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
  }
  
  // Show errors if any
  if (errors.length > 0) {
    errorSystem.showFormErrors(errors, {
      containerId: 'myForm',
      scrollTo: true
    });
    return false;
  }
  
  // Submit form
  return true;
}

// API error handling
async function submitToAPI() {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        errorSystem.showSystemError('rateLimitExceeded', {
          persistent: true
        });
      } else if (response.status >= 500) {
        errorSystem.showSystemError('serverErrorDetailed');
      }
      return;
    }
    
    // Success...
  } catch (error) {
    errorSystem.showSystemError('networkErrorDetailed');
  }
}
```

---

## See Also

- **[README](ERROR_SYSTEM_README.md)** - Overview and quick start
- **[Migration Guide](ERROR_SYSTEM_MIGRATION.md)** - How to migrate from old system
- **[Styling Guide](ERROR_SYSTEM_STYLING.md)** - Customize appearance
- **[Accessibility Guide](ERROR_SYSTEM_ACCESSIBILITY.md)** - A11y features and testing
