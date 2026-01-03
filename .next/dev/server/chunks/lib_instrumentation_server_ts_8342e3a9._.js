;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="cc797a14-9cf5-e498-7581-c0a17ceb1856")}catch(e){}}();
module.exports = [
"[project]/lib/instrumentation/server.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
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
            Sentry = await __turbopack_context__.A("[project]/node_modules/@sentry/nextjs/build/cjs/index.server.js [instrumentation] (ecmascript, async loader)");
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
];

//# debugId=cc797a14-9cf5-e498-7581-c0a17ceb1856
//# sourceMappingURL=lib_instrumentation_server_ts_8342e3a9._.js.map