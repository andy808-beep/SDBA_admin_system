/**
 * Success Page Handler
 * Displays the success/confirmation page with registration details
 */

/**
 * Format currency in HKD format
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'HK$0';
  return `HK$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Get total price from cost summary table (if already rendered)
 */
function getTotalFromCostSummaryTable() {
  // Try to find the total from the cost summary table
  const totalCell = document.querySelector('#pricingTotal, .total-row td:last-child, .total-row .text-right:last-child');
  if (totalCell) {
    const totalText = totalCell.textContent?.trim() || '';
    // Extract number from "HK$7,400" format
    const match = totalText.match(/HK\$\s*([\d,]+)/);
    if (match) {
      const numberStr = match[1].replace(/,/g, '');
      const number = parseInt(numberStr, 10);
      if (!isNaN(number) && number > 0) {
        return number;
      }
    }
  }
  return 0;
}

/**
 * Sync total price from cost summary table to success-total-price element
 */
function syncTotalPriceFromCostSummary() {
  const totalPriceElement = document.getElementById('success-total-price');
  if (!totalPriceElement) return;
  
  const totalFromTable = getTotalFromCostSummaryTable();
  if (totalFromTable > 0) {
    const formattedPrice = formatCurrency(totalFromTable);
    totalPriceElement.textContent = formattedPrice;
    console.log('✅ Total price synced from cost summary table:', formattedPrice);
  }
}

/**
 * Get package price from config
 */
function getPackagePriceFromConfig(packageCode) {
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
function getOrderItemPriceFromConfig(itemCode) {
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
 * Calculate total price from sessionStorage data
 * This is a fallback when total_price is not in submission response
 */
function calculateTotalPriceFromStorage(eventRef) {
  let total = 0;
  const eventType = (eventRef || '').toLowerCase();
  
  // For TN events, calculate from sessionStorage
  if (eventType === 'tn' || eventType.includes('tn')) {
    // 1. Entry fees (packages)
    const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
    for (let i = 1; i <= teamCount; i++) {
      const packageCode = sessionStorage.getItem(`tn_team_option_${i}`);
      if (packageCode) {
        total += getPackagePriceFromConfig(packageCode);
      }
    }
    
    // 2. Race day arrangements
    const raceDayDataStr = sessionStorage.getItem('tn_race_day');
    if (raceDayDataStr) {
      try {
        const raceDayData = JSON.parse(raceDayDataStr);
        
        // Marquee
        const marqueeQty = parseInt(raceDayData.marqueeQty || 0, 10);
        if (marqueeQty > 0) {
          total += marqueeQty * getOrderItemPriceFromConfig('rd_marquee');
        }
        
        // Steersman (per team)
        for (let i = 1; i <= teamCount; i++) {
          const steersmanOption = sessionStorage.getItem(`tn_team_${i}_steersman_option`) || 'not_required';
          if (steersmanOption === 'with_practice') {
            total += getOrderItemPriceFromConfig('rd_steerer');
          } else if (steersmanOption === 'no_practice') {
            total += getOrderItemPriceFromConfig('rd_steerer_no_practice');
          }
        }
        
        // Junk Boat
        const junkQty = parseInt(raceDayData.junkBoatQty || 0, 10);
        if (junkQty > 0) {
          total += junkQty * getOrderItemPriceFromConfig('rd_junk');
        }
        
        // Speed Boat
        const speedQty = parseInt(raceDayData.speedboatQty || 0, 10);
        if (speedQty > 0) {
          total += speedQty * getOrderItemPriceFromConfig('rd_speedboat');
        }
      } catch (e) {
        console.warn('Failed to parse race day data:', e);
      }
    }
    
    // 3. Practice sessions
    const { readTeamRows } = window.__DBG_TN || {};
    if (readTeamRows) {
      let extraPracticeHours = 0;
      let trainerHours = 0;
      let steersmanHours = 0;
      
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
          
          if (helper === 'T' || helper === 'ST') {
            teamTrainerHours += duration;
          }
          
          if (helper === 'S' || helper === 'ST') {
            teamSteersmanHours += duration;
          }
        });
        
        const teamExtraHours = Math.max(0, teamTotalHours - 12);
        extraPracticeHours += teamExtraHours;
        trainerHours += teamTrainerHours;
        steersmanHours += teamSteersmanHours;
      }
      
      if (extraPracticeHours > 0) {
        total += extraPracticeHours * getOrderItemPriceFromConfig('extra_practice_hr_regular');
      }
      if (trainerHours > 0) {
        total += trainerHours * getOrderItemPriceFromConfig('practice_trainer');
      }
      if (steersmanHours > 0) {
        total += steersmanHours * getOrderItemPriceFromConfig('practice_steerer');
      }
    }
  } else {
    // For WU/SC events, try to get from sessionStorage or calculate
    // This is a simplified version - can be enhanced if needed
    const savedTotal = sessionStorage.getItem(`${eventType}_total_price`);
    if (savedTotal) {
      total = parseFloat(savedTotal) || 0;
    }
  }
  
  return total;
}

