// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminUser, checkAdmin } from "@/lib/auth";
import {
  checkPublicApiLimit,
  checkAdminApiLimit,
  getClientIp,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { setSentryUser, clearSentryUser } from "@/lib/sentry-context";
import {
  checkCsrfProtection,
  requiresCsrfProtection,
} from "@/lib/csrf-edge";
import { sanitizeHeaders } from "@/lib/log-sanitizer";

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `REQ-${timestamp}-${random}`;
}

/**
 * Get request size in bytes (approximate)
 */
function getRequestSize(req: NextRequest): number {
  // Approximate size based on headers and URL
  let size = req.url.length;
  req.headers.forEach((value, key) => {
    size += key.length + value.length;
  });
  return size;
}

/**
 * Get Supabase environment variables for Edge Runtime
 * Validates at runtime (not module load time) to ensure .env.local is loaded
 * @throws Error if required environment variables are missing or invalid
 */
function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug: Log what we're actually reading (first 50 chars only for security)
  console.log('[Middleware Debug] Reading env vars:', {
    urlExists: !!url,
    urlPreview: url ? url.substring(0, 50) + '...' : 'undefined',
    anonKeyExists: !!anonKey,
    anonKeyLength: anonKey?.length || 0,
  });

  // Check if variables are missing
  if (!url || !anonKey) {
    logger.error('Missing Supabase environment variables in Edge Runtime', {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
      urlLength: url?.length || 0,
      anonKeyLength: anonKey?.length || 0,
    });

    throw new Error(
      'Supabase environment variables are required but not available in Edge Runtime. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file ' +
      'and restart your development server.'
    );
  }

  // Check if placeholder values are still present
  if (url.includes('your-supabase-url-here') || url.includes('placeholder') || 
      anonKey.includes('your-supabase-anon-key-here') || anonKey.includes('placeholder')) {
    logger.error('Supabase environment variables contain placeholder values', {
      url: url.substring(0, 30) + '...',
      anonKeyLength: anonKey.length,
    });

    throw new Error(
      'Supabase environment variables contain placeholder values. ' +
      'Please replace NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file ' +
      'with your actual Supabase project URL and anon key from https://supabase.com/dashboard/project/_/settings/api'
    );
  }

  // Validate URL format (must be HTTP or HTTPS)
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      throw new Error('URL must use http or https protocol');
    }
  } catch (err) {
    logger.error('Invalid Supabase URL format', {
      url: url.substring(0, 50) + '...',
      error: err instanceof Error ? err.message : String(err),
    });

    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL format: "${url.substring(0, 50)}...". ` +
      'Must be a valid HTTP or HTTPS URL (e.g., https://xxxxx.supabase.co)'
    );
  }

  return { url, anonKey };
}

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const url = req.nextUrl;
  const method = req.method;
  const path = url.pathname;
  const clientIp = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Add request ID to response headers for correlation
  const res = NextResponse.next();
  res.headers.set("X-Request-ID", requestId);

  // Log request start
  logger.info("Request started", {
    requestId,
    method,
    path,
    ip: clientIp,
    userAgent,
    query: Object.fromEntries(url.searchParams),
  });

  // Rate limiting for public API routes
  // Strategy: 10 requests per 10 seconds per IP address
  if (url.pathname.startsWith("/api/public/")) {
    // Extract IP from headers
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkPublicApiLimit(clientIp);

    if (!rateLimitResult.success) {
      // Rate limit exceeded - return 429 Too Many Requests
      const resetTime = new Date(rateLimitResult.reset).toISOString();
      const duration = Date.now() - startTime;
      
      logger.request({
        method,
        path,
        statusCode: 429,
        duration,
        ip: clientIp,
        userAgent,
      });
      logger.warn("Rate limit exceeded for public API", {
        requestId,
        ip: clientIp,
        path,
      });

      const errorResponse = NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: resetTime,
        },
        {
          status: 429,
          headers: {
            "X-Request-ID": requestId,
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
      return errorResponse;
    }

    // Add rate limit headers to successful responses
    res.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    res.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    res.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    return res;
  }

  // Rate limiting and CSRF protection for admin API routes
  // Strategy: 100 requests per minute per authenticated user
  if (url.pathname.startsWith("/api/admin/")) {
    // CSRF protection for state-changing requests
    // Exempt GET/HEAD/OPTIONS requests
    if (requiresCsrfProtection(req.method)) {
      const csrfError = checkCsrfProtection(req);
      if (csrfError) {
        logger.warn(`CSRF validation failed for ${req.method} ${url.pathname}`);
        return csrfError;
      }
    }

    // CSRF token generation happens in /api/csrf-token endpoint (Node.js runtime)
    // Middleware only checks token presence and match (Edge Runtime compatible)

    // First check authentication to get user ID
    const { isAdmin, user } = await checkAdmin(req);

    // Set user context in Sentry for admin API routes
    if (user) {
      setSentryUser(user);
    } else {
      clearSentryUser();
    }

    if (!isAdmin || !user) {
      // Authentication will be handled by the API route itself
      // We still need to check rate limit, but use IP as fallback
      const rateLimitResult = await checkPublicApiLimit(clientIp);

      if (!rateLimitResult.success) {
        const duration = Date.now() - startTime;
        logger.request({
          method,
          path,
          statusCode: 429,
          duration,
          ip: clientIp,
          userAgent,
        });
        logger.warn("Rate limit exceeded for admin API (unauthenticated)", {
          requestId,
          ip: clientIp,
          path,
        });

        return NextResponse.json(
          {
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: new Date(rateLimitResult.reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              "X-Request-ID": requestId,
              "X-RateLimit-Limit": rateLimitResult.limit.toString(),
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
              "X-RateLimit-Reset": rateLimitResult.reset.toString(),
              "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }

      res.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
      res.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
      res.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());
      
      // Log successful request (authentication will be checked in route)
      const duration = Date.now() - startTime;
      logger.request({
        method,
        path,
        statusCode: 200,
        duration,
        ip: clientIp,
        userAgent,
      });
      
      return res;
    }

    // Use user ID for rate limiting (more accurate than IP for authenticated users)
    const userId = user.id;
    const rateLimitResult = await checkAdminApiLimit(userId);

    if (!rateLimitResult.success) {
      // Rate limit exceeded - return 429 Too Many Requests
      const resetTime = new Date(rateLimitResult.reset).toISOString();
      const duration = Date.now() - startTime;
      
      logger.request({
        method,
        path,
        statusCode: 429,
        duration,
        ip: clientIp,
        userAgent,
        userId,
      });
      logger.warn("Rate limit exceeded for admin API", {
        requestId,
        userId,
        path,
      });

      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: resetTime,
        },
        {
          status: 429,
          headers: {
            "X-Request-ID": requestId,
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    res.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    res.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    res.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    // Log successful request
    const duration = Date.now() - startTime;
    logger.request({
      method,
      path,
      statusCode: 200,
      duration,
      ip: clientIp,
      userAgent,
      userId,
    });

    return res;
  }

  // Log all requests at the end (if not already logged)
  // This ensures we log even if the request doesn't match any specific route
  const duration = Date.now() - startTime;
  if (!res.headers.has("X-Request-ID")) {
    res.headers.set("X-Request-ID", requestId);
  }

  // Log request completion (will be logged by route handlers for API routes)
  if (!path.startsWith("/api/")) {
    logger.request({
      method,
      path,
      statusCode: res.status || 200,
      duration,
      ip: clientIp,
      userAgent,
    });
  }

  // Existing admin page protection logic
  if (url.pathname.startsWith("/admin")) {
    // Get Supabase env vars with runtime validation
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/auth", req.url);
      loginUrl.searchParams.set("redirectedFrom", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminUser(user)) {
      const denied = new URL("/auth", req.url);
      denied.searchParams.set("error", "forbidden");
      denied.searchParams.set("redirectedFrom", url.pathname);
      return NextResponse.redirect(denied);
    }
    return res;
  }

  // Existing auth page logic
  if (url.pathname === "/auth") {
    // Get Supabase env vars with runtime validation
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isAdminUser(user)) {
      const to = url.searchParams.get("redirectedFrom") || "/admin";
      return NextResponse.redirect(new URL(to, req.url));
    }
  }

  return res;
}

// Updated matcher to include API routes for rate limiting
export const config = {
  matcher: [
    "/admin/:path*",
    "/auth",
    "/api/public/:path*",
    "/api/admin/:path*",
  ],
};
