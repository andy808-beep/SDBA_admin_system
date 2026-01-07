/**
 * TN Legacy Wizard Implementation
 * Restores legacy multi-step form behavior with exact visual compatibility
 */

import { TN_SELECTORS, collectCompleteTNState, validateTNState } from './tn_map.js';
import { sb } from '../supabase_config.js';
import { getCurrentTeamKey, setCurrentTeamKey, readTeamRows, writeTeamRows, readTeamRanks, writeTeamRanks } from './tn_practice_store.js';
import { EDGE_URL, getClientTxId, getEventShortRef, postJSON, saveReceipt, showConfirmation, mapError } from './submit.js';
import { displaySuccessPage } from './success_handler.js';
import { 
  isValidEmail, 
  isValidHKPhone, 
  normalizeHKPhone, 
  extractLocalNumber,
  validateEmailField, 
  validatePhoneField,
  setupEmailValidation,
  setupPhoneValidation
} from './validation.js';
import { SafeDOM } from './safe-dom.js';
import { addBreadcrumb, logError } from './error-handler.js';
import Logger from './logger.js';
import { fetchWithErrorHandling } from './api-client.js';

// Expose practice store functions globally (needed for summary page)
window.__DBG_TN = window.__DBG_TN || {};
window.__DBG_TN.readTeamRows = readTeamRows;
window.__DBG_TN.readTeamRanks = readTeamRanks;
window.__DBG_TN.writeTeamRows = writeTeamRows;
window.__DBG_TN.writeTeamRanks = writeTeamRanks;

/**
 * Set up debug functions for testing (dev only)
 */
function setupDebugFunctions() {
  if (!window.__DEV__) return;
  
	Logger.debug('🎯 setupDebugFunctions: Setting up debug functions');
  
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
  
  // Note: TN store functions (readTeamRows, etc.) are exposed globally at top of file
  
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
  
	Logger.debug('🎯 Debug functions available:');
	Logger.debug('  - fillSingleTeam() - Fill form with 1 team');
	Logger.debug('  - fillMultipleTeams() - Fill form with 3 teams');
	Logger.debug('  - testSubmission() - Test submission with current data');
	Logger.debug('  - testQuickSubmit() - Fill form with 3 teams and submit immediately ⚡ (loaded at end of script)');
	Logger.debug('  - testQuickSubmitSingle() - Fill form with 1 team and submit immediately ⚡ (loaded at end of script)');
	Logger.debug('  - generateFreshTxId() - Generate fresh client_tx_id for testing');
}

// TN Wizard State
let currentStep = 0; // Start at step 0 (Race Info)
let totalSteps = 5;
let tnScope = null;
let wizardMount = null;
let stepper = null;
let isLoadingStep = false; // Guard flag to prevent concurrent loadStepContent() calls

// Expose wizard state globally for debugging
// CRITICAL: Use Object.defineProperty to ensure getters reference the correct variable
window.tnWizard = {};
Object.defineProperty(window.tnWizard, 'currentStep', {
  get: function() { 
    // Explicitly reference the module-scoped variable
    return currentStep;
  },
  set: function(value) {
    console.log(`🔧 window.tnWizard.currentStep setter: ${currentStep} → ${value}`);
    currentStep = value;
  },
  configurable: true,
  enumerable: true
});

Object.defineProperty(window.tnWizard, 'totalSteps', {
  get: function() { return totalSteps; },
  configurable: true,
  enumerable: true
});

Object.defineProperty(window.tnWizard, 'isLoadingStep', {
  get: function() { return isLoadingStep; },
  configurable: true,
  enumerable: true
});

Object.defineProperty(window.tnWizard, 'tnScope', {
  get: function() { return tnScope; },
  configurable: true,
  enumerable: true
});

Object.defineProperty(window.tnWizard, 'wizardMount', {
  get: function() { return wizardMount; },
  configurable: true,
  enumerable: true
});

Object.defineProperty(window.tnWizard, 'stepper', {
  get: function() { return stepper; },
  configurable: true,
  enumerable: true
});

// Expose setter for debugging (use with caution)
window.tnWizard.setCurrentStep = (step) => {
  console.log(`🔧 window.tnWizard.setCurrentStep(${step}) called - previous: ${currentStep}`);
  currentStep = step;
  console.log(`🔧 window.tnWizard.setCurrentStep: currentStep is now ${currentStep}`);
  // Also update the direct reference
  if (window.tnCurrentStep !== undefined) {
    window.tnCurrentStep = step;
  }
};

// Expose currentStep directly for console debugging
Object.defineProperty(window, 'tnCurrentStep', {
  get: () => currentStep,
  set: (value) => {
    console.log(`🔧 window.tnCurrentStep set to ${value} (previous: ${currentStep})`);
    currentStep = value;
  },
  configurable: true
});

// Expose isLoadingStep globally for button handlers
window.isLoadingStep = () => isLoadingStep;

/**
 * Get event short ref for auto-save
 */
function getTNEventShortRef() {
  return getEventShortRef() || window.__CONFIG?.event?.event_short_ref || window.__CONFIG?.event?.short_ref || 'TN2026';
}

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
	Logger.debug('🎯 checkAndCleanPreviewData: Fresh start requested, clearing all data');
    clearAllData();
  } else {
	Logger.debug('🎯 checkAndCleanPreviewData: Continuing with existing data (use ?fresh=true to start clean)');
  }
}

/**
 * Initialize TN Wizard
 * Sets up the multi-step wizard with legacy templates
 */
/**
 * Migrate old team name storage keys to new format
 */
function migrateOldTeamNameKeys() {
  console.log('🔄 Migrating old team name keys...');
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  for (let i = 1; i <= teamCount; i++) {
    const oldKey = `tn_team_name_${i}`;
    const newKey = `tn_team_name_en_${i}`;
    
    // If old key exists but new key doesn't, migrate
    const oldValue = sessionStorage.getItem(oldKey);
    const newValue = sessionStorage.getItem(newKey);
    
    if (oldValue && !newValue) {
      console.log(`  Migrating ${oldKey} -> ${newKey}: "${oldValue}"`);
      sessionStorage.setItem(newKey, oldValue);
    }
    
    // Remove old key
    if (oldValue) {
      sessionStorage.removeItem(oldKey);
    }
  }
  
  console.log('🔄 Migration complete');
}

