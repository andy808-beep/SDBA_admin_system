# Config Data Structure Verification for WU/SC Dropdown

## Executive Summary

**✅ GOOD NEWS**: All required data is available in config, but requires **joining divisions + packages** by string matching.

**❌ CRITICAL FINDING**: 
- **Price is stored on packages** (not divisions)
- **No direct foreign key** linking divisions to packages
- **Linking is by string matching**: `div_main_name_en` (divisions) = `title_en` (packages)

---

## 1. Exact Config Structure

### `cfg.divisions[]` (from `v_divisions_public`)

**Source**: RPC `rpc_load_event_config()` → `divisions` array

**Exact Structure** (from `DB Config/rpc.sql` lines 41-49):
```javascript
{
  division_code: "WM",                    // div_code_prefix (e.g., 'WM', 'WL', 'WX')
  name_en: "Standard Boat – Men",        // Combined: div_main_name_en + ' – ' + div_sub_name_en
  name_tc: "標準龍 – 男子",               // Combined: div_main_name_tc + ' – ' + div_sub_name_tc
  is_corporate: false,                   // From division_config_general
  sort_order: 1,                         // From division_config_general
  is_active: true,                        // Derived from status='active'
  by_invitation_only: false              // From division_config_general
}
```

**❌ Missing Fields**:
- ❌ **NO `price` field** - Price is NOT on divisions
- ❌ **NO `boat_type` field** - Must extract from `name_en` or match with packages
- ❌ **NO `package_code` reference** - No direct link to packages

**Example Records**:
```javascript
// WU2026 Divisions
[
  {
    division_code: "WM",
    name_en: "Standard Boat – Men",
    name_tc: "標準龍 – 男子",
    is_corporate: false,
    sort_order: 1,
    is_active: true,
    by_invitation_only: false
  },
  {
    division_code: "WL",
    name_en: "Standard Boat – Ladies",
    name_tc: "標準龍 – 女子",
    is_corporate: false,
    sort_order: 2,
    is_active: true,
    by_invitation_only: false
  },
  {
    division_code: "WPM",
    name_en: "Small Boat – Men",
    name_tc: "小籠 – 男子",
    is_corporate: false,
    sort_order: 4,
    is_active: true,
    by_invitation_only: false
  }
]
```

---

### `cfg.packages[]` (from `v_packages_public`)

**Source**: RPC `rpc_load_event_config()` → `packages` array

**Exact Structure** (from `DB Config/rpc.sql` lines 51-61):
```javascript
{
  package_code: "std_wu",                 // order_item_code
  title_en: "Standard Boat",              // order_item_title_en
  title_tc: "標準龍",                     // order_item_title_tc
  listed_unit_price: 4600,                // ✅ PRICE IS HERE
  included_practice_hours_per_team: 0,    // practice_hr_std
  tees_qty: 0,                            // package_souvenir_tshirt
  padded_shorts_qty: 0,                   // package_padded_shorts
  dry_bag_qty: 0,                         // package_dry_bag
  sort_order: 1,                          // sort_order
  is_active: true                         // show_on_app_form
}
```

**Example Records**:
```javascript
// WU2026 Packages
[
  {
    package_code: "std_wu",
    title_en: "Standard Boat",
    title_tc: "標準龍",
    listed_unit_price: 4600,              // ✅ Price for Standard Boat
    included_practice_hours_per_team: 0,
    tees_qty: 0,
    padded_shorts_qty: 0,
    dry_bag_qty: 0,
    sort_order: 1,
    is_active: true
  },
  {
    package_code: "sb_wu",
    title_en: "Small Boat",
    title_tc: "小籠",
    listed_unit_price: 2800,              // ✅ Price for Small Boat
    included_practice_hours_per_team: 0,
    tees_qty: 0,
    padded_shorts_qty: 0,
    dry_bag_qty: 0,
    sort_order: 2,
    is_active: true
  }
]
```

---

## 2. How Divisions and Packages Are Linked

