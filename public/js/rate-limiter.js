/**
 * Rate Limiter Utility
 * 
 * Provides client-side rate limiting to prevent form submission abuse.
 * Supports both localStorage (shared across tabs) and in-memory storage.
 * 
 * @module rate-limiter
 */

/**
 * Configuration object for rate limiting
 * Can be overridden when creating a RateLimiter instance
 */
const DEFAULT_CONFIG = {
  maxRequests: 3,
  windowMs: 60000, // 1 minute
  storage: 'localStorage', // 'localStorage' or 'memory'
  storageKey: 'rateLimiter:requests' // localStorage key prefix
};

/**
 * RateLimiter class for tracking and limiting request frequency
 * 
 * @example
 * // Create a rate limiter: 3 requests per minute
 * const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
 * 
 * // Check if request can be made
 * if (limiter.canMakeRequest()) {
 *   limiter.recordRequest();
 *   // Proceed with request
 * } else {
 *   const waitTime = limiter.getTimeUntilNextRequest();
 *   console.log(`Please wait ${waitTime}ms`);
 * }
 * 
 * @example
 * // Using with localStorage (shared across tabs)
 * const limiter = new RateLimiter({
 *   maxRequests: 5,
 *   windowMs: 30000,
 *   storage: 'localStorage',
 *   storageKey: 'myApp:rateLimit'
 * });
 * 
 * @example
 * // Using in-memory storage (per-tab only)
 * const limiter = new RateLimiter({
 *   maxRequests: 10,
 *   windowMs: 60000,
 *   storage: 'memory'
 * });
 */
export class RateLimiter {
  /**
   * Create a new RateLimiter instance
   * 
   * @param {Object} config - Configuration options
   * @param {number} config.maxRequests - Maximum number of requests allowed in the time window
   * @param {number} config.windowMs - Time window in milliseconds
   * @param {string} config.storage - Storage type: 'localStorage' or 'memory'
   * @param {string} config.storageKey - localStorage key prefix (only used when storage='localStorage')
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxRequests = this.config.maxRequests;
    this.windowMs = this.config.windowMs;
    this.storage = this.config.storage;
    this.storageKey = this.config.storageKey;
    
    // In-memory storage for 'memory' mode
    this.memoryRequests = [];
    
    // Clean up old requests on initialization
    this.cleanup();
    
    // Set up periodic cleanup for localStorage mode
    if (this.storage === 'localStorage') {
      // Clean up every 30 seconds
      if (!window.__rateLimiterCleanupInterval) {
        window.__rateLimiterCleanupInterval = setInterval(() => {
          this.cleanup();
        }, 30000);
      }
    }
  }

  /**
   * Get all request timestamps (from storage or memory)
   * 
   * @private
   * @returns {number[]} Array of request timestamps
   */
  _getRequests() {
    if (this.storage === 'localStorage') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];
        const requests = JSON.parse(stored);
        return Array.isArray(requests) ? requests : [];
      } catch (e) {
        console.warn('RateLimiter: Failed to read from localStorage', e);
        return [];
      }
    } else {
      // Memory storage
      return [...this.memoryRequests];
    }
  }

  /**
   * Save request timestamps to storage
   * 
   * @private
   * @param {number[]} requests - Array of request timestamps
   */
  _saveRequests(requests) {
    if (this.storage === 'localStorage') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(requests));
      } catch (e) {
        console.warn('RateLimiter: Failed to write to localStorage', e);
      }
    } else {
      // Memory storage
      this.memoryRequests = requests;
    }
  }

  /**
   * Clean up old requests outside the time window
   * 
   * @private
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const requests = this._getRequests();
    const validRequests = requests.filter(timestamp => timestamp > cutoff);
    
    if (validRequests.length !== requests.length) {
      this._saveRequests(validRequests);
    }
  }

  /**
   * Check if a new request can be made
   * 
   * @returns {boolean} True if request can be made, false if rate limited
   */
  canMakeRequest() {
    this.cleanup();
    const requests = this._getRequests();
    return requests.length < this.maxRequests;
  }

  /**
   * Record a new request
   * 
   * @returns {boolean} True if request was recorded, false if rate limited
   */
  recordRequest() {
    if (!this.canMakeRequest()) {
      return false;
    }
    
    const now = Date.now();
    const requests = this._getRequests();
    requests.push(now);
    this._saveRequests(requests);
    return true;
  }

  /**
   * Get the number of requests made in the current window
   * 
   * @returns {number} Number of requests in the current window
   */
  getRequestCount() {
    this.cleanup();
    return this._getRequests().length;
  }

  /**
   * Get the number of remaining requests allowed
   * 
   * @returns {number} Number of remaining requests
   */
  getRemainingRequests() {
    return Math.max(0, this.maxRequests - this.getRequestCount());
  }

  /**
   * Get the time until the next request can be made (in milliseconds)
   * Returns 0 if a request can be made immediately
   * 
   * @returns {number} Milliseconds until next request can be made
   */
  getTimeUntilNextRequest() {
    this.cleanup();
    const requests = this._getRequests();
    
    if (requests.length < this.maxRequests) {
      return 0;
    }
    
    // Find the oldest request in the window
    const oldestRequest = Math.min(...requests);
    const timeSinceOldest = Date.now() - oldestRequest;
    const timeUntilNext = this.windowMs - timeSinceOldest;
    
    return Math.max(0, timeUntilNext);
  }

  /**
   * Get the time until the rate limit window resets (in milliseconds)
   * 
   * @returns {number} Milliseconds until window resets
   */
  getTimeUntilReset() {
    return this.getTimeUntilNextRequest();
  }

  /**
   * Reset the rate limiter (clear all stored requests)
   * Useful for testing or manual reset
   */
  reset() {
    this._saveRequests([]);
    if (this.storage === 'memory') {
      this.memoryRequests = [];
    }
  }

  /**
   * Get current rate limit status
   * 
   * @returns {Object} Status object with request count, remaining, and time until reset
   */
  getStatus() {
    this.cleanup();
    return {
      requestCount: this.getRequestCount(),
      remainingRequests: this.getRemainingRequests(),
      maxRequests: this.maxRequests,
      timeUntilReset: this.getTimeUntilReset(),
      canMakeRequest: this.canMakeRequest()
    };
  }
}

// Export default instance factory for convenience
export default function createRateLimiter(config) {
  return new RateLimiter(config);
}

