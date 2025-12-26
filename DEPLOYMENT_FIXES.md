# Deployment Fixes for WU/SC Wizard

## Issues Found

### 1. **Aggressive Cache Headers** ✅ FIXED
**Problem:** JS files cached for 1 year with `immutable` flag, preventing updates
**Location:** `vercel.json` line 30
**Fix:** Reduced cache to 1 hour and removed `immutable` flag
```json
"Cache-Control": "public, max-age=3600, must-revalidate"
```

### 2. **Templates Not Loading** ✅ FIXED (needs deployment)
**Problem:** WU/SC templates loaded asynchronously in HTML, but wizard initialized before templates available
**Location:** `public/js/event_bootstrap.js`
**Fix:** Added `loadWUSCTemplates()` function and await it before initializing wizard
- Function added at line 172
- Called before `initFormForEvent()` at line 524

### 3. **Team Count Dropdown Not Populating** ✅ FIXED (needs deployment)
**Problem:** 
- Templates not loaded when `loadStepContent()` runs
- Stale `wizardMount` reference after DOM recreation
**Location:** `public/js/wu_sc_wizard.js`
**Fixes:**
- Templates now loaded before wizard init (see #2)
- `loadStepContent()` always gets fresh DOM reference (line 480)

### 4. **Window Exports Missing** ⚠️ EXPECTED BEHAVIOR
**Problem:** `window.loadStep is not a function`
**Location:** `public/js/wu_sc_wizard.js` line 173
**Explanation:** Window exports are intentionally gated by `window.__DEV__` flag
- On production: `__DEV__` is `false`, so debug functions are NOT exposed (security)
- On localhost: `__DEV__` is `true`, so debug functions ARE exposed
- `loadStep` is available as `window.__DBG_WUSC.goToStep` when `__DEV__` is true

**Available debug functions (dev only):**
```javascript
window.__DBG_WUSC = {
  fillStep1: fillStep1TestData,
  fillStep2: fillStep2TestData,
  fillStep3: fillStep3TestData,
  fillAll: fillAllTestData,
  goToStep: loadStep  // ← This is loadStep
}

// Also available directly:
window.fillWUSCStep1()
window.fillWUSCStep2()
window.fillWUSCStep3()
window.fillWUSCAll()
```

## Build Process Analysis

### Build Scripts
1. **`scripts/inject-env.js`**: Only modifies `public/env.js` (Supabase config)
2. **`scripts/inject-version.js`**: Only modifies HTML files (adds version query params)
3. **No JS transformation**: JavaScript files are NOT modified during build

### Cache Busting
- Version query params added to all JS/CSS files in HTML: `?v=1.0.0-abc123`
- This should prevent stale file issues
- However, `immutable` cache header was preventing revalidation

## Deployment Checklist

### Before Deploying:
- [x] Cache headers updated (reduced from 1 year to 1 hour)
- [x] Templates loading fixed (`loadWUSCTemplates()` added)
- [x] Team count dropdown fixed (fresh DOM reference)
- [x] `__DEV__` flag logic updated (supports local network IPs)

### After Deploying:
1. **Clear browser cache** or use incognito mode
2. **Verify templates load**: Check Network tab for `wu_sc_templates.html`
3. **Verify team count dropdown**: Should show options 1-10
4. **Verify step navigation**: Step 0 → Step 1 should work

### Testing on Production:
```javascript
// In browser console:
// 1. Check if templates loaded
document.getElementById('wu-sc-step-1') // Should exist

// 2. Check if wizard initialized
document.getElementById('wuScWizardMount') // Should exist

// 3. Check team count dropdown
const select = document.getElementById('teamCount');
select.options.length // Should be 11 (placeholder + 1-10)

// 4. Debug functions (should NOT exist on production)
window.__DBG_WUSC // Should be undefined (__DEV__ is false)
```

## Root Causes Summary

1. **Cache Headers**: Too aggressive, prevented updates
2. **Template Loading**: Race condition - templates loaded async but wizard initialized immediately
3. **DOM Reference**: Stale reference after `initStepper()` recreates DOM
4. **Window Exports**: Intentionally gated (not a bug, but may be confusing)

## Files Modified

1. `vercel.json` - Cache headers reduced
2. `public/js/event_bootstrap.js` - Added `loadWUSCTemplates()`
3. `public/js/wu_sc_wizard.js` - Fixed stale DOM reference
4. `public/env.js` - Updated `__DEV__` detection

## Next Steps

1. **Deploy to Vercel** - All fixes are in place
2. **Test on production** - Use incognito mode to avoid cache
3. **Monitor** - Check browser console for errors
4. **Verify** - Team count dropdown should populate correctly