### ❌ No Direct Foreign Key

**Database Schema** (`DB Config/order.sql` line 37):
```sql
div_id uuid REFERENCES public.division_config_general(div_id)
```

**⚠️ BUT**: This FK exists but is **NOT used** for linking boat types. It's nullable and appears to be for other purposes.

### ✅ Linking by String Matching

**Current Logic** (from `wu_sc_wizard.js` lines 1273-1317):

1. **User selects boat type** (e.g., "Standard Boat") from packages
2. **Filter divisions** by checking if `name_en` contains the boat type:
   ```javascript
   if (boatType === 'Standard Boat') {
     filteredDivisions = allDivisions.filter(div => {
       return div.name_en.includes('Standard Boat') && 
              (div.name_en.includes('Men') || div.name_en.includes('Ladies') || div.name_en.includes('Mixed'));
     });
   }
   ```

3. **Link to price** by finding matching package:
   ```javascript
   const pkg = cfg.packages.find(p => p.title_en === boatType);
   const price = pkg.listed_unit_price;  // ✅ Price from package
   ```

**The Link**:
- `division.div_main_name_en` (from `division_config_general`) = `package.title_en` (from `annual_event_order_item_config`)
- Example: Both have `"Standard Boat"` or `"Small Boat"`

---

## 3. Database View Definitions

### `v_divisions_public` (from `DB Config/view.sql` lines 44-64)

```sql
CREATE VIEW public.v_divisions_public AS
SELECT
  aedm.event_short_ref,
  d.div_code_prefix          AS division_code,
  CASE WHEN d.div_sub_name_en IS NOT NULL AND btrim(d.div_sub_name_en) <> ''
       THEN d.div_main_name_en || ' – ' || d.div_sub_name_en
       ELSE d.div_main_name_en
  END                         AS name_en,
  CASE WHEN d.div_sub_name_tc IS NOT NULL AND btrim(d.div_sub_name_tc) <> ''
       THEN d.div_main_name_tc || ' – ' || d.div_sub_name_tc
       ELSE d.div_main_name_tc
  END                         AS name_tc,
  d.is_corporate,
  COALESCE(d.sort_order,0)   AS sort_order,
  (d.status = 'active')       AS is_active,
  d.by_invitation_only
FROM public.annual_event_division_map aedm
JOIN public.division_config_general d
  ON d.div_id = aedm.div_id
WHERE d.status = 'active'
ORDER BY COALESCE(d.sort_order,0), d.div_main_name_en;
```

**❌ Does NOT include**:
- Price
- Boat type reference
- Package link

**✅ Includes**:
- `division_code` (for submission)
- `name_en` / `name_tc` (for display)
- `by_invitation_only` (for filtering)

---

### `v_packages_public` (from `DB Config/view.sql` lines 79-95)

```sql
CREATE VIEW public.v_packages_public AS
SELECT
  event_short_ref,
  order_item_code                         AS package_code,
  order_item_title_en                     AS title_en,
  order_item_title_tc                     AS title_tc,
  listed_unit_price,                      -- ✅ PRICE IS HERE
  COALESCE(practice_hr_std,0)             AS included_practice_hours_per_team,
  COALESCE(package_souvenir_tshirt,0)     AS tees_qty,
  COALESCE(package_padded_shorts,0)       AS padded_shorts_qty,
  COALESCE(package_dry_bag,0)             AS dry_bag_qty,
  COALESCE(sort_order,0)                  AS sort_order,
  show_on_app_form                        AS is_active
FROM public.annual_event_order_item_config
WHERE order_item_type = 'package'
  AND show_on_app_form = true
ORDER BY COALESCE(sort_order,0);
```

**✅ Includes**:
- `title_en` (boat type name - e.g., "Standard Boat")
- `listed_unit_price` (price)
- Package details (tees, shorts, etc.)

---

## 4. Current Filtering Logic

### How Boat Type → Divisions Works

**File**: `public/js/wu_sc_wizard.js` lines 1273-1317

