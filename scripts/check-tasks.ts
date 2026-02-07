import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  title: text("title"),
  status: text("status"),
  clientId: uuid("client_id"),
  freelancerId: uuid("freelancer_id"),
  createdAt: timestamp("created_at"),
});

const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  email: text("email"),
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  const allTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      clientId: tasks.clientId,
      freelancerId: tasks.freelancerId,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .orderBy(desc(tasks.createdAt))
    .limit(20);

  console.log("=== Recent Tasks ===");
  console.log("Total tasks found:", allTasks.length);

  allTasks.forEach((t) => {
    console.log(
      `- [${t.status}] "${t.title}" | freelancerId: ${t.freelancerId || "NONE"} | created: ${t.createdAt}`
    );
  });

  // Summary by status
  const statusCounts: Record<string, number> = {};
  allTasks.forEach((t) => {
    statusCounts[t.status || "NULL"] = (statusCounts[t.status || "NULL"] || 0) + 1;
  });

  console.log("\n=== Status Summary ===");
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });

  // Tasks without freelancer
  const unassigned = allTasks.filter((t) => !t.freelancerId);
  console.log("\n=== Unassigned Tasks ===");
  console.log("Count:", unassigned.length);

  await client.end();
}

main().catch(console.error);
