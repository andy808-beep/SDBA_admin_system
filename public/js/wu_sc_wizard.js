/**
 * WU/SC Multi-Step Wizard Implementation
 * Based on TN wizard but with custom Step 1 for boat type/division selection
 */

import { sb } from '../supabase_config.js';
import { EDGE_URL, getClientTxId, getEventShortRef, postJSON, saveReceipt, showConfirmation, mapError } from './submit.js';

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
export function initWUSCWizard(eventShortRef) {
  console.log('🎯 initWUSCWizard called with:', eventShortRef);
  
  eventType = eventShortRef;
  wuScScope = document.getElementById('wuScContainer');
  wizardMount = document.getElementById('wuScWizardMount');
  
  if (!wuScScope || !wizardMount) {
    console.error('WU/SC wizard containers not found');
    return;
  }
  
  // Show WU/SC container
  wuScScope.hidden = false;
  
  // Initialize stepper
  initStepper();
  
  // Load first step
  loadStep(1);
  
  // Set up debug functions
  setupDebugFunctions();
  
  console.log('✅ WU/SC wizard initialized');
}

/**
 * Set up debug functions for testing (dev only)
 */
function setupDebugFunctions() {
  if (!window.__DEV__) return;
  
  console.log('🎯 Setting up WU/SC debug functions');
  
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
  
  console.log('🎯 Debug functions available:');
  console.log('  - fillWUSCStep1() - Fill Step 1 with 3 teams (1 SB, 2 STD)');
  console.log('  - fillWUSCStep2() - Fill Step 2 with org and manager data');
  console.log('  - fillWUSCStep3() - Fill Step 3 with race day data');
  console.log('  - fillWUSCAll() - Fill all steps and navigate to Step 3');
}

/**
 * Fill Step 1 with test data: 3 teams (1 Small Boat, 2 Standard Boats)
 */
async function fillStep1TestData() {
  console.log('🎯 Filling Step 1 with test data...');
  
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
    
    console.log('✅ Step 1 filled with test data');
  }
}

/**
 * Fill Step 2 with test data
 */
function fillStep2TestData() {
  console.log('🎯 Filling Step 2 with test data...');
  
  const orgName = document.getElementById('orgName');
  if (orgName) orgName.value = 'Test Organization Ltd';
  
  const mailingAddress = document.getElementById('mailingAddress');
  if (mailingAddress) mailingAddress.value = '123 Test Street\nCentral\nHong Kong';
  
  // Manager 1
  const manager1Name = document.getElementById('manager1Name');
  if (manager1Name) manager1Name.value = 'John Doe';
  
  const manager1Phone = document.getElementById('manager1Phone');
  if (manager1Phone) manager1Phone.value = '91234567';
  
  const manager1Email = document.getElementById('manager1Email');
  if (manager1Email) manager1Email.value = 'john@test.com';
  
  // Manager 2
  const manager2Name = document.getElementById('manager2Name');
  if (manager2Name) manager2Name.value = 'Jane Smith';
  
  const manager2Phone = document.getElementById('manager2Phone');
  if (manager2Phone) manager2Phone.value = '92345678';
  
  const manager2Email = document.getElementById('manager2Email');
  if (manager2Email) manager2Email.value = 'jane@test.com';
  
  // Manager 3 (Optional)
  const manager3Name = document.getElementById('manager3Name');
  if (manager3Name) manager3Name.value = 'Bob Wilson';
  
  const manager3Phone = document.getElementById('manager3Phone');
  if (manager3Phone) manager3Phone.value = '93456789';
  
  const manager3Email = document.getElementById('manager3Email');
  if (manager3Email) manager3Email.value = 'bob@test.com';
  
  console.log('✅ Step 2 filled with test data');
}

/**
 * Fill Step 3 with test data
 */
function fillStep3TestData() {
  console.log('🎯 Filling Step 3 with test data...');
  
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
  
  console.log('✅ Step 3 filled with test data');
}

/**
 * Fill all steps and navigate to Step 3
 */
