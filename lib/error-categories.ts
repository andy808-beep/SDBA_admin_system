// lib/error-categories.ts
// Error categorization and recovery strategies

export enum ErrorCategory {
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  VALIDATION = "VALIDATION",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

export interface ErrorInfo {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  canRetry: boolean;
  shouldRedirect?: string;
  recoveryAction?: string;
}

/**
 * Categorize an error and provide recovery information
 */
export function categorizeError(error: Error | unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const lowerMessage = errorMessage.toLowerCase();

  // Network errors
  if (
    errorName === "NetworkError" ||
    errorName === "TypeError" && lowerMessage.includes("fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("network request failed")
  ) {
    return {
      category: ErrorCategory.NETWORK,
      message: errorMessage,
      userMessage: "Connection lost. Please check your internet connection and try again.",
      canRetry: true,
      recoveryAction: "Retry connection",
    };
  }

  // Authentication errors
  if (
    errorName === "AuthError" ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("authentication") ||
    lowerMessage.includes("session expired") ||
    lowerMessage.includes("token expired") ||
    lowerMessage.includes("401") ||
    lowerMessage.includes("403")
  ) {
    return {
      category: ErrorCategory.AUTH,
      message: errorMessage,
      userMessage: "Your session has expired. Please log in again.",
      canRetry: false,
      shouldRedirect: "/auth",
      recoveryAction: "Go to login",
    };
  }

  // Validation errors
  if (
    errorName === "ValidationError" ||
    errorName === "ZodError" ||
    lowerMessage.includes("validation") ||
    lowerMessage.includes("invalid input") ||
    lowerMessage.includes("bad request") ||
    lowerMessage.includes("422")
  ) {
    return {
      category: ErrorCategory.VALIDATION,
      message: errorMessage,
      userMessage: "There was a problem with your input. Please check and try again.",
      canRetry: false,
      recoveryAction: "Check your input",
    };
  }

  // Server errors
  if (
    errorName === "ServerError" ||
    lowerMessage.includes("internal server error") ||
    lowerMessage.includes("server error") ||
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("504")
  ) {
    return {
      category: ErrorCategory.SERVER,
      message: errorMessage,
      userMessage: "The server encountered an error. Please try again in a moment.",
      canRetry: true,
      recoveryAction: "Retry",
    };
  }

  // Unknown errors
  return {
    category: ErrorCategory.UNKNOWN,
    message: errorMessage,
    userMessage: "Something unexpected went wrong. Our team has been notified.",
    canRetry: true,
    recoveryAction: "Try again",
  };
}

/**
 * Generate a unique error ID for support reference
 */
export function generateErrorId(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * Check if an error is transient and can be retried
 */
export function isTransientError(error: Error | unknown): boolean {
  const info = categorizeError(error);
  return info.canRetry && (
    info.category === ErrorCategory.NETWORK ||
    info.category === ErrorCategory.SERVER
  );
}

/**
 * Get retry delay with exponential backoff
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 10000)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 10000): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