export function initTNWizard() {
  console.log('🎯 Initializing TN Wizard with auto-save');
	Logger.debug('initTNWizard: Starting TN wizard initialization');
  
  tnScope = document.getElementById('tnScope');
  wizardMount = document.getElementById('wizardMount');
  stepper = document.getElementById('stepper');

	Logger.debug('initTNWizard: Containers found:', { tnScope: !!tnScope, wizardMount: !!wizardMount, stepper: !!stepper });

  if (!tnScope || !wizardMount) {
	Logger.error('TN wizard containers not found');
    return;
  }

  // Migrate old team name keys to new format
  migrateOldTeamNameKeys();

  // Check if we're starting fresh or continuing with existing data
  checkAndCleanPreviewData();

  // Initialize debug functions globally
  setupDebugFunctions();

  // Initialize step navigation
  initStepNavigation();
  
  // Auto-save integration
  const eventRef = getTNEventShortRef();
  
  // Try to restore from localStorage FIRST (before loading step 0)
  if (window.AutoSave) {
    const restoredDraft = AutoSave.restoreDraft(eventRef);
    
    if (restoredDraft && restoredDraft.step > 0) {
      // User accepted restoration - load their last step
      console.log('💾 Loading from restored draft, step:', restoredDraft.step);
      loadStep(restoredDraft.step);
    } else {
      // No draft or user declined - start fresh at step 0
      console.log('🎯 Starting fresh from step 0');
      loadStep(0);
    }
    
    // Start auto-save timer
    AutoSave.startAutoSave(eventRef, () => currentStep);
    
    // Mark dirty on any input change within TN scope
    document.addEventListener('input', (e) => {
      if (e.target.closest('#tnScope') && e.target.matches('input, select, textarea')) {
        AutoSave.markDirty();
      }
    });
    
    document.addEventListener('change', (e) => {
      if (e.target.closest('#tnScope') && e.target.matches('input[type="radio"], input[type="checkbox"]')) {
        AutoSave.markDirty();
      }
    });
    
    // Warn before leaving page if dirty
    window.addEventListener('beforeunload', (e) => {
      if (AutoSave.isDirty && currentStep > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  } else {
    // AutoSave not available, start normally
    console.log('⚠️ AutoSave not available, starting normally');
    loadStep(0);
  }
  
  // Set up deep linking
  initDeepLinking();
  
  // Listen for language changes to re-render entire current step
  window.addEventListener('languageChanged', () => {
    Logger.debug('TN Wizard: Language changed, re-rendering current step');
    initStepNavigation();
    updateStepper();
    // Re-render the current step content with new language
    loadStepContent(currentStep);
  });
  
	Logger.debug('TN Wizard initialized');
}

/**
 * Initialize step navigation and stepper
 */
function initStepNavigation() {
  if (!stepper) return;
  
  // Get step labels from i18n (with fallbacks)
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  const step1 = t('tnStep1', '1. Teams');
  const step2 = t('tnStep2', '2. Contacts');
  const step3 = t('tnStep3', '3. Race Day');
  const step4 = t('tnStep4', '4. Practice');
  const step5 = t('tnStep5', '5. Summary');
  
  // Hide stepper on step 0 (Race Info page)
  if (currentStep === 0) {
    stepper.innerHTML = '';
    stepper.style.display = 'none';
    return;
  }
  
  // Show stepper for steps 1-5
  stepper.style.display = 'block';
  
  // Create stepper HTML (matching WU/SC style)
  stepper.innerHTML = `
    <div class="stepper-container">
      <div class="stepper-steps">
        <div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1" data-i18n="tnStep1">${step1}</div>
        <div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2" data-i18n="tnStep2">${step2}</div>
        <div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3" data-i18n="tnStep3">${step3}</div>
        <div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4" data-i18n="tnStep4">${step4}</div>
        <div class="step ${currentStep >= 5 ? 'active' : ''}" data-step="5" data-i18n="tnStep5">${step5}</div>
      </div>
    </div>
  `;
  
  // Add stepper styles (scoped to #tnScope for proper theme variable inheritance)
  const style = document.createElement('style');
  style.textContent = `
    #tnScope .stepper-container {
      margin-bottom: 2rem;
    }
    #tnScope .stepper-steps {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    #tnScope .step {
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
    #tnScope .step.active {
      background: #f7b500 !important;
      color: white !important;
    }
    #tnScope .step.completed {
      background: #c79100 !important;
      color: white !important;
    }
    /* TN Theme Nav Buttons */
    #tnScope .nav-buttons button,
    #tnScope button[type="submit"],
    #tnScope button#nextBtn,
    #tnScope .btn,
    #tnScope .btn-primary,
    #tnScope button#nextToStep2,
    #tnScope button#nextToStep3,
    #tnScope button#nextToStep4 {
      background: #f7b500 !important;
      color: white !important;
      border: none !important;
      padding: 0.75rem 1.5rem !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
    }
    #tnScope .nav-buttons button:hover,
    #tnScope button[type="submit"]:hover,
    #tnScope button#nextBtn:hover,
    #tnScope .btn:hover,
    #tnScope .btn-primary:hover,
    #tnScope button#nextToStep2:hover,
    #tnScope button#nextToStep3:hover,
    #tnScope button#nextToStep4:hover {
      background: #c79100 !important;
    }
    #tnScope button#backBtn,
    #tnScope button#backToStep1,
    #tnScope button#backToStep2,
    #tnScope button#backToStep3 {
      background: #c79100 !important;
      color: white !important;
    }
    #tnScope button#backBtn:hover,
    #tnScope button#backToStep1:hover,
    #tnScope button#backToStep2:hover,
    #tnScope button#backToStep3:hover {
      background: #f7b500 !important;
    }
    /* Race Info Page (Step 0) Styles */
    #tnScope .race-info-page {
      max-width: 800px;
      margin: 0 auto;
    }
    #tnScope .race-info-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    #tnScope .race-info-card h2 {
      color: #c79100;
      margin: 0 0 1.5rem 0;
      font-size: 1.75rem;
      text-align: center;
      border-bottom: 2px solid #f7b500;
      padding-bottom: 0.75rem;
    }
    #tnScope .race-info-banner {
      margin-bottom: 2rem;
      border-radius: 8px;
      overflow: hidden;
    }
    #tnScope .banner-placeholder {
      background: linear-gradient(135deg, #fff8e6 0%, #f7b500 100%);
      height: 180px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #c79100;
      font-size: 1.1rem;
      gap: 0.5rem;
    }
    #tnScope .banner-placeholder span:first-child {
      font-size: 3rem;
    }
    #tnScope .race-info-details {
      margin-bottom: 2rem;
    }
    #tnScope .info-row {
      display: flex;
      padding: 0.875rem 0;
      border-bottom: 1px solid #eee;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    #tnScope .info-row:last-child {
      border-bottom: none;
    }
    #tnScope .info-label {
      font-weight: 600;
      color: #c79100;
      min-width: 180px;
      flex-shrink: 0;
    }
    #tnScope .info-value {
      color: #333;
      flex: 1;
    }
    #tnScope .appendix-row {
      padding-top: 1rem;
    }
    #tnScope .appendix-btn {
      background: #c79100 !important;
      color: white !important;
      padding: 0.5rem 1.25rem !important;
      font-size: 0.95rem !important;
      text-decoration: none !important;
      display: inline-block !important;
    }
    #tnScope .appendix-btn:hover {
      background: #f7b500 !important;
    }
    #tnScope .race-info-actions {
      text-align: center;
      padding-top: 1rem;
    }
    #tnScope #raceInfoNextBtn {
      padding: 0.875rem 2.5rem !important;
      font-size: 1.1rem !important;
    }
    @media (max-width: 600px) {
      #tnScope .info-row {
        flex-direction: column;
        align-items: flex-start;
      }
      #tnScope .info-label {
        min-width: auto;
        margin-bottom: 0.25rem;
      }
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
    // Allow step 0 (Race Info) through step 5
    if (step >= 0 && step <= totalSteps) {
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
 * Clear data for a specific step and all steps after it
 */
function clearStepDataFromHere(fromStep) {
  console.log('🚫 clearStepDataFromHere called with fromStep:', fromStep);
  console.log('🚫 This DELETES data! Disabled for back navigation - we want to restore data, not clear it!');
  return; // ← DISABLED: Don't clear data when going back - we want to restore it!
  
	Logger.debug(`🎯 Clearing data from step ${fromStep} onwards`);

  // Step 2: Team info, org, managers
  if (fromStep <= 2) {
    const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
    for (let i = 1; i <= teamCount; i++) {
      sessionStorage.removeItem(`tn_team_name_en_${i}`);
      sessionStorage.removeItem(`tn_team_name_tc_${i}`);
      sessionStorage.removeItem(`tn_team_category_${i}`);
      sessionStorage.removeItem(`tn_team_option_${i}`);
    }
    sessionStorage.removeItem('tn_org_name');
    sessionStorage.removeItem('tn_mailing_address');
    sessionStorage.removeItem('tn_manager1_name');
    sessionStorage.removeItem('tn_manager1_phone');
    sessionStorage.removeItem('tn_manager1_email');
    sessionStorage.removeItem('tn_manager2_name');
    sessionStorage.removeItem('tn_manager2_phone');
    sessionStorage.removeItem('tn_manager2_email');
    sessionStorage.removeItem('tn_manager3_name');
    sessionStorage.removeItem('tn_manager3_phone');
    sessionStorage.removeItem('tn_manager3_email');
  }

  // Step 3: Race day
  if (fromStep <= 3) {
    sessionStorage.removeItem('tn_race_day');
  }

  // Step 4: Practice data
  if (fromStep <= 4) {
    const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
    for (let i = 1; i <= teamCount; i++) {
      const teamKey = `t${i}`;
      sessionStorage.removeItem(`tn_practice_team_${teamKey}`);
      sessionStorage.removeItem(`tn_slot_ranks_${teamKey}`);
    }
  }

  // Step 5: Summary (no specific data to clear)

	Logger.debug(`✅ Cleared data from step ${fromStep} onwards`);
}

/**
 * Load a specific step
 */
async function loadStep(step) {
  // Allow step 0 (Race Info) through totalSteps
  if (step < 0 || step > totalSteps) {
	Logger.error(`Invalid step: ${step}`);
    return;
  }
  
  // CRITICAL: Set currentStep BEFORE any other operations
  // This ensures restoration and other code can check the correct step
  const previousStep = currentStep;
  currentStep = step;
  console.log(`🔧 loadStep: Set currentStep to ${currentStep} (step: ${step}, previous: ${previousStep})`);
  
  // Force update window.tnCurrentStep for debugging (direct reference)
  if (window.tnCurrentStep !== undefined) {
    window.tnCurrentStep = step;
  }
  
  // Update window.tnWizard for debugging (getter will reflect new value)
  if (window.tnWizard) {
    const getterValue = window.tnWizard.currentStep;
    console.log(`🔧 loadStep: window.tnWizard.currentStep getter = ${getterValue} (expected: ${step})`);
    if (getterValue !== step) {
      console.error(`❌ BUG: Getter mismatch in loadStep! currentStep=${currentStep}, getter=${getterValue}`);
    }
  }
  
  // Add breadcrumb for step navigation
  addBreadcrumb(`Navigating to step ${step}`, 'navigation', 'info', {
    step,
    previousStep: previousStep,
    wizard: 'tn'
  });
  
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
	Logger.debug(`loadStepContent: Loading step ${step}`);
  
  // Prevent concurrent calls - if already loading, skip this call
  if (isLoadingStep) {
    Logger.debug(`⏳ loadStepContent: Already loading, skipping step ${step}`);
    console.warn(`🚫 loadStepContent: BLOCKED - Already loading step ${isLoadingStep ? 'unknown' : currentStep}, requested step ${step}`);
    return;
  }
  
  isLoadingStep = true;
  
  try {
    if (!wizardMount) {
      Logger.error('loadStepContent: wizardMount not found');
      return;
    }
    
    // CRITICAL: Clear container BEFORE any other operations to prevent duplication
    wizardMount.innerHTML = '';
    Logger.debug(`🧹 loadStepContent: Cleared wizardMount container before loading step ${step}`);
    
    // Force parent container (tnScope) visibility
    if (tnScope) {
      tnScope.style.display = 'block';
      tnScope.style.visibility = 'visible';
      tnScope.style.opacity = '1';
    }
    
    // Force wizardMount visibility (ensure content is always visible)
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
    Logger.debug(`✅ loadStepContent: Container visibility forced for step ${step}`);
    
    // Handle step 0 (Race Info) specially - no template, generated content
    if (step === 0) {
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
    
    // Clone template content (container already cleared above)
    const content = template.content.cloneNode(true);
    wizardMount.appendChild(content);
    Logger.debug(`📦 loadStepContent: Cloned and appended template content for step ${step}`);
  
  // Ensure content is properly scoped within #tnScope
	Logger.debug('loadStepContent: Content loaded into #tnScope container');
  
  // Initialize step-specific functionality
  switch (step) {
    case 1:
      await initStep1();
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
  
  // Set up step-specific navigation (each step has its own button IDs)
  // Step-specific navigation is handled by initStepX() functions which call setupStepXNavigation()
  // For steps that use generic backBtn/nextBtn, we set them up here as fallback
  if (step === 3 || step === 4) {
    setupStepNavigation(); // Fallback for steps using generic buttons
  }
  
  // Update stepper to reflect current step
  updateStepper();
  
  // Ensure step container is visible
  if (wizardMount) {
    wizardMount.style.display = 'block';
  }
  
    // IMPORTANT: Update i18n translations for the newly loaded template content
    // This ensures all data-i18n elements are translated after template is cloned
    if (window.i18n && typeof window.i18n.updateUI === 'function') {
      Logger.debug('loadStepContent: Updating i18n translations for step', step);
      window.i18n.updateUI();
    }
  } finally {
    // Always reset loading flag, even if error occurs
    isLoadingStep = false;
  }
}

/**
 * Create Race Info content for Step 0
 * @returns {HTMLElement} Race info content container
 */
function createRaceInfoContent() {
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  
  // Get event config from window (loaded by config_loader)
  const eventConfig = window.eventConfig || window.__CONFIG || {};
  const event = eventConfig.event || {};
  
  // TN theme colors
  const primaryColor = '#f7b500'; // TN Gold
  const primaryDark = '#c79100';  // TN Dark Gold
  
  // Helper to get language-aware display (single language based on current i18n setting)
  const getLocalized = (en, tc) => {
    const currentLang = window.i18n ? (window.i18n.currentLang || window.i18n.getCurrentLanguage?.() || 'en') : 'en';
    // Select value based on current language (zh → tc, otherwise → en)
    const value = currentLang === 'zh' ? (tc || en || '') : (en || tc || '');
    return value || '—';
  };
  
  // Extract event data with placeholders for missing fields (language-aware)
  const eventName = getLocalized(event.event_long_name_en, event.event_long_name_tc);
  const eventDate = getLocalized(event.event_date_en, event.event_date_tc);
  const eventTime = getLocalized(event.event_time_en || 'TBA', event.event_time_tc || '待定');
  const eventVenue = getLocalized(event.event_location_en, event.event_location_tc);
  const raceCourse = getLocalized(event.course_length_en || 'Standard Course', event.course_length_tc || '標準賽道');
  const deadline = getLocalized(event.reg_deadline_date_en || 'TBA', event.reg_deadline_date_tc || '待定');
  const appendixLink = event.appendix_hyperlink || '#';
  
  const container = document.createElement('div');
  container.className = 'race-info-page';
  container.innerHTML = `
    <style>
      #tnScope .race-info-page {
        max-width: 800px;
        margin: 0 auto;
      }
      #tnScope .race-info-card {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      #tnScope .race-info-card h2 {
        color: ${primaryDark};
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        text-align: center;
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 0.75rem;
      }
      #tnScope .race-info-banner {
        margin-bottom: 2rem;
        border-radius: 8px;
        overflow: hidden;
      }
      #tnScope .banner-placeholder {
        background: linear-gradient(135deg, #fff8e6 0%, ${primaryColor} 100%);
        height: 180px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: ${primaryDark};
        font-size: 1.1rem;
        gap: 0.5rem;
      }
      #tnScope .banner-placeholder span:first-child {
        font-size: 3rem;
      }
      #tnScope .race-info-details {
        margin-bottom: 2rem;
      }
      #tnScope .info-row {
        display: flex;
        padding: 0.875rem 0;
        border-bottom: 1px solid #eee;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      #tnScope .info-row:last-child {
        border-bottom: none;
      }
      #tnScope .info-label {
        font-weight: 600;
        color: ${primaryDark};
        min-width: 180px;
        flex-shrink: 0;
      }
      #tnScope .info-value {
        color: #333;
        flex: 1;
      }
      #tnScope .appendix-row {
        padding-top: 1rem;
      }
      #tnScope .appendix-btn {
        background: ${primaryColor} !important;
        color: white !important;
        padding: 0.5rem 1.25rem !important;
        font-size: 0.95rem !important;
        text-decoration: none !important;
        display: inline-block !important;
        border-radius: 6px !important;
        border: none !important;
      }
      #tnScope .appendix-btn:hover {
        background: ${primaryDark} !important;
      }
      #tnScope .race-info-actions {
        margin-top: 2rem;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-top: 1rem;
      }
      
      #tnScope #eventsBtn {
        background: var(--theme-primary-dark, #c79100) !important;
        color: white !important;
        padding: 0.75rem 2rem !important;
        font-size: 1rem !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
      }
      
      #tnScope #eventsBtn:hover {
        background: var(--theme-primary, #f7b500) !important;
        opacity: 0.9;
      }
      
      #tnScope #raceInfoNextBtn {
        background: ${primaryColor} !important;
        color: white !important;
        padding: 0.75rem 2rem !important;
        font-size: 1rem !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
      }
      #tnScope #raceInfoNextBtn:hover {
        background: ${primaryDark} !important;
      }
      @media (max-width: 600px) {
        #tnScope .info-row {
          flex-direction: column;
          align-items: flex-start;
        }
        #tnScope .info-label {
          min-width: auto;
          margin-bottom: 0.25rem;
        }
      }
    </style>
    <div class="card race-info-card">
      <h2 data-i18n="raceInfoTitle">${t('raceInfoTitle', 'Race Info')}</h2>
      
      <!-- Banner placeholder -->
      <div class="race-info-banner">
        <div class="banner-placeholder">
          <span>🏁</span>
          <span>Banner Image Coming Soon</span>
        </div>
      </div>
      
      <!-- Event Details -->
      <div class="race-info-details">
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoEvent">${t('raceInfoEvent', 'Event')}</span>
          <span class="info-value">${eventName}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoDate">${t('raceInfoDate', 'Date')}</span>
          <span class="info-value">${eventDate}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoTime">${t('raceInfoTime', 'Time')}</span>
          <span class="info-value">${eventTime}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoVenue">${t('raceInfoVenue', 'Venue')}</span>
          <span class="info-value">${eventVenue}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoCourse">${t('raceInfoCourse', 'Race Course')}</span>
          <span class="info-value">${raceCourse}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label"><span class="deadline-label" data-i18n="raceInfoDeadline">${t('raceInfoDeadline', 'Application Deadline')}</span></span>
          <span class="info-value"><span class="deadline-date">${deadline}</span></span>
        </div>
        
        <div class="info-row appendix-row">
          <span class="info-label" data-i18n="raceInfoAppendix">${t('raceInfoAppendix', 'Registration Appendix')}</span>
          <a href="${appendixLink}" target="_blank" rel="noopener noreferrer" class="appendix-btn" data-i18n="raceInfoClickHere">${t('raceInfoClickHere', 'Click Here')}</a>
        </div>
      </div>
      
      <!-- Navigation Buttons -->
      <div class="race-info-actions">
        <button type="button" id="eventsBtn" class="btn-back">
          ← Events
        </button>
        <button type="button" id="raceInfoNextBtn" class="btn-next">
          ${t('raceInfoNext', 'Next')} →
        </button>
      </div>
    </div>
  `;
  
  return container;
}

/**
 * Initialize Step 0 - Race Info page
 */
function initStep0() {
  Logger.debug('🎯 initStep0: Initializing Race Info page');
  
  // Force parent container visibility
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
  }
  
  // Ensure wizardMount is visible
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
  }
  
  // Set up Next button handler
  const nextBtn = document.getElementById('raceInfoNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      Logger.debug('🎯 initStep0: Next button clicked, going to step 1');
      currentStep = 1;
      // Reinitialize stepper (to show it for step 1)
      initStepNavigation();
      loadStep(1);
    });
  }
  
  // Events button - go back to event selection
  const eventsBtn = document.getElementById('eventsBtn');
  if (eventsBtn) {
    eventsBtn.addEventListener('click', () => {
      Logger.debug('🎯 initStep0: Events button clicked, going back to event selection');
      window.location.href = '/register.html'; // Or your event selection page URL
    });
  }
}

/**
 * Initialize Step 1 - Category Selection
 */
async function initStep1() {
  console.log('\n'.repeat(3));
  console.log('═══════════════════════════════════════');
  console.log('TN STEP 1: DEEP DIAGNOSTIC');
  console.log('═══════════════════════════════════════');
  console.log('Time:', new Date().toISOString());
  
  // CHECKPOINT 1: Check if we're even loading Step 1
  console.log('\n[CHECKPOINT 1] initStep1() called');
  
  // CRITICAL: Inject Step 1 styles FIRST (package options, etc.)
  // This ensures styles are available when Step 1 loads, not when Step 4 loads
  addStep1Styles();
  
	Logger.debug('🎯 initStep1: Starting team count selection');
  
  // Force parent container visibility
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
  }
  
  // Ensure wizardMount is visible
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
  }
  
  // Find the teamCountSection from the template (or create fallback)
  let teamCountContainer = document.getElementById('teamCountSection');
  
  if (!teamCountContainer) {
    // Fallback: create if template didn't provide it
    Logger.warn('🎯 initStep1: teamCountSection not found in template, creating fallback');
    teamCountContainer = document.createElement('div');
    teamCountContainer.id = 'teamCountSection';
    const mount = document.getElementById('wizardMount');
    if (mount) {
      // Try to find the card container from template, or append to mount
      const cardContainer = mount.querySelector('.card');
      if (cardContainer) {
        cardContainer.appendChild(teamCountContainer);
      } else {
        mount.appendChild(teamCountContainer);
      }
    }
  }
  
  // Populate the container with team count selector
  createTeamCountSelector(teamCountContainer);
  
  // Set up team count change handler
  setupTeamCountHandler();
  
  // Restore previously selected team count if it exists (await to ensure fields are generated)
  await restoreTeamCountSelection();
  
  // CHECKPOINT 2: After step content loads
  setTimeout(() => {
    console.log('\n[CHECKPOINT 2] Step content loaded (after existing code)');
    console.log('wizardMount exists:', !!document.getElementById('wizardMount'));
    console.log('wizardMount HTML length:', document.getElementById('wizardMount')?.innerHTML?.length || 0);
    
    // CHECKPOINT 3: Check sessionStorage
    console.log('\n[CHECKPOINT 3] SessionStorage check:');
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugStorage('tn_');
    } else {
      console.log('  ⚠️  FieldRestoreUtility not available');
      // Manual dump
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.startsWith('tn_')) {
          keys.push({ key, value: sessionStorage.getItem(key) });
        }
      }
      keys.sort((a, b) => a.key.localeCompare(b.key));
      keys.forEach(({ key, value }) => {
        console.log(`  ${key}: "${value}"`);
      });
    }
    
    // CHECKPOINT 4: Check if team count field exists
    const teamCountSelect = document.getElementById('teamCount');
    console.log('\n[CHECKPOINT 4] Team count field:');
    console.log('  Field exists:', !!teamCountSelect);
    if (teamCountSelect) {
      console.log('  Field value:', teamCountSelect.value);
      console.log('  Field options:', Array.from(teamCountSelect.options).map(o => o.value));
    }
    
    // CHECKPOINT 5: Try to restore team count
    const savedCount = sessionStorage.getItem('tn_team_count');
    console.log('\n[CHECKPOINT 5] Attempting team count restoration:');
    console.log('  Saved count:', savedCount);
    
    if (savedCount && teamCountSelect) {
      console.log('  ✓ Both exist, setting value...');
      teamCountSelect.value = savedCount;
      console.log('  Field value after set:', teamCountSelect.value);
      
      // Trigger change
      console.log('  Triggering change event...');
      const changeEvent = new Event('change', { bubbles: true });
      teamCountSelect.dispatchEvent(changeEvent);
      
      // CHECKPOINT 6: Check if team fields rendered
      setTimeout(() => {
        console.log('\n[CHECKPOINT 6] After change event (300ms delay):');
        
        const teamCount = parseInt(savedCount, 10);
        console.log(`  Looking for ${teamCount} team fields...`);
        
        for (let i = 1; i <= teamCount; i++) {
          const nameField = document.getElementById(`teamNameEn${i}`);
          const categoryField = document.getElementById(`teamCategory${i}`);
          
          console.log(`\n  Team ${i}:`);
          console.log(`    teamNameEn${i} exists:`, !!nameField);
          console.log(`    teamCategory${i} exists:`, !!categoryField);
          
          if (nameField) {
            console.log(`    teamNameEn${i} value:`, nameField.value);
            console.log(`    teamNameEn${i} type:`, nameField.type);
            console.log(`    teamNameEn${i} tagName:`, nameField.tagName);
          }
          
          // Try to restore
          const savedName = sessionStorage.getItem(`tn_team_name_en_${i}`);
          console.log(`    Saved name: "${savedName}"`);
          
          if (nameField && savedName) {
            console.log(`    Setting name...`);
            const beforeValue = nameField.value;
            nameField.value = savedName;
            console.log(`    Name field value before set: "${beforeValue}"`);
            console.log(`    Name field value after set: "${nameField.value}"`);
            
            // Force update
            nameField.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`    After input event: "${nameField.value}"`);
          }
        }
        
        // CHECKPOINT 7: Full DOM dump
        console.log('\n[CHECKPOINT 7] Full DOM state:');
        if (window.FieldRestoreUtility) {
          FieldRestoreUtility.debugDOM('wizardMount');
        } else {
          console.log('  ⚠️  FieldRestoreUtility not available for DOM dump');
          const container = document.getElementById('wizardMount');
          if (container) {
            const fields = container.querySelectorAll('input, select, textarea');
            console.log(`  Found ${fields.length} fields:`);
            fields.forEach(field => {
              const info = [];
              if (field.id) info.push(`id="${field.id}"`);
              if (field.name) info.push(`name="${field.name}"`);
              if (field.type) info.push(`type="${field.type}"`);
              if (field.value) info.push(`value="${field.value}"`);
              console.log(`  - ${field.tagName} [${info.join(', ')}]`);
            });
          }
        }
        
        console.log('\n═══════════════════════════════════════');
        console.log('END DIAGNOSTIC');
        console.log('═══════════════════════════════════════\n');
        
      }, 300);
    } else {
      console.log('  ✗ Missing saved count or field');
      if (!savedCount) console.log('    → No saved count in sessionStorage');
      if (!teamCountSelect) console.log('    → teamCount field not in DOM');
      
      console.log('\n═══════════════════════════════════════');
      console.log('END DIAGNOSTIC (EARLY EXIT)');
      console.log('═══════════════════════════════════════\n');
    }
    
  }, 100);
  
  // Original restoration code (still runs in parallel)
  // Debug what we have
  console.log('\n=== TN STEP 1: RESTORE ===');
  if (window.FieldRestoreUtility) {
    FieldRestoreUtility.debugStorage('tn_');
  }
  
  // Restore team fields after they're generated
  // CRITICAL: Wait for fields to actually exist (not just a fixed timeout)
  // Fields take ~800ms to generate due to DB calls for categories/packages
  const savedCount = sessionStorage.getItem('tn_team_count');
  if (savedCount) {
    const teamCount = parseInt(savedCount, 10);
    if (teamCount > 0) {
      // Wait for generateTeamFields to complete by checking if fields exist
      // This prevents race condition where restoration runs before fields are created
      const waitForFields = async () => {
        const maxWait = 2000; // Maximum 2 seconds wait
        const checkInterval = 50; // Check every 50ms
        const startTime = Date.now();
        
        return new Promise((resolve) => {
          const checkFields = () => {
            // Check if first team field exists (indicates fields are generated)
            const firstField = document.getElementById('teamNameEn1');
            const elapsed = Date.now() - startTime;
            
            if (firstField) {
              Logger.debug(`🎯 initStep1: Team fields found after ${elapsed}ms, proceeding with restoration`);
              resolve();
            } else if (elapsed >= maxWait) {
              Logger.warn(`🎯 initStep1: Timeout waiting for team fields after ${elapsed}ms, proceeding anyway`);
              resolve(); // Resolve anyway to prevent hanging
            } else {
              setTimeout(checkFields, checkInterval);
            }
          };
          checkFields();
        });
      };
      
      // Wait for fields, then restore
      waitForFields().then(() => {
        restoreTNStep1Teams(teamCount);
      }).catch((error) => {
        Logger.error('🎯 initStep1: Error waiting for fields:', error);
        // Still try to restore even if wait failed
        restoreTNStep1Teams(teamCount);
      });
    }
  }
}

/**
 * Create team count selector
 */
function createTeamCountSelector(container) {
  // Use provided container (from template) or find existing one
  if (!container) {
    container = document.getElementById('teamCountSection');
  }
  
  if (!container) {
    Logger.error('🎯 createTeamCountSelector: No container provided and teamCountSection not found');
    return;
  }
  
  // Check if team count section already exists with fields - if so, don't recreate it
  const existingTeamFieldsContainer = document.getElementById('teamFieldsContainer');
  if (existingTeamFieldsContainer && existingTeamFieldsContainer.children.length > 0) {
    Logger.debug('🎯 createTeamCountSelector: Team fields already exist, skipping recreation');
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
  
  // Populate the container (don't clear - it's from the template)
  container.innerHTML = `
    <h2 data-i18n="selectTeamDetails" style="color: var(--theme-primary-dark, #c79100); margin-bottom: 0;">${t('selectTeamDetails')}</h2>
    <label for="teamCount" data-i18n="howManyTeamsQuestion" 
           style="display: inline-block; margin-bottom: 0; vertical-align: baseline; line-height: 1.5;">${t('howManyTeamsQuestion')}</label>
    <select id="teamCount" name="teamCount" required 
            style="display: inline-block; vertical-align: baseline; line-height: 1.5; margin-left: 0.5rem;">
      <option value="" data-i18n="selectNumberOfTeams">${t('selectNumberOfTeams')}</option>
      ${teamOptions.join('')}
    </select>
    
    <div id="teamFieldsContainer" style="display: none;">
      <!-- Team fields will be generated here -->
    </div>
    <div id="formMsg" class="error-message" style="display: none;"></div>
    <div class="nav-buttons" id="step1Actions" style="display: none;">
      <button type="button" id="backToRaceInfo" data-i18n="backButton">← Back</button>
      <button type="button" id="nextToStep2" data-i18n="nextButton">Next →</button>
    </div>
  `;
  
	Logger.debug('🎯 createTeamCountSelector: Team count selector populated in template container');
}

/**
 * Set up team count change handler
 */
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
      nextButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🔜 Step 1: Next button (nextToStep2) clicked, validating step 1');
        
        // Validate all team information before proceeding
        if (validateStep1()) {
          console.log('✅ Step 1: Validation passed, saving data and proceeding to step 2');
          saveStep1Data();
          showStep(2); // Fire and forget - forward navigation less critical
        } else {
          console.log('⚠️ Step 1: Validation failed, staying on step 1');
        }
      });
      nextButton.dataset.handlerAttached = 'true';
    }
  }
  
  // Back button handler
  const backButton = document.getElementById('backToRaceInfo');
  if (backButton) {
    if (backButton.dataset.handlerAttached === 'true') {
      Logger.debug('🎯 setupTeamCountHandler: Back button handler already attached, skipping');
    } else {
      backButton.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-clicks while loading - check global flag
        const isCurrentlyLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
        if (this.disabled || isCurrentlyLoading) {
          console.log('⏳ Step 1: Back button disabled or loading in progress, skipping');
          console.log(`   - Button disabled: ${this.disabled}`);
          console.log(`   - Currently loading: ${isCurrentlyLoading}`);
          return;
        }
        
        // Debounce: Add minimum delay to prevent rapid clicks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check after debounce delay
        const stillLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
        if (stillLoading) {
          console.log('⏳ Step 1: Loading started during debounce, skipping');
          return;
        }
        
        this.disabled = true;
        console.log('🔒 Step 1: Back button disabled, starting navigation');
        
        try {
          console.log('🔙 Step 1: Back button clicked, returning to Race Info');
          await showStep(0); // Go back to Race Info page
          console.log('✅ Step 1: Navigation to step 0 completed');
        } catch (error) {
          console.error('❌ Step 1: Navigation error:', error);
          throw error;
        } finally {
          // Ensure button is re-enabled after a short delay
          setTimeout(() => {
            this.disabled = false;
            console.log('🔓 Step 1: Back button re-enabled');
          }, 200);
        }
      });
      backButton.dataset.handlerAttached = 'true';
    }
  }
  
  // Set up error clearing when user starts typing
  setupErrorClearing();
}

/**
 * Restore previously selected team count and regenerate fields
 */
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
    if (event.target.id && (event.target.id.startsWith('teamNameEn') || 
                           event.target.id.startsWith('teamNameTc') ||
                           event.target.id.startsWith('teamCategory') ||
                           event.target.id.startsWith('teamOption'))) {
      clearErrors();
      // Check for duplicates in real-time
      if (event.target.id.startsWith('teamNameEn') || event.target.id.startsWith('teamCategory')) {
        checkForDuplicateNames();
      }
    }
  });
  
  // Clear errors when any team field changes (for radio buttons)
  document.addEventListener('change', (event) => {
    if (event.target.id && (event.target.id.startsWith('teamNameEn') || 
                           event.target.id.startsWith('teamNameTc') ||
                           event.target.id.startsWith('teamCategory') ||
                           event.target.id.startsWith('teamOption'))) {
      clearErrors();
      // Check for duplicates in real-time
      if (event.target.id.startsWith('teamNameEn') || event.target.id.startsWith('teamCategory')) {
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
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);

    if (teamNameEn?.value?.trim() && teamCategory?.value) {
      teamData.push({
        index: i,
        name: teamNameEn.value.trim(),
        category: teamCategory.value,
        nameElement: teamNameEn
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
          // Use 'error' class for input fields, not 'field-error' (that's for error message divs only)
          team.nameElement.classList.add('error');
        });
      }
    });
  });
  
  // Show warning if duplicates found
  if (hasDuplicates) {
    const msgEl = document.getElementById('formMsg');
    if (msgEl) {
      const t = (key) => window.i18n ? window.i18n.t(key) : key;
      msgEl.textContent = t('duplicateTeamNamesWarning');
      msgEl.style.display = 'block';
      msgEl.style.background = '#fff3cd';
      msgEl.style.borderColor = '#ffeaa7';
      msgEl.style.color = '#856404';
    }
  }
}

// Legacy error functions removed - now using unified error system
// highlightField() and clearFieldHighlighting() replaced by errorSystem.showFieldError() and errorSystem.clearFormErrors()

/**
 * Generate team fields based on team count
 */
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
      .eq('event_short_ref', 'TN2026')
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
      .eq('event_short_ref', 'TN2026')
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
  
  // Set up team name change handlers to update Step 4 selector
  setupTeamNameChangeHandlers(teamCount);
}

/**
 * Set up handlers to update team selector in Step 4 when team names change in Step 1
 */
function setupTeamNameChangeHandlers(teamCount) {
  for (let i = 1; i <= teamCount; i++) {
    const nameField = document.getElementById(`teamNameEn${i}`);
    if (nameField) {
      // Update sessionStorage and refresh team selector when name changes
      nameField.addEventListener('blur', (e) => {
        const newName = e.target.value.trim();
        if (newName) {
          sessionStorage.setItem(`tn_team_name_en_${i}`, newName);
          // If we're on Step 4, update the team selector
          if (currentStep === 4) {
            populateTeamSelector();
          }
        }
      });
    }
  }
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
          
	Logger.debug(`🎯 Team ${i}: Category selected, showing entry options`);
        } else {
          // Hide entry option when category is cleared
          optionGroup.style.display = 'none';
          // Clear the option boxes
          optionBoxes.innerHTML = '';
	Logger.debug(`🎯 Team ${i}: Category cleared, hiding entry options`);
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
  
	Logger.debug(`🎯 Team ${teamIndex}: Showing packages for division ${divisionCode}:`, relevantPackages);
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Generate package boxes
  // XSS FIX: Escape package data (pkg.title_en, pkg.package_code) before inserting into HTML
  // Package data comes from config, but should be escaped as a defense-in-depth measure
  optionBoxes.innerHTML = relevantPackages.map((pkg, index) => {
    const safePackageCode = SafeDOM.escapeHtml(pkg.package_code);
    // Use localized package title if db-localization is available
    const packageTitle = window.getPackageTitle ? window.getPackageTitle(pkg) : pkg.title_en;
    const safeTitleEn = SafeDOM.escapeHtml(packageTitle);
    return `
    <div class="package-option" data-package-code="${safePackageCode}" data-team-index="${teamIndex}">
      <input type="radio" id="teamOption${teamIndex}_${index}" name="teamOption${teamIndex}" value="${safePackageCode}" required style="display: none;">
      <div class="package-box" data-option-index="${index}">
        <div class="package-header">
          <h4>${safeTitleEn}</h4>
          <div class="package-price">${t('hkDollar')}${pkg.listed_unit_price.toLocaleString()}</div>
        </div>
        <div class="package-details">
          <div class="package-item">
            <span data-i18n="practiceHours" data-i18n-params='{"hours":"${pkg.included_practice_hours_per_team}"}'>${t('practiceHours', { hours: pkg.included_practice_hours_per_team })}</span>
          </div>
          <div class="package-item">
            <span data-i18n="tShirts" data-i18n-params='{"qty":"${pkg.tees_qty}"}'>${t('tShirts', { qty: pkg.tees_qty })}</span>
          </div>
          <div class="package-item">
            <span data-i18n="paddedShortsQty" data-i18n-params='{"qty":"${pkg.padded_shorts_qty}"}'>${t('paddedShortsQty', { qty: pkg.padded_shorts_qty })}</span>
          </div>
          <div class="package-item">
            <span data-i18n="dryBagsQty" data-i18n-params='{"qty":"${pkg.dry_bag_qty}"}'>${t('dryBagsQty', { qty: pkg.dry_bag_qty })}</span>
          </div>
        </div>
        <div class="package-selection-indicator">
          <span class="selection-text" data-i18n="clickToSelect" style="font-weight: bold;">${t('clickToSelect')}</span>
        </div>
      </div>
    </div>
  `;
  }).join('');
  
  // Apply bold styling to all selection-text elements
  setTimeout(() => {
    const selectionTexts = optionBoxes.querySelectorAll('.selection-text');
    selectionTexts.forEach(text => {
      text.style.fontWeight = 'bold';
    });
  }, 0);
  
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
	Logger.debug(`🎯 Team ${teamIndex}: Package box ${index} clicked`);
      
      // Clear previous selections for this team
      const teamOptions = document.querySelectorAll(`[data-team-index="${teamIndex}"]`);
      teamOptions.forEach(option => {
        option.classList.remove('selected');
        const radio = option.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
        
        // Reset selection text
        const selectionText = option.querySelector('.selection-text');
        if (selectionText) {
          selectionText.textContent = window.i18n ? window.i18n.t('clickToSelect') : 'Click to select';
          selectionText.style.fontWeight = 'bold';
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
	Logger.debug(`🎯 Team ${teamIndex}: Radio button checked:`, radio.checked);
	Logger.debug(`🎯 Team ${teamIndex}: Radio button name:`, radio.name);
	Logger.debug(`🎯 Team ${teamIndex}: Radio button value:`, radio.value);
        
        // Update selection text
        const selectionText = packageOption.querySelector('.selection-text');
        if (selectionText) {
          selectionText.textContent = window.i18n ? window.i18n.t('selected') : 'Selected';
          selectionText.style.fontWeight = 'bold';
        }
        
        // Debug: Check if class was added
	Logger.debug(`🎯 Team ${teamIndex}: Package option classes:`, packageOption.className);
	Logger.debug(`🎯 Team ${teamIndex}: Package box element:`, packageOption.querySelector('.package-box'));
        
        // Force styling with inline styles as backup
        const packageBox = packageOption.querySelector('.package-box');
        if (packageBox) {
          packageBox.style.background = '#fff8e6';
          packageBox.style.border = '2px solid #f7b500';
          packageBox.style.boxShadow = '0 2px 8px rgba(247, 181, 0, 0.2)';
          packageBox.style.borderRadius = '12px';
	Logger.debug(`🎯 Team ${teamIndex}: Applied inline styles to package box`);
        }
        
        // Trigger change event for validation
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        
	Logger.debug(`🎯 Team ${teamIndex}: Selected package ${radio.value}`);
      }
    });
  });
}

/**
 * Initialize Step 2 - Team Information
 */
async function initStep2() {
	Logger.debug('🎯 initStep2: Starting team information step');
  
  // CRITICAL: Inject Step 2 styles FIRST (organization form, manager grid, etc.)
  // This ensures styles are available when Step 2 loads, not when Step 4 loads
  addStep2Styles();
  
  // Force parent container visibility
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
  }
  
  // Ensure wizardMount is visible
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
  }
  
  // Load team count from step 1
  const teamCount = sessionStorage.getItem('tn_team_count');
  if (!teamCount) {
	Logger.warn('🎯 initStep2: No team count found, redirecting to step 1');
    loadStep(1);
    return;
  }
  
  // Create organization and team manager form
  createOrganizationForm();
  
  // Load saved data if available (legacy function)
  loadOrganizationData();
  
  // Debug what we have
  console.log('\n=== TN STEP 2: RESTORE ===');
  if (window.FieldRestoreUtility) {
    FieldRestoreUtility.debugStorage('tn_');
  }
  
  // WAIT for DOM to be ready, then restore with FieldRestoreUtility
  setTimeout(() => {
    restoreTNStep2();
  }, 250);
}

/**
 * Create organization and team manager form
 */
function createOrganizationForm() {
  const container = document.getElementById('wizardMount');
  if (!container) return;
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  container.innerHTML = `
    <div class="organization-form">
      <h2 data-i18n="organizationManagerInfo">${t('organizationManagerInfo')}</h2>
      
      <!-- Organization Information -->
      <div class="form-section">
        <h3 data-i18n="organizationGroupInfo">${t('organizationGroupInfo')}</h3>
        <div class="form-group">
          <label for="orgName" data-i18n="organizationGroupNameShort">${t('organizationGroupNameShort')}</label>
          <input type="text" id="orgName" name="orgName" required 
                 placeholder="${t('enterOrgName')}" data-i18n-placeholder="enterOrgName" />
          <div class="field-error-message" id="error-orgName"></div>
        </div>
        
        <div class="form-group">
          <label for="orgAddress" data-i18n="addressLabel">${t('addressLabel')}</label>
          <textarea id="orgAddress" name="orgAddress" required rows="3"
                    placeholder="${t('enterCompleteAddress')}" data-i18n-placeholder="enterCompleteAddress"></textarea>
          <div class="field-error-message" id="error-orgAddress"></div>
        </div>
      </div>
      
      <!-- Team Manager 1 (Required) -->
      <div class="form-section">
        <h3 data-i18n="teamManager1Required">${t('teamManager1Required')}</h3>
        <div class="manager-grid">
          <div class="form-group">
            <label for="manager1Name" data-i18n="nameLabel">${t('nameLabel')}</label>
            <input type="text" id="manager1Name" name="manager1Name" required 
                   placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
            <div class="field-error-message" id="error-manager1Name"></div>
          </div>
          <div class="form-group">
            <label for="manager1Phone" data-i18n="phoneLabel">${t('phoneLabel')}</label>
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+852</span>
              <input type="tel" id="manager1Phone" name="manager1Phone" required 
                     placeholder="${t('eightDigitNumber')}" data-i18n-placeholder="eightDigitNumber" maxlength="8" inputmode="numeric" 
                     pattern="[0-9]{8}" />
            </div>
            <div class="field-error-message" id="error-manager1Phone"></div>
          </div>
          <div class="form-group">
            <label for="manager1Email" data-i18n="emailLabel">${t('emailLabel')}</label>
            <input type="email" id="manager1Email" name="manager1Email" required 
                   placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
            <div class="field-error-message" id="error-manager1Email"></div>
          </div>
        </div>
      </div>
      
      <!-- Team Manager 2 (Required) -->
      <div class="form-section">
        <h3 data-i18n="teamManager2Required">${t('teamManager2Required')}</h3>
        <div class="manager-grid">
          <div class="form-group">
            <label for="manager2Name" data-i18n="nameLabel">${t('nameLabel')}</label>
            <input type="text" id="manager2Name" name="manager2Name" required 
                   placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
            <div class="field-error-message" id="error-manager2Name"></div>
          </div>
          <div class="form-group">
            <label for="manager2Phone" data-i18n="phoneLabel">${t('phoneLabel')}</label>
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+852</span>
              <input type="tel" id="manager2Phone" name="manager2Phone" required 
                     placeholder="${t('eightDigitNumber')}" data-i18n-placeholder="eightDigitNumber" maxlength="8" inputmode="numeric" 
                     pattern="[0-9]{8}" />
            </div>
            <div class="field-error-message" id="error-manager2Phone"></div>
          </div>
          <div class="form-group">
            <label for="manager2Email" data-i18n="emailLabel">${t('emailLabel')}</label>
            <input type="email" id="manager2Email" name="manager2Email" required 
                   placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
            <div class="field-error-message" id="error-manager2Email"></div>
          </div>
        </div>
      </div>
      
      <!-- Team Manager 3 (Optional) -->
      <div class="form-section">
        <h3 data-i18n="teamManager3Optional">${t('teamManager3Optional')}</h3>
        <div class="manager-grid">
          <div class="form-group">
            <label for="manager3Name" data-i18n="nameLabelOptional">${t('nameLabelOptional')}</label>
            <input type="text" id="manager3Name" name="manager3Name" 
                   placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
            <div class="field-error-message" id="error-manager3Name"></div>
          </div>
          <div class="form-group">
            <label for="manager3Phone" data-i18n="phoneLabelOptional">${t('phoneLabelOptional')}</label>
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+852</span>
              <input type="tel" id="manager3Phone" name="manager3Phone" 
                     placeholder="${t('eightDigitNumber')}" data-i18n-placeholder="eightDigitNumber" maxlength="8" inputmode="numeric" 
                     pattern="[0-9]{8}" />
            </div>
            <div class="field-error-message" id="error-manager3Phone"></div>
          </div>
          <div class="form-group">
            <label for="manager3Email" data-i18n="emailLabelOptional">${t('emailLabelOptional')}</label>
            <input type="email" id="manager3Email" name="manager3Email" 
                   placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
            <div class="field-error-message" id="error-manager3Email"></div>
          </div>
        </div>
      </div>
      
      <!-- Navigation -->
      <div class="nav-buttons" style="display: flex; justify-content: space-between; gap: 1rem;">
        <button type="button" id="backToStep1" data-i18n="backButton">← Back</button>
        <button type="button" id="nextToStep3" data-i18n="nextButton">Next →</button>
      </div>
    </div>
  `;
  
  // Set up navigation handlers
  setupStep2Navigation();
  
  // Set up validation for email and phone fields
  setupStep2Validation();
  
	Logger.debug('🎯 initStep2: Organization form created');
}

/**
 * Set up email and phone validation for Step 2
 * Uses unified error system for real-time validation
 */
function setupStep2Validation() {
  if (!window.errorSystem) {
    // Fallback to old validation methods if errorSystem not available
    setupEmailValidation('manager1Email');
    setupEmailValidation('manager2Email');
    setupEmailValidation('manager3Email');
    setupPhoneValidation('manager1Phone');
    setupPhoneValidation('manager2Phone');
    setupPhoneValidation('manager3Phone');
    Logger.debug('🎯 setupStep2Validation: Using legacy validation methods');
    return;
  }
  
  // Set up real-time validation using error system for email fields
  ['manager1Email', 'manager2Email', 'manager3Email'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Validate on blur
    field.addEventListener('blur', () => {
      if (field.value.trim()) {
        if (!isValidEmail(field.value.trim())) {
          window.errorSystem.showFieldError(fieldId, 'invalidEmail', {
            scrollTo: false,
            focus: false
          });
        } else {
          window.errorSystem.clearFieldError(fieldId);
        }
      }
    });
    
    // Clear error on input
    field.addEventListener('input', () => {
      window.errorSystem.clearFieldError(fieldId);
    });
  });
  
  // Set up real-time validation using error system for phone fields
  ['manager1Phone', 'manager2Phone', 'manager3Phone'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Enforce digits only on input
    field.addEventListener('input', (e) => {
      const cursorPosition = e.target.selectionStart;
      const oldValue = e.target.value;
      const newValue = oldValue.replace(/\D/g, '').substring(0, 8);
      
      if (oldValue !== newValue) {
        e.target.value = newValue;
        // Restore cursor position
        e.target.setSelectionRange(cursorPosition, cursorPosition);
      }
      
      // Clear error on input
      window.errorSystem.clearFieldError(fieldId);
    });
    
    // Validate on blur
    field.addEventListener('blur', () => {
      if (field.value.trim()) {
        if (!isValidHKPhone(field.value.trim())) {
          window.errorSystem.showFieldError(fieldId, 'invalidPhone', {
            scrollTo: false,
            focus: false
          });
        } else {
          window.errorSystem.clearFieldError(fieldId);
        }
      }
    });
  });
  
  Logger.debug('🎯 setupStep2Validation: Email and phone validation configured with error system');
}

/**
 * Set up navigation for step 2
 */
function setupStep2Navigation() {
  // Step 2 uses step-specific button IDs: backToStep1, nextToStep3
  const backToStep1 = document.getElementById('backToStep1');
  const nextToStep3 = document.getElementById('nextToStep3');
  
  if (backToStep1) {
    // Remove existing listeners by cloning
    const newBackBtn = backToStep1.cloneNode(true);
    backToStep1.parentNode.replaceChild(newBackBtn, backToStep1);
    
    newBackBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent double-clicks while loading - check global flag
      const isCurrentlyLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
      if (this.disabled || isCurrentlyLoading) {
        console.log('⏳ Step 2: Back button disabled or loading in progress, skipping');
        console.log(`   - Button disabled: ${this.disabled}`);
        console.log(`   - Currently loading: ${isCurrentlyLoading}`);
        return;
      }
      
      // Debounce: Add minimum delay to prevent rapid clicks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Double-check after debounce delay
      const stillLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
      if (stillLoading) {
        console.log('⏳ Step 2: Loading started during debounce, skipping');
        return;
      }
      
      this.disabled = true;
      console.log('🔒 Step 2: Back button disabled, starting navigation');
      
      try {
        console.log('🔙 Step 2: Back button clicked, going to step 1');
        saveStep2Data(); // Save current step data
        await showStep(1); // Await to ensure loading completes
        console.log('✅ Step 2: Navigation to step 1 completed');
      } catch (error) {
        console.error('❌ Step 2: Navigation error:', error);
        throw error;
      } finally {
        // Ensure button is re-enabled after a short delay
        setTimeout(() => {
          this.disabled = false;
          console.log('🔓 Step 2: Back button re-enabled');
        }, 200);
      }
    });
  }
  
  if (nextToStep3) {
    // Remove existing listeners by cloning
    const newNextBtn = nextToStep3.cloneNode(true);
    nextToStep3.parentNode.replaceChild(newNextBtn, nextToStep3);
    
    newNextBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      // Prevent double-clicks while loading
      if (this.disabled || isLoadingStep) {
        console.log('⏳ Step 2: Next button disabled, skipping');
        return;
      }
      
      this.disabled = true;
      
      try {
        console.log('🔜 Step 2: Next button clicked, validating step 2');
        if (validateStep2()) { // Validate before proceeding
          saveStep2Data();
          await showStep(3);
        } else {
          console.log('⚠️ Step 2: Validation failed, staying on step 2');
        }
      } finally {
        this.disabled = false;
      }
    });
  }
  
  Logger.debug('🎯 setupStep2Navigation: Step 2 navigation handlers attached');
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
    // Extract local number (remove +852 prefix if present)
    if (el) el.value = extractLocalNumber(manager1Phone);
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
    // Extract local number (remove +852 prefix if present)
    if (el) el.value = extractLocalNumber(manager2Phone);
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
    // Extract local number (remove +852 prefix if present)
    if (el) el.value = extractLocalNumber(manager3Phone);
  }
  if (manager3Email) {
    const el = document.getElementById('manager3Email');
    if (el) el.value = manager3Email;
  }
}

/**
 * Restore TN Step 2 organization and manager fields using FieldRestoreUtility
 */
function restoreTNStep2() {
  if (!window.FieldRestoreUtility) {
    Logger.warn('🎯 restoreTNStep2: FieldRestoreUtility not available, using legacy loadOrganizationData');
    return;
  }
  
  console.log('[TN Step 2] Restoring organization & managers...');
  
  // Organization
  FieldRestoreUtility.restoreField('orgName', 'org_name', { prefix: 'tn_', debug: true });
  FieldRestoreUtility.restoreField('orgAddress', 'org_address', { prefix: 'tn_', debug: true });
  
  // Manager 1
  FieldRestoreUtility.restoreField('manager1Name', 'manager1_name', { prefix: 'tn_', debug: true });
  FieldRestoreUtility.restoreField('manager1Email', 'manager1_email', { prefix: 'tn_', debug: true });
  
  // Manager 1 phone (extract local)
  const phone1 = sessionStorage.getItem('tn_manager1_phone');
  if (phone1) {
    const local = phone1.startsWith('+852') ? phone1.substring(4) : phone1;
    const field = document.getElementById('manager1Phone');
    if (field) {
      field.value = local;
      console.log('[Restore] ✓ manager1Phone: "' + local + '"');
    }
  }
  
  // Manager 2 (same pattern)
  FieldRestoreUtility.restoreField('manager2Name', 'manager2_name', { prefix: 'tn_', debug: true });
  FieldRestoreUtility.restoreField('manager2Email', 'manager2_email', { prefix: 'tn_', debug: true });
  
  const phone2 = sessionStorage.getItem('tn_manager2_phone');
  if (phone2) {
    const local = phone2.startsWith('+852') ? phone2.substring(4) : phone2;
    const field = document.getElementById('manager2Phone');
    if (field) {
      field.value = local;
      console.log('[Restore] ✓ manager2Phone: "' + local + '"');
    }
  }
  
  // Manager 3 (optional, same pattern)
  FieldRestoreUtility.restoreField('manager3Name', 'manager3_name', { prefix: 'tn_', debug: true });
  FieldRestoreUtility.restoreField('manager3Email', 'manager3_email', { prefix: 'tn_', debug: true });
  
  const phone3 = sessionStorage.getItem('tn_manager3_phone');
  if (phone3) {
    const local = phone3.startsWith('+852') ? phone3.substring(4) : phone3;
    const field = document.getElementById('manager3Phone');
    if (field) {
      field.value = local;
      console.log('[Restore] ✓ manager3Phone: "' + local + '"');
    }
  }
  
  console.log('[TN Step 2] ✓ Restoration complete');
  setTimeout(() => {
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugDOM('wizardMount');
    }
  }, 500);
}

/**
 * Load saved team data from sessionStorage
 */
function loadTeamData() {
  console.log('🔍 loadTeamData: Checking what storage keys exist...');
  
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  console.log('🔍 loadTeamData: Team count:', teamCount);
  
  if (!teamCount) {
    console.log('🔍 loadTeamData: No team count, exiting');
    return;
  }
  
	Logger.debug('🎯 loadTeamData: Loading data for', teamCount, 'teams');
  
  for (let i = 1; i <= teamCount; i++) {
    // Check EXACT storage keys it's looking for
    console.log(`\n🔍 Team ${i} - Looking for:`);
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i}`);
    const teamOption = sessionStorage.getItem(`tn_team_option_${i}`);
    
    console.log(`  tn_team_name_en_${i}: "${teamNameEn}"`);
    console.log(`  tn_team_name_tc_${i}: "${teamNameTc}"`);
    console.log(`  tn_team_category_${i}: "${teamCategory}"`);
    console.log(`  tn_team_option_${i}: "${teamOption}"`);
    
    // Check if fields exist
    const nameField = document.getElementById(`teamNameEn${i}`);
    const categoryField = document.getElementById(`teamCategory${i}`);
    console.log(`  teamNameEn${i} exists:`, !!nameField);
    console.log(`  teamCategory${i} exists:`, !!categoryField);
    
    // Try to restore
    if (teamNameEn) {
      const nameEnEl = document.getElementById(`teamNameEn${i}`);
      if (nameEnEl) {
        console.log(`  ✓ Restoring name: "${teamNameEn}"`);
        const beforeValue = nameEnEl.value;
        nameEnEl.value = teamNameEn;
        console.log(`    Before: "${beforeValue}", After: "${nameEnEl.value}"`);
      } else {
        console.log(`  ✗ Field teamNameEn${i} not found in DOM`);
      }
    }
    
    if (teamNameTc) {
      const nameTcEl = document.getElementById(`teamNameTc${i}`);
      if (nameTcEl) {
        nameTcEl.value = teamNameTc;
        console.log(`  ✓ Restored TC name: "${teamNameTc}"`);
      }
    }
    
    if (teamCategory) {
      const categoryEl = document.getElementById(`teamCategory${i}`);
      if (categoryEl) {
        console.log(`  ✓ Restoring category: "${teamCategory}"`);
        categoryEl.value = teamCategory;
        // Trigger change event to populate entry options
        categoryEl.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`    Category change event triggered`);
      } else {
        console.log(`  ✗ Field teamCategory${i} not found in DOM`);
      }
    }
    
    // Restore entry option after category is set and options are populated
    // Use setTimeout to ensure options are populated first
    if (teamOption && teamCategory) {
      setTimeout(() => {
        const optionRadios = document.querySelectorAll(`input[name="teamOption${i}"]`);
        console.log(`  Looking for teamOption${i} with value "${teamOption}", found ${optionRadios.length} radios`);
        optionRadios.forEach(radio => {
          if (radio.value === teamOption) {
            radio.checked = true;
            console.log(`  ✓ Restored option: "${teamOption}"`);
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
  
  console.log('🔍 loadTeamData: Completed restoration attempt\n');
}

/**
 * Restore TN Step 1 team fields using FieldRestoreUtility
 */
function restoreTNStep1Teams(teamCount) {
  if (!window.FieldRestoreUtility) {
    Logger.warn('🎯 restoreTNStep1Teams: FieldRestoreUtility not available, falling back to loadTeamData');
    loadTeamData();
    return;
  }
  
  console.log(`[TN Step 1] Restoring ${teamCount} teams...`);
  
  for (let i = 1; i <= teamCount; i++) {
    // Team name EN
    FieldRestoreUtility.restoreField(
      `teamNameEn${i}`,
      `team_name_en_${i}`,
      { prefix: 'tn_', debug: true }
    );
    
    // Team name TC
    FieldRestoreUtility.restoreField(
      `teamNameTc${i}`,
      `team_name_tc_${i}`,
      { prefix: 'tn_', debug: true }
    );
    
    // Team category (triggers option display)
    const categoryRestored = FieldRestoreUtility.restoreWithCascade(
      `teamCategory${i}`,
      `team_category_${i}`,
      { prefix: 'tn_', debug: true, triggerChange: true, waitForDependent: 150 }
    );
    
    // Team option (WAIT for options to render)
    if (categoryRestored) {
      setTimeout(() => {
        const teamOption = sessionStorage.getItem(`tn_team_option_${i}`);
        if (teamOption) {
          const optionRadios = document.querySelectorAll(`input[name="teamOption${i}"]`);
          optionRadios.forEach(radio => {
            if (radio.value === teamOption) {
              radio.checked = true;
              console.log(`[Restore] ✓ teamOption${i}: "${teamOption}"`);
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
        }
      }, 150);
    }
  }
  
  console.log('[TN Step 1] ✓ Restoration complete');
  setTimeout(() => {
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugDOM('wizardMount');
    }
  }, 500);
}

/**
 * Save team data to sessionStorage
 */
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

/**
 * Render per-team steersman selection cards for TN
 */
function renderSteersmanCards() {
  const container = document.getElementById('steersmanCardsContainer');
  if (!container) {
    console.warn('⚠️ steersmanCardsContainer not found');
    return;
  }
  
  // Get team data from sessionStorage
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  if (teamCount === 0) {
    console.warn('⚠️ No teams found, cannot render steersman cards');
    return;
  }
  
  // Get current language for team name display
  const currentLang = window.i18n?.currentLang || 'en';
  
  // Translation keys
  const translations = {
    withPractice: currentLang === 'zh' 
      ? '練習時已聘用舵手 – HK$800' 
      : 'Hired steersman during practice – HK$800',
    noPractice: currentLang === 'zh'
      ? '練習時沒有聘用舵手 – HK$1,500'
      : 'Did not hire steersman during practice – HK$1,500',
    notRequired: currentLang === 'zh' ? '不需要' : 'Not required'
  };
  
  container.innerHTML = '';
  
  // Render a card for each team
  for (let i = 0; i < teamCount; i++) {
    const teamIndex = i + 1;
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${teamIndex}`) || '';
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${teamIndex}`) || '';
    const teamName = currentLang === 'zh' && teamNameTc ? teamNameTc : teamNameEn;
    
    // Get saved selection (if any)
    const savedOption = sessionStorage.getItem(`tn_team_${teamIndex}_steersman_option`) || 'not_required';
    
    const card = document.createElement('div');
    card.className = 'team-steersman-card';
    card.setAttribute('data-team-index', i);
    
    card.innerHTML = `
      <div class="team-steersman-header">Team ${teamIndex}: ${teamName || `Team ${teamIndex}`}</div>
      <div class="team-steersman-options">
        <select name="steersman_team_${i}" id="steersman_team_${i}" class="steersman-select">
          <option value="not_required" ${savedOption === 'not_required' || savedOption === '' ? 'selected' : ''}>${translations.notRequired}</option>
          <option value="with_practice" ${savedOption === 'with_practice' ? 'selected' : ''}>${translations.withPractice}</option>
          <option value="no_practice" ${savedOption === 'no_practice' ? 'selected' : ''}>${translations.noPractice}</option>
        </select>
      </div>
    `;
    
    container.appendChild(card);
    
    // Add change listener to save selection
    const select = card.querySelector('select.steersman-select');
    if (select) {
      select.addEventListener('change', () => {
        sessionStorage.setItem(`tn_team_${teamIndex}_steersman_option`, select.value);
      });
    }
  }
  
  console.log(`✅ Rendered ${teamCount} steersman selection cards`);
}

/**
 * Initialize Step 3 - Race Day Arrangement
 */
async function initStep3() {
	Logger.debug('🎯 initStep3: Starting race day arrangements step');
  console.log('🎯 Initializing Step 3 - Race Day');
  
  // CRITICAL: Inject Step 3 styles FIRST (race day form, item rows, etc.)
  // This ensures styles are available when Step 3 loads, not when Step 4 loads
  addStep3Styles();
  
  // Force parent container visibility
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
  }
  
  // Ensure wizardMount is visible (template is already cloned by loadStepContent)
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
    console.log('✅ wizardMount is visible');
  }
  
  // Ensure the race day form container is visible
  const raceDayForm = document.getElementById('raceDayForm');
  if (raceDayForm) {
    raceDayForm.style.display = 'block';
    const card = raceDayForm.closest('.card');
    if (card) {
      card.style.display = 'block';
    }
    console.log('✅ raceDayForm found and visible');
  } else {
    console.warn('⚠️ raceDayForm not found!');
    // Try to find it within wizardMount after a short delay
    setTimeout(() => {
      const retryForm = document.getElementById('raceDayForm');
      if (retryForm) {
        console.log('✅ raceDayForm found on retry');
        retryForm.style.display = 'block';
      } else {
        console.error('❌ raceDayForm still not found after retry');
      }
    }, 100);
  }
  
  // Load prices from database and update price displays
  await updateRaceDayPrices();
  
  // Wait a tick for DOM to fully settle after template cloning
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Render per-team steersman selection cards
  renderSteersmanCards();
  
  // Diagnostic: Check if all expected fields exist
  console.log('\n🎯 initStep3: Checking Step 3 fields:');
  const expectedFields = [
    'marqueeQty',
    'junkBoatNo',      // ← Boat license number
    'junkBoatQty',     // ← Boat quantity
    'speedBoatNo',     // ← Boat license number
    'speedboatQty'     // ← Boat quantity
  ];
  
  const missingFields = [];
  expectedFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      console.log(`  ${fieldId}: ✓ EXISTS (Type: ${field.type}, Value: "${field.value}")`);
      // Ensure field is visible
      field.style.display = '';
      if (field.closest('.form-group') || field.closest('.section')) {
        field.closest('.form-group')?.style.setProperty('display', '');
        field.closest('.section')?.style.setProperty('display', '');
      }
    } else {
      console.error(`  ${fieldId}: ❌ MISSING`);
      missingFields.push(fieldId);
    }
  });
  
  if (missingFields.length > 0) {
    console.error('⚠️ Missing fields:', missingFields);
    // Try to find them again after a delay
    setTimeout(() => {
      missingFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          console.log(`  ${fieldId}: Found on retry ✓`);
        }
      });
    }, 200);
  }
  
  // Set up navigation handlers (must be done after template is loaded)
  // Wait a bit more to ensure DOM is fully ready
  setTimeout(() => {
    setupStep3Navigation();
    // Set up license field listeners for dynamic license fields
    setupLicenseFieldListeners();
    // Set up max limit enforcement for quantity inputs
    setupQuantityLimitEnforcement();
  }, 100);
  
  // Load saved data if available (legacy function)
  loadRaceDayData();
  
  // Debug what we have
  console.log('\n=== TN STEP 3: RESTORE ===');
  if (window.FieldRestoreUtility) {
    FieldRestoreUtility.debugStorage('tn_');
  }
  
  // Restore field values from sessionStorage
  setTimeout(() => {
    restoreTNStep3();
  }, 250);
}

