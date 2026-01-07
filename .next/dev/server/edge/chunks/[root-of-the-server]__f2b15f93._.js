(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f2b15f93._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
// middleware.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@supabase/ssr'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/auth'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/ratelimit'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/logger'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/sentry-context'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/lib/csrf-edge'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
;
;
;
;
;
/**
 * Generate a unique request ID
 */ function generateRequestId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `REQ-${timestamp}-${random}`;
}
/**
 * Get request size in bytes (approximate)
 */ function getRequestSize(req) {
    // Approximate size based on headers and URL
    let size = req.url.length;
    req.headers.forEach((value, key)=>{
        size += key.length + value.length;
    });
    return size;
}
/**
 * Get Supabase environment variables for Edge Runtime
 * Validates at runtime (not module load time) to ensure .env.local is loaded
 * @throws Error if required environment variables are missing or invalid
 */ function getSupabaseEnv() {
    const url = ("TURBOPACK compile-time value", "https://khqarcvszewerjckmtpg.supabase.co");
    const anonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY");
    // Debug: Log what we're actually reading (first 50 chars only for security)
    console.log('[Middleware Debug] Reading env vars:', {
        urlExists: !!url,
        urlPreview: ("TURBOPACK compile-time truthy", 1) ? url.substring(0, 50) + '...' : "TURBOPACK unreachable",
        anonKeyExists: !!anonKey,
        anonKeyLength: anonKey?.length || 0
    });
    // Check if variables are missing
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Check if placeholder values are still present
    if (url.includes('your-supabase-url-here') || url.includes('placeholder') || anonKey.includes('your-supabase-anon-key-here') || anonKey.includes('placeholder')) {
        logger.error('Supabase environment variables contain placeholder values', {
            url: url.substring(0, 30) + '...',
            anonKeyLength: anonKey.length
        });
        throw new Error('Supabase environment variables contain placeholder values. ' + 'Please replace NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file ' + 'with your actual Supabase project URL and anon key from https://supabase.com/dashboard/project/_/settings/api');
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
            error: err instanceof Error ? err.message : String(err)
        });
        throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL format: "${url.substring(0, 50)}...". ` + 'Must be a valid HTTP or HTTPS URL (e.g., https://xxxxx.supabase.co)');
    }
    return {
        url,
        anonKey
    };
}
async function middleware(req) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const url = req.nextUrl;
    const method = req.method;
    const path = url.pathname;
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    // Add request ID to response headers for correlation
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    res.headers.set("X-Request-ID", requestId);
    // Log request start
    logger.info("Request started", {
        requestId,
        method,
        path,
        ip: clientIp,
        userAgent,
        query: Object.fromEntries(url.searchParams)
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
                userAgent
            });
            logger.warn("Rate limit exceeded for public API", {
                requestId,
                ip: clientIp,
                path
            });
            const errorResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Too Many Requests",
                message: "Rate limit exceeded. Please try again later.",
                limit: rateLimitResult.limit,
                remaining: rateLimitResult.remaining,
                reset: resetTime
            }, {
                status: 429,
                headers: {
                    "X-Request-ID": requestId,
                    "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                    "X-RateLimit-Reset": rateLimitResult.reset.toString(),
                    "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
                }
            });
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
                    userAgent
                });
                logger.warn("Rate limit exceeded for admin API (unauthenticated)", {
                    requestId,
                    ip: clientIp,
                    path
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Too Many Requests",
                    message: "Rate limit exceeded. Please try again later.",
                    limit: rateLimitResult.limit,
                    remaining: rateLimitResult.remaining,
                    reset: new Date(rateLimitResult.reset).toISOString()
                }, {
                    status: 429,
                    headers: {
                        "X-Request-ID": requestId,
                        "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                        "X-RateLimit-Reset": rateLimitResult.reset.toString(),
                        "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
                    }
                });
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
                userAgent
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
                userId
            });
            logger.warn("Rate limit exceeded for admin API", {
                requestId,
                userId,
                path
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Too Many Requests",
                message: "Rate limit exceeded. Please try again later.",
                limit: rateLimitResult.limit,
                remaining: rateLimitResult.remaining,
                reset: resetTime
            }, {
                status: 429,
                headers: {
                    "X-Request-ID": requestId,
                    "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                    "X-RateLimit-Reset": rateLimitResult.reset.toString(),
                    "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
                }
            });
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
            userId
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
            userAgent
        });
    }
    // Existing admin page protection logic
    if (url.pathname.startsWith("/admin")) {
        // Get Supabase env vars with runtime validation
        const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll () {
                    return req.cookies.getAll();
                },
                setAll (cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options })=>{
                        res.cookies.set(name, value, options);
                    });
                }
            }
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            const loginUrl = new URL("/auth", req.url);
            loginUrl.searchParams.set("redirectedFrom", url.pathname);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
        }
        if (!isAdminUser(user)) {
            const denied = new URL("/auth", req.url);
            denied.searchParams.set("error", "forbidden");
            denied.searchParams.set("redirectedFrom", url.pathname);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(denied);
        }
        return res;
    }
    // Existing auth page logic
    if (url.pathname === "/auth") {
        // Get Supabase env vars with runtime validation
        const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll () {
                    return req.cookies.getAll();
                },
                setAll (cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options })=>{
                        res.cookies.set(name, value, options);
                    });
                }
            }
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isAdminUser(user)) {
            const to = url.searchParams.get("redirectedFrom") || "/admin";
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(to, req.url));
        }
    }
    return res;
}
const config = {
    matcher: [
        "/admin/:path*",
        "/auth",
        "/api/public/:path*",
        "/api/admin/:path*"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b15f93._.js.map