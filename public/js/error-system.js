/**
 * Unified Error System
 * Phase 2 Design Specification Implementation
 * 
 * Provides centralized error display and management:
 * - Field-level errors (inline validation)
 * - Form-level error summaries
 * - System-level error notifications
 * 
 * @module error-system
 * @version 2.0.0
 * @date 2025-01-XX
 */

/**
 * ErrorSystem Class
 * Singleton instance for managing all error displays
 */
class ErrorSystem {
  /**
   * Constructor
   * Initializes the error system
   */
  constructor() {
    /** @type {Map<string, Object>} Map of fieldId -> error data */
    this.errors = new Map();
    
    /** @type {HTMLElement|null} Current form error summary element */
    this.formErrorSummary = null;
    
    /** @type {HTMLElement|null} Current system error element */
    this.systemError = null;
    
    /** @type {number|null} Auto-dismiss timer for system error */
    this.systemErrorTimer = null;
    
    /** @type {Map<string, Function>} Field validation functions */
    this.fieldValidations = new Map();
    
    /** @type {Map<string, HTMLElement>} Cache for DOM elements */
    this.elementCache = new Map();
    
    /** @type {Map<string, Object>} Map of fieldId -> event listeners {blur, input} */
    this.listeners = new Map();
    
    /** @type {Map<string, number>} Map of fieldId -> debounce timeout */
    this.debounceTimers = new Map();
    
    // Bind methods to preserve context
    this.clearSystemError = this.clearSystemError.bind(this);
  }

