/**
 * TN Calendar Modern Component
 * Modernized single-calendar view for practice booking
 * 
 * Features:
 * - Single calendar view with month dropdown navigation
 * - Multi-date selection with visual indicators
 * - Per-date duration and helper dropdowns in selected dates panel
 * - Per-team data storage (t1, t2, etc.)
 * - Integration with existing sessionStorage patterns
 * - Bilingual support
 */

import { readTeamRows, writeTeamRows, getCurrentTeamKey, setCurrentTeamKey } from './tn_practice_store.js';

class TNCalendarModern {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      console.error('TNCalendarModern: Container not found');
      return;
    }

    // Configuration
    this.config = {
      practiceStartDate: options.practiceStartDate || this._getConfigDate('practice_start_date') || new Date(2026, 0, 1),
      practiceEndDate: options.practiceEndDate || this._getConfigDate('practice_end_date') || new Date(2026, 7, 31),
      allowedMonths: options.allowedMonths || this._getAllowedMonths(),
      year: options.year || 2026,
      minimumHoursPerTeam: options.minimumHoursPerTeam || 12,
      maxDatesPerTeam: options.maxDatesPerTeam || 60,
      extraSessionPrice: options.extraSessionPrice || 600,
      defaultDuration: options.defaultDuration || 2,
      defaultHelper: options.defaultHelper || 'ST'
    };

    // State
    this.currentMonth = 0; // January (0-indexed)
    this.currentYear = this.config.year;
    this.currentTeam = getCurrentTeamKey();

    // DOM elements
    this.elements = {};
    this._cacheElements();

    // Initialize
    this._init();
  }

  /**
   * Get date from config
   */
  _getConfigDate(key) {
    const config = window.__CONFIG?.practice || {};
    const dateStr = config[key] || config[key.replace('practice_', 'window_')];
    return dateStr ? new Date(dateStr) : null;
  }

  /**
   * Get allowed months from config
   */
  _getAllowedMonths() {
    const start = this._getConfigDate('practice_start_date') || new Date(2026, 0, 1);
    const end = this._getConfigDate('practice_end_date') || new Date(2026, 7, 31);
    const months = [];
    const current = new Date(start);
    const endDate = new Date(end);
    
    // Normalize to start of month for comparison
    current.setDate(1);
    endDate.setDate(1);
    
    while (current <= endDate) {
      months.push(current.getMonth());
      current.setMonth(current.getMonth() + 1);
    }
    return [...new Set(months)]; // Remove duplicates
  }

  /**
   * Cache DOM elements
   */
  _cacheElements() {
    this.elements = {
      monthDropdown: this.container.querySelector('#monthDropdown'),
      yearDropdown: this.container.querySelector('#yearDropdown'),
      prevMonthBtn: this.container.querySelector('#prevMonthBtn'),
      nextMonthBtn: this.container.querySelector('#nextMonthBtn'),
      weekdayHeaders: this.container.querySelector('#weekdayHeaders'),
      daysGrid: this.container.querySelector('#daysGrid'),
      selectedDatesList: this.container.querySelector('#selectedDatesList'),
      clearAllBtn: this.container.querySelector('#clearAllDatesBtn')
    };
  }

  /**
   * Initialize calendar
   * Loads existing data from sessionStorage automatically
   */
  _init() {
    this._populateMonthDropdown();
    this._renderWeekdays();
    // Render calendar - automatically loads data from sessionStorage via _getTeamSelections()
    this._renderCalendar();
    this._renderSelectedDates();
    this._attachEventListeners();
    this._updateSummary();
    
    // Verify data was loaded
    const rows = readTeamRows(this.currentTeam) || [];
    if (rows.length > 0 && window.__DBG_TN) {
      Logger.debug(`TNCalendarModern: Loaded ${rows.length} practice dates for ${this.currentTeam} from sessionStorage`);
    }
  }

  /**
   * Get translation
   */
  _t(key, fallback = key) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key);
    }
    if (window.translations) {
      const currentLang = window.i18n?.currentLang || 'en';
      return window.translations[currentLang]?.[key] || fallback;
    }
    return fallback;
  }

  /**
   * Bilingual month names
   */
  static MONTH_NAMES = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'],
    zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月']
  };

  /**
   * Get current language
   */
  _getCurrentLanguage() {
    // Try multiple sources for current language
    if (window.i18n && typeof window.i18n.getCurrentLanguage === 'function') {
      return window.i18n.getCurrentLanguage();
    }
    if (window.i18n && window.i18n.currentLang) {
      return window.i18n.currentLang;
    }
    if (document.documentElement.lang) {
      return document.documentElement.lang.toLowerCase().split('-')[0];
    }
    const stored = localStorage.getItem('sdba_lang') || localStorage.getItem('language');
    if (stored) {
      return stored.toLowerCase().split('-')[0];
    }
    return 'en';
  }

  /**
   * Populate month dropdown with bilingual support
   */
  _populateMonthDropdown() {
    if (!this.elements.monthDropdown) return;

    const currentLang = this._getCurrentLanguage();
    const monthNames = TNCalendarModern.MONTH_NAMES[currentLang] || TNCalendarModern.MONTH_NAMES.en;

    this.elements.monthDropdown.innerHTML = '';
    this.config.allowedMonths.forEach(monthIndex => {
      const option = document.createElement('option');
      option.value = monthIndex;
      option.textContent = monthNames[monthIndex];
      option.selected = monthIndex === this.currentMonth;
      this.elements.monthDropdown.appendChild(option);
    });
  }

  /**
   * Refresh month dropdown when language changes
   * Called automatically when language change event is detected
   */
  refreshMonthDropdown() {
    this._populateMonthDropdown();
  }

  /**
   * Bilingual weekday names
   */
  static WEEKDAY_NAMES = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    zh: ['日', '一', '二', '三', '四', '五', '六']
  };

  /**
   * Duration options
   */
  static DURATION_OPTIONS = [
    { value: 1, label_en: '1 Hour', label_zh: '1 小時' },
    { value: 2, label_en: '2 Hour', label_zh: '2 小時' }
  ];

  /**
   * Helper options with code prefix
   */
  static HELPER_OPTIONS = [
    { value: 'NONE', label_en: '(NONE) No Helper', label_zh: '(NONE) 無助手' },
    { value: 'S', label_en: '(S) Steersman', label_zh: '(S) 舵手' },
    { value: 'T', label_en: '(T) Coach', label_zh: '(T) 教練' },
    { value: 'ST', label_en: '(ST) Steersman & Coach', label_zh: '(ST) 舵手及教練' }
  ];

  /**
   * Render weekday headers with bilingual support
   */
  _renderWeekdays() {
    if (!this.elements.weekdayHeaders) return;

    const currentLang = this._getCurrentLanguage();
    const weekdays = TNCalendarModern.WEEKDAY_NAMES[currentLang] || TNCalendarModern.WEEKDAY_NAMES.en;

    this.elements.weekdayHeaders.innerHTML = weekdays
      .map(day => `<div>${day}</div>`)
      .join('');
  }

  /**
   * Refresh weekday headers when language changes
   */
  refreshWeekdays() {
    this._renderWeekdays();
  }

  /**
   * Render calendar grid
   */
  _renderCalendar() {
    if (!this.elements.daysGrid) return;

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selections = this._getTeamSelections();
    this.elements.daysGrid.innerHTML = '';

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      this.elements.daysGrid.innerHTML += '<div class="day-cell empty"></div>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateStr = this._formatDateKey(date);

      // Disable: past dates OR outside practice window
      const isPast = date < today;
      
      // Normalize dates for comparison
      const startDate = this.config.practiceStartDate instanceof Date 
        ? this.config.practiceStartDate 
        : new Date(this.config.practiceStartDate);
      const endDate = this.config.practiceEndDate instanceof Date 
        ? this.config.practiceEndDate 
        : new Date(this.config.practiceEndDate);
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const isBeforeWindow = date < startDate;
      const isAfterWindow = date > endDate;
      const isDisabled = isPast || isBeforeWindow || isAfterWindow;

      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selections[dateStr] !== undefined;

      let classes = ['day-cell'];
      if (isDisabled) classes.push('disabled');
      if (isToday) classes.push('today');
      if (isSelected) classes.push('selected');

      const badge = isSelected ? '<div class="selection-badge"></div>' : '';
      const clickHandler = isDisabled ? '' : `onclick="window.TNCalendarModern?.instance?.toggleDate('${dateStr}')"`;

      this.elements.daysGrid.innerHTML += `
        <div class="${classes.join(' ')}" ${clickHandler} data-date="${dateStr}">
          ${day}
          ${badge}
        </div>
      `;
    }

    this._updateNavButtons();
  }

  /**
   * Toggle date selection
   */
  toggleDate(dateStr) {
    const selections = this._getTeamSelections();

    if (selections[dateStr]) {
      // Remove selection
      delete selections[dateStr];
    } else {
      // Check max dates limit
      if (Object.keys(selections).length >= this.config.maxDatesPerTeam) {
        const msg = this._t('maxDatesReached', `Maximum ${this.config.maxDatesPerTeam} dates allowed per team`);
        if (window.errorSystem) {
          window.errorSystem.showSystemError('maxDatesReached', { 
            params: { max: this.config.maxDatesPerTeam } 
          });
        } else {
          alert(msg);
        }
        return;
      }
      // Add selection with defaults
      selections[dateStr] = {
        duration_hours: this.config.defaultDuration,
        helper: this.config.defaultHelper
      };
    }

    this._saveTeamSelections(selections);
    this._renderCalendar();
    this._renderSelectedDates();
    this._updateSummary();
  }

  /**
   * Update selection field (duration or helper)
   */
  updateSelection(dateStr, field, value) {
    const selections = this._getTeamSelections();
    if (selections[dateStr]) {
      if (field === 'duration') {
        selections[dateStr].duration_hours = parseInt(value, 10);
      } else {
        selections[dateStr].helper = value;
      }
      this._saveTeamSelections(selections);
      this._updateSummary();
    }
  }

  /**
   * Remove date
   */
  removeDate(dateStr) {
    const selections = this._getTeamSelections();
    delete selections[dateStr];
    this._saveTeamSelections(selections);
    this._renderCalendar();
    this._renderSelectedDates();
    this._updateSummary();
  }

  /**
   * Clear all dates
   */
  clearAllDates() {
    if (confirm(this._t('confirmClearAll', 'Clear all selected dates?'))) {
      writeTeamRows(this.currentTeam, []);
      this._renderCalendar();
      this._renderSelectedDates();
      this._updateSummary();
    }
  }

  /**
   * Render selected dates panel
   */
  _renderSelectedDates() {
    if (!this.elements.selectedDatesList) return;

    const selections = this._getTeamSelections();
    const dates = Object.keys(selections).sort();

    if (dates.length === 0) {
      this.elements.selectedDatesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div>${this._t('noSelections', 'No practice dates selected')}</div>
          <div style="font-size: 12px; margin-top: 4px;">
            ${this._t('clickToSelect', 'Click on calendar dates to add practice sessions')}
          </div>
        </div>
      `;
      return;
    }

    const weekdays = [
      this._t('sun', 'Sun'),
      this._t('mon', 'Mon'),
      this._t('tue', 'Tue'),
      this._t('wed', 'Wed'),
      this._t('thu', 'Thu'),
      this._t('fri', 'Fri'),
      this._t('sat', 'Sat')
    ];

    this.elements.selectedDatesList.innerHTML = dates.map(dateStr => {
      const selection = selections[dateStr];
      const date = this._parseDate(dateStr);
      const weekday = weekdays[date.getDay()];
      const formattedDate = this._formatDisplayDate(date);

      // Get current language once for both dropdowns
      const currentLang = this._getCurrentLanguage();

      // Duration options - use static DURATION_OPTIONS with bilingual support
      const durationOptions = TNCalendarModern.DURATION_OPTIONS.map(opt => {
        const label = currentLang === 'zh' ? opt.label_zh : opt.label_en;
        const selected = selection.duration_hours === opt.value ? 'selected' : '';
        return `<option value="${opt.value}" ${selected}>${label}</option>`;
      }).join('');

      // Helper options - use static HELPER_OPTIONS with code prefix
      const helperOptions = TNCalendarModern.HELPER_OPTIONS.map(opt => {
        const label = currentLang === 'zh' ? opt.label_zh : opt.label_en;
        const selected = selection.helper === opt.value ? 'selected' : '';
        return `<option value="${opt.value}" ${selected}>${label}</option>`;
      }).join('');

      return `
        <div class="selected-date-item">
          <div class="date-info">
            <div class="date-text">${formattedDate}</div>
            <div class="date-weekday">${weekday}</div>
          </div>
          <div class="date-options">
            <select class="option-select" onchange="window.TNCalendarModern?.instance?.updateSelection('${dateStr}', 'duration', this.value)">
              ${durationOptions}
            </select>
            <select class="option-select" onchange="window.TNCalendarModern?.instance?.updateSelection('${dateStr}', 'helper', this.value)">
              ${helperOptions}
            </select>
          </div>
          <button class="remove-btn" onclick="window.TNCalendarModern?.instance?.removeDate('${dateStr}')" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');
  }

  /**
   * Update summary
   */
  _updateSummary() {
    const summary = this._calculateSummary();
    const summaryEl = document.getElementById('practiceSummary');
    if (!summaryEl) return;

    const totalHoursEl = document.getElementById('totalHours');
    const extraPracticeQtyEl = document.getElementById('extraPracticeQty');
    const trainerQtyEl = document.getElementById('trainerQty');
    const steersmanQtyEl = document.getElementById('steersmanQty');

    if (totalHoursEl) {
      totalHoursEl.textContent = `${summary.totalHours} / ${summary.minimumHours}`;
    }
    if (extraPracticeQtyEl) {
      extraPracticeQtyEl.textContent = summary.extraHours;
    }
    if (trainerQtyEl) {
      trainerQtyEl.textContent = summary.coachHours;
    }
    if (steersmanQtyEl) {
      steersmanQtyEl.textContent = summary.steersmanHours;
    }

    // Update validation errors
    this._updateValidationErrors(summary);
  }

  /**
   * Calculate summary
   */
  _calculateSummary() {
    const rows = readTeamRows(this.currentTeam) || [];
    
    let totalHours = 0;
    let coachHours = 0;      // T or ST
    let steersmanHours = 0;  // S or ST

    rows.forEach(row => {
      const duration = row.duration_hours || 0;
      const helper = row.helper || 'NONE';

      totalHours += duration;

      // Coach hours: T (Coach only) or ST (both)
      if (helper === 'T' || helper === 'ST') {
        coachHours += duration;
      }

      // Steersman hours: S (Steersman only) or ST (both)
      if (helper === 'S' || helper === 'ST') {
        steersmanHours += duration;
      }
    });

    const extraHours = Math.max(0, totalHours - this.config.minimumHoursPerTeam);
    const isValid = totalHours >= this.config.minimumHoursPerTeam;

    return {
      totalHours,
      minimumHours: this.config.minimumHoursPerTeam,
      extraHours,
      coachHours,
      steersmanHours,
      isValid
    };
  }

  /**
   * Update validation errors
   */
  _updateValidationErrors(summary) {
    if (!window.errorSystem) return;

    const teamNum = this.currentTeam.replace('t', '');
    const errorEl = document.getElementById(`error-practice-${this.currentTeam}`);

    if (!summary.isValid && summary.totalHours > 0) {
      const message = this._t('practiceMinimumHours', 
        `Team ${teamNum} needs at least ${summary.minimumHours} hours. Currently: ${summary.totalHours} hours.`
      );
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
      if (window.errorSystem.showFieldError) {
        window.errorSystem.showFieldError(`error-practice-${this.currentTeam}`, 'practiceMinimumHours', {
          params: { teamNum, min: summary.minimumHours, current: summary.totalHours }
        });
      }
    } else {
      if (errorEl) {
        errorEl.style.display = 'none';
      }
      if (window.errorSystem.clearErrors) {
        window.errorSystem.clearErrors(`error-practice-${this.currentTeam}`);
      }
    }
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    if (this.elements.monthDropdown) {
      this.elements.monthDropdown.addEventListener('change', () => {
        this.currentMonth = parseInt(this.elements.monthDropdown.value, 10);
        this._renderCalendar();
        this._updateNavButtons();
      });
    }

    if (this.elements.yearDropdown) {
      this.elements.yearDropdown.addEventListener('change', () => {
        this.currentYear = parseInt(this.elements.yearDropdown.value, 10);
        this._renderCalendar();
      });
    }

    if (this.elements.prevMonthBtn) {
      this.elements.prevMonthBtn.addEventListener('click', () => this._prevMonth());
    }

    if (this.elements.nextMonthBtn) {
      this.elements.nextMonthBtn.addEventListener('click', () => this._nextMonth());
    }

    if (this.elements.clearAllBtn) {
      this.elements.clearAllBtn.addEventListener('click', () => this.clearAllDates());
    }

    // Listen for language changes to refresh month dropdown and weekdays
    window.addEventListener('languageChanged', (event) => {
      if (this.elements.monthDropdown) {
        this.refreshMonthDropdown();
      }
      if (this.elements.weekdayHeaders) {
        this.refreshWeekdays();
      }
      // Also refresh selected dates panel (contains date formatting)
      this._renderSelectedDates();
    });
  }

  /**
   * Previous month
   */
  _prevMonth() {
    const currentIndex = this.config.allowedMonths.indexOf(this.currentMonth);
    if (currentIndex > 0) {
      this.currentMonth = this.config.allowedMonths[currentIndex - 1];
      if (this.elements.monthDropdown) {
        this.elements.monthDropdown.value = this.currentMonth;
      }
      this._renderCalendar();
      this._updateNavButtons();
    }
  }

  /**
   * Next month
   */
  _nextMonth() {
    const currentIndex = this.config.allowedMonths.indexOf(this.currentMonth);
    if (currentIndex < this.config.allowedMonths.length - 1) {
      this.currentMonth = this.config.allowedMonths[currentIndex + 1];
      if (this.elements.monthDropdown) {
        this.elements.monthDropdown.value = this.currentMonth;
      }
      this._renderCalendar();
      this._updateNavButtons();
    }
  }

  /**
   * Update navigation buttons
   */
  _updateNavButtons() {
    const currentIndex = this.config.allowedMonths.indexOf(this.currentMonth);
    if (this.elements.prevMonthBtn) {
      this.elements.prevMonthBtn.disabled = currentIndex === 0;
    }
    if (this.elements.nextMonthBtn) {
      this.elements.nextMonthBtn.disabled = currentIndex === this.config.allowedMonths.length - 1;
    }
  }

  /**
   * Get team selections as object
   * Reads from sessionStorage: 'tn_practice_team_t1', 'tn_practice_team_t2', etc.
   * Format: [{ pref_date: '2026-01-15', duration_hours: 2, helper: 'ST' }, ...]
   * This ensures data persistence - selections are automatically loaded on init/refresh
   */
  _getTeamSelections() {
    // Read from sessionStorage using same keys as legacy calendar
    const rows = readTeamRows(this.currentTeam) || [];
    const selections = {};
    rows.forEach(row => {
      if (row.pref_date) {
        selections[row.pref_date] = {
          duration_hours: row.duration_hours || this.config.defaultDuration,
          helper: row.helper || this.config.defaultHelper
        };
      }
    });
    return selections;
  }

  /**
   * Save team selections to sessionStorage
   * Automatically saves on every change (toggle, update, remove)
   * Format: [{ pref_date: '2026-01-15', duration_hours: 2, helper: 'ST' }, ...]
   * Storage key: 'tn_practice_team_t1', 'tn_practice_team_t2', etc.
   */
  _saveTeamSelections(selections) {
    const rows = Object.entries(selections).map(([pref_date, data]) => ({
      pref_date,
      duration_hours: data.duration_hours,
      helper: data.helper
    }));
    // Save to sessionStorage using same keys as legacy calendar
    // Key format: 'tn_practice_team_t1', 'tn_practice_team_t2', etc.
    writeTeamRows(this.currentTeam, rows);
    
    // Debug log for persistence verification
    if (window.__DBG_TN) {
      Logger.debug(`TNCalendarModern: Saved ${rows.length} practice dates for ${this.currentTeam}`);
    }
  }

  /**
   * Switch team
   */
  switchTeam(teamKey) {
    this.currentTeam = teamKey;
    setCurrentTeamKey(teamKey);
    this._renderCalendar();
    this._renderSelectedDates();
    this._updateSummary();
  }

  /**
   * Refresh calendar (e.g., after team switch)
   * Automatically loads data from sessionStorage for current team
   */
  refresh() {
    this.currentTeam = getCurrentTeamKey();
    // Re-render will automatically load data from sessionStorage via _getTeamSelections()
    this._renderCalendar();
    this._renderSelectedDates();
    this._updateSummary();
  }

  /**
   * Copy practice data from Team 1 to current team
   */
  copyFromTeam1() {
    if (this.currentTeam === 't1') {
      const msg = this._t('alreadyOnTeam1', 'Already on Team 1');
      if (window.errorSystem) {
        window.errorSystem.showSystemError('alreadyOnTeam1');
      } else {
        alert(msg);
      }
      return;
    }

    const t1Rows = readTeamRows('t1') || [];
    if (t1Rows.length === 0) {
      const msg = this._t('team1NoData', 'Team 1 has no practice dates selected');
      if (window.errorSystem) {
        window.errorSystem.showSystemError('team1NoData');
      } else {
        alert(msg);
      }
      return;
    }

    // Copy Team 1 data to current team
    writeTeamRows(this.currentTeam, t1Rows.map(r => ({ ...r })));
    
    // Refresh display
    this._renderCalendar();
    this._renderSelectedDates();
    this._updateSummary();

    // Show confirmation
    const msg = this._t('practiceCopied', 'Practice data copied from Team 1');
    if (window.errorSystem) {
      window.errorSystem.showSystemError('practiceCopied', { persistent: false, autoDismiss: 3000 });
    }
  }

  /**
   * Set team data (for loading from storage)
   */
  setTeamData(teamKey, rows) {
    writeTeamRows(teamKey, rows || []);
    if (teamKey === this.currentTeam) {
      this._renderCalendar();
      this._renderSelectedDates();
      this._updateSummary();
    }
  }

  /**
   * Public method to update summary (called from external code)
   */
  updateSummary() {
    this._updateSummary();
  }

  /**
   * Get team data for a specific team (for validation)
   * @param {string} teamKey - Team key (e.g., 't1', 't2')
   * @returns {Array} Array of practice rows with pref_date, duration_hours, helper
   */
  static getTeamData(teamKey) {
    return readTeamRows(teamKey) || [];
  }

  /**
   * Format date key (YYYY-MM-DD)
   */
  _formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse date string
   */
  _parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Format display date
   */
  _formatDisplayDate(date) {
    const currentLang = window.i18n?.currentLang || 'en';
    const locale = currentLang === 'zh' ? 'zh-TW' : 'en-US';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString(locale, options);
  }
}

