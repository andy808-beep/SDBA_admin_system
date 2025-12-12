import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { sanitizeText, validateEmail } from "@/lib/sanitize";

// Custom email validation with sanitization
const emailSchema = z.string().email().refine(validateEmail, {
  message: "Invalid email format",
}).transform(sanitizeText);

const Payload = z.object({
  // Page 1
  race_category: z.enum(["men_open","ladies_open","mixed_open","mixed_corporate"]),
  num_teams: z.number().int().min(1),
  num_teams_opt1: z.number().int().min(0),
  num_teams_opt2: z.number().int().min(0),
  season: z.number().int().min(2000).max(2100),

  // Page 2 - All text fields sanitized
  org_name: z.string().min(1).transform(sanitizeText),
  org_address: z.string().optional().transform((val) => val ? sanitizeText(val) : undefined),
  team_names: z.array(z.string().min(1).transform(sanitizeText)),          // ["Team A","Team B",...]
  team_options: z.array(z.enum(["Option 1","Option 2"])), // ["Option 1","Option 2",...]
  managers: z.object({
    manager1_name: z.string().min(1).transform(sanitizeText),
    manager1_mobile: z.string().optional().transform((val) => val ? sanitizeText(val) : undefined),
    manager1_email: emailSchema.optional(),
    manager2_name: z.string().min(1).transform(sanitizeText),
    manager2_mobile: z.string().optional().transform((val) => val ? sanitizeText(val) : undefined),
    manager2_email: emailSchema.optional(),
    manager3_name: z.string().optional().transform((val) => val ? sanitizeText(val) : undefined),
    manager3_mobile: z.string().optional().transform((val) => val ? sanitizeText(val) : undefined),
    manager3_email: emailSchema.optional(),
  }),
});

/**
 * @swagger
 * /api/public/register:
 *   post:
 *     tags:
 *       - Public
 *     summary: Register a new team
 *     description: Submit a new team registration. This endpoint is public and does not require authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - race_category
 *               - num_teams
 *               - num_teams_opt1
 *               - num_teams_opt2
 *               - season
 *               - org_name
 *               - team_names
 *               - team_options
 *               - managers
 *             properties:
 *               race_category:
 *                 type: string
 *                 enum: [men_open, ladies_open, mixed_open, mixed_corporate]
 *               num_teams:
 *                 type: integer
 *                 minimum: 1
 *               num_teams_opt1:
 *                 type: integer
 *                 minimum: 0
 *               num_teams_opt2:
 *                 type: integer
 *                 minimum: 0
 *               season:
 *                 type: integer
 *                 minimum: 2000
 *                 maximum: 2100
 *               org_name:
 *                 type: string
 *                 minLength: 1
 *               org_address:
 *                 type: string
 *               team_names:
 *                 type: array
 *                 items:
 *                   type: string
 *               team_options:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Option 1, Option 2]
 *               managers:
 *                 type: object
 *                 required:
 *                   - manager1_name
 *                   - manager2_name
 *                 properties:
 *                   manager1_name:
 *                     type: string
 *                   manager1_mobile:
 *                     type: string
 *                   manager1_email:
 *                     type: string
 *                     format: email
 *                   manager2_name:
 *                     type: string
 *                   manager2_mobile:
 *                     type: string
 *                   manager2_email:
 *                     type: string
 *                     format: email
 *                   manager3_name:
 *                     type: string
 *                   manager3_mobile:
 *                     type: string
 *                   manager3_email:
 *                     type: string
 *                     format: email
 *           example:
 *             race_category: "men_open"
 *             num_teams: 2
 *             num_teams_opt1: 1
 *             num_teams_opt2: 0
 *             season: 2025
 *             org_name: "Example Organization"
 *             org_address: "123 Main St"
 *             team_names: ["Team Alpha", "Team Beta"]
 *             team_options: ["Option 1", "Option 2"]
 *             managers:
 *               manager1_name: "John Doe"
 *               manager1_mobile: "1234567890"
 *               manager1_email: "john@example.com"
 *               manager2_name: "Jane Smith"
 *               manager2_mobile: "0987654321"
 *               manager2_email: "jane@example.com"
 *     responses:
 *       201:
 *         description: Registration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 registration_id:
 *                   type: string
 *                   format: uuid
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       team_code:
 *                         type: string
 *             example:
 *               registration_id: "550e8400-e29b-41d4-a716-446655440000"
 *               teams:
 *                 - id: "660e8400-e29b-41d4-a716-446655440001"
 *                   team_code: "S25-M001"
 *                 - id: "660e8400-e29b-41d4-a716-446655440002"
 *                   team_code: "S25-M002"
 *       400:
 *         description: Bad request
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = Payload.parse(body);

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

    if (e1) throw ApiErrors.badRequest(e1.message);

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

    if (e2) throw ApiErrors.badRequest(e2.message);

    return NextResponse.json({
      registration_id: reg.id,
      teams: teams, // includes generated team_code per row (e.g., S25-M001)
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}