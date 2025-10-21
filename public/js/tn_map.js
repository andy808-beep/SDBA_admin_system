/**
 * TN Legacy Selector Map and State Collection
 * Maps legacy form selectors to universal payload structure
 */

// TN Legacy Selector Map - maps legacy IDs to universal structure
export const TN_SELECTORS = {
  contact: {
    name: '#orgName',           // Organization name (primary contact)
    email: '#contactEmail',     // Contact email (if exists)
    phone: '#contactPhone'      // Contact phone (if exists)
  },
  teams: {
    container: '#teamNameFields',
    rowQuery: 'input[id^="teamName"]',  // Legacy team name inputs
    name: 'input[id^="teamName"]',     // Individual team name inputs
    division: 'select[id^="teamDivision"]', // Team division selects (if exist)
    package: 'select[id^="teamPackage"]'    // Team package selects (if exist)
  },
  raceDay: {
    marquee: '#marqueeQty',
    steerWith: '#steerWithQty',
    steerWithout: '#steerWithoutQty',
    junkBoat: '#junkBoatQty',
    junkBoatNo: '#junkBoatNo',
    speedBoat: '#speedboatQty',
    speedBoatNo: '#speedBoatNo'
  },
  practice: {
    calendar: '#calendarContainer',
    rank2h: ['#slotPref2h_1', '#slotPref2h_2', '#slotPref2h_3'],
    rank1h: ['#slotPref1h_1', '#slotPref1h_2', '#slotPref1h_3'],
    teamSelect: '#teamSelect',
    totalHours: '#totalHours',
    extraPractice: '#extraPracticeQty',
    trainer: '#trainerQty',
    steersman: '#steersmanQty'
  }
};

/**
 * Collect TN state from legacy form elements
 * Returns universal payload structure compatible with Edge Function
 */
export function collectTNState() {
  const state = {
    contact: { name: '', email: '', phone: '' },
    teams: [],
    race_day: [],
    practice: []
  };

  // Helper function to safely get element value
  const getValue = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.value?.trim() || '' : '';
  };

  const getNumber = (selector) => {
    const val = getValue(selector);
    return val ? parseInt(val, 10) || 0 : 0;
  };

  // 1. CONTACT INFORMATION
  // Primary contact is organization name
  state.contact.name = getValue(TN_SELECTORS.contact.name);
  
  // Try to find contact email/phone if they exist
  state.contact.email = getValue(TN_SELECTORS.contact.email);
  state.contact.phone = getValue(TN_SELECTORS.contact.phone);

  // 2. TEAMS INFORMATION
  // Collect team names from legacy teamName inputs
  const teamInputs = document.querySelectorAll(TN_SELECTORS.teams.rowQuery);
  teamInputs.forEach((input, index) => {
    const teamName = input.value?.trim();
    if (teamName) {
      // Try to get division and package if they exist
      const teamId = input.id;
      const teamNum = teamId.replace('teamName', '');
      
      const divisionEl = document.querySelector(`#teamDivision${teamNum}`);
      const packageEl = document.querySelector(`#teamPackage${teamNum}`);
      
      state.teams.push({
        name: teamName,
        division: divisionEl ? divisionEl.value : '',
        package: packageEl ? packageEl.value : '',
        index: index
      });
    }
  });

  // 3. RACE DAY ARRANGEMENTS
  // Collect race day items with quantities
  const raceDayItems = [
    { code: 'marquee', qty: getNumber(TN_SELECTORS.raceDay.marquee) },
    { code: 'steer_with', qty: getNumber(TN_SELECTORS.raceDay.steerWith) },
    { code: 'steer_without', qty: getNumber(TN_SELECTORS.raceDay.steerWithout) },
    { code: 'junk_boat', qty: getNumber(TN_SELECTORS.raceDay.junkBoat), 
      boat_no: getValue(TN_SELECTORS.raceDay.junkBoatNo) },
    { code: 'speed_boat', qty: getNumber(TN_SELECTORS.raceDay.speedBoat),
      boat_no: getValue(TN_SELECTORS.raceDay.speedBoatNo) }
  ];

  // Only include items with quantity > 0
  state.race_day = raceDayItems.filter(item => item.qty > 0);

  // 4. PRACTICE PREFERENCES
  // Collect slot preferences
  const practice = {
    slotPreferences: {
      rank2h: [],
      rank1h: []
    },
    summary: {
      totalHours: getNumber(TN_SELECTORS.practice.totalHours),
      extraPractice: getNumber(TN_SELECTORS.practice.extraPractice),
      trainer: getNumber(TN_SELECTORS.practice.trainer),
      steersman: getNumber(TN_SELECTORS.practice.steersman)
    }
  };

  // Collect 2-hour slot preferences
  TN_SELECTORS.practice.rank2h.forEach(selector => {
    const value = getValue(selector);
    if (value) {
      practice.slotPreferences.rank2h.push(value);
    }
  });

  // Collect 1-hour slot preferences
  TN_SELECTORS.practice.rank1h.forEach(selector => {
    const value = getValue(selector);
    if (value) {
      practice.slotPreferences.rank1h.push(value);
    }
  });

  state.practice.push(practice);

  return state;
}

