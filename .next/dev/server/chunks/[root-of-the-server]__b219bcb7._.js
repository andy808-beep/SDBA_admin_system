;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="14d436ec-a556-f373-d6a4-a7e330b8921e")}catch(e){}}();
module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/csrf.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/csrf.ts
// CSRF protection using double-submit cookie pattern
// NOTE: This file is for Node.js runtime (API routes) only
// For Edge Runtime (middleware), use lib/csrf-edge.ts
__turbopack_context__.s([
    "generateCsrfToken",
    ()=>generateCsrfToken,
    "getCsrfTokenFromCookie",
    ()=>getCsrfTokenFromCookie,
    "getCsrfTokenFromHeader",
    ()=>getCsrfTokenFromHeader,
    "setCsrfTokenCookie",
    ()=>setCsrfTokenCookie,
    "verifyCsrfToken",
    ()=>verifyCsrfToken
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_COOKIE_NAME_DEV = "csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
/**
 * Get CSRF secret from environment
 * Falls back to a default in development, but should be set in production
 */ function getCsrfSecret() {
    const secret = process.env.CSRF_SECRET;
    if (!secret) {
        // In production, this should have been caught by env validation
        // But we provide a helpful error message just in case
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // Development fallback (not secure, but allows development)
        console.warn("⚠️  CSRF_SECRET not set, using development fallback. Set CSRF_SECRET in production!");
        return "development-csrf-secret-change-in-production";
    }
    return secret;
}
function generateCsrfToken() {
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString("hex");
    const hmac = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", getCsrfSecret());
    hmac.update(token);
    const signature = hmac.digest("hex");
    return `${token}.${signature}`;
}
function verifyCsrfToken(token) {
    if (!token || typeof token !== "string") {
        return false;
    }
    const parts = token.split(".");
    if (parts.length !== 2) {
        return false;
    }
    const [tokenPart, signature] = parts;
    const hmac = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", getCsrfSecret());
    hmac.update(tokenPart);
    const expectedSignature = hmac.digest("hex");
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(signature, expectedSignature);
}
/**
 * Timing-safe string comparison
 * Prevents timing attacks when comparing tokens
 */ function timingSafeEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for(let i = 0; i < a.length; i++){
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
function getCsrfTokenFromCookie(req) {
    // Try both cookie names (dev and prod) for compatibility
    const prodCookie = req.cookies.get(CSRF_COOKIE_NAME);
    const devCookie = req.cookies.get(CSRF_COOKIE_NAME_DEV);
    return prodCookie?.value || devCookie?.value || null;
}
function getCsrfTokenFromHeader(req) {
    return req.headers.get(CSRF_HEADER_NAME) || null;
}
function setCsrfTokenCookie(res, token) {
    // __Host- prefix requires secure: true, but in development we use http://
    // So we need to use a different cookie name in development
    const cookieName = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" // __Host-csrf-token (requires secure: true)
     : "csrf-token"; // Regular cookie name for development
    res.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: ("TURBOPACK compile-time value", "development") === "production",
        sameSite: "strict",
        path: "/"
    });
} // Note: Edge-compatible functions (getCsrfTokenFromCookie, getCsrfTokenFromHeader, etc.)
 // are available in lib/csrf-edge.ts for middleware use
 // This file is for Node.js runtime (API routes) only
}),
"[project]/app/api/csrf-token/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/csrf-token/route.ts
// Endpoint to get CSRF token for frontend
__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/csrf.ts [app-route] (ecmascript)");
;
;
async function GET(req) {
    try {
        // Check if token already exists and is valid
        const existingToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCsrfTokenFromCookie"])(req);
        if (existingToken) {
            // Return existing token
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: true,
                token: existingToken
            });
        }
        // Generate new token (Node.js runtime)
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCsrfToken"])();
        // Create response with token
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            token: token
        });
        // Set cookie in response
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setCsrfTokenCookie"])(response, token);
        return response;
    } catch (error) {
        console.error("[CSRF Token] Error generating token:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: error?.message || "Failed to generate CSRF token",
            details: ("TURBOPACK compile-time truthy", 1) ? error?.stack : "TURBOPACK unreachable"
        }, {
            status: 500
        });
    }
}
}),
];

//# debugId=14d436ec-a556-f373-d6a4-a7e330b8921e
//# sourceMappingURL=%5Broot-of-the-server%5D__b219bcb7._.js.map