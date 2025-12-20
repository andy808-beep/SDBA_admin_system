# Validation Analysis

This document analyzes validation logic in `public/js/validation.js` and `public/js/tn_verification.js`, and how validation is implemented at each step in the registration wizards.

---

## File Overview

### `public/js/validation.js`
**Purpose:** Shared validation utilities for email and phone number validation  
**Used by:** All registration forms (TN, WU, SC wizards)

### `public/js/tn_verification.js`
**Purpose:** ⚠️ **NOT a validation file** - This is a verification/testing tool for checking if the TN wizard implementation meets legacy requirements. It does NOT contain form validation logic.

**Actual validation happens in:**
- `public/js/tn_wizard.js` - TN wizard step validation
- `public/js/wu_sc_wizard.js` - WU/SC wizard step validation

---

## Validation Architecture

### Validation Schema vs Inline Checks

**❌ No centralized validation schema exists**

**✅ Validation is implemented as inline checks in step-specific functions:**

- Each step has a dedicated `validateStepX()` function
- Validation logic is embedded directly in these functions
- No JSON schema, no validation library (like Yup, Joi, etc.)
- Shared utilities exist for common validations (email, phone)

### Validation Pattern

**Structure:**
```javascript
function validateStepX() {
  // 1. Clear previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  // 2. Collect errors in array
  const errors = [];
  
  // 3. Validate each field (inline checks)
  if (!field?.value?.trim()) {
    errors.push({ field: 'fieldId', messageKey: 'errorKey' });
  }
  
  // 4. Use shared utilities for complex validation
  if (!isValidEmail(email.value.trim())) {
    errors.push({ field: 'email', messageKey: 'invalidEmail' });
  }
  
  // 5. Display errors via unified error system
  if (errors.length > 0) {
    window.errorSystem.showFormErrors(errors, { scrollTo: true });
    return false;
  }
  
  return true;
}
```

---

## Shared Validation Utilities (`validation.js`)

### Email Validation

**Function:** `isValidEmail(email)`

**Validation Rules:**
1. Must be a non-empty string
2. Must not contain spaces
3. Must contain exactly one `@`
4. Must have at least one `.` after the `@`
5. Domain parts (split by `.`) must all have content

**Example:**
```javascript
// From validation.js (lines 12-56)
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmed = email.trim();
  
  // Must not be empty
  if (trimmed.length === 0) {
    return false;
  }
  
  // Must not contain spaces
  if (trimmed.includes(' ')) {
    return false;
  }
  
  // Must contain exactly one @
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) {
    return false;
  }
  
  // Split by @ and check both parts exist
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }
  
  // Must have at least one . after the @
  const domainPart = parts[1];
  if (!domainPart.includes('.')) {
    return false;
  }
  
  // Domain must have content before and after the .
  const domainParts = domainPart.split('.');
  for (const part of domainParts) {
    if (!part || part.length === 0) {
      return false;
    }
  }
  
  return true;
}
```

**Valid Examples:**
- `user@example.com` ✅
- `test.email@domain.co.uk` ✅
- `name+tag@example.org` ✅

**Invalid Examples:**
- `user @example.com` ❌ (contains space)
- `user@example` ❌ (no dot after @)
- `user@@example.com` ❌ (multiple @)
- `@example.com` ❌ (no local part)

### Phone Validation

**Function:** `isValidHKPhone(phone)`

**Validation Rules:**
1. Must be exactly 8 digits
2. Must contain only digits (no letters, spaces, or special characters)

**Example:**
```javascript
// From validation.js (lines 63-81)
export function isValidHKPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  const trimmed = phone.trim();
  
  // Must be exactly 8 digits
  if (trimmed.length !== 8) {
    return false;
  }
  
  // Must contain only digits
  if (!/^\d{8}$/.test(trimmed)) {
    return false;
  }
  
  return true;
}
```

**Valid Examples:**
- `12345678` ✅
- `98765432` ✅

**Invalid Examples:**
- `1234567` ❌ (7 digits)
- `123456789` ❌ (9 digits)
- `1234-5678` ❌ (contains hyphen)
- `1234 5678` ❌ (contains space)
- `+85212345678` ❌ (contains prefix - must normalize first)

**Phone Normalization:**
```javascript
// From validation.js (lines 88-109)
export function normalizeHKPhone(phone) {
  // Removes whitespace, hyphens, parentheses
  // Handles +852 or 852 prefix
  // Returns format: +85212345678
}
```

