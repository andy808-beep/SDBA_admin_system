/**
 * Success Page Handler
 * Displays the success/confirmation page with registration details
 */

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
      name: 'Tuen Ng Festival (TN)',
      short_ref: 'TN2026',
      team_codes: ['S26-M001', 'S26-L001'],
      category: 'mixed_open',
      team_names: ['Sample Men Team', 'Sample Ladies Team']
    },
    'WU': {
      name: 'Warm-Up (WU)',
      short_ref: 'WU2026',
      team_codes: ['S26-M002'],
      category: 'men_open',
      team_names: ['Sample Men Team']
    },
    'SC': {
      name: 'Short Course (SC)',
      short_ref: 'SC2026',
      team_codes: ['S26-W001'],
      category: 'ladies_open',
      team_names: ['Sample Ladies Team']
    }
  };
  
  const eventInfo = eventTypes[eventType] || eventTypes['TN'];
  
  return {
    // Registration identifiers
    registration_id: '12345678-abcd-1234-abcd-1234567890ab',
    registration_number: `${eventType}2026-001`,
    
    // Team information
    team_meta_id: 'team-uuid-12345',
    team_name: eventInfo.team_names[0],
    team_name_en: eventInfo.team_names[0],
    team_codes: eventInfo.team_codes,
    teams: eventInfo.team_names.map((name, idx) => ({
      name: name,
      name_en: name,
      team_code: eventInfo.team_codes[idx]
    })),
    
    // Event information
    event_type: eventType,
    ref_event_type: eventType,
    event_short_ref: eventInfo.short_ref,
    category: eventInfo.category,
    season: 2026,
    
    // Contact information
    email: 'sample@example.com',
    contact_email: 'sample@example.com',
    
    // Timestamps
    created_at: new Date().toISOString(),
    
    // Additional info
    number_of_teams: eventInfo.team_codes.length,
    
    // Preview mode flag
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
  
  // Populate Event Type
  const eventTypeEl = document.getElementById('success-event-type');
  if (eventTypeEl) {
    eventTypeEl.textContent = getEventDisplayName(eventRef);
  }
  
  // Populate Team Names
  const teamNamesEl = document.getElementById('success-team-names');
  if (teamNamesEl) {
    // First try to get from response data
    let teamNames = null;
    if (submissionData.teams && Array.isArray(submissionData.teams) && submissionData.teams.length > 0) {
      teamNames = submissionData.teams.map(team => {
        if (team.name_en && team.name_tc) {
          return `${team.name_en} (${team.name_tc})`;
        } else if (team.name_en) {
          return team.name_en;
        } else if (team.name_tc) {
          return team.name_tc;
        } else if (team.name) {
          return team.name;
        }
        return null;
      }).filter(Boolean);
    } else if (submissionData.team_name) {
      // Single team name from response
      teamNames = [submissionData.team_name];
    }
    
    // Fallback to sessionStorage
    if (!teamNames || teamNames.length === 0) {
      teamNames = getTeamNames(eventRef);
    }
    
    if (teamNames && teamNames.length > 0) {
      teamNamesEl.innerHTML = teamNames.map(name => 
        `<div style="margin-bottom: 0.5rem;">${name}</div>`
      ).join('');
    } else {
      teamNamesEl.textContent = 'N/A';
    }
  }
  
  // Populate Team Codes
  // NOTE: Team codes are only generated on admin approval, not at submission
  const teamCodesEl = document.getElementById('success-team-codes');
  if (teamCodesEl) {
    const codesArray = Array.isArray(teamCodes) ? teamCodes : (teamCodes ? [teamCodes] : []);
    if (codesArray.length > 0 && codesArray[0] && codesArray[0] !== 'N/A') {
      // Team codes exist (only in preview mode or after approval)
      teamCodesEl.innerHTML = codesArray.join(', ');
      teamCodesEl.classList.remove('pending');
    } else {
      // Normal case: submission successful but pending approval
      teamCodesEl.innerHTML = '<span class="pending-badge">⏳ Pending Approval</span>';
      teamCodesEl.classList.add('pending');
    }
  }
  
  // Populate Number of Teams
  const numberOfTeamsEl = document.getElementById('success-number-of-teams');
  if (numberOfTeamsEl) {
    const codesArray = Array.isArray(teamCodes) ? teamCodes : (teamCodes ? [teamCodes] : []);
    numberOfTeamsEl.textContent = codesArray.length > 0 ? codesArray.length.toString() : 'N/A';
  }
  
  // Populate Email
  const emailEl = document.getElementById('success-email');
  if (emailEl) {
    emailEl.textContent = email;
  }
  
  // Populate Timestamp
  const timestampEl = document.getElementById('success-timestamp');
  if (timestampEl) {
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    timestampEl.textContent = formattedDate;
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
      const teamCodes = Array.isArray(receipt.team_codes) 
        ? receipt.team_codes.join(', ') 
        : (receipt.team_codes || 'N/A');
      const teamNames = getTeamNames(eventRef);
      const teamNamesText = teamNames ? teamNames.join('\n') : 'N/A';
      const timestampEl = document.getElementById('success-timestamp');
      const registrationNumber = receipt.registration_number || 'N/A';
      
      const teamCodesText = teamCodes && teamCodes !== 'N/A' && !teamCodes.includes('Pending')
        ? `Team Codes: ${teamCodes}\n`
        : `Team Codes: Pending Approval\n`;
      
      const text = `Registration Confirmation\n\n` +
        `Registration Number: ${registrationNumber}\n` +
        `Event Type: ${eventName}\n` +
        `Team Names:\n${teamNamesText}\n` +
        teamCodesText +
        `Number of Teams: ${teamCodes && teamCodes !== 'N/A' ? teamCodes.split(', ').length : 'N/A'}\n` +
        `Email: ${receipt.email || 'N/A'}\n` +
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
  
  // Set up print button
  const printBtn = document.getElementById('printReceiptBtn');
  if (printBtn) {
    const newPrintBtn = printBtn.cloneNode(true);
    printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
    
    newPrintBtn.addEventListener('click', function() {
      window.print();
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

