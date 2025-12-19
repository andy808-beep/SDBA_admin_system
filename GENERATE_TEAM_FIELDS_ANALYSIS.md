# generateTeamFields() Function Analysis

## 1. Complete Function Implementation

**Location**: Lines 1207-1359 in `tn_wizard.js`

```javascript
async function generateTeamFields(teamCount) {
  const container = document.getElementById('teamFieldsContainer');
  if (!container) return;
  
  Logger.debug('🎯 generateTeamFields: Creating', teamCount, 'team fields');
  
  // IMPORTANT: Save current field values to sessionStorage before clearing, so we can restore them
  // This prevents data loss when fields are regenerated (e.g., after validation errors)
  if (container.children.length > 0) {
    Logger.debug('🎯 generateTeamFields: Saving current field values before clearing');
    saveTeamData(); // Save any existing field values before clearing
  }
  
  // Clear existing team fields
  container.innerHTML = '';
  
  // Load categories from database
  let categories = [];
  try {
    Logger.debug('🎯 generateTeamFields: Loading categories from database');
    // Try to load categories from v_divisions_public view
    // Include both _en and _tc columns for bilingual support
    const { data, error } = await sb
      .from('v_divisions_public')
      .select('division_code, name_en, name_tc')
      .eq('event_short_ref', 'TN2025')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    categories = data || [];
    Logger.debug('🎯 generateTeamFields: Loaded', categories.length, 'categories from database');
    
    // If no categories found, use fallback
    if (categories.length === 0) {
      Logger.warn('🎯 generateTeamFields: No categories found in database, using fallback');
      categories = [
        { division_code: 'M', name_en: 'Open Division – Men', name_tc: '公開組 – 男子' },
        { division_code: 'L', name_en: 'Open Division – Ladies', name_tc: '公開組 – 女子' },
        { division_code: 'X', name_en: 'Mixed Division – Open', name_tc: '混合組 – 公開' },
        { division_code: 'C', name_en: 'Mixed Division – Corporate', name_tc: '混合組 – 企業' }
      ];
    }
  } catch (err) {
    Logger.warn('🎯 generateTeamFields: Failed to load categories, using fallback:', err.message);
    // Fallback categories (matching main race divisions) - include both _en and _tc for bilingual
    categories = [
      { division_code: 'M', name_en: 'Open Division – Men', name_tc: '公開組 – 男子' },
      { division_code: 'L', name_en: 'Open Division – Ladies', name_tc: '公開組 – 女子' },
      { division_code: 'X', name_en: 'Mixed Division – Open', name_tc: '混合組 – 公開' },
      { division_code: 'C', name_en: 'Mixed Division – Corporate', name_tc: '混合組 – 企業' }
    ];
  }
  
  // Load packages from database
  let packages = [];
  try {
    Logger.debug('🎯 generateTeamFields: Loading packages from database');
    // Include both _en and _tc columns for bilingual support
    const { data: packageData, error: packageError } = await sb
      .from('v_packages_public')
      .select('package_code, title_en, title_tc, listed_unit_price, included_practice_hours_per_team, tees_qty, padded_shorts_qty, dry_bag_qty')
      .eq('event_short_ref', 'TN2025')
      .eq('is_active', true)
      .order('sort_order');
    
    if (packageError) throw packageError;
    packages = packageData || [];
    Logger.debug('🎯 generateTeamFields: Loaded', packages.length, 'packages from database');
    
    // Store packages globally for use in populatePackageOptions
    window.__PACKAGES = packages;
  } catch (err) {
    Logger.warn('🎯 generateTeamFields: Failed to load packages, using fallback:', err.message);
    // Fallback packages (from order.sql) - include both _en and _tc for bilingual
    packages = [
      { package_code: 'option_1_non_corp', title_en: 'Option I', title_tc: '選項一', listed_unit_price: 20900, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 20, dry_bag_qty: 1 },
      { package_code: 'option_2_non_corp', title_en: 'Option II', title_tc: '選項二', listed_unit_price: 17500, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 0, dry_bag_qty: 1 },
      { package_code: 'option_1_corp', title_en: 'Option I', title_tc: '選項一', listed_unit_price: 21900, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 20, dry_bag_qty: 1 },
      { package_code: 'option_2_corp', title_en: 'Option II', title_tc: '選項二', listed_unit_price: 18500, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 0, dry_bag_qty: 1 }
    ];
    
    // Store packages globally for use in populatePackageOptions
    window.__PACKAGES = packages;
  }
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Create team fields
  for (let i = 1; i <= teamCount; i++) {
    const teamField = document.createElement('div');
    teamField.className = 'team-field';
    teamField.id = `teamField${i}`;
    
    const categoryOptions = categories.map(cat => {
      // Use division_code and name_en from v_divisions_public view
      const code = cat.division_code;
      // Use localized division name if db-localization is available
      const displayName = window.getDivisionName ? window.getDivisionName(cat) : cat.name_en;
      return `<option value="${code}">${displayName}</option>`;
    }).join('');
    
    teamField.innerHTML = `
      <div class="team-header">
        <h3 data-i18n="teamLabel" data-i18n-params='{"num":"${i}"}'>${t('teamLabel', { num: i })}</h3>
      </div>
      <div class="team-inputs">
        <div class="form-group">
          <label for="teamNameEn${i}" data-i18n="teamNameEnLabel">${t('teamNameEnLabel')}</label>
          <input type="text" id="teamNameEn${i}" name="teamNameEn${i}" required 
                 placeholder="${t('teamNameEnPlaceholder')}" data-i18n-placeholder="teamNameEnPlaceholder" />
        </div>
        
        <div class="form-group">
          <label for="teamNameTc${i}" data-i18n="teamNameTcLabel">${t('teamNameTcLabel')}</label>
          <input type="text" id="teamNameTc${i}" name="teamNameTc${i}" 
                 placeholder="${t('teamNameTcPlaceholder')}" data-i18n-placeholder="teamNameTcPlaceholder" />
        </div>
        
        <div class="form-group">
          <label for="teamCategory${i}" data-i18n="raceCategoryLabel">${t('raceCategoryLabel')}</label>
          <select id="teamCategory${i}" name="teamCategory${i}" required>
            <option value="" data-i18n="selectCategory">${t('selectCategory')}</option>
            ${categoryOptions}
          </select>
        </div>
        
        <div class="form-group" id="teamOptionGroup${i}" style="display: none;">
          <label data-i18n="entryOptionLabel">${t('entryOptionLabel')}</label>
          <div id="teamOptionBoxes${i}" class="package-options">
            <!-- Package options will be populated based on division selection -->
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(teamField);
  }
  
  // Set up category change handlers to show/hide entry options
  setupCategoryChangeHandlers(teamCount);
  
  Logger.debug('🎯 generateTeamFields: Created', teamCount, 'team input fields');
  
  // IMPORTANT: After generating fields, restore any saved data
  // This ensures user input is preserved when fields are regenerated
  const savedTeamCount = sessionStorage.getItem('tn_team_count');
  if (savedTeamCount && parseInt(savedTeamCount, 10) === teamCount) {
    Logger.debug('🎯 generateTeamFields: Restoring saved field values after generation');
    loadTeamData();
  }
}
```

## 2. When is generateTeamFields() Called? (All Triggers)

### Trigger 1: Team Count Dropdown Change [Line 941-950]
**Location**: `setupTeamCountHandler()` function, lines 941-950

```javascript
teamCountSelect.addEventListener('change', async (event) => {
  const teamCount = parseInt(event.target.value, 10);
  
  if (teamCount > 0) {
    // Store team count in session storage
    sessionStorage.setItem('tn_team_count', teamCount.toString());
    
    // Generate team fields (now async)
    await generateTeamFields(teamCount);
    
    // Show team fields container and next button
    const teamFieldsContainer = document.getElementById('teamFieldsContainer');
    const step1Actions = document.getElementById('step1Actions');
    if (teamFieldsContainer) {
      teamFieldsContainer.style.display = 'block';
    }
    if (step1Actions) {
      step1Actions.style.display = 'block';
    }
  }
});
```

**When**: User selects/changes the number of teams from the dropdown
**Condition**: `teamCount > 0`

### Trigger 2: Restore Team Count Selection [Line 1036]
**Location**: `restoreTeamCountSelection()` function, lines 1006-1047

```javascript
async function restoreTeamCountSelection() {
  const savedTeamCount = sessionStorage.getItem('tn_team_count');
  const teamCountSelect = document.getElementById('teamCount');
  
  if (savedTeamCount && teamCountSelect) {
    const teamCount = parseInt(savedTeamCount, 10);
    if (teamCount > 0 && teamCount <= 10) {
      Logger.debug('🎯 restoreTeamCountSelection: Restoring team count:', teamCount);
      
      // Set the selected value
      teamCountSelect.value = teamCount.toString();
      
      // Check if fields already exist - if so, just show them and load data, don't regenerate
      const teamFieldsContainer = document.getElementById('teamFieldsContainer');
      const existingFieldsCount = teamFieldsContainer ? teamFieldsContainer.querySelectorAll('.team-field').length : 0;
      
      if (existingFieldsCount === teamCount) {
        Logger.debug('🎯 restoreTeamCountSelection: Fields already exist for', teamCount, 'teams, skipping regeneration');
        // Just show the container and load data
        if (teamFieldsContainer) {
          teamFieldsContainer.style.display = 'block';
        }
        const step1Actions = document.getElementById('step1Actions');
        if (step1Actions) {
          step1Actions.style.display = 'block';
        }
        // Load saved team data back into the fields
        loadTeamData();
      } else {
        // Generate team fields (now async)
        await generateTeamFields(teamCount);  // ⚠️ CALLED HERE
        
        // Show team fields container and next button
        if (teamFieldsContainer) {
          teamFieldsContainer.style.display = 'block';
        }
        const step1Actions = document.getElementById('step1Actions');
        if (step1Actions) {
          step1Actions.style.display = 'block';
        }
        
        // Load saved team data back into the fields
        loadTeamData();
      }
    }
  }
}
```

**When**: Step 1 is initialized and there's a saved team count in sessionStorage
**Condition**: 
- Saved team count exists AND
- Existing fields count !== teamCount (fields don't exist or wrong count)

### Summary of All Triggers:

1. **User changes team count dropdown** → `setupTeamCountHandler` change event → `generateTeamFields()`
2. **Step 1 initialization with saved count** → `restoreTeamCountSelection()` → `generateTeamFields()` (if fields don't exist)

## 3. How Does It Preserve Existing Field Values?

### Step 1: Save Before Clearing (Lines 1213-1218)
```javascript
// IMPORTANT: Save current field values to sessionStorage before clearing, so we can restore them
// This prevents data loss when fields are regenerated (e.g., after validation errors)
if (container.children.length > 0) {
  Logger.debug('🎯 generateTeamFields: Saving current field values before clearing');
  saveTeamData(); // Save any existing field values before clearing
}
```

**Condition**: Only saves if `container.children.length > 0` (fields exist)

**Function Called**: `saveTeamData()` (lines 1887-1915)
- Reads current field values from DOM
- Saves to sessionStorage keys: `tn_team_name_en_${i}`, `tn_team_name_tc_${i}`, `tn_team_category_${i}`, `tn_team_option_${i}`

### Step 2: Clear Container (Line 1221)
```javascript
container.innerHTML = '';  // ⚠️ This clears ALL fields
```

### Step 3: Generate New Fields (Lines 1297-1344)
- Creates fresh HTML structure with empty input fields
- All fields start empty

### Step 4: Restore Saved Values (Lines 1352-1358)
```javascript
// IMPORTANT: After generating fields, restore any saved data
// This ensures user input is preserved when fields are regenerated
const savedTeamCount = sessionStorage.getItem('tn_team_count');
if (savedTeamCount && parseInt(savedTeamCount, 10) === teamCount) {
  Logger.debug('🎯 generateTeamFields: Restoring saved field values after generation');
  loadTeamData();
}
```

**Condition**: Only restores if saved team count matches the teamCount parameter

**Function Called**: `loadTeamData()` (lines 1831-1881)
- Reads from sessionStorage
- Populates field values back into DOM
- Restores category selection and triggers entry option population
- Restores entry option selection with setTimeout

## 4. Does It Check If Fields Already Exist?

### YES - But Only in restoreTeamCountSelection() [Lines 1018-1034]

```javascript
// Check if fields already exist - if so, just show them and load data, don't regenerate
const teamFieldsContainer = document.getElementById('teamFieldsContainer');
const existingFieldsCount = teamFieldsContainer ? teamFieldsContainer.querySelectorAll('.team-field').length : 0;

