import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// Video references to import with tags based on user descriptions
const VIDEO_REFERENCES = [
  {
    url: "https://www.youtube.com/watch?v=SgmuplXU2iY",
    name: "Short Punchy Brand Launch",
    description:
      "Short, punchy, brand-forward launch content. Focused on one key value/feature with engaging visuals and clear CTA.",
    tags: ["fast-paced", "product-showcase", "brand-story", "teaser"],
    styleAxis: "bold",
  },
  {
    url: "https://www.youtube.com/watch?v=pZv7me6dFns",
    name: "High Energy SaaS Launch",
    description:
      "1 minute, high energy SaaS launch content. Clean motion graphics and fast UI reveals to communicate speed and simplicity.",
    tags: [
      "fast-paced",
      "motion-graphics",
      "tech",
      "saas",
      "explainer",
      "dynamic",
    ],
    styleAxis: "tech",
  },
  {
    url: "https://www.youtube.com/watch?v=-ueUb6PNwbs",
    name: "Apple Brand Philosophy",
    description:
      "Brand philosophy-driven design narrative. Uses high-quality motion graphics and visual storytelling typical of Apple branding.",
    tags: [
      "cinematic",
      "brand-story",
      "premium",
      "motion-graphics",
      "inspirational",
    ],
    styleAxis: "premium",
  },
  {
    url: "https://www.youtube.com/watch?v=66XwG1CLHuU",
    name: "Apple Sustainability Mission",
    description:
      "Brand-centric mission/impact-oriented content focused on sustainability. Uses animated typography and motion graphics.",
    tags: [
      "brand-story",
      "motion-graphics",
      "inspirational",
      "corporate",
      "announcement",
    ],
    styleAxis: "corporate",
  },
  {
    url: "https://www.youtube.com/watch?v=4Leardp_AGc",
    name: "Google Canvas AI Feature Launch",
    description:
      "Product-feature launch introducing Google Canvas. Clean UI demonstrations and motion graphics.",
    tags: ["tech", "product-showcase", "motion-graphics", "explainer", "saas"],
    styleAxis: "tech",
  },
  {
    url: "https://www.youtube.com/watch?v=2CquRQiDzx8",
    name: "Google AI Ultra Suite Launch",
    description:
      "Product-suite launch promo with high-impact visuals. Premium tier bundling top AI capabilities.",
    tags: ["tech", "saas", "product-showcase", "fast-paced", "announcement"],
    styleAxis: "tech",
  },
  {
    url: "https://www.youtube.com/watch?v=KcDaIDv2P-I",
    name: "Mirego Brand Positioning",
    description:
      "Brand launch / company positioning video. Vision-driven with professional visuals and motion branding.",
    tags: ["brand-story", "corporate", "motion-graphics", "announcement"],
    styleAxis: "corporate",
  },
  {
    url: "https://www.youtube.com/watch?v=aSte18D2_YE",
    name: "NeuraFlow SaaS Promo",
    description:
      "Polished SaaS promo & explainer for B2B founders. Engaging motion graphics with clean visuals.",
    tags: [
      "saas",
      "explainer",
      "motion-graphics",
      "professional",
      "startup",
      "product-showcase",
    ],
    styleAxis: "minimal",
  },
  {
    url: "https://www.youtube.com/watch?v=N-WftcsNjPA",
    name: "Launch Video Showcase",
    description:
      "Meta-example showcasing great product launch videos. Polished, cinematic, and rhythmical with bold motion graphics.",
    tags: [
      "cinematic",
      "motion-graphics",
      "dynamic",
      "inspirational",
      "brand-story",
    ],
    styleAxis: "bold",
  },
  {
    url: "https://www.youtube.com/watch?v=A0VttaLy4sU",
    name: "Cinematic Story-First Launch",
    description:
      "Story-first product launch with cinematic shots. Voice-over driven with emotional framing and brand-led narrative.",
    tags: [
      "cinematic",
      "brand-story",
      "emotional",
      "inspirational",
      "premium",
      "documentary",
    ],
    styleAxis: "premium",
  },
  {
    url: "https://www.youtube.com/watch?v=ISYIEmQxs2M",
    name: "Apple Creator Studio Announcement",
    description:
      "Brand/feature announcement introducing Apple Creator Studio subscription bundle. Overview of creative tools.",
    tags: ["announcement", "product-showcase", "tech", "corporate"],
    styleAxis: "corporate",
  },
];

