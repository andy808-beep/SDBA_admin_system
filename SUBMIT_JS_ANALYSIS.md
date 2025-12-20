# submit.js Analysis

This document analyzes `public/js/submit.js` (7 KB) to understand:
1. What happens when a user clicks "Next" between steps?
2. Is validation done per-step or only at final submit?
3. What data structure is sent to the API on final submission?
4. Example of the payload structure

---

## Important Note: submit.js Scope

**`submit.js` does NOT handle "Next" button clicks between steps.**

The "Next" button functionality is handled by the wizard files:
- `tn_wizard.js` - TN wizard navigation
- `wu_sc_wizard.js` - WU/SC wizard navigation

`submit.js` only handles:
- Final "Submit" button click
- Payload construction
- API submission
- Rate limiting
- Error handling
- Receipt saving

---

## 1. What Happens When User Clicks "Next" Between Steps?

### Implementation Location

**Not in `submit.js`** - handled in wizard files:

#### TN Wizard (`tn_wizard.js` lines 5472-5483)
```javascript
// Next button
const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
  nextBtn.addEventListener('click', async () => {
    if (validateCurrentStep()) {
      saveCurrentStepData();
      if (currentStep < totalSteps) {
        await loadStep(currentStep + 1);
      }
    }
  });
}
```

#### WU/SC Wizard (`wu_sc_wizard.js` lines 1674-1682)
```javascript
if (nextBtn) {
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        loadStep(currentStep + 1);
      }
    }
  });
}
```

### Flow When "Next" is Clicked

1. **Validation** - `validateCurrentStep()` is called
   - Routes to step-specific validation function
   - Returns `true` if valid, `false` if errors found
   - Errors are displayed using the error system

2. **Save Data** - If validation passes:
   - `saveCurrentStepData()` (TN) or validation functions save data (WU/SC)
   - Data is saved to `sessionStorage` with prefixed keys
   - Example: `tn_team_count`, `tn_org_name`, `wu_team1_name_en`, etc.

3. **Navigate** - If validation passes and not on last step:
   - `loadStep(currentStep + 1)` is called
   - New step content is loaded from templates
   - Step initialization function runs
   - Data is restored from `sessionStorage` if available

4. **Block Navigation** - If validation fails:
   - User stays on current step
   - Error messages are displayed
   - Form fields with errors are highlighted

---

## 2. Validation: Per-Step or Final Submit Only?

### **Validation is done PER-STEP, not just at final submit**

#### Per-Step Validation

Each step has its own validation function:

**TN Wizard:**
- `validateStep1()` - Validates category selection and team count
- `validateStep2()` - Validates organization and manager data
- `validateStep3()` - Validates race day arrangements
- `validateStep4()` - Validates practice booking data
- `validateStep5()` - Validates summary (usually just returns `true`)

**WU/SC Wizard:**
- `validateStep1()` - Validates team count, names, boat types, divisions
- `validateStep2()` - Validates organization and manager data
- `validateStep3()` - Validates race day arrangements
- `validateStep4()` - Summary validation (returns `true`)

#### Validation Routing

```javascript
// From tn_wizard.js (lines 5499-5514)
function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return validateStep3();
    case 4:
      return validateStep4();
    case 5:
      return validateStep5();
    default:
      return true;
  }
}
```

#### Final Submit Validation

**Additional validation occurs at final submit:**

1. **Wizard-level validation** - `validateCurrentStep()` is called again
2. **Payload validation** - Basic checks in submission functions:
   ```javascript
   // From tn_wizard.js (lines 6326-6352)
   const errors = [];
   if (!payload.org_name?.trim()) {
     errors.push('Organization name is required');
   }
   if (!payload.team_names || payload.team_names.length === 0) {
     errors.push('At least one team is required');
   }
   if (!payload.managers || payload.managers.length === 0) {
     errors.push('At least one manager is required');
   }
   ```
3. **Server-side validation** - Edge function validates all data before insertion

---

## 3. Data Structure Sent to API on Final Submission

### Submission Flow

1. **User clicks "Submit" button**
2. **`handleSubmitClick()` is called** (line 354 in `submit.js`)
3. **Rate limit check** - Prevents too many submissions
4. **Payload construction** - `makePayload()` or wizard-specific collection
5. **API call** - `postJSON(EDGE_URL, payload)`
6. **Response handling** - Success shows confirmation, errors are displayed

### Payload Construction

#### For Single-Page Forms (via `submit.js`)