### Field-Level Validation Helpers

**Functions:**
- `validateEmailField(inputElement, errorElement)` - Validates and shows/hides error
- `validatePhoneField(inputElement, errorElement)` - Validates and shows/hides error
- `setupEmailValidation(inputId)` - Sets up real-time validation (blur event)
- `setupPhoneValidation(inputId)` - Sets up real-time validation (blur event + input filtering)

---

## TN Wizard Validation (`tn_wizard.js`)

### Step 1: Teams & Categories

**Function:** `validateStep1()`

**Validations:**
1. **Team Count** - Must be selected (1-10)
2. **Team Name (English)** - Required for each team
3. **Team Category** - Required for each team
4. **Entry Option** - Required for each team (radio button selection)
5. **Duplicate Team Names** - No duplicate names within the same category

**Example Validation (Team Name):**
```javascript
// From tn_wizard.js (lines 5551-5562)
for (let i = 1; i <= teamCountValue; i++) {
  const teamNameEn = document.getElementById(`teamNameEn${i}`);
  
  if (!teamNameEn?.value?.trim()) {
    errors.push({
      field: `teamNameEn${i}`,
      messageKey: 'pleaseEnterTeamName',
      params: { num: i }
    });
  }
}
```

**Duplicate Checking:**
```javascript
// From tn_wizard.js (lines 5601-5642)
// Groups teams by category
const categoryGroups = {};
teamData.forEach(team => {
  if (!categoryGroups[team.category]) {
    categoryGroups[team.category] = [];
  }
  categoryGroups[team.category].push(team);
});

// Check for duplicates within each category
Object.keys(categoryGroups).forEach(category => {
  const teamsInCategory = categoryGroups[category];
  const nameCounts = {};
  
  teamsInCategory.forEach(team => {
    const name = team.name.toLowerCase();
    if (!nameCounts[name]) {
      nameCounts[name] = [];
    }
    nameCounts[name].push(team);
  });
  
  // Find duplicates
  Object.keys(nameCounts).forEach(name => {
    if (nameCounts[name].length > 1) {
      // Add error for EACH duplicate field
      nameCounts[name].forEach(team => {
        errors.push({
          field: `teamNameEn${team.index}`,
          messageKey: 'duplicateTeamName',
          params: { 
            num: team.index,
            category: categoryDisplayName
          }
        });
      });
    }
  });
});
```

### Step 2: Organization & Managers

**Function:** `validateStep2()`

**Validations:**
1. **Organization Name** - Required
2. **Organization Address** - Required
3. **Manager 1** - Required (name, phone, email)
4. **Manager 2** - Required (name, phone, email)
5. **Manager 3** - Optional, but if any field provided, all must be provided
6. **Phone Numbers** - Must be valid HK phone (8 digits) using `isValidHKPhone()`
7. **Email Addresses** - Must be valid email using `isValidEmail()`

**Example Validation (Manager Email):**
```javascript
// From tn_wizard.js (lines 5697-5713)
const manager1Email = document.getElementById('manager1Email');

if (!manager1Email?.value?.trim()) {
  errors.push({ field: 'manager1Email', messageKey: 'managerEmailRequired' });
} else if (!isValidEmail(manager1Email.value.trim())) {
  errors.push({ field: 'manager1Email', messageKey: 'invalidEmail' });
}
```

**Example Validation (Manager Phone):**
```javascript
// From tn_wizard.js (lines 5696-5707)
const manager1Phone = document.getElementById('manager1Phone');

if (!manager1Phone?.value?.trim()) {
  errors.push({ field: 'manager1Phone', messageKey: 'managerPhoneRequired' });
} else if (!isValidHKPhone(manager1Phone.value.trim())) {
  errors.push({ field: 'manager1Phone', messageKey: 'invalidPhone' });
}
```

**Optional Manager 3 Logic:**
```javascript
// From tn_wizard.js (lines 5741-5769)
if (manager3Name?.value?.trim()) {
  // If name provided, phone and email are required
  if (!manager3Phone?.value?.trim()) {
    errors.push({ field: 'manager3Phone', messageKey: 'managerPhoneRequired' });
  } else if (!isValidHKPhone(manager3Phone.value.trim())) {
    errors.push({ field: 'manager3Phone', messageKey: 'invalidPhone' });
  }
  
  if (!manager3Email?.value?.trim()) {
    errors.push({ field: 'manager3Email', messageKey: 'managerEmailRequired' });
  } else if (!isValidEmail(manager3Email.value.trim())) {
    errors.push({ field: 'manager3Email', messageKey: 'invalidEmail' });
  }
} else if (manager3Phone?.value?.trim() || manager3Email?.value?.trim()) {
  // If phone or email provided, name is required
  if (!manager3Name?.value?.trim()) {
    errors.push({ field: 'manager3Name', messageKey: 'managerNameRequired' });
  }
}
```