```javascript
// Step 1: User selects boat type (e.g., "Standard Boat")
const boatType = selectedBoatType.value;  // "Standard Boat"

// Step 2: Filter divisions by string matching
if (boatType === 'Standard Boat') {
  filteredDivisions = allDivisions.filter(div => {
    const nameEn = div.name_en || '';  // e.g., "Standard Boat – Men"
    
    // Exclude invitation-only
    if (div.by_invitation_only === true) return false;
    
    // Exclude special divisions
    if (nameEn.includes('Hong Kong Youth Group') || 
        nameEn.includes('Disciplinary Forces')) {
      return false;
    }
    
    // ✅ Match by string contains
    return nameEn.includes('Standard Boat') && 
           (nameEn.includes('Men') || nameEn.includes('Ladies') || nameEn.includes('Mixed'));
  });
}
```

**⚠️ PROBLEM**: This is **fragile string matching**, not a proper database relationship!

---

## 5. How Price is Retrieved

**File**: `public/js/wu_sc_wizard.js` lines 2034-2038

```javascript
// In calculateTotalCost()
const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`); // "Standard Boat"
const pkg = cfg?.packages?.find(p => p.title_en === boatType);
if (pkg) {
  total += pkg.listed_unit_price;  // ✅ Price from package
}
```

**✅ Price comes from packages**, matched by `title_en` = boat type name.

---

## 6. Answering Your Key Questions

### Q1: Is price stored on divisions or packages?

**Answer**: ✅ **Price is stored on packages** (`listed_unit_price`)

- **Divisions**: NO price field
- **Packages**: YES - `listed_unit_price` field

### Q2: Is there a foreign key or reference between divisions and packages?

**Answer**: ⚠️ **No direct FK for boat type linking**

- `annual_event_order_item_config.div_id` exists but is **nullable** and not used for boat type linking
- **Linking is by string matching**: `div_main_name_en` = `title_en`
  - Example: Both have `"Standard Boat"` or `"Small Boat"`

### Q3: Current logic for filtering divisions by boat type?

**Answer**: **String matching on `name_en`**:

```javascript
// Current logic (fragile!)
if (boatType === 'Standard Boat') {
  filteredDivisions = allDivisions.filter(div => 
    div.name_en.includes('Standard Boat') && 
    (div.name_en.includes('Men') || div.name_en.includes('Ladies') || div.name_en.includes('Mixed'))
  );
}
```

**Problems**:
- ❌ Relies on exact string matching
- ❌ Hardcoded boat type names ("Standard Boat", "Small Boat")
- ❌ Hardcoded entry group types ("Men", "Ladies", "Mixed")
- ❌ No database relationship

### Q4: Does `v_divisions_public` include price or boat type reference?

**Answer**: ❌ **NO**

- ❌ No price field
- ❌ No boat type field
- ❌ No package reference

**What it has**:
- ✅ `division_code` (e.g., 'WM')
- ✅ `name_en` (e.g., "Standard Boat – Men")
- ✅ `name_tc` (e.g., "標準龍 – 男子")
- ✅ `by_invitation_only`
- ✅ `sort_order`

---

## 7. Data Structure for Dropdown Options

### What You Need

```javascript
{
  value: "WM",                           // division_code (for submission)
  display_en: "Standard Boat – Men",     // name_en
  display_tc: "標準龍 – 男子",            // name_tc
  price: 4600,                           // ❌ NOT in divisions - need to join
  boat_type: "Standard Boat"             // ❌ NOT in divisions - need to extract
}
```

### What's Available

**From `cfg.divisions[]`**:
```javascript
{
  division_code: "WM",                   // ✅ Available
  name_en: "Standard Boat – Men",        // ✅ Available
  name_tc: "標準龍 – 男子",               // ✅ Available
  // ❌ price: NOT available
  // ❌ boat_type: NOT available (but can extract from name_en)
}
```

**From `cfg.packages[]`**:
```javascript
{
  title_en: "Standard Boat",             // ✅ Available (this is boat_type)
  listed_unit_price: 4600,               // ✅ Available (this is price)
  // ❌ division_code: NOT available
  // ❌ name_en: NOT available
}
```

---

## 8. Solution: Join Divisions + Packages

### Option A: Join in JavaScript (Recommended)

**Create a helper function** to build dropdown options:

```javascript
/**
 * Build dropdown options by joining divisions with packages
 * @param {Array} divisions - From cfg.divisions
 * @param {Array} packages - From cfg.packages
 * @param {string} selectedBoatType - Currently selected boat type (e.g., "Standard Boat")
 * @returns {Array} Dropdown options with all required fields
 */
