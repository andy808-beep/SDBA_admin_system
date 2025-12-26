/**
 * WU/SC Multi-Step Wizard Implementation
 * Based on TN wizard but with custom Step 1 for boat type/division selection
 */

import { sb } from '../supabase_config.js';
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
import Logger from './logger.js';
import { fetchWithErrorHandling } from './api-client.js';

// WU/SC Wizard State
let currentStep = 0; // Start at step 0 (Race Info)
let totalSteps = 4; // Step 1: Team Details, Step 2: Team Info, Step 3: Race Day, Step 4: Summary
let wuScScope = null;
let wizardMount = null;
let stepper = null;
let eventType = null; // 'wu' or 'sc'

/**
 * Get event short ref for auto-save
 * Returns full event short ref like 'WU2026' or 'SC2026'
 */
function getWUSCEventShortRef() {
  // eventType is 'wu' or 'sc' (lowercase, extracted from eventShortRef)
  // Construct full ref for auto-save
  if (eventType) {
    return eventType.toUpperCase() + '2026';
  }
  // Fallback to config or imported function
  const cfg = window.__CONFIG;
  const eventRef = cfg?.event?.event_short_ref || cfg?.event?.short_ref || getEventShortRef();
  return eventRef || 'WU2026';
}

/**
 * Initialize WU/SC wizard
 */
