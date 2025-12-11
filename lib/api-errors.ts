// lib/api-errors.ts
// Standardized API error handling

import { NextResponse } from "next/server";
import { z } from "zod";

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
 */
export function handleApiError(error: unknown): NextResponse {
  // Custom API errors
  if (error instanceof ApiError) {
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
    return NextResponse.json(
      { 
        ok: false, 
        error: "Invalid input", 
        detail: error.issues 
      },
      { status: 422 }
    );
  }

  // Generic errors
  const message = error instanceof Error ? error.message : "Internal server error";
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

