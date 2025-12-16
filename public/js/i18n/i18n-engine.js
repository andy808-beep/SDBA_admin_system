/**
 * SDBA Registration Forms - Internationalization (i18n) Engine
 * 
 * Manages translations and language switching for the SDBA public registration forms.
 * 
 * Features:
 * - Translation lookup with fallback mechanism
 * - Parameter substitution using {paramName} syntax
 * - Language switching with UI auto-update
 * - LocalStorage persistence
 * - Custom event system for dynamic content updates
 * - Support for data-i18n, data-i18n-placeholder, data-i18n-title attributes
 * 
 * Usage:
 *   // Simple translation
 *   const text = window.i18n.t('submitButton');
 * 
 *   // With parameters
 *   const error = window.i18n.t('pleaseEnterTeamName', { num: 1 });
 * 
 *   // Switch language
 *   window.i18n.setLanguage('zh');
 * 
 *   // Listen for changes
 *   window.addEventListener('languageChanged', (e) => {
 *     console.log('Language changed to:', e.detail.lang);
 *   });
 * 
 * @version 1.0.0
 * @date 2025-12-15
 */

class I18n {
  /**
   * Initialize the i18n engine
   * Loads translations from window.translations and restores saved language preference
   */
  constructor() {
    // Load translations from global object (set by translations.js)
    this.translations = window.translations || {};
    
    // Storage key for language preference
    this.storageKey = 'sdba_lang';
    
    // Get saved language from localStorage, fallback to 'en'
    const savedLang = this._getFromStorage();
    this.currentLang = savedLang || 'en';
    
    // Validate that the language exists in translations
    if (!this.translations[this.currentLang]) {
      console.warn(`[i18n] Language '${this.currentLang}' not found in translations, falling back to 'en'`);
      this.currentLang = 'en';
    }
    
    // Store available languages for reference
    this.availableLanguages = Object.keys(this.translations);
    
    // Track previous language for event details
    this._previousLang = null;
    
    // Check if we're in development mode
    this._devMode = this._isDevMode();
    
    // Log initialization in dev mode
    if (this._devMode) {
      console.log('[i18n] Engine initialized');
      console.log('[i18n] Available languages:', this.availableLanguages);
      console.log('[i18n] Current language:', this.currentLang);
    }
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Translate a key to the current language with optional parameter substitution
   * 
   * @param {string} key - The translation key (e.g., 'submitButton', 'pleaseEnterTeamName')
   * @param {Object} params - Optional parameters for substitution (e.g., { num: 1, max: 100 })
   * @returns {string} The translated text, or the key itself if not found
   * 
   * @example
   * t('submitButton')                           // "Submit Application" or "提交申請"
   * t('pleaseEnterTeamName', { num: 1 })        // "Please enter team name for Team 1"
   * t('minLengthError', { min: 5 })             // "Minimum length is 5 characters"
   */
  t(key, params = {}) {
    if (!key || typeof key !== 'string') {
      if (this._devMode) {
        console.warn('[i18n] Invalid translation key:', key);
      }
      return '';
    }

    // Try to get translation for current language
    let text = this.translations[this.currentLang]?.[key];
    
    // Fallback to English if not found in current language
    if (text === undefined && this.currentLang !== 'en') {
      text = this.translations.en?.[key];
      if (text !== undefined && this._devMode) {
        console.warn(`[i18n] Key '${key}' not found in '${this.currentLang}', using English fallback`);
      }
    }
    
    // If still not found, return the key itself as fallback
    if (text === undefined) {
      if (this._devMode) {
        console.warn(`[i18n] Translation missing for key: '${key}'`);
      }
      return key;
    }
    
    // Handle parameter substitution
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      text = this._substituteParams(text, params);
    }
    
    return text;
  }

  /**
   * Change the current language and update all UI elements
   * 
   * @param {string} lang - Language code to switch to (e.g., 'en', 'zh')
   * @returns {boolean} True if language was changed successfully, false otherwise
   * 
   * @example
   * i18n.setLanguage('zh');  // Switch to Traditional Chinese
   * i18n.setLanguage('en');  // Switch back to English
   */
  setLanguage(lang) {
    // Validate language code
    if (!lang || typeof lang !== 'string') {
      console.error('[i18n] Invalid language code:', lang);
      return false;
    }
    
    // Normalize language code
    lang = lang.toLowerCase().trim();
    
    // Check if language is supported
    if (!this.translations[lang]) {
      console.error(`[i18n] Language '${lang}' is not supported. Available languages: ${this.availableLanguages.join(', ')}`);
      return false;
    }
    
    // Skip if already on this language
    if (lang === this.currentLang) {
      if (this._devMode) {
        console.log(`[i18n] Already using language '${lang}'`);
      }
      return true;
    }
    
    // Store previous language for event
    this._previousLang = this.currentLang;
    
    // Update current language
    this.currentLang = lang;
    
    // Persist to localStorage
    this._saveToStorage(lang);
    
    // Update all UI elements with new translations
    this.updateUI();
    
    // Emit language change event for dynamic content handlers
    this._emitLanguageChange();
    
    if (this._devMode) {
      console.log(`[i18n] Language changed from '${this._previousLang}' to '${lang}'`);
    }
    
    return true;
  }

