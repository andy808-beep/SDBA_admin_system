# Step 1 Field Disappearing Bug - Relevant Code

## Problem Flow
1. User clicks "Next" button without filling required fields
2. `validateStep1()` runs and returns false
3. Error message appears
4. **BUG**: Input fields (teamNameEn, teamCategory, entry options) disappear

## Key Functions

### 1. loadStepContent (lines 522-593)
Called when loading any step. **CRITICAL**: Line 570 clears `wizardMount.innerHTML = ''` before calling `initStep1()`

```javascript
async function loadStepContent(step) {
	Logger.debug(`loadStepContent: Loading step ${step}`);
  if (!wizardMount) {
	Logger.error('loadStepContent: wizardMount not found');
    return;
  }
  
  // Handle step 0 (Race Info) specially - no template, generated content
  if (step === 0) {
    wizardMount.innerHTML = '';
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
  wizardMount.innerHTML = '';  // <-- CLEARS EVERYTHING HERE
  wizardMount.appendChild(content);
  
  // Ensure content is properly scoped within #tnScope
	Logger.debug('loadStepContent: Content loaded into #tnScope container');
  
  // Initialize step-specific functionality
  switch (step) {
    case 1:
      await initStep1();  // <-- Then calls initStep1
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

### 2. initStep1 (lines 839-850)
Entry point for step 1 initialization

```javascript
async function initStep1() {
	Logger.debug('🎯 initStep1: Starting team count selection');
  
  // Create team count selection UI (will replace template content)
  createTeamCountSelector();  // <-- Creates/clears container
  
  // Set up team count change handler
  setupTeamCountHandler();
  
  // Restore previously selected team count if it exists (await to ensure fields are generated)
  await restoreTeamCountSelection();  // <-- Regenerates fields
}
```

### 3. createTeamCountSelector (lines 855-926)
**CRITICAL BUG LOCATION**: Line 922 clears container even if fields exist

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
  container.innerHTML = '';  // <-- BUG: Clears everything including fields
  container.appendChild(teamCountSection);
  
	Logger.debug('🎯 initStep1: Team count selector created');
}
```

### 4. setupTeamCountHandler (lines 931-1001)
Handles team count change and Next button click

```javascript
function setupTeamCountHandler() {
  const teamCountSelect = document.getElementById('teamCount');
  if (!teamCountSelect) return;
  
  // Check if handler already attached (using data attribute)
  if (teamCountSelect.dataset.handlerAttached === 'true') {
    Logger.debug('🎯 setupTeamCountHandler: Handler already attached, skipping');
    return;
  }
  
  teamCountSelect.addEventListener('change', async (event) => {
    const teamCount = parseInt(event.target.value, 10);
	Logger.debug('🎯 initStep1: Team count selected:', teamCount);
    
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
  
  // Add next button handler (check if already attached)
  const nextButton = document.getElementById('nextToStep2');
  if (nextButton) {
    if (nextButton.dataset.handlerAttached === 'true') {
      Logger.debug('🎯 setupTeamCountHandler: Next button handler already attached, skipping');
    } else {
      nextButton.addEventListener('click', () => {
        Logger.debug('🎯 initStep1: Next button clicked, validating step 1');
        
        // Validate all team information before proceeding
        if (validateStep1()) {  // <-- If validation fails, returns false, stays on step 1
          Logger.debug('🎯 initStep1: Validation passed, saving data and proceeding to step 2');
          saveStep1Data();
          loadStep(2);
        } else {
          Logger.debug('🎯 initStep1: Validation failed, staying on step 1');  // <-- BUT FIELDS DISAPPEAR
        }
      });
      nextButton.dataset.handlerAttached = 'true';
    }
  }
  
  // Set up error clearing when user starts typing
  setupErrorClearing();
}
```

### 5. restoreTeamCountSelection (lines 1006-1048)
Restores team count selection and regenerates fields if needed

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
        await generateTeamFields(teamCount);
        
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

### 6. generateTeamFields (lines 1207-1357)
Generates the team input fields. **CRITICAL**: Line 1221 clears container.innerHTML

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
  container.innerHTML = '';  // <-- Clears fields
  
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

