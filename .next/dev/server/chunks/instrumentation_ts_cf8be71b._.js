;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="468ee6cb-a7b2-8d41-e83d-36f022f000cc")}catch(e){}}();
module.exports = [
"[project]/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// instrumentation.ts
// Custom instrumentation for Sentry performance tracking
// This file is automatically loaded by Next.js
__turbopack_context__.s([
    "register",
    ()=>register
]);
globalThis["_sentryNextJsVersion"] = "16.0.10";
globalThis["_sentryRewritesTunnelPath"] = "/monitoring";
async function register() {
    if ("TURBOPACK compile-time truthy", 1) {
        // Server-side instrumentation
        // Use dynamic import to avoid Edge Runtime analysis
        try {
            await __turbopack_context__.A("[project]/lib/instrumentation/server.ts [instrumentation] (ecmascript, async loader)");
        } catch (error) {
            // Silently fail if instrumentation can't be loaded
            console.warn('Failed to load server instrumentation:', error);
        }
    }
// Edge runtime instrumentation is minimal and doesn't need Sentry imports
// Sentry tracking in middleware is handled directly via Sentry SDK
}
}),
];

//# debugId=468ee6cb-a7b2-8d41-e83d-36f022f000cc
//# sourceMappingURL=instrumentation_ts_cf8be71b._.js.map