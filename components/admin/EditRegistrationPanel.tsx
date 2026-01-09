"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getHeadersWithCsrf } from "@/lib/csrf-client";
import { toast } from "sonner";
import { Spinner } from "@/components/Spinner";

// RegistrationMeta type - editable fields only
export interface RegistrationMeta {
  id: string;
  registration_number: string;
  status: "pending" | "approved" | "rejected";
  event_type: "tn" | "wu" | "sc";
  season: number;

  // Team details
  team_name_en: string;
  team_name_tc: string | null;
  division_code: string;
  option_choice: string | null; // TN only
  package_choice: string | null; // WU/SC only

  // Organization
  org_name: string | null;
  org_address: string | null;

  // Managers
  team_manager_1: string;
  mobile_1: string | null;
  email_1: string | null;
  team_manager_2: string;
  mobile_2: string | null;
  email_2: string | null;
  team_manager_3: string | null;
  mobile_3: string | null;
  email_3: string | null;

  // Race day
  marquee_qty: number;
  race_day_steersman_option: "with_practice" | "no_practice" | "not_required" | null;
  junk_boat_qty: number;
  junk_boat_license_nos: string[] | null;
  speed_boat_qty: number;
  speed_boat_license_nos: string[] | null;

  // Admin
  admin_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

interface EditRegistrationPanelProps {
  registration: RegistrationMeta | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Division options by event type
const DIVISION_OPTIONS = {
  tn: [
    { value: "M", label: "Men Open" },
    { value: "L", label: "Ladies Open" },
    { value: "X", label: "Mixed Open" },
    { value: "C", label: "Mixed Corporate" },
  ],
  wu: [
    { value: "WM", label: "WM" },
    { value: "WL", label: "WL" },
    { value: "WX", label: "WX" },
    { value: "WPM", label: "WPM" },
    { value: "WPL", label: "WPL" },
    { value: "WPX", label: "WPX" },
    { value: "Y", label: "Y" },
    { value: "YL", label: "YL" },
    { value: "D", label: "D" },
  ],
  sc: [
    { value: "SM", label: "SM" },
    { value: "SL", label: "SL" },
    { value: "SX", label: "SX" },
    { value: "SPM", label: "SPM" },
    { value: "SPL", label: "SPL" },
    { value: "SPX", label: "SPX" },
    { value: "SU", label: "SU" },
    { value: "HKU", label: "HKU" },
  ],
};

const STEERSMAN_OPTIONS = [
  { value: "with_practice", label: "With Practice (HK$800)" },
  { value: "no_practice", label: "No Practice (HK$1500)" },
  { value: "not_required", label: "Not Required" },
];

export function EditRegistrationPanel({
  registration,
  isOpen,
  onClose,
  onSuccess,
}: EditRegistrationPanelProps) {
  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["team", "org", "manager1", "manager2"])
  );

