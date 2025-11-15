// supabase/functions/submit_registration/index.ts
// Version: 3.0 - MAJOR UPDATE - Force cache clear - Updated for new registration_meta schema
// This version uses individual team records instead of aggregate data
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://khqarcvszewerjckmtpg.supabase.co";
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE_KEY");

if (!SERVICE_ROLE) {
  console.error("Missing SERVICE_ROLE_KEY");
}

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE!, {
  auth: { persistSession: false },
});

// ---------------- CORS (env-driven) ----------------
type Json = Record<string, unknown>;

// Read allowed origins from env, fallback to allow all origins for production
const CORS_LIST = (Deno.env.get("CORS_ALLOW_ORIGINS") ??
  "*,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Support "*" if included in the list
const ALLOW_ORIGINS = new Set<string>(CORS_LIST);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  // If wildcard is in the set, always return the requesting origin (or * if no origin)
  // Otherwise, only return the origin if it's explicitly in the allow list
  let allowOrigin: string;
  if (ALLOW_ORIGINS.has("*")) {
    allowOrigin = origin || "*";
  } else {
    allowOrigin = origin && ALLOW_ORIGINS.has(origin) ? origin : "null";
  }
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
const respond = (req: Request, body: Json, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });

// ---------------- Types ----------------
type Manager = { name: string; mobile: string; email: string };
type PracticeDay = { date: string; hours: number; helpers?: "" | "S" | "T" | "ST" };
type PracticeBlock = {
  team_index: number;
  dates: PracticeDay[];
  slotPrefs_1hr?: { slot_pref_1?: string; slot_pref_2?: string; slot_pref_3?: string };
  slotPrefs_2hr?: { slot_pref_1?: string; slot_pref_2?: string; slot_pref_3?: string };
};

// TN Practice Data Structure
type TNPracticeDate = {
  pref_date: string;
  duration_hours: number;
  helper: string;
};

type TNSlotRank = {
  rank: number;
  slot_code: string;
};

type TNPracticeTeam = {
  team_key: string;
  dates: TNPracticeDate[];
  slot_ranks: TNSlotRank[];
};

type Payload = {
  eventShortRef: string;
  category: "men_open" | "ladies_open" | "mixed_open" | "mixed_corporate" | string;
  season?: number;
  org_name: string;
  org_address?: string | null;
  counts: { num_teams: number; num_teams_opt1: number; num_teams_opt2: number };
  team_names: string[];
  team_options: ("opt1" | "opt2")[];
  managers: Manager[];
  race_day?: {
    marqueeQty?: number; steerWithQty?: number; steerWithoutQty?: number;
    junkBoatNo?: string; junkBoatQty?: number; speedBoatNo?: string; speedboatQty?: number;
  } | null;
  practice?: PracticeBlock[] | { teams: TNPracticeTeam[] };
  client_tx_id?: string;
  // New structure for WU/SC
  teams?: Array<{
    name: string;
    category: string;
    boat_type: string;
    division: string;
    team_size?: number;
  }>;
};

// ---------------- Helpers ----------------
function bad(req: Request, msg: string, extra?: Record<string, unknown>) {
  return respond(req, { error: msg, ...(extra ?? {}) }, 400);
}

// Email validation: simple, tolerant pattern
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes(' ')) return false;
  
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  
  const domainPart = parts[1];
  if (!domainPart.includes('.')) return false;
  
  const domainParts = domainPart.split('.');
  for (const part of domainParts) {
    if (!part || part.length === 0) return false;
  }
  
  return true;
}

// Hong Kong phone validation: exactly 8 digits
function isValidHKPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  return /^\d{8}$/.test(trimmed);
}

// Normalize Hong Kong phone to +852xxxxxxxx format
function normalizeHKPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove whitespace and common separators
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  
  // If it starts with +852, extract the 8 digits
  if (cleaned.startsWith('+852')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('852')) {
    cleaned = cleaned.substring(3);
  }
  
  // Validate the remaining 8 digits
  if (isValidHKPhone(cleaned)) {
    return `+852${cleaned}`;
  }
  
  return '';
}
function letterFromCategory(cat: string): "M" | "L" | "X" | "C" | null {
  switch ((cat || "").trim().toLowerCase()) {
    case "men_open": return "M";
    case "ladies_open": return "L";
    case "mixed_open": return "X";
    case "mixed_corporate": return "C";
    default: return null;
  }
}
function boolFlagsFromHelpers(h?: "" | "S" | "T" | "ST") {
  const need_steersman = h === "S" || h === "ST";
  const need_coach = h === "T" || h === "ST";
  return { need_steersman, need_coach };
}
function derivePackageCode(eventRef: string, category: string, opt: "opt1" | "opt2") {
  const isCorp = category === "mixed_corporate";
  const tier = opt === "opt1" ? "option_1" : "option_2";
  return isCorp ? `${tier}_corp` : `${tier}_non_corp`;
}

