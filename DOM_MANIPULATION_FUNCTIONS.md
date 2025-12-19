# DOM Manipulation Functions in tn_wizard.js

## Functions Containing `innerHTML = ''` (Clearing DOM)

### 1. `updateStepper()` - Line 502-517

**Full Function:**
```javascript
function updateStepper() {
  if (!stepper) return;
  
  // Update step states (matching WU/SC logic)
  const steps = stepper.querySelectorAll('.step');
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    
    if (stepNum < currentStep) {
      step.classList.add('completed');
    } else if (stepNum === currentStep) {
      step.classList.add('active');
    }
  });
  
  const step1 = t('tnStep1', '1. Teams');
  const step2 = t('tnStep2', '2. Organization');
  const step3 = t('tnStep3', '3. Race Day');
  const step4 = t('tnStep4', '4. Practice');
  const step5 = t('tnStep5', '5. Summary');
  
  // Hide stepper on step 0 (Race Info page)
  if (currentStep === 0) {
    stepper.innerHTML = '';  // ⚠️ LINE 197: Clears stepper
    stepper.style.display = 'none';
    return;
  }
  // ... rest of function creates stepper HTML
}
```

**What it clears**: `stepper` element (breadcrumb navigation)
**When triggered**: Called from `updateStepper()` which is called from:
- `loadStep()` - Line 485
- `initStepNavigation()` - Line 160, 535
- After `loadStepContent()` - Line 585

**Impact on Step 1 fields**: ✅ Safe - Only affects stepper, not form fields

---

### 2. `loadStepContent()` - Lines 522-607

**Full Function:**
```javascript
async function loadStepContent(step) {
	Logger.debug(`loadStepContent: Loading step ${step}`);
  if (!wizardMount) {
	Logger.error('loadStepContent: wizardMount not found');
    return;
  }
  
  // Handle step 0 (Race Info) specially - no template, generated content
  if (step === 0) {
    wizardMount.innerHTML = '';  // ⚠️ LINE 531: Clears wizardMount
    wizardMount.appendChild(createRaceInfoContent());
    initStep0();
    // Update stepper (will hide it for step 0)
    initStepNavigation();
    // Update i18n translations
    if (window.i18n && typeof window.i18n.updateUI === 'function') {
      Logger.debug('loadStepContent: Updating i18n translations for step 0');
      window.i18n.updateUI();
    }
    return;
  }
  
  // For step 1, check if we're already on step 1 with existing fields
  // If so, preserve the fields by saving data first
  if (step === 1) {
    const existingTeamFieldsContainer = document.getElementById('teamFieldsContainer');
    if (existingTeamFieldsContainer && existingTeamFieldsContainer.children.length > 0) {
      Logger.debug('loadStepContent: Step 1 already loaded with fields, saving data before reload');
      // Save current field values before clearing
      const savedTeamCount = sessionStorage.getItem('tn_team_count');
      if (savedTeamCount) {
        saveTeamData();
      }
    }
  }
  
  const templateId = `tn-step-${step}`;
  const template = document.getElementById(templateId);
  
	Logger.debug(`loadStepContent: Template ${templateId} found:`, !!template);
  
  if (!template) {
	Logger.error(`Template not found: ${templateId}`);
    return;
  }
  
  // Clone template content
  const content = template.content.cloneNode(true);
  wizardMount.innerHTML = '';  // ⚠️ LINE 570: Clears wizardMount (DESTROYS ALL FIELDS)
  wizardMount.appendChild(content);
  
  // Ensure content is properly scoped within #tnScope
	Logger.debug('loadStepContent: Content loaded into #tnScope container');
  
  // Initialize step-specific functionality
  switch (step) {
    case 1:
      await initStep1();  // This will call createTeamCountSelector() which recreates fields
      break;
    case 2:
      await initStep2();
      break;
    case 3:
      initStep3();
      break;
    case 4:
      initStep4();
      break;
    case 5:
      initStep5();
      break;
  }
  
  // Set up navigation
  setupStepNavigation();
  
  // Update stepper to reflect current step
  updateStepper();
  
  // IMPORTANT: Update i18n translations for the newly loaded template content
  // This ensures all data-i18n elements are translated after template is cloned
  if (window.i18n && typeof window.i18n.updateUI === 'function') {
    Logger.debug('loadStepContent: Updating i18n translations for step', step);
    window.i18n.updateUI();
  }
}
```

