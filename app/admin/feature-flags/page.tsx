// app/admin/feature-flags/page.tsx
// Feature flags management page (admin-only)

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  enabled_for_users: string[];
  enabled_for_emails: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface AuditLogEntry {
  id: string;
  flag_key: string;
  action: string;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FeatureFlag>>({});
  const [auditLog, setAuditLog] = useState<Record<string, AuditLogEntry[]>>({});
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());

  // Fetch CSRF token
  const getCsrfToken = async (): Promise<string> => {
    const response = await fetch("/api/csrf-token");
    const data = await response.json();
    return data.token;
  };

  // Load feature flags
  const loadFlags = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/feature-flags");
      if (!response.ok) {
        throw new Error("Failed to load feature flags");
      }
      const data = await response.json();
      setFlags(data.flags || []);
    } catch (error: any) {
      toast.error(`Error loading feature flags: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load audit log for a specific flag
  const loadAuditLog = async (flagKey: string) => {
    try {
      const response = await fetch(`/api/admin/feature-flags?flagKey=${flagKey}&includeAudit=true`);
      if (!response.ok) {
        throw new Error("Failed to load audit log");
      }
      const data = await response.json();
      setAuditLog((prev) => ({
        ...prev,
        [flagKey]: data.audit || [],
      }));
    } catch (error: any) {
      toast.error(`Error loading audit log: ${error.message}`);
    }
  };

  // Toggle flag enabled/disabled
  const toggleFlag = async (flagKey: string, currentEnabled: boolean) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          flagKey,
          enabled: !currentEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update feature flag");
      }

      toast.success(`Feature flag ${!currentEnabled ? "enabled" : "disabled"}`);
      await loadFlags();
    } catch (error: any) {
      toast.error(`Error updating feature flag: ${error.message}`);
    }
  };

  // Update flag
  const updateFlag = async (flagKey: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          flagKey,
          ...editValues,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update feature flag");
      }

      toast.success("Feature flag updated successfully");
      setEditingFlag(null);
      setEditValues({});
      await loadFlags();
    } catch (error: any) {
      toast.error(`Error updating feature flag: ${error.message}`);
    }
  };

  // Toggle expanded state
  const toggleExpanded = (flagKey: string) => {
    const newExpanded = new Set(expandedFlags);
    if (newExpanded.has(flagKey)) {
      newExpanded.delete(flagKey);
    } else {
      newExpanded.add(flagKey);
      loadAuditLog(flagKey);
    }
    setExpandedFlags(newExpanded);
  };

  useEffect(() => {
    loadFlags();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
          <p className="text-gray-600">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="mt-2 text-gray-600">
            Manage feature flags to enable/disable features without deployment
          </p>
        </div>

        <div className="space-y-4">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between p-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {flag.flag_name}
                    </h3>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-mono text-gray-600">
                      {flag.flag_key}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        flag.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="mt-2 text-sm text-gray-600">{flag.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span>Rollout: {flag.rollout_percentage}%</span>
                    {flag.enabled_for_users.length > 0 && (
                      <span>Users: {flag.enabled_for_users.length}</span>
                    )}
                    {flag.enabled_for_emails.length > 0 && (
                      <span>Emails: {flag.enabled_for_emails.length}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFlag(flag.flag_key, flag.enabled)}
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      flag.enabled
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {flag.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => {
                      if (editingFlag === flag.flag_key) {
                        setEditingFlag(null);
                        setEditValues({});
                      } else {
                        setEditingFlag(flag.flag_key);
                        setEditValues({
                          rollout_percentage: flag.rollout_percentage,
                          enabled_for_users: flag.enabled_for_users,
                          enabled_for_emails: flag.enabled_for_emails,
                        });
                      }
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {editingFlag === flag.flag_key ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => toggleExpanded(flag.flag_key)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {expandedFlags.has(flag.flag_key) ? "Hide" : "Show"} Details
                  </button>
                </div>
              </div>

              {editingFlag === flag.flag_key && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Rollout Percentage (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editValues.rollout_percentage ?? flag.rollout_percentage}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            rollout_percentage: parseInt(e.target.value, 10),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Enabled for User IDs (comma-separated UUIDs)
                      </label>
                      <textarea
                        value={editValues.enabled_for_users?.join(", ") || ""}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            enabled_for_users: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Enabled for Emails (comma-separated)
                      </label>
                      <textarea
                        value={editValues.enabled_for_emails?.join(", ") || ""}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            enabled_for_emails: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <button
                      onClick={() => updateFlag(flag.flag_key)}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {expandedFlags.has(flag.flag_key) && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">Audit Log</h4>
                    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                      {auditLog[flag.flag_key]?.length > 0 ? (
                        auditLog[flag.flag_key].map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-md border border-gray-200 bg-white p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {entry.action}
                              </span>
                              <span className="text-gray-500">
                                {new Date(entry.changed_at).toLocaleString()}
                              </span>
                            </div>
                            {entry.changed_by && (
                              <div className="mt-1 text-gray-600">
                                Changed by: {entry.changed_by}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500">No audit log entries</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

