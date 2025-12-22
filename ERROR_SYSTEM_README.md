# Unified Error System - Overview

## 📖 What is the Unified Error System?

The Unified Error System is a centralized, accessible, and performant solution for displaying and managing errors across all forms in the application. It provides consistent error handling patterns, smooth animations, and full accessibility support.

**Version:** 2.0.0  
**Module:** `public/js/error-system.js`  
**CSS:** `public/css/error-system.css`

---

## ✨ Key Features

### 🎯 Three Types of Error Display

1. **Field-Level Errors** - Inline validation errors next to form fields
2. **Form-Level Error Summaries** - Overview of all errors at the top of forms (2+ errors)
3. **System-Level Errors** - Global notifications for API errors, network issues, etc.

### 🚀 Performance Optimizations

- **DOM Element Caching** - Faster field lookups
- **Batch DOM Updates** - Fewer reflows with DocumentFragment
- **Debounced Validation** - Reduces validation calls during typing
- **RequestAnimationFrame** - Smooth 60fps animations
- **Event Listener Cleanup** - Prevents memory leaks

### ♿ Accessibility Features

- **ARIA Attributes** - Full screen reader support
- **Keyboard Navigation** - All errors are keyboard accessible
- **Focus Management** - Automatic focus on first error
- **Live Regions** - Dynamic error announcements

### 🌐 Internationalization

- **i18n Integration** - All messages use translation keys
- **Parameter Support** - Dynamic values in error messages
- **Fallback Support** - Works without i18n system

---

## 🚀 Quick Start

### 1. Include the Files

The error system is already included in `register.html`:

```html
<!-- CSS -->
<link rel="stylesheet" href="css/error-system.css?v=1.0.0-mj5lf93y" />

<!-- JavaScript -->
<script type="module" src="./js/error-system.js?v=1.0.0-mj5lf93y"></script>
```

### 2. Basic Usage

#### Show a Single Field Error

```javascript
window.errorSystem.showFieldError('email', 'invalidEmail', {
  scrollTo: true,
  focus: true
});
```

#### Show Multiple Form Errors

```javascript
const errors = [
  { field: 'email', messageKey: 'invalidEmail' },
  { field: 'phone', messageKey: 'invalidPhone' },
  { field: 'name', messageKey: 'nameRequired' }
];

window.errorSystem.showFormErrors(errors, {
  containerId: 'myForm',
  scrollTo: true
});
```

#### Show System Error

```javascript
window.errorSystem.showSystemError('networkErrorDetailed', {
  persistent: false,
  autoDismiss: 10000
});
```

#### Real-Time Validation

```javascript
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
```

---

## 📚 Documentation Structure

- **[API Reference](ERROR_SYSTEM_API.md)** - Complete method documentation
- **[Migration Guide](ERROR_SYSTEM_MIGRATION.md)** - How to migrate from old system
- **[Styling Guide](ERROR_SYSTEM_STYLING.md)** - Customize appearance
- **[Accessibility Guide](ERROR_SYSTEM_ACCESSIBILITY.md)** - A11y features and testing

---

## 🎨 Error Types Overview

### Field-Level Errors

**When to use:** Individual field validation errors

```javascript
// Single field error
errorSystem.showFieldError('username', 'usernameRequired');

// Clear field error
errorSystem.clearFieldError('username');

// Clear all field errors
errorSystem.clearFormErrors();
```

**Visual:** Red border, light red background, error message below field

---

### Form-Level Error Summaries

**When to use:** Multiple validation errors (2+)

```javascript
const errors = [
  { field: 'email', messageKey: 'invalidEmail' },
  { field: 'phone', messageKey: 'invalidPhone' }
];

errorSystem.showFormErrors(errors, {
  containerId: 'registrationForm',
  scrollTo: true
});
```

**Visual:** Summary box at top of form with clickable error links

**Behavior:**
- Automatically shown when 2+ errors
- Clicking error link scrolls to and focuses the field
- Dismissible with close button

---

### System-Level Errors

**When to use:** API errors, network issues, server errors

```javascript
// Network error
errorSystem.showSystemError('networkErrorDetailed', {
  dismissible: true
});

// Rate limit (persistent)
errorSystem.showSystemError('rateLimitExceeded', {
  persistent: true,
  dismissible: true
});

// Server error
errorSystem.showSystemError('serverErrorDetailed', {
  autoDismiss: 15000
});
```

