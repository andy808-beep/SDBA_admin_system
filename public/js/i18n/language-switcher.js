/**
 * SDBA Registration Forms - Language Switcher Component
 * 
 * Provides a visual UI component for switching between English and Traditional Chinese.
 * 
 * Features:
 * - Toggle button style with clear active state
 * - Auto-injects into page if HTML not present
 * - Keyboard accessible
 * - Mobile responsive
 * - Syncs with i18n engine
 * 
 * Usage:
 *   // Auto-initializes on DOMContentLoaded
 *   // Or manually: window.languageSwitcher.init()
 *   // Or switch programmatically: window.languageSwitcher.switch('zh')
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
   * Supported languages with display names
   */
  const LANGUAGES = {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'EN',
      fullNativeName: 'English',
      ariaLabel: 'Switch to English'
    },
    zh: {
      code: 'zh',
      name: 'Traditional Chinese',
      nativeName: '繁',
      fullNativeName: '繁體中文',
      ariaLabel: '切換至繁體中文'
    }
  };

  /**
   * Default insertion target selectors (in order of preference)
   */
  const INSERTION_TARGETS = [
    '.form-container',      // Main form container
    'header',               // Standard header
    '.header',              // Class-based header
    'nav',                  // Navigation
    '.navbar',              // Bootstrap-style navbar
    'main',                 // Main content
    'body'                  // Last resort
  ];

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
  // CREATE SWITCHER HTML
  // ============================================

  /**
   * Create language switcher HTML element
   * @returns {HTMLElement} Switcher container element
   */
  function createSwitcher() {
    const container = document.createElement('div');
    container.className = 'language-switcher';
    container.id = 'languageSwitcher';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Language selection');

    // Create button for each language
    Object.keys(LANGUAGES).forEach(langCode => {
      const lang = LANGUAGES[langCode];
      const button = document.createElement('button');
      
      button.type = 'button';
      button.id = `lang-btn-${langCode}`;
      button.className = 'lang-btn';
      button.setAttribute('data-lang', langCode);
      button.setAttribute('aria-label', lang.ariaLabel);
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('title', lang.fullNativeName);
      
      // Use short name for compact display
      button.textContent = lang.nativeName;
      
      // Click handler
      button.addEventListener('click', function(e) {
        e.preventDefault();
        switchLanguage(langCode);
      });
      
      // Keyboard handler for accessibility
      button.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchLanguage(langCode);
        }
      });
      
      container.appendChild(button);
    });

    return container;
  }

  // ============================================
  // LANGUAGE SWITCHING
  // ============================================

  /**
   * Switch to specified language
   * @param {string} langCode - Language code ('en' or 'zh')
   * @returns {boolean} Success status
   */
  function switchLanguage(langCode) {
    // Validate language code
    if (!LANGUAGES[langCode]) {
      console.error(`[language-switcher] Invalid language code: ${langCode}`);
      return false;
    }

    // Check if i18n engine is available
    if (!window.i18n) {
      console.error('[language-switcher] i18n engine not found. Make sure i18n-engine.js is loaded first.');
      return false;
    }

    // Get current language
    const currentLang = window.i18n.getCurrentLanguage();
    
    // Skip if already on this language
    if (currentLang === langCode) {
      if (isDevMode()) {
        console.log(`[language-switcher] Already using language '${langCode}'`);
      }
      return true;
    }

    // Switch language via i18n engine
    const success = window.i18n.setLanguage(langCode);
    
    if (success) {
      updateActiveButton(langCode);
      
      if (isDevMode()) {
        console.log(`[language-switcher] Switched to '${langCode}'`);
      }
    }

    return success;
  }

  /**
   * Update active state of language buttons
   * @param {string} activeLang - Active language code
   */
  function updateActiveButton(activeLang) {
    const buttons = document.querySelectorAll('.lang-btn');
    
    buttons.forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      const isActive = btnLang === activeLang;
      
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      
      // Update aria-label for active state
      if (LANGUAGES[btnLang]) {
        const lang = LANGUAGES[btnLang];
        btn.setAttribute('aria-label', isActive 
          ? `${lang.fullNativeName} (current)` 
          : lang.ariaLabel
        );
      }
    });
  }

  // ============================================
  // INSERTION & POSITIONING
  // ============================================

  /**
   * Find the best insertion point for the switcher
   * @returns {HTMLElement|null} Target element or null
   */
  function findInsertionTarget() {
    for (const selector of INSERTION_TARGETS) {
      const target = document.querySelector(selector);
      if (target) {
        return target;
      }
    }
    return document.body;
  }

  /**
   * Insert switcher into the page
   * @param {HTMLElement} switcher - Switcher element
   */
  function insertSwitcher(switcher) {
    const target = findInsertionTarget();
    
    if (!target) {
      console.error('[language-switcher] No suitable insertion point found');
      return;
    }

    // For form-container, insert as first child
    if (target.classList.contains('form-container')) {
      target.insertBefore(switcher, target.firstChild);
    }
    // For body, insert at the beginning
    else if (target === document.body) {
      target.insertBefore(switcher, target.firstChild);
    }
    // For headers/nav, append to end
    else {
      target.appendChild(switcher);
    }

    if (isDevMode()) {
      console.log(`[language-switcher] Inserted into ${target.tagName.toLowerCase()}${target.className ? '.' + target.className.split(' ')[0] : ''}`);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the language switcher
   * Creates and inserts the switcher if not already present
   * @param {Object} options - Optional configuration
   * @param {string} options.target - CSS selector for insertion target
   * @param {boolean} options.compact - Use compact display (default: true)
   */
  function initLanguageSwitcher(options = {}) {
    // Check if switcher already exists
    let switcher = document.querySelector('.language-switcher');

    if (switcher) {
      if (isDevMode()) {
        console.log('[language-switcher] Switcher already exists in DOM');
      }
    } else {
      // Create new switcher
      switcher = createSwitcher();
      
      // Insert into page
      if (options.target) {
        const target = document.querySelector(options.target);
        if (target) {
          target.appendChild(switcher);
        } else {
          insertSwitcher(switcher);
        }
      } else {
        insertSwitcher(switcher);
      }
    }

    // Set initial active state based on current language
    const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'en';
    updateActiveButton(currentLang);

    // Listen for external language changes (e.g., from i18n.setLanguage())
    window.addEventListener('languageChanged', function(e) {
      updateActiveButton(e.detail.lang);
    });

    if (isDevMode()) {
      console.log('🌐 Language switcher initialized');
      console.log('🌐 Current language:', currentLang);
    }

    return switcher;
  }

  /**
   * Destroy the language switcher (remove from DOM)
   */
  function destroySwitcher() {
    const switcher = document.querySelector('.language-switcher');
    if (switcher) {
      switcher.remove();
      if (isDevMode()) {
        console.log('[language-switcher] Removed from DOM');
      }
    }
  }

  // ============================================
  // AUTO-INITIALIZATION
  // ============================================

  /**
   * Auto-initialize when DOM is ready
   */
  function autoInit() {
    // Wait for i18n engine to be available
    if (!window.i18n) {
      if (isDevMode()) {
        console.warn('[language-switcher] Waiting for i18n engine...');
      }
      // Retry after a short delay
      setTimeout(autoInit, 50);
      return;
    }

    initLanguageSwitcher();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    // DOM already loaded, initialize after a microtask to ensure i18n is ready
    setTimeout(autoInit, 0);
  }

  // ============================================
  // EXPORTS
  // ============================================

  /**
   * Public API
   */
  window.languageSwitcher = {
    // Initialize switcher (called automatically, but can be called manually)
    init: initLanguageSwitcher,
    
    // Switch language programmatically
    switch: switchLanguage,
    
    // Update button states
    updateActive: updateActiveButton,
    
    // Remove switcher from DOM
    destroy: destroySwitcher,
    
    // Create switcher element (without inserting)
    create: createSwitcher,
    
    // Available languages
    languages: LANGUAGES
  };

  // CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.languageSwitcher;
  }

})(typeof window !== 'undefined' ? window : this);