```javascript
// From submit.js (lines 76-107)
function makePayload() {
  const base = collectStateFromForm();
  const payload = {
    client_tx_id: getClientTxId(),
    event_short_ref: base.event_short_ref || getEventShortRef(),
    contact: base.contact || {},
    teams: base.teams || [],
    race_day: base.race_day || [],
    packages: base.packages || [],
    hp: readHoneypot()
  };
  
  if (window.__PRACTICE_ENABLED) {
    // Add practice data for TN events
    payload.practice = { teams: [...] };
  } else {
    payload.practice = [];
  }
  
  return payload;
}
```

#### For TN Wizard (via `tn_wizard.js`)

```javascript
// From tn_wizard.js (lines 6282-6309)
const payload = {
  client_tx_id: getClientTxId(),
  eventShortRef: getEventShortRef() || 'TN2025',
  category: raceCategory,
  season: window.__CONFIG?.event?.season || 2025,
  org_name: contact.name,
  org_address: contact.address,
  counts: {
    num_teams: teamCount,
    num_teams_opt1: opt1Count,
    num_teams_opt2: opt2Count
  },
  team_names: teams.map(t => t.name_en || t.name),
  team_names_en: teams.map(t => t.name_en || t.name),
  team_names_tc: teams.map(t => t.name_tc || ''),
  team_options: teams.map(t => t.option),
  managers: managers,
  race_day: { ... },
  practice: practice
};
```

#### For WU/SC Wizard (via `wu_sc_wizard.js`)

```javascript
// From wu_sc_wizard.js (lines 2151-2160)
return {
  eventShortRef: eventType.toUpperCase() + '2025',
  category: teams[0]?.category || 'warm_up',
  season: cfg?.event?.season || 2025,
  org_name: orgName,
  org_address: orgAddress,
  teams: teams,  // Array with boat_type, division, etc.
  managers: managers,
  race_day: raceDay
};
```

---

## 4. Example Payload Structures

### TN Form Payload Example

```json
{
  "client_tx_id": "550e8400-e29b-41d4-a716-446655440000",
  "eventShortRef": "TN2025",
  "category": "mixed_open",
  "season": 2025,
  "org_name": "Hong Kong Dragon Boat Association",
  "org_address": "123 Victoria Road, Central, Hong Kong",
  "counts": {
    "num_teams": 3,
    "num_teams_opt1": 2,
    "num_teams_opt2": 1
  },
  "team_names": [
    "Team Alpha",
    "Team Beta",
    "Team Gamma"
  ],
  "team_names_en": [
    "Team Alpha",
    "Team Beta",
    "Team Gamma"
  ],
  "team_names_tc": [
    "隊伍甲",
    "隊伍乙",
    "隊伍丙"
  ],
  "team_options": [
    "opt1",
    "opt1",
    "opt2"
  ],
  "managers": [
    {
      "name": "John Doe",
      "mobile": "+85291234567",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "mobile": "+85292345678",
      "email": "jane@example.com"
    },
    {
      "name": "Bob Wilson",
      "mobile": "+85293456789",
      "email": "bob@example.com"
    }
  ],
  "race_day": {
    "marqueeQty": 2,
    "steerWithQty": 3,
    "steerWithoutQty": 1,
    "junkBoatQty": 1,
    "junkBoatNo": "JUNK-001",
    "speedboatQty": 0,
    "speedBoatNo": ""
  },
  "practice": {
    "teams": [
      {
        "team_key": "t1",
        "dates": [
          {
            "pref_date": "2025-03-15",
            "duration_hours": 2,
            "helper": "ST"
          },
          {
            "pref_date": "2025-03-22",
            "duration_hours": 1,
            "helper": "S"
          }
        ],
        "slot_ranks": [
          {
            "rank": 1,
            "slot_code": "SAT2_0800_1000"
          },
          {
            "rank": 2,
            "slot_code": "SAT2_1000_1200"
          },
          {
            "rank": 3,
            "slot_code": "SAT2_1400_1600"
          }
        ]
      },
      {
        "team_key": "t2",
        "dates": [
          {
            "pref_date": "2025-03-16",
            "duration_hours": 2,
            "helper": "NONE"
          }
        ],
        "slot_ranks": [
          {
            "rank": 1,
            "slot_code": "SUN2_0800_1000"
          }
        ]
      }
    ]
  }
}
```

### WU/SC Form Payload Example

