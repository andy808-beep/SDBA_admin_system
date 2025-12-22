# Legacy Error Code Cleanup Plan

## Analysis Summary

After searching the codebase, here's what can be safely removed and what should be kept.

---

## ✅ SAFE TO REMOVE

### 1. `highlightField()` in tn_wizard.js
**Location:** Lines 1197-1202

**Code:**
```javascript
function highlightField(field) {
  if (field) {
    field.classList.add('field-error');
    field.focus();
  }
}
```

**Verification:**
- ✅ **NOT CALLED ANYWHERE** - No references found in codebase
- ✅ **Replaced by:** `errorSystem.showFieldError()` which adds `.field-error` class automatically
- ✅ **Safe to delete**

**Before/After:**
- **Before:** `highlightField(teamNameEn);`
- **After:** Handled by `errorSystem.showFieldError('teamNameEn1', 'pleaseEnterTeamName')`

---

### 2. `clearFieldHighlighting()` in tn_wizard.js
**Location:** Lines 1180-1192

**Code:**
```javascript
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
```

**Verification:**
- ✅ **NOT CALLED ANYWHERE** - No references found in codebase
- ✅ **Replaced by:** `errorSystem.clearFormErrors()` which removes all `.field-error` classes
- ✅ **Safe to delete**

**Before/After:**
- **Before:** `clearFieldHighlighting();`
- **After:** `errorSystem.clearFormErrors();` (already migrated)

---

### 3. `showError()` in tn_wizard.js
**Location:** Lines 6667-6692

**Code:**
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

**Verification:**
- ⚠️ **STILL CALLED** - Found 22 calls in tn_wizard.js
- ⚠️ **BUT:** All calls are in fallback paths (`else` blocks when `errorSystem` not available)
- ✅ **Decision:** Can be removed IF we ensure errorSystem is always available, OR keep as minimal fallback

**Current Usage Pattern:**
```javascript
if (window.errorSystem) {
  window.errorSystem.showFormErrors(errors, {...});
} else {
  showError(message); // Fallback
}
```

**Recommendation:** 
- **Option A:** Remove function, remove fallback `else` blocks (assume errorSystem always available)
- **Option B:** Keep minimal fallback version (just alert) for safety

---

### 4. `hideError()` in tn_wizard.js
**Location:** Lines 6697-6703

**Code:**
```javascript
function hideError() {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
  }
}
```

**Verification:**
- ⚠️ **STILL CALLED** - Found 1 call in tn_wizard.js (line 5834 in validateStep4)
- ⚠️ **BUT:** This is in old code that should be migrated
- ✅ **Safe to remove** after verifying validateStep4 doesn't need it

**Current Usage:**
- Line 5834: `hideError();` in validateStep4 (already migrated to use errorSystem)

---

### 5. `showError()` in wu_sc_wizard.js
**Location:** Lines 1989-1995

**Code:**
```javascript
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';
  }
}
```

**Verification:**
- ⚠️ **STILL CALLED** - Found 5 calls in wu_sc_wizard.js
- ⚠️ **BUT:** All calls are in fallback paths (`else` blocks)
- ✅ **Same decision as TN wizard showError()**

---

## ⚠️ KEEP (Different Purpose)

### 1. `showError()` in submit.js
**Location:** Lines 163-172

**Code:**
```javascript
function showError(message, details) {
	const box = document.getElementById('errorBox');
	const span = document.getElementById('errorMessage');
	if (span) {
		span.textContent = message || 'Error';
	}
	if (box) box.style.display = 'block';
	Logger.warn('submit error', { message, details });
}
```

**Verification:**
- ⚠️ **DIFFERENT ELEMENT** - Uses `#errorBox` and `#errorMessage` (not `#formMsg`)
- ⚠️ **STILL CALLED** - Found 6 calls in submit.js
- ⚠️ **BUT:** All calls are in fallback paths (when errorSystem not available)
- ✅ **Decision:** Keep for now, or migrate to errorSystem (already partially done)

**Note:** This is for a different error display element (`#errorBox`) that may still be used elsewhere.

---

### 2. `hideError()` in submit.js
**Location:** Lines 297-300

**Code:**
```javascript
function hideError() {
	const box = document.getElementById('errorBox');
	if (box) box.style.display = 'none';
}
```

