"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** Match your vanilla routes */
type HashPath = "#overview" | "#applications" | "#practice" | "#exports";
const VALID: HashPath[] = ["#overview", "#applications", "#practice", "#exports"];

function parseHash(): { path: HashPath; params: URLSearchParams } {
  const raw = (typeof window !== "undefined" && window.location.hash) || "#overview";
  const [pathRaw, query = ""] = raw.split("?");
  const path = (VALID.includes(pathRaw as HashPath) ? pathRaw : "#overview") as HashPath;
  const params = new URLSearchParams(query);
  return { path, params };
}

export default function AdminPage() {
  const router = useRouter();

  // -------------------------------
  // Sidebar + Router state
  // -------------------------------
  const [path, setPath] = useState<HashPath>("#overview");
  const [params, setParams] = useState<URLSearchParams>(new URLSearchParams());

  // ---- Lifecycle: on mount + hashchange (parity with window.addEventListener('hashchange', route))
  useEffect(() => {
    const applyRoute = () => {
      const { path, params } = parseHash();
      setPath(path);
      setParams(params);
    };
    applyRoute(); // initial
    window.addEventListener("hashchange", applyRoute);
    return () => window.removeEventListener("hashchange", applyRoute);
  }, []);

  // -------------------------------
  // Mount/unmount parity hooks (stubs for now)
  // -------------------------------
  useEffect(() => {
    // Simulate:
    // if (target === '#applications') mountApplications(params); else unmountApplications();
    if (path === "#applications") {
      mountApplications(params);
    } else {
      unmountApplications();
    }

    // if (target === '#practice') mountPractice(params);
    if (path === "#practice") {
      mountPractice(params);
    }
  }, [path, params]);

  // -------------------------------
  // Logout (same behavior as your vanilla helper)
  // -------------------------------
  async function onLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/auth");
    }
  }

  // Helpers to render "active" styles + aria-current
  const isActive = (p: HashPath) => path === p;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gray-900" />
            <h1 className="text-lg font-semibold">SDBA Admin</h1>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        {/* Sidebar (parity with #sidebarNav) */}
        <aside className="rounded-2xl border bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-gray-600">SDBA Admin</div>
          <nav id="sidebarNav" aria-label="Primary" className="space-y-1">
            <a
              href="#overview"
              data-route="#overview"
              aria-current={isActive("#overview") ? "page" : "false"}
              className={`block rounded-xl px-3 py-2 text-sm hover:bg-gray-50 ${
                isActive("#overview") ? "bg-gray-900 text-white hover:bg-gray-900" : ""
              }`}
            >
              <span className="nav-label">Overview</span>
            </a>

            <a
              href="#applications"
              data-route="#applications"
              aria-current={isActive("#applications") ? "page" : "false"}
              className={`block rounded-xl px-3 py-2 text-sm hover:bg-gray-50 ${
                isActive("#applications") ? "bg-gray-900 text-white hover:bg-gray-900" : ""
              }`}
            >
              <span className="nav-label">Applications</span>
              {/* navBadgeApps preserved for later wiring */}
              <span id="navBadgeApps" className="ml-2 inline-block rounded-full bg-gray-200 px-2 text-xs text-gray-700">
                0
              </span>
            </a>

            <a
              href="#practice"
              data-route="#practice"
              aria-current={isActive("#practice") ? "page" : "false"}
              className={`block rounded-xl px-3 py-2 text-sm hover:bg-gray-50 ${
                isActive("#practice") ? "bg-gray-900 text-white hover:bg-gray-900" : ""
              }`}
            >
              <span className="nav-label">Practice Calendar</span>
            </a>

            <a
              href="#exports"
              data-route="#exports"
              aria-current={isActive("#exports") ? "page" : "false"}
              className={`block rounded-xl px-3 py-2 text-sm hover:bg-gray-50 ${
                isActive("#exports") ? "bg-gray-900 text-white hover:bg-gray-900" : ""
              }`}
            >
              <span className="nav-label">Exports</span>
            </a>
          </nav>
        </aside>

        {/* Views (parity with VIEWS[...] + .active) */}
        <main className="space-y-6">
          <section
            id="view-overview"
            className={`rounded-2xl border bg-white p-4 md:p-6 ${isActive("#overview") ? "" : "hidden"}`}
          >
            <h2 className="mb-2 text-base font-semibold">Overview</h2>
            <p className="text-sm text-gray-600">KPI placeholders.</p>
          </section>

          <section
            id="view-applications"
            className={`rounded-2xl border bg-white p-4 md:p-6 ${isActive("#applications") ? "" : "hidden"}`}
          >
            <h2 className="mb-2 text-base font-semibold">Applications</h2>
            <p className="text-sm text-gray-600">UI shell comes in Step 3.</p>
          </section>

          <section
            id="view-practice"
            className={`rounded-2xl border bg-white p-4 md:p-6 ${isActive("#practice") ? "" : "hidden"}`}
          >
            <h2 className="mb-2 text-base font-semibold">Practice Calendar</h2>
            <p className="text-sm text-gray-600">UI shell comes in Step 7.</p>
          </section>

          <section
            id="view-exports"
            className={`rounded-2xl border bg-white p-4 md:p-6 ${isActive("#exports") ? "" : "hidden"}`}
          >
            <h2 className="mb-2 text-base font-semibold">Exports</h2>
            <p className="text-sm text-gray-600">CSV exports land in Step 6.</p>
          </section>
        </main>
      </div>
    </div>
  );
}

/** ---- Stubs to preserve behavior; we’ll fill these in later steps ---- */
function mountApplications(_params: URLSearchParams) {
  // TODO: wire data/filtering/drawer in Steps 3–5
  // console.log("mountApplications", Object.fromEntries(_params.entries()));
}
function unmountApplications() {
  // TODO: cleanup listeners/state if needed
}
function mountPractice(_params: URLSearchParams) {
  // TODO: build calendar frame + navigation in Steps 7–8
}