export async function initWUSCWizard(eventShortRef) {
	Logger.debug('🎯 initWUSCWizard called with:', eventShortRef);
  console.log('🎯 Initializing WU/SC Wizard with auto-save');
  
  // eventShortRef is like 'WU2026' or 'SC2026'
  // Extract just the type part ('wu' or 'sc') for sessionStorage keys
  eventType = eventShortRef ? eventShortRef.substring(0, 2).toLowerCase() : 'wu';
  wuScScope = document.getElementById('wuScContainer');
  wizardMount = document.getElementById('wuScWizardMount');
  
  if (!wuScScope || !wizardMount) {
	Logger.error('WU/SC wizard containers not found');
    return;
  }
  
  // Check if config is valid (has packages and divisions)
  const cfg = window.__CONFIG;
  const hasPackages = cfg?.packages && cfg.packages.length > 0;
  const hasDivisions = cfg?.divisions && cfg.divisions.length > 0;
  
	Logger.debug('Config check:', {
    hasConfig: !!cfg,
    hasPackages,
    packagesCount: cfg?.packages?.length || 0,
    hasDivisions,
    divisionsCount: cfg?.divisions?.length || 0
  });
  
  if (!cfg || !hasPackages || !hasDivisions) {
	Logger.warn('Config is missing packages or divisions, forcing refresh...');
    // Force refresh config without cache
    try {
      const { loadEventConfig, clearConfigCache } = await import('./config_loader.js');
      // Clear cache first to ensure fresh data
      clearConfigCache(eventShortRef);
	Logger.debug('Cache cleared, fetching fresh config...');
      const refreshedConfig = await loadEventConfig(eventShortRef, { useCache: false });
	Logger.debug('✅ Config refreshed successfully', {
        packagesCount: refreshedConfig?.packages?.length || 0,
        divisionsCount: refreshedConfig?.divisions?.length || 0,
        packages: refreshedConfig?.packages,
        divisions: refreshedConfig?.divisions
      });
      
      // Update global config
      window.__CONFIG = refreshedConfig;
    } catch (error) {
	Logger.error('Failed to refresh config:', error);
      // Continue anyway - error will be shown in Step 1
    }
  }
  
  // Show WU/SC container
  wuScScope.hidden = false;
  
  // Initialize stepper (will be hidden for step 0)
  initStepper();
  
  // Auto-save integration
  // Use the eventShortRef parameter directly (e.g., 'WU2026' or 'SC2026')
  const eventRef = eventShortRef || getWUSCEventShortRef();
  
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
    
    // Mark dirty on any input change within WU/SC scope
    document.addEventListener('input', (e) => {
      if (e.target.closest('#wuScContainer') && e.target.matches('input, select, textarea')) {
        AutoSave.markDirty();
      }
    });
    
    document.addEventListener('change', (e) => {
      if (e.target.closest('#wuScContainer') && e.target.matches('input[type="radio"], input[type="checkbox"]')) {
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
  
  // Set up debug functions
  setupDebugFunctions();
  
  // Listen for language changes to re-render entire current step
  window.addEventListener('languageChanged', () => {
    Logger.debug('WU/SC Wizard: Language changed, re-rendering current step');
    initStepper();
    updateStepper();
    // Re-render the current step content with new language
    loadStepContent(currentStep);
  });
  
	Logger.debug('✅ WU/SC wizard initialized');
}

/**
 * Set up debug functions for testing (dev only)
 */
function setupDebugFunctions() {
  if (!window.__DEV__) return;
  
	Logger.debug('🎯 Setting up WU/SC debug functions');
  
  window.__DBG_WUSC = {
    fillStep1: fillStep1TestData,
    fillStep2: fillStep2TestData,
    fillStep3: fillStep3TestData,
    fillAll: fillAllTestData,
    goToStep: loadStep
  };
  
  // Also expose directly on window
  window.fillWUSCStep1 = fillStep1TestData;
  window.fillWUSCStep2 = fillStep2TestData;
  window.fillWUSCStep3 = fillStep3TestData;
  window.fillWUSCAll = fillAllTestData;
  
	Logger.debug('🎯 Debug functions available:');
	Logger.debug('  - fillWUSCStep1() - Fill Step 1 with 3 teams (1 SB, 2 STD)');
	Logger.debug('  - fillWUSCStep2() - Fill Step 2 with org and manager data');
	Logger.debug('  - fillWUSCStep3() - Fill Step 3 with race day data');
	Logger.debug('  - fillWUSCAll() - Fill all steps and navigate to Step 3');
}

/**
 * Fill Step 1 with test data: 3 teams (1 Small Boat, 2 Standard Boats)
 */
async function fillStep1TestData() {
	Logger.debug('🎯 Filling Step 1 with test data...');
  
  // Fill team count
  const teamCountSelect = document.getElementById('teamCount');
  if (teamCountSelect) {
    teamCountSelect.value = '3';
    teamCountSelect.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Wait for teams to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fill Team 1 - Small Boat
    const team1NameEn = document.getElementById('teamNameEn1');
    if (team1NameEn) team1NameEn.value = 'Test Team 1 - Small Boat';
    
    const team1SmallBoat = document.querySelector('input[name="boatType1"][value="Small Boat"]');
    if (team1SmallBoat) {
      team1SmallBoat.checked = true;
      team1SmallBoat.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const team1Division = document.querySelector('input[name="division1"]');
      if (team1Division) {
        team1Division.checked = true;
      }
    }
    
    // Fill Team 2 - Standard Boat
    const team2NameEn = document.getElementById('teamNameEn2');
    if (team2NameEn) team2NameEn.value = 'Test Team 2 - Standard Boat';
    
    const team2StandardBoat = document.querySelector('input[name="boatType2"][value="Standard Boat"]');
    if (team2StandardBoat) {
      team2StandardBoat.checked = true;
      team2StandardBoat.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const team2Division = document.querySelector('input[name="division2"]');
      if (team2Division) {
        team2Division.checked = true;
      }
    }
    
    // Fill Team 3 - Standard Boat
    const team3NameEn = document.getElementById('teamNameEn3');
    if (team3NameEn) team3NameEn.value = 'Test Team 3 - Standard Boat';
    
    const team3StandardBoat = document.querySelector('input[name="boatType3"][value="Standard Boat"]');
    if (team3StandardBoat) {
      team3StandardBoat.checked = true;
      team3StandardBoat.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const team3Division = document.querySelector('input[name="division3"]');
      if (team3Division) {
        team3Division.checked = true;
      }
    }
    
	Logger.debug('✅ Step 1 filled with test data');
  }
}

/**
 * Fill Step 2 with test data
 */
function fillStep2TestData() {
	Logger.debug('🎯 Filling Step 2 with test data...');
  
  const orgName = document.getElementById('orgName');
  if (orgName) orgName.value = 'Test Organization Ltd';
  
  const mailingAddress = document.getElementById('mailingAddress');
  if (mailingAddress) mailingAddress.value = '123 Test Street\nCentral\nHong Kong';
  
  // Manager 1
  const manager1Name = document.getElementById('manager1Name');
  if (manager1Name) manager1Name.value = 'John Doe';
  
  const manager1Phone = document.getElementById('manager1Phone');
  if (manager1Phone) manager1Phone.value = '91234567';  // 8 digits only (no +852 prefix)
  
  const manager1Email = document.getElementById('manager1Email');
  if (manager1Email) manager1Email.value = 'john@test.com';
  
  // Manager 2
  const manager2Name = document.getElementById('manager2Name');
  if (manager2Name) manager2Name.value = 'Jane Smith';
  
  const manager2Phone = document.getElementById('manager2Phone');
  if (manager2Phone) manager2Phone.value = '92345678';  // 8 digits only (no +852 prefix)
  
  const manager2Email = document.getElementById('manager2Email');
  if (manager2Email) manager2Email.value = 'jane@test.com';
  
  // Manager 3 (Optional)
  const manager3Name = document.getElementById('manager3Name');
  if (manager3Name) manager3Name.value = 'Bob Wilson';
  
  const manager3Phone = document.getElementById('manager3Phone');
  if (manager3Phone) manager3Phone.value = '93456789';  // 8 digits only (no +852 prefix)
  
  const manager3Email = document.getElementById('manager3Email');
  if (manager3Email) manager3Email.value = 'bob@test.com';
  
	Logger.debug('✅ Step 2 filled with test data');
}

/**
 * Fill Step 3 with test data
 */
function fillStep3TestData() {
	Logger.debug('🎯 Filling Step 3 with test data...');
  
  const marqueeQty = document.getElementById('marqueeQty');
  if (marqueeQty) marqueeQty.value = '2';
  
  const steerWithQty = document.getElementById('steerWithQty');
  if (steerWithQty) steerWithQty.value = '3';
  
  const steerWithoutQty = document.getElementById('steerWithoutQty');
  if (steerWithoutQty) steerWithoutQty.value = '0';
  
  const junkBoatNo = document.getElementById('junkBoatNo');
  if (junkBoatNo) junkBoatNo.value = 'ABC123';
  
  const junkBoatQty = document.getElementById('junkBoatQty');
  if (junkBoatQty) junkBoatQty.value = '1';
  
  const speedBoatNo = document.getElementById('speedBoatNo');
  if (speedBoatNo) speedBoatNo.value = '';
  
  const speedboatQty = document.getElementById('speedboatQty');
  if (speedboatQty) speedboatQty.value = '0';
  
	Logger.debug('✅ Step 3 filled with test data');
}

/**
 * Fill all steps and navigate to Step 3
 */
async function fillAllTestData() {
	Logger.debug('🎯 Filling all steps with test data...');
  
  // Make sure we're on Step 1
  await loadStep(1);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Fill Step 1
  await fillStep1TestData();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Go to Step 2
  if (validateStep1()) {
    await loadStep(2);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Fill Step 2
    fillStep2TestData();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Validate Step 2 to save data to sessionStorage
    if (validateStep2()) {
      // Go to Step 3
      await loadStep(3);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fill Step 3
      fillStep3TestData();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Validate Step 3 to save data to sessionStorage
      validateStep3();
      
      // Go to Step 4 (Summary)
      await loadStep(4);
      
	Logger.debug('✅ All steps filled! You are now on Step 4 (Summary)');
    } else {
	Logger.error('❌ Step 2 validation failed');
    }
  } else {
	Logger.error('❌ Step 1 validation failed');
  }
}

/**
 * Initialize stepper navigation
 */
function initStepper() {
  // Get step labels from i18n (with fallbacks)
  const t = (key, fallback) => window.i18n ? window.i18n.t(key) : fallback;
  const step1 = t('wuScStep1', '1. Teams');
  const step2 = t('wuScStep2', '2. Team Information');
  const step3 = t('wuScStep3', '3. Race Day');
  const step4 = t('wuScStep4', '4. Summary');
  
  // For step 0 (Race Info), don't show stepper
  if (currentStep === 0) {
    wuScScope.innerHTML = '<div id="wuScWizardMount"></div>';
    wizardMount = document.getElementById('wuScWizardMount');
    stepper = null;
    return;
  }
  
  const stepperHTML = `
    <div class="stepper-container">
      <div class="stepper-steps">
        <div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1" data-i18n="wuScStep1">${step1}</div>
        <div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2" data-i18n="wuScStep2">${step2}</div>
        <div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3" data-i18n="wuScStep3">${step3}</div>
        <div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4" data-i18n="wuScStep4">${step4}</div>
      </div>
    </div>
  `;

  wuScScope.innerHTML = stepperHTML + '<div id="wuScWizardMount"></div>';
  wizardMount = document.getElementById('wuScWizardMount');
  stepper = wuScScope.querySelector('.stepper-steps');
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
  
  currentStep = step;
  
  // Reinitialize stepper (handles showing/hiding for step 0)
  if (step === 0) {
    initStepper();
  } else {
    // Update stepper
    updateStepper();
  }
  
  // Load step content
  await loadStepContent(step);
  
  // Save current step to sessionStorage
  sessionStorage.setItem(`${eventType}_current_step`, step.toString());
}

/**
 * Update stepper visual state
 */
function updateStepper() {
  if (!stepper) return;
  
  const steps = stepper.querySelectorAll('.step');
  steps.forEach((stepEl, index) => {
    const stepNum = index + 1;
    stepEl.classList.remove('active', 'completed');
    
    if (stepNum < currentStep) {
      stepEl.classList.add('completed');
    } else if (stepNum === currentStep) {
      stepEl.classList.add('active');
    }
  });
}

/**
 * Load step content from template
 */
async function loadStepContent(step) {
	Logger.debug(`loadStepContent: Loading step ${step}`);
  
  // Always get fresh reference to handle dynamic DOM changes (initStepper recreates DOM)
  // This ensures we always use the correct mount element even if DOM was recreated
  const mount = document.getElementById('wuScWizardMount');
  if (!mount) {
	Logger.error('loadStepContent: wuScWizardMount element not found in DOM', {
      wuScContainer: !!document.getElementById('wuScContainer'),
      wizardMount: !!document.getElementById('wizardMount'), // TN mount (should not be used)
      currentStep: step
    });
    return;
  }
  
  // Update module-scoped variable for consistency (used by other functions)
  wizardMount = mount;
  
  // Handle step 0 (Race Info) specially - no template, generated content
  if (step === 0) {
    mount.innerHTML = '';
    mount.appendChild(createRaceInfoContent());
    initStep0();
    // Update i18n translations
    if (window.i18n && typeof window.i18n.updateUI === 'function') {
      Logger.debug('loadStepContent: Updating i18n translations for step 0');
      window.i18n.updateUI();
    }
    return;
  }
  
  const templateId = `wu-sc-step-${step}`;
  const template = document.getElementById(templateId);
  
	Logger.debug(`loadStepContent: Template ${templateId} found:`, !!template);
  
  if (!template) {
	Logger.error(`Template not found: ${templateId}`);
    return;
  }
  
  // Clone template content
  const content = template.content.cloneNode(true);
  mount.innerHTML = '';
  mount.appendChild(content);
  
  // Initialize step-specific functionality
  switch (step) {
    case 1:
      initStep1();
      break;
    case 2:
      initStep2();
      break;
    case 3:
      initStep3();
      break;
    case 4:
      initStep4();
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
  
  // Determine theme colors based on event type
  const isWU = eventType === 'wu';
  const primaryColor = isWU ? '#0070c0' : '#00a651'; // WU blue or SC green
  const primaryDark = isWU ? '#005090' : '#007a3d';
  
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
      #wuScContainer .race-info-page {
        max-width: 800px;
        margin: 0 auto;
      }
      #wuScContainer .race-info-card {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      #wuScContainer .race-info-card h2 {
        color: ${primaryDark};
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        text-align: center;
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 0.75rem;
      }
      #wuScContainer .race-info-banner {
        margin-bottom: 2rem;
        border-radius: 8px;
        overflow: hidden;
      }
      #wuScContainer .banner-placeholder {
        background: linear-gradient(135deg, ${isWU ? '#e6f2ff' : '#e6f7ed'} 0%, ${primaryColor} 100%);
        height: 180px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: ${primaryDark};
        font-size: 1.1rem;
        gap: 0.5rem;
      }
      #wuScContainer .banner-placeholder span:first-child {
        font-size: 3rem;
      }
      #wuScContainer .race-info-details {
        margin-bottom: 2rem;
      }
      #wuScContainer .info-row {
        display: flex;
        padding: 0.875rem 0;
        border-bottom: 1px solid #eee;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      #wuScContainer .info-row:last-child {
        border-bottom: none;
      }
      #wuScContainer .info-label {
        font-weight: 600;
        color: ${primaryDark};
        min-width: 180px;
        flex-shrink: 0;
      }
      #wuScContainer .info-value {
        color: #333;
        flex: 1;
      }
      #wuScContainer .info-value.deadline {
        color: #dc3545;
        font-weight: 600;
      }
      #wuScContainer .appendix-row {
        padding-top: 1rem;
      }
      #wuScContainer .appendix-btn {
        background: ${primaryDark} !important;
        color: white !important;
        padding: 0.5rem 1.25rem !important;
        font-size: 0.95rem !important;
        text-decoration: none !important;
        display: inline-block !important;
        border-radius: 6px !important;
        border: none !important;
      }
      #wuScContainer .appendix-btn:hover {
        background: ${primaryColor} !important;
      }
      #wuScContainer .race-info-actions {
        text-align: center;
        padding-top: 1rem;
      }
      #wuScContainer #raceInfoNextBtn {
        background: ${primaryColor} !important;
        color: white !important;
        padding: 0.875rem 2.5rem !important;
        font-size: 1.1rem !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: 600 !important;
      }
      #wuScContainer #raceInfoNextBtn:hover {
        background: ${primaryDark} !important;
      }
      @media (max-width: 600px) {
        #wuScContainer .info-row {
          flex-direction: column;
          align-items: flex-start;
        }
        #wuScContainer .info-label {
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
          <span class="info-label" data-i18n="raceInfoEvent">${t('raceInfoEvent', 'Event')}:</span>
          <span class="info-value">${eventName}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoDate">${t('raceInfoDate', 'Date')}:</span>
          <span class="info-value">${eventDate}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoTime">${t('raceInfoTime', 'Time')}:</span>
          <span class="info-value">${eventTime}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoVenue">${t('raceInfoVenue', 'Venue')}:</span>
          <span class="info-value">${eventVenue}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoCourse">${t('raceInfoCourse', 'Race Course')}:</span>
          <span class="info-value">${raceCourse}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label" data-i18n="raceInfoDeadline">${t('raceInfoDeadline', 'Application Deadline')}:</span>
          <span class="info-value deadline">${deadline}</span>
        </div>
        
        <div class="info-row appendix-row">
          <span class="info-label" data-i18n="raceInfoAppendix">${t('raceInfoAppendix', 'Registration Appendix')}:</span>
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
      // Reinitialize stepper before going to step 1
      currentStep = 1;
      initStepper();
      loadStep(1);
    });
  }
}

/**
 * Initialize Step 1: Team Details (Boat Type + Division)
 */