/**
 * Check if we're in preview mode and show success page with mock data
 * Usage: /register?preview=success or /register?e=tn&preview=success
 * @returns {boolean} True if preview mode is active
 */
export function checkSuccessPagePreview() {
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get('preview') === 'success';
  
  if (!isPreview) {
    return false; // Not in preview mode
  }
  
  console.log('🎭 Preview Mode: Showing success page with mock data');
  
  // Determine event type from URL or default to TN
  const eventType = (urlParams.get('e') || 'tn').toUpperCase();
  
  // Generate mock data based on event type
  const mockData = generateMockSuccessData(eventType);
  
  // Display the success page with mock data
  displaySuccessPage(mockData);
  
  return true; // Preview mode active
}

/**
 * Generate mock/sample data for success page preview
 * @param {string} eventType - Event type: 'TN', 'WU', or 'SC'
 * @returns {Object} Mock submission data
 */
function generateMockSuccessData(eventType) {
  const eventTypes = {
    'TN': {
      name: 'Tuen Ng Festival Dragon Boat Races',
      long_name: 'Tuen Ng Festival International Dragon Boat Races 2026',
      short_ref: 'TN2026',
      team_codes: ['S26-M001', 'S26-L001'],
      team_names: ['Dragons Warriors', 'Phoenix Flyers'],
      category: 'mixed_open'
    },
    'WU': {
      name: 'Warm-Up Dragon Boat Races',
      long_name: 'Warm-Up Dragon Boat Championship 2026',
      short_ref: 'WU2026',
      team_codes: ['S26-M002'],
      team_names: ['Thunder Paddlers'],
      category: 'men_open'
    },
    'SC': {
      name: 'Short Course Dragon Boat Races',
      long_name: 'Short Course Dragon Boat Sprint 2026',
      short_ref: 'SC2026',
      team_codes: ['S26-W001'],
      team_names: ['Lightning Ladies'],
      category: 'ladies_open'
    }
  };
  
  const eventInfo = eventTypes[eventType] || eventTypes['TN'];
  
  return {
    registration_id: '12345678-abcd-1234-abcd-1234567890ab',
    registration_number: `${eventType}2026-001`,
    
    // Event info
    event_type: eventType,
    ref_event_type: eventType,
    event_short_ref: eventInfo.short_ref,
    event_long_name: eventInfo.long_name,
    
    // Team info
    team_meta_id: 'team-uuid-12345',
    team_name: eventInfo.team_names[0],
    team_names: eventInfo.team_names,
    team_codes: eventInfo.team_codes,
    
    // Email info (all emails receiving confirmation)
    contact_email: 'contact@sampleteam.com',
    manager_email: 'manager@sampleteam.com',
    org_email: 'org@sampleteam.com',
    email: 'contact@sampleteam.com',
    
    category: eventInfo.category,
    season: 2026,
    created_at: new Date().toISOString(),
    
    // Total price (sample calculation for preview)
    total_price: eventInfo.team_names.length * 20000, // Sample: 20k per team
    
    _isPreview: true
  };
}

/**
 * Display the success/confirmation page with registration details
 * @param {Object} submissionData - The successful submission response
 */
