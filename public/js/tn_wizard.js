/**
 * TN Legacy Wizard Implementation
 * Restores legacy multi-step form behavior with exact visual compatibility
 */

import { TN_SELECTORS, collectCompleteTNState, validateTNState } from './tn_map.js';
import { sb } from '../supabase_config.js';
import { getCurrentTeamKey, setCurrentTeamKey, readTeamRows, writeTeamRows, readTeamRanks, writeTeamRanks } from './tn_practice_store.js';
import { EDGE_URL, getClientTxId, getEventShortRef, postJSON, saveReceipt, showConfirmation, mapError } from './submit.js';

/**
 * Set up debug functions for testing (dev only)
 */
function setupDebugFunctions() {
  if (!window.__DEV__) return;
  
  console.log('🎯 setupDebugFunctions: Setting up debug functions');
  
  // Create debug namespace
  window.__DBG_TN = window.__DBG_TN || {};
  
  // Add test functions
  window.__DBG_TN.fillSingleTeam = fillSingleTeamForSubmission;
  window.__DBG_TN.fillMultipleTeams = fillMultipleTeamsForSubmission;
  window.__DBG_TN.testSubmission = testSubmissionWithCurrentData;
  window.__DBG_TN.generateFreshTxId = generateFreshClientTxId;
  window.fillSingleTeam = fillSingleTeamForSubmission;
  window.fillMultipleTeams = fillMultipleTeamsForSubmission;
  window.testSubmission = testSubmissionWithCurrentData;
  window.generateFreshTxId = generateFreshClientTxId;
  
  // Add clear functions
  window.__DBG_TN.clearStep4 = clearStep4Data;
  window.__DBG_TN.clearStep5 = clearAllData;
  window.__DBG_TN.startFresh = startFresh;
  window.clearStep4 = clearStep4Data;
  window.clearStep5 = clearAllData;
  window.startFresh = startFresh;
  
  // Add team switch test function
  window.__DBG_TN.testTeamSwitch = testTeamSwitchFunction;
  window.testTeamSwitch = testTeamSwitchFunction;
  
  // Add copy button test function
  window.__DBG_TN.testCopyButton = testCopyButton;
  window.testCopyButton = testCopyButton;
  
  // Add manual save function
  window.__DBG_TN.saveCurrentTeam = saveCurrentTeamPracticeData;
  window.saveCurrentTeam = saveCurrentTeamPracticeData;
  
  // Add debug function to test calendar data collection
  window.__DBG_TN.testCalendarData = testCalendarDataCollection;
  window.testCalendarData = testCalendarDataCollection;
  
  // Add TN store debug functions
  window.__DBG_TN.readTeamRows = readTeamRows;
  window.__DBG_TN.readTeamRanks = readTeamRanks;
  window.__DBG_TN.writeTeamRows = writeTeamRows;
  window.__DBG_TN.writeTeamRanks = writeTeamRanks;
  
  // Add data collection functions for testing
  window.__DBG_TN.collectContactData = collectContactData;
  window.__DBG_TN.collectTeamData = collectTeamData;
  window.__DBG_TN.collectManagerData = collectManagerData;
  window.__DBG_TN.collectRaceDayData = collectRaceDayData;
  window.__DBG_TN.collectPackageData = collectPackageData;
  window.__DBG_TN.buildTNPracticePayload = buildTNPracticePayload;
  window.__DBG_TN.submitTNForm = submitTNForm;
  
  // Also expose them directly on window for easier access
  window.collectContactData = collectContactData;
  window.collectTeamData = collectTeamData;
  window.collectManagerData = collectManagerData;
  window.collectRaceDayData = collectRaceDayData;
  window.collectPackageData = collectPackageData;
  window.buildTNPracticePayload = buildTNPracticePayload;
  window.submitTNForm = submitTNForm;
  
  // Note: testQuickSubmit functions are exposed at the end of the file after they're defined
  
  console.log('🎯 Debug functions available:');
  console.log('  - fillSingleTeam() - Fill form with 1 team');
  console.log('  - fillMultipleTeams() - Fill form with 3 teams');
  console.log('  - testSubmission() - Test submission with current data');
  console.log('  - testQuickSubmit() - Fill form with 3 teams and submit immediately ⚡ (loaded at end of script)');
  console.log('  - testQuickSubmitSingle() - Fill form with 1 team and submit immediately ⚡ (loaded at end of script)');
  console.log('  - generateFreshTxId() - Generate fresh client_tx_id for testing');
}

// TN Wizard State
let currentStep = 1;
let totalSteps = 5;
let tnScope = null;
let wizardMount = null;
let stepper = null;

// Practice-specific state
let practiceSlots = [];
let practiceConfig = null;
let selectedSlots = new Set(); // Track selected slots for duplicate prevention

/**
 * Check and clean preview data if starting fresh
 */
function checkAndCleanPreviewData() {
  // Check URL parameters for fresh start
  const urlParams = new URLSearchParams(window.location.search);
  const freshStart = urlParams.get('fresh') === 'true' || urlParams.get('clear') === 'true';
  
  if (freshStart) {
    console.log('🎯 checkAndCleanPreviewData: Fresh start requested, clearing all data');
    clearAllData();
  } else {
    console.log('🎯 checkAndCleanPreviewData: Continuing with existing data (use ?fresh=true to start clean)');
  }
}

/**
 * Initialize TN Wizard
 * Sets up the multi-step wizard with legacy templates
 */
export function initTNWizard() {
  console.log('initTNWizard: Starting TN wizard initialization');
  tnScope = document.getElementById('tnScope');
  wizardMount = document.getElementById('wizardMount');
  stepper = document.getElementById('stepper');
  
  console.log('initTNWizard: Containers found:', { tnScope: !!tnScope, wizardMount: !!wizardMount, stepper: !!stepper });
  
  if (!tnScope || !wizardMount) {
    console.error('TN wizard containers not found');
    return;
  }
  
  // Check if we're starting fresh or continuing with existing data
  checkAndCleanPreviewData();
  
  // Initialize debug functions globally
  setupDebugFunctions();
  
  // Initialize step navigation
  initStepNavigation();
  
  // Load step 1 (category selection)
  console.log('initTNWizard: Loading step 1');
  loadStep(1);
  
  // Set up deep linking
  initDeepLinking();
  
  console.log('TN Wizard initialized');
}

/**
 * Initialize step navigation and stepper
 */
function initStepNavigation() {
  if (!stepper) return;
  
  // Create stepper HTML (matching WU/SC style)
  stepper.innerHTML = `
    <div class="stepper-container">
      <div class="stepper-steps">
        <div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1">1. Teams</div>
        <div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2">2. Organization</div>
        <div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3">3. Race Day</div>
        <div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4">4. Practice</div>
        <div class="step ${currentStep >= 5 ? 'active' : ''}" data-step="5">5. Summary</div>
      </div>
    </div>
  `;
  
  // Add stepper styles (matching WU/SC style)
  const style = document.createElement('style');
  style.textContent = `
    .stepper-container {
      margin-bottom: 2rem;
    }
    .stepper-steps {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .step {
      padding: 0.75rem 1.5rem;
      background: #e9ecef;
      color: #6c757d;
      border-radius: 25px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: default;
      transition: all 0.3s ease;
      white-space: nowrap;
    }
    .step.active {
      background: var(--theme-primary, #007bff);
      color: white;
    }
    .step.completed {
      background: #d4edda;
      color: #155724;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize deep linking support
 */
function initDeepLinking() {
  // Handle URL step parameter
  const urlParams = new URLSearchParams(window.location.search);
  const stepParam = urlParams.get('step');
  if (stepParam) {
    const step = parseInt(stepParam, 10);
    if (step >= 1 && step <= totalSteps) {
      currentStep = step;
    }
  }
  
  // Update URL when step changes
  function updateURL(step) {
    const url = new URL(window.location);
    url.searchParams.set('step', step);
    window.history.replaceState({}, '', url);
  }
  
  // Expose updateURL for step navigation
  window.updateTNStepURL = updateURL;
}

/**
 * Load a specific step
 */
async function loadStep(step) {
  if (step < 1 || step > totalSteps) {
    console.error(`Invalid step: ${step}`);
    return;
  }
  
  currentStep = step;
  
  // Update stepper
  updateStepper();
  
  // Load step content
  await loadStepContent(step);
  
  // Update URL
  if (window.updateTNStepURL) {
    window.updateTNStepURL(step);
  }
  
  // Save current step to sessionStorage
  sessionStorage.setItem('tn_current_step', step.toString());
}

/**
 * Update stepper visual state
 */
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
}

/**
 * Load step content from templates
 */
async function loadStepContent(step) {
  console.log(`loadStepContent: Loading step ${step}`);
  if (!wizardMount) {
    console.error('loadStepContent: wizardMount not found');
    return;
  }
  
  const templateId = `tn-step-${step}`;
  const template = document.getElementById(templateId);
  
  console.log(`loadStepContent: Template ${templateId} found:`, !!template);
  
  if (!template) {
    console.error(`Template not found: ${templateId}`);
    return;
  }
  
  // Clone template content
  const content = template.content.cloneNode(true);
  wizardMount.innerHTML = '';
  wizardMount.appendChild(content);
  
  // Ensure content is properly scoped within #tnScope
  console.log('loadStepContent: Content loaded into #tnScope container');
  
  // Initialize step-specific functionality
  switch (step) {
    case 1:
      initStep1();
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
}

/**
 * Initialize Step 1 - Category Selection
 */
function initStep1() {
  console.log('🎯 initStep1: Starting team count selection');
  
  // Create team count selection UI
  createTeamCountSelector();
  
  // Set up team count change handler
  setupTeamCountHandler();
}

/**
 * Create team count selector
 */
function createTeamCountSelector() {
  const container = document.getElementById('wizardMount');
  if (!container) return;
  
  // Create team count question
  const teamCountSection = document.createElement('div');
  teamCountSection.id = 'teamCountSection';
  teamCountSection.innerHTML = `
    <div class="form-group">
      <label for="teamCount">How many teams do you want to register?</label>
      <select id="teamCount" name="teamCount" required>
        <option value="">-- Select number of teams --</option>
        <option value="1">1 team</option>
        <option value="2">2 teams</option>
        <option value="3">3 teams</option>
        <option value="4">4 teams</option>
        <option value="5">5 teams</option>
        <option value="6">6 teams</option>
        <option value="7">7 teams</option>
        <option value="8">8 teams</option>
        <option value="9">9 teams</option>
        <option value="10">10 teams</option>
      </select>
    </div>
    <div id="teamFieldsContainer" style="display: none;">
      <!-- Team fields will be generated here -->
    </div>
    <div id="formMsg" class="error-message" style="display: none;"></div>
    <div class="form-actions" id="step1Actions" style="display: none;">
      <button type="button" id="nextToStep2" class="btn btn-primary">
        Next: Team Information →
      </button>
    </div>
  `;
  
  // Clear existing content and add team count section
  container.innerHTML = '';
  container.appendChild(teamCountSection);
  
  console.log('🎯 initStep1: Team count selector created');
}

/**
 * Set up team count change handler
 */
function setupTeamCountHandler() {
  const teamCountSelect = document.getElementById('teamCount');
  if (!teamCountSelect) return;
  
  teamCountSelect.addEventListener('change', async (event) => {
    const teamCount = parseInt(event.target.value, 10);
    console.log('🎯 initStep1: Team count selected:', teamCount);
    
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
  
  // Add next button handler
  const nextButton = document.getElementById('nextToStep2');
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      console.log('🎯 initStep1: Next button clicked, validating step 1');
      
      // Validate all team information before proceeding
      if (validateStep1()) {
        console.log('🎯 initStep1: Validation passed, saving data and proceeding to step 2');
        saveStep1Data();
        loadStep(2);
      } else {
        console.log('🎯 initStep1: Validation failed, staying on step 1');
      }
    });
  }
  
  // Set up error clearing when user starts typing
  setupErrorClearing();
}

/**
 * Set up error clearing when user starts typing
 */
function setupErrorClearing() {
  // Clear errors when team count changes
  const teamCountSelect = document.getElementById('teamCount');
  if (teamCountSelect) {
    teamCountSelect.addEventListener('change', clearErrors);
  }
  
  // Clear errors when any team field changes
  document.addEventListener('input', (event) => {
    if (event.target.id && (event.target.id.startsWith('teamName') || 
                           event.target.id.startsWith('teamCategory') || 
                           event.target.id.startsWith('teamOption'))) {
      clearErrors();
      // Check for duplicates in real-time
      if (event.target.id.startsWith('teamName') || event.target.id.startsWith('teamCategory')) {
        checkForDuplicateNames();
      }
    }
  });
  
  // Clear errors when any team field changes (for radio buttons)
  document.addEventListener('change', (event) => {
    if (event.target.id && (event.target.id.startsWith('teamName') || 
                           event.target.id.startsWith('teamCategory') || 
                           event.target.id.startsWith('teamOption'))) {
      clearErrors();
      // Check for duplicates in real-time
      if (event.target.id.startsWith('teamName') || event.target.id.startsWith('teamCategory')) {
        checkForDuplicateNames();
      }
    }
  });
}

/**
 * Clear error messages
 */
function clearErrors() {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
  }
}

/**
 * Check for duplicate team names within same category (real-time)
 */
function checkForDuplicateNames() {
  const teamCount = sessionStorage.getItem('tn_team_count');
  if (!teamCount) return;
  
  const teamCountValue = parseInt(teamCount, 10);
  const teamData = [];
  
  // Collect all team data
  for (let i = 1; i <= teamCountValue; i++) {
    const teamName = document.getElementById(`teamName${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);
    
    if (teamName?.value?.trim() && teamCategory?.value) {
      teamData.push({
        index: i,
        name: teamName.value.trim(),
        category: teamCategory.value,
        nameElement: teamName
      });
    }
  }
  
  // Group by category
  const categoryGroups = {};
  teamData.forEach(team => {
    if (!categoryGroups[team.category]) {
      categoryGroups[team.category] = [];
    }
    categoryGroups[team.category].push(team);
  });
  
  // Check for duplicates and highlight
  let hasDuplicates = false;
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
    
    // Highlight duplicates
    Object.keys(nameCounts).forEach(name => {
      if (nameCounts[name].length > 1) {
        hasDuplicates = true;
        nameCounts[name].forEach(team => {
          team.nameElement.classList.add('field-error');
        });
      }
    });
  });
  
  // Show warning if duplicates found
  if (hasDuplicates) {
    const msgEl = document.getElementById('formMsg');
    if (msgEl) {
      msgEl.textContent = 'Warning: Duplicate team names found in the same category. Please use unique names.';
      msgEl.style.display = 'block';
      msgEl.style.background = '#fff3cd';
      msgEl.style.borderColor = '#ffeaa7';
      msgEl.style.color = '#856404';
    }
  }
}

/**
 * Clear field highlighting
 */
function clearFieldHighlighting() {
  const highlightedFields = document.querySelectorAll('#tnScope .field-error');
  highlightedFields.forEach(field => {
    field.classList.remove('field-error');
  });
  
  // Also clear duplicate warning
  const msgEl = document.getElementById('formMsg');
  if (msgEl && msgEl.textContent.includes('Duplicate team names')) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
  }
}

/**
 * Highlight a field with error styling
 */
function highlightField(field) {
  if (field) {
    field.classList.add('field-error');
    field.focus();
  }
}

/**
 * Generate team fields based on team count
 */
