# Auto-Save Removal

## Date: December 2024

## What Was Removed:
- ❌ `public/js/auto-save.js` - localStorage draft persistence module
- ❌ AutoSave integration from `tn_wizard.js`
- ❌ AutoSave integration from `wu_sc_wizard.js`
- ❌ Cross-session draft recovery prompts
- ❌ "Draft saved" indicators
- ❌ beforeunload warnings
- ❌ `getTNEventShortRef()` function from `tn_wizard.js`
- ❌ `getWUSCEventShortRef()` function from `wu_sc_wizard.js`
- ❌ AutoSave script reference from `register.html`

## What Was Kept:
- ✅ `public/js/field-restore-utility.js` - Field restoration utilities (used for Back button restoration)
- ✅ sessionStorage save/restore in all wizards
- ✅ Back button restoration (core requirement)
- ✅ All existing `saveStepXData()` functions
- ✅ All existing `restoreStepXData()` functions:
  - `restoreTNStep1Teams()` - TN Step 1 team restoration
  - `restoreTNStep2()` - TN Step 2 org/manager restoration
  - `restoreTNStep3()` - TN Step 3 race day restoration
  - `restoreWUSCStep1Teams()` - WU/SC Step 1 team restoration
  - `restoreWUSCStep2()` - WU/SC Step 2 org/manager restoration
  - `restoreWUSCStep3()` - WU/SC Step 3 race day restoration

## Reason for Removal:
1. **Client requirement:** Only Back button restoration needed (not cross-session persistence)
2. **Security concern:** Cross-session persistence on shared devices could expose user data
3. **Simplicity:** Reduced code complexity and maintenance burden
4. **Privacy:** Data auto-clears when tab closes, protecting user privacy

## Current Behavior:
- ✅ User fills form → Data saved to sessionStorage on Next click
- ✅ User clicks Back → Data restored from sessionStorage
- ✅ User refreshes page → Data persists (sessionStorage survives refresh)
- ✅ User closes tab → Data cleared (privacy protection)
- ❌ User closes browser and reopens → Starts fresh (by design)

## Technical Details:

### Storage Strategy:
- **sessionStorage:** Used for all form data (team names, org info, managers, race day data)
- **localStorage:** Only used for `client_tx_id` (idempotency, not form data)

### Restoration Flow:
1. User clicks "Next" → `saveStepXData()` saves to sessionStorage
2. User clicks "Back" → `initStepX()` calls `restoreStepXData()` function
3. Restoration function uses `FieldRestoreUtility` to populate form fields
4. Data persists within same browser session

### Files Modified:
- `public/js/tn_wizard.js` - Removed AutoSave initialization, event listeners, and cleanup
- `public/js/wu_sc_wizard.js` - Removed AutoSave initialization, event listeners, and cleanup
- `public/register.html` - Removed auto-save.js script reference

### Files Deleted:
- `public/js/auto-save.js` - Complete auto-save module (7,700 bytes)

## Testing Checklist:
- [x] TN Step 1 → Next → Back → Data shows ✅
- [x] TN Step 2 → Next → Back → Data shows ✅
- [x] TN Step 3 → Next → Back → Data shows ✅
- [x] WU Step 1 → Next → Back → Data shows ✅
- [x] WU Step 2 → Next → Back → Data shows ✅
- [x] WU Step 3 → Next → Back → Data shows ✅
- [x] SC Step 1 → Next → Back → Data shows ✅
- [x] SC Step 2 → Next → Back → Data shows ✅
- [x] SC Step 3 → Next → Back → Data shows ✅
- [x] Close tab → Reopen → Starts fresh (privacy) ✅
- [x] Refresh page → Data persists (sessionStorage) ✅
- [x] No AutoSave references in code ✅
- [x] No localStorage usage for form data ✅

## Verification Commands:
```bash
# Verify no AutoSave references
grep -r "AutoSave" public/js/tn_wizard.js public/js/wu_sc_wizard.js
# Expected: No matches

# Verify sessionStorage usage (should find many)
grep -r "sessionStorage.setItem" public/js/tn_wizard.js public/js/wu_sc_wizard.js
# Expected: 30+ matches

# Verify localStorage only for client_tx_id
grep -r "localStorage" public/js/tn_wizard.js public/js/wu_sc_wizard.js
# Expected: Only client_tx_id references
```

## Rollback Plan:
If needed, restore from git commit before this change.

**Files to restore:**
- `public/js/auto-save.js` - Auto-save module
- Previous versions of `tn_wizard.js` (with AutoSave integration)
- Previous versions of `wu_sc_wizard.js` (with AutoSave integration)
- Previous version of `register.html` (with auto-save.js script tag)

**Restoration steps:**
1. Restore `auto-save.js` from git history
2. Restore AutoSave initialization code in `initTNWizard()` and `initWUSCWizard()`
3. Restore AutoSave event listeners (input, change, beforeunload)
4. Restore AutoSave cleanup in submit handlers
5. Add back script tag in `register.html`

## Related Documentation:
- `SAVE_RESTORE_ANALYSIS.md` - Original analysis of save/restore mechanisms
- `FORMDATA_STORAGE_ANALYSIS.md` - Form data storage analysis

## Notes:
- Field restoration utilities (`field-restore-utility.js`) remain in use for debugging and restoration
- All restoration functions use `FieldRestoreUtility` for consistent field restoration
- sessionStorage keys follow patterns: `tn_*`, `wu_*`, `sc_*` prefixes
- No breaking changes to existing form submission flow
