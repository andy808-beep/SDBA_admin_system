/**
 * TN Legacy Wizard Implementation
 * Restores legacy multi-step form behavior with exact visual compatibility
 */

import { TN_SELECTORS, collectCompleteTNState, validateTNState } from './tn_map.js';

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
function loadStep(step) {
  if (step < 1 || step > totalSteps) {
    console.error(`Invalid step: ${step}`);
    return;
  }
  
  currentStep = step;
  
  // Update stepper
  updateStepper();
  
  // Load step content
  loadStepContent(step);
  
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
function loadStepContent(step) {
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
      initStep2();
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
  // Load entry options from config
  const config = window.__CONFIG;
  if (config?.packages) {
    const entryOptions = document.getElementById('entryOptions');
    if (entryOptions) {
      entryOptions.hidden = false;
      
      // Update option labels and prices
      const opt1Label = document.getElementById('opt1Label');
      const opt1Price = document.getElementById('opt1Price');
      const opt2Label = document.getElementById('opt2Label');
      const opt2Price = document.getElementById('opt2Price');
      
      if (opt1Label && config.packages[0]) {
        opt1Label.textContent = config.packages[0].title_en || 'Option 1';
      }
      if (opt1Price && config.packages[0]) {
        opt1Price.textContent = config.packages[0].listed_unit_price ? 
          `HK$${config.packages[0].listed_unit_price}` : '';
      }
      if (opt2Label && config.packages[1]) {
        opt2Label.textContent = config.packages[1].title_en || 'Option 2';
      }
      if (opt2Price && config.packages[1]) {
        opt2Price.textContent = config.packages[1].listed_unit_price ? 
          `HK$${config.packages[1].listed_unit_price}` : '';
      }
    }
  }
}

/**
 * Initialize Step 2 - Team Information
 */
function initStep2() {
  // Load team count from step 1
  const teamCount = sessionStorage.getItem('tn_team_count');
  if (teamCount) {
    generateTeamFields(parseInt(teamCount, 10));
  }
  
  // Load organization name from sessionStorage
  const orgName = sessionStorage.getItem('tn_org_name');
  if (orgName) {
    const orgNameEl = document.getElementById('orgName');
    if (orgNameEl) {
      orgNameEl.value = orgName;
    }
  }
}

/**
 * Generate team name fields
 */
function generateTeamFields(count) {
  const container = document.getElementById('teamNameFields');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let i = 1; i <= count; i++) {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.setAttribute('for', `teamName${i}`);
    label.textContent = `Team ${i} Name`;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `teamName${i}`;
    input.name = `teamName${i}`;
    input.placeholder = `Enter name for Team ${i}`;
    input.required = true;
    
    // Load from sessionStorage if available
    const savedName = sessionStorage.getItem(`tn_team_name_${i}`);
    if (savedName) {
      input.value = savedName;
    }
    
    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  }
}

/**
 * Initialize Step 3 - Race Day Arrangement
 */
function initStep3() {
  // Load prices from config
  const config = window.__CONFIG;
  if (config?.race_day_items) {
    config.race_day_items.forEach(item => {
      const priceEl = document.getElementById(`${item.item_code}Price`);
      if (priceEl && item.listed_unit_price) {
        priceEl.textContent = `Unit Price: HK$${item.listed_unit_price}`;
      }
    });
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
    backBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        saveCurrentStepData();
        loadStep(currentStep - 1);
      }
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        saveCurrentStepData();
        if (currentStep < totalSteps) {
          loadStep(currentStep + 1);
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
  const raceCategory = document.getElementById('raceCategory');
  const teamCount = document.getElementById('teamCount');
  
  if (!raceCategory?.value) {
    showError('Please select a race category');
    return false;
  }
  
  if (!teamCount?.value || parseInt(teamCount.value, 10) < 1) {
    showError('Please enter the number of teams');
    return false;
  }
  
  return true;
}

/**
 * Validate step 2 - Team Info
 */
function validateStep2() {
  const orgName = document.getElementById('orgName');
  const mailingAddress = document.getElementById('mailingAddress');
  
  if (!orgName?.value?.trim()) {
    showError('Please enter organization name');
    return false;
  }
  
  if (!mailingAddress?.value?.trim()) {
    showError('Please enter mailing address');
    return false;
  }
  
  return true;
}

/**
 * Validate step 3 - Race Day
 */
function validateStep3() {
  // Race day is optional, so always valid
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
  const raceCategory = document.getElementById('raceCategory');
  const teamCount = document.getElementById('teamCount');
  
  if (raceCategory?.value) {
    sessionStorage.setItem('tn_category', raceCategory.value);
  }
  
  if (teamCount?.value) {
    sessionStorage.setItem('tn_team_count', teamCount.value);
  }
}

/**
 * Save step 2 data
 */
function saveStep2Data() {
  const orgName = document.getElementById('orgName');
  const mailingAddress = document.getElementById('mailingAddress');
  
  if (orgName?.value) {
    sessionStorage.setItem('tn_org_name', orgName.value);
  }
  
  if (mailingAddress?.value) {
    sessionStorage.setItem('tn_mailing_address', mailingAddress.value);
  }
  
  // Save team names
  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10);
  for (let i = 1; i <= teamCount; i++) {
    const teamName = document.getElementById(`teamName${i}`);
    if (teamName?.value) {
      sessionStorage.setItem(`tn_team_name_${i}`, teamName.value);
    }
  }
}

/**
 * Save step 3 data
 */
function saveStep3Data() {
  const raceDayData = {
    marqueeQty: parseInt(document.getElementById('marqueeQty')?.value || '0', 10),
    steerWithQty: parseInt(document.getElementById('steerWithQty')?.value || '0', 10),
    steerWithoutQty: parseInt(document.getElementById('steerWithoutQty')?.value || '0', 10),
    junkBoatQty: parseInt(document.getElementById('junkBoatQty')?.value || '0', 10),
    junkBoatNo: document.getElementById('junkBoatNo')?.value || '',
    speedboatQty: parseInt(document.getElementById('speedboatQty')?.value || '0', 10),
    speedBoatNo: document.getElementById('speedBoatNo')?.value || ''
  };
  
  sessionStorage.setItem('tn_race_day', JSON.stringify(raceDayData));
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
