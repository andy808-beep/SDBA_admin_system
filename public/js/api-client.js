/**
 * API Client with Comprehensive Error Handling
 * 
 * Provides a robust wrapper around fetch() with:
 * - Automatic retry logic
 * - Timeout handling
 * - Consistent error responses
 * - User-friendly error messages
 * - Network error detection
 * - HTTP error handling
 * 
 * @module api-client
 */

import Logger from './logger.js';
import { logError, addBreadcrumb } from './error-handler.js';

/**
 * Default configuration for API client
 */
const DEFAULT_CONFIG = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Status codes to retry
  retryableErrors: ['NetworkError', 'TimeoutError', 'AbortError']
};

/**
 * Error types for better error handling
 */
export const API_ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  HTTP: 'HTTP_ERROR',
  PARSE: 'PARSE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Get user-friendly error message based on error type
 * 
 * @param {string} errorType - Error type from API_ERROR_TYPES
 * @param {number} status - HTTP status code (if applicable)
 * @param {string} message - Original error message
 * @param {Object} data - Error data from server
 * @returns {string} User-friendly error message
 */
function getUserFriendlyMessage(errorType, status, message, data) {
  switch (errorType) {
    case API_ERROR_TYPES.NETWORK:
      return 'Connection lost. Please check your internet connection and try again.';
    
    case API_ERROR_TYPES.TIMEOUT:
      return 'Request timed out. Please try again.';
    
    case API_ERROR_TYPES.HTTP:
      switch (status) {
        case 400:
          // Show validation errors from server if available
          if (data && data.errors) {
            return `Validation error: ${Array.isArray(data.errors) ? data.errors.join(', ') : data.errors}`;
          }
          if (data && data.message) {
            return data.message;
          }
          return 'Invalid request. Please check your input and try again.';
        
        case 401:
          return 'Authentication required. Please log in and try again.';
        
        case 403:
          return 'You do not have permission to perform this action.';
        
        case 404:
          return 'The requested resource was not found.';
        
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        
        case 500:
        case 502:
        case 503:
        case 504:
          return 'Server error. Please try again later.';
        
        default:
          return data?.message || message || 'An error occurred. Please try again.';
      }
    
    case API_ERROR_TYPES.PARSE:
      return 'Invalid response from server. Please try again.';
    
    case API_ERROR_TYPES.VALIDATION:
      if (data && data.errors) {
        return `Validation error: ${Array.isArray(data.errors) ? data.errors.join(', ') : data.errors}`;
      }
      return data?.message || 'Validation failed. Please check your input.';
    
    default:
      return message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Sleep/delay function for retry logic
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 * 
 * @param {Error} error - Error object
 * @param {number} status - HTTP status code
 * @returns {boolean} True if error is retryable
 */
function isRetryable(error, status) {
  // Check if status code is retryable
  if (status && DEFAULT_CONFIG.retryableStatuses.includes(status)) {
    return true;
  }
  
  // Check if error type is retryable
  if (error && error.name) {
    return DEFAULT_CONFIG.retryableErrors.includes(error.name);
  }
  
  // Network errors are retryable
  if (error && error.message && error.message.includes('network')) {
    return true;
  }
  
  return false;
}

/**
 * Fetch with comprehensive error handling, retry logic, and timeout
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in milliseconds (default: 1000)
 * @param {boolean} options.skipRetry - Skip retry logic (default: false)
 * @param {string} options.context - Context description for logging
 * @returns {Promise<Object>} Response object: { ok: boolean, data: any, error: string, status: number, errorType: string }
 * 
 * @example
 * const result = await fetchWithErrorHandling('/api/data', {
 *   method: 'GET',
 *   context: 'loading user data'
 * });
 * 
 * if (result.ok) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 *   showError(result.userMessage);
 * }
 * 
 * @example
 * const result = await fetchWithErrorHandling('/api/submit', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 *   headers: { 'Content-Type': 'application/json' },
 *   timeout: 60000, // 60 seconds
 *   maxRetries: 2
 * });
 */
export async function fetchWithErrorHandling(url, options = {}) {
  const {
    timeout = DEFAULT_CONFIG.timeout,
    maxRetries = DEFAULT_CONFIG.maxRetries,
    retryDelay = DEFAULT_CONFIG.retryDelay,
    skipRetry = false,
    context = 'API call',
    ...fetchOptions
  } = options;
  
  let lastError = null;
  let lastStatus = null;
  let attempt = 0;
  
  // Add breadcrumb for API call
  addBreadcrumb(`API call: ${context}`, 'http', 'info', {
    url,
    method: fetchOptions.method || 'GET',
    attempt: attempt + 1
  });
  
  Logger.debug(`[API] ${context}: Starting request to ${url}`, {
    method: fetchOptions.method || 'GET',
    timeout,
    maxRetries: skipRetry ? 0 : maxRetries
  });
  
  while (attempt <= (skipRetry ? 0 : maxRetries)) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        Logger.warn(`[API] ${context}: Request timeout after ${timeout}ms`);
      }, timeout);
      
      // Make the request
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        lastStatus = response.status;
        
        // Try to parse error response
        let errorData = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = { message: await response.text() };
          }
        } catch (parseError) {
          Logger.warn(`[API] ${context}: Failed to parse error response`, parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = errorData;
        
        // Check if retryable
        if (attempt < maxRetries && !skipRetry && isRetryable(error, response.status)) {
          attempt++;
          Logger.warn(`[API] ${context}: Retryable error (${response.status}), retrying (${attempt}/${maxRetries})...`);
          await sleep(retryDelay * attempt); // Exponential backoff
          continue;
        }
        
        // Determine error type
        let errorType = API_ERROR_TYPES.HTTP;
        if (response.status >= 400 && response.status < 500) {
          if (response.status === 400 && errorData && errorData.errors) {
            errorType = API_ERROR_TYPES.VALIDATION;
          }
        }
        
        const userMessage = getUserFriendlyMessage(errorType, response.status, error.message, errorData);
        
        Logger.error(`[API] ${context}: HTTP error ${response.status}`, {
          url,
          status: response.status,
          errorData,
          attempt
        });
        
        logError(error, {
          action: 'api_http_error',
          url,
          status: response.status,
          context,
          errorData
        }, 'error', ['api_error', 'http_error']);
        
        return {
          ok: false,
          data: null,
          error: error.message,
          userMessage,
          status: response.status,
          errorType,
          errorData
        };
      }
      
      // Parse successful response
      let data = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      } catch (parseError) {
        Logger.warn(`[API] ${context}: Failed to parse response`, parseError);
        logError(parseError, {
          action: 'api_parse_error',
          url,
          context
        }, 'error', ['api_error', 'parse_error']);
        
        return {
          ok: false,
          data: null,
          error: 'Failed to parse response',
          userMessage: getUserFriendlyMessage(API_ERROR_TYPES.PARSE, null, parseError.message),
          status: response.status,
          errorType: API_ERROR_TYPES.PARSE
        };
      }
      
      // Success!
      Logger.debug(`[API] ${context}: Request successful`, {
        url,
        status: response.status,
        attempt: attempt + 1
      });
      
      addBreadcrumb(`API success: ${context}`, 'http', 'info', {
        url,
        status: response.status,
        attempt: attempt + 1
      });
      
      return {
        ok: true,
        data,
        error: null,
        status: response.status,
        errorType: null
      };
      
    } catch (error) {
      lastError = error;
      
      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        
        if (attempt < maxRetries && !skipRetry) {
          attempt++;
          Logger.warn(`[API] ${context}: Timeout, retrying (${attempt}/${maxRetries})...`);
          await sleep(retryDelay * attempt);
          continue;
        }
        
        Logger.error(`[API] ${context}: Request timeout after ${timeout}ms`);
        logError(timeoutError, {
          action: 'api_timeout',
          url,
          timeout,
          context,
          attempt
        }, 'error', ['api_error', 'timeout']);
        
        return {
          ok: false,
          data: null,
          error: 'Request timeout',
          userMessage: getUserFriendlyMessage(API_ERROR_TYPES.TIMEOUT, null, 'Request timeout'),
          status: null,
          errorType: API_ERROR_TYPES.TIMEOUT
        };
      }
      
      // Handle network errors
      if (error.message && (
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('Failed to fetch')
      )) {
        if (attempt < maxRetries && !skipRetry) {
          attempt++;
          Logger.warn(`[API] ${context}: Network error, retrying (${attempt}/${maxRetries})...`);
          await sleep(retryDelay * attempt);
          continue;
        }
        
        Logger.error(`[API] ${context}: Network error`, error);
        logError(error, {
          action: 'api_network_error',
          url,
          context,
          attempt
        }, 'error', ['api_error', 'network_error']);
        
        return {
          ok: false,
          data: null,
          error: error.message || 'Network error',
          userMessage: getUserFriendlyMessage(API_ERROR_TYPES.NETWORK, null, error.message),
          status: null,
          errorType: API_ERROR_TYPES.NETWORK
        };
      }
      
      // Other errors
      if (attempt < maxRetries && !skipRetry && isRetryable(error, null)) {
        attempt++;
        Logger.warn(`[API] ${context}: Error, retrying (${attempt}/${maxRetries})...`, error);
        await sleep(retryDelay * attempt);
        continue;
      }
      
      Logger.error(`[API] ${context}: Unexpected error`, error);
      logError(error, {
        action: 'api_error',
        url,
        context,
        attempt
      }, 'error', ['api_error', 'unknown_error']);
      
      return {
        ok: false,
        data: null,
        error: error.message || 'Unknown error',
        userMessage: getUserFriendlyMessage(API_ERROR_TYPES.UNKNOWN, null, error.message),
        status: null,
        errorType: API_ERROR_TYPES.UNKNOWN
      };
    }
  }
  
  // All retries exhausted
  const finalError = lastError || new Error('Request failed after all retries');
  Logger.error(`[API] ${context}: All retries exhausted`, {
    url,
    attempts: attempt + 1,
    lastError: finalError.message,
    lastStatus
  });
  
  return {
    ok: false,
    data: null,
    error: finalError.message || 'Request failed after all retries',
    userMessage: getUserFriendlyMessage(
      lastStatus ? API_ERROR_TYPES.HTTP : API_ERROR_TYPES.NETWORK,
      lastStatus,
      finalError.message
    ),
    status: lastStatus,
    errorType: lastStatus ? API_ERROR_TYPES.HTTP : API_ERROR_TYPES.NETWORK
  };
}