/**
 * Create race day form with items from database
 */
async function createRaceDayForm() {
  const container = document.getElementById('wizardMount');
  if (!container) return;
  
  try {
	Logger.debug('🎯 createRaceDayForm: Loading race day items from database');
    
    // Load race day items from database
    const { data: raceDayItems, error } = await sb
      .from('v_race_day_items_public')
      .select('*')
      .eq('event_short_ref', 'TN2026')
      .order('sort_order');
    
    if (error) {
	Logger.error('🎯 createRaceDayForm: Database error:', error);
      throw error;
    }
    
	Logger.debug('🎯 createRaceDayForm: Loaded', raceDayItems?.length || 0, 'race day items');
    
    // Log all item codes for debugging
    console.log('🎯 createRaceDayForm: Item codes from database:');
    raceDayItems?.forEach(item => {
      console.log(`  - item_code: "${item.item_code}", title_en: "${item.title_en}"`);
    });
    
    // Group items by category for better organization
    const groupedItems = groupRaceDayItems(raceDayItems || []);
    
    // Get translated strings
    const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    
    // Create form HTML
    container.innerHTML = `
      <div class="race-day-form">
        <h2 data-i18n="raceDayArrangements">${t('raceDayArrangements')}</h2>
        
        ${Object.entries(groupedItems).map(([category, items]) => `
          <div class="form-section">
            <h3>${category}</h3>
            ${items.map(item => {
              // Use localized race day item title if db-localization is available
              const itemTitle = window.getRaceDayItemTitle ? window.getRaceDayItemTitle(item) : item.title_en;
              
              // Check if this item needs a boat number field
              // Support multiple possible item_code formats:
              // - 'junk_boat', 'rd_junk', 'junk' (for junk/pleasure boat)
              // - 'speed_boat', 'rd_speedboat', 'speedboat' (for speed boat)
              const itemCodeLower = (item.item_code || '').toLowerCase();
              const titleLower = (item.title_en || '').toLowerCase();
              
              const isJunkBoat = itemCodeLower === 'junk_boat' || 
                                 itemCodeLower === 'rd_junk' || 
                                 itemCodeLower === 'junk' ||
                                 itemCodeLower.includes('junk') ||
                                 titleLower.includes('junk') ||
                                 titleLower.includes('pleasure');
              
              const isSpeedBoat = itemCodeLower === 'speed_boat' || 
                                  itemCodeLower === 'rd_speedboat' || 
                                  itemCodeLower === 'speedboat' ||
                                  itemCodeLower.includes('speed') ||
                                  titleLower.includes('speed');
              
              const needsBoatNumber = isJunkBoat || isSpeedBoat;
              const boatNoFieldId = isJunkBoat ? 'junkBoatNo' : 
                                    isSpeedBoat ? 'speedBoatNo' : null;
              
              if (needsBoatNumber) {
                console.log(`🎯 Adding boat number field for item: ${item.item_code} (${item.title_en}) -> ${boatNoFieldId}`);
              }
              
              return `
              <div class="item-row">
                <div class="item-info">
                  <span class="item-title">${itemTitle}</span>
                  <span class="item-price"><span data-i18n="unitPrice">${t('unitPrice')}</span> ${t('hkDollar')}${item.listed_unit_price}</span>
                </div>
                <div class="item-controls">
                  <input type="number" 
                         id="${item.item_code}Qty" 
                         name="${item.item_code}Qty" 
                         min="${item.min_qty || 0}" 
                         max="${item.max_qty || ''}"
                         value="0" 
                         class="qty-input" 
                         data-license-type="${isJunkBoat ? 'junk' : isSpeedBoat ? 'speed' : ''}" />
                  ${needsBoatNumber ? `
                    <div id="${isJunkBoat ? 'junkBoatLicenseContainer' : 'speedBoatLicenseContainer'}" class="license-fields-container" style="margin-top: 0.5rem; margin-bottom: 0.5rem;"></div>
                  ` : ''}
                  <div class="field-error-message" id="error-${item.item_code}Qty"></div>
                </div>
              </div>
            `;}).join('')}
          </div>
        `).join('')}
        
        <!-- Ensure boat number fields exist even if not in database items -->
        ${(() => {
          // Check if boat number fields were already added
          const hasJunkBoat = raceDayItems?.some(item => {
            const code = (item.item_code || '').toLowerCase();
            const title = (item.title_en || '').toLowerCase();
            return code.includes('junk') || code.includes('pleasure') || title.includes('junk') || title.includes('pleasure');
          });
          const hasSpeedBoat = raceDayItems?.some(item => {
            const code = (item.item_code || '').toLowerCase();
            const title = (item.title_en || '').toLowerCase();
            return code.includes('speed') || title.includes('speed');
          });
          
          let fallbackHTML = '';
          
          // Add junk boat fields if missing
          if (!hasJunkBoat) {
            console.log('🎯 Adding fallback junk boat fields (not found in database items)');
            fallbackHTML += `
              <div class="form-section">
                <h3>${t('junkRegistration')}</h3>
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-title">${t('junkRegistration')}</span>
                    <span class="item-price"><span data-i18n="unitPrice">${t('unitPrice')}</span> ${t('hkDollar')}2,500</span>
                  </div>
                  <div class="item-controls">
                    <input type="number" 
                           id="junkBoatQty" 
                           name="junkBoatQty" 
                           min="0" 
                           value="0" 
                           class="qty-input"
                           data-license-type="junk" />
                    <div id="junkBoatLicenseContainer" class="license-fields-container" style="margin-top: 0.5rem; margin-bottom: 0.5rem;"></div>
                  </div>
                </div>
              </div>
            `;
          }
          
          // Add speed boat fields if missing
          if (!hasSpeedBoat) {
            console.log('🎯 Adding fallback speed boat fields (not found in database items)');
            fallbackHTML += `
              <div class="form-section">
                <h3>${t('speedBoatRegistration')}</h3>
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-title">${t('speedBoatRegistration')}</span>
                    <span class="item-price"><span data-i18n="unitPrice">${t('unitPrice')}</span> ${t('hkDollar')}1,500</span>
                  </div>
                  <div class="item-controls">
                    <input type="number" 
                           id="speedboatQty" 
                           name="speedboatQty" 
                           min="0" 
                           value="0" 
                           class="qty-input"
                           data-license-type="speed" />
                    <div id="speedBoatLicenseContainer" class="license-fields-container" style="margin-top: 0.5rem; margin-bottom: 0.5rem;"></div>
                  </div>
                </div>
              </div>
            `;
          }
          
          return fallbackHTML;
        })()}
        
        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" id="backToStep2" class="btn btn-secondary" data-i18n="backTeamInfo">
            ${t('backTeamInfo')}
          </button>
          <button type="button" id="nextToStep4" class="btn btn-primary" data-i18n="nextPractice">
            ${t('nextPractice')}
          </button>
        </div>
      </div>
    `;
    
    // Set up navigation handlers
    setupStep3Navigation();
    
    // Set up quantity change listeners for license fields
    setupLicenseFieldListeners();
    
	Logger.debug('🎯 createRaceDayForm: Race day form created successfully');
    
  } catch (error) {
	Logger.error('🎯 createRaceDayForm: Error creating form:', error);
    
    // Get translated strings
    const tErr = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    
    // Fallback to basic form if database fails
    container.innerHTML = `
      <div class="race-day-form">
        <h2 data-i18n="raceDayArrangements">${tErr('raceDayArrangements')}</h2>
        <div class="error-message" data-i18n="unableToLoadRaceDayItems">
          ${tErr('unableToLoadRaceDayItems')}
        </div>
        <div class="form-actions">
          <button type="button" id="backToStep2" class="btn btn-secondary" data-i18n="backTeamInfo">
            ${tErr('backTeamInfo')}
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
  
  // Get translated category names
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  
  items.forEach(item => {
    // Extract category from title or use default - use translation keys
    let categoryKey = 'raceDayItems';
    let categoryFallback = 'Race Day Items';
    
    if (item.title_en.toLowerCase().includes('marquee')) {
      categoryKey = 'athleteMarquee';
      categoryFallback = 'Athlete Marquee';
    } else if (item.title_en.toLowerCase().includes('steersman') || item.title_en.toLowerCase().includes('steer')) {
      categoryKey = 'officialSteersman';
      categoryFallback = 'Official Steersman';
    } else if (item.title_en.toLowerCase().includes('junk') || item.title_en.toLowerCase().includes('pleasure')) {
      categoryKey = 'junkRegistration';
      categoryFallback = 'Junk Registration';
    } else if (item.title_en.toLowerCase().includes('speed') || item.title_en.toLowerCase().includes('boat')) {
      categoryKey = 'speedBoatRegistration';
      categoryFallback = 'Speed Boat Registration';
    }
    
    // Get translated category name
    const category = t(categoryKey, categoryFallback);
    
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
  console.log('🎯 setupStep3Navigation: Setting up Step 3 navigation');
  
  // Find buttons within wizardMount (where template content was cloned)
  const container = wizardMount || document.querySelector('#wizardMount');
  if (!container) {
    console.error('❌ setupStep3Navigation: wizardMount container not found');
    return;
  }
  
  // Step 3 uses backBtn/nextBtn from template, but we'll handle them with step-specific logic
  // Also handle form submission for raceDayForm
  // Search within container first, then fallback to document-wide search
  const backBtn = container.querySelector('#backBtn') || document.getElementById('backBtn');
  const nextBtn = container.querySelector('#nextBtn') || document.getElementById('nextBtn');
  const raceDayForm = container.querySelector('#raceDayForm') || document.getElementById('raceDayForm');
  
  console.log('🎯 setupStep3Navigation: Found elements:', {
    backBtn: !!backBtn,
    nextBtn: !!nextBtn,
    raceDayForm: !!raceDayForm
  });
  
  // Back button (equivalent to backToStep2)
  if (backBtn) {
    // Check if handler already attached
    if (backBtn.dataset.navHandlerAttached === 'true') {
      console.log('⚠️ Step 3: Back button handler already attached, skipping');
    } else {
      backBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-clicks while loading - check global flag
        const isCurrentlyLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
        if (this.disabled || isCurrentlyLoading) {
          console.log('⏳ Step 3: Back button disabled or loading in progress, skipping');
          console.log(`   - Button disabled: ${this.disabled}`);
          console.log(`   - Currently loading: ${isCurrentlyLoading}`);
          return;
        }
        
        // Debounce: Add minimum delay to prevent rapid clicks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check after debounce delay
        const stillLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
        if (stillLoading) {
          console.log('⏳ Step 3: Loading started during debounce, skipping');
          return;
        }
        
        this.disabled = true;
        console.log('🔒 Step 3: Back button disabled, starting navigation');
        
        try {
          console.log('🔙 Step 3: Back button clicked, going to step 2');
          saveStep3Data(); // Save current step data
          await showStep(2); // Await to ensure loading completes
          console.log('✅ Step 3: Navigation to step 2 completed');
        } catch (error) {
          console.error('❌ Step 3: Navigation error:', error);
          throw error;
        } finally {
          // Ensure button is re-enabled after a short delay
          setTimeout(() => {
            this.disabled = false;
            console.log('🔓 Step 3: Back button re-enabled');
          }, 200);
        }
      });
      backBtn.dataset.navHandlerAttached = 'true';
      console.log('✅ Step 3: Back button handler attached');
    }
  } else {
    console.warn('⚠️ Step 3: backBtn not found');
  }
  
  // Handle form submission for raceDayForm (preferred method for Step 3)
  if (raceDayForm) {
    // Check if handler already attached
    if (raceDayForm.dataset.navHandlerAttached === 'true') {
      console.log('⚠️ Step 3: Form navigation handler already attached, skipping');
    } else {
      // Handle form submission
      raceDayForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-submission while loading
        if (isLoadingStep) {
          console.log('⏳ Step 3: Form submission disabled, skipping');
          return false;
        }
        
        console.log('🔜 Step 3: Form submitted, validating step 3');
        if (validateStep3()) {
          saveStep3Data();
          await showStep(4);
        } else {
          console.log('⚠️ Step 3: Validation failed, staying on step 3');
        }
        return false;
      });
      raceDayForm.dataset.navHandlerAttached = 'true';
      console.log('✅ Step 3: Form submit handler attached');
    }
  } else {
    console.warn('⚠️ Step 3: raceDayForm not found');
  }
  
  // Handle nextBtn click (works even if inside form)
  if (nextBtn) {
    // Check if handler already attached
    if (nextBtn.dataset.navHandlerAttached === 'true') {
      console.log('⚠️ Step 3: Next button handler already attached, skipping');
    } else {
      nextBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-clicks while loading
        if (this.disabled || isLoadingStep) {
          console.log('⏳ Step 3: Next button disabled, skipping');
          return false;
        }
        
        this.disabled = true;
        
        try {
          console.log('🔜 Step 3: Next button clicked, validating step 3');
          if (validateStep3()) {
            saveStep3Data();
            await showStep(4);
          } else {
            console.log('⚠️ Step 3: Validation failed, staying on step 3');
          }
        } finally {
          this.disabled = false;
        }
        return false;
      });
      nextBtn.dataset.navHandlerAttached = 'true';
      console.log('✅ Step 3: Next button handler attached');
    }
  } else {
    console.warn('⚠️ Step 3: nextBtn not found');
  }
  
  Logger.debug('🎯 setupStep3Navigation: Step 3 navigation handlers attached');
}

/**
 * Render license number input fields based on quantity
 */
function renderLicenseFields(type, qty) {
  // type = 'junk' or 'speed'
  const container = document.getElementById(`${type}BoatLicenseContainer`);
  if (!container) return;
  
  container.innerHTML = ''; // Clear existing
  
  const t = (key) => window.i18n ? window.i18n.t(key) : key;
  const labelText = type === 'junk' ? t('pleasureBoatNo') : t('speedBoatNo');
  
  for (let i = 1; i <= qty; i++) {
    const div = document.createElement('div');
    div.className = 'license-field';
    div.style.cssText = 'margin-bottom: 0.5rem; display: flex; align-items: center; gap: 1rem;';
    div.innerHTML = `
      <label for="${type}BoatLicense${i}" style="white-space: nowrap; min-width: 120px;">License #${i}:</label>
      <input type="text" 
             id="${type}BoatLicense${i}" 
             name="${type}BoatLicense${i}"
             placeholder="Enter license number"
             style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
    `;
    container.appendChild(div);
  }
  
  // Restore saved license values if available
  const savedLicenses = JSON.parse(sessionStorage.getItem(`tn_${type}BoatLicenses`) || '[]');
  savedLicenses.forEach((license, index) => {
    const input = document.getElementById(`${type}BoatLicense${index + 1}`);
    if (input) input.value = license;
  });
}

/**
 * Set up event listeners for quantity inputs to render license fields
 */
function setupLicenseFieldListeners() {
  // Find all quantity inputs with data-license-type attribute
  const qtyInputs = document.querySelectorAll('.qty-input[data-license-type]');
  
  qtyInputs.forEach(input => {
    if (input.dataset.licenseListenerAttached === 'true') return;
    
    const licenseType = input.dataset.licenseType;
    if (!licenseType || (licenseType !== 'junk' && licenseType !== 'speed')) return;
    
    const handler = function() {
      const qty = parseInt(this.value || '0', 10);
      renderLicenseFields(licenseType, qty);
    };
    
    input.addEventListener('change', handler);
    input.addEventListener('input', handler);
    input.dataset.licenseListenerAttached = 'true';
    
    // Initial render if value exists
    const initialQty = parseInt(input.value || '0', 10);
    if (initialQty > 0) {
      renderLicenseFields(licenseType, initialQty);
    }
  });
  
  // Also handle specific IDs for fallback fields
  const junkBoatQty = document.getElementById('junkBoatQty');
  if (junkBoatQty && !junkBoatQty.dataset.licenseListenerAttached) {
    const handler = function() {
      const qty = parseInt(this.value || '0', 10);
      renderLicenseFields('junk', qty);
    };
    junkBoatQty.addEventListener('change', handler);
    junkBoatQty.addEventListener('input', handler);
    junkBoatQty.dataset.licenseListenerAttached = 'true';
    
    const initialQty = parseInt(junkBoatQty.value || '0', 10);
    if (initialQty > 0) {
      renderLicenseFields('junk', initialQty);
    }
  }
  
  const speedboatQty = document.getElementById('speedboatQty');
  if (speedboatQty && !speedboatQty.dataset.licenseListenerAttached) {
    const handler = function() {
      const qty = parseInt(this.value || '0', 10);
      renderLicenseFields('speed', qty);
    };
    speedboatQty.addEventListener('change', handler);
    speedboatQty.addEventListener('input', handler);
    speedboatQty.dataset.licenseListenerAttached = 'true';
    
    const initialQty = parseInt(speedboatQty.value || '0', 10);
    if (initialQty > 0) {
      renderLicenseFields('speed', initialQty);
    }
  }
}

/**
 * Set up quantity limit enforcement for race day quantity inputs
 * Enforces max limit of 25 when users type values manually
 */
function setupQuantityLimitEnforcement() {
  const MAX_QTY = 25;
  const quantityInputIds = ['marqueeQty', 'junkBoatQty', 'speedboatQty'];
  
  quantityInputIds.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Check if listener already attached
    if (input.dataset.limitEnforcementAttached === 'true') return;
    
    // Add input event listener to enforce max limit
    input.addEventListener('input', function() {
      const value = parseInt(this.value, 10);
      
      // If value is greater than max, clamp it to max
      if (!isNaN(value) && value > MAX_QTY) {
        this.value = MAX_QTY;
        // Trigger change event to update any dependent fields
        this.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Also enforce on blur (when user leaves the field)
    input.addEventListener('blur', function() {
      const value = parseInt(this.value, 10);
      
      if (!isNaN(value)) {
        if (value < 0) {
          this.value = 0;
        } else if (value > MAX_QTY) {
          this.value = MAX_QTY;
        }
        // Trigger change event to update any dependent fields
        this.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    input.dataset.limitEnforcementAttached = 'true';
  });
  
  console.log('✅ Quantity limit enforcement set up for race day inputs');
}

/**
 * Load saved race day data from sessionStorage
 */
function loadRaceDayData() {
  try {
    const savedData = sessionStorage.getItem('tn_race_day');
    if (!savedData) {
	Logger.debug('🎯 loadRaceDayData: No saved race day data found');
      return;
    }
    
    const raceDayData = JSON.parse(savedData);
	Logger.debug('🎯 loadRaceDayData: Loading saved data:', raceDayData);
    
    // Restore values to form inputs
    Object.entries(raceDayData).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId);
      if (input && !isNaN(value)) {
        input.value = value;
      }
    });
    
	Logger.debug('🎯 loadRaceDayData: Race day data restored successfully');
    
  } catch (error) {
	Logger.error('🎯 loadRaceDayData: Error loading saved data:', error);
  }
}

/**
 * Load race day item prices from database and update price displays
 */
async function updateRaceDayPrices() {
	Logger.debug('🎯 updateRaceDayPrices: Loading race day item prices from database');
  
  try {
    // Load race day items from database
    const { data: raceDayItems, error } = await sb
      .from('v_race_day_items_public')
      .select('item_code, listed_unit_price, title_en, title_tc')
      .eq('event_short_ref', 'TN2026')
      .order('sort_order');
    
    if (error) {
	Logger.error('🎯 updateRaceDayPrices: Database error:', error);
      // Continue with fallback prices from template
      return;
    }
    
	Logger.debug('🎯 updateRaceDayPrices: Loaded', raceDayItems?.length || 0, 'race day items');
    
    if (!raceDayItems || raceDayItems.length === 0) {
	Logger.warn('🎯 updateRaceDayPrices: No race day items found, using template fallback prices');
      return;
    }
    
    // Get translated currency symbol
    const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    const currencySymbol = t('hkDollar', 'HK$');
    
    // Map item codes to price element IDs
    // The mapping logic matches what createRaceDayForm() used
    raceDayItems.forEach(item => {
      const itemCodeLower = (item.item_code || '').toLowerCase();
      const titleLower = (item.title_en || '').toLowerCase();
      const price = item.listed_unit_price;
      
      if (!price && price !== 0) {
	Logger.warn(`🎯 updateRaceDayPrices: No price for item ${item.item_code}, skipping`);
        return;
      }
      
      // Format price with commas (e.g., 2500 -> "2,500")
      const formattedPrice = typeof price === 'number' 
        ? price.toLocaleString('en-US') 
        : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      let priceElementId = null;
      
      // Map item codes to price element IDs
      // Priority: exact matches first, then partial matches
      if (itemCodeLower === 'marquee' || 
          itemCodeLower === 'rd_marquee' ||
          itemCodeLower === 'athlete_marquee') {
        priceElementId = 'marqueePrice';
      } else if (itemCodeLower === 'steer_with' ||
                 itemCodeLower === 'rd_steerer' ||
                 itemCodeLower === 'steersman_with' ||
                 (itemCodeLower.includes('steer') && !itemCodeLower.includes('without') && !itemCodeLower.includes('no'))) {
        // steer_with or steersman with practice (not "without" or "no practice")
        priceElementId = 'steerWithPrice';
      } else if (itemCodeLower === 'steer_without' ||
                 itemCodeLower === 'rd_steerer_no_practice' ||
                 itemCodeLower === 'steersman_without' ||
                 (itemCodeLower.includes('steer') && (itemCodeLower.includes('without') || itemCodeLower.includes('no_practice') || itemCodeLower.includes('no practice')))) {
        priceElementId = 'steerWithoutPrice';
      } else if (itemCodeLower === 'junk_boat' ||
                 itemCodeLower === 'rd_junk' ||
                 itemCodeLower === 'junk' ||
                 titleLower.includes('junk') ||
                 titleLower.includes('pleasure')) {
        priceElementId = 'junkPrice';
      } else if (itemCodeLower === 'speed_boat' ||
                 itemCodeLower === 'rd_speedboat' ||
                 itemCodeLower === 'speedboat') {
        priceElementId = 'speedPrice';
      }
      
      if (priceElementId) {
        const priceElement = document.getElementById(priceElementId);
        if (priceElement) {
          // Update price text (preserve any existing label like "Unit Price:")
          const currentText = priceElement.textContent.trim();
          if (currentText.startsWith(currencySymbol)) {
            priceElement.textContent = `${currencySymbol}${formattedPrice}`;
          } else {
            // If it has "Unit Price:" prefix in parent, just update the number
            priceElement.textContent = `${currencySymbol}${formattedPrice}`;
          }
	Logger.debug(`🎯 updateRaceDayPrices: Updated ${priceElementId} with price ${currencySymbol}${formattedPrice} from item ${item.item_code}`);
        } else {
	Logger.warn(`🎯 updateRaceDayPrices: Price element ${priceElementId} not found in DOM`);
        }
      }
    });
    
	Logger.debug('🎯 updateRaceDayPrices: Price update complete');
    
  } catch (error) {
	Logger.error('🎯 updateRaceDayPrices: Error updating prices:', error);
    // Continue with fallback prices from template
  }
}

/**
 * Restore TN Step 3 race day data using FieldRestoreUtility
 */
function restoreTNStep3() {
  console.log('[TN Step 3] Restoring race day data...');
  
  const savedData = sessionStorage.getItem('tn_race_day');
  if (!savedData) {
    console.log('[TN Step 3] No saved data');
    return;
  }
  
  try {
    const data = JSON.parse(savedData);
    console.log('[TN Step 3] Saved data:', data);
    
    Object.keys(data).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = data[fieldId];
        console.log(`[Restore] ✓ ${fieldId}: "${data[fieldId]}"`);
      } else {
        console.warn(`[Restore] ⚠️  Field not found: ${fieldId}`);
      }
    });
    
    console.log('[TN Step 3] ✓ Restoration complete');
  } catch (error) {
    console.error('[TN Step 3] Failed:', error);
  }
  
  setTimeout(() => {
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugDOM('wizardMount');
    }
  }, 500);
}

/**
 * Initialize Step 4 - Practice Booking
 * This is the main practice functionality
 */
function initStep4() {
	Logger.debug('🎯 initStep4: Starting step 4 initialization');
  console.log('🎯 Initializing Step 4 - Practice Booking');
  const startTime = performance.now();
  
  // Force parent container visibility
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
  }
  
  // Ensure wizardMount is visible (template is already cloned by loadStepContent)
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
    console.log('✅ wizardMount is visible');
  }
  
  // Initialize practice configuration
	Logger.debug('🎯 initStep4: Initializing practice configuration');
  initPracticeConfig();
  
  // Wait a bit for DOM to settle after template cloning
  setTimeout(() => {
    // Confirm the cloned DOM contains #calendarContainer
    const calendarEl = document.getElementById('calendarContainer');
    if (!calendarEl) {
      Logger.error('🎯 initStep4: #calendarContainer not found after mount');
      // Try again after a longer delay
      setTimeout(() => {
        const retryCalendar = document.getElementById('calendarContainer');
        if (retryCalendar) {
          console.log('✅ calendarContainer found on retry');
          initTNCalendarModern();
          continueStep4Init();
        } else {
          console.error('❌ calendarContainer still not found after retry');
        }
      }, 200);
      return;
    }
    Logger.debug('🎯 initStep4: #calendarContainer found, proceeding with calendar init');
    
    // Initialize modern calendar
    initTNCalendarModern();
    
    // Continue with rest of initialization
    continueStep4Init();
  }, 50);
  
  // Helper function to continue Step 4 initialization after calendar is ready
  function continueStep4Init() {
    // Populate slot preference selects
    Logger.debug('🎯 initStep4: Populating slot preferences');
    populateSlotPreferences();
    
    // Set up duplicate prevention
    setupSlotDuplicatePrevention();
    
    // Set up slot preference change handlers
    setupSlotPreferenceHandlers();
    
    // Load team selector
    initTeamSelector();
    
    // Set up copy from Team 1 button
    setupCopyFromTeam1Button();
    
    // Initialize copy button visibility (hidden for Team 1)
    hideCopyFromTeam1Option();
    
    // Set up navigation (with delay to ensure DOM is ready)
    setTimeout(() => {
      setupStep4Navigation();
    }, 100);
    
    const endTime = performance.now();
    Logger.debug(`🎯 initStep4: Completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    // Restore practice data after initialization
    setTimeout(() => {
      restorePracticeData();
    }, 200); // Wait for calendar and selects to initialize
  }
}

