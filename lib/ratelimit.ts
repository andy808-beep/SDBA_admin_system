// lib/ratelimit.ts
// Rate limiting configuration and utilities
// Uses Upstash Redis for production, in-memory for development

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

/**
 * Rate limiting strategy:
 * - Public API routes (/api/public/*): 10 requests per 10 seconds per IP
 *   This prevents abuse of public registration endpoints
 * 
 * - Admin API routes (/api/admin/*): 100 requests per minute per user
 *   Higher limit for authenticated admin users, tracked by user ID
 */

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

// Check if Redis is configured (optional - falls back to in-memory)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Redis client for rate limiting
 * Uses Upstash Redis if configured, otherwise uses a simple in-memory implementation
 */
let redis: Redis | null = null;
let useInMemory = false;

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    logger.info("Rate limiting: Using Upstash Redis");
  } catch (error) {
    logger.warn("Rate limiting: Failed to initialize Redis, using in-memory fallback", error);
    useInMemory = true;
  }
} else {
  if (!isDevelopment) {
    logger.warn("Rate limiting: Redis not configured, using in-memory storage (not recommended for production)");
  } else {
    logger.info("Rate limiting: Using in-memory storage for development");
  }
  useInMemory = true;
}

/**
 * Simple in-memory rate limiter for development
 * Implements sliding window algorithm
 */
class InMemoryRateLimiter {
  private store: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(maxRequests: number, window: string) {
    this.maxRequests = maxRequests;
    // Parse window string (e.g., "10 s", "1 m")
    const windowMatch = window.match(/^(\d+)\s*(s|m|h)$/);
    if (!windowMatch) {
      throw new Error(`Invalid window format: ${window}`);
    }
    const value = parseInt(windowMatch[1], 10);
    const unit = windowMatch[2];
    this.windowMs = value * (unit === "s" ? 1000 : unit === "m" ? 60000 : 3600000);
  }

  async limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const key = identifier;
    
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    
    const requests = this.store.get(key)!;
    
    // Remove requests outside the window
    const cutoff = now - this.windowMs;
    const validRequests = requests.filter((timestamp) => timestamp > cutoff);
    
    if (validRequests.length >= this.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = Math.min(...validRequests);
      const reset = oldestRequest + this.windowMs;
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.store.set(key, validRequests);
    
    // Calculate reset time (oldest request + window)
    const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;
    const reset = oldestRequest + this.windowMs;
    
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - validRequests.length,
      reset,
    };
  }
}

/**
 * Public API rate limiter
 * Limits: 10 requests per 10 seconds per IP address
 * Uses sliding window algorithm for smooth rate limiting
 */
export const publicApiLimiter = useInMemory
  ? new InMemoryRateLimiter(10, "10 s")
  : new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
      prefix: "@ratelimit/public-api",
    });

/**
 * Admin API rate limiter
 * Limits: 100 requests per minute per user
 * Uses sliding window algorithm for smooth rate limiting
 */
export const adminApiLimiter = useInMemory
  ? new InMemoryRateLimiter(100, "1 m")
  : new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "@ratelimit/admin-api",
    });

/**
 * Rate limit result type
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for public API routes
 * @param identifier - IP address or other unique identifier
 * @returns Rate limit result with success status and metadata
 */
export async function checkPublicApiLimit(
  identifier: string
): Promise<RateLimitResult> {
  try {
    // Bypass rate limiting in development if explicitly disabled
    if (isDevelopment && process.env.DISABLE_RATE_LIMIT === "true") {
      return {
        success: true,
        limit: 10,
        remaining: 10,
        reset: Date.now() + 10000,
      };
    }

    const result = await publicApiLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // On rate limiter failure, allow request through but log error
    logger.error("Rate limiter error (public API):", error);
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 10000,
    };
  }
}

/**
 * Check rate limit for admin API routes
 * @param identifier - User ID or other unique identifier
 * @returns Rate limit result with success status and metadata
 */
export async function checkAdminApiLimit(
  identifier: string
): Promise<RateLimitResult> {
  try {
    // Bypass rate limiting in development if explicitly disabled
    if (isDevelopment && process.env.DISABLE_RATE_LIMIT === "true") {
      return {
        success: true,
        limit: 100,
        remaining: 100,
        reset: Date.now() + 60000,
      };
    }

    const result = await adminApiLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // On rate limiter failure, allow request through but log error
    logger.error("Rate limiter error (admin API):", error);
    return {
      success: true,
      limit: 100,
      remaining: 100,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Extract IP address from request
 * Handles various proxy headers and falls back to '127.0.0.1' if not found
 * @param req - NextRequest or Request object
 * @returns Client IP address
 */
export function getClientIp(req: Request | { ip?: string; headers: Headers }): string {
  // Try NextRequest.ip property first (if available)
  if ("ip" in req && req.ip) {
    return req.ip;
  }

  // Try to get IP from various headers (handles proxies, load balancers, etc.)
  const headers = req.headers;
  
  // Check common proxy headers (in order of preference)
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip"); // Cloudflare
  if (cfConnectingIp) return cfConnectingIp.trim();

  // Fallback to localhost if no IP found
  logger.warn("Could not determine client IP, using fallback");
  return "127.0.0.1";
}

