;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="43be1a60-7d6c-35ba-b36b-c80885f40b2d")}catch(e){}}();
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
"[project]/lib/sentry-context.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/sentry-context.ts
// Helper functions to set user context in Sentry
__turbopack_context__.s([
    "addSentryContext",
    ()=>addSentryContext,
    "clearSentryUser",
    ()=>clearSentryUser,
    "setSentryUser",
    ()=>setSentryUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@sentry/nextjs/build/cjs/index.server.js [app-route] (ecmascript)");
;
function setSentryUser(user) {
    try {
        if (!user) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setUser"](null);
            return;
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setUser"]({
            id: user.id,
            email: user.email,
            username: user.email
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setTag"]("user_role", "admin");
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setTag"]("user_id", user.id);
    } catch (error) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
    }
}
function clearSentryUser() {
    try {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setUser"](null);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setTag"]("user_role", undefined);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setTag"]("user_id", undefined);
    } catch (error) {
    // Silently fail if Sentry is not initialized
    }
}
function addSentryContext(key, context) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$nextjs$2f$build$2f$cjs$2f$index$2e$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setContext"](key, context);
}
}),
"[project]/lib/sanitize.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/sanitize.ts
// Input sanitization utilities to prevent XSS attacks
// Simple regex-based HTML sanitization (works on both server and client)
__turbopack_context__.s([
    "escapeRegex",
    ()=>escapeRegex,
    "sanitizeFileName",
    ()=>sanitizeFileName,
    "sanitizeHtml",
    ()=>sanitizeHtml,
    "sanitizeNotes",
    ()=>sanitizeNotes,
    "sanitizeText",
    ()=>sanitizeText,
    "sanitizeUrl",
    ()=>sanitizeUrl,
    "validateEmail",
    ()=>validateEmail
]);
function simpleSanitizeHtml(input) {
    if (typeof input !== "string") {
        return "";
    }
    // Remove all HTML tags and decode entities
    let cleaned = input.replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/").replace(/&amp;/g, "&");
    return cleaned;
}
function sanitizeHtml(input) {
    // Use simple regex-based sanitization to avoid jsdom build issues
    return simpleSanitizeHtml(input);
}
function sanitizeText(input) {
    if (typeof input !== "string") {
        return "";
    }
    // First sanitize HTML, then decode HTML entities
    const sanitized = sanitizeHtml(input);
    // Decode common HTML entities
    const decoded = sanitized.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/").replace(/&#x60;/g, "`").replace(/&#x3D;/g, "=");
    return decoded.trim();
}
function sanitizeFileName(input) {
    if (typeof input !== "string") {
        return "file";
    }
    // Remove path separators and dangerous characters
    let sanitized = input.replace(/[\/\\]/g, "") // Remove path separators
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/[<>:"|?*]/g, "") // Remove Windows reserved characters
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove control characters
    .trim();
    // Limit length
    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255);
    }
    // Ensure it's not empty or just dots
    if (!sanitized || sanitized === "." || sanitized === "..") {
        return "file";
    }
    return sanitized;
}
function validateEmail(input) {
    if (typeof input !== "string") {
        return false;
    }
    // RFC 5322 compliant email regex (simplified but strict)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    // Additional checks
    if (input.length > 254) {
        return false; // RFC 5321 limit
    }
    const parts = input.split("@");
    if (parts.length !== 2) {
        return false;
    }
    const [localPart, domain] = parts;
    // Local part checks
    if (localPart.length === 0 || localPart.length > 64) {
        return false; // RFC 5321 limit
    }
    // Domain checks
    if (domain.length === 0 || domain.length > 253) {
        return false;
    }
    // Check for dangerous patterns
    if (input.includes("<") || input.includes(">") || input.includes("javascript:") || input.includes("data:") || input.includes("vbscript:")) {
        return false;
    }
    return emailRegex.test(input);
}
function escapeRegex(input) {
    if (typeof input !== "string") {
        return "";
    }
    // Escape all regex special characters
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sanitizeUrl(input) {
    if (typeof input !== "string") {
        return "";
    }
    const trimmed = input.trim();
    // Block dangerous protocols
    const dangerousProtocols = [
        "javascript:",
        "data:",
        "vbscript:",
        "file:",
        "about:"
    ];
    const lowerInput = trimmed.toLowerCase();
    for (const protocol of dangerousProtocols){
        if (lowerInput.startsWith(protocol)) {
            return "";
        }
    }
    // Only allow http, https, mailto, tel
    const allowedProtocols = [
        "http:",
        "https:",
        "mailto:",
        "tel:"
    ];
    const hasAllowedProtocol = allowedProtocols.some((protocol)=>lowerInput.startsWith(protocol));
    if (!hasAllowedProtocol && trimmed.includes("://")) {
        return "";
    }
    return trimmed;
}
function sanitizeNotes(input) {
    if (typeof input !== "string") {
        return "";
    }
    // Strip all HTML tags for notes (security first)
    return simpleSanitizeHtml(input).trim();
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/lib/email.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/email.ts
// Email utility for sending registration confirmation emails using Resend
__turbopack_context__.s([
    "sendRegistrationConfirmation",
    ()=>sendRegistrationConfirmation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/resend/dist/index.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [app-route] (ecmascript)");
;
;
;
let resend = null;
function getResend() {
    if (!resend) {
        const apiKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getResendApiKey"])();
        resend = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Resend"](apiKey);
    }
    return resend;
}
async function sendRegistrationConfirmation(params) {
    try {
        const eventTypeLabels = {
            tn: 'Traditional (TN)',
            wu: 'Warm-Up (WU)',
            sc: 'Short Course (SC)'
        };
        const { data, error } = await getResend().emails.send({
            from: 'SDBA Test <onboarding@resend.dev>',
            to: params.emails.filter(Boolean),
            subject: `Registration Confirmed - ${params.teamName}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">SDBA Registration Confirmed</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Dear ${params.managerName},</p>
            
            <p>Your registration has been <strong style="color: #16a34a;">approved</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                Registration Details
              </h3>
              <table style="width: 100%;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Reference:</td><td><strong>${params.referenceNumber}</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Team:</td><td>${params.teamName}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Event:</td><td>${eventTypeLabels[params.eventType] || params.eventType.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Category:</td><td>${params.category}</td></tr>
                ${params.totalAmount ? `<tr><td style="padding: 8px 0; color: #6b7280;">Total:</td><td><strong>HK$${params.totalAmount.toLocaleString()}</strong></td></tr>` : ''}
              </table>
            </div>
            
            <p>Please bring this confirmation to race day check-in.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questions? Contact us at info@sdba.org.hk
            </p>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            Stanley Dragon Boat Association<br />
            © ${new Date().getFullYear()} All rights reserved
          </div>
        </div>
      `
        });
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error('Resend error:', error);
            return {
                success: false,
                error: error.message
            };
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug('Email sent:', data);
        return {
            success: true
        };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error('Email send failed:', errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
}
}),
"[project]/app/api/admin/approve/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseServer.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api-errors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/instrumentation/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sentry$2d$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sentry-context.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sanitize.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$email$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/email.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
const ApprovePayload = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    registration_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    notes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().transform((val)=>val ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeNotes"])(val) : undefined)
});
async function POST(req) {
    try {
        // Note: CSRF protection is handled in middleware.ts
        // This route only processes requests that have passed CSRF validation
        // Check admin authentication
        const { isAdmin, user } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkAdmin"])(req);
        if (!isAdmin || !user) {
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].forbidden();
        }
        // Set user context in Sentry
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sentry$2d$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setSentryUser"])(user);
        // Parse and validate body
        const body = await req.json();
        const payload = ApprovePayload.parse(body);
        // Call RPC function approve_registration with performance tracking
        const rpcParams = {
            reg_id: payload.registration_id,
            admin_user_id: user.id,
            notes: payload.notes || null
        };
        const { data, error } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackRpcCall"])(async ()=>{
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].rpc("approve_registration", rpcParams);
            return result;
        }, "approve_registration", rpcParams);
        if (error) {
            // Track failed approval (fire and forget)
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackRegistrationEvent"])("approve", payload.registration_id, user.id, false, new Error(error.message)).catch(()=>{});
            // Check if error is "not found or not pending"
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes("not found") || errorMessage.includes("not pending") || errorMessage.includes("already_processed")) {
                throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].conflict("Registration already processed or not found", "ALREADY_PROCESSED");
            }
            // Other database errors
            throw __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ApiErrors"].internalServerError(error.message);
        }
        // Track successful approval (fire and forget)
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["trackRegistrationEvent"])("approve", payload.registration_id, user.id, true).catch(()=>{});
        // Send confirmation email (fire and forget - don't block response)
        sendConfirmationEmail(payload.registration_id).catch((err)=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error('Background email send failed:', err);
        });
        // Success: return team_meta_id
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            team_meta_id: data
        });
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleApiError"])(error);
    }
}
/**
 * Fetch registration details and send confirmation email
 * Runs in background - errors are logged but don't affect response
 */ async function sendConfirmationEmail(registrationId) {
    // Fetch registration details
    const { data: registration, error: fetchError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseServer"].from('registration_meta').select('*').eq('id', registrationId).single();
    if (fetchError || !registration) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error('Failed to fetch registration for email:', fetchError?.message);
        return;
    }
    // Collect emails (filter out empty/null)
    const emails = [
        registration.email_1,
        registration.email_2,
        registration.email_3
    ].filter((e)=>Boolean(e));
    if (emails.length === 0) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].warn('No emails found for registration:', registrationId);
        return;
    }
    // Send email
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$email$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendRegistrationConfirmation"])({
        emails,
        managerName: registration.team_manager_1 || 'Team Manager',
        teamName: registration.team_name,
        eventType: registration.event_type,
        category: registration.category || '',
        referenceNumber: registration.reference_number || registrationId.slice(0, 8).toUpperCase(),
        totalAmount: registration.total_amount
    });
    if (!result.success) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error('Email send failed for registration:', registrationId, result.error);
    } else {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].debug('Confirmation email sent for registration:', registrationId);
    }
}
}),
];

//# debugId=43be1a60-7d6c-35ba-b36b-c80885f40b2d
//# sourceMappingURL=%5Broot-of-the-server%5D__dfffaef3._.js.map