# TN vs WU/SC Summary Page Comparison

## TN Summary Page (Step 5)

### HTML Structure:
```html
<template id="tn-step-5">
  <div class="wrap">
    <h1 data-i18n="applicationSummary">Application Summary</h1>

    <div class="section" id="secBasics">
      <h2 data-i18n="basics">Basics</h2>
      <div class="grid-2">
        <div class="kv"><div class="k" data-i18n="season">Season</div><div class="v" id="sumSeason">—</div></div>
        <div class="kv"><div class="k" data-i18n="organization">Organization</div><div class="v" id="sumOrg">—</div></div>
        <div class="kv"><div class="k" data-i18n="mailingAddress">Mailing Address</div><div class="v" id="sumAddress">—</div></div>
      </div>
    </div>

    <div class="section" id="secTeams">
      <h2 data-i18n="teams">Teams</h2>
      <table class="summary" id="teamsTable">
        <thead>
          <tr>
            <th data-i18n="numberSymbol">#</th>
            <th data-i18n="teamName">Team Name</th>
            <th data-i18n="entryOption">Entry Option</th>
          </tr>
        </thead>
        <tbody id="teamsTbody"><tr><td colspan="3" class="muted" data-i18n="noTeams">No teams</td></tr></tbody>
      </table>
      <div class="muted" style="margin-top:6px;" data-i18n="teamCodesAssignedNote">(Team codes are assigned at submit time.)</div>
    </div>

    <div class="section" id="secManagers">
      <h2 data-i18n="teamManagers">Team Managers</h2>
      <table class="summary" id="managersTable">
        <thead>
          <tr>
            <th data-i18n="numberSymbol">#</th>
            <th data-i18n="name">Name</th>
            <th data-i18n="mobile">Mobile</th>
            <th data-i18n="email">Email</th>
          </tr>
        </thead>
        <tbody id="managersTbody"><tr><td colspan="4" class="muted" data-i18n="noManagerInformation">No manager information</td></tr></tbody>
      </table>
    </div>

    <div class="section" id="secRaceDay">
      <h2 data-i18n="raceDayArrangement">Race Day Arrangement</h2>
      <div class="grid-2" id="raceDayGrid">
        <div class="kv"><div class="k" data-i18n="marqueeQty">Marquee Qty</div><div class="v" id="sumMarquee">—</div></div>
        <div class="kv"><div class="k" data-i18n="steersmanWithBoat">Steersman (with boat)</div><div class="v" id="sumSteerWith">—</div></div>
        <div class="kv"><div class="k" data-i18n="steersmanNoBoat">Steersman (no boat)</div><div class="v" id="sumSteerWithout">—</div></div>
        <div class="kv"><div class="k" data-i18n="junkBoatQty">Junk Boat # / Qty</div><div class="v" id="sumJunk">—</div></div>
        <div class="kv"><div class="k" data-i18n="speedBoatQty">Speed Boat # / Qty</div><div class="v" id="sumSpeed">—</div></div>
      </div>
      <div class="muted" style="margin-top:6px;">(Race day supply submission happens after we add that table.)</div>
    </div>

    <div class="section" id="secPractice">
      <h2 data-i18n="practiceBookingPerTeam">Practice Booking (per Team)</h2>
      <div id="perTeamPracticeSummary">
        <p class="muted" data-i18n="noPracticeBookingData">No practice booking data.</p>
      </div>
    </div>

    <p class="msg" id="formMsg"></p>
    <div class="actions">
      <button type="button" id="backBtn" data-i18n="backButton">← Back</button>
      <button id="submitBtn" data-i18n="submitButton">Submit Application</button>
    </div>
    
    <!-- Confirmation section (hidden by default) -->
    <div id="confirmation" style="display:none;"></div>
    
    <!-- Revisit confirmation section -->
    <div id="revisit"></div>
  </div>
</template>
```

