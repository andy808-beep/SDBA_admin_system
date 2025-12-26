# Naming Convention Audit: Division vs Entry Group

## Executive Summary

**CRITICAL FINDING**: There is a **terminology mismatch** between UI labels and code variable names in the WU/SC form:

- **UI Label "Division"** → Actually displays **Boat Types** (Standard Boat, Small Boat) from `packages` table
- **UI Label "Entry Group"** → Actually displays **Divisions** (Standard Boat – Men, Small Boat – Ladies) from `v_divisions_public` view
- **Code Variables**: Use `division` for what users see as "Entry Group" (confusing!)

---

## 1. Database Schema

### Table: `division_config_general`

**Purpose**: Master table for all division configurations across all event types (TN, WU, SC)

**Key Columns**:
- `div_code_prefix` (e.g., 'M', 'L', 'X', 'C' for TN; 'WM', 'WL', 'WX' for WU; 'SM', 'SL', 'SX' for SC)
- `div_main_name_en` (e.g., "Standard Boat", "Small Boat", "Open Division", "Mixed Division")
- `div_sub_name_en` (e.g., "Men", "Ladies", "Mixed", "Corporate")
- `event_type` ('main_race', 'warm_up', 'short_course')
- `by_invitation_only` (boolean)
- `status` ('active', 'inactive')

**Example Data**:
```sql
-- WU (Warm-Up) Divisions
('warm_up', 'WM', 'Men Std', 'Standard Boat', 'Men', ...)
('warm_up', 'WL', 'Ladies Std', 'Standard Boat', 'Ladies', ...)
('warm_up', 'WPM', 'Men SB', 'Small Boat', 'Men', ...)

-- TN (Main Race) Divisions  
('main_race', 'M', 'Men Open', 'Open Division', 'Men', ...)
('main_race', 'L', 'Ladies Open', 'Open Division', 'Ladies', ...)
```

### View: `v_divisions_public`

**Purpose**: Public-facing view that combines main + sub names for display

**Key Columns**:
- `division_code` = `div_code_prefix` (e.g., 'WM', 'WL', 'M', 'L')
- `name_en` = `div_main_name_en || ' – ' || div_sub_name_en` (e.g., "Standard Boat – Men")
- `name_tc` = Traditional Chinese equivalent
- `is_active` = derived from `status = 'active'`
- `by_invitation_only`

**Example Output**:
```
division_code: 'WM'
name_en: 'Standard Boat – Men'
name_tc: '標準龍 – 男子'
```

### Table: `v_packages_public` (via `annual_event_order_item_config`)

**Purpose**: Boat type packages with pricing

**Key Columns**:
- `package_code`
- `title_en` (e.g., "Standard Boat", "Small Boat")
- `title_tc`
- `listed_unit_price`
- `event_short_ref`

**Note**: These are the "boat types" shown as "Division" in WU/SC UI!

---

## 2. JavaScript Code Analysis

### File: `public/js/wu_sc_wizard.js`

#### Variable Naming Issues

| Variable Name | What It Actually Contains | UI Label | Should Be Named |
|--------------|---------------------------|----------|-----------------|
| `boatType` | Boat type from packages (e.g., "Standard Boat") | **"Division"** | ✅ Correct |
| `division` | Full division name from v_divisions_public (e.g., "Standard Boat – Men") | **"Entry Group"** | ❌ Should be `entryGroup` |

#### Key Functions

**`loadBoatTypesForTeam()` (lines 1124-1214)**:
- Loads from: `cfg.packages` (boat types)
- Stores in: `name="boatType{teamIndex}"` 
- Value: `pkg.title_en` (e.g., "Standard Boat")
- **UI Label**: "Division" (WRONG - should be "Boat Type")

**`loadDivisionsForTeam()` (lines 1219-1234)**:
- Loads from: `cfg.divisions` (from `v_divisions_public`)
- Stores in: `name="division{teamIndex}"`
- Value: `div.division_code` (e.g., "WM", "WL") or `div.name_en` (e.g., "Standard Boat – Men")
- **UI Label**: "Entry Group" (CORRECT label, but variable name is confusing)