/**
 * Get team names from localStorage (legacy compatibility)
 * Used when team data is stored in localStorage during multi-step flow
 */
export function getTeamNamesFromStorage() {
  try {
    const stored = localStorage.getItem('team_names');
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.warn('Failed to parse team_names from localStorage:', err);
    return [];
  }
}

/**
 * Get team options from localStorage (legacy compatibility)
 * Used when team package options are stored in localStorage
 */
export function getTeamOptionsFromStorage() {
  try {
    const stored = localStorage.getItem('team_options');
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.warn('Failed to parse team_options from localStorage:', err);
    return [];
  }
}

/**
 * Get race day arrangement from localStorage (legacy compatibility)
 * Used when race day data is stored during multi-step flow
 */
export function getRaceDayFromStorage() {
  try {
    const stored = localStorage.getItem('race_day_arrangement');
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.warn('Failed to parse race_day_arrangement from localStorage:', err);
    return null;
  }
}

/**
 * Get practice data from localStorage (legacy compatibility)
 * Used when practice data is stored per team during multi-step flow
 */
export function getPracticeDataFromStorage(teamIndex) {
  try {
    const stored = localStorage.getItem(`practiceData_team${teamIndex}`);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.warn(`Failed to parse practiceData_team${teamIndex} from localStorage:`, err);
    return null;
  }
}

/**
 * Collect complete TN state including localStorage data
 * This is the main function to use for TN form submission
 */
export function collectCompleteTNState() {
  const state = collectTNState();
  
  // Enhance with localStorage data if available
  const teamNames = getTeamNamesFromStorage();
  const teamOptions = getTeamOptionsFromStorage();
  const raceDayData = getRaceDayFromStorage();
  
  // If we have localStorage data, use it to enhance the state
  if (teamNames.length > 0) {
    state.teams = teamNames.map((name, index) => ({
      name: name || `Team ${index + 1}`,
      option: teamOptions[index] || 'opt1',
      index: index
    }));
  }
  
  // Add race day data from localStorage if available
  if (raceDayData) {
    const raceDayItems = [];
    
    if (raceDayData.marqueeQty > 0) {
      raceDayItems.push({ code: 'marquee', qty: raceDayData.marqueeQty });
    }
    if (raceDayData.steerWithQty > 0) {
      raceDayItems.push({ code: 'steer_with', qty: raceDayData.steerWithQty });
    }
    if (raceDayData.steerWithoutQty > 0) {
      raceDayItems.push({ code: 'steer_without', qty: raceDayData.steerWithoutQty });
    }
    if (raceDayData.junkBoatQty > 0) {
      raceDayItems.push({ 
        code: 'junk_boat', 
        qty: raceDayData.junkBoatQty,
        boat_no: raceDayData.junkBoatNo 
      });
    }
    if (raceDayData.speedboatQty > 0) {
      raceDayItems.push({ 
        code: 'speed_boat', 
        qty: raceDayData.speedboatQty,
        boat_no: raceDayData.speedBoatNo 
      });
    }
    
    state.race_day = raceDayItems;
  }
  
  // Add practice data from localStorage
  const practicePreferences = [];
  teamNames.forEach((_, teamIndex) => {
    const practiceData = getPracticeDataFromStorage(teamIndex);
    if (practiceData && practiceData.dates) {
      practiceData.dates.forEach(dateInfo => {
        practicePreferences.push({
          team_index: teamIndex,
          date: dateInfo.date,
          hours: dateInfo.hours,
          helpers: dateInfo.helpers
        });
      });
    }
  });
  
  if (practicePreferences.length > 0) {
    state.practice = practicePreferences;
  }
  
  return state;
}

/**
 * Validate TN state before submission
 * Returns array of validation errors
 */
export function validateTNState(state) {
  const errors = [];
  
  // Validate contact
  if (!state.contact.name?.trim()) {
    errors.push('Organization name is required');
  }
  
  // Validate teams
  if (!state.teams || state.teams.length === 0) {
    errors.push('At least one team is required');
  } else {
    state.teams.forEach((team, index) => {
      if (!team.name?.trim()) {
        errors.push(`Team ${index + 1} name is required`);
      }
    });
  }
  
  // Validate practice preferences if any
  if (state.practice && state.practice.length > 0) {
    state.practice.forEach((pref, index) => {
      if (pref.team_index === undefined || pref.team_index < 0) {
        errors.push(`Practice preference ${index + 1} has invalid team index`);
      }
      if (!pref.date) {
        errors.push(`Practice preference ${index + 1} is missing date`);
      }
    });
  }
  
  return errors;
}