// Helper to extract YouTube video ID
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get YouTube thumbnail URL
function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

async function runMigration() {
  console.log("Running migration to add video reference columns...\n");

  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");

  try {
    // Add video columns if they don't exist
    await db.execute(sql`
      ALTER TABLE "deliverable_style_references" 
      ADD COLUMN IF NOT EXISTS "video_url" text;
    `);
    await db.execute(sql`
      ALTER TABLE "deliverable_style_references" 
      ADD COLUMN IF NOT EXISTS "video_thumbnail_url" text;
    `);
    await db.execute(sql`
      ALTER TABLE "deliverable_style_references" 
      ADD COLUMN IF NOT EXISTS "video_duration" text;
    `);
    await db.execute(sql`
      ALTER TABLE "deliverable_style_references" 
      ADD COLUMN IF NOT EXISTS "video_tags" jsonb DEFAULT '[]'::jsonb;
    `);
    console.log("✅ Migration complete - video columns added\n");
  } catch (error) {
    // Columns might already exist
    console.log("ℹ️  Columns may already exist, continuing...\n");
  }
}

async function importVideos() {
  console.log(
    "╔════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║       LAUNCH VIDEO REFERENCES IMPORT                           ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════╝\n"
  );

  // Run migration first
  await runMigration();

  const { db } = await import("../src/db");
  const { deliverableStyleReferences } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const video of VIDEO_REFERENCES) {
    const videoId = extractYouTubeVideoId(video.url);
    if (!videoId) {
      console.log(`❌ Invalid URL: ${video.url}`);
      failed++;
      continue;
    }

    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = getYouTubeThumbnailUrl(videoId);

    // Check if already exists
    const existing = await db
      .select({ id: deliverableStyleReferences.id })
      .from(deliverableStyleReferences)
      .where(eq(deliverableStyleReferences.videoUrl, normalizedUrl))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏭️  Already exists: ${video.name}`);
      skipped++;
      continue;
    }

    try {
      await db.insert(deliverableStyleReferences).values({
        name: video.name,
        description: video.description,
        imageUrl: thumbnailUrl,
        videoUrl: normalizedUrl,
        videoThumbnailUrl: thumbnailUrl,
        videoTags: video.tags,
        videoDuration: null,
        deliverableType: "launch_video",
        styleAxis: video.styleAxis,
        featuredOrder: 0,
        displayOrder: imported,
        isActive: true,
        semanticTags: video.tags, // Also add to semantic tags for search
      });

      console.log(`✅ Imported: ${video.name} (${video.styleAxis})`);
      console.log(`   Tags: ${video.tags.join(", ")}`);
      imported++;
    } catch (error) {
      console.log(
        `❌ Failed: ${video.name} - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      failed++;
    }
  }

  console.log(
    "\n════════════════════════════════════════════════════════════════"
  );
  console.log("SUMMARY");
  console.log(
    "════════════════════════════════════════════════════════════════"
  );
  console.log(`Total: ${VIDEO_REFERENCES.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(
    "════════════════════════════════════════════════════════════════\n"
  );

  // Check final count
  const allVideos = await db
    .select({ id: deliverableStyleReferences.id })
    .from(deliverableStyleReferences)
    .where(eq(deliverableStyleReferences.deliverableType, "launch_video"));

  console.log(
    `📊 Total launch video references in database: ${allVideos.length}`
  );
}

importVideos()
  .catch(console.error)
  .finally(() => process.exit());
