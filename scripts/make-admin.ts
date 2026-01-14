import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function makeAdmin() {
  const { db } = await import("../src/db");
  const { users } = await import("../src/db/schema");
  const { like } = await import("drizzle-orm");

  const allUsers = await db.select().from(users);
  console.log('All Users:');
  allUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));

  // Make all users admin for testing
  for (const u of allUsers) {
    if (u.role !== 'ADMIN') {
      await db.update(users).set({ role: 'ADMIN' }).where(like(users.id, u.id));
      console.log(`Updated ${u.email} to ADMIN`);
    }
  }
  process.exit(0);
}
makeAdmin();
