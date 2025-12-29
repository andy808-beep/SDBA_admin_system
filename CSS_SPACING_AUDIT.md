# Complete CSS Spacing Audit

## STEP 1: Current State of `public/styles.css`

### Spacing-Related Rules:

```css
/* Card Container */
.card {
  padding: 1.5rem;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.card h3 {
  margin-top: 0;
  margin-bottom: 6px;  /* ⚠️ MODIFIED: Reduced from default */
}
```

```css
/* Form Sections */
.form-section {
  margin-bottom: 2rem;  /* ⚠️ MODIFIED: Spacing between sections */
  padding-top: 2px;     /* ⚠️ MODIFIED: Minimal top padding */
}

.form-section h3 {
  margin: 0 0 8px 0;    /* ⚠️ MODIFIED: Compact spacing */
  padding-bottom: 0.5rem;
}

.form-section h4 {
  margin: 0 0 8px 0;    /* ⚠️ MODIFIED: Compact spacing */
}
```

```css
/* Form Groups */
.form-group {
  flex: 1;
  margin-bottom: 0.75rem;  /* ⚠️ MODIFIED: Reduced spacing */
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;  /* ⚠️ MODIFIED: Very compact label spacing */
  font-weight: 500;
  color: #495057;
}
```

```css
/* Navigation Buttons */
.nav-buttons {
  margin-top: 0.75rem;  /* ⚠️ MODIFIED: Reduced top margin */
  margin-bottom: 0;
  padding: 0;
}
```

```css
/* Entry Options */
.entry-option {
  margin-bottom: 1rem;
}

.entry-option:last-child {
  margin-bottom: 0.5rem;  /* ⚠️ MODIFIED: Reduced for last item */
}
```

```css
/* Team Details Container */
#teamDetailsContainer {
  margin-top: 0.75rem;  /* ⚠️ MODIFIED: Reduced top margin */
}

#teamDetailsContainer h3 {
  margin-bottom: 0.75rem;  /* ⚠️ MODIFIED: Reduced bottom margin */
}
```

---

## STEP 2: Current State of `public/css/tn_legacy.css`

### Spacing-Related Rules:

```css
/* Typography */
#tnScope h2, 
#tnScope h3 {
  margin-bottom: -8px;  /* ⚠️ MODIFIED: Negative margin for tight spacing */
  color: var(--theme-primary-dark, #c79100);
}
```

```css
/* Form Groups */
#tnScope .form-group {
  margin-bottom: 2px;  /* ⚠️ MODIFIED: Very minimal spacing */
}

#tnScope .form-group label {
  display: block;
  margin-bottom: 6px;  /* ⚠️ MODIFIED: Compact label spacing */
  font-weight: bold;
}
```

```css
/* Sections */
#tnScope .section {
  margin-bottom: 2rem;  /* ⚠️ MODIFIED: Standard section spacing */
  padding: 1rem;        /* ⚠️ MODIFIED: Standard padding */
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f9f9f9;
}

#tnScope .section h3 {
  margin-top: 0;
  margin-bottom: 1rem;  /* ⚠️ MODIFIED: Standard heading spacing */
  color: var(--theme-primary-dark, #c79100) !important;
}
```

```css
/* Card Container */
#tnScope .card {
  max-width: 1000px;
  width: 90%;
  margin: 2rem auto;  /* ⚠️ MODIFIED: Vertical and horizontal centering */
  padding: 2rem;      /* ⚠️ MODIFIED: Standard card padding */
}
```

```css
/* Navigation Buttons */
#tnScope .nav-buttons {
  margin-top: 2rem;  /* ⚠️ MODIFIED: Standard top margin */
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
```

```css
/* Summary Box */
#tnScope .summary-box {
  margin-top: 2rem;  /* ⚠️ MODIFIED: Standard top margin */
  padding: 1.2rem;   /* ⚠️ MODIFIED: Standard padding */
}

#tnScope .summary-box h3 {
  margin-top: 0;
  margin-bottom: 1rem;  /* ⚠️ MODIFIED: Standard heading spacing */
}
```

```css
/* Line Row */
#tnScope .line-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;  /* ⚠️ MODIFIED: Compact bottom margin */
}
```

```css
/* Quantity Input Container */
#tnScope .qty-input-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;  /* ⚠️ MODIFIED: Compact top margin */
}
```