  /**
   * Get the current language code
   * 
   * @returns {string} Current language code (e.g., 'en', 'zh')
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Get all available/supported languages
   * 
   * @returns {Array<string>} Array of language codes (e.g., ['en', 'zh'])
   */
  getAvailableLanguages() {
    return [...this.availableLanguages];
  }

  /**
   * Check if a language is supported
   * 
   * @param {string} lang - Language code to check
   * @returns {boolean} True if the language is supported
   */
  isLanguageSupported(lang) {
    if (!lang || typeof lang !== 'string') return false;
    return this.availableLanguages.includes(lang.toLowerCase().trim());
  }

  /**
   * Update all DOM elements with their translated content
   * Called automatically when language changes, but can be called manually
   * to refresh translations after dynamic content is added to the page.
   */
  updateUI() {
    // Update HTML lang attribute for accessibility and CSS :lang() selectors
    this._updateHtmlLang();
    
    // Update all elements with data-i18n attribute (text content)
    this._updateDataI18nElements();
    
    // Update all elements with data-i18n-placeholder attribute
    this._updatePlaceholders();
    
    // Update all elements with data-i18n-title attribute (tooltips)
    this._updateTitles();
    
    // Update document title if specified
    this._updateDocumentTitle();
    
    if (this._devMode) {
      const count = document.querySelectorAll('[data-i18n]').length;
      console.log(`[i18n] Updated ${count} UI elements`);
    }
  }

  /**
   * Manually refresh a specific element's translation
   * Useful for dynamically added elements
   * 
   * @param {HTMLElement} element - The element to update
   */
  updateElement(element) {
    if (!element || !(element instanceof HTMLElement)) return;
    
    // Update text content if has data-i18n
    if (element.hasAttribute('data-i18n')) {
      this._updateSingleElement(element);
    }
    
    // Update placeholder if has data-i18n-placeholder
    if (element.hasAttribute('data-i18n-placeholder')) {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key) {
        element.placeholder = this.t(key);
      }
    }
    
