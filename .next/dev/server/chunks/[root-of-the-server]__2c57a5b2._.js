;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="236a6e05-7dd3-cef5-1d5a-f3f2dee84906")}catch(e){}}();
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
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/lib/env.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/env.ts
// Environment variable validation and access
__turbopack_context__.s([
    "env",
    ()=>env,
    "getResendApiKey",
    ()=>getResendApiKey
]);
const isServer = ("TURBOPACK compile-time value", "undefined") === "undefined";
// Track if validation has been performed (lazy validation)
let envValidated = false;
/**
 * Validates that all required environment variables are present
 * Only validates on the server (fail-fast)
 * On client, variables should be embedded at build time
 * Uses lazy validation - only validates when first accessed
 */ function validateEnv() {
    // Skip if already validated
    if (envValidated) {
        return;
    }
    // Server-side variables (only available on server)
    const serverRequired = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'CSRF_SECRET',
        'RESEND_API_KEY'
    ];
    // Only validate server-side variables on the server
    if ("TURBOPACK compile-time truthy", 1) {
        const missing = [];
        // Validate server-side variables
        for (const key of serverRequired){
            if (!process.env[key]) {
                missing.push(key);
            }
        }
        // Also validate client-side variables on server (they should be available)
        const clientRequired = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        ];
        for (const key of clientRequired){
            if (!process.env[key]) {
                missing.push(key);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` + 'Please check your .env.local file or environment configuration.');
        }
    }
    // Mark as validated
    envValidated = true;
// On client, we don't validate here - variables should be embedded at build time
// If they're missing, we'll get undefined values which will cause errors at usage time
}
const env = {
    // Client-side variables (embedded at build time)
    get NEXT_PUBLIC_SUPABASE_URL () {
        validateEnv();
        return ("TURBOPACK compile-time value", "https://khqarcvszewerjckmtpg.supabase.co") || '';
    },
    get NEXT_PUBLIC_SUPABASE_ANON_KEY () {
        validateEnv();
        return ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY") || '';
    },
    // Server-side variable - only available on server
    get SUPABASE_SERVICE_ROLE_KEY () {
        validateEnv();
        return ("TURBOPACK compile-time truthy", 1) ? process.env.SUPABASE_SERVICE_ROLE_KEY || '' : "TURBOPACK unreachable";
    }
};
function getResendApiKey() {
    validateEnv(); // Ensure env is validated before accessing
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        throw new Error('Missing RESEND_API_KEY environment variable');
    }
    return key;
}
}),
"[project]/lib/supabaseServer.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/supabaseServer.ts (server-only)
__turbopack_context__.s([
    "supabaseServer",
    ()=>supabaseServer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [app-route] (ecmascript)");
;
;
const supabaseServer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_URL, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
}),
"[externals]/perf_hooks [external] (perf_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("perf_hooks", () => require("perf_hooks"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/require-in-the-middle [external] (require-in-the-middle, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("require-in-the-middle", () => require("require-in-the-middle"));

module.exports = mod;
}),
"[externals]/import-in-the-middle [external] (import-in-the-middle, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("import-in-the-middle", () => require("import-in-the-middle"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[externals]/node:diagnostics_channel [external] (node:diagnostics_channel, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:diagnostics_channel", () => require("node:diagnostics_channel"));

module.exports = mod;
}),
"[externals]/node:events [external] (node:events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:events", () => require("node:events"));

module.exports = mod;
}),
"[externals]/diagnostics_channel [external] (diagnostics_channel, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("diagnostics_channel", () => require("diagnostics_channel"));

module.exports = mod;
}),
"[externals]/node:child_process [external] (node:child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:child_process", () => require("node:child_process"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:os [external] (node:os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:os", () => require("node:os"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[externals]/node:readline [external] (node:readline, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:readline", () => require("node:readline"));

module.exports = mod;
}),
"[externals]/node:worker_threads [external] (node:worker_threads, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:worker_threads", () => require("node:worker_threads"));

module.exports = mod;
}),
"[externals]/node:http [external] (node:http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:http", () => require("node:http"));

module.exports = mod;
}),
"[externals]/node:module [external] (node:module, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:module", () => require("node:module"));

module.exports = mod;
}),
"[externals]/tty [external] (tty, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tty", () => require("tty"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/module [external] (module, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("module", () => require("module"));

module.exports = mod;
}),
"[externals]/async_hooks [external] (async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("async_hooks", () => require("async_hooks"));

module.exports = mod;
}),
"[externals]/node:https [external] (node:https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:https", () => require("node:https"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/node:zlib [external] (node:zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:zlib", () => require("node:zlib"));

module.exports = mod;
}),
"[externals]/node:net [external] (node:net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:net", () => require("node:net"));

module.exports = mod;
}),
"[externals]/node:tls [external] (node:tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:tls", () => require("node:tls"));

module.exports = mod;
}),
"[externals]/worker_threads [external] (worker_threads, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("worker_threads", () => require("worker_threads"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[project]/lib/request-context.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/request-context.ts
// Request context for correlation IDs and request tracking
// Note: AsyncLocalStorage is only available in Node.js, not Edge runtime
// For Edge runtime (middleware), we use a simpler approach with request headers
__turbopack_context__.s([
    "createRequestContext",
    ()=>createRequestContext,
    "generateRequestId",
    ()=>generateRequestId,
    "getRequestContext",
    ()=>getRequestContext,
    "getRequestId",
    ()=>getRequestId,
    "withRequestContext",
    ()=>withRequestContext
]);
let asyncLocalStorage = null;
try {
    // Try to import AsyncLocalStorage (Node.js only)
    if ("TURBOPACK compile-time truthy", 1) {
        const { AsyncLocalStorage: AsyncLocalStorage1 } = __turbopack_context__.r("[externals]/async_hooks [external] (async_hooks, cjs)");
        asyncLocalStorage = new AsyncLocalStorage1();
    }
} catch  {
    // AsyncLocalStorage not available (Edge runtime)
    asyncLocalStorage = null;
}
/**
 * AsyncLocalStorage for request context
 * This allows us to access request context anywhere in the request lifecycle
 */ const requestContextStorage = new AsyncLocalStorage();
function getRequestContext() {
    if (!asyncLocalStorage) {
        return null; // Edge runtime - context not available
    }
    return asyncLocalStorage.getStore() || null;
}
function getRequestId() {
    const context = getRequestContext();
    return context?.requestId || null;
}
function withRequestContext(context, fn) {
    if (!asyncLocalStorage) {
        // Edge runtime - just run the function without context
        return fn();
    }
    return asyncLocalStorage.run(context, fn);
}
function generateRequestId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `REQ-${timestamp}-${random}`;
}
function createRequestContext(options) {
    return {
        requestId: options.requestId || generateRequestId(),
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent,
        startTime: Date.now(),
        method: options.method,
        path: options.path
    };
}
}),
"[project]/lib/log-sanitizer.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/log-sanitizer.ts
// PII (Personally Identifiable Information) sanitization for logs
/**
 * Sensitive fields that should be redacted from logs
 */ __turbopack_context__.s([
    "hashEmail",
    ()=>hashEmail,
    "maskPhone",
    ()=>maskPhone,
    "sanitizeBody",
    ()=>sanitizeBody,
    "sanitizeHeaders",
    ()=>sanitizeHeaders,
    "sanitizeObject",
    ()=>sanitizeObject,
    "sanitizeString",
    ()=>sanitizeString
]);
const SENSITIVE_FIELDS = [
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "authorization",
    "auth",
    "credit_card",
    "cc_number",
    "card_number",
    "cvv",
    "cvc",
    "ssn",
    "social_security",
    "ssn_number",
    "phone",
    "mobile",
    "telephone",
    "email",
    "email_address"
];
/**
 * Patterns to detect and redact sensitive data
 */ const SENSITIVE_PATTERNS = [
    /password["\s:=]+([^"}\s,]+)/gi,
    /token["\s:=]+([^"}\s,]+)/gi,
    /secret["\s:=]+([^"}\s,]+)/gi,
    /api[_-]?key["\s:=]+([^"}\s,]+)/gi,
    /authorization["\s:=]+([^"}\s,]+)/gi,
    /bearer\s+([a-zA-Z0-9._-]+)/gi,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b\d{3}\.\d{2}\.\d{4}\b/g
];
function hashEmail(email) {
    if (!email || typeof email !== "string") {
        return "[invalid]";
    }
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) {
        return "[invalid]";
    }
    // Show first 3 characters of local part, hash the rest
    const visiblePart = localPart.substring(0, 3);
    const hash = simpleHash(localPart + domain);
    return `${visiblePart}***@${domain}`;
}
/**
 * Simple hash function for email hashing
 */ function simpleHash(str) {
    let hash = 0;
    for(let i = 0; i < str.length; i++){
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
}
function maskPhone(phone) {
    if (!phone || typeof phone !== "string") {
        return "[invalid]";
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) {
        return "***";
    }
    return `***-***-${digits.slice(-4)}`;
}
function sanitizeObject(obj, depth = 0) {
    if (depth > 10) {
        return "[max depth reached]";
    }
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj !== "object") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item)=>sanitizeObject(item, depth + 1));
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)){
        const lowerKey = key.toLowerCase();
        // Check if field is sensitive
        if (SENSITIVE_FIELDS.some((field)=>lowerKey.includes(field))) {
            if (typeof value === "string") {
                // Special handling for emails
                if (lowerKey.includes("email")) {
                    sanitized[key] = hashEmail(value);
                } else if (lowerKey.includes("phone") || lowerKey.includes("mobile")) {
                    sanitized[key] = maskPhone(value);
                } else {
                    sanitized[key] = "[REDACTED]";
                }
            } else {
                sanitized[key] = "[REDACTED]";
            }
        } else if (typeof value === "object" && value !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeObject(value, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
function sanitizeString(str) {
    if (!str || typeof str !== "string") {
        return str;
    }
    let sanitized = str;
    // Replace sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS){
        sanitized = sanitized.replace(pattern, (match)=>{
            if (match.length > 20) {
                return match.substring(0, 10) + "***[REDACTED]";
            }
            return "[REDACTED]";
        });
    }
    return sanitized;
}
function sanitizeBody(body) {
    if (!body) {
        return body;
    }
    if (typeof body === "string") {
        try {
            const parsed = JSON.parse(body);
            return sanitizeObject(parsed);
        } catch  {
            return sanitizeString(body);
        }
    }
    if (typeof body === "object") {
        return sanitizeObject(body);
    }
    return body;
}
function sanitizeHeaders(headers) {
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)){
        const lowerKey = key.toLowerCase();
        // Redact sensitive headers
        if (lowerKey.includes("authorization") || lowerKey.includes("cookie") || lowerKey.includes("x-api-key") || lowerKey.includes("x-csrf-token")) {
            sanitized[key] = "[REDACTED]";
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
}),
"[project]/lib/logger.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/logger.ts
// Enhanced structured logging with PII sanitization and request context
__turbopack_context__.s([
    "LogLevel",
    ()=>LogLevel,
    "logger",
    ()=>logger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@sentry/nextjs/build/cjs/index.server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$request$2d$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/request-context.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/log-sanitizer.ts [app-route] (ecmascript)");
;
;
;
var LogLevel = /*#__PURE__*/ function(LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    return LogLevel;
}({});
const isDevelopment = ("TURBOPACK compile-time value", "development") === "development";
const isProduction = ("TURBOPACK compile-time value", "development") === "production";
/**
 * Log sampling configuration
 * In production, log 100% of errors, but sample other logs
 */ const LOG_SAMPLING = {
    ["DEBUG"]: ("TURBOPACK compile-time truthy", 1) ? 1.0 : "TURBOPACK unreachable",
    ["INFO"]: ("TURBOPACK compile-time truthy", 1) ? 1.0 : "TURBOPACK unreachable",
    ["WARN"]: ("TURBOPACK compile-time truthy", 1) ? 1.0 : "TURBOPACK unreachable",
    ["ERROR"]: 1.0
};
/**
 * Check if a log entry should be logged based on sampling
 */ function shouldLog(level) {
    const sampleRate = LOG_SAMPLING[level];
    return Math.random() < sampleRate;
}
/**
 * Format log entry for output
 */ function formatLogEntry(entry) {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$request$2d$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRequestContext"])();
    // Add request context if available
    if (context) {
        entry.requestId = context.requestId;
        if (context.userId) {
            entry.userId = context.userId;
        }
    }
    if ("TURBOPACK compile-time truthy", 1) {
        // Pretty format for development
        const prefix = `[${entry.timestamp}] [${entry.level}]`;
        const contextStr = entry.requestId ? `[${entry.requestId}]` : "";
        const message = entry.message;
        const extra = Object.keys(entry).filter((key)=>![
                "timestamp",
                "level",
                "message",
                "requestId",
                "userId"
            ].includes(key)).map((key)=>`${key}=${JSON.stringify(entry[key])}`).join(" ");
        return `${prefix} ${contextStr} ${message} ${extra}`.trim();
    } else //TURBOPACK unreachable
    ;
}
const logger = {
    /**
   * Debug logs - only in development
   */ debug: (message, ...args)=>{
        if (!shouldLog("DEBUG")) return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: "DEBUG",
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        // Sanitize additional arguments
        if (args.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args);
        }
        console.log(formatLogEntry(entry));
    },
    /**
   * Info logs
   */ info: (message, ...args)=>{
        if (!shouldLog("INFO")) return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        if (args.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args);
        }
        console.info(formatLogEntry(entry));
    },
    /**
   * Warning logs - sent to Sentry as breadcrumb
   */ warn: (message, ...args)=>{
        if (!shouldLog("WARN")) return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: "WARN",
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        if (args.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args);
        }
        console.warn(formatLogEntry(entry));
        // Add warning as breadcrumb to Sentry
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addBreadcrumb"]({
                level: "warning",
                message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(message),
                data: args.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args) : undefined
            });
        } catch  {
        // Silently fail if Sentry is not initialized
        }
    },
    /**
   * Error logs - always logged, sent to Sentry
   */ error: (message, ...args)=>{
        if (!shouldLog("ERROR")) return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        // Extract error object if present
        const error = args.find((arg)=>arg instanceof Error);
        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: ("TURBOPACK compile-time truthy", 1) ? error.stack : "TURBOPACK unreachable"
            };
        }
        // Sanitize other arguments
        const otherArgs = args.filter((arg)=>!(arg instanceof Error));
        if (otherArgs.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(otherArgs.length === 1 ? otherArgs[0] : otherArgs);
        }
        console.error(formatLogEntry(entry));
        // Send error to Sentry
        try {
            if (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["captureException"](error, {
                    level: "error",
                    extra: {
                        message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(message),
                        data: otherArgs.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(otherArgs.length === 1 ? otherArgs[0] : otherArgs) : undefined
                    }
                });
            } else {
                const fullMessage = [
                    message,
                    ...otherArgs.map((arg)=>String(arg))
                ].join(" ");
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["captureMessage"]((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeString"])(fullMessage), {
                    level: "error",
                    extra: {
                        data: otherArgs.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeObject"])(otherArgs.length === 1 ? otherArgs[0] : otherArgs) : undefined
                    }
                });
            }
        } catch  {
        // Silently fail if Sentry is not initialized
        }
    },
    /**
   * Log a request
   */ request: (data)=>{
        const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$request$2d$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRequestContext"])();
        const level = data.statusCode >= 500 ? "ERROR" : data.statusCode >= 400 ? "WARN" : "INFO";
        if (!shouldLog(level)) return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: `${data.method} ${data.path} ${data.statusCode}`,
            method: data.method,
            path: data.path,
            statusCode: data.statusCode,
            duration: data.duration,
            requestId: context?.requestId
        };
        if (data.ip) {
            entry.ip = data.ip;
        }
        if (data.userAgent) {
            entry.userAgent = data.userAgent;
        }
        if (data.userId) {
            entry.userId = data.userId;
        }
        if (data.requestSize !== undefined) {
            entry.requestSize = data.requestSize;
        }
        if (data.responseSize !== undefined) {
            entry.responseSize = data.responseSize;
        }
        if (data.error) {
            entry.error = {
                name: data.error.name,
                message: data.error.message,
                stack: ("TURBOPACK compile-time truthy", 1) ? data.error.stack : "TURBOPACK unreachable"
            };
        }
        // Log slow requests as warnings
        if (data.duration > 5000) {
            entry.level = "ERROR";
            entry.message += " [VERY SLOW]";
        } else if (data.duration > 1000) {
            entry.level = "WARN";
            entry.message += " [SLOW]";
        }
        const logFn = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.info;
        logFn(formatLogEntry(entry));
    }
};
}),
"[project]/lib/instrumentation/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/instrumentation/server.ts
// Server-side Sentry instrumentation for API and database tracking
// NOTE: This file should only be imported in Node.js runtime (API routes, not middleware)
// Conditional import to avoid Edge Runtime issues
__turbopack_context__.s([
    "trackAuthFailure",
    ()=>trackAuthFailure,
    "trackDatabaseQuery",
    ()=>trackDatabaseQuery,
    "trackRegistrationEvent",
    ()=>trackRegistrationEvent,
    "trackRpcCall",
    ()=>trackRpcCall,
    "withApiPerformanceTracking",
    ()=>withApiPerformanceTracking
]);
let Sentry = null;
async function getSentry() {
    if (!Sentry && ("TURBOPACK compile-time value", "undefined") === "undefined") {
        try {
            Sentry = await __turbopack_context__.A("[project]/node_modules/@sentry/nextjs/build/cjs/index.server.js [app-route] (ecmascript, async loader)");
        } catch (error) {
            // Sentry not available (e.g., in test environment)
            return null;
        }
    }
    return Sentry;
}
function withApiPerformanceTracking(handler, routeName) {
    return async (...args)=>{
        const sentry = await getSentry();
        if (!sentry) {
            // Sentry not available, just run handler
            return handler(...args);
        }
        // Use startSpan instead of deprecated startTransaction
        return sentry.startSpan({
            name: routeName,
            op: "http.server",
            attributes: {
                route: routeName
            }
        }, async (span)=>{
            try {
                const result = await handler(...args);
                span?.setStatus({
                    code: 1,
                    message: "ok"
                }); // 1 = OK
                return result;
            } catch (error) {
                span?.setStatus({
                    code: 2,
                    message: "internal_error"
                }); // 2 = ERROR
                throw error;
            }
        });
    };
}
async function trackDatabaseQuery(operation, operationName, tableName) {
    const sentry = await getSentry();
    if (!sentry) {
        // Sentry not available, just run operation
        return operation();
    }
    const span = sentry.startSpan({
        op: "db.query",
        name: operationName,
        attributes: {
            table: tableName,
            operation: operationName
        }
    }, async ()=>{
        try {
            const result = await operation();
            return result;
        } catch (error) {
            sentry.captureException(error, {
                tags: {
                    operation: operationName,
                    table: tableName || "unknown",
                    error_type: "database_error"
                }
            });
            throw error;
        }
    });
    return span;
}
async function trackRpcCall(rpcFunction, functionName, params) {
    const sentry = await getSentry();
    if (!sentry) {
        // Sentry not available, just run function
        return rpcFunction();
    }
    return sentry.startSpan({
        op: "db.rpc",
        name: functionName,
        attributes: {
            function: functionName,
            params: params ? JSON.stringify(params) : undefined
        }
    }, async ()=>{
        try {
            const result = await rpcFunction();
            return result;
        } catch (error) {
            sentry.captureException(error, {
                tags: {
                    function: functionName,
                    error_type: "rpc_error"
                },
                extra: {
                    params
                }
            });
            throw error;
        }
    });
}
async function trackRegistrationEvent(eventType, registrationId, adminUserId, success, error) {
    try {
        const sentry = await getSentry();
        if (!sentry) {
            return; // Sentry not available
        }
        sentry.addBreadcrumb({
            category: "registration",
            message: `Registration ${eventType}: ${registrationId}`,
            level: success ? "info" : "error",
            data: {
                event_type: eventType,
                registration_id: registrationId,
                admin_user_id: adminUserId,
                success
            }
        });
        if (!success && error) {
            sentry.captureException(error, {
                tags: {
                    event_type: eventType,
                    operation: "registration_management"
                },
                extra: {
                    registration_id: registrationId,
                    admin_user_id: adminUserId
                }
            });
        }
    } catch (err) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
    }
}
async function trackAuthFailure(reason, userId, email) {
    try {
        const sentry = await getSentry();
        if (!sentry) {
            return; // Sentry not available
        }
        sentry.addBreadcrumb({
            category: "auth",
            message: `Authentication failure: ${reason}`,
            level: "warning",
            data: {
                reason,
                user_id: userId,
                email
            }
        });
    // Don't send to Sentry as an error (expected behavior)
    // Just log as breadcrumb for context
    } catch (error) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
    }
}
}),
"[project]/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/auth.ts
// Shared authentication and authorization utilities
__turbopack_context__.s([
    "checkAdmin",
    ()=>checkAdmin,
    "isAdminUser",
    ()=>isAdminUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/instrumentation/server.ts [app-route] (ecmascript)");
;
;
;
;
;
function isAdminUser(user) {
    if (!user) return false;
    const roles = user.app_metadata?.roles ?? user.user_metadata?.roles ?? [];
    const role = user.app_metadata?.role ?? user.user_metadata?.role;
    return roles?.includes("admin") || role === "admin" || user.user_metadata?.is_admin === true;
}
async function checkAdmin(req) {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_URL, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_ANON_KEY, {
            cookies: {
                getAll () {
                    return cookieStore.getAll();
                },
                setAll (cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                    } catch (err) {
                        // Ignore cookie setting errors in API routes
                        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].warn("Cookie set error:", err);
                    }
                }
            }
        });
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            // Fire and forget - don't await to avoid blocking
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackAuthFailure"])(error?.message || "No user found", undefined, undefined).catch(()=>{});
            return {
                isAdmin: false,
                user: null
            };
        }
        const isAdmin = isAdminUser(user);
        if (!isAdmin) {
            // Fire and forget - don't await to avoid blocking
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackAuthFailure"])("User is not an admin", user.id, user.email).catch(()=>{});
        }
        return {
            isAdmin,
            user: user
        };
    } catch (err) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("checkAdmin error:", err);
        // Fire and forget - don't await to avoid blocking
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackAuthFailure"])("checkAdmin exception", undefined, undefined).catch(()=>{});
        return {
            isAdmin: false,
            user: null
        };
    }
}
}),
"[project]/lib/api-errors.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/api-errors.ts
// Standardized API error handling with Sentry integration
__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "ApiErrors",
    ()=>ApiErrors,
    "handleApiError",
    ()=>handleApiError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@sentry/nextjs/build/cjs/index.server.js [app-route] (ecmascript)");
;
;
;
class ApiError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code){
        super(message), this.statusCode = statusCode, this.code = code;
        this.name = "ApiError";
    }
}
function handleApiError(error) {
    // Custom API errors
    if (error instanceof ApiError) {
        // Only log to Sentry if it's a server error (5xx)
        // Don't log expected client errors (4xx) except 500
        if (error.statusCode >= 500) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["captureException"](error, {
                level: 'error',
                tags: {
                    error_type: 'api_error',
                    error_code: error.code || 'UNKNOWN',
                    status_code: error.statusCode
                },
                extra: {
                    message: error.message,
                    code: error.code
                }
            });
        } else if (error.statusCode === 422) {
            // Validation errors - add as breadcrumb but don't send to Sentry
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addBreadcrumb"]({
                level: 'info',
                message: `Validation error: ${error.message}`,
                category: 'validation'
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: error.message,
            code: error.code
        }, {
            status: error.statusCode
        });
    }
    // Zod validation errors
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].ZodError) {
        // Validation errors are expected - don't send to Sentry
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addBreadcrumb"]({
            level: 'info',
            message: 'Zod validation error',
            category: 'validation',
            data: {
                issues: error.issues
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: "Invalid input",
            detail: error.issues
        }, {
            status: 422
        });
    }
    // Generic errors - always log to Sentry
    const message = error instanceof Error ? error.message : "Internal server error";
    const errorObj = error instanceof Error ? error : new Error(message);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["captureException"](errorObj, {
        level: 'error',
        tags: {
            error_type: 'generic_error'
        },
        extra: {
            message,
            originalError: error
        }
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: false,
        error: message
    }, {
        status: 500
    });
}
const ApiErrors = {
    forbidden: (message = "Forbidden")=>new ApiError(message, 403, "FORBIDDEN"),
    notFound: (message = "Resource not found")=>new ApiError(message, 404, "NOT_FOUND"),
    conflict: (message = "Conflict", code = "CONFLICT")=>new ApiError(message, 409, code),
    badRequest: (message = "Bad request")=>new ApiError(message, 400, "BAD_REQUEST"),
    unauthorized: (message = "Unauthorized")=>new ApiError(message, 401, "UNAUTHORIZED"),
    internalServerError: (message = "Internal server error")=>new ApiError(message, 500, "INTERNAL_ERROR")
};
}),
"[project]/lib/db-utils.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/db-utils.ts
// Database query utilities for performance monitoring and optimization
__turbopack_context__.s([
    "QUERY_TIMEOUT_MS",
    ()=>QUERY_TIMEOUT_MS,
    "SLOW_QUERY_THRESHOLD_MS",
    ()=>SLOW_QUERY_THRESHOLD_MS,
    "applyPagination",
    ()=>applyPagination,
    "applySearchFilter",
    ()=>applySearchFilter,
    "escapeIlikePattern",
    ()=>escapeIlikePattern,
    "executeCachedQuery",
    ()=>executeCachedQuery,
    "executeQuery",
    ()=>executeQuery,
    "getCacheStats",
    ()=>getCacheStats,
    "invalidateCache",
    ()=>invalidateCache,
    "validatePagination",
    ()=>validatePagination
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/instrumentation/server.ts [app-route] (ecmascript)");
;
;
const QUERY_TIMEOUT_MS = 30000; // 30 seconds
const SLOW_QUERY_THRESHOLD_MS = 100;
async function executeQuery(queryFn, queryName, tableName) {
    const startTime = performance.now();
    try {
        // Execute query with timeout
        const result = await Promise.race([
            queryFn(),
            new Promise((_, reject)=>setTimeout(()=>reject(new Error(`Query timeout: ${queryName}`)), QUERY_TIMEOUT_MS))
        ]);
        const executionTime = performance.now() - startTime;
        // Log slow queries in development
        if (("TURBOPACK compile-time value", "development") === "development" && executionTime > SLOW_QUERY_THRESHOLD_MS) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].warn(`Slow query detected: ${queryName}`, {
                executionTime: `${executionTime.toFixed(2)}ms`,
                table: tableName,
                threshold: `${SLOW_QUERY_THRESHOLD_MS}ms`
            });
        }
        // Track query performance in Sentry
        if (executionTime > SLOW_QUERY_THRESHOLD_MS) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackDatabaseQuery"])(async ()=>result, queryName, tableName);
        }
        // Log query execution time in development
        if ("TURBOPACK compile-time truthy", 1) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug(`Query executed: ${queryName}`, {
                executionTime: `${executionTime.toFixed(2)}ms`,
                table: tableName,
                hasError: !!result.error,
                rowCount: result.count ?? (Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0)
            });
        }
        return result;
    } catch (error) {
        const executionTime = performance.now() - startTime;
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error(`Query failed: ${queryName}`, {
            executionTime: `${executionTime.toFixed(2)}ms`,
            table: tableName,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
function applyPagination(query, page, pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    return query.range(from, to);
}
function validatePagination(page, pageSize) {
    const validatedPage = Math.max(1, parseInt(String(page || "1"), 10));
    const validatedPageSize = Math.min(100, Math.max(1, parseInt(String(pageSize || "50"), 10)));
    return {
        page: validatedPage,
        pageSize: validatedPageSize
    };
}
function escapeIlikePattern(input) {
    return input.replace(/[%'"_\\]/g, (char)=>{
        if (char === "%") return "\\%";
        if (char === "'") return "''";
        if (char === '"') return '""';
        if (char === "_") return "\\_";
        if (char === "\\") return "\\\\";
        return char;
    });
}
function applySearchFilter(query, searchTerm, columns) {
    if (!searchTerm || columns.length === 0) {
        return query;
    }
    const escapedTerm = escapeIlikePattern(searchTerm);
    const searchPattern = `%${escapedTerm}%`;
    // Build OR condition for multiple columns
    const conditions = columns.map((col)=>`${col}.ilike.${searchPattern}`).join(",");
    return query.or(conditions);
}
/**
 * Simple in-memory cache for query results
 * Note: For production, consider using Redis or similar
 */ class QueryCache {
    cache = new Map();
    maxSize = 100;
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, ttl) {
        // Evict oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl
        });
    }
    clear() {
        this.cache.clear();
    }
    delete(key) {
        this.cache.delete(key);
    }
}
// Global query cache instance
const queryCache = new QueryCache();
async function executeCachedQuery(queryFn, cacheConfig, queryName, tableName) {
    // Check cache first
    const cached = queryCache.get(cacheConfig.key);
    if (cached !== null) {
        if ("TURBOPACK compile-time truthy", 1) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug(`Cache hit: ${queryName}`, {
                key: cacheConfig.key,
                table: tableName
            });
        }
        return {
            data: cached,
            error: null
        };
    }
    // Execute query
    const result = await executeQuery(queryFn, queryName, tableName);
    // Cache successful results
    if (!result.error && result.data !== null) {
        queryCache.set(cacheConfig.key, result.data, cacheConfig.ttl);
    }
    return result;
}
function invalidateCache(tableName) {
    // In a simple implementation, we clear all cache
    // In production, you might want to implement more granular invalidation
    queryCache.clear();
    if ("TURBOPACK compile-time truthy", 1) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug(`Cache invalidated for table: ${tableName}`);
    }
}
function getCacheStats() {
    // Access private cache through a getter method
    return {
        size: queryCache.cache.size,
        maxSize: queryCache.maxSize
    };
}
}),
"[project]/app/api/admin/counters/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/admin/counters/route.ts
// Optimized counter queries with proper indexing
__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseServer.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api-errors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db-utils.ts [app-route] (ecmascript)");
;
;
;
;
;
;
async function GET(req) {
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug("[Counters API] GET request received");
    try {
        // Check admin authentication
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug("[Counters API] Checking admin authentication...");
        const { isAdmin } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkAdmin"])(req);
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug("[Counters API] Admin check result:", {
            isAdmin
        });
        if (!isAdmin) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug("[Counters API] Access denied - not admin");
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].forbidden();
        }
        // Get local midnight for today (in UTC)
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug("[Counters API] Today start (UTC):", todayStart.toISOString());
        // Execute all count queries in parallel for better performance
        // Uses indexes: idx_registration_meta_status for status counts
        const [totalResult, pendingResult, approvedResult, rejectedResult, newTodayResult] = await Promise.all([
            // Total count - uses primary key index
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeQuery"])(async ()=>await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].from("registration_meta").select("*", {
                    count: "exact",
                    head: true
                }), "count_total", "registration_meta"),
            // Pending count - uses idx_registration_meta_status
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeQuery"])(async ()=>await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].from("registration_meta").select("*", {
                    count: "exact",
                    head: true
                }).eq("status", "pending"), "count_pending", "registration_meta"),
            // Approved count - uses idx_registration_meta_status
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeQuery"])(async ()=>await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].from("registration_meta").select("*", {
                    count: "exact",
                    head: true
                }).eq("status", "approved"), "count_approved", "registration_meta"),
            // Rejected count - uses idx_registration_meta_status
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeQuery"])(async ()=>await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].from("registration_meta").select("*", {
                    count: "exact",
                    head: true
                }).eq("status", "rejected"), "count_rejected", "registration_meta"),
            // New today count - uses idx_registration_meta_created_at
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$utils$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeQuery"])(async ()=>await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].from("registration_meta").select("*", {
                    count: "exact",
                    head: true
                }).gte("created_at", todayStart.toISOString()), "count_new_today", "registration_meta")
        ]);
        // Check for errors
        if (totalResult.error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] totalError:", totalResult.error);
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].badRequest(totalResult.error.message);
        }
        if (pendingResult.error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] pendingError:", pendingResult.error);
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].badRequest(pendingResult.error.message);
        }
        if (approvedResult.error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] approvedError:", approvedResult.error);
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].badRequest(approvedResult.error.message);
        }
        if (rejectedResult.error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] rejectedError:", rejectedResult.error);
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].badRequest(rejectedResult.error.message);
        }
        if (newTodayResult.error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] newTodayError:", newTodayResult.error);
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].badRequest(newTodayResult.error.message);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            total: totalResult.count || 0,
            pending: pendingResult.count || 0,
            approved: approvedResult.count || 0,
            rejected: rejectedResult.count || 0,
            new_today: newTodayResult.count || 0
        });
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] Unexpected error:", error);
        if (error instanceof Error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error("[Counters API] Error stack:", error.stack);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleApiError"])(error);
    }
}
}),
];

//# debugId=236a6e05-7dd3-cef5-1d5a-f3f2dee84906
//# sourceMappingURL=%5Broot-of-the-server%5D__2c57a5b2._.js.map