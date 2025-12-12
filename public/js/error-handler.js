/**
 * Centralized Error Handler
 * 
 * Provides unified error logging and reporting using Sentry.
 * Wraps Sentry.captureException() with additional context and breadcrumbs.
 */

import { detectEnvironment } from './sentry-config.js';

/**
 * Check if Sentry is available
 * 
 * @returns {boolean} True if Sentry is loaded and available
 */
function isSentryAvailable() {
  return typeof window !== 'undefined' && window.Sentry && typeof window.Sentry.captureException === 'function';
}

/**
 * Get current form state for error context
 * 
 * @returns {Object} Form state object
 */
function getFormState() {
  try {
    const state = {
      eventRef: window.__CONFIG?.event?.event_short_ref || null,
      currentStep: window.__CURRENT_STEP || null,
      teamCount: sessionStorage.getItem('tn_team_count') || null,
      hasConfig: !!window.__CONFIG,
      practiceEnabled: !!window.__PRACTICE_ENABLED,
      mode: window.__MODE || null
    };
    
    return state;
  } catch (e) {
    return { error: 'Failed to get form state' };
  }
}

/**
 * Get user agent and browser info
 * 
 * @returns {Object} Browser information
 */
function getBrowserInfo() {
  try {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  } catch (e) {
    return { error: 'Failed to get browser info' };
  }
}

/**
 * Log an error to Sentry with context
 * 
 * @param {Error|string} error - Error object or error message
 * @param {Object} context - Additional context data
 * @param {string} level - Error level: 'error', 'warning', 'info', 'debug'
 * @param {Array} tags - Additional tags for filtering
 * 
 * @example
 * logError(new Error('Something went wrong'), {
 *   action: 'form_submission',
 *   formData: { teamCount: 2 }
 * });
 * 
 * @example
 * logError('Validation failed', {
 *   field: 'email',
 *   value: 'invalid@'
 * }, 'warning');
 */
export function logError(error, context = {}, level = 'error', tags = []) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Always log to console
  const env = detectEnvironment();
  if (env === 'development') {
    console.error('Error logged:', errorObj, context);
  } else {
    console.error('Error:', errorObj.message);
  }
  
  // Send to Sentry if available
  if (isSentryAvailable()) {
    try {
      // Add context data
      const additionalContext = {
        formState: getFormState(),
        browser: getBrowserInfo(),
        url: window.location.href,
        timestamp: new Date().toISOString(),
        ...context
      };
      
      // Set context
      window.Sentry.withScope((scope) => {
        // Set level
        scope.setLevel(level);
        
        // Add tags
        tags.forEach(tag => {
          if (typeof tag === 'string') {
            scope.setTag(tag, true);
          } else if (typeof tag === 'object') {
            Object.entries(tag).forEach(([key, value]) => {
              scope.setTag(key, value);
            });
          }
        });
        
        // Add context
        scope.setContext('additional', additionalContext);
        
        // Add form state as separate context
        if (additionalContext.formState) {
          scope.setContext('form', additionalContext.formState);
        }
        
        // Capture exception
        window.Sentry.captureException(errorObj);
      });
    } catch (sentryError) {
      console.error('Failed to send error to Sentry:', sentryError);
    }
  }
}

/**
 * Log a warning (non-critical error)
 * 
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context
 */
export function logWarning(error, context = {}) {
  logError(error, context, 'warning');
}

/**
 * Log an info message
 * 
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
export function logInfo(message, context = {}) {
  if (isSentryAvailable()) {
    window.Sentry.captureMessage(message, {
      level: 'info',
      contexts: {
        additional: context
      }
    });
  }
  console.info('Info:', message, context);
}

/**
 * Add a breadcrumb for user actions
 * 
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category: 'user', 'navigation', 'http', 'console', 'ui'
 * @param {string} level - Level: 'info', 'warning', 'error'
 * @param {Object} data - Additional data
 * 
 * @example
 * addBreadcrumb('User clicked submit button', 'user', 'info', { step: 3 });
 */
export function addBreadcrumb(message, category = 'user', level = 'info', data = {}) {
  if (isSentryAvailable()) {
    window.Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  }
  
  // Also log to console in development
  if (detectEnvironment() === 'development') {
    console.log(`[Breadcrumb:${category}]`, message, data);
  }
}

/**
 * Set user context for Sentry
 * 
 * @param {Object} user - User information
 * @param {string} user.id - User ID
 * @param {string} user.email - User email (will be partially masked)
 * @param {string} user.username - Username
 */
export function setUserContext(user = {}) {
  if (isSentryAvailable()) {
    // Mask email for privacy
    const maskedUser = { ...user };
    if (maskedUser.email) {
      maskedUser.email = maskedUser.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    }
    
    window.Sentry.setUser(maskedUser);
  }
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (isSentryAvailable()) {
    window.Sentry.setUser(null);
  }
}

/**
 * Wrap an async function with error handling
 * 
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context description for errors
 * @returns {Function} Wrapped function
 * 
 * @example
 * const safeFetch = wrapAsync(fetch, 'API call');
 * safeFetch('/api/data').then(...);
 */
export function wrapAsync(fn, context = 'async operation') {
  return async function(...args) {
    try {
      addBreadcrumb(`Starting ${context}`, 'user', 'info', { context, args: args.length });
      const result = await fn.apply(this, args);
      addBreadcrumb(`Completed ${context}`, 'user', 'info', { context });
      return result;
    } catch (error) {
      logError(error, { context, operation: context }, 'error', ['async_wrapper']);
      throw error;
    }
  };
}

/**
 * Wrap a fetch call with error handling and breadcrumbs
 * 
 * @deprecated Use fetchWithErrorHandling from './api-client.js' instead
 * This function is kept for backward compatibility but delegates to the new API client
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {string} context - Context description
 * @returns {Promise<Response>} Fetch response
 * 
 * @example
 * const response = await safeFetch('/api/submit', { method: 'POST', body: data }, 'form submission');
 */
export async function safeFetch(url, options = {}, context = 'API call') {
  // Import the new API client dynamically to avoid circular dependencies
  const { fetchWithErrorHandling } = await import('./api-client.js');
  
  const result = await fetchWithErrorHandling(url, {
    ...options,
    context
  });
  
  if (!result.ok) {
    // Create a Response-like object for backward compatibility
    const errorResponse = {
      ok: false,
      status: result.status || 0,
      statusText: result.error || 'Error',
      json: async () => result.errorData || { error: result.error },
      text: async () => result.error || ''
    };
    return errorResponse;
  }
  
  // Create a Response-like object for successful responses
  const successResponse = {
    ok: true,
    status: result.status || 200,
    statusText: 'OK',
    json: async () => result.data,
    text: async () => typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
  };
  
  return successResponse;
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'unhandled_error'
    }, 'error', ['global_error']);
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, {
      type: 'unhandled_promise_rejection',
      promise: event.promise
    }, 'error', ['promise_rejection']);
  });
}

// Auto-setup global handlers when module loads
if (typeof window !== 'undefined') {
  setupGlobalErrorHandlers();
}

// Export default for convenience
export default {
  logError,
  logWarning,
  logInfo,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
  wrapAsync,
  safeFetch,
  setupGlobalErrorHandlers
};

