import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function makeAdmin() {
  const { db } = await import("../src/db");
  const { users } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const allUsers = await db.select().from(users).limit(5);
  console.log('Users:', allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));

  if (allUsers.length > 0) {
    await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, allUsers[0].id));
    console.log('Updated user to ADMIN:', allUsers[0].email);
  }
  process.exit(0);
}
makeAdmin();