function initStep1() {
	Logger.debug('🎯 initStep1: Initializing team details step');
  
  const teamCountSelect = document.getElementById('teamCount');
  const teamDetailsContainer = document.getElementById('teamDetailsContainer');
  const teamDetailsList = document.getElementById('teamDetailsList');
  
  if (!teamCountSelect || !teamDetailsContainer || !teamDetailsList) {
	Logger.error('Step 1 elements not found');
    return;
  }
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
  // Generate team count options (matching TN form implementation)
  const teamOptions = [];
  for (let i = 1; i <= 10; i++) {
    const label = i === 1 ? t('oneTeam', { count: i }) : t('nTeams', { count: i });
    // Fallback if translation key doesn't exist
    const displayLabel = (label === 'oneTeam' || label === 'nTeams') 
      ? `${i} team${i > 1 ? 's' : ''}`
      : label;
    teamOptions.push(`<option value="${i}">${displayLabel}</option>`);
  }
  
  // Populate dropdown options (insert after the placeholder option)
  const placeholderOption = teamCountSelect.querySelector('option[value=""]');
  if (placeholderOption) {
    placeholderOption.insertAdjacentHTML('afterend', teamOptions.join(''));
  } else {
    // If no placeholder, just add all options
    teamCountSelect.innerHTML = `<option value="" data-i18n="selectNumberOfTeams">${t('selectNumberOfTeams')}</option>${teamOptions.join('')}`;
  }
  
  // Handle team count change
  const handleTeamCountChange = async (e) => {
    const count = parseInt(e.target.value) || 0;
	Logger.debug('Team count changed to:', count);
    
    const step1Actions = document.getElementById('step1Actions');
    
    if (count > 0) {
      teamDetailsContainer.hidden = false;
      await renderTeamDetails(count);
      // Show next button after team details are rendered
      if (step1Actions) {
        step1Actions.style.display = 'block';
      }
    } else {
      teamDetailsContainer.hidden = true;
      teamDetailsList.innerHTML = '';
      // Hide next button when no team count selected
      if (step1Actions) {
        step1Actions.style.display = 'none';
      }
    }
  };
  
  teamCountSelect.addEventListener('change', handleTeamCountChange);
  
  // Restore team count from session storage if available (e.g., when navigating back)
  const savedTeamCount = sessionStorage.getItem(`${eventType}_team_count`);
  
  // Debug what we have
  console.log(`\n=== ${eventType.toUpperCase()} STEP 1: RESTORE ===`);
  if (window.FieldRestoreUtility) {
    FieldRestoreUtility.debugStorage(eventType + '_');
  }
  
  if (savedTeamCount) {
    const count = parseInt(savedTeamCount, 10);
    if (count > 0 && count <= 10) {
      teamCountSelect.value = count;
      // Trigger the change handler to render team details and show the button
      // Use setTimeout to ensure DOM is fully ready
      setTimeout(async () => {
        await handleTeamCountChange({ target: teamCountSelect });
        // Restore team details after fields are rendered (legacy for backward compatibility)
        setTimeout(() => {
          restoreTeamDetails();
        }, 150); // Wait for renderTeamDetails() to complete
        
        // Restore with FieldRestoreUtility after team fields are rendered
        setTimeout(() => {
          restoreWUSCStep1Teams(count);
        }, 300);
      }, 0);
    }
  }
}

/**
 * Render team details for the specified count
 */
async function renderTeamDetails(count) {
  const teamDetailsList = document.getElementById('teamDetailsList');
  if (!teamDetailsList) {
	Logger.error('renderTeamDetails: teamDetailsList not found');
    return;
  }
  
  teamDetailsList.innerHTML = '';
  
  // Load configuration - wait for it if not ready
  let cfg = window.__CONFIG;
  if (!cfg) {
	Logger.warn('Configuration not immediately available, waiting...');
    // Wait a bit for config to load (config should be loaded before wizard init, but just in case)
    await new Promise(resolve => setTimeout(resolve, 100));
    cfg = window.__CONFIG;
  }
  
  if (!cfg) {
	Logger.error('Configuration not loaded after waiting. Config object:', window.__CONFIG);
    const errorMsg = document.createElement('div');
    errorMsg.className = 'msg error';
    const tErr = (key) => window.i18n ? window.i18n.t(key) : key;
    errorMsg.textContent = tErr('configNotLoaded');
    teamDetailsList.appendChild(errorMsg);
    return;
  }
  
	Logger.debug('renderTeamDetails: Config loaded', {
    hasPackages: !!cfg.packages,
    packagesCount: cfg.packages?.length || 0,
    hasDivisions: !!cfg.divisions,
    divisionsCount: cfg.divisions?.length || 0
  });
  
  // Show warning if packages are missing, but still render the form
  if (!cfg.packages || cfg.packages.length === 0) {
	Logger.error('No packages found in config', cfg);
    const warningMsg = document.createElement('div');
    warningMsg.className = 'msg error';
    warningMsg.style.marginBottom = '1rem';
    
    const tWarn = (key) => window.i18n ? window.i18n.t(key) : key;
    const strong = document.createElement('strong');
    strong.textContent = tWarn('noBoatTypesConfigured');
    warningMsg.appendChild(strong);
    
    const br1 = document.createElement('br');
    warningMsg.appendChild(br1);
    
    const text = document.createTextNode(tWarn('pleaseContactAdmin'));
    warningMsg.appendChild(text);
    
    const br2 = document.createElement('br');
    warningMsg.appendChild(br2);
    
    const clearBtn = document.createElement('button');
    const tClear = (key) => window.i18n ? window.i18n.t(key) : key;
    clearBtn.textContent = tClear('clearCacheReload');
    clearBtn.style.marginTop = '0.5rem';
    clearBtn.style.padding = '0.5rem 1rem';
    clearBtn.style.background = '#007bff';
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.onclick = function() {
      localStorage.removeItem('raceApp:config:WU2026');
      localStorage.removeItem('raceApp:config:SC2026');
      location.reload();
    };
    warningMsg.appendChild(clearBtn);
    
    teamDetailsList.appendChild(warningMsg);
    // Don't return - continue to render form fields so user can at least see the structure
  }
  
  // Get translated strings
  const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
  
	Logger.debug(`renderTeamDetails: Rendering ${count} team(s)`);
  for (let i = 1; i <= count; i++) {
	Logger.debug(`renderTeamDetails: Creating form for team ${i}`);
    const teamDiv = document.createElement('div');
    teamDiv.className = 'entry-option';
    teamDiv.innerHTML = `
      <strong data-i18n="teamLabel" data-i18n-params='{"num":"${i}"}'>${t('teamLabel', { num: i })}</strong>
      <div class="form-group">
        <label for="teamNameEn${i}" data-i18n="teamNameEnLabel">${t('teamNameEnLabel')}</label>
        <input type="text" id="teamNameEn${i}" name="teamNameEn${i}" required placeholder="${t('teamNameEnPlaceholder')}" data-i18n-placeholder="teamNameEnPlaceholder" />
        <div class="field-error-message" id="error-teamNameEn${i}"></div>
      </div>
      <div class="form-group">
        <label for="teamNameTc${i}" data-i18n="teamNameTcLabel">${t('teamNameTcLabel')}</label>
        <input type="text" id="teamNameTc${i}" name="teamNameTc${i}" placeholder="${t('teamNameTcPlaceholder')}" data-i18n-placeholder="teamNameTcPlaceholder" />
      </div>
      <div class="form-group">
        <label style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;" data-i18n="divisionLabel">${t('divisionLabel')}</label>
        <div id="boatTypeContainer${i}">
          <div id="boatType${i}" class="radio-group"></div>
          <div class="form-group" id="entryGroupContainer${i}" style="margin-left: 1.5rem; padding-left: 1rem; border-left: 3px solid #e0e0e0; margin-top: 0.25rem; max-width: calc(100% - 1.5rem); box-sizing: border-box; overflow: hidden;" hidden>
            <label style="font-weight: normal; font-size: 0.95em; color: #555;" data-i18n="entryGroupLabel">${t('entryGroupLabel')}</label>
            <div id="division${i}" class="radio-group"></div>
          </div>
        </div>
        <div class="field-error-message" id="error-boatType${i}"></div>
        <div class="field-error-message" id="error-division${i}"></div>
      </div>
    `;
    
    teamDetailsList.appendChild(teamDiv);
	Logger.debug(`renderTeamDetails: Team ${i} form appended to DOM`);
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Load boat types and divisions (these may fail if config is empty, but form fields are already rendered)
    try {
      await loadBoatTypesForTeam(i, cfg);
      await loadDivisionsForTeam(i, cfg);
    } catch (error) {
	Logger.error(`renderTeamDetails: Error loading boat types/divisions for team ${i}:`, error);
      // Continue anyway - form fields are already rendered
    }
  }
  
	Logger.debug(`renderTeamDetails: Completed rendering ${count} team(s)`);
}

/**
 * Restore saved team details from sessionStorage
 */
