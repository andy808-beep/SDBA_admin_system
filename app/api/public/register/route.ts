import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer"; // service role

const Payload = z.object({
  // Page 1
  race_category: z.enum(["men_open","ladies_open","mixed_open","mixed_corporate"]),
  num_teams: z.number().int().min(1),
  num_teams_opt1: z.number().int().min(0),
  num_teams_opt2: z.number().int().min(0),
  season: z.number().int().min(2000).max(2100),

  // Page 2
  org_name: z.string().min(1),
  org_address: z.string().optional(),
  team_names: z.array(z.string().min(1)),          // ["Team A","Team B",...]
  team_options: z.array(z.enum(["Option 1","Option 2"])), // ["Option 1","Option 2",...]
  managers: z.object({
    manager1_name: z.string().min(1),
    manager1_mobile: z.string().optional(),
    manager1_email: z.string().email().optional(),
    manager2_name: z.string().min(1),
    manager2_mobile: z.string().optional(),
    manager2_email: z.string().email().optional(),
    manager3_name: z.string().optional(),
    manager3_mobile: z.string().optional(),
    manager3_email: z.string().email().optional(),
  }),
});

export async function POST(req: Request) {
  let p: z.infer<typeof Payload>;
  try {
    const body = await req.json();
    p = Payload.parse(body);
  } catch (e) {
    return NextResponse.json({ error: "Invalid input", detail: String(e) }, { status: 422 });
  }

  // 1) Header row
  const { data: reg, error: e1 } = await supabaseServer
    .from("registration_meta")
    .insert([{
      race_category: p.race_category,
      num_teams: p.num_teams,
      num_teams_opt1: p.num_teams_opt1,
      num_teams_opt2: p.num_teams_opt2,
      season: p.season,
      org_name: p.org_name,
      org_address: p.org_address ?? null,
      managers_json: p.managers,
    }])
    .select("id")
    .single();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  // 2) Fan out team rows
  const rows = p.team_names.map((name, i) => ({
    registration_id: reg.id,
    season: p.season,
    category: p.race_category,       // mapped into team_meta.category
    option_choice: p.team_options[i] || "Option 1",
    team_name: name,
    org_name: p.org_name,
    org_address: p.org_address ?? null,
    team_manager_1: p.managers.manager1_name,
    mobile_1: p.managers.manager1_mobile ?? null,
    email_1: p.managers.manager1_email ?? null,
    team_manager_2: p.managers.manager2_name,
    mobile_2: p.managers.manager2_mobile ?? null,
    email_2: p.managers.manager2_email ?? null,
    team_manager_3: p.managers.manager3_name ?? null,
    mobile_3: p.managers.manager3_mobile ?? null,
    email_3: p.managers.manager3_email ?? null,
  }));

  const { data: teams, error: e2 } = await supabaseServer
    .from("team_meta")
    .insert(rows)
    .select("id, team_code");

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({
    registration_id: reg.id,
    teams: teams, // includes generated team_code per row (e.g., S25-M001)
  }, { status: 201 });
}