**What it clears**: `wizardMount` element (entire step content container)
**When triggered**: Called from:
- `loadStep()` - Line 488 (when navigating to any step)
- `languageChanged` event listener - Line 175 (when language changes)

**Impact on Step 1 fields**: ⚠️ **CRITICAL** - Clears ALL fields, then calls `initStep1()` which recreates them
**Safeguard**: Lines 544-556 try to save data before clearing, but only if fields exist

---

### 3. `createTeamCountSelector()` - Lines 855-926

**Full Function:**
```javascript
function createTeamCountSelector() {
  const container = document.getElementById('wizardMount');
  if (!container) return;
  
  // Check if team count section already exists with fields - if so, don't recreate it
  const existingTeamCountSection = document.getElementById('teamCountSection');
  const existingTeamFieldsContainer = document.getElementById('teamFieldsContainer');
  if (existingTeamCountSection && existingTeamFieldsContainer && existingTeamFieldsContainer.children.length > 0) {
    Logger.debug('🎯 createTeamCountSelector: Team count section already exists with fields, skipping recreation');
    return;
  }
  
  // IMPORTANT: Save current field values to sessionStorage before clearing, so we can restore them
  // This prevents data loss when fields are regenerated (e.g., after validation errors)
  const currentTeamCountEl = document.getElementById('teamCount');
  const currentTeamCount = currentTeamCountEl?.value || sessionStorage.getItem('tn_team_count');
  if (currentTeamCount && parseInt(currentTeamCount, 10) > 0) {
    Logger.debug('🎯 createTeamCountSelector: Saving current field values before recreation');
    // Temporarily set team count in sessionStorage if not already set, so saveTeamData can work
    const wasTeamCountSet = sessionStorage.getItem('tn_team_count');
    if (!wasTeamCountSet) {
      sessionStorage.setItem('tn_team_count', currentTeamCount);
    }
    saveTeamData(); // Save any existing field values
    // Restore previous state if we temporarily set it
    if (!wasTeamCountSet) {
      sessionStorage.removeItem('tn_team_count');
    }
  }
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Generate team count options
  const teamOptions = [];
  for (let i = 1; i <= 10; i++) {
    const label = i === 1 ? t('oneTeam', { count: i }) : t('nTeams', { count: i });
    // Fallback if translation key doesn't exist
    const displayLabel = (label === 'oneTeam' || label === 'nTeams') 
      ? `${i} team${i > 1 ? 's' : ''}`
      : label;
    teamOptions.push(`<option value="${i}">${displayLabel}</option>`);
  }
  
  // Create team count question
  const teamCountSection = document.createElement('div');
  teamCountSection.id = 'teamCountSection';
  teamCountSection.innerHTML = `
    <div class="form-group">
      <label for="teamCount" data-i18n="howManyTeamsQuestion">${t('howManyTeamsQuestion')}</label>
      <select id="teamCount" name="teamCount" required>
        <option value="" data-i18n="selectNumberOfTeams">${t('selectNumberOfTeams')}</option>
        ${teamOptions.join('')}
      </select>
    </div>
    <div id="teamFieldsContainer" style="display: none;">
      <!-- Team fields will be generated here -->
    </div>
    <div id="formMsg" class="error-message" style="display: none;"></div>
    <div class="form-actions" id="step1Actions" style="display: none;">
      <button type="button" id="nextToStep2" class="btn btn-primary" data-i18n="nextTeamInfo">
        ${t('nextTeamInfo')}
      </button>
    </div>
  `;
  
  // Clear existing content and add team count section
  container.innerHTML = '';  // ⚠️ LINE 922: Clears wizardMount (DESTROYS ALL FIELDS)
  container.appendChild(teamCountSection);
  
	Logger.debug('🎯 initStep1: Team count selector created');
}
```

**What it clears**: `wizardMount` container (entire step content)
**When triggered**: Called from:
- `initStep1()` - Line 843 (when step 1 is initialized)

**Impact on Step 1 fields**: ⚠️ **CRITICAL** - Clears ALL content including fields, then creates fresh structure
**Safeguard**: Lines 859-864 check if fields exist and skip if they do, but this doesn't help if `loadStepContent()` already cleared them

---

### 4. `generateTeamFields()` - Lines 1207-1359