/**
 * Convenience method for GET requests
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Options (same as fetchWithErrorHandling)
 * @returns {Promise<Object>} Response object
 */
export async function get(url, options = {}) {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'GET'
  });
}

/**
 * Convenience method for POST requests
 * 
 * @param {string} url - Request URL
 * @param {Object} body - Request body (will be JSON stringified)
 * @param {Object} options - Options (same as fetchWithErrorHandling)
 * @returns {Promise<Object>} Response object
 */
export async function post(url, body, options = {}) {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

/**
 * Convenience method for PUT requests
 * 
 * @param {string} url - Request URL
 * @param {Object} body - Request body (will be JSON stringified)
 * @param {Object} options - Options (same as fetchWithErrorHandling)
 * @returns {Promise<Object>} Response object
 */
export async function put(url, body, options = {}) {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

/**
 * Convenience method for DELETE requests
 * 
 * @param {string} url - Request URL
 * @param {Object} options - Options (same as fetchWithErrorHandling)
 * @returns {Promise<Object>} Response object
 */
export async function del(url, options = {}) {
  return fetchWithErrorHandling(url, {
    ...options,
    method: 'DELETE'
  });
}

// Export default
export default {
  fetch: fetchWithErrorHandling,
  get,
  post,
  put,
  delete: del,
  API_ERROR_TYPES
};