```css
/* Team Selector */
#tnScope .team-selector {
  margin-bottom: 1rem;  /* ⚠️ MODIFIED: Standard bottom margin */
}
```

```css
/* Slot Preferences */
#tnScope .slot-preferences {
  margin-top: 2rem;  /* ⚠️ MODIFIED: Standard top margin */
}
```

---

## STEP 3: Current State of `public/css/theme.css`

**Complete File Contents:**

```css
/* Theme-specific styling for form elements */

/* Stepper theming */
.stepper-steps .step.active {
  background: var(--theme-primary) !important;
  color: white !important;
}

.stepper-steps .step.completed {
  background: var(--theme-primary-light) !important;
  color: var(--theme-primary-dark) !important;
  border-color: var(--theme-primary) !important;
}

/* Package/option selection theming */
.package-option.selected,
.radio-option input[type="radio"]:checked + label {
  border-color: var(--theme-primary) !important;
  background-color: var(--theme-primary-light) !important;
}

.package-box.selected {
  border: 2px solid var(--theme-primary) !important;
  box-shadow: 0 0 0 1px var(--theme-primary) !important;
}

/* Form input focus states */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--theme-primary) !important;
  box-shadow: 0 0 0 3px var(--theme-primary-light) !important;
}

/* Links */
a {
  color: var(--theme-primary);
  text-decoration: none;
}

a:hover {
  color: var(--theme-primary-dark);
  text-decoration: underline;
}

/* Radio buttons and checkboxes */
input[type="radio"]:checked {
  accent-color: var(--theme-primary);
}

input[type="checkbox"]:checked {
  accent-color: var(--theme-primary);
}

/* Progress indicators */
.progress-bar {
  background-color: var(--theme-primary) !important;
}

/* Headers with theme color */
h1, h2 {
  color: #2c3e50;
}

h3 {
  color: var(--theme-primary-dark);
}

/* Event-specific header colors */
body[data-event="tn"] h1,
body[data-event="tn"] h2 {
  color: #c79100;
}

body[data-event="wu"] h1,
body[data-event="wu"] h2 {
  color: #005090;
}

body[data-event="sc"] h1,
body[data-event="sc"] h2 {
  color: #007a3d;
}

/* Team section borders */
.team-section {
  border-left: 4px solid var(--theme-primary);
}

/* Selected items highlight */
.selected-item,
.active-item {
  background-color: var(--theme-primary-light) !important;
  border-color: var(--theme-primary) !important;
}

/* Badge/tag colors */
.badge, .tag {
  background-color: var(--theme-primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Alert/info boxes */
.info-box {
  background-color: var(--theme-primary-light);
  border-left: 4px solid var(--theme-primary);
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

/* Field error styling - ERROR MESSAGE DIVS ONLY */
div.field-error {
  display: none;
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: #fee2e2;
  border-left: 3px solid #dc2626;
  border-radius: 0.25rem;
  animation: slideDown 0.2s ease-out;
}

/* Input fields with errors */
input.error,
select.error,
textarea.error {
  border-color: #dc2626 !important;
  background-color: #fef2f2 !important;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Application Deadline Styling */
.deadline-label {
  color: #dc2626;
  font-weight: 600;
}

.deadline-date {
  color: #000000;
  font-weight: 400;
}
```

**Analysis:** `theme.css` contains **NO spacing-related overrides**. It only handles:
- Theme colors (CSS variables)
- Focus states
- Selected states
- Error styling (margin-top: 0.25rem, margin-bottom: 0.5rem for error messages)

---

## STEP 4: Data Attributes in HTML Templates

### Search Results:

**`public/tn_templates.html`:** ❌ No `data-step` or `data-event` attributes found

**`public/wu_sc_templates.html`:** ❌ No `data-step` or `data-event` attributes found

**`public/register.html`:** ❌ No `data-step` or `data-event` attributes in templates

### Data Attributes Found in JavaScript:

**`public/js/tn_wizard.js` (lines 293-297):**
```javascript
<div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1" data-i18n="tnStep1">${step1}</div>
<div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2" data-i18n="tnStep2">${step2}</div>
<div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3" data-i18n="tnStep3">${step3}</div>
<div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4" data-i18n="tnStep4">${step4}</div>
<div class="step ${currentStep >= 5 ? 'active' : ''}" data-step="5" data-i18n="tnStep5">${step5}</div>
```

