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
let currentStep = 1;
let totalSteps = 4; // Step 1: Team Details, Step 2: Team Info, Step 3: Race Day, Step 4: Summary
let wuScScope = null;
let wizardMount = null;
let stepper = null;
let eventType = null; // 'wu' or 'sc'

/**
 * Initialize WU/SC wizard
 */
export async function initWUSCWizard(eventShortRef) {
	Logger.debug('🎯 initWUSCWizard called with:', eventShortRef);
  
  eventType = eventShortRef;
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
  
  // Initialize stepper
  initStepper();
  
  // Load first step
  loadStep(1);
  
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
  const teamCountInput = document.getElementById('teamCount');
  if (teamCountInput) {
    teamCountInput.value = '3';
    teamCountInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait for teams to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fill Team 1 - Small Boat
    const team1Name = document.getElementById('teamName1');
    if (team1Name) team1Name.value = 'Test Team 1 - Small Boat';
    
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
    const team2Name = document.getElementById('teamName2');
    if (team2Name) team2Name.value = 'Test Team 2 - Standard Boat';
    
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
    const team3Name = document.getElementById('teamName3');
    if (team3Name) team3Name.value = 'Test Team 3 - Standard Boat';
    
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
  if (step < 1 || step > totalSteps) {
	Logger.error(`Invalid step: ${step}`);
    return;
  }
  
  currentStep = step;
  
  // Update stepper
  updateStepper();
  
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
  if (!wizardMount) {
	Logger.error('loadStepContent: wizardMount not found');
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
  wizardMount.innerHTML = '';
  wizardMount.appendChild(content);
  
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
 * Initialize Step 1: Team Details (Boat Type + Division)
 */
function initStep1() {
	Logger.debug('🎯 initStep1: Initializing team details step');
  
  const teamCountInput = document.getElementById('teamCount');
  const teamDetailsContainer = document.getElementById('teamDetailsContainer');
  const teamDetailsList = document.getElementById('teamDetailsList');
  
  if (!teamCountInput || !teamDetailsContainer || !teamDetailsList) {
	Logger.error('Step 1 elements not found');
    return;
  }
  
  // Handle team count change (both input and change events)
  const handleTeamCountChange = async (e) => {
    const count = parseInt(e.target.value) || 0;
	Logger.debug('Team count changed to:', count);
    
    if (count > 0) {
      teamDetailsContainer.hidden = false;
      await renderTeamDetails(count);
    } else {
      teamDetailsContainer.hidden = true;
      teamDetailsList.innerHTML = '';
    }
  };
  
  teamCountInput.addEventListener('input', handleTeamCountChange);
  teamCountInput.addEventListener('change', handleTeamCountChange);
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
      localStorage.removeItem('raceApp:config:WU2025');
      localStorage.removeItem('raceApp:config:SC2025');
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
        <label for="teamName${i}" data-i18n="teamName">${t('teamName')}</label>
        <input type="text" id="teamName${i}" name="teamName${i}" required placeholder="${t('enterTeamName')}" data-i18n-placeholder="enterTeamName" />
      </div>
      <div class="form-group">
        <label style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;" data-i18n="divisionLabel">${t('divisionLabel')}</label>
        <div id="boatTypeContainer${i}">
          <div id="boatType${i}" class="radio-group"></div>
          <div class="form-group" id="entryGroupContainer${i}" style="margin-left: 1.5rem; padding-left: 1rem; border-left: 3px solid #e0e0e0; margin-top: 0.5rem;" hidden>
            <label style="font-weight: normal; font-size: 0.95em; color: #555;" data-i18n="entryGroupLabel">${t('entryGroupLabel')}</label>
            <div id="division${i}" class="radio-group"></div>
          </div>
        </div>
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
  let filteredDivisions = [];
  if (boatType === 'Standard Boat') {
    filteredDivisions = allDivisions.filter(div => {
      const nameEn = div.name_en || '';
      // Check if name contains "Standard Boat" and one of the entry group types
      return nameEn.includes('Standard Boat') && 
             (nameEn.includes('Men') || nameEn.includes('Ladies') || nameEn.includes('Mixed'));
    });
  } else if (boatType === 'Small Boat') {
    filteredDivisions = allDivisions.filter(div => {
      const nameEn = div.name_en || '';
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
  
  // Set up validation for email and phone fields
  setupStep2Validation();
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
    const teamName = sessionStorage.getItem(`${eventType}_team${i}_name`) || `${t('team')} ${i}`;
    const safeTeamName = SafeDOM.escapeHtml(teamName);
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
        <input type="email" id="manager1Email" name="manager1Email" required placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
        <div class="field-error" id="manager1EmailError"></div>
      </div>
    </div>

    <div class="form-section">
      <h4 data-i18n="teamManager2Required">${t('teamManager2Required')}</h4>
      <div class="form-group">
        <label for="manager2Name" data-i18n="nameLabel">${t('nameLabel')}</label>
        <input type="text" id="manager2Name" name="manager2Name" required placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
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
        <input type="email" id="manager2Email" name="manager2Email" required placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
        <div class="field-error" id="manager2EmailError"></div>
      </div>
    </div>

    <div class="form-section">
      <h4 data-i18n="teamManager3Optional">${t('teamManager3Optional')}</h4>
      <div class="form-group">
        <label for="manager3Name" data-i18n="nameLabelOptional">${t('nameLabelOptional')}</label>
        <input type="text" id="manager3Name" name="manager3Name" placeholder="${t('enterFullName')}" data-i18n-placeholder="enterFullName" />
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
        <input type="email" id="manager3Email" name="manager3Email" placeholder="${t('enterEmailAddress')}" data-i18n-placeholder="enterEmailAddress" />
        <div class="field-error" id="manager3EmailError"></div>
      </div>
    </div>
  `;
}

/**
 * Initialize Step 3: Race Day Arrangement
 */
function initStep3() {
	Logger.debug('🎯 initStep3: Initializing race day step');
  
  // This will be similar to TN Step 3
  // Load race day items and pricing
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
  if (sumSeason) sumSeason.textContent = cfg?.event?.season || '2025';
  
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
    const teamName = sessionStorage.getItem(`${eventType}_team${i}_name`) || `Team ${i}`;
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
    const safeTeamName = SafeDOM.escapeHtml(teamName);
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
  const teamCount = document.getElementById('teamCount');
  const t1 = (key) => window.i18n?.t?.(key) || key;
  if (!teamCount || !teamCount.value) {
    showError(t1('pleaseSelectNumberOfTeams'));
    return false;
  }
  
  const count = parseInt(teamCount.value);
  
  // Save team count
  sessionStorage.setItem(`${eventType}_team_count`, count);
  
  for (let i = 1; i <= count; i++) {
    const teamName = document.getElementById(`teamName${i}`);
    const boatType = document.querySelector(`input[name="boatType${i}"]:checked`);
    const division = document.querySelector(`input[name="division${i}"]:checked`);
    
    if (!teamName || !teamName.value.trim()) {
      showError(`Please enter team name for Team ${i}`);
      return false;
    }
    
    if (!boatType) {
      showError(`Please select Division for Team ${i}`);
      return false;
    }
    
    if (!division) {
      showError(`Please select Entry Group for Team ${i}`);
      return false;
    }
    
    // Save team data to sessionStorage
    sessionStorage.setItem(`${eventType}_team${i}_name`, teamName.value.trim());
    sessionStorage.setItem(`${eventType}_team${i}_boatType`, boatType.value);
    sessionStorage.setItem(`${eventType}_team${i}_division`, division.value);
  }
  
  return true;
}

/**
 * Validate Step 2
 */
function validateStep2() {
  const t2 = (key) => window.i18n?.t?.(key) || key;
  const orgName = document.getElementById('orgName');
  if (!orgName || !orgName.value.trim()) {
    showError(t2('pleaseEnterOrgName'));
    return false;
  }
  
  const mailingAddress = document.getElementById('mailingAddress');
  if (!mailingAddress || !mailingAddress.value.trim()) {
    showError(t2('pleaseEnterMailingAddress'));
    return false;
  }
  
  // Helper for translations
  const t = (key, params) => window.i18n?.t?.(key, params) || key;
  const invalidPhoneMsg = t('invalidPhoneError');
  const invalidEmailMsg = t('invalidEmailError');

  // Validate Manager 1 (Required)
  const manager1Name = document.getElementById('manager1Name');
  const manager1Phone = document.getElementById('manager1Phone');
  const manager1Email = document.getElementById('manager1Email');
  const manager1PhoneError = document.getElementById('manager1PhoneError');
  const manager1EmailError = document.getElementById('manager1EmailError');
  
  if (!manager1Name || !manager1Name.value.trim()) {
    showError(t('pleaseEnterManagerName', { num: 1 }));
    return false;
  }
  
  if (!manager1Phone || !manager1Phone.value.trim()) {
    showError(t('pleaseEnterManagerPhone', { num: 1 }));
    return false;
  } else if (!isValidHKPhone(manager1Phone.value.trim())) {
    showError(t('managerPhoneInvalid', { num: 1 }));
    if (manager1PhoneError) {
      manager1PhoneError.textContent = invalidPhoneMsg;
      manager1PhoneError.style.display = 'block';
    }
    return false;
  }
  
  if (!manager1Email || !manager1Email.value.trim()) {
    showError(t('pleaseEnterManagerEmail', { num: 1 }));
    return false;
  } else if (!isValidEmail(manager1Email.value.trim())) {
    showError(t('managerEmailInvalid', { num: 1 }));
    if (manager1EmailError) {
      manager1EmailError.textContent = invalidEmailMsg;
      manager1EmailError.style.display = 'block';
    }
    return false;
  }
  
  // Validate Manager 2 (Required)
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  const manager2PhoneError = document.getElementById('manager2PhoneError');
  const manager2EmailError = document.getElementById('manager2EmailError');
  
  if (!manager2Name || !manager2Name.value.trim()) {
    showError(t('pleaseEnterManagerName', { num: 2 }));
    return false;
  }
  
  if (!manager2Phone || !manager2Phone.value.trim()) {
    showError(t('pleaseEnterManagerPhone', { num: 2 }));
    return false;
  } else if (!isValidHKPhone(manager2Phone.value.trim())) {
    showError(t('managerPhoneInvalid', { num: 2 }));
    if (manager2PhoneError) {
      manager2PhoneError.textContent = invalidPhoneMsg;
      manager2PhoneError.style.display = 'block';
    }
    return false;
  }
  
  if (!manager2Email || !manager2Email.value.trim()) {
    showError(t('pleaseEnterManagerEmail', { num: 2 }));
    return false;
  } else if (!isValidEmail(manager2Email.value.trim())) {
    showError(t('managerEmailInvalid', { num: 2 }));
    if (manager2EmailError) {
      manager2EmailError.textContent = invalidEmailMsg;
      manager2EmailError.style.display = 'block';
    }
    return false;
  }
  
  // Validate Manager 3 (Optional, but if provided must be valid)
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  const manager3PhoneError = document.getElementById('manager3PhoneError');
  const manager3EmailError = document.getElementById('manager3EmailError');
  
  if (manager3Name?.value?.trim()) {
    if (!manager3Phone?.value?.trim()) {
      showError(t('pleaseEnterManagerPhone', { num: 3 }));
      return false;
    } else if (!isValidHKPhone(manager3Phone.value.trim())) {
      showError(t('managerPhoneInvalid', { num: 3 }));
      if (manager3PhoneError) {
        manager3PhoneError.textContent = invalidPhoneMsg;
        manager3PhoneError.style.display = 'block';
      }
      return false;
    }
    
    if (!manager3Email?.value?.trim()) {
      showError(t('pleaseEnterManagerEmail', { num: 3 }));
      return false;
    } else if (!isValidEmail(manager3Email.value.trim())) {
      showError(t('managerEmailInvalid', { num: 3 }));
      if (manager3EmailError) {
        manager3EmailError.textContent = invalidEmailMsg;
        manager3EmailError.style.display = 'block';
      }
      return false;
    }
  } else if (manager3Phone?.value?.trim() || manager3Email?.value?.trim()) {
    // If contact info provided but no name
    showError(t('managerPhoneProvidedNoName', { num: 3 }));
    return false;
  }
  
  // Save Step 2 data to sessionStorage with normalized phone numbers
  sessionStorage.setItem(`${eventType}_orgName`, orgName.value.trim());
  sessionStorage.setItem(`${eventType}_mailingAddress`, mailingAddress.value.trim());
  sessionStorage.setItem(`${eventType}_manager1Name`, manager1Name.value.trim());
  sessionStorage.setItem(`${eventType}_manager1Phone`, normalizeHKPhone(manager1Phone.value));
  sessionStorage.setItem(`${eventType}_manager1Email`, manager1Email.value.trim());
  sessionStorage.setItem(`${eventType}_manager2Name`, manager2Name.value.trim());
  sessionStorage.setItem(`${eventType}_manager2Phone`, normalizeHKPhone(manager2Phone.value));
  sessionStorage.setItem(`${eventType}_manager2Email`, manager2Email.value.trim());
  
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

/**
 * Show error message
 */
function showError(message) {
  const msgEl = document.getElementById('formMsg');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = 'msg error';
  }
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
      
      // Save receipt and show confirmation
      saveReceipt(clientTxId, formData);
      showConfirmation(result.data);
      
      // Clear sessionStorage
      clearSessionData();
    } else {
      Logger.error('❌ Submission error:', result.error);
      throw new Error(result.userMessage || result.error || 'Submission failed');
    }
  } catch (error) {
    Logger.error('❌ Submission error:', error);
    showError(error.message || 'Submission failed. Please try again.');
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
    const teamName = sessionStorage.getItem(`${eventType}_team${i}_name`);
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`); // e.g., "Standard Boat"
    const division = sessionStorage.getItem(`${eventType}_team${i}_division`); // e.g., "Standard Boat – Men"
    
    teams.push({
      name: teamName,
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
    eventShortRef: eventType.toUpperCase() + '2025', // Convert 'wu' to 'WU2025'
    category: teams[0]?.category || 'warm_up', // Use first team's category (Division – Entry Group)
    season: cfg?.event?.season || 2025,
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
