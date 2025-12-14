// lib/csrf.ts
// CSRF protection using double-submit cookie pattern
// NOTE: This file is for Node.js runtime (API routes) only
// For Edge Runtime (middleware), use lib/csrf-edge.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";

const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Get CSRF secret from environment
 * Falls back to a default in development, but should be set in production
 */
function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    // In production, this should have been caught by env validation
    // But we provide a helpful error message just in case
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CSRF_SECRET environment variable is required in production. " +
        "Please set a strong random secret (e.g., 64-character hex string). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      );
    }
    // Development fallback (not secure, but allows development)
    console.warn("⚠️  CSRF_SECRET not set, using development fallback. Set CSRF_SECRET in production!");
    return "development-csrf-secret-change-in-production";
  }
  return secret;
}

/**
 * Generate a CSRF token
 * Uses HMAC with the secret to create a signed token
 * NOTE: This function requires Node.js runtime (use in API routes only)
 */
export function generateCsrfToken(): string {
  const token = randomBytes(32).toString("hex");
  const hmac = createHmac("sha256", getCsrfSecret());
  hmac.update(token);
  const signature = hmac.digest("hex");
  return `${token}.${signature}`;
}

/**
 * Verify a CSRF token
 * @param token - The token to verify
 * @returns true if token is valid, false otherwise
 * NOTE: This function requires Node.js runtime (use in API routes only)
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [tokenPart, signature] = parts;
  const hmac = createHmac("sha256", getCsrfSecret());
  hmac.update(tokenPart);
  const expectedSignature = hmac.digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks when comparing tokens
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get CSRF token from cookie
 * @param req - Next.js request object
 * @returns CSRF token from cookie or null
 */
export function getCsrfTokenFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Get CSRF token from header
 * @param req - Next.js request object
 * @returns CSRF token from header or null
 */
export function getCsrfTokenFromHeader(req: NextRequest): string | null {
  return req.headers.get(CSRF_HEADER_NAME) || null;
}

/**
 * Set CSRF token in cookie
 * @param res - Next.js response object
 * @param token - CSRF token to set
 */
export function setCsrfTokenCookie(res: NextResponse, token: string): void {
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // Use __Host- prefix requires secure and path=/
    // This prevents subdomain cookie attacks
  });
}

// Note: Edge-compatible functions (getCsrfTokenFromCookie, getCsrfTokenFromHeader, etc.)
// are available in lib/csrf-edge.ts for middleware use
// This file is for Node.js runtime (API routes) only