**Full Function:**
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
  container.innerHTML = '';  // ⚠️ LINE 1221: Clears teamFieldsContainer (ALL TEAM FIELDS)
  
  // Load categories from database
  let categories = [];
  try {
	Logger.debug('🎯 generateTeamFields: Loading categories from database');
    const { data, error } = await sb
      .from('v_divisions_public')
      .select('division_code, name_en, name_tc')
      .eq('event_short_ref', 'TN2025')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    categories = data || [];
    // ... fallback categories if needed
  } catch (err) {
    // ... fallback categories
  }
  
  // Load packages from database
  let packages = [];
  try {
    // ... load packages
  } catch (err) {
    // ... fallback packages
  }
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Create team fields
  for (let i = 1; i <= teamCount; i++) {
    const teamField = document.createElement('div');
    teamField.className = 'team-field';
    teamField.id = `teamField${i}`;
    
    // ... generate field HTML
    teamField.innerHTML = `...`;  // Creates fresh fields
    container.appendChild(teamField);
  }
  
  // Set up category change handlers to show/hide entry options
  setupCategoryChangeHandlers(teamCount);
  
  Logger.debug('🎯 generateTeamFields: Created', teamCount, 'team input fields');
  
  // IMPORTANT: After generating fields, restore any saved data
  const savedTeamCount = sessionStorage.getItem('tn_team_count');
  if (savedTeamCount && parseInt(savedTeamCount, 10) === teamCount) {
    Logger.debug('🎯 generateTeamFields: Restoring saved field values after generation');
    loadTeamData();
  }
}
```

**What it clears**: `teamFieldsContainer` (only team fields, not entire step)
**When triggered**: Called from:
- `setupTeamCountHandler()` change event - Line 950 (when user changes team count)
- `restoreTeamCountSelection()` - Line 1036 (when restoring saved team count, if fields don't exist)

**Impact on Step 1 fields**: ⚠️ **CRITICAL** - Clears all team input fields
**Safeguard**: Lines 1215-1218 save before clearing, lines 1354-1358 restore after

---

### 5. `setupCategoryChangeHandlers()` - Lines 1364-1389

**Full Function:**
```javascript
function setupCategoryChangeHandlers(teamCount) {
  for (let i = 1; i <= teamCount; i++) {
    const categorySelect = document.getElementById(`teamCategory${i}`);
    const optionGroup = document.getElementById(`teamOptionGroup${i}`);
    const optionBoxes = document.getElementById(`teamOptionBoxes${i}`);
    
    if (categorySelect && optionGroup && optionBoxes) {
      categorySelect.addEventListener('change', (event) => {
        if (event.target.value) {
          // Show entry option when category is selected
          optionGroup.style.display = 'block';
          
          // Populate package options based on division code
          populatePackageOptions(i, event.target.value);
          
	Logger.debug(`🎯 Team ${i}: Category selected, showing entry options`);
        } else {
          // Hide entry option when category is cleared
          optionGroup.style.display = 'none';
          // Clear the option boxes
          optionBoxes.innerHTML = '';  // ⚠️ LINE 1384: Clears entry option radio buttons
	Logger.debug(`🎯 Team ${i}: Category cleared, hiding entry options`);
        }
      });
    }
  }
}
```

**What it clears**: `teamOptionBoxes${i}` (entry option radio buttons for a specific team)
**When triggered**: Category select `change` event (when user clears category selection)
**Impact on Step 1 fields**: ⚠️ **Moderate** - Only clears entry options, not main fields, but could cause entry option to disappear

---

### 6. `populatePackageOptions()` - Lines 1373-1493

**Full Function:**
```javascript
function populatePackageOptions(teamIndex, divisionCode) {
  const optionBoxes = document.getElementById(`teamOptionBoxes${teamIndex}`);
  if (!optionBoxes) return;
  
  // Get packages from global variable (set by generateTeamFields)
  const packages = window.__PACKAGES || [];
  if (packages.length === 0) {
	Logger.warn(`🎯 Team ${teamIndex}: No packages available`);
    return;
  }
  
  // Filter packages based on division code (corporate vs non-corporate)
  const isCorporate = divisionCode === 'C'; // Corporate division
  const relevantPackages = packages.filter(pkg => {
    if (isCorporate) {
      return pkg.package_code.includes('_corp');
    } else {
      return !pkg.package_code.includes('_corp');
    }
  });
  
  if (relevantPackages.length === 0) {
	Logger.warn(`🎯 Team ${teamIndex}: No packages found for division ${divisionCode}`);
    return;
  }
  
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Generate package boxes
  optionBoxes.innerHTML = relevantPackages.map((pkg, index) => {  // ⚠️ LINE 1424: Sets innerHTML (replaces content)
    // ... generates package option HTML
    return `...`;
  }).join('');
  
  // ... sets up click handlers for package boxes
}
```

**What it clears/sets**: `teamOptionBoxes${teamIndex}` (replaces entry option radio buttons)
**When triggered**: Category select `change` event (when user selects a category)
**Impact on Step 1 fields**: ⚠️ **Moderate** - Replaces entry options, could lose selection if not restored

---

### 7. `createOrganizationForm()` - Lines 1503-1694

**Full Function:**
```javascript
async function createOrganizationForm() {
  const container = document.getElementById('wizardMount');
  if (!container) {
	Logger.error('🎯 createOrganizationForm: wizardMount not found');
    return;
  }
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  container.innerHTML = `  // ⚠️ LINE 1579: Sets innerHTML (replaces entire step 2 content)
    <div class="organization-form">
      <!-- ... organization form HTML ... -->
    </div>
  `;
  
  // ... sets up navigation handlers
}
```

**What it clears/sets**: `wizardMount` (entire step 2 content)
**When triggered**: Called from `initStep2()` - Line 1516
**Impact on Step 1 fields**: ✅ Safe - Only affects step 2

---

### 8. `createRaceDayForm()` - Lines 1887-2029

**Full Function:**
```javascript
async function createRaceDayForm() {
  const container = document.getElementById('wizardMount');
  if (!container) {
	Logger.error('🎯 createRaceDayForm: wizardMount not found');
    return;
  }
  
  try {
    // ... load race day items from database
    
    const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    
    // Create form HTML
    container.innerHTML = `  // ⚠️ LINE 1940: Sets innerHTML (replaces entire step 3 content)
      <div class="race-day-form">
        <!-- ... race day form HTML ... -->
      </div>
    `;
    
    // ... sets up navigation
  } catch (error) {
    // ... fallback HTML
    container.innerHTML = `  // ⚠️ LINE 1994: Sets innerHTML (fallback)
      <!-- ... fallback HTML ... -->
    `;
  }
}
```

**What it clears/sets**: `wizardMount` (entire step 3 content)
**When triggered**: Called from `initStep3()` - Line 2007
**Impact on Step 1 fields**: ✅ Safe - Only affects step 3

---

### 9. `createTNCalendar()` - Lines 2264-2349

**Full Function:**
```javascript
function createTNCalendar(options = {}) {
  const container = document.getElementById('calendarContainer');
  if (!container) {
	Logger.error('🎯 createTNCalendar: calendarContainer not found');
    return;
  }
  
  // ... get dates, config, etc.
  
	Logger.debug('createTNCalendar: Generated date range:', { start, end });
  
  container.innerHTML = '';  // ⚠️ LINE 2341: Clears calendar container
  
  // Generate months between start and end dates
  const months = generateMonths(start, end);
  // ... creates calendar HTML
}
```

**What it clears**: `calendarContainer` (practice calendar)
**When triggered**: Called from `initStep4()` - Line 2269
**Impact on Step 1 fields**: ✅ Safe - Only affects step 4 calendar

---

### 10. `populateSlotSelects()` - Lines 3275-3410

**Full Function:**
```javascript
function populateSlotSelects(slots, selectIds) {
  // ... gets current selections, filters duplicates
  
  selectIds.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    
    // Clear existing options
    select.innerHTML = '<option value="">-- Select --</option>';  // ⚠️ LINE 3345: Clears select options
    
    // ... repopulates with new options
  });
}
```

**What it clears**: Slot preference select dropdowns
**When triggered**: Called from `initStep4()` slot preference initialization
**Impact on Step 1 fields**: ✅ Safe - Only affects step 4 slot selects

---

### 11. `loadTeamSummary()` - Lines 5050-5133

**Full Function:**
```javascript
function loadTeamSummary() {
	Logger.debug('🎯 loadTeamSummary: Starting');
  const teamsTbody = document.getElementById('teamsTbody');
  if (!teamsTbody) {
	Logger.warn('🎯 loadTeamSummary: teamsTbody element not found');
    return;
  }
  
	Logger.debug('🎯 loadTeamSummary: teamsTbody found');
  
  // Collect team data from sessionStorage
  const teams = [];
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i}`);
    
    if (teamNameEn) {
      teams.push({
        index: i,
        name_en: teamNameEn,
        name_tc: teamNameTc || '',
        category: teamCategory || ''
      });
    }
  }
  
  if (teams.length === 0) {
    teamsTbody.innerHTML = '<tr><td colspan="3" class="muted">No teams</td></tr>';  // ⚠️ LINE 5109: Sets innerHTML
  } else {
    teamsTbody.innerHTML = '';  // ⚠️ LINE 5111: Clears teamsTbody
    teams.forEach((team, index) => {
      // ... creates summary table rows
    });
  }
}
```