**`public/js/wu_sc_wizard.js` (lines 413-416):**
```javascript
<div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1" data-i18n="wuScStep1">${step1}</div>
<div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2" data-i18n="wuScStep2">${step2}</div>
<div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3" data-i18n="wuScStep3">${step3}</div>
<div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4" data-i18n="wuScStep4">${step4}</div>
```

**`public/js/event_bootstrap.js` (line 415):**
```javascript
card.setAttribute('data-event', event.ref); // Add data-event for theme colors
```

**`public/js/event_bootstrap.js` (line 593):**
```javascript
document.body.setAttribute('data-event', ref.toLowerCase());
```

**`public/register.html` (line 726):**
```javascript
document.body.dataset.event = 'tn';
```

### Summary:
- **`data-step`**: Used in stepper navigation (dynamically generated in JS)
- **`data-event`**: Set on `<body>` element (`data-event="tn"`, `data-event="wu"`, `data-event="sc"`)
- **`data-event`**: Also set on event cards for theming
- **No `data-step` or `data-event-type` in HTML templates** - these are added dynamically

---

## STEP 5: All CSS Files in Project

### Files in `public/css/` directory:

1. **`tn_legacy.css`** (654 lines)
   - **Purpose:** TN-specific legacy styles scoped to `#tnScope`
   - **Contains:** Form spacing, card styles, navigation buttons, calendar styles, summary page styles
   - **Key Spacing Rules:** Negative margins on h2/h3, minimal form-group spacing

2. **`theme.css`** (175 lines)
   - **Purpose:** Theme-specific styling using CSS variables
   - **Contains:** Theme colors, focus states, selected states, error styling
   - **Key Spacing Rules:** Minimal (only error message margins)

3. **`language-switcher.css`** (365 lines)
   - **Purpose:** Language toggle component styling
   - **Contains:** Button styles, positioning, responsive design
   - **Key Spacing Rules:** Padding, gaps, margins for language switcher UI

4. **`error-system.css`** (715 lines)
   - **Purpose:** Unified error system styling (Phase 2)
   - **Contains:** Field errors, form summaries, system errors, animations
   - **Key Spacing Rules:** Error message margins (0.25rem top, 0.5rem bottom), padding for error containers

### Files in `public/` root:

5. **`styles.css`** (873 lines)
   - **Purpose:** Universal form styles for WU/SC forms and event picker
   - **Contains:** Base styles, form sections, form groups, navigation buttons, event picker
   - **Key Spacing Rules:** Compact spacing (reduced margins/padding throughout)

---

## STEP 6: Inline Styles and Style Injections

### JavaScript Files with Style Injections:

#### **`public/js/tn_wizard.js`**

**Style Element Creation (lines 303, 3997, 8280):**
```javascript
const style = document.createElement('style');
style.textContent = `...CSS rules...`;
document.head.appendChild(style);
```
- **Purpose:** Injects stepper styles, calendar styles, and other TN-specific styles
- **Location:** Multiple locations throughout the file
- **Impact:** Adds CSS rules dynamically, but **NO spacing overrides** in these injected styles

**Inline Style Manipulation:**
- Line 625-633: Container visibility forcing
- Line 1285-1402: Display toggling for team fields
- Line 1528-1531: Error message styling
- Line 1734-1742: Option group display toggling
- Line 1858-1895: Package box selection styling
- Line 2602-2649: Form field visibility
- Line 3707-3848: Calendar month collapse/expand
- Line 4809-4855: Error field styling
- Line 5077-5098: Error message display
- Line 6480-6491: Copy container display
- Line 7053-7055: Back button visibility

**Analysis:** Most inline styles are for **visibility/display toggling**, not spacing. The few spacing-related inline styles are:
- Error message margins: `margin: '0.25rem 0 0 0'` (line 4811)
- Error message font size: `fontSize: '12px'` (line 5078)
- Error message margin top: `marginTop: '5px'` (line 5079)

#### **`public/js/wu_sc_wizard.js`**

**Inline Style Manipulation:**
- Line 857-864: Step 1 actions visibility
- Line 955: Warning message margin-bottom: `'1rem'`
- Line 974-980: Clear button styling (margin-top: `'0.5rem'`, padding: `'0.5rem 1rem'`)
- Line 1346-1353: Error message styling (fontSize, padding, marginTop, marginBottom)