/**
 * Restore practice data for all teams
 */
function restorePracticeData() {
	Logger.debug('🎯 restorePracticeData: Starting restoration');
  
  // Get team count
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  if (teamCount < 1) {
	Logger.debug('🎯 restorePracticeData: No teams found, skipping restoration');
    return;
  }
  
  // Restore last selected team in team selector (default to first team)
  const teamSelect = document.getElementById('teamSelect');
  if (!teamSelect) {
	Logger.warn('🎯 restorePracticeData: Team selector not found');
    return;
  }
  
  // Get last selected team index (stored as index, not team key)
  const lastSelectedIndex = sessionStorage.getItem('tn_practice_last_team_index');
  const teamIndex = lastSelectedIndex !== null ? parseInt(lastSelectedIndex, 10) : 0;
  
  // Validate team index is within range
  if (teamIndex >= 0 && teamIndex < teamCount) {
    teamSelect.value = teamIndex.toString();
	Logger.debug(`🎯 restorePracticeData: Restoring team index ${teamIndex} (Team ${teamIndex + 1})`);
    
    // Trigger team change to load practice data
    const changeEvent = new Event('change', { bubbles: true });
    teamSelect.dispatchEvent(changeEvent);
  } else {
	Logger.debug('🎯 restorePracticeData: Invalid team index, defaulting to Team 1');
    // Default to Team 1 if invalid index
    teamSelect.value = '0';
    const changeEvent = new Event('change', { bubbles: true });
    teamSelect.dispatchEvent(changeEvent);
  }
  
	Logger.debug('🎯 restorePracticeData: Completed restoration');
}

/**
 * Save currently selected team for restoration
 */
function saveSelectedTeam(teamIndex) {
  sessionStorage.setItem('tn_practice_last_team_index', teamIndex.toString());
	Logger.debug(`🎯 saveSelectedTeam: Saved team index ${teamIndex} (Team ${teamIndex + 1})`);
}

/**
 * Initialize practice configuration
 */
function initPracticeConfig() {
  const config = window.__CONFIG;
  practiceConfig = config?.practice || {};
  
  // Get slots from config - try multiple possible locations
  practiceSlots = config?.timeslots || config?.practice?.slots || [];
  
  // Ensure slots have duration_hours as number
  practiceSlots = practiceSlots.map(slot => {
    // Convert to number if it's a string, or derive from slot name
    if (slot.duration_hours !== undefined && slot.duration_hours !== null) {
      slot.duration_hours = Number(slot.duration_hours);
    } else if (slot.slot_code && slot.slot_code.includes('1h')) {
      slot.duration_hours = 1;
    } else {
      slot.duration_hours = 2; // Default to 2 hours
    }
    return slot;
  });
  
	Logger.debug('🎯 initPracticeConfig: Loaded', practiceSlots.length, 'practice slots');
	Logger.debug('🎯 initPracticeConfig: Slots:', practiceSlots);
  
  // Update practice window header with i18n
  if (practiceConfig.practice_start_date && practiceConfig.practice_end_date) {
    try {
      const startDate = new Date(practiceConfig.practice_start_date);
      const endDate = new Date(practiceConfig.practice_end_date);
      
      // Get locale based on current language
      const locale = window.i18n?.getCurrentLanguage() === 'zh' ? 'zh-TW' : 'en-US';
      const startStr = startDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
      const endStr = endDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
      
      const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
      const headerEl = document.querySelector('h2');
      if (headerEl && (headerEl.textContent.includes('Practice Booking') || headerEl.textContent.includes('練習預約'))) {
        headerEl.textContent = t('practiceBookingTitle', { startMonth: startStr, endMonth: endStr });
        headerEl.setAttribute('data-i18n', 'practiceBookingTitle');
      }
    } catch (e) {
	Logger.warn('Invalid practice dates in config:', e);
    }
  }
}

/**
 * Initialize modern calendar component
 * Creates a functional practice calendar for TN wizard using TNCalendarModern
 */
