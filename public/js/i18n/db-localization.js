/**
 * SDBA Registration Forms - Database Content Localization Helpers
 * 
 * Provides functions to get language-specific content from database objects
 * that have fields with _en and _tc suffixes.
 * 
 * Database Column Convention:
 * - English: field_en (e.g., name_en, title_en)
 * - Traditional Chinese: field_tc (e.g., name_tc, title_tc)
 * 
 * i18n Engine Language Codes:
 * - English: 'en'
 * - Traditional Chinese: 'zh'
 * 
 * This module maps 'zh' → '_tc' for database field access.
 * 
 * Usage:
 *   const name = getLocalizedField(division, 'name');
 *   const title = getDivisionName(division);
 *   const options = mapToSelectOptions(packages, 'package_code', 'title');
 * 
 * @version 1.0.0
 * @date 2025-12-15
 */

(function(window) {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  
  /**
   * Map i18n language codes to database column suffixes
   * The database uses _tc for Traditional Chinese, not _zh
   */
  const LANG_TO_SUFFIX = {
    'en': '_en',
    'zh': '_tc'
  };
  
  /**
   * Default fallback suffix if language not found
   */
  const DEFAULT_SUFFIX = '_en';
  
  /**
   * Check if we're in development mode
   */
  const isDevMode = function() {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.__I18N_DEBUG__ === true);
  };

  // ============================================
  // CORE FUNCTIONS
  // ============================================

  /**
   * Get the current database column suffix based on i18n language
   * Maps 'zh' → '_tc', 'en' → '_en'
   * 
   * @returns {string} Database column suffix (e.g., '_en', '_tc')
   */
  function getCurrentDbSuffix() {
    const lang = window.i18n ? window.i18n.getCurrentLanguage() : 'en';
    return LANG_TO_SUFFIX[lang] || DEFAULT_SUFFIX;
  }

  /**
   * Get localized field value from a database object
   * 
   * @param {Object} object - Database object (e.g., division, package, race_day_item)
   * @param {string} fieldPrefix - Field name without language suffix (e.g., 'name', 'title')
   * @returns {string} Localized value with fallback to English, or empty string if not found
   * 
   * @example
   * const division = { name_en: "Men Open", name_tc: "男子公開組" };
   * getLocalizedField(division, 'name'); // Returns based on current language
   */
  function getLocalizedField(object, fieldPrefix) {
    // Validate inputs
    if (!object || typeof object !== 'object') {
      if (isDevMode()) {
        console.warn('[db-localization] getLocalizedField: Invalid object provided', object);
      }
      return '';
    }
    
    if (!fieldPrefix || typeof fieldPrefix !== 'string') {
      if (isDevMode()) {
        console.warn('[db-localization] getLocalizedField: Invalid fieldPrefix provided', fieldPrefix);
      }
      return '';
    }
    
    // Get current language suffix
    const suffix = getCurrentDbSuffix();
    const localizedField = `${fieldPrefix}${suffix}`;
    const fallbackField = `${fieldPrefix}${DEFAULT_SUFFIX}`;
    
    // Try localized field first (e.g., name_tc)
    if (object[localizedField] !== undefined && object[localizedField] !== null && object[localizedField] !== '') {
      return String(object[localizedField]).trim();
    }
    
    // Fallback to English (e.g., name_en)
    if (object[fallbackField] !== undefined && object[fallbackField] !== null && object[fallbackField] !== '') {
      if (isDevMode() && suffix !== DEFAULT_SUFFIX) {
        console.warn(`[db-localization] Field '${localizedField}' not found, using fallback '${fallbackField}'`);
      }
      return String(object[fallbackField]).trim();
    }
    
    // Last resort: try field without suffix (some fields might not be localized)
    if (object[fieldPrefix] !== undefined && object[fieldPrefix] !== null) {
      if (isDevMode()) {
        console.warn(`[db-localization] No localized field for '${fieldPrefix}', using base field`);
      }
      return String(object[fieldPrefix]).trim();
    }
    
    // No field found
    if (isDevMode()) {
      console.warn(`[db-localization] No field found for prefix '${fieldPrefix}' in object`, object);
    }
    return '';
  }

  // ============================================
  // SPECIFIC HELPERS - Based on Database Schema
  // ============================================

  /**
   * Get localized division name
   * Table: v_divisions_public (name_en, name_tc)
   * 
   * @param {Object} division - Division object
   * @returns {string} Localized division name
   */
  function getDivisionName(division) {
    return getLocalizedField(division, 'name');
  }

  /**
   * Get localized package title
   * Table: v_packages_public (title_en, title_tc)
   * 
   * @param {Object} pkg - Package object
   * @returns {string} Localized package title
   */
  function getPackageTitle(pkg) {
    return getLocalizedField(pkg, 'title');
  }

  /**
   * Get localized race day item title
   * Table: v_race_day_items_public (title_en, title_tc)
   * 
   * @param {Object} item - Race day item object
   * @returns {string} Localized item title
   */
  function getRaceDayItemTitle(item) {
    return getLocalizedField(item, 'title');
  }

  /**
   * Get localized practice item title
   * Table: v_practice_items_public (title_en, title_tc)
   * 
   * @param {Object} item - Practice item object
   * @returns {string} Localized item title
   */
  function getPracticeItemTitle(item) {
    return getLocalizedField(item, 'title');
  }

  /**
   * Get localized UI text
   * Table: v_ui_texts_public (text_en, text_tc)
   * 
   * @param {Object} uiText - UI text object
   * @returns {string} Localized text
   */
  function getUiText(uiText) {
    return getLocalizedField(uiText, 'text');
  }

  /**
   * Get localized event long name
   * Table: v_event_config_public (event_long_name_en, event_long_name_tc)
   * 
   * @param {Object} event - Event config object
   * @returns {string} Localized event long name
   */
  function getEventLongName(event) {
    return getLocalizedField(event, 'event_long_name');
  }

  /**
   * Get localized event date string
   * Table: v_event_config_public (event_date_en, event_date_tc)
   * 
   * @param {Object} event - Event config object
   * @returns {string} Localized event date
   */
  function getEventDate(event) {
    return getLocalizedField(event, 'event_date');
  }

  /**
   * Get localized event location
   * Table: v_event_config_public (event_location_en, event_location_tc)
   * 
   * @param {Object} event - Event config object
   * @returns {string} Localized event location
   */
  function getEventLocation(event) {
    return getLocalizedField(event, 'event_location');
  }

  /**
   * Get localized timeslot label (if available)
   * Table: timeslots (label_en, label_tc - if exists)
   * 
   * @param {Object} timeslot - Timeslot object
   * @returns {string} Localized timeslot label
   */
  function getTimeslotLabel(timeslot) {
    // Try localized first, fall back to 'label' if no _en/_tc fields
    const result = getLocalizedField(timeslot, 'label');
    return result || (timeslot && timeslot.label ? String(timeslot.label) : '');
  }

  // ============================================
  // ARRAY HELPER FUNCTIONS
  // ============================================

  /**
   * Get localized field from all objects in an array
   * 
   * @param {Array<Object>} array - Array of database objects
   * @param {string} fieldPrefix - Field name without language suffix
   * @returns {Array<string>} Array of localized values
   * 
   * @example
   * const names = getLocalizedFieldArray(divisions, 'name');
   * // Returns: ["Men Open", "Ladies Open", "Mixed Open"]
   */
  function getLocalizedFieldArray(array, fieldPrefix) {
    if (!Array.isArray(array)) {
      if (isDevMode()) {
        console.warn('[db-localization] getLocalizedFieldArray: Invalid array provided', array);
      }
      return [];
    }
    
    return array.map(obj => getLocalizedField(obj, fieldPrefix)).filter(Boolean);
  }

  /**
   * Map array of objects to options for select elements
   * 
   * @param {Array<Object>} array - Array of database objects
   * @param {string} valueField - Field to use as option value (e.g., 'division_code')
   * @param {string} labelFieldPrefix - Field prefix to use as option label (e.g., 'name')
   * @returns {Array<{value: any, label: string}>} Array of option objects
   * 
   * @example
   * const options = mapToSelectOptions(divisions, 'division_code', 'name');
   * // Returns: [{ value: "MO", label: "Men Open" }, { value: "LO", label: "Ladies Open" }]
   */
  function mapToSelectOptions(array, valueField, labelFieldPrefix) {
    if (!Array.isArray(array)) {
      if (isDevMode()) {
        console.warn('[db-localization] mapToSelectOptions: Invalid array provided', array);
      }
      return [];
    }
    
    return array.map(obj => ({
      value: obj[valueField],
      label: getLocalizedField(obj, labelFieldPrefix)
    }));
  }

  /**
   * Create HTML option elements from array
   * 
   * @param {Array<Object>} array - Array of database objects
   * @param {string} valueField - Field to use as option value
   * @param {string} labelFieldPrefix - Field prefix to use as option label
   * @param {Object} options - Optional configuration
   * @param {string} options.placeholderKey - Translation key for placeholder option
   * @param {string} options.placeholderValue - Value for placeholder option (default: '')
   * @returns {string} HTML string of option elements
   * 
   * @example
   * selectEl.innerHTML = createSelectOptionsHtml(divisions, 'division_code', 'name', {
   *   placeholderKey: 'pleaseChoose'
   * });
   */
  function createSelectOptionsHtml(array, valueField, labelFieldPrefix, options = {}) {
    let html = '';
    
    // Add placeholder option if specified
    if (options.placeholderKey) {
      const placeholderText = window.i18n ? window.i18n.t(options.placeholderKey) : options.placeholderKey;
      const placeholderValue = options.placeholderValue !== undefined ? options.placeholderValue : '';
      html += `<option value="${placeholderValue}">${escapeHtml(placeholderText)}</option>`;
    }
    
    // Add options from array
    if (Array.isArray(array)) {
      array.forEach(obj => {
        const value = obj[valueField];
        const label = getLocalizedField(obj, labelFieldPrefix);
        html += `<option value="${escapeHtml(String(value))}">${escapeHtml(label)}</option>`;
      });
    }
    
    return html;
  }

  /**
   * Find object by value and return localized label
   * 
   * @param {Array<Object>} array - Array to search
   * @param {string} valueField - Field name containing the value
   * @param {*} value - Value to find
   * @param {string} labelFieldPrefix - Field prefix for the label
   * @returns {string} Localized label or empty string
   * 
   * @example
   * const divisionName = findAndGetLabel(divisions, 'division_code', 'MO', 'name');
   * // Returns: "Men Open" or "男子公開組"
   */
  function findAndGetLabel(array, valueField, value, labelFieldPrefix) {
    if (!Array.isArray(array)) return '';
    
    const found = array.find(obj => obj[valueField] === value);
    return found ? getLocalizedField(found, labelFieldPrefix) : '';
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Escape HTML special characters
   * @private
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Re-render localized content when language changes
   * Dispatches 'dbLocalizationChanged' event for components to listen to
   * @private
   */
  function reRenderLocalizedContent(event) {
    if (isDevMode()) {
      console.log('[db-localization] Language changed, dispatching dbLocalizationChanged event');
    }
    
    // Dispatch a custom event for components to re-render database content
    const dbEvent = new CustomEvent('dbLocalizationChanged', {
      detail: {
        lang: event.detail.lang,
        previousLang: event.detail.previousLang,
        dbSuffix: getCurrentDbSuffix()
      },
      bubbles: true,
      cancelable: false
    });
    
    window.dispatchEvent(dbEvent);
  }

  // ============================================
  // DEBUG HELPER
  // ============================================

  /**
   * Debug helper: Check which fields are available on an object
   * Only works in development mode
   * 
   * @param {Object} object - Database object to inspect
   * @param {string} fieldPrefix - Base field name
   */
  function debugLocalizedFields(object, fieldPrefix) {
    if (!isDevMode() || typeof console === 'undefined') return;
    
    const suffix = getCurrentDbSuffix();
    const localizedField = `${fieldPrefix}${suffix}`;
    const fallbackField = `${fieldPrefix}${DEFAULT_SUFFIX}`;
    
    console.group(`🔍 Localized Fields Debug: ${fieldPrefix}`);
    console.log('Object:', object);
    console.log(`Current language:`, window.i18n?.getCurrentLanguage() || 'unknown');
    console.log(`DB suffix:`, suffix);
    console.log(`Looking for field:`, localizedField);
    console.log(`${fieldPrefix}_en:`, object?.[`${fieldPrefix}_en`] ?? '(undefined)');
    console.log(`${fieldPrefix}_tc:`, object?.[`${fieldPrefix}_tc`] ?? '(undefined)');
    console.log(`${fieldPrefix} (base):`, object?.[fieldPrefix] ?? '(undefined)');
    console.log('Will return:', getLocalizedField(object, fieldPrefix) || '(empty string)');
    console.groupEnd();
  }

  /**
   * List all localized fields in an object
   * Only works in development mode
   * 
   * @param {Object} object - Database object to inspect
   */
  function listLocalizedFields(object) {
    if (!isDevMode() || typeof console === 'undefined' || !object) return;
    
    const enFields = [];
    const tcFields = [];
    
    Object.keys(object).forEach(key => {
      if (key.endsWith('_en')) {
        enFields.push(key.replace('_en', ''));
      } else if (key.endsWith('_tc')) {
        tcFields.push(key.replace('_tc', ''));
      }
    });
    
    console.group('🔍 Localized Fields in Object');
    console.log('Fields with _en:', enFields);
    console.log('Fields with _tc:', tcFields);
    console.log('Both EN and TC:', enFields.filter(f => tcFields.includes(f)));
    console.log('Only EN:', enFields.filter(f => !tcFields.includes(f)));
    console.log('Only TC:', tcFields.filter(f => !enFields.includes(f)));
    console.groupEnd();
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  // Listen for language changes from i18n engine
  if (typeof window !== 'undefined') {
    window.addEventListener('languageChanged', reRenderLocalizedContent);
  }

  // ============================================
  // EXPORTS
  // ============================================

  // Export individual functions to window for global access
  window.getLocalizedField = getLocalizedField;
  window.getCurrentDbSuffix = getCurrentDbSuffix;
  
  // Specific helpers
  window.getDivisionName = getDivisionName;
  window.getPackageTitle = getPackageTitle;
  window.getRaceDayItemTitle = getRaceDayItemTitle;
  window.getPracticeItemTitle = getPracticeItemTitle;
  window.getUiText = getUiText;
  window.getEventLongName = getEventLongName;
  window.getEventDate = getEventDate;
  window.getEventLocation = getEventLocation;
  window.getTimeslotLabel = getTimeslotLabel;
  
  // Array helpers
  window.getLocalizedFieldArray = getLocalizedFieldArray;
  window.mapToSelectOptions = mapToSelectOptions;
  window.createSelectOptionsHtml = createSelectOptionsHtml;
  window.findAndGetLabel = findAndGetLabel;
  
  // Debug helpers
  window.debugLocalizedFields = debugLocalizedFields;
  window.listLocalizedFields = listLocalizedFields;

  // Also export as namespace for organization
  window.dbLocalization = {
    // Core
    getLocalizedField,
    getCurrentDbSuffix,
    
    // Specific helpers
    getDivisionName,
    getPackageTitle,
    getRaceDayItemTitle,
    getPracticeItemTitle,
    getUiText,
    getEventLongName,
    getEventDate,
    getEventLocation,
    getTimeslotLabel,
    
    // Array helpers
    getLocalizedFieldArray,
    mapToSelectOptions,
    createSelectOptionsHtml,
    findAndGetLabel,
    
    // Debug
    debugLocalizedFields,
    listLocalizedFields,
    
    // Configuration
    LANG_TO_SUFFIX,
    DEFAULT_SUFFIX
  };

  // CommonJS export (for Node.js testing)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.dbLocalization;
  }

  // ============================================
  // INITIALIZATION LOG
  // ============================================

  if (isDevMode()) {
    console.log('🗄️ Database Localization Helpers loaded');
    console.log('🗄️ Language → DB suffix mapping:', LANG_TO_SUFFIX);
  }

})(typeof window !== 'undefined' ? window : this);


