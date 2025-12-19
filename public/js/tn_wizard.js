/**
 * TN Legacy Wizard Implementation
 * Restores legacy multi-step form behavior with exact visual compatibility
 */

import { TN_SELECTORS, collectCompleteTNState, validateTNState } from './tn_map.js';
import { sb } from '../supabase_config.js';
import { getCurrentTeamKey, setCurrentTeamKey, readTeamRows, writeTeamRows, readTeamRanks, writeTeamRanks } from './tn_practice_store.js';
import { EDGE_URL, getClientTxId, getEventShortRef, postJSON, saveReceipt, showConfirmation, mapError } from './submit.js';
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
export function initTNWizard() {
	Logger.debug('initTNWizard: Starting TN wizard initialization');
  tnScope = document.getElementById('tnScope');
  wizardMount = document.getElementById('wizardMount');
  stepper = document.getElementById('stepper');
  
	Logger.debug('initTNWizard: Containers found:', { tnScope: !!tnScope, wizardMount: !!wizardMount, stepper: !!stepper });
  
  if (!tnScope || !wizardMount) {
	Logger.error('TN wizard containers not found');
    return;
  }
  
  // Check if we're starting fresh or continuing with existing data
  checkAndCleanPreviewData();
  
  // Initialize debug functions globally
  setupDebugFunctions();
  
  // Initialize step navigation
  initStepNavigation();
  
  // Load step 0 (Race Info) first
	Logger.debug('initTNWizard: Loading step 0 (Race Info)');
  loadStep(0);
  
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
  const step2 = t('tnStep2', '2. Organization');
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
    #tnScope .info-value.deadline {
      color: #dc3545;
      font-weight: 600;
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
  wizardMount.innerHTML = '';
  wizardMount.appendChild(content);
  
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
  
  // Helper to get bilingual display (both languages shown)
  const getBilingual = (en, tc) => {
    const enVal = en || '';
    const tcVal = tc || '';
    if (enVal && tcVal && enVal !== tcVal) {
      return `${tcVal} ${enVal}`;
    }
    return enVal || tcVal || '—';
  };
  
  // Extract event data with placeholders for missing fields
  const eventName = getBilingual(event.event_long_name_en, event.event_long_name_tc);
  const eventDate = getBilingual(event.event_date_en, event.event_date_tc);
  const eventTime = getBilingual(event.event_time_en || 'TBA', event.event_time_tc || '待定');
  const eventVenue = getBilingual(event.event_location_en, event.event_location_tc);
  const raceCourse = getBilingual(event.course_length_en || 'Standard Course', event.course_length_tc || '標準賽道');
  const deadline = getBilingual(event.reg_deadline_date_en || 'TBA', event.reg_deadline_date_tc || '待定');
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
      #tnScope .info-value.deadline {
        color: #dc3545;
        font-weight: 600;
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
        text-align: center;
        padding-top: 1rem;
      }
      #tnScope #raceInfoNextBtn {
        background: ${primaryColor} !important;
        color: white !important;
        padding: 0.875rem 2.5rem !important;
        font-size: 1.1rem !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: 600 !important;
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
          <span class="info-label" data-i18n="raceInfoDeadline">${t('raceInfoDeadline', 'Application Deadline')}</span>
          <span class="info-value deadline">${deadline}</span>
        </div>
        
        <div class="info-row appendix-row">
          <span class="info-label" data-i18n="raceInfoAppendix">${t('raceInfoAppendix', 'Registration Appendix')}</span>
          <a href="${appendixLink}" target="_blank" rel="noopener noreferrer" class="appendix-btn" data-i18n="raceInfoClickHere">${t('raceInfoClickHere', 'Click Here')}</a>
        </div>
      </div>
      
      <!-- Next Button -->
      <div class="race-info-actions">
        <button type="button" id="raceInfoNextBtn">
          <span data-i18n="raceInfoNext">${t('raceInfoNext', 'Next')}</span> →
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
}

/**
 * Initialize Step 1 - Category Selection
 */
