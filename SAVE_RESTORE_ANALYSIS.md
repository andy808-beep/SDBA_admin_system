# Save/Restore Analysis: Data Persistence on Back Navigation

This document analyzes the save/restore functionality in `tn_wizard.js` and `wu_sc_wizard.js` to identify gaps where data is saved but not restored when users click the Back button.

---

## Analysis Methodology

For each step, we examine:
1. **What is saved** - Fields saved to sessionStorage in `saveStepXData()` or validation functions
2. **What is restored** - Fields restored from sessionStorage in `initStepX()`
3. **Gaps** - Fields that are saved but NOT restored

---

## TN Wizard Analysis

### Step 1: Teams & Categories

#### Fields Saved (`saveStep1Data()` + `saveTeamData()`)

**From `saveStep1Data()` (lines 5945-5955):**
- ✅ `tn_team_count` - Team count selection

**From `saveTeamData()` (lines 1932-1961):**
- ✅ `tn_team_name_en_{i}` - Team name (English) for each team
- ✅ `tn_team_name_tc_{i}` - Team name (Traditional Chinese) for each team
- ✅ `tn_team_category_{i}` - Team category for each team
- ✅ `tn_team_option_{i}` - Entry option (opt1/opt2) for each team

**Not Saved (but used in submission):**
- ❌ `tn_race_category` - Race category (derived from first team's category in submission)
- ❌ `tn_opt1_count` - Option 1 count (calculated from teams in submission)
- ❌ `tn_opt2_count` - Option 2 count (calculated from teams in submission)

#### Fields Restored (`initStep1()` → `restoreTeamCountSelection()` → `loadTeamData()`)

**From `restoreTeamCountSelection()` (lines 1006-1051):**
- ✅ `tn_team_count` - Restores team count selection

**From `loadTeamData()` (lines 1877-1927):**
- ✅ `tn_team_name_en_{i}` - Restores team name (English)
- ✅ `tn_team_name_tc_{i}` - Restores team name (Traditional Chinese)
- ✅ `tn_team_category_{i}` - Restores team category (triggers change event to populate options)
- ✅ `tn_team_option_{i}` - Restores entry option (with setTimeout to ensure options are populated)

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| `teamCount` | ✅ | ✅ | None |
| `teamNameEn{i}` | ✅ | ✅ | None |
| `teamNameTc{i}` | ✅ | ✅ | None |
| `teamCategory{i}` | ✅ | ✅ | None |
| `teamOption{i}` | ✅ | ✅ | None (uses setTimeout to handle async option population) |

**✅ Step 1: All fields properly saved and restored**

---

### Step 2: Organization & Managers

#### Fields Saved (`saveStep2Data()`)

**From `saveStep2Data()` (lines 5960-6025):**
- ✅ `tn_org_name` - Organization name
- ✅ `tn_org_address` - Organization address (note: field ID is `orgAddress`, saved as `tn_org_address`)
- ✅ `tn_manager1_name` - Manager 1 name
- ✅ `tn_manager1_phone` - Manager 1 phone (normalized to +852 format)
- ✅ `tn_manager1_email` - Manager 1 email
- ✅ `tn_manager2_name` - Manager 2 name
- ✅ `tn_manager2_phone` - Manager 2 phone (normalized to +852 format)
- ✅ `tn_manager2_email` - Manager 2 email
- ✅ `tn_manager3_name` - Manager 3 name (optional)
- ✅ `tn_manager3_phone` - Manager 3 phone (normalized to +852 format, optional)
- ✅ `tn_manager3_email` - Manager 3 email (optional)

#### Fields Restored (`initStep2()` → `loadOrganizationData()`)

**From `loadOrganizationData()` (lines 1800-1874):**
- ✅ `tn_org_name` - Restores to `orgName` field
- ✅ `tn_org_address` - Restores to `orgAddress` field
- ✅ `tn_manager1_name` - Restores to `manager1Name` field
- ✅ `tn_manager1_phone` - Restores to `manager1Phone` field (extracts local number, removes +852 prefix)
- ✅ `tn_manager1_email` - Restores to `manager1Email` field
- ✅ `tn_manager2_name` - Restores to `manager2Name` field
- ✅ `tn_manager2_phone` - Restores to `manager2Phone` field (extracts local number)
- ✅ `tn_manager2_email` - Restores to `manager2Email` field
- ✅ `tn_manager3_name` - Restores to `manager3Name` field
- ✅ `tn_manager3_phone` - Restores to `manager3Phone` field (extracts local number)
- ✅ `tn_manager3_email` - Restores to `manager3Email` field

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| `orgName` | ✅ | ✅ | None |
| `orgAddress` | ✅ | ✅ | None (saved as `tn_org_address`, restored correctly) |
| `manager1Name` | ✅ | ✅ | None |
| `manager1Phone` | ✅ | ✅ | None (normalized on save, extracted on restore) |
| `manager1Email` | ✅ | ✅ | None |
| `manager2Name` | ✅ | ✅ | None |
| `manager2Phone` | ✅ | ✅ | None (normalized on save, extracted on restore) |
| `manager2Email` | ✅ | ✅ | None |
| `manager3Name` | ✅ | ✅ | None |
| `manager3Phone` | ✅ | ✅ | None (normalized on save, extracted on restore) |
| `manager3Email` | ✅ | ✅ | None |

**✅ Step 2: All fields properly saved and restored**

---

### Step 3: Race Day Arrangements

#### Fields Saved (`saveStep3Data()`)

**From `saveStep3Data()` (lines 6030-6045):**
- ✅ `tn_race_day` - JSON object containing all `.qty-input` values
  - Keys are input IDs (e.g., `marqueeQty`, `steerWithQty`, `steerWithoutQty`, `junkBoatQty`, `speedboatQty`, etc.)
  - Values are quantities (numbers)

**Note:** Race day items are loaded dynamically from database, so input IDs may vary based on `item_code` from database.

#### Fields Restored (`initStep3()` → `loadRaceDayData()`)

**From `loadRaceDayData()` (lines 2154-2178):**
- ✅ All fields from `tn_race_day` JSON object
  - Iterates through all entries in the saved object
  - Restores values to inputs by ID
  - Only restores if value is a valid number

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| All `.qty-input` fields | ✅ | ✅ | None (dynamic restoration based on saved JSON) |

**✅ Step 3: All fields properly saved and restored**

---

### Step 4: Practice Booking

#### Fields Saved (`saveStep4Data()`)

**From `saveStep4Data()` (lines 6050-6061):**
- ✅ `tn_practice_all_teams` - JSON array of practice data for all teams
  - Contains: `team_index`, `dates[]`, `slotPrefs_2hr`, `slotPrefs_1hr`

**Also saved via practice store functions:**
- ✅ Practice rows per team (via `writeTeamRows(teamKey, rows)`)
- ✅ Slot ranks per team (via `writeTeamRanks(teamKey, ranks)`)

**Storage mechanism:**
- Practice data is stored in `tn_practice_store.js` using `sessionStorage` with keys like:
  - `tn_practice_team_t{i}` - Practice rows for team i
  - `tn_slot_ranks_t{i}` - Slot preference ranks for team i

#### Fields Restored (`initStep4()`)

**From `initStep4()` (lines 2184-2228):**
- ❌ **NO explicit restoration of practice data**
- Only initializes:
  - Practice configuration
  - Calendar container
  - Slot preferences (populates dropdowns, but doesn't restore selected values)
  - Team selector
  - Navigation handlers

**Practice data restoration:**
- Practice data appears to be loaded on-demand when:
  - Team selector changes (via `updateCalendarForTeam()`)
  - Calendar is initialized (via `initCalendarContainer()`)
- However, **no explicit restoration** of saved practice dates or slot preferences when navigating back

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| Practice dates (per team) | ✅ | ❌ | **GAP: Not restored on Back navigation** |
| Slot preferences 2hr (per team) | ✅ | ❌ | **GAP: Not restored on Back navigation** |
| Slot preferences 1hr (per team) | ✅ | ❌ | **GAP: Not restored on Back navigation** |
| Selected team in team selector | ❌ | ❌ | Not saved, resets to Team 1 |

**❌ Step 4: Practice data is saved but NOT restored when navigating back**

**Impact:** Users lose their practice booking selections when clicking Back and returning to Step 4.

---

## WU/SC Wizard Analysis

### Step 1: Teams

#### Fields Saved (`validateStep1()`)

**From `validateStep1()` (lines 1716-1811):**
- ✅ `${eventType}_team_count` - Team count
- ✅ `${eventType}_team{i}_name_en` - Team name (English) for each team
- ✅ `${eventType}_team{i}_name_tc` - Team name (Traditional Chinese) for each team
- ✅ `${eventType}_team{i}_boatType` - Boat type for each team
- ✅ `${eventType}_team{i}_division` - Division for each team

#### Fields Restored (`initStep1()`)

**From `initStep1()` (lines 708-782):**
- ✅ `${eventType}_team_count` - Restores team count selection
- ❌ **Team details NOT restored:**
  - Team names (EN/TC)
  - Boat types
  - Divisions

**Restoration logic:**
- `initStep1()` only restores team count
- When team count is restored, it triggers `handleTeamCountChange()` which calls `renderTeamDetails()`
- `renderTeamDetails()` creates new form fields but **does NOT populate them with saved data**

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| `teamCount` | ✅ | ✅ | None |
| `teamNameEn{i}` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `teamNameTc{i}` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `boatType{i}` (radio) | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `division{i}` (radio) | ✅ | ❌ | **GAP: Saved but NOT restored** |

**❌ Step 1: Team details are saved but NOT restored when navigating back**

**Impact:** Users lose their team name, boat type, and division selections when clicking Back and returning to Step 1.

---

### Step 2: Team Information

#### Fields Saved (`validateStep2()`)

**From `validateStep2()` (lines 1816-1953):**
- ✅ `${eventType}_orgName` - Organization name
- ✅ `${eventType}_mailingAddress` - Mailing address
- ✅ `${eventType}_manager1Name` - Manager 1 name
- ✅ `${eventType}_manager1Phone` - Manager 1 phone (normalized)
- ✅ `${eventType}_manager1Email` - Manager 1 email
- ✅ `${eventType}_manager2Name` - Manager 2 name
- ✅ `${eventType}_manager2Phone` - Manager 2 phone (normalized)
- ✅ `${eventType}_manager2Email` - Manager 2 email
- ✅ `${eventType}_manager3Name` - Manager 3 name (optional)
- ✅ `${eventType}_manager3Phone` - Manager 3 phone (normalized, optional)
- ✅ `${eventType}_manager3Email` - Manager 3 email (optional)

#### Fields Restored (`initStep2()`)

**From `initStep2()` (lines 1163-1177):**
- ❌ **NO restoration of organization or manager data**
- Only:
  - Renders team name fields (read-only, from Step 1)
  - Renders manager contact fields (empty)
  - Sets up validation

**No restoration function called:**
- No equivalent to `loadOrganizationData()` in WU/SC wizard
- Fields are created but not populated with saved values

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| `orgName` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `mailingAddress` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager1Name` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager1Phone` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager1Email` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager2Name` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager2Phone` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager2Email` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager3Name` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager3Phone` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `manager3Email` | ✅ | ❌ | **GAP: Saved but NOT restored** |

**❌ Step 2: All organization and manager fields are saved but NOT restored when navigating back**

**Impact:** Users lose all their organization and manager contact information when clicking Back and returning to Step 2.

---

### Step 3: Race Day Arrangements

#### Fields Saved (`validateStep3()`)

**From `validateStep3()` (lines 1958-1982):**
- ✅ `${eventType}_marqueeQty` - Marquee quantity
- ✅ `${eventType}_steerWithQty` - Steersman with practice quantity
- ✅ `${eventType}_steerWithoutQty` - Steersman without practice quantity
- ✅ `${eventType}_junkBoatNo` - Junk boat number
- ✅ `${eventType}_junkBoatQty` - Junk boat quantity
- ✅ `${eventType}_speedBoatNo` - Speed boat number
- ✅ `${eventType}_speedboatQty` - Speed boat quantity

#### Fields Restored (`initStep3()`)

**From `initStep3()` (lines 1406-1411):**
- ❌ **Empty function - NO restoration**
- Only contains a comment: "This will be similar to TN Step 3"
- Does not create form or restore data

#### Issues Found

| Field ID | Saved? | Restored? | Issue? |
|----------|--------|-----------|--------|
| `marqueeQty` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `steerWithQty` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `steerWithoutQty` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `junkBoatNo` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `junkBoatQty` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `speedBoatNo` | ✅ | ❌ | **GAP: Saved but NOT restored** |
| `speedboatQty` | ✅ | ❌ | **GAP: Saved but NOT restored** |

**❌ Step 3: All race day fields are saved but NOT restored when navigating back**

**Impact:** Users lose all their race day arrangement selections when clicking Back and returning to Step 3.

---

## Summary Table

### TN Wizard

| Step | Field ID | Saved? | Restored? | Issue? |
|------|----------|--------|-----------|--------|
| **Step 1** | `teamCount` | ✅ | ✅ | None |
| | `teamNameEn{i}` | ✅ | ✅ | None |
| | `teamNameTc{i}` | ✅ | ✅ | None |
| | `teamCategory{i}` | ✅ | ✅ | None |
| | `teamOption{i}` | ✅ | ✅ | None |
| **Step 2** | `orgName` | ✅ | ✅ | None |
| | `orgAddress` | ✅ | ✅ | None |
| | `manager1Name` | ✅ | ✅ | None |
| | `manager1Phone` | ✅ | ✅ | None |
| | `manager1Email` | ✅ | ✅ | None |
| | `manager2Name` | ✅ | ✅ | None |
| | `manager2Phone` | ✅ | ✅ | None |
| | `manager2Email` | ✅ | ✅ | None |
| | `manager3Name` | ✅ | ✅ | None |
| | `manager3Phone` | ✅ | ✅ | None |
| | `manager3Email` | ✅ | ✅ | None |
| **Step 3** | All `.qty-input` fields | ✅ | ✅ | None |
| **Step 4** | Practice dates (per team) | ✅ | ❌ | **GAP: Not restored** |
| | Slot preferences 2hr | ✅ | ❌ | **GAP: Not restored** |
| | Slot preferences 1hr | ✅ | ❌ | **GAP: Not restored** |

### WU/SC Wizard

| Step | Field ID | Saved? | Restored? | Issue? |
|------|----------|--------|-----------|--------|
| **Step 1** | `teamCount` | ✅ | ✅ | None |
| | `teamNameEn{i}` | ✅ | ❌ | **GAP: Not restored** |
| | `teamNameTc{i}` | ✅ | ❌ | **GAP: Not restored** |
| | `boatType{i}` | ✅ | ❌ | **GAP: Not restored** |
| | `division{i}` | ✅ | ❌ | **GAP: Not restored** |
| **Step 2** | `orgName` | ✅ | ❌ | **GAP: Not restored** |
| | `mailingAddress` | ✅ | ❌ | **GAP: Not restored** |
| | `manager1Name` | ✅ | ❌ | **GAP: Not restored** |
| | `manager1Phone` | ✅ | ❌ | **GAP: Not restored** |
| | `manager1Email` | ✅ | ❌ | **GAP: Not restored** |
| | `manager2Name` | ✅ | ❌ | **GAP: Not restored** |
| | `manager2Phone` | ✅ | ❌ | **GAP: Not restored** |
| | `manager2Email` | ✅ | ❌ | **GAP: Not restored** |
| | `manager3Name` | ✅ | ❌ | **GAP: Not restored** |
| | `manager3Phone` | ✅ | ❌ | **GAP: Not restored** |
| | `manager3Email` | ✅ | ❌ | **GAP: Not restored** |
| **Step 3** | `marqueeQty` | ✅ | ❌ | **GAP: Not restored** |
| | `steerWithQty` | ✅ | ❌ | **GAP: Not restored** |
| | `steerWithoutQty` | ✅ | ❌ | **GAP: Not restored** |
| | `junkBoatNo` | ✅ | ❌ | **GAP: Not restored** |
| | `junkBoatQty` | ✅ | ❌ | **GAP: Not restored** |
| | `speedBoatNo` | ✅ | ❌ | **GAP: Not restored** |
| | `speedboatQty` | ✅ | ❌ | **GAP: Not restored** |

---

## Critical Issues Summary

### TN Wizard
1. **Step 4 (Practice Booking):** Practice data (dates, slot preferences) is saved but not restored when navigating back.

### WU/SC Wizard
1. **Step 1 (Teams):** Team names, boat types, and divisions are saved but not restored.
2. **Step 2 (Team Information):** All organization and manager fields are saved but not restored.
3. **Step 3 (Race Day):** All race day fields are saved but not restored (function is empty).

---

## Recommendations

### TN Wizard

**Step 4 - Practice Booking:**
1. Add restoration logic in `initStep4()` to:
   - Load saved practice data from `tn_practice_store.js` for each team
   - Restore practice dates in calendar
   - Restore slot preference selections
   - Restore selected team in team selector

### WU/SC Wizard

**Step 1 - Teams:**
1. Add restoration logic in `renderTeamDetails()` or after team fields are created:
   - Restore team names (EN/TC) from sessionStorage
   - Restore boat type radio selection
   - Restore division radio selection

**Step 2 - Team Information:**
1. Create `loadOrganizationData()` function similar to TN wizard
2. Call it in `initStep2()` after fields are rendered
3. Restore all organization and manager fields from sessionStorage

**Step 3 - Race Day:**
1. Implement `initStep3()` function (currently empty)
2. Create race day form similar to TN wizard
3. Add `loadRaceDayData()` function to restore saved values

---

## Code References

### TN Wizard
- `saveStep1Data()`: Lines 5945-5955
- `saveTeamData()`: Lines 1932-1961
- `loadTeamData()`: Lines 1877-1927
- `saveStep2Data()`: Lines 5960-6025
- `loadOrganizationData()`: Lines 1800-1874
- `saveStep3Data()`: Lines 6030-6045
- `loadRaceDayData()`: Lines 2154-2178
- `saveStep4Data()`: Lines 6050-6061
- `initStep4()`: Lines 2184-2228

### WU/SC Wizard
- `validateStep1()`: Lines 1716-1811 (saves data)
- `initStep1()`: Lines 708-782
- `renderTeamDetails()`: Lines 787-914
- `validateStep2()`: Lines 1816-1953 (saves data)
- `initStep2()`: Lines 1163-1177
- `validateStep3()`: Lines 1958-1982 (saves data)
- `initStep3()`: Lines 1406-1411 (empty)

