// app/api/csrf-token/route.ts
// Endpoint to get CSRF token for frontend

import { NextRequest, NextResponse } from "next/server";
import { generateCsrfToken, getCsrfTokenFromCookie, setCsrfTokenCookie } from "@/lib/csrf";

/**
 * @swagger
 * /api/csrf-token:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get CSRF token
 *     description: Get a CSRF token for state-changing requests. The token is also set in a cookie.
 *     responses:
 *       200:
 *         description: CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: CSRF token to include in X-CSRF-Token header
 *             example:
 *               ok: true
 *               token: "abc123.def456"
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    // Check if token already exists and is valid
    const existingToken = getCsrfTokenFromCookie(req);
    
    if (existingToken) {
      // Return existing token
      return NextResponse.json({
        ok: true,
        token: existingToken,
      });
    }

    // Generate new token (Node.js runtime)
    const token = generateCsrfToken();
    
    // Create response with token
    const response = NextResponse.json({
      ok: true,
      token: token,
    });

    // Set cookie in response
    setCsrfTokenCookie(response, token);

    return response;
  } catch (error: any) {
    console.error("[CSRF Token] Error generating token:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to generate CSRF token",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

