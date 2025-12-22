# TN Wizard Step 3 Migration Summary

## Overview
Successfully migrated TN Wizard Step 3 (Race Day Arrangement) validation to use the unified error system.

## Changes Made

### 1. Updated `createRaceDayForm()` - Added Error Div Placeholders

**Location:** `public/js/tn_wizard.js` (lines 2003-2101)

Added `<div class="field-error-message" id="error-{fieldId}"></div>` after each quantity input:

```html
<div class="item-controls">
  <input type="number" 
         id="${item.item_code}Qty" 
         name="${item.item_code}Qty" 
         min="${item.min_qty || 0}" 
         max="${item.max_qty || ''}"
         value="0" 
         class="qty-input" />
  <div class="field-error-message" id="error-${item.item_code}Qty"></div>
</div>
```

**Fields with error divs:**
- All quantity inputs with IDs following pattern: `${item.item_code}Qty`
- Examples: `marqueeQty`, `steerWithQty`, `steerWithoutQty`, `junkBoatQty`, `speedboatQty`, etc.
- Error div IDs follow pattern: `error-${item.item_code}Qty`

---

### 2. Refactored `validateStep3()` Function

**Location:** `public/js/tn_wizard.js` (lines 5753-5800)

#### Key Changes:

1. **Replaced `clearFieldHighlighting()`** → `window.errorSystem.clearFormErrors()`

2. **Replaced string error messages** → Structured error objects:
   ```javascript
   errors.push({
     field: input.id,
     messageKey: 'quantityMustBePositive',
     params: { min: min }
   });
   ```

3. **Removed all direct DOM manipulation:**
   - ❌ Removed: `highlightField(input)` calls
   - ❌ Removed: String concatenation for error messages
   - ✅ Replaced with: Error objects in array

4. **Replaced `showError()`** → `window.errorSystem.showFormErrors()`

5. **Added fallback** to old error methods if `errorSystem` not available

#### Validation Logic:

**Minimum Quantity Check:**
- Checks if `value < min` (where min is from `min` attribute, default 0)
- Uses i18n key: `quantityMustBePositive` with `{min}` parameter
- Example: "Quantity must be at least 0" or "Quantity must be at least 5"

**Maximum Quantity Check:**
- Checks if `value > max` (only if max is specified in `max` attribute)
- Uses i18n key: `quantityExceedsMax` with `{max}` parameter
- Example: "Quantity cannot exceed 10"

#### Error Structure:

All errors follow this pattern:
```javascript
{
  field: string,        // Field ID (e.g., 'marqueeQty', 'steerWithQty')
  messageKey: string,  // i18n translation key
  params: object       // Parameters for translation (e.g., { min: 0 }, { max: 10 })
}
```

---

### 3. Added i18n Messages

**Location:** `public/js/i18n/translations.js`

#### English Messages:
```javascript
quantityMustBePositive: "Quantity must be at least {min}",
quantityExceedsMax: "Quantity cannot exceed {max}",
```

#### Traditional Chinese Messages:
```javascript
quantityMustBePositive: "數量必須至少為 {min}",
quantityExceedsMax: "數量不能超過 {max}",
```

**Placement:** Added in the "ERROR SYSTEM MESSAGES (Phase 2)" section, after manager validation messages.

---

## Before/After Comparison

### Before (Old Code):

```javascript
// Direct DOM manipulation
qtyInputs.forEach(input => {
  const value = parseInt(input.value, 10) || 0;
  const min = parseInt(input.min, 10) || 0;
  const max = parseInt(input.max, 10) || Infinity;
  
  if (value < min) {
    errors.push(`${input.id} must be at least ${min}`);
    highlightField(input);
  }
  
  if (value > max) {
    errors.push(`${input.id} cannot exceed ${max}`);
    highlightField(input);
  }
});

// String concatenation
const message = errors.length === 1 
  ? errors[0]
  : `Please fix: ${errors.slice(0, -1).join(', ')} and ${errors[errors.length - 1]}`;
showError(message);
```

### After (New Code):

```javascript
// Structured error objects
qtyInputs.forEach(input => {
  const value = parseInt(input.value, 10) || 0;
  const min = parseInt(input.min, 10) || 0;
  const max = input.max ? parseInt(input.max, 10) : null;
  
  if (value < min) {
    errors.push({
      field: input.id,
      messageKey: 'quantityMustBePositive',
      params: { min: min }
    });
  }
  
  if (max !== null && value > max) {
    errors.push({
      field: input.id,
      messageKey: 'quantityExceedsMax',
      params: { max: max }
    });
  }
});

// Unified error display
window.errorSystem.showFormErrors(errors, {
  containerId: 'wizardMount',
  scrollTo: true
});
```

---

## Validated Fields

### Race Day Items (Dynamic from Database):

All quantity inputs with class `.qty-input` are validated. These include:

- **Marquee items:** `marqueeQty`
- **Steersman items:** `steerWithQty`, `steerWithoutQty`
- **Junk boat items:** `junkBoatQty`
- **Speed boat items:** `speedboatQty`
- **Other items:** Any item from `v_race_day_items_public` table

**Field IDs:** Follow pattern `${item.item_code}Qty` where `item_code` comes from database.

**Validation Rules:**
- Minimum: Must be >= `min` attribute (default: 0)
- Maximum: Must be <= `max` attribute (if specified)

---

## Benefits

### User Experience:
- ✅ **Form error summary** shows all errors at once (2+ errors)
- ✅ **Clickable links** to jump to problematic fields
- ✅ **Inline error messages** appear below each field
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

- [ ] **Negative quantity** - Shows "Quantity must be at least 0" error
- [ ] **Quantity below minimum** - Shows error with correct min value
- [ ] **Quantity above maximum** - Shows error with correct max value
- [ ] **Multiple invalid quantities** - Shows form error summary with all errors
- [ ] **Single invalid quantity** - Scrolls to and focuses field
- [ ] **Valid quantities** - No errors shown, form proceeds
- [ ] **Empty quantity (0)** - Valid if min is 0
- [ ] **Error summary links** - Clicking link scrolls to and focuses field
- [ ] **Error summary close button** - Dismisses summary (keeps field errors)
- [ ] **Language switching** - Error messages update to new language
- [ ] **Mobile view** - Error summary displays correctly on small screens
- [ ] **Dynamic items** - Works with any race day items from database

---

## Files Modified

1. **`public/js/tn_wizard.js`**
   - Updated `createRaceDayForm()` - Added error div placeholders (line ~2054)
   - Refactored `validateStep3()` - Uses error system (lines 5753-5800)

2. **`public/js/i18n/translations.js`**
   - Added `quantityMustBePositive` (English & Traditional Chinese)
   - Added `quantityExceedsMax` (English & Traditional Chinese)

---

## Next Steps

1. ✅ **Step 1 Migration** - Complete
2. ✅ **Step 2 Migration** - Complete
3. ✅ **Step 3 Migration** - Complete
4. ⏳ **Step 4 Migration** - Practice booking validation
5. ⏳ **Step 5 Migration** - Summary validation
6. ⏳ **Remove Legacy Code** - Remove `showError()`, `highlightField()`, `clearFieldHighlighting()` if no longer used

---

## Notes

- Field IDs are dynamically generated from database: `${item.item_code}Qty`
- Error div IDs follow pattern: `error-${item.item_code}Qty`
- Error divs use class: `field-error-message` (unified error system class)
- Container for error summary: `wizardMount` (contains the race day form)
- All error messages use i18n keys with parameters for translation support
- Maximum quantity check only runs if `max` attribute is specified (not empty string)
- Minimum quantity defaults to 0 if not specified in database
