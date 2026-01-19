import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// All the URLs to import - deduplicated
const DRIBBBLE_URLS = [
  // Batch 1 - Shot pages
  "https://dribbble.com/shots/22478283-SendingMe-Brand-book-for-decentralized-encrypted-messenger-app",
  "https://dribbble.com/shots/26986550-Synthmol-Healthcare-Branding",
  "https://dribbble.com/shots/26438737-Brand-Guidelines-for-a-Fintech-Platform",
  "https://dribbble.com/shots/26375502-Brand-Identity-System-for-a-Fintech-Security-Platform",
  "https://dribbble.com/shots/26869869-Promo-Landing-Page",
  "https://dribbble.com/shots/26985008-NovaGrid-Tech-Branding",
  "https://dribbble.com/shots/26241395-Mondus",
  "https://dribbble.com/shots/26253419-Today-Finance-Branding-Art-Direction",
  "https://dribbble.com/shots/26331144-Payscale-Re-Brand-ID",
  "https://dribbble.com/shots/26307239-DSC-Labs-Mini-Brand-Guidelines",
  // Batch 2
  "https://dribbble.com/shots/26248529-DSC-Labs-Brand-Art-Direction",
  "https://dribbble.com/shots/26972300-Openbook-Web",
  "https://dribbble.com/shots/26963904-Openbook",
  "https://dribbble.com/shots/26959707-Function-Health-Web",
  "https://dribbble.com/shots/26410980-Infinite-Epigenetics-Hero",
  "https://dribbble.com/shots/25552493-enso-homes",
  "https://dribbble.com/shots/25516593-Vesna-Hypnotherapy",
  "https://dribbble.com/shots/24533743-Turterra",
  "https://dribbble.com/shots/24447271-Function-Health",
  "https://dribbble.com/shots/25029326-Hero-Feldera",
  // Batch 3
  "https://dribbble.com/shots/23948056-TinyTalks-Brand-ID",
  "https://dribbble.com/shots/23918509-TinyTalks-Socials",
  "https://dribbble.com/shots/23695376-Special-ID",
  "https://dribbble.com/shots/23702708-Special-ID",
  "https://dribbble.com/shots/23688364-Special-xyz",
  "https://dribbble.com/shots/23613899-Special-xyz",
  "https://dribbble.com/shots/23585481-Formation",
  "https://dribbble.com/shots/26988173-Savenfold-Visual-Identity",
  "https://dribbble.com/shots/26852890-Logo-for-an-educational-platform",
  "https://dribbble.com/shots/26827854-Logo-for-a-payment-system",
  // Batch 4
  "https://dribbble.com/shots/26833020-BrandGuide-for-a-payment-system",
  "https://dribbble.com/shots/26836934-Logo-for-a-recruitment-platform",
  "https://dribbble.com/shots/26820458-BrandGuide-for-AI-powered-lead-generation-and-data-enrichment",
  "https://dribbble.com/shots/24331388-Brainforest-Logo-brand-identity-for-the-educational-platform",
  "https://dribbble.com/shots/26774641-BrandGuide-for-a-Software-Technology-Company",
  "https://dribbble.com/shots/26707634-Brand-Guide-for-an-online-learning-platform",
  "https://dribbble.com/shots/26700005-Bold-Branding-for-a-Next-Gen-Crypto-Wallet",
  "https://dribbble.com/shots/26973608-Healthline-Digital-Healthcare-Media-Platform-Branding",
  "https://dribbble.com/shots/26989045-Teltopus",
  "https://dribbble.com/shots/26862827-Unted-Brand-Identity",
  // Batch 5
  "https://dribbble.com/shots/25096065-Hetalum-Logo-Design",
  "https://dribbble.com/shots/21678833-Bofar-Branding",
  "https://dribbble.com/shots/26988904-Cloudpack",
  "https://dribbble.com/shots/26985977-Branding-for-Productivity",
  "https://dribbble.com/shots/26989718-Bookable-Logo-Branding-Identity-Booking-restaurants",
  "https://dribbble.com/shots/26987699-Rolle-Beauty-Skincare-Brand-Logo-IkhStudio",
  "https://dribbble.com/shots/26201788-360-Branding-Logo-for-AI",
  "https://dribbble.com/shots/26781700-Student-Branding",
  "https://dribbble.com/shots/26988094-Logo-Branding-Good-Food-Company",
  "https://dribbble.com/shots/26984327-Saas-Brand-Identity",
  // Batch 6
  "https://dribbble.com/shots/26984079-Calma-Hotel-Brand-Identity",
  "https://dribbble.com/shots/26984795-Wexgon-Visual-Identity-For-Technology-Web3-SaaS-Startup",
  "https://dribbble.com/shots/26981993-Clivra-Freight-Logistic-Logo-Design",
  "https://dribbble.com/shots/26975127-Creative-Campaign-Concept-Dribbble-s-Sweet-Sixteen-Illustration",
  "https://dribbble.com/shots/26966119-Branding-for-Fintech",
  "https://dribbble.com/shots/26910577-Our-Top-Five-Food-Branding-Projects-of-2025",
  "https://dribbble.com/shots/26910417-Moodboard-for-Bagel-Brand-Oh-Brother-Bagels",
  "https://dribbble.com/shots/26910384-Coasters-for-Stoa-Wine-Bar-Market-in-Los-Angeles",
  "https://dribbble.com/shots/26855725-Cosmetics-mockups",
  "https://dribbble.com/shots/24048969-Kaolin-Cosmetics-Mockups",
  // Batch 7
  "https://dribbble.com/shots/26983560-Stravo-Logo-Design",
  "https://dribbble.com/shots/26982873-LP-LP-logo-PL-logomark-letter-PL-logo-For-sale",
  "https://dribbble.com/shots/26985533-CRAVEA-Branding-Bento-Motion-Sleeko",
  "https://dribbble.com/shots/26987962-Notorious-Caf",
  "https://dribbble.com/shots/26982062-Travel-and-tour-logo-branding",
  "https://dribbble.com/shots/26982437-DevConix-Modern-Fintech-Logo-Design",
  "https://dribbble.com/shots/26983475-SPARK-Brand-Identity-Design-Logo-Visual-System-And-Color-Palette",
  "https://dribbble.com/shots/26985679-Organic-Logo-and-Brand-Identity-Design-for-Refarm",
  "https://dribbble.com/shots/23974482-Kaine-Branding-Mockups",
  "https://dribbble.com/shots/26986504-ALPINE-Logo-Brand-Identity",
  // Batch 8
  "https://dribbble.com/shots/26978734-HYROS-brand-visual-identity-design",
  "https://dribbble.com/shots/26977252-Naire-Logo-Branding-Design-for-a-Perfume-Fragnance-Brand",
  "https://dribbble.com/shots/26976930-a-a-logo-logotype-letter-a-logo-For-sale",
  "https://dribbble.com/shots/26977043-Cenix-Crypto-Exchange-Investment-Platform-Logo-Branding",
  "https://dribbble.com/shots/26908930-web3-visual-identity",
  "https://dribbble.com/shots/23931225-First-Digital-web3-brand-visual-identity",
  "https://dribbble.com/shots/25040787-AI-SaaS-visual-identity",
  // Direct image URLs
  "https://cdn.dribbble.com/userupload/42697800/file/original-e603a52f6c10ce38e0c6c149bbf254e0.png?resize=400x300&vertical=center",
  "https://cdn.dribbble.com/userupload/42854506/file/original-8205febfb24e98a01751bb0ffb4b129a.png?resize=400x300&vertical=center",
];