async function generateTeamFields(teamCount) {
  const container = document.getElementById('teamFieldsContainer');
  if (!container) return;
  
  console.log('🎯 generateTeamFields: Creating', teamCount, 'team fields');
  
  // Clear existing team fields
  container.innerHTML = '';
  
  // Load categories from database
  let categories = [];
  try {
    console.log('🎯 generateTeamFields: Loading categories from database');
    // Try to load categories from v_divisions_public view
    const { data, error } = await sb
      .from('v_divisions_public')
      .select('division_code, name_en')
      .eq('event_short_ref', 'TN2025')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    categories = data || [];
    console.log('🎯 generateTeamFields: Loaded', categories.length, 'categories from database');
    
    // If no categories found, use fallback
    if (categories.length === 0) {
      console.warn('🎯 generateTeamFields: No categories found in database, using fallback');
      categories = [
        { division_code: 'M', name_en: 'Open Division – Men' },
        { division_code: 'L', name_en: 'Open Division – Ladies' },
        { division_code: 'X', name_en: 'Mixed Division – Open' },
        { division_code: 'C', name_en: 'Mixed Division – Corporate' }
      ];
    }
  } catch (err) {
    console.warn('🎯 generateTeamFields: Failed to load categories, using fallback:', err.message);
    // Fallback categories (matching main race divisions)
    categories = [
      { division_code: 'M', name_en: 'Open Division – Men' },
      { division_code: 'L', name_en: 'Open Division – Ladies' },
      { division_code: 'X', name_en: 'Mixed Division – Open' },
      { division_code: 'C', name_en: 'Mixed Division – Corporate' }
    ];
  }
  
  // Load packages from database
  let packages = [];
  try {
    console.log('🎯 generateTeamFields: Loading packages from database');
    const { data: packageData, error: packageError } = await sb
      .from('v_packages_public')
      .select('package_code, title_en, listed_unit_price, included_practice_hours_per_team, tees_qty, padded_shorts_qty, dry_bag_qty')
      .eq('event_short_ref', 'TN2025')
      .eq('is_active', true)
      .order('sort_order');
    
    if (packageError) throw packageError;
    packages = packageData || [];
    console.log('🎯 generateTeamFields: Loaded', packages.length, 'packages from database');
    
    // Store packages globally for use in populatePackageOptions
    window.__PACKAGES = packages;
  } catch (err) {
    console.warn('🎯 generateTeamFields: Failed to load packages, using fallback:', err.message);
    // Fallback packages (from order.sql)
    packages = [
      { package_code: 'option_1_non_corp', title_en: 'Option I', listed_unit_price: 20900, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 20, dry_bag_qty: 1 },
      { package_code: 'option_2_non_corp', title_en: 'Option II', listed_unit_price: 17500, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 0, dry_bag_qty: 1 },
      { package_code: 'option_1_corp', title_en: 'Option I', listed_unit_price: 21900, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 20, dry_bag_qty: 1 },
      { package_code: 'option_2_corp', title_en: 'Option II', listed_unit_price: 18500, included_practice_hours_per_team: 12, tees_qty: 20, padded_shorts_qty: 0, dry_bag_qty: 1 }
    ];
    
    // Store packages globally for use in populatePackageOptions
    window.__PACKAGES = packages;
  }
  
  // Create team fields
  for (let i = 1; i <= teamCount; i++) {
    const teamField = document.createElement('div');
    teamField.className = 'team-field';
    teamField.id = `teamField${i}`;
    
    const categoryOptions = categories.map(cat => {
      // Use division_code and name_en from v_divisions_public view
      const code = cat.division_code;
      const displayName = cat.name_en;
      return `<option value="${code}">${displayName}</option>`;
    }).join('');
    
    teamField.innerHTML = `
      <div class="team-header">
        <h3>Team ${i}</h3>
      </div>
      <div class="team-inputs">
        <div class="form-group">
          <label for="teamName${i}">Team Name *</label>
          <input type="text" id="teamName${i}" name="teamName${i}" required 
                 placeholder="Enter team name" />
        </div>
        
        <div class="form-group">
          <label for="teamCategory${i}">Race Category *</label>
          <select id="teamCategory${i}" name="teamCategory${i}" required>
            <option value="">-- Select category --</option>
            ${categoryOptions}
          </select>
        </div>
        
        <div class="form-group" id="teamOptionGroup${i}" style="display: none;">
          <label>Entry Option *</label>
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
  
  console.log('🎯 generateTeamFields: Created', teamCount, 'team input fields');
}

/**
 * Set up category change handlers to show/hide entry options
 */
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
          
          console.log(`🎯 Team ${i}: Category selected, showing entry options`);
        } else {
          // Hide entry option when category is cleared
          optionGroup.style.display = 'none';
          // Clear the option boxes
          optionBoxes.innerHTML = '';
          console.log(`🎯 Team ${i}: Category cleared, hiding entry options`);
        }
      });
    }
  }
}

/**
 * Populate package options based on division code
 */
function populatePackageOptions(teamIndex, divisionCode) {
  const optionBoxes = document.getElementById(`teamOptionBoxes${teamIndex}`);
  if (!optionBoxes) return;
  
  // Get packages from the global packages array
  const allPackages = window.__PACKAGES || [];
  
  // Filter packages based on division code
  let relevantPackages = [];
  if (divisionCode === 'C') {
    // Corporate packages
    relevantPackages = allPackages.filter(pkg => 
      pkg.package_code === 'option_1_corp' || pkg.package_code === 'option_2_corp'
    );
  } else {
    // Non-corporate packages
    relevantPackages = allPackages.filter(pkg => 
      pkg.package_code === 'option_1_non_corp' || pkg.package_code === 'option_2_non_corp'
    );
  }
  
  console.log(`🎯 Team ${teamIndex}: Showing packages for division ${divisionCode}:`, relevantPackages);
  
  // Generate package boxes
  optionBoxes.innerHTML = relevantPackages.map((pkg, index) => `
    <div class="package-option" data-package-code="${pkg.package_code}" data-team-index="${teamIndex}">
      <input type="radio" id="teamOption${teamIndex}_${index}" name="teamOption${teamIndex}" value="${pkg.package_code}" required style="display: none;">
      <div class="package-box" data-option-index="${index}">
        <div class="package-header">
          <h4>${pkg.title_en}</h4>
          <div class="package-price">HK$${pkg.listed_unit_price.toLocaleString()}</div>
        </div>
        <div class="package-details">
          <div class="package-item">
            <span class="package-icon">⏰</span>
            <span>Practice: ${pkg.included_practice_hours_per_team} hours</span>
          </div>
          <div class="package-item">
            <span class="package-icon">👕</span>
            <span>T-Shirts: ${pkg.tees_qty} pieces</span>
          </div>
          <div class="package-item">
            <span class="package-icon">🩳</span>
            <span>Padded Shorts: ${pkg.padded_shorts_qty} pieces</span>
          </div>
          <div class="package-item">
            <span class="package-icon">🎒</span>
            <span>Dry Bags: ${pkg.dry_bag_qty} piece</span>
          </div>
        </div>
        <div class="package-selection-indicator">
          <span class="selection-text">Click to select</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers for package selection
  setupPackageBoxHandlers(teamIndex);
}

/**
 * Set up click handlers for package boxes
 */
function setupPackageBoxHandlers(teamIndex) {
  const packageBoxes = document.querySelectorAll(`[data-team-index="${teamIndex}"] .package-box`);
  
  packageBoxes.forEach((box, index) => {
    box.addEventListener('click', () => {
      console.log(`🎯 Team ${teamIndex}: Package box ${index} clicked`);
      
      // Clear previous selections for this team
      const teamOptions = document.querySelectorAll(`[data-team-index="${teamIndex}"]`);
      teamOptions.forEach(option => {
        option.classList.remove('selected');
        const radio = option.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
        
        // Reset selection text
        const selectionText = option.querySelector('.selection-text');
        if (selectionText) {
          selectionText.textContent = 'Click to select';
        }
        
        // Clear inline styles
        const packageBox = option.querySelector('.package-box');
        if (packageBox) {
          packageBox.style.background = '';
          packageBox.style.border = '';
          packageBox.style.boxShadow = '';
          packageBox.style.borderRadius = '';
        }
      });
      
      // Select this option
      const packageOption = box.closest('.package-option');
      const radio = packageOption.querySelector('input[type="radio"]');
      
      if (packageOption && radio) {
        packageOption.classList.add('selected');
        radio.checked = true;
        
        // Debug: Verify radio button is checked
        console.log(`🎯 Team ${teamIndex}: Radio button checked:`, radio.checked);
        console.log(`🎯 Team ${teamIndex}: Radio button name:`, radio.name);
        console.log(`🎯 Team ${teamIndex}: Radio button value:`, radio.value);
        
        // Update selection text
        const selectionText = packageOption.querySelector('.selection-text');
        if (selectionText) {
          selectionText.textContent = 'Selected';
        }
        
        // Debug: Check if class was added
        console.log(`🎯 Team ${teamIndex}: Package option classes:`, packageOption.className);
        console.log(`🎯 Team ${teamIndex}: Package box element:`, packageOption.querySelector('.package-box'));
        
        // Force styling with inline styles as backup
        const packageBox = packageOption.querySelector('.package-box');
        if (packageBox) {
          packageBox.style.background = '#fff8e6';
          packageBox.style.border = '2px solid #f7b500';
          packageBox.style.boxShadow = '0 2px 8px rgba(247, 181, 0, 0.2)';
          packageBox.style.borderRadius = '12px';
          console.log(`🎯 Team ${teamIndex}: Applied inline styles to package box`);
        }
        
        // Trigger change event for validation
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log(`🎯 Team ${teamIndex}: Selected package ${radio.value}`);
      }
    });
  });
}

/**
 * Initialize Step 2 - Team Information
 */
async function initStep2() {
  console.log('🎯 initStep2: Starting team information step');
  
  // Load team count from step 1
  const teamCount = sessionStorage.getItem('tn_team_count');
  if (!teamCount) {
    console.warn('🎯 initStep2: No team count found, redirecting to step 1');
    loadStep(1);
    return;
  }
  
  // Create organization and team manager form
  createOrganizationForm();
  
  // Load saved data if available
  loadOrganizationData();
}

/**
 * Create organization and team manager form
 */
function createOrganizationForm() {
  const container = document.getElementById('wizardMount');
  if (!container) return;
  
  container.innerHTML = `
    <div class="organization-form">
      <h2>Organization & Team Manager Information</h2>
      
      <!-- Organization Information -->
      <div class="form-section">
        <h3>Organization/Group Information</h3>
        <div class="form-group">
          <label for="orgName">Organization/Group Name *</label>
          <input type="text" id="orgName" name="orgName" required 
                 placeholder="Enter organization or group name" />
        </div>
        
        <div class="form-group">
          <label for="orgAddress">Address *</label>
          <textarea id="orgAddress" name="orgAddress" required rows="3"
                    placeholder="Enter complete address"></textarea>
        </div>
      </div>
      
      <!-- Team Manager 1 (Required) -->
      <div class="form-section">
        <h3>Team Manager 1 (Required)</h3>
        <div class="manager-grid">
          <div class="form-group">
            <label for="manager1Name">Name *</label>
            <input type="text" id="manager1Name" name="manager1Name" required 
                   placeholder="Enter full name" />
          </div>
          <div class="form-group">
            <label for="manager1Phone">Phone *</label>
            <input type="tel" id="manager1Phone" name="manager1Phone" required 
                   placeholder="Enter phone number" />
          </div>
          <div class="form-group">
            <label for="manager1Email">Email *</label>
            <input type="email" id="manager1Email" name="manager1Email" required 
                   placeholder="Enter email address" />
          </div>
        </div>
      </div>
      
      <!-- Team Manager 2 (Required) -->
      <div class="form-section">
        <h3>Team Manager 2 (Required)</h3>
        <div class="manager-grid">
          <div class="form-group">
            <label for="manager2Name">Name *</label>
            <input type="text" id="manager2Name" name="manager2Name" required 
                   placeholder="Enter full name" />
          </div>
          <div class="form-group">
            <label for="manager2Phone">Phone *</label>
            <input type="tel" id="manager2Phone" name="manager2Phone" required 
                   placeholder="Enter phone number" />
          </div>
          <div class="form-group">
            <label for="manager2Email">Email *</label>
            <input type="email" id="manager2Email" name="manager2Email" required 
                   placeholder="Enter email address" />
          </div>
        </div>
      </div>
      
      <!-- Team Manager 3 (Optional) -->
      <div class="form-section">
        <h3>Team Manager 3 (Optional)</h3>
        <div class="manager-grid">
          <div class="form-group">
            <label for="manager3Name">Name</label>
            <input type="text" id="manager3Name" name="manager3Name" 
                   placeholder="Enter full name" />
          </div>
          <div class="form-group">
            <label for="manager3Phone">Phone</label>
            <input type="tel" id="manager3Phone" name="manager3Phone" 
                   placeholder="Enter phone number" />
          </div>
          <div class="form-group">
            <label for="manager3Email">Email</label>
            <input type="email" id="manager3Email" name="manager3Email" 
                   placeholder="Enter email address" />
          </div>
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" id="backToStep1" class="btn btn-secondary">
          ← Back: Team Selection
        </button>
        <button type="button" id="nextToStep3" class="btn btn-primary">
          Next: Race Day Arrangements →
        </button>
      </div>
    </div>
  `;
  
  // Set up navigation handlers
  setupStep2Navigation();
  
  console.log('🎯 initStep2: Organization form created');
}

/**
 * Set up navigation for step 2
 */
function setupStep2Navigation() {
  // Back button
  const backBtn = document.getElementById('backToStep1');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('🎯 initStep2: Back button clicked, going to step 1');
      loadStep(1);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextToStep3');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('🎯 initStep2: Next button clicked, validating step 2');
      
      if (validateStep2()) {
        console.log('🎯 initStep2: Validation passed, saving data and proceeding to step 3');
        saveStep2Data();
        loadStep(3);
      } else {
        console.log('🎯 initStep2: Validation failed, staying on step 2');
      }
    });
  }
}

/**
 * Load saved organization data from sessionStorage
 */
function loadOrganizationData() {
  // Load organization data
  const orgName = sessionStorage.getItem('tn_org_name');
  const orgAddress = sessionStorage.getItem('tn_org_address');
  
  if (orgName) {
    const orgNameEl = document.getElementById('orgName');
    if (orgNameEl) orgNameEl.value = orgName;
  }
  
  if (orgAddress) {
    const orgAddressEl = document.getElementById('orgAddress');
    if (orgAddressEl) orgAddressEl.value = orgAddress;
  }
  
  // Load manager 1 data
  const manager1Name = sessionStorage.getItem('tn_manager1_name');
  const manager1Phone = sessionStorage.getItem('tn_manager1_phone');
  const manager1Email = sessionStorage.getItem('tn_manager1_email');
  
  if (manager1Name) {
    const el = document.getElementById('manager1Name');
    if (el) el.value = manager1Name;
  }
  if (manager1Phone) {
    const el = document.getElementById('manager1Phone');
    if (el) el.value = manager1Phone;
  }
  if (manager1Email) {
    const el = document.getElementById('manager1Email');
    if (el) el.value = manager1Email;
  }
  
  // Load manager 2 data
  const manager2Name = sessionStorage.getItem('tn_manager2_name');
  const manager2Phone = sessionStorage.getItem('tn_manager2_phone');
  const manager2Email = sessionStorage.getItem('tn_manager2_email');
  
  if (manager2Name) {
    const el = document.getElementById('manager2Name');
    if (el) el.value = manager2Name;
  }
  if (manager2Phone) {
    const el = document.getElementById('manager2Phone');
    if (el) el.value = manager2Phone;
  }
  if (manager2Email) {
    const el = document.getElementById('manager2Email');
    if (el) el.value = manager2Email;
  }
  
  // Load manager 3 data
  const manager3Name = sessionStorage.getItem('tn_manager3_name');
  const manager3Phone = sessionStorage.getItem('tn_manager3_phone');
  const manager3Email = sessionStorage.getItem('tn_manager3_email');
  
  if (manager3Name) {
    const el = document.getElementById('manager3Name');
    if (el) el.value = manager3Name;
  }
  if (manager3Phone) {
    const el = document.getElementById('manager3Phone');
    if (el) el.value = manager3Phone;
  }
  if (manager3Email) {
    const el = document.getElementById('manager3Email');
    if (el) el.value = manager3Email;
  }
}

/**
 * Load saved team data from sessionStorage
 */
function loadTeamData() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10);
  if (!teamCount) return;
  
  console.log('🎯 loadTeamData: Loading data for', teamCount, 'teams');
  
  for (let i = 1; i <= teamCount; i++) {
    const teamName = sessionStorage.getItem(`tn_team_name_${i}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i}`);
    const teamOption = sessionStorage.getItem(`tn_team_option_${i}`);
    
    if (teamName) {
      const nameEl = document.getElementById(`teamName${i}`);
      if (nameEl) nameEl.value = teamName;
    }
    
    if (teamCategory) {
      const categoryEl = document.getElementById(`teamCategory${i}`);
      if (categoryEl) categoryEl.value = teamCategory;
    }
    
    if (teamOption) {
      const optionEl = document.getElementById(`teamOption${i}`);
      if (optionEl) optionEl.value = teamOption;
    }
  }
}

/**
 * Save team data to sessionStorage
 */
function saveTeamData() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10);
  if (!teamCount) return;
  
  console.log('🎯 saveTeamData: Saving data for', teamCount, 'teams');
  
  for (let i = 1; i <= teamCount; i++) {
    const nameEl = document.getElementById(`teamName${i}`);
    const categoryEl = document.getElementById(`teamCategory${i}`);
    const optionEl = document.getElementById(`teamOption${i}`);
    
    if (nameEl && nameEl.value) {
      sessionStorage.setItem(`tn_team_name_${i}`, nameEl.value);
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

/**
 * Initialize Step 3 - Race Day Arrangement
 */
async function initStep3() {
  console.log('🎯 initStep3: Starting race day arrangements step');
  
  // Create race day form with database items
  await createRaceDayForm();
  
  // Load saved data if available
  loadRaceDayData();
}

/**
 * Create race day form with items from database
 */
async function createRaceDayForm() {
  const container = document.getElementById('wizardMount');
  if (!container) return;
  
  try {
    console.log('🎯 createRaceDayForm: Loading race day items from database');
    
    // Load race day items from database
    const { data: raceDayItems, error } = await sb
      .from('v_race_day_items_public')
      .select('*')
      .eq('event_short_ref', 'TN2025')
      .order('sort_order');
    
    if (error) {
      console.error('🎯 createRaceDayForm: Database error:', error);
      throw error;
    }
    
    console.log('🎯 createRaceDayForm: Loaded', raceDayItems?.length || 0, 'race day items');
    
    // Group items by category for better organization
    const groupedItems = groupRaceDayItems(raceDayItems || []);
    
    // Create form HTML
    container.innerHTML = `
      <div class="race-day-form">
        <h2>Race Day Arrangements</h2>
        
        ${Object.entries(groupedItems).map(([category, items]) => `
          <div class="form-section">
            <h3>${category}</h3>
            ${items.map(item => `
              <div class="item-row">
                <div class="item-info">
                  <span class="item-title">${item.title_en}</span>
                  <span class="item-price">Unit Price: HK$${item.listed_unit_price}</span>
                </div>
                <div class="item-controls">
                  <input type="number" 
                         id="${item.item_code}Qty" 
                         name="${item.item_code}Qty" 
                         min="${item.min_qty || 0}" 
                         max="${item.max_qty || ''}"
                         value="0" 
                         class="qty-input" />
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        
        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" id="backToStep2" class="btn btn-secondary">
            ← Back: Team Information
          </button>
          <button type="button" id="nextToStep4" class="btn btn-primary">
            Next: Practice Booking →
          </button>
        </div>
      </div>
    `;
    
    // Set up navigation handlers
    setupStep3Navigation();
    
    console.log('🎯 createRaceDayForm: Race day form created successfully');
    
  } catch (error) {
    console.error('🎯 createRaceDayForm: Error creating form:', error);
    
    // Fallback to basic form if database fails
    container.innerHTML = `
      <div class="race-day-form">
        <h2>Race Day Arrangements</h2>
        <div class="error-message">
          Unable to load race day items. Please try again later.
        </div>
        <div class="form-actions">
          <button type="button" id="backToStep2" class="btn btn-secondary">
            ← Back: Team Information
          </button>
        </div>
      </div>
    `;
    
    setupStep3Navigation();
  }
}

/**
 * Group race day items by category
 */
function groupRaceDayItems(items) {
  const groups = {};
  
  items.forEach(item => {
    // Extract category from title or use default
    let category = 'Race Day Items';
    
    if (item.title_en.toLowerCase().includes('marquee')) {
      category = 'Athlete Marquee';
    } else if (item.title_en.toLowerCase().includes('steersman') || item.title_en.toLowerCase().includes('steer')) {
      category = 'Official Steersman';
    } else if (item.title_en.toLowerCase().includes('junk') || item.title_en.toLowerCase().includes('pleasure')) {
      category = 'Junk Registration';
    } else if (item.title_en.toLowerCase().includes('speed') || item.title_en.toLowerCase().includes('boat')) {
      category = 'Speed Boat Registration';
    }
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  });
  
  return groups;
}

/**
 * Set up navigation for step 3
 */
function setupStep3Navigation() {
  // Back button
  const backBtn = document.getElementById('backToStep2');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('🎯 initStep3: Back button clicked, going to step 2');
      loadStep(2);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextToStep4');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('🎯 initStep3: Next button clicked, validating step 3');
      
      if (validateStep3()) {
        console.log('🎯 initStep3: Validation passed, saving data and proceeding to step 4');
        saveStep3Data();
        loadStep(4);
      } else {
        console.log('🎯 initStep3: Validation failed, staying on step 3');
      }
    });
  }
}

/**
 * Load saved race day data from sessionStorage
 */
function loadRaceDayData() {
  try {
    const savedData = sessionStorage.getItem('tn_race_day');
    if (!savedData) {
      console.log('🎯 loadRaceDayData: No saved race day data found');
      return;
    }
    
    const raceDayData = JSON.parse(savedData);
    console.log('🎯 loadRaceDayData: Loading saved data:', raceDayData);
    
    // Restore values to form inputs
    Object.entries(raceDayData).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId);
      if (input && !isNaN(value)) {
        input.value = value;
      }
    });
    
    console.log('🎯 loadRaceDayData: Race day data restored successfully');
    
  } catch (error) {
    console.error('🎯 loadRaceDayData: Error loading saved data:', error);
  }
}

/**
 * Initialize Step 4 - Practice Booking
 * This is the main practice functionality
 */
function initStep4() {
  console.log('🎯 initStep4: Starting step 4 initialization');
  const startTime = performance.now();
  
  // Initialize practice configuration
  console.log('🎯 initStep4: Initializing practice configuration');
  initPracticeConfig();
  
  // Confirm the cloned DOM contains #calendarContainer
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) {
    console.error('🎯 initStep4: #calendarContainer not found after mount');
    return;
  }
  console.log('🎯 initStep4: #calendarContainer found, proceeding with calendar init');
  
  // Set up calendar container
  initCalendarContainer();
  
  // Populate slot preference selects
  console.log('🎯 initStep4: Populating slot preferences');
  populateSlotPreferences();
  
  // Set up duplicate prevention
  setupSlotDuplicatePrevention();
  
  // Set up slot preference change handlers
  setupSlotPreferenceHandlers();
  
  // Load team selector
  initTeamSelector();
  
  
  // Set up navigation
  setupStep4Navigation();
  
  // Set up copy from Team 1 button
  setupCopyFromTeam1Button();
  
  // Initialize copy button visibility (hidden for Team 1)
  hideCopyFromTeam1Option();
  
  const endTime = performance.now();
  console.log(`🎯 initStep4: Completed in ${(endTime - startTime).toFixed(2)}ms`);
}

/**
 * Initialize practice configuration
 */
function initPracticeConfig() {
  const config = window.__CONFIG;
  practiceConfig = config?.practice || {};
  
  // Get slots from config - try multiple possible locations
  practiceSlots = config?.timeslots || config?.practice?.slots || [];
  
  // Ensure slots have duration_hours if not present
  practiceSlots = practiceSlots.map(slot => {
    if (!slot.duration_hours) {
      // Try to derive from slot name or default to 2 hours
      if (slot.slot_code && slot.slot_code.includes('1h')) {
        slot.duration_hours = 1;
      } else {
        slot.duration_hours = 2; // Default to 2 hours
      }
    }
    return slot;
  });
  
  console.log('🎯 initPracticeConfig: Loaded', practiceSlots.length, 'practice slots');
  console.log('🎯 initPracticeConfig: Slots:', practiceSlots);
  
  // Update practice window header
  if (practiceConfig.practice_start_date && practiceConfig.practice_end_date) {
    try {
      const startDate = new Date(practiceConfig.practice_start_date);
      const endDate = new Date(practiceConfig.practice_end_date);
      const startStr = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const endStr = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const headerEl = document.querySelector('h2');
      if (headerEl && headerEl.textContent.includes('Practice Booking')) {
        headerEl.textContent = `🛶 Practice Booking (${startStr}–${endStr})`;
      }
    } catch (e) {
      console.warn('Invalid practice dates in config:', e);
    }
  }
}

/**
 * Initialize calendar container
 * Creates a functional practice calendar for TN wizard
 */
