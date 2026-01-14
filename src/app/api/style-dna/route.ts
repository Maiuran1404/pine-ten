import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { extractStyleDNA, getStyleDNASummary } from "@/lib/ai/style-dna";

// GET - Get user's Style DNA
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dna = await extractStyleDNA(session.user.id);

    if (!dna) {
      return NextResponse.json(
        { error: "No brand profile found. Please complete your brand setup." },
        { status: 404 }
      );
    }

    // Include summary for easy display
    const summary = getStyleDNASummary(dna);

    return NextResponse.json({
      dna,
      summary,
    });
  } catch (error) {
    console.error("Error extracting Style DNA:", error);
    return NextResponse.json(
      { error: "Failed to extract Style DNA" },
      { status: 500 }
    );
  }
}
