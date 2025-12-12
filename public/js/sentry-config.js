/**
 * Sentry Configuration
 * 
 * Centralized configuration for Sentry error monitoring.
 * Set your DSN in window.ENV.SENTRY_DSN or update the default below.
 */

/**
 * Get Sentry DSN from environment or use placeholder
 * 
 * @returns {string|null} Sentry DSN or null if not configured
 */
function getSentryDSN() {
  // Check environment variable first
  if (window.ENV && window.ENV.SENTRY_DSN) {
    return window.ENV.SENTRY_DSN;
  }
  
  // Check for DSN in a data attribute on the document
  const dsnFromData = document.documentElement.dataset.sentryDsn;
  if (dsnFromData) {
    return dsnFromData;
  }
  
  // Return null if not configured (Sentry will be disabled)
  return null;
}

/**
 * Detect environment (development, staging, production)
 * 
 * @returns {string} Environment name
 */
function detectEnvironment() {
  const hostname = window.location.hostname;
  
  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local')) {
    return 'development';
  }
  
  // Staging (adjust patterns as needed)
  if (hostname.includes('staging') || hostname.includes('test') || hostname.includes('dev')) {
    return 'staging';
  }
  
  // Production
  return 'production';
}

/**
 * Sentry configuration object
 */
export const SENTRY_CONFIG = {
  /**
   * Sentry DSN - Get from environment or set here
   * Leave as null to disable Sentry
   */
  dsn: getSentryDSN(),
  
  /**
   * Environment name
   */
  environment: detectEnvironment(),
  
  /**
   * Sample rate for errors (0.0 to 1.0)
   * - 1.0 = 100% of errors sent
   * - 0.1 = 10% of errors sent
   */
  sampleRate: detectEnvironment() === 'production' ? 1.0 : 1.0,
  
  /**
   * Sample rate for transactions (performance monitoring)
   */
  tracesSampleRate: detectEnvironment() === 'production' ? 0.1 : 1.0,
  
  /**
   * Enable debug mode (logs to console)
   */
  debug: detectEnvironment() === 'development',
  
  /**
   * Release version (optional)
   */
  release: null, // Set if you have version tracking
  
  /**
   * Filter sensitive data before sending to Sentry
   * 
   * @param {Object} event - Sentry event
   * @returns {Object|null} Filtered event or null to drop
   */
  beforeSend(event) {
    // Don't send errors in development unless explicitly enabled
    if (event.environment === 'development' && !window.__ENABLE_SENTRY_IN_DEV__) {
      console.log('Sentry: Error filtered (development mode)', event);
      return null;
    }
    
    // Filter out sensitive form data
    if (event.contexts && event.contexts.form) {
      const formData = event.contexts.form;
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'credit_card', 'ssn', 'hp', 'honeypot'];
      sensitiveFields.forEach(field => {
        if (formData[field]) {
          formData[field] = '[FILTERED]';
        }
      });
      
      // Filter contact information if needed
      if (formData.contact) {
        // Keep structure but filter sensitive parts
        if (formData.contact.email) {
          formData.contact.email = formData.contact.email.replace(/(.{2}).*(@.*)/, '$1***$2');
        }
        if (formData.contact.phone) {
          formData.contact.phone = formData.contact.phone.replace(/\d(?=\d{4})/g, '*');
        }
      }
    }
    
    // Filter request body if present
    if (event.request && event.request.data) {
      const requestData = event.request.data;
      if (typeof requestData === 'object') {
        // Remove sensitive fields from request
        const sensitiveFields = ['password', 'credit_card', 'ssn', 'hp', 'honeypot'];
        sensitiveFields.forEach(field => {
          if (requestData[field]) {
            requestData[field] = '[FILTERED]';
          }
        });
      }
    }
    
    return event;
  },
  
  /**
   * Filter breadcrumbs before sending
   * 
   * @param {Object} breadcrumb - Breadcrumb object
   * @returns {Object|null} Filtered breadcrumb or null to drop
   */
  beforeBreadcrumb(breadcrumb) {
    // Don't send breadcrumbs in development unless explicitly enabled
    if (detectEnvironment() === 'development' && !window.__ENABLE_SENTRY_IN_DEV__) {
      return null;
    }
    
    // Filter sensitive data from breadcrumbs
    if (breadcrumb.data) {
      const sensitiveFields = ['password', 'credit_card', 'ssn', 'hp', 'honeypot'];
      sensitiveFields.forEach(field => {
        if (breadcrumb.data[field]) {
          breadcrumb.data[field] = '[FILTERED]';
        }
      });
    }
    
    return breadcrumb;
  },
  
  /**
   * Additional integrations to enable
   */
  integrations: [
    // BrowserTracing for performance monitoring (optional)
    // new Sentry.BrowserTracing(),
  ],
  
  /**
   * Initial scope data
   */
  initialScope: {
    tags: {
      app: 'race-registration',
      version: '1.0.0'
    }
  }
};

/**
 * Check if Sentry is enabled
 * 
 * @returns {boolean} True if Sentry is configured and enabled
 */
export function isSentryEnabled() {
  return SENTRY_CONFIG.dsn !== null && SENTRY_CONFIG.dsn !== '';
}

/**
 * Initialize Sentry with the configuration
 * Call this after Sentry SDK is loaded
 * 
 * @param {Object} Sentry - Sentry SDK object
 */
export function initializeSentry(Sentry) {
  if (!isSentryEnabled()) {
    console.warn('Sentry: DSN not configured, error monitoring disabled');
    return false;
  }
  
  try {
    Sentry.init(SENTRY_CONFIG);
    console.log('Sentry: Initialized successfully', {
      environment: SENTRY_CONFIG.environment,
      dsn: SENTRY_CONFIG.dsn ? `${SENTRY_CONFIG.dsn.substring(0, 20)}...` : 'not set'
    });
    return true;
  } catch (error) {
    console.error('Sentry: Failed to initialize', error);
    return false;
  }
}

// Export environment detection for use in other files
export { detectEnvironment };