// ---------------- Handler ----------------
Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return respond(req, { error: "Use POST" }, 405);

  // Cache busting - force redeploy by updating function signature
  console.log('🔄 Edge Function v3.0 MAJOR UPDATE reloaded at:', new Date().toISOString());
  console.log('🔄 Using new registration_meta schema with individual team records');
  console.log('🔄 This version creates separate records for each team instead of aggregate data');

  // Parse payload
  let payload: Payload;
  try { payload = await req.json(); } catch { return bad(req, "Invalid JSON body"); }

  const {
    eventShortRef, category, season, org_name, org_address,
    counts, team_names = [], team_options = [], managers = [], race_day = null, practice: initialPractice = [],
  } = payload ?? {} as Payload;

  if (!eventShortRef) return bad(req, "eventShortRef is required");
  if (!category) return bad(req, "category is required");
  
  // Normalize event type from eventShortRef (e.g., 'SC2025' -> 'sc', 'TN2025' -> 'tn')
  const eventType = eventShortRef.replace(/\d+/g, '').toLowerCase(); // Remove numbers and lowercase
  
  // Check if this is a WU/SC event (has teams array with individual categories)
  const isWUSC = payload.teams && Array.isArray(payload.teams) && payload.teams.length > 0;
  
  // For TN events, validate category
  let divLetter: string | null = null;
  if (!isWUSC) {
    divLetter = letterFromCategory(category);
    if (!divLetter) return bad(req, `Unknown category: ${category}`);
  }
  
  if (!isWUSC && !counts) return bad(req, "counts missing");
  
  // TN-specific validation
  if (!isWUSC) {
    const { num_teams, num_teams_opt1, num_teams_opt2 } = counts || {};
    if (!Number.isInteger(num_teams) || num_teams < 1) return bad(req, "num_teams invalid");
    if (team_names.length !== num_teams || team_options.length !== num_teams) {
      return bad(req, "team_names / team_options length must equal num_teams");
    }
    if ((num_teams_opt1 + num_teams_opt2) !== num_teams) {
      return bad(req, "num_teams_opt1 + num_teams_opt2 must equal num_teams");
    }
  }
  if (!org_name?.trim()) return bad(req, "org_name is required");

  // Validate and normalize managers
  const mgrs: Manager[] = Array.isArray(managers) ? managers.slice(0, 3) : [];
  while (mgrs.length < 3) mgrs.push({ name: "", mobile: "", email: "" });
  
  // Validate required managers (1 and 2)
  for (let i = 0; i < 2; i++) {
    const mgr = mgrs[i];
    const mgrNum = i + 1;
    
    if (!mgr.name?.trim()) {
      return bad(req, `Team Manager ${mgrNum} name is required`);
    }
    
    if (!mgr.mobile?.trim()) {
      return bad(req, `Team Manager ${mgrNum} phone is required`);
    }
    
    if (!mgr.email?.trim()) {
      return bad(req, `Team Manager ${mgrNum} email is required`);
    }
    
    // Validate email format
    if (!isValidEmail(mgr.email)) {
      return bad(req, `Team Manager ${mgrNum} email is invalid`);
    }
    
    // Normalize and validate phone
    const normalizedPhone = normalizeHKPhone(mgr.mobile);
    if (!normalizedPhone) {
      return bad(req, `Team Manager ${mgrNum} phone must be an 8-digit Hong Kong number`);
    }
    
    // Update with normalized phone
    mgr.mobile = normalizedPhone;
    mgr.email = mgr.email.trim();
  }
  
  // Validate optional manager 3 (if any field is provided, all must be valid)
  const mgr3 = mgrs[2];
  if (mgr3.name?.trim() || mgr3.mobile?.trim() || mgr3.email?.trim()) {
    if (!mgr3.name?.trim()) {
      return bad(req, "Team Manager 3 name is required when contact info is provided");
    }
    
    if (!mgr3.mobile?.trim()) {
      return bad(req, "Team Manager 3 phone is required when other info is provided");
    }
    
    if (!mgr3.email?.trim()) {
      return bad(req, "Team Manager 3 email is required when other info is provided");
    }
    
    // Validate email format
    if (!isValidEmail(mgr3.email)) {
      return bad(req, "Team Manager 3 email is invalid");
    }
    
    // Normalize and validate phone
    const normalizedPhone = normalizeHKPhone(mgr3.mobile);
    if (!normalizedPhone) {
      return bad(req, "Team Manager 3 phone must be an 8-digit Hong Kong number");
    }
    
    // Update with normalized phone
    mgr3.mobile = normalizedPhone;
    mgr3.email = mgr3.email.trim();
  }

  try {
    // 1) Validate event exists and is enabled
    const { data: eventRows, error: eventError } = await admin
      .from('v_event_config_public')
      .select('event_short_ref, season, form_enabled, practice_start_date, practice_end_date')
      .eq('event_short_ref', 'TN2025')
      .limit(1);
    
    if (eventError) throw new Error(`Event lookup failed: ${eventError.message}`);
    if (!eventRows.length) throw new Error(`Event ${eventShortRef} not found`);
    
    const eventRow = eventRows[0];
    if (eventRow.form_enabled === false) throw new Error(`Event ${eventShortRef} is disabled`);
    if (season && Number(season) !== Number(eventRow.season)) {
      throw new Error(`Season mismatch: payload=${season}, event=${eventRow.season}`);
    }
    const seasonNum: number = Number(eventRow.season);

    // TN-specific validation: Division and Package checks
    if (!isWUSC) {
      // 2) Division check
      const { data: divRows, error: divError } = await admin
        .from('v_divisions_public')
        .select('division_code')
        .eq('event_short_ref', 'TN2025')
        .eq('division_code', divLetter)
        .eq('is_active', true)
        .limit(1);
      
      if (divError) throw new Error(`Division check failed: ${divError.message}`);
      if (!divRows.length) {
        // Get available divisions for better error message
        const { data: availableDivs } = await admin
          .from('v_divisions_public')
          .select('division_code')
          .eq('event_short_ref', 'TN2025')
          .eq('is_active', true);
        const available = availableDivs?.map(d => d.division_code).join(', ') || 'none';
        throw new Error(`Division ${divLetter} not active for ${eventShortRef}. Available: ${available}`);
      }

      // 3) Package availability check
      const pkgCodes = new Set<string>();
      for (const opt of team_options) pkgCodes.add(derivePackageCode(eventShortRef, category, opt));
      if (pkgCodes.size) {
        const { data: pkgRows, error: pkgError } = await admin
          .from('v_packages_public')
          .select('package_code')
          .eq('event_short_ref', 'TN2025')
          .in('package_code', Array.from(pkgCodes))
          .eq('is_active', true);
        
        if (pkgError) throw new Error(`Package check failed: ${pkgError.message}`);
        const ok = new Set(pkgRows.map((r: any) => r.package_code));
        for (const code of pkgCodes) if (!ok.has(code)) throw new Error(`Package not available: ${code}`);
      }
    }

    // 4) Practice validation - only for TN events
    let practice = initialPractice;
    if (eventType === 'tn') {
      console.log('Practice data received for TN:', Array.isArray(practice) ? practice.length : 'teams structure');
      
      // Log practice teams summary (redacted)
      if (practice && typeof practice === 'object' && 'teams' in practice) {
        const tnPractice = practice as { teams: TNPracticeTeam[] };
        console.log('🔍 Practice Teams Summary:', {
          team_count: tnPractice.teams.length,
          team_keys: tnPractice.teams.map(t => t.team_key),
          first_team_dates_count: tnPractice.teams[0]?.dates?.length || 0,
          first_team_ranks_count: tnPractice.teams[0]?.slot_ranks?.length || 0
        });
      }
      
      // Validate practice data for TN events
      if (practice && typeof practice === 'object' && 'teams' in practice) {
        const tnPractice = practice as { teams: TNPracticeTeam[] };
        const { data: eventConfig } = await admin
          .from('v_event_config_public')
          .select('practice_start_date, practice_end_date, allowed_weekdays')
          .eq('event_short_ref', 'TN2025')
          .single();
        
        // Use January to December as default practice window if config not available
        const practiceStart = eventConfig?.practice_start_date || '2025-01-01';
        const practiceEnd = eventConfig?.practice_end_date || '2025-12-31';
        const allowedWeekdays = eventConfig?.allowed_weekdays || [1,2,3,4,5]; // Monday-Friday
        
        for (const team of tnPractice.teams) {
          if (!team.team_key || !Array.isArray(team.dates)) {
            throw new Error('Invalid practice team data structure');
          }
          
          // Debug: Log team slot ranks count
          console.log(`🔍 Team ${team.team_key} slot_ranks count:`, team.slot_ranks?.length || 0);
          if (team.slot_ranks && team.slot_ranks.length > 0) {
            console.log(`🔍 Team ${team.team_key} slot_ranks:`, team.slot_ranks);
          }
          
          // Validate dates
          for (const dateEntry of team.dates) {
            if (!dateEntry.pref_date) {
              throw new Error('E.PRACTICE_WINDOW: Practice date is required');
            }
            
            const practiceDate = new Date(dateEntry.pref_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Check practice window
            if (practiceStart && practiceDate < new Date(practiceStart)) {
              throw new Error('E.PRACTICE_WINDOW: Practice date is before allowed window');
            }
            if (practiceEnd && practiceDate > new Date(practiceEnd)) {
              throw new Error('E.PRACTICE_WINDOW: Practice date is after allowed window');
            }
            
            // Check allowed weekdays
            if (Array.isArray(allowedWeekdays) && allowedWeekdays.length > 0) {
              const dayOfWeek = practiceDate.getDay();
              if (!allowedWeekdays.includes(dayOfWeek)) {
                throw new Error('E.PRACTICE_WEEKDAY: Practice date is not on an allowed weekday');
              }
            }
            
            // Validate duration
            const duration = Number(dateEntry.duration_hours);
            if (!duration || duration < 1 || duration > 8) {
              throw new Error('E.PRACTICE_DURATION: Practice duration must be between 1-8 hours');
            }
            
            // Validate helper
            const validHelpers = ['NONE', 'S', 'T', 'ST'];
            if (!validHelpers.includes(dateEntry.helper)) {
              throw new Error('E.PRACTICE_HELPER: Invalid helper selection');
            }
          }
          
          // Validate slot ranks - allow up to 3 per duration (1hr, 2hr)
          if (Array.isArray(team.slot_ranks)) {
            console.log(`🔍 Validating slot ranks for team ${team.team_key}: count=${team.slot_ranks.length}`);
            
            // Group by duration to validate 3 max per duration
            const ranksByDuration = new Map<number, any[]>();
            for (const rank of team.slot_ranks) {
              // Get slot details to check duration
              const { data: slotData } = await admin
                .from('timeslot_catalog')
                .select('duration_hours')
                .eq('slot_code', rank.slot_code)
                .eq('is_active', true)
                .single();
              
              if (!slotData) {
                throw new Error(`E.SLOT_INVALID: Invalid slot code ${rank.slot_code}`);
              }
              
              const duration = slotData.duration_hours;
              if (!ranksByDuration.has(duration)) {
                ranksByDuration.set(duration, []);
              }
              ranksByDuration.get(duration)!.push(rank);
            }
            
            // Check max 3 per duration
            for (const [duration, ranks] of ranksByDuration.entries()) {
              if (ranks.length > 3) {
                throw new Error(`E.SLOT_RANK_COUNT: Maximum 3 slot rankings allowed per duration (found ${ranks.length} for ${duration}hr sessions)`);
              }
              
              // Check for duplicate ranks within this duration
              const rankValues = ranks.map(r => r.rank);
              const uniqueRanks = new Set(rankValues);
              if (rankValues.length !== uniqueRanks.size) {
                throw new Error(`E.SLOT_RANK_DUP: Duplicate slot rankings not allowed for ${duration}hr sessions`);
              }
            }
            
            // Check for duplicate slot codes across all durations
            const slotCodes = team.slot_ranks.map(r => r.slot_code);
            const uniqueSlotCodes = new Set(slotCodes);
            if (slotCodes.length !== uniqueSlotCodes.size) {
              throw new Error('E.SLOT_RANK_DUP: Duplicate slot codes not allowed');
            }
          }
        }
      }
    } else {
      // For non-TN events, clear practice data
      practice = [];
      console.log('Practice disabled for non-TN event:', eventShortRef);
    }

    // 5) registration_meta (now stores individual team registrations for admin approval)
    const optionText = (o: "opt1" | "opt2") => (o === "opt1" ? "Option 1" : "Option 2");
    
    // Handle different event types
    let registrationsToInsert: any[];
    
    if (eventType === 'tn') {
      // TN: Use existing logic with team_names array
      registrationsToInsert = team_names.map((team_name, idx) => ({
        event_type: 'tn',
        event_short_ref: eventShortRef,
        client_tx_id: payload.client_tx_id,
        season: seasonNum,
        category,
        division_code: divLetter,
        option_choice: optionText(team_options[idx]),
        team_name,
        org_name,
        org_address: org_address ?? null,
        team_manager_1: mgrs[0]?.name || "",
        mobile_1:       mgrs[0]?.mobile || "",
        email_1:        mgrs[0]?.email  || "",
        team_manager_2: mgrs[1]?.name || "",
        mobile_2:       mgrs[1]?.mobile || "",
        email_2:        mgrs[1]?.email  || "",
        team_manager_3: mgrs[2]?.name || "",
        mobile_3:       mgrs[2]?.mobile || "",
        email_3:        mgrs[2]?.email  || "",
        status: 'pending'
      }));
    } else {
      // WU/SC: Use new teams structure from payload
      const teams = (payload as any).teams || [];
      
      // Map division names to their code prefixes from division_config_general
      const divisionMap = new Map<string, string>();
      for (const team of teams) {
        if (team.division && !divisionMap.has(team.division)) {
          // Query division_config_general to get div_code_prefix for this division name
          const eventTypeMapping: Record<string, string> = {
            'wu': 'warm_up',
            'sc': 'short_course'
          };
          const configEventType = eventTypeMapping[eventType] || eventType;
          
          const { data: divData } = await admin
            .from('division_config_general')
            .select('div_code_prefix')
            .eq('event_type', configEventType)
            .or(`div_main_name_en.eq.${team.division},div_sub_name_en.eq.${team.division}`)
            .eq('status', 'active')
            .limit(1)
            .single();
          
          if (divData?.div_code_prefix) {
            divisionMap.set(team.division, divData.div_code_prefix);
          } else {
            // Try to match the full combined name (e.g., "Standard Boat – Men")
            const { data: allDivs } = await admin
              .from('division_config_general')
              .select('div_code_prefix, div_main_name_en, div_sub_name_en')
              .eq('event_type', configEventType)
              .eq('status', 'active');
            
            if (allDivs) {
              for (const div of allDivs) {
                const fullName = div.div_sub_name_en 
                  ? `${div.div_main_name_en} – ${div.div_sub_name_en}`
                  : div.div_main_name_en;
                if (fullName === team.division) {
                  divisionMap.set(team.division, div.div_code_prefix);
                  break;
                }
              }
            }
          }
        }
      }
      
      registrationsToInsert = teams.map((team: any) => ({
        event_type: eventType,  // Use normalized event type ('wu' or 'sc')
        event_short_ref: eventShortRef,
        client_tx_id: payload.client_tx_id,
        season: seasonNum,
        category: team.category || team.boat_type || '',
        division_code: divisionMap.get(team.division) || '', // Use div_code_prefix
        option_choice: null,  // Not used for WU/SC events
        team_name: team.name || '',
        org_name,
        org_address: org_address ?? null,
        package_choice: team.boat_type || '',
        team_size: team.team_size || null,
        team_manager_1: mgrs[0]?.name || "",
        mobile_1:       mgrs[0]?.mobile || "",
        email_1:        mgrs[0]?.email  || "",
        team_manager_2: mgrs[1]?.name || "",
        mobile_2:       mgrs[1]?.mobile || "",
        email_2:        mgrs[1]?.email  || "",
        team_manager_3: mgrs[2]?.name || "",
        mobile_3:       mgrs[2]?.mobile || "",
        email_3:        mgrs[2]?.email  || "",
        status: 'pending'
      }));
    }
    
    console.log('🔄 About to insert registrations:', {
      count: registrationsToInsert.length,
      client_tx_id: payload.client_tx_id,
      event_short_ref: eventShortRef,
      first_team: registrationsToInsert[0]?.team_name
    });
    
    const { data: insertedRegistrations, error: regError } = await admin
      .from('registration_meta')
      .insert(registrationsToInsert)
      .select('id, team_code');
    
    if (regError) throw new Error(`Registration insert failed: ${regError.message}`);
    const registration_ids: string[] = insertedRegistrations.map((r: any) => r.id);
    const team_codes: string[] = insertedRegistrations.map((r: any) => r.team_code);

    // Note: race_day_requests and practice_preferences will be handled after admin approval
    // when teams are moved from registration_meta to team_meta

    return respond(req, { registration_ids, team_codes }, 200);
  } catch (err) {
    console.error("submit_registration failed:", err);
    const msg = (err as Error)?.message || "Server error";
    console.error("Error details:", {
      message: msg,
      stack: (err as Error)?.stack,
      payload: JSON.stringify(payload, null, 2)
    });
    return respond(req, { 
      error: msg, 
      details: (err as Error)?.stack,
      debug: {
        eventShortRef: payload?.eventShortRef,
        category: payload?.category,
        practiceCount: Array.isArray(payload?.practice) ? payload.practice.length : (payload?.practice && 'teams' in payload.practice ? (payload.practice as { teams: TNPracticeTeam[] }).teams.length : 0)
      }
    }, 400);
  }
});