/**
 * ============================================
 * USAGE EXAMPLES
 * ============================================
 * 
 * // ----- BASIC USAGE -----
 * 
 * // Get division name in current language
 * const division = { name_en: "Men Open", name_tc: "男子公開組", division_code: "MO" };
 * const name = getDivisionName(division);
 * console.log(name); // "Men Open" or "男子公開組" based on i18n setting
 * 
 * // Generic usage for any field
 * const title = getLocalizedField(package, 'title');
 * 
 * 
 * // ----- ARRAY HELPERS -----
 * 
 * // Get all names from array
 * const divisions = [
 *   { name_en: "Men Open", name_tc: "男子公開組" },
 *   { name_en: "Ladies Open", name_tc: "女子公開組" }
 * ];
 * const names = getLocalizedFieldArray(divisions, 'name');
 * // Returns: ["Men Open", "Ladies Open"] or ["男子公開組", "女子公開組"]
 * 
 * // Map to select options
 * const options = mapToSelectOptions(divisions, 'division_code', 'name');
 * // Returns: [{ value: "MO", label: "Men Open" }, { value: "LO", label: "Ladies Open" }]
 * 
 * // Create HTML for select element
 * const html = createSelectOptionsHtml(packages, 'package_code', 'title', {
 *   placeholderKey: 'pleaseChoose'
 * });
 * document.getElementById('packageSelect').innerHTML = html;
 * 
 * // Find and get label
 * const divisionName = findAndGetLabel(divisions, 'division_code', 'MO', 'name');
 * // Returns: "Men Open" or "男子公開組"
 * 
 * 
 * // ----- EVENT LISTENING -----
 * 
 * // Listen for database localization updates (fired when language changes)
 * window.addEventListener('dbLocalizationChanged', (event) => {
 *   console.log('DB suffix is now:', event.detail.dbSuffix);
 *   
 *   // Re-render your UI components that show database content
 *   renderDivisionDropdown();
 *   renderPackageList();
 *   renderRaceDayItems();
 * });
 * 
 * 
 * // ----- DEBUGGING -----
 * 
 * // Check fields on an object
 * debugLocalizedFields(division, 'name');
 * // Logs: field values, current language, what will be returned
 * 
 * // List all localized fields
 * listLocalizedFields(division);
 * // Logs: which fields have _en/_tc versions
 */