**Visual:** Fixed notification at top of page with icon and close button

**Behavior:**
- Auto-dismisses after 10 seconds (configurable)
- Can be persistent (no auto-dismiss)
- Smooth slide-in/out animations

---

## 🔧 Common Patterns

### Form Validation on Submit

```javascript
function validateForm() {
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
    window.errorSystem.showFormErrors(errors, {
      containerId: 'myForm',
      scrollTo: true
    });
    return false;
  }
  
  return true;
}
```

### Real-Time Email Validation

```javascript
window.errorSystem.bindFieldValidation('email', (value) => {
  if (!value.trim()) {
    return 'emailRequired';
  }
  if (!isValidEmail(value)) {
    return 'invalidEmail';
  }
  return true; // Valid - clears error
}, {
  validateOnBlur: true,
  clearOnInput: true,
  debounceMs: 300
});
```

### API Error Handling

```javascript
try {
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
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
    }
    return;
  }
  
  // Success handling...
} catch (error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    window.errorSystem.showSystemError('networkErrorDetailed', {
      dismissible: true
    });
  }
}
```

---

## 🎯 Best Practices

### 1. Use i18n Keys

Always use translation keys, never hardcoded messages:

```javascript
// ✅ Good
errorSystem.showFieldError('email', 'invalidEmail');

// ❌ Bad
errorSystem.showFieldError('email', 'Invalid email address');
```

### 2. Clear Errors Before Showing New Ones

```javascript
// Clear existing errors
errorSystem.clearFormErrors();

// Show new errors
errorSystem.showFormErrors(errors);
```

### 3. Use Appropriate Error Types

- **Field errors** - Individual field validation
- **Form summaries** - Multiple validation errors
- **System errors** - API/network/server issues

### 4. Provide Error Context

Use parameters for dynamic messages:

```javascript
errorSystem.showFieldError('quantity', 'quantityExceedsMax', {
  params: { max: 10 }
});
```

### 5. Handle Error System Availability

```javascript
if (window.errorSystem) {
  window.errorSystem.showFormErrors(errors);
} else {
  // Fallback to alert
  alert('Please fix the errors in the form');
}
```

---

## 🔍 Checking for Errors

```javascript
// Check if field has error
if (errorSystem.hasError('email')) {
  console.log('Email field has an error');
}

// Get all errors
const allErrors = errorSystem.getErrors();
console.log('Current errors:', allErrors);

// Get error count
const count = errorSystem.getErrorCount();
console.log(`Form has ${count} errors`);
```

---

## 📦 Dependencies

- **i18n System** - Optional (falls back to keys if not available)
- **Modern Browser** - ES6+ support required
- **CSS Support** - CSS3 transitions and animations

---

## 🐛 Troubleshooting

### Error System Not Available

**Problem:** `window.errorSystem` is undefined

**Solution:**
1. Check that `error-system.js` is loaded in HTML
2. Check browser console for JavaScript errors
3. Ensure script is loaded before using it

### Errors Not Displaying

**Problem:** Errors are created but not visible

**Solution:**
1. Check that `error-system.css` is loaded
2. Verify field IDs are correct
3. Check browser console for warnings
4. Ensure error message divs exist in HTML (or are created dynamically)

### Translations Not Working

**Problem:** Translation keys shown instead of messages

**Solution:**
1. Verify `window.i18n` is available
2. Check that translation keys exist in `translations.js`
3. Verify i18n system is initialized before error system

---

## 📖 Next Steps

- Read the **[Complete API Reference](ERROR_SYSTEM_API.md)** for all methods and options
- Follow the **[Migration Guide](ERROR_SYSTEM_MIGRATION.md)** to migrate existing code
- Customize styling with the **[Styling Guide](ERROR_SYSTEM_STYLING.md)**
- Test accessibility with the **[Accessibility Guide](ERROR_SYSTEM_ACCESSIBILITY.md)**

---

## 📝 Version History

- **v2.0.0** - Unified error system with performance optimizations
- **v1.0.0** - Initial implementation

---

## 🤝 Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.