function buildDropdownOptions(divisions, packages, selectedBoatType) {
  // Find the package for the selected boat type
  const packageForBoatType = packages.find(pkg => pkg.title_en === selectedBoatType);
  const price = packageForBoatType?.listed_unit_price || 0;
  
  // Filter divisions for this boat type
  const filteredDivisions = divisions.filter(div => {
    // Extract boat type from division name (e.g., "Standard Boat – Men" → "Standard Boat")
    const boatTypeFromDivision = div.name_en.split(' – ')[0];
    
    // Match by boat type
    if (boatTypeFromDivision !== selectedBoatType) return false;
    
    // Exclude invitation-only
    if (div.by_invitation_only) return false;
    
    // Exclude special divisions
    if (div.name_en.includes('Hong Kong Youth Group') || 
        div.name_en.includes('Disciplinary Forces') ||
        div.name_en.includes('Post-Secondary') ||
        div.name_en.includes('HKU Invitational')) {
      return false;
    }
    
    return true;
  });
  
  // Build dropdown options
  return filteredDivisions.map(div => ({
    value: div.division_code,              // "WM" - for submission
    display_en: div.name_en,               // "Standard Boat – Men"
    display_tc: div.name_tc,               // "標準龍 – 男子"
    price: price,                          // From package (same for all divisions of this boat type)
    boat_type: selectedBoatType,           // "Standard Boat" (from parameter)
    division_code: div.division_code,      // "WM" (for reference)
    sort_order: div.sort_order             // For sorting
  }));
}
```

**Usage**:
```javascript
const cfg = window.__CONFIG;
const selectedBoatType = "Standard Boat";  // From user selection

const dropdownOptions = buildDropdownOptions(
  cfg.divisions,
  cfg.packages,
  selectedBoatType
);

// Result:
// [
//   {
//     value: "WM",
//     display_en: "Standard Boat – Men",
//     display_tc: "標準龍 – 男子",
//     price: 4600,
//     boat_type: "Standard Boat",
//     division_code: "WM",
//     sort_order: 1
//   },
//   {
//     value: "WL",
//     display_en: "Standard Boat – Ladies",
//     display_tc: "標準龍 – 女子",
//     price: 4600,  // Same price (from package)
//     boat_type: "Standard Boat",
//     division_code: "WL",
//     sort_order: 2
//   },
//   ...
// ]
```

---

### Option B: Enhance Database View (Future Improvement)

**Create a new view** that joins divisions with packages:

```sql
CREATE VIEW public.v_divisions_with_packages_public AS
SELECT
  vd.event_short_ref,
  vd.division_code,
  vd.name_en,
  vd.name_tc,
  vd.is_corporate,
  vd.sort_order,
  vd.is_active,
  vd.by_invitation_only,
  -- Extract boat type from name_en
  SPLIT_PART(vd.name_en, ' – ', 1) AS boat_type_en,
  -- Join to get price
  vp.listed_unit_price AS price,
  vp.package_code
FROM public.v_divisions_public vd
LEFT JOIN public.v_packages_public vp
  ON vp.event_short_ref = vd.event_short_ref
  AND vp.title_en = SPLIT_PART(vd.name_en, ' – ', 1)  -- Match boat type