export function displaySuccessPage(submissionData) {
  console.log('📋 Displaying success page with data:', submissionData);
  
  // Hide all other sections
  const eventPicker = document.getElementById('eventPicker');
  const formContainer = document.getElementById('formContainer');
  const tnScope = document.getElementById('tnScope');
  const wuScContainer = document.getElementById('wuScContainer');
  
  if (eventPicker) eventPicker.style.display = 'none';
  if (formContainer) formContainer.style.display = 'none';
  if (tnScope) tnScope.style.display = 'none';
  if (wuScContainer) wuScContainer.style.display = 'none';
  
  // Show success page
  const successPage = document.getElementById('successPage');
  if (!successPage) {
    console.error('❌ Success page element not found');
    return;
  }
  
  successPage.style.display = 'block';
  
  // ========================================
  // SHOW PREVIEW BANNER IF IN PREVIEW MODE
  // ========================================
  if (submissionData._isPreview) {
    let previewBanner = document.getElementById('preview-banner');
    
    if (!previewBanner) {
      previewBanner = document.createElement('div');
      previewBanner.id = 'preview-banner';
      previewBanner.className = 'preview-banner';
      previewBanner.innerHTML = `
        <div class="preview-banner-content">
          <span class="preview-banner-icon">👁️</span>
          <span class="preview-banner-text">
            <strong>PREVIEW MODE</strong>
            <span>This is sample data for design review</span>
          </span>
          <button class="preview-banner-close" onclick="window.location.href='/register'">
            Exit Preview
          </button>
        </div>
      `;
      successPage.insertBefore(previewBanner, successPage.firstChild);
    }
    
    previewBanner.style.display = 'block';
  } else {
    // Hide preview banner if it exists but we're not in preview mode
    const previewBanner = document.getElementById('preview-banner');
    if (previewBanner) {
      previewBanner.style.display = 'none';
    }
  }
  
  // Helper function to get event display name
  function getEventDisplayName(eventRef) {
    if (!eventRef) return 'N/A';
    const eventMap = {
      'tn': 'Tuen Ng Festival',
      'TN2026': 'Tuen Ng Festival',
      'wu': 'Women\'s International Race',
      'WU2026': 'Women\'s International Race',
      'sc': 'Stanley Championship',
      'SC2026': 'Stanley Championship'
    };
    return eventMap[eventRef.toLowerCase()] || eventMap[eventRef] || eventRef;
  }
  
  // Helper function to get team names from sessionStorage
  function getTeamNames(eventRef) {
    const prefix = eventRef?.toLowerCase() || '';
    const teamNames = [];
    let i = 1;
    
    // Try to get team names from sessionStorage
    while (i <= 10) {
      const nameEn = sessionStorage.getItem(`${prefix}_team${i}_name_en`) || 
                     sessionStorage.getItem(`tn_team_name_en_${i}`);
      const nameTc = sessionStorage.getItem(`${prefix}_team${i}_name_tc`) || 
                     sessionStorage.getItem(`tn_team_name_tc_${i}`);
      
      if (nameEn) {
        const displayName = nameTc ? `${nameEn} (${nameTc})` : nameEn;
        teamNames.push(displayName);
      } else {
        break; // No more teams
      }
      i++;
    }
    
    return teamNames.length > 0 ? teamNames : null;
  }
  
  // Extract data from submission response
  // Handle different response structures
  const registrationId = submissionData.registration_id || 
                         submissionData.registration_ids?.[0] ||
                         submissionData.id || 
                         'N/A';
  
  const eventRef = submissionData.event_short_ref || 
                   submissionData.event_type ||
                   submissionData.ref_event_type ||
                   (() => {
                     // Try to get from window or sessionStorage
                     const urlParams = new URLSearchParams(window.location.search);
                     return urlParams.get('e') || sessionStorage.getItem('last_event_ref') || 'N/A';
                   })();
  
  const teamCodes = submissionData.team_codes || 
                    (Array.isArray(submissionData.registration_ids) ? submissionData.registration_ids : []) ||
                    [];
  
  const email = submissionData.email || 
                submissionData.contact?.email ||
                submissionData.confirmation_email ||
                'N/A';
  
  const timestamp = submissionData.created_at || 
                    submissionData.submitted_at ||
                    submissionData.ts ||
                    Date.now();
  
  // Extract registration_number (prominent display)
  const registrationNumber = submissionData.registration_number || null;
  
  // ========================================
  // POPULATE REGISTRATION NUMBER (PRIORITY)
  // ========================================
  const regNumEl = document.getElementById('success-registration-number');
  if (regNumEl) {
    // Check for proper registration_number (TN2026-001 format)
    if (registrationNumber && 
        registrationNumber !== 'N/A' && 
        registrationNumber !== null &&
        registrationNumber !== 'null') {
      // Use the proper format
      regNumEl.textContent = registrationNumber;
      regNumEl.style.color = 'white';
      console.log('✅ Registration number:', registrationNumber);
    } else {
      // Fallback: Format UUID nicely (first 8 chars)
      const registrationId = submissionData.registration_id || submissionData.id;
      if (registrationId) {
        const displayId = registrationId.split('-')[0].toUpperCase();
        regNumEl.textContent = displayId;
        regNumEl.style.color = 'white';
        console.log('ℹ️ Using registration_id:', displayId, '(full:', registrationId + ')');
      } else {
        regNumEl.textContent = 'ERROR - Contact Support';
        regNumEl.style.color = '#ef4444';
        console.error('❌ No registration identifier found');
      }
    }
  }
  
  // Apply theme color to registration number card based on event type
  const regCard = document.querySelector('.success-registration-number-card');
  if (regCard) {
    const eventType = (submissionData.event_type || submissionData.ref_event_type || eventRef || '').toLowerCase();
    // Remove any existing theme classes
    regCard.classList.remove('theme-tn', 'theme-wu', 'theme-sc');
    // Add appropriate theme class
    if (eventType === 'tn' || eventType.includes('tn')) {
      regCard.classList.add('theme-tn');
    } else if (eventType === 'wu' || eventType.includes('wu')) {
      regCard.classList.add('theme-wu');
    } else if (eventType === 'sc' || eventType.includes('sc')) {
      regCard.classList.add('theme-sc');
    }
  }
  
  // ========================================
  // POPULATE EVENT (LONG NAME FROM CONFIG)
  // ========================================
  const eventElement = document.getElementById('success-event');
  if (eventElement) {
    let eventName = 'N/A';
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    
    // Priority 1: Try window.__CONFIG.event (primary config source)
    // Check for event_long_name fields first (most specific)
    if (window.__CONFIG?.event) {
      const event = window.__CONFIG.event;
      if (currentLang === 'zh') {
        // Try Traditional Chinese variants
        eventName = event.event_long_name_tc || 
                   event.event_name_tc || 
                   event.event_long_name || 
                   event.event_name || 
                   event.name || 
                   'N/A';
      } else {
        // Try English variants
        eventName = event.event_long_name_en || 
                   event.event_name_en || 
                   event.event_long_name || 
                   event.event_name || 
                   event.name || 
                   'N/A';
      }
    }
    
    // Priority 2: Try window.eventConfig (legacy/alternative config source)
    if (eventName === 'N/A' && window.eventConfig) {
      if (currentLang === 'zh') {
        eventName = window.eventConfig.event_long_name_tc || 
                   window.eventConfig.event_name_tc || 
                   window.eventConfig.event_long_name || 
                   window.eventConfig.event_name || 
                   'N/A';
      } else {
        eventName = window.eventConfig.event_long_name_en || 
                   window.eventConfig.event_name_en || 
                   window.eventConfig.event_long_name || 
                   window.eventConfig.event_name || 
                   'N/A';
      }
    }
    
    // Priority 3: Use data from submission response
    if (eventName === 'N/A' && submissionData.event_long_name) {
      eventName = submissionData.event_long_name;
    }
    
    // Priority 4: Last resort - construct from event type (should rarely be needed)
    if (eventName === 'N/A') {
      const eventType = (submissionData.event_type || submissionData.ref_event_type || eventRef || '').toUpperCase();
      const eventNames = {
        'TN': 'Tuen Ng Festival Dragon Boat Races',
        'WU': 'Warm-Up Dragon Boat Races',
        'SC': 'Short Course Dragon Boat Races'
      };
      eventName = eventNames[eventType] || eventType;
      console.warn('⚠️ Using fallback event name for:', eventType, '- Config may not be loaded properly');
    }
    
    eventElement.textContent = eventName;
    console.log('✅ Event name:', eventName);
  }
  
  // ========================================
  // POPULATE TEAM NAMES (PLURAL)
  // ========================================
  const teamNamesElement = document.getElementById('success-team-names');
  if (teamNamesElement) {
    let teamNamesText = 'N/A';
    
    if (submissionData.team_names && Array.isArray(submissionData.team_names)) {
      // Multiple teams (array)
      teamNamesText = submissionData.team_names.join(', ');
    } else if (submissionData.team_name) {
      // Single team (string)
      teamNamesText = submissionData.team_name;
    } else {
      // Fallback to sessionStorage
      const teamNames = getTeamNames(eventRef);
      if (teamNames && teamNames.length > 0) {
        teamNamesText = teamNames.join(', ');
      }
    }
    
    teamNamesElement.textContent = teamNamesText;
    console.log('✅ Team names:', teamNamesText);
  }
  
  // ========================================
  // POPULATE TEAM CODES (PENDING)
  // ========================================
  const teamCodesElement = document.getElementById('success-team-codes');
  if (teamCodesElement) {
    const t = (key) => window.i18n?.t?.(key) || key;
    
    // Helper function to escape HTML safely
    const escapeHtml = (text) => {
      if (typeof text !== 'string') return text;
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    // Filter out empty/null values before processing to avoid ",," issue
    let validCodes = [];
    if (submissionData.team_codes) {
      if (Array.isArray(submissionData.team_codes)) {
        validCodes = submissionData.team_codes.filter(code => 
          code && 
          typeof code === 'string' && 
          code.trim() && 
          code !== 'null' && 
          code !== 'undefined' &&
          code !== 'Pending'
        );
      } else if (typeof submissionData.team_codes === 'string' && submissionData.team_codes.trim()) {
        validCodes = [submissionData.team_codes];
      }
    }
    
    if (validCodes.length > 0 && !submissionData._isPreview) {
      // Show actual codes (only if approved and not preview)
      const codesText = validCodes.join(', ');
      const safeCodesText = escapeHtml(codesText);
      teamCodesElement.innerHTML = `<span class="approved-badge">${safeCodesText}</span>`;
      console.log('✅ Team codes:', codesText);
    } else {
      // Show "Pending" (normal case at submission time)
      const pendingText = t('pending');
      const safePendingText = escapeHtml(pendingText);
      teamCodesElement.innerHTML = `<span class="pending-badge">${safePendingText}</span>`;
      console.log('⏳ Team codes pending approval');
    }
  }
  
  // ========================================
  // POPULATE CONFIRMATION EMAILS
  // ========================================
  const emailsElement = document.getElementById('success-confirmation-emails');
  if (emailsElement) {
    const emails = [];
    
    // Collect all emails that will receive confirmation
    if (submissionData.contact_email) {
      emails.push(submissionData.contact_email);
    }
    if (submissionData.manager_email && submissionData.manager_email !== submissionData.contact_email) {
      emails.push(submissionData.manager_email);
    }
    if (submissionData.org_email && !emails.includes(submissionData.org_email)) {
      emails.push(submissionData.org_email);
    }
    if (submissionData.email && !emails.includes(submissionData.email)) {
      emails.push(submissionData.email);
    }
    
    // Remove duplicates and format
    const uniqueEmails = [...new Set(emails)];
    const emailsText = uniqueEmails.length > 0 ? uniqueEmails.join(', ') : 'N/A';
    
    emailsElement.textContent = emailsText;
    console.log('✅ Confirmation emails:', emailsText);
  }
  
  // ========================================
  // POPULATE TOTAL PRICE
  // ========================================
  const totalPriceElement = document.getElementById('success-total-price');
  if (totalPriceElement) {
    let totalPrice = 0;
    
    // Priority 1: Try to get from submission data
    if (submissionData.total_price || submissionData.totalPrice) {
      totalPrice = parseFloat(submissionData.total_price || submissionData.totalPrice) || 0;
    } else {
      // Priority 2: Try to read from cost summary table (if already rendered)
      const costSummaryTotal = getTotalFromCostSummaryTable();
      if (costSummaryTotal > 0) {
        totalPrice = costSummaryTotal;
      } else {
        // Priority 3: Calculate from sessionStorage data (fallback)
        totalPrice = calculateTotalPriceFromStorage(eventRef);
      }
    }
    
    // Format as currency
    const formattedPrice = formatCurrency(totalPrice);
    totalPriceElement.textContent = formattedPrice;
    console.log('✅ Total price:', formattedPrice);
    
    // If still 0, try to sync from cost summary table after a delay (in case it renders later)
    if (totalPrice === 0) {
      // Try multiple times with increasing delays to catch the cost summary when it renders
      setTimeout(() => syncTotalPriceFromCostSummary(), 200);
      setTimeout(() => syncTotalPriceFromCostSummary(), 500);
      setTimeout(() => syncTotalPriceFromCostSummary(), 1000);
    }
  }
  
  // ========================================
  // POPULATE SUBMITTED AT TIMESTAMP
  // ========================================
  const timestampElement = document.getElementById('success-timestamp');
  if (timestampElement) {
    const timestamp = submissionData.created_at || new Date().toISOString();
    
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    const locale = currentLang === 'zh' ? 'zh-HK' : 'en-HK';
    
    const formatted = new Date(timestamp).toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    timestampElement.textContent = formatted;
    console.log('✅ Submitted at:', formatted);
  }
  
  // Prepare receipt object for sessionStorage
  const receipt = {
    registration_id: registrationId,
    registration_number: registrationNumber,
    team_codes: Array.isArray(teamCodes) ? teamCodes : (teamCodes ? [teamCodes] : []),
    email: email,
    event_short_ref: eventRef,
    ts: timestamp,
    version: 2
  };
  
  // Save to sessionStorage for page refresh (but NOT in preview mode)
  if (!submissionData._isPreview) {
    try {
      sessionStorage.setItem('success_receipt', JSON.stringify(receipt));
    } catch (err) {
      console.warn('Failed to save receipt to sessionStorage:', err);
    }
  }
  
  // Set up action buttons
  setupSuccessPageButtons(receipt, eventRef);
  
  // Update i18n translations for the success page
  if (window.i18n && typeof window.i18n.updateUI === 'function') {
    window.i18n.updateUI();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  console.log('✅ Success page displayed', submissionData._isPreview ? '(PREVIEW MODE)' : '');
}

/**
 * Set up action buttons on success page
 */
function setupSuccessPageButtons(receipt, eventRef) {
  // Set up copy button
  const copyBtn = document.getElementById('copyReceiptBtn');
  if (copyBtn) {
    // Remove existing listeners
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    
    newCopyBtn.addEventListener('click', async function() {
      function getTeamNames(eventRef) {
        const prefix = eventRef?.toLowerCase() || '';
        const teamNames = [];
        let i = 1;
        while (i <= 10) {
          const nameEn = sessionStorage.getItem(`${prefix}_team${i}_name_en`) || 
                         sessionStorage.getItem(`tn_team_name_en_${i}`);
          const nameTc = sessionStorage.getItem(`${prefix}_team${i}_name_tc`) || 
                         sessionStorage.getItem(`tn_team_name_tc_${i}`);
          if (nameEn) {
            const displayName = nameTc ? `${nameEn} (${nameTc})` : nameEn;
            teamNames.push(displayName);
          } else {
            break;
          }
          i++;
        }
        return teamNames.length > 0 ? teamNames : null;
      }
      
      function getEventDisplayName(eventRef) {
        if (!eventRef) return 'N/A';
        const eventMap = {
          'tn': 'Tuen Ng Festival',
          'TN2026': 'Tuen Ng Festival',
          'wu': 'Women\'s International Race',
          'WU2026': 'Women\'s International Race',
          'sc': 'Stanley Championship',
          'SC2026': 'Stanley Championship'
        };
        return eventMap[eventRef.toLowerCase()] || eventMap[eventRef] || eventRef;
      }
      
      const eventName = getEventDisplayName(eventRef);
      // Filter out empty/null values to avoid ",," issue
      let teamCodes = 'N/A';
      if (receipt.team_codes) {
        const validCodes = Array.isArray(receipt.team_codes)
          ? receipt.team_codes.filter(code => code && typeof code === 'string' && code.trim() && code !== 'null' && code !== 'undefined')
          : (typeof receipt.team_codes === 'string' && receipt.team_codes.trim() ? [receipt.team_codes] : []);
        teamCodes = validCodes.length > 0 ? validCodes.join(', ') : 'Pending';
      }
      const teamNames = getTeamNames(eventRef);
      const teamNamesText = teamNames ? teamNames.join('\n') : 'N/A';
      const timestampEl = document.getElementById('success-timestamp');
      const registrationNumber = receipt.registration_number || 'N/A';
      
      const teamCodesText = teamCodes && teamCodes !== 'N/A' && !teamCodes.includes('Pending')
        ? `Team Codes: ${teamCodes}\n`
        : `Team Codes: Pending\n`;
      
      const emailsEl = document.getElementById('success-confirmation-emails');
      const emailsText = emailsEl?.textContent || receipt.email || 'N/A';
      const eventEl = document.getElementById('success-event');
      const eventNameText = eventEl?.textContent || eventName;
      
      const text = `Registration Confirmation\n\n` +
        `Registration Number: ${registrationNumber}\n` +
        `Event: ${eventNameText}\n` +
        `Team Names: ${teamNamesText}\n` +
        teamCodesText +
        `Confirmation Emails: ${emailsText}\n` +
        `Submitted At: ${timestampEl?.textContent || 'N/A'}`;
      
      try {
        await navigator.clipboard.writeText(text);
        const originalText = this.textContent;
        this.textContent = window.i18n ? (window.i18n.t('copiedSuccess') || 'Copied!') : 'Copied!';
        setTimeout(() => {
          this.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  }
  
  // Set up navigation button
  const redirectBtn = document.getElementById('redirectNowBtn');
  if (redirectBtn) {
    const newRedirectBtn = redirectBtn.cloneNode(true);
    redirectBtn.parentNode.replaceChild(newRedirectBtn, redirectBtn);
    
    newRedirectBtn.addEventListener('click', function() {
      redirectToEventSelection();
    });
  }
}

/**
 * Redirect to event selection page
 */
function redirectToEventSelection() {
  // Clear session data
  sessionStorage.removeItem('success_receipt');
  
  // Clear form data
  const prefixes = ['tn_', 'wu_', 'sc_'];
  prefixes.forEach(prefix => {
    const keys = Object.keys(sessionStorage).filter(key => key.startsWith(prefix));
    keys.forEach(key => sessionStorage.removeItem(key));
  });
  
  // Redirect to event selection (clear URL parameters)
  window.location.href = '/register.html';
}

/**
 * Check for success page on page load
 */
export function checkForSuccessPageOnLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for preview mode first
  const isPreview = urlParams.get('preview') === 'success';
  if (isPreview) {
    if (checkSuccessPagePreview()) {
      // Preview mode is active, set flag to prevent event_bootstrap from running
      window.__SUCCESS_PAGE_ACTIVE = true;
      return;
    }
  }
  
  // Check for normal success page
  const isSuccessPage = urlParams.get('success') === 'true';
  if (isSuccessPage) {
    const savedReceipt = sessionStorage.getItem('success_receipt');
    if (savedReceipt) {
      try {
        const receiptData = JSON.parse(savedReceipt);
        displaySuccessPage(receiptData);
        // Set flag to prevent event_bootstrap from running
        window.__SUCCESS_PAGE_ACTIVE = true;
      } catch (error) {
        console.error('Failed to parse success receipt:', error);
        // Redirect to event picker if data is corrupted
        window.location.href = '/register.html';
      }
    } else {
      // No receipt data, redirect to event picker
      console.warn('No success receipt found, redirecting to event picker');
      window.location.href = '/register.html';
    }
  }
}

