"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from '../../lib/supabaseClient';
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Spinner, SpinnerWithText } from '@/components/Spinner';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  // Applications state
  // -------------------------------
  type AppRow = {
    id: string;
    season: number;
    event_type: string;
    division_code: string | null;
    category: string | null;
    option_choice: string | null;
    team_code: string;
    team_name: string;
    org_name: string | null;
    org_address: string | null;
    manager_name: string;
    manager_email: string | null;
    manager_mobile: string | null;
    status: string;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [event, setEvent] = useState<'tn' | 'wu' | 'sc' | 'all'>('all');
  const [items, setItems] = useState<AppRow[]>([]);
  const [total, setTotal] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [badgeNew, setBadgeNew] = useState(0);
  
  // Overview counters state
  const [counters, setCounters] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    new_today: 0,
  });
  const [countersLoading, setCountersLoading] = useState(false);

  // Realtime channel ref
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Export state
  const [exporting, setExporting] = useState<Record<string, boolean>>({});

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
  // Fetch applications list
  // -------------------------------
  const fetchApplications = useCallback(async () => {
    if (path !== "#applications") return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        status: status === 'all' ? 'all' : status,
        event: event === 'all' ? 'all' : event,
      });
      if (q) {
        params.append('q', q);
      }

      const response = await fetch(`/api/admin/list?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied");
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        // Reset badgeNew when successfully fetching in #applications
        if (path === "#applications") {
          setBadgeNew(0);
        }
      } else {
        throw new Error(data.error || "Failed to fetch applications");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err.message || "Failed to load applications");
      console.error("fetchApplications error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [path, page, pageSize, status, event, q]);

  // Fetch applications when entering #applications or filters change
  useEffect(() => {
    if (path === "#applications") {
      fetchApplications();
    }
  }, [path, page, status, event, fetchApplications]);

  // Debounced search
  useEffect(() => {
    if (path !== "#applications") return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1); // Reset to first page on search
      fetchApplications();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [q, fetchApplications, path]);

  // -------------------------------
  // Fetch counters for Overview
  // -------------------------------
  const fetchCounters = useCallback(async () => {
    if (path !== "#overview") return;

    setCountersLoading(true);
    try {
      const response = await fetch("/api/admin/counters");
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied");
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setCounters({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0,
          new_today: data.new_today || 0,
        });
      } else {
        throw new Error(data.error || "Failed to fetch counters");
      }
    } catch (err: any) {
      console.error("fetchCounters error:", err);
    } finally {
      setCountersLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (path === "#overview") {
      fetchCounters();
    }
  }, [path, fetchCounters]);

  // -------------------------------
  // Realtime subscription for new pending registrations
  // -------------------------------
  useEffect(() => {
    // Subscribe to new pending registrations
    const channel = supabase
      .channel('registration_meta_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registration_meta',
          filter: 'status=eq.pending',
        },
        () => {
          // Check current path (use window.location to avoid stale closure)
          const currentHash = window.location.hash || "#overview";
          if (currentHash !== "#applications") {
            // If not on #applications, increment badgeNew
            setBadgeNew((prev) => prev + 1);
          } else {
            // If on #applications, refetch to show new row
            fetchApplications();
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [fetchApplications]);

  // -------------------------------
  // Approve function
  // -------------------------------
  const handleApprove = async (registrationId: string, notes?: string) => {
    setApprovingId(registrationId);
    try {
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Already processed - soft warn and refetch
          toast.warning("This registration was already processed. Refreshing...");
          fetchApplications();
          return;
        }
        throw new Error(data.error || "Failed to approve registration");
      }

      if (data.ok) {
        toast.success(`Registration approved! Team ID: ${data.team_meta_id}`);
        // Refetch list
        fetchApplications();
      } else {
        throw new Error(data.error || "Failed to approve registration");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message || "Failed to approve registration"}`);
      console.error("approve error:", err);
    } finally {
      setApprovingId(null);
    }
  };

  // -------------------------------
  // Export CSV function
  // -------------------------------
  const handleExport = async (mode: 'tn' | 'wu' | 'sc' | 'all', category?: 'men_open' | 'ladies_open' | 'mixed_open' | 'mixed_corporate') => {
    const exportKey = category ? `${mode}_${category}` : mode;
    setExporting((prev) => ({ ...prev, [exportKey]: true }));

    try {
      // Call API route (cookies are sent automatically)
      const response = await fetch("/api/admin/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Download blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `SDBA_${exportKey}_${new Date().toISOString().slice(0, 10)}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Export completed: ${filename}`);
    } catch (err: any) {
      toast.error(`Export error: ${err.message || "Failed to export data"}`);
      console.error("export error:", err);
    } finally {
      setExporting((prev) => ({ ...prev, [exportKey]: false }));
    }
  };

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
    <ErrorBoundary>
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
              {badgeNew > 0 && (
                <span id="navBadgeApps" className="ml-2 inline-block rounded-full bg-red-500 px-2 text-xs text-white">
                  {badgeNew}
                </span>
              )}
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
                Dashboard KPIs and statistics.
              </p>
            </div>

            {countersLoading && (
              <div className="mt-4">
                <SpinnerWithText text="Loading counters..." />
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">New Today</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-new-today">
                  {counters.new_today}
                </div>
              </div>
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">Approved</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-approved">
                  {counters.approved}
                </div>
              </div>
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">Pending</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-pending">
                  {counters.pending}
                </div>
              </div>
              <div className="kpi rounded-xl border p-4">
                <div className="label text-xs text-gray-500">Total Submissions</div>
                <div className="value mt-1 text-2xl font-semibold" id="kpi-total">
                  {counters.total}
                </div>
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
                Triage and review new submissions.
              </p>

              {/* Error banner */}
              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Error: {error}
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="mt-4">
                  <SpinnerWithText text="Loading applications..." />
                </div>
              )}

              {/* Filters */}
              <div className="controls mt-4 mb-4 flex flex-wrap gap-2">
                <input
                  id="searchBox"
                  type="search"
                  placeholder="Search team / org / manager / team code"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 min-w-[260px] flex-1 rounded-xl border px-3 text-sm"
                />
                <select
                  id="filterStatus"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as typeof status);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All Statuses</option>
                </select>
                <select
                  id="filterEvent"
                  value={event}
                  onChange={(e) => {
                    setEvent(e.target.value as typeof event);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border px-3 text-sm"
                >
                  <option value="all">All Events</option>
                  <option value="tn">TN</option>
                  <option value="wu">WU</option>
                  <option value="sc">SC</option>
                </select>
              </div>

              {/* Table */}
              <div className="table-wrap overflow-hidden rounded-2xl border">
                <table className="table w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Team Name</th>
                      <th className="px-3 py-2">Team Code</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Division</th>
                      <th className="px-3 py-2">Manager</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="appTbody">
                    {!isLoading && items.length === 0 ? (
                      <tr className="border-t">
                        <td colSpan={9} className="px-3 py-12 text-center text-sm text-gray-500">
                          No applications found.
                        </td>
                      </tr>
                    ) : (
                      items.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="px-3 py-2">{r.team_name}</td>
                          <td className="px-3 py-2 font-semibold">{r.team_code}</td>
                          <td className="px-3 py-2">{r.event_type.toUpperCase()}</td>
                          <td className="px-3 py-2">{r.division_code || "—"}</td>
                          <td className="px-3 py-2">{r.manager_name}</td>
                          <td className="px-3 py-2 text-xs">{r.manager_email || "—"}</td>
                          <td className="px-3 py-2 text-xs">{fmtTime(r.created_at)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                              r.status === 'approved' ? 'bg-green-100 text-green-700' :
                              r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {titleCase(r.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {r.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(r.id);
                                }}
                                disabled={approvingId === r.id || isLoading}
                                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {approvingId === r.id && <Spinner size="sm" className="border-white border-t-transparent" />}
                                {approvingId === r.id ? "Approving..." : "Approve"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Page {page} of {Math.ceil(total / pageSize)}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                      disabled={page >= Math.ceil(total / pageSize) || isLoading}
                      className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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
            <div className="section">
              <h2 className="mb-2 text-base font-semibold">Exports</h2>
              <p className="text-sm text-gray-600">
                Download CSV exports for different event types and categories.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {/* TN Exports */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">TN (Traditional) Exports</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExport('tn')}
                    disabled={exporting['tn']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['tn'] && <Spinner size="sm" />}
                    {exporting['tn'] ? "Exporting..." : "Export All"}
                  </button>
                  <button
                    onClick={() => handleExport('tn', 'men_open')}
                    disabled={exporting['tn_men_open']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['tn_men_open'] && <Spinner size="sm" />}
                    {exporting['tn_men_open'] ? "Exporting..." : "Men Open"}
                  </button>
                  <button
                    onClick={() => handleExport('tn', 'ladies_open')}
                    disabled={exporting['tn_ladies_open']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['tn_ladies_open'] && <Spinner size="sm" />}
                    {exporting['tn_ladies_open'] ? "Exporting..." : "Ladies Open"}
                  </button>
                  <button
                    onClick={() => handleExport('tn', 'mixed_open')}
                    disabled={exporting['tn_mixed_open']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['tn_mixed_open'] && <Spinner size="sm" />}
                    {exporting['tn_mixed_open'] ? "Exporting..." : "Mixed Open"}
                  </button>
                  <button
                    onClick={() => handleExport('tn', 'mixed_corporate')}
                    disabled={exporting['tn_mixed_corporate']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['tn_mixed_corporate'] && <Spinner size="sm" />}
                    {exporting['tn_mixed_corporate'] ? "Exporting..." : "Mixed Corporate"}
                  </button>
                </div>
              </div>

              {/* WU Exports */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">WU (Warm-Up) Exports</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExport('wu')}
                    disabled={exporting['wu']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['wu'] && <Spinner size="sm" />}
                    {exporting['wu'] ? "Exporting..." : "Export WU"}
                  </button>
                </div>
              </div>

              {/* SC Exports */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">SC (Sprint Challenge) Exports</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExport('sc')}
                    disabled={exporting['sc']}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting['sc'] && <Spinner size="sm" />}
                    {exporting['sc'] ? "Exporting..." : "Export SC"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}

/** ---- Stubs to preserve behavior; we'll fill these in later steps ---- */
function mountPractice(_params: URLSearchParams) {
  // TODO: build calendar frame + navigation in Steps 7–8
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