**`showDivisionRow()` (lines 1239-1363)**:
- Filters divisions based on selected boat type
- Container ID: `#entryGroupContainer{teamIndex}` ✅ (correct naming)
- Radio group ID: `#division{teamIndex}` ❌ (should be `#entryGroup{teamIndex}`)

#### SessionStorage Keys

```javascript
// Saved in validateStep1() and collectFormData()
`${eventType}_team${i}_boatType`     // ✅ Correct naming
`${eventType}_team${i}_division`     // ❌ Should be `entryGroup`
```

#### Form Submission (`collectFormData()` lines 2505-2576)

```javascript
teams.push({
  boat_type: boatType,        // ✅ Correct
  division: division,          // ❌ Should be `entry_group`
  category: division           // ❌ Confusing - uses division as category
});
```

---

### File: `public/js/tn_wizard.js`

**TN Form Uses "Division" Correctly**:
- Variable: `division` or `category`
- Contains: Division codes ('M', 'L', 'X', 'C') or names ("Open Division – Men")
- UI Label: "Division" ✅
- Source: `v_divisions_public` filtered by `event_type = 'main_race'`

**No confusion here** - TN form correctly uses "division" terminology.

---

### File: `public/js/config_loader.js`

**Config Structure** (lines 77-94):
```javascript
{
  divisions: rpcData.divisions,    // From v_divisions_public
  packages: rpcData.packages       // From v_packages_public
}
```

**Query Logic** (lines 194-225):
- Queries `division_config_general` by `event_type` (not `event_short_ref`)
- Transforms to match `v_divisions_public` structure:
  ```javascript
  {
    division_code: div.div_code_prefix,
    name_en: `${div.div_main_name_en} – ${div.div_sub_name_en}`,
    name_tc: `${div.div_main_name_tc} – ${div.div_sub_name_tc}`
  }
  ```

**✅ Correct**: Config loader properly maps database to expected structure.

---

### File: `public/js/submit.js`

**WU/SC Submission** (via `collectFormData()` in `wu_sc_wizard.js`):
- Sends `division` field containing full name (e.g., "Standard Boat – Men")
- Backend maps this to `div_code_prefix` before storing

**TN Submission** (lines 52-74):
- Uses `category` field (legacy) or `division_code`
- Direct mapping to database

---

## 3. Backend Processing

### File: `supabase/functions/submit_registration/index.ts`

**WU/SC Processing** (lines 584-658):

1. **Division Name Mapping** (lines 587-629):
   ```typescript
   // Receives: team.division = "Standard Boat – Men"
   // Maps to: div_code_prefix = "WM"
   const divisionMap = new Map<string, string>();
   
   // Queries division_config_general to find matching div_code_prefix
   // Matches by full name: "Standard Boat – Men"
   ```

2. **Database Insert** (lines 632-657):
   ```typescript
   {
     division_code: divisionMap.get(team.division) || '',  // Stores 'WM'
     category: team.category || team.boat_type || '',       // Stores "Standard Boat"
     package_choice: team.boat_type || ''                  // Stores "Standard Boat"
   }
   ```

**✅ Correct**: Backend properly maps division names to codes.

---

## 4. UI Labels vs Code Variables

### WU/SC Step 1 Form

| UI Element | Label (i18n key) | Variable Name | Actual Data Source | Database Field |
|-----------|------------------|---------------|-------------------|----------------|
| First Radio Group | "Division" (`divisionLabel`) | `boatType` | `packages.title_en` | `annual_event_order_item_config.order_item_title_en` |
| Second Radio Group | "Entry Group" (`entryGroupLabel`) | `division` | `divisions.name_en` | `v_divisions_public.name_en` |

**PROBLEM**: 
- UI says "Division" but shows boat types
- UI says "Entry Group" but code uses `division` variable
- Users see "Entry Group" but developers see `division` everywhere

### HTML Template (`wu_sc_templates.html`)

