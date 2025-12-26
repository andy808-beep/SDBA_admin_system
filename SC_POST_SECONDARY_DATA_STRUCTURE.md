# SC Post-Secondary Data Structure

Based on the database seed data, here are the exact field values for Post-Secondary divisions and packages in SC2026.

---

## 1. Post-Secondary Division (`cfg.divisions`)

### Source: `DB Config/division.sql` line 121

**Raw Database Data** (`division_config_general`):
```sql
('short_course', 'SU', 'Post-Sec', 'Standard Boat', '標準龍', 'Post-Secondary', '大專', 'FFFF99', true, 'active', 4, false)
```

**After `v_divisions_public` View Transformation**:

```javascript
{
  event_short_ref: "SC2026",
  division_code: "SU",                    // ← div_code_prefix
  name_en: "Standard Boat – Post-Secondary",  // ← div_main_name_en + ' – ' + div_sub_name_en
  name_tc: "標準龍 – 大專",                   // ← div_main_name_tc + ' – ' + div_sub_name_tc
  is_corporate: false,
  sort_order: 4,
  is_active: true,                        // ← derived from status='active'
  by_invitation_only: true                // ⚠️ CRITICAL: This is TRUE
}
```

**Expected Output in Browser Console:**
```javascript
const divisions = window.__CONFIG?.divisions;
const postSecDivs = divisions?.filter(d => d.name_en?.includes('Post-Secondary'));
console.log('Post-Secondary divisions:', postSecDivs);

// Expected result:
[
  {
    division_code: "SU",
    name_en: "Standard Boat – Post-Secondary",
    name_tc: "標準龍 – 大專",
    is_corporate: false,
    sort_order: 4,
    is_active: true,
    by_invitation_only: true  // ⚠️ This will cause it to be filtered out!
  }
]
```

---

## 2. Post-Secondary Package (`cfg.packages`)

### Source: `DB Config/order.sql` line 212

**Raw Database Data** (`annual_event_order_item_config`):
```sql
('SC2026', 'package', 'postsec_pkg_sc', 'Post-Sec Pkg (SC)', 'Post-Secondary w/ Package', '大專組 連 Package', 5500, 0, 1, true, 3, true)
```

**After `v_packages_public` View Transformation**:

```javascript
{
  event_short_ref: "SC2026",
  package_code: "postsec_pkg_sc",         // ← order_item_code
  title_en: "Post-Secondary w/ Package", // ← order_item_title_en
  title_tc: "大專組 連 Package",          // ← order_item_title_tc
  listed_unit_price: 5500,                 // ← listed_unit_price
  included_practice_hours_per_team: 0,    // ← practice_hr_std (default 0)
  tees_qty: 0,                            // ← package_souvenir_tshirt (default 0)
  padded_shorts_qty: 0,                   // ← package_padded_shorts (default 0)
  dry_bag_qty: 0,                         // ← package_dry_bag (default 0)
  sort_order: 3,
  is_active: true                         // ← show_on_app_form
}
```

**Expected Output in Browser Console:**
```javascript
const packages = window.__CONFIG?.packages;
const postSecPkgs = packages?.filter(p => p.title_en?.includes('Post-Secondary'));
console.log('Post-Secondary packages:', postSecPkgs);

// Expected result:
[
  {
    package_code: "postsec_pkg_sc",
    title_en: "Post-Secondary w/ Package",
    title_tc: "大專組 連 Package",
    listed_unit_price: 5500,
    included_practice_hours_per_team: 0,
    tees_qty: 0,
    padded_shorts_qty: 0,
    dry_bag_qty: 0,
    sort_order: 3,
    is_active: true
  }
]
```

---

## 3. ⚠️ CRITICAL ISSUE: Filtering Logic

### Problem

The Post-Secondary division has `by_invitation_only: true`, which means:

1. **In `dropdown_options_builder.js`** (line ~1030):
   ```javascript
   // Skip invitation-only divisions
   if (div.by_invitation_only === true) continue;
   ```
   **Result**: Post-Secondary division will be **FILTERED OUT** from dropdown options!

2. **In `wu_sc_wizard.js`** (old `showDivisionRow()` function, line ~1302):
   ```javascript
   if (div.by_invitation_only === true || div.by_invitation_only === 'true' || div.by_invitation_only === 1) {
     return false; // Excluded
   }
   ```
   **Result**: Also filtered out in old logic.

