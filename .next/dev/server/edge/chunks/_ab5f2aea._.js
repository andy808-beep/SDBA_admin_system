(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/_ab5f2aea._.js",
"[project]/instrumentation.ts [instrumentation-edge] (ecmascript)", ((__turbopack_context__) => {
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
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
// Edge runtime instrumentation is minimal and doesn't need Sentry imports
// Sentry tracking in middleware is handled directly via Sentry SDK
}
}),
"[project]/edge-wrapper.js { MODULE => \"[project]/instrumentation.ts [instrumentation-edge] (ecmascript)\" } [instrumentation-edge] (ecmascript)", ((__turbopack_context__, module, exports) => {

self._ENTRIES ||= {};
const modProm = Promise.resolve().then(()=>__turbopack_context__.i("[project]/instrumentation.ts [instrumentation-edge] (ecmascript)"));
modProm.catch(()=>{});
self._ENTRIES["middleware_instrumentation"] = new Proxy(modProm, {
    get (modProm, name) {
        if (name === "then") {
            return (res, rej)=>modProm.then(res, rej);
        }
        let result = (...args)=>modProm.then((mod)=>(0, mod[name])(...args));
        result.then = (res, rej)=>modProm.then((mod)=>mod[name]).then(res, rej);
        return result;
    }
});
}),
]);

//# sourceMappingURL=_ab5f2aea._.js.map