### Step 3: Race Day Arrangements

**Function:** `validateStep3()`

**Validations:**
1. **Quantity Inputs** - All `.qty-input` elements must:
   - Be >= minimum value (from `min` attribute)
   - Be <= maximum value (from `max` attribute, if specified)
   - Must be a valid integer

**Example Validation:**
```javascript
// From tn_wizard.js (lines 5810-5835)
const qtyInputs = document.querySelectorAll('.qty-input');

qtyInputs.forEach(input => {
  const value = parseInt(input.value, 10) || 0;
  const min = parseInt(input.min, 10) || 0;
  const max = input.max ? parseInt(input.max, 10) : null;
  
  // Check minimum quantity
  if (value < min) {
    errors.push({
      field: input.id,
      messageKey: 'quantityMustBePositive',
      params: { min: min }
    });
  }
  
  // Check maximum quantity (if max is specified)
  if (max !== null && value > max) {
    errors.push({
      field: input.id,
      messageKey: 'quantityExceedsMax',
      params: { max: max }
    });
  }
});
```

### Step 4: Practice Booking

**Function:** `validateStep4()`

**Validations:**
1. **Duplicate Slot Selections** - No team can select the same practice slot
2. **Practice Requirements** - Each team must meet practice booking requirements

**Example Validation (Duplicates):**
```javascript
// From tn_wizard.js (lines 3464-3500+)
function checkForDuplicates() {
  const allSelects = [
    ...TN_SELECTORS.practice.rank2h,  // 2-hour slot selects
    ...TN_SELECTORS.practice.rank1h   // 1-hour slot selects
  ];

  const selectedValues = new Map();
  const duplicates = new Set();
  const errors = [];

  // Check for duplicates
  allSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select && select.value && select.value !== '') {
      const value = select.value;
      if (selectedValues.has(value)) {
        duplicates.add(value);
        // Mark both selects as having duplicates
        errors.push({
          field: selectId,
          messageKey: 'duplicateSlotSelection',
          params: { slot: value }
        });
      } else {
        selectedValues.set(value, selectId);
      }
    }
  });

  return errors;
}
```

### Step 5: Summary

**Function:** `validateStep5()`

**Validations:**
- **Always returns `true`** - Summary step is read-only, no validation needed

---

## WU/SC Wizard Validation (`wu_sc_wizard.js`)

### Step 1: Teams

**Function:** `validateStep1()`

**Validations:**
1. **Team Count** - Must be selected
2. **Team Name (English)** - Required for each team
3. **Boat Type** - Required for each team (radio button)
4. **Division** - Required for each team (radio button)

**Example Validation:**
```javascript
// From wu_sc_wizard.js (lines 1747-1775)
for (let i = 1; i <= count; i++) {
  const teamNameEn = document.getElementById(`teamNameEn${i}`);
  const boatType = document.querySelector(`input[name="boatType${i}"]:checked`);
  const division = document.querySelector(`input[name="division${i}"]:checked`);
  
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
```

### Step 2: Team Information

**Function:** `validateStep2()`

**Validations:**
1. **Organization Name** - Required
2. **Mailing Address** - Required
3. **Manager 1** - Required (name, phone, email)
4. **Manager 2** - Required (name, phone, email)
5. **Manager 3** - Optional, but if any field provided, all must be provided
6. **Phone Numbers** - Must be valid HK phone using `isValidHKPhone()`
7. **Email Addresses** - Must be valid email using `isValidEmail()`

**Note:** Same validation logic as TN Step 2, but saves data with event-specific prefixes (`wu_` or `sc_`).

### Step 3: Race Day

**Function:** `validateStep3()`

**Validations:**
- **No validation** - Only saves data to sessionStorage
- All race day items are optional

### Step 4: Summary

**Function:** `validateStep4()`

**Validations:**
- **Always returns `true`** - Summary step is read-only

---

## Complete Field Validation Example

### Example: Manager Email Field Validation

**Step-by-step flow:**

