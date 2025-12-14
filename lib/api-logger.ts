// lib/api-logger.ts
// API route request/response logging wrapper

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { sanitizeBody, sanitizeHeaders } from "./log-sanitizer";
import { withRequestContext, createRequestContext, getRequestId } from "./request-context";

/**
 * Wrapper for API route handlers to add request/response logging
 * @param handler - API route handler function
 * @param routeName - Name of the route for logging
 * @returns Wrapped handler with logging
 */
export function withApiLogging<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  routeName: string
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const requestId = req.headers.get("X-Request-ID") || `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const method = req.method;
    const path = req.nextUrl.pathname;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create request context
    const context = createRequestContext({
      requestId,
      ip: clientIp,
      userAgent,
      method,
      path,
    });

    // Get user ID if available (from auth check)
    let userId: string | undefined;
    try {
      const { checkAdmin } = await import("./auth");
      const { user } = await checkAdmin(req);
      if (user) {
        userId = user.id;
        context.userId = user.id;
      }
    } catch {
      // Ignore auth errors - user might not be authenticated
    }

    // Log request start
    logger.info("API request started", {
      requestId,
      method,
      path,
      route: routeName,
      ip: clientIp,
      userAgent,
      userId,
      query: Object.fromEntries(req.nextUrl.searchParams),
    });

    let response: NextResponse;
    let error: Error | null = null;

    try {
      // Execute handler with request context
      response = await withRequestContext(context, async () => {
        return await handler(req, ...args);
      });

      // Add request ID to response headers
      response.headers.set("X-Request-ID", requestId);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      response = NextResponse.json(
        { ok: false, error: "Internal server error" },
        { status: 500 }
      );
      response.headers.set("X-Request-ID", requestId);
    }

    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // Get response size (approximate)
    const responseSize = response.headers.get("content-length")
      ? parseInt(response.headers.get("content-length") || "0", 10)
      : undefined;

    // Log request completion
    logger.request({
      method,
      path,
      statusCode,
      duration,
      ip: clientIp,
      userAgent,
      userId,
      responseSize,
      error: error || undefined,
    });

    // Log request/response body for errors (sanitized)
    if (statusCode >= 400) {
      try {
        // Try to get request body (if available)
        const clonedReq = req.clone();
        const body = await clonedReq.text();
        if (body) {
          logger.debug("Request body (error)", {
            requestId,
            body: sanitizeBody(body),
          });
        }

        // Try to get response body
        const clonedRes = response.clone();
        const resBody = await clonedRes.text();
        if (resBody) {
          logger.debug("Response body (error)", {
            requestId,
            body: sanitizeBody(resBody),
          });
        }
      } catch {
        // Ignore errors reading body
      }
    }

    return response;
  }) as T;
}