async function fillAllTestData() {
  console.log('🎯 Filling all steps with test data...');
  
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
      
      console.log('✅ All steps filled! You are now on Step 4 (Summary)');
    } else {
      console.error('❌ Step 2 validation failed');
    }
  } else {
    console.error('❌ Step 1 validation failed');
  }
}

/**
 * Initialize stepper navigation
 */
function initStepper() {
  const stepperHTML = `
    <div class="stepper-container">
      <div class="stepper-steps">
        <div class="step ${currentStep >= 1 ? 'active' : ''}" data-step="1">1. Team Details</div>
        <div class="step ${currentStep >= 2 ? 'active' : ''}" data-step="2">2. Team Information</div>
        <div class="step ${currentStep >= 3 ? 'active' : ''}" data-step="3">3. Race Day</div>
        <div class="step ${currentStep >= 4 ? 'active' : ''}" data-step="4">4. Summary</div>
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
    console.error(`Invalid step: ${step}`);
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
  console.log(`loadStepContent: Loading step ${step}`);
  if (!wizardMount) {
    console.error('loadStepContent: wizardMount not found');
    return;
  }
  
  const templateId = `wu-sc-step-${step}`;
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
}

/**
 * Initialize Step 1: Team Details (Boat Type + Division)
 */
function initStep1() {
  console.log('🎯 initStep1: Initializing team details step');
  
  const teamCountInput = document.getElementById('teamCount');
  const teamDetailsContainer = document.getElementById('teamDetailsContainer');
  const teamDetailsList = document.getElementById('teamDetailsList');
  
  if (!teamCountInput || !teamDetailsContainer || !teamDetailsList) {
    console.error('Step 1 elements not found');
    return;
  }
  
  // Handle team count change (both input and change events)
  const handleTeamCountChange = async (e) => {
    const count = parseInt(e.target.value) || 0;
    console.log('Team count changed to:', count);
    
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
  if (!teamDetailsList) return;
  
  teamDetailsList.innerHTML = '';
  
  // Load configuration
  const cfg = window.__CONFIG;
  if (!cfg) {
    console.error('Configuration not loaded');
    return;
  }
  
  for (let i = 1; i <= count; i++) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'entry-option';
    teamDiv.innerHTML = `
      <strong>Team ${i}</strong>
      <div class="form-group">
        <label for="teamName${i}">Team Name</label>
        <input type="text" id="teamName${i}" name="teamName${i}" required />
      </div>
      <div class="form-group">
        <label style="font-weight: bold; font-size: 1.05em; color: #0f6ec7;">Division</label>
        <div id="boatTypeContainer${i}">
          <div id="boatType${i}" class="radio-group"></div>
          <div class="form-group" id="entryGroupContainer${i}" style="margin-left: 1.5rem; padding-left: 1rem; border-left: 3px solid #e0e0e0; margin-top: 0.5rem;" hidden>
            <label style="font-weight: normal; font-size: 0.95em; color: #555;">Entry Group</label>
            <div id="division${i}" class="radio-group"></div>
          </div>
        </div>
      </div>
    `;
    
    teamDetailsList.appendChild(teamDiv);
    
    // Load boat types and divisions
    await loadBoatTypesForTeam(i, cfg);
    await loadDivisionsForTeam(i, cfg);
  }
}

/**
 * Load boat types for a specific team
 */
async function loadBoatTypesForTeam(teamIndex, cfg) {
  const container = document.getElementById(`boatType${teamIndex}`);
  const entryGroupContainer = document.getElementById(`entryGroupContainer${teamIndex}`);
  if (!container || !entryGroupContainer) return;
  
  const packages = cfg.packages || [];
  
  // Filter out "By Invitation" option
  const validPackages = packages.filter(pkg => pkg.title_en !== 'By Invitation');
  
  validPackages.forEach((pkg, index) => {
    const label = document.createElement('label');
    label.className = 'radio-label';
    label.innerHTML = `
      <input type="radio" id="boatType${teamIndex}_${index}" name="boatType${teamIndex}" value="${pkg.title_en}" required />
      ${pkg.title_en} - HK$${pkg.listed_unit_price.toLocaleString()}
    `;
    container.appendChild(label);
    
    // Show divisions when boat type is selected
    const radio = label.querySelector('input');
    radio.addEventListener('change', () => {
      // Move entry group container after the selected radio button
      label.parentNode.appendChild(entryGroupContainer);
      showDivisionRow(teamIndex);
    });
  });
}

/**
 * Load divisions for a specific team
 */
async function loadDivisionsForTeam(teamIndex, cfg) {
  const container = document.getElementById(`division${teamIndex}`);
  if (!container) return;
  
  const divisions = cfg.divisions || [];
  
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
  if (!divisionContainer || !entryGroupContainer) return;
  
  // Get selected boat type
  const selectedBoatType = document.querySelector(`input[name="boatType${teamIndex}"]:checked`);
  if (!selectedBoatType) return;
  
  const boatType = selectedBoatType.value;
  
  // Get all divisions from stored data
  const allDivisions = JSON.parse(divisionContainer.dataset.allDivisions || '[]');
  
  // Filter divisions based on boat type
  let filteredDivisions = [];
  if (boatType === 'Standard Boat') {
    filteredDivisions = allDivisions.filter(div => 
      div.name_en.includes('Standard Boat') && 
      (div.name_en.includes('Men') || div.name_en.includes('Ladies') || div.name_en.includes('Mixed'))
    );
  } else if (boatType === 'Small Boat') {
    filteredDivisions = allDivisions.filter(div => 
      div.name_en.includes('Small Boat') && 
      (div.name_en.includes('Men') || div.name_en.includes('Ladies') || div.name_en.includes('Mixed'))
    );
  }
  
  // Clear existing divisions
  divisionContainer.innerHTML = '';
  
  // Add filtered divisions
  filteredDivisions.forEach((div, index) => {
    const label = document.createElement('label');
    label.className = 'radio-label';
    label.innerHTML = `
      <input type="radio" id="division${teamIndex}_${index}" name="division${teamIndex}" value="${div.name_en}" required />
      ${div.name_en}
    `;
    divisionContainer.appendChild(label);
  });
  
  // Show the entire entry group container (includes label and radio buttons)
  entryGroupContainer.hidden = false;
}

/**
 * Initialize Step 2: Team Information
 */
function initStep2() {
  console.log('🎯 initStep2: Initializing team information step');
  
  // Render team name fields (read-only, from Step 1)
  renderTeamNameFields();
  
  // Render manager contact fields
  renderManagerFields();
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
  
  let html = '<h3>Teams</h3>';
  for (let i = 1; i <= teamCount; i++) {
    const teamName = sessionStorage.getItem(`${eventType}_team${i}_name`) || `Team ${i}`;
    html += `
      <div class="form-group">
        <label>Team ${i}</label>
        <input type="text" value="${teamName}" readonly style="background: #f5f5f5;" />
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
  
  container.innerHTML = `
    <div class="form-section">
      <h4>Team Manager 1 (Required)</h4>
      <div class="form-group">
        <label for="manager1Name">Name *</label>
        <input type="text" id="manager1Name" name="manager1Name" required placeholder="Enter full name" />
      </div>
      <div class="form-group">
        <label for="manager1Phone">Phone *</label>
        <input type="tel" id="manager1Phone" name="manager1Phone" required placeholder="Enter phone number" />
      </div>
      <div class="form-group">
        <label for="manager1Email">Email *</label>
        <input type="email" id="manager1Email" name="manager1Email" required placeholder="Enter email address" />
      </div>
    </div>
    
    <div class="form-section">
      <h4>Team Manager 2 (Required)</h4>
      <div class="form-group">
        <label for="manager2Name">Name *</label>
        <input type="text" id="manager2Name" name="manager2Name" required placeholder="Enter full name" />
      </div>
      <div class="form-group">
        <label for="manager2Phone">Phone *</label>
        <input type="tel" id="manager2Phone" name="manager2Phone" required placeholder="Enter phone number" />
      </div>
      <div class="form-group">
        <label for="manager2Email">Email *</label>
        <input type="email" id="manager2Email" name="manager2Email" required placeholder="Enter email address" />
      </div>
    </div>
    
    <div class="form-section">
      <h4>Team Manager 3 (Optional)</h4>
      <div class="form-group">
        <label for="manager3Name">Name</label>
        <input type="text" id="manager3Name" name="manager3Name" placeholder="Enter full name" />
      </div>
      <div class="form-group">
        <label for="manager3Phone">Phone</label>
        <input type="tel" id="manager3Phone" name="manager3Phone" placeholder="Enter phone number" />
      </div>
      <div class="form-group">
        <label for="manager3Email">Email</label>
        <input type="email" id="manager3Email" name="manager3Email" placeholder="Enter email address" />
      </div>
    </div>
  `;
}