function initTNCalendarModern() {
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) { 
	Logger.warn('TN: #calendarContainer not found after mount'); 
    return; 
  }
  
  // Replace double-init guard with step-based check
  if (calendarEl.dataset.initStep === '4') {
	Logger.debug('TN: calendar already inited for step 4'); 
    return;
  }
  
  // Check if TNCalendarModern is available
  if (typeof window.TNCalendarModern === 'undefined') {
    Logger.error('TN: TNCalendarModern not available. Make sure tn_calendar_modern.js is loaded.');
    return;
  }
  
  const p = window.__CONFIG?.practice || {};
  const practiceStartDate = p.practice_start_date ? new Date(p.practice_start_date) : new Date(2026, 0, 1);
  const practiceEndDate = p.practice_end_date ? new Date(p.practice_end_date) : new Date(2026, 7, 31);
  
  // Initialize modern calendar
  const calendar = window.TNCalendarModern.create('#calendarContainer', {
    practiceStartDate: practiceStartDate,
    practiceEndDate: practiceEndDate,
    minimumHoursPerTeam: p.minimum_hours_per_team || 12,
    maxDatesPerTeam: p.max_dates_per_team || 60,
    extraSessionPrice: p.extra_session_price || 600,
    defaultDuration: 2,
    defaultHelper: 'ST'
  });
  
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
	Logger.debug('initTNCalendar: Initializing calendar with options:', options);
  
  const container = document.querySelector(options.mount);
  if (!container) {
	Logger.error('initTNCalendar: Container not found:', options.mount);
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
	Logger.debug('📅 Calendar State:');
	Logger.debug('  - Config:', window.__CONFIG?.practice);
	Logger.debug('  - Container:', el);
	Logger.debug('  - Initialized:', el?.dataset.initialized);
	Logger.debug('  - Init Step:', el?.dataset.initStep);
	Logger.debug('  - Window start:', window.__CONFIG?.practice?.practice_start_date);
	Logger.debug('  - Window end:', window.__CONFIG?.practice?.practice_end_date);
	Logger.debug('  - Allowed weekdays:', window.__CONFIG?.practice?.allowed_weekdays);
	Logger.debug('  - Visible:', !!(el && el.offsetParent), 'Rect:', el?.getBoundingClientRect?.());
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
  if (!startDate) Logger.warn('TN calendar: windowStart missing from config');
  if (!endDate) Logger.warn('TN calendar: windowEnd missing from config');
  
	Logger.debug('createTNCalendar: Using dates:', { startDate, endDate, allowedWeekdays });
  
  // Store constraints globally for use in date validation
  window.__PRACTICE_CONSTRAINTS = {
    startDate: startDate,
    endDate: endDate,
    allowedWeekdays: allowedWeekdays,
    maxDatesPerTeam: practiceConfig.max_dates_per_team || 3
  };
  
  // Default to 2026 season if no dates in config
  const seasonYear = 2026;
  const start = startDate ? new Date(startDate) : new Date(seasonYear, 0, 1); // Jan 1, 2026
  const end = endDate ? new Date(endDate) : new Date(seasonYear, 6, 31); // Jul 31, 2026
  
	Logger.debug('createTNCalendar: Generated date range:', { start, end });
  
  container.innerHTML = '';
  
  // Generate months between start and end dates
  const months = generateMonths(start, end);

  months.forEach((monthData, index) => {
    const monthBlock = createMonthBlock(monthData, allowedWeekdays);
    container.appendChild(monthBlock);
  });
  
	Logger.debug('createTNCalendar: Calendar creation completed. Container children:', container.children.length);
  
  // Debug: Count checkboxes in the calendar
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
	Logger.debug('createTNCalendar: Found', checkboxes.length, 'checkboxes in calendar');
  
  // Debug: Show first few checkboxes
  if (checkboxes.length > 0) {
	Logger.debug('createTNCalendar: First checkbox:', checkboxes[0]);
	Logger.debug('createTNCalendar: Checkbox visibility:', window.getComputedStyle(checkboxes[0]).display);
  }
  
  // Set up event listeners for calendar interactions
  setupCalendarEventListeners(container);
  
  // Debug: Test if event listeners are working
	Logger.debug('🎯 createTNCalendar: Setting up debug test for calendar interactions');
  setTimeout(() => {
    const testCheckbox = container.querySelector('input[type="checkbox"]');
    if (testCheckbox) {
	Logger.debug('🎯 createTNCalendar: Found test checkbox:', testCheckbox);
	Logger.debug('🎯 createTNCalendar: Checkbox parent:', testCheckbox.closest('[data-date]'));
    } else {
	Logger.warn('🎯 createTNCalendar: No checkboxes found in calendar!');
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
	Logger.debug('🎯 Checkbox clicked! Date:', firstCheckbox.dataset.date, 'Checked:', firstCheckbox.checked);
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
    
    // Get locale based on current language
    const locale = window.i18n?.getCurrentLanguage() === 'zh' ? 'zh-TW' : 'en-US';
    
    months.push({
      year: current.getFullYear(),
      month: current.getMonth(),
      monthName: current.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
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
    
    // Check if date is past (but allow all 2026 dates in practice window)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const isPast = dateOnly < today;
    
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
  
  // Weekday headers with i18n
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  const weekdays = document.createElement('div');
  weekdays.className = 'weekdays';
  weekdays.innerHTML = `
    <div data-i18n="sun">${t('sun')}</div>
    <div data-i18n="mon">${t('mon')}</div>
    <div data-i18n="tue">${t('tue')}</div>
    <div data-i18n="wed">${t('wed')}</div>
    <div data-i18n="thu">${t('thu')}</div>
    <div data-i18n="fri">${t('fri')}</div>
    <div data-i18n="sat">${t('sat')}</div>
  `;
  
  // Calendar grid
  const grid = document.createElement('div');
  grid.className = 'month-grid';
  
  // Generate days with allowed weekdays
  const days = generateMonthDays(monthData.startDate, monthData.endDate, allowedWeekdays);
  
  days.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    if (day.empty) {
      dayEl.className += ' empty';
    } else {
      if (day.available) {
        // createDayContent now returns a div with programmatically set dropdowns
        const contentDiv = createDayContent(day);
        // Append all children from the content div to dayEl
        while (contentDiv.firstChild) {
          dayEl.appendChild(contentDiv.firstChild);
        }
      } else {
        dayEl.innerHTML = `<span class="day-number">${day.day}</span>`;
        dayEl.className += ' unavailable';
      }
    }
    
    grid.appendChild(dayEl);
  });
  
  content.appendChild(weekdays);
  content.appendChild(grid);
  
  monthBlock.appendChild(toggle);
  monthBlock.appendChild(content);

  return monthBlock;
}

/**
 * Create content for available days
 * Matches original calendar structure with checkboxes and dropdowns
 */
function createDayContent(day) {
  // Fix timezone bug: toISOString() converts to UTC, shifting dates back by one day in Hong Kong (UTC+8)
  // Use local date components instead
  const year = day.date.getFullYear();
  const month = String(day.date.getMonth() + 1).padStart(2, '0');
  const dayNum = String(day.date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${dayNum}`;
  const constraints = window.__PRACTICE_CONSTRAINTS || {};
  
  // Check if date is within practice window (allow all 2026 dates in window)
  let isWithinWindow = true;
  if (constraints.startDate && constraints.endDate) {
    const windowStart = new Date(constraints.startDate);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(constraints.endDate);
    windowEnd.setHours(23, 59, 59, 999); // End of day
    const checkDate = new Date(day.date);
    checkDate.setHours(0, 0, 0, 0);
    isWithinWindow = checkDate >= windowStart && checkDate <= windowEnd;
  }
  
  // Check if date is on allowed weekday
  const dayOfWeek = day.date.getDay(); // 0=Sunday, 1=Monday, etc.
  const isAllowedWeekday = constraints.allowedWeekdays && constraints.allowedWeekdays.includes(dayOfWeek);
  
  const isDisabled = !isWithinWindow || !isAllowedWeekday;
  
  // Get translated strings for dropdowns
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  
  // Use explicit selected attribute value to avoid browser normalization
  const selectedAttr = 'selected="selected"';
  
  const html = `
    <label class="day-checkbox">
      <input type="checkbox" data-date="${dateStr}" ${isDisabled ? 'disabled' : ''} />
      <span class="day-number">${day.day}</span>
    </label>
    <div class="dropdowns hide">
      <select class="duration">
        <option value="1" data-i18n="oneHour">${t('oneHour')}</option>
        <option value="2" ${selectedAttr} data-i18n="twoHours">${t('twoHours')}</option>
      </select>
      <select class="helpers">
        <option value="NONE" data-i18n="steersmanCoachNone">${t('steersmanCoachNone')}</option>
        <option value="S" data-i18n="steersmanCoachS">${t('steersmanCoachS')}</option>
        <option value="T" data-i18n="steersmanCoachT">${t('steersmanCoachT')}</option>
        <option value="ST" ${selectedAttr} data-i18n="steersmanCoachST">${t('steersmanCoachST')}</option>
      </select>
    </div>
  `;
  
  // Create a temporary container div to hold the HTML
  const dayContentDiv = document.createElement('div');
  dayContentDiv.innerHTML = html;
  
  // BUGFIX: Programmatically set default selections after innerHTML insertion
  // innerHTML may not preserve selected attribute properly in all browsers
  const durationSelect = dayContentDiv.querySelector('select.duration');
  const helpersSelect = dayContentDiv.querySelector('select.helpers');
  
  if (durationSelect && durationSelect.options.length > 0) {
    // Set 2h as default (index 1)
    durationSelect.selectedIndex = 1;
    durationSelect.value = '2';
  }
  
  if (helpersSelect && helpersSelect.options.length > 0) {
    // Set ST (Steersman & Coach) as default (index 3)
    helpersSelect.selectedIndex = 3;
    helpersSelect.value = 'ST';
  }
  
  return dayContentDiv;
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
      // The checkbox HAS the data-date attribute, it's not inside a data-date container
      // Dropdowns are siblings of the checkbox's parent label
      const label = checkbox.parentElement; // LABEL.day-checkbox
      const dateContainer = label.parentElement; // Parent containing both label and dropdowns
      const dropdowns = dateContainer?.querySelector('.dropdowns');
      const dateStr = checkbox.getAttribute('data-date');
      
      console.log('🔧 DEBUG addCalendarEventHandlers: checkbox:', checkbox);
      console.log('🔧 DEBUG addCalendarEventHandlers: label:', label);
      console.log('🔧 DEBUG addCalendarEventHandlers: dateContainer:', dateContainer);
      console.log('🔧 DEBUG addCalendarEventHandlers: dropdowns:', dropdowns);
      
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
	Logger.debug(`🎯 addDateToCurrentTeam: Date ${dateStr} already exists for team ${currentTeamKey}`);
    return;
  }
  
  // Check max dates limit
  if (rows.length >= (constraints.maxDatesPerTeam || 3)) {
	Logger.warn(`🎯 addDateToCurrentTeam: Max dates limit reached for team ${currentTeamKey}`);
    return;
  }
  
  // Add new date with default values
  const newRow = {
    pref_date: dateStr,
    duration_hours: 2,
    helper: 'ST'
  };
  
  rows.push(newRow);
  writeTeamRows(currentTeamKey, rows);
  
	Logger.debug(`🎯 addDateToCurrentTeam: Added date ${dateStr} to team ${currentTeamKey}`);
}

/**
 * Remove date from current team's practice data
 */
function removeDateFromCurrentTeam(dateStr) {
  const currentTeamKey = getCurrentTeamKey();
  const rows = readTeamRows(currentTeamKey);
  
  const filteredRows = rows.filter(row => row.pref_date !== dateStr);
  writeTeamRows(currentTeamKey, filteredRows);
  
	Logger.debug(`🎯 removeDateFromCurrentTeam: Removed date ${dateStr} from team ${currentTeamKey}`);
}

/**
 * Update practice summary based on selected dates and options
 */
function updatePracticeSummary() {
  // Use the modern calendar's update method if available
  if (window.TNCalendarModern?.instance) {
    window.TNCalendarModern.instance.updateSummary();
    return;
  }
  
  // Fallback to old calendar format (for backward compatibility)
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
    
    const duration = parseInt(durationSelect?.value, 10) || 0;
    const helperType = helpersSelect?.value || 'NONE';
    
    if (duration > 0) {
      totalHours += duration;
      
      // Check for 'T' (Trainer) or 'ST' (both) - add duration, not count
      if (helperType === 'T' || helperType === 'ST') {
        trainerCount += duration;
      }
      
      // Check for 'S' (Steersman) or 'ST' (both) - add duration, not count
      if (helperType === 'S' || helperType === 'ST') {
        steersmanCount += duration;
      }
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
 * Add Step 1 package option styles
 * These styles are needed for Step 1's entry option selection
 */
function addStep1Styles() {
  // Prevent duplicate injection
  if (document.getElementById('tn-step1-styles')) {
    Logger.debug('✅ Step 1 styles already loaded, skipping');
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'tn-step1-styles';
  style.textContent = `
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
      border-color: var(--theme-primary, #f7b500);
      box-shadow: 0 2px 8px rgba(247, 181, 0, 0.1);
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
      margin-top: 2px;
      margin-bottom: 2px;
      padding-top: 2px;
      padding-bottom: 2px;
      color: #333;
      font-size: 1.3rem;
      font-weight: 600;
    }
    
    #tnScope .package-price {
      font-size: 1.4rem;
      font-weight: bold;
      color: #000;
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
    
    #tnScope .selection-text,
    #tnScope .package-selection-indicator .selection-text,
    #tnScope .package-option.selected .package-selection-indicator .selection-text {
      color: #666;
      font-size: 0.9rem;
      font-weight: bold !important;
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
    
    /* Team Fields Styles */
    #tnScope .team-field {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      background: #f9f9f9;
    }
    
    #tnScope .team-header h3 {
      margin: 0 0 -0.25rem 0;  /* Negative margin brings heading closer to fields */
      color: var(--theme-primary-dark, #c79100) !important;
      font-size: 1.2rem;
    }
    
    #tnScope .team-inputs {
      display: block;
      /* Single column - fields stacked vertically */
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
    
    /* Team Count Selector - Compact inline layout matching WU/SC */
    #tnScope #teamCount {
      /* No padding - browser default like WU/SC */
      width: auto !important;
      display: inline-block !important;
      vertical-align: baseline;  /* Align with text baseline */
      border: 1px solid #ced4da;
      border-radius: 0;  /* Sharp corners to match WU/SC */
      font-size: 1rem;
      line-height: 1.5;  /* Match label line-height */
      transition: border-color 0.2s ease;
    }
    
    #tnScope #teamCount:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    #tnScope label[for="teamCount"] {
      display: inline-block !important;
      margin-bottom: 0 !important;
      vertical-align: baseline;  /* Align with text baseline */
      font-weight: 500;
      color: #495057;
      line-height: 1.5;  /* Match select line-height */
    }
    
    /* Team Count Section Spacing */
    #tnScope #teamCountSection {
      margin-bottom: 2rem;  /* Space between question and team fields */
    }
    
    /* Team Details Heading Spacing */
    #tnScope .card h2 {
      margin-bottom: 0;  /* Remove gap between heading and question */
    }
  `;
  document.head.appendChild(style);
  Logger.debug('✅ Step 1 package option and team field styles injected');
}

/**
 * Add Step 2 organization and manager form styles
 * These styles are needed for Step 2's organization and manager contact forms
 */
function addStep2Styles() {
  // Prevent duplicate injection
  if (document.getElementById('tn-step2-styles')) {
    Logger.debug('✅ Step 2 styles already loaded, skipping');
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'tn-step2-styles';
  style.textContent = `
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
      color: var(--theme-primary-dark, #c79100) !important;
      margin-bottom: 0.5rem;  /* Reduced from 1.5rem to bring content closer */
      font-size: 1.2rem;
      border-bottom: 2px solid var(--theme-primary, #f7b500);
      padding-bottom: 0.5rem;
    }
    
    #tnScope .manager-grid {
      display: block;
      /* Single column - fields stacked vertically for full-width */
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
    
    #tnScope .btn-secondary,
    #tnScope .form-actions .btn-secondary,
    #tnScope .form-actions button.btn-secondary,
    #tnScope #backToStep1,
    #tnScope #backToStep2 {
      background: var(--theme-primary-dark, #c79100) !important;
      color: white !important;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    #tnScope .btn-secondary:hover,
    #tnScope .form-actions .btn-secondary:hover,
    #tnScope .form-actions button.btn-secondary:hover,
    #tnScope #backToStep1:hover,
    #tnScope #backToStep2:hover {
      background: var(--theme-primary, #f7b500) !important;
      opacity: 0.9;
      transform: translateY(-1px);
    }
    
    @media (max-width: 768px) {
      #tnScope .organization-form {
        padding: 1rem;
      }
    }
  `;
  document.head.appendChild(style);
  Logger.debug('✅ Step 2 organization and manager form styles injected');
}

/**
 * Add Step 3 race day form styles
 * These styles are needed for Step 3's race day arrangements form
 */
function addStep3Styles() {
  // Prevent duplicate injection
  if (document.getElementById('tn-step3-styles')) {
    Logger.debug('✅ Step 3 styles already loaded, skipping');
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'tn-step3-styles';
  style.textContent = `
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
      color: var(--theme-primary-dark, #c79100) !important;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      border-bottom: 2px solid var(--theme-primary, #f7b500);
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
    
    /* Marquee price should be black */
    #tnScope #marqueePrice {
      color: #000 !important;
    }
    
    /* Athlete Marquee label - theme color */
    #tnScope label[for="marqueeQty"] {
      color: var(--theme-primary-dark, #c79100) !important;
      font-weight: 600;
      font-size: 1.2rem;
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
    
    /* Per-team Steersman Selection Cards */
    #tnScope .steersman-per-team-section {
      margin: 2rem 0;
    }
    
    #tnScope .steersman-per-team-section h4 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--theme-primary-dark, #c79100) !important;
    }
    
    #tnScope .team-steersman-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      background: #fafafa;
    }
    
    #tnScope .team-steersman-header {
      font-weight: 600;
      margin-bottom: 12px;
      color: #333;
    }
    
    #tnScope .team-steersman-options .steersman-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      background: white;
      cursor: pointer;
    }
    
    #tnScope .team-steersman-options .steersman-select:focus {
      outline: none;
      border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
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
  `;
  document.head.appendChild(style);
  Logger.debug('✅ Step 3 race day form styles injected');
}

/**
 * Add calendar styles
 */
function addCalendarStyles() {
  const style = document.createElement('style');
  style.id = 'tn-calendar-styles';
  style.textContent = `
    /* Ensure CSS variables are available in tnScope */
    #tnScope {
      --theme-primary: var(--theme-primary, #f7b500);
      --theme-primary-light: var(--theme-primary-light, #fff8e6);
      --theme-primary-dark: var(--theme-primary-dark, #c79100);
    }
    
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
    
    /* Form Actions Styles */
    #tnScope .form-actions {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e9ecef;
      text-align: right;
    }
    
    #tnScope .btn,
    #tnScope .form-actions .btn,
    #tnScope .form-actions button {
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
    
    #tnScope .btn-primary,
    #tnScope .form-actions .btn-primary,
    #tnScope .form-actions button.btn-primary,
    #tnScope #nextToStep2,
    #tnScope #nextToStep3,
    #tnScope #nextToStep4 {
      background: var(--theme-primary, #f7b500) !important;
      color: white !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    #tnScope .btn-primary:hover,
    #tnScope .form-actions .btn-primary:hover,
    #tnScope .form-actions button.btn-primary:hover,
    #tnScope #nextToStep2:hover,
    #tnScope #nextToStep3:hover,
    #tnScope #nextToStep4:hover {
      background: var(--theme-primary-dark, #c79100) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateY(-1px);
    }
    
    #tnScope .btn-primary:active,
    #tnScope .form-actions .btn-primary:active,
    #tnScope .form-actions button.btn-primary:active,
    #tnScope #nextToStep2:active,
    #tnScope #nextToStep3:active,
    #tnScope #nextToStep4:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
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
  if (!practiceSlots || !practiceSlots.length) {
    Logger.warn('No practice slots available - check v_timeslots_public view in database');
    return;
  }
  
  // Split slots by duration
  const slots2h = practiceSlots.filter(slot => Number(slot.duration_hours) === 2);
  const slots1h = practiceSlots.filter(slot => Number(slot.duration_hours) === 1);
  
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
      // Use localized label if available (label_tc for Chinese, label_en/label for English)
      const lang = window.i18n?.getCurrentLanguage?.() || 'en';
      const localizedLabel = lang === 'zh' ? (slot.label_tc || slot.label_en || slot.label) : (slot.label_en || slot.label);
      option.textContent = localizedLabel || slot.slot_code;

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
	Logger.debug(`🎯 populateSlotSelects: Restored from saved ranks ${savedRank.slot_code} for ${selectId}`);
    } else if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
      select.value = currentValue;
	Logger.debug(`🎯 populateSlotSelects: Restored selection ${currentValue} for ${selectId}`);
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
 * Returns array of error objects for unified error system
 */
function checkForDuplicates() {
  const allSelects = [
    ...TN_SELECTORS.practice.rank2h,
    ...TN_SELECTORS.practice.rank1h
  ];
  
  const selectedValues = new Map();
  const duplicates = new Set();
  const errors = [];
  
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
  
  // Clear previous error messages (legacy method)
  clearSlotErrors();
  
  // Create error objects for duplicates
  if (duplicates.size > 0) {
    duplicates.forEach(duplicateValue => {
      const duplicateSelects = Array.from(selectedValues.entries())
        .filter(([value]) => value === duplicateValue)
        .map(([, select]) => select);
      
      duplicateSelects.forEach(select => {
        // Use error system if available
        if (window.errorSystem) {
          errors.push({
            field: select.id,
            messageKey: 'duplicateSlotSelection'
          });
        } else {
          // Fallback to legacy method
          showSlotError(select, 'This slot is already selected');
        }
      });
    });
  }
  
  // Refresh all selects to update disabled options
  refreshSlotSelects();
  
  return errors;
}

/**
 * Refresh slot selects to update disabled options
 */
function refreshSlotSelects() {
  if (!practiceSlots.length) return;
  
  // Split slots by duration
  const slots2h = practiceSlots.filter(slot => Number(slot.duration_hours) === 2);
  const slots1h = practiceSlots.filter(slot => Number(slot.duration_hours) === 1);
  
  // Refresh 2-hour selects
  populateSlotSelects(slots2h, ['slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3']);
  
  // Refresh 1-hour selects
  populateSlotSelects(slots1h, ['slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3']);
}

/**
 * Show slot selection error
 * Uses error system if available, otherwise falls back to legacy method
 */
function showSlotError(select, message) {
  if (!select) return;
  
  // Use error system if available
  if (window.errorSystem && select.id) {
    window.errorSystem.showFieldError(select.id, 'duplicateSlotSelection', {
      scrollTo: false,
      focus: false
    });
    return;
  }
  
  // Legacy method: Remove existing error
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
 * Uses error system if available, otherwise falls back to legacy method
 */
function clearSlotErrors() {
  // Use error system if available
  if (window.errorSystem) {
    const allSelects = [
      ...TN_SELECTORS.practice.rank2h,
      ...TN_SELECTORS.practice.rank1h
    ];
    
    allSelects.forEach(selector => {
      const select = document.querySelector(selector);
      if (select && select.id) {
        window.errorSystem.clearFieldError(select.id);
      }
    });
    return;
  }
  
  // Legacy method: Remove error elements
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
/**
 * Populate team selector with actual team names from sessionStorage
 */
function populateTeamSelector() {
  const teamSelect = document.getElementById('teamSelect');
  if (!teamSelect) return;
  
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Clear existing options
  teamSelect.innerHTML = '<option value="">-- Select Team --</option>';
  
  if (teamCount === 0) {
    teamSelect.innerHTML = `<option disabled data-i18n="noTeams">${t('noTeams')}</option>`;
    console.log('[Step 4] No teams found');
    return;
  }
  
  for (let i = 1; i <= teamCount; i++) {
    const option = document.createElement('option');
    // Use 0-based index for value (to match change handler expectations)
    option.value = (i - 1).toString();
    
    // Get actual team name from sessionStorage using correct key
    const savedName = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamName = savedName || `Team ${i}`;
    
    option.textContent = teamName;
    teamSelect.appendChild(option);
  }
  
  console.log(`[Step 4] Populated team selector with ${teamCount} teams`);
}

function initTeamSelector() {
  const teamSelect = document.getElementById('teamSelect');
  const teamNameFields = document.getElementById('teamNameFields');
  
  if (!teamSelect || !teamNameFields) return;

  // Populate team selector with actual names
  populateTeamSelector();

  // Get team count and names for display
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  const teamNames = [];
  for (let i = 1; i <= teamCount; i++) {
    const name = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamName = name || `Team ${i}`;
    teamNames.push(teamName);
  }

  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;

  if (teamNames.length === 0) {
    teamNameFields.textContent = '';
  } else {
    // Set to first team (index 0)
    teamSelect.value = '0';
    teamNameFields.textContent = t('nowScheduling', { teamName: teamNames[0] });

    // Initialize current team key
    setCurrentTeamKey('t1');
  }
  
  // Handle team selection change
  teamSelect.addEventListener('change', () => {
    const selectedIndex = parseInt(teamSelect.value, 10);
    const teamKey = `t${selectedIndex + 1}`;
    console.debug(`🎯 Team switch: idx=${selectedIndex} key=${teamKey}`);
    
    // Save selected team for restoration
    saveSelectedTeam(selectedIndex);
    
    setCurrentTeamKey(teamKey);
    updateCalendarForTeam(selectedIndex);
    updateSlotPreferencesForTeam(selectedIndex);
    updatePracticeSummary(); // Update the practice summary box when switching teams
    
    const tChange = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    // Get updated team name from sessionStorage (in case it changed)
    // Note: selectedIndex is 0-based, team numbers are 1-based
    const teamNum = selectedIndex + 1;
    const updatedName = sessionStorage.getItem(`tn_team_name_en_${teamNum}`) || `Team ${teamNum}`;
    const teamName = updatedName || tChange('teamLabel', { num: teamNum });
    teamNameFields.textContent = tChange('nowScheduling', { teamName: teamName });
    
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
	Logger.debug(`🎯 Slot preference changed: ${selectId} = ${select.value}`);
        
        // Handle ranking validation and persistence
        handleSlotRankingChange();
        
        // Save current team's data when slot preferences change
        saveCurrentTeamPracticeData();
        
        // Update duplicate prevention
        setupSlotDuplicatePrevention();
        
        // Update practice summary box
        updatePracticeSummary();
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
	Logger.debug(`🎯 handleSlotRankingChange: Saved ranks for team ${currentTeamKey}:`, ranks);
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
	Logger.debug('🎯 fillSingleTeamForSubmission: Creating complete data for all steps (1 team)');
  
  // Step 1: Set team count to 1
  sessionStorage.setItem('tn_team_count', '1');
  sessionStorage.setItem('tn_opt1_count', '1');
  sessionStorage.setItem('tn_opt2_count', '0');
  sessionStorage.setItem('tn_race_category', 'mixed_open');
	Logger.debug('🎯 Step 1: Set team count to 1');
  
  // Step 2: Fill team info and contact data with unique random name
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const uniqueTeamName = `Test Team ${timestamp}_${random}`;
  
  sessionStorage.setItem('tn_team_name_en_1', uniqueTeamName);
  sessionStorage.setItem('tn_team_category_1', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_1', 'opt1');
  
  sessionStorage.setItem('tn_org_name', 'Test Organization Single');
  sessionStorage.setItem('tn_mailing_address', '123 Test Street, Test City, TC 12345');
  
  // Fill manager data
  sessionStorage.setItem('tn_manager1_name', 'John Doe');
  sessionStorage.setItem('tn_manager1_phone', '+85291234567');
  sessionStorage.setItem('tn_manager1_email', 'john@test.com');
  sessionStorage.setItem('tn_manager2_name', 'Jane Smith');
  sessionStorage.setItem('tn_manager2_phone', '+85292345678');
  sessionStorage.setItem('tn_manager2_email', 'jane@test.com');
	Logger.debug('🎯 Step 2: Team info, contact data, and managers filled');
  
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
	Logger.debug('🎯 Step 3: Race day data filled');
  
  // Step 4: Fill practice data for team 1 with 12 hours minimum (weekdays after 10/27/2026)
  const practiceRows = [
    { pref_date: '2026-10-28', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2026-10-30', duration_hours: 2, helper: 'T' }, // Friday - 2hr
    { pref_date: '2026-11-02', duration_hours: 2, helper: 'S' }, // Monday - 2hr
    { pref_date: '2026-11-04', duration_hours: 2, helper: 'ST' }, // Wednesday - 2hr
    { pref_date: '2026-11-06', duration_hours: 2, helper: 'S' }, // Friday - 2hr
    { pref_date: '2026-11-09', duration_hours: 2, helper: 'T' }  // Monday - 2hr (Total: 12hrs)
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
	Logger.debug('🎯 Step 4: Practice data filled for team 1');
  
  // Navigate to step 5 (summary) only if wizard is initialized
  if (wizardMount) {
    loadStep(5);
  } else {
	Logger.debug('🎯 Wizard not initialized, skipping navigation (data filled in sessionStorage)');
  }
  
	Logger.debug('🎯 fillSingleTeamForSubmission: Complete data created for all steps');
	Logger.debug('🎯 Ready for submission testing with 1 team!');
	Logger.debug('🎯 Available debug functions:');
	Logger.debug('  - window.__DBG_TN.fillSingleTeam() - Fill all steps with single team');
	Logger.debug('  - window.__DBG_TN.clearStep5() - Clear all data');
	Logger.debug('  - window.submitTNForm() - Submit the form');
}

/**
 * Fill all steps with complete data for multiple teams (3 teams)
 */
function fillMultipleTeamsForSubmission() {
	Logger.debug('🎯 fillMultipleTeamsForSubmission: Creating complete data for all steps (3 teams)');
  
  // Step 1: Set team count to 3
  sessionStorage.setItem('tn_team_count', '3');
  sessionStorage.setItem('tn_opt1_count', '2');
  sessionStorage.setItem('tn_opt2_count', '1');
  sessionStorage.setItem('tn_race_category', 'mixed_open');
	Logger.debug('🎯 Step 1: Set team count to 3 (2 opt1, 1 opt2)');
  
  // Step 2: Fill team info and contact data with unique random names
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const uniqueTeamName1 = `Test Team ${timestamp}_${random}_1`;
  const uniqueTeamName2 = `Test Team ${timestamp}_${random}_2`;
  const uniqueTeamName3 = `Test Team ${timestamp}_${random}_3`;
  
  sessionStorage.setItem('tn_team_name_en_1', uniqueTeamName1);
  sessionStorage.setItem('tn_team_category_1', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_1', 'opt1');

  sessionStorage.setItem('tn_team_name_en_2', uniqueTeamName2);
  sessionStorage.setItem('tn_team_category_2', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_2', 'opt1');

  sessionStorage.setItem('tn_team_name_en_3', uniqueTeamName3);
  sessionStorage.setItem('tn_team_category_3', 'Mixed Open');
  sessionStorage.setItem('tn_team_option_3', 'opt2');
  
  sessionStorage.setItem('tn_org_name', 'Test Organization Multi');
  sessionStorage.setItem('tn_mailing_address', '123 Test Street, Test City, TC 12345');
  
  // Fill manager data
  sessionStorage.setItem('tn_manager1_name', 'John Doe');
  sessionStorage.setItem('tn_manager1_phone', '+85291234567');
  sessionStorage.setItem('tn_manager1_email', 'john@test.com');
  sessionStorage.setItem('tn_manager2_name', 'Jane Smith');
  sessionStorage.setItem('tn_manager2_phone', '+85292345678');
  sessionStorage.setItem('tn_manager2_email', 'jane@test.com');
	Logger.debug('🎯 Step 2: Team info, contact data, and managers filled');
  
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
	Logger.debug('🎯 Step 3: Race day data filled');
  
  // Step 4: Fill practice data for all teams with 12 hours minimum (weekdays after 10/27/2026)
  const practiceRows = [
    { pref_date: '2026-10-28', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2026-10-30', duration_hours: 2, helper: 'T' }, // Friday - 2hr
    { pref_date: '2026-11-02', duration_hours: 2, helper: 'S' }, // Monday - 2hr
    { pref_date: '2026-11-04', duration_hours: 2, helper: 'ST' }, // Wednesday - 2hr
    { pref_date: '2026-11-06', duration_hours: 2, helper: 'S' }, // Friday - 2hr
    { pref_date: '2026-11-09', duration_hours: 2, helper: 'T' }  // Monday - 2hr (Total: 12hrs)
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
	Logger.debug('🎯 Step 4: Practice data filled for all 3 teams');
  
  // Navigate to step 5 (summary) only if wizard is initialized
  if (wizardMount) {
    loadStep(5);
  } else {
	Logger.debug('🎯 Wizard not initialized, skipping navigation (data filled in sessionStorage)');
  }
  
	Logger.debug('🎯 fillMultipleTeamsForSubmission: Complete data created for all steps');
	Logger.debug('🎯 Ready for submission testing with 3 teams!');
	Logger.debug('🎯 Available debug functions:');
	Logger.debug('  - window.__DBG_TN.fillMultipleTeams() - Fill all steps with multiple teams');
	Logger.debug('  - window.__DBG_TN.clearStep5() - Clear all data');
	Logger.debug('  - window.submitTNForm() - Submit the form');
}

/**
 * Quick test: Fill form with 3 teams and navigate to summary (for console testing on Vercel)
 * Usage in browser console: testQuickSubmit()
 */
async function testQuickSubmit() {
	Logger.debug('🚀 testQuickSubmit: Filling form with 3 teams...');
  
  try {
    // Fill all form data
    fillMultipleTeamsForSubmission();
    
    // Wait a moment for data to settle
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Navigate to summary page if wizard is initialized
    if (wizardMount) {
      await loadStep(5);
	Logger.debug('✅ testQuickSubmit: Form filled! Now on Step 5 (Summary). Click Submit when ready.');
    } else {
	Logger.debug('✅ testQuickSubmit: Form filled! Navigate to the TN registration form to see it.');
    }
    
	Logger.debug('📝 Team names generated:', {
      team1: sessionStorage.getItem('tn_team_name_en_1'),
      team2: sessionStorage.getItem('tn_team_name_en_2'),
      team3: sessionStorage.getItem('tn_team_name_en_3')
    });
  } catch (error) {
	Logger.error('❌ testQuickSubmit failed:', error);
    throw error;
  }
}

/**
 * Quick test with single team and navigate to summary (for console testing on Vercel)
 * Usage in browser console: testQuickSubmitSingle()
 */
async function testQuickSubmitSingle() {
	Logger.debug('🚀 testQuickSubmitSingle: Filling form with 1 team...');
  
  try {
    // Fill all form data for single team
    fillSingleTeamForSubmission();
    
    // Wait a moment for data to settle
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Navigate to summary page if wizard is initialized
    if (wizardMount) {
      await loadStep(5);
	Logger.debug('✅ testQuickSubmitSingle: Form filled! Now on Step 5 (Summary). Click Submit when ready.');
    } else {
	Logger.debug('✅ testQuickSubmitSingle: Form filled! Navigate to the TN registration form to see it.');
    }
    
	Logger.debug('📝 Team name generated:', sessionStorage.getItem('tn_team_name_en_1'));
  } catch (error) {
	Logger.error('❌ testQuickSubmitSingle failed:', error);
    throw error;
  }
}

/**
 * Test submission with current form data (for debugging)
 */
async function testSubmissionWithCurrentData() {
	Logger.debug('🎯 testSubmissionWithCurrentData: Testing submission with current form data');
  
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
    const opt1Count = teams.filter(t => t.option && t.option.startsWith('option_1')).length; // Calculate from actual teams
    const opt2Count = teams.filter(t => t.option && t.option.startsWith('option_2')).length; // Calculate from actual teams
    
    // Generate unique team names to avoid duplicate key errors
    const uniqueTeamNames = teams.map((t, idx) => 
      t.name.startsWith('Test Team') ? `Test Team ${Date.now()}_${idx}` : t.name
    );
    
	Logger.debug('🎯 Generated unique team names:', uniqueTeamNames);
    
        const payload = {
          client_tx_id: 'test_debug_' + Date.now(),
          eventShortRef: 'TN2026',
      category: raceCategory,
      season: 2026,
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
      race_day: raceDay.length > 0 ? raceDay.map(item => ({
        item_code: item.code,
        qty: item.qty,
        ...(item.boat_nos && { boat_nos: item.boat_nos })
      })).filter(item => item.qty > 0) : null,
      practice: practice
    };
    
	Logger.debug('🎯 testSubmissionWithCurrentData: Payload:', JSON.stringify(payload, null, 2));
    
    // Debug practice data collection
	Logger.debug('🎯 Debug practice data:');
	Logger.debug('  - practice object:', practice);
	Logger.debug('  - team count from state:', window.state?.teams?.length);
	Logger.debug('  - team count from sessionStorage:', sessionStorage.getItem('tn_team_count'));
	Logger.debug('  - readTeamRows function:', typeof readTeamRows);
	Logger.debug('  - readTeamRanks function:', typeof readTeamRanks);
    
    // Check what's in sessionStorage for practice data
    const practiceKeys = Object.keys(sessionStorage).filter(key => key.startsWith('tn_practice_') || key.startsWith('tn_slot_ranks_'));
	Logger.debug('  - practice keys in sessionStorage:', practiceKeys);
    practiceKeys.forEach(key => {
	Logger.debug(`  - ${key}:`, sessionStorage.getItem(key));
    });
    
    // Test the Edge Function
    try {
      const { data, error } = await sb.functions.invoke('submit_registration', {
        body: payload
      });
      
        if (error) {
	Logger.error('❌ testSubmissionWithCurrentData: Edge Function error:', error);
	Logger.error('❌ Error message:', error.message);
	Logger.error('❌ Error context:', error.context);
          
          // Make a direct fetch to get the actual error details (debug only)
          try {
            const debugResult = await fetchWithErrorHandling('https://khqarcvszewerjckmtpg.supabase.co/functions/v1/submit_registration', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
              },
              body: JSON.stringify(payload),
              context: 'debug_direct_fetch',
              skipRetry: true // Skip retry for debug calls
            });
            
            Logger.error('❌ Direct fetch result:', debugResult);
          } catch (fetchError) {
            Logger.error('❌ Direct fetch failed:', fetchError);
          }
        } else {
	Logger.debug('✅ testSubmissionWithCurrentData: Success!', data);
        }
      } catch (e) {
	Logger.error('❌ testSubmissionWithCurrentData: Exception during invoke:', e);
        
        // Try to make a direct fetch to get more details (debug only)
        try {
          const debugResult = await fetchWithErrorHandling('https://khqarcvszewerjckmtpg.supabase.co/functions/v1/submit_registration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify(payload),
            context: 'debug_direct_fetch_exception',
            skipRetry: true // Skip retry for debug calls
          });
          
          Logger.error('❌ Direct fetch result:', debugResult);
        } catch (fetchError) {
          Logger.error('❌ Direct fetch failed:', fetchError);
        }
      }
    } catch (e) {
      Logger.error('❌ testSubmissionWithCurrentData: Exception:', e);
    }
}

/**
 * Generate fresh client_tx_id for testing
 */
function generateFreshClientTxId() {
	Logger.debug('🔄 generateFreshClientTxId: Generating fresh client_tx_id');
  
  // Generate a new UUID
  const newId = (self.crypto?.randomUUID && self.crypto.randomUUID()) || 
                String(Date.now()) + Math.random().toString(16).slice(2);
  
  // Store it in localStorage
  localStorage.setItem('raceApp:client_tx_id', newId);
  
	Logger.debug('✅ Fresh client_tx_id generated:', newId);
	Logger.debug('✅ Stored in localStorage: raceApp:client_tx_id');
  
  return newId;
}

/**
 * Clear step 4 data for testing
 */
function clearStep4Data() {
	Logger.debug('🎯 clearStep4: Clearing all step 4 data');
  
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
  
	Logger.debug('🎯 clearStep4: All step 4 data cleared');
};

/**
 * Clear all application data
 */
function clearAllData() {
	Logger.debug('🎯 clearAllData: Clearing all application data');
  
  // Clear all sessionStorage keys that start with 'tn_'
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('tn_')) {
      sessionStorage.removeItem(key);
    }
  });
  
	Logger.debug('🎯 clearAllData: All application data cleared');
}

/**
 * Start fresh - clear all data and reload step 1
 */
function startFresh() {
	Logger.debug('🎯 startFresh: Starting fresh form');
  clearAllData();
  loadStep(1);
	Logger.debug('🎯 startFresh: Form reset to step 1');
}

/**
 * Preview Step 5 with comprehensive sample data
 */
function previewStep5WithSampleData() {
	Logger.debug('🎯 previewStep5WithSampleData: Creating comprehensive sample data for step 5 preview');
  
  // 1. Basic organization info
  sessionStorage.setItem('tn_org_name', 'Hong Kong Dragon Boat Association');
  sessionStorage.setItem('tn_org_address', '123 Victoria Road, Central, Hong Kong');
  sessionStorage.setItem('tn_category', 'mixed_corporate');
  sessionStorage.setItem('tn_season', '2026');
  
  // 2. Team data (3 teams) - using division codes from database
  const sampleTeams = [
    { name: 'Thunder Dragons', category: 'C', option: 'Option I' }, // Mixed Division (Corporate)
    { name: 'Lightning Bolts', category: 'M', option: 'Option II' }, // Open Division (Men)
    { name: 'Storm Riders', category: 'L', option: 'Option I' } // Open Division (Ladies)
  ];
  
  sampleTeams.forEach((team, index) => {
    const i = index + 1;
    sessionStorage.setItem(`tn_team_name_en_${i}`, team.name_en || team.name || '');
    sessionStorage.setItem(`tn_team_name_tc_${i}`, team.name_tc || '');
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
      { pref_date: '2026-01-15', duration_hours: 2, helper: 'S' },
      { pref_date: '2026-01-16', duration_hours: 1, helper: 'T' },
      { pref_date: '2026-01-20', duration_hours: 2, helper: 'ST' }
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
      { pref_date: '2026-01-16', duration_hours: 2, helper: 'ST' },
      { pref_date: '2026-01-19', duration_hours: 1, helper: 'S' }
    ];
    const team2Ranks = [
      { rank: 1, slot_code: 'SUN2_1100_1300' },
      { rank: 2, slot_code: 'SAT2_1215_1415' }
    ];
    writeTeamRows('t2', team2Practice);
    writeTeamRanks('t2', team2Ranks);
    
    // Team 3 practice data (minimal)
    const team3Practice = [
      { pref_date: '2026-01-18', duration_hours: 2, helper: 'T' }
    ];
    const team3Ranks = [
      { rank: 1, slot_code: 'SUN2_1315_1515' }
    ];
    writeTeamRows('t3', team3Practice);
    writeTeamRanks('t3', team3Ranks);
  }
  
  // 5. Navigate to step 5
  loadStep(5);
  
	Logger.debug('🎯 previewStep5WithSampleData: Sample data created and step 5 loaded');
	Logger.debug('🎯 Available debug functions:');
	Logger.debug('  - window.__DBG_TN.previewStep5() - Load step 5 with sample data');
	Logger.debug('  - window.__DBG_TN.clearStep5() - Clear all step 5 data');
}

/**
 * Test team switching functionality
 */
function testTeamSwitchFunction() {
	Logger.debug('🎯 testTeamSwitch: Testing team switching');
  
  const teamSelect = document.getElementById('teamSelect');
  if (teamSelect) {
    // Switch to Team 2
    teamSelect.value = '1';
    teamSelect.dispatchEvent(new Event('change'));
	Logger.debug('🎯 testTeamSwitch: Switched to Team 2');
    
    setTimeout(() => {
      // Switch back to Team 1
      teamSelect.value = '0';
      teamSelect.dispatchEvent(new Event('change'));
	Logger.debug('🎯 testTeamSwitch: Switched back to Team 1');
    }, 2000);
  }
};

/**
 * Test copy button functionality
 */
function testCopyButton() {
	Logger.debug('🎯 testCopyButton: Testing copy button');
  
  const copyBtn = document.getElementById('copyFromTeam1Btn');
  if (copyBtn) {
	Logger.debug('🎯 testCopyButton: Copy button found, testing click');
    copyBtn.click();
  } else {
	Logger.warn('🎯 testCopyButton: Copy button not found!');
  }
};

/**
 * Test calendar data collection
 */
function testCalendarDataCollection() {
	Logger.debug('🎯 testCalendarData: Testing calendar data collection');
  
  const calendarContainer = document.getElementById('calendarContainer');
  if (!calendarContainer) {
	Logger.warn('🎯 testCalendarData: No calendar container found!');
    return;
  }
  
	Logger.debug('🎯 testCalendarData: Calendar container found');
  
  // Check for date elements
  const dateElements = calendarContainer.querySelectorAll('[data-date]');
	Logger.debug(`🎯 testCalendarData: Found ${dateElements.length} date elements`);
  
  // Check for checkboxes
  const checkboxes = calendarContainer.querySelectorAll('input[type="checkbox"]');
	Logger.debug(`🎯 testCalendarData: Found ${checkboxes.length} checkboxes`);
  
  // Check for checked checkboxes
  const checkedBoxes = calendarContainer.querySelectorAll('input[type="checkbox"]:checked');
	Logger.debug(`🎯 testCalendarData: Found ${checkedBoxes.length} checked checkboxes`);
  
  // Test data collection
  const collectedDates = getCurrentTeamDates();
	Logger.debug('🎯 testCalendarData: Collected dates:', collectedDates);
  
  // Test current team data
  const currentTeamIndex = getCurrentTeamIndex();
  const currentTeamData = getTeamPracticeData(currentTeamIndex);
	Logger.debug(`🎯 testCalendarData: Current team ${currentTeamIndex} data:`, currentTeamData);
};

/**
 * Set up navigation for step 4
 */
function setupStep4Navigation() {
  console.log('🎯 setupStep4Navigation: Setting up Step 4 navigation');
  
  // Find buttons within wizardMount (where template content was cloned)
  const container = wizardMount || document.querySelector('#wizardMount');
  if (!container) {
    console.error('❌ setupStep4Navigation: wizardMount container not found');
    return;
  }
  
  // Step 4 uses backBtn/nextBtn from template (equivalent to backToStep3, nextToStep5)
  // Search within container first, then fallback to document-wide search
  const backBtn = container.querySelector('#backBtn') || document.getElementById('backBtn');
  const nextBtn = container.querySelector('#nextBtn') || document.getElementById('nextBtn');
  
  console.log('🎯 setupStep4Navigation: Found elements:', {
    backBtn: !!backBtn,
    nextBtn: !!nextBtn
  });
  
  // Back button (equivalent to backToStep3)
  if (backBtn) {
    // Check if handler already attached
    if (backBtn.dataset.navHandlerAttached === 'true') {
      console.log('⚠️ Step 4: Back button handler already attached, skipping');
    } else {
      backBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-clicks while loading - check global flag
        const isCurrentlyLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
        if (this.disabled || isCurrentlyLoading) {
          console.log('⏳ Step 4: Back button disabled or loading in progress, skipping');
          console.log(`   - Button disabled: ${this.disabled}`);
          console.log(`   - Currently loading: ${isCurrentlyLoading}`);
          return;
        }
        
        // Debounce: Add minimum delay to prevent rapid clicks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check after debounce delay
        const stillLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
        if (stillLoading) {
          console.log('⏳ Step 4: Loading started during debounce, skipping');
          return;
        }
        
        this.disabled = true;
        console.log('🔒 Step 4: Back button disabled, starting navigation');
        
        try {
          console.log('🔙 Step 4: Back button clicked, going to step 3');
          saveStep4Data(); // Save current step data
          await showStep(3); // Await to ensure loading completes
          console.log('✅ Step 4: Navigation to step 3 completed');
        } catch (error) {
          console.error('❌ Step 4: Navigation error:', error);
          throw error;
        } finally {
          // Ensure button is re-enabled after a short delay
          setTimeout(() => {
            this.disabled = false;
            console.log('🔓 Step 4: Back button re-enabled');
          }, 200);
        }
      });
      backBtn.dataset.navHandlerAttached = 'true';
      console.log('✅ Step 4: Back button handler attached');
    }
  } else {
    console.warn('⚠️ Step 4: backBtn not found');
  }
  
  // Next button (equivalent to nextToStep5)
  if (nextBtn) {
    // Check if handler already attached
    if (nextBtn.dataset.navHandlerAttached === 'true') {
      console.log('⚠️ Step 4: Next button handler already attached, skipping');
    } else {
      nextBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-clicks while loading
        if (this.disabled || isLoadingStep) {
          console.log('⏳ Step 4: Next button disabled, skipping');
          return;
        }
        
        this.disabled = true;
        
        try {
          console.log('🔜 Step 4: Next button clicked, validating step 4');
          if (validateStep4()) {
            saveStep4Data();
            await showStep(5);
          } else {
            console.log('⚠️ Step 4: Validation failed, staying on step 4');
          }
        } finally {
          this.disabled = false;
        }
      });
      nextBtn.dataset.navHandlerAttached = 'true';
      console.log('✅ Step 4: Next button handler attached');
    }
  } else {
    console.warn('⚠️ Step 4: nextBtn not found');
  }
  
  Logger.debug('🎯 setupStep4Navigation: Step 4 navigation handlers attached');
}

/**
 * Set up copy from Team 1 button
 */
function setupCopyFromTeam1Button() {
	Logger.debug('🎯 setupCopyFromTeam1Button: Setting up copy button');
  const copyBtn = document.getElementById('copyFromTeam1Btn');
  
  if (copyBtn) {
	Logger.debug('🎯 setupCopyFromTeam1Button: Copy button found, adding event listener');
    
    // Remove any existing event listeners
    copyBtn.removeEventListener('click', handleCopyFromTeam1);
    
    // Add new event listener
    copyBtn.addEventListener('click', handleCopyFromTeam1);
    
	Logger.debug('🎯 setupCopyFromTeam1Button: Event listener added successfully');
  } else {
	Logger.warn('🎯 setupCopyFromTeam1Button: Copy button not found!');
  }
}

/**
 * Copy practice data between teams with validation
 * Works with both legacy and modern calendar
 */
function copyPractice(fromKey, toKey, mode, cfg) {
  const srcRows = readTeamRows(fromKey) || [];
  const srcRanks = readTeamRanks(fromKey) || [];
  const p = cfg?.practice || window.__CONFIG?.practice || {};
  const min = p.practice_start_date || p.window_start;
  const max = p.practice_end_date || p.window_end;
  const wd  = p.allowed_weekdays;
  const maxDates = cfg?.limits?.practice?.max_dates_per_team || p.max_dates_per_team || 60;
  
  // Validate dates if constraints exist
  const valid = (r) => {
    if (!r.pref_date) return false;
    if (min || max || (Array.isArray(wd) && wd.length > 0)) {
      const d = new Date(r.pref_date);
      if (min && d < new Date(min)) return false;
      if (max && d > new Date(max)) return false;
      if (Array.isArray(wd) && wd.length && !wd.includes(d.getDay())) return false;
    }
    return true;
  };
  
  const cleaned = srcRows.filter(valid).map(r => ({ 
    pref_date: r.pref_date,
    duration_hours: r.duration_hours || 2,
    helper: r.helper || 'ST'
  }));
  
  const dest = readTeamRows(toKey) || [];
  const nextRows = (mode === 'append')
    ? dest.concat(cleaned).slice(0, maxDates)
    : cleaned.slice(0, maxDates);
  
  writeTeamRows(toKey, nextRows);
  writeTeamRanks(toKey, Array.isArray(srcRanks) ? srcRanks.slice(0, 3) : []);
  
  // Update calendar display if it's the current team (modern calendar)
  const calendar = window.TNCalendarModern?.getInstance();
  if (calendar && calendar.currentTeam === toKey) {
    calendar.refresh();
  }
  
  return {
    copied: nextRows.length,
    ranks: Array.isArray(srcRanks) ? srcRanks.slice(0, 3).length : 0
  };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existingToast = document.getElementById('tn-toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'tn-toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#52c41a' : '#ff4d4f'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: fadeIn 0.3s ease;
    max-width: 90%;
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Copy practice data from Team 1 to all other teams
 */
function copyFromTeam1ToAllTeams() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  if (teamCount < 2) {
    const msg = window.i18n?.t('noOtherTeams', 'No other teams to copy to') || 'No other teams to copy to';
    showToast(msg, 'error');
    return;
  }

  const fromKey = 't1';
  const srcRows = readTeamRows(fromKey) || [];
  const srcRanks = readTeamRanks(fromKey) || [];

  if (srcRows.length === 0) {
    const msg = window.i18n?.t('team1NoData', 'Team 1 has no practice dates selected') || 'Team 1 has no practice dates selected';
    showToast(msg, 'error');
    return;
  }

  const cfg = window.__CONFIG || {};
  let copiedCount = 0;

  // Copy to all teams except Team 1
  for (let i = 2; i <= teamCount; i++) {
    const toKey = `t${i}`;
    const result = copyPractice(fromKey, toKey, 'replace', cfg);
    if (result.copied > 0) {
      copiedCount++;
    }
  }

  // Refresh calendar if using modern calendar
  const calendar = window.TNCalendarModern?.getInstance();
  if (calendar) {
    calendar.refresh();
  } else {
    // Legacy: update current team's calendar
    const currentTeamIndex = getCurrentTeamIndex();
    updateCalendarForTeam(currentTeamIndex);
  }

  // Update summary
  updatePracticeSummary();

  // Show success message
  const msg = window.i18n?.t('practiceCopiedToAllTeams', 
    `Practice data copied from Team 1 to ${copiedCount} team(s)`) 
    || `Practice data copied from Team 1 to ${copiedCount} team(s)`;
  showToast(msg, 'success');

	Logger.debug(`🎯 Copied ${srcRows.length} practice dates & ${srcRanks.length} slot ranks from Team 1 to ${copiedCount} team(s)`);
}

/**
 * Handle copy from Team 1 button click
 * Copies to all other teams (t2, t3, etc.)
 */
function handleCopyFromTeam1() {
	Logger.debug('🎯 handleCopyFromTeam1: Copy button clicked!');
  
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  if (teamCount < 2) {
    const msg = window.i18n?.t('noOtherTeams', 'No other teams to copy to') || 'No other teams to copy to';
    showToast(msg, 'error');
	Logger.debug('🎯 handleCopyFromTeam1: No other teams to copy to');
    return;
  }

  const fromKey = 't1';
  const srcRows = readTeamRows(fromKey) || [];
  const srcRanks = readTeamRanks(fromKey) || [];

  if (srcRows.length === 0) {
    const msg = window.i18n?.t('team1NoData', 'Team 1 has no practice dates selected') || 'Team 1 has no practice dates selected';
    showToast(msg, 'error');
	Logger.debug('🎯 handleCopyFromTeam1: Team 1 has no practice dates');
    return;
  }

	Logger.debug(`🎯 handleCopyFromTeam1: Copying Team 1 data to all other teams (${teamCount - 1} teams)`);
  
  const cfg = window.__CONFIG || {};
  let copiedCount = 0;

  // Copy to all teams except Team 1
  for (let i = 2; i <= teamCount; i++) {
    const toKey = `t${i}`;
    const result = copyPractice(fromKey, toKey, 'replace', cfg);
    if (result.copied > 0) {
      copiedCount++;
    }
  }

  // Refresh calendar display (modern or legacy)
  const calendar = window.TNCalendarModern?.getInstance();
  if (calendar) {
    // Refresh to show current team's updated data
    calendar.refresh();
  } else {
    // Legacy: update current team's calendar
    const currentTeamIndex = getCurrentTeamIndex();
    updateCalendarForTeam(currentTeamIndex);
  }

  // Update slot preferences for current team
  const currentTeamIndex = getCurrentTeamIndex();
  updateSlotPreferencesForTeam(currentTeamIndex);
  
  // Update summary
  updatePracticeSummary();

  // Show success message
  const msg = window.i18n?.t('practiceCopiedToAllTeams', 
    `Practice data copied from Team 1 to ${copiedCount} team(s)`) 
    || `Practice data copied from Team 1 to ${copiedCount} team(s)`;
  showToast(msg, 'success');
  
	Logger.debug(`🎯 Copied ${srcRows.length} practice dates & ${srcRanks.length} slot ranks from Team 1 to ${copiedCount} team(s)`);
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
	Logger.debug(`🎯 saveTeamPracticeData: Saved data for team ${teamIndex}:`, data);
}

/**
 * Save current team's practice data
 */
function saveCurrentTeamPracticeData() {
  // With TNCalendarModern, data is already saved to sessionStorage automatically
  // when dates are selected/deselected or modified. This function now just
  // ensures the calendar instance is in sync.
  const calendar = window.TNCalendarModern?.getInstance();
  if (calendar) {
    // Calendar already saves data automatically, just refresh to ensure sync
    calendar.refresh();
  }
  
  const currentTeamKey = getCurrentTeamKey();
  const rows = readTeamRows(currentTeamKey) || [];
	Logger.debug(`🎯 saveCurrentTeamPracticeData: Current ${rows.length} rows for ${currentTeamKey}`);
}

/**
 * Validate practice requirements
 * Returns error message if validation fails, null if valid
 */
/**
 * Validate practice requirements
 * Returns array of error objects for unified error system
 */
function validatePracticeRequired() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  const errors = [];
  
  // Get config values
  const practiceConfig = window.__CONFIG?.practice || {};
  const isPracticeRequired = window.__PRACTICE_ENABLED !== false;
  const minimumHours = practiceConfig.minimum_hours_per_team || 12;
  const minimumDates = practiceConfig.minimum_dates_per_team || 1;
  const maxDates = practiceConfig.max_dates_per_team || 60;
  
  // Use TNCalendarModern if available, otherwise fallback to readTeamRows
  const getTeamData = window.TNCalendarModern?.getTeamData || readTeamRows;
  
  for (let i = 0; i < teamCount; i++) {
    const teamNum = i + 1;
    const key = `t${teamNum}`;
    
    // Get team name
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${teamNum}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${teamNum}`);
    const teamName = teamNameEn ? (teamNameTc ? `${teamNameEn} (${teamNameTc})` : teamNameEn) : `Team ${teamNum}`;
    
    // Get practice data using new calendar method or fallback
    const rows = getTeamData(key) || [];
    const ranks = readTeamRanks(key) || [];
    
    if (isPracticeRequired) {
      // 1. Validate minimum dates selected
      if (rows.length < minimumDates) {
        errors.push({
          field: `practice-team-${teamNum}`,
          messageKey: 'practiceMinimumDatesRequired',
          params: { 
            teamNum: teamNum, 
            teamName: teamName,
            minimum: minimumDates,
            current: rows.length
          }
        });
      }
      
      // 2. Validate each date has required fields
      rows.forEach((row, index) => {
        // Check duration is present and valid (1 or 2)
        if (!row.duration_hours || (row.duration_hours !== 1 && row.duration_hours !== 2)) {
          errors.push({
            field: `duration-team-${teamNum}`,
            messageKey: 'practiceDurationRequired',
            params: { 
              teamNum: teamNum, 
              teamName: teamName,
              dateIndex: index + 1,
              date: row.pref_date || 'unknown'
            }
          });
        }
        
        // Check helper is present (default ST is OK, but must be one of: NONE, S, T, ST)
        if (!row.helper || !['NONE', 'S', 'T', 'ST'].includes(row.helper)) {
          errors.push({
            field: `helper-team-${teamNum}`,
            messageKey: 'practiceHelperRequired',
            params: { 
              teamNum: teamNum, 
              teamName: teamName,
              dateIndex: index + 1,
              date: row.pref_date || 'unknown'
            }
          });
        }
      });
      
      // 3. Validate total practice hours (minimum required)
      let totalHours = 0;
      for (const r of rows) {
        const hours = Number(r.duration_hours) || 0;
        totalHours += hours;
      }
      
      if (totalHours < minimumHours) {
        errors.push({
          field: `practice-team-${teamNum}`,
          messageKey: 'practiceMinimumRequired',
          params: { 
            teamNum: teamNum, 
            teamName: teamName,
            minimum: minimumHours,
            current: totalHours
          }
        });
      }
      
      // 4. Validate max dates (warning, not error)
      if (rows.length > maxDates) {
        // This is a warning, not blocking, but log it
        Logger.warn(`Team ${teamNum} has ${rows.length} dates, exceeding max of ${maxDates}`);
      }
    }
  }
  
  return errors;
}

/**
 * Set up event listeners for calendar interactions
 */
function setupCalendarEventListeners(container) {
	Logger.debug('🎯 setupCalendarEventListeners: Setting up calendar event listeners');
  
  // Use event delegation for checkboxes and dropdowns
  container.addEventListener('change', (event) => {
    const target = event.target;
    
    // Handle checkbox changes
    if (target.type === 'checkbox') {
      console.log('═'.repeat(60));
      console.log('🎯 CHECKBOX CHANGED!');
      console.log('  Target:', target);
      console.log('  Checked:', target.checked);
      console.log('  data-date:', target.getAttribute('data-date'));
      
      const dateStr = target.getAttribute('data-date');
      
      // The checkbox HAS the data-date attribute, it's not inside a data-date container
      const checkbox = target;
      const label = checkbox.parentElement;
      const dateContainer = label.parentElement;
      const dropdowns = dateContainer?.querySelector('.dropdowns');
      
      console.log('🔍 DOM TRAVERSAL:');
      console.log('  checkbox:', checkbox);
      console.log('  label:', label);
      console.log('  label tagName:', label?.tagName);
      console.log('  label className:', label?.className);
      console.log('  dateContainer:', dateContainer);
      console.log('  dateContainer tagName:', dateContainer?.tagName);
      console.log('  dateContainer className:', dateContainer?.className);
      console.log('  dropdowns:', dropdowns);
      console.log('  dropdowns className:', dropdowns?.className);
      
      const key = getCurrentTeamKey();
      const currentTeamIndex = getCurrentTeamIndex();
      const teamNum = currentTeamIndex + 1;
      
      console.log('📊 TEAM INFO:');
      console.log('  key:', key);
      console.log('  teamNum:', teamNum);
      
      if (target.checked) {
        console.log('✅ CHECKBOX IS CHECKED - Adding date');
        
        // add row if not present
        const rows = readTeamRows(key) || [];
        console.log('  Current rows:', rows.length);
        
        if (!rows.some(r => r.pref_date === dateStr)) {
          rows.push({ pref_date: dateStr, duration_hours: 2, helper: 'ST' });
          writeTeamRows(key, rows);
          console.log('  ✅ Added row with defaults');
        } else {
          console.log('  ⚠️ Row already exists');
        }
        
        // BUGFIX: Set dropdown values BEFORE showing
        const durationSelect = dropdowns?.querySelector('select.duration');
        const helpersSelect = dropdowns?.querySelector('select.helpers');
        
        console.log('🎨 DROPDOWNS:');
        console.log('  durationSelect:', durationSelect);
        console.log('  helpersSelect:', helpersSelect);
        
        if (durationSelect && durationSelect.options.length > 0) {
          console.log('  📝 SETTING DURATION:');
          console.log('    Before selectedIndex:', durationSelect.selectedIndex);
          console.log('    Before value:', durationSelect.value);
          console.log('    Options count:', durationSelect.options.length);
          
          durationSelect.selectedIndex = 1;
          durationSelect.value = '2';
          
          console.log('    After selectedIndex:', durationSelect.selectedIndex);
          console.log('    After value:', durationSelect.value);
        } else {
          console.error('  ❌ Cannot set duration - select not found or no options');
        }
        
        if (helpersSelect && helpersSelect.options.length > 0) {
          console.log('  📝 SETTING HELPER:');
          console.log('    Before selectedIndex:', helpersSelect.selectedIndex);
          console.log('    Before value:', helpersSelect.value);
          console.log('    Options count:', helpersSelect.options.length);
          
          // Set ST (Steersman & Coach) as default (index 3)
          helpersSelect.selectedIndex = 3;
          helpersSelect.value = 'ST';
          
          console.log('    After selectedIndex:', helpersSelect.selectedIndex);
          console.log('    After value:', helpersSelect.value);
        } else {
          console.error('  ❌ Cannot set helper - select not found or no options');
        }
        
        console.log('  🎨 Removing hide class from dropdowns...');
        dropdowns?.classList.remove('hide');
        console.log('  ✅ Dropdowns shown');
        
        // Verify AFTER showing
        console.log('  🔍 VERIFICATION AFTER SHOWING:');
        console.log('    Duration value:', durationSelect?.value);
        console.log('    Duration selectedIndex:', durationSelect?.selectedIndex);
        console.log('    Helper value:', helpersSelect?.value);  
        console.log('    Helper selectedIndex:', helpersSelect?.selectedIndex);
        
        // Clear error
        if (window.errorSystem && typeof window.errorSystem.clearErrors === 'function') {
          window.errorSystem.clearErrors(`practice-team-${teamNum}`);
        }
      } else {
        console.log('❌ CHECKBOX IS UNCHECKED - Removing date');
        writeTeamRows(key, (readTeamRows(key)||[]).filter(r => r.pref_date !== dateStr));
        dropdowns?.classList.add('hide');
      }
      
      saveCurrentTeamPracticeData();
      updatePracticeSummary();
      
      console.log('═'.repeat(60));
    }
    
    // Handle dropdown changes (duration, steersman & coach)
    if (target.tagName === 'SELECT') {
      // SELECT is in .dropdowns, which is sibling of label containing checkbox
      // Find the checkbox with data-date in the same container
      const dropdowns = target.closest('.dropdowns');
      const dateContainer = dropdowns?.parentElement;
      const checkbox = dateContainer?.querySelector('input[type="checkbox"][data-date]');
      const dateStr = checkbox?.getAttribute('data-date');
      
      console.log('🔧 DEBUG SELECT: dropdowns:', dropdowns);
      console.log('🔧 DEBUG SELECT: dateContainer:', dateContainer);
      console.log('🔧 DEBUG SELECT: checkbox:', checkbox);
      console.log('🔧 DEBUG SELECT: dateStr:', dateStr);
      
      const key = getCurrentTeamKey();
      const currentTeamIndex = getCurrentTeamIndex();
      const teamNum = currentTeamIndex + 1;
      const rows = readTeamRows(key) || [];
      const rowIndex = rows.findIndex(r => r.pref_date === dateStr);
      
      if (rowIndex >= 0) {
        if (target.classList.contains('duration')) {
          rows[rowIndex].duration_hours = Number(target.value) || 2;
          // Clear duration error when user selects duration
          if (window.errorSystem && typeof window.errorSystem.clearErrors === 'function') {
            window.errorSystem.clearErrors(`duration-team-${teamNum}`);
          }
        } else if (target.classList.contains('helpers')) {
          rows[rowIndex].helper = target.value || 'ST';
          // Clear steersman & coach error when user selects steersman & coach
          if (window.errorSystem && typeof window.errorSystem.clearErrors === 'function') {
            window.errorSystem.clearErrors(`helper-team-${teamNum}`);
          }
        }
        writeTeamRows(key, rows);
      }
      saveCurrentTeamPracticeData();
      updatePracticeSummary(); // Update summary box immediately
    }
  });
  
  // Also listen for clicks on date elements
  container.addEventListener('click', (event) => {
    const dateElement = event.target.closest('[data-date]');
    if (dateElement) {
	Logger.debug('🎯 Calendar date element clicked:', dateElement.getAttribute('data-date'));
      // Small delay to allow checkbox state to update
      setTimeout(() => {
        saveCurrentTeamPracticeData();
        updatePracticeSummary(); // Update summary box after click
      }, 10);
    }
  });
  
	Logger.debug('🎯 setupCalendarEventListeners: Event listeners set up successfully');
}

/**
 * Get current team's selected dates from calendar
 */
function getCurrentTeamDates() {
	Logger.debug('🎯 getCurrentTeamDates: Collecting selected dates from calendar');
  
  const calendarContainer = document.getElementById('calendarContainer');
  if (!calendarContainer) {
	Logger.debug('🎯 getCurrentTeamDates: No calendar container found');
    return [];
  }
  
  const selectedDates = [];
  
  // Find all checkboxes with data-date attributes
  const checkboxes = calendarContainer.querySelectorAll('input[type="checkbox"][data-date]');
	Logger.debug(`🎯 getCurrentTeamDates: Found ${checkboxes.length} checkboxes with data-date`);
  
  checkboxes.forEach((checkbox, index) => {
	Logger.debug(`🎯 getCurrentTeamDates: Processing checkbox ${index}:`, {
      isChecked: checkbox.checked,
      date: checkbox.getAttribute('data-date')
    });
    
    if (checkbox.checked) {
      const date = checkbox.getAttribute('data-date');
      
      // Find the parent container that holds the dropdowns
      const dateContainer = checkbox.closest('.day-checkbox')?.parentElement;
      
      // Look for duration and steersman & coach selects within the same date container
      const durationSelect = dateContainer?.querySelector('select.duration');
      const helperSelect = dateContainer?.querySelector('select.helpers');
      
      const hours = durationSelect ? parseInt(durationSelect.value, 10) || 0 : 0;
      const helpers = helperSelect ? helperSelect.value : '';
      
	Logger.debug(`🎯 getCurrentTeamDates: Processing date ${date}:`, {
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
        
	Logger.debug(`🎯 getCurrentTeamDates: Found selected date: ${date}, ${hours}h, ${helpers}`);
      } else {
	Logger.debug(`🎯 getCurrentTeamDates: Skipping date ${date} - hours: ${hours}, helpers: ${helpers}`);
      }
    }
  });
  
	Logger.debug(`🎯 getCurrentTeamDates: Collected ${selectedDates.length} selected dates`);
  return selectedDates;
}

/**
 * Load team practice data and update UI
 */
function loadTeamPracticeData(teamIndex) {
  const teamData = getTeamPracticeData(teamIndex);
	Logger.debug(`🎯 loadTeamPracticeData: Loading data for team ${teamIndex}:`, teamData);
  
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
  
  // Use TNCalendarModern if available
  const calendar = window.TNCalendarModern?.getInstance();
  if (calendar) {
    // Switch to the team and refresh display
    calendar.switchTeam(teamKey);
    // Data is already in sessionStorage, calendar will read it automatically
  } else {
    // Fallback to legacy method if calendar not initialized
    clearCalendarSelections();
    rows.forEach(row => {
      const cb = document.querySelector(`#calendarContainer input[type="checkbox"][data-date="${row.pref_date}"]`);
      if (!cb) return;
      cb.checked = true;
      const label = cb.closest('label.day-checkbox');
      const dropdowns = label?.parentElement?.querySelector('.dropdowns');
      const durationSel = dropdowns?.querySelector('select.duration');
      const helperSel = dropdowns?.querySelector('select.helpers');
      // Ensure duration defaults to 2 if missing or invalid
      const durationHours = row.duration_hours && [1, 2].includes(Number(row.duration_hours)) 
        ? Number(row.duration_hours) 
        : 2;
      if (durationSel) durationSel.value = String(durationHours);
      if (helperSel)  helperSel.value  = row.helper || 'ST';
      dropdowns?.classList.remove('hide');
    });
  }
}

