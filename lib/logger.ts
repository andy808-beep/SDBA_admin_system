// lib/logger.ts
// Enhanced structured logging with PII sanitization and request context

import * as Sentry from "@sentry/nextjs";
import { getRequestContext } from "./request-context";
import { sanitizeObject, sanitizeString, sanitizeBody } from "./log-sanitizer";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string | null;
  userId?: string;
  [key: string]: any;
}

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Log sampling configuration
 * In production, log 100% of errors, but sample other logs
 */
const LOG_SAMPLING = {
  [LogLevel.DEBUG]: isDevelopment ? 1.0 : 0.0, // No debug logs in production
  [LogLevel.INFO]: isDevelopment ? 1.0 : 0.1, // 10% of info logs in production
  [LogLevel.WARN]: isDevelopment ? 1.0 : 0.5, // 50% of warnings in production
  [LogLevel.ERROR]: 1.0, // 100% of errors always
};

/**
 * Check if a log entry should be logged based on sampling
 */
function shouldLog(level: LogLevel): boolean {
  const sampleRate = LOG_SAMPLING[level];
  return Math.random() < sampleRate;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const context = getRequestContext();
  
  // Add request context if available
  if (context) {
    entry.requestId = context.requestId;
    if (context.userId) {
      entry.userId = context.userId;
    }
  }

  if (isDevelopment) {
    // Pretty format for development
    const prefix = `[${entry.timestamp}] [${entry.level}]`;
    const contextStr = entry.requestId ? `[${entry.requestId}]` : "";
    const message = entry.message;
    const extra = Object.keys(entry)
      .filter((key) => !["timestamp", "level", "message", "requestId", "userId"].includes(key))
      .map((key) => `${key}=${JSON.stringify(entry[key])}`)
      .join(" ");

    return `${prefix} ${contextStr} ${message} ${extra}`.trim();
  } else {
    // JSON format for production
    return JSON.stringify(entry);
  }
}

/**
 * Enhanced logger with structured logging
 */
export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (!shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message: sanitizeString(message),
    };

    // Sanitize additional arguments
    if (args.length > 0) {
      entry.data = sanitizeObject(args.length === 1 ? args[0] : args);
    }

    console.log(formatLogEntry(entry));
  },

  /**
   * Info logs
   */
  info: (message: string, ...args: unknown[]): void => {
    if (!shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: sanitizeString(message),
    };

    if (args.length > 0) {
      entry.data = sanitizeObject(args.length === 1 ? args[0] : args);
    }

    console.info(formatLogEntry(entry));
  },

  /**
   * Warning logs - sent to Sentry as breadcrumb
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (!shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message: sanitizeString(message),
    };

    if (args.length > 0) {
      entry.data = sanitizeObject(args.length === 1 ? args[0] : args);
    }

    console.warn(formatLogEntry(entry));

    // Add warning as breadcrumb to Sentry
    try {
      Sentry.addBreadcrumb({
        level: "warning",
        message: sanitizeString(message),
        data: args.length > 0 ? sanitizeObject(args.length === 1 ? args[0] : args) : undefined,
      });
    } catch {
      // Silently fail if Sentry is not initialized
    }
  },

  /**
   * Error logs - always logged, sent to Sentry
   */
  error: (message: string, ...args: unknown[]): void => {
    if (!shouldLog(LogLevel.ERROR)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message: sanitizeString(message),
    };

    // Extract error object if present
    const error = args.find((arg) => arg instanceof Error) as Error | undefined;
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
      };
    }

    // Sanitize other arguments
    const otherArgs = args.filter((arg) => !(arg instanceof Error));
    if (otherArgs.length > 0) {
      entry.data = sanitizeObject(otherArgs.length === 1 ? otherArgs[0] : otherArgs);
    }

    console.error(formatLogEntry(entry));

    // Send error to Sentry
    try {
      if (error) {
        Sentry.captureException(error, {
          level: "error",
          extra: {
            message: sanitizeString(message),
            data: otherArgs.length > 0 ? sanitizeObject(otherArgs.length === 1 ? otherArgs[0] : otherArgs) : undefined,
          },
        });
      } else {
        const fullMessage = [message, ...otherArgs.map((arg) => String(arg))].join(" ");
        Sentry.captureMessage(sanitizeString(fullMessage), {
          level: "error",
          extra: {
            data: otherArgs.length > 0 ? sanitizeObject(otherArgs.length === 1 ? otherArgs[0] : otherArgs) : undefined,
          },
        });
      }
    } catch {
      // Silently fail if Sentry is not initialized
    }
  },

  /**
   * Log a request
   */
  request: (data: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
    requestSize?: number;
    responseSize?: number;
    error?: Error;
  }): void => {
    const context = getRequestContext();
    const level = data.statusCode >= 500 ? LogLevel.ERROR : data.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `${data.method} ${data.path} ${data.statusCode}`,
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      duration: data.duration,
      requestId: context?.requestId,
    };

    if (data.ip) {
      entry.ip = data.ip;
    }

    if (data.userAgent) {
      entry.userAgent = data.userAgent;
    }

    if (data.userId) {
      entry.userId = data.userId;
    }

    if (data.requestSize !== undefined) {
      entry.requestSize = data.requestSize;
    }

    if (data.responseSize !== undefined) {
      entry.responseSize = data.responseSize;
    }

    if (data.error) {
      entry.error = {
        name: data.error.name,
        message: data.error.message,
        stack: isDevelopment ? data.error.stack : undefined,
      };
    }

    // Log slow requests as warnings
    if (data.duration > 5000) {
      entry.level = LogLevel.ERROR;
      entry.message += " [VERY SLOW]";
    } else if (data.duration > 1000) {
      entry.level = LogLevel.WARN;
      entry.message += " [SLOW]";
    }

    const logFn = level === LogLevel.ERROR ? console.error : level === LogLevel.WARN ? console.warn : console.info;
    logFn(formatLogEntry(entry));
  },
};
