// types/api.ts
// Type definitions for API request/response payloads

/**
 * Approve registration request payload
 */
export interface ApproveRegistrationRequest {
  registration_id: string;
  notes?: string;
}

/**
 * Approve registration response
 */
export interface ApproveRegistrationResponse {
  ok: boolean;
  team_meta_id?: string;
  error?: string;
  detail?: unknown;
}

/**
 * Reject registration request payload
 */
export interface RejectRegistrationRequest {
  registration_id: string;
  notes: string; // Required for reject
}

/**
 * Reject registration response
 */
export interface RejectRegistrationResponse {
  ok: boolean;
  error?: string;
  detail?: unknown;
}

/**
 * List registrations query parameters
 */
export interface ListRegistrationsQuery {
  page?: string;
  pageSize?: string;
  q?: string;
  status?: string;
  event?: string;
  season?: string;
}

/**
 * Registration list item
 */
export interface RegistrationListItem {
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
}

/**
 * List registrations response
 */
export interface ListRegistrationsResponse {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  items: RegistrationListItem[];
  error?: string;
}

/**
 * Counters response
 */
export interface CountersResponse {
  ok: boolean;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  new_today: number;
  error?: string;
}

/**
 * Export request payload
 */
export interface ExportRequest {
  mode: 'tn' | 'wu' | 'sc' | 'all';
  season?: number;
  category?: 'men_open' | 'ladies_open' | 'mixed_open' | 'mixed_corporate';
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  detail?: unknown;
}