WHERE vd.is_active = true
ORDER BY vd.sort_order;
```

**⚠️ This would require database migration** - not recommended for immediate refactoring.

---

## 9. Current Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ DATABASE                                                     │
├─────────────────────────────────────────────────────────────┤
│ division_config_general                                      │
│   div_main_name_en: "Standard Boat"  ←──┐                   │
│   div_sub_name_en: "Men"                │                   │
│   div_code_prefix: "WM"                 │                   │
│                                         │                   │
│ annual_event_order_item_config          │                   │
│   title_en: "Standard Boat"  ←─────────┘ (String match)    │
│   listed_unit_price: 4600              │                   │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ v_divisions_public    │      │ v_packages_public    │
│   division_code: "WM" │      │   title_en: "Standard│
│   name_en: "Standard  │      │     Boat"           │
│     Boat – Men"       │      │   listed_unit_price: │
│   by_invitation_only  │      │     4600            │
└──────────────────────┘      └──────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ RPC Response          │      │ RPC Response         │
│ cfg.divisions[]       │      │ cfg.packages[]       │
│   - division_code     │      │   - title_en         │
│   - name_en           │      │   - listed_unit_price│
│   - name_tc           │      │   - title_tc         │
│   - by_invitation_only│      │                      │
└──────────────────────┘      └──────────────────────┘
           │                              │
           └──────────┬───────────────────┘
                      ▼
         ┌────────────────────────────┐
         │ JavaScript Join Logic       │
         │ (String matching)          │
         │                            │
         │ 1. User selects boat type  │
         │    "Standard Boat"         │
         │                            │
         │ 2. Find package:           │
         │    pkg = packages.find(    │
         │      p => p.title_en ===    │
         │      "Standard Boat"       │
         │    )                        │
         │    price = pkg.listed_     │
         │      unit_price            │
         │                            │
         │ 3. Filter divisions:       │
         │    divs = divisions.filter(│
         │      d => d.name_en.      │
         │        includes("Standard  │
         │        Boat")              │
         │    )                        │
         │                            │
         │ 4. Build options:           │
         │    options = divs.map(d => │
         │      ({                    │
         │        value: d.division_   │
         │          code,             │
         │        display: d.name_en, │
         │        price: price        │
         │      })                    │
         │    )                        │
         └────────────────────────────┘
```

---

## 10. Recommended Implementation

### For Dropdown Options

**You need to join in JavaScript**:

```javascript
function getDropdownOptionsForBoatType(boatType, cfg) {
  // 1. Get price from package
  const package = cfg.packages.find(p => p.title_en === boatType);
  if (!package) {
    console.error(`Package not found for boat type: ${boatType}`);
    return [];
  }
  
  const price = package.listed_unit_price || 0;
  
  // 2. Filter divisions by boat type (extract from name_en)
  const filteredDivisions = cfg.divisions.filter(div => {
    // Extract boat type from division name
    // "Standard Boat – Men" → "Standard Boat"
    const boatTypeFromDivision = div.name_en.split(' – ')[0];
    
    // Match boat type
    if (boatTypeFromDivision !== boatType) return false;
    
    // Exclude invitation-only
    if (div.by_invitation_only) return false;
    
    // Exclude special divisions
    const specialKeywords = [
      'Hong Kong Youth Group',
      'Disciplinary Forces',
      'Post-Secondary',
      'HKU Invitational'
    ];
    if (specialKeywords.some(keyword => div.name_en.includes(keyword))) {
      return false;
    }
    
    return true;
  });
  
  // 3. Build dropdown options
  return filteredDivisions
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(div => ({
      value: div.division_code,           // "WM" - for form submission
      display_en: div.name_en,            // "Standard Boat – Men"
      display_tc: div.name_tc,           // "標準龍 – 男子"
      price: price,                       // From package (4600)
      boat_type: boatType,                // "Standard Boat" (for grouping)
      division_code: div.division_code,   // "WM" (for reference)
      sort_order: div.sort_order          // For sorting
    }));
}
```

