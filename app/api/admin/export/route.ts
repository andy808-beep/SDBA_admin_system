import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { z } from "zod";

const ExportPayload = z.object({
  mode: z.enum(['tn', 'wu', 'sc', 'all']),
  category: z.enum(['men_open', 'ladies_open', 'mixed_open', 'mixed_corporate']).optional(),
});

/**
 * POST /api/admin/export
 * Export registrations to CSV
 * Body:
 *   - mode: 'tn' | 'wu' | 'sc' | 'all'
 *   - category: optional - 'men_open' | 'ladies_open' | 'mixed_open' | 'mixed_corporate' (only for TN)
 */
export async function POST(req: NextRequest) {
  try {
    // Note: CSRF protection is handled in middleware.ts
    
    // Check admin authentication
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      throw ApiErrors.forbidden();
    }

    // Parse and validate body
    const body = await req.json();
    const payload = ExportPayload.parse(body);

    // Build query
    let query = supabaseServer
      .from('registration_meta')
      .select('registration_number, id, season, event_type, division_code, category, option_choice, team_code, team_name_en, team_name_tc, org_name, org_address, team_manager_1, mobile_1, email_1, team_manager_2, mobile_2, email_2, team_manager_3, mobile_3, email_3, status, approved_by, approved_at, created_at');

    // Apply event filter
    if (payload.mode !== 'all') {
      query = query.eq('event_type', payload.mode);
    }

    // Apply category filter (only for TN)
    if (payload.mode === 'tn' && payload.category) {
      query = query.eq('category', payload.category);
    }

    // Order by registration_number DESC, then created_at DESC
    query = query.order('registration_number', { ascending: false, nullsLast: true })
                 .order('created_at', { ascending: false });

    // Execute query
    const { data, error } = await query;

    if (error) {
      throw ApiErrors.internalServerError(error.message);
    }

    // Generate CSV
    const rows = data || [];
    
    // CSV headers (registration_number first)
    const headers = [
      'Registration Number',
      'ID',
      'Season',
      'Event Type',
      'Division Code',
      'Category',
      'Option Choice',
      'Team Code',
      'Team Name (EN)',
      'Team Name (TC)',
      'Organization Name',
      'Organization Address',
      'Manager 1 Name',
      'Manager 1 Mobile',
      'Manager 1 Email',
      'Manager 2 Name',
      'Manager 2 Mobile',
      'Manager 2 Email',
      'Manager 3 Name',
      'Manager 3 Mobile',
      'Manager 3 Email',
      'Status',
      'Approved By',
      'Approved At',
      'Created At',
    ];

    // Escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV rows
    const csvRows = [
      headers.join(','),
      ...rows.map((row: any) => [
        escapeCsvValue(row.registration_number),
        escapeCsvValue(row.id),
        escapeCsvValue(row.season),
        escapeCsvValue(row.event_type),
        escapeCsvValue(row.division_code),
        escapeCsvValue(row.category),
        escapeCsvValue(row.option_choice),
        escapeCsvValue(row.team_code),
        escapeCsvValue(row.team_name_en),
        escapeCsvValue(row.team_name_tc),
        escapeCsvValue(row.org_name),
        escapeCsvValue(row.org_address),
        escapeCsvValue(row.team_manager_1),
        escapeCsvValue(row.mobile_1),
        escapeCsvValue(row.email_1),
        escapeCsvValue(row.team_manager_2),
        escapeCsvValue(row.mobile_2),
        escapeCsvValue(row.email_2),
        escapeCsvValue(row.team_manager_3),
        escapeCsvValue(row.mobile_3),
        escapeCsvValue(row.email_3),
        escapeCsvValue(row.status),
        escapeCsvValue(row.approved_by),
        escapeCsvValue(row.approved_at),
        escapeCsvValue(row.created_at),
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Generate filename
    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `SDBA_${payload.mode}`;
    if (payload.category) {
      filename += `_${payload.category}`;
    }
    filename += `_${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


