// lib/logger.ts
// Centralized logging utility

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger utility with environment-aware logging
 */
export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logs - always logged
   */
  warn: (...args: unknown[]): void => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - always logged
   */
  error: (...args: unknown[]): void => {
    console.error('[ERROR]', ...args);
  },
};