```json
{
  "client_tx_id": "550e8400-e29b-41d4-a716-446655440000",
  "eventShortRef": "WU2025",
  "category": "Standard Boat – Men",
  "season": 2025,
  "org_name": "Hong Kong Dragon Boat Association",
  "org_address": "123 Victoria Road, Central, Hong Kong",
  "teams": [
    {
      "name": "Team Alpha",
      "name_en": "Team Alpha",
      "name_tc": "隊伍甲",
      "boat_type": "Standard Boat",
      "division": "Standard Boat – Men",
      "category": "Standard Boat – Men"
    },
    {
      "name": "Team Beta",
      "name_en": "Team Beta",
      "name_tc": "隊伍乙",
      "boat_type": "Small Boat",
      "division": "Small Boat – Ladies",
      "category": "Small Boat – Ladies"
    },
    {
      "name": "Team Gamma",
      "name_en": "Team Gamma",
      "name_tc": "隊伍丙",
      "boat_type": "Standard Boat",
      "division": "Standard Boat – Mixed",
      "category": "Standard Boat – Mixed"
    }
  ],
  "managers": [
    {
      "name": "John Doe",
      "mobile": "+85291234567",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "mobile": "+85292345678",
      "email": "jane@example.com"
    },
    {
      "name": "Bob Wilson",
      "mobile": "+85293456789",
      "email": "bob@example.com"
    }
  ],
  "race_day": {
    "marqueeQty": 2,
    "steerWithQty": 3,
    "steerWithoutQty": 1,
    "junkBoatNo": "JUNK-001",
    "junkBoatQty": 1,
    "speedBoatNo": "",
    "speedboatQty": 0
  }
}
```

### Single-Page Form Payload Example (via `submit.js`)

```json
{
  "client_tx_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_short_ref": "TN2025",
  "contact": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+85291234567"
  },
  "teams": [
    {
      "name": "Team Alpha",
      "division_code": "M",
      "package_id": "option_1_non_corp"
    }
  ],
  "race_day": [
    {
      "item_code": "marquee",
      "qty": 2
    }
  ],
  "packages": [
    {
      "package_id": "option_1_non_corp",
      "qty": 1
    }
  ],
  "practice": {
    "teams": [
      {
        "team_key": "t1",
        "dates": [
          {
            "pref_date": "2025-03-15",
            "duration_hours": 2,
            "helper": "ST"
          }
        ],
        "slot_ranks": [
          {
            "rank": 1,
            "slot_code": "SAT2_0800_1000"
          }
        ]
      }
    ]
  },
  "hp": ""
}
```

---

## Key Functions in submit.js

### Core Functions

| Function | Purpose | Lines |
|----------|---------|-------|
| `makePayload()` | Constructs payload from form state | 76-107 |
| `postJSON()` | Sends POST request to edge function | 109-131 |
| `handleSubmitClick()` | Handles submit button click | 354-502 |
| `bindSubmit()` | Binds submit button event listener | 504-524 |

### Utility Functions

| Function | Purpose | Lines |
|----------|---------|-------|
| `getClientTxId()` | Gets/generates client transaction ID | 37-45 |
| `getEventShortRef()` | Gets event short reference from config | 32-35 |
| `readHoneypot()` | Reads honeypot field value | 47-50 |
| `saveReceipt()` | Saves receipt to localStorage | 302-316 |
| `showConfirmation()` | Displays confirmation message | 318-352 |
| `mapError()` | Maps error codes to user messages | 133-161 |

### Rate Limiting Functions

| Function | Purpose | Lines |
|----------|---------|-------|
| `updateSubmitButtonState()` | Updates button based on rate limit | 217-270 |
| `startRateLimitMonitoring()` | Monitors rate limit status | 276-295 |
| `formatTimeRemaining()` | Formats countdown timer | 180-211 |

---

## Summary

### 1. "Next" Button Behavior
- **Not handled by `submit.js`**
- Handled by wizard files (`tn_wizard.js`, `wu_sc_wizard.js`)
- Flow: Validate → Save to sessionStorage → Navigate to next step

### 2. Validation Strategy
- **Per-step validation** when clicking "Next"
- **Additional validation** at final submit
- **Server-side validation** in edge function

### 3. Data Structure
- **TN**: Uses `counts`, `team_names`, `team_options`, `practice` structure
- **WU/SC**: Uses `teams[]` array with `boat_type`, `division` structure
- **Single-page**: Uses `contact`, `teams`, `race_day`, `packages` structure

### 4. Payload Examples
- See examples above for TN, WU/SC, and single-page forms
- All include `client_tx_id` for idempotency
- All include `eventShortRef` or `event_short_ref`
- Practice data only included for TN events

---

## Related Files

- `public/js/tn_wizard.js` - TN wizard navigation and validation
- `public/js/wu_sc_wizard.js` - WU/SC wizard navigation and validation
- `public/js/ui_bindings.js` - `collectStateFromForm()` for single-page forms
- `supabase/functions/submit_registration/index.ts` - Edge function that receives payloads