async function initStep1() {
	Logger.debug('🎯 initStep1: Starting team count selection');
  
  // Create team count selection UI (will replace template content)
  createTeamCountSelector();
  
  // Set up team count change handler
  setupTeamCountHandler();
  
  // Restore previously selected team count if it exists (await to ensure fields are generated)
  await restoreTeamCountSelection();
}

/**
 * Create team count selector
 */
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
  container.innerHTML = '';
  container.appendChild(teamCountSection);
  
	Logger.debug('🎯 initStep1: Team count selector created');
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
          team.nameElement.classList.add('field-error');
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
  
  // Load team count from step 1
  const teamCount = sessionStorage.getItem('tn_team_count');
  if (!teamCount) {
	Logger.warn('🎯 initStep2: No team count found, redirecting to step 1');
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
        </div>
        
        <div class="form-group">
          <label for="orgAddress" data-i18n="addressLabel">${t('addressLabel')}</label>
          <textarea id="orgAddress" name="orgAddress" required rows="3"
                    placeholder="${t('enterCompleteAddress')}" data-i18n-placeholder="enterCompleteAddress"></textarea>
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
          </div>
          <div class="form-group">
            <label for="manager1Phone" data-i18n="phoneLabel">${t('phoneLabel')}</label>
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+852</span>
              <input type="tel" id="manager1Phone" name="manager1Phone" required 
                     placeholder="${t('eightDigitNumber')}" data-i18n-placeholder="eightDigitNumber" maxlength="8" inputmode="numeric" 
                     pattern="[0-9]{8}" />
            </div>
            <div class="field-error" id="manager1PhoneError"></div>
          </div>
          <div class="form-group">
            <label for="manager1Email" data-i18n="emailLabel">${t('emailLabel')}</label>
            <input type="email" id="manager1Email" name="manager1Email" required 
                   placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
            <div class="field-error" id="manager1EmailError"></div>
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
          </div>
          <div class="form-group">
            <label for="manager2Phone" data-i18n="phoneLabel">${t('phoneLabel')}</label>
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+852</span>
              <input type="tel" id="manager2Phone" name="manager2Phone" required 
                     placeholder="${t('eightDigitNumber')}" data-i18n-placeholder="eightDigitNumber" maxlength="8" inputmode="numeric" 
                     pattern="[0-9]{8}" />
            </div>
            <div class="field-error" id="manager2PhoneError"></div>
          </div>
          <div class="form-group">
            <label for="manager2Email" data-i18n="emailLabel">${t('emailLabel')}</label>
            <input type="email" id="manager2Email" name="manager2Email" required 
                   placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
            <div class="field-error" id="manager2EmailError"></div>
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
          </div>
          <div class="form-group">
            <label for="manager3Phone" data-i18n="phoneLabelOptional">${t('phoneLabelOptional')}</label>
            <div class="phone-input-wrapper">
              <span class="phone-prefix">+852</span>
              <input type="tel" id="manager3Phone" name="manager3Phone" 
                     placeholder="${t('eightDigitNumber')}" data-i18n-placeholder="eightDigitNumber" maxlength="8" inputmode="numeric" 
                     pattern="[0-9]{8}" />
            </div>
            <div class="field-error" id="manager3PhoneError"></div>
          </div>
          <div class="form-group">
            <label for="manager3Email" data-i18n="emailLabelOptional">${t('emailLabelOptional')}</label>
            <input type="email" id="manager3Email" name="manager3Email" 
                   placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
            <div class="field-error" id="manager3EmailError"></div>
          </div>
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" id="backToStep1" class="btn btn-secondary" data-i18n="backTeamSelection">
          ${t('backTeamSelection')}
        </button>
        <button type="button" id="nextToStep3" class="btn btn-primary" data-i18n="nextRaceDay">
          ${t('nextRaceDay')}
        </button>
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
 */
function setupStep2Validation() {
  // Set up validation for all email fields
  setupEmailValidation('manager1Email');
  setupEmailValidation('manager2Email');
  setupEmailValidation('manager3Email');
  
  // Set up validation for all phone fields
  setupPhoneValidation('manager1Phone');
  setupPhoneValidation('manager2Phone');
  setupPhoneValidation('manager3Phone');
  
	Logger.debug('🎯 setupStep2Validation: Email and phone validation configured');
}

/**
 * Set up navigation for step 2
 */
function setupStep2Navigation() {
  // Back button
  const backBtn = document.getElementById('backToStep1');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
	Logger.debug('🎯 initStep2: Back button clicked, going to step 1');
      clearStepDataFromHere(1); // Clear step 1 and all after
      loadStep(1);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextToStep3');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
	Logger.debug('🎯 initStep2: Next button clicked, validating step 2');
      
      if (validateStep2()) {
	Logger.debug('🎯 initStep2: Validation passed, saving data and proceeding to step 3');
        saveStep2Data();
        loadStep(3);
      } else {
	Logger.debug('🎯 initStep2: Validation failed, staying on step 2');
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
 * Load saved team data from sessionStorage
 */
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
 * Initialize Step 3 - Race Day Arrangement
 */
async function initStep3() {
	Logger.debug('🎯 initStep3: Starting race day arrangements step');
  
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
	Logger.debug('🎯 createRaceDayForm: Loading race day items from database');
    
    // Load race day items from database
    const { data: raceDayItems, error } = await sb
      .from('v_race_day_items_public')
      .select('*')
      .eq('event_short_ref', 'TN2025')
      .order('sort_order');
    
    if (error) {
	Logger.error('🎯 createRaceDayForm: Database error:', error);
      throw error;
    }
    
	Logger.debug('🎯 createRaceDayForm: Loaded', raceDayItems?.length || 0, 'race day items');
    
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
                         class="qty-input" />
                </div>
              </div>
            `;}).join('')}
          </div>
        `).join('')}
        
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
  // Back button
  const backBtn = document.getElementById('backToStep2');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
	Logger.debug('🎯 initStep3: Back button clicked, going to step 2');
      clearStepDataFromHere(2); // Clear step 2 and all after
      loadStep(2);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextToStep4');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
	Logger.debug('🎯 initStep3: Next button clicked, validating step 3');
      
      if (validateStep3()) {
	Logger.debug('🎯 initStep3: Validation passed, saving data and proceeding to step 4');
        saveStep3Data();
        loadStep(4);
      } else {
	Logger.debug('🎯 initStep3: Validation failed, staying on step 3');
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
 * Initialize Step 4 - Practice Booking
 * This is the main practice functionality
 */
function initStep4() {
	Logger.debug('🎯 initStep4: Starting step 4 initialization');
  const startTime = performance.now();
  
  // Initialize practice configuration
	Logger.debug('🎯 initStep4: Initializing practice configuration');
  initPracticeConfig();
  
  // Confirm the cloned DOM contains #calendarContainer
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) {
	Logger.error('🎯 initStep4: #calendarContainer not found after mount');
    return;
  }
	Logger.debug('🎯 initStep4: #calendarContainer found, proceeding with calendar init');
  
  // Set up calendar container
  initCalendarContainer();
  
  // Populate slot preference selects
	Logger.debug('🎯 initStep4: Populating slot preferences');
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
	Logger.debug(`🎯 initStep4: Completed in ${(endTime - startTime).toFixed(2)}ms`);
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
 * Initialize calendar container
 * Creates a functional practice calendar for TN wizard
 */
function initCalendarContainer() {
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
  
  // Legacy vs fallback
  const hasLegacy = typeof window.initCalendar === 'function';
	Logger.debug('TN: calendar init path', { hasLegacy });
  
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
  
  // Default to current year if no dates in config
  const currentYear = new Date().getFullYear();
  const start = startDate ? new Date(startDate) : new Date(currentYear, 0, 1);
  const end = endDate ? new Date(endDate) : new Date(currentYear, 11, 31);
  
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
        dayEl.innerHTML = createDayContent(day);
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
  const dateStr = day.date.toISOString().split('T')[0];
  const constraints = window.__PRACTICE_CONSTRAINTS || {};
  
  // Check if date is within practice window
  const isWithinWindow = !constraints.startDate || !constraints.endDate || 
    (day.date >= new Date(constraints.startDate) && day.date <= new Date(constraints.endDate));
  
  // Check if date is on allowed weekday
  const dayOfWeek = day.date.getDay(); // 0=Sunday, 1=Monday, etc.
  const isAllowedWeekday = constraints.allowedWeekdays && constraints.allowedWeekdays.includes(dayOfWeek);
  
  const isDisabled = !isWithinWindow || !isAllowedWeekday;
  
  // Get translated strings for dropdowns
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  
  const html = `
    <label class="day-checkbox">
      <input type="checkbox" data-date="${dateStr}" ${isDisabled ? 'disabled' : ''} />
      <span class="day-number">${day.day}</span>
    </label>
    <div class="dropdowns hide">
      <select class="duration">
        <option value="1" data-i18n="oneHour">${t('oneHour')}</option>
        <option value="2" data-i18n="twoHours">${t('twoHours')}</option>
      </select>
      <select class="helpers">
        <option value="NONE" data-i18n="helperNone">${t('helperNone')}</option>
        <option value="S" data-i18n="helperS">${t('helperS')}</option>
        <option value="T" data-i18n="helperT">${t('helperT')}</option>
        <option value="ST" data-i18n="helperST">${t('helperST')}</option>
      </select>
    </div>
  `;
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
    duration_hours: 1,
    helper: 'NONE'
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
    
    // Check for 'T' (Trainer) or 'ST' (both)
    if (helpersSelect.value === 'T' || helpersSelect.value === 'ST') {
      trainerCount++;
    }
    
    // Check for 'S' (Steersman) or 'ST' (both)
    if (helpersSelect.value === 'S' || helpersSelect.value === 'ST') {
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
      color: var(--theme-primary-dark, #c79100) !important;
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
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      border-bottom: 2px solid var(--theme-primary, #f7b500);
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
  const slots2h = practiceSlots.filter(slot => Number(slot.duration_hours) === 2);
  const slots1h = practiceSlots.filter(slot => Number(slot.duration_hours) === 1);
  
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
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  if (teamNames.length === 0) {
    teamSelect.innerHTML = `<option disabled data-i18n="noTeams">${t('noTeams')}</option>`;
    teamNameFields.textContent = '';
  } else {
    teamNames.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index;
      // Use teamLabel translation with team number
      const teamNum = index + 1;
      option.textContent = `${t('teamLabel', { num: teamNum })}: ${name}`;
      teamSelect.appendChild(option);
    });
    
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
    setCurrentTeamKey(teamKey);
    updateCalendarForTeam(selectedIndex);
    updateSlotPreferencesForTeam(selectedIndex);
    updatePracticeSummary(); // Update the practice summary box when switching teams
    
    const tChange = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    const teamName = teamNames[selectedIndex] || tChange('teamLabel', { num: selectedIndex + 1 });
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
  
  sessionStorage.setItem('tn_team_name_1', uniqueTeamName);
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
  
  // Step 4: Fill practice data for team 1 with 12 hours minimum (weekdays after 10/27/2025)
  const practiceRows = [
    { pref_date: '2025-10-29', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2025-10-31', duration_hours: 2, helper: 'T' }, // Friday - 2hr
    { pref_date: '2025-11-03', duration_hours: 2, helper: 'S' }, // Monday - 2hr
    { pref_date: '2025-11-05', duration_hours: 2, helper: 'ST' }, // Wednesday - 2hr
    { pref_date: '2025-11-07', duration_hours: 2, helper: 'S' }, // Friday - 2hr
    { pref_date: '2025-11-10', duration_hours: 2, helper: 'T' }  // Monday - 2hr (Total: 12hrs)
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
  
  // Step 4: Fill practice data for all teams with 12 hours minimum (weekdays after 10/27/2025)
  const practiceRows = [
    { pref_date: '2025-10-29', duration_hours: 2, helper: 'S' }, // Wednesday - 2hr
    { pref_date: '2025-10-31', duration_hours: 2, helper: 'T' }, // Friday - 2hr
    { pref_date: '2025-11-03', duration_hours: 2, helper: 'S' }, // Monday - 2hr
    { pref_date: '2025-11-05', duration_hours: 2, helper: 'ST' }, // Wednesday - 2hr
    { pref_date: '2025-11-07', duration_hours: 2, helper: 'S' }, // Friday - 2hr
    { pref_date: '2025-11-10', duration_hours: 2, helper: 'T' }  // Monday - 2hr (Total: 12hrs)
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
      team1: sessionStorage.getItem('tn_team_name_1'),
      team2: sessionStorage.getItem('tn_team_name_2'),
      team3: sessionStorage.getItem('tn_team_name_3')
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
    
	Logger.debug('📝 Team name generated:', sessionStorage.getItem('tn_team_name_1'));
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
    const opt1Count = teams.filter(t => t.option === 'opt1').length; // Calculate from actual teams
    const opt2Count = teams.filter(t => t.option === 'opt2').length; // Calculate from actual teams
    
    // Generate unique team names to avoid duplicate key errors
    const uniqueTeamNames = teams.map((t, idx) => 
      t.name.startsWith('Test Team') ? `Test Team ${Date.now()}_${idx}` : t.name
    );
    
	Logger.debug('🎯 Generated unique team names:', uniqueTeamNames);
    
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
  sessionStorage.setItem('tn_season', '2025');
  
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
  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
	Logger.debug('🎯 initStep4: Back button clicked, going to step 3');
      clearStepDataFromHere(3); // Clear step 3 and all after
      loadStep(3);
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
	Logger.debug('🎯 initStep4: Next button clicked, validating step 4');
      
      if (validateStep4()) {
	Logger.debug('🎯 initStep4: Validation passed, saving data and proceeding to step 5');
        saveStep4Data();
        loadStep(5);
      } else {
	Logger.debug('🎯 initStep4: Validation failed, staying on step 4');
      }
    });
  }
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
	Logger.debug('🎯 handleCopyFromTeam1: Copy button clicked!');
  
  const currentTeamIndex = getCurrentTeamIndex();
	Logger.debug(`🎯 handleCopyFromTeam1: Current team index: ${currentTeamIndex}`);
  
  if (currentTeamIndex === 0) {
	Logger.debug('🎯 handleCopyFromTeam1: Already on Team 1, nothing to copy');
    return;
  }
  
	Logger.debug(`🎯 handleCopyFromTeam1: Copying Team 1 data to Team ${currentTeamIndex + 1}`);
  
  const currentIdx = getCurrentTeamIndex(); // 0-based
  const fromKey = 't1';
  const toKey = `t${currentIdx + 1}`;
  const srcRows  = readTeamRows(fromKey) || [];
  const srcRanks = readTeamRanks?.(fromKey) || [];
  writeTeamRows(toKey, srcRows.slice());
  writeTeamRanks?.(toKey, srcRanks.slice(0,3));
  updateCalendarForTeam(currentIdx);
  updateSlotPreferencesForTeam(currentIdx);
  updatePracticeSummary(); // Update the practice summary box
	Logger.debug(`🎯 Copied ${srcRows.length} rows & ${srcRanks.length||0} ranks from ${fromKey} → ${toKey}`);
  
	Logger.debug(`🎯 handleCopyFromTeam1: Copied Team 1 data to Team ${currentTeamIndex + 1}`);
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
	Logger.debug(`🎯 saveCurrentTeamPracticeData: Saved ${rows.length} rows for ${currentTeamKey}`);
}

/**
 * Validate practice requirements
 * Returns error message if validation fails, null if valid
 */
function validatePracticeRequired() {
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  const errors = [];
  
  for (let i = 0; i < teamCount; i++) {
    const teamNum = i + 1;
    const key = `t${teamNum}`;
    const teamName = sessionStorage.getItem(`tn_team_name_${teamNum}`) || `Team ${teamNum}`;
    
    const rows = readTeamRows(key) || [];
    const ranks = readTeamRanks(key) || [];
    const teamErrors = [];
    
    // Check that team has at least one practice date
    if (rows.length === 0) {
      teamErrors.push('Missing practice dates');
    }
    
    // Check that team has at least one slot preference
    if (ranks.length === 0) {
      teamErrors.push('Missing slot preferences');
    }
    
    // Calculate total hours for this team
    let totalHours = 0;
    for (const r of rows) {
      totalHours += Number(r.duration_hours) || 0;
    }
    
    // Check minimum 12 hours requirement
    if (totalHours < 12) {
      const tVal = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
      teamErrors.push(tVal('practiceHoursMinimum', { hours: totalHours, min: 12 }));
    }
    
    // Validate each practice row has complete data
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      if (!r.pref_date) {
        teamErrors.push(`Date ${j + 1}: Missing date selection`);
      }
      if (![1, 2].includes(Number(r.duration_hours))) {
        teamErrors.push(`Date ${j + 1}: Duration must be 1h or 2h`);
      }
      if (!['NONE', 'S', 'T', 'ST'].includes(r.helper)) {
        teamErrors.push(`Date ${j + 1}: Helper selection required`);
      }
    }
    
    // If team has errors, add to main error list
    if (teamErrors.length > 0) {
      errors.push(`\n📌 ${teamName}:\n   • ${teamErrors.join('\n   • ')}`);
    }
  }
  
  // Return formatted error message if there are errors
  if (errors.length > 0) {
    return `Practice booking incomplete for the following teams:\n${errors.join('\n')}`;
  }
  
  return null;
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
      updatePracticeSummary(); // Update summary box immediately
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
      
      // Look for duration and helper selects within the same date container
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
    
	Logger.debug('🎯 clearCalendarSelections: Cleared calendar selections');
  }
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
  
  // Set helper dropdown
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
  // Load and display summary data
  loadSummaryData();
}

/**
 * Load summary data from sessionStorage
 */
function loadSummaryData() {
	Logger.debug('🎯 loadSummaryData: Starting summary data load');
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
    
	Logger.debug('🎯 loadRaceDaySummary: Display values:', {
    marqueeQty, steerWith, steerWithout, junkBoat, speedBoat
  });
  
  if (sumMarquee) sumMarquee.textContent = marqueeQty;
  if (sumSteerWith) sumSteerWith.textContent = steerWith;
  if (sumSteerWithout) sumSteerWithout.textContent = steerWithout;
  if (sumJunk) sumJunk.textContent = junkBoat;
  if (sumSpeed) sumSpeed.textContent = speedBoat;
  
	Logger.debug('🎯 loadRaceDaySummary: Summary elements updated');
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
    // XSS FIX: Escape user input (team.teamName) before inserting into HTML
    // team.teamName comes from sessionStorage (user input), so it must be escaped
    const safeTeamName = SafeDOM.escapeHtml(team.teamName);
    html += `<div class="team-practice-section" style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 6px;">`;
    html += `<h4 style="margin: 0 0 0.5rem 0; color: #0f6ec7;">${safeTeamName}</h4>`;
    
    // Practice dates
    if (team.practiceRows.length > 0) {
      html += `<div style="margin-bottom: 0.5rem;">`;
      html += `<strong>Practice Dates:</strong><br>`;
      team.practiceRows.forEach(row => {
        const date = new Date(row.pref_date).toLocaleDateString();
        const duration = row.duration_hours;
        const helper = row.helper;
        // XSS FIX: Escape helper value (could be user-selected)
        const safeHelper = SafeDOM.escapeHtml(helper);
        html += `<span style="margin-right: 1rem;">• ${date} (${duration}h, ${safeHelper})</span>`;
      });
      html += `</div>`;
    }
    
    // Slot preferences
    if (team.slotRanks.length > 0) {
      html += `<div>`;
      html += `<strong>Slot Preferences:</strong><br>`;
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
 * Set up step navigation
 */
function setupStepNavigation() {
  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', async () => {
      if (currentStep > 1) {
        const targetStep = currentStep - 1;
        clearStepDataFromHere(targetStep); // Clear target step and all after
        await loadStep(targetStep);
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
  const manager1PhoneError = document.getElementById('manager1PhoneError');
  const manager1EmailError = document.getElementById('manager1EmailError');
  
  if (!manager1Name?.value?.trim()) {
    missingFields.push('Team Manager 1 name');
    highlightField(manager1Name);
  }
  
  if (!manager1Phone?.value?.trim()) {
    missingFields.push('Team Manager 1 phone');
    highlightField(manager1Phone);
  } else if (!isValidHKPhone(manager1Phone.value.trim())) {
    missingFields.push('Team Manager 1 phone (must be 8 digits)');
    highlightField(manager1Phone);
    if (manager1PhoneError) {
      manager1PhoneError.textContent = 'Please enter an 8-digit Hong Kong phone number.';
      manager1PhoneError.style.display = 'block';
    }
  }
  
  if (!manager1Email?.value?.trim()) {
    missingFields.push('Team Manager 1 email');
    highlightField(manager1Email);
  } else if (!isValidEmail(manager1Email.value.trim())) {
    missingFields.push('Team Manager 1 email (invalid format)');
    highlightField(manager1Email);
    if (manager1EmailError) {
      manager1EmailError.textContent = 'Please enter a valid email address.';
      manager1EmailError.style.display = 'block';
    }
  }
  
  // Validate Team Manager 2 (Required)
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  const manager2PhoneError = document.getElementById('manager2PhoneError');
  const manager2EmailError = document.getElementById('manager2EmailError');
  
  if (!manager2Name?.value?.trim()) {
    missingFields.push('Team Manager 2 name');
    highlightField(manager2Name);
  }
  
  if (!manager2Phone?.value?.trim()) {
    missingFields.push('Team Manager 2 phone');
    highlightField(manager2Phone);
  } else if (!isValidHKPhone(manager2Phone.value.trim())) {
    missingFields.push('Team Manager 2 phone (must be 8 digits)');
    highlightField(manager2Phone);
    if (manager2PhoneError) {
      manager2PhoneError.textContent = 'Please enter an 8-digit Hong Kong phone number.';
      manager2PhoneError.style.display = 'block';
    }
  }
  
  if (!manager2Email?.value?.trim()) {
    missingFields.push('Team Manager 2 email');
    highlightField(manager2Email);
  } else if (!isValidEmail(manager2Email.value.trim())) {
    missingFields.push('Team Manager 2 email (invalid format)');
    highlightField(manager2Email);
    if (manager2EmailError) {
      manager2EmailError.textContent = 'Please enter a valid email address.';
      manager2EmailError.style.display = 'block';
    }
  }
  
  // Validate Team Manager 3 (Optional, but if provided must be valid)
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  const manager3PhoneError = document.getElementById('manager3PhoneError');
  const manager3EmailError = document.getElementById('manager3EmailError');
  
  // If Manager 3 name is provided, phone and email should also be provided
  if (manager3Name?.value?.trim()) {
    if (!manager3Phone?.value?.trim()) {
      missingFields.push('Team Manager 3 phone (name provided)');
      highlightField(manager3Phone);
    } else if (!isValidHKPhone(manager3Phone.value.trim())) {
      missingFields.push('Team Manager 3 phone (must be 8 digits)');
      highlightField(manager3Phone);
      if (manager3PhoneError) {
        manager3PhoneError.textContent = 'Please enter an 8-digit Hong Kong phone number.';
        manager3PhoneError.style.display = 'block';
      }
    }
    
    if (!manager3Email?.value?.trim()) {
      missingFields.push('Team Manager 3 email (name provided)');
      highlightField(manager3Email);
    } else if (!isValidEmail(manager3Email.value.trim())) {
      missingFields.push('Team Manager 3 email (invalid format)');
      highlightField(manager3Email);
      if (manager3EmailError) {
        manager3EmailError.textContent = 'Please enter a valid email address.';
        manager3EmailError.style.display = 'block';
      }
    }
  } else if (manager3Phone?.value?.trim() || manager3Email?.value?.trim()) {
    // If phone or email is provided, name should also be provided
    if (!manager3Name?.value?.trim()) {
      missingFields.push('Team Manager 3 name (contact info provided)');
      highlightField(manager3Name);
    }
    
    // Validate phone if provided
    if (manager3Phone?.value?.trim() && !isValidHKPhone(manager3Phone.value.trim())) {
      missingFields.push('Team Manager 3 phone (must be 8 digits)');
      highlightField(manager3Phone);
      if (manager3PhoneError) {
        manager3PhoneError.textContent = 'Please enter an 8-digit Hong Kong phone number.';
        manager3PhoneError.style.display = 'block';
      }
    }
    
    // Validate email if provided
    if (manager3Email?.value?.trim() && !isValidEmail(manager3Email.value.trim())) {
      missingFields.push('Team Manager 3 email (invalid format)');
      highlightField(manager3Email);
      if (manager3EmailError) {
        manager3EmailError.textContent = 'Please enter a valid email address.';
        manager3EmailError.style.display = 'block';
      }
    }
  }
  
  // Team Manager 3 is optional, no further validation needed
  
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
	Logger.debug('🎯 validateStep4: Practice validation failed:', practiceError);
    showError(practiceError);
    return false;
  }
  
  // Clear any previous errors
  hideError();
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
  const raceDayData = {};
  
  // Get all quantity inputs and save their values
  const qtyInputs = document.querySelectorAll('.qty-input');
  
  qtyInputs.forEach(input => {
    const value = parseInt(input.value, 10) || 0;
    raceDayData[input.id] = value;
  });
  
  // Save to sessionStorage
  sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
  
	Logger.debug('🎯 saveStep3Data: Race day data saved:', raceDayData);
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
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i+1}`);
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i+1}`);
    const teamCategory = sessionStorage.getItem(`tn_team_category_${i+1}`);
    const teamOption = sessionStorage.getItem(`tn_team_option_${i+1}`);
    
    if (teamNameEn) {
      teams.push({
        name: teamNameEn, // Keep 'name' for backward compatibility, but it's now name_en
        name_en: teamNameEn,
        name_tc: teamNameTc || '',
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
      team_names: teams.map(t => t.name_en || t.name), // Backward compatibility
      team_names_en: teams.map(t => t.name_en || t.name),
      team_names_tc: teams.map(t => t.name_tc || ''),
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
        showError('Submission timed out. Please try again or contact support if the issue persists.');
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
	Logger.debug('✅ Form submission successful!', data);
      const { registration_ids, team_codes } = data;
      
      // Create receipt with the first registration_id (for compatibility)
      const receipt = saveReceipt({ 
        registration_id: registration_ids?.[0], 
        team_codes, 
        email: contact.email 
      });
      
      // Hide loading and redirect to success page
      hideLoadingIndicator();
      redirectToSuccessPage(receipt);
    } else {
	Logger.debug('⚠️ No data in response, but no error either');
      hideLoadingIndicator();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
      }
      showError('No response received from server. Please try again.');
    }
    
  } catch (error) {
	Logger.error('Submission error:', error);
    hideLoadingIndicator();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
    showError('Submission failed. Please try again.');
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
 * Redirect to success page with auto-redirect to event selection
 */
function redirectToSuccessPage(receipt) {
  // Store receipt data for success page
  sessionStorage.setItem('success_receipt', JSON.stringify(receipt));
  
  // Redirect to success page
  window.location.href = '/register.html?success=true';
}

/**
 * Show error message
 */
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

/**
 * Hide error message
 */
function hideError() {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';
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
    sessionStorage.setItem('tn_team_name_1', 'Test Team 1');
    sessionStorage.setItem('tn_team_category_1', 'mixed_open');
    sessionStorage.setItem('tn_team_option_1', 'opt1');
    sessionStorage.setItem('tn_team_name_2', 'Test Team 2');
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
