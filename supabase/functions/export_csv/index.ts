import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Helper to check if user is admin
function isAdminUser(user: any): boolean {
  const roles = (user?.app_metadata?.roles ?? user?.user_metadata?.roles ?? []) as string[];
  const role = (user?.app_metadata?.role ?? user?.user_metadata?.role) as string | undefined;
  return roles?.includes("admin") || role === "admin" || user?.user_metadata?.is_admin === true;
}

// Helper to escape CSV field (RFC4180)
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return "";
  }
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to convert row to CSV line
function rowToCsv(row: Record<string, any>, headers: string[]): string {
  return headers.map((header) => escapeCsvField(row[header])).join(",");
}

// Fetch all rows with pagination
async function fetchAllRows(
  supabase: any,
  tableOrView: string,
  season?: number
): Promise<Record<string, any>[]> {
  const allRows: Record<string, any>[] = [];
  const chunkSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(tableOrView).select("*");
    
    if (season) {
      query = query.eq("season", season);
    }

    const { data, error } = await query.range(offset, offset + chunkSize - 1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += chunkSize;
      if (data.length < chunkSize) {
        hasMore = false;
      }
    }
  }

  return allRows;
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    // Get Supabase URL from request origin or env
    const requestUrl = new URL(req.url);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? 
      `${requestUrl.protocol}//${requestUrl.hostname.replace(/\.functions\.supabase\.co$/, '.supabase.co')}`;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and check admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdminUser(user)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { mode, season, category } = body;

    if (!mode || !["tn", "wu", "sc", "all"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'tn', 'wu', 'sc', or 'all'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for queries (bypasses RLS)
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let rows: Record<string, any>[] = [];
    let headers: string[] = [];
    let filenameMode = mode;

    // Fetch data based on mode
    if (mode === "tn") {
      const tnViews = {
        men_open: "men_open_team_list",
        ladies_open: "ladies_open_team_list",
        mixed_open: "mixed_open_team_list",
        mixed_corporate: "mixed_corporate_team_list",
      };

      if (category && category in tnViews) {
        // Single category
        rows = await fetchAllRows(supabaseService, tnViews[category as keyof typeof tnViews], season);
        filenameMode = `tn_${category}`;
      } else {
        // Union all categories
        const allData: Record<string, any>[] = [];
        for (const viewName of Object.values(tnViews)) {
          const viewRows = await fetchAllRows(supabaseService, viewName, season);
          allData.push(...viewRows);
        }
        rows = allData;
      }

      // Define headers for TN (team_meta structure)
      if (rows.length > 0) {
        headers = Object.keys(rows[0]);
      } else {
        // Default headers if no data
        headers = [
          "id", "user_id", "season", "category", "division_code", "option_choice",
          "team_code", "team_name", "org_name", "org_address",
          "team_manager_1", "mobile_1", "email_1",
          "team_manager_2", "mobile_2", "email_2",
          "team_manager_3", "mobile_3", "email_3",
          "registration_id", "created_at", "updated_at"
        ];
      }
    } else if (mode === "wu") {
      rows = await fetchAllRows(supabaseService, "wu_team_meta", season);
      
      if (rows.length > 0) {
        headers = Object.keys(rows[0]);
      } else {
        headers = [
          "id", "user_id", "season", "division_code", "team_code", "team_name",
          "package_choice", "team_size", "team_manager", "mobile", "email",
          "org_name", "org_address", "registration_id", "created_at", "updated_at"
        ];
      }
    } else if (mode === "sc") {
      rows = await fetchAllRows(supabaseService, "sc_team_meta", season);
      
      if (rows.length > 0) {
        headers = Object.keys(rows[0]);
      } else {
        headers = [
          "id", "user_id", "season", "division_code", "team_code", "team_name",
          "package_choice", "team_size", "team_manager", "mobile", "email",
          "org_name", "org_address", "registration_id", "created_at", "updated_at"
        ];
      }
    } else if (mode === "all") {
      // Combine all modes
      const allData: Record<string, any>[] = [];
      
      // TN all categories
      const tnViews = [
        "men_open_team_list",
        "ladies_open_team_list",
        "mixed_open_team_list",
        "mixed_corporate_team_list",
      ];
      for (const viewName of tnViews) {
        const viewRows = await fetchAllRows(supabaseService, viewName, season);
        allData.push(...viewRows);
      }
      
      // WU
      const wuRows = await fetchAllRows(supabaseService, "wu_team_meta", season);
      allData.push(...wuRows);
      
      // SC
      const scRows = await fetchAllRows(supabaseService, "sc_team_meta", season);
      allData.push(...scRows);
      
      rows = allData;
      
      // Use union of all headers
      const headerSet = new Set<string>();
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          headerSet.add(key);
        }
      }
      headers = Array.from(headerSet).sort();
    }

    // Generate CSV with UTF-8 BOM (RFC4180)
    const bom = "\uFEFF";
    const csvLines: string[] = [];
    
    // Header row
    csvLines.push(headers.map((h) => escapeCsvField(h)).join(","));
    
    // Data rows
    for (const row of rows) {
      csvLines.push(rowToCsv(row, headers));
    }
    
    const csvContent = bom + csvLines.join("\n");

    // Generate filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_");
    const filename = `SDBA_${filenameMode}_${dateStr}.csv`;

    // Return CSV with proper headers
    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