// Static factory method for easy initialization
TNCalendarModern.create = function(container, options = {}) {
  const instance = new TNCalendarModern(container, options);
  window.TNCalendarModern.instance = instance;
  return instance;
};

/**
 * Static init function - can be called manually or auto-initializes
 * Populates calendar elements and team selector
 */
TNCalendarModern.init = function(options = {}) {
  // Check if already initialized
  if (window.TNCalendarModern.instance) {
    console.log('TNCalendarModern: Already initialized');
    return window.TNCalendarModern.instance;
  }

  // Find calendar container
  const container = document.querySelector('#calendarContainer');
  if (!container) {
    console.warn('TNCalendarModern.init: #calendarContainer not found');
    return null;
  }

  // Get config from window.__CONFIG or use defaults
  const p = window.__CONFIG?.practice || {};
  const practiceStartDate = p.practice_start_date ? new Date(p.practice_start_date) : new Date(2026, 0, 1);
  const practiceEndDate = p.practice_end_date ? new Date(p.practice_end_date) : new Date(2026, 7, 31);

  // Merge options with config
  const initOptions = {
    practiceStartDate: options.practiceStartDate || practiceStartDate,
    practiceEndDate: options.practiceEndDate || practiceEndDate,
    minimumHoursPerTeam: options.minimumHoursPerTeam || p.minimum_hours_per_team || 12,
    maxDatesPerTeam: options.maxDatesPerTeam || p.max_dates_per_team || 60,
    extraSessionPrice: options.extraSessionPrice || p.extra_session_price || 600,
    defaultDuration: options.defaultDuration || 2,
    defaultHelper: options.defaultHelper || 'ST',
    ...options
  };

  // Create instance
  const instance = TNCalendarModern.create('#calendarContainer', initOptions);

  // Populate team selector if it exists
  TNCalendarModern._populateTeamSelector();

  return instance;
};