function restoreTeamDetails() {
  const count = parseInt(sessionStorage.getItem(`${eventType}_team_count`), 10);
  if (!count || count < 1) return;
  
	Logger.debug(`🎯 restoreTeamDetails: Restoring data for ${count} team(s)`);
  
  for (let i = 1; i <= count; i++) {
    // Restore team names
    const nameEn = sessionStorage.getItem(`${eventType}_team${i}_name_en`);
    const nameTc = sessionStorage.getItem(`${eventType}_team${i}_name_tc`);
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`);
    const division = sessionStorage.getItem(`${eventType}_team${i}_division`);
    
    // Populate name fields
    const nameEnField = document.getElementById(`teamNameEn${i}`);
    const nameTcField = document.getElementById(`teamNameTc${i}`);
    if (nameEnField && nameEn) {
      nameEnField.value = nameEn;
	Logger.debug(`🎯 restoreTeamDetails: Restored team ${i} name (EN):`, nameEn);
    }
    if (nameTcField && nameTc) {
      nameTcField.value = nameTc;
	Logger.debug(`🎯 restoreTeamDetails: Restored team ${i} name (TC):`, nameTc);
    }
    
    // Restore boat type radio
    if (boatType) {
      // Find radio button by value (boatType is stored as title_en from packages)
      const boatTypeRadio = document.querySelector(`input[name="boatType${i}"][value="${boatType}"]`);
      if (boatTypeRadio) {
        boatTypeRadio.checked = true;
	Logger.debug(`🎯 restoreTeamDetails: Restored team ${i} boat type:`, boatType);
        // Trigger change to show division options
        boatTypeRadio.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
	Logger.warn(`🎯 restoreTeamDetails: Boat type radio not found for team ${i}, value:`, boatType);
      }
    }
    
    // Restore division radio (after boat type triggers division display)
    if (division) {
      // Use setTimeout to ensure division options are rendered first
      setTimeout(() => {
        // Find radio button by value (division is stored as division_code)
        const divisionRadio = document.querySelector(`input[name="division${i}"][value="${division}"]`);
        if (divisionRadio) {
          divisionRadio.checked = true;
	Logger.debug(`🎯 restoreTeamDetails: Restored team ${i} division:`, division);
        } else {
	Logger.warn(`🎯 restoreTeamDetails: Division radio not found for team ${i}, value:`, division);
        }
      }, 150); // Wait for boat type change handler to complete and show divisions
    }
  }
  
	Logger.debug('🎯 restoreTeamDetails: Completed restoration');
}

/**
 * Restore WU/SC Step 1 team fields using FieldRestoreUtility
 */
function restoreWUSCStep1Teams(teamCount) {
  if (!window.FieldRestoreUtility) {
    Logger.warn(`🎯 restoreWUSCStep1Teams: FieldRestoreUtility not available, falling back to restoreTeamDetails`);
    restoreTeamDetails();
    return;
  }
  
  console.log(`[${eventType.toUpperCase()} Step 1] Restoring ${teamCount} teams...`);
  
  for (let i = 1; i <= teamCount; i++) {
    // Team names
    FieldRestoreUtility.restoreField(
      `teamNameEn${i}`,
      `team${i}_name_en`,
      { prefix: eventType + '_', debug: true }
    );
    
    FieldRestoreUtility.restoreField(
      `teamNameTc${i}`,
      `team${i}_name_tc`,
      { prefix: eventType + '_', debug: true }
    );
    
    // Boat type (triggers division display)
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`);
    if (boatType) {
      const radio = document.querySelector(`input[name="boatType${i}"][value="${boatType}"]`);
      if (radio) {
        radio.checked = true;
        console.log(`[Restore] ✓ boatType${i}: "${boatType}"`);
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Division (after boat type renders it)
        setTimeout(() => {
          FieldRestoreUtility.restoreRadio(
            `division${i}`,
            `team${i}_division`,
            { prefix: eventType + '_', debug: true }
          );
        }, 150);
      }
    }
  }
  
  setTimeout(() => {
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugDOM('wuScWizardMount');
    }
  }, 500);
}

/**
 * Load boat types for a specific team
 */
async function loadBoatTypesForTeam(teamIndex, cfg) {
	Logger.debug(`loadBoatTypesForTeam: Starting for team ${teamIndex}`);
  const container = document.getElementById(`boatType${teamIndex}`);
  const entryGroupContainer = document.getElementById(`entryGroupContainer${teamIndex}`);
  
  if (!container) {
	Logger.error(`loadBoatTypesForTeam: Container boatType${teamIndex} not found in DOM`);
    // Try to find it again after a short delay
    await new Promise(resolve => setTimeout(resolve, 100));
    const retryContainer = document.getElementById(`boatType${teamIndex}`);
    if (!retryContainer) {
	Logger.error(`loadBoatTypesForTeam: Container still not found after retry`);
      return;
    }
  }
  
  if (!entryGroupContainer) {
	Logger.error(`loadBoatTypesForTeam: Entry group container entryGroupContainer${teamIndex} not found in DOM`);
    return;
  }
  
	Logger.debug(`loadBoatTypesForTeam: Containers found, checking config`, {
    hasConfig: !!cfg,
    packagesCount: cfg?.packages?.length || 0
  });
  
  const packages = cfg?.packages || [];
	Logger.debug(`loadBoatTypesForTeam: Found ${packages.length} packages for team ${teamIndex}`, packages);
  
  // Filter out "By Invitation" option
  const validPackages = packages.filter(pkg => pkg.title_en !== 'By Invitation');
	Logger.debug(`loadBoatTypesForTeam: ${validPackages.length} valid packages after filtering (team ${teamIndex})`);
  
  if (validPackages.length === 0) {
	Logger.error(`loadBoatTypesForTeam: No valid packages found for team ${teamIndex}`, {
      packagesCount: packages.length,
      packages: packages,
      config: cfg
    });
    const errorMsg = document.createElement('div');
    errorMsg.className = 'msg error';
    errorMsg.style.fontSize = '0.9em';
    errorMsg.style.padding = '0.75rem';
    errorMsg.style.marginTop = '0.5rem';
    errorMsg.style.marginBottom = '0.5rem';
    errorMsg.style.backgroundColor = '#f8d7da';
    errorMsg.style.color = '#721c24';
    errorMsg.style.border = '1px solid #f5c6cb';
    errorMsg.style.borderRadius = '4px';
    const tPkgErr = (key) => window.i18n ? window.i18n.t(key) : key;
    errorMsg.innerHTML = `<strong>${tPkgErr('noPackagesConfigured')}</strong><br/>${tPkgErr('noPackagesConfiguredDetail')}`;
    container.appendChild(errorMsg);
    // Don't return - let the form structure remain visible, but show the error
    return;
  }
  
  // Get current language for localized display
  const lang = window.i18n?.getCurrentLanguage?.() || 'en';
  const isZh = lang === 'zh';

  validPackages.forEach((pkg, index) => {
    const label = document.createElement('label');
    label.className = 'radio-label';
    // Use localized title (title_en or title_tc)
    const displayTitle = isZh ? (pkg.title_tc || pkg.title_en) : pkg.title_en;
    // XSS FIX: Escape package data before inserting into HTML
    const safeDisplayTitle = SafeDOM.escapeHtml(displayTitle);
    // Store title_en as value for filtering divisions (they match by English name)
    const safeTitleEn = SafeDOM.escapeHtml(pkg.title_en);
    const price = pkg.listed_unit_price ? pkg.listed_unit_price.toLocaleString() : '0';
    const hkDollar = window.i18n?.t?.('hkDollar') || 'HK$';
    label.innerHTML = `
      <input type="radio" id="boatType${teamIndex}_${index}" name="boatType${teamIndex}" value="${safeTitleEn}" required />
      ${safeDisplayTitle} - ${hkDollar}${price}
    `;
    container.appendChild(label);

    // Show divisions when boat type is selected
    const radio = label.querySelector('input');
    if (radio) {
      radio.addEventListener('change', () => {
	Logger.debug(`Boat type selected for team ${teamIndex}: ${safeTitleEn}`);
        // Move entry group container after the selected radio button
        label.parentNode.appendChild(entryGroupContainer);
        showDivisionRow(teamIndex);
      });
    }
  });
  
	Logger.debug(`loadBoatTypesForTeam: Successfully loaded ${validPackages.length} boat types for team ${teamIndex}`);
}

/**
 * Load divisions for a specific team
 */
async function loadDivisionsForTeam(teamIndex, cfg) {
  const container = document.getElementById(`division${teamIndex}`);
  if (!container) {
	Logger.error(`loadDivisionsForTeam: Container not found for team ${teamIndex}`);
    return;
  }
  
  const divisions = cfg.divisions || [];
	Logger.debug(`loadDivisionsForTeam: Found ${divisions.length} divisions for team ${teamIndex}`);
  
  // Store all divisions for this team (will be filtered when boat type is selected)
  container.dataset.allDivisions = JSON.stringify(divisions);
  
  // Initially hide the division container
  container.hidden = true;
}

/**
 * Show division row for a specific team
 */
