# Debug Functions Reference

**Status:** 🔐 **Localhost Only** (gated behind `window.__DEV__`)

## Availability

Debug functions are **only exposed** when running on:
- `localhost`
- `127.0.0.1`

On production hostnames (e.g., `*.vercel.app`, custom domains), these functions are **not defined** and will be `undefined`.

---

## 🛠️ Global Debug Utilities

### `window.__DBG`

Available for all events (TN/WU/SC).

```javascript
// Dump current form state
await __DBG.dumpState()

// Refresh config from database (bypass cache)
await __DBG.refreshConfig()

// Clear all cached config
__DBG.clearCache()
```

**Use Cases:**
- Inspect payload structure before submission
- Force reload event configuration during development
- Clear stale localStorage data

---

## 🏮 TN Wizard Debug Functions

### `window.__DBG_TN`

Available only when `?e=tn` (TN wizard is active).

#### Auto-fill Helpers

```javascript
// Fill form with single team data (all 5 steps)
__DBG_TN.fillSingleTeam()

// Fill form with multiple teams (3 teams)
__DBG_TN.fillMultipleTeams()

// Preview specific step
__DBG_TN.previewStep4()  // Jump to practice booking
__DBG_TN.previewStep5()  // Jump to summary
```

#### Data Inspection

```javascript
// Collect current form data (same structure as submission)
__DBG_TN.getFormState()

// Read practice data for a specific team
__DBG_TN.readTeamRows('t1')   // Returns array of { pref_date, duration_hours, helper }
__DBG_TN.readTeamRanks('t1')  // Returns array of { rank, slot_code }

// Get session data
__DBG_TN.getSessionData()
```

#### Testing & Validation

```javascript
// Simulate submission (validate without sending)
__DBG_TN.simulateSubmission()

// Test payload structure
__DBG_TN.testPayloadStructure()

// Validate current step
__DBG_TN.validateCurrentStep()
```

#### Data Management

```javascript
// Clear specific sections
__DBG_TN.clearStep4()       // Clear practice booking data
__DBG_TN.clearStep5()       // Clear all data

// Start fresh (reload page and clear session)
__DBG_TN.startFresh()

// Generate fresh transaction ID
__DBG_TN.generateFreshTxId()
```

#### Advanced Debugging

```javascript
// DOM snapshot (for template verification)
__DBG_TN.domSnapshot()

// Test calendar data collection
__DBG_TN.testCalendarData()

// Test team switch functionality
__DBG_TN.testTeamSwitch()

// Test copy button
__DBG_TN.testCopyButton()

// Performance metrics
__DBG_TN.getPerformanceMetrics()
```

---

## 🚤 WU/SC Wizard Debug Functions

### `window.__DBG_WUSC`

Available when `?e=wu` or `?e=sc` (WU/SC wizard is active).

#### Auto-fill Helpers

```javascript
// Fill Step 1 (team names, boat types, divisions)
__DBG_WUSC.fillStep1()

// Fill Step 2 (organization & managers)
__DBG_WUSC.fillStep2()

// Fill Step 3 (race day arrangements)
__DBG_WUSC.fillStep3()

// Fill all steps and navigate to Step 3
__DBG_WUSC.fillAll()
// OR use the shorter global alias:
fillWUSCAll()

// Jump to specific step
__DBG_WUSC.goToStep(2)
```

**Example Workflow:**
```javascript
// Quick test of full WU/SC flow
fillWUSCAll()  // Fills all steps, navigates to step 3
// Review data, then manually click "Next" to Step 4 (summary)
```

---

## 📝 Direct Window Shortcuts

For convenience, some functions are also exposed directly on `window`:

### TN Shortcuts

```javascript
window.fillSingleTeam()
window.fillMultipleTeams()
window.testSubmission()
window.clearStep4()
window.clearStep5()
window.startFresh()
```

### WU/SC Shortcuts

```javascript
window.fillWUSCAll()
window.fillWUSCStep1()
window.fillWUSCStep2()
window.fillWUSCStep3()
```

---

## 🧪 Test Usage Examples

### Example 1: Quick TN Single Team Test

```javascript
// 1. Open: http://localhost:5000/register.html?e=tn
// 2. Open console, run:
__DBG_TN.fillSingleTeam()

// 3. Navigate through steps (or jump directly):
__DBG_TN.previewStep5()

// 4. Test submission (validate without sending):
__DBG_TN.simulateSubmission()
```

### Example 2: Test WU/SC Full Flow

```javascript
// 1. Open: http://localhost:5000/register.html?e=wu
// 2. Open console, run:
fillWUSCAll()

// Auto-fills 3 teams and navigates to Step 3
// Click "Next" to see summary (Step 4)
```

### Example 3: Test Practice Booking Data

```javascript
// 1. Fill form with multiple teams:
__DBG_TN.fillMultipleTeams()

// 2. Jump to practice booking:
__DBG_TN.previewStep4()

// 3. Inspect practice data:
__DBG_TN.readTeamRows('t1')
__DBG_TN.readTeamRanks('t1')

// 4. Test calendar data collection:
__DBG_TN.testCalendarData()
```

### Example 4: Debug State Issues

```javascript
// Get complete form state
const state = await __DBG.dumpState()
console.log('Current State:', state)

// Or TN-specific state:
const tnState = __DBG_TN.getFormState()
console.log('TN State:', tnState)

// Check session storage
const session = __DBG_TN.getSessionData()
console.log('Session Data:', session)
```

---

## 🔒 Production Safety

### How Gating Works

```javascript
// In public/env.js:
window.__DEV__ = ['localhost', '127.0.0.1'].includes(location.hostname);

// In each wizard file:
if (window.__DEV__) {
  window.__DBG_TN = { /* debug functions */ };
}
```

### Test Safety

Tests (e.g., `tests/tn_step4.spec.ts`) use **optional chaining** to safely handle missing debug APIs:

```typescript
// Safe in both dev and production environments
await page.evaluate(() => (window as any).__DBG_TN?.fillSingleTeam?.());
```

If `__DBG_TN` is undefined (production), the test gracefully skips or uses alternative methods.

---

## 📚 Related Documentation

- **`docs/form_code_flow_report.md`** - Full code flow audit (section 7: Dev/Prod Guards)
- **`docs/cleanup_reference_audit.md`** - Reference audit proving safe gating
- **`ARCHITECTURE_SUMMARY.md`** - Overall system architecture
- **`tests/tn_step4.spec.ts`** - Example test using debug functions

---

**Last Updated:** 2025-11-02  
**Branch:** `chore/cleanup-forms-2025-11-02`