// Profile URLs that need manual handling
const PROFILE_URLS = [
  "https://dribbble.com/outcrowd",
  "https://dribbble.com/helen_jhones_design",
  "https://dribbble.com/Ulyssesdesignco",
  "https://dribbble.com/Visumind_Creative",
  "https://dribbble.com/terencethien",
  "https://dribbble.com/logodesignerja",
];

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Extract image URL from Dribbble page HTML
function extractDribbbleImageUrl(html: string): string | null {
  // Look for og:image meta tag first (usually the best quality)
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImageMatch) {
    return ogImageMatch[1];
  }

  // Alternative og:image format
  const ogImageAltMatch = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogImageAltMatch) {
    return ogImageAltMatch[1];
  }

  // Look for main shot image
  const mainImageMatch = html.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^"'\s]+\.(png|jpg|jpeg|gif|webp)/i);
  if (mainImageMatch) {
    return mainImageMatch[0];
  }

  return null;
}

async function importBrandReferences() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║       BRAND REFERENCES IMPORT SCRIPT                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");

  // Dynamic imports
  const { db } = await import("../src/db");
  const { brandReferences } = await import("../src/db/schema");
  const { classifyBrandImage } = await import("../src/lib/ai/classify-brand-image");
  const { optimizeImage } = await import("../src/lib/image/optimize");
  const { createClient } = await import("@supabase/supabase-js");
  const { eq } = await import("drizzle-orm");

  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const BUCKET_NAME = "brand-references";

  console.log(`Total shot URLs to process: ${DRIBBBLE_URLS.length}`);
  console.log(`Profile URLs (skip): ${PROFILE_URLS.length}`);
  console.log("");

  // Step 1: Get existing references to check for duplicates
  console.log("Step 1: Checking existing brand references...");
  const existingRefs = await db
    .select({
      id: brandReferences.id,
      name: brandReferences.name,
      imageUrl: brandReferences.imageUrl,
    })
    .from(brandReferences);

  console.log(`Found ${existingRefs.length} existing references in database`);

  // Create set of existing names (lowercased) for deduplication
  const existingNames = new Set(existingRefs.map(r => r.name.toLowerCase()));

  // Step 2: Process URLs in batches
  const BATCH_SIZE = 5;
  const totalBatches = Math.ceil(DRIBBBLE_URLS.length / BATCH_SIZE);

  console.log(`\nStep 2: Processing in ${totalBatches} batches of ${BATCH_SIZE}...\n`);

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failedUrls: { url: string; reason: string }[] = [];

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE;
    const batchUrls = DRIBBBLE_URLS.slice(batchStart, batchStart + BATCH_SIZE);

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Batch ${batchIndex + 1}/${totalBatches}`);
    console.log(`═══════════════════════════════════════════════════════════`);

    for (const url of batchUrls) {
      try {
        console.log(`\n  Processing: ${url.substring(0, 70)}...`);

        // Determine if direct image or page
        const isDirectImage = url.includes("cdn.dribbble.com");
        let imageUrl = url;

        if (!isDirectImage) {
          // Fetch the Dribbble page to extract image URL
          console.log(`    → Fetching page...`);
          const pageResponse = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          if (!pageResponse.ok) {
            console.log(`    ✗ Failed to fetch page: ${pageResponse.status}`);
            failedUrls.push({ url, reason: `HTTP ${pageResponse.status}` });
            totalFailed++;
            continue;
          }

          const html = await pageResponse.text();
          const extractedUrl = extractDribbbleImageUrl(html);

          if (!extractedUrl) {
            console.log(`    ✗ No image found on page`);
            failedUrls.push({ url, reason: "No image found" });
            totalFailed++;
            continue;
          }

          imageUrl = extractedUrl;
          console.log(`    → Found image: ${imageUrl.substring(0, 60)}...`);
        }

        // Fetch the image
        console.log(`    → Downloading image...`);
        const imageResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        });

        if (!imageResponse.ok) {
          console.log(`    ✗ Failed to download image: ${imageResponse.status}`);
          failedUrls.push({ url, reason: `Image download failed: ${imageResponse.status}` });
          totalFailed++;
          continue;
        }

        const contentType = imageResponse.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          console.log(`    ✗ Not an image: ${contentType}`);
          failedUrls.push({ url, reason: `Not an image: ${contentType}` });
          totalFailed++;
          continue;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Check size
        if (imageBuffer.length > 10 * 1024 * 1024) {
          console.log(`    ✗ Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(1)}MB`);
          failedUrls.push({ url, reason: "Image too large (>10MB)" });
          totalFailed++;
          continue;
        }

        // Optimize image
        console.log(`    → Optimizing image...`);
        const variants = await optimizeImage(imageBuffer);

        // Classify with AI
        console.log(`    → Classifying with AI...`);
        const base64ForAI = variants.full.buffer.toString("base64");
        const classification = await classifyBrandImage(base64ForAI, "image/webp");

        // Check for duplicate by name
        if (existingNames.has(classification.name.toLowerCase())) {
          console.log(`    ⚠ Duplicate name: "${classification.name}" - skipping`);
          totalSkipped++;
          continue;
        }

        // Upload to Supabase
        console.log(`    → Uploading to storage...`);
        const timestamp = Date.now();
        const cleanName = classification.name.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 50);
        const folderPath = `${timestamp}-${cleanName}`;

        // Upload all variants
        for (const [variantName, variant] of Object.entries(variants)) {
          const path = `${folderPath}/${variantName}.webp`;
          const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, (variant as { buffer: Buffer }).buffer, {
              contentType: "image/webp",
              upsert: false,
            });

          if (error) {
            // Try creating bucket if it doesn't exist
            if (error.message.includes("not found")) {
              await supabase.storage.createBucket(BUCKET_NAME, { public: true });
              await supabase.storage
                .from(BUCKET_NAME)
                .upload(path, (variant as { buffer: Buffer }).buffer, {
                  contentType: "image/webp",
                  upsert: false,
                });
            } else if (!error.message.includes("already exists")) {
              throw error;
            }
          }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${folderPath}/full.webp`);

        const finalImageUrl = urlData.publicUrl;

        // Insert into database
        console.log(`    → Saving to database...`);
        await db.insert(brandReferences).values({
          name: classification.name,
          description: classification.description,
          imageUrl: finalImageUrl,
          toneBucket: classification.toneBucket,
          energyBucket: classification.energyBucket,
          densityBucket: classification.densityBucket,
          colorBucket: classification.colorBucket,
          colorSamples: classification.colorSamples,
          isActive: true,
        });

        // Add to existing names to prevent duplicates within this run
        existingNames.add(classification.name.toLowerCase());

        console.log(`    ✓ Imported: "${classification.name}" (${classification.toneBucket}/${classification.energyBucket})`);
        totalSuccess++;

        // Small delay between items
        await delay(1000);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`    ✗ Error: ${errorMsg.substring(0, 100)}`);
        failedUrls.push({ url, reason: errorMsg });
        totalFailed++;
      }
    }

    // Delay between batches
    if (batchIndex < totalBatches - 1) {
      console.log(`\n  Waiting 3 seconds before next batch...`);
      await delay(3000);
    }
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

  // Check final count
  const finalCount = await db
    .select({ id: brandReferences.id })
    .from(brandReferences);

  console.log(`\n📊 Final database count: ${finalCount.length} brand references`);

  // Show profile URLs for manual handling
  if (PROFILE_URLS.length > 0) {
    console.log("\n⚠️  Profile URLs need manual handling via admin UI:");
    for (const profile of PROFILE_URLS) {
      console.log(`   ${profile}`);
    }
  }

  // Show failed URLs
  if (failedUrls.length > 0) {
    console.log("\n❌ Failed URLs:");
    for (const failed of failedUrls) {
      console.log(`   ${failed.url}`);
      console.log(`      Reason: ${failed.reason}`);
    }
  }
}

// Run the script
importBrandReferences()
  .catch(console.error)
  .finally(() => process.exit());