function showDivisionRow(teamIndex) {
  const divisionContainer = document.getElementById(`division${teamIndex}`);
  const entryGroupContainer = document.getElementById(`entryGroupContainer${teamIndex}`);
  if (!divisionContainer) {
	Logger.error(`showDivisionRow: Division container not found for team ${teamIndex}`);
    return;
  }
  if (!entryGroupContainer) {
	Logger.error(`showDivisionRow: Entry group container not found for team ${teamIndex}`);
    return;
  }
  
  // Get selected boat type
  const selectedBoatType = document.querySelector(`input[name="boatType${teamIndex}"]:checked`);
  if (!selectedBoatType) {
	Logger.error(`showDivisionRow: No boat type selected for team ${teamIndex}`);
    return;
  }
  
  const boatType = selectedBoatType.value;
	Logger.debug(`showDivisionRow: Filtering divisions for team ${teamIndex}, boat type: ${boatType}`);
  
  // Get all divisions from stored data
  let allDivisions = [];
  try {
    const divisionsData = divisionContainer.dataset.allDivisions || '[]';
    allDivisions = JSON.parse(divisionsData);
  } catch (e) {
	Logger.error(`showDivisionRow: Failed to parse divisions data for team ${teamIndex}`, e);
    return;
  }
  
	Logger.debug(`showDivisionRow: Found ${allDivisions.length} total divisions for team ${teamIndex}`);
  
  // Filter divisions based on boat type
  // Note: Division names from v_divisions_public view are in format "Standard Boat – Men" or "Small Boat – Ladies"
  // The view already combines div_main_name_en and div_sub_name_en into name_en
  // Exclude divisions where by_invitation_only=true
  let filteredDivisions = [];
  if (boatType === 'Standard Boat') {
    filteredDivisions = allDivisions.filter(div => {
      const nameEn = div.name_en || '';
      // Exclude invitation-only divisions (check for truthy value)
      if (div.by_invitation_only === true || div.by_invitation_only === 'true' || div.by_invitation_only === 1) {
	Logger.debug(`showDivisionRow: Excluding invitation-only division: ${nameEn}`);
        return false;
      }
      // Check if name contains "Standard Boat" and one of the entry group types
      // Exclude special invitation divisions by checking for keywords
      if (nameEn.includes('Hong Kong Youth Group') || 
          nameEn.includes('Disciplinary Forces') ||
          nameEn.includes('Post-Secondary') ||
          nameEn.includes('HKU Invitational')) {
	Logger.debug(`showDivisionRow: Excluding special division: ${nameEn}`);
        return false;
      }
      return nameEn.includes('Standard Boat') && 
             (nameEn.includes('Men') || nameEn.includes('Ladies') || nameEn.includes('Mixed'));
    });
  } else if (boatType === 'Small Boat') {
    filteredDivisions = allDivisions.filter(div => {
      const nameEn = div.name_en || '';
      // Exclude invitation-only divisions (check for truthy value)
      if (div.by_invitation_only === true || div.by_invitation_only === 'true' || div.by_invitation_only === 1) {
	Logger.debug(`showDivisionRow: Excluding invitation-only division: ${nameEn}`);
        return false;
      }
      // Exclude special invitation divisions by checking for keywords
      if (nameEn.includes('Hong Kong Youth Group') || 
          nameEn.includes('Disciplinary Forces') ||
          nameEn.includes('Post-Secondary') ||
          nameEn.includes('HKU Invitational')) {
	Logger.debug(`showDivisionRow: Excluding special division: ${nameEn}`);
        return false;
      }
      // Check if name contains "Small Boat" and one of the entry group types
      return nameEn.includes('Small Boat') && 
             (nameEn.includes('Men') || nameEn.includes('Ladies') || nameEn.includes('Mixed'));
    });
  }
  
	Logger.debug(`showDivisionRow: Filtered to ${filteredDivisions.length} divisions for team ${teamIndex}`);
  
  if (filteredDivisions.length === 0) {
	Logger.warn(`showDivisionRow: No divisions found for boat type "${boatType}" (team ${teamIndex})`);
    const errorMsg = document.createElement('div');
    errorMsg.className = 'msg error';
    const tNoGroups = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    errorMsg.textContent = tNoGroups('noEntryGroupsAvailable', { boatType });
    divisionContainer.appendChild(errorMsg);
    entryGroupContainer.hidden = false;
    return;
  }
  
  // Clear existing divisions
  divisionContainer.innerHTML = '';

  // Get current language for localized display
  const lang = window.i18n?.getCurrentLanguage?.() || 'en';
  const isZh = lang === 'zh';

  // Add filtered divisions
  filteredDivisions.forEach((div, index) => {
    const label = document.createElement('label');
    label.className = 'radio-label';

    // Use localized name from the view (name_en or name_tc)
    const displayName = isZh ? (div.name_tc || div.name_en || '') : (div.name_en || '');

    // XSS FIX: Escape division data before inserting into HTML
    const safeDisplayName = SafeDOM.escapeHtml(displayName);
    // Store division_code as value for submission, display localized name
    const divisionCode = div.division_code || div.name_en || '';
    const safeDivisionCode = SafeDOM.escapeHtml(divisionCode);
    label.innerHTML = `
      <input type="radio" id="division${teamIndex}_${index}" name="division${teamIndex}" value="${safeDivisionCode}" required />
      ${safeDisplayName}
    `;
    divisionContainer.appendChild(label);
  });
  
  // Show the entire entry group container (includes label and radio buttons)
  entryGroupContainer.hidden = false;
	Logger.debug(`showDivisionRow: Successfully displayed ${filteredDivisions.length} divisions for team ${teamIndex}`);
}

/**
 * Initialize Step 2: Team Information
 */
function initStep2() {
	Logger.debug('🎯 initStep2: Initializing team information step');
  
  // Render team name fields (read-only, from Step 1)
  renderTeamNameFields();
  
  // Render manager contact fields
  renderManagerFields();
  
  // Add error divs for organization fields (if not already present)
  addOrganizationErrorDivs();
  
  // Set up validation for email and phone fields
  setupStep2Validation();
  
  // Restore organization and manager data after fields are rendered (legacy)
  setTimeout(() => {
    restoreOrganizationData();
  }, 100); // Wait for DOM to update
  
  // Debug what we have
  console.log(`\n=== ${eventType.toUpperCase()} STEP 2: RESTORE ===`);
  if (window.FieldRestoreUtility) {
    FieldRestoreUtility.debugStorage(eventType + '_');
  }
  
  // Restore with FieldRestoreUtility
  setTimeout(() => {
    restoreWUSCStep2();
  }, 250);
}

/**
 * Add error divs for organization fields
 */
function addOrganizationErrorDivs() {
  const orgName = document.getElementById('orgName');
  if (orgName) {
    const existingError = document.getElementById('error-orgName');
    if (!existingError) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error-message';
      errorDiv.id = 'error-orgName';
      orgName.parentNode.appendChild(errorDiv);
    }
  }
  
  const mailingAddress = document.getElementById('mailingAddress');
  if (mailingAddress) {
    const existingError = document.getElementById('error-mailingAddress');
    if (!existingError) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error-message';
      errorDiv.id = 'error-mailingAddress';
      mailingAddress.parentNode.appendChild(errorDiv);
    }
  }
}

/**
 * Restore organization and manager data from sessionStorage
 */
function restoreOrganizationData() {
	Logger.debug('🎯 restoreOrganizationData: Starting restoration');
  
  // Restore organization details
  const orgName = sessionStorage.getItem(`${eventType}_orgName`);
  const mailingAddress = sessionStorage.getItem(`${eventType}_mailingAddress`);
  
  const orgNameField = document.getElementById('orgName');
  const addressField = document.getElementById('mailingAddress');
  
  if (orgNameField && orgName) {
    orgNameField.value = orgName;
	Logger.debug('🎯 restoreOrganizationData: Restored org name:', orgName);
  }
  if (addressField && mailingAddress) {
    addressField.value = mailingAddress;
	Logger.debug('🎯 restoreOrganizationData: Restored mailing address');
  }
  
  // Restore Manager 1
  restoreManagerFields(1);
  
  // Restore Manager 2
  restoreManagerFields(2);
  
  // Restore Manager 3 (optional)
  restoreManagerFields(3);
  
	Logger.debug('🎯 restoreOrganizationData: Completed restoration');
}

/**
 * Restore individual manager fields
 */
function restoreManagerFields(managerNum) {
  const name = sessionStorage.getItem(`${eventType}_manager${managerNum}Name`);
  const phone = sessionStorage.getItem(`${eventType}_manager${managerNum}Phone`);
  const email = sessionStorage.getItem(`${eventType}_manager${managerNum}Email`);
  
  const nameField = document.getElementById(`manager${managerNum}Name`);
  const phoneField = document.getElementById(`manager${managerNum}Phone`);
  const emailField = document.getElementById(`manager${managerNum}Email`);
  
  if (nameField && name) {
    nameField.value = name;
	Logger.debug(`🎯 restoreManagerFields: Restored manager ${managerNum} name`);
  }
  if (emailField && email) {
    emailField.value = email;
	Logger.debug(`🎯 restoreManagerFields: Restored manager ${managerNum} email`);
  }
  
  // Extract local phone number (remove +852 prefix if present)
  if (phoneField && phone) {
    const localPhone = extractLocalNumber(phone);
    phoneField.value = localPhone;
	Logger.debug(`🎯 restoreManagerFields: Restored manager ${managerNum} phone (extracted from: ${phone})`);
  }
}

/**
 * Restore WU/SC Step 2 organization and manager fields using FieldRestoreUtility
 */
function restoreWUSCStep2() {
  if (!window.FieldRestoreUtility) {
    Logger.warn(`🎯 restoreWUSCStep2: FieldRestoreUtility not available, using legacy restoreOrganizationData`);
    return;
  }
  
  console.log(`[${eventType.toUpperCase()} Step 2] Restoring org & managers...`);
  
  // Organization
  FieldRestoreUtility.restoreField('orgName', 'orgName', { prefix: eventType + '_', debug: true });
  FieldRestoreUtility.restoreField('mailingAddress', 'mailingAddress', { prefix: eventType + '_', debug: true });
  
  // Managers 1-3 (same pattern as TN)
  for (let i = 1; i <= 3; i++) {
    FieldRestoreUtility.restoreField(
      `manager${i}Name`,
      `manager${i}Name`,
      { prefix: eventType + '_', debug: true }
    );
    
    FieldRestoreUtility.restoreField(
      `manager${i}Email`,
      `manager${i}Email`,
      { prefix: eventType + '_', debug: true }
    );
    
    // Phone (extract local)
    const phone = sessionStorage.getItem(`${eventType}_manager${i}Phone`);
    if (phone) {
      const local = phone.startsWith('+852') ? phone.substring(4) : phone;
      const field = document.getElementById(`manager${i}Phone`);
      if (field) {
        field.value = local;
        console.log(`[Restore] ✓ manager${i}Phone: "${local}"`);
      }
    }
  }
  
  setTimeout(() => {
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugDOM('wuScWizardMount');
    }
  }, 500);
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
 * Render team name fields (read-only display of teams from Step 1)
 */