### Key CSS Classes:
- `.wrap` - Main container (max-width: 900px, margin: 24px auto, padding: 16px)
- `.section` - Section cards (background: #fff, border: 1px solid #e5e7eb, border-radius: 8px, padding: 16px, margin-bottom: 16px)
- `.section h2` - Section headings (margin: 0 0 8px, font-size: 1.1rem)
- `.grid-2` - Two-column grid (display: grid, grid-template-columns: 1fr 1fr, gap: 12px)
- `.kv` - Key-value pair container (display: flex, gap: 8px)
- `.kv .k` - Key/label (width: 160px, color: #555)
- `.kv .v` - Value (no specific styling)
- `table.summary` - Summary tables (width: 100%, border-collapse: collapse)
- `table.summary th, table.summary td` - Table cells (border-bottom: 1px solid #eee, padding: 8px, text-align: left)
- `.muted` - Muted text (color: #777)
- `.actions` - Navigation buttons container (display: flex, justify-content: space-between, gap: 8px, margin-top: 16px)

### CSS Location:
All styles are in `public/css/tn_legacy.css` scoped to `#tnScope`:
- Lines 352-412 contain summary-specific styles

### Layout Pattern:
- Uses card-based sections (`.section`) with white background, border, and rounded corners
- Two-column grid layout (`.grid-2`) for key-value pairs
- Tables for Teams and Managers data
- Clean, structured layout with consistent spacing (16px padding, 16px margin-bottom)

---

## WU/SC Summary Page (Step 4)

### HTML Structure:
```html
<template id="wu-sc-step-4">
  <div class="wrap">
    <h1 data-i18n="applicationSummary">Application Summary</h1>

    <div class="section" id="secBasics">
      <h2 data-i18n="basics">Basics</h2>
      <div class="grid-2">
        <div class="kv"><div class="k" data-i18n="season">Season</div><div class="v" id="sumSeason">—</div></div>
        <div class="kv"><div class="k" data-i18n="organization">Organization</div><div class="v" id="sumOrg">—</div></div>
        <div class="kv"><div class="k" data-i18n="mailingAddress">Mailing Address</div><div class="v" id="sumAddress">—</div></div>
      </div>
    </div>

    <div class="section" id="secTeams">
      <h2 data-i18n="teams">Teams</h2>
      <table class="summary" id="teamsTable">
        <thead>
          <tr>
            <th data-i18n="numberSymbol">#</th>
            <th data-i18n="teamName">Team Name</th>
            <th data-i18n="division">Division</th>
            <th data-i18n="entryGroup">Entry Group</th>
          </tr>
        </thead>
        <tbody id="teamsTbody"><tr><td colspan="4" class="muted" data-i18n="noTeams">No teams</td></tr></tbody>
      </table>
    </div>

    <div class="section" id="secManagers">
      <h2 data-i18n="teamManagerContact">Team Manager Contact</h2>
      <div class="grid-2">
        <div class="kv"><div class="k" data-i18n="teamManager1Required">Manager 1</div><div class="v" id="sumManager1">—</div></div>
        <div class="kv"><div class="k" data-i18n="teamManager2Required">Manager 2</div><div class="v" id="sumManager2">—</div></div>
        <div class="kv"><div class="k" data-i18n="teamManager3Optional">Manager 3</div><div class="v" id="sumManager3">—</div></div>
      </div>
    </div>

    <div class="section" id="secRaceDay">
      <h2 data-i18n="raceDayArrangement">Race Day Arrangement</h2>
      <div class="grid-2">
        <div class="kv"><div class="k" data-i18n="athleteMarquee">Athlete Marquee</div><div class="v" id="sumMarquee">—</div></div>
        <div class="kv"><div class="k" data-i18n="steersmanWithBoat">Official Steersman (With Practice)</div><div class="v" id="sumSteerWith">—</div></div>
        <div class="kv"><div class="k" data-i18n="steersmanNoBoat">Official Steersman (Without Practice)</div><div class="v" id="sumSteerWithout">—</div></div>
        <div class="kv"><div class="k" data-i18n="junkRegistration">Junk Registration</div><div class="v" id="sumJunk">—</div></div>
        <div class="kv"><div class="k" data-i18n="speedBoatRegistration">Speed Boat Registration</div><div class="v" id="sumSpeed">—</div></div>
      </div>
    </div>

    <div class="section" id="secTotal">
      <h2 data-i18n="totalCost">Total Cost</h2>
      <div class="total-cost">
        <div class="kv"><div class="k" data-i18n="totalAmount">Total Amount</div><div class="v" id="sumTotal">HK$0</div></div>
      </div>
    </div>

    <p class="msg" id="formMsg"></p>
    <!-- 🔄 Navigation -->
    <div class="nav-buttons" style="display: flex; justify-content: space-between; gap: 1rem;">
      <button type="button" id="backBtn" data-i18n="backButton">← Back</button>
      <button type="submit" id="submitBtn" data-i18n="submitButton">Submit Application</button>
    </div>
  </div>
</template>
```

### Key CSS Classes:
- `.wrap` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.section` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.section h2` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.grid-2` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.kv` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.kv .k` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.kv .v` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `table.summary` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.muted` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.total-cost` - **NO CSS DEFINED** (unstyled - relies on browser defaults)
- `.nav-buttons` - Has styles in `styles.css` but with inline style overrides

### CSS Location:
**NO SUMMARY-SPECIFIC CSS FOUND** in `public/styles.css` or `public/css/theme.css`

### Layout Pattern:
- HTML structure is similar to TN but **lacks all CSS styling**
- Uses inline styles on navigation buttons container
- Managers section uses grid-2 instead of table (different data structure)
- Has Total Cost section (TN doesn't)
- Missing Practice section (TN has it)

---

## Key Differences

| Aspect | TN Form | WU/SC Form |
|--------|---------|------------|
| **Container class** | `.wrap` (styled: max-width: 900px, margin: 24px auto, padding: 16px) | `.wrap` (NO CSS - unstyled) |
| **Section cards** | `.section` (styled: white bg, border, border-radius: 8px, padding: 16px, margin-bottom: 16px) | `.section` (NO CSS - unstyled) |
| **Section headings** | `.section h2` (styled: margin: 0 0 8px, font-size: 1.1rem) | `.section h2` (NO CSS - unstyled) |
| **Grid layout** | `.grid-2` (styled: grid, 2 columns, gap: 12px) | `.grid-2` (NO CSS - unstyled) |
| **Key-value pairs** | `.kv` (styled: flex, gap: 8px)<br>`.kv .k` (width: 160px, color: #555) | `.kv` (NO CSS - unstyled)<br>`.kv .k` (NO CSS - unstyled) |
| **Tables** | `table.summary` (styled: width: 100%, border-collapse, padding: 8px, border-bottom) | `table.summary` (NO CSS - unstyled) |
| **Muted text** | `.muted` (styled: color: #777) | `.muted` (NO CSS - unstyled) |
| **Managers display** | Table (4 columns: #, Name, Mobile, Email) | Grid-2 with individual kv pairs (3 managers as separate rows) |
| **Teams table columns** | 3 columns: #, Team Name, Entry Option | 4 columns: #, Team Name, Division, Entry Group |
| **Practice section** | Has Practice Booking section | Missing (not applicable) |
| **Total Cost section** | Missing | Has Total Cost section |
| **Navigation buttons** | `.actions` (styled: flex, justify-content: space-between, gap: 8px, margin-top: 16px) | `.nav-buttons` (has base styles but uses inline style overrides) |
| **CSS location** | `public/css/tn_legacy.css` (scoped to `#tnScope`) | **NO CSS FILE** - missing styles |

---

## Recommended Changes to WU/SC

### 1. **Add Summary Page CSS to `public/styles.css`**

Add the following CSS rules to match TN's clean, card-based layout:

```css
/* ========== SUMMARY PAGE STYLES ========== */
/* Styles for WU/SC Step 4 summary page - matching TN layout */

.wrap { 
  max-width: 900px; 
  margin: 24px auto; 
  padding: 16px; 
}

.section { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  padding: 16px; 
  margin-bottom: 16px; 
}

.section h2 { 
  margin: 0 0 8px; 
  font-size: 1.1rem; 
  color: var(--theme-primary-dark);
}

.grid-2 { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 12px; 
}

.kv { 
  display: flex; 
  gap: 8px; 
}

.kv .k { 
  width: 160px; 
  color: #555; 
  font-weight: 500;
}

.kv .v { 
  color: #333;
  flex: 1;
}

table.summary { 
  width: 100%; 
  border-collapse: collapse; 
}

table.summary th, 
table.summary td { 
  border-bottom: 1px solid #eee; 
  padding: 8px; 
  text-align: left; 
}

table.summary th {
  font-weight: 600;
  color: var(--theme-primary-dark);
  background-color: #f9fafb;
}

.muted { 
  color: #777; 
  font-size: 0.9rem;
}

.total-cost {
  margin-top: 8px;
}

.total-cost .kv .v {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--theme-primary-dark);
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 16px;
}
```

### 2. **Remove Inline Styles from Template**

In `public/wu_sc_templates.html`, remove the inline `style` attribute from the navigation buttons container:

**Before:**
```html
<div class="nav-buttons" style="display: flex; justify-content: space-between; gap: 1rem;">
```

**After:**
```html
<div class="nav-buttons">
```

### 3. **Optional: Consider Managers Display Format**

Currently, WU/SC uses grid-2 for managers while TN uses a table. The grid-2 approach is cleaner for 3 managers, but if you want to match TN exactly, you could change it to a table format. However, the current grid-2 approach is more modern and works well.

### 4. **Theme-Aware Colors**

The CSS uses `var(--theme-primary-dark)` for headings and accents, which will automatically adapt to WU (blue) and SC (green) themes, matching the existing theme system.

---

## Summary

The main issue is that **WU/SC summary page has NO CSS styling**, while TN has comprehensive styles in `tn_legacy.css`. Adding the recommended CSS to `styles.css` will:

1. ✅ Create clean, card-based sections matching TN
2. ✅ Proper spacing and layout (16px padding, margins)
3. ✅ Consistent typography (headings, labels, values)
4. ✅ Theme-aware colors (adapts to WU blue / SC green)
5. ✅ Professional table styling
6. ✅ Proper grid layout for key-value pairs

This will align the WU/SC summary page with TN's cleaner, more professional layout while maintaining the existing HTML structure.