### 7. saveTeamData (lines 1887-1915)
Saves team field values to sessionStorage

```javascript
function saveTeamData() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10);
  if (!teamCount) return;
  
	Logger.debug('🎯 saveTeamData: Saving data for', teamCount, 'teams');
  
  for (let i = 1; i <= teamCount; i++) {
    const nameEnEl = document.getElementById(`teamNameEn${i}`);
    const nameTcEl = document.getElementById(`teamNameTc${i}`);
    const categoryEl = document.getElementById(`teamCategory${i}`);
    const optionEl = document.getElementById(`teamOption${i}`);

    if (nameEnEl && nameEnEl.value) {
      sessionStorage.setItem(`tn_team_name_en_${i}`, nameEnEl.value);
    }
    if (nameTcEl && nameTcEl.value) {
      sessionStorage.setItem(`tn_team_name_tc_${i}`, nameTcEl.value);
    }
    
    if (categoryEl && categoryEl.value) {
      sessionStorage.setItem(`tn_team_category_${i}`, categoryEl.value);
    }
    
    // Handle radio button options
    const optionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
    if (optionRadios.length > 0) {
      sessionStorage.setItem(`tn_team_option_${i}`, optionRadios[0].value);
    }
  }
}
```

### 8. loadTeamData (lines 1831-1881)
Loads team field values from sessionStorage