function renderTeamNameFields() {
  const container = document.getElementById('teamNameFields');
  if (!container) return;

  // Get team count from Step 1 data
  const teamCountInput = document.getElementById('teamCount');
  if (!teamCountInput) return;

  const teamCount = parseInt(sessionStorage.getItem(`${eventType}_team_count`) || teamCountInput.value || 0);

  if (teamCount === 0) return;

  const t = (key, params) => window.i18n?.t?.(key, params) || key;
  
  let html = `<h3 data-i18n="teams">${t('teams')}</h3>`;
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`${eventType}_team${i}_name_en`) || `${t('team')} ${i}`;
    const safeTeamName = SafeDOM.escapeHtml(teamNameEn);
    html += `
      <div class="form-group">
        <label>${t('team')} ${i}</label>
        <input type="text" value="${safeTeamName}" readonly style="background: #f5f5f5;" />
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Render manager contact fields (3 managers)
 */
function renderManagerFields() {
  const container = document.getElementById('managerFields');
  if (!container) return;

  const t = (key, params) => window.i18n?.t?.(key, params) || key;

  container.innerHTML = `
    <div class="form-section">
      <h4 data-i18n="teamManager1Required">${t('teamManager1Required')}</h4>
      <div class="form-group">
        <label for="manager1Name" data-i18n="nameLabel">${t('nameLabel')}</label>
        <input type="text" id="manager1Name" name="manager1Name" required placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
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
        <input type="email" id="manager1Email" name="manager1Email" required placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
        <div class="field-error-message" id="error-manager1Email"></div>
      </div>
    </div>

    <div class="form-section">
      <h4 data-i18n="teamManager2Required">${t('teamManager2Required')}</h4>
      <div class="form-group">
        <label for="manager2Name" data-i18n="nameLabel">${t('nameLabel')}</label>
        <input type="text" id="manager2Name" name="manager2Name" required placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
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
        <input type="email" id="manager2Email" name="manager2Email" required placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
        <div class="field-error-message" id="error-manager2Email"></div>
      </div>
    </div>

    <div class="form-section">
      <h4 data-i18n="teamManager3Optional">${t('teamManager3Optional')}</h4>
      <div class="form-group">
        <label for="manager3Name" data-i18n="nameLabelOptional">${t('nameLabelOptional')}</label>
        <input type="text" id="manager3Name" name="manager3Name" placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
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
        <input type="email" id="manager3Email" name="manager3Email" placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
        <div class="field-error-message" id="error-manager3Email"></div>
      </div>
    </div>
  `;
}

/**
 * Initialize Step 3: Race Day Arrangement
 */
function initStep3() {
	Logger.debug('🎯 initStep3: Initializing race day step');
  
  // Form fields are already in the HTML template (wu-sc-step-3)
  // Just restore the saved values from sessionStorage (legacy)
  setTimeout(() => {
    restoreRaceDayData();
  }, 100); // Wait for DOM to update
  
  // Debug what we have
  console.log(`\n=== ${eventType.toUpperCase()} STEP 3: RESTORE ===`);
  if (window.FieldRestoreUtility) {
    FieldRestoreUtility.debugStorage(eventType + '_');
  }
  
  // Restore with FieldRestoreUtility
  setTimeout(() => {
    restoreWUSCStep3();
  }, 250);
}

/**
 * Restore race day data from sessionStorage
 */
function restoreRaceDayData() {
	Logger.debug('🎯 restoreRaceDayData: Starting restoration');
  
  const fields = [
    'marqueeQty',
    'steerWithQty', 
    'steerWithoutQty',
    'junkBoatNo',
    'junkBoatQty',
    'speedBoatNo',
    'speedboatQty'
  ];
  
  fields.forEach(fieldId => {
    const saved = sessionStorage.getItem(`${eventType}_${fieldId}`);
    const field = document.getElementById(fieldId);
    
    if (field && saved !== null && saved !== '') {
      field.value = saved;
	Logger.debug(`🎯 restoreRaceDayData: Restored ${fieldId}:`, saved);
    }
  });
  
	Logger.debug('🎯 restoreRaceDayData: Completed restoration');
}

/**
 * Restore WU/SC Step 3 race day data using FieldRestoreUtility
 */
function restoreWUSCStep3() {
  if (!window.FieldRestoreUtility) {
    Logger.warn(`🎯 restoreWUSCStep3: FieldRestoreUtility not available, using legacy restoreRaceDayData`);
    return;
  }
  
  console.log(`[${eventType.toUpperCase()} Step 3] Restoring race day...`);
  
  const fields = [
    'marqueeQty', 'steerWithQty', 'steerWithoutQty',
    'junkBoatNo', 'junkBoatQty', 'speedBoatNo', 'speedboatQty'
  ];
  
  fields.forEach(fieldId => {
    FieldRestoreUtility.restoreField(
      fieldId,
      fieldId,
      { prefix: eventType + '_', debug: true }
    );
  });
  
  setTimeout(() => {
    if (window.FieldRestoreUtility) {
      FieldRestoreUtility.debugDOM('wuScWizardMount');
    }
  }, 500);
}

/**
 * Initialize Step 4: Summary
 */
function initStep4() {
	Logger.debug('🎯 initStep4: Initializing summary step');
  
  // Populate summary with all collected data
  populateSummary();
}

/**
 * Populate the summary page with all form data
 */
function populateSummary() {
	Logger.debug('🎯 Populating summary...');
	Logger.debug('🎯 Event type:', eventType);
	Logger.debug('🎯 SessionStorage keys:', Object.keys(sessionStorage).filter(k => k.includes(eventType)));
  
  const cfg = window.__CONFIG;
  
  // Basics
  const sumSeason = document.getElementById('sumSeason');
  if (sumSeason) sumSeason.textContent = cfg?.event?.season || '2026';
  
  const sumOrg = document.getElementById('sumOrg');
  const orgName = sessionStorage.getItem(`${eventType}_orgName`) || document.getElementById('orgName')?.value || '—';
	Logger.debug('🎯 Org name:', orgName);
  if (sumOrg) sumOrg.textContent = orgName;
  
  const sumAddress = document.getElementById('sumAddress');
  const mailingAddress = sessionStorage.getItem(`${eventType}_mailingAddress`) || document.getElementById('mailingAddress')?.value || '—';
	Logger.debug('🎯 Mailing address:', mailingAddress);
  if (sumAddress) sumAddress.textContent = mailingAddress;
  
  // Teams
  populateTeamsSummary();
  
  // Managers
  populateManagersSummary();
  
  // Race Day
  populateRaceDaySummary();
  
  // Total Cost
  calculateTotalCost();
}

/**
 * Populate teams table in summary
 */
function populateTeamsSummary() {
  const tbody = document.getElementById('teamsTbody');
  if (!tbody) return;

  const teamCount = parseInt(sessionStorage.getItem(`${eventType}_team_count`) || 0);

  if (teamCount === 0) {
    const tNoTeams = window.i18n?.t?.('noTeams') || 'No teams';
    tbody.innerHTML = `<tr><td colspan="4" class="muted">${SafeDOM.escapeHtml(tNoTeams)}</td></tr>`;
    return;
  }

  // Get current language and config for localized lookups
  const lang = window.i18n?.getCurrentLanguage?.() || 'en';
  const isZh = lang === 'zh';
  const cfg = window.__CONFIG || {};

  let html = '';
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`${eventType}_team${i}_name_en`) || `Team ${i}`;
    const boatTypeCode = sessionStorage.getItem(`${eventType}_team${i}_boatType`) || '—';
    const divisionCode = sessionStorage.getItem(`${eventType}_team${i}_division`) || '—';

    // Look up localized boat type name from packages
    let localizedBoatType = boatTypeCode;
    if (cfg.packages && boatTypeCode !== '—') {
      const pkg = cfg.packages.find(p => p.title_en === boatTypeCode);
      if (pkg) {
        localizedBoatType = isZh ? (pkg.title_tc || pkg.title_en) : pkg.title_en;
      }
    }

    // Look up localized division name from divisions
    let localizedDivision = divisionCode;
    if (cfg.divisions && divisionCode !== '—') {
      const div = cfg.divisions.find(d => d.division_code === divisionCode);
      if (div) {
        localizedDivision = isZh ? (div.name_tc || div.name_en) : div.name_en;
      }
    }

    // XSS FIX: Escape all values before inserting into HTML
    const safeTeamName = SafeDOM.escapeHtml(teamNameEn);
    const safeBoatType = SafeDOM.escapeHtml(localizedBoatType);
    const safeDivision = SafeDOM.escapeHtml(localizedDivision);

    html += `
      <tr>
        <td>${i}</td>
        <td>${safeTeamName}</td>
        <td>${safeBoatType}</td>
        <td>${safeDivision}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

/**
 * Populate managers summary
 */
function populateManagersSummary() {
  // Manager 1
  const sumManager1 = document.getElementById('sumManager1');
  const manager1Name = sessionStorage.getItem(`${eventType}_manager1Name`) || '—';
  const manager1Phone = sessionStorage.getItem(`${eventType}_manager1Phone`) || '';
  const manager1Email = sessionStorage.getItem(`${eventType}_manager1Email`) || '';
  if (sumManager1) {
    // XSS FIX: Escape user input (manager names, phone, email) before inserting into HTML
    // These values come from sessionStorage (user input), so they must be escaped
    if (manager1Name !== '—') {
      const safeName = SafeDOM.escapeHtml(manager1Name);
      const safePhone = SafeDOM.escapeHtml(manager1Phone);
      const safeEmail = SafeDOM.escapeHtml(manager1Email);
      sumManager1.innerHTML = `${safeName}<br/>${safePhone}<br/>${safeEmail}`;
    } else {
      sumManager1.textContent = '—';
    }
  }
  
  // Manager 2
  const sumManager2 = document.getElementById('sumManager2');
  const manager2Name = sessionStorage.getItem(`${eventType}_manager2Name`) || '—';
  const manager2Phone = sessionStorage.getItem(`${eventType}_manager2Phone`) || '';
  const manager2Email = sessionStorage.getItem(`${eventType}_manager2Email`) || '';
  if (sumManager2) {
    // XSS FIX: Escape user input (manager names, phone, email) before inserting into HTML
    if (manager2Name !== '—') {
      const safeName = SafeDOM.escapeHtml(manager2Name);
      const safePhone = SafeDOM.escapeHtml(manager2Phone);
      const safeEmail = SafeDOM.escapeHtml(manager2Email);
      sumManager2.innerHTML = `${safeName}<br/>${safePhone}<br/>${safeEmail}`;
    } else {
      sumManager2.textContent = '—';
    }
  }
  
  // Manager 3 (Optional)
  const sumManager3 = document.getElementById('sumManager3');
  const manager3Name = sessionStorage.getItem(`${eventType}_manager3Name`) || '';
  const manager3Phone = sessionStorage.getItem(`${eventType}_manager3Phone`) || '';
  const manager3Email = sessionStorage.getItem(`${eventType}_manager3Email`) || '';
  if (sumManager3) {
    // XSS FIX: Escape user input (manager names, phone, email) before inserting into HTML
    if (manager3Name) {
      const safeName = SafeDOM.escapeHtml(manager3Name);
      const safePhone = SafeDOM.escapeHtml(manager3Phone);
      const safeEmail = SafeDOM.escapeHtml(manager3Email);
      sumManager3.innerHTML = `${safeName}<br/>${safePhone}<br/>${safeEmail}`;
    } else {
      sumManager3.textContent = '—';
    }
  }
}