1. **User clicks "Next" on Step 2**
   ```javascript
   // From tn_wizard.js (line 5476)
   nextBtn.addEventListener('click', async () => {
     if (validateCurrentStep()) {  // Calls validateStep2()
       saveCurrentStepData();
       await loadStep(currentStep + 1);
     }
   });
   ```

2. **validateStep2() is called**
   ```javascript
   // From tn_wizard.js (lines 5674-5797)
   function validateStep2() {
     // Clear previous errors
     window.errorSystem.clearFormErrors();
     
     const errors = [];
     
     // Get email field
     const manager1Email = document.getElementById('manager1Email');
     
     // Check if empty
     if (!manager1Email?.value?.trim()) {
       errors.push({ 
         field: 'manager1Email', 
         messageKey: 'managerEmailRequired' 
       });
     } 
     // Check if valid format
     else if (!isValidEmail(manager1Email.value.trim())) {
       errors.push({ 
         field: 'manager1Email', 
         messageKey: 'invalidEmail' 
       });
     }
     
     // Display errors if any
     if (errors.length > 0) {
       window.errorSystem.showFormErrors(errors, {
         containerId: 'wizardMount',
         scrollTo: true
       });
       return false;
     }
     
     return true;
   }
   ```

3. **isValidEmail() is called (shared utility)**
   ```javascript
   // From validation.js (lines 12-56)
   export function isValidEmail(email) {
     if (!email || typeof email !== 'string') {
       return false;
     }
     
     const trimmed = email.trim();
     
     // Must not be empty
     if (trimmed.length === 0) {
       return false;
     }
     
     // Must not contain spaces
     if (trimmed.includes(' ')) {
       return false;
     }
     
     // Must contain exactly one @
     const atCount = (trimmed.match(/@/g) || []).length;
     if (atCount !== 1) {
       return false;
     }
     
     // Split by @ and check both parts exist
     const parts = trimmed.split('@');
     if (parts.length !== 2 || !parts[0] || !parts[1]) {
       return false;
     }
     
     // Must have at least one . after the @
     const domainPart = parts[1];
     if (!domainPart.includes('.')) {
       return false;
     }
     
     // Domain must have content before and after the .
     const domainParts = domainPart.split('.');
     for (const part of domainParts) {
       if (!part || part.length === 0) {
         return false;
       }
     }
     
     return true;
   }
   ```

4. **Error Display (if validation fails)**
   ```javascript
   // Error system displays error message next to field
   // Uses i18n for localized error messages
   // Scrolls to first error field
   window.errorSystem.showFormErrors([
     { field: 'manager1Email', messageKey: 'invalidEmail' }
   ], {
     containerId: 'wizardMount',
     scrollTo: true
   });
   ```

5. **Success (if validation passes)**
   ```javascript
   // Data is saved to sessionStorage
   saveStep2Data();
   
   // User proceeds to next step
   loadStep(3);
   ```

---

## Validation Summary

### TN Wizard Steps

| Step | Validations | Shared Utilities Used |
|------|------------|----------------------|
| **Step 1** | Team count, team names, categories, options, duplicates | None |
| **Step 2** | Org name, address, manager 1-3 (name, phone, email) | `isValidEmail()`, `isValidHKPhone()` |
| **Step 3** | Quantity inputs (min/max) | None |
| **Step 4** | Duplicate slots, practice requirements | None |
| **Step 5** | None (summary) | None |

### WU/SC Wizard Steps

| Step | Validations | Shared Utilities Used |
|------|------------|----------------------|
| **Step 1** | Team count, team names, boat type, division | None |
| **Step 2** | Org name, address, manager 1-3 (name, phone, email) | `isValidEmail()`, `isValidHKPhone()` |
| **Step 3** | None (just saves data) | None |
| **Step 4** | None (summary) | None |

### Validation Characteristics

1. **No Schema** - Validation is inline, not schema-based
2. **Shared Utilities** - Email and phone validation are centralized
3. **Error System** - Uses unified `errorSystem` for error display
4. **i18n Support** - Error messages are internationalized
5. **Per-Step Validation** - Each step validates before allowing progression
6. **Real-Time Validation** - Optional setup functions for email/phone (blur events)

---

## Related Files

- `public/js/validation.js` - Shared validation utilities (email, phone)
- `public/js/tn_wizard.js` - TN wizard step validation (lines 5497-5920)
- `public/js/wu_sc_wizard.js` - WU/SC wizard step validation (lines 1696-1987)
- `public/js/error-system.js` - Unified error display system
- `public/js/i18n/translations.js` - Error message translations