function initCalendarContainer() {
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) { 
    console.warn('TN: #calendarContainer not found after mount'); 
    return; 
  }
  
  // Replace double-init guard with step-based check
  if (calendarEl.dataset.initStep === '4') {
    console.log('TN: calendar already inited for step 4'); 
    return;
  }
  
  // Legacy vs fallback
  const hasLegacy = typeof window.initCalendar === 'function';
  console.log('TN: calendar init path', { hasLegacy });
  
  if (hasLegacy) {
    window.initCalendar();
  } else {
    const p = window.__CONFIG?.practice || {};
    initTNCalendar({
      mount: '#calendarContainer',
      windowStart: p.practice_start_date ?? p.window_start ?? null,
      windowEnd:   p.practice_end_date   ?? p.window_end   ?? null,
      allowedWeekdays: Array.isArray(p.allowed_weekdays) ? p.allowed_weekdays : [0,1,2,3,4,5,6]
    });
  }
  
  calendarEl.dataset.initStep = '4';
  logCalendarState();
}

/**
 * Initialize TN Calendar with configuration
 * @param {Object} options - Calendar configuration
 * @param {string} options.mount - CSS selector for calendar container
 * @param {string} options.windowStart - Practice window start date
 * @param {string} options.windowEnd - Practice window end date
 * @param {Array} options.allowedWeekdays - Allowed weekdays (1-7, 1=Monday)
 */
function initTNCalendar(options) {
  console.log('initTNCalendar: Initializing calendar with options:', options);
  
  const container = document.querySelector(options.mount);
  if (!container) {
    console.error('initTNCalendar: Container not found:', options.mount);
    return;
  }
  
    // Create functional calendar for TN wizard
  createTNCalendar(container, options);
}

/**
 * Dev logger for calendar state
 * Logs current calendar configuration and state
 */
function logCalendarState() {
  const el = document.getElementById('calendarContainer');
  console.log('📅 Calendar State:');
  console.log('  - Config:', window.__CONFIG?.practice);
  console.log('  - Container:', el);
  console.log('  - Initialized:', el?.dataset.initialized);
  console.log('  - Init Step:', el?.dataset.initStep);
  console.log('  - Window start:', window.__CONFIG?.practice?.practice_start_date);
  console.log('  - Window end:', window.__CONFIG?.practice?.practice_end_date);
  console.log('  - Allowed weekdays:', window.__CONFIG?.practice?.allowed_weekdays);
  console.log('  - Visible:', !!(el && el.offsetParent), 'Rect:', el?.getBoundingClientRect?.());
}

/**
 * Create TN practice calendar
 * Generates a month-by-month calendar for practice booking
 */
function createTNCalendar(container, options = {}) {
  const practiceConfig = window.__CONFIG?.practice || {};
  
  // Use options or fallback to config
  const startDate = options.windowStart || practiceConfig.practice_start_date || practiceConfig.window_start;
  const endDate = options.windowEnd || practiceConfig.practice_end_date || practiceConfig.window_end;
  const allowedWeekdays = options.allowedWeekdays || practiceConfig.allowed_weekdays || [0,1,2,3,4,5,6];
  
  // Guard logs for missing dates
  if (!startDate) console.warn('TN calendar: windowStart missing from config');
  if (!endDate) console.warn('TN calendar: windowEnd missing from config');
  
  console.log('createTNCalendar: Using dates:', { startDate, endDate, allowedWeekdays });
  
  // Store constraints globally for use in date validation
  window.__PRACTICE_CONSTRAINTS = {
    startDate: startDate,
    endDate: endDate,
    allowedWeekdays: allowedWeekdays,
    maxDatesPerTeam: practiceConfig.max_dates_per_team || 3
  };
  
  // Default to current year if no dates in config
  const currentYear = new Date().getFullYear();
  const start = startDate ? new Date(startDate) : new Date(currentYear, 0, 1);
  const end = endDate ? new Date(endDate) : new Date(currentYear, 11, 31);
  
  console.log('createTNCalendar: Generated date range:', { start, end });
  
  container.innerHTML = '';
  
  // Generate months between start and end dates
  const months = generateMonths(start, end);
  console.log('createTNCalendar: Generated', months.length, 'months');
  
  months.forEach((monthData, index) => {
    console.log(`createTNCalendar: Creating month ${index + 1}:`, monthData.monthName);
    const monthBlock = createMonthBlock(monthData, allowedWeekdays);
    container.appendChild(monthBlock);
  });
  
  console.log('createTNCalendar: Calendar creation completed. Container children:', container.children.length);
  
  // Debug: Count checkboxes in the calendar
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  console.log('createTNCalendar: Found', checkboxes.length, 'checkboxes in calendar');
  
  // Debug: Show first few checkboxes
  if (checkboxes.length > 0) {
    console.log('createTNCalendar: First checkbox:', checkboxes[0]);
    console.log('createTNCalendar: Checkbox visibility:', window.getComputedStyle(checkboxes[0]).display);
  }
  
  // Set up event listeners for calendar interactions
  setupCalendarEventListeners(container);
  
  // Debug: Test if event listeners are working
  console.log('🎯 createTNCalendar: Setting up debug test for calendar interactions');
  setTimeout(() => {
    const testCheckbox = container.querySelector('input[type="checkbox"]');
    if (testCheckbox) {
      console.log('🎯 createTNCalendar: Found test checkbox:', testCheckbox);
      console.log('🎯 createTNCalendar: Checkbox parent:', testCheckbox.closest('[data-date]'));
    } else {
      console.warn('🎯 createTNCalendar: No checkboxes found in calendar!');
    }
  }, 100);
  
  // Add calendar styles if not already present
  if (!document.getElementById('tn-calendar-styles')) {
    addCalendarStyles();
  }
  
  // Add checkbox event handlers for show/hide dropdowns
  addCalendarEventHandlers(container);
  
  // Debug: Add click listener to first checkbox to test functionality
  const firstCheckbox = container.querySelector('input[type="checkbox"]');
  if (firstCheckbox) {
    firstCheckbox.addEventListener('click', () => {
      console.log('🎯 Checkbox clicked! Date:', firstCheckbox.dataset.date, 'Checked:', firstCheckbox.checked);
    });
  }
}

/**
 * Generate array of month data between start and end dates
 */
function generateMonths(start, end) {
  const months = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    months.push({
      year: current.getFullYear(),
      month: current.getMonth(),
      monthName: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      startDate: monthStart,
      endDate: monthEnd,
      days: generateMonthDays(monthStart, monthEnd)
    });
    
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Generate days for a month
 */
function generateMonthDays(monthStart, monthEnd, allowedWeekdays = [1,2,3,4,5,6,0]) {
  const days = [];
  const firstDay = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = monthEnd.getDate();
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push({ empty: true });
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const weekday = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isPast = date < new Date();
    const isAllowedWeekday = allowedWeekdays.includes(weekday);
    
    days.push({
      day: day,
      date: date,
      weekday: weekday,
      isPast: isPast,
      available: !isPast && isAllowedWeekday // Available if not past and allowed weekday
    });
  }
  
  return days;
}

/**
 * Create month block element
 */
function createMonthBlock(monthData, allowedWeekdays = [1,2,3,4,5,6,0]) {
  const monthBlock = document.createElement('div');
  monthBlock.className = 'month-block';
  
  const toggle = document.createElement('div');
  toggle.className = 'month-toggle';
  toggle.textContent = monthData.monthName;
  toggle.addEventListener('click', () => toggleMonthContent(monthBlock));
  
  const content = document.createElement('div');
  content.className = 'month-content';
  content.style.display = 'none'; // Start collapsed
  
  // Weekday headers
  const weekdays = document.createElement('div');
  weekdays.className = 'weekdays';
  weekdays.innerHTML = `
    <div>Sun</div>
    <div>Mon</div>
    <div>Tue</div>
    <div>Wed</div>
    <div>Thu</div>
    <div>Fri</div>
    <div>Sat</div>
  `;
  
  // Calendar grid
  const grid = document.createElement('div');
  grid.className = 'month-grid';
  
  // Generate days with allowed weekdays
  const days = generateMonthDays(monthData.startDate, monthData.endDate, allowedWeekdays);
  console.log(`createMonthBlock: Generated ${days.length} days for ${monthData.monthName}`);
  
  days.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    if (day.empty) {
      dayEl.className += ' empty';
    } else {
      if (day.available) {
        dayEl.innerHTML = createDayContent(day);
        console.log(`createMonthBlock: Created available day ${day.day} with checkbox`);
      } else {
        dayEl.innerHTML = `<span class="day-number">${day.day}</span>`;
        dayEl.className += ' unavailable';
        console.log(`createMonthBlock: Created unavailable day ${day.day}`);
      }
    }
    
    grid.appendChild(dayEl);
  });
  
  content.appendChild(weekdays);
  content.appendChild(grid);
  
  monthBlock.appendChild(toggle);
  monthBlock.appendChild(content);
  
  console.log(`createMonthBlock: Created month block for ${monthData.monthName} with ${grid.children.length} day elements`);
  
  return monthBlock;
}

/**
 * Create content for available days
 * Matches original calendar structure with checkboxes and dropdowns
 */
function createDayContent(day) {
  const dateStr = day.date.toISOString().split('T')[0];
  const constraints = window.__PRACTICE_CONSTRAINTS || {};
  
  // Check if date is within practice window
  const isWithinWindow = !constraints.startDate || !constraints.endDate || 
    (day.date >= new Date(constraints.startDate) && day.date <= new Date(constraints.endDate));
  
  // Check if date is on allowed weekday
  const dayOfWeek = day.date.getDay(); // 0=Sunday, 1=Monday, etc.
  const isAllowedWeekday = constraints.allowedWeekdays && constraints.allowedWeekdays.includes(dayOfWeek);
  
  const isDisabled = !isWithinWindow || !isAllowedWeekday;
  
  const html = `
    <label class="day-checkbox">
      <input type="checkbox" data-date="${dateStr}" ${isDisabled ? 'disabled' : ''} />
      <span class="day-number">${day.day}</span>
    </label>
    <div class="dropdowns hide">
      <select class="duration">
        <option value="1">1h</option>
        <option value="2">2h</option>
      </select>
      <select class="helpers">
        <option value="NONE">NONE</option>
        <option value="S">S</option>
        <option value="T">T</option>
        <option value="ST">ST</option>
      </select>
    </div>
  `;
  console.log(`createDayContent: Generated HTML for day ${day.day} (disabled: ${isDisabled}):`, html);
  return html;
}

/**
 * Toggle month content visibility
 */
