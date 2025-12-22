# Legacy Error Code Removal - Execution Plan

## Verification Results

### ✅ SAFE TO REMOVE IMMEDIATELY

#### 1. `highlightField()` - tn_wizard.js
- **Location:** Lines 1197-1202
- **Status:** ✅ NOT CALLED ANYWHERE
- **Action:** DELETE

#### 2. `clearFieldHighlighting()` - tn_wizard.js  
- **Location:** Lines 1180-1192
- **Status:** ✅ NOT CALLED ANYWHERE
- **Action:** DELETE

#### 3. `hideError()` - tn_wizard.js
- **Location:** Lines 6697-6703
- **Status:** ✅ NOT CALLED (grep found no calls)
- **Action:** DELETE

---

### ⚠️ REMOVE WITH FALLBACK CLEANUP

#### 4. `showError()` - tn_wizard.js
- **Location:** Lines 6667-6692
- **Status:** ⚠️ CALLED in 22 fallback paths
- **Action:** DELETE function + remove all `else { showError(...) }` blocks

**Fallback locations to clean:**
- Line 5562: validateStep1() fallback
- Line 5685: validateStep1() fallback  
- Line 5812: validateStep3() fallback
- Line 5876: validateStep4() fallback
- Line 5925: validateStep5() fallback
- Lines 6367, 6401, 6440, 6448, 6456, 6465, 6474, 6486, 6494, 6502, 6535, 6553, 6561: submitTNForm() fallbacks

#### 5. `showError()` - wu_sc_wizard.js
- **Location:** Lines 1989-1995
- **Status:** ⚠️ CALLED in 5 fallback paths
- **Action:** DELETE function + remove all `else { showError(...) }` blocks

**Fallback locations to clean:**
- Line 1734: validateStep1() fallback
- Line 1803: validateStep2() fallback
- Line 1911: validateStep2() fallback
- Line 2081: submitWUSCForm() fallback

---

### ⚠️ KEEP (Different Purpose)

#### 6. `showError()` - submit.js
- **Location:** Lines 163-172
- **Status:** ⚠️ Uses `#errorBox` (different element, not `#formMsg`)
- **Action:** KEEP for now (may be used elsewhere)

#### 7. `hideError()` - submit.js
- **Location:** Lines 297-300
- **Status:** ⚠️ Uses `#errorBox` (different element)
- **Action:** KEEP for now

---

## Execution Steps

### Step 1: Remove Unused Functions (Safe)

Remove these functions that are never called:

1. `highlightField()` - tn_wizard.js lines 1194-1202
2. `clearFieldHighlighting()` - tn_wizard.js lines 1178-1192
3. `hideError()` - tn_wizard.js lines 6694-6703

### Step 2: Remove showError() and Clean Fallbacks

For each file:

1. Remove `showError()` function definition
2. Remove all `else { showError(...) }` fallback blocks
3. Keep only the `if (window.errorSystem) { ... }` blocks

### Step 3: Clean CSS

Remove legacy CSS rules from error-system.css (keep in tn_legacy.css for backward compatibility).

---

## Detailed Removal Code

### Removal 1: highlightField() and clearFieldHighlighting()

**File:** `public/js/tn_wizard.js`

**Remove:**
```javascript
/**
 * Clear field highlighting
 */
function clearFieldHighlighting() {
  const highlightedFields = document.querySelectorAll('#tnScope .field-error');
  highlightedFields.forEach(field => {
    field.classList.remove('field-error');
  });
  
  // Also clear duplicate warning
  const msgEl = document.getElementById('formMsg');
  if (msgEl && msgEl.textContent.includes('Duplicate team names')) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
  }
}

/**
 * Highlight a field with error styling
 */
function highlightField(field) {
  if (field) {
    field.classList.add('field-error');
    field.focus();
  }
}
```

---

### Removal 2: hideError() in tn_wizard.js

**File:** `public/js/tn_wizard.js`

