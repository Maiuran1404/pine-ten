import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { styleReferences } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const styles = await db
      .select()
      .from(styleReferences)
      .orderBy(desc(styleReferences.createdAt));

    return NextResponse.json({ styles });
  } catch (error) {
    console.error("Admin styles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch styles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, imageUrl, tags } = body;

    if (!name || !category || !imageUrl) {
      return NextResponse.json(
        { error: "Name, category, and imageUrl are required" },
        { status: 400 }
      );
    }

    const [newStyle] = await db
      .insert(styleReferences)
      .values({
        name,
        category,
        imageUrl,
        tags: tags || [],
        isActive: true,
      })
      .returning();

    return NextResponse.json({ style: newStyle }, { status: 201 });
  } catch (error) {
    console.error("Admin create style error:", error);
    return NextResponse.json(
      { error: "Failed to create style" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Style ID is required" }, { status: 400 });
    }

    await db.delete(styleReferences).where(eq(styleReferences.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete style error:", error);
    return NextResponse.json(
      { error: "Failed to delete style" },
      { status: 500 }
    );
  }
}
