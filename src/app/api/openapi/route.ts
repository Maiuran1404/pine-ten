import { NextResponse } from "next/server";
import { apiSpec } from "@/lib/api-spec";

/**
 * GET /api/openapi
 * Returns the OpenAPI specification as JSON
 * Useful for importing into API testing tools like Postman
 */
export async function GET() {
  return NextResponse.json(apiSpec, {
    headers: {
      "Content-Type": "application/json",
      // Allow CORS for API spec endpoint
      "Access-Control-Allow-Origin": "*",
      // Cache for 1 hour
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