**What it clears/sets**: `teamsTbody` (summary table)
**When triggered**: Called from `initStep5()` - Line 5054
**Impact on Step 1 fields**: ✅ Safe - Only affects step 5 summary

---

### 12. `loadManagerSummary()` - Lines 5135-5224

**Full Function:**
```javascript
function loadManagerSummary() {
  // ... collects manager data
  
  if (managers.length === 0) {
    managersTbody.innerHTML = '<tr><td colspan="4" class="muted">No manager information</td></tr>';  // ⚠️ LINE 5188: Sets innerHTML
  } else {
    managersTbody.innerHTML = '';  // ⚠️ LINE 5190: Clears managersTbody
    managers.forEach((manager, index) => {
      // ... creates summary table rows
    });
  }
}
```

**What it clears/sets**: `managersTbody` (summary table)
**When triggered**: Called from `initStep5()` - Line 5140
**Impact on Step 1 fields**: ✅ Safe - Only affects step 5 summary

---

### 13. `loadPracticeSummary()` - Lines 5259-5342

**Full Function:**
```javascript
function loadPracticeSummary() {
	Logger.debug('🎯 loadPracticeSummary: Starting');
  const perTeamPracticeSummary = document.getElementById('perTeamPracticeSummary');
  if (!perTeamPracticeSummary) {
	Logger.warn('🎯 loadPracticeSummary: perTeamPracticeSummary element not found');
    return;
  }
  
  // ... gets practice data
  
  if (!readTeamRows || !readTeamRanks) {
    perTeamPracticeSummary.innerHTML = '<p class="muted">Practice booking data unavailable</p>';  // ⚠️ LINE 5272: Sets innerHTML
    return;
  }
  
  // ... collects practice data
  
  if (practiceData.length === 0) {
    perTeamPracticeSummary.innerHTML = '<p class="muted">No practice booking data</p>';  // ⚠️ LINE 5298: Sets innerHTML
    return;
  }
  
  // ... generates summary HTML
  perTeamPracticeSummary.innerHTML = html;
}
```

