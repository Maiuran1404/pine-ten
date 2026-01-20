import * as dotenv from "dotenv";
import { chromium, Browser, Page } from "playwright";

// Load environment variables first
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// Dribbble URLs to scrape
const DRIBBBLE_URLS = [
  "https://dribbble.com/shots/26572260-Social-Media-Content-for-Hidratei-Beauty-Haircare-Brand",
  "https://dribbble.com/shots/23911213--Allegresse-Social-Media-Content",
  "https://dribbble.com/shots/11959676-Kpop-North-branding-Instagram-content",
  "https://dribbble.com/shots/17915026--Exploration-Coffee-Instagram-Post",
  "https://dribbble.com/shots/25044742-Music-Instagram-Posts-Stories",
  "https://dribbble.com/shots/25471272-Bakery-Cafe-Instagram-Post",
  "https://dribbble.com/shots/26961238-Instagram-Post-and-Story-Canva-Templates-Lime-Green-and-Purple",
  "https://dribbble.com/shots/20934693-LinkedIn-Ads",
  "https://dribbble.com/shots/21833359-HR-Startup-social-media-ads",
  "https://dribbble.com/shots/20192539-influencers-social-ads-template",
  "https://dribbble.com/shots/25438530-Brisk-social-media-design-marketing-ads",
  "https://dribbble.com/shots/23508116--316-PROTOTYP-SCL-ADS-00-24",
  "https://dribbble.com/shots/26981526-Script-Skincare-and-Dermatology-Social-Media-Pack",
  "https://dribbble.com/shots/20182840-saas-startup-social-media-ads-banners",
  "https://dribbble.com/shots/21144699-Saas-Startup-Social-Media-Ads-Banners",
  "https://dribbble.com/shots/25444512-Social-media-ads-for-SaaS-brand-Brisk",
  "https://dribbble.com/shots/26830443-Pitch-Deck-Work-In-Progress-For-Altero",
  "https://dribbble.com/shots/26737684-Scobula-Digital-Branding-Social-Media-Pack",
  "https://dribbble.com/shots/10626943-CANVA-Tripping-Social-Media-Pack",
  "https://dribbble.com/shots/26973327-DesignAPI-AI-Design-Platform-Pack",
  "https://dribbble.com/shots/26863121-AI-Data-Consulting-Pack",
  "https://dribbble.com/shots/22449501-Instagram-Quote-Templates",
  "https://dribbble.com/shots/22388860-Aesthetic-Colorful-Instagram-Post",
  "https://dribbble.com/shots/26358047-Social-Media-Instagram-stories",
  "https://dribbble.com/shots/5679456-Instagram-Stories",
  "https://dribbble.com/shots/18561716-Instagram-Story-Design",
  "https://dribbble.com/shots/26784378-Bakery-Caf-Instagram-Story-Visual-Exploration",
  "https://dribbble.com/shots/26622671-Photography-Film-Promo-Instagram-Templates",
  "https://dribbble.com/shots/25970045-Coffee-Shop-Instagram-Templates-Butsa",
  "https://dribbble.com/shots/26088560-Coffee-Shop-Instagram-Templates-Feiny",
  "https://dribbble.com/shots/25972433-Summer-Ice-Cream-Instagram-Templates-Telo",
  "https://dribbble.com/shots/26082370-Retro-Summer-Fashion-Instagram-Templates-Modisa",
  "https://dribbble.com/shots/21352535-Insta-70s-Powerpoint-Instagram-Template",
  "https://dribbble.com/shots/26651497-Kilo-Code-Social-Media-Ads",
  "https://dribbble.com/shots/26010602-Wolsey-Fashion-Social-Media-Ads",
  "https://dribbble.com/shots/22010049-Data-software-social-media-ads",
  "https://dribbble.com/shots/25130101-Adjust-Social-Media-Ads",
  "https://dribbble.com/shots/26416241-Skincare-Social-media-ads-design",
  "https://dribbble.com/shots/26864444-Modern-Beauty-Device-Social-Media-Ads-Skincare-LED-Mask",
  "https://dribbble.com/shots/21596687-Business-growth-SaaS-social-media-ads",
  "https://dribbble.com/shots/21364659-Social-Media-Ads-HR",
  "https://dribbble.com/shots/26357177-Hygraph-Social-Media-Ads",
  "https://dribbble.com/shots/24611028-Adjust-Social-Media-Ads",
  "https://dribbble.com/shots/21766338-Software-SaaS-social-media-ads",
  "https://dribbble.com/shots/26421088-Skincare-Social-media-ads-design",
  "https://dribbble.com/shots/26455424-Skincare-Social-media-ads-design",
  "https://dribbble.com/shots/26438670-Skincare-social-media-ads-design",
  "https://dribbble.com/shots/26010593-Dense-Hair-Loss-Product-Social-Media-Ads",
  "https://dribbble.com/shots/20940300-product-social-media-ads-design",
  "https://dribbble.com/shots/25395610-Social-Media-Ads-Design-Product-Manipulation",
  "https://dribbble.com/shots/24310717-Fintech-social-media-ads",
  "https://dribbble.com/shots/26438431-AirPod-Max-Headphone-Social-Media-Ads",
  "https://dribbble.com/shots/25820120-Creative-Ad-Coll-5-Ads-Design-Social-Media-Ads-Creative-Ad",
  "https://dribbble.com/shots/20119491-banking-social-media-banner-ads-templates",
  "https://dribbble.com/shots/26948593-ImageLab-Social-Media-Ad-Design",
  "https://dribbble.com/shots/25753538-Creative-Ad-Coll-4-Ads-Design-Social-Media-Ads-Creative-Ad",
  "https://dribbble.com/shots/24174476-Simplist-Social-Media-Ad-Design",
  "https://dribbble.com/shots/26169425-Performance-Ad-Design",
  "https://dribbble.com/shots/25384719-Ray-Ban-Social-Media-Design-Instagram-Post-Banner-Ads",
  "https://dribbble.com/shots/24645007-Ads-Campaign-App",
  "https://dribbble.com/shots/26625821--Summer-Savings-Meta-Ads-Active-Skin-Repair",
  "https://dribbble.com/shots/4364257-Google-Ads-Shopify",
  "https://dribbble.com/shots/26257003-Mighty-Ad-s",
  "https://dribbble.com/shots/25756705-PUR-Cold-Pressed-Juice-Meta-Ads",
  "https://dribbble.com/shots/19126594-Nom-Nom-Meta-Ads",
  "https://dribbble.com/shots/26861348-PBHS-Digital-Marketing-META-Ads",
  "https://dribbble.com/shots/26963432-Meta-Ads-Design-for-Skincare-Brands",
  "https://dribbble.com/shots/26864917-Meta-Ads-Creative-Refresh-for-a-Nutrition-Brand",
  "https://dribbble.com/shots/26384276-Hydration-Meta-ads-Instagram-post-design",
  "https://dribbble.com/shots/25732950-BLDG-Active-Skin-Repair-Meta-Ads",
  "https://dribbble.com/shots/23535029-Active-Skin-Repair-Meta-Ads",
  "https://dribbble.com/shots/26546034-Aligner-Experts-Meta-Ads",
  "https://dribbble.com/shots/24259027-Louped-Retargeting-Meta-Ads",
  "https://dribbble.com/shots/26876215-Skincare-meta-ads-design",
  "https://dribbble.com/shots/25963381-Luumun-Sleep-Earbuds-Meta-Ads",
  "https://dribbble.com/shots/26379335-Skincare-meta-ads-design",
  "https://dribbble.com/shots/25777820-Captify-Smart-glasses-Meta-Ads",
  "https://dribbble.com/shots/24932414-Slumber-Meta-Ads",
  "https://dribbble.com/shots/24019984-Virtu-Cosmetic-Surgery-Meta-Ads",
  "https://dribbble.com/shots/24012185-Hello-Clio-Meta-Ads",
  "https://dribbble.com/shots/26173743-Static-Ad-Design-Performance-Ad-Design",
  "https://dribbble.com/shots/26169453-Performance-Static-Ad-Design",
  "https://dribbble.com/shots/26169395-Static-Ad-Design-Performance-AD-Design",
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function extractImageUrl(page: Page): Promise<string | null> {
  // Wait for page to fully load
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  // Try to get og:image first
  const ogImage = await page.$eval(
    'meta[property="og:image"]',
    (el) => el.getAttribute("content")
  ).catch(() => null);

  if (ogImage) return ogImage;

  // Try to get the main shot image
  const mainImage = await page.$eval(
    'img[class*="shot-thumbnail-image"], img[class*="media-content"], .media-content img',
    (el) => el.getAttribute("src")
  ).catch(() => null);

  if (mainImage) return mainImage;

  // Try any large image on the page
  const anyImage = await page.$$eval(
    'img[src*="cdn.dribbble.com"]',
    (imgs) => {
      const validImgs = imgs.filter(img => {
        const src = img.getAttribute("src") || "";
        return src.includes("userupload") && !src.includes("avatar");
      });
      return validImgs[0]?.getAttribute("src") || null;
    }
  ).catch(() => null);

  return anyImage;
}

async function importDribbbleUrls() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║       DRIBBBLE PLAYWRIGHT IMPORT SCRIPT                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");

  // Dynamic imports
  const { db } = await import("../src/db");
  const { deliverableStyleReferences } = await import("../src/db/schema");
  const { classifyDeliverableStyle } = await import("../src/lib/ai/classify-deliverable-style");
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const BUCKET_NAME = "deliverable-styles";

  console.log(`Total Dribbble URLs to process: ${DRIBBBLE_URLS.length}`);
  console.log("");

  // Get existing references to check for duplicates
  console.log("Checking existing deliverable style references...");
  const existingRefs = await db
    .select({
      name: deliverableStyleReferences.name,
      imageUrl: deliverableStyleReferences.imageUrl,
    })
    .from(deliverableStyleReferences);

  console.log(`Found ${existingRefs.length} existing references in database\n`);

  const existingNames = new Set(existingRefs.map((r) => r.name.toLowerCase()));
  const existingImageIds = new Set(
    existingRefs.map((r) => {
      const match = r.imageUrl.match(/userupload\/(\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );

  // Launch browser
  console.log("Launching browser...\n");
  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  try {
    for (let i = 0; i < DRIBBBLE_URLS.length; i++) {
      const dribbbleUrl = DRIBBBLE_URLS[i];
      const progress = `[${i + 1}/${DRIBBBLE_URLS.length}]`;

      try {
        console.log(`\n${progress} Processing: ${dribbbleUrl.substring(0, 60)}...`);

        // Open page
        const page = await context.newPage();

        try {
          console.log(`  → Loading page...`);
          await page.goto(dribbbleUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          await delay(2000); // Wait for dynamic content

          // Extract image URL
          const cdnUrl = await extractImageUrl(page);

          if (!cdnUrl) {
            console.log(`  ✗ Could not find image URL`);
            totalFailed++;
            await page.close();
            continue;
          }

          // Check if already imported
          const uploadIdMatch = cdnUrl.match(/userupload\/(\d+)/);
          if (uploadIdMatch && existingImageIds.has(uploadIdMatch[1])) {
            console.log(`  ⚠ Already imported - skipping`);
            totalSkipped++;
            await page.close();
            continue;
          }

          // Fetch the image
          console.log(`  → Downloading image...`);
          const imageResponse = await fetch(cdnUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; PineBot/1.0)",
            },
          });

          if (!imageResponse.ok) {
            console.log(`  ✗ Failed to download image: ${imageResponse.status}`);
            totalFailed++;
            await page.close();
            continue;
          }

          const contentType = imageResponse.headers.get("content-type") || "";
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 10 * 1024 * 1024) {
            console.log(`  ✗ Image too large`);
            totalFailed++;
            await page.close();
            continue;
          }

          // Determine media type
          let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";
          if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            mediaType = "image/jpeg";
          } else if (contentType.includes("gif")) {
            mediaType = "image/gif";
          } else if (contentType.includes("webp")) {
            mediaType = "image/webp";
          }

          // Classify with AI
          console.log(`  → Classifying with AI...`);
          const base64 = buffer.toString("base64");
          const classification = await classifyDeliverableStyle(base64, mediaType);

          // Check for duplicate name
          if (existingNames.has(classification.name.toLowerCase())) {
            console.log(`  ⚠ Duplicate name: "${classification.name}" - skipping`);
            totalSkipped++;
            await page.close();
            continue;
          }

          // Upload to Supabase Storage
          console.log(`  → Uploading to storage...`);
          const timestamp = Date.now();
          const cleanName = classification.name.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 50);
          const ext = mediaType.split("/")[1];
          const storagePath = `${timestamp}-${cleanName}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, buffer, {
              contentType: mediaType,
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message.includes("not found")) {
              await supabase.storage.createBucket(BUCKET_NAME, { public: true });
              await supabase.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
                contentType: mediaType,
                upsert: false,
              });
            } else if (!uploadError.message.includes("already exists")) {
              throw uploadError;
            }
          }

          // Get public URL
          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
          const imageUrl = urlData.publicUrl;

          // Insert into database
          console.log(`  → Saving to database...`);
          await db.insert(deliverableStyleReferences).values({
            name: classification.name,
            description: classification.description,
            imageUrl,
            deliverableType: classification.deliverableType,
            styleAxis: classification.styleAxis,
            subStyle: classification.subStyle,
            semanticTags: classification.semanticTags,
            colorTemperature: classification.colorTemperature,
            energyLevel: classification.energyLevel,
            densityLevel: classification.densityLevel,
            formalityLevel: classification.formalityLevel,
            colorSamples: classification.colorSamples || [],
            industries: classification.industries || [],
            targetAudience: classification.targetAudience,
            visualElements: classification.visualElements || [],
            moodKeywords: classification.moodKeywords || [],
            isActive: true,
          });

          // Add to existing sets
          existingNames.add(classification.name.toLowerCase());
          if (uploadIdMatch) {
            existingImageIds.add(uploadIdMatch[1]);
          }

          console.log(`  ✓ Imported: "${classification.name}" (${classification.deliverableType}/${classification.styleAxis})`);
          totalSuccess++;

          await page.close();
          await delay(1000);
        } catch (pageError) {
          console.log(`  ✗ Page error: ${pageError instanceof Error ? pageError.message.substring(0, 80) : "Unknown"}`);
          totalFailed++;
          await page.close().catch(() => {});
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ✗ Error: ${errorMsg.substring(0, 100)}`);
        totalFailed++;
      }
    }
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                        IMPORT SUMMARY                          ║");
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log(`║  Total URLs processed:    ${DRIBBBLE_URLS.length.toString().padStart(5)}                              ║`);
  console.log(`║  Successfully imported:   ${totalSuccess.toString().padStart(5)}                              ║`);
  console.log(`║  Failed:                  ${totalFailed.toString().padStart(5)}                              ║`);
  console.log(`║  Skipped (duplicates):    ${totalSkipped.toString().padStart(5)}                              ║`);
  console.log("╚════════════════════════════════════════════════════════════════╝");

  // Final count
  const finalCount = await db
    .select({ id: deliverableStyleReferences.id })
    .from(deliverableStyleReferences);

  console.log(`\nFinal database count: ${finalCount.length} deliverable style references`);
}

// Run the script
importDribbbleUrls()
  .catch(console.error)
  .finally(() => process.exit());