**Analysis:** Minimal spacing-related inline styles:
- Warning message: `marginBottom: '1rem'`
- Clear button: `marginTop: '0.5rem'`
- Error message: `marginTop: '0.5rem'`, `marginBottom: '0.5rem'`

#### **`public/js/event_bootstrap.js`**

**Inline Style Manipulation:**
- Line 236-261: Display toggling for picker/form containers
- Line 284-396: Loading indicator display
- Line 502-537: Container visibility (tnScope/wuScContainer)

**Analysis:** **NO spacing-related inline styles** - only display/visibility toggling

#### **`public/js/ui_bindings.js`**

**Inline Style Manipulation:**
- Line 310-314: Teams list display toggling
- Line 443: Division row display: `'block'`

**Analysis:** **NO spacing-related inline styles** - only display toggling

#### **`public/js/error-system.js`**

**Inline Style Manipulation:**
- Line 138-139, 243-244, 535-536: Field display restoration
- Line 454-468: Summary opacity/transition
- Line 524: Error element display
- Line 558-569: Element display toggling
- Line 646-662: System error opacity/transform
- Line 694-695: Error element opacity/transform

**Analysis:** **NO spacing-related inline styles** - only visibility/display/opacity/transform

#### **`public/js/validation.js`**

**Inline Style Manipulation:**
- Line 146-152, 176-182: Error element display toggling
- Line 202-254: Error element display management

**Analysis:** **NO spacing-related inline styles** - only display toggling

---

## Summary of Spacing Modifications

### Modified Spacing Values:

| Selector | Property | Original (Typical) | Current | Location |
|----------|----------|-------------------|---------|----------|
| `.card h3` | `margin-bottom` | `1rem` (16px) | `6px` | `styles.css:163` |
| `.form-section` | `margin-bottom` | `2rem` | `2rem` | `styles.css:382` |
| `.form-section` | `padding-top` | `1rem` | `2px` | `styles.css:383` |
| `.form-section h3` | `margin` | `0 0 1rem 0` | `0 0 8px 0` | `styles.css:387` |
| `.form-section h4` | `margin` | `0 0 1rem 0` | `0 0 8px 0` | `styles.css:395` |
| `.form-group` | `margin-bottom` | `1rem` | `0.75rem` | `styles.css:337` |
| `.form-group label` | `margin-bottom` | `0.5rem` | `0.35rem` | `styles.css:346` |
| `#tnScope h2, #tnScope h3` | `margin-bottom` | `1rem` | `-8px` | `tn_legacy.css:38` |
| `#tnScope .form-group` | `margin-bottom` | `1rem` | `2px` | `tn_legacy.css:417` |
| `#tnScope .form-group label` | `margin-bottom` | `0.5rem` | `6px` | `tn_legacy.css:422` |
| `#tnScope .section` | `margin-bottom` | `2rem` | `2rem` | `tn_legacy.css:444` |
| `#tnScope .section` | `padding` | `1rem` | `1rem` | `tn_legacy.css:445` |

### Key Findings:

1. **`styles.css`** has **compact spacing** throughout:
   - Form sections: `padding-top: 2px` (very minimal)
   - Headings: `margin-bottom: 8px` (compact)
   - Form groups: `margin-bottom: 0.75rem` (reduced)
   - Labels: `margin-bottom: 0.35rem` (very compact)

2. **`tn_legacy.css`** has **extreme spacing modifications**:
   - Headings: `margin-bottom: -8px` (negative margin!)
   - Form groups: `margin-bottom: 2px` (minimal)
   - Labels: `margin-bottom: 6px` (compact)

3. **`theme.css`** has **NO spacing overrides** - only theme colors and focus states

4. **Inline styles** are primarily for **visibility/display**, not spacing:
   - Only 3-4 instances of spacing-related inline styles (error message margins)
   - Most are `display: block/none` or `visibility: visible/hidden`

5. **Data attributes** are set dynamically:
   - `data-event` on `<body>` for theme switching
   - `data-step` on stepper elements (generated in JS)
   - No data attributes in HTML templates themselves

---

## Recommendations

1. **Consider standardizing spacing** between `styles.css` and `tn_legacy.css`
2. **Review negative margin** on `#tnScope h2, h3` - may cause layout issues
3. **Document spacing rationale** - why are these values so compact?
4. **Consider CSS custom properties** for spacing to make future changes easier
5. **Audit inline styles** - consider moving error message margins to CSS classes