    // Update title if has data-i18n-title
    if (element.hasAttribute('data-i18n-title')) {
      const key = element.getAttribute('data-i18n-title');
      if (key) {
        element.title = this.t(key);
      }
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Replace {param} placeholders with actual values
   * @private
   */
  _substituteParams(text, params) {
    if (!text || typeof text !== 'string') return text;
    
    let result = text;
    
    for (const [key, value] of Object.entries(params)) {
      // Create regex to match {key} globally
      const placeholder = new RegExp(`\\{${this._escapeRegex(key)}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }
    
    // Warn about unsubstituted parameters in dev mode
    if (this._devMode) {
      const remaining = result.match(/\{[a-zA-Z0-9_]+\}/g);
      if (remaining) {
        console.warn(`[i18n] Unsubstituted parameters in translation: ${remaining.join(', ')}`);
      }
    }
    
    return result;
  }

  /**
   * Escape special regex characters in a string
   * @private
   */
  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Update the HTML lang attribute
   * @private
   */
  _updateHtmlLang() {
    // Map internal lang codes to proper HTML lang codes
    const langMap = {
      'en': 'en',
      'zh': 'zh-HK'  // Traditional Chinese for Hong Kong
    };
    
    const htmlLang = langMap[this.currentLang] || this.currentLang;
    document.documentElement.lang = htmlLang;
    
    // Also set dir attribute for RTL languages (future-proofing)
    // For now, both en and zh are LTR
    document.documentElement.dir = 'ltr';
  }

  /**
   * Update all elements with data-i18n attribute
   * @private
   */
  _updateDataI18nElements() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => this._updateSingleElement(el));
  }

  /**
   * Update a single element's text content based on its data-i18n attribute
   * @private
   */
  _updateSingleElement(element) {
    const key = element.getAttribute('data-i18n');
    if (!key) return;
    
    // Check for parameter data attribute
    let params = {};
    const paramsAttr = element.getAttribute('data-i18n-params');
    if (paramsAttr) {
      try {
        params = JSON.parse(paramsAttr);
      } catch (e) {
        if (this._devMode) {
          console.warn(`[i18n] Invalid JSON in data-i18n-params for key '${key}':`, paramsAttr);
        }
      }
    }
    
    // Get translated text
    const text = this.t(key, params);
    
    // Update element based on its type
    const tagName = element.tagName.toUpperCase();
    
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      // For input elements, only update value for button/submit types
      if (element.type === 'button' || element.type === 'submit') {
        element.value = text;
      }
      // For other inputs, the translation would typically be a label, not the input itself
    } else if (tagName === 'OPTION') {
      // For select options, update text content
      element.textContent = text;
    } else if (tagName === 'IMG') {
      // For images, update alt text
      element.alt = text;
    } else {
      // For all other elements, update text content
      // Check if element should preserve HTML (dangerous, use cautiously)
      if (element.hasAttribute('data-i18n-html')) {
        element.innerHTML = text;
      } else {
        element.textContent = text;
      }
    }
  }

  /**
   * Update all elements with data-i18n-placeholder attribute
   * @private
   */
  _updatePlaceholders() {
    const elements = document.querySelectorAll('[data-i18n-placeholder]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = this.t(key);
      }
    });
  }

  /**
   * Update all elements with data-i18n-title attribute (tooltips)
   * @private
   */
  _updateTitles() {
    const elements = document.querySelectorAll('[data-i18n-title]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      // Skip the HTML element itself (document title is handled separately)
      if (key && el.tagName.toUpperCase() !== 'HTML') {
        el.title = this.t(key);
      }
    });
  }

  /**
   * Update the document title if specified
   * @private
   */
  _updateDocumentTitle() {
    // Look for head > title with data-i18n-title or special marker
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
      const key = titleElement.getAttribute('data-i18n');
      if (key) {
        document.title = this.t(key);
      }
    }
    
    // Also check for data attribute on html element
    const htmlElement = document.documentElement;
    if (htmlElement.hasAttribute('data-i18n-title')) {
      const key = htmlElement.getAttribute('data-i18n-title');
      if (key) {
        document.title = this.t(key);
      }
    }
  }

  /**
   * Emit a custom event when language changes
   * Other parts of the app can listen for this to update dynamic content
   * @private
   */
  _emitLanguageChange() {
    const event = new CustomEvent('languageChanged', {
      detail: {
        lang: this.currentLang,
        previousLang: this._previousLang,
        availableLanguages: this.availableLanguages
      },
      bubbles: true,
      cancelable: false
    });
    
    // Dispatch on window so any listener can receive it
    window.dispatchEvent(event);
  }

  /**
   * Get language from localStorage
   * @private
   */
  _getFromStorage() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (e) {
      // localStorage might be unavailable (private browsing, etc.)
      if (this._devMode) {
        console.warn('[i18n] Could not read from localStorage:', e.message);
      }
      return null;
    }
  }

  /**
   * Save language to localStorage
   * @private
   */
  _saveToStorage(lang) {
    try {
      localStorage.setItem(this.storageKey, lang);
    } catch (e) {
      // localStorage might be unavailable or full
      if (this._devMode) {
        console.warn('[i18n] Could not save to localStorage:', e.message);
      }
    }
  }

  /**
   * Check if we're in development mode
   * @private
   */
  _isDevMode() {
    // Check various development indicators
    if (typeof window !== 'undefined') {
      // localhost or .local domains
      if (window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.local')) {
        return true;
      }
      // Check for explicit debug flag
      if (window.__I18N_DEBUG__ === true) {
        return true;
      }
    }
    return false;
  }
}

// ============================================
// GLOBAL INSTANCE & EXPORTS - Universal Module Definition (UMD)
// ============================================

// Create and expose global i18n instance FIRST (for regular script loading)
if (typeof window !== 'undefined') {
  // Create singleton instance
  window.i18n = new I18n();
  
  // Also expose class for extension/testing
  window.I18n = I18n;
  
  // Convenience function for translation (shorthand)
  window.t = (key, params) => window.i18n.t(key, params);
}

// CommonJS export (for Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18n };
}

// Note: For ES Module usage, load with type="module" and use:
// import { I18n } from './i18n-engine.js';
// The exports below only work when loaded as a module.

// ============================================
// SELF-TEST (Development Only)
// ============================================

if (typeof window !== 'undefined') {
  // Run self-test after a short delay to ensure translations are loaded
  setTimeout(() => {
    if (window.i18n && window.i18n._devMode) {
      console.log('');
      console.log('🌍 ═══════════════════════════════════════');
      console.log('🌍 i18n Engine Self-Test');
      console.log('🌍 ═══════════════════════════════════════');
      console.log('📚 Available languages:', window.i18n.getAvailableLanguages().join(', '));
      console.log('🗣️ Current language:', window.i18n.getCurrentLanguage());
      
      // Test basic translation
      const testKey = 'nextButton';
      if (window.translations?.en?.[testKey]) {
        console.log(`✅ Basic translation: "${testKey}" = "${window.i18n.t(testKey)}"`);
      } else {
        console.log(`⚠️ Test key '${testKey}' not found in translations`);
      }
      
      // Test parameter substitution
      const paramKey = 'pleaseEnterTeamName';
      if (window.translations?.en?.[paramKey]) {
        const result = window.i18n.t(paramKey, { num: 1 });
        const hasParam = !result.includes('{num}');
        console.log(`${hasParam ? '✅' : '❌'} Param substitution: "${result}"`);
      }
      
      // Test language support check
      console.log(`✅ Language 'en' supported: ${window.i18n.isLanguageSupported('en')}`);
      console.log(`✅ Language 'zh' supported: ${window.i18n.isLanguageSupported('zh')}`);
      console.log(`✅ Language 'xx' supported: ${window.i18n.isLanguageSupported('xx')} (expected: false)`);
      
      console.log('🌍 ═══════════════════════════════════════');
      console.log('');
    }
  }, 100);
}
