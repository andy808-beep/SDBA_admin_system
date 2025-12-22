# Error System - Styling Customization Guide

## Table of Contents

1. [Overview](#overview)
2. [CSS Classes Reference](#css-classes-reference)
3. [Customization Examples](#customization-examples)
4. [Theme Integration](#theme-integration)
5. [Mobile Responsive Guidelines](#mobile-responsive-guidelines)
6. [Advanced Customization](#advanced-customization)

---

## Overview

The error system uses CSS classes for all styling. You can customize colors, fonts, spacing, animations, and more by overriding the default styles in `error-system.css` or adding custom CSS.

**Base CSS File:** `public/css/error-system.css`

---

## CSS Classes Reference

### Field-Level Error Classes

#### `.field-error`

Applied to form inputs, selects, and textareas when validation fails.

**Default Styles:**
```css
input.field-error,
select.field-error,
textarea.field-error {
  border: 2px solid #dc3545 !important;
  background-color: #fff5f5 !important;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2) !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
```

**Customization:**
```css
/* Custom color scheme */
input.field-error {
  border-color: #e74c3c !important;
  background-color: #fdf2f2 !important;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.3) !important;
}
```

#### `.field-error-message`

Applied to error message divs displayed below fields.

**Default Styles:**
```css
.field-error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}
```

**Customization:**
```css
.field-error-message {
  color: #e74c3c;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 0.5rem;
  padding-left: 0.5rem;
  border-left: 3px solid #e74c3c;
}
```

---

### Form Error Summary Classes

#### `.form-error-summary`

Main container for form error summary.

**Default Styles:**
```css
.form-error-summary {
  background-color: #fee;
  border: 2px solid #dc3545;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}
```

**Customization:**
```css
.form-error-summary {
  background: linear-gradient(135deg, #fff5f5 0%, #fee 100%);
  border: 2px solid #dc3545;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.15);
}
```

#### `.error-summary-header`

Header section with title and close button.

**Default Styles:**
```css
.error-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
```

**Customization:**
```css
.error-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(220, 53, 69, 0.2);
}
```

#### `.error-list`

List of error links.

**Default Styles:**
```css
.error-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
```

**Customization:**
```css
.error-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}
```

#### `.error-close`

Close button in error summary.

**Default Styles:**
```css
.error-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #dc3545;
}
```

**Customization:**
```css
.error-close {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  border-radius: 4px;
  font-size: 1.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  color: #dc3545;
  transition: all 0.2s;
}

.error-close:hover {
  background: rgba(220, 53, 69, 0.2);
}
```

---

### System Error Classes

#### `.system-error`

Main container for system error notification.

**Default Styles:**
```css
.system-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #dc3545;
  color: white;
  padding: 1rem;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

**Customization:**
```css
.system-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  padding: 1.25rem;
  z-index: 10000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-bottom: 3px solid rgba(255, 255, 255, 0.2);
}
```

#### `.system-error-content`

Content container with icon and message.

**Default Styles:**
```css
.system-error-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
```

**Customization:**
```css
.system-error-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}
```

#### `.system-error-icon`

Warning icon.

**Default Styles:**
```css
.system-error-icon {
  font-size: 1.5rem;
}
```

**Customization:**
```css
.system-error-icon {
  font-size: 1.75rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}
```

#### `.system-error-message`

Error message text.

**Default Styles:**
```css
.system-error-message {
  flex: 1;
}
```

**Customization:**
```css
.system-error-message {
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
}
```

#### `.system-error-close`

Close button in system error.

**Default Styles:**
```css
.system-error-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
```

**Customization:**
```css
.system-error-close {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.system-error-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}
```

---

## Customization Examples

### Example 1: Custom Color Scheme

Create a custom color scheme for errors:

```css
/* Custom error colors */
:root {
  --error-color: #e74c3c;
  --error-bg: #fdf2f2;
  --error-border: #e74c3c;
  --error-shadow: rgba(231, 76, 60, 0.2);
}

/* Field errors */
input.field-error,
select.field-error,
textarea.field-error {
  border-color: var(--error-border) !important;
  background-color: var(--error-bg) !important;
  box-shadow: 0 0 0 2px var(--error-shadow) !important;
}

.field-error-message {
  color: var(--error-color);
}

/* Form summary */
.form-error-summary {
  background-color: var(--error-bg);
  border-color: var(--error-border);
}

/* System error */
.system-error {
  background-color: var(--error-color);
}
```

### Example 2: Rounded Corners and Shadows

Add modern styling with rounded corners and shadows:

```css
/* Field errors */
input.field-error,
select.field-error,
textarea.field-error {
  border-radius: 6px !important;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.15) !important;
}

.field-error-message {
  border-radius: 4px;
  padding: 0.5rem;
  background-color: rgba(220, 53, 69, 0.05);
}

/* Form summary */
.form-error-summary {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.15);
}

/* System error */
.system-error {
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
```

### Example 3: Icon-Based Error Messages

Add icons to error messages:

```css
.field-error-message::before {
  content: "⚠️";
  margin-right: 0.5rem;
  font-size: 1rem;
}

.form-error-summary::before {
  content: "⚠️";
  font-size: 1.5rem;
  margin-right: 0.75rem;
  display: inline-block;
}
```

### Example 4: Animated Error Appearance

Add custom animations:

```css
/* Fade-in animation for field errors */
.field-error-message {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide-in animation for form summary */
.form-error-summary {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Example 5: Compact Mobile Styling

Optimize for mobile devices:

```css
@media (max-width: 768px) {
  .field-error-message {
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  
  .form-error-summary {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .error-summary-header h3 {
    font-size: 1rem;
  }
  
  .system-error {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .system-error-content {
    gap: 0.5rem;
  }
  
  .system-error-icon {
    font-size: 1.25rem;
  }
}
```

---

## Theme Integration

### Dark Mode Support

Add dark mode styles:

```css
@media (prefers-color-scheme: dark) {
  /* Field errors */
  input.field-error,
  select.field-error,
  textarea.field-error {
    border-color: #ff6b6b !important;
    background-color: rgba(255, 107, 107, 0.1) !important;
    box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3) !important;
  }
  
  .field-error-message {
    color: #ff6b6b;
  }
  
  /* Form summary */
  .form-error-summary {
    background-color: rgba(255, 107, 107, 0.15);
    border-color: #ff6b6b;
    color: #fff;
  }
  
  /* System error */
  .system-error {
    background-color: #c82333;
    color: #fff;
  }
}
```

### Brand Color Integration

Use your brand's error color:

```css
/* Replace default red with brand color */
:root {
  --brand-error: #ff4444; /* Your brand's error color */
}

input.field-error {
  border-color: var(--brand-error) !important;
}

.field-error-message {
  color: var(--brand-error);
}

.form-error-summary {
  border-color: var(--brand-error);
  background-color: rgba(255, 68, 68, 0.1);
}

.system-error {
  background-color: var(--brand-error);
}
```

---

## Mobile Responsive Guidelines

### Breakpoints

Use these breakpoints for responsive design:

```css
/* Mobile */
@media (max-width: 576px) {
  .form-error-summary {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .system-error {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
}

/* Tablet */
@media (min-width: 577px) and (max-width: 768px) {
  .form-error-summary {
    padding: 1rem;
  }
}

/* Desktop */
@media (min-width: 769px) {
  .form-error-summary {
    padding: 1.25rem;
  }
}
```

### Touch-Friendly Targets

Ensure buttons are large enough for touch:

```css
.error-close,
.system-error-close {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Readable Text Sizes

Maintain readable text on mobile:

```css
@media (max-width: 576px) {
  .field-error-message {
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  .form-error-summary h3 {
    font-size: 1rem;
  }
  
  .system-error-message {
    font-size: 0.9rem;
    line-height: 1.6;
  }
}
```

---

## Advanced Customization

### Custom Error Icons

Replace emoji icons with custom icons:

```css
.system-error-icon::before {
  content: "";
  display: inline-block;
  width: 20px;
  height: 20px;
  background-image: url('icons/warning.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.system-error-icon {
  font-size: 0; /* Hide emoji */
}
```

### Gradient Backgrounds

Add gradient backgrounds:

```css
.form-error-summary {
  background: linear-gradient(135deg, #fff5f5 0%, #fee 100%);
  border: 2px solid #dc3545;
}

.system-error {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
}
```

### Custom Typography

Use custom fonts:

```css
.field-error-message {
  font-family: 'Custom Font', sans-serif;
  font-weight: 500;
  letter-spacing: 0.025em;
}

.form-error-summary h3 {
  font-family: 'Custom Font', sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
}
```

### Print Styles

Hide errors in print:

```css
@media print {
  .field-error-message,
  .form-error-summary,
  .system-error {
    display: none !important;
  }
}
```

---

## CSS Variables

You can use CSS variables for easy theming:

```css
:root {
  /* Error colors */
  --error-primary: #dc3545;
  --error-bg: #fff5f5;
  --error-border: #dc3545;
  --error-shadow: rgba(220, 53, 69, 0.2);
  
  /* Spacing */
  --error-spacing: 1rem;
  --error-spacing-sm: 0.5rem;
  
  /* Typography */
  --error-font-size: 0.875rem;
  --error-font-weight: 400;
  
  /* Borders */
  --error-border-radius: 4px;
  --error-border-width: 2px;
}

/* Use variables */
input.field-error {
  border-color: var(--error-border) !important;
  background-color: var(--error-bg) !important;
  border-radius: var(--error-border-radius);
}

.field-error-message {
  font-size: var(--error-font-size);
  margin-top: var(--error-spacing-sm);
}
```

---

## Best Practices

### 1. Maintain Contrast

Ensure error text meets WCAG contrast requirements:

```css
/* Minimum contrast ratio 4.5:1 for normal text */
.field-error-message {
  color: #dc3545; /* Good contrast on white */
}

/* Minimum contrast ratio 3:1 for large text */
.form-error-summary h3 {
  color: #721c24; /* Darker for better contrast */
}
```

### 2. Use !important Sparingly

Only use `!important` when necessary (field error classes need it to override other styles):

```css
/* ✅ Good - needed to override other styles */
input.field-error {
  border-color: #dc3545 !important;
}

/* ❌ Bad - not needed */
.field-error-message {
  color: #dc3545 !important; /* Remove !important */
}
```

### 3. Test on Multiple Devices

Always test customizations on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS, Android)
- Different screen sizes
- Different zoom levels

### 4. Maintain Accessibility

Don't break accessibility when customizing:
- Maintain sufficient color contrast
- Keep focus indicators visible
- Don't hide error messages
- Ensure text is readable

---

## See Also

- **[API Reference](ERROR_SYSTEM_API.md)** - Complete method documentation
- **[README](ERROR_SYSTEM_README.md)** - Overview and quick start
- **[Migration Guide](ERROR_SYSTEM_MIGRATION.md)** - How to migrate from old system
- **[Accessibility Guide](ERROR_SYSTEM_ACCESSIBILITY.md)** - A11y features and testing