/**
 * Update slot preferences for specific team
 */
function updateSlotPreferencesForTeam(teamIndex) {
  const teamKey = `t${teamIndex + 1}`;
	Logger.debug(`🎯 updateSlotPreferencesForTeam: loading ranks for ${teamKey}`);
  
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
	Logger.debug(`🎯 updateSlotPreferencesForTeam: Found ${ranks.length} ranks for ${teamKey}:`, ranks);
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
	Logger.debug(`🎯 updateSlotPreferencesForTeam: Processing rank ${rank} with slot ${slot}`);
    if (rank >= 1 && rank <= 3 && slot) {
      const selectId = resolveSelectIdForSlot(slot, rank);
      const el = document.getElementById(selectId);
	Logger.debug(`🎯 updateSlotPreferencesForTeam: Setting ${selectId} to ${slot}`);
      if (el) {
        el.value = slot;
	Logger.debug(`🎯 updateSlotPreferencesForTeam: Successfully set ${selectId} to ${slot}`);
      } else {
	Logger.warn(`🎯 updateSlotPreferencesForTeam: Element ${selectId} not found`);
      }
    }
  });

  // 5) Re-apply duplicate-prevention constraints after setting values
  if (typeof setupSlotDuplicatePrevention === 'function') {
    setupSlotDuplicatePrevention();
  }

	Logger.debug(`🎯 updateSlotPreferencesForTeam: applied ${ranks.length} ranks for ${teamKey}`);
}


/**
 * Clear all calendar selections
 */
function clearCalendarSelections() {
	Logger.debug('🎯 clearCalendarSelections: Clearing calendar selections');
  
  // Use TNCalendarModern if available
  const calendar = window.TNCalendarModern?.getInstance();
  if (calendar) {
    // Modern calendar handles clearing internally via refresh
    // Data is stored in sessionStorage, so clearing is done by writing empty array
    const currentTeamKey = getCurrentTeamKey();
    writeTeamRows(currentTeamKey, []);
    calendar.refresh();
  } else {
    // Fallback to legacy method
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
    }
  }
  
	Logger.debug('🎯 clearCalendarSelections: Cleared calendar selections');
}

/**
 * Show copy from Team 1 option
 */
function showCopyFromTeam1Option() {
  const copyContainer = document.querySelector('.copy-from-team1');
  if (copyContainer) {
    copyContainer.style.display = 'block';
	Logger.debug('🎯 showCopyFromTeam1Option: Showing copy option');
  }
}

/**
 * Hide copy from Team 1 option
 */
function hideCopyFromTeam1Option() {
  const copyContainer = document.querySelector('.copy-from-team1');
  if (copyContainer) {
    copyContainer.style.display = 'none';
	Logger.debug('🎯 hideCopyFromTeam1Option: Hiding copy option');
  }
}

/**
 * Highlight date on calendar
 */
function highlightDateOnCalendar(date, hours, helpers) {
	Logger.debug(`🎯 highlightDateOnCalendar: Highlighting ${date} for ${hours}h with helpers ${helpers}`);
  
  const calendarContainer = document.getElementById('calendarContainer');
  if (!calendarContainer) return;
  
  // Find the checkbox with the matching data-date
  const checkbox = calendarContainer.querySelector(`input[type="checkbox"][data-date="${date}"]`);
  if (!checkbox) {
	Logger.debug(`🎯 highlightDateOnCalendar: No checkbox found for date ${date}`);
    return;
  }
  
  // Check the checkbox
  checkbox.checked = true;
	Logger.debug(`🎯 highlightDateOnCalendar: Checked checkbox for ${date}`);
  
  // Find the parent container that holds the dropdowns
  const dateContainer = checkbox.closest('.day-checkbox')?.parentElement;
  if (!dateContainer) {
	Logger.debug(`🎯 highlightDateOnCalendar: No date container found for ${date}`);
    return;
  }
  
  // Set duration dropdown
  const durationSelect = dateContainer.querySelector('select.duration');
  if (durationSelect) {
    durationSelect.value = hours;
	Logger.debug(`🎯 highlightDateOnCalendar: Set duration to ${hours} for ${date}`);
  } else {
	Logger.debug(`🎯 highlightDateOnCalendar: No duration select found for ${date}`);
  }
  
  // Set steersman & coach dropdown
  const helperSelect = dateContainer.querySelector('select.helpers');
  if (helperSelect) {
    helperSelect.value = helpers;
	Logger.debug(`🎯 highlightDateOnCalendar: Set helpers to ${helpers} for ${date}`);
  } else {
	Logger.debug(`🎯 highlightDateOnCalendar: No helper select found for ${date}`);
  }
  
  // Add highlighting classes to the date container
  dateContainer.classList.add('selected', 'practiced');
  
	Logger.debug(`🎯 highlightDateOnCalendar: Successfully highlighted ${date} with ${hours}h and ${helpers} helpers`);
}

/**
 * Initialize Step 5 - Summary
 */
function initStep5() {
  console.log('🎯 Initializing Step 5 - Summary');
  
  // Force parent container visibility
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
  }
  
  // Ensure wizardMount is visible
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
    console.log('✅ wizardMount is visible');
  }
  
  // Load and display summary data
  loadSummaryData();
  
  // Set up step 5 navigation
  setupStep5Navigation();
}

/**
 * Set up navigation for step 5 (Summary/Submit)
 */
function setupStep5Navigation() {
  // Step 5 uses backBtn and submitBtn
  const backBtn = document.getElementById('backBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  // Back button (goes to step 4)
  if (backBtn) {
    // Remove existing listeners by cloning
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    
    newBackBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent double-clicks while loading - check global flag
      const isCurrentlyLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
      if (this.disabled || isCurrentlyLoading) {
        console.log('⏳ Step 5: Back button disabled or loading in progress, skipping');
        console.log(`   - Button disabled: ${this.disabled}`);
        console.log(`   - Currently loading: ${isCurrentlyLoading}`);
        return;
      }
      
      // Debounce: Add minimum delay to prevent rapid clicks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Double-check after debounce delay
      const stillLoading = window.isLoadingStep ? window.isLoadingStep() : isLoadingStep;
      if (stillLoading) {
        console.log('⏳ Step 5: Loading started during debounce, skipping');
        return;
      }
      
      this.disabled = true;
      console.log('🔒 Step 5: Back button disabled, starting navigation');
      
      try {
        console.log('🔙 Step 5: Back button clicked, going to step 4');
        // No data to save on summary step
        await showStep(4); // Await to ensure loading completes
        console.log('✅ Step 5: Navigation to step 4 completed');
      } catch (error) {
        console.error('❌ Step 5: Navigation error:', error);
        throw error;
      } finally {
        // Ensure button is re-enabled after a short delay
        setTimeout(() => {
          this.disabled = false;
          console.log('🔓 Step 5: Back button re-enabled');
        }, 200);
      }
    });
  }
  
  // Submit button
  if (submitBtn) {
    // Remove existing listeners by cloning
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    newSubmitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('✅ Step 5: Submit button clicked');
      if (validateStep5()) {
        if (typeof submitTNForm === 'function') {
          submitTNForm();
        } else {
          Logger.error('submitTNForm function not available');
        }
      } else {
        console.log('⚠️ Step 5: Validation failed, cannot submit');
      }
    });
  }
  
  Logger.debug('🎯 setupStep5Navigation: Step 5 navigation handlers attached');
}

/**
 * Load summary data from sessionStorage
 */
