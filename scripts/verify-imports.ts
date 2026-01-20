#!/usr/bin/env npx tsx
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/db");
  const { deliverableStyleReferences } = await import("../src/db/schema");
  const { desc, like } = await import("drizzle-orm");

  // Get recent imports from bigged
  const recent = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      imageUrl: deliverableStyleReferences.imageUrl,
      industries: deliverableStyleReferences.industries,
      moodKeywords: deliverableStyleReferences.moodKeywords,
      colorTemperature: deliverableStyleReferences.colorTemperature,
      energyLevel: deliverableStyleReferences.energyLevel,
      createdAt: deliverableStyleReferences.createdAt,
    })
    .from(deliverableStyleReferences)
    .where(like(deliverableStyleReferences.imageUrl, "%bigged%"))
    .orderBy(desc(deliverableStyleReferences.createdAt))
    .limit(10);

  console.log("\n📋 Recent imports from Bigged:\n");

  if (recent.length === 0) {
    console.log("No imports found from Bigged.");
  } else {
    recent.forEach((r, i) => {
      console.log(`[${i + 1}] ${r.name}`);
      console.log(`    Type: ${r.deliverableType}, Style: ${r.styleAxis}`);
      console.log(`    Color: ${r.colorTemperature}, Energy: ${r.energyLevel}`);
      console.log(`    Industries: ${r.industries?.join(", ") || "none"}`);
      console.log(`    Mood: ${r.moodKeywords?.join(", ") || "none"}`);
      console.log(`    URL: ${r.imageUrl?.substring(0, 70)}...`);
      console.log();
    });

    console.log(`\n✅ Total found: ${recent.length} imports from Bigged`);
  }

  process.exit(0);
}

main().catch(console.error);
