/**
 * TN Legacy Wizard Verification Script
 * Verifies all "Done when" criteria are met
 */

/**
 * Verify TN uses template cloning (no new elements)
 */
function verifyTemplateCloning() {
  console.log('🔍 Verifying TN template cloning...');
  
  const results = {
    templatesLoaded: false,
    templateCloning: false,
    noNewElements: false,
    legacyIds: false
  };
  
  // Check if templates are loaded
  const templates = [
    'tn-step-1', 'tn-step-2', 'tn-step-3', 'tn-step-4', 'tn-step-5'
  ];
  
  const loadedTemplates = templates.filter(id => document.getElementById(id));
  results.templatesLoaded = loadedTemplates.length === 5;
  
  if (results.templatesLoaded) {
    console.log('✅ All TN templates loaded');
  } else {
    console.log('❌ Missing templates:', templates.filter(id => !document.getElementById(id)));
  }
  
  // Check if wizard mount exists and is using templates
  const wizardMount = document.getElementById('wizardMount');
  if (wizardMount && wizardMount.children.length > 0) {
    results.templateCloning = true;
    console.log('✅ Template cloning active');
  } else {
    console.log('❌ Template cloning not active');
  }
  
  // Check for legacy IDs in current step
  const legacyIds = [
    'raceCategory', 'teamCount', 'orgName', 'mailingAddress',
    'marqueeQty', 'steerWithQty', 'steerWithoutQty',
    'calendarContainer', 'slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3',
    'slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3'
  ];
  
  const foundIds = legacyIds.filter(id => document.getElementById(id));
  results.legacyIds = foundIds.length > 0;
  
  if (results.legacyIds) {
    console.log('✅ Legacy IDs preserved:', foundIds);
  } else {
    console.log('❌ No legacy IDs found');
  }
  
  // Check that no new form elements are created by ui_bindings
  const uiBindingsElements = document.querySelectorAll('[data-group], [data-name]');
  results.noNewElements = uiBindingsElements.length === 0;
  
  if (results.noNewElements) {
    console.log('✅ No new elements created by ui_bindings');
  } else {
    console.log('❌ New elements found:', uiBindingsElements.length);
  }
  
  return results;
}

/**
 * Verify calendar container and ranking table
 */
function verifyCalendarAndRanking() {
  console.log('🔍 Verifying calendar container and ranking table...');
  
  const results = {
    calendarContainer: false,
    rankingTable: false,
    slotSelects: false,
    slotPopulation: false
  };
  
  // Check calendar container
  const calendarEl = document.getElementById('calendarContainer');
  results.calendarContainer = !!calendarEl;
  
  if (results.calendarContainer) {
    console.log('✅ Calendar container present');
  } else {
    console.log('❌ Calendar container missing');
  }
  
  // Check ranking table structure
  const slotPrefs = [
    'slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3',
    'slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3'
  ];
  
  const foundSelects = slotPrefs.filter(id => document.getElementById(id));
  results.slotSelects = foundSelects.length === 6;
  
  if (results.slotSelects) {
    console.log('✅ All slot preference selects present');
  } else {
    console.log('❌ Missing slot selects:', slotPrefs.filter(id => !document.getElementById(id)));
  }
  
  // Check if selects are populated
  const populatedSelects = foundSelects.filter(id => {
    const select = document.getElementById(id);
    return select && select.options.length > 1; // More than just "-- Select --"
  });
  
  results.slotPopulation = populatedSelects.length > 0;
  
  if (results.slotPopulation) {
    console.log('✅ Slot selects populated with options');
  } else {
    console.log('❌ Slot selects not populated');
  }
  
  // Check for ranking table structure
  const slotTable = document.querySelector('.slot-table');
  results.rankingTable = !!slotTable;
  
  if (results.rankingTable) {
    console.log('✅ Ranking table present');
  } else {
    console.log('❌ Ranking table missing');
  }
  
  return results;
}

/**
 * Verify selector mapping to payload
 */
function verifySelectorMapping() {
  console.log('🔍 Verifying selector mapping to payload...');
  
  const results = {
    selectorMap: false,
    stateCollection: false,
    payloadStructure: false,
    legacyCompatibility: false
  };
  
  // Check if TN_SELECTORS is available
  if (typeof TN_SELECTORS !== 'undefined') {
    results.selectorMap = true;
    console.log('✅ TN_SELECTORS map available');
  } else {
    console.log('❌ TN_SELECTORS map not available');
  }
  
  // Check if state collection functions are available
  if (typeof collectTNState === 'function' && typeof collectCompleteTNState === 'function') {
    results.stateCollection = true;
    console.log('✅ State collection functions available');
  } else {
    console.log('❌ State collection functions not available');
  }
  
  // Test state collection
  try {
    const state = collectCompleteTNState();
    results.payloadStructure = !!state && 
      typeof state.contact === 'object' &&
      Array.isArray(state.teams) &&
      Array.isArray(state.race_day) &&
      Array.isArray(state.practice);
    
    if (results.payloadStructure) {
      console.log('✅ Payload structure correct:', Object.keys(state));
    } else {
      console.log('❌ Invalid payload structure');
    }
  } catch (error) {
    console.log('❌ State collection failed:', error.message);
  }
  
  // Check legacy compatibility
  const legacySelectors = [
    '#orgName', '#raceCategory', '#teamCount',
    '#marqueeQty', '#steerWithQty', '#calendarContainer',
    '#slotPref2h_1', '#slotPref2h_2', '#slotPref2h_3'
  ];
  
  const mappedSelectors = legacySelectors.filter(selector => {
    const element = document.querySelector(selector);
    return element && element.id;
  });
  
  results.legacyCompatibility = mappedSelectors.length > 0;
  
  if (results.legacyCompatibility) {
    console.log('✅ Legacy selectors mapped:', mappedSelectors);
  } else {
    console.log('❌ No legacy selectors mapped');
  }
  
  return results;
}

