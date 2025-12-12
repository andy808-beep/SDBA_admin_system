// app/docs/openapi.yaml/route.ts
// Serve OpenAPI specification file

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "docs", "openapi.yaml");
    const fileContents = await readFile(filePath, "utf-8");

    return new NextResponse(fileContents, {
      headers: {
        "Content-Type": "application/x-yaml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "OpenAPI specification not found" },
      { status: 404 }
    );
  }
}