function toggleMonthContent(monthBlock) {
  const content = monthBlock.querySelector('.month-content');
  if (content) {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Add event handlers for calendar checkboxes
 * Shows/hides dropdowns when dates are selected
 */
function addCalendarEventHandlers(container) {
  // Add event delegation for checkbox changes
  container.addEventListener('change', (event) => {
    if (event.target.type === 'checkbox' && event.target.hasAttribute('data-date')) {
      const checkbox = event.target;
      const dropdowns = checkbox.closest('.calendar-day').querySelector('.dropdowns');
      const dateStr = checkbox.getAttribute('data-date');
      
      if (checkbox.checked) {
        dropdowns.classList.remove('hide');
        // Add date to current team's practice data
        addDateToCurrentTeam(dateStr);
      } else {
        dropdowns.classList.add('hide');
        // Remove date from current team's practice data
        removeDateFromCurrentTeam(dateStr);
        // Clear dropdown values when unchecked
        dropdowns.querySelectorAll('select').forEach(select => {
          select.value = '';
        });
      }
    }
  });
  
  // Add event delegation for dropdown changes to update summary and persist data
  container.addEventListener('change', (event) => {
    if (event.target.classList.contains('duration') || event.target.classList.contains('helpers')) {
      updatePracticeSummary();
      // Persist the updated data
      saveCurrentTeamPracticeData();
    }
  });
}

/**
 * Add date to current team's practice data
 */
function addDateToCurrentTeam(dateStr) {
  const currentTeamKey = getCurrentTeamKey();
  const rows = readTeamRows(currentTeamKey);
  const constraints = window.__PRACTICE_CONSTRAINTS || {};
  
  // Check if date already exists
  const existingIndex = rows.findIndex(row => row.pref_date === dateStr);
  if (existingIndex >= 0) {
    console.log(`🎯 addDateToCurrentTeam: Date ${dateStr} already exists for team ${currentTeamKey}`);
    return;
  }
  
  // Check max dates limit
  if (rows.length >= (constraints.maxDatesPerTeam || 3)) {
    console.warn(`🎯 addDateToCurrentTeam: Max dates limit reached for team ${currentTeamKey}`);
    return;
  }
  
  // Add new date with default values
  const newRow = {
    pref_date: dateStr,
    duration_hours: 1,
    helper: 'NONE'
  };
  
  rows.push(newRow);
  writeTeamRows(currentTeamKey, rows);
  
  console.log(`🎯 addDateToCurrentTeam: Added date ${dateStr} to team ${currentTeamKey}`);
}

/**
 * Remove date from current team's practice data
 */
function removeDateFromCurrentTeam(dateStr) {
  const currentTeamKey = getCurrentTeamKey();
  const rows = readTeamRows(currentTeamKey);
  
  const filteredRows = rows.filter(row => row.pref_date !== dateStr);
  writeTeamRows(currentTeamKey, filteredRows);
  
  console.log(`🎯 removeDateFromCurrentTeam: Removed date ${dateStr} from team ${currentTeamKey}`);
}

/**
 * Update practice summary based on selected dates and options
 */
function updatePracticeSummary() {
  const totalHoursEl = document.getElementById('totalHours');
  const extraPracticeQtyEl = document.getElementById('extraPracticeQty');
  const trainerQtyEl = document.getElementById('trainerQty');
  const steersmanQtyEl = document.getElementById('steersmanQty');
  
  if (!totalHoursEl) return;
  
  let totalHours = 0;
  let trainerCount = 0;
  let steersmanCount = 0;
  
  // Count selected dates and their options
  const selectedDates = document.querySelectorAll('input[type="checkbox"]:checked');
  selectedDates.forEach(checkbox => {
    const dayEl = checkbox.closest('.calendar-day');
    const durationSelect = dayEl.querySelector('.duration');
    const helpersSelect = dayEl.querySelector('.helpers');
    
    if (durationSelect.value) {
      totalHours += parseInt(durationSelect.value, 10);
    }
    
    if (helpersSelect.value === 'trainer' || helpersSelect.value === 'both') {
      trainerCount++;
    }
    
    if (helpersSelect.value === 'steersman' || helpersSelect.value === 'both') {
      steersmanCount++;
    }
  });
  
  // Update summary elements
  if (totalHoursEl) totalHoursEl.textContent = totalHours;
  if (trainerQtyEl) trainerQtyEl.textContent = trainerCount;
  if (steersmanQtyEl) steersmanQtyEl.textContent = steersmanCount;
  
  // Calculate extra practice sessions (over 12 hours)
  const extraHours = Math.max(0, totalHours - 12);
  if (extraPracticeQtyEl) extraPracticeQtyEl.textContent = extraHours;
}

/**
 * Add calendar styles
 */
function addCalendarStyles() {
  const style = document.createElement('style');
  style.id = 'tn-calendar-styles';
  style.textContent = `
    #tnScope .month-block {
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 1rem;
      background: #f9f9f9;
      margin-bottom: 1rem;
    }
    
    #tnScope .month-toggle {
      cursor: pointer;
      background: #0f6ec7;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 5px;
      margin-bottom: 0.5rem;
      font-size: 1rem;
      display: inline-block;
    }
    
    #tnScope .month-content.hide {
      display: none;
    }
    
    #tnScope .weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      font-weight: bold;
      font-size: 0.8rem;
      color: #444;
      padding: 0.2rem 0.3rem;
      text-align: center;
      margin-bottom: 0.3rem;
    }
    
    #tnScope .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
    }
    
    #tnScope .calendar-day {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0.4rem;
      background: #fff;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      align-items: start;
      gap: 0.4rem;
      min-height: 90px;
    }
    
    #tnScope .calendar-day label {
      font-weight: bold;
      font-size: 0.85rem;
      display: block;
      width: 100%;
      line-height: 1.2;
      cursor: pointer;
    }
    
    #tnScope .calendar-day .day-checkbox {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin-bottom: 0.3rem;
    }
    
    #tnScope .calendar-day input[type="checkbox"] {
      margin: 0;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border: 2px solid #007acc;
      border-radius: 3px;
      background: white;
    }
    
    #tnScope .calendar-day .day-number {
      font-weight: bold;
      font-size: 0.9rem;
    }
    
    #tnScope .calendar-day select {
      width: 100%;
      padding: 0.3rem;
      font-size: 0.85rem;
      border: 1px solid #aaa;
      border-radius: 4px;
      background: #f0f0f0;
    }
    
    #tnScope .calendar-day.empty {
      background: transparent;
      border: none;
      min-height: 90px;
      pointer-events: none;
    }
    
    #tnScope .calendar-day.unavailable {
      background: #f5f5f5;
      color: #999;
      opacity: 0.6;
    }
    
    #tnScope .dropdowns {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    
    #tnScope .dropdowns.hide {
      display: none;
    }
    
    /* Team Fields Styles */
    #tnScope .team-field {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      background: #f9f9f9;
    }
    
    #tnScope .team-header h3 {
      margin: 0 0 1rem 0;
      color: #0f6ec7;
      font-size: 1.2rem;
    }
    
    #tnScope .team-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }
    
    #tnScope .form-group {
      display: flex;
      flex-direction: column;
    }
    
    #tnScope .form-group label {
      font-weight: bold;
      margin-bottom: 0.5rem;
      color: #333;
    }
    
    #tnScope .form-group input,
    #tnScope .form-group select {
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    #tnScope .form-group input:focus,
    #tnScope .form-group select:focus {
      outline: none;
      border-color: #0f6ec7;
      box-shadow: 0 0 0 2px rgba(15, 110, 199, 0.2);
    }
    
    @media (max-width: 768px) {
      #tnScope .team-inputs {
        grid-template-columns: 1fr;
      }
    }
    
    /* Package Options Styles */
    #tnScope .package-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    
    #tnScope .package-option {
      position: relative;
      cursor: pointer;
    }
    
    #tnScope .package-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    
    #tnScope .package-box {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 2rem;
      transition: all 0.3s ease;
      background: white;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      outline: none;
    }
    
    #tnScope .package-box:focus {
      outline: none;
    }
    
    
    #tnScope .package-box:hover {
      border-color: #007acc;
      box-shadow: 0 2px 8px rgba(0, 122, 204, 0.1);
    }
    
    #tnScope .package-option.selected .package-box {
      background: var(--theme-primary-light, #fff8e6) !important;
      border: 2px solid var(--theme-primary, #f7b500) !important;
      box-shadow: 0 2px 8px rgba(247, 181, 0, 0.2) !important;
      border-radius: 12px !important;
    }
    
    #tnScope .package-option.selected .package-selection-indicator {
      opacity: 1;
    }
    
    #tnScope .package-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    #tnScope .package-header h4 {
      margin: 0;
      color: #333;
      font-size: 1.3rem;
      font-weight: 600;
    }
    
    #tnScope .package-price {
      font-size: 1.4rem;
      font-weight: bold;
      color: #007acc;
      background: rgba(0, 122, 204, 0.1);
      padding: 0.5rem 1rem;
      border-radius: 20px;
    }
    
    #tnScope .package-details {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      margin-bottom: 1rem;
    }
    
    #tnScope .package-item {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      font-size: 0.95rem;
      color: #555;
      padding: 0.3rem 0;
    }
    
    #tnScope .package-icon {
      font-size: 1.1rem;
      width: 20px;
      text-align: center;
    }
    
    #tnScope .package-selection-indicator {
      text-align: center;
      margin-top: 1rem;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    #tnScope .package-option.selected .package-selection-indicator {
      opacity: 1;
    }
    
    #tnScope .selection-text {
      color: #666;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    @media (max-width: 768px) {
      #tnScope .package-options {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      #tnScope .package-label {
        padding: 1.5rem;
      }
    }
    
    /* Form Actions Styles */
    #tnScope .form-actions {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e9ecef;
      text-align: right;
    }
    
    #tnScope .btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      font-weight: 500;
      text-align: center;
      text-decoration: none;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    }
    
    #tnScope .btn-primary {
      background: linear-gradient(135deg, #007acc, #00a8ff);
      color: white;
      box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
    }
    
    #tnScope .btn-primary:hover {
      background: linear-gradient(135deg, #005a9e, #0088cc);
      box-shadow: 0 4px 12px rgba(0, 122, 204, 0.4);
      transform: translateY(-1px);
    }
    
    #tnScope .btn-primary:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 122, 204, 0.3);
    }
    
    /* Organization Form Styles */
    #tnScope .organization-form {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    #tnScope .organization-form h2 {
      color: #333;
      margin-bottom: 2rem;
      text-align: center;
      font-size: 1.8rem;
    }
    
    #tnScope .form-section {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #e9ecef;
    }
    
    #tnScope .form-section h3 {
      color: #495057;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      border-bottom: 2px solid #007acc;
      padding-bottom: 0.5rem;
    }
    
    #tnScope .manager-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }
    
    #tnScope .form-group {
      margin-bottom: 1rem;
    }
    
    #tnScope .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #495057;
    }
    
    #tnScope .form-group input,
    #tnScope .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }
    
    #tnScope .form-group input:focus,
    #tnScope .form-group textarea:focus {
      outline: none;
      border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
    }
    
    #tnScope .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }
    
    #tnScope .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    #tnScope .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-1px);
    }
    
    @media (max-width: 768px) {
      #tnScope .manager-grid {
        grid-template-columns: 1fr;
      }
      
      #tnScope .organization-form {
        padding: 1rem;
      }
    }
    
    /* Race Day Form Styles */
    #tnScope .race-day-form {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    #tnScope .race-day-form h2 {
      color: #333;
      margin-bottom: 2rem;
      text-align: center;
      font-size: 1.8rem;
    }
    
    #tnScope .race-day-form .form-section {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #e9ecef;
    }
    
    #tnScope .race-day-form .form-section h3 {
      color: #495057;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      border-bottom: 2px solid #007acc;
      padding-bottom: 0.5rem;
    }
    
    #tnScope .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #e9ecef;
      transition: box-shadow 0.2s ease;
    }
    
    #tnScope .item-row:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    #tnScope .item-info {
      flex: 1;
    }
    
    #tnScope .item-title {
      display: block;
      font-weight: 500;
      color: #333;
      margin-bottom: 0.25rem;
    }
    
    #tnScope .item-price {
      display: block;
      color: #007acc;
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    #tnScope .item-controls {
      margin-left: 1rem;
    }
    
    #tnScope .qty-input {
      width: 80px;
      padding: 0.5rem;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      text-align: center;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }
    
    #tnScope .qty-input:focus {
      outline: none;
      border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
    }
    
    #tnScope .qty-input:invalid {
      border-color: #dc3545;
    }
    
    @media (max-width: 768px) {
      #tnScope .item-row {
        flex-direction: column;
        align-items: stretch;
      }
      
      #tnScope .item-controls {
        margin-left: 0;
        margin-top: 1rem;
        text-align: center;
      }
      
      #tnScope .race-day-form {
        padding: 1rem;
      }
    }
    
    /* Error Message Styles */
    #tnScope .error-message {
      background: #fee;
      border: 1px solid #fcc;
      color: #c33;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      font-weight: 500;
      text-align: center;
    }
    
    /* Field Error Highlighting */
    #tnScope .field-error {
      border-color: #f33 !important;
      box-shadow: 0 0 0 2px rgba(255, 51, 51, 0.2) !important;
      background-color: #fff5f5 !important;
    }
    
    #tnScope .field-error:focus {
      border-color: #f33 !important;
      box-shadow: 0 0 0 2px rgba(255, 51, 51, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Populate slot preference selects
 * Splits slots into 2-hour vs 1-hour options
 */
function populateSlotPreferences() {
  if (!practiceSlots.length) {
    console.warn('No practice slots available');
    return;
  }
  
  // Split slots by duration
  const slots2h = practiceSlots.filter(slot => slot.duration_hours === 2);
  const slots1h = practiceSlots.filter(slot => slot.duration_hours === 1);
  
  // Populate 2-hour selects
  populateSlotSelects(slots2h, ['slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3']);
  
  // Populate 1-hour selects
  populateSlotSelects(slots1h, ['slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3']);
}

/**
 * Populate slot selects with options
 */
function populateSlotSelects(slots, selectIds) {
  // Load saved ranks for current team
  const currentTeamKey = getCurrentTeamKey();
  const savedRanks = readTeamRanks(currentTeamKey);
  
  selectIds.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Preserve current selection
    const currentValue = select.value;
    
    // Clear existing options
    select.innerHTML = '<option value="">-- Select --</option>';
    
    // Get currently selected values from other selects to prevent duplicates
    const allSelects = [
      ...TN_SELECTORS.practice.rank2h,
      ...TN_SELECTORS.practice.rank1h
    ];
    const selectedValues = new Set();
    allSelects.forEach(sel => {
      const otherSelect = document.querySelector(sel);
      if (otherSelect && otherSelect !== select && otherSelect.value) {
        selectedValues.add(otherSelect.value);
      }
    });
    
    // Add slot options
    slots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.slot_code;
      option.textContent = slot.label || slot.slot_code;
      
      // Disable if already selected in another select
      if (selectedValues.has(slot.slot_code)) {
        option.disabled = true;
        option.textContent += ' (already selected)';
      }
      
      select.appendChild(option);
    });
    
    // Try to restore from saved ranks first
    const rankNumber = selectId.match(/_(\d+)$/)?.[1];
    const is2h = selectId.includes('2h');
    const savedRank = savedRanks.find(r => r.rank === parseInt(rankNumber) && 
      (is2h ? r.slot_code.includes('2h') : r.slot_code.includes('1h')));
    
    if (savedRank && select.querySelector(`option[value="${savedRank.slot_code}"]`)) {
      select.value = savedRank.slot_code;
      console.log(`🎯 populateSlotSelects: Restored from saved ranks ${savedRank.slot_code} for ${selectId}`);
    } else if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
      select.value = currentValue;
      console.log(`🎯 populateSlotSelects: Restored selection ${currentValue} for ${selectId}`);
    }
  });
}

/**
 * Set up slot duplicate prevention
 * Enforces unique selection across ranks
 */
function setupSlotDuplicatePrevention() {
  const allSelects = [
    ...TN_SELECTORS.practice.rank2h,
    ...TN_SELECTORS.practice.rank1h
  ];
  
  allSelects.forEach(selector => {
    const select = document.querySelector(selector);
    if (!select) return;
    
    select.addEventListener('change', () => {
      checkForDuplicates();
    });
  });
}

/**
 * Check for duplicate slot selections
 */
function checkForDuplicates() {
  const allSelects = [
    ...TN_SELECTORS.practice.rank2h,
    ...TN_SELECTORS.practice.rank1h
  ];
  
  const selectedValues = new Map();
  const duplicates = new Set();
  
  // Check for duplicates
  allSelects.forEach(selector => {
    const select = document.querySelector(selector);
    if (!select) return;
    
    const value = select.value;
    if (!value) return;
    
    if (selectedValues.has(value)) {
      duplicates.add(value);
    } else {
      selectedValues.set(value, select);
    }
  });
  
  // Clear previous error messages
  clearSlotErrors();
  
  // Show error for duplicates
  if (duplicates.size > 0) {
    duplicates.forEach(duplicateValue => {
      const duplicateSelects = Array.from(selectedValues.entries())
        .filter(([value]) => value === duplicateValue)
        .map(([, select]) => select);
      
      duplicateSelects.forEach(select => {
        showSlotError(select, 'This slot is already selected');
      });
    });
  }
  
  // Refresh all selects to update disabled options
  refreshSlotSelects();
}

/**
 * Refresh slot selects to update disabled options
 */
function refreshSlotSelects() {
  if (!practiceSlots.length) return;
  
  // Split slots by duration
  const slots2h = practiceSlots.filter(slot => slot.duration_hours === 2);
  const slots1h = practiceSlots.filter(slot => slot.duration_hours === 1);
  
  // Refresh 2-hour selects
  populateSlotSelects(slots2h, ['slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3']);
  
  // Refresh 1-hour selects
  populateSlotSelects(slots1h, ['slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3']);
}

/**
 * Show slot selection error
 */
function showSlotError(select, message) {
  // Remove existing error
  const existingError = select.parentNode.querySelector('.slot-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Add error message
  const error = document.createElement('p');
  error.className = 'slot-error err';
  error.textContent = message;
  error.style.color = '#dc3545';
  error.style.fontSize = '0.85rem';
  error.style.margin = '0.25rem 0 0 0';
  
  select.parentNode.appendChild(error);
  
  // Add error styling to select
  select.style.borderColor = '#dc3545';
  select.style.backgroundColor = '#fff5f5';
}

/**
 * Clear slot selection errors
 */
function clearSlotErrors() {
  const errors = document.querySelectorAll('.slot-error');
  errors.forEach(error => error.remove());
  
  // Reset select styling
  const allSelects = [
    ...TN_SELECTORS.practice.rank2h,
    ...TN_SELECTORS.practice.rank1h
  ];
  
  allSelects.forEach(selector => {
    const select = document.querySelector(selector);
    if (select) {
      select.style.borderColor = '';
      select.style.backgroundColor = '';
    }
  });
}

/**
 * Initialize team selector for practice
 */
function initTeamSelector() {
  const teamSelect = document.getElementById('teamSelect');
  const teamNameFields = document.getElementById('teamNameFields');
  
  if (!teamSelect || !teamNameFields) return;
  
  // Load team names from sessionStorage
  const teamNames = [];
  for (let i = 1; i <= 10; i++) { // Check up to 10 teams
    const name = sessionStorage.getItem(`tn_team_name_${i}`);
    if (name) {
      teamNames.push(name);
    }
  }
  
  if (teamNames.length === 0) {
    teamSelect.innerHTML = '<option disabled>No teams found</option>';
    teamNameFields.textContent = '';
  } else {
    teamNames.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `Team ${index + 1}: ${name}`;
      teamSelect.appendChild(option);
    });
    
    teamSelect.value = '0';
    teamNameFields.textContent = `Now scheduling: ${teamNames[0]}`;
    
    // Initialize current team key
    setCurrentTeamKey('t1');
  }
  
  // Handle team selection change
  teamSelect.addEventListener('change', () => {
    const selectedIndex = parseInt(teamSelect.value, 10);
    const teamKey = `t${selectedIndex + 1}`;
    console.debug(`🎯 Team switch: idx=${selectedIndex} key=${teamKey}`);
    setCurrentTeamKey(teamKey);
    updateCalendarForTeam(selectedIndex);
    updateSlotPreferencesForTeam(selectedIndex);
    
    const teamName = teamNames[selectedIndex] || `Team ${selectedIndex + 1}`;
    teamNameFields.textContent = `Now scheduling: ${teamName}`;
    
    // If switching to Team 2 or later, show copy option
    if (selectedIndex > 0) {
      showCopyFromTeam1Option();
    } else {
      hideCopyFromTeam1Option();
    }
  });
}

/**
 * Set up slot preference change handlers
 */
function setupSlotPreferenceHandlers() {
  // Get all slot preference selects
  const slotSelects = [
    'slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3',
    'slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3'
  ];
  
  slotSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.addEventListener('change', () => {
        console.log(`🎯 Slot preference changed: ${selectId} = ${select.value}`);
        
        // Handle ranking validation and persistence
        handleSlotRankingChange();
        
        // Save current team's data when slot preferences change
        saveCurrentTeamPracticeData();
        
        // Update duplicate prevention
        setupSlotDuplicatePrevention();
      });
    }
  });
}

/**
 * Handle slot ranking change - build ranks array and validate uniqueness
 */
function handleSlotRankingChange() {
  const currentTeamKey = getCurrentTeamKey();
  
  // Build ranks array from dropdowns
  const ranks = buildSlotRanks();
  
  // Validate uniqueness
  const validationResult = validateSlotRankUniqueness(ranks);
  
  if (validationResult.isValid) {
    // Clear any existing errors
    clearSlotRankingErrors();
    
    // Persist the ranks
    writeTeamRanks(currentTeamKey, ranks);
    console.log(`🎯 handleSlotRankingChange: Saved ranks for team ${currentTeamKey}:`, ranks);
  } else {
    // Show error and revert
    showSlotRankingError(validationResult.errorMessage);
    revertSlotRankingToLastValid();
  }
}

/**
 * Build ranks array from dropdowns
 */
function buildSlotRanks() {
  const ranks = [];
  
  // Get 2-hour slot preferences
  const slot2h1 = document.getElementById('slotPref2h_1')?.value;
  const slot2h2 = document.getElementById('slotPref2h_2')?.value;
  const slot2h3 = document.getElementById('slotPref2h_3')?.value;
  
  // Get 1-hour slot preferences
  const slot1h1 = document.getElementById('slotPref1h_1')?.value;
  const slot1h2 = document.getElementById('slotPref1h_2')?.value;
  const slot1h3 = document.getElementById('slotPref1h_3')?.value;
  
  // Add 2-hour ranks
  if (slot2h1) ranks.push({ rank: 1, slot_code: slot2h1 });
  if (slot2h2) ranks.push({ rank: 2, slot_code: slot2h2 });
  if (slot2h3) ranks.push({ rank: 3, slot_code: slot2h3 });
  
  // Add 1-hour ranks
  if (slot1h1) ranks.push({ rank: 1, slot_code: slot1h1 });
  if (slot1h2) ranks.push({ rank: 2, slot_code: slot1h2 });
  if (slot1h3) ranks.push({ rank: 3, slot_code: slot1h3 });
  
  return ranks;
}

/**
 * Validate slot rank uniqueness
 */
function validateSlotRankUniqueness(ranks) {
  const slotCodes = ranks.map(r => r.slot_code).filter(Boolean);
  const uniqueSlotCodes = new Set(slotCodes);
  
  if (slotCodes.length !== uniqueSlotCodes.size) {
    return {
      isValid: false,
      errorMessage: 'Duplicate slot selections are not allowed'
    };
  }
  
  return { isValid: true };
}

/**
 * Show slot ranking error
 */
function showSlotRankingError(message) {
  // Find or create error display element
  let errorEl = document.getElementById('slotRankingError');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'slotRankingError';
    errorEl.className = 'error-message';
    errorEl.style.color = 'red';
    errorEl.style.fontSize = '12px';
    errorEl.style.marginTop = '5px';
    
    // Insert after slot preferences section
    const slotPrefsSection = document.querySelector('.slot-preferences') || document.querySelector('#slotPrefs');
    if (slotPrefsSection) {
      slotPrefsSection.appendChild(errorEl);
    }
  }
  
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

/**
 * Clear slot ranking errors
 */
function clearSlotRankingErrors() {
  const errorEl = document.getElementById('slotRankingError');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

/**
 * Revert slot ranking to last valid state
 */
function revertSlotRankingToLastValid() {
  const currentTeamKey = getCurrentTeamKey();
  const lastValidRanks = readTeamRanks(currentTeamKey);
  
  // Revert dropdowns to last valid state
  if (lastValidRanks && lastValidRanks.length > 0) {
    // Clear all selects first
    const slotSelects = [
      'slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3',
      'slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3'
    ];
    
    slotSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) select.value = '';
    });
    
    // Restore valid ranks
    lastValidRanks.forEach(rank => {
      const select = document.getElementById(`slotPref${rank.slot_code.includes('2h') ? '2h' : '1h'}_${rank.rank}`);
      if (select) select.value = rank.slot_code;
    });
  }
}

/**
 * Preview step 4 with sample data for testing
 */
/**
 * Fill step 4 with complete practice data for all teams (for testing submission)
 */

/**
 * Fill all steps 1-4 with complete data and go to summary (for testing submission with 1 team)
 */

/**
 * Fill all steps with complete data for single team and go to summary
 */
function fillSingleTeamForSubmission() {
  console.log('🎯 fillSingleTeamForSubmission: Creating complete data for all steps (1 team)');
  
  // Step 1: Set team count to 1
  sessionStorage.setItem('tn_team_count', '1');
  sessionStorage.setItem('tn_opt1_count', '1');
  sessionStorage.setItem('tn_opt2_count', '0');
  sessionStorage.setItem('tn_race_category', 'mixed_open');
  console.log('🎯 Step 1: Set team count to 1');
  
  // Step 2: Fill team info and contact data
  const uniqueTeamName = 'Test Team ' + Date.now().toString().slice(-6);
  
  sessionStorage.setItem('tn_team_name_1', uniqueTeamName);
  sessionStorage.setItem('tn_team_category_1', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_1', 'opt1');
  
  sessionStorage.setItem('tn_org_name', 'Test Organization Single');
  sessionStorage.setItem('tn_mailing_address', '123 Test Street, Test City, TC 12345');
  
  // Fill manager data
  sessionStorage.setItem('tn_manager1_name', 'John Doe');
  sessionStorage.setItem('tn_manager1_phone', '1234567890');
  sessionStorage.setItem('tn_manager1_email', 'john@test.com');
  sessionStorage.setItem('tn_manager2_name', 'Jane Smith');
  sessionStorage.setItem('tn_manager2_phone', '0987654321');
  sessionStorage.setItem('tn_manager2_email', 'jane@test.com');
  console.log('🎯 Step 2: Team info, contact data, and managers filled');
  
  // Step 3: Fill race day data
  const raceDayData = {
    marqueeQty: 1,
    steerWithQty: 1,
    steerWithoutQty: 0,
    junkBoatQty: 0,
    junkBoatNo: '',
    speedboatQty: 1,
    speedBoatNo: 'SB001'
  };
  sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
  console.log('🎯 Step 3: Race day data filled');
  
  // Step 4: Fill practice data for team 1 (only weekdays after 10/27/2025)
  const practiceRows = [
    { pref_date: '2025-10-29', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2025-11-05', duration_hours: 1, helper: 'T' }, // Wednesday - 1hr
    { pref_date: '2025-11-12', duration_hours: 2, helper: 'S' }  // Wednesday - 2hr
  ];
  
  // Slot ranks: 3 for 2hr sessions, 3 for 1hr sessions (using only Saturday slots)
  const slotRanks = [
    { rank: 1, slot_code: 'SAT2_0800_1000' },  // 2hr Saturday
    { rank: 2, slot_code: 'SAT2_1000_1200' },  // 2hr Saturday
    { rank: 3, slot_code: 'SAT2_1215_1415' },  // 2hr Saturday
    { rank: 1, slot_code: 'SAT1_0800_0900' },  // 1hr Saturday
    { rank: 2, slot_code: 'SAT1_0900_1000' },  // 1hr Saturday
    { rank: 3, slot_code: 'SAT1_1000_1100' }   // 1hr Saturday
  ];
  
  // Fill practice data for team 1
  writeTeamRows('t1', practiceRows);
  writeTeamRanks('t1', slotRanks);
  console.log('🎯 Step 4: Practice data filled for team 1');
  
  // Navigate to step 5 (summary)
  loadStep(5);
  
  console.log('🎯 fillSingleTeamForSubmission: Complete data created for all steps');
  console.log('🎯 Ready for submission testing with 1 team!');
  console.log('🎯 Available debug functions:');
  console.log('  - window.__DBG_TN.fillSingleTeam() - Fill all steps with single team');
  console.log('  - window.__DBG_TN.clearStep5() - Clear all data');
  console.log('  - window.submitTNForm() - Submit the form');
}

/**
 * Fill all steps with complete data for multiple teams (3 teams)
 */
function fillMultipleTeamsForSubmission() {
  console.log('🎯 fillMultipleTeamsForSubmission: Creating complete data for all steps (3 teams)');
  
  // Step 1: Set team count to 3
  sessionStorage.setItem('tn_team_count', '3');
  sessionStorage.setItem('tn_opt1_count', '2');
  sessionStorage.setItem('tn_opt2_count', '1');
  sessionStorage.setItem('tn_race_category', 'mixed_open');
  console.log('🎯 Step 1: Set team count to 3 (2 opt1, 1 opt2)');
  
  // Step 2: Fill team info and contact data
  const uniqueTeamName1 = 'Test Team ' + Date.now().toString().slice(-6) + '_1';
  const uniqueTeamName2 = 'Test Team ' + Date.now().toString().slice(-6) + '_2';
  const uniqueTeamName3 = 'Test Team ' + Date.now().toString().slice(-6) + '_3';
  
  sessionStorage.setItem('tn_team_name_1', uniqueTeamName1);
  sessionStorage.setItem('tn_team_category_1', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_1', 'opt1');
  
  sessionStorage.setItem('tn_team_name_2', uniqueTeamName2);
  sessionStorage.setItem('tn_team_category_2', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_2', 'opt1');
  
  sessionStorage.setItem('tn_team_name_3', uniqueTeamName3);
  sessionStorage.setItem('tn_team_category_3', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_3', 'opt2');
  
  sessionStorage.setItem('tn_org_name', 'Test Organization Multi');
  sessionStorage.setItem('tn_mailing_address', '123 Test Street, Test City, TC 12345');
  
  // Fill manager data
  sessionStorage.setItem('tn_manager1_name', 'John Doe');
  sessionStorage.setItem('tn_manager1_phone', '1234567890');
  sessionStorage.setItem('tn_manager1_email', 'john@test.com');
  sessionStorage.setItem('tn_manager2_name', 'Jane Smith');
  sessionStorage.setItem('tn_manager2_phone', '0987654321');
  sessionStorage.setItem('tn_manager2_email', 'jane@test.com');
  console.log('🎯 Step 2: Team info, contact data, and managers filled');
  
  // Step 3: Fill race day data
  const raceDayData = {
    marqueeQty: 1,
    steerWithQty: 2,
    steerWithoutQty: 1,
    junkBoatQty: 0,
    junkBoatNo: '',
    speedboatQty: 1,
    speedBoatNo: 'SB001'
  };
  sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
  console.log('🎯 Step 3: Race day data filled');
  
  // Step 4: Fill practice data for all teams (only weekdays after 10/27/2025)
  const practiceRows = [
    { pref_date: '2025-10-29', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2025-11-05', duration_hours: 1, helper: 'T' }, // Wednesday - 1hr
    { pref_date: '2025-11-12', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2025-11-19', duration_hours: 1, helper: 'T' }, // Wednesday - 1hr
    { pref_date: '2025-11-26', duration_hours: 2, helper: 'S' }  // Wednesday - 2hr
  ];
  
  // Slot ranks: 3 for 2hr sessions, 3 for 1hr sessions (using only Saturday slots)
  const slotRanks = [
    { rank: 1, slot_code: 'SAT2_0800_1000' },  // 2hr Saturday
    { rank: 2, slot_code: 'SAT2_1000_1200' },  // 2hr Saturday
    { rank: 3, slot_code: 'SAT2_1215_1415' },  // 2hr Saturday
    { rank: 1, slot_code: 'SAT1_0800_0900' },  // 1hr Saturday
    { rank: 2, slot_code: 'SAT1_0900_1000' },  // 1hr Saturday
    { rank: 3, slot_code: 'SAT1_1000_1100' }   // 1hr Saturday
  ];
  
  // Fill practice data for all 3 teams
  writeTeamRows('t1', practiceRows);
  writeTeamRanks('t1', slotRanks);
  writeTeamRows('t2', practiceRows);
  writeTeamRanks('t2', slotRanks);
  writeTeamRows('t3', practiceRows);
  writeTeamRanks('t3', slotRanks);
  console.log('🎯 Step 4: Practice data filled for all 3 teams');
  
  // Navigate to step 5 (summary)
  loadStep(5);
  
  console.log('🎯 fillMultipleTeamsForSubmission: Complete data created for all steps');
  console.log('🎯 Ready for submission testing with 3 teams!');
  console.log('🎯 Available debug functions:');
  console.log('  - window.__DBG_TN.fillMultipleTeams() - Fill all steps with multiple teams');
  console.log('  - window.__DBG_TN.clearStep5() - Clear all data');
  console.log('  - window.submitTNForm() - Submit the form');
}

/**
 * Quick test: Fill form and submit immediately (for console testing on Vercel)
 * Usage in browser console: testQuickSubmit()
 */
async function testQuickSubmit() {
  console.log('🚀 testQuickSubmit: Starting quick test submission...');
  
  try {
    // Fill all form data
    fillMultipleTeamsForSubmission();
    
    // Wait a moment for data to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('📝 Form filled with test data. Now submitting...');
    
    // Submit the form
    const result = await submitTNForm();
    
    console.log('✅ testQuickSubmit: Submission complete!', result);
    return result;
  } catch (error) {
    console.error('❌ testQuickSubmit failed:', error);
    throw error;
  }
}

/**
 * Quick test with single team (faster, simpler)
 * Usage in browser console: testQuickSubmitSingle()
 */
async function testQuickSubmitSingle() {
  console.log('🚀 testQuickSubmitSingle: Starting quick test submission with 1 team...');
  
  try {
    // Fill all form data for single team
    fillSingleTeamForSubmission();
    
    // Wait a moment for data to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('📝 Form filled with single team test data. Now submitting...');
    
    // Submit the form
    const result = await submitTNForm();
    
    console.log('✅ testQuickSubmitSingle: Submission complete!', result);
    return result;
  } catch (error) {
    console.error('❌ testQuickSubmitSingle failed:', error);
    throw error;
  }
}

/**
 * Test submission with current form data (for debugging)
 */
async function testSubmissionWithCurrentData() {
  console.log('🎯 testSubmissionWithCurrentData: Testing submission with current form data');
  
  // Get the Supabase key for direct fetch
  const supabaseKey = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY';
  
  try {
    // Collect data exactly like the form does
    const contact = collectContactData();
    const teams = collectTeamData();
    const managers = collectManagerData();
    const raceDay = collectRaceDayData();
    const practice = buildTNPracticePayload();
    
    const raceCategory = sessionStorage.getItem('tn_race_category') || 'mixed_open';
    const teamCount = teams.length; // Use actual team count from collected data
    const opt1Count = teams.filter(t => t.option === 'opt1').length; // Calculate from actual teams
    const opt2Count = teams.filter(t => t.option === 'opt2').length; // Calculate from actual teams
    
    // Generate unique team names to avoid duplicate key errors
    const uniqueTeamNames = teams.map((t, idx) => 
      t.name.startsWith('Test Team') ? `Test Team ${Date.now()}_${idx}` : t.name
    );
    
    console.log('🎯 Generated unique team names:', uniqueTeamNames);
    
        const payload = {
          client_tx_id: 'test_debug_' + Date.now(),
          eventShortRef: 'TN2025',
      category: raceCategory,
      season: 2025,
      org_name: contact.name,
      org_address: contact.address,
      counts: {
        num_teams: teamCount,
        num_teams_opt1: opt1Count,
        num_teams_opt2: opt2Count
      },
      team_names: uniqueTeamNames,
      team_options: teams.map(t => t.option),
      managers: managers,
      race_day: raceDay.length > 0 ? {
        marqueeQty: raceDay.find(r => r.code === 'marquee')?.qty || 0,
        steerWithQty: raceDay.find(r => r.code === 'steer_with')?.qty || 0,
        steerWithoutQty: raceDay.find(r => r.code === 'steer_without')?.qty || 0,
        junkBoatQty: raceDay.find(r => r.code === 'junk_boat')?.qty || 0,
        junkBoatNo: raceDay.find(r => r.code === 'junk_boat')?.boat_no || '',
        speedboatQty: raceDay.find(r => r.code === 'speed_boat')?.qty || 0,
        speedBoatNo: raceDay.find(r => r.code === 'speed_boat')?.boat_no || ''
      } : null,
      practice: practice
    };
    
    console.log('🎯 testSubmissionWithCurrentData: Payload:', JSON.stringify(payload, null, 2));
    
    // Debug practice data collection
    console.log('🎯 Debug practice data:');
    console.log('  - practice object:', practice);
    console.log('  - team count from state:', window.state?.teams?.length);
    console.log('  - team count from sessionStorage:', sessionStorage.getItem('tn_team_count'));
    console.log('  - readTeamRows function:', typeof readTeamRows);
    console.log('  - readTeamRanks function:', typeof readTeamRanks);
    
    // Check what's in sessionStorage for practice data
    const practiceKeys = Object.keys(sessionStorage).filter(key => key.startsWith('tn_practice_') || key.startsWith('tn_slot_ranks_'));
    console.log('  - practice keys in sessionStorage:', practiceKeys);
    practiceKeys.forEach(key => {
      console.log(`  - ${key}:`, sessionStorage.getItem(key));
    });
    
    // Test the Edge Function
    try {
      const { data, error } = await sb.functions.invoke('submit_registration', {
        body: payload
      });
      
        if (error) {
          console.error('❌ testSubmissionWithCurrentData: Edge Function error:', error);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error context:', error.context);
          
          // Make a direct fetch to get the actual error details
          try {
            const response = await fetch('https://khqarcvszewerjckmtpg.supabase.co/functions/v1/submit_registration', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
              },
              body: JSON.stringify(payload)
            });
            
            const responseText = await response.text();
            console.error('❌ Direct fetch response status:', response.status);
            console.error('❌ Direct fetch response body:', responseText);
            
            // Try to parse as JSON
            try {
              const errorData = JSON.parse(responseText);
              console.error('❌ Parsed error data:', errorData);
            } catch (parseError) {
              console.error('❌ Error response is not valid JSON');
            }
          } catch (fetchError) {
            console.error('❌ Direct fetch failed:', fetchError);
          }
        } else {
          console.log('✅ testSubmissionWithCurrentData: Success!', data);
        }
      } catch (e) {
        console.error('❌ testSubmissionWithCurrentData: Exception during invoke:', e);
        
        // Try to make a direct fetch to get more details
        try {
          const response = await fetch('https://khqarcvszewerjckmtpg.supabase.co/functions/v1/submit_registration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify(payload)
          });
          
          const responseText = await response.text();
          console.error('❌ Direct fetch response status:', response.status);
          console.error('❌ Direct fetch response body:', responseText);
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(responseText);
            console.error('❌ Parsed error data:', errorData);
          } catch (parseError) {
            console.error('❌ Error response is not valid JSON');
          }
        } catch (fetchError) {
          console.error('❌ Direct fetch failed:', fetchError);
        }
      }
    
  } catch (e) {
    console.error('❌ testSubmissionWithCurrentData: Exception:', e);
  }
}

/**
 * Generate fresh client_tx_id for testing
 */
function generateFreshClientTxId() {
  console.log('🔄 generateFreshClientTxId: Generating fresh client_tx_id');
  
  // Generate a new UUID
  const newId = (self.crypto?.randomUUID && self.crypto.randomUUID()) || 
                String(Date.now()) + Math.random().toString(16).slice(2);
  
  // Store it in localStorage
  localStorage.setItem('raceApp:client_tx_id', newId);
  
  console.log('✅ Fresh client_tx_id generated:', newId);
  console.log('✅ Stored in localStorage: raceApp:client_tx_id');
  
  return newId;
}

/**
 * Clear step 4 data for testing
 */
function clearStep4Data() {
  console.log('🎯 clearStep4: Clearing all step 4 data');
  
  // Clear sessionStorage
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('tn_team_') || key.startsWith('tn_practice_') || key.startsWith('tn_slot_ranks_')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear calendar
  clearCalendarSelections();
  
  // Reset slot preferences
  const slotSelects = [
    'slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3',
    'slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3'
  ];
  
  slotSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.value = '';
    }
  });
  
  console.log('🎯 clearStep4: All step 4 data cleared');
};

/**
 * Clear all application data
 */
function clearAllData() {
  console.log('🎯 clearAllData: Clearing all application data');
  
  // Clear all sessionStorage keys that start with 'tn_'
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('tn_')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('🎯 clearAllData: All application data cleared');
}

/**
 * Start fresh - clear all data and reload step 1
 */
function startFresh() {
  console.log('🎯 startFresh: Starting fresh form');
  clearAllData();
  loadStep(1);
  console.log('🎯 startFresh: Form reset to step 1');
}

/**
 * Preview Step 5 with comprehensive sample data
 */
function previewStep5WithSampleData() {
  console.log('🎯 previewStep5WithSampleData: Creating comprehensive sample data for step 5 preview');
  
  // 1. Basic organization info
  sessionStorage.setItem('tn_org_name', 'Hong Kong Dragon Boat Association');
  sessionStorage.setItem('tn_org_address', '123 Victoria Road, Central, Hong Kong');
  sessionStorage.setItem('tn_category', 'mixed_corporate');
  sessionStorage.setItem('tn_season', '2025');
  
  // 2. Team data (3 teams) - using division codes from database
  const sampleTeams = [
    { name: 'Thunder Dragons', category: 'C', option: 'Option I' }, // Mixed Division (Corporate)
    { name: 'Lightning Bolts', category: 'M', option: 'Option II' }, // Open Division (Men)
    { name: 'Storm Riders', category: 'L', option: 'Option I' } // Open Division (Ladies)
  ];
  
  sampleTeams.forEach((team, index) => {
    const i = index + 1;
    sessionStorage.setItem(`tn_team_name_${i}`, team.name);
    sessionStorage.setItem(`tn_team_category_${i}`, team.category);
    sessionStorage.setItem(`tn_team_option_${i}`, team.option);
    
    // Team managers
    sessionStorage.setItem(`tn_manager_1_${i}`, `Manager ${i}A`);
    sessionStorage.setItem(`tn_mobile_1_${i}`, `+852-1234-${String(i).padStart(4, '0')}`);
    sessionStorage.setItem(`tn_email_1_${i}`, `manager${i}a@example.com`);
    
    if (i <= 2) { // Only first 2 teams have second manager
      sessionStorage.setItem(`tn_manager_2_${i}`, `Manager ${i}B`);
      sessionStorage.setItem(`tn_mobile_2_${i}`, `+852-5678-${String(i).padStart(4, '0')}`);
      sessionStorage.setItem(`tn_email_2_${i}`, `manager${i}b@example.com`);
    }
  });
  
  // 3. Race day arrangements
  sessionStorage.setItem('tn_marquee_qty', '3');
  sessionStorage.setItem('tn_steer_with', '2');
  sessionStorage.setItem('tn_steer_without', '1');
  sessionStorage.setItem('tn_junk_boat', 'JUNK-001 / 1');
  sessionStorage.setItem('tn_speed_boat', 'SPEED-002 / 1');
  
  // 4. Practice booking data using TN store
  const { writeTeamRows, writeTeamRanks } = window.__DBG_TN || {};
  
  if (writeTeamRows && writeTeamRanks) {
    // Team 1 practice data
    const team1Practice = [
      { pref_date: '2025-01-15', duration_hours: 2, helper: 'S' },
      { pref_date: '2025-01-17', duration_hours: 1, helper: 'T' },
      { pref_date: '2025-01-20', duration_hours: 2, helper: 'ST' }
    ];
    const team1Ranks = [
      { rank: 1, slot_code: 'SAT2_0800_1000' },
      { rank: 2, slot_code: 'SAT2_1000_1200' },
      { rank: 3, slot_code: 'SUN2_0900_1100' }
    ];
    writeTeamRows('t1', team1Practice);
    writeTeamRanks('t1', team1Ranks);
    
    // Team 2 practice data
    const team2Practice = [
      { pref_date: '2025-01-16', duration_hours: 2, helper: 'ST' },
      { pref_date: '2025-01-19', duration_hours: 1, helper: 'S' }
    ];
    const team2Ranks = [
      { rank: 1, slot_code: 'SUN2_1100_1300' },
      { rank: 2, slot_code: 'SAT2_1215_1415' }
    ];
    writeTeamRows('t2', team2Practice);
    writeTeamRanks('t2', team2Ranks);
    
    // Team 3 practice data (minimal)
    const team3Practice = [
      { pref_date: '2025-01-18', duration_hours: 2, helper: 'T' }
    ];
    const team3Ranks = [
      { rank: 1, slot_code: 'SUN2_1315_1515' }
    ];
    writeTeamRows('t3', team3Practice);
    writeTeamRanks('t3', team3Ranks);
  }
  
  // 5. Navigate to step 5
  loadStep(5);
  
  console.log('🎯 previewStep5WithSampleData: Sample data created and step 5 loaded');
  console.log('🎯 Available debug functions:');
  console.log('  - window.__DBG_TN.previewStep5() - Load step 5 with sample data');
  console.log('  - window.__DBG_TN.clearStep5() - Clear all step 5 data');
}

/**
 * Test team switching functionality
 */
function testTeamSwitchFunction() {
  console.log('🎯 testTeamSwitch: Testing team switching');
  
  const teamSelect = document.getElementById('teamSelect');
  if (teamSelect) {
    // Switch to Team 2
    teamSelect.value = '1';
    teamSelect.dispatchEvent(new Event('change'));
    console.log('🎯 testTeamSwitch: Switched to Team 2');
    
    setTimeout(() => {
      // Switch back to Team 1
      teamSelect.value = '0';
      teamSelect.dispatchEvent(new Event('change'));
      console.log('🎯 testTeamSwitch: Switched back to Team 1');
    }, 2000);
  }
};

/**
 * Test copy button functionality
 */
function testCopyButton() {
  console.log('🎯 testCopyButton: Testing copy button');
  
  const copyBtn = document.getElementById('copyFromTeam1Btn');
  if (copyBtn) {
    console.log('🎯 testCopyButton: Copy button found, testing click');
    copyBtn.click();
  } else {
    console.warn('🎯 testCopyButton: Copy button not found!');
  }
};

/**
 * Test calendar data collection
 */
function testCalendarDataCollection() {
  console.log('🎯 testCalendarData: Testing calendar data collection');
  
  const calendarContainer = document.getElementById('calendarContainer');
  if (!calendarContainer) {
    console.warn('🎯 testCalendarData: No calendar container found!');
    return;
  }
  
  console.log('🎯 testCalendarData: Calendar container found');
  
  // Check for date elements
  const dateElements = calendarContainer.querySelectorAll('[data-date]');
  console.log(`🎯 testCalendarData: Found ${dateElements.length} date elements`);
  
  // Check for checkboxes
  const checkboxes = calendarContainer.querySelectorAll('input[type="checkbox"]');
  console.log(`🎯 testCalendarData: Found ${checkboxes.length} checkboxes`);
  
  // Check for checked checkboxes
  const checkedBoxes = calendarContainer.querySelectorAll('input[type="checkbox"]:checked');
  console.log(`🎯 testCalendarData: Found ${checkedBoxes.length} checked checkboxes`);
  
  // Test data collection
  const collectedDates = getCurrentTeamDates();
  console.log('🎯 testCalendarData: Collected dates:', collectedDates);
  
  // Test current team data
  const currentTeamIndex = getCurrentTeamIndex();
  const currentTeamData = getTeamPracticeData(currentTeamIndex);
  console.log(`🎯 testCalendarData: Current team ${currentTeamIndex} data:`, currentTeamData);
};

/**
 * Set up navigation for step 4
 */
function setupStep4Navigation() {
  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('🎯 initStep4: Back button clicked, going to step 3');
      loadStep(3);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('🎯 initStep4: Next button clicked, validating step 4');
      
      if (validateStep4()) {
        console.log('🎯 initStep4: Validation passed, saving data and proceeding to step 5');
        saveStep4Data();
        loadStep(5);
      } else {
        console.log('🎯 initStep4: Validation failed, staying on step 4');
      }
    });
  }
}

/**
 * Set up copy from Team 1 button
 */
function setupCopyFromTeam1Button() {
  console.log('🎯 setupCopyFromTeam1Button: Setting up copy button');
  const copyBtn = document.getElementById('copyFromTeam1Btn');
  
  if (copyBtn) {
    console.log('🎯 setupCopyFromTeam1Button: Copy button found, adding event listener');
    
    // Remove any existing event listeners
    copyBtn.removeEventListener('click', handleCopyFromTeam1);
    
    // Add new event listener
    copyBtn.addEventListener('click', handleCopyFromTeam1);
    
    console.log('🎯 setupCopyFromTeam1Button: Event listener added successfully');
  } else {
    console.warn('🎯 setupCopyFromTeam1Button: Copy button not found!');
  }
}

/**
 * Copy practice data between teams with validation
 */
function copyPractice(fromKey, toKey, mode, cfg) {
  const srcRows = readTeamRows(fromKey);
  const srcRanks = readTeamRanks(fromKey);
  const p = cfg.practice || {};
  const min = p.practice_start_date || p.window_start;
  const max = p.practice_end_date || p.window_end;
  const wd  = p.allowed_weekdays;
  const maxDates = cfg?.limits?.practice?.max_dates_per_team ?? 10;
  const valid = (r) => {
    if (!r.pref_date) return false;
    const d = new Date(r.pref_date);
    if (min && d < new Date(min)) return false;
    if (max && d > new Date(max)) return false;
    if (Array.isArray(wd) && wd.length && !wd.includes(d.getDay())) return false;
    return true;
  };
  const cleaned = srcRows.filter(valid).map(r => ({ ...r }));
  const dest = readTeamRows(toKey);
  const nextRows = (mode === 'append')
    ? dest.concat(cleaned).slice(0, maxDates)
    : cleaned.slice(0, maxDates);
  writeTeamRows(toKey, nextRows);
  writeTeamRanks(toKey, Array.isArray(srcRanks) ? srcRanks.slice(0,3) : []);
}

/**
 * Handle copy from Team 1 button click
 */
function handleCopyFromTeam1() {
  console.log('🎯 handleCopyFromTeam1: Copy button clicked!');
  
  const currentTeamIndex = getCurrentTeamIndex();
  console.log(`🎯 handleCopyFromTeam1: Current team index: ${currentTeamIndex}`);
  
  if (currentTeamIndex === 0) {
    console.log('🎯 handleCopyFromTeam1: Already on Team 1, nothing to copy');
    return;
  }
  
  console.log(`🎯 handleCopyFromTeam1: Copying Team 1 data to Team ${currentTeamIndex + 1}`);
  
  const currentIdx = getCurrentTeamIndex(); // 0-based
  const fromKey = 't1';
  const toKey = `t${currentIdx + 1}`;
  const srcRows  = readTeamRows(fromKey) || [];
  const srcRanks = readTeamRanks?.(fromKey) || [];
  writeTeamRows(toKey, srcRows.slice());
  writeTeamRanks?.(toKey, srcRanks.slice(0,3));
  updateCalendarForTeam(currentIdx);
  updateSlotPreferencesForTeam(currentIdx);
  console.log(`🎯 Copied ${srcRows.length} rows & ${srcRanks.length||0} ranks from ${fromKey} → ${toKey}`);
  
  console.log(`🎯 handleCopyFromTeam1: Copied Team 1 data to Team ${currentTeamIndex + 1}`);
}

/**
 * Get current team index from selector
 */
function getCurrentTeamIndex() {
  const teamSelect = document.getElementById('teamSelect');
  return parseInt(teamSelect?.value || '0', 10);
}

/**
 * Get team practice data from sessionStorage
 */
function getTeamPracticeData(teamIndex) {
  const teamKey = `t${teamIndex + 1}`;
  const rows = readTeamRows(teamKey);
  return rows.length > 0 ? rows[0] : { 
    dates: [], 
    slotPrefs_2hr: { slot_pref_1: '', slot_pref_2: '', slot_pref_3: '' },
    slotPrefs_1hr: { slot_pref_1: '', slot_pref_2: '', slot_pref_3: '' }
  };
}

/**
 * Save team practice data to sessionStorage
 */
function saveTeamPracticeData(teamIndex, data) {
  const teamKey = `t${teamIndex + 1}`;
  writeTeamRows(teamKey, [data]);
  console.log(`🎯 saveTeamPracticeData: Saved data for team ${teamIndex}:`, data);
}

/**
 * Save current team's practice data
 */
function saveCurrentTeamPracticeData() {
  const currentTeamKey = getCurrentTeamKey();
  const rows = [];
  const checks = document.querySelectorAll('#calendarContainer input[type="checkbox"][data-date]:checked');
  checks.forEach(cb => {
    const dateStr = cb.getAttribute('data-date');
    // dropdowns are the next sibling `.dropdowns` of the label wrapper
    const label = cb.closest('label.day-checkbox');
    const dropdowns = label?.parentElement?.querySelector('.dropdowns');
    const durationSel = dropdowns?.querySelector('select.duration');
    const helperSel = dropdowns?.querySelector('select.helpers');
    if (dateStr && durationSel && helperSel) {
      rows.push({
        pref_date: dateStr,
        duration_hours: Number(durationSel.value) || 1,
        helper: helperSel.value || 'NONE'
      });
    }
  });
  writeTeamRows(currentTeamKey, rows);
  console.log(`🎯 saveCurrentTeamPracticeData: Saved ${rows.length} rows for ${currentTeamKey}`);
}

/**
 * Validate practice requirements
 * Returns error message if validation fails, null if valid
 */
function validatePracticeRequired() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  for (let i=0;i<teamCount;i++) {
    const key = `t${i+1}`;
    const rows = readTeamRows(key) || [];
    for (const r of rows) {
      if (!r.pref_date) return 'Select a date for each row';
      if (![1,2].includes(Number(r.duration_hours))) return 'Each date needs 1h or 2h';
      if (!['NONE','S','T','ST'].includes(r.helper)) return 'Each date needs a helper choice';
    }
  }
  return null;
}

/**
 * Set up event listeners for calendar interactions
 */
function setupCalendarEventListeners(container) {
  console.log('🎯 setupCalendarEventListeners: Setting up calendar event listeners');
  
  // Use event delegation for checkboxes and dropdowns
  container.addEventListener('change', (event) => {
    const target = event.target;
    
    // Handle checkbox changes
    if (target.type === 'checkbox') {
      const dateStr = target.getAttribute('data-date');
      const dropdowns = target.closest('[data-date]')?.querySelector('.dropdowns');
      const key = getCurrentTeamKey();
      
      if (target.checked) {
        // add row if not present
        const rows = readTeamRows(key) || [];
        if (!rows.some(r => r.pref_date === dateStr)) {
          rows.push({ pref_date: dateStr, duration_hours: 1, helper: 'NONE' });
          writeTeamRows(key, rows);
        }
        dropdowns?.classList.remove('hide');
      } else {
        writeTeamRows(key, (readTeamRows(key)||[]).filter(r => r.pref_date !== dateStr));
        dropdowns?.classList.add('hide');
      }
      saveCurrentTeamPracticeData(); // keep single save path
    }
    
    // Handle dropdown changes (duration, helpers)
    if (target.tagName === 'SELECT') {
      const dateStr = target.closest('[data-date]')?.getAttribute('data-date');
      const key = getCurrentTeamKey();
      const rows = readTeamRows(key) || [];
      const rowIndex = rows.findIndex(r => r.pref_date === dateStr);
      
      if (rowIndex >= 0) {
        if (target.classList.contains('duration')) {
          rows[rowIndex].duration_hours = Number(target.value) || 1;
        } else if (target.classList.contains('helpers')) {
          rows[rowIndex].helper = target.value || 'NONE';
        }
        writeTeamRows(key, rows);
      }
      saveCurrentTeamPracticeData();
    }
  });
  
  // Also listen for clicks on date elements
  container.addEventListener('click', (event) => {
    const dateElement = event.target.closest('[data-date]');
    if (dateElement) {
      console.log('🎯 Calendar date element clicked:', dateElement.getAttribute('data-date'));
      // Small delay to allow checkbox state to update
      setTimeout(() => {
        saveCurrentTeamPracticeData();
      }, 10);
    }
  });
  
  console.log('🎯 setupCalendarEventListeners: Event listeners set up successfully');
}

/**
 * Get current team's selected dates from calendar
 */
function getCurrentTeamDates() {
  console.log('🎯 getCurrentTeamDates: Collecting selected dates from calendar');
  
  const calendarContainer = document.getElementById('calendarContainer');
  if (!calendarContainer) {
    console.log('🎯 getCurrentTeamDates: No calendar container found');
    return [];
  }
  
  const selectedDates = [];
  
  // Find all checkboxes with data-date attributes
  const checkboxes = calendarContainer.querySelectorAll('input[type="checkbox"][data-date]');
  console.log(`🎯 getCurrentTeamDates: Found ${checkboxes.length} checkboxes with data-date`);
  
  checkboxes.forEach((checkbox, index) => {
    console.log(`🎯 getCurrentTeamDates: Processing checkbox ${index}:`, {
      isChecked: checkbox.checked,
      date: checkbox.getAttribute('data-date')
    });
    
    if (checkbox.checked) {
      const date = checkbox.getAttribute('data-date');
      
      // Find the parent container that holds the dropdowns
      const dateContainer = checkbox.closest('.day-checkbox')?.parentElement;
      
      // Look for duration and helper selects within the same date container
      const durationSelect = dateContainer?.querySelector('select.duration');
      const helperSelect = dateContainer?.querySelector('select.helpers');
      
      const hours = durationSelect ? parseInt(durationSelect.value, 10) || 0 : 0;
      const helpers = helperSelect ? helperSelect.value : '';
      
      console.log(`🎯 getCurrentTeamDates: Processing date ${date}:`, {
        checkbox: checkbox.checked,
        durationSelect: durationSelect,
        helperSelect: helperSelect,
        hours: hours,
        helpers: helpers,
        dateContainerHTML: dateContainer?.outerHTML.substring(0, 200) + '...'
      });
      
      if (date && hours > 0) {
        selectedDates.push({
          date: date,
          hours: hours,
          helpers: helpers
        });
        
        console.log(`🎯 getCurrentTeamDates: Found selected date: ${date}, ${hours}h, ${helpers}`);
      } else {
        console.log(`🎯 getCurrentTeamDates: Skipping date ${date} - hours: ${hours}, helpers: ${helpers}`);
      }
    }
  });
  
  console.log(`🎯 getCurrentTeamDates: Collected ${selectedDates.length} selected dates`);
  return selectedDates;
}

/**
 * Load team practice data and update UI
 */
function loadTeamPracticeData(teamIndex) {
  const teamData = getTeamPracticeData(teamIndex);
  console.log(`🎯 loadTeamPracticeData: Loading data for team ${teamIndex}:`, teamData);
  
  // This function is called from team switching handler
  // The actual UI updates are handled by updateCalendarForTeam and updateSlotPreferencesForTeam
  // which are called separately in the team switching logic
}

/**
 * Update calendar display for specific team
 */
function updateCalendarForTeam(teamIndex) {
  const teamKey = `t${teamIndex + 1}`;
  const rows = readTeamRows(teamKey) || [];
  clearCalendarSelections();
  rows.forEach(row => {
    const cb = document.querySelector(`#calendarContainer input[type="checkbox"][data-date="${row.pref_date}"]`);
    if (!cb) return;
    cb.checked = true;
    const label = cb.closest('label.day-checkbox');
    const dropdowns = label?.parentElement?.querySelector('.dropdowns');
    const durationSel = dropdowns?.querySelector('select.duration');
    const helperSel = dropdowns?.querySelector('select.helpers');
    if (durationSel) durationSel.value = String(row.duration_hours || 1);
    if (helperSel)  helperSel.value  = row.helper || 'NONE';
    dropdowns?.classList.remove('hide');
  });
}

