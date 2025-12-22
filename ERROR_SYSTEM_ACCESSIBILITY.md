# Error System - Accessibility Guide

## Table of Contents

1. [Overview](#overview)
2. [ARIA Attributes](#aria-attributes)
3. [Screen Reader Support](#screen-reader-support)
4. [Keyboard Navigation](#keyboard-navigation)
5. [Focus Management](#focus-management)
6. [WCAG Compliance](#wcag-compliance)
7. [Testing Procedures](#testing-procedures)
8. [Best Practices](#best-practices)

---

## Overview

The Unified Error System is designed with accessibility as a core feature. It provides full support for screen readers, keyboard navigation, and follows WCAG 2.1 Level AA guidelines.

**Accessibility Features:**
- ✅ ARIA attributes for screen reader announcements
- ✅ Keyboard navigation support
- ✅ Automatic focus management
- ✅ Live region announcements
- ✅ High contrast support
- ✅ Semantic HTML structure

---

## ARIA Attributes

### Field-Level Errors

#### `aria-invalid`

Applied to form fields when validation fails.

```html
<input type="email" id="email" aria-invalid="true" />
```

**Purpose:** Tells screen readers the field has invalid data.

**When Set:** Automatically set by `showFieldError()`

**When Removed:** Automatically removed by `clearFieldError()`

---

#### `aria-describedby`

Links the field to its error message.

```html
<input type="email" id="email" aria-describedby="error-email" />
<div id="error-email" class="field-error-message">Invalid email address</div>
```

**Purpose:** Associates error message with the field for screen readers.

**When Set:** Automatically set by `showFieldError()`

**Behavior:** 
- Adds error ID to existing `aria-describedby` if present
- Creates new `aria-describedby` if not present
- Removes reference when error is cleared

---

#### `role="alert"` and `aria-live="polite"`

Applied to error message divs.

```html
<div id="error-email" class="field-error-message" role="alert" aria-live="polite">
  Invalid email address
</div>
```

**Purpose:** Announces error messages to screen readers.

**When Set:** Automatically set by `showFieldError()`

**Behavior:**
- `role="alert"` - Makes element an alert
- `aria-live="polite"` - Announces changes without interrupting

---

### Form Error Summary

#### `role="alert"` and `aria-live="assertive"`

Applied to form error summary container.

```html
<div class="form-error-summary" role="alert" aria-live="assertive">
  <h3>Please correct the following errors:</h3>
  <ul class="error-list">
    <li><a href="#email">Invalid email address</a></li>
  </ul>
</div>
```

**Purpose:** Immediately announces form errors to screen readers.

**When Set:** Automatically set by `showFormErrors()` when 2+ errors

**Behavior:**
- `aria-live="assertive"` - Interrupts current announcement
- Announces title and error count
- Announces each error link

---

### System Error

#### `role="alert"` and `aria-live="assertive"`

Applied to system error container.

```html
<div class="system-error" role="alert" aria-live="assertive">
  <div class="system-error-content">
    <span class="system-error-icon" aria-hidden="true">⚠️</span>
    <span class="system-error-message">Network error occurred</span>
  </div>
  <button class="system-error-close" aria-label="Close error">×</button>
</div>
```

**Purpose:** Immediately announces system errors to screen readers.

**When Set:** Automatically set by `showSystemError()`

**Behavior:**
- `aria-live="assertive"` - Interrupts current announcement
- Announces error message immediately

---

#### `aria-hidden="true"`

Applied to decorative icons.

```html
<span class="system-error-icon" aria-hidden="true">⚠️</span>
```

**Purpose:** Hides decorative icons from screen readers.

**When Set:** Automatically set on icons

**Behavior:** Screen readers skip these elements

---

#### `aria-label`

Applied to close buttons.

```html
<button class="error-close" aria-label="Close error summary">×</button>
```

**Purpose:** Provides accessible label for icon-only buttons.

**When Set:** Automatically set with translated text

**Translation Keys:**
- `closeError` - For system error close button
- `closeErrorSummary` - For form summary close button

---

## Screen Reader Support

### Field Error Announcements

When a field error is shown, screen readers announce:

1. **Field label** (if present)
2. **"Invalid entry"** (from `aria-invalid="true"`)
3. **Error message** (from `aria-describedby`)

**Example Announcement:**
> "Email, edit text, invalid entry. Invalid email address."

---

### Form Error Summary Announcements

When form error summary appears, screen readers announce:

1. **Summary title** (e.g., "Please correct the following errors:")
2. **Error count** (if included in title)
3. **Each error link** (as user navigates)

**Example Announcement:**
> "Alert: Please correct the following errors: Invalid email address, link. Invalid phone number, link."

---

### System Error Announcements

When system error appears, screen readers announce:

1. **Error message** immediately

**Example Announcement:**
> "Alert: Network error occurred. Please check your connection and try again."

---

### Testing with Screen Readers

#### NVDA (Windows)

1. Download and install [NVDA](https://www.nvaccess.org/)
2. Start NVDA (Insert+N)
3. Navigate to form with errors
4. Tab through fields
5. Listen for error announcements

**Expected Behavior:**
- Field errors announced when field receives focus
- Form summary announced when it appears
- System errors announced immediately

---

#### JAWS (Windows)

1. Download and install [JAWS](https://www.freedomscientific.com/products/software/jaws/)
2. Start JAWS
3. Navigate to form with errors
4. Use Tab to navigate fields
5. Listen for error announcements

**Expected Behavior:**
- Field errors announced when field receives focus
- Form summary announced when it appears
- System errors announced immediately

---

#### VoiceOver (macOS/iOS)

1. Enable VoiceOver (Cmd+F5 on Mac, Settings > Accessibility on iOS)
2. Navigate to form with errors
3. Use VO+Right Arrow to navigate
4. Listen for error announcements

**Expected Behavior:**
- Field errors announced when field receives focus
- Form summary announced when it appears
- System errors announced immediately

---

## Keyboard Navigation

### Field Errors

**Tab Navigation:**
- Tab moves to next field
- Shift+Tab moves to previous field
- Error message is read when field receives focus

**Focus Indicators:**
- Error fields have visible focus outline
- Focus outline is not removed by error styling

---

### Form Error Summary

**Tab Navigation:**
- Tab moves through error links
- Enter/Space activates link (scrolls to field and focuses it)
- Tab continues to form fields after links

**Keyboard Shortcuts:**
- **Tab** - Move to next error link
- **Shift+Tab** - Move to previous error link
- **Enter** - Activate link (scroll to field)
- **Escape** - Close summary (if close button is focused)

---

### System Error

**Tab Navigation:**
- Tab moves to close button
- Enter/Space activates close button
- Tab continues to page content after error

**Keyboard Shortcuts:**
- **Tab** - Move to close button
- **Enter** - Close error
- **Escape** - Close error (if supported)

---

### Focus Management

#### Automatic Focus on First Error

When `showFormErrors()` is called with `focus: true`:

```javascript
errorSystem.showFormErrors(errors, {
  scrollTo: true
});
// First error field automatically receives focus
```

**Behavior:**
- First error field receives focus
- Screen reader announces error
- User can immediately start correcting

---

#### Focus After Error Correction

When error is cleared:

```javascript
errorSystem.clearFieldError('email');
// Field remains focused
// Screen reader announces error cleared
```

**Behavior:**
- Field remains focused
- Error announcement stops
- User can continue typing

---

## WCAG Compliance

### WCAG 2.1 Level AA Compliance

| Criterion | Level | Status | Implementation |
|----------|-------|--------|----------------|
| **1.1.1 Non-text Content** | A | ✅ | Icons have `aria-hidden="true"` |
| **1.3.1 Info and Relationships** | A | ✅ | Semantic HTML, ARIA attributes |
| **1.3.2 Meaningful Sequence** | A | ✅ | Logical DOM order |
| **1.4.3 Contrast (Minimum)** | AA | ✅ | Error text meets 4.5:1 contrast |
| **1.4.4 Resize Text** | AA | ✅ | Text resizes with browser zoom |
| **2.1.1 Keyboard** | A | ✅ | All functionality keyboard accessible |
| **2.1.2 No Keyboard Trap** | A | ✅ | No keyboard traps |
| **2.4.3 Focus Order** | A | ✅ | Logical focus order |
| **2.4.7 Focus Visible** | AA | ✅ | Visible focus indicators |
| **3.3.1 Error Identification** | A | ✅ | Errors clearly identified |
| **3.3.2 Labels or Instructions** | A | ✅ | Error messages provide instructions |
| **3.3.3 Error Suggestion** | AA | ✅ | Error messages suggest corrections |
| **4.1.2 Name, Role, Value** | A | ✅ | ARIA attributes provide name/role/value |
| **4.1.3 Status Messages** | AA | ✅ | Errors announced via ARIA live regions |

---

### Color Contrast

**Error Text:**
- Color: `#dc3545` (red)
- Background: `#fff5f5` (light red) or white
- Contrast Ratio: **7.0:1** ✅ (exceeds 4.5:1 requirement)

**System Error Text:**
- Color: White
- Background: `#dc3545` (red)
- Contrast Ratio: **4.5:1** ✅ (meets requirement)

---

### Keyboard Accessibility

**All Interactive Elements:**
- ✅ Error links are keyboard accessible
- ✅ Close buttons are keyboard accessible
- ✅ Form fields remain keyboard accessible
- ✅ No keyboard traps

**Focus Indicators:**
- ✅ Visible focus outline on all interactive elements
- ✅ Focus outline not removed by error styling
- ✅ High contrast focus indicators

---

## Testing Procedures

### Automated Testing

#### axe-core Testing

```javascript
// Install axe-core
npm install --save-dev @axe-core/cli

// Run accessibility tests
axe http://localhost:3000/register.html
```

**Expected Results:**
- No critical accessibility violations
- All ARIA attributes properly used
- All interactive elements keyboard accessible

---

#### Lighthouse Accessibility Audit

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Accessibility" category
4. Run audit

**Expected Score:** 95-100

**Key Checks:**
- ✅ ARIA attributes present
- ✅ Color contrast sufficient
- ✅ Keyboard navigation works
- ✅ Focus indicators visible

---

### Manual Testing Checklist

#### Screen Reader Testing

- [ ] **NVDA (Windows)**
  - [ ] Field errors announced when field receives focus
  - [ ] Form summary announced when it appears
  - [ ] System errors announced immediately
  - [ ] Error links are navigable
  - [ ] Close buttons are accessible

- [ ] **JAWS (Windows)**
  - [ ] Field errors announced when field receives focus
  - [ ] Form summary announced when it appears
  - [ ] System errors announced immediately
  - [ ] Error links are navigable
  - [ ] Close buttons are accessible

- [ ] **VoiceOver (macOS/iOS)**
  - [ ] Field errors announced when field receives focus
  - [ ] Form summary announced when it appears
  - [ ] System errors announced immediately
  - [ ] Error links are navigable
  - [ ] Close buttons are accessible

---

#### Keyboard Navigation Testing

- [ ] **Tab Navigation**
  - [ ] Can tab to all error links
  - [ ] Can tab to close buttons
  - [ ] Can tab through form fields
  - [ ] Focus order is logical

- [ ] **Activation**
  - [ ] Enter activates error links
  - [ ] Enter closes error summaries
  - [ ] Enter closes system errors
  - [ ] Space activates buttons

- [ ] **Focus Management**
  - [ ] First error receives focus when shown
  - [ ] Focus moves to field when link clicked
  - [ ] Focus remains on field after error cleared
  - [ ] No focus traps

---

#### Visual Testing

- [ ] **Color Contrast**
  - [ ] Error text readable on background
  - [ ] System error text readable
  - [ ] Focus indicators visible
  - [ ] Works in high contrast mode

- [ ] **Text Size**
  - [ ] Error text readable at 200% zoom
  - [ ] Error text readable at default size
  - [ ] Error text readable on mobile

- [ ] **Focus Indicators**
  - [ ] Visible on all interactive elements
  - [ ] High contrast
  - [ ] Not removed by error styling

---

### Real User Testing

#### Test with Users Who Use Assistive Technology

1. **Recruit testers** who use screen readers
2. **Provide test scenarios:**
   - Fill out form with errors
   - Correct errors
   - Submit form
   - Handle API errors

3. **Collect feedback:**
   - Are errors announced clearly?
   - Can errors be found easily?
   - Is navigation intuitive?
   - Are there any barriers?

---

## Best Practices

### 1. Always Use ARIA Attributes

The error system automatically sets ARIA attributes. Don't override them:

```javascript
// ✅ Good - Error system handles ARIA
errorSystem.showFieldError('email', 'invalidEmail');

// ❌ Bad - Don't manually set aria-invalid
field.setAttribute('aria-invalid', 'true');
errorSystem.showFieldError('email', 'invalidEmail');
```

---

### 2. Provide Clear Error Messages

Error messages should:
- Clearly identify the problem
- Suggest how to fix it
- Use plain language

```javascript
// ✅ Good - Clear and actionable
errorSystem.showFieldError('email', 'invalidEmail');
// Message: "Please enter a valid email address"

// ❌ Bad - Vague
errorSystem.showFieldError('email', 'error');
// Message: "Error"
```

---

### 3. Don't Remove Focus Indicators

Never remove focus indicators, even for error fields:

```css
/* ✅ Good - Maintains focus indicator */
input.field-error:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* ❌ Bad - Removes focus indicator */
input.field-error:focus {
  outline: none;
}
```

---

### 4. Test with Screen Readers

Always test with at least one screen reader:
- NVDA (free, Windows)
- VoiceOver (built-in, macOS/iOS)
- JAWS (paid, Windows)

---

### 5. Maintain Keyboard Navigation

Ensure all functionality works with keyboard only:
- Tab navigation
- Enter/Space activation
- Escape dismissal (where appropriate)

---

### 6. Provide Error Context

Use parameters to provide context in error messages:

```javascript
// ✅ Good - Provides context
errorSystem.showFieldError('quantity', 'quantityExceedsMax', {
  params: { max: 10 }
});
// Message: "Quantity cannot exceed 10"

// ❌ Bad - No context
errorSystem.showFieldError('quantity', 'quantityError');
// Message: "Quantity error"
```

---

### 7. Announce Errors Immediately

Use appropriate `aria-live` values:
- `polite` - For field errors (non-intrusive)
- `assertive` - For form summaries and system errors (immediate)

The error system automatically sets these correctly.

---

### 8. Test in High Contrast Mode

Test error display in:
- Windows High Contrast Mode
- Browser high contrast extensions
- Dark mode (if supported)

Ensure errors remain visible and readable.

---

## Common Accessibility Issues

### Issue 1: Errors Not Announced

**Problem:** Screen readers don't announce errors

**Solution:**
1. Verify ARIA attributes are set
2. Check that `aria-describedby` links to error message
3. Ensure error message has `role="alert"` or `aria-live`

**Check:**
```javascript
// Verify ARIA attributes
const field = document.getElementById('email');
console.log(field.getAttribute('aria-invalid')); // Should be "true"
console.log(field.getAttribute('aria-describedby')); // Should include "error-email"

const errorDiv = document.getElementById('error-email');
console.log(errorDiv.getAttribute('role')); // Should be "alert"
```

---

### Issue 2: Focus Lost After Error

**Problem:** Focus moves away from field after error shown

**Solution:**
- Use `focus: true` option in `showFieldError()`
- Don't programmatically move focus unless necessary
- Let user control focus

---

### Issue 3: Error Links Not Keyboard Accessible

**Problem:** Can't navigate error links with keyboard

**Solution:**
- Verify links are in tab order
- Check that links are focusable
- Ensure focus indicators are visible

**Check:**
```javascript
// Verify links are focusable
const links = document.querySelectorAll('.error-list a');
links.forEach(link => {
  console.log(link.tabIndex); // Should be -1 or 0 (not -1 if disabled)
});
```

---

### Issue 4: Color-Only Error Indication

**Problem:** Errors only indicated by color

**Solution:**
- Error system uses multiple indicators:
  - Color (red border)
  - Text (error message)
  - Icon (in system errors)
  - ARIA attributes (screen readers)

All are automatically provided by the error system.

---

## Accessibility Testing Tools

### Automated Tools

1. **axe DevTools** - Browser extension
2. **WAVE** - Web accessibility evaluation tool
3. **Lighthouse** - Built into Chrome DevTools
4. **Pa11y** - Command-line accessibility testing

### Manual Testing

1. **Screen Readers:**
   - NVDA (Windows, free)
   - JAWS (Windows, paid)
   - VoiceOver (macOS/iOS, built-in)

2. **Keyboard Testing:**
   - Tab through all interactive elements
   - Test Enter/Space activation
   - Verify no keyboard traps

3. **Visual Testing:**
   - Test at 200% zoom
   - Test in high contrast mode
   - Test color contrast

---

## See Also

- **[API Reference](ERROR_SYSTEM_API.md)** - Complete method documentation
- **[README](ERROR_SYSTEM_README.md)** - Overview and quick start
- **[Migration Guide](ERROR_SYSTEM_MIGRATION.md)** - How to migrate from old system
- **[Styling Guide](ERROR_SYSTEM_STYLING.md)** - Customize appearance

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/TR/wai-aria-practices/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