**Verification:**
- ⚠️ **STILL CALLED** - Found 1 call in submit.js (line 393)
- ⚠️ **DIFFERENT ELEMENT** - Uses `#errorBox` (not `#formMsg`)
- ✅ **Decision:** Keep for now, or migrate to errorSystem

---

## 📋 TEMPLATE ELEMENTS

### `#formMsg` in Templates

**Found in:**
- `public/tn_templates.html` - 4 instances (lines 60, 86, 143, 289)
- `public/wu_sc_templates.html` - 4 instances (lines 24, 50, 107, 172)

**Current Usage:**
- Used by legacy `showError()` functions
- Not used by error system (error system creates its own elements)

**Decision:**
- **Option A:** Remove from templates (cleaner, but breaks if errorSystem fails)
- **Option B:** Keep for backward compatibility (safer)
- **Recommendation:** Keep for now, can remove later after thorough testing

---

## 🎨 CSS CLASSES

### `.msg.error` and `#formMsg.msg.error`

**Found in:**
- `public/css/error-system.css` - Lines 609-613, 646-650 (marked as "Legacy")
- `public/css/tn_legacy.css` - Lines 118-121, 359-361

**Current Usage:**
- Used by legacy `showError()` functions
- Not used by error system

**Decision:**
- **Option A:** Remove from error-system.css (keep in tn_legacy.css for backward compatibility)
- **Option B:** Keep in both for backward compatibility
- **Recommendation:** Keep in tn_legacy.css, remove from error-system.css (it's marked as legacy)

### `.invalid` class

**Found in:**
- `public/css/error-system.css` - Lines 622-628 (marked as "Legacy")

**Current Usage:**
- Used by `validation.js` functions (`validateEmailField`, `validatePhoneField`)
- May still be used by legacy validation code

**Decision:**
- ⚠️ **KEEP** - Still used by validation.js functions
- Can be removed later when validation.js is fully migrated

---

## 🗑️ DIRECT DOM MANIPULATION

### Pattern: `manager*Error.textContent` and `manager*Error.style.display`

**Verification:**
- ✅ **NOT FOUND** - No matches in codebase
- ✅ **Already removed** during migration

**Status:** ✅ Already cleaned up

---

## 📊 REMOVAL SUMMARY

### Functions to Remove:

1. ✅ **`highlightField()`** - tn_wizard.js lines 1197-1202 (NOT CALLED)
2. ✅ **`clearFieldHighlighting()`** - tn_wizard.js lines 1180-1192 (NOT CALLED)
3. ⚠️ **`showError()`** - tn_wizard.js lines 6667-6692 (CALLED in fallbacks - decision needed)
4. ⚠️ **`hideError()`** - tn_wizard.js lines 6697-6703 (CALLED once - verify first)
5. ⚠️ **`showError()`** - wu_sc_wizard.js lines 1989-1995 (CALLED in fallbacks - decision needed)

### Functions to Keep (Different Purpose):

1. ⚠️ **`showError()`** - submit.js lines 163-172 (Uses #errorBox, different element)
2. ⚠️ **`hideError()`** - submit.js lines 297-300 (Uses #errorBox, different element)

### Template Elements:

1. ⚠️ **`#formMsg`** - Keep in templates for backward compatibility (or remove after testing)

### CSS Classes:

1. ⚠️ **`.msg.error`** - Keep in tn_legacy.css, remove from error-system.css
2. ✅ **`.invalid`** - Keep (still used by validation.js)

---

## 🔍 EDGE CASES TO WATCH

1. **Error System Availability:**
   - What if `error-system.js` fails to load?
   - What if `window.errorSystem` is undefined?
   - **Solution:** Keep minimal fallback or ensure error-system.js always loads

2. **#formMsg Element:**
   - If removed from templates, legacy code will fail
   - If kept, it's harmless (just unused)
   - **Solution:** Keep for now, remove after thorough testing

3. **#errorBox Element:**
   - Used by submit.js showError()
   - May be used elsewhere
   - **Solution:** Check if #errorBox exists in HTML, or migrate submit.js fully

4. **Validation.js Functions:**
   - Still use `.invalid` class
   - Still use direct DOM manipulation
   - **Solution:** Keep `.invalid` CSS, migrate validation.js later

---

## ✅ RECOMMENDED CLEANUP STEPS

### Phase 1: Safe Removals (No Dependencies)

1. ✅ Remove `highlightField()` - tn_wizard.js
2. ✅ Remove `clearFieldHighlighting()` - tn_wizard.js
3. ⚠️ Remove `hideError()` - tn_wizard.js (after verifying line 5834)

### Phase 2: Fallback Cleanup (Requires Decision)

4. ⚠️ Remove `showError()` - tn_wizard.js (remove fallback `else` blocks)
5. ⚠️ Remove `showError()` - wu_sc_wizard.js (remove fallback `else` blocks)

### Phase 3: CSS Cleanup

6. ⚠️ Remove `.msg.error` from error-system.css (keep in tn_legacy.css)
7. ✅ Keep `.invalid` class (still used)

### Phase 4: Template Cleanup (After Testing)

8. ⚠️ Remove `#formMsg` from templates (after thorough testing)

---

## 📝 DETAILED REMOVAL INSTRUCTIONS

### Step 1: Remove highlightField() and clearFieldHighlighting()

**File:** `public/js/tn_wizard.js`

**Remove:**
- Lines 1180-1192: `clearFieldHighlighting()` function
- Lines 1194-1202: `highlightField()` function

**Verification:** ✅ Safe - Not called anywhere

---

### Step 2: Remove hideError() from tn_wizard.js

**File:** `public/js/tn_wizard.js`

**Remove:**
- Lines 6697-6703: `hideError()` function
- Line 5834: Call to `hideError()` (already replaced by errorSystem)

**Verification:** ⚠️ Check line 5834 first

---

### Step 3: Remove showError() fallbacks (Decision Required)

**Files:** `public/js/tn_wizard.js`, `public/js/wu_sc_wizard.js`

**Option A: Remove function and all fallback blocks**
- Remove `showError()` function
- Remove all `else { showError(...) }` blocks
- Assume errorSystem is always available

**Option B: Keep minimal fallback**
- Keep `showError()` but simplify to just `alert(message)`
- Keep fallback blocks for safety

**Recommendation:** Option A (remove completely) since error-system.js is loaded in register.html

---

### Step 4: Clean up CSS

**File:** `public/css/error-system.css`

**Remove:**
- Lines 609-613: `.msg.error` rule (marked as legacy)
- Lines 646-650: `#formMsg.msg.error` rule (marked as legacy)

**Keep:**
- Lines 622-628: `.invalid` class (still used by validation.js)

**File:** `public/css/tn_legacy.css`

**Keep:**
- `.msg` rules (lines 118-121, 359-361) - For backward compatibility

---

### Step 5: Template Elements (Optional - After Testing)

**Files:** `public/tn_templates.html`, `public/wu_sc_templates.html`

**Remove:**
- `<p class="msg" id="formMsg"></p>` elements

**Verification:** ⚠️ Only remove after confirming errorSystem works in all scenarios

---

## 🎯 FINAL RECOMMENDATION

### Immediate Removals (Safe):
1. ✅ `highlightField()` - tn_wizard.js
2. ✅ `clearFieldHighlighting()` - tn_wizard.js
3. ✅ `hideError()` - tn_wizard.js (after checking line 5834)

### Conditional Removals (Requires Testing):
4. ⚠️ `showError()` - tn_wizard.js (remove function + fallback blocks)
5. ⚠️ `showError()` - wu_sc_wizard.js (remove function + fallback blocks)
6. ⚠️ `.msg.error` CSS - error-system.css (keep in tn_legacy.css)
7. ⚠️ `#formMsg` elements - templates (remove after testing)

### Keep (Different Purpose or Still Used):
- `showError()` - submit.js (uses #errorBox, different element)
- `hideError()` - submit.js (uses #errorBox, different element)
- `.invalid` class CSS (still used by validation.js)

---

## 📋 VERIFICATION CHECKLIST

Before removing each function:

- [ ] Search codebase for function name
- [ ] Check if called in fallback paths only
- [ ] Verify replacement exists (errorSystem)
- [ ] Test errorSystem is always available
- [ ] Check for edge cases
- [ ] Document removal

---

## ⚠️ RISKS

1. **Error System Failure:** If error-system.js fails to load, no error display
   - **Mitigation:** Keep minimal fallback or ensure error-system.js always loads

2. **Template Changes:** Removing #formMsg breaks if any legacy code still references it
   - **Mitigation:** Keep in templates for now, remove after thorough testing

3. **CSS Dependencies:** Removing CSS might break legacy displays
   - **Mitigation:** Keep in tn_legacy.css for backward compatibility