/**
 * Update slot preferences for specific team
 */
function updateSlotPreferencesForTeam(teamIndex) {
  const teamKey = `t${teamIndex + 1}`;
  console.log(`🎯 updateSlotPreferencesForTeam: loading ranks for ${teamKey}`);
  
  // 1) Ensure options exist (in case switching teams before init)
  if (typeof populateSlotPreferences === 'function') {
  populateSlotPreferences();
  }

  // 2) Clear all rank selects before populating (prevents bleed from previous team)
  const ids2 = ['slotPref2h_1','slotPref2h_2','slotPref2h_3'];
  const ids1 = ['slotPref1h_1','slotPref1h_2','slotPref1h_3'];
  [...ids2, ...ids1].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.selectedIndex = 0; // Reset to first option (usually blank)
      el.value = el.options[0]?.value || ''; // Ensure value matches first option
    }
  });

  // 3) Read ranks for THIS team
  const ranks = (typeof readTeamRanks === 'function' ? readTeamRanks(teamKey) : []) || [];
  console.log(`🎯 updateSlotPreferencesForTeam: Found ${ranks.length} ranks for ${teamKey}:`, ranks);
  if (!Array.isArray(ranks) || ranks.length === 0) {
    console.debug(`🎯 updateSlotPreferencesForTeam: no ranks for ${teamKey} - all selects should be cleared`);
    if (typeof setupSlotDuplicatePrevention === 'function') setupSlotDuplicatePrevention();
    return;
  }

  // Helper: find which select to target for a slot_code
  function resolveSelectIdForSlot(slot_code, rank) {
    // Prefer an official resolver if available
    if (typeof getTimeslotByCode === 'function' && window.__CONFIG) {
      const ts = getTimeslotByCode(window.__CONFIG, slot_code);
      if (ts && Number(ts.duration_hours) === 2) return `slotPref2h_${rank}`;
      if (ts && Number(ts.duration_hours) === 1) return `slotPref1h_${rank}`;
    }
    // Fallback heuristics if no resolver present
    const code = String(slot_code || '');
    const looks2h = /(^|_)2h(_|$)/i.test(code) || /(^|_)2(_\d{2,4}_\d{2,4}|$)/i.test(code);
    const looks1h = /(^|_)1h(_|$)/i.test(code) || /(^|_)1(_\d{2,4}_\d{2,4}|$)/i.test(code);
    if (looks2h) return `slotPref2h_${rank}`;
    if (looks1h) return `slotPref1h_${rank}`;
    // Default to 2h bucket if unknown (keeps behavior consistent with prior usage)
    return `slotPref2h_${rank}`;
  }

  // 4) Populate selects for this team's ranks
  ranks.forEach(item => {
    // item can be { rank, slot_code } or similar
    const rank = Number(item.rank) || 0;
    const slot = item.slot_code || '';
    console.log(`🎯 updateSlotPreferencesForTeam: Processing rank ${rank} with slot ${slot}`);
    if (rank >= 1 && rank <= 3 && slot) {
      const selectId = resolveSelectIdForSlot(slot, rank);
      const el = document.getElementById(selectId);
      console.log(`🎯 updateSlotPreferencesForTeam: Setting ${selectId} to ${slot}`);
      if (el) {
        el.value = slot;
        console.log(`🎯 updateSlotPreferencesForTeam: Successfully set ${selectId} to ${slot}`);
      } else {
        console.warn(`🎯 updateSlotPreferencesForTeam: Element ${selectId} not found`);
      }
    }
  });

  // 5) Re-apply duplicate-prevention constraints after setting values
  if (typeof setupSlotDuplicatePrevention === 'function') {
    setupSlotDuplicatePrevention();
  }

  console.log(`🎯 updateSlotPreferencesForTeam: applied ${ranks.length} ranks for ${teamKey}`);
}


