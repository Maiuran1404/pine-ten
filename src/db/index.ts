import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the postgres client
const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export the raw client for transactions
export const sql = client;

/**
 * Execute a function within a database transaction
 * Automatically rolls back on error
 *
 * Usage:
 *   const result = await withTransaction(async (tx) => {
 *     await tx.insert(users).values({ ... });
 *     await tx.update(accounts).set({ ... });
 *     return result;
 *   });
 */
export async function withTransaction<T>(
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await fn(tx as typeof db);
  });
}

export * from "./schema";
