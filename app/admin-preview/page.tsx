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
  // -------------------------------
  // Applications state (read-only render in Step 4)
  // -------------------------------
  type AppRow = {
    id?: string;
    submitted_at: string | null;
    category: string;
    team_code: string;
    team_name: string;
    org_name: string;
    manager: string;
    waiver_status: string;   // 'missing' | 'received' | 'need_revision' | 'approved' | ...
    payment_status: string;  // 'approved' | 'missing' | 'attention' | 'received' | ...
    app_status: string;      // 'submitted' | 'under_review' | 'approved' | ...
  };

  const [appsData, setAppsData] = useState<AppRow[]>([]);
  const [appsFiltered, setAppsFiltered] = useState<AppRow[]>([]);
  const [appsQueue, setAppsQueue] = useState<
    "all" | "waiver_received" | "waiver_missing" | "payment_attention" | "payment_approved" | "ready_to_approve"
  >("all");
  const [appsCat, setAppsCat] = useState("");
  const [appsStatus, setAppsStatus] = useState("");
  const [appsSearch, setAppsSearch] = useState("");
  const [appsBadge, setAppsBadge] = useState(0);

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

  // Drawer (Step 5 placeholder)
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);
  const openDrawer = (idx: number) => {
    setDrawerIdx(idx);          // we'll render the drawer in Step 5
    console.log("openDrawer ->", idx);
  };

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

    // When Applications tab becomes active, read deep-link params and load data (stub)
  useEffect(() => {
    if (path !== "#applications") return;
    const q = (params.get("queue") || "all") as typeof appsQueue;
    const cat = params.get("category") || "";
    const st = params.get("status") || "";
    const qstr = (params.get("q") || "").toLowerCase();
    setAppsQueue(q);
    setAppsCat(cat);
    setAppsStatus(st);
    setAppsSearch(qstr);

    // TODO: replace with Supabase fetch
    setAppsData([]);
  }, [path, params]);

  // Recompute filtered rows and counts when filters/data change
  useEffect(() => {
    if (path !== "#applications") return;

    const filtered = appsData
      .filter((r) => passesQueueReact(r, appsQueue))
      .filter((r) => passesFiltersReact(r, appsCat, appsStatus, appsSearch))
      .sort((a, b) => String(b.submitted_at || "").localeCompare(String(a.submitted_at || "")));

    setAppsFiltered(filtered);

    // Badge count in sidebar (we use "waiver received" count)
    const waiverReceived = appsData.filter((r) => r.waiver_status === "received").length;
    setAppsBadge(waiverReceived);
  }, [path, appsData, appsQueue, appsCat, appsStatus, appsSearch]);

  // -------------------------------
  // Logout (same behavior as your vanilla helper)
  // -------------------------------
  async function onLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("signOut error:", error.message);
    } finally {
      // replace prevents going back to a protected page via Back
      router.replace("/auth");
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
                {appsBadge}
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
            role="region"
            aria-labelledby="ov-h2"
            className={`rounded-2xl border bg-white p-4 md:p-6 ${isActive("#overview") ? "" : "hidden"}`}
          >
            <div className="section">
              <h2 id="ov-h2" className="text-base font-semibold">Overview</h2>
              <p className="text-sm text-gray-600">
                Placeholder for KPIs & notifications. We’ll wire data later.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">New Today</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-new-today">0</div>
              </div>
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">Approved</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-approved">0</div>
              </div>
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">Pending</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-pending">0</div>
              </div>
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">Total Submissions</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-total">0</div>
              </div>
            </div>
          </section>


          <section
            id="view-applications"
            role="region"
            aria-labelledby="app-h2"
            className={`rounded-2xl border bg-white p-4 md:p-6 ${isActive("#applications") ? "" : "hidden"}`}
          >
            <div className="section">
              <h2 id="app-h2" className="text-base font-semibold">Applications</h2>
              <p className="text-sm text-gray-600">
                Triage and review new submissions. Click a row to open the drawer.
              </p>

              {/* Queue pills (shorts/logo removed) */}
              <div id="queuePills" className="pillbar mt-3 mb-4 flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All" },
                  { id: "waiver_received", label: "Waiver: received" },
                  { id: "waiver_missing", label: "Waiver: missing" },
                  { id: "payment_attention", label: "Payment: missing" },
                  { id: "payment_approved", label: "Payment: approved" },
                  { id: "ready_to_approve", label: "Ready to approve" },
                ].map((p) => (
                  <button
                    key={p.id}
                    data-queue={p.id}
                    onClick={() => setAppsQueue(p.id as any)}
                    className={`pillx rounded-full border px-3 py-1 text-xs ${
                      appsQueue === (p.id as any) ? "is-active bg-gray-900 text-white border-gray-900" : ""
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Search row */}
              <div className="controls mb-4 flex flex-wrap gap-2">
                <input
                  id="searchBox"
                  type="search"
                  placeholder="Search team / org / manager"
                  value={appsSearch}
                  onChange={(e) => setAppsSearch((e.target.value || "").toLowerCase())}
                  className="h-9 min-w-[260px] flex-1 rounded-xl border px-3 text-sm"
                />
                <select
                  id="filterCategory"
                  value={appsCat}
                  onChange={(e) => setAppsCat(e.target.value)}
                  className="h-9 rounded-xl border px-3 text-sm"
                >
                  <option value="">All categories</option>
                  <option value="men_open">Men Open</option>
                  <option value="ladies_open">Ladies Open</option>
                  <option value="mixed_open">Mixed Open</option>
                  <option value="mixed_corporate">Mixed Corporate</option>
                </select>
                <select
                  id="filterStatus"
                  value={appsStatus}
                  onChange={(e) => setAppsStatus(e.target.value)}
                  className="h-9 rounded-xl border px-3 text-sm"
                >
                  <option value="">All app statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              {/* Table */}
              <div className="table-wrap overflow-hidden rounded-2xl border">
                <table className="table w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Submitted</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Team Code</th>
                      <th className="px-3 py-2">Team Name</th>
                      <th className="px-3 py-2">Organization</th>
                      <th className="px-3 py-2">Manager</th>
                      <th className="col-req px-3 py-2">Requirements</th>
                      <th className="px-3 py-2">App Status</th>
                    </tr>
                  </thead>
                  <tbody id="appTbody">
                    {appsFiltered.length === 0 ? (
                      <tr className="border-t">
                        <td colSpan={8} className="px-3 py-12 text-center text-sm text-gray-500">
                          No applications in this queue.
                        </td>
                      </tr>
                    ) : (
                      appsFiltered.map((r, idx) => (
                        <tr
                          key={idx}
                          className="border-t hover:bg-gray-50 cursor-pointer"
                          onClick={() => openDrawer(idx)}
                        >
                          <td className="px-3 py-2">{fmtTime(r.submitted_at)}</td>
                          <td className="px-3 py-2">{catShort(r.category)}</td>
                          <td className="px-3 py-2 font-semibold">{r.team_code}</td>
                          <td className="px-3 py-2">{r.team_name}</td>
                          <td className="px-3 py-2">{r.org_name}</td>
                          <td className="px-3 py-2">{r.manager}</td>
                          <td className="px-3 py-2">
                            <div className="chips flex flex-wrap gap-1">
                              <span className={`chip ${chipClass(r.waiver_status)} rounded-full px-2 py-0.5 text-xs`}>
                                Waiver: {titleCase(r.waiver_status)}
                              </span>
                              <span className={`chip ${chipClass(r.payment_status)} rounded-full px-2 py-0.5 text-xs`}>
                                $ {titleCase(r.payment_status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">{titleCase(r.app_status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

// -------------------------------
// Helpers used by Applications
// -------------------------------
function passesQueueReact(
  row: { waiver_status: string; payment_status: string },
  queue: "all" | "waiver_received" | "waiver_missing" | "payment_attention" | "payment_approved" | "ready_to_approve"
) {
  switch (queue) {
    case "waiver_received":
      return row.waiver_status === "received";
    case "waiver_missing":
      return row.waiver_status === "missing";
    case "payment_attention":
      return row.payment_status !== "approved" && row.payment_status !== "received";
    case "payment_approved":
      return row.payment_status === "approved" || row.payment_status === "received";
    case "ready_to_approve":
      return row.waiver_status === "approved" &&
             (row.payment_status === "approved" || row.payment_status === "received");
    case "all":
    default:
      return true;
  }
}

function passesFiltersReact(row: any, currentCat: string, currentStatus: string, searchTerm: string) {
  if (currentCat && row.category !== currentCat) return false;
  if (currentStatus && row.app_status !== currentStatus) return false;
  if (searchTerm) {
    const blob = `${row.team_code} ${row.team_name} ${row.org_name} ${row.manager}`.toLowerCase();
    if (!blob.includes(searchTerm)) return false;
  }
  return true;
}

function fmtTime(d: any) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function titleCase(s: string) {
  if (!s) return "";
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function catShort(cat: string) {
  switch (cat) {
    case "men_open":
      return "Men";
    case "ladies_open":
      return "Ladies";
    case "mixed_open":
      return "Mixed";
    case "mixed_corporate":
      return "Mixed Corporate";
    default:
      return cat || "—";
  }
}

function chipClass(status: string) {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return "bg-green-100 text-green-700 border border-green-200";
    case "received":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "need_revision":
    case "attention":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "missing":
    default:
      return "bg-red-100 text-red-700 border border-red-200";
  }
}