```javascript
function loadTeamData() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10);
  if (!teamCount) return;
  
	Logger.debug('🎯 loadTeamData: Loading data for', teamCount, 'teams');
  
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i}`);
    const teamOption = sessionStorage.getItem(`tn_team_option_${i}`);

    if (teamNameEn) {
      const nameEnEl = document.getElementById(`teamNameEn${i}`);
      if (nameEnEl) nameEnEl.value = teamNameEn;
    }
    if (teamNameTc) {
      const nameTcEl = document.getElementById(`teamNameTc${i}`);
      if (nameTcEl) nameTcEl.value = teamNameTc;
    }
    
    if (teamCategory) {
      const categoryEl = document.getElementById(`teamCategory${i}`);
      if (categoryEl) {
        categoryEl.value = teamCategory;
        // Trigger change event to populate entry options
        categoryEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    // Restore entry option after category is set and options are populated
    // Use setTimeout to ensure options are populated first
    if (teamOption && teamCategory) {
      setTimeout(() => {
        const optionRadios = document.querySelectorAll(`input[name="teamOption${i}"]`);
        optionRadios.forEach(radio => {
          if (radio.value === teamOption) {
            radio.checked = true;
            // Trigger click on the package box to update styling
            const packageOption = radio.closest('.package-option');
            if (packageOption) {
              const packageBox = packageOption.querySelector('.package-box');
              if (packageBox) {
                packageBox.click();
              }
            }
          }
        });
      }, 100);
    }
  }
}
```

### 9. validateStep1 (lines 5407-5493)
Validates step 1 fields

```javascript
function validateStep1() {
  const teamCount = document.getElementById('teamCount');
  
  if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
    showError('Please select number of teams');
    teamCount?.focus();
    return false;
  }
  
  // Clear any previous field highlighting
  clearFieldHighlighting();
  
  // Validate team fields if they exist
  const teamCountValue = parseInt(teamCount.value, 10);
  const missingFields = [];
  const teamData = [];
  
  // First pass: collect all team data and check for missing fields
  for (let i = 1; i <= teamCountValue; i++) {
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    const teamNameTc = document.getElementById(`teamNameTc${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);
    const teamOption = document.getElementById(`teamOption${i}`);
    
    if (!teamNameEn?.value?.trim()) {
      missingFields.push(`Team ${i} name (English)`);
      highlightField(teamNameEn);
    }
    
    if (!teamCategory?.value) {
      missingFields.push(`Team ${i} race category`);
      highlightField(teamCategory);
    }
    
    // Check for selected radio button in the team option group
    const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
	Logger.debug(`🎯 Validation: Team ${i} radio buttons found:`, teamOptionRadios.length);
    if (teamOptionRadios.length > 0) {
	Logger.debug(`🎯 Validation: Team ${i} selected value:`, teamOptionRadios[0].value);
    }
    
    if (teamOptionRadios.length === 0) {
      missingFields.push(`Team ${i} entry option`);
      // Highlight the package options container for this team
      const teamOptionGroup = document.getElementById(`teamOptionGroup${i}`);
      if (teamOptionGroup) {
        highlightField(teamOptionGroup);
      }
    }
    
    // Collect team data for duplicate checking
    if (teamNameEn?.value?.trim() && teamCategory?.value) {
      teamData.push({
        index: i,
        name: teamNameEn.value.trim(),
        category: teamCategory.value,
        nameElement: teamNameEn,
        categoryElement: teamCategory
      });
    }
  }
  
  // Second pass: check for duplicate team names within same category
  const categoryGroups = {};
  teamData.forEach(team => {
    if (!categoryGroups[team.category]) {
      categoryGroups[team.category] = [];
    }
    categoryGroups[team.category].push(team);
  });
  
  // Check for duplicates within each category
  Object.keys(categoryGroups).forEach(category => {
    const teamsInCategory = categoryGroups[category];
    const nameCounts = {};
    
    teamsInCategory.forEach(team => {
      const name = team.name.toLowerCase();
      if (!nameCounts[name]) {
        nameCounts[name] = [];
      }
      nameCounts[name].push(team);
    });
    
    // Find duplicates
    Object.keys(nameCounts).forEach(name => {
      if (nameCounts[name].length > 1) {
        nameCounts[name].forEach(team => {
          missingFields.push(`Team ${team.index} name (duplicate in ${category})`);
          highlightField(team.nameElement);
        });
      }
    });
  });
  
  if (missingFields.length > 0) {
    const message = missingFields.length === 1 
      ? `Please complete: ${missingFields[0]}`
      : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
    showError(message);
    return false;
  }
  
  return true;
}
```

### 10. showError (lines 6385-6410)
Displays error message

```javascript
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';

    msgEl.style.display = 'block';
    msgEl.style.backgroundColor = '#fee';
    msgEl.style.border = '2px solid #dc3545';
    msgEl.style.color = '#721c24';
    msgEl.style.padding = '1rem';
    msgEl.style.margin = '1rem 0';
    msgEl.style.borderRadius = '4px';
    msgEl.style.whiteSpace = 'pre-wrap';
    msgEl.style.fontWeight = 'bold';

    // Scroll to error message
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

	Logger.error('Validation Error:', message);
  } else {
    // Fallback: alert if formMsg element doesn't exist
	Logger.error('formMsg element not found, using alert');
    alert(message);
  }
}
```

### 11. saveStep1Data (lines 5773-5783)
Saves step 1 data before proceeding

```javascript
function saveStep1Data() {
  const teamCount = document.getElementById('teamCount');

  if (teamCount?.value) {
    sessionStorage.setItem('tn_team_count', teamCount.value);
	Logger.debug('🎯 saveStep1Data: Saved team count:', teamCount.value);
  }

  // Save team data if team fields are present
  saveTeamData();
}
```

## Root Cause Analysis

The bug occurs because:

1. **When validation fails**, the code stays on step 1 (line 992: `Logger.debug('🎯 initStep1: Validation failed, staying on step 1')`)
2. **However**, something is causing `loadStepContent(1)` to be called again, OR `initStep1()` is being called again
3. **When `loadStepContent(1)` runs** (line 570), it does `wizardMount.innerHTML = ''` which clears everything
4. **Then `createTeamCountSelector()` runs** (line 922) which also does `container.innerHTML = ''` 
5. **The check on line 862** should prevent recreation, but it's not working because by the time it runs, the container was already cleared by `loadStepContent`

## The Real Issue

The problem is that **validation failure should NOT trigger a reload of step 1**. The fields should remain intact. Something must be calling `loadStepContent(1)` or `initStep1()` again when validation fails, or there's a race condition where the container is being cleared.

## Potential Solutions

1. **Prevent `loadStepContent` from running if we're already on step 1** and fields exist
2. **Don't clear container in `createTeamCountSelector`** if fields already exist (the check exists but may not work if container was already cleared)
3. **Save field values BEFORE validation runs** so they can be restored
4. **Ensure validation failure doesn't trigger any reload/reinitialization**