/**
 * Clear all calendar selections
 */
function clearCalendarSelections() {
  console.log('🎯 clearCalendarSelections: Clearing calendar selections');
  
  // Clear any selected dates on the calendar
  const calendarContainer = document.getElementById('calendarContainer');
  if (calendarContainer) {
    // Clear any checkboxes that might be checked
    const checkboxes = calendarContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Hide all dropdowns and clear their values
    const dropdowns = calendarContainer.querySelectorAll('.dropdowns');
    dropdowns.forEach(dropdown => {
      dropdown.classList.add('hide');
      dropdown.querySelectorAll('select').forEach(select => {
        select.value = '';
      });
    });
    
    // Clear summary total hours
    const totalHoursEl = document.getElementById('totalHours');
    if (totalHoursEl) {
      totalHoursEl.textContent = '0';
    }
    
    console.log('🎯 clearCalendarSelections: Cleared calendar selections');
  }
}

/**
 * Show copy from Team 1 option
 */
function showCopyFromTeam1Option() {
  const copyContainer = document.querySelector('.copy-from-team1');
  if (copyContainer) {
    copyContainer.style.display = 'block';
    console.log('🎯 showCopyFromTeam1Option: Showing copy option');
  }
}

/**
 * Hide copy from Team 1 option
 */
function hideCopyFromTeam1Option() {
  const copyContainer = document.querySelector('.copy-from-team1');
  if (copyContainer) {
    copyContainer.style.display = 'none';
    console.log('🎯 hideCopyFromTeam1Option: Hiding copy option');
  }
}

/**
 * Highlight date on calendar
 */
function highlightDateOnCalendar(date, hours, helpers) {
  console.log(`🎯 highlightDateOnCalendar: Highlighting ${date} for ${hours}h with helpers ${helpers}`);
  
  const calendarContainer = document.getElementById('calendarContainer');
  if (!calendarContainer) return;
  
  // Find the checkbox with the matching data-date
  const checkbox = calendarContainer.querySelector(`input[type="checkbox"][data-date="${date}"]`);
  if (!checkbox) {
    console.log(`🎯 highlightDateOnCalendar: No checkbox found for date ${date}`);
    return;
  }
  
  // Check the checkbox
  checkbox.checked = true;
  console.log(`🎯 highlightDateOnCalendar: Checked checkbox for ${date}`);
  
  // Find the parent container that holds the dropdowns
  const dateContainer = checkbox.closest('.day-checkbox')?.parentElement;
  if (!dateContainer) {
    console.log(`🎯 highlightDateOnCalendar: No date container found for ${date}`);
    return;
  }
  
  // Set duration dropdown
  const durationSelect = dateContainer.querySelector('select.duration');
  if (durationSelect) {
    durationSelect.value = hours;
    console.log(`🎯 highlightDateOnCalendar: Set duration to ${hours} for ${date}`);
  } else {
    console.log(`🎯 highlightDateOnCalendar: No duration select found for ${date}`);
  }
  
  // Set helper dropdown
  const helperSelect = dateContainer.querySelector('select.helpers');
  if (helperSelect) {
    helperSelect.value = helpers;
    console.log(`🎯 highlightDateOnCalendar: Set helpers to ${helpers} for ${date}`);
  } else {
    console.log(`🎯 highlightDateOnCalendar: No helper select found for ${date}`);
  }
  
  // Add highlighting classes to the date container
  dateContainer.classList.add('selected', 'practiced');
  
  console.log(`🎯 highlightDateOnCalendar: Successfully highlighted ${date} with ${hours}h and ${helpers} helpers`);
}

/**
 * Initialize Step 5 - Summary
 */
function initStep5() {
  // Load and display summary data
  loadSummaryData();
}

/**
 * Load summary data from sessionStorage
 */
function loadSummaryData() {
  console.log('🎯 loadSummaryData: Starting summary data load');
  // Load basic info
  const orgName = sessionStorage.getItem('tn_org_name');
  const orgAddress = sessionStorage.getItem('tn_org_address');
  const season = sessionStorage.getItem('tn_season');
  
  // Update summary elements
  const sumOrg = document.getElementById('sumOrg');
  if (sumOrg && orgName) {
    sumOrg.textContent = orgName;
  }
  
  const sumAddress = document.getElementById('sumAddress');
  if (sumAddress && orgAddress) {
    sumAddress.textContent = orgAddress;
  }
  
  const sumSeason = document.getElementById('sumSeason');
  if (sumSeason && season) {
    sumSeason.textContent = season;
  }
  
  // Load team data
  console.log('🎯 loadSummaryData: Calling loadTeamSummary');
  loadTeamSummary();
  
  // Load team managers
  console.log('🎯 loadSummaryData: Calling loadManagersSummary');
  loadManagersSummary();
  
  // Load race day data
  console.log('🎯 loadSummaryData: Calling loadRaceDaySummary');
  loadRaceDaySummary();
  
  // Load practice data
  console.log('🎯 loadSummaryData: Calling loadPracticeSummary');
  loadPracticeSummary();
  
  console.log('🎯 loadSummaryData: All summary functions called');
}

/**
 * Get category display name from loaded division configuration
 */
function getCategoryDisplayName(categoryCode) {
  // Try to get from loaded configuration first
  if (window.__CONFIG && window.__CONFIG.divisions) {
    const division = window.__CONFIG.divisions.find(d => d.division_code === categoryCode);
    if (division && division.name_en) {
      return division.name_en;
    }
  }
  
  // Fallback mapping if configuration not loaded
  const fallbackMap = {
    'mixed_corporate': 'Mixed Division (Corporate)',
    'men_open': 'Open Division (Men)', 
    'ladies_open': 'Open Division (Ladies)',
    'mixed_open': 'Mixed Division (Open)'
  };
  
  return fallbackMap[categoryCode] || categoryCode;
}

/**
 * Get option display name from loaded package configuration
 */
function getOptionDisplayName(optionCode) {
  // Try to get from loaded configuration first
  if (window.__CONFIG && window.__CONFIG.packages) {
    const package_ = window.__CONFIG.packages.find(p => p.package_code === optionCode);
    if (package_ && package_.title_en) {
      return package_.title_en;
    }
  }
  
  // Fallback mapping if configuration not loaded
  const fallbackMap = {
    'option_1_non_corp': 'Option I',
    'option_1_corp': 'Option I',
    'option_2_non_corp': 'Option II',
    'option_2_corp': 'Option II'
  };
  
  return fallbackMap[optionCode] || optionCode;
}

/**
 * Load team summary data
 */