```html
<!-- Line 974: Label says "Division" but shows boat types -->
<label data-i18n="divisionLabel">Division</label>
<div id="boatType${i}" class="radio-group"></div>

<!-- Line 978: Label says "Entry Group" but code uses "division" -->
<label data-i18n="entryGroupLabel">Entry Group</label>
<div id="division${i}" class="radio-group"></div>
```

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ DATABASE                                                     │
├─────────────────────────────────────────────────────────────┤
│ division_config_general                                      │
│   div_code_prefix: 'WM'                                     │
│   div_main_name_en: 'Standard Boat'                         │
│   div_sub_name_en: 'Men'                                    │
│                                                              │
│ v_divisions_public (VIEW)                                    │
│   division_code: 'WM'                                       │
│   name_en: 'Standard Boat – Men'                            │
│                                                              │
│ v_packages_public (VIEW)                                    │
│   title_en: 'Standard Boat'                                 │
│   listed_unit_price: 500                                    │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ config_loader.js     │      │ config_loader.js      │
│ cfg.divisions[]      │      │ cfg.packages[]        │
│   division_code: 'WM'│      │   title_en: 'Standard│
│   name_en: 'Standard │      │     Boat'            │
│     Boat – Men'      │      │   listed_unit_price:  │
│                      │      │     500              │
└──────────────────────┘      └──────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ wu_sc_wizard.js      │      │ wu_sc_wizard.js     │
│ loadDivisionsForTeam │      │ loadBoatTypesForTeam│
│   → #division{i}     │      │   → #boatType{i}    │
│   Variable: division │      │   Variable: boatType│
│   Value: 'WM' or     │      │   Value: 'Standard  │
│     'Standard Boat – │      │     Boat'           │
│     Men'             │      │                     │
└──────────────────────┘      └──────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│ UI DISPLAY (Step 1)                                          │
├─────────────────────────────────────────────────────────────┤
│ Label: "Division"        Label: "Entry Group"               │
│ [○] Standard Boat        [○] Standard Boat – Men           │
│ [○] Small Boat           [○] Standard Boat – Ladies        │
│                          [○] Standard Boat – Mixed         │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│ SESSION STORAGE                                              │
├─────────────────────────────────────────────────────────────┤
│ ${eventType}_team${i}_boatType = "Standard Boat"            │
│ ${eventType}_team${i}_division = "WM" or "Standard Boat –   │
│   Men"                                                       │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│ FORM SUBMISSION (collectFormData)                            │
├─────────────────────────────────────────────────────────────┤
│ {                                                             │
│   boat_type: "Standard Boat",                                │
│   division: "Standard Boat – Men",  // ❌ Should be          │
│                                     //    entry_group        │
│   category: "Standard Boat – Men"  // ❌ Confusing          │
│ }                                                             │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (submit_registration/index.ts)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Maps "Standard Boat – Men" → 'WM' (div_code_prefix)       │
│ 2. Stores in registration_meta:                             │
│    division_code: 'WM'                                      │
│    category: "Standard Boat"                                │
│    package_choice: "Standard Boat"                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Terminology Confusion Matrix

| Context | Term Used | What It Actually Means | Correct Term Should Be |
|---------|-----------|------------------------|------------------------|
| **WU/SC UI Label** | "Division" | Boat Type (Standard/Small) | "Boat Type" |
| **WU/SC UI Label** | "Entry Group" | Division (Men/Ladies/Mixed) | "Entry Group" ✅ |
| **WU/SC Code Variable** | `division` | Entry Group selection | `entryGroup` |
| **WU/SC Code Variable** | `boatType` | Boat type selection | `boatType` ✅ |
| **Database Table** | `division_config_general` | All divisions (TN + WU + SC) | ✅ Correct |
| **Database View** | `v_divisions_public` | Public division list | ✅ Correct |
| **TN UI Label** | "Division" | Division (Men Open, etc.) | ✅ Correct |
| **TN Code Variable** | `division` | Division selection | ✅ Correct |

---

## 7. Recommended Fixes

### Priority 1: Variable Naming Consistency

**File: `public/js/wu_sc_wizard.js`**

1. **Rename `division` → `entryGroup`**:
   - Function: `loadDivisionsForTeam()` → `loadEntryGroupsForTeam()`
   - Function: `showDivisionRow()` → `showEntryGroupRow()`
   - DOM IDs: `#division{i}` → `#entryGroup{i}`
   - Radio name: `name="division{i}"` → `name="entryGroup{i}"`
   - SessionStorage: `${eventType}_team${i}_division` → `${eventType}_team${i}_entryGroup`
   - Form submission: `division: division` → `entry_group: entryGroup`

