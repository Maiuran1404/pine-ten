import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { eq, isNull, or, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  title: text("title"),
  status: text("status"),
  clientId: uuid("client_id"),
  freelancerId: uuid("freelancer_id"),
  assignedAt: timestamp("assigned_at"),
  updatedAt: timestamp("updated_at"),
});

const freelancerProfiles = pgTable("freelancer_profiles", {
  userId: uuid("user_id").primaryKey(),
  status: text("status"),
  availability: boolean("availability"),
});

const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name"),
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  // Get unassigned tasks (PENDING or OFFERED with no freelancer)
  const unassignedTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        or(eq(tasks.status, "PENDING"), eq(tasks.status, "OFFERED")),
        isNull(tasks.freelancerId)
      )
    );

  console.log(`Found ${unassignedTasks.length} unassigned tasks`);

  if (unassignedTasks.length === 0) {
    console.log("No tasks to fix!");
    await client.end();
    return;
  }

  // Get an approved freelancer
  const [freelancer] = await db
    .select({
      userId: freelancerProfiles.userId,
      name: users.name,
    })
    .from(freelancerProfiles)
    .innerJoin(users, eq(freelancerProfiles.userId, users.id))
    .where(eq(freelancerProfiles.status, "APPROVED"))
    .limit(1);

  if (!freelancer) {
    console.error("No approved freelancers found!");
    await client.end();
    return;
  }

  console.log(`Will assign to: ${freelancer.name} (${freelancer.userId})`);
  console.log("\nTasks to fix:");
  unassignedTasks.forEach((t) => {
    console.log(`  - [${t.status}] ${t.title}`);
  });

  // Ask for confirmation
  const args = process.argv.slice(2);
  if (!args.includes("--confirm")) {
    console.log("\nRun with --confirm to apply changes");
    await client.end();
    return;
  }

  // Update all unassigned tasks
  const now = new Date();
  for (const task of unassignedTasks) {
    await db
      .update(tasks)
      .set({
        status: "ASSIGNED",
        freelancerId: freelancer.userId,
        assignedAt: now,
        updatedAt: now,
      })
      .where(eq(tasks.id, task.id));
    console.log(`✓ Assigned: ${task.title}`);
  }

  console.log(`\nDone! Assigned ${unassignedTasks.length} tasks to ${freelancer.name}`);
  await client.end();
}

main().catch(console.error);
