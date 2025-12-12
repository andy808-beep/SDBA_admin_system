// lib/api-errors.ts
// Standardized API error handling with Sentry integration

import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

/**
 * Custom API Error class for standardized error responses
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standardized error response handler
 * Handles different error types and returns consistent JSON responses
 * Logs errors to Sentry (excluding expected errors like 401/403/422)
 */
export function handleApiError(error: unknown): NextResponse {
  // Custom API errors
  if (error instanceof ApiError) {
    // Only log to Sentry if it's a server error (5xx)
    // Don't log expected client errors (4xx) except 500
    if (error.statusCode >= 500) {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          error_type: 'api_error',
          error_code: error.code || 'UNKNOWN',
          status_code: error.statusCode,
        },
        extra: {
          message: error.message,
          code: error.code,
        },
      });
    } else if (error.statusCode === 422) {
      // Validation errors - add as breadcrumb but don't send to Sentry
      Sentry.addBreadcrumb({
        level: 'info',
        message: `Validation error: ${error.message}`,
        category: 'validation',
      });
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message, 
        code: error.code 
      },
      { status: error.statusCode }
    );
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    // Validation errors are expected - don't send to Sentry
    Sentry.addBreadcrumb({
      level: 'info',
      message: 'Zod validation error',
      category: 'validation',
      data: {
        issues: error.issues,
      },
    });
    
    return NextResponse.json(
      { 
        ok: false, 
        error: "Invalid input", 
        detail: error.issues 
      },
      { status: 422 }
    );
  }

  // Generic errors - always log to Sentry
  const message = error instanceof Error ? error.message : "Internal server error";
  const errorObj = error instanceof Error ? error : new Error(message);
  
  Sentry.captureException(errorObj, {
    level: 'error',
    tags: {
      error_type: 'generic_error',
    },
    extra: {
      message,
      originalError: error,
    },
  });
  
  return NextResponse.json(
    { 
      ok: false, 
      error: message 
    },
    { status: 500 }
  );
}

/**
 * Helper to create common API errors
 */
export const ApiErrors = {
  forbidden: (message = "Forbidden") => 
    new ApiError(message, 403, "FORBIDDEN"),
  
  notFound: (message = "Resource not found") => 
    new ApiError(message, 404, "NOT_FOUND"),
  
  conflict: (message = "Conflict", code = "CONFLICT") => 
    new ApiError(message, 409, code),
  
  badRequest: (message = "Bad request") => 
    new ApiError(message, 400, "BAD_REQUEST"),
  
  unauthorized: (message = "Unauthorized") => 
    new ApiError(message, 401, "UNAUTHORIZED"),
  
  internalServerError: (message = "Internal server error") => 
    new ApiError(message, 500, "INTERNAL_ERROR"),
};

