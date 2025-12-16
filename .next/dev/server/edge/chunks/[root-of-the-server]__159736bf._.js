(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__159736bf._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/env.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/env.ts
// Environment variable validation and access
__turbopack_context__.s([
    "env",
    ()=>env
]);
const isServer = ("TURBOPACK compile-time value", "undefined") === "undefined";
/**
 * Validates that all required environment variables are present
 * Only validates on the server (fail-fast)
 * On client, variables should be embedded at build time
 */ function validateEnv() {
    // Server-side variables (only available on server)
    const serverRequired = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'CSRF_SECRET'
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
// On client, we don't validate here - variables should be embedded at build time
// If they're missing, we'll get undefined values which will cause errors at usage time
}
// Validate on module load (server-side only)
validateEnv();
const env = {
    // Client-side variables (embedded at build time)
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    // Server-side variable - only available on server
    SUPABASE_SERVICE_ROLE_KEY: ("TURBOPACK compile-time truthy", 1) ? process.env.SUPABASE_SERVICE_ROLE_KEY || '' : "TURBOPACK unreachable"
};
}),
"[project]/lib/request-context.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
        const { AsyncLocalStorage: AsyncLocalStorage1 } = __turbopack_context__.r("[externals]/node:async_hooks [external] (node:async_hooks, cjs)");
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
"[project]/lib/log-sanitizer.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/logger.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/logger.ts
// Enhanced structured logging with PII sanitization and request context
__turbopack_context__.s([
    "LogLevel",
    ()=>LogLevel,
    "logger",
    ()=>logger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$breadcrumbs$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@sentry/core/build/esm/breadcrumbs.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@sentry/core/build/esm/exports.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$request$2d$context$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/request-context.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/log-sanitizer.ts [middleware-edge] (ecmascript)");
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
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$request$2d$context$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getRequestContext"])();
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
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        // Sanitize additional arguments
        if (args.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args);
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
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        if (args.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args);
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
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
        };
        if (args.length > 0) {
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args);
        }
        console.warn(formatLogEntry(entry));
        // Add warning as breadcrumb to Sentry
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$breadcrumbs$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["addBreadcrumb"]({
                level: "warning",
                message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(message),
                data: args.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(args.length === 1 ? args[0] : args) : undefined
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
            message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(message)
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
            entry.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(otherArgs.length === 1 ? otherArgs[0] : otherArgs);
        }
        console.error(formatLogEntry(entry));
        // Send error to Sentry
        try {
            if (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["captureException"](error, {
                    level: "error",
                    extra: {
                        message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(message),
                        data: otherArgs.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(otherArgs.length === 1 ? otherArgs[0] : otherArgs) : undefined
                    }
                });
            } else {
                const fullMessage = [
                    message,
                    ...otherArgs.map((arg)=>String(arg))
                ].join(" ");
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["captureMessage"]((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeString"])(fullMessage), {
                    level: "error",
                    extra: {
                        data: otherArgs.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$log$2d$sanitizer$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["sanitizeObject"])(otherArgs.length === 1 ? otherArgs[0] : otherArgs) : undefined
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
        const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$request$2d$context$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getRequestContext"])();
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
"[project]/lib/instrumentation/server.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
            Sentry = await Promise.resolve().then(()=>__turbopack_context__.i("[project]/node_modules/@sentry/nextjs/build/esm/edge/index.js [middleware-edge] (ecmascript)"));
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
"[project]/lib/auth.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/auth.ts
// Shared authentication and authorization utilities
__turbopack_context__.s([
    "checkAdmin",
    ()=>checkAdmin,
    "isAdminUser",
    ()=>isAdminUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$headers$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/headers.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$request$2f$cookies$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/request/cookies.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/instrumentation/server.ts [middleware-edge] (ecmascript)");
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
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$request$2f$cookies$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["cookies"])();
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_URL, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_ANON_KEY, {
            cookies: {
                getAll () {
                    return cookieStore.getAll();
                },
                setAll (cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                    } catch (err) {
                        // Ignore cookie setting errors in API routes
                        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn("Cookie set error:", err);
                    }
                }
            }
        });
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            // Fire and forget - don't await to avoid blocking
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["trackAuthFailure"])(error?.message || "No user found", undefined, undefined).catch(()=>{});
            return {
                isAdmin: false,
                user: null
            };
        }
        const isAdmin = isAdminUser(user);
        if (!isAdmin) {
            // Fire and forget - don't await to avoid blocking
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["trackAuthFailure"])("User is not an admin", user.id, user.email).catch(()=>{});
        }
        return {
            isAdmin,
            user: user
        };
    } catch (err) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].error("checkAdmin error:", err);
        // Fire and forget - don't await to avoid blocking
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$instrumentation$2f$server$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["trackAuthFailure"])("checkAdmin exception", undefined, undefined).catch(()=>{});
        return {
            isAdmin: false,
            user: null
        };
    }
}
}),
"[project]/lib/ratelimit.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/ratelimit.ts
// Rate limiting configuration and utilities
// Uses Upstash Redis for production, in-memory for development
__turbopack_context__.s([
    "adminApiLimiter",
    ()=>adminApiLimiter,
    "checkAdminApiLimit",
    ()=>checkAdminApiLimit,
    "checkPublicApiLimit",
    ()=>checkPublicApiLimit,
    "getClientIp",
    ()=>getClientIp,
    "publicApiLimiter",
    ()=>publicApiLimiter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$ratelimit$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@upstash/ratelimit/dist/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$redis$2f$nodejs$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@upstash/redis/nodejs.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [middleware-edge] (ecmascript)");
;
;
;
/**
 * Rate limiting strategy:
 * - Public API routes (/api/public/*): 10 requests per 10 seconds per IP
 *   This prevents abuse of public registration endpoints
 * 
 * - Admin API routes (/api/admin/*): 100 requests per minute per user
 *   Higher limit for authenticated admin users, tracked by user ID
 */ // Check if we're in development mode
const isDevelopment = ("TURBOPACK compile-time value", "development") === "development";
// Check if Redis is configured (optional - falls back to in-memory)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
/**
 * Redis client for rate limiting
 * Uses Upstash Redis if configured, otherwise uses a simple in-memory implementation
 */ let redis = null;
let useInMemory = false;
if (redisUrl && redisToken) {
    try {
        redis = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$redis$2f$nodejs$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Redis"]({
            url: redisUrl,
            token: redisToken
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].info("Rate limiting: Using Upstash Redis");
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn("Rate limiting: Failed to initialize Redis, using in-memory fallback", error);
        useInMemory = true;
    }
} else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].info("Rate limiting: Using in-memory storage for development");
    }
    useInMemory = true;
}
/**
 * Simple in-memory rate limiter for development
 * Implements sliding window algorithm
 */ class InMemoryRateLimiter {
    store = new Map();
    windowMs;
    maxRequests;
    constructor(maxRequests, window){
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
    async limit(identifier) {
        const now = Date.now();
        const key = identifier;
        if (!this.store.has(key)) {
            this.store.set(key, []);
        }
        const requests = this.store.get(key);
        // Remove requests outside the window
        const cutoff = now - this.windowMs;
        const validRequests = requests.filter((timestamp)=>timestamp > cutoff);
        if (validRequests.length >= this.maxRequests) {
            // Rate limit exceeded
            const oldestRequest = Math.min(...validRequests);
            const reset = oldestRequest + this.windowMs;
            return {
                success: false,
                limit: this.maxRequests,
                remaining: 0,
                reset
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
            reset
        };
    }
}
const publicApiLimiter = useInMemory ? new InMemoryRateLimiter(10, "10 s") : new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$ratelimit$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Ratelimit"]({
    redis: redis,
    limiter: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$ratelimit$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Ratelimit"].slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@ratelimit/public-api"
});
const adminApiLimiter = useInMemory ? new InMemoryRateLimiter(100, "1 m") : new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$ratelimit$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Ratelimit"]({
    redis: redis,
    limiter: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$ratelimit$2f$dist$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Ratelimit"].slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "@ratelimit/admin-api"
});
async function checkPublicApiLimit(identifier) {
    try {
        // Bypass rate limiting in development if explicitly disabled
        if (isDevelopment && process.env.DISABLE_RATE_LIMIT === "true") {
            return {
                success: true,
                limit: 10,
                remaining: 10,
                reset: Date.now() + 10000
            };
        }
        const result = await publicApiLimiter.limit(identifier);
        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset
        };
    } catch (error) {
        // On rate limiter failure, allow request through but log error
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].error("Rate limiter error (public API):", error);
        return {
            success: true,
            limit: 10,
            remaining: 10,
            reset: Date.now() + 10000
        };
    }
}
async function checkAdminApiLimit(identifier) {
    try {
        // Bypass rate limiting in development if explicitly disabled
        if (isDevelopment && process.env.DISABLE_RATE_LIMIT === "true") {
            return {
                success: true,
                limit: 100,
                remaining: 100,
                reset: Date.now() + 60000
            };
        }
        const result = await adminApiLimiter.limit(identifier);
        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset
        };
    } catch (error) {
        // On rate limiter failure, allow request through but log error
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].error("Rate limiter error (admin API):", error);
        return {
            success: true,
            limit: 100,
            remaining: 100,
            reset: Date.now() + 60000
        };
    }
}
function getClientIp(req) {
    // Try NextRequest.ip property first (if available)
    // Note: req.ip is not available in Next.js 16, so we always extract from headers
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
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn("Could not determine client IP, using fallback");
    return "127.0.0.1";
}
}),
"[project]/lib/sentry-context.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@sentry/core/build/esm/exports.js [middleware-edge] (ecmascript)");
;
function setSentryUser(user) {
    try {
        if (!user) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setUser"](null);
            return;
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setUser"]({
            id: user.id,
            email: user.email,
            username: user.email
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setTag"]("user_role", "admin");
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setTag"]("user_id", user.id);
    } catch (error) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
    }
}
function clearSentryUser() {
    try {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setUser"](null);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setTag"]("user_role", undefined);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setTag"]("user_id", undefined);
    } catch (error) {
    // Silently fail if Sentry is not initialized
    }
}
function addSentryContext(key, context) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$sentry$2f$core$2f$build$2f$esm$2f$exports$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setContext"](key, context);
}
}),
"[project]/lib/csrf-edge.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/csrf-edge.ts
// CSRF protection utilities for Edge Runtime (middleware)
// This file does NOT import Node.js crypto to maintain Edge Runtime compatibility
__turbopack_context__.s([
    "checkCsrfProtection",
    ()=>checkCsrfProtection,
    "getCsrfTokenFromCookie",
    ()=>getCsrfTokenFromCookie,
    "getCsrfTokenFromHeader",
    ()=>getCsrfTokenFromHeader,
    "requiresCsrfProtection",
    ()=>requiresCsrfProtection,
    "verifyCsrfRequest",
    ()=>verifyCsrfRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
function getCsrfTokenFromCookie(req) {
    const cookie = req.cookies.get(CSRF_COOKIE_NAME);
    return cookie?.value || null;
}
function getCsrfTokenFromHeader(req) {
    return req.headers.get(CSRF_HEADER_NAME) || null;
}
function verifyCsrfRequest(req) {
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
function requiresCsrfProtection(method) {
    const safeMethods = [
        "GET",
        "HEAD",
        "OPTIONS"
    ];
    return !safeMethods.includes(method.toUpperCase());
}
function checkCsrfProtection(req) {
    // Only check state-changing methods
    if (!requiresCsrfProtection(req.method)) {
        return null;
    }
    // Check CSRF token (cookie/header match only in Edge Runtime)
    if (!verifyCsrfRequest(req)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: "CSRF token validation failed",
            code: "CSRF_ERROR"
        }, {
            status: 403
        });
    }
    return null;
}
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// middleware.ts
__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$ratelimit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/ratelimit.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sentry$2d$context$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sentry-context.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2d$edge$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/csrf-edge.ts [middleware-edge] (ecmascript)");
;
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
async function middleware(req) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const url = req.nextUrl;
    const method = req.method;
    const path = url.pathname;
    const clientIp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$ratelimit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getClientIp"])(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    // Add request ID to response headers for correlation
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    res.headers.set("X-Request-ID", requestId);
    // Log request start
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].info("Request started", {
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
        const clientIp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$ratelimit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getClientIp"])(req);
        const rateLimitResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$ratelimit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["checkPublicApiLimit"])(clientIp);
        if (!rateLimitResult.success) {
            // Rate limit exceeded - return 429 Too Many Requests
            const resetTime = new Date(rateLimitResult.reset).toISOString();
            const duration = Date.now() - startTime;
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].request({
                method,
                path,
                statusCode: 429,
                duration,
                ip: clientIp,
                userAgent
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn("Rate limit exceeded for public API", {
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
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2d$edge$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["requiresCsrfProtection"])(req.method)) {
            const csrfError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$csrf$2d$edge$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["checkCsrfProtection"])(req);
            if (csrfError) {
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn(`CSRF validation failed for ${req.method} ${url.pathname}`);
                return csrfError;
            }
        }
        // CSRF token generation happens in /api/csrf-token endpoint (Node.js runtime)
        // Middleware only checks token presence and match (Edge Runtime compatible)
        // First check authentication to get user ID
        const { isAdmin, user } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["checkAdmin"])(req);
        // Set user context in Sentry for admin API routes
        if (user) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sentry$2d$context$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setSentryUser"])(user);
        } else {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sentry$2d$context$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clearSentryUser"])();
        }
        if (!isAdmin || !user) {
            // Authentication will be handled by the API route itself
            // We still need to check rate limit, but use IP as fallback
            const rateLimitResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$ratelimit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["checkPublicApiLimit"])(clientIp);
            if (!rateLimitResult.success) {
                const duration = Date.now() - startTime;
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].request({
                    method,
                    path,
                    statusCode: 429,
                    duration,
                    ip: clientIp,
                    userAgent
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn("Rate limit exceeded for admin API (unauthenticated)", {
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
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].request({
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
        const rateLimitResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$ratelimit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["checkAdminApiLimit"])(userId);
        if (!rateLimitResult.success) {
            // Rate limit exceeded - return 429 Too Many Requests
            const resetTime = new Date(rateLimitResult.reset).toISOString();
            const duration = Date.now() - startTime;
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].request({
                method,
                path,
                statusCode: 429,
                duration,
                ip: clientIp,
                userAgent,
                userId
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn("Rate limit exceeded for admin API", {
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
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].request({
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
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].request({
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
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_URL, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isAdminUser"])(user)) {
            const denied = new URL("/auth", req.url);
            denied.searchParams.set("error", "forbidden");
            denied.searchParams.set("redirectedFrom", url.pathname);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(denied);
        }
        return res;
    }
    // Existing auth page logic
    if (url.pathname === "/auth") {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_URL, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["env"].NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
        if (user && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isAdminUser"])(user)) {
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

//# sourceMappingURL=%5Broot-of-the-server%5D__159736bf._.js.map