**Usage Example**:
```javascript
const cfg = window.__CONFIG;
const boatType = "Standard Boat";  // User selected

const options = getDropdownOptionsForBoatType(boatType, cfg);

// Result:
// [
//   {
//     value: "WM",
//     display_en: "Standard Boat – Men",
//     display_tc: "標準龍 – 男子",
//     price: 4600,
//     boat_type: "Standard Boat",
//     division_code: "WM",
//     sort_order: 1
//   },
//   {
//     value: "WL",
//     display_en: "Standard Boat – Ladies",
//     display_tc: "標準龍 – 女子",
//     price: 4600,  // Same price for all Standard Boat divisions
//     boat_type: "Standard Boat",
//     division_code: "WL",
//     sort_order: 2
//   },
//   {
//     value: "WX",
//     display_en: "Standard Boat – Mixed",
//     display_tc: "標準龍 – 混合",
//     price: 4600,
//     boat_type: "Standard Boat",
//     division_code: "WX",
//     sort_order: 3
//   }
// ]
```

---

## 11. Summary

### ✅ Available in Config

| Field | Source | Available? |
|-------|--------|------------|
| `division_code` | `cfg.divisions[].division_code` | ✅ Yes |
| `display_en` | `cfg.divisions[].name_en` | ✅ Yes |
| `display_tc` | `cfg.divisions[].name_tc` | ✅ Yes |
| `price` | `cfg.packages[].listed_unit_price` | ✅ Yes (via join) |
| `boat_type` | `cfg.packages[].title_en` or extract from `name_en` | ✅ Yes (via join) |

### ❌ NOT Available in Single Query

- **Price is NOT in divisions** - must join with packages
- **Boat type is NOT in divisions** - must extract from `name_en` or match with packages
- **No direct FK relationship** - must use string matching

### ✅ Solution

**Join divisions + packages in JavaScript**:
1. User selects boat type → get price from `cfg.packages`
2. Filter divisions → extract boat type from `name_en` or match with package `title_en`
3. Build dropdown options → combine division data + price from package

**All data is available** - just requires joining the two arrays in JavaScript!

---

## 12. Example: Complete Data Flow

### Step 1: Load Config
```javascript
const cfg = await loadEventConfig('WU2026');

// cfg.divisions = [
//   { division_code: "WM", name_en: "Standard Boat – Men", ... },
//   { division_code: "WL", name_en: "Standard Boat – Ladies", ... },
//   { division_code: "WPM", name_en: "Small Boat – Men", ... }
// ]

// cfg.packages = [
//   { title_en: "Standard Boat", listed_unit_price: 4600, ... },
//   { title_en: "Small Boat", listed_unit_price: 2800, ... }
// ]
```

### Step 2: User Selects Boat Type
```javascript
const selectedBoatType = "Standard Boat";
```

### Step 3: Get Price from Package
```javascript
const package = cfg.packages.find(p => p.title_en === selectedBoatType);
const price = package.listed_unit_price;  // 4600
```

### Step 4: Filter Divisions
```javascript
const filteredDivisions = cfg.divisions.filter(div => {
  const boatTypeFromName = div.name_en.split(' – ')[0];  // "Standard Boat"
  return boatTypeFromName === selectedBoatType &&
         !div.by_invitation_only &&
         !div.name_en.includes('Hong Kong Youth Group');
});

// Result: [
//   { division_code: "WM", name_en: "Standard Boat – Men", ... },
//   { division_code: "WL", name_en: "Standard Boat – Ladies", ... },
//   { division_code: "WX", name_en: "Standard Boat – Mixed", ... }
// ]
```

### Step 5: Build Dropdown Options
```javascript
const options = filteredDivisions.map(div => ({
  value: div.division_code,        // "WM"
  display_en: div.name_en,         // "Standard Boat – Men"
  display_tc: div.name_tc,          // "標準龍 – 男子"
  price: price,                     // 4600 (from package)
  boat_type: selectedBoatType       // "Standard Boat"
}));
```

**✅ All required data is available!**

