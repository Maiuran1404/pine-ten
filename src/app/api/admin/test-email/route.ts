import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/notifications";

// GET - Test email sending (admin only)
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string; email?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try to send a test email to the admin
    const result = await sendEmail({
      to: user.email || "maiuran@craftedstudio.ai",
      subject: "Test Email from Crafted",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email from Crafted.</p>
          <p>If you received this, your email configuration is working!</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: result.success,
      error: result.error,
      sentTo: user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test email", details: String(error) },
      { status: 500 }
    );
  }
}