if (existingFieldsCount === teamCount) {
  Logger.debug('🎯 restoreTeamCountSelection: Fields already exist for', teamCount, 'teams, skipping regeneration');
  // Just show the container and load data
  if (teamFieldsContainer) {
    teamFieldsContainer.style.display = 'block';
  }
  const step1Actions = document.getElementById('step1Actions');
  if (step1Actions) {
    step1Actions.style.display = 'block';
  }
  // Load saved team data back into the fields
  loadTeamData();
} else {
  // Generate team fields (now async)
  await generateTeamFields(teamCount);
  // ...
}
```

**Check**: Compares `existingFieldsCount` (number of `.team-field` elements) with `teamCount`
- **If equal**: Skips `generateTeamFields()`, just shows container and loads data
- **If not equal**: Calls `generateTeamFields()` to regenerate

### NO - In generateTeamFields() Itself

**The `generateTeamFields()` function does NOT check if fields exist before clearing.** It always:
1. Saves existing values (if container has children)
2. Clears container: `container.innerHTML = '';`
3. Generates fresh fields
4. Restores saved values (if team count matches)

## 5. What Conditions Trigger Field Regeneration?

### Condition 1: User Changes Team Count
- **Trigger**: Dropdown `change` event
- **Action**: Always calls `generateTeamFields(teamCount)`
- **No check for existing fields**

### Condition 2: Step 1 Initialization with Saved Count
- **Trigger**: `restoreTeamCountSelection()` called from `initStep1()`
- **Action**: 
  - **If** `existingFieldsCount === teamCount` → Skip regeneration, just show and load
  - **Else** → Call `generateTeamFields(teamCount)`

### Condition 3: Direct Call to generateTeamFields()
- If called directly from anywhere else (not through above triggers)
- Always regenerates fields (no existence check)

## 6. Does Validation Failure Trigger generateTeamFields()?

### Answer: NO - Not Directly

Looking at the validation flow:
1. User clicks "Next" → Line 983 event listener
2. Calls `validateStep1()` → Line 987
3. If validation fails → Line 5507 returns `false`
4. Event handler → Line 992: Just logs, nothing else happens
5. **No call to `generateTeamFields()`**

### However, Validation Failure Could Indirectly Trigger It:

#### Scenario A: If `restoreTeamCountSelection()` is Called Again
- If something triggers `initStep1()` again after validation fails
- `initStep1()` calls `restoreTeamCountSelection()` (line 849)
- If fields were somehow removed/lost, `existingFieldsCount` would be 0
- This would trigger `generateTeamFields()` to regenerate

#### Scenario B: If Team Count Dropdown Changes
- If user changes the dropdown after validation fails
- This would trigger the change event handler → `generateTeamFields()`

#### Scenario C: If `loadStepContent(1)` is Called
- If language change event fires or other trigger calls `loadStepContent(1)`
- This calls `initStep1()` (line 579)
- Which calls `restoreTeamCountSelection()` (line 849)
- Which may call `generateTeamFields()` if fields don't exist

## Critical Finding: The Bug Scenario

### What Happens When Fields Disappear:

1. **Validation fails** → Fields still exist in DOM
2. **Something triggers field removal** (unknown trigger - possibly `loadStepContent(1)` or `createTeamCountSelector()`)
3. **Fields are removed from DOM** → `teamFieldsContainer` becomes empty
4. **User tries to interact** → Fields don't exist
5. **If `restoreTeamCountSelection()` runs** → Sees `existingFieldsCount === 0` → Calls `generateTeamFields()`
6. **Fields are regenerated** → But only if `restoreTeamCountSelection()` is called

### The Problem:

**If fields disappear but `restoreTeamCountSelection()` is NOT called, fields remain missing.**

The function has a save-before-clear mechanism, but:
- It only works if `generateTeamFields()` is called
- If fields disappear without `generateTeamFields()` being called, they're just gone
- There's no automatic recovery mechanism if fields are removed by other means

## Recommendations

1. **Add defensive check in validation**: Before validation, ensure fields exist
2. **Add recovery mechanism**: If fields are missing but team count is set, regenerate them
3. **Prevent unwanted regeneration**: Add more guards to prevent `generateTeamFields()` from being called unnecessarily
4. **Track field state**: Maintain a flag to track if fields should exist vs. if they actually exist

