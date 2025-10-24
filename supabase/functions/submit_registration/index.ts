// supabase/functions/submit_registration/index.ts
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

// Read allowed origins from env, fallback to common local ports
const CORS_LIST = (Deno.env.get("CORS_ALLOW_ORIGINS") ??
  "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Support "*" if included in the list
const ALLOW_ORIGINS = new Set<string>(CORS_LIST);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin =
    origin && (ALLOW_ORIGINS.has("*") || ALLOW_ORIGINS.has(origin))
      ? origin
      : (ALLOW_ORIGINS.has("*") ? "*" : "null");
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
  category: "men_open" | "ladies_open" | "mixed_open" | "mixed_corporate";
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
};

// ---------------- Helpers ----------------
function bad(req: Request, msg: string, extra?: Record<string, unknown>) {
  return respond(req, { error: msg, ...(extra ?? {}) }, 400);
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

  // Parse payload
  let payload: Payload;
  try { payload = await req.json(); } catch { return bad(req, "Invalid JSON body"); }

  const {
    eventShortRef, category, season, org_name, org_address,
    counts, team_names = [], team_options = [], managers = [], race_day = null, practice: initialPractice = [],
  } = payload ?? {} as Payload;

  if (!eventShortRef) return bad(req, "eventShortRef is required");
  if (!category) return bad(req, "category is required");
  const divLetter = letterFromCategory(category);
  if (!divLetter) return bad(req, `Unknown category: ${category}`);
  if (!counts) return bad(req, "counts missing");
  const { num_teams, num_teams_opt1, num_teams_opt2 } = counts;
  if (!Number.isInteger(num_teams) || num_teams < 1) return bad(req, "num_teams invalid");
  if (team_names.length !== num_teams || team_options.length !== num_teams) {
    return bad(req, "team_names / team_options length must equal num_teams");
  }
  if ((num_teams_opt1 + num_teams_opt2) !== num_teams) {
    return bad(req, "num_teams_opt1 + num_teams_opt2 must equal num_teams");
  }
  if (!org_name?.trim()) return bad(req, "org_name is required");

  const mgrs: Manager[] = Array.isArray(managers) ? managers.slice(0, 3) : [];
  while (mgrs.length < 3) mgrs.push({ name: "", mobile: "", email: "" });

  try {
    // 1) Validate event exists and is enabled
    const { data: eventRows, error: eventError } = await admin
      .from('v_event_config_public')
      .select('event_short_ref, season, form_enabled, practice_start_date, practice_end_date')
      .eq('event_short_ref', eventShortRef)
      .limit(1);
    
    if (eventError) throw new Error(`Event lookup failed: ${eventError.message}`);
    if (!eventRows.length) throw new Error(`Event ${eventShortRef} not found`);
    
    const eventRow = eventRows[0];
    if (eventRow.form_enabled === false) throw new Error(`Event ${eventShortRef} is disabled`);
    if (season && Number(season) !== Number(eventRow.season)) {
      throw new Error(`Season mismatch: payload=${season}, event=${eventRow.season}`);
    }
    const seasonNum: number = Number(eventRow.season);

    // 2) Division check
    const { data: divRows, error: divError } = await admin
      .from('v_divisions_public')
      .select('division_code')
      .eq('event_short_ref', eventShortRef)
      .eq('division_code', divLetter)
      .eq('is_active', true)
      .limit(1);
    
    if (divError) throw new Error(`Division check failed: ${divError.message}`);
    if (!divRows.length) {
      // Get available divisions for better error message
      const { data: availableDivs } = await admin
        .from('v_divisions_public')
        .select('division_code')
        .eq('event_short_ref', eventShortRef)
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
        .eq('event_short_ref', eventShortRef)
        .in('package_code', Array.from(pkgCodes))
        .eq('is_active', true);
      
      if (pkgError) throw new Error(`Package check failed: ${pkgError.message}`);
      const ok = new Set(pkgRows.map((r: any) => r.package_code));
      for (const code of pkgCodes) if (!ok.has(code)) throw new Error(`Package not available: ${code}`);
    }

    // 4) Practice validation - only for TN events
    let practice = initialPractice;
    if (eventShortRef === 'tn') {
      console.log('Practice data received for TN:', Array.isArray(practice) ? practice.length : 'teams structure');
      
      // Validate practice data for TN events
      if (practice && typeof practice === 'object' && 'teams' in practice) {
        const tnPractice = practice as { teams: TNPracticeTeam[] };
        const { data: eventConfig } = await admin
          .from('v_event_config_public')
          .select('practice_start_date, practice_end_date, allowed_weekdays')
          .eq('event_short_ref', eventShortRef)
          .single();
        
        const practiceStart = eventConfig?.practice_start_date;
        const practiceEnd = eventConfig?.practice_end_date;
        const allowedWeekdays = eventConfig?.allowed_weekdays || [];
        
        for (const team of tnPractice.teams) {
          if (!team.team_key || !Array.isArray(team.dates)) {
            throw new Error('Invalid practice team data structure');
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
          
          // Validate slot ranks
          if (Array.isArray(team.slot_ranks)) {
            if (team.slot_ranks.length > 3) {
              throw new Error('E.SLOT_RANK_COUNT: Maximum 3 slot rankings allowed');
            }
            
            // Check for duplicate ranks
            const ranks = team.slot_ranks.map(r => r.rank);
            const uniqueRanks = new Set(ranks);
            if (ranks.length !== uniqueRanks.size) {
              throw new Error('E.SLOT_RANK_DUP: Duplicate slot rankings not allowed');
            }
            
            // Check for duplicate slot codes
            const slotCodes = team.slot_ranks.map(r => r.slot_code);
            const uniqueSlotCodes = new Set(slotCodes);
            if (slotCodes.length !== uniqueSlotCodes.size) {
              throw new Error('E.SLOT_RANK_DUP: Duplicate slot codes not allowed');
            }
            
            // Validate slot codes exist
            for (const rank of team.slot_ranks) {
              if (!rank.slot_code) {
                throw new Error('E.SLOT_INVALID: Slot code is required');
              }
              
              // Check if slot exists in timeslot catalog
              const { data: slotExists } = await admin
                .from('timeslot_catalog')
                .select('slot_code')
                .eq('slot_code', rank.slot_code)
                .eq('is_active', true)
                .single();
              
              if (!slotExists) {
                throw new Error('E.SLOT_INVALID: Invalid slot code');
              }
            }
          }
        }
      }
    } else {
      // For non-TN events, clear practice data
      practice = [];
      console.log('Practice disabled for non-TN event:', eventShortRef);
    }

    // 5) registration_meta
    const managers_json = JSON.stringify(mgrs);
    const { data: regData, error: regError } = await admin
      .from('registration_meta')
      .insert({
        event_short_ref: eventShortRef,
        client_tx_id: payload.client_tx_id,
        race_category: category,
        num_teams,
        num_teams_opt1,
        num_teams_opt2,
        season: seasonNum,
        org_name,
        org_address: org_address ?? null,
        managers_json: managers_json
      })
      .select('id')
      .single();
    
    if (regError) throw new Error(`Registration insert failed: ${regError.message}`);
    const registration_id: string = regData.id;

    // 6) team_meta (trigger assigns team_code)
    const optionText = (o: "opt1" | "opt2") => (o === "opt1" ? "Option 1" : "Option 2");
    const teamsToInsert = team_names.map((team_name, idx) => ({
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
      registration_id,
    }));
    
    const { data: insertedTeams, error: teamError } = await admin
      .from('team_meta')
      .insert(teamsToInsert)
      .select('id, team_code');
    
    if (teamError) throw new Error(`Team insert failed: ${teamError.message}`);
    const team_ids: string[] = insertedTeams.map((r: any) => r.id);
    const team_codes: string[] = insertedTeams.map((r: any) => r.team_code);

    // 7) race_day_requests → attach to first team (your UI captures 1 set)
    if (race_day && team_ids.length) {
      const anyQty =
        (race_day.marqueeQty ?? 0) > 0 ||
        (race_day.steerWithQty ?? 0) > 0 ||
        (race_day.steerWithoutQty ?? 0) > 0 ||
        (race_day.junkBoatQty ?? 0) > 0 ||
        (race_day.speedboatQty ?? 0) > 0 ||
        (race_day.junkBoatNo?.trim()) || (race_day.speedBoatNo?.trim());
      if (anyQty) {
        const { error: raceError } = await admin
          .from('race_day_requests')
          .upsert({
            team_id: team_ids[0],
            marquee_qty: race_day.marqueeQty ?? 0,
            steer_with_qty: race_day.steerWithQty ?? 0,
            steer_without_qty: race_day.steerWithoutQty ?? 0,
            junk_boat_no: race_day.junkBoatNo ?? null,
            junk_boat_qty: race_day.junkBoatQty ?? 0,
            speed_boat_no: race_day.speedBoatNo ?? null,
            speed_boat_qty: race_day.speedboatQty ?? 0
          });
        
        if (raceError) throw new Error(`Race day insert failed: ${raceError.message}`);
      }
    }

    // 8) practice_preferences
    if (Array.isArray(practice) && practice.length) {
      const ppRows: any[] = [];
      for (const block of practice) {
        const tId = team_ids[block.team_index];
        if (!tId) continue;
        const s1 = block.slotPrefs_1hr || {};
        const s2 = block.slotPrefs_2hr || {};
        for (const d of (block.dates || [])) {
          const { need_steersman, need_coach } = boolFlagsFromHelpers(d.helpers || "");
          const slots = (d.hours === 2 ? s2 : s1);
          ppRows.push({
            team_id: tId,
            pref_date: d.date,
            duration_hours: Number(d.hours) || 1,
            need_steersman,
            need_coach,
            pref1_slot_code: slots.slot_pref_1 || null,
            pref2_slot_code: slots.slot_pref_2 || null,
            pref3_slot_code: slots.slot_pref_3 || null,
            notes: null,
          });
        }
      }
      if (ppRows.length) {
        console.log(`Inserting ${ppRows.length} practice preferences`);
        const { error: practiceError } = await admin
          .from('practice_preferences')
          .upsert(ppRows);
        
        if (practiceError) throw new Error(`Practice preferences insert failed: ${practiceError.message}`);
        console.log('Practice preferences inserted successfully');
      }
    }

    return respond(req, { registration_id, team_codes }, 200);
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