/**
 * Initialize Step 3: Race Day Arrangement
 */
function initStep3() {
  console.log('🎯 initStep3: Initializing race day step');
  
  // This will be similar to TN Step 3
  // Load race day items and pricing
}

/**
 * Initialize Step 4: Summary
 */
function initStep4() {
  console.log('🎯 initStep4: Initializing summary step');
  
  // Populate summary with all collected data
  populateSummary();
}

/**
 * Populate the summary page with all form data
 */
function populateSummary() {
  console.log('🎯 Populating summary...');
  console.log('🎯 Event type:', eventType);
  console.log('🎯 SessionStorage keys:', Object.keys(sessionStorage).filter(k => k.includes(eventType)));
  
  const cfg = window.__CONFIG;
  
  // Basics
  const sumSeason = document.getElementById('sumSeason');
  if (sumSeason) sumSeason.textContent = cfg?.event?.season || '2025';
  
  const sumOrg = document.getElementById('sumOrg');
  const orgName = sessionStorage.getItem(`${eventType}_orgName`) || document.getElementById('orgName')?.value || '—';
  console.log('🎯 Org name:', orgName);
  if (sumOrg) sumOrg.textContent = orgName;
  
  const sumAddress = document.getElementById('sumAddress');
  const mailingAddress = sessionStorage.getItem(`${eventType}_mailingAddress`) || document.getElementById('mailingAddress')?.value || '—';
  console.log('🎯 Mailing address:', mailingAddress);
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
    tbody.innerHTML = '<tr><td colspan="4" class="muted">No teams</td></tr>';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= teamCount; i++) {
    const teamName = sessionStorage.getItem(`${eventType}_team${i}_name`) || `Team ${i}`;
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`) || '—';
    const division = sessionStorage.getItem(`${eventType}_team${i}_division`) || '—';
    
    html += `
      <tr>
        <td>${i}</td>
        <td>${teamName}</td>
        <td>${boatType}</td>
        <td>${division}</td>
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
    sumManager1.innerHTML = manager1Name !== '—' 
      ? `${manager1Name}<br/>${manager1Phone}<br/>${manager1Email}` 
      : '—';
  }
  
  // Manager 2
  const sumManager2 = document.getElementById('sumManager2');
  const manager2Name = sessionStorage.getItem(`${eventType}_manager2Name`) || '—';
  const manager2Phone = sessionStorage.getItem(`${eventType}_manager2Phone`) || '';
  const manager2Email = sessionStorage.getItem(`${eventType}_manager2Email`) || '';
  if (sumManager2) {
    sumManager2.innerHTML = manager2Name !== '—' 
      ? `${manager2Name}<br/>${manager2Phone}<br/>${manager2Email}` 
      : '—';
  }
  
  // Manager 3 (Optional)
  const sumManager3 = document.getElementById('sumManager3');
  const manager3Name = sessionStorage.getItem(`${eventType}_manager3Name`) || '';
  const manager3Phone = sessionStorage.getItem(`${eventType}_manager3Phone`) || '';
  const manager3Email = sessionStorage.getItem(`${eventType}_manager3Email`) || '';
  if (sumManager3) {
    if (manager3Name) {
      sumManager3.innerHTML = `${manager3Name}<br/>${manager3Phone}<br/>${manager3Email}`;
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
  if (!teamCount || !teamCount.value) {
    showError('Please select number of teams');
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
  const orgName = document.getElementById('orgName');
  if (!orgName || !orgName.value.trim()) {
    showError('Please enter organization name');
    return false;
  }
  
  const mailingAddress = document.getElementById('mailingAddress');
  if (!mailingAddress || !mailingAddress.value.trim()) {
    showError('Please enter mailing address');
    return false;
  }
  
  const manager1Name = document.getElementById('manager1Name');
  const manager1Phone = document.getElementById('manager1Phone');
  const manager1Email = document.getElementById('manager1Email');
  
  if (!manager1Name || !manager1Name.value.trim()) {
    showError('Please enter Team Manager 1 name');
    return false;
  }
  
  if (!manager1Phone || !manager1Phone.value.trim()) {
    showError('Please enter Team Manager 1 phone');
    return false;
  }
  
  if (!manager1Email || !manager1Email.value.trim()) {
    showError('Please enter Team Manager 1 email');
    return false;
  }
  
  const manager2Name = document.getElementById('manager2Name');
  const manager2Phone = document.getElementById('manager2Phone');
  const manager2Email = document.getElementById('manager2Email');
  
  if (!manager2Name || !manager2Name.value.trim()) {
    showError('Please enter Team Manager 2 name');
    return false;
  }
  
  if (!manager2Phone || !manager2Phone.value.trim()) {
    showError('Please enter Team Manager 2 phone');
    return false;
  }
  
  if (!manager2Email || !manager2Email.value.trim()) {
    showError('Please enter Team Manager 2 email');
    return false;
  }
  
  // Save Step 2 data to sessionStorage
  sessionStorage.setItem(`${eventType}_orgName`, orgName.value.trim());
  sessionStorage.setItem(`${eventType}_mailingAddress`, mailingAddress.value.trim());
  sessionStorage.setItem(`${eventType}_manager1Name`, manager1Name.value.trim());
  sessionStorage.setItem(`${eventType}_manager1Phone`, manager1Phone.value.trim());
  sessionStorage.setItem(`${eventType}_manager1Email`, manager1Email.value.trim());
  sessionStorage.setItem(`${eventType}_manager2Name`, manager2Name.value.trim());
  sessionStorage.setItem(`${eventType}_manager2Phone`, manager2Phone.value.trim());
  sessionStorage.setItem(`${eventType}_manager2Email`, manager2Email.value.trim());
  
  // Save optional Manager 3
  const manager3Name = document.getElementById('manager3Name');
  const manager3Phone = document.getElementById('manager3Phone');
  const manager3Email = document.getElementById('manager3Email');
  
  if (manager3Name) sessionStorage.setItem(`${eventType}_manager3Name`, manager3Name.value.trim());
  if (manager3Phone) sessionStorage.setItem(`${eventType}_manager3Phone`, manager3Phone.value.trim());
  if (manager3Email) sessionStorage.setItem(`${eventType}_manager3Email`, manager3Email.value.trim());
  
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
  console.log('🎯 submitWUSCForm: Submitting WU/SC form');
  
  try {
    // Collect form data from sessionStorage
    const formData = collectFormData();
    console.log('🎯 Form data collected:', formData);
    
    // Generate client transaction ID
    const clientTxId = getClientTxId();
    formData.client_tx_id = clientTxId;
    
    console.log('🎯 Submitting to edge function:', EDGE_URL);
    
    // Submit to edge function
    const response = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    console.log('🎯 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Submission successful:', result);
      
      // Save receipt and show confirmation
      saveReceipt(clientTxId, formData);
      showConfirmation(result);
      
      // Clear sessionStorage
      clearSessionData();
    } else {
      const error = await response.json();
      console.error('❌ Submission error:', error);
      throw new Error(error.error || 'Submission failed');
    }
  } catch (error) {
    console.error('❌ Submission error:', error);
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
  console.log('🎯 Session data cleared');
}