3. **Additional filtering** in `dropdown_options_builder.js` (line ~1045):
   ```javascript
   const specialKeywords = [
     'Hong Kong Youth Group',
     'Disciplinary Forces',
     'Post-Secondary',  // ⚠️ This will also filter it out!
     'HKU Invitational'
   ];
   
   if (specialKeywords.some(keyword => nameEn.includes(keyword))) {
     continue; // Skip
   }
   ```
   **Result**: Even if `by_invitation_only` check passes, the keyword filter will exclude it!

---

## 4. Why Post-Secondary Won't Appear in Dropdown

The Post-Secondary division will **NOT appear** in the dropdown because:

1. ✅ It has `by_invitation_only: true` → Filtered by first check
2. ✅ Its `name_en` contains "Post-Secondary" → Filtered by keyword check

**Both filters will exclude it!**

---

## 5. The Mismatch Problem

**Division:**
- `name_en`: "Standard Boat – Post-Secondary"
- `by_invitation_only`: `true`
- **Boat Type**: "Standard Boat" (extracted from `name_en`)

**Package:**
- `title_en`: "Post-Secondary w/ Package"
- **Boat Type**: "Post-Secondary w/ Package" (doesn't match "Standard Boat"!)

**The Problem:**
- Division boat type: `"Standard Boat"` (from `name_en.split(' – ')[0]`)
- Package title: `"Post-Secondary w/ Package"` (doesn't match!)

**In `dropdown_options_builder.js`** (line ~1035):
```javascript
const boatTypeEn = nameEn.includes(' – ') 
  ? nameEn.split(' – ')[0].trim()  // "Standard Boat"
  : nameEn.trim();

const pkg = packageMap.get(boatTypeEn);  // Looking for "Standard Boat"
// But package title is "Post-Secondary w/ Package" → NOT FOUND!
```

**Result**: Even if the division passes the filters, it won't find a matching package!

---

## 6. Summary of Field Values

### Division (Post-Secondary):
| Field | Value |
|-------|-------|
| `division_code` | `"SU"` |
| `name_en` | `"Standard Boat – Post-Secondary"` |
| `name_tc` | `"標準龍 – 大專"` |
| `by_invitation_only` | `true` ⚠️ |
| `is_active` | `true` |
| `sort_order` | `4` |

### Package (Post-Secondary):
| Field | Value |
|-------|-------|
| `package_code` | `"postsec_pkg_sc"` |
| `title_en` | `"Post-Secondary w/ Package"` |
| `title_tc` | `"大專組 連 Package"` |
| `listed_unit_price` | `5500` |
| `is_active` | `true` |
| `sort_order` | `3` |

---

## 7. Expected Browser Console Output

### For Divisions:
```javascript
const divisions = window.__CONFIG?.divisions;
console.log('Post-Secondary divisions:', 
  divisions?.filter(d => d.name_en?.includes('Post-Secondary'))
);

// Output:
[
  {
    division_code: "SU",
    name_en: "Standard Boat – Post-Secondary",
    name_tc: "標準龍 – 大專",
    is_corporate: false,
    sort_order: 4,
    is_active: true,
    by_invitation_only: true
  }
]
```

### For Packages:
```javascript
const packages = window.__CONFIG?.packages;
console.log('Post-Secondary packages:', 
  packages?.filter(p => p.title_en?.includes('Post-Secondary'))
);

// Output:
[
  {
    package_code: "postsec_pkg_sc",
    title_en: "Post-Secondary w/ Package",
    title_tc: "大專組 連 Package",
    listed_unit_price: 5500,
    included_practice_hours_per_team: 0,
    tees_qty: 0,
    padded_shorts_qty: 0,
    dry_bag_qty: 0,
    sort_order: 3,
    is_active: true
  }
]
```

---

## 8. Why Post-Secondary Won't Work with Current Implementation

1. **Filtered by `by_invitation_only`**: The division is marked as invitation-only, so it's excluded.
2. **Filtered by keyword**: The name contains "Post-Secondary", which is in the special keywords list.
3. **Package mismatch**: Even if it passed filters, the package title `"Post-Secondary w/ Package"` doesn't match the extracted boat type `"Standard Boat"` from the division name.

**Conclusion**: Post-Secondary is designed as a special invitation-only division with its own package, and the current dropdown implementation is not designed to handle this case. It would need special handling logic.

