// lib/csrf-edge.ts
// CSRF protection utilities for Edge Runtime (middleware)
// This file does NOT import Node.js crypto to maintain Edge Runtime compatibility

import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Get CSRF token from cookie (Edge Runtime compatible)
 * @param req - Next.js request object
 * @returns CSRF token from cookie or null
 */
export function getCsrfTokenFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Get CSRF token from header (Edge Runtime compatible)
 * @param req - Next.js request object
 * @returns CSRF token from header or null
 */
export function getCsrfTokenFromHeader(req: NextRequest): string | null {
  return req.headers.get(CSRF_HEADER_NAME) || null;
}

/**
 * Verify CSRF token from request (Edge Runtime compatible)
 * Uses double-submit cookie pattern:
 * 1. Token must be in both cookie and header
 * 2. Both tokens must match
 * 
 * NOTE: Full signature verification happens in API routes (Node.js runtime)
 * This function only checks cookie/header match for Edge Runtime compatibility
 * @param req - Next.js request object
 * @returns true if tokens match, false otherwise
 */
export function verifyCsrfRequest(req: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(req);
  const headerToken = getCsrfTokenFromHeader(req);

  // Both cookie and header must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must match (double-submit cookie pattern)
  // Full signature verification happens in API routes
  return cookieToken === headerToken;
}

/**
 * Check if request method requires CSRF protection
 * @param method - HTTP method
 * @returns true if method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Middleware function to check CSRF protection (Edge Runtime compatible)
 * Returns error response if CSRF check fails, otherwise returns null
 * @param req - Next.js request object
 * @returns NextResponse with error if CSRF check fails, null otherwise
 */
export function checkCsrfProtection(req: NextRequest): NextResponse | null {
  // Only check state-changing methods
  if (!requiresCsrfProtection(req.method)) {
    return null;
  }

  // Check CSRF token (cookie/header match only in Edge Runtime)
  if (!verifyCsrfRequest(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "CSRF token validation failed",
        code: "CSRF_ERROR",
      },
      { status: 403 }
    );
  }

  return null;
}