function loadSummaryData() {
	Logger.debug('🎯 loadSummaryData: Starting summary data load');
  // Load basic info
  const orgName = sessionStorage.getItem('tn_org_name');
  const orgAddress = sessionStorage.getItem('tn_org_address');
  // Get season from config first, fallback to sessionStorage, then default to 2026
  const season = window.__CONFIG?.event?.season || sessionStorage.getItem('tn_season') || '2026';
  
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
  if (sumSeason) {
    sumSeason.textContent = season;
  }
  
  // Load team data
	Logger.debug('🎯 loadSummaryData: Calling loadTeamSummary');
  loadTeamSummary();
  
  // Load team managers
	Logger.debug('🎯 loadSummaryData: Calling loadManagersSummary');
  loadManagersSummary();
  
  // Load race day data
	Logger.debug('🎯 loadSummaryData: Calling loadRaceDaySummary');
  loadRaceDaySummary();
  
  // Load practice data
	Logger.debug('🎯 loadSummaryData: Calling loadPracticeSummary');
  loadPracticeSummary();
  
  // Load pricing summary
	Logger.debug('🎯 loadSummaryData: Calling loadPricingSummary');
  loadPricingSummary();
  
	Logger.debug('🎯 loadSummaryData: All summary functions called');
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
  if (!optionCode) return '—';
  
  // Try to get from loaded configuration first
  if (window.__CONFIG && window.__CONFIG.packages) {
    const package_ = window.__CONFIG.packages.find(p => p.package_code === optionCode);
    if (package_ && package_.title_en) {
      return package_.title_en;
    }
  }
  
  // Fallback mapping if configuration not loaded
  // Handle both full package codes and legacy 'opt1'/'opt2' values
  const fallbackMap = {
    'option_1_non_corp': 'Option I',
    'option_1_corp': 'Option I',
    'option_2_non_corp': 'Option II',
    'option_2_corp': 'Option II',
    'opt1': 'Option I',
    'opt2': 'Option II'
  };
  
  return fallbackMap[optionCode] || optionCode;
}

/**
 * Load team summary data
 */
function loadTeamSummary() {
	Logger.debug('🎯 loadTeamSummary: Starting');
  const teamsTbody = document.getElementById('teamsTbody');
  if (!teamsTbody) {
	Logger.warn('🎯 loadTeamSummary: teamsTbody element not found');
    return;
  }
	Logger.debug('🎯 loadTeamSummary: teamsTbody found');
  
  const teams = [];
  for (let i = 1; i <= 10; i++) {
    const nameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const nameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const category = sessionStorage.getItem(`tn_team_category_${i}`);
    const option = sessionStorage.getItem(`tn_team_option_${i}`);
    
    if (nameEn) {
      // Build display name with TC if available
      const displayName = nameTc ? `${nameEn} (${nameTc})` : nameEn;
      teams.push({
        name: displayName,
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
        
        // XSS FIX: Escape user input (team.name) and dynamic data before inserting into HTML
        // team.name comes from sessionStorage (user input), so it must be escaped
        const safeTeamName = SafeDOM.escapeHtml(team.name);
        const safeCategoryDisplay = SafeDOM.escapeHtml(categoryDisplay);
        const safeOptionDisplay = SafeDOM.escapeHtml(optionDisplay);
        
      row.innerHTML = `
        <td>${index + 1}</td>
          <td>${safeTeamName} <span style="color: #666; font-size: 0.9em;">(${safeCategoryDisplay})</span></td>
          <td>${safeOptionDisplay}</td>
      `;
      teamsTbody.appendChild(row);
    });
  }
}

/**
 * Load team managers summary data
 */
function loadManagersSummary() {
	Logger.debug('🎯 loadManagersSummary: Starting');
  const managersTbody = document.getElementById('managersTbody');
  if (!managersTbody) {
	Logger.warn('🎯 loadManagersSummary: managersTbody element not found');
    return;
  }
	Logger.debug('🎯 loadManagersSummary: managersTbody found');
  
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
      // XSS FIX: Escape user input (manager.name, manager.mobile, manager.email) before inserting into HTML
      // These values come from sessionStorage (user input), so they must be escaped
      const safeName = SafeDOM.escapeHtml(manager.name);
      const safeMobile = SafeDOM.escapeHtml(manager.mobile);
      const safeEmail = SafeDOM.escapeHtml(manager.email);
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${safeName}</td>
        <td>${safeMobile}</td>
        <td>${safeEmail}</td>
      `;
      managersTbody.appendChild(row);
    });
  }
}

/**
 * Load race day summary data
 */
function loadRaceDaySummary() {
	Logger.debug('🎯 loadRaceDaySummary: Starting');
  // Load race day arrangement data from sessionStorage JSON
  const raceDayDataStr = sessionStorage.getItem('tn_race_day');
  let raceDayData = {};
  
  if (raceDayDataStr) {
    try {
      raceDayData = JSON.parse(raceDayDataStr);
	Logger.debug('🎯 loadRaceDaySummary: Race day data loaded:', raceDayData);
    } catch (e) {
	Logger.warn('Failed to parse race day data:', e);
    }
  } else {
	Logger.warn('🎯 loadRaceDaySummary: No race day data found in sessionStorage');
  }
  
  // Map the data to display values (using actual input IDs from template)
  const marqueeQty = raceDayData.marqueeQty || 0;
  const junkBoat = raceDayData.junkBoatQty ? `${raceDayData.junkBoatQty} units` : '—';
  const speedBoat = raceDayData.speedboatQty ? `${raceDayData.speedboatQty} units` : '—';
  
  // Get per-team steersman options (new system)
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  const steersmanOptions = [];
  const currentLang = window.i18n?.currentLang || 'en';
  
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`) || `Team ${i}`;
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const teamName = (currentLang === 'zh' && teamNameTc) ? teamNameTc : teamNameEn;
    const steersmanOption = sessionStorage.getItem(`tn_team_${i}_steersman_option`) || 'not_required';
    
    let optionText = '';
    if (steersmanOption === 'with_practice') {
      optionText = currentLang === 'zh' ? '練習時已聘用舵手' : 'Hired steersman during practice';
    } else if (steersmanOption === 'no_practice') {
      optionText = currentLang === 'zh' ? '練習時沒有聘用舵手' : 'Did not hire steersman during practice';
    } else {
      optionText = currentLang === 'zh' ? '不需要' : 'Not required';
    }
    
    // Escape team name and option text for XSS safety
    const safeTeamName = SafeDOM.escapeHtml(teamName);
    const safeOptionText = SafeDOM.escapeHtml(optionText);
    
    // Format with bold team name in theme color, each team on a new line
    steersmanOptions.push(`<strong style="color: var(--theme-primary-dark, #c79100); font-weight: bold;">${safeTeamName}</strong>: ${safeOptionText}`);
  }
  
  const steersmanDisplay = steersmanOptions.length > 0 
    ? steersmanOptions.join('<br>') 
    : (currentLang === 'zh' ? '無' : 'None');
  
    // Update race day summary elements
    const sumMarquee = document.getElementById('sumMarquee');
    const sumSteerWith = document.getElementById('sumSteerWith');
    const sumJunk = document.getElementById('sumJunk');
    const sumSpeed = document.getElementById('sumSpeed');
    
	Logger.debug('🎯 loadRaceDaySummary: Display values:', {
    marqueeQty, steersmanDisplay, junkBoat, speedBoat
  });
  
  if (sumMarquee) sumMarquee.textContent = marqueeQty;
  // Update steersman display - show per-team options instead of old quantities
  if (sumSteerWith) {
    // Show all per-team steersman options with HTML formatting (line breaks and styled team names)
    sumSteerWith.innerHTML = steersmanDisplay;
  }
  if (sumJunk) sumJunk.textContent = junkBoat;
  if (sumSpeed) sumSpeed.textContent = speedBoat;
  
	Logger.debug('🎯 loadRaceDaySummary: Summary elements updated');
}

/**
 * Format currency in HKD format
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'HK$0';
  return `HK$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Get package price from config
 */
function getPackagePrice(packageCode) {
  // Try window.__CONFIG.packages first
  if (window.__CONFIG?.packages) {
    const pkg = window.__CONFIG.packages.find(p => p.package_code === packageCode);
    if (pkg && pkg.listed_unit_price) return pkg.listed_unit_price;
  }
  
  // Try window.__PACKAGES (loaded from database)
  if (window.__PACKAGES) {
    const pkg = window.__PACKAGES.find(p => p.package_code === packageCode);
    if (pkg && pkg.listed_unit_price) return pkg.listed_unit_price;
  }
  
  // Fallback prices from order.sql
  const fallbackPrices = {
    'option_1_non_corp': 20900,
    'option_2_non_corp': 17500,
    'option_1_corp': 21900,
    'option_2_corp': 18500,
    'opt1': 20900,
    'opt2': 17500
  };
  
  return fallbackPrices[packageCode] || 0;
}

/**
 * Get order item price from config
 */
function getOrderItemPrice(itemCode) {
  // Try window.__CONFIG.orderItems
  if (window.__CONFIG?.orderItems) {
    const item = window.__CONFIG.orderItems.find(i => 
      i.order_item_code === itemCode || i.item_code === itemCode
    );
    if (item && item.listed_unit_price) return item.listed_unit_price;
  }
  
  // Fallback prices from order.sql for TN2026
  const fallbackPrices = {
    'rd_marquee': 800,
    'rd_steerer': 800,  // with practice
    'rd_steerer_no_practice': 1500,  // without practice
    'rd_junk': 2500,
    'rd_speedboat': 1500,
    'extra_practice_hr_regular': 600,
    'practice_trainer': 550,
    'practice_steerer': 350
  };
  
  return fallbackPrices[itemCode] || 0;
}

/**
 * Load pricing summary data
 */
function loadPricingSummary() {
	Logger.debug('🎯 loadPricingSummary: Starting');
  const pricingTbody = document.getElementById('pricingTbody');
  const pricingTotal = document.getElementById('pricingTotal');
  
  if (!pricingTbody) {
	Logger.warn('🎯 loadPricingSummary: pricingTbody element not found');
    return;
  }
  
  const pricingRows = [];
  let grandTotal = 0;
  const currentLang = window.i18n?.currentLang || 'en';
  
  // 1. ENTRY FEES (per team, based on entry option)
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  let entryFeesSubtotal = 0;
  
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const teamName = (currentLang === 'zh' && teamNameTc) ? teamNameTc : (teamNameEn || `Team ${i}`);
    const packageCode = sessionStorage.getItem(`tn_team_option_${i}`);
    
    if (teamNameEn && packageCode) {
      const packagePrice = getPackagePrice(packageCode);
      const optionDisplay = getOptionDisplayName(packageCode);
      
      if (packagePrice > 0) {
        entryFeesSubtotal += packagePrice;
        const safeTeamName = SafeDOM.escapeHtml(teamName);
        const safeOptionDisplay = SafeDOM.escapeHtml(optionDisplay);
        pricingRows.push({
          item: `${safeTeamName} - ${safeOptionDisplay}`,
          qty: 1,
          unitPrice: packagePrice,
          amount: packagePrice
        });
      }
    }
  }
  
  if (entryFeesSubtotal > 0) {
    const t = (key) => window.i18n?.t?.(key) || key;
    pricingRows.push({
      item: `<strong>${t('entryFeesSubtotal')}</strong>`,
      qty: '',
      unitPrice: '',
      amount: entryFeesSubtotal,
      isSubtotal: true
    });
    grandTotal += entryFeesSubtotal;
  }
  
  // 2. RACE DAY ARRANGEMENTS
  const raceDayDataStr = sessionStorage.getItem('tn_race_day');
  let raceDayData = {};
  if (raceDayDataStr) {
    try {
      raceDayData = JSON.parse(raceDayDataStr);
    } catch (e) {
	Logger.warn('Failed to parse race day data:', e);
    }
  }
  
  // Marquee
  const marqueeQty = parseInt(raceDayData.marqueeQty || 0, 10);
  let marqueeTotal = 0;
  if (marqueeQty > 0) {
    const marqueePrice = getOrderItemPrice('rd_marquee');
    marqueeTotal = marqueeQty * marqueePrice;
    const t = (key) => window.i18n?.t?.(key) || key;
    pricingRows.push({
      item: t('athleteMarquee'),
      qty: marqueeQty,
      unitPrice: marqueePrice,
      amount: marqueeTotal
    });
    grandTotal += marqueeTotal;
  }
  
  // Official Steersman (per team)
  let steersmanSubtotal = 0;
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    const teamName = (currentLang === 'zh' && teamNameTc) ? teamNameTc : (teamNameEn || `Team ${i}`);
    const steersmanOption = sessionStorage.getItem(`tn_team_${i}_steersman_option`) || 'not_required';
    
    if (teamNameEn && steersmanOption !== 'not_required') {
      let steersmanPrice = 0;
      let steersmanLabel = '';
      const t = (key) => window.i18n?.t?.(key) || key;
      
      if (steersmanOption === 'with_practice') {
        steersmanPrice = getOrderItemPrice('rd_steerer');
        steersmanLabel = t('officialSteersmanHired');
      } else if (steersmanOption === 'no_practice') {
        steersmanPrice = getOrderItemPrice('rd_steerer_no_practice');
        steersmanLabel = t('officialSteersmanNotHired');
      }
      
      if (steersmanPrice > 0) {
        steersmanSubtotal += steersmanPrice;
        const safeTeamName = SafeDOM.escapeHtml(teamName);
        pricingRows.push({
          item: `${safeTeamName} - ${steersmanLabel}`,
          qty: 1,
          unitPrice: steersmanPrice,
          amount: steersmanPrice
        });
      }
    }
  }
  
  // Junk Boat
  const junkQty = parseInt(raceDayData.junkBoatQty || 0, 10);
  let junkTotal = 0;
  if (junkQty > 0) {
    const junkPrice = getOrderItemPrice('rd_junk');
    junkTotal = junkQty * junkPrice;
    const t = (key) => window.i18n?.t?.(key) || key;
    pricingRows.push({
      item: t('junkBoatRegistration'),
      qty: junkQty,
      unitPrice: junkPrice,
      amount: junkTotal
    });
    grandTotal += junkTotal;
  }
  
  // Speed Boat
  const speedQty = parseInt(raceDayData.speedboatQty || 0, 10);
  let speedTotal = 0;
  if (speedQty > 0) {
    const speedPrice = getOrderItemPrice('rd_speedboat');
    speedTotal = speedQty * speedPrice;
    const t = (key) => window.i18n?.t?.(key) || key;
    pricingRows.push({
      item: t('speedBoatRegistration'),
      qty: speedQty,
      unitPrice: speedPrice,
      amount: speedTotal
    });
    grandTotal += speedTotal;
  }
  
  // Race Day Arrangement Subtotal (Marquee + Steersman + Junk + Speed)
  const raceDaySubtotal = marqueeTotal + steersmanSubtotal + junkTotal + speedTotal;
  if (raceDaySubtotal > 0) {
    const t = (key) => window.i18n?.t?.(key) || key;
    pricingRows.push({
      item: `<strong>${t('raceDayArrangementSubtotal')}</strong>`,
      qty: '',
      unitPrice: '',
      amount: raceDaySubtotal,
      isSubtotal: true
    });
    // Note: marqueeTotal, junkTotal, speedTotal already added to grandTotal above
    // Add steersmanSubtotal to grandTotal (steersman items are not added individually)
    grandTotal += steersmanSubtotal;
  }
  
  // 3. PRACTICE SESSIONS
  const { readTeamRows } = window.__DBG_TN || {};
  if (readTeamRows) {
    let extraPracticeHours = 0;
    let trainerHours = 0;
    let steersmanHours = 0;
    
    // Calculate practice costs across all teams
    for (let i = 1; i <= teamCount; i++) {
      const teamKey = `t${i}`;
      const practiceRows = readTeamRows(teamKey) || [];
      
      let teamTotalHours = 0;
      let teamTrainerHours = 0;
      let teamSteersmanHours = 0;
      
      practiceRows.forEach(row => {
        const duration = parseInt(row.duration_hours || 2, 10);
        const helper = row.helper || 'NONE';
        
        teamTotalHours += duration;
        
        // Count trainer hours (T or ST)
        if (helper === 'T' || helper === 'ST') {
          teamTrainerHours += duration;
        }
        
        // Count steersman hours (S or ST)
        if (helper === 'S' || helper === 'ST') {
          teamSteersmanHours += duration;
        }
      });
      
      // Extra practice hours (over 12 hours included in package)
      const teamExtraHours = Math.max(0, teamTotalHours - 12);
      extraPracticeHours += teamExtraHours;
      trainerHours += teamTrainerHours;
      steersmanHours += teamSteersmanHours;
    }
    
    // Extra Practice Sessions
    if (extraPracticeHours > 0) {
      const extraPracticePrice = getOrderItemPrice('extra_practice_hr_regular');
      const extraPracticeTotal = extraPracticeHours * extraPracticePrice;
      pricingRows.push({
        item: currentLang === 'zh' ? '額外練習 (標準龍租船費)' : 'Extra Practice – Standard Boat Rental',
        qty: extraPracticeHours,
        unitPrice: extraPracticePrice,
        amount: extraPracticeTotal
      });
      grandTotal += extraPracticeTotal;
    }
    
    // Trainer Sessions
    let trainerTotal = 0;
    if (trainerHours > 0) {
      const trainerPrice = getOrderItemPrice('practice_trainer');
      trainerTotal = trainerHours * trainerPrice;
      const t = (key) => window.i18n?.t?.(key) || key;
      pricingRows.push({
        item: t('practiceOfficialTrainer'),
        qty: trainerHours,
        unitPrice: trainerPrice,
        amount: trainerTotal
      });
      grandTotal += trainerTotal;
    }
    
    // Steersman Sessions
    let steersmanTotal = 0;
    if (steersmanHours > 0) {
      const steersmanPrice = getOrderItemPrice('practice_steerer');
      steersmanTotal = steersmanHours * steersmanPrice;
      const t = (key) => window.i18n?.t?.(key) || key;
      pricingRows.push({
        item: t('practiceOfficialSteersman'),
        qty: steersmanHours,
        unitPrice: steersmanPrice,
        amount: steersmanTotal
      });
      grandTotal += steersmanTotal;
    }
    
    // Practice Sessions Subtotal (Trainer + Steersman)
    const practiceSessionsSubtotal = trainerTotal + steersmanTotal;
    if (practiceSessionsSubtotal > 0) {
      const t = (key) => window.i18n?.t?.(key) || key;
      pricingRows.push({
        item: `<strong>${t('practiceSessionsSubtotal')}</strong>`,
        qty: '',
        unitPrice: '',
        amount: practiceSessionsSubtotal,
        isSubtotal: true
      });
    }
  }
  
  // Render pricing table
  if (pricingRows.length === 0) {
    pricingTbody.innerHTML = '<tr><td colspan="4" class="muted" data-i18n="noPricingData">No pricing data available</td></tr>';
    if (pricingTotal) pricingTotal.textContent = formatCurrency(0);
    return;
  }
  
  let html = '';
  pricingRows.forEach(row => {
    const rowClass = row.isSubtotal ? 'subtotal-row' : '';
    const qtyDisplay = row.qty === '' ? '' : row.qty;
    const unitPriceDisplay = row.unitPrice === '' ? '' : formatCurrency(row.unitPrice);
    const amountDisplay = formatCurrency(row.amount);
    
    html += `<tr class="${rowClass}">`;
    html += `<td>${row.item}</td>`;
    html += `<td class="text-center">${qtyDisplay}</td>`;
    html += `<td class="text-right">${unitPriceDisplay}</td>`;
    html += `<td class="text-right"><strong>${amountDisplay}</strong></td>`;
    html += `</tr>`;
  });
  
  pricingTbody.innerHTML = html;
  if (pricingTotal) pricingTotal.textContent = formatCurrency(grandTotal);
  
	Logger.debug('🎯 loadPricingSummary: Pricing summary updated, total:', grandTotal);
}

/**
 * Load practice summary data
 */
function loadPracticeSummary() {
	Logger.debug('🎯 loadPracticeSummary: Starting');
  const perTeamPracticeSummary = document.getElementById('perTeamPracticeSummary');
  if (!perTeamPracticeSummary) {
	Logger.warn('🎯 loadPracticeSummary: perTeamPracticeSummary element not found');
    return;
  }
	Logger.debug('🎯 loadPracticeSummary: perTeamPracticeSummary found');
  
  // Import the store functions
  const { readTeamRows, readTeamRanks } = window.__DBG_TN || {};
  const t = (key) => window.i18n?.t?.(key) || key;
  const currentLang = window.i18n?.currentLang || 'en';
  
  if (!readTeamRows || !readTeamRanks) {
    perTeamPracticeSummary.innerHTML = `<p class="muted">${t('practiceBookingDataUnavailable')}</p>`;
    return;
  }
  
  const practiceData = [];
  
  // Get practice data for each team
  for (let i = 1; i <= 10; i++) {
    // Use correct storage key: tn_team_name_en_${i}
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
    if (!teamNameEn) continue;
    
    // Build display name with TC if available
    const teamName = teamNameTc ? `${teamNameEn} (${teamNameTc})` : teamNameEn;
    
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
    perTeamPracticeSummary.innerHTML = `<p class="muted">${t('noSessionsBooked')}</p>`;
    return;
  }
  
  // Generate HTML for each team's practice data
  let html = '';
  practiceData.forEach(team => {
    // XSS FIX: Escape user input (team.teamName) before inserting into HTML
    // team.teamName comes from sessionStorage (user input), so it must be escaped
    const safeTeamName = SafeDOM.escapeHtml(team.teamName);
    html += `<div class="team-practice-section" style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 6px;">`;
    // Apply theme color to team name
    html += `<h4 class="practice-team-name" style="margin: 0 0 0.5rem 0; color: var(--theme-primary-dark, #c79100); font-weight: 600;">${safeTeamName}</h4>`;
    
    // Practice dates
    if (team.practiceRows.length > 0) {
      html += `<div style="margin-bottom: 0.5rem;">`;
      html += `<strong>${t('practiceDates')}:</strong><br>`;
      team.practiceRows.forEach(row => {
        const date = new Date(row.pref_date).toLocaleDateString(currentLang === 'zh' ? 'zh-HK' : 'en-US');
        const duration = row.duration_hours;
        const helper = row.helper;
        // XSS FIX: Escape steersman & coach value (could be user-selected)
        const safeHelper = SafeDOM.escapeHtml(helper);
        const hourLabel = duration === 1 ? t('hour') : t('hours');
        html += `<span style="margin-right: 1rem;">• ${date} (${duration} ${hourLabel}, ${safeHelper})</span>`;
      });
      html += `</div>`;
    }
    
    // Slot preferences
    if (team.slotRanks.length > 0) {
      html += `<div>`;
      html += `<strong>${t('slotPreferences')}:</strong><br>`;
      team.slotRanks.forEach(rank => {
        // XSS FIX: Escape slot_code (from config, but should be safe)
        const safeSlotCode = SafeDOM.escapeHtml(rank.slot_code);
        html += `<span style="margin-right: 1rem;">${rank.rank}. ${safeSlotCode}</span>`;
      });
      html += `</div>`;
    }
    
    html += `</div>`;
  });
  
  perTeamPracticeSummary.innerHTML = html;
}

/**
 * Get current step number
 * @returns {number} Current step (1-5)
 */
function getCurrentStep() {
  return currentStep || 1; // Default to step 1
}

/**
 * Show a specific step (hides all others and initializes)
 * @param {number} stepNumber - Step number to show (1-5)
 */
async function showStep(stepNumber) {
  console.log(`📍 showStep: Showing step ${stepNumber}`);
  
  // CRITICAL: Set currentStep FIRST before any other operations
  // This ensures restoration code can check the correct step
  currentStep = stepNumber;
  console.log(`🔧 showStep: Set currentStep to ${currentStep} (stepNumber: ${stepNumber})`);
  
  // Force update window.tnCurrentStep for debugging (direct reference)
  if (window.tnCurrentStep !== undefined) {
    window.tnCurrentStep = stepNumber;
  }
  
  // Update window.tnWizard for debugging
  if (window.tnWizard) {
    // Verify getter is working
    const getterValue = window.tnWizard.currentStep;
    console.log(`🔧 showStep: window.tnWizard.currentStep getter = ${getterValue} (expected: ${stepNumber})`);
    if (getterValue !== stepNumber) {
      console.error(`❌ BUG: Getter mismatch! currentStep=${currentStep}, getter=${getterValue}`);
    }
  }
  
  // Validate step number (allow step 0 for Race Info page)
  if (stepNumber < 0 || stepNumber > 5) {
    Logger.error(`showStep: Invalid step number ${stepNumber}`);
    return;
  }
  
  // Force tnScope container to be visible (parent container)
  if (tnScope) {
    tnScope.style.display = 'block';
    tnScope.style.visibility = 'visible';
    tnScope.style.opacity = '1';
    console.log(`✅ tnScope forced visible`);
  }
  
  // Force wizardMount to be visible (fix for invisible step content)
  if (wizardMount) {
    wizardMount.style.display = 'block';
    wizardMount.style.visibility = 'visible';
    wizardMount.style.opacity = '1';
    console.log(`✅ wizardMount forced visible for step ${stepNumber}`);
  } else {
    console.log(`❌ wizardMount element not found`);
  }
  
  // Load step content - now awaited to prevent race conditions
  await loadStep(stepNumber);
  
  // Step initialization is handled by loadStep -> loadStepContent -> initStepX()
  // Navigation buttons are set up by setupStepNavigation() after step loads
}

/**
 * Update navigation buttons visibility and text based on current step
 * @param {number} stepNumber - Current step number
 */
function updateNavigationButtons(stepNumber) {
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  // Show/hide back button (hide on step 1, show on steps 2-5)
  if (backBtn) {
    if (stepNumber > 1) {
      backBtn.style.display = 'inline-block';
    } else {
      backBtn.style.display = 'none';
    }
  }
  
  // Update next button text for final step (step 5 becomes Submit)
  if (nextBtn) {
    if (stepNumber === 5) {
      const submitText = window.i18n ? window.i18n.t('submitButton', 'Submit') : 'Submit';
      nextBtn.textContent = submitText;
      // Change button type if needed
      if (nextBtn.type !== 'submit') {
        nextBtn.type = 'button'; // Keep as button, submit handled separately
      }
    } else {
      const nextText = window.i18n ? window.i18n.t('nextButton', 'Next →') : 'Next →';
      nextBtn.textContent = nextText;
      nextBtn.type = 'button';
    }
  }
}

/**
 * Set up unified step navigation (fallback for steps using generic backBtn/nextBtn)
 * Note: Step-specific buttons (backToStep1, nextToStep3, etc.) are handled by setupStepXNavigation()
 */
function setupStepNavigation() {
  // This is a fallback for steps that use generic backBtn/nextBtn IDs
  // Most steps now use step-specific button handlers in setupStepXNavigation()
  Logger.debug('🎯 setupStepNavigation: Fallback navigation (not used for most steps)');
}

/**
 * Handle next button click (unified logic)
 */
function handleNextButtonClick() {
  const currentStepNum = getCurrentStep();
  console.log('🔜 Next button clicked. Current step:', currentStepNum);
  
  // Validate current step before proceeding
  if (validateCurrentStep()) {
    // Save current step data
    saveCurrentStepData();
    
    if (currentStepNum < totalSteps) {
      const nextStep = currentStepNum + 1;
      loadStep(nextStep);
      updateStepIndicator(nextStep);
    } else if (currentStepNum === 5) {
      // Final step - submit form
      if (typeof submitTNForm === 'function') {
        submitTNForm();
      } else {
        Logger.error('submitTNForm function not available');
      }
    }
  } else {
    console.log('⚠️ Validation failed, staying on step', currentStepNum);
  }
}

/**
 * Update step indicator (stepper visual state)
 * @param {number} stepNumber - Step number to show as active
 */
function updateStepIndicator(stepNumber) {
  updateStepper();
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
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const teamCount = document.getElementById('teamCount');
  
  // Validate team count selection
  if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors([
        { field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' }
      ], {
        containerId: 'categoryForm',
        scrollTo: true
      });
    } else {
      // Fallback: errorSystem not available
      console.error('ErrorSystem not available: Please select number of teams');
      alert('Please select number of teams');
      teamCount?.focus();
    }
    return false;
  }
  
  // Validate team fields if they exist
  const teamCountValue = parseInt(teamCount.value, 10);
  const errors = [];
  const teamData = [];
  
  // First pass: collect all team data and check for missing fields
  for (let i = 1; i <= teamCountValue; i++) {
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    const teamNameTc = document.getElementById(`teamNameTc${i}`);
    const teamCategory = document.getElementById(`teamCategory${i}`);
    
    if (!teamNameEn?.value?.trim()) {
      errors.push({
        field: `teamNameEn${i}`,
        messageKey: 'pleaseEnterTeamName',
        params: { num: i }
      });
    }
    
    if (!teamCategory?.value) {
      errors.push({
        field: `teamCategory${i}`,
        messageKey: 'pleaseSelectCategory',
        params: { num: i }
      });
    }
    
    // Check for selected radio button in the team option group
    const teamOptionRadios = document.querySelectorAll(`input[name="teamOption${i}"]:checked`);
    Logger.debug(`🎯 Validation: Team ${i} radio buttons found:`, teamOptionRadios.length);
    if (teamOptionRadios.length > 0) {
      Logger.debug(`🎯 Validation: Team ${i} selected value:`, teamOptionRadios[0].value);
    }
    
    if (teamOptionRadios.length === 0) {
      errors.push({
        field: `teamOptionGroup${i}`,
        messageKey: 'pleaseSelectEntryOption',
        params: { num: i }
      });
    }
    
    // Collect team data for duplicate checking
    if (teamNameEn?.value?.trim() && teamCategory?.value) {
      // Get category display name from select option
      const categoryDisplayName = teamCategory.options[teamCategory.selectedIndex]?.text || teamCategory.value;
      
      teamData.push({
        index: i,
        name: teamNameEn.value.trim(),
        category: teamCategory.value,
        categoryDisplayName: categoryDisplayName
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
        // Get category display name from first team in duplicate group
        const categoryDisplayName = teamsInCategory[0]?.categoryDisplayName || category;
        
        // Add error for EACH duplicate field
        nameCounts[name].forEach(team => {
          errors.push({
            field: `teamNameEn${team.index}`,
            messageKey: 'duplicateTeamName',
            params: { 
              num: team.index,
              category: categoryDisplayName
            }
          });
        });
      }
    });
  });
  
  // Display errors if any found
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'categoryForm',
        scrollTo: true
      });
    } else {
      // Fallback: errorSystem not available
      const missingFields = errors.map(err => {
        const message = window.i18n && typeof window.i18n.t === 'function'
          ? window.i18n.t(err.messageKey, err.params || {})
          : err.messageKey;
        return message;
      });
      const message = missingFields.length === 1 
        ? `Please complete: ${missingFields[0]}`
        : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
      console.error('ErrorSystem not available:', message);
      alert(message);
    }
    return false;
  }
  
  return true;
}

