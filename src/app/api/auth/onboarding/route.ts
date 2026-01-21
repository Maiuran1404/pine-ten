import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, freelancerProfiles, companies, audiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { adminNotifications, sendEmail, emailTemplates, notifyAdminWhatsApp, adminWhatsAppTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";
import { withRateLimit } from "@/lib/rate-limit";

async function handler(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Security: Get current user from database to check actual state
    // This prevents race conditions and ensures we have accurate data
    const [currentUser] = await db
      .select({
        role: users.role,
        onboardingCompleted: users.onboardingCompleted,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Security: Prevent re-submission of onboarding
    // Once completed, users cannot change their role or re-onboard
    if (currentUser.onboardingCompleted) {
      return NextResponse.json(
        { error: "Onboarding already completed. Contact support to make changes." },
        { status: 403 }
      );
    }

    // Security: Only CLIENT role users can go through onboarding
    // ADMIN and FREELANCER users should not be able to re-onboard
    if (currentUser.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Only new users can complete onboarding" },
        { status: 403 }
      );
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
          industryArchetype: brand.industryArchetype || null,
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

      // Save inferred audiences if any
      if (brand.audiences && Array.isArray(brand.audiences) && brand.audiences.length > 0) {
        const audienceValues = brand.audiences.map((audience: {
          name: string;
          isPrimary?: boolean;
          demographics?: Record<string, unknown>;
          firmographics?: Record<string, unknown>;
          psychographics?: Record<string, unknown>;
          behavioral?: Record<string, unknown>;
          confidence?: number;
        }) => ({
          companyId: company.id,
          name: audience.name,
          isPrimary: audience.isPrimary || false,
          demographics: audience.demographics || null,
          firmographics: audience.firmographics || null,
          psychographics: audience.psychographics || null,
          behavioral: audience.behavioral || null,
          confidence: audience.confidence || 50,
          sources: ["website"],
        }));

        await db.insert(audiences).values(audienceValues);
      }

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

      // Fire-and-forget: Send notifications without blocking the response
      const userName = session.user.name || "Unknown";
      const userEmail = session.user.email || "";
      Promise.resolve().then(async () => {
        try {
          await adminNotifications.newClientSignup({ name: userName, email: userEmail });
          const welcomeEmail = emailTemplates.welcomeClient(userName, `${config.app.url}/dashboard`);
          await sendEmail({ to: userEmail, subject: welcomeEmail.subject, html: welcomeEmail.html });
          
          // Send WhatsApp notification to admin
          const whatsappMessage = adminWhatsAppTemplates.newUserSignup({
            name: userName,
            email: userEmail,
            role: "CLIENT",
            signupUrl: `${config.app.url}/admin/clients`,
          });
          await notifyAdminWhatsApp(whatsappMessage);
        } catch (error) {
          console.error("Failed to send client onboarding notifications:", error);
        }
      });

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

      // Fire-and-forget: Send notification without blocking the response
      const freelancerName = session.user.name || "Unknown";
      const freelancerEmail = session.user.email || "";
      const freelancerSkills = data.skills || [];
      const freelancerPortfolio = data.portfolioUrls || [];
      Promise.resolve().then(async () => {
        try {
          await adminNotifications.newFreelancerApplication({
            name: freelancerName,
            email: freelancerEmail,
            skills: freelancerSkills,
            portfolioUrls: freelancerPortfolio,
          });
          
          // Send WhatsApp notification to admin
          const whatsappMessage = adminWhatsAppTemplates.newUserSignup({
            name: freelancerName,
            email: freelancerEmail,
            role: "FREELANCER",
            signupUrl: `${config.app.url}/admin/freelancers`,
          });
          await notifyAdminWhatsApp(whatsappMessage);
        } catch (error) {
          console.error("Failed to send freelancer application notification:", error);
        }
      });

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

// Apply auth rate limiting (20 req/min)
export const POST = withRateLimit(handler, "auth", config.rateLimits.auth);
