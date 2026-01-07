import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";

/**
 * GET /api/admin/list
 * List registrations with pagination, filtering, and search
 * Query parameters:
 *   - page: number (default: 1)
 *   - pageSize: number (default: 50)
 *   - status: 'pending' | 'approved' | 'rejected' | 'all' (default: 'all')
 *   - event: 'tn' | 'wu' | 'sc' | 'all' (default: 'all')
 *   - q: string (search query - searches registration_number, team_name, org_name, manager names, team_code)
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      throw ApiErrors.forbidden();
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const status = searchParams.get('status') || 'all';
    const event = searchParams.get('event') || 'all';
    const q = searchParams.get('q') || '';

    // Build query
    let query = supabaseServer
      .from('registration_meta')
      .select('id, registration_number, season, event_type, division_code, category, option_choice, team_code, team_name_en, team_name_tc, org_name, org_address, team_manager_1, mobile_1, email_1, status, approved_by, approved_at, created_at', { count: 'exact' });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply event filter
    if (event !== 'all') {
      query = query.eq('event_type', event);
    }

    // Apply search filter (searches registration_number, team_name, org_name, manager names, team_code)
    if (q) {
      const searchPattern = `%${q}%`;
      // Supabase .or() syntax: field.operator.value,field2.operator.value
      query = query.or(`registration_number.ilike.${searchPattern},team_name_en.ilike.${searchPattern},team_name_tc.ilike.${searchPattern},org_name.ilike.${searchPattern},team_manager_1.ilike.${searchPattern},team_manager_2.ilike.${searchPattern},team_manager_3.ilike.${searchPattern},team_code.ilike.${searchPattern}`);
    }

    // Order by registration_number DESC (most recent first), then created_at DESC as fallback
    query = query.order('registration_number', { ascending: false, nullsLast: true })
                 .order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      throw ApiErrors.internalServerError(error.message);
    }

    // Transform data to match AppRow type
    const items = (data || []).map((row: any) => ({
      id: row.id,
      registration_number: row.registration_number,
      season: row.season,
      event_type: row.event_type,
      division_code: row.division_code,
      category: row.category,
      option_choice: row.option_choice,
      team_code: row.team_code,
      team_name: row.team_name_en || row.team_name_tc || '',
      org_name: row.org_name,
      org_address: row.org_address,
      manager_name: row.team_manager_1 || '',
      manager_email: row.email_1,
      manager_mobile: row.mobile_1,
      status: row.status,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      ok: true,
      items,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