/**
 * Validate step 2 - Team Info
 */
function validateStep2() {
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  // Validate organization information
  const orgName = document.getElementById('orgName');
  const orgAddress = document.getElementById('orgAddress');
  
  if (!orgName?.value?.trim()) {
    errors.push({ field: 'orgName', messageKey: 'organizationRequired' });
  }
  
  if (!orgAddress?.value?.trim()) {
    errors.push({ field: 'orgAddress', messageKey: 'addressRequired' });
  }
  
  // Validate Team Manager 1 (Required)
  const manager1Name = document.getElementById('manager1Name');
  const manager1Phone = document.getElementById('manager1Phone');
  const manager1Email = document.getElementById('manager1Email');
  
  if (!manager1Name?.value?.trim()) {
    errors.push({ field: 'manager1Name', messageKey: 'managerNameRequired' });
  }
  
  if (!manager1Phone?.value?.trim()) {
    errors.push({ field: 'manager1Phone', messageKey: 'managerPhoneRequired' });
  } else if (!isValidHKPhone(manager1Phone.value.trim())) {
    errors.push({ field: 'manager1Phone', messageKey: 'invalidPhone' });
  }
  
  if (!manager1Email?.value?.trim()) {
    errors.push({ field: 'manager1Email', messageKey: 'managerEmailRequired' });
  } else if (!isValidEmail(manager1Email.value.trim())) {
    errors.push({ field: 'manager1Email', messageKey: 'invalidEmail' });
  }
  
  // Validate Team Manager 2 (Required)
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  
  if (!manager2Name?.value?.trim()) {
    errors.push({ field: 'manager2Name', messageKey: 'managerNameRequired' });
  }
  
  if (!manager2Phone?.value?.trim()) {
    errors.push({ field: 'manager2Phone', messageKey: 'managerPhoneRequired' });
  } else if (!isValidHKPhone(manager2Phone.value.trim())) {
    errors.push({ field: 'manager2Phone', messageKey: 'invalidPhone' });
  }
  
  if (!manager2Email?.value?.trim()) {
    errors.push({ field: 'manager2Email', messageKey: 'managerEmailRequired' });
  } else if (!isValidEmail(manager2Email.value.trim())) {
    errors.push({ field: 'manager2Email', messageKey: 'invalidEmail' });
  }
  
  // Validate Team Manager 3 (Optional, but if provided must be valid)
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  
  // If Manager 3 name is provided, phone and email should also be provided
  if (manager3Name?.value?.trim()) {
    if (!manager3Phone?.value?.trim()) {
      errors.push({ field: 'manager3Phone', messageKey: 'managerPhoneRequired' });
    } else if (!isValidHKPhone(manager3Phone.value.trim())) {
      errors.push({ field: 'manager3Phone', messageKey: 'invalidPhone' });
    }
    
    if (!manager3Email?.value?.trim()) {
      errors.push({ field: 'manager3Email', messageKey: 'managerEmailRequired' });
    } else if (!isValidEmail(manager3Email.value.trim())) {
      errors.push({ field: 'manager3Email', messageKey: 'invalidEmail' });
    }
  } else if (manager3Phone?.value?.trim() || manager3Email?.value?.trim()) {
    // If phone or email is provided, name should also be provided
    if (!manager3Name?.value?.trim()) {
      errors.push({ field: 'manager3Name', messageKey: 'managerNameRequired' });
    }
    
    // Validate phone if provided
    if (manager3Phone?.value?.trim() && !isValidHKPhone(manager3Phone.value.trim())) {
      errors.push({ field: 'manager3Phone', messageKey: 'invalidPhone' });
    }
    
    // Validate email if provided
    if (manager3Email?.value?.trim() && !isValidEmail(manager3Email.value.trim())) {
      errors.push({ field: 'manager3Email', messageKey: 'invalidEmail' });
    }
  }
  
  // Display errors if any found
  if (errors.length > 0) {
    if (window.errorSystem) {
      // Find the form container - use wizardMount as it contains the organization form
      window.errorSystem.showFormErrors(errors, {
        containerId: 'wizardMount',
        scrollTo: true
      });
    } else {
      // Fallback: errorSystem not available
      const missingFields = errors.map(err => {
        const message = window.i18n && typeof window.i18n.t === 'function'
          ? window.i18n.t(err.messageKey)
          : err.messageKey;
        return message;
      });
      const message = missingFields.length === 1 
        ? `Please complete: ${missingFields[0]}`
        : `Please complete: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
      console.error('ErrorSystem not available:', message);
      alert(message);
    }
    return false;
  }
  
  return true;
}

/**
 * Validate step 3 - Race Day
 */
function validateStep3() {
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  // Get all quantity inputs
  const qtyInputs = document.querySelectorAll('.qty-input');
  
  qtyInputs.forEach(input => {
    const value = parseInt(input.value, 10) || 0;
    const min = parseInt(input.min, 10) || 0;
    const max = input.max ? parseInt(input.max, 10) : null;
    
    // Check minimum quantity (must be >= 0, but min attribute may be higher)
    if (value < min) {
      errors.push({
        field: input.id,
        messageKey: 'quantityMustBePositive',
        params: { min: min }
      });
    }
    
    // Check maximum quantity (if max is specified)
    if (max !== null && value > max) {
      errors.push({
        field: input.id,
        messageKey: 'quantityExceedsMax',
        params: { max: max }
      });
    }
  });
  
  // Display errors if any found
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'wizardMount',
        scrollTo: true
      });
    } else {
      // Fallback: errorSystem not available
      const errorMessages = errors.map(err => {
        const message = window.i18n && typeof window.i18n.t === 'function'
          ? window.i18n.t(err.messageKey, err.params || {})
          : err.messageKey;
        return message;
      });
      const message = errorMessages.length === 1 
        ? errorMessages[0]
        : `Please fix: ${errorMessages.slice(0, -1).join(', ')} and ${errorMessages[errorMessages.length - 1]}`;
      console.error('ErrorSystem not available:', message);
      alert(message);
    }
    return false;
  }
  
  return true;
}

/**
 * Validate step 4 - Practice
 */
function validateStep4() {
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  
  // Check for duplicate slot selections
  const duplicateErrors = checkForDuplicates();
  if (duplicateErrors.length > 0) {
    errors.push(...duplicateErrors);
  }
  
  // Validate practice requirements
  const practiceErrors = validatePracticeRequired();
  if (practiceErrors.length > 0) {
    errors.push(...practiceErrors);
  }
  
  // Display errors if any found
  if (errors.length > 0) {
    if (window.errorSystem && typeof window.errorSystem.showFormErrors === 'function') {
      // Use showFormErrors for unified error display
      window.errorSystem.showFormErrors(errors);
      
      // Also display in pre-existing error divs for practice errors
      errors.forEach(error => {
        const { field, messageKey, params = {} } = error;
        const errorDivId = `error-${field}`;
        const errorDiv = document.getElementById(errorDivId);
        
        if (errorDiv) {
          // Get translated message
          const message = window.i18n && typeof window.i18n.t === 'function'
            ? window.i18n.t(messageKey, params)
            : messageKey;
          
          // Display error in the div
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
          errorDiv.classList.add('show');
        }
      });
      
      // Scroll to first error
      if (errors.length > 0) {
        const firstError = errors[0];
        const firstErrorDiv = document.getElementById(`error-${firstError.field}`);
        if (firstErrorDiv) {
          setTimeout(() => {
            firstErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    } else if (window.errorSystem) {
      // Fallback: use showFieldError for each error
      errors.forEach(error => {
        const { field, messageKey, params = {} } = error;
        const errorDivId = `error-${field}`;
        const errorDiv = document.getElementById(errorDivId);
        
        if (errorDiv) {
          const message = window.i18n && typeof window.i18n.t === 'function'
            ? window.i18n.t(messageKey, params)
            : messageKey;
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
        } else if (window.errorSystem.showFieldError) {
          window.errorSystem.showFieldError(field, messageKey, { params });
        }
      });
    } else {
      // Fallback: errorSystem not available
      const errorMessages = errors.map(err => {
        const message = window.i18n && typeof window.i18n.t === 'function'
          ? window.i18n.t(err.messageKey, err.params || {})
          : err.messageKey;
        return message;
      });
      const message = errorMessages.length === 1 
        ? errorMessages[0]
        : `Please fix: ${errorMessages.slice(0, -1).join(', ')} and ${errorMessages[errorMessages.length - 1]}`;
      console.error('ErrorSystem not available:', message);
      alert(message);
    }
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
	Logger.debug('🎯 saveStep1Data: Saved team count:', teamCount.value);
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
    sessionStorage.setItem('tn_manager1_name', manager1Name.value.trim());
  }
  if (manager1Phone?.value) {
    // Normalize phone to +852xxxxxxxx format
    const normalized = normalizeHKPhone(manager1Phone.value);
    sessionStorage.setItem('tn_manager1_phone', normalized);
  }
  if (manager1Email?.value) {
    sessionStorage.setItem('tn_manager1_email', manager1Email.value.trim());
  }
  
  // Save Team Manager 2 data
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  
  if (manager2Name?.value) {
    sessionStorage.setItem('tn_manager2_name', manager2Name.value.trim());
  }
  if (manager2Phone?.value) {
    // Normalize phone to +852xxxxxxxx format
    const normalized = normalizeHKPhone(manager2Phone.value);
    sessionStorage.setItem('tn_manager2_phone', normalized);
  }
  if (manager2Email?.value) {
    sessionStorage.setItem('tn_manager2_email', manager2Email.value.trim());
  }
  
  // Save Team Manager 3 data (optional)
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  
  if (manager3Name?.value) {
    sessionStorage.setItem('tn_manager3_name', manager3Name.value.trim());
  }
  if (manager3Phone?.value) {
    // Normalize phone to +852xxxxxxxx format
    const normalized = normalizeHKPhone(manager3Phone.value);
    sessionStorage.setItem('tn_manager3_phone', normalized);
  }
  if (manager3Email?.value) {
    sessionStorage.setItem('tn_manager3_email', manager3Email.value.trim());
  }
  
	Logger.debug('🎯 saveStep2Data: Organization and manager data saved');
}

/**
 * Save step 3 data
 */
function saveStep3Data() {
  console.log('🎯 saveStep3Data: Saving race day data');
  
  const raceDayData = {};

  // Get all quantity inputs and save their values
  const qtyInputs = document.querySelectorAll('.qty-input');

  qtyInputs.forEach(input => {
    const value = parseInt(input.value, 10) || 0;
    raceDayData[input.id] = value;
    console.log(`  Saved ${input.id}: ${value}`);
  });

  // Collect junk boat licenses as array
  const junkLicenses = [];
  const junkQty = parseInt(document.getElementById('junkBoatQty')?.value || '0');
  for (let i = 1; i <= junkQty; i++) {
    const license = document.getElementById(`junkBoatLicense${i}`)?.value?.trim();
    if (license) junkLicenses.push(license);
  }
  sessionStorage.setItem('tn_junkBoatLicenses', JSON.stringify(junkLicenses));
  console.log('  ✓ Saved junkBoatLicenses:', junkLicenses.length, 'license(s)');
  
  // Collect speed boat licenses as array
  const speedLicenses = [];
  const speedQty = parseInt(document.getElementById('speedboatQty')?.value || '0');
  for (let i = 1; i <= speedQty; i++) {
    const license = document.getElementById(`speedBoatLicense${i}`)?.value?.trim();
    if (license) speedLicenses.push(license);
  }
  sessionStorage.setItem('tn_speedBoatLicenses', JSON.stringify(speedLicenses));
  console.log('  ✓ Saved speedBoatLicenses:', speedLicenses.length, 'license(s)');

  // Save steersman options for each team
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  for (let i = 0; i < teamCount; i++) {
    const select = document.querySelector(`select[name="steersman_team_${i}"]`);
    if (select) {
      sessionStorage.setItem(`tn_team_${i+1}_steersman_option`, select.value);
    }
  }

  // Save to sessionStorage
  sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));

	Logger.debug('🎯 saveStep3Data: Race day data saved:', raceDayData);
  console.log('🎯 Race day data saved:', raceDayData);
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
  
	Logger.debug('🎯 saveStep4Data: Saved practice data for all teams:', allTeamPracticeData);
}

/**
 * Collect all team practice data for submission
 */
function collectAllTeamPracticeData() {
  const allPracticeData = [];
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
	Logger.debug(`🎯 collectAllTeamPracticeData: Collecting data for ${teamCount} teams`);
  
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
      
	Logger.debug(`🎯 collectAllTeamPracticeData: Team ${i} has ${teamData.dates.length} practice dates`);
    } else {
	Logger.debug(`🎯 collectAllTeamPracticeData: Team ${i} has no practice data`);
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
        duration_hours: Number(r.duration_hours) || 2,
        helper: r.helper || 'ST'
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
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i+1}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i+1}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i+1}`);
    const teamOption = sessionStorage.getItem(`tn_team_option_${i+1}`);
    
    // Get steersman option from dropdown or sessionStorage
    const select = document.querySelector(`select[name="steersman_team_${i}"]`);
    const steersmanOption = select ? select.value : (sessionStorage.getItem(`tn_team_${i+1}_steersman_option`) || 'not_required');
    
    if (teamNameEn) {
      teams.push({
        name: teamNameEn, // Keep 'name' for backward compatibility, but it's now name_en
        name_en: teamNameEn,
        name_tc: teamNameTc || '',
        category: teamCategory,
        option: teamOption,
        race_day_steersman_option: steersmanOption,
        index: i
      });
    }
  }
  
  return teams;
}

function collectRaceDayData() {
  // TN form stores race day data as 'tn_race_day', not 'race_day_arrangement'
  const raceDayData = JSON.parse(sessionStorage.getItem('tn_race_day') || '{}');
  
  // Get license arrays from sessionStorage
  const junkLicenses = JSON.parse(sessionStorage.getItem('tn_junkBoatLicenses') || '[]');
  const speedLicenses = JSON.parse(sessionStorage.getItem('tn_speedBoatLicenses') || '[]');
  
  const items = [];
  if (raceDayData.marqueeQty > 0) {
    items.push({ code: 'marquee', qty: raceDayData.marqueeQty });
  }
  // Note: Steersman quantities removed - now handled per-team via race_day_steersman_option
  if (raceDayData.junkBoatQty > 0) {
    const item = { 
      code: 'junk_boat', 
      qty: raceDayData.junkBoatQty
    };
    // Send all licenses as boat_nos array
    if (junkLicenses.length > 0) {
      item.boat_nos = junkLicenses;
    }
    items.push(item);
  }
  if (raceDayData.speedboatQty > 0) {
    const item = { 
      code: 'speed_boat', 
      qty: raceDayData.speedboatQty
    };
    // Send all licenses as boat_nos array
    if (speedLicenses.length > 0) {
      item.boat_nos = speedLicenses;
    }
    items.push(item);
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
        package_id: teamOption,  // Use the full package code directly
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
  // Show loading indicator
  showLoadingIndicator();
  
  // Disable submit button
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  
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
    const opt1Count = teams.filter(t => t.option && t.option.startsWith('option_1')).length; // Calculate from actual teams
    const opt2Count = teams.filter(t => t.option && t.option.startsWith('option_2')).length; // Calculate from actual teams
    
    // Build payload in server-expected format
    const payload = {
      client_tx_id: getClientTxId(),
      eventShortRef: getEventShortRef() || 'TN2026',
      category: raceCategory,
      season: window.__CONFIG?.event?.season || 2026,
      org_name: contact.name,
      org_address: contact.address,
      counts: {
        num_teams: teamCount,
        num_teams_opt1: opt1Count,
        num_teams_opt2: opt2Count
      },
      team_names: teams.map(t => t.name_en || t.name), // Backward compatibility
      team_names_en: teams.map(t => t.name_en || t.name),
      team_names_tc: teams.map(t => t.name_tc || ''),
      team_options: teams.map(t => t.option),
      team_race_day_steersman_options: teams.map(t => t.race_day_steersman_option || 'not_required'),
      managers: managers,
      race_day: raceDay.length > 0 ? raceDay.map(item => ({
        item_code: item.code,
        qty: item.qty,
        ...(item.boat_nos && { boat_nos: item.boat_nos })
      })).filter(item => item.qty > 0) : null,
      practice: practice
    };
    
	Logger.debug('🎯 submitTNForm: Payload structure:', payload);
	Logger.debug('🎯 submitTNForm: Payload details:', {
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
      hideLoadingIndicator();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
      }
      if (window.errorSystem) {
        window.errorSystem.showSystemError('serverErrorDetailed', {
          dismissible: true
        });
      } else {
        console.error('ErrorSystem not available:', errors.join(', '));
        alert(errors.join(', '));
      }
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
	Logger.error('Edge Function error:', error);
	Logger.error('Error message:', error.message);
	Logger.error('Error context:', error.context);
      
      // Handle timeout specifically
      if (error.message && error.message.includes('timeout')) {
        hideLoadingIndicator();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        }
        if (window.errorSystem) {
          window.errorSystem.showSystemError('timeoutErrorDetailed', {
            dismissible: true
          });
        } else {
          console.error('ErrorSystem not available: Submission timeout');
          alert('Submission timed out. Please try again or contact support if the issue persists.');
        }
        return;
      }
      
      // Make a direct fetch to get the actual error details (debug only)
      try {
        const supabaseKey = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY';
        const debugResult = await fetchWithErrorHandling('https://khqarcvszewerjckmtpg.supabase.co/functions/v1/submit_registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify(payload),
          context: 'debug_direct_fetch_timeout',
          skipRetry: true // Skip retry for debug calls
        });
        
        Logger.error('Direct fetch result:', debugResult);
      } catch (fetchError) {
        Logger.error('Direct fetch failed:', fetchError);
      }
      
      // Handle specific error cases
      hideLoadingIndicator();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
      }
      
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('uniq_teamname_per_div_season_norm')) {
          if (window.errorSystem) {
            window.errorSystem.showSystemError('duplicateTeamName', {
              dismissible: true
            });
          } else {
            console.error('ErrorSystem not available: Duplicate team names');
            alert('One or more team names already exist for this division and season. Please choose different team names.');
          }
        } else if (error.message.includes('uniq_registration_client_tx')) {
          if (window.errorSystem) {
            window.errorSystem.showSystemError('duplicateRegistration', {
              dismissible: true
            });
          } else {
            console.error('ErrorSystem not available: Duplicate registration');
            alert('This registration has already been submitted. Please refresh the page to start a new registration.');
          }
        } else {
          if (window.errorSystem) {
            window.errorSystem.showSystemError('duplicateRegistration', {
              dismissible: true
            });
          } else {
            console.error('ErrorSystem not available: Duplicate data');
            alert('Duplicate data detected. Please check your team names and try again.');
          }
        }
      } else if (error.message && error.message.includes('Practice date is not on an allowed weekday')) {
        if (window.errorSystem) {
          window.errorSystem.showSystemError('practiceDateWeekdayError', {
            dismissible: true
          });
        } else {
          console.error('ErrorSystem not available: Practice date weekday error');
          alert('One or more practice dates are not on allowed weekdays. Please select weekdays only.');
        }
      } else if (error.message && (error.message.includes('Practice date is before allowed window') || 
                                    error.message.includes('Practice date is after allowed window'))) {
        if (window.errorSystem) {
          window.errorSystem.showSystemError('practiceDateWindowError', {
            dismissible: true
          });
        } else {
          console.error('ErrorSystem not available: Practice date window error');
          alert('One or more practice dates are outside the allowed practice window.');
        }
      } else {
        // Check for HTTP status codes
        const status = error.status || error.context?.status;
        if (status === 429) {
          if (window.errorSystem) {
            window.errorSystem.showSystemError('rateLimitExceeded', {
              persistent: true,
              dismissible: true
            });
          } else {
            console.error('ErrorSystem not available: Rate limit exceeded');
            alert('Too many attempts. Please wait a few minutes and try again.');
          }
        } else if (status >= 500) {
          if (window.errorSystem) {
            window.errorSystem.showSystemError('serverErrorDetailed', {
              dismissible: true
            });
          } else {
            console.error('ErrorSystem not available:', error.message || 'Unknown error');
            alert(`Submission failed: ${error.message || 'Unknown error'}`);
          }
        } else {
          if (window.errorSystem) {
            window.errorSystem.showSystemError('serverErrorDetailed', {
              dismissible: true
            });
          } else {
            console.error('ErrorSystem not available:', error.message || 'Unknown error');
            alert(`Submission failed: ${error.message || 'Unknown error'}`);
          }
        }
      }
      return;
    }
    
    if (data) {
	Logger.debug('✅ Form submission successful!', data);
      const { registration_ids, team_codes } = data;
      
      // Clear draft from localStorage on successful submission
      if (window.AutoSave) {
        const eventRef = getTNEventShortRef();
        AutoSave.clearDraft(eventRef);
        AutoSave.stopAutoSave();
        console.log('💾 Auto-save: Draft cleared after successful submission');
      }
      
      // Create receipt with the first registration_id (for compatibility)
      const receipt = saveReceipt({ 
        registration_id: registration_ids?.[0], 
        team_codes, 
        email: contact.email 
      });
      
      // Hide loading and display success page
      hideLoadingIndicator();
      
      // Collect team names and emails from sessionStorage before clearing
      const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
      const teamNamesEn = [];
      const teamNamesTc = [];
      const managerEmails = [];
      
      for (let i = 1; i <= teamCount; i++) {
        const nameEn = sessionStorage.getItem(`tn_team_name_en_${i}`);
        const nameTc = sessionStorage.getItem(`tn_team_name_tc_${i}`);
        if (nameEn) {
          teamNamesEn.push(nameEn);
          if (nameTc) teamNamesTc.push(nameTc);
        }
      }
      
      // Collect all manager emails from sessionStorage (TN uses tn_manager1_email format)
      const manager1Email = sessionStorage.getItem('tn_manager1_email');
      const manager2Email = sessionStorage.getItem('tn_manager2_email');
      const manager3Email = sessionStorage.getItem('tn_manager3_email');
      
      if (manager1Email) managerEmails.push(manager1Email);
      if (manager2Email && !managerEmails.includes(manager2Email)) managerEmails.push(manager2Email);
      if (manager3Email && !managerEmails.includes(manager3Email)) managerEmails.push(manager3Email);
      
      // Use the new success handler - pass all data from response
      // Collect all unique manager emails for confirmation
      const allManagerEmails = [...new Set(managerEmails.filter(Boolean))];
      
      displaySuccessPage({
        registration_id: data?.registration_id || registration_ids?.[0],
        registration_ids: registration_ids,
        registration_number: data?.registration_number || null,
        team_codes: data?.team_codes || team_codes,
        team_name: data?.team_name || teamNamesEn[0] || null,
        team_names: data?.team_names || teamNamesEn || [],
        teams: data?.teams || null,
        email: data?.email || contact.email || allManagerEmails[0],
        contact_email: data?.contact_email || contact.email || allManagerEmails[0],
        manager_email: allManagerEmails.length > 1 ? allManagerEmails[1] : (allManagerEmails[0] || null),
        org_email: allManagerEmails[0] || contact.email,
        event_type: data?.event_type || data?.ref_event_type || 'TN',
        ref_event_type: data?.ref_event_type || data?.event_type || 'TN',
        event_short_ref: data?.event_short_ref || getEventShortRef(),
        event_long_name: data?.event_long_name || null,
        created_at: data?.created_at || new Date().toISOString(),
        season: data?.season || null,
        category: data?.category || null,
        total_price: data?.total_price || null
      });
    } else {
	Logger.debug('⚠️ No data in response, but no error either');
      hideLoadingIndicator();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
      }
      if (window.errorSystem) {
        window.errorSystem.showSystemError('serverErrorDetailed', {
          dismissible: true
        });
      } else {
        console.error('ErrorSystem not available: No response from server');
        alert('No response received from server. Please try again.');
      }
    }
    
  } catch (error) {
	Logger.error('Submission error:', error);
    hideLoadingIndicator();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      if (window.errorSystem) {
        window.errorSystem.showSystemError('networkErrorDetailed', {
          dismissible: true
        });
      } else {
        console.error('ErrorSystem not available: Submission failed');
        alert('Submission failed. Please try again.');
      }
    } else {
      if (window.errorSystem) {
        window.errorSystem.showSystemError('networkErrorDetailed', {
          dismissible: true
        });
      } else {
        console.error('ErrorSystem not available: Submission failed');
        alert('Submission failed. Please try again.');
      }
    }
  }
}


/**
 * Show loading indicator
 */
function showLoadingIndicator() {
  // Create loading overlay if it doesn't exist
  let loadingOverlay = document.getElementById('loadingOverlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Submitting your application...</p>
        <p class="loading-subtext">Please do not close or refresh this page</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
    
    // Add styles for loading overlay
    const style = document.createElement('style');
    style.textContent = `
      #loadingOverlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }
      
      .loading-spinner {
        background: white;
        padding: 2rem 3rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      
      .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #0f6ec7;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-spinner p {
        margin: 0.5rem 0;
        font-size: 1.1rem;
        font-weight: bold;
        color: #333;
      }
      
      .loading-subtext {
        font-size: 0.9rem !important;
        font-weight: normal !important;
        color: #666 !important;
      }
    `;
    document.head.appendChild(style);
  }
  loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

/**
 * DEPRECATED: Redirect to success page
 * This function is kept for backward compatibility but should use displaySuccessPage() directly
 * @deprecated Use displaySuccessPage() from success_handler.js instead
 */
function redirectToSuccessPage(receipt) {
  console.warn('redirectToSuccessPage() is deprecated. Use displaySuccessPage() directly.');
  // Store receipt data for success page
  sessionStorage.setItem('success_receipt', JSON.stringify(receipt));
  
  // Build the redirect URL - always use register.html to ensure consistency
  const targetUrl = '/register.html?success=true';
  
  console.log('🔄 redirectToSuccessPage: Redirecting to', targetUrl);
  
  // Use location.href for reliable redirect
  window.location.href = targetUrl;
}

/**
 * Show error message
 */
// Legacy showError() function removed - now using unified error system
// Replaced by errorSystem.showFormErrors() and errorSystem.showSystemError()
// Fallback: Use alert() if errorSystem not available
function showError(message) {
  console.error('Error (errorSystem not available):', message);
  alert(message || 'An error occurred');
}

// Legacy hideError() function removed - now using unified error system
// Replaced by errorSystem.clearFormErrors() and errorSystem.clearSystemError()

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
      const opt1Count = teams.filter(t => t.option && t.option.startsWith('option_1')).length; // Calculate from actual teams
      const opt2Count = teams.filter(t => t.option && t.option.startsWith('option_2')).length; // Calculate from actual teams
      
      const payload = {
        client_tx_id: getClientTxId(),
        eventShortRef: getEventShortRef() || 'TN2026',
        category: raceCategory,
        season: window.__CONFIG?.event?.season || 2026,
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
        race_day: raceDay.length > 0 ? raceDay.map(item => ({
          item_code: item.code,
          qty: item.qty,
          ...(item.boat_nos && { boat_nos: item.boat_nos })
        })).filter(item => item.qty > 0) : null,
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
      const opt1Count = teams.filter(t => t.option && t.option.startsWith('option_1')).length; // Calculate from actual teams
      const opt2Count = teams.filter(t => t.option && t.option.startsWith('option_2')).length; // Calculate from actual teams
      
      const payload = {
        client_tx_id: getClientTxId(),
        eventShortRef: getEventShortRef() || 'TN2026',
        category: raceCategory,
        season: window.__CONFIG?.event?.season || 2026,
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
        race_day: raceDay.length > 0 ? raceDay.map(item => ({
          item_code: item.code,
          qty: item.qty,
          ...(item.boat_nos && { boat_nos: item.boat_nos })
        })).filter(item => item.qty > 0) : null,
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
	Logger.debug('🧪 Testing TN Payload Structure...');
    
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
    sessionStorage.setItem('tn_team_name_en_1', 'Test Team 1');
    sessionStorage.setItem('tn_team_category_1', 'mixed_open');
    sessionStorage.setItem('tn_team_option_1', 'opt1');
    sessionStorage.setItem('tn_team_name_en_2', 'Test Team 2');
    sessionStorage.setItem('tn_team_category_2', 'mixed_open');
    sessionStorage.setItem('tn_team_option_2', 'opt2');
    
    // Manager data
    sessionStorage.setItem('tn_manager1_name', 'Manager One');
    sessionStorage.setItem('tn_manager1_phone', '+85291234567');
    sessionStorage.setItem('tn_manager1_email', 'manager1@test.com');
    sessionStorage.setItem('tn_manager2_name', 'Manager Two');
    sessionStorage.setItem('tn_manager2_phone', '+85292345678');
    sessionStorage.setItem('tn_manager2_email', 'manager2@test.com');
    sessionStorage.setItem('tn_manager3_name', 'Manager Three');
    sessionStorage.setItem('tn_manager3_phone', '+85293456789');
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
          { date: '2026-01-15', hours: 2, helpers: 'ST' },
          { date: '2026-01-22', hours: 1, helpers: 'S' }
        ],
        slotPrefs_2hr: { slot_pref_1: 'SAT2_0800_1000', slot_pref_2: 'SAT2_1000_1200' },
        slotPrefs_1hr: { slot_pref_1: 'SAT1_0800_0900' }
      },
      {
        team_index: 1,
        dates: [
          { date: '2026-01-16', hours: 2, helpers: 'T' }
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
        eventShortRef: getEventShortRef() || 'TN2026',
        category: 'mixed_open',
        season: 2026,
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
                { pref_date: '2026-01-15', duration_hours: 2, helper: 'ST' },
                { pref_date: '2026-01-22', duration_hours: 1, helper: 'S' }
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
                { pref_date: '2026-01-16', duration_hours: 2, helper: 'T' }
              ],
              slot_ranks: [
                { rank: 1, slot_code: 'SUN2_0900_1100' }
              ]
            }
          ]
        }
      };
      
	Logger.debug('🧪 Generated Payload:', JSON.stringify(payload, null, 2));
      
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
      
	Logger.debug('🧪 Validation Results:', validation);
      
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
  
	Logger.debug('✅ Quick test functions loaded and ready!');
	Logger.debug('   Run testQuickSubmitSingle() or testQuickSubmit() in console to test');
}