/**
 * Populate race day summary
 */
function populateRaceDaySummary() {
  const sumMarquee = document.getElementById('sumMarquee');
  const marqueeQty = sessionStorage.getItem(`${eventType}_marqueeQty`) || document.getElementById('marqueeQty')?.value || '0';
  if (sumMarquee) sumMarquee.textContent = marqueeQty === '0' ? '—' : `${marqueeQty} × HK$800`;
  
  const sumSteerWith = document.getElementById('sumSteerWith');
  const steerWithQty = sessionStorage.getItem(`${eventType}_steerWithQty`) || document.getElementById('steerWithQty')?.value || '0';
  if (sumSteerWith) sumSteerWith.textContent = steerWithQty === '0' ? '—' : `${steerWithQty} × HK$800`;
  
  const sumSteerWithout = document.getElementById('sumSteerWithout');
  const steerWithoutQty = sessionStorage.getItem(`${eventType}_steerWithoutQty`) || document.getElementById('steerWithoutQty')?.value || '0';
  if (sumSteerWithout) sumSteerWithout.textContent = steerWithoutQty === '0' ? '—' : `${steerWithoutQty} × HK$1,500`;
  
  const sumJunk = document.getElementById('sumJunk');
  const junkBoatNo = sessionStorage.getItem(`${eventType}_junkBoatNo`) || document.getElementById('junkBoatNo')?.value || '';
  const junkBoatQty = sessionStorage.getItem(`${eventType}_junkBoatQty`) || document.getElementById('junkBoatQty')?.value || '0';
  if (sumJunk) {
    if (junkBoatQty === '0' || !junkBoatNo) {
      sumJunk.textContent = '—';
    } else {
      sumJunk.textContent = `${junkBoatNo} (${junkBoatQty} × HK$2,500)`;
    }
  }
  
  const sumSpeed = document.getElementById('sumSpeed');
  const speedBoatNo = sessionStorage.getItem(`${eventType}_speedBoatNo`) || document.getElementById('speedBoatNo')?.value || '';
  const speedboatQty = sessionStorage.getItem(`${eventType}_speedboatQty`) || document.getElementById('speedboatQty')?.value || '0';
  if (sumSpeed) {
    if (speedboatQty === '0' || !speedBoatNo) {
      sumSpeed.textContent = '—';
    } else {
      sumSpeed.textContent = `${speedBoatNo} (${speedboatQty} × HK$1,500)`;
    }
  }
}

/**
 * Calculate and display total cost
 */