2. **Keep `boatType` as-is** (already correct)

3. **Update UI Labels**:
   - Change "Division" label to "Boat Type" (`divisionLabel` → `boatTypeLabel`)
   - Keep "Entry Group" label as-is

### Priority 2: Code Comments

Add clarifying comments:
```javascript
// WU/SC Form Structure:
// 1. Boat Type selection (from packages) - displayed as "Division" in UI (should be "Boat Type")
// 2. Entry Group selection (from divisions) - displayed as "Entry Group" in UI
// Note: Variable names use "division" but should use "entryGroup" for clarity
```

### Priority 3: Database Field Mapping

**Current Submission**:
```javascript
{
  boat_type: "Standard Boat",           // ✅ Correct
  division: "Standard Boat – Men",      // ❌ Should be entry_group
  category: "Standard Boat – Men"       // ❌ Confusing
}
```

**Recommended**:
```javascript
{
  boat_type: "Standard Boat",                    // From packages
  entry_group: "Standard Boat – Men",            // From divisions (full name)
  entry_group_code: "WM",                         // From divisions (code)
  category: "Standard Boat – Men"                // Legacy compatibility
}
```

---

## 8. Summary of Issues

### ✅ What's Correct:
1. Database schema uses `division_config_general` consistently
2. Backend properly maps division names to codes
3. TN form uses "division" correctly
4. `boatType` variable naming is correct

### ❌ What's Wrong:
1. **WU/SC UI Label**: "Division" shows boat types (should be "Boat Type")
2. **WU/SC Code Variable**: `division` contains entry group data (should be `entryGroup`)
3. **SessionStorage Key**: Uses `division` for entry group (should be `entryGroup`)
4. **Form Submission**: Sends `division` field (should be `entry_group`)
5. **DOM IDs**: Uses `division{i}` (should be `entryGroup{i}`)

### ⚠️ What's Confusing:
1. UI says "Division" but shows boat types
2. Code uses `division` variable but UI shows "Entry Group"
3. `category` field duplicates `division` value
4. No clear distinction between boat type and entry group in variable names

---

## 9. Impact Assessment

**Low Risk Changes** (Variable renaming only):
- Rename `division` → `entryGroup` in JavaScript
- Update DOM IDs and sessionStorage keys
- Update form submission field names

**Medium Risk Changes** (UI label changes):
- Change "Division" → "Boat Type" in UI
- Update i18n translations
- May require user communication

**High Risk Changes** (Database/API changes):
- Changing backend field names would break existing integrations
- Requires migration of existing data
- Requires API versioning

---

## 10. Recommended Action Plan

### Phase 1: Code Cleanup (Non-Breaking)
1. Rename JavaScript variables: `division` → `entryGroup`
2. Update DOM IDs and sessionStorage keys
3. Add clarifying comments
4. Update form submission to use `entry_group` field name

### Phase 2: UI Label Fix (Breaking for Translations)
1. Change UI label "Division" → "Boat Type"
2. Update i18n keys: `divisionLabel` → `boatTypeLabel`
3. Update all translation files

### Phase 3: Backend Alignment (Optional)
1. Accept both `division` and `entry_group` in API (backward compatibility)
2. Prefer `entry_group` going forward
3. Document deprecation timeline for `division` field

---

## Appendix: File Reference

### Files to Update (Priority 1):
- `public/js/wu_sc_wizard.js` - Rename `division` → `entryGroup`
- `public/wu_sc_templates.html` - Update DOM IDs
- `public/js/i18n/translations.js` - Add `boatTypeLabel` key

### Files to Review:
- `public/js/config_loader.js` - Already correct
- `public/js/submit.js` - May need updates for field names
- `supabase/functions/submit_registration/index.ts` - May need to accept `entry_group` field

### Database Tables (No Changes Needed):
- `division_config_general` - ✅ Correct
- `v_divisions_public` - ✅ Correct
- `v_packages_public` - ✅ Correct