  /**
   * Get translated error message
   * 
   * @param {string} key - Translation key
   * @param {Object} [params={}] - Parameters for translation
   * @returns {string} Translated message or key as fallback
   */
  getMessage(key, params = {}) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      try {
        return window.i18n.t(key, params);
      } catch (error) {
        console.warn('ErrorSystem: Failed to translate key:', key, error);
        return key;
      }
    }
    // Fallback to key if i18n not available
    return key;
  }

  /**
   * Get field element with caching
   * 
   * @private
   * @param {string} fieldId - ID of the form field
   * @returns {HTMLElement|null} Field element or null if not found
   */
  getField(fieldId) {
    if (this.elementCache.has(fieldId)) {
      const cached = this.elementCache.get(fieldId);
      // Verify element still exists in DOM
      if (cached && document.contains(cached)) {
        return cached;
      }
      // Element removed from DOM, clear cache
      this.elementCache.delete(fieldId);
    }
    
    const field = document.getElementById(fieldId);
    if (field) {
      this.elementCache.set(fieldId, field);
    }
    return field;
  }

  /**
   * Clear element from cache
   * 
   * @private
   * @param {string} fieldId - ID of the form field
   */
  clearCache(fieldId) {
    this.elementCache.delete(fieldId);
  }

  /**
   * Show field-level error
   * 
   * @param {string} fieldId - ID of the form field
   * @param {string} messageKey - Translation key for error message
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.params={}] - Parameters for message translation
   * @param {boolean} [options.scrollTo=false] - Whether to scroll to field
   * @param {boolean} [options.focus=false] - Whether to focus the field
   * @param {string} [options.containerId] - Container ID for error message (defaults to field's parent)
   * @returns {boolean} True if error was shown, false if field not found
   */
  showFieldError(fieldId, messageKey, options = {}) {
    const {
      params = {},
      scrollTo = false,
      focus = false,
      containerId = null
    } = options;

    // Get field element (with caching)
    const field = this.getField(fieldId);
    if (!field) {
      console.warn('ErrorSystem: Field not found:', fieldId);
      return false;
    }

    // Get translated message
    const message = this.getMessage(messageKey, params);

    // Add field-error class to field
    field.classList.add('field-error');
    
    // Set ARIA attributes
    field.setAttribute('aria-invalid', 'true');
    
    // Get or create error message element
    const errorId = `error-${fieldId}`;
    let errorDiv = document.getElementById(errorId);
    
    if (!errorDiv) {
      // Create error message div
      errorDiv = document.createElement('div');
      errorDiv.id = errorId;
      errorDiv.className = 'field-error-message';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'polite');
      
      // Insert after field
      const container = containerId 
        ? document.getElementById(containerId) 
        : field.parentElement;
      
      if (container) {
        // Insert after field (or at end of container)
        if (field.nextSibling) {
          container.insertBefore(errorDiv, field.nextSibling);
        } else {
          container.appendChild(errorDiv);
        }
      } else {
        // Fallback: insert after field
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
      }
    }
    
    // Set error message text
    errorDiv.textContent = message;
    
    // Set aria-describedby on field
    const describedBy = field.getAttribute('aria-describedby');
    if (describedBy && !describedBy.includes(errorId)) {
      field.setAttribute('aria-describedby', `${describedBy} ${errorId}`);
    } else if (!describedBy) {
      field.setAttribute('aria-describedby', errorId);
    }
    
    // Store error in Map
    this.errors.set(fieldId, {
      field,
      errorDiv,
      messageKey,
      params,
      message
    });
    
    // Scroll to field if requested
    if (scrollTo) {
      setTimeout(() => {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    
    // Focus field if requested
    if (focus) {
      setTimeout(() => {
        field.focus();
      }, 100);
    }
    
    return true;
  }

  /**
   * Clear field-level error
   * 
   * @param {string} fieldId - ID of the form field
   * @returns {boolean} True if error was cleared, false if field not found
   */
  clearFieldError(fieldId) {
    const errorData = this.errors.get(fieldId);
    
    if (!errorData) {
      return false;
    }
    
    const { field, errorDiv } = errorData;
    
    // Remove field-error class
    if (field) {
      field.classList.remove('field-error');
      field.removeAttribute('aria-invalid');
      
      // Remove aria-describedby reference
      const describedBy = field.getAttribute('aria-describedby');
      if (describedBy) {
        const ids = describedBy.split(' ').filter(id => id !== errorDiv.id);
        if (ids.length > 0) {
          field.setAttribute('aria-describedby', ids.join(' '));
        } else {
          field.removeAttribute('aria-describedby');
        }
      }
    }
    
    // Remove error message div
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
    
    // Clear debounce timer if exists
    if (this.debounceTimers.has(fieldId)) {
      clearTimeout(this.debounceTimers.get(fieldId));
      this.debounceTimers.delete(fieldId);
    }
    
    // Remove event listeners if bound
    if (this.listeners.has(fieldId)) {
      const { blur, input } = this.listeners.get(fieldId);
      if (field) {
        if (blur) field.removeEventListener('blur', blur);
        if (input) field.removeEventListener('input', input);
      }
      this.listeners.delete(fieldId);
    }
    
    // Clear from errors Map
    this.errors.delete(fieldId);
    
    // Clear cache (optional - keep for performance, but can clear if needed)
    // this.clearCache(fieldId);
    
    return true;
  }

  /**
   * Show form-level error summary
   * 
   * @param {Array<Object>} errors - Array of error objects {field, messageKey, params}
   * @param {Object} [options={}] - Additional options
   * @param {string} [options.containerId] - Container ID to insert summary (defaults to form)
   * @param {boolean} [options.scrollTo=true] - Whether to scroll to summary
   * @param {string} [options.titleKey='formErrorsTitle'] - Translation key for title
   * @returns {boolean} True if summary was shown
   */
  showFormErrors(errors = [], options = {}) {
    const {
      containerId = null,
      scrollTo = true,
      titleKey = 'formErrorsTitle'
    } = options;

    if (!Array.isArray(errors) || errors.length === 0) {
      return false;
    }

    // Clear existing form error summary
    this.clearFormErrorSummary();

    // Batch field error updates using DocumentFragment
    const fieldErrorsFragment = document.createDocumentFragment();
    const fieldErrorsToShow = [];

    // Collect all field errors first
    errors.forEach((error, index) => {
      const { field, messageKey, params = {} } = error;
      if (field) {
        // Resolve field ID if it's an element
        const fieldId = typeof field === 'string' ? field : field.id;
        fieldErrorsToShow.push({
          fieldId,
          messageKey,
          params,
          scrollTo: errors.length === 1,
          focus: errors.length === 1 && index === 0
        });
      }
    });

    // Show field errors (batched)
    fieldErrorsToShow.forEach(errorData => {
      this.showFieldError(errorData.fieldId, errorData.messageKey, {
        params: errorData.params,
        scrollTo: errorData.scrollTo,
        focus: errorData.focus
      });
    });

    // If 2+ errors, create form error summary
    if (errors.length >= 2) {
      this.createFormErrorSummary(errors, { containerId, scrollTo, titleKey });
    }

    return true;
  }

  /**
   * Create form error summary element
   * 
   * @private
   * @param {Array<Object>} errors - Array of error objects
   * @param {Object} options - Options
   */
  createFormErrorSummary(errors, options) {
    const { containerId, scrollTo, titleKey } = options;

    // Find container
    let container = null;
    if (containerId) {
      container = document.getElementById(containerId);
    } else {
      // Try to find form element from first error field
      const firstError = errors[0];
      if (firstError && firstError.field) {
        // Handle both field ID (string) and field element
        const firstFieldElement = typeof firstError.field === 'string' 
          ? document.getElementById(firstError.field) 
          : firstError.field;
        if (firstFieldElement) {
          container = firstFieldElement.closest('form') || 
                     firstFieldElement.closest('.card') ||
                     firstFieldElement.closest('.form-container');
        }
      }
    }

    if (!container) {
      console.warn('ErrorSystem: Container not found for form error summary');
      return;
    }

    // Create summary container
    const summary = document.createElement('div');
    summary.className = 'form-error-summary';
    summary.setAttribute('role', 'alert');
    summary.setAttribute('aria-live', 'assertive');

    // Create header
    const header = document.createElement('div');
    header.className = 'error-summary-header';

    const title = document.createElement('h3');
    title.textContent = this.getMessage(titleKey, { count: errors.length });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'error-close';
    closeBtn.setAttribute('aria-label', this.getMessage('closeErrorSummary') || 'Close error summary');
    closeBtn.textContent = '×';
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => {
      this.clearFormErrorSummary();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create error list using DocumentFragment for batch DOM updates
    const errorList = document.createElement('ul');
    errorList.className = 'error-list';
    const listFragment = document.createDocumentFragment();

    errors.forEach((error) => {
      const { field, messageKey, params = {} } = error;
      if (!field) return;

      // Handle both field ID (string) and field element
      const fieldId = typeof field === 'string' ? field : field.id;
      const fieldElement = typeof field === 'string' ? this.getField(field) : field;
      
      if (!fieldElement) {
        console.warn('ErrorSystem: Field element not found for ID:', fieldId);
        return;
      }

      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${fieldId}`;
      link.textContent = this.getMessage(messageKey, params);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldElement.focus();
      });

      listItem.appendChild(link);
      listFragment.appendChild(listItem);
    });

    // Single DOM insertion
    errorList.appendChild(listFragment);

    // Assemble summary
    summary.appendChild(header);
    summary.appendChild(errorList);

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      // Set initial opacity for fade-in animation
      summary.style.opacity = '0';
      summary.style.transition = 'opacity 0.3s ease-in-out';
      
      // Insert at top of container
      if (container.firstChild) {
        container.insertBefore(summary, container.firstChild);
      } else {
        container.appendChild(summary);
      }

      this.formErrorSummary = summary;

      // Animate in
      requestAnimationFrame(() => {
        summary.style.opacity = '1';
      });

      // Scroll to summary if requested
      if (scrollTo) {
        requestAnimationFrame(() => {
          summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }

  /**
   * Clear form error summary
   * 
   * @returns {boolean} True if summary was cleared
   */
  clearFormErrorSummary() {
    if (this.formErrorSummary && this.formErrorSummary.parentNode) {
      this.formErrorSummary.parentNode.removeChild(this.formErrorSummary);
      this.formErrorSummary = null;
      return true;
    }
    return false;
  }

  /**
   * Clear all form errors
   * 
   * @returns {void}
   */
  clearFormErrors() {
    // Clear form error summary
    this.clearFormErrorSummary();

    // Clear all field errors
    const fieldIds = Array.from(this.errors.keys());
    fieldIds.forEach(fieldId => {
      this.clearFieldError(fieldId);
    });
  }

  /**
   * Clear errors - convenience method that accepts optional fieldId
   * If fieldId is provided, clears that specific field error
   * If fieldId is not provided, clears all form errors
   * 
   * @param {string} [fieldId] - Optional field ID to clear specific error
   * @returns {boolean} True if error(s) were cleared
   */
  clearErrors(fieldId) {
    if (fieldId) {
      // Clear specific field error
      const errorEl = document.getElementById(`error-${fieldId}`);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        errorEl.classList.remove('show');
      }
      
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.remove('error', 'field-error');
      }
      
      // Use clearFieldError for proper cleanup if error exists in system
      if (this.errors.has(fieldId)) {
        return this.clearFieldError(fieldId);
      }
      
      return true;
    } else {
      // Clear all errors
      document.querySelectorAll('[id^="error-"]').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
        el.classList.remove('show');
      });
      
      document.querySelectorAll('.error, .field-error').forEach(el => {
        el.classList.remove('error', 'field-error');
      });
      
      // Use clearFormErrors for proper cleanup
      this.clearFormErrors();
      return true;
    }
  }

  /**
   * Show system-level error
   * 
   * @param {string} messageKey - Translation key for error message
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.params={}] - Parameters for message translation
   * @param {string} [options.titleKey='systemErrorTitle'] - Translation key for title
   * @param {boolean} [options.persistent=false] - Whether error should persist (no auto-dismiss)
   * @param {number} [options.autoDismiss=10000] - Auto-dismiss timeout in milliseconds
   * @returns {boolean} True if error was shown
   */
  showSystemError(messageKey, options = {}) {
    const {
      params = {},
      titleKey = 'systemErrorTitle',
      persistent = false,
      autoDismiss = 10000
    } = options;

    // Clear existing system error
    this.clearSystemError();

    // Get translated messages
    const title = this.getMessage(titleKey);
    const message = this.getMessage(messageKey, params);

    // Create system error container
    const systemError = document.createElement('div');
    systemError.className = 'system-error';
    systemError.setAttribute('role', 'alert');
    systemError.setAttribute('aria-live', 'assertive');

    // Create content container
    const content = document.createElement('div');
    content.className = 'system-error-content';

    // Create icon
    const icon = document.createElement('span');
    icon.className = 'system-error-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';

    // Create message
    const messageEl = document.createElement('span');
    messageEl.className = 'system-error-message';
    messageEl.textContent = message;

    content.appendChild(icon);
    content.appendChild(messageEl);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'system-error-close';
    closeBtn.setAttribute('aria-label', this.getMessage('closeError') || 'Close error');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', this.clearSystemError);

    // Assemble system error
    systemError.appendChild(content);
    systemError.appendChild(closeBtn);

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      // Set initial opacity and transform for slide-in animation
      systemError.style.opacity = '0';
      systemError.style.transform = 'translateY(-20px)';
      systemError.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
      
      // Insert at top of body
      if (document.body.firstChild) {
        document.body.insertBefore(systemError, document.body.firstChild);
      } else {
        document.body.appendChild(systemError);
      }

      this.systemError = systemError;

      // Animate in
      requestAnimationFrame(() => {
        systemError.style.opacity = '1';
        systemError.style.transform = 'translateY(0)';
      });

      // Auto-dismiss if not persistent
      if (!persistent && autoDismiss > 0) {
        this.systemErrorTimer = setTimeout(() => {
          this.clearSystemError();
        }, autoDismiss);
      }
    });

    return true;
  }

  /**
   * Clear system-level error
   * 
   * @returns {boolean} True if error was cleared
   */
  clearSystemError() {
    // Clear auto-dismiss timer
    if (this.systemErrorTimer) {
      clearTimeout(this.systemErrorTimer);
      this.systemErrorTimer = null;
    }

    // Remove system error element with fade-out animation
    if (this.systemError && this.systemError.parentNode) {
      const errorEl = this.systemError;
      
      // Animate out
      requestAnimationFrame(() => {
        errorEl.style.opacity = '0';
        errorEl.style.transform = 'translateY(-20px)';
        
        // Remove after animation
        setTimeout(() => {
          if (errorEl.parentNode) {
            errorEl.parentNode.removeChild(errorEl);
          }
          this.systemError = null;
        }, 300); // Match transition duration
      });
      
      return true;
    }

    return false;
  }

  /**
   * Bind field validation
   * 
   * @param {string} fieldId - ID of the form field
   * @param {Function} validationFn - Validation function that returns true (valid) or error message key (invalid)
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.validateOnBlur=true] - Validate on blur event
   * @param {boolean} [options.clearOnInput=true] - Clear error on input event
   * @returns {boolean} True if binding was successful
   */
  bindFieldValidation(fieldId, validationFn, options = {}) {
    const {
      validateOnBlur = true,
      clearOnInput = true,
      debounceMs = 300
    } = options;

    const field = this.getField(fieldId);
    if (!field) {
      console.warn('ErrorSystem: Field not found for validation binding:', fieldId);
      return false;
    }

    if (typeof validationFn !== 'function') {
      console.warn('ErrorSystem: validationFn must be a function');
      return false;
    }

    // Unbind existing validation if any
    this.unbindFieldValidation(fieldId);

    // Store validation function
    this.fieldValidations.set(fieldId, validationFn);

    // Create debounced validation function
    const debouncedValidate = () => {
      // Clear existing debounce timer
      if (this.debounceTimers.has(fieldId)) {
        clearTimeout(this.debounceTimers.get(fieldId));
      }

      // Set new debounce timer
      const timeout = setTimeout(() => {
        const result = validationFn(field.value, field);
        
        if (result === true || result === null || result === undefined) {
          // Valid - clear any existing error
          this.clearFieldError(fieldId);
        } else if (typeof result === 'string') {
          // Invalid - show error with message key
          this.showFieldError(fieldId, result);
        } else if (result && typeof result === 'object' && result.messageKey) {
          // Invalid - show error with options
          this.showFieldError(fieldId, result.messageKey, {
            params: result.params || {},
            scrollTo: result.scrollTo || false,
            focus: result.focus || false
          });
        }
        
        this.debounceTimers.delete(fieldId);
      }, debounceMs);

      this.debounceTimers.set(fieldId, timeout);
    };

    // Add blur event listener for validation (no debounce on blur)
    const blurHandler = () => {
      // Clear any pending debounced validation
      if (this.debounceTimers.has(fieldId)) {
        clearTimeout(this.debounceTimers.get(fieldId));
        this.debounceTimers.delete(fieldId);
      }

      // Immediate validation on blur
      const result = validationFn(field.value, field);
      
      if (result === true || result === null || result === undefined) {
        // Valid - clear any existing error
        this.clearFieldError(fieldId);
      } else if (typeof result === 'string') {
        // Invalid - show error with message key
        this.showFieldError(fieldId, result);
      } else if (result && typeof result === 'object' && result.messageKey) {
        // Invalid - show error with options
        this.showFieldError(fieldId, result.messageKey, {
          params: result.params || {},
          scrollTo: result.scrollTo || false,
          focus: result.focus || false
        });
      }
    };

    // Add input event listener (debounced validation + clear error)
    const inputHandler = () => {
      // Clear error immediately on input
      if (clearOnInput && this.errors.has(fieldId)) {
        this.clearFieldError(fieldId);
      }

      // Debounced validation on input (if validateOnBlur is false, validate on input)
      if (!validateOnBlur) {
        debouncedValidate();
      }
    };

    // Attach listeners
    if (validateOnBlur) {
      field.addEventListener('blur', blurHandler);
    }
    
    if (clearOnInput || !validateOnBlur) {
      field.addEventListener('input', inputHandler);
    }

    // Store listeners for cleanup
    this.listeners.set(fieldId, {
      blur: validateOnBlur ? blurHandler : null,
      input: (clearOnInput || !validateOnBlur) ? inputHandler : null
    });

    return true;
  }

  /**
   * Unbind field validation
   * 
   * @param {string} fieldId - ID of the form field
   * @returns {boolean} True if validation was unbound
   */
  unbindFieldValidation(fieldId) {
    // Clear debounce timer
    if (this.debounceTimers.has(fieldId)) {
      clearTimeout(this.debounceTimers.get(fieldId));
      this.debounceTimers.delete(fieldId);
    }

    // Remove event listeners
    if (this.listeners.has(fieldId)) {
      const field = this.getField(fieldId);
      if (field) {
        const { blur, input } = this.listeners.get(fieldId);
        if (blur) field.removeEventListener('blur', blur);
        if (input) field.removeEventListener('input', input);
      }
      this.listeners.delete(fieldId);
    }

    // Remove validation function
    if (this.fieldValidations.has(fieldId)) {
      this.fieldValidations.delete(fieldId);
      return true;
    }
    return false;
  }

  /**
   * Get all current errors
   * 
   * @returns {Array<Object>} Array of error objects
   */
  getErrors() {
    return Array.from(this.errors.entries()).map(([fieldId, errorData]) => ({
      fieldId,
      ...errorData
    }));
  }

  /**
   * Check if field has error
   * 
   * @param {string} fieldId - ID of the form field
   * @returns {boolean} True if field has error
   */
  hasError(fieldId) {
    return this.errors.has(fieldId);
  }

  /**
   * Get error count
   * 
   * @returns {number} Number of current errors
   */
  getErrorCount() {
    return this.errors.size;
  }
}

// Create singleton instance
const errorSystem = new ErrorSystem();

// Export to window for global access
if (typeof window !== 'undefined') {
  window.errorSystem = errorSystem;
}

// Export for ES6 modules
export default errorSystem;