**Remove:**
```javascript
/**
 * Hide error message
 */
function hideError() {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
  }
}
```

---

### Removal 3: showError() in tn_wizard.js + Fallback Cleanup

**File:** `public/js/tn_wizard.js`

**Remove function:**
```javascript
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';
    msgEl.style.display = 'block';
    msgEl.style.backgroundColor = '#fee';
    msgEl.style.border = '2px solid #dc3545';
    msgEl.style.color = '#721c24';
    msgEl.style.padding = '1rem';
    msgEl.style.margin = '1rem 0';
    msgEl.style.borderRadius = '4px';
    msgEl.style.whiteSpace = 'pre-wrap';
    msgEl.style.fontWeight = 'bold';
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    Logger.error('Validation Error:', message);
  } else {
    Logger.error('formMsg element not found, using alert');
    alert(message);
  }
}
```

**Remove fallback blocks (22 locations):**
Replace patterns like:
```javascript
if (window.errorSystem) {
  window.errorSystem.showFormErrors(errors, {...});
} else {
  showError(message); // REMOVE THIS
}
```

With:
```javascript
if (window.errorSystem) {
  window.errorSystem.showFormErrors(errors, {...});
} else {
  // Fallback: Use alert if errorSystem not available
  alert(message || 'An error occurred');
}
```

Or simply:
```javascript
if (!window.errorSystem) {
  console.error('ErrorSystem not available:', errors);
  alert(message || 'An error occurred');
  return false;
}
window.errorSystem.showFormErrors(errors, {...});
```

---

### Removal 4: showError() in wu_sc_wizard.js + Fallback Cleanup

**File:** `public/js/wu_sc_wizard.js`

**Remove function:**
```javascript
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';
  }
}
```

**Remove fallback blocks (5 locations):**
Same pattern as tn_wizard.js

---

### Removal 5: Legacy CSS from error-system.css

**File:** `public/css/error-system.css`

**Remove:**
```css
/* Legacy: .msg.error class (used in templates) */
.msg.error {
  background-color: #fee;
  border: 2px solid #dc3545;
  color: #721c24;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}

/* Legacy: #formMsg element */
#formMsg.msg.error {
  background-color: #fee;
  border: 2px solid #dc3545;
  color: #721c24;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}
```

**Keep:**
- `.invalid` class (lines 622-628) - Still used by validation.js

---

## Edge Cases

1. **Error System Not Available:**
   - Current: Falls back to `showError()` which uses `#formMsg`
   - After removal: Falls back to `alert()` or console.error
   - **Risk:** Less user-friendly if errorSystem fails
   - **Mitigation:** Ensure error-system.js always loads

2. **#formMsg Element:**
   - **Decision:** Keep in templates for now (harmless if unused)
   - Can remove later after thorough testing

3. **submit.js showError():**
   - Uses `#errorBox` (different element)
   - May be used by other code
   - **Decision:** Keep for now, migrate later

---

## Verification After Removal

After removing code, verify:

- [ ] No references to removed functions
- [ ] Error system works in all scenarios
- [ ] Fallback behavior is acceptable (alert or console.error)
- [ ] No broken error displays
- [ ] CSS still works for legacy elements (if kept)

---

## Summary

**Immediate Removals (Safe):**
- ✅ `highlightField()` - tn_wizard.js
- ✅ `clearFieldHighlighting()` - tn_wizard.js  
- ✅ `hideError()` - tn_wizard.js

**Conditional Removals (Requires Fallback Cleanup):**
- ⚠️ `showError()` - tn_wizard.js (remove + 22 fallback blocks)
- ⚠️ `showError()` - wu_sc_wizard.js (remove + 5 fallback blocks)
- ⚠️ Legacy CSS - error-system.css (remove `.msg.error` rules)

**Keep:**
- `showError()` - submit.js (different element: #errorBox)
- `hideError()` - submit.js (different element: #errorBox)
- `.invalid` CSS class (still used)
- `#formMsg` in templates (for backward compatibility)
