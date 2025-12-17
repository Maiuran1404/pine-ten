import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, freelancerProfiles, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { adminNotifications, sendEmail, emailTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (type === "client") {
      const { brand, hasWebsite } = data;

      // Create company with brand information
      const [company] = await db
        .insert(companies)
        .values({
          name: brand.name,
          website: brand.website || null,
          industry: brand.industry || null,
          description: brand.description || null,
          logoUrl: brand.logoUrl || null,
          faviconUrl: brand.faviconUrl || null,
          primaryColor: brand.primaryColor || null,
          secondaryColor: brand.secondaryColor || null,
          accentColor: brand.accentColor || null,
          backgroundColor: brand.backgroundColor || null,
          textColor: brand.textColor || null,
          brandColors: brand.brandColors || [],
          primaryFont: brand.primaryFont || null,
          secondaryFont: brand.secondaryFont || null,
          socialLinks: brand.socialLinks || {},
          contactEmail: brand.contactEmail || null,
          contactPhone: brand.contactPhone || null,
          tagline: brand.tagline || null,
          keywords: brand.keywords || [],
          onboardingStatus: "COMPLETED",
        })
        .returning();

      // Update user with company link and onboarding completion
      await db
        .update(users)
        .set({
          companyId: company.id,
          onboardingCompleted: true,
          onboardingData: {
            hasWebsite,
            completedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      // Send admin notification for new client
      try {
        await adminNotifications.newClientSignup({
          name: session.user.name || "Unknown",
          email: session.user.email || "",
        });

        // Send welcome email to the client
        const welcomeEmail = emailTemplates.welcomeClient(
          session.user.name || "there",
          `${config.app.url}/dashboard`
        );
        await sendEmail({
          to: session.user.email || "",
          subject: welcomeEmail.subject,
          html: welcomeEmail.html,
        });
      } catch (emailError) {
        console.error("Failed to send client onboarding notifications:", emailError);
      }

      return NextResponse.json({ success: true, companyId: company.id });
    }

    if (type === "freelancer") {
      // Update user role and create freelancer profile
      await db
        .update(users)
        .set({
          role: "FREELANCER",
          phone: data.whatsappNumber || null,
          onboardingCompleted: true,
          onboardingData: { bio: data.bio },
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      // Create freelancer profile
      await db.insert(freelancerProfiles).values({
        userId: session.user.id,
        status: "PENDING", // Needs admin approval
        skills: data.skills,
        specializations: data.specializations,
        portfolioUrls: data.portfolioUrls,
        bio: data.bio,
        hourlyRate: data.hourlyRate || null,
        whatsappNumber: data.whatsappNumber || null,
      });

      // Send admin notification for new freelancer application
      try {
        await adminNotifications.newFreelancerApplication({
          name: session.user.name || "Unknown",
          email: session.user.email || "",
          skills: data.skills || [],
          portfolioUrls: data.portfolioUrls || [],
        });
      } catch (emailError) {
        console.error("Failed to send freelancer application notification:", emailError);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