function calculateTotalCost() {
  const cfg = window.__CONFIG;
  let total = 0;
  
  // Team entry fees
  const teamCount = parseInt(sessionStorage.getItem(`${eventType}_team_count`) || 0);
  for (let i = 1; i <= teamCount; i++) {
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`) || '';
    const pkg = cfg?.packages?.find(p => p.title_en === boatType);
    if (pkg) {
      total += pkg.listed_unit_price;
    }
  }
  
  // Race day items
  const marqueeQty = parseInt(sessionStorage.getItem(`${eventType}_marqueeQty`) || document.getElementById('marqueeQty')?.value || '0');
  total += marqueeQty * 800;
  
  const steerWithQty = parseInt(sessionStorage.getItem(`${eventType}_steerWithQty`) || document.getElementById('steerWithQty')?.value || '0');
  total += steerWithQty * 800;
  
  const steerWithoutQty = parseInt(sessionStorage.getItem(`${eventType}_steerWithoutQty`) || document.getElementById('steerWithoutQty')?.value || '0');
  total += steerWithoutQty * 1500;
  
  const junkBoatQty = parseInt(sessionStorage.getItem(`${eventType}_junkBoatQty`) || document.getElementById('junkBoatQty')?.value || '0');
  total += junkBoatQty * 2500;
  
  const speedboatQty = parseInt(sessionStorage.getItem(`${eventType}_speedboatQty`) || document.getElementById('speedboatQty')?.value || '0');
  total += speedboatQty * 1500;
  
  // Display total
  const sumTotal = document.getElementById('sumTotal');
  if (sumTotal) {
    sumTotal.textContent = `HK$${total.toLocaleString()}`;
  }
}

/**
 * Set up step navigation
 */
function setupStepNavigation() {
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        loadStep(currentStep - 1);
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
          loadStep(currentStep + 1);
        }
      }
    });
  }
  
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (validateCurrentStep()) {
        submitWUSCForm();
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
    default:
      return true;
  }
}

/**
 * Validate Step 1
 */
function validateStep1() {
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const teamCount = document.getElementById('teamCount');
  const t1 = (key) => window.i18n?.t?.(key) || key;
  
  if (!teamCount || !teamCount.value) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors([
        { field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' }
      ], {
        containerId: 'categoryForm',
        scrollTo: true
      });
    } else {
      console.error('ErrorSystem not available: Please select number of teams');
      alert(window.i18n?.t?.('pleaseSelectNumberOfTeams') || 'Please select number of teams');
    }
    return false;
  }
  
  const count = parseInt(teamCount.value);
  
  // Save team count
  sessionStorage.setItem(`${eventType}_team_count`, count);
  
  const errors = [];
  
  for (let i = 1; i <= count; i++) {
    const teamNameEn = document.getElementById(`teamNameEn${i}`);
    const teamNameTc = document.getElementById(`teamNameTc${i}`);
    const boatType = document.querySelector(`input[name="boatType${i}"]:checked`);
    const division = document.querySelector(`input[name="division${i}"]:checked`);
    
    if (!teamNameEn || !teamNameEn.value.trim()) {
      errors.push({
        field: `teamNameEn${i}`,
        messageKey: 'pleaseEnterTeamName',
        params: { num: i }
      });
    }
    
    if (!boatType) {
      errors.push({
        field: `boatType${i}`,
        messageKey: 'pleaseSelectDivision',
        params: { num: i }
      });
    }
    
    if (!division) {
      errors.push({
        field: `division${i}`,
        messageKey: 'pleaseSelectEntryGroup',
        params: { num: i }
      });
    }
    
    // Save team data to sessionStorage
    if (teamNameEn?.value?.trim()) {
      sessionStorage.setItem(`${eventType}_team${i}_name_en`, teamNameEn.value.trim());
    }
    if (teamNameTc?.value?.trim()) {
      sessionStorage.setItem(`${eventType}_team${i}_name_tc`, teamNameTc.value.trim());
    }
    if (boatType) {
      sessionStorage.setItem(`${eventType}_team${i}_boatType`, boatType.value);
    }
    if (division) {
      sessionStorage.setItem(`${eventType}_team${i}_division`, division.value);
    }
  }
  
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'categoryForm',
        scrollTo: true
      });
    } else {
      // Fallback: errorSystem not available
      const firstError = errors[0];
      const message = window.i18n && typeof window.i18n.t === 'function'
        ? window.i18n.t(firstError.messageKey, firstError.params || {})
        : firstError.messageKey;
      console.error('ErrorSystem not available:', message);
      alert(message);
    }
    return false;
  }
  
  return true;
}

/**
 * Validate Step 2
 */
function validateStep2() {
  // Clear any previous errors
  if (window.errorSystem) {
    window.errorSystem.clearFormErrors();
  }
  
  const errors = [];
  const t = (key, params) => window.i18n?.t?.(key, params) || key;
  
  // Validate organization fields
  const orgName = document.getElementById('orgName');
  if (!orgName || !orgName.value.trim()) {
    errors.push({ field: 'orgName', messageKey: 'organizationRequired' });
  }
  
  const mailingAddress = document.getElementById('mailingAddress');
  if (!mailingAddress || !mailingAddress.value.trim()) {
    errors.push({ field: 'mailingAddress', messageKey: 'addressRequired' });
  }

  // Validate Manager 1 (Required)
  const manager1Name = document.getElementById('manager1Name');
  const manager1Phone = document.getElementById('manager1Phone');
  const manager1Email = document.getElementById('manager1Email');
  
  if (!manager1Name || !manager1Name.value.trim()) {
    errors.push({ field: 'manager1Name', messageKey: 'managerNameRequired' });
  }
  
  if (!manager1Phone || !manager1Phone.value.trim()) {
    errors.push({ field: 'manager1Phone', messageKey: 'managerPhoneRequired' });
  } else if (!isValidHKPhone(manager1Phone.value.trim())) {
    errors.push({ field: 'manager1Phone', messageKey: 'invalidPhone' });
  }
  
  if (!manager1Email || !manager1Email.value.trim()) {
    errors.push({ field: 'manager1Email', messageKey: 'managerEmailRequired' });
  } else if (!isValidEmail(manager1Email.value.trim())) {
    errors.push({ field: 'manager1Email', messageKey: 'invalidEmail' });
  }
  
  // Validate Manager 2 (Required)
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  
  if (!manager2Name || !manager2Name.value.trim()) {
    errors.push({ field: 'manager2Name', messageKey: 'managerNameRequired' });
  }
  
  if (!manager2Phone || !manager2Phone.value.trim()) {
    errors.push({ field: 'manager2Phone', messageKey: 'managerPhoneRequired' });
  } else if (!isValidHKPhone(manager2Phone.value.trim())) {
    errors.push({ field: 'manager2Phone', messageKey: 'invalidPhone' });
  }
  
  if (!manager2Email || !manager2Email.value.trim()) {
    errors.push({ field: 'manager2Email', messageKey: 'managerEmailRequired' });
  } else if (!isValidEmail(manager2Email.value.trim())) {
    errors.push({ field: 'manager2Email', messageKey: 'invalidEmail' });
  }
  
  // Validate Manager 3 (Optional, but if provided must be valid)
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  
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
    // If contact info provided but no name
    errors.push({ field: 'manager3Name', messageKey: 'managerNameRequired' });
  }
  
  // Display errors if any found
  if (errors.length > 0) {
    if (window.errorSystem) {
      window.errorSystem.showFormErrors(errors, {
        containerId: 'teamInfoForm',
        scrollTo: true
      });
    } else {
      // Fallback: errorSystem not available
      const firstError = errors[0];
      const message = window.i18n && typeof window.i18n.t === 'function'
        ? window.i18n.t(firstError.messageKey)
        : firstError.messageKey;
      console.error('ErrorSystem not available:', message);
      alert(message);
    }
    return false;
  }
  
  // Save Step 2 data to sessionStorage with normalized phone numbers
  if (orgName?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_orgName`, orgName.value.trim());
  }
  if (mailingAddress?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_mailingAddress`, mailingAddress.value.trim());
  }
  if (manager1Name?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager1Name`, manager1Name.value.trim());
  }
  if (manager1Phone?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager1Phone`, normalizeHKPhone(manager1Phone.value));
  }
  if (manager1Email?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager1Email`, manager1Email.value.trim());
  }
  if (manager2Name?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager2Name`, manager2Name.value.trim());
  }
  if (manager2Phone?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager2Phone`, normalizeHKPhone(manager2Phone.value));
  }
  if (manager2Email?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager2Email`, manager2Email.value.trim());
  }
  
  // Save optional Manager 3
  if (manager3Name?.value?.trim()) {
    sessionStorage.setItem(`${eventType}_manager3Name`, manager3Name.value.trim());
    sessionStorage.setItem(`${eventType}_manager3Phone`, normalizeHKPhone(manager3Phone.value));
    sessionStorage.setItem(`${eventType}_manager3Email`, manager3Email.value.trim());
  }
  
  return true;
}

/**
 * Validate Step 3
 */
function validateStep3() {
  // Save Step 3 data to sessionStorage
  const marqueeQty = document.getElementById('marqueeQty');
  if (marqueeQty) sessionStorage.setItem(`${eventType}_marqueeQty`, marqueeQty.value);
  
  const steerWithQty = document.getElementById('steerWithQty');
  if (steerWithQty) sessionStorage.setItem(`${eventType}_steerWithQty`, steerWithQty.value);
  
  const steerWithoutQty = document.getElementById('steerWithoutQty');
  if (steerWithoutQty) sessionStorage.setItem(`${eventType}_steerWithoutQty`, steerWithoutQty.value);
  
  const junkBoatNo = document.getElementById('junkBoatNo');
  if (junkBoatNo) sessionStorage.setItem(`${eventType}_junkBoatNo`, junkBoatNo.value);
  
  const junkBoatQty = document.getElementById('junkBoatQty');
  if (junkBoatQty) sessionStorage.setItem(`${eventType}_junkBoatQty`, junkBoatQty.value);
  
  const speedBoatNo = document.getElementById('speedBoatNo');
  if (speedBoatNo) sessionStorage.setItem(`${eventType}_speedBoatNo`, speedBoatNo.value);
  
  const speedboatQty = document.getElementById('speedboatQty');
  if (speedboatQty) sessionStorage.setItem(`${eventType}_speedboatQty`, speedboatQty.value);
  
  return true;
}

/**
 * Validate Step 4
 */
function validateStep4() { return true; }

// Legacy showError() function removed - now using unified error system
// Replaced by errorSystem.showFormErrors() and errorSystem.showSystemError()
// Fallback: Use alert() if errorSystem not available
function showError(message) {
  console.error('Error (errorSystem not available):', message);
  alert(message || 'An error occurred');
}

/**
 * Submit WU/SC form
 */
async function submitWUSCForm() {
	Logger.debug('🎯 submitWUSCForm: Submitting WU/SC form');
  
  try {
    // Collect form data from sessionStorage
    const formData = collectFormData();
	Logger.debug('🎯 Form data collected:', formData);
    
    // Generate client transaction ID
    const clientTxId = getClientTxId();
    formData.client_tx_id = clientTxId;
    
	Logger.debug('🎯 Submitting to edge function:', EDGE_URL);
    
    // Submit to edge function
    const result = await fetchWithErrorHandling(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
      context: 'wu_sc_form_submission',
      timeout: 60000 // 60 seconds for form submission
    });
    
    if (result.ok) {
      Logger.debug('✅ Submission successful:', result.data);
      console.log('✅ Submission successful');

      // Clear draft from localStorage on successful submission
      if (window.AutoSave) {
        const eventRef = getWUSCEventShortRef();
        AutoSave.clearDraft(eventRef);
        AutoSave.stopAutoSave();
        console.log('💾 Auto-save: Draft cleared after successful submission');
      }

      // Save receipt and show confirmation
      saveReceipt(clientTxId, formData);
      showConfirmation(result.data);

      // Clear sessionStorage
      clearSessionData();
    } else {
      Logger.error('❌ Submission error:', result.error);
      
      // Handle different error types
      const status = result.status;
      if (window.errorSystem) {
        if (status === 429) {
          window.errorSystem.showSystemError('rateLimitExceeded', {
            persistent: true,
            dismissible: true
          });
        } else if (status >= 500) {
          window.errorSystem.showSystemError('serverErrorDetailed', {
            dismissible: true
          });
        } else if (status === 409) {
          window.errorSystem.showSystemError('duplicateRegistration', {
            dismissible: true
          });
        } else {
          window.errorSystem.showSystemError('serverErrorDetailed', {
            dismissible: true
          });
        }
      } else {
        throw new Error(result.userMessage || result.error || 'Submission failed');
      }
    }
  } catch (error) {
    Logger.error('❌ Submission error:', error);
    
    // Check if it's a network error
    if (window.errorSystem) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        window.errorSystem.showSystemError('networkErrorDetailed', {
          dismissible: true
        });
      } else if (error.message && error.message.includes('timeout')) {
        window.errorSystem.showSystemError('timeoutErrorDetailed', {
          dismissible: true
        });
      } else {
        window.errorSystem.showSystemError('networkErrorDetailed', {
          dismissible: true
        });
      }
    } else {
      console.error('ErrorSystem not available:', error.message || 'Submission failed');
      alert(error.message || 'Submission failed. Please try again.');
    }
  }
}

/**
 * Collect form data from sessionStorage
 */
function collectFormData() {
  const cfg = window.__CONFIG;
  const teamCount = parseInt(sessionStorage.getItem(`${eventType}_team_count`) || 0);
  const teams = [];
  
  // Collect team data
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`${eventType}_team${i}_name_en`);
    const teamNameTc = sessionStorage.getItem(`${eventType}_team${i}_name_tc`);
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`); // e.g., "Standard Boat"
    const division = sessionStorage.getItem(`${eventType}_team${i}_division`); // e.g., "Standard Boat – Men"
    
    teams.push({
      name: teamNameEn, // Backward compatibility
      name_en: teamNameEn,
      name_tc: teamNameTc || '',
      boat_type: boatType,
      division: division,
      category: division // Division already contains "Boat Type – Entry Group"
    });
  }
  
  // Collect organization data
  const orgName = sessionStorage.getItem(`${eventType}_orgName`);
  const orgAddress = sessionStorage.getItem(`${eventType}_mailingAddress`);
  
  // Collect manager data
  const managers = [
    {
      name: sessionStorage.getItem(`${eventType}_manager1Name`),
      mobile: sessionStorage.getItem(`${eventType}_manager1Phone`),
      email: sessionStorage.getItem(`${eventType}_manager1Email`)
    },
    {
      name: sessionStorage.getItem(`${eventType}_manager2Name`),
      mobile: sessionStorage.getItem(`${eventType}_manager2Phone`),
      email: sessionStorage.getItem(`${eventType}_manager2Email`)
    }
  ];
  
  // Add optional manager 3 if provided
  const manager3Name = sessionStorage.getItem(`${eventType}_manager3Name`);
  if (manager3Name) {
    managers.push({
      name: manager3Name,
      mobile: sessionStorage.getItem(`${eventType}_manager3Phone`),
      email: sessionStorage.getItem(`${eventType}_manager3Email`)
    });
  }
  
  // Collect race day data
  const raceDay = {
    marqueeQty: parseInt(sessionStorage.getItem(`${eventType}_marqueeQty`) || 0),
    steerWithQty: parseInt(sessionStorage.getItem(`${eventType}_steerWithQty`) || 0),
    steerWithoutQty: parseInt(sessionStorage.getItem(`${eventType}_steerWithoutQty`) || 0),
    junkBoatNo: sessionStorage.getItem(`${eventType}_junkBoatNo`) || '',
    junkBoatQty: parseInt(sessionStorage.getItem(`${eventType}_junkBoatQty`) || 0),
    speedBoatNo: sessionStorage.getItem(`${eventType}_speedBoatNo`) || '',
    speedboatQty: parseInt(sessionStorage.getItem(`${eventType}_speedboatQty`) || 0)
  };
  
  return {
    eventShortRef: eventType.toUpperCase() + '2026', // Convert 'wu' to 'WU2026'
    category: teams[0]?.category || 'warm_up', // Use first team's category (Division – Entry Group)
    season: cfg?.event?.season || 2026,
    org_name: orgName,
    org_address: orgAddress,
    teams: teams,
    managers: managers,
    race_day: raceDay
  };
}

/**
 * Clear session data after successful submission
 */
function clearSessionData() {
  const keys = Object.keys(sessionStorage).filter(k => k.startsWith(`${eventType}_`));
  keys.forEach(key => sessionStorage.removeItem(key));
	Logger.debug('🎯 Session data cleared');
}
