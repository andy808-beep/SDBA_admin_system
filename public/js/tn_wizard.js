/**
 * TN Legacy Wizard Implementation
 * Restores legacy multi-step form behavior with exact visual compatibility
 */

import { TN_SELECTORS, collectCompleteTNState, validateTNState } from './tn_map.js';
import { sb } from '../supabase_config.js';

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
  
  // Create stepper HTML
  stepper.innerHTML = `
    <div class="stepper-container">
      <div class="stepper-progress">
        <div class="stepper-bar" id="stepperBar"></div>
      </div>
      <div class="stepper-steps">
        <div class="step" data-step="1">
          <div class="step-number">1</div>
          <div class="step-label">Category</div>
        </div>
        <div class="step" data-step="2">
          <div class="step-number">2</div>
          <div class="step-label">Team Info</div>
        </div>
        <div class="step" data-step="3">
          <div class="step-number">3</div>
          <div class="step-label">Race Day</div>
        </div>
        <div class="step" data-step="4">
          <div class="step-number">4</div>
          <div class="step-label">Practice</div>
        </div>
        <div class="step" data-step="5">
          <div class="step-number">5</div>
          <div class="step-label">Summary</div>
        </div>
      </div>
    </div>
  `;
  
  // Add stepper styles
  const style = document.createElement('style');
  style.textContent = `
    .stepper-container {
      margin-bottom: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .stepper-progress {
      position: relative;
      height: 4px;
      background: #e9ecef;
      border-radius: 2px;
      margin-bottom: 1rem;
    }
    .stepper-bar {
      height: 100%;
      background: #0f6ec7;
      border-radius: 2px;
      transition: width 0.3s ease;
      width: 0%;
    }
    .stepper-steps {
      display: flex;
      justify-content: space-between;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }
    .step.active {
      opacity: 1;
    }
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e9ecef;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .step.active .step-number {
      background: #0f6ec7;
      color: white;
    }
    .step-label {
      font-size: 0.85rem;
      text-align: center;
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
  
  // Update progress bar
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const bar = stepper.querySelector('#stepperBar');
  if (bar) {
    bar.style.width = `${progress}%`;
  }
  
  // Update step states
  const steps = stepper.querySelectorAll('.step');
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.toggle('active', stepNum === currentStep);
    step.classList.toggle('completed', stepNum < currentStep);
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
        console.log('🎯 initStep1: Validation passed, proceeding to step 2');
        loadStepContent(2);
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
          packageBox.style.border = '2px solid #90EE90';
          packageBox.style.boxShadow = '0 0 0 1px #90EE90';
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
    loadStepContent(1);
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
      loadStepContent(1);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextToStep3');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('🎯 initStep2: Next button clicked, validating step 2');
      
      if (validateStep2()) {
        console.log('🎯 initStep2: Validation passed, proceeding to step 3');
        loadStepContent(3);
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
    
    if (optionEl && optionEl.value) {
      sessionStorage.setItem(`tn_team_option_${i}`, optionEl.value);
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
      loadStepContent(2);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextToStep4');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('🎯 initStep3: Next button clicked, validating step 3');
      
      if (validateStep3()) {
        console.log('🎯 initStep3: Validation passed, proceeding to step 4');
        loadStepContent(4);
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
  
  // Load team selector
  initTeamSelector();
  
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
      windowStart: p.practice_start_date || p.window_start,
      windowEnd:   p.practice_end_date   || p.window_end,
      allowedWeekdays: p.allowed_weekdays || [1,2,3,4,5,6,0]
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
  const startDate = options.windowStart || practiceConfig.practice_start_date;
  const endDate = options.windowEnd || practiceConfig.practice_end_date;
  const allowedWeekdays = options.allowedWeekdays || practiceConfig.allowed_weekdays || [1,2,3,4,5,6,0];
  
  console.log('createTNCalendar: Using dates:', { startDate, endDate, allowedWeekdays });
  
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
  const html = `
    <label class="day-checkbox">
      <input type="checkbox" data-date="${dateStr}" />
      <span class="day-number">${day.day}</span>
    </label>
    <div class="dropdowns hide">
      <select class="duration">
        <option value="1">1h</option>
        <option value="2">2h</option>
      </select>
      <select class="helpers">
        <option value="">No helpers</option>
        <option value="S">S</option>
        <option value="T">T</option>
        <option value="ST">ST</option>
      </select>
    </div>
  `;
  console.log(`createDayContent: Generated HTML for day ${day.day}:`, html);
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
      
      if (checkbox.checked) {
        dropdowns.classList.remove('hide');
      } else {
        dropdowns.classList.add('hide');
        // Clear dropdown values when unchecked
        dropdowns.querySelectorAll('select').forEach(select => {
          select.value = '';
        });
      }
    }
  });
  
  // Add event delegation for dropdown changes to update summary
  container.addEventListener('change', (event) => {
    if (event.target.classList.contains('duration') || event.target.classList.contains('helpers')) {
      updatePracticeSummary();
    }
  });
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
      border: 2px solid #90EE90 !important;
      box-shadow: 0 0 0 1px #90EE90 !important;
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
  selectIds.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
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
  }
  
  // Handle team selection change
  teamSelect.addEventListener('change', () => {
    const selectedIndex = parseInt(teamSelect.value, 10);
    const teamName = teamNames[selectedIndex] || `Team ${selectedIndex + 1}`;
    teamNameFields.textContent = `Now scheduling: ${teamName}`;
  });
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
  // Load basic info
  const orgName = sessionStorage.getItem('tn_org_name');
  const category = sessionStorage.getItem('tn_category');
  
  // Update summary elements
  const sumOrg = document.getElementById('sumOrg');
  if (sumOrg && orgName) {
    sumOrg.textContent = orgName;
  }
  
  const sumCategory = document.getElementById('sumCategory');
  if (sumCategory && category) {
    sumCategory.textContent = category;
  }
  
  // Load team data
  loadTeamSummary();
  
  // Load race day data
  loadRaceDaySummary();
  
  // Load practice data
  loadPracticeSummary();
}

/**
 * Load team summary data
 */
function loadTeamSummary() {
  const teamsTbody = document.getElementById('teamsTbody');
  if (!teamsTbody) return;
  
  const teamNames = [];
  for (let i = 1; i <= 10; i++) {
    const name = sessionStorage.getItem(`tn_team_name_${i}`);
    if (name) {
      teamNames.push(name);
    }
  }
  
  if (teamNames.length === 0) {
    teamsTbody.innerHTML = '<tr><td colspan="3" class="muted">No teams</td></tr>';
  } else {
    teamsTbody.innerHTML = '';
    teamNames.forEach((name, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>Option 1</td>
      `;
      teamsTbody.appendChild(row);
    });
  }
}

