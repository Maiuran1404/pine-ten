import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { orshotTemplates, generatedDesigns, companies, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateBrandedDesign,
  isOrshotEnabled,
  type BrandData,
  type ParameterMapping,
} from "@/lib/orshot";
import { logger } from "@/lib/logger";

/**
 * POST /api/orshot/generate
 * Generate a design from a template using client's brand data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Orshot is configured
    if (!isOrshotEnabled()) {
      return NextResponse.json(
        { error: "Quick Design feature is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Fetch the template
    const [template] = await db
      .select()
      .from(orshotTemplates)
      .where(eq(orshotTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (!template.isActive) {
      return NextResponse.json(
        { error: "Template is not available" },
        { status: 400 }
      );
    }

    // Fetch the user's company/brand data
    const [user] = await db
      .select({
        companyId: users.companyId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "Please complete your brand profile first" },
        { status: 400 }
      );
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Brand data not found. Please complete your brand profile." },
        { status: 400 }
      );
    }

    // Map company to BrandData
    const brandData: BrandData = {
      name: company.name,
      logoUrl: company.logoUrl,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      accentColor: company.accentColor,
      backgroundColor: company.backgroundColor,
      textColor: company.textColor,
      primaryFont: company.primaryFont,
      secondaryFont: company.secondaryFont,
      tagline: company.tagline,
    };

    logger.info(
      { userId: session.user.id, templateId, templateName: template.name },
      "Generating design"
    );

    // Generate the design
    const result = await generateBrandedDesign(
      template.orshotTemplateId,
      brandData,
      template.parameterMapping as ParameterMapping,
      template.outputFormat as "png" | "jpg" | "webp" | "pdf"
    );

    if (!result.success || !result.imageUrl) {
      logger.error(
        { error: result.error, templateId },
        "Design generation failed"
      );
      return NextResponse.json(
        { error: result.error || "Failed to generate design" },
        { status: 500 }
      );
    }

    // Save the generated design
    const [savedDesign] = await db
      .insert(generatedDesigns)
      .values({
        clientId: session.user.id,
        templateId: template.id,
        templateName: template.name,
        imageUrl: result.imageUrl,
        imageFormat: template.outputFormat,
        modificationsUsed: brandData as unknown as Record<string, unknown>,
        savedToAssets: false,
      })
      .returning();

    logger.info(
      {
        userId: session.user.id,
        designId: savedDesign.id,
        responseTime: result.responseTime,
      },
      "Design generated and saved"
    );

    return NextResponse.json({
      success: true,
      design: {
        id: savedDesign.id,
        imageUrl: result.imageUrl,
        templateName: template.name,
        category: template.category,
        format: template.outputFormat,
        createdAt: savedDesign.createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Design generation error");
    return NextResponse.json(
      { error: "Failed to generate design" },
      { status: 500 }
    );
  }
}
