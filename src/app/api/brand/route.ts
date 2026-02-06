import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

// GET - Fetch the user's company/brand
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with company
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        company: true,
      },
    });

    if (!user?.company) {
      return NextResponse.json({ error: "No brand found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user.company });
  } catch (error) {
    logger.error({ error }, "Fetch brand error");
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }
}

// PUT - Update the user's company/brand
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user to check company
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user?.companyId) {
      return NextResponse.json({ error: "No brand found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      website,
      industry,
      industryArchetype,
      description,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      brandColors,
      primaryFont,
      secondaryFont,
      socialLinks,
      contactEmail,
      contactPhone,
      tagline,
      keywords,
    } = body;

    // Update company
    const [updated] = await db
      .update(companies)
      .set({
        name: name || undefined,
        website: website ?? undefined,
        industry: industry ?? undefined,
        industryArchetype: industryArchetype ?? undefined,
        description: description ?? undefined,
        logoUrl: logoUrl ?? undefined,
        faviconUrl: faviconUrl ?? undefined,
        primaryColor: primaryColor ?? undefined,
        secondaryColor: secondaryColor ?? undefined,
        accentColor: accentColor ?? undefined,
        backgroundColor: backgroundColor ?? undefined,
        textColor: textColor ?? undefined,
        brandColors: brandColors ?? undefined,
        primaryFont: primaryFont ?? undefined,
        secondaryFont: secondaryFont ?? undefined,
        socialLinks: socialLinks ?? undefined,
        contactEmail: contactEmail ?? undefined,
        contactPhone: contactPhone ?? undefined,
        tagline: tagline ?? undefined,
        keywords: keywords ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, user.companyId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, "Update brand error");
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}