function loadTeamSummary() {
  console.log('🎯 loadTeamSummary: Starting');
  const teamsTbody = document.getElementById('teamsTbody');
  if (!teamsTbody) {
    console.warn('🎯 loadTeamSummary: teamsTbody element not found');
    return;
  }
  console.log('🎯 loadTeamSummary: teamsTbody found');
  
  const teams = [];
  for (let i = 1; i <= 10; i++) {
    const name = sessionStorage.getItem(`tn_team_name_${i}`);
    const category = sessionStorage.getItem(`tn_team_category_${i}`);
    const option = sessionStorage.getItem(`tn_team_option_${i}`);
    
    if (name) {
      teams.push({
        name: name,
        category: category || '—',
        option: option || 'Standard'
      });
    }
  }
  
  if (teams.length === 0) {
    teamsTbody.innerHTML = '<tr><td colspan="3" class="muted">No teams</td></tr>';
  } else {
    teamsTbody.innerHTML = '';
    teams.forEach((team, index) => {
      const row = document.createElement('tr');
        // Format category for display using loaded division configuration
        const categoryDisplay = getCategoryDisplayName(team.category);
        
        // Get proper option display name
        const optionDisplay = getOptionDisplayName(team.option);
        
      row.innerHTML = `
        <td>${index + 1}</td>
          <td>${team.name} <span style="color: #666; font-size: 0.9em;">(${categoryDisplay})</span></td>
          <td>${optionDisplay}</td>
      `;
      teamsTbody.appendChild(row);
    });
  }
}

/**
 * Load team managers summary data
 */
function loadManagersSummary() {
  console.log('🎯 loadManagersSummary: Starting');
  const managersTbody = document.getElementById('managersTbody');
  if (!managersTbody) {
    console.warn('🎯 loadManagersSummary: managersTbody element not found');
    return;
  }
  console.log('🎯 loadManagersSummary: managersTbody found');
  
  const managers = [];
  
  // Load organization-level managers (from step 2)
  const manager1Name = sessionStorage.getItem('tn_manager1_name');
  const manager1Phone = sessionStorage.getItem('tn_manager1_phone');
  const manager1Email = sessionStorage.getItem('tn_manager1_email');
  
  if (manager1Name) {
    managers.push({
      name: manager1Name,
      mobile: manager1Phone || '—',
      email: manager1Email || '—'
    });
  }
  
  const manager2Name = sessionStorage.getItem('tn_manager2_name');
  const manager2Phone = sessionStorage.getItem('tn_manager2_phone');
  const manager2Email = sessionStorage.getItem('tn_manager2_email');
  
  if (manager2Name) {
    managers.push({
      name: manager2Name,
      mobile: manager2Phone || '—',
      email: manager2Email || '—'
    });
  }
  
  const manager3Name = sessionStorage.getItem('tn_manager3_name');
  const manager3Phone = sessionStorage.getItem('tn_manager3_phone');
  const manager3Email = sessionStorage.getItem('tn_manager3_email');
  
  if (manager3Name) {
    managers.push({
      name: manager3Name,
      mobile: manager3Phone || '—',
      email: manager3Email || '—'
    });
  }
  
  if (managers.length === 0) {
    managersTbody.innerHTML = '<tr><td colspan="4" class="muted">No manager information</td></tr>';
  } else {
    managersTbody.innerHTML = '';
    managers.forEach((manager, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${manager.name}</td>
        <td>${manager.mobile}</td>
        <td>${manager.email}</td>
      `;
      managersTbody.appendChild(row);
    });
  }
}

/**
 * Load race day summary data
 */
function loadRaceDaySummary() {
  console.log('🎯 loadRaceDaySummary: Starting');
  // Load race day arrangement data from sessionStorage JSON
  const raceDayDataStr = sessionStorage.getItem('tn_race_day');
  let raceDayData = {};
  
  if (raceDayDataStr) {
    try {
      raceDayData = JSON.parse(raceDayDataStr);
      console.log('🎯 loadRaceDaySummary: Race day data loaded:', raceDayData);
    } catch (e) {
      console.warn('Failed to parse race day data:', e);
    }
  } else {
    console.warn('🎯 loadRaceDaySummary: No race day data found in sessionStorage');
  }
  
  // Map the data to display values (using actual input IDs from template)
  const marqueeQty = raceDayData.marqueeQty || 0;
  const steerWith = raceDayData.steerWithQty || 0;
  const steerWithout = raceDayData.steerWithoutQty || 0;
  const junkBoat = raceDayData.junkBoatQty ? `${raceDayData.junkBoatQty} units` : '—';
  const speedBoat = raceDayData.speedboatQty ? `${raceDayData.speedboatQty} units` : '—';
  
    // Update race day summary elements
    const sumMarquee = document.getElementById('sumMarquee');
    const sumSteerWith = document.getElementById('sumSteerWith');
    const sumSteerWithout = document.getElementById('sumSteerWithout');
    const sumJunk = document.getElementById('sumJunk');
    const sumSpeed = document.getElementById('sumSpeed');
    
  console.log('🎯 loadRaceDaySummary: Display values:', {
    marqueeQty, steerWith, steerWithout, junkBoat, speedBoat
  });
  
  if (sumMarquee) sumMarquee.textContent = marqueeQty;
  if (sumSteerWith) sumSteerWith.textContent = steerWith;
  if (sumSteerWithout) sumSteerWithout.textContent = steerWithout;
  if (sumJunk) sumJunk.textContent = junkBoat;
  if (sumSpeed) sumSpeed.textContent = speedBoat;
  
  console.log('🎯 loadRaceDaySummary: Summary elements updated');
}

/**
 * Load practice summary data
 */
function loadPracticeSummary() {
  console.log('🎯 loadPracticeSummary: Starting');
  const perTeamPracticeSummary = document.getElementById('perTeamPracticeSummary');
  if (!perTeamPracticeSummary) {
    console.warn('🎯 loadPracticeSummary: perTeamPracticeSummary element not found');
    return;
  }
  console.log('🎯 loadPracticeSummary: perTeamPracticeSummary found');
  
  // Import the store functions
  const { readTeamRows, readTeamRanks } = window.__DBG_TN || {};
  
  if (!readTeamRows || !readTeamRanks) {
    perTeamPracticeSummary.innerHTML = '<p class="muted">Practice booking data unavailable</p>';
    return;
  }
  
  const practiceData = [];
  
  // Get practice data for each team
  for (let i = 1; i <= 10; i++) {
    const teamName = sessionStorage.getItem(`tn_team_name_${i}`);
    if (!teamName) continue;
    
    const teamKey = `t${i}`;
    const practiceRows = readTeamRows(teamKey) || [];
    const slotRanks = readTeamRanks(teamKey) || [];
    
    if (practiceRows.length > 0 || slotRanks.length > 0) {
      practiceData.push({
        teamName: teamName,
        teamKey: teamKey,
        practiceRows: practiceRows,
        slotRanks: slotRanks
      });
    }
  }
  
  if (practiceData.length === 0) {
    perTeamPracticeSummary.innerHTML = '<p class="muted">No practice booking data</p>';
    return;
  }
  
  // Generate HTML for each team's practice data
  let html = '';
  practiceData.forEach(team => {
    html += `<div class="team-practice-section" style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 6px;">`;
    html += `<h4 style="margin: 0 0 0.5rem 0; color: #0f6ec7;">${team.teamName}</h4>`;
    
    // Practice dates
    if (team.practiceRows.length > 0) {
      html += `<div style="margin-bottom: 0.5rem;">`;
      html += `<strong>Practice Dates:</strong><br>`;
      team.practiceRows.forEach(row => {
        const date = new Date(row.pref_date).toLocaleDateString();
        const duration = row.duration_hours;
        const helper = row.helper;
        html += `<span style="margin-right: 1rem;">• ${date} (${duration}h, ${helper})</span>`;
      });
      html += `</div>`;
    }
    
    // Slot preferences
    if (team.slotRanks.length > 0) {
      html += `<div>`;
      html += `<strong>Slot Preferences:</strong><br>`;
      team.slotRanks.forEach(rank => {
        html += `<span style="margin-right: 1rem;">${rank.rank}. ${rank.slot_code}</span>`;
      });
      html += `</div>`;
    }
    
    html += `</div>`;
  });
  
  perTeamPracticeSummary.innerHTML = html;
}

/**
 * Set up step navigation
 */
function setupStepNavigation() {
  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', async () => {
      if (currentStep > 1) {
        saveCurrentStepData();
        await loadStep(currentStep - 1);
      }
    });
  }
  
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
  
  // Submit button (step 5)
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        submitTNForm();
      }
    });
  }
}

/**
 * Validate current step
 */
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

/**
 * Validate step 1 - Category
 */
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
    const teamName = document.getElementById(`teamName${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);
    const teamOption = document.getElementById(`teamOption${i}`);
    
    if (!teamName?.value?.trim()) {
      missingFields.push(`Team ${i} name`);
      highlightField(teamName);
    }
    
    if (!teamCategory?.value) {
      missingFields.push(`Team ${i} race category`);
      highlightField(teamCategory);
    }
    
    // Check for selected radio button in the team option group
    const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
    console.log(`🎯 Validation: Team ${i} radio buttons found:`, teamOptionRadios.length);
    if (teamOptionRadios.length > 0) {
      console.log(`🎯 Validation: Team ${i} selected value:`, teamOptionRadios[0].value);
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
    if (teamName?.value?.trim() && teamCategory?.value) {
      teamData.push({
        index: i,
        name: teamName.value.trim(),
        category: teamCategory.value,
        nameElement: teamName,
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

/**
 * Validate step 2 - Team Info
 */
function validateStep2() {
  // Clear any previous field highlighting
  clearFieldHighlighting();
  
  const missingFields = [];
  
  // Validate organization information
  const orgName = document.getElementById('orgName');
  const orgAddress = document.getElementById('orgAddress');
  
  if (!orgName?.value?.trim()) {
    missingFields.push('Organization name');
    highlightField(orgName);
  }
  
  if (!orgAddress?.value?.trim()) {
    missingFields.push('Organization address');
    highlightField(orgAddress);
  }
  
  // Validate Team Manager 1 (Required)
  const manager1Name = document.getElementById('manager1Name');
  const manager1Phone = document.getElementById('manager1Phone');
  const manager1Email = document.getElementById('manager1Email');
  
  if (!manager1Name?.value?.trim()) {
    missingFields.push('Team Manager 1 name');
    highlightField(manager1Name);
  }
  
  if (!manager1Phone?.value?.trim()) {
    missingFields.push('Team Manager 1 phone');
    highlightField(manager1Phone);
  }
  
  if (!manager1Email?.value?.trim()) {
    missingFields.push('Team Manager 1 email');
    highlightField(manager1Email);
  }
  
  // Validate Team Manager 2 (Required)
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  
  if (!manager2Name?.value?.trim()) {
    missingFields.push('Team Manager 2 name');
    highlightField(manager2Name);
  }
  
  if (!manager2Phone?.value?.trim()) {
    missingFields.push('Team Manager 2 phone');
    highlightField(manager2Phone);
  }
  
  if (!manager2Email?.value?.trim()) {
    missingFields.push('Team Manager 2 email');
    highlightField(manager2Email);
  }
  
  // Team Manager 3 is optional, no validation needed
  
  if (missingFields.length > 0) {
    const message = missingFields.length === 1 
      ? `Please complete: ${missingFields[0]}`
      : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
    showError(message);
    return false;
  }
  
  return true;
}

/**
 * Validate step 3 - Race Day
 */
function validateStep3() {
  // Clear any previous field highlighting
  clearFieldHighlighting();
  
  const errors = [];
  
  // Get all quantity inputs
  const qtyInputs = document.querySelectorAll('.qty-input');
  
  qtyInputs.forEach(input => {
    const value = parseInt(input.value, 10) || 0;
    const min = parseInt(input.min, 10) || 0;
    const max = parseInt(input.max, 10) || Infinity;
    
    // Check minimum quantity
    if (value < min) {
      errors.push(`${input.id} must be at least ${min}`);
      highlightField(input);
    }
    
    // Check maximum quantity
    if (value > max) {
      errors.push(`${input.id} cannot exceed ${max}`);
      highlightField(input);
    }
  });
  
  if (errors.length > 0) {
    const message = errors.length === 1 
      ? errors[0]
      : `Please fix: ${errors.slice(0, -1).join(', ')} and ${errors[errors.length - 1]}`;
    showError(message);
    return false;
  }
  
  return true;
}

/**
 * Validate step 4 - Practice
 */
function validateStep4() {
  // Check for duplicate slot selections
  checkForDuplicates();
  
  // Validate practice requirements
  const practiceError = validatePracticeRequired();
  if (practiceError) {
    console.log('🎯 validateStep4: Practice validation failed:', practiceError);
    showError(practiceError);
    return false;
  }
  
  return true;
}

/**
 * Validate step 5 - Summary
 */
function validateStep5() {
  // Summary step is always valid
  return true;
}

/**
 * Save current step data to sessionStorage
 */
function saveCurrentStepData() {
  switch (currentStep) {
    case 1:
      saveStep1Data();
      break;
    case 2:
      saveStep2Data();
      break;
    case 3:
      saveStep3Data();
      break;
    case 4:
      saveStep4Data();
      break;
  }
}

/**
 * Save step 1 data
 */
function saveStep1Data() {
  const teamCount = document.getElementById('teamCount');
  
  if (teamCount?.value) {
    sessionStorage.setItem('tn_team_count', teamCount.value);
    console.log('🎯 saveStep1Data: Saved team count:', teamCount.value);
  }
  
  // Save team data if team fields are present
  saveTeamData();
}

/**
 * Save step 2 data
 */
function saveStep2Data() {
  // Save organization data
  const orgName = document.getElementById('orgName');
  const orgAddress = document.getElementById('orgAddress');
  
  if (orgName?.value) {
    sessionStorage.setItem('tn_org_name', orgName.value);
  }
  
  if (orgAddress?.value) {
    sessionStorage.setItem('tn_org_address', orgAddress.value);
  }
  
  // Save Team Manager 1 data
  const manager1Name = document.getElementById('manager1Name');
  const manager1Phone = document.getElementById('manager1Phone');
  const manager1Email = document.getElementById('manager1Email');
  
  if (manager1Name?.value) {
    sessionStorage.setItem('tn_manager1_name', manager1Name.value);
  }
  if (manager1Phone?.value) {
    sessionStorage.setItem('tn_manager1_phone', manager1Phone.value);
  }
  if (manager1Email?.value) {
    sessionStorage.setItem('tn_manager1_email', manager1Email.value);
  }
  
  // Save Team Manager 2 data
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  
  if (manager2Name?.value) {
    sessionStorage.setItem('tn_manager2_name', manager2Name.value);
  }
  if (manager2Phone?.value) {
    sessionStorage.setItem('tn_manager2_phone', manager2Phone.value);
  }
  if (manager2Email?.value) {
    sessionStorage.setItem('tn_manager2_email', manager2Email.value);
  }
  
  // Save Team Manager 3 data (optional)
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  
  if (manager3Name?.value) {
    sessionStorage.setItem('tn_manager3_name', manager3Name.value);
  }
  if (manager3Phone?.value) {
    sessionStorage.setItem('tn_manager3_phone', manager3Phone.value);
  }
  if (manager3Email?.value) {
    sessionStorage.setItem('tn_manager3_email', manager3Email.value);
  }
  
  console.log('🎯 saveStep2Data: Organization and manager data saved');
}

/**
 * Save step 3 data
 */
function saveStep3Data() {
  const raceDayData = {};
  
  // Get all quantity inputs and save their values
  const qtyInputs = document.querySelectorAll('.qty-input');
  
  qtyInputs.forEach(input => {
    const value = parseInt(input.value, 10) || 0;
    raceDayData[input.id] = value;
  });
  
  // Save to sessionStorage
  sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
  
  console.log('🎯 saveStep3Data: Race day data saved:', raceDayData);
}

/**
 * Save step 4 data - collect all team practice data
 */
function saveStep4Data() {
  // Save current team's data before collecting all
  saveCurrentTeamPracticeData();
  
  // Collect all team practice data
  const allTeamPracticeData = collectAllTeamPracticeData();
  
  // Save aggregated data for submission
  sessionStorage.setItem('tn_practice_all_teams', JSON.stringify(allTeamPracticeData));
  
  console.log('🎯 saveStep4Data: Saved practice data for all teams:', allTeamPracticeData);
}

/**
 * Collect all team practice data for submission
 */
function collectAllTeamPracticeData() {
  const allPracticeData = [];
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  console.log(`🎯 collectAllTeamPracticeData: Collecting data for ${teamCount} teams`);
  
  for (let i = 0; i < teamCount; i++) {
    const teamData = getTeamPracticeData(i);
    
    // Only include teams with practice data
    if (teamData.dates && teamData.dates.length > 0) {
      allPracticeData.push({
        team_index: i,
        dates: teamData.dates,
        slotPrefs_2hr: teamData.slotPrefs_2hr || {},
        slotPrefs_1hr: teamData.slotPrefs_1hr || {}
      });
      
      console.log(`🎯 collectAllTeamPracticeData: Team ${i} has ${teamData.dates.length} practice dates`);
    } else {
      console.log(`🎯 collectAllTeamPracticeData: Team ${i} has no practice data`);
    }
  }
  
  return allPracticeData;
}

// Build TN practice payload in server-expected shape: { teams: [{ team_key, dates[], slot_ranks[] }] }
function buildTNPracticePayload() {
  const teams = [];
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  for (let i = 0; i < teamCount; i++) {
    const team_key = `t${i+1}`;
    const rows  = (typeof readTeamRows==='function' ? readTeamRows(team_key) : []) || [];
    const ranks = (typeof readTeamRanks==='function' ? readTeamRanks(team_key) : []) || [];
    teams.push({
      team_key,
      dates: rows.map(r => ({
        pref_date: r.pref_date,
        duration_hours: Number(r.duration_hours)||1,
        helper: r.helper || 'NONE'
      })),
      slot_ranks: ranks.map(r => ({
        rank: Number(r.rank),
        slot_code: r.slot_code
      }))
    });
  }
  return { teams };
}

// TN-specific data collection functions
function collectContactData() {
  // Get organization name from form or sessionStorage
  const orgName = document.querySelector('#orgName')?.value?.trim() || 
                  sessionStorage.getItem('tn_org_name') || '';
  const mailingAddress = document.querySelector('#mailingAddress')?.value?.trim() || 
                        sessionStorage.getItem('tn_mailing_address') || '';
  
  return {
    name: orgName,
    email: '', // No separate contact email field in TN form
    phone: '', // No separate contact phone field in TN form
    address: mailingAddress
  };
}

function collectTeamData() {
  const teams = [];
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  for (let i = 0; i < teamCount; i++) {
    const teamName = sessionStorage.getItem(`tn_team_name_${i+1}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i+1}`);
    const teamOption = sessionStorage.getItem(`tn_team_option_${i+1}`);
    
    if (teamName) {
      teams.push({
        name: teamName,
        category: teamCategory,
        option: teamOption,
        index: i
      });
    }
  }
  
  return teams;
}

function collectRaceDayData() {
  // TN form stores race day data as 'tn_race_day', not 'race_day_arrangement'
  const raceDayData = JSON.parse(sessionStorage.getItem('tn_race_day') || '{}');
  
  const items = [];
  if (raceDayData.marqueeQty > 0) {
    items.push({ code: 'marquee', qty: raceDayData.marqueeQty });
  }
  if (raceDayData.steerWithQty > 0) {
    items.push({ code: 'steer_with', qty: raceDayData.steerWithQty });
  }
  if (raceDayData.steerWithoutQty > 0) {
    items.push({ code: 'steer_without', qty: raceDayData.steerWithoutQty });
  }
  if (raceDayData.junkBoatQty > 0) {
    items.push({ 
      code: 'junk_boat', 
      qty: raceDayData.junkBoatQty,
      boat_no: raceDayData.junkBoatNo 
    });
  }
  if (raceDayData.speedboatQty > 0) {
    items.push({ 
      code: 'speed_boat', 
      qty: raceDayData.speedboatQty,
      boat_no: raceDayData.speedBoatNo 
    });
  }
  
  return items;
}

function collectPackageData() {
  const packages = [];
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  for (let i = 0; i < teamCount; i++) {
    const teamOption = sessionStorage.getItem(`tn_team_option_${i+1}`);
    if (teamOption) {
      packages.push({ 
        package_id: teamOption === 'opt1' ? 'option_1' : 'option_2', 
        qty: 1 
      });
    }
  }
  
  return packages;
}

function collectManagerData() {
  const managers = [];
  
  // Manager 1 (required)
  const manager1Name = sessionStorage.getItem('tn_manager1_name');
  const manager1Phone = sessionStorage.getItem('tn_manager1_phone');
  const manager1Email = sessionStorage.getItem('tn_manager1_email');
  
  if (manager1Name) {
    managers.push({
      name: manager1Name,
      mobile: manager1Phone || '',
      email: manager1Email || ''
    });
  }
  
  // Manager 2 (required)
  const manager2Name = sessionStorage.getItem('tn_manager2_name');
  const manager2Phone = sessionStorage.getItem('tn_manager2_phone');
  const manager2Email = sessionStorage.getItem('tn_manager2_email');
  
  if (manager2Name) {
    managers.push({
      name: manager2Name,
      mobile: manager2Phone || '',
      email: manager2Email || ''
    });
  }
  
  // Manager 3 (optional)
  const manager3Name = sessionStorage.getItem('tn_manager3_name');
  const manager3Phone = sessionStorage.getItem('tn_manager3_phone');
  const manager3Email = sessionStorage.getItem('tn_manager3_email');
  
  if (manager3Name) {
    managers.push({
      name: manager3Name,
      mobile: manager3Phone || '',
      email: manager3Email || ''
    });
  }
  
  return managers;
}

/**
 * Submit TN form
 */
async function submitTNForm() {
  try {
    // Collect data
    const contact = collectContactData();
    const teams = collectTeamData();
    const managers = collectManagerData();
    const raceDay = collectRaceDayData();
    const practice = buildTNPracticePayload();
    const packages = collectPackageData();
    
    // Get race category from step 1
    const raceCategory = sessionStorage.getItem('tn_race_category') || 'mixed_open';
    const teamCount = teams.length; // Use actual team count from collected data
    const opt1Count = teams.filter(t => t.option === 'opt1').length; // Calculate from actual teams
    const opt2Count = teams.filter(t => t.option === 'opt2').length; // Calculate from actual teams
    
    // Build payload in server-expected format
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
      team_names: teams.map(t => t.name),
      team_options: teams.map(t => t.option),
      managers: managers,
      race_day: raceDay.length > 0 ? {
        marqueeQty: raceDay.find(r => r.code === 'marquee')?.qty || 0,
        steerWithQty: raceDay.find(r => r.code === 'steer_with')?.qty || 0,
        steerWithoutQty: raceDay.find(r => r.code === 'steer_without')?.qty || 0,
        junkBoatQty: raceDay.find(r => r.code === 'junk_boat')?.qty || 0,
        junkBoatNo: raceDay.find(r => r.code === 'junk_boat')?.boat_no || '',
        speedboatQty: raceDay.find(r => r.code === 'speed_boat')?.qty || 0,
        speedBoatNo: raceDay.find(r => r.code === 'speed_boat')?.boat_no || ''
      } : null,
      practice: practice
    };
    
    console.log('🎯 submitTNForm: Payload structure:', payload);
    console.log('🎯 submitTNForm: Payload details:', {
      client_tx_id: payload.client_tx_id,
      eventShortRef: payload.eventShortRef,
      category: payload.category,
      season: payload.season,
      org_name: payload.org_name,
      team_names: payload.team_names,
      team_options: payload.team_options,
      managers: payload.managers,
      race_day: payload.race_day,
      practice: payload.practice
    });
    
    // Validate payload - simple validation for our payload structure
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
    
    if (errors.length > 0) {
      showError(errors.join(', '));
      return;
    }
    
    // Submit using Supabase Edge Function
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Submission timeout after 30 seconds')), 30000)
    );
    
    const submissionPromise = sb.functions.invoke('submit_registration', {
      body: payload
    });
    
    const { data, error } = await Promise.race([submissionPromise, timeoutPromise]);
    
    if (error) {
      console.error('Edge Function error:', error);
      console.error('Error message:', error.message);
      console.error('Error context:', error.context);
      
      // Handle timeout specifically
      if (error.message && error.message.includes('timeout')) {
        showError('Submission timed out. Please try again or contact support if the issue persists.');
        return;
      }
      
      // Make a direct fetch to get the actual error details
      try {
        const response = await fetch('https://khqarcvszewerjckmtpg.supabase.co/functions/v1/submit_registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY'}`,
            'apikey': window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY'
          },
          body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        console.error('Direct fetch response status:', response.status);
        console.error('Direct fetch response body:', responseText);
        
        // Try to parse as JSON
        try {
          const errorData = JSON.parse(responseText);
          console.error('Parsed error data:', errorData);
        } catch (parseError) {
          console.error('Error response is not valid JSON');
        }
      } catch (fetchError) {
        console.error('Direct fetch failed:', fetchError);
      }
      
      // Handle specific error cases
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('uniq_teamname_per_div_season_norm')) {
          showError('One or more team names already exist for this division and season. Please choose different team names.');
        } else if (error.message.includes('uniq_registration_client_tx')) {
          showError('This registration has already been submitted. Please refresh the page to start a new registration.');
        } else {
          showError('Duplicate data detected. Please check your team names and try again.');
        }
      } else if (error.message && error.message.includes('Practice date is not on an allowed weekday')) {
        showError('One or more practice dates are not on allowed weekdays. Please select weekdays only.');
      } else if (error.message && error.message.includes('Practice date is before allowed window')) {
        showError('One or more practice dates are before the allowed practice window.');
      } else if (error.message && error.message.includes('Practice date is after allowed window')) {
        showError('One or more practice dates are after the allowed practice window.');
      } else {
        showError(`Submission failed: ${error.message || 'Unknown error'}`);
      }
      return;
    }
    
    if (data) {
      console.log('✅ Form submission successful!', data);
      const { registration_ids, team_codes } = data;
      
      // Create receipt with the first registration_id (for compatibility)
      const receipt = saveReceipt({ 
        registration_id: registration_ids?.[0], 
        team_codes, 
        email: contact.email 
      });
      
      showConfirmation(receipt);
    } else {
      console.log('⚠️ No data in response, but no error either');
      showError('No response received from server. Please try again.');
    }
    
  } catch (error) {
    console.error('Submission error:', error);
    showError('Submission failed. Please try again.');
  }
}