  // Initialize form data from registration
  useEffect(() => {
    if (registration) {
      const initial: Record<string, any> = {
        team_name_en: registration.team_name_en || "",
        team_name_tc: registration.team_name_tc || "",
        division_code: registration.division_code || "",
        option_choice: registration.option_choice || "",
        package_choice: registration.package_choice || "",
        org_name: registration.org_name || "",
        org_address: registration.org_address || "",
        team_manager_1: registration.team_manager_1 || "",
        mobile_1: registration.mobile_1 || "",
        email_1: registration.email_1 || "",
        team_manager_2: registration.team_manager_2 || "",
        mobile_2: registration.mobile_2 || "",
        email_2: registration.email_2 || "",
        team_manager_3: registration.team_manager_3 || "",
        mobile_3: registration.mobile_3 || "",
        email_3: registration.email_3 || "",
        marquee_qty: registration.marquee_qty ?? 0,
        race_day_steersman_option: registration.race_day_steersman_option || "",
        junk_boat_qty: registration.junk_boat_qty ?? 0,
        junk_boat_license_nos: (registration.junk_boat_license_nos || []).join(", "),
        speed_boat_qty: registration.speed_boat_qty ?? 0,
        speed_boat_license_nos: (registration.speed_boat_license_nos || []).join(", "),
        admin_notes: registration.admin_notes || "",
      };
      setFormData(initial);
      setOriginalData(initial);
      setError(null);
    }
  }, [registration]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Update form field
  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Compute changed fields
  const getChangedFields = useCallback((): Record<string, any> => {
    const changed: Record<string, any> = {};
    for (const key in formData) {
      const current = formData[key];
      const original = originalData[key];
      
      // Handle array fields (comma-separated strings)
      if (key === "junk_boat_license_nos" || key === "speed_boat_license_nos") {
        const currentArray = (current || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        const originalArray = (original || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        
        if (JSON.stringify(currentArray) !== JSON.stringify(originalArray)) {
          changed[key] = currentArray;
        }
      } else if (current !== original) {
        // Handle number fields
        if (key.includes("_qty") || key === "team_size") {
          const currentNum = Number(current) || 0;
          const originalNum = Number(original) || 0;
          if (currentNum !== originalNum) {
            changed[key] = currentNum;
          }
        } else {
          changed[key] = current;
        }
      }
    }
    return changed;
  }, [formData, originalData]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registration) return;

    const changedFields = getChangedFields();
    
    if (Object.keys(changedFields).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSubmitting(true);

    // Log the data being sent to the API
    console.log('Submitting edit:', {
      registrationId: registration.id,
      updates: changedFields,
    });

    try {
      const headers = await getHeadersWithCsrf();
      const response = await fetch("/api/admin/edit", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          registrationId: registration.id,
          updates: changedFields,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update registration");
      }

      if (data.ok) {
        toast.success("Registration updated successfully");
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || "Failed to update registration");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update registration";
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  const divisionOptions = DIVISION_OPTIONS[registration.event_type] || [];
  const registrationNumber = registration.registration_number || registration.id.slice(0, 8).toUpperCase();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[480px] transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                Edit Registration: {registrationNumber}
              </h2>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                    registration.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : registration.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {registration.status.charAt(0).toUpperCase() +
                    registration.status.slice(1)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 rounded-xl p-2 hover:bg-gray-100"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="space-y-4 p-6">
              {/* Error Message */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Team Details */}
              <Section
                title="Team Details"
                isExpanded={expandedSections.has("team")}
                onToggle={() => toggleSection("team")}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.team_name_en || ""}
                      onChange={(e) => updateField("team_name_en", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Name (Traditional Chinese)
                    </label>
                    <input
                      type="text"
                      value={formData.team_name_tc || ""}
                      onChange={(e) => updateField("team_name_tc", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division
                    </label>
                    <select
                      value={formData.division_code || ""}
                      onChange={(e) => updateField("division_code", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    >
                      <option value="">Select division</option>
                      {divisionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {registration.event_type === "tn" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Option Choice
                      </label>
                      <select
                        value={formData.option_choice || ""}
                        onChange={(e) => updateField("option_choice", e.target.value)}
                        className="h-9 w-full rounded-xl border px-3 text-sm"
                      >
                        <option value="">Select option</option>
                        <option value="Option 1">Option 1</option>
                        <option value="Option 2">Option 2</option>
                      </select>
                    </div>
                  )}
                  {(registration.event_type === "wu" ||
                    registration.event_type === "sc") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Package Choice
                      </label>
                      <input
                        type="text"
                        value={formData.package_choice || ""}
                        onChange={(e) =>
                          updateField("package_choice", e.target.value)
                        }
                        className="h-9 w-full rounded-xl border px-3 text-sm"
                      />
                    </div>
                  )}
                </div>
              </Section>

              {/* Organization */}
              <Section
                title="Organization"
                isExpanded={expandedSections.has("org")}
                onToggle={() => toggleSection("org")}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={formData.org_name || ""}
                      onChange={(e) => updateField("org_name", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Address
                    </label>
                    <textarea
                      value={formData.org_address || ""}
                      onChange={(e) => updateField("org_address", e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </Section>

              {/* Manager 1 */}
              <Section
                title="Manager 1 (Primary)"
                isExpanded={expandedSections.has("manager1")}
                onToggle={() => toggleSection("manager1")}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.team_manager_1 || ""}
                      onChange={(e) =>
                        updateField("team_manager_1", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile_1 || ""}
                      onChange={(e) => updateField("mobile_1", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email_1 || ""}
                      onChange={(e) => updateField("email_1", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                </div>
              </Section>

              {/* Manager 2 */}
              <Section
                title="Manager 2"
                isExpanded={expandedSections.has("manager2")}
                onToggle={() => toggleSection("manager2")}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.team_manager_2 || ""}
                      onChange={(e) =>
                        updateField("team_manager_2", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile_2 || ""}
                      onChange={(e) => updateField("mobile_2", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email_2 || ""}
                      onChange={(e) => updateField("email_2", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                </div>
              </Section>

              {/* Manager 3 */}
              <Section
                title="Manager 3 (Optional)"
                isExpanded={expandedSections.has("manager3")}
                onToggle={() => toggleSection("manager3")}
                defaultCollapsed
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.team_manager_3 || ""}
                      onChange={(e) =>
                        updateField("team_manager_3", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile_3 || ""}
                      onChange={(e) => updateField("mobile_3", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email_3 || ""}
                      onChange={(e) => updateField("email_3", e.target.value)}
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                </div>
              </Section>

              {/* Race Day Services */}
              <Section
                title="Race Day Services"
                isExpanded={expandedSections.has("raceDay")}
                onToggle={() => toggleSection("raceDay")}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marquee Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.marquee_qty || 0}
                      onChange={(e) =>
                        updateField("marquee_qty", parseInt(e.target.value) || 0)
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Race Day Steersman Option
                    </label>
                    <select
                      value={formData.race_day_steersman_option || ""}
                      onChange={(e) =>
                        updateField("race_day_steersman_option", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    >
                      <option value="">Select option</option>
                      {STEERSMAN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Junk Boat Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.junk_boat_qty || 0}
                      onChange={(e) =>
                        updateField(
                          "junk_boat_qty",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Junk Boat License Numbers (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.junk_boat_license_nos || ""}
                      onChange={(e) =>
                        updateField("junk_boat_license_nos", e.target.value)
                      }
                      placeholder="LIC001, LIC002, LIC003"
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speed Boat Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.speed_boat_qty || 0}
                      onChange={(e) =>
                        updateField(
                          "speed_boat_qty",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speed Boat License Numbers (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.speed_boat_license_nos || ""}
                      onChange={(e) =>
                        updateField("speed_boat_license_nos", e.target.value)
                      }
                      placeholder="LIC001, LIC002, LIC003"
                      className="h-9 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                </div>
              </Section>

              {/* Admin Notes */}
              <Section
                title="Admin Notes"
                isExpanded={expandedSections.has("notes")}
                onToggle={() => toggleSection("notes")}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.admin_notes || ""}
                    onChange={(e) => updateField("admin_notes", e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="mb-4 text-xs text-gray-600">
                {registration.status === "pending"
                  ? "Saving will update the application record."
                  : "Saving will update both application and team records."}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && (
                    <Spinner size="sm" className="border-white border-t-transparent" />
                  )}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Collapsible Section Component
interface SectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

function Section({
  title,
  isExpanded,
  onToggle,
  defaultCollapsed = false,
  children,
}: SectionProps) {
  return (
    <div className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-gray-50"
      >
        <span>{title}</span>
        <svg
          className={`h-5 w-5 transform transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