**What it clears/sets**: `perTeamPracticeSummary` (summary display)
**When triggered**: Called from `initStep5()` - Line 5264
**Impact on Step 1 fields**: ✅ Safe - Only affects step 5 summary

---

## Functions Calling `generateTeamFields()`

### 1. `setupTeamCountHandler()` - Lines 931-1001

**Full Function:**
```javascript
function setupTeamCountHandler() {
  const teamCountSelect = document.getElementById('teamCount');
  if (!teamCountSelect) return;
  
  // Check if handler already attached (using data attribute)
  if (teamCountSelect.dataset.handlerAttached === 'true') {
    Logger.debug('🎯 setupTeamCountHandler: Handler already attached, skipping');
    return;
  }
  
  teamCountSelect.addEventListener('change', async (event) => {  // ⚠️ TRIGGER: User changes dropdown
    const teamCount = parseInt(event.target.value, 10);
	Logger.debug('🎯 initStep1: Team count selected:', teamCount);
    
    if (teamCount > 0) {
      // Store team count in session storage
      sessionStorage.setItem('tn_team_count', teamCount.toString());
      
      // Generate team fields (now async)
      await generateTeamFields(teamCount);  // ⚠️ LINE 950: Calls generateTeamFields()
      
      // Show team fields container and next button
      const teamFieldsContainer = document.getElementById('teamFieldsContainer');
      const step1Actions = document.getElementById('step1Actions');
      if (teamFieldsContainer) {
        teamFieldsContainer.style.display = 'block';
      }
      if (step1Actions) {
        step1Actions.style.display = 'block';
      }
    } else {
      // Hide team fields container and next button
      const teamFieldsContainer = document.getElementById('teamFieldsContainer');
      const step1Actions = document.getElementById('step1Actions');
      if (teamFieldsContainer) {
        teamFieldsContainer.style.display = 'none';
      }
      if (step1Actions) {
        step1Actions.style.display = 'none';
      }
    }
  });
  
  // Mark handler as attached
  teamCountSelect.dataset.handlerAttached = 'true';
  
  // Add next button handler
  const nextButton = document.getElementById('nextToStep2');
  if (nextButton) {
    if (nextButton.dataset.handlerAttached === 'true') {
      Logger.debug('🎯 setupTeamCountHandler: Next button handler already attached, skipping');
    } else {
      nextButton.addEventListener('click', () => {
        Logger.debug('🎯 initStep1: Next button clicked, validating step 1');
        
        // Validate all team information before proceeding
        if (validateStep1()) {
          Logger.debug('🎯 initStep1: Validation passed, saving data and proceeding to step 2');
          saveStep1Data();
          loadStep(2);
        } else {
          Logger.debug('🎯 initStep1: Validation failed, staying on step 1');
        }
      });
      nextButton.dataset.handlerAttached = 'true';
    }
  }
  
  // Set up error clearing when user starts typing
  setupErrorClearing();
}
```

