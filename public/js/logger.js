/**
 * Environment-Aware Logger Utility
 * 
 * Provides logging methods that respect environment settings.
 * Debug and info logs only appear in development, while warnings and errors
 * always appear in all environments.
 * 
 * @module logger
 */

/**
 * Detect if we're in development environment
 * 
 * @returns {boolean} True if in development mode
 */
function isDevelopment() {
  // Check force debug flag first (highest priority)
  if (typeof window !== 'undefined' && window.__FORCE_DEBUG__ !== undefined) {
    return window.__FORCE_DEBUG__ === true;
  }
  
  // Check window.__DEV__ flag (set in env.js)
  if (typeof window !== 'undefined' && window.__DEV__ !== undefined) {
    return window.__DEV__ === true;
  }
  
  // Fallback: check hostname
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname.startsWith('192.168.') || 
           hostname.endsWith('.local');
  }
  
  // Default to production if can't determine
  return false;
}

/**
 * Format a value for logging (pretty print objects/arrays)
 * 
 * @param {*} value - Value to format
 * @returns {string} Formatted string
 */
function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }
  
  return String(value);
}

/**
 * Format arguments for logging
 * 
 * @param {Array} args - Arguments to format
 * @returns {Array} Formatted arguments
 */
function formatArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.parse(JSON.stringify(arg, null, 2));
      } catch (e) {
        return arg;
      }
    }
    return arg;
  });
}

/**
 * Get timestamp string for logs
 * 
 * @returns {string} Timestamp string
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString();
}

/**
 * Logger object with environment-aware logging methods
 * 
 * @example
 * // Debug logs (only in development)
 * Logger.debug('Form data:', formData);
 * Logger.debug('Step changed:', { from: 1, to: 2 });
 * 
 * @example
 * // Info logs (only in development)
 * Logger.info('Config loaded successfully');
 * Logger.info('User action:', action);
 * 
 * @example
 * // Warning logs (always shown)
 * Logger.warn('Deprecated API used');
 * Logger.warn('Validation warning:', message);
 * 
 * @example
 * // Error logs (always shown)
 * Logger.error('API call failed:', error);
 * Logger.error('Validation error:', { field: 'email', message: 'Invalid' });
 */
const Logger = {
  /**
   * Log debug information (only in development)
   * Use for detailed debugging information that's not needed in production
   * 
   * @param {...*} args - Arguments to log
   * @example
   * Logger.debug('Current step:', currentStep);
   * Logger.debug('Form state:', { teams: 2, packages: 1 });
   */
  debug(...args) {
    if (isDevelopment()) {
      const timestamp = getTimestamp();
      console.log(`[DEBUG ${timestamp}]`, ...formatArgs(args));
    }
  },

  /**
   * Log informational messages (only in development)
   * Use for general information that's useful during development
   * 
   * @param {...*} args - Arguments to log
   * @example
   * Logger.info('Form initialized');
   * Logger.info('Config loaded:', config);
   */
  info(...args) {
    if (isDevelopment()) {
      const timestamp = getTimestamp();
      console.info(`[INFO ${timestamp}]`, ...formatArgs(args));
    }
  },

  /**
   * Log warnings (always shown in all environments)
   * Use for non-critical issues that should be visible in production
   * 
   * @param {...*} args - Arguments to log
   * @example
   * Logger.warn('Deprecated function used');
   * Logger.warn('API response slow:', { duration: 5000 });
   */
  warn(...args) {
    const timestamp = getTimestamp();
    console.warn(`[WARN ${timestamp}]`, ...formatArgs(args));
  },

  /**
   * Log errors (always shown in all environments)
   * Use for errors and exceptions that need attention
   * 
   * @param {...*} args - Arguments to log
   * @example
   * Logger.error('API call failed:', error);
   * Logger.error('Validation failed:', { field: 'email', error: 'Invalid format' });
   */
  error(...args) {
    const timestamp = getTimestamp();
    console.error(`[ERROR ${timestamp}]`, ...formatArgs(args));
  },

  /**
   * Check if debug logging is enabled
   * 
   * @returns {boolean} True if in development mode
   */
  isDebugEnabled() {
    return isDevelopment();
  },

  /**
   * Force enable debug logging (useful for testing)
   */
  enableDebug() {
    if (typeof window !== 'undefined') {
      window.__FORCE_DEBUG__ = true;
    }
  },

  /**
   * Force disable debug logging
   */
  disableDebug() {
    if (typeof window !== 'undefined') {
      window.__FORCE_DEBUG__ = false;
    }
  }
};

// Make Logger available globally
if (typeof window !== 'undefined') {
  window.Logger = Logger;
}

// Export for ES6 modules
export default Logger;
export { Logger };