/**
 * Populate team selector dropdown based on tn_team_count
 */
TNCalendarModern._populateTeamSelector = function() {
  const teamSelect = document.getElementById('teamSelect');
  if (!teamSelect) {
    return; // Team selector not found, skip
  }

  const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
  
  // Clear existing options (except first empty option if exists)
  teamSelect.innerHTML = '';

  // Add team options
  for (let i = 0; i < teamCount; i++) {
    const option = document.createElement('option');
    option.value = i.toString();
    
    // Get team name from sessionStorage
    const teamNameEn = sessionStorage.getItem(`tn_team_name_en_${i + 1}`) || '';
    const teamNameTc = sessionStorage.getItem(`tn_team_name_tc_${i + 1}`) || '';
    
    // Build display text
    let displayText = `Team ${i + 1}`;
    if (teamNameEn) {
      displayText = teamNameTc ? `${teamNameEn} (${teamNameTc})` : teamNameEn;
    }
    
    option.textContent = displayText;
    teamSelect.appendChild(option);
  }

  // Set default selection to first team
  if (teamCount > 0) {
    teamSelect.value = '0';
  }
};

// Export singleton instance
window.TNCalendarModern = TNCalendarModern;

// Export instance getter/setter for global access
window.TNCalendarModern.getInstance = function() {
  return window.TNCalendarModern.instance;
};

window.TNCalendarModern.setInstance = function(instance) {
  window.TNCalendarModern.instance = instance;
};

// Auto-initialization: Not enabled by default
// The calendar is initialized manually by tn_wizard.js via initTNCalendarModern()
// If you want auto-initialization, uncomment the following:
/*
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendarContainer')) {
      TNCalendarModern.init();
    }
  });
} else {
  // DOM already ready
  if (document.getElementById('calendarContainer')) {
    TNCalendarModern.init();
  }
}
*/

export default TNCalendarModern;