**Trigger**: User changes team count dropdown (`change` event)
**Calls**: `generateTeamFields(teamCount)` - Line 950

---

### 2. `restoreTeamCountSelection()` - Lines 1006-1052

**Full Function:**
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
        await generateTeamFields(teamCount);  // ⚠️ LINE 1036: Calls generateTeamFields()
        
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

**Trigger**: Called from `initStep1()` - Line 849 (when step 1 is initialized)
**Calls**: `generateTeamFields(teamCount)` - Line 1036 (only if fields don't exist or count doesn't match)

---

## Functions Calling `createTeamCountSelector()`

### 1. `initStep1()` - Lines 839-850

**Full Function:**
```javascript
async function initStep1() {
	Logger.debug('🎯 initStep1: Starting team count selection');
  
  // Create team count selection UI (will replace template content)
  createTeamCountSelector();  // ⚠️ LINE 843: Calls createTeamCountSelector()
  
  // Set up team count change handler
  setupTeamCountHandler();
  
  // Restore previously selected team count if it exists (await to ensure fields are generated)
  await restoreTeamCountSelection();
}
```

**Trigger**: Called from `loadStepContent(1)` - Line 579 (when step 1 is loaded)
**Calls**: `createTeamCountSelector()` - Line 843

---

## Functions Calling `loadStepContent()`

### 1. `loadStep()` - Lines 468-497

**Full Function:**
```javascript
async function loadStep(step) {
  // Allow step 0 (Race Info) through totalSteps
  if (step < 0 || step > totalSteps) {
	Logger.error(`Invalid step: ${step}`);
    return;
  }
  
  // Add breadcrumb for step navigation
  addBreadcrumb(`Navigating to step ${step}`, 'navigation', 'info', {
    step,
    previousStep: currentStep,
    wizard: 'tn'
  });
  
  currentStep = step;
  
  // Update stepper
  updateStepper();
  
  // Load step content
  await loadStepContent(step);  // ⚠️ LINE 488: Calls loadStepContent()
  
  // Update URL
  if (window.updateTNStepURL) {
    window.updateTNStepURL(step);
  }
  
  // Save current step to sessionStorage
  sessionStorage.setItem('tn_current_step', step.toString());
}
```

**Trigger**: Called from multiple places:
- `initTNWizard()` - Line 164 (initial load, step 0)
- `initStep0()` - Line 817 (going to step 1)
- `initStep1()` Next button - Line 990 (going to step 2)
- `initStep2()` Next/Back buttons - Lines 1659, 1672 (step navigation)
- `initStep3()` Next/Back buttons - Lines 2010, 2025 (step navigation)
- `initStep4()` Next/Back buttons - Lines 4333, 4347 (step navigation)
- `setupStepNavigation()` - Line 5283 (back button)
- `startFresh()` - Line 4177 (reset form)

**Calls**: `loadStepContent(step)` - Line 488

---

### 2. Language Change Event Listener - Lines 170-176

**Full Function:**
```javascript
// Listen for language changes to re-render entire current step
window.addEventListener('languageChanged', () => {  // ⚠️ TRIGGER: Language change event
  Logger.debug('TN Wizard: Language changed, re-rendering current step');
  initStepNavigation();
  updateStepper();
  // Re-render the current step content with new language
  loadStepContent(currentStep);  // ⚠️ LINE 175: Calls loadStepContent()
});
```