/**
 * Load race day summary data
 */
function loadRaceDaySummary() {
  // This would load race day arrangement data
  // For now, show placeholder
  const raceDayGrid = document.getElementById('raceDayGrid');
  if (raceDayGrid) {
    // Update race day summary elements
    const sumMarquee = document.getElementById('sumMarquee');
    const sumSteerWith = document.getElementById('sumSteerWith');
    const sumSteerWithout = document.getElementById('sumSteerWithout');
    const sumJunk = document.getElementById('sumJunk');
    const sumSpeed = document.getElementById('sumSpeed');
    
    if (sumMarquee) sumMarquee.textContent = '0';
    if (sumSteerWith) sumSteerWith.textContent = '0';
    if (sumSteerWithout) sumSteerWithout.textContent = '0';
    if (sumJunk) sumJunk.textContent = '—';
    if (sumSpeed) sumSpeed.textContent = '—';
  }
}

/**
 * Load practice summary data
 */
function loadPracticeSummary() {
  const perTeamPracticeSummary = document.getElementById('perTeamPracticeSummary');
  if (perTeamPracticeSummary) {
    perTeamPracticeSummary.innerHTML = '<p class="muted">Practice booking data will be displayed here</p>';
  }
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
  
  // Practice is optional, so always valid
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
 * Save step 4 data
 */
function saveStep4Data() {
  const practiceData = {
    slotPrefs_2hr: {
      slot_pref_1: document.getElementById('slotPref2h_1')?.value || '',
      slot_pref_2: document.getElementById('slotPref2h_2')?.value || '',
      slot_pref_3: document.getElementById('slotPref2h_3')?.value || ''
    },
    slotPrefs_1hr: {
      slot_pref_1: document.getElementById('slotPref1h_1')?.value || '',
      slot_pref_2: document.getElementById('slotPref1h_2')?.value || '',
      slot_pref_3: document.getElementById('slotPref1h_3')?.value || ''
    }
  };
  
  sessionStorage.setItem('tn_practice', JSON.stringify(practiceData));
}

/**
 * Submit TN form
 */
async function submitTNForm() {
  try {
    // Collect complete state
    const state = collectCompleteTNState();
    
    // Validate state
    const errors = validateTNState(state);
    if (errors.length > 0) {
      showError(errors.join(', '));
      return;
    }
    
    // Submit to Edge Function
    const response = await fetch('/functions/v1/submit_registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_short_ref: 'tn',
        client_tx_id: generateClientTxId(),
        ...state
      })
    });
    
    if (!response.ok) {
      throw new Error(`Submission failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Show confirmation
    showConfirmation(result);
    
  } catch (error) {
    console.error('Submission error:', error);
    showError('Submission failed. Please try again.');
  }
}

/**
 * Generate client transaction ID
 */
function generateClientTxId() {
  return `tn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

/**
 * Show confirmation
 */
function showConfirmation(result) {
  const confirmation = document.getElementById('confirmation');
  if (confirmation) {
    confirmation.style.display = 'block';
    confirmation.innerHTML = `
      <h2>Registration Successful!</h2>
      <p><strong>Registration ID:</strong> ${result.registration_id}</p>
      <p><strong>Team Codes:</strong> ${result.team_codes?.join(', ') || 'N/A'}</p>
      <div class="confirmation-actions">
        <button onclick="navigator.clipboard.writeText('${result.registration_id}')">Copy ID</button>
        <button onclick="window.print()">Print</button>
      </div>
    `;
  }
}

// TN wizard initialization is now handled by event_bootstrap.js
// This file exports the initTNWizard function for use by the bootstrap

/**
 * TN Debug Tools
 * Development-only debugging utilities for TN wizard testing
 */
window.__DBG_TN = {
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
      const state = collectCompleteTNState();
      return { success: true, state: state };
    } catch (error) {
      return { error: error.message };
    }
  },
  
  /**
   * Simulate form submission (for testing)
   */
  simulateSubmission() {
    try {
      const state = collectCompleteTNState();
      const errors = validateTNState(state);
      return {
        success: errors.length === 0,
        state: state,
        errors: errors
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};
