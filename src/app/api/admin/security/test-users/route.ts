import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { testUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List all test users
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

    const users = await db
      .select()
      .from(testUsers)
      .orderBy(desc(testUsers.createdAt));

    // Don't expose credentials in response
    const safeUsers = users.map(({ credentials, ...rest }) => ({
      ...rest,
      hasCredentials: !!credentials,
    }));

    return NextResponse.json({ testUsers: safeUsers });
  } catch (error) {
    console.error("Failed to fetch test users:", error);
    return NextResponse.json(
      { error: "Failed to fetch test users" },
      { status: 500 }
    );
  }
}

// POST - Create a new test user
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
    const { name, email, role, credentials } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    const [testUser] = await db
      .insert(testUsers)
      .values({
        name,
        email,
        role,
        credentials,
      })
      .returning();

    return NextResponse.json(
      {
        testUser: {
          ...testUser,
          credentials: undefined,
          hasCredentials: !!testUser.credentials,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create test user:", error);
    return NextResponse.json(
      { error: "Failed to create test user" },
      { status: 500 }
    );
  }
}

// PUT - Update a test user
export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Test user ID is required" }, { status: 400 });
    }

    const [testUser] = await db
      .update(testUsers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(testUsers.id, id))
      .returning();

    if (!testUser) {
      return NextResponse.json({ error: "Test user not found" }, { status: 404 });
    }

    return NextResponse.json({
      testUser: {
        ...testUser,
        credentials: undefined,
        hasCredentials: !!testUser.credentials,
      },
    });
  } catch (error) {
    console.error("Failed to update test user:", error);
    return NextResponse.json(
      { error: "Failed to update test user" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a test user
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
      return NextResponse.json({ error: "Test user ID is required" }, { status: 400 });
    }

    await db.delete(testUsers).where(eq(testUsers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete test user:", error);
    return NextResponse.json(
      { error: "Failed to delete test user" },
      { status: 500 }
    );
  }
}