/**
 * Verify legacy patterns for submit/totals/validation
 */
function verifyLegacyPatterns() {
  console.log('🔍 Verifying legacy patterns...');
  
  const results = {
    submitPattern: false,
    totalsPattern: false,
    validationPattern: false,
    errorHandling: false
  };
  
  // Check submit pattern
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn && submitBtn.textContent.includes('Submit Application')) {
    results.submitPattern = true;
    console.log('✅ Submit button follows legacy pattern');
  } else {
    console.log('❌ Submit button not following legacy pattern');
  }
  
  // Check totals pattern
  const totalElements = [
    'totalHours', 'extraPracticeQty', 'trainerQty', 'steersmanQty'
  ];
  
  const foundTotals = totalElements.filter(id => document.getElementById(id));
  results.totalsPattern = foundTotals.length > 0;
  
  if (results.totalsPattern) {
    console.log('✅ Totals elements present:', foundTotals);
  } else {
    console.log('❌ Totals elements missing');
  }
  
  // Check validation pattern
  const requiredFields = document.querySelectorAll('[required]');
  results.validationPattern = requiredFields.length > 0;
  
  if (results.validationPattern) {
    console.log('✅ Required field validation present');
  } else {
    console.log('❌ Required field validation missing');
  }
  
  // Check error handling
  const errorElements = document.querySelectorAll('.msg, .err, [role="alert"]');
  results.errorHandling = errorElements.length > 0;
  
  if (results.errorHandling) {
    console.log('✅ Error handling elements present');
  } else {
    console.log('❌ Error handling elements missing');
  }
  
  return results;
}

/**
 * Verify WU/SC forms are unaffected
 */
function verifyWUSCUnaffected() {
  console.log('🔍 Verifying WU/SC forms unaffected...');
  
  const results = {
    tnScopeIsolation: false,
    wuScContainer: false,
    cssScoping: false,
    uiBindingsGuards: false
  };
  
  // Check TN scope isolation
  const tnScope = document.getElementById('tnScope');
  const wuScContainer = document.getElementById('wuScContainer');
  
  results.tnScopeIsolation = !!tnScope;
  results.wuScContainer = !!wuScContainer;
  
  if (results.tnScopeIsolation && results.wuScContainer) {
    console.log('✅ TN scope and WU/SC containers present');
  } else {
    console.log('❌ Missing containers');
  }
  
  // Check CSS scoping
  const tnLegacyCSS = document.getElementById('tnLegacyCSS');
  const bodyDataset = document.body.dataset.event;
  
  results.cssScoping = !!tnLegacyCSS && bodyDataset === 'tn';
  
  if (results.cssScoping) {
    console.log('✅ CSS scoping active for TN');
  } else {
    console.log('❌ CSS scoping not active');
  }
  
  // Check UI bindings guards
  if (typeof isTNMode === 'function') {
    results.uiBindingsGuards = true;
    console.log('✅ UI bindings guards present');
  } else {
    console.log('❌ UI bindings guards missing');
  }
  
  return results;
}

/**
 * Run complete verification
 */
function runCompleteVerification() {
  console.log('🚀 Running complete TN verification...');
  console.log('=====================================');
  
  const results = {
    templateCloning: verifyTemplateCloning(),
    calendarRanking: verifyCalendarAndRanking(),
    selectorMapping: verifySelectorMapping(),
    legacyPatterns: verifyLegacyPatterns(),
    wuScUnaffected: verifyWUSCUnaffected()
  };
  
  console.log('=====================================');
  console.log('📊 VERIFICATION SUMMARY:');
  console.log('=====================================');
  
  const allPassed = Object.values(results).every(category => 
    Object.values(category).every(test => test === true)
  );
  
  if (allPassed) {
    console.log('🎉 ALL VERIFICATIONS PASSED!');
    console.log('✅ TN legacy wizard is ready for production');
  } else {
    console.log('⚠️  SOME VERIFICATIONS FAILED');
    console.log('❌ Please review failed tests above');
  }
  
  return results;
}

// Export for use in browser console
window.verifyTN = {
  runComplete: runCompleteVerification,
  templateCloning: verifyTemplateCloning,
  calendarRanking: verifyCalendarAndRanking,
  selectorMapping: verifySelectorMapping,
  legacyPatterns: verifyLegacyPatterns,
  wuScUnaffected: verifyWUSCUnaffected
};

// Auto-run verification if in TN mode
if (document.body.dataset.event === 'tn') {
  console.log('🔧 TN mode detected - verification tools loaded');
  console.log('💡 Run window.verifyTN.runComplete() to verify all criteria');
}