**Trigger**: `languageChanged` event (fired when user changes language)
**Calls**: `loadStepContent(currentStep)` - Line 175

---

## Summary: Critical Functions That Can Destroy Step 1 Fields

### ⚠️ HIGH RISK - Directly Clear Fields:

1. **`loadStepContent(1)`** - Line 570
   - Clears: `wizardMount.innerHTML = ''`
   - Triggers: `loadStep(1)`, language change event
   - **IMPACT**: Destroys ALL step 1 content including fields
   - **Safeguard**: Lines 544-556 try to save before clearing, but only if fields exist

2. **`createTeamCountSelector()`** - Line 922
   - Clears: `container.innerHTML = ''` (wizardMount)
   - Triggers: `initStep1()` → Line 843
   - **IMPACT**: Destroys ALL step 1 content, recreates structure
   - **Safeguard**: Lines 859-864 check if fields exist and skip, but this doesn't help if `loadStepContent()` already cleared them

3. **`generateTeamFields()`** - Line 1221
   - Clears: `container.innerHTML = ''` (teamFieldsContainer only)
   - Triggers: Team count dropdown change, `restoreTeamCountSelection()`
   - **IMPACT**: Destroys all team input fields, then recreates them
   - **Safeguard**: Lines 1215-1218 save before clearing, lines 1354-1358 restore after

### ⚠️ MODERATE RISK - Clear Partial Fields:

4. **`setupCategoryChangeHandlers()`** - Line 1384
   - Clears: Entry option radio buttons for a team
   - Triggers: User clears category selection
   - **IMPACT**: Entry options disappear (expected behavior when category is cleared)

5. **`populatePackageOptions()`** - Line 1424
   - Sets: `optionBoxes.innerHTML = ...` (replaces entry option radio buttons)
   - Triggers: User selects a category
   - **IMPACT**: Replaces entry options, could lose selection if not restored

### ✅ LOW RISK - Don't Affect Step 1:

6. Other functions only affect steps 2-5 or summary displays

---

## Critical Flow When Validation Fails:

### Scenario 1: Language Change Event Fires After Validation

1. User clicks "Next" → validation fails → stays on step 1
2. **Language change event fires** (or any other trigger):
   - Line 175: `loadStepContent(currentStep)` called
   - Line 570: `wizardMount.innerHTML = ''` → **ALL FIELDS DESTROYED**
   - Line 579: Calls `initStep1()`
   - Line 843: Calls `createTeamCountSelector()` 
     - Line 859-864: Checks if fields exist → **They don't (already cleared)**, so proceeds
     - Line 922: Clears again (but already empty)
     - Creates fresh structure with empty `teamFieldsContainer`
   - Line 849: Calls `restoreTeamCountSelection()`
     - Line 1020: `existingFieldsCount === 0` (no fields exist)
     - Line 1036: Calls `generateTeamFields()` to recreate fields
     - Fields are recreated empty
     - Line 1048: Calls `loadTeamData()` to restore from sessionStorage
     - **But if user input wasn't saved to sessionStorage, it's lost**

### Scenario 2: createTeamCountSelector() Runs When Fields Exist

1. User clicks "Next" → validation fails → stays on step 1
2. **Something triggers `initStep1()` again**:
   - Line 843: Calls `createTeamCountSelector()`
   - Line 859-864: Checks if fields exist → **If they exist**, returns early ✅
   - **But if check fails or fields were already removed**, continues
   - Line 922: `container.innerHTML = ''` → **ALL FIELDS DESTROYED**
   - Creates fresh structure
   - `restoreTeamCountSelection()` must run to recreate fields

### Scenario 3: generateTeamFields() Runs

1. User clicks "Next" → validation fails → stays on step 1
2. **User changes team count dropdown**:
   - Line 950: Calls `generateTeamFields()`
   - Line 1215-1218: Saves current field values (if fields exist)
   - Line 1221: `container.innerHTML = ''` → **ALL TEAM FIELDS DESTROYED**
   - Generates new fields
   - Line 1354-1358: Restores from sessionStorage

**Root Cause**: 
- `loadStepContent(1)` and `createTeamCountSelector()` both clear `wizardMount` which contains all step 1 fields
- If either runs after validation fails, fields disappear
- Fields can only be restored if data was saved to sessionStorage
- **The problem**: When validation fails, data is NOT saved, so if fields are cleared, user input is lost