/**
 * Show error message
 */
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.style.display = 'block';
  }
}

// showConfirmation is imported from submit.js

// TN wizard initialization is now handled by event_bootstrap.js
// This file exports the initTNWizard function for use by the bootstrap

/**
 * TN Debug Tools (dev only)
 * Development-only debugging utilities for TN wizard testing
 */
if (window.__DEV__) {
  window.__DBG_TN = window.__DBG_TN || {};
  Object.assign(window.__DBG_TN, {
  /**
   * Capture DOM snapshot of current step (ids/classes only)
   * Returns pruned DOM tree for manual comparison with legacy
   */
  domSnapshot() {
    const wizardMount = document.getElementById('wizardMount');
    if (!wizardMount) {
      return { error: 'TN wizard not initialized' };
    }
    
    const snapshot = this._pruneElement(wizardMount);
    return {
      step: currentStep,
      timestamp: new Date().toISOString(),
      dom: snapshot
    };
  },
  
  /**
   * Prune element to show only structure (ids, classes, tag names)
   */
  _pruneElement(element) {
    if (!element) return null;
    
    const result = {
      tag: element.tagName?.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      children: []
    };
    
    // Only include children that have IDs, classes, or are form elements
    Array.from(element.children).forEach(child => {
      if (child.id || child.className || 
          ['input', 'select', 'textarea', 'button', 'form'].includes(child.tagName?.toLowerCase())) {
        result.children.push(this._pruneElement(child));
      }
    });
    
    return result;
  },
  
  /**
   * Get current step number
   */
  getCurrentStep() {
    return currentStep;
  },
  
  /**
   * Get session data for current step
   */
  getSessionData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tn_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    return data;
  },
  
  /**
   * Validate current step
   */
  validateCurrentStep() {
    try {
      return validateCurrentStep();
    } catch (error) {
      return { error: error.message };
    }
  },
  
  /**
   * Get performance metrics for step loading
   */
  getPerformanceMetrics() {
    if (window.performance && window.performance.getEntriesByType) {
      const navigation = window.performance.getEntriesByType('navigation')[0];
      const paint = window.performance.getEntriesByType('paint');
      
      return {
        pageLoad: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null
      };
    }
    return { error: 'Performance API not available' };
  },
  
  /**
   * Force load a specific step (for testing)
   */
  forceLoadStep(step) {
    if (step >= 1 && step <= totalSteps) {
      loadStep(step);
      return { success: true, step: step };
    }
    return { error: 'Invalid step number' };
  },
  
  /**
   * Clear all TN session data
   */
  clearSessionData() {
    const keys = Object.keys(localStorage);
    const tnKeys = keys.filter(k => k.startsWith('tn_'));
    tnKeys.forEach(k => localStorage.removeItem(k));
    return { cleared: tnKeys.length, keys: tnKeys };
  },
  
  /**
   * Get form state for current step
   */
  getFormState() {
    try {
      // Use the same payload structure as submitTNForm
      const contact = collectContactData();
      const teams = collectTeamData();
      const managers = collectManagerData();
      const raceDay = collectRaceDayData();
      const practice = buildTNPracticePayload();
      
      const raceCategory = sessionStorage.getItem('tn_race_category') || 'mixed_open';
      const teamCount = teams.length; // Use actual team count from collected data
      const opt1Count = teams.filter(t => t.option === 'opt1').length; // Calculate from actual teams
      const opt2Count = teams.filter(t => t.option === 'opt2').length; // Calculate from actual teams
      
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
        team_names: teams.map(t => t.name),
        team_options: teams.map(t => t.option),
        managers: managers,
        race_day: raceDay.length > 0 ? {
          marqueeQty: raceDay.find(r => r.code === 'marquee')?.qty || 0,
          steerWithQty: raceDay.find(r => r.code === 'steer_with')?.qty || 0,
          steerWithoutQty: raceDay.find(r => r.code === 'steer_without')?.qty || 0,
          junkBoatQty: raceDay.find(r => r.code === 'junk_boat')?.qty || 0,
          junkBoatNo: raceDay.find(r => r.code === 'junk_boat')?.boat_no || '',
          speedboatQty: raceDay.find(r => r.code === 'speed_boat')?.qty || 0,
          speedBoatNo: raceDay.find(r => r.code === 'speed_boat')?.boat_no || ''
        } : null,
        practice: practice
      };
      
      return { success: true, state: payload };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  /**
   * Simulate form submission (for testing)
   */
  simulateSubmission() {
    try {
      // Use the same payload structure as submitTNForm
      const contact = collectContactData();
      const teams = collectTeamData();
      const managers = collectManagerData();
      const raceDay = collectRaceDayData();
      const practice = buildTNPracticePayload();
      
      const raceCategory = sessionStorage.getItem('tn_race_category') || 'mixed_open';
      const teamCount = teams.length; // Use actual team count from collected data
      const opt1Count = teams.filter(t => t.option === 'opt1').length; // Calculate from actual teams
      const opt2Count = teams.filter(t => t.option === 'opt2').length; // Calculate from actual teams
      
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
        team_names: teams.map(t => t.name),
        team_options: teams.map(t => t.option),
        managers: managers,
        race_day: raceDay.length > 0 ? {
          marqueeQty: raceDay.find(r => r.code === 'marquee')?.qty || 0,
          steerWithQty: raceDay.find(r => r.code === 'steer_with')?.qty || 0,
          steerWithoutQty: raceDay.find(r => r.code === 'steer_without')?.qty || 0,
          junkBoatQty: raceDay.find(r => r.code === 'junk_boat')?.qty || 0,
          junkBoatNo: raceDay.find(r => r.code === 'junk_boat')?.boat_no || '',
          speedboatQty: raceDay.find(r => r.code === 'speed_boat')?.qty || 0,
          speedBoatNo: raceDay.find(r => r.code === 'speed_boat')?.boat_no || ''
        } : null,
        practice: practice
      };
      
      const errors = validateTNState(payload);
      return {
        success: errors.length === 0,
        state: payload,
        errors: errors
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Test payload structure with sample data
   */
  testPayloadStructure() {
    console.log('🧪 Testing TN Payload Structure...');
    
    // Save current sessionStorage data
    const originalData = {};
    const keys = ['tn_race_category', 'tn_team_count', 'tn_opt1_count', 'tn_opt2_count', 'tn_org_name', 'tn_mailing_address'];
    keys.forEach(key => {
      originalData[key] = sessionStorage.getItem(key);
    });
    
    // Set up test data
    sessionStorage.setItem('tn_race_category', 'mixed_open');
    sessionStorage.setItem('tn_team_count', '2');
    sessionStorage.setItem('tn_opt1_count', '1');
    sessionStorage.setItem('tn_opt2_count', '1');
    sessionStorage.setItem('tn_org_name', 'Test Organization');
    sessionStorage.setItem('tn_mailing_address', '123 Test Street, Test City');
    
    // Team data
    sessionStorage.setItem('tn_team_name_1', 'Test Team 1');
    sessionStorage.setItem('tn_team_category_1', 'mixed_open');
    sessionStorage.setItem('tn_team_option_1', 'opt1');
    sessionStorage.setItem('tn_team_name_2', 'Test Team 2');
    sessionStorage.setItem('tn_team_category_2', 'mixed_open');
    sessionStorage.setItem('tn_team_option_2', 'opt2');
    
    // Manager data
    sessionStorage.setItem('tn_manager1_name', 'Manager One');
    sessionStorage.setItem('tn_manager1_phone', '123-456-7890');
    sessionStorage.setItem('tn_manager1_email', 'manager1@test.com');
    sessionStorage.setItem('tn_manager2_name', 'Manager Two');
    sessionStorage.setItem('tn_manager2_phone', '234-567-8901');
    sessionStorage.setItem('tn_manager2_email', 'manager2@test.com');
    sessionStorage.setItem('tn_manager3_name', 'Manager Three');
    sessionStorage.setItem('tn_manager3_phone', '345-678-9012');
    sessionStorage.setItem('tn_manager3_email', 'manager3@test.com');
    
    // Race day data
    const raceDayData = {
      marqueeQty: 1,
      steerWithQty: 0,
      steerWithoutQty: 1,
      junkBoatQty: 0,
      junkBoatNo: '',
      speedboatQty: 1,
      speedBoatNo: 'SB123'
    };
    sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
    
    // Practice data
    const practiceData = [
      {
        team_index: 0,
        dates: [
          { date: '2025-01-15', hours: 2, helpers: 'ST' },
          { date: '2025-01-22', hours: 1, helpers: 'S' }
        ],
        slotPrefs_2hr: { slot_pref_1: 'SAT2_0800_1000', slot_pref_2: 'SAT2_1000_1200' },
        slotPrefs_1hr: { slot_pref_1: 'SAT1_0800_0900' }
      },
      {
        team_index: 1,
        dates: [
          { date: '2025-01-16', hours: 2, helpers: 'T' }
        ],
        slotPrefs_2hr: { slot_pref_1: 'SUN2_0900_1100' }
      }
    ];
    sessionStorage.setItem('tn_practice_all_teams', JSON.stringify(practiceData));
    
    // Mock practice store functions
    const originalReadTeamRows = window.readTeamRows;
    const originalReadTeamRanks = window.readTeamRanks;
    
    window.readTeamRows = (teamKey) => {
      const teamIndex = parseInt(teamKey.replace('t', '')) - 1;
      const teamData = practiceData[teamIndex];
      return teamData ? teamData.dates.map(d => ({
        pref_date: d.date,
        duration_hours: d.hours,
        helper: d.helpers
      })) : [];
    };
    
    window.readTeamRanks = (teamKey) => {
      const teamIndex = parseInt(teamKey.replace('t', '')) - 1;
      const teamData = practiceData[teamIndex];
      if (!teamData) return [];
      
      const ranks = [];
      if (teamData.slotPrefs_2hr?.slot_pref_1) {
        ranks.push({ rank: 1, slot_code: teamData.slotPrefs_2hr.slot_pref_1 });
      }
      if (teamData.slotPrefs_2hr?.slot_pref_2) {
        ranks.push({ rank: 2, slot_code: teamData.slotPrefs_2hr.slot_pref_2 });
      }
      if (teamData.slotPrefs_1hr?.slot_pref_1) {
        ranks.push({ rank: 3, slot_code: teamData.slotPrefs_1hr.slot_pref_1 });
      }
      return ranks;
    };
    
    try {
      // Generate payload
      const payload = {
        client_tx_id: getClientTxId(),
        eventShortRef: getEventShortRef() || 'TN2025',
        category: 'mixed_open',
        season: 2025,
        org_name: 'Test Organization',
        org_address: '123 Test Street, Test City',
        counts: {
          num_teams: 2,
          num_teams_opt1: 1,
          num_teams_opt2: 1
        },
        team_names: ['Test Team 1', 'Test Team 2'],
        team_options: ['opt1', 'opt2'],
        managers: [
          { name: 'Manager One', mobile: '123-456-7890', email: 'manager1@test.com' },
          { name: 'Manager Two', mobile: '234-567-8901', email: 'manager2@test.com' },
          { name: 'Manager Three', mobile: '345-678-9012', email: 'manager3@test.com' }
        ],
        race_day: {
          marqueeQty: 1,
          steerWithQty: 0,
          steerWithoutQty: 1,
          junkBoatQty: 0,
          junkBoatNo: '',
          speedboatQty: 1,
          speedBoatNo: 'SB123'
        },
        practice: {
          teams: [
            {
              team_key: 't1',
              dates: [
                { pref_date: '2025-01-15', duration_hours: 2, helper: 'ST' },
                { pref_date: '2025-01-22', duration_hours: 1, helper: 'S' }
              ],
              slot_ranks: [
                { rank: 1, slot_code: 'SAT2_0800_1000' },
                { rank: 2, slot_code: 'SAT2_1000_1200' },
                { rank: 3, slot_code: 'SAT1_0800_0900' }
              ]
            },
            {
              team_key: 't2',
              dates: [
                { pref_date: '2025-01-16', duration_hours: 2, helper: 'T' }
              ],
              slot_ranks: [
                { rank: 1, slot_code: 'SUN2_0900_1100' }
              ]
            }
          ]
        }
      };
      
      console.log('🧪 Generated Payload:', JSON.stringify(payload, null, 2));
      
      // Validate payload structure
      const validation = {
        hasClientTxId: !!payload.client_tx_id,
        hasEventShortRef: !!payload.eventShortRef,
        hasCategory: !!payload.category,
        hasSeason: typeof payload.season === 'number',
        hasOrgName: !!payload.org_name,
        hasOrgAddress: !!payload.org_address,
        hasCounts: !!payload.counts && typeof payload.counts.num_teams === 'number',
        hasTeamNames: Array.isArray(payload.team_names) && payload.team_names.length > 0,
        hasTeamOptions: Array.isArray(payload.team_options) && payload.team_options.length > 0,
        hasManagers: Array.isArray(payload.managers) && payload.managers.length > 0,
        hasRaceDay: payload.race_day === null || (typeof payload.race_day === 'object'),
        hasPractice: !!payload.practice && typeof payload.practice === 'object' && Array.isArray(payload.practice.teams)
      };
      
      console.log('🧪 Validation Results:', validation);
      
      const allValid = Object.values(validation).every(v => v === true);
      
      // Restore original data
      keys.forEach(key => {
        if (originalData[key] !== null) {
          sessionStorage.setItem(key, originalData[key]);
        } else {
          sessionStorage.removeItem(key);
        }
      });
      
      // Restore original functions
      if (originalReadTeamRows) window.readTeamRows = originalReadTeamRows;
      if (originalReadTeamRanks) window.readTeamRanks = originalReadTeamRanks;
      
      return {
        success: allValid,
        payload: payload,
        validation: validation,
        message: allValid ? '✅ Payload structure is valid!' : '❌ Payload structure has issues'
      };
      
    } catch (error) {
      // Restore original data
      keys.forEach(key => {
        if (originalData[key] !== null) {
          sessionStorage.setItem(key, originalData[key]);
        } else {
          sessionStorage.removeItem(key);
        }
      });
      
      // Restore original functions
      if (originalReadTeamRows) window.readTeamRows = originalReadTeamRows;
      if (originalReadTeamRanks) window.readTeamRanks = originalReadTeamRanks;
      
      return { error: error.message };
    }
  }
  });
}

// Expose test functions after they're all defined
// This runs immediately when the script loads, ensuring functions are available in console
if (typeof window !== 'undefined') {
  window.testQuickSubmit = testQuickSubmit;
  window.testQuickSubmitSingle = testQuickSubmitSingle;
  window.fillSingleTeamForSubmission = fillSingleTeamForSubmission;
  window.fillMultipleTeamsForSubmission = fillMultipleTeamsForSubmission;
  window.testSubmissionWithCurrentData = testSubmissionWithCurrentData;
  
  console.log('✅ Quick test functions loaded and ready!');
  console.log('   Run testQuickSubmitSingle() or testQuickSubmit() in console to test');
}
