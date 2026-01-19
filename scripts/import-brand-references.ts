import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// All direct CDN image URLs - scraped from Dribbble using Playwright
const CDN_IMAGE_URLS = [
  // Batch 1 (5 URLs)
  "https://cdn.dribbble.com/userupload/9847977/file/original-29a12a71a46adba5bfd26132f5c696a9.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46398251/file/972868983ef1eaed4216af11c50bf835.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44627763/file/ae187367b75e860c4d0dad92690cd21f.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44418764/file/7383d026d18390e553b3e94070f9e9b5.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46016308/file/d7a13472059672c2c780628237bbacb1.jpeg?resize=1600x1200",
  // Batch 2 (10 URLs)
  "https://cdn.dribbble.com/userupload/46392804/file/still-4188259ff46abe632c1498a6f9ae2b2b.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43996165/file/original-96afd7b9db88ec1933949cedcb1d3aa7.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44033988/file/original-96bcf4a73334404c5b7fcfacbe0f22d8.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44279835/file/7f0f96cdff9119740e923d5a91e90b5f.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44203958/file/original-864a7b002a41c8e95ed63582fc2a8b95.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44018592/file/original-9fb7db760e8111d33a170c8cd8936424.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46347824/file/c31cc52dbf667cb1b81565b4c1a08702.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46319650/file/3f4bff9dbe5c8c79e8c90af991b1028f.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46306493/file/8d90b601923f38d952e34c09de51c222.png?crop=0x0-1600x1200&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44538833/file/fe305941c10ea63ce9fc7ae6968f4481.png?resize=1600x1200",
  // Batch 3 (10 URLs)
  "https://cdn.dribbble.com/userupload/19712834/file/original-98d35b25c98c2459d1cb201d04bf6504.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/18847103/file/original-6026bfdc39741968e48b958dfa582f60.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/15634143/file/original-67aea1d64c0a82fd5f4588f594fefbf4.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/15381287/file/original-01c6de41fe975e19f8965d75fe26e535.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/17083189/file/original-aa9d8179f1bd367ff4fc2dda67a9993b.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/13929906/file/original-5f64235f6e072cf54f214c58c8d230f5.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/13844959/file/original-d2bfbaea5d8b8480e4f464f3dc91bac0.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/13206083/file/original-1f3ed72b5c2b7e2e545eedbf7878fc23.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/13227299/file/original-1e5273ad7d60cf9b6d60b1808f857af2.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/13185394/file/original-fac0d5e5d4f8a821cd76aea699736342.png?resize=1600x1200",
  // Batch 4 (10 URLs)
  "https://cdn.dribbble.com/userupload/12967020/file/original-3be1edb5eee2141d024a8fd19de97087.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/12887486/file/original-416f71e7569bd1e2ebbabb71642caf59.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46403495/file/922d7b4930ab6e8442e7417e596c6004.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45962504/file/72679d6139aa00ff7228db61515e4377.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45877804/file/d6b4db9edeab08aad892d9183babf6b6.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45896914/file/90a00bc924a62cb3242509d36a0122d3.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45910274/file/070d6a60acf139d8d568d09821556659.jpg?crop=0x0-3201x2401&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45853913/file/145c60c2878eaca4f882c3c36b405a61.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/15041895/file/original-9cca0eff20f1ee1568aa58e6496809be.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45710553/file/068d0153e91b5a886d385641f65bea8c.png?resize=1600x1200",
  // Batch 5 (10 URLs)
  "https://cdn.dribbble.com/userupload/45495645/file/6c10d1b0e8f874449dbf8e5a828e945d.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45472414/file/83e3296fadfaaa0cb7a83dc0a3a79786.webp?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46352559/file/still-2943f1cfe09e49ae430f25957a854901.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46406097/file/6c7ff107082ca8babd7ec0a390356285.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45993722/file/82697521279c743bf6b62d2d9c63ca18.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/17282554/file/original-b431b4434648232d70dbdee862afd09e.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/7648933/file/original-99fd20b3240632d96768e0d78d944a45.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46405680/file/64722e9773a8ee15554aadac9264d4a6.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46396239/file/b8bfa2d50922f2d7652edf0bb4a0012b.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46408259/file/7ad687d9c3add414643240f9ccb21bf7.png?crop=712x95-3166x1936&resize=1600x1200",
  // Batch 6 (10 URLs)
  "https://cdn.dribbble.com/userupload/46402062/file/fc4184645518e8dca617f0f29c8267c6.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43865315/file/original-3703331142438ea510ed2fa4060acfd5.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45733231/file/2831ee9bf6a9d4a1083e27eedf4ec27a.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46403245/file/4f7bd93597d4f3e5f984dcc843bc93a3.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46390516/file/da27051bb199bd7a5192f3e768270417.webp?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46389618/file/bd97ba7b4caf8bfa5685faebdd4f5b68.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46391959/file/6ca01d63936c874490c3c150a5d185f7.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46381830/file/960c934d58ce5fdc0cb18d7c80225ae0.png?crop=0x0-4087x3065&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46356981/file/78f4e70fe1a6f79b6560009f3360c562.jpg?crop=0x0-3201x2401&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46326411/file/6521d1c4174180f63a1235d04a302b34.png?crop=0x0-3201x2401&resize=1600x1200",
  // Batch 7 (10 URLs)
  "https://cdn.dribbble.com/userupload/46145959/file/7d2102e5aa1c9b483ef32b2392669771.jpg?crop=0x0-3200x2400&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46145243/file/7cf21b595bf9116a4709d30a23ffcc1d.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46145150/file/b72ffdeca4a2153596dc93138c06bfe8.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45971457/file/4c60d1a9c25a0d4934767881715990f2.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/14221674/file/original-2f61f1b5af1b40667194fd67cb094d81.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46387617/file/a2e83eb9796e0284df9a033461f8b292.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46384792/file/9052b0266e27371d9e857bf4008a0284.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46394884/file/still-54e0139334a3ce2f3d2f779f47ac4657.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46402859/file/5a3e5cc30f3378e13b82e5ab009d6733.jpg?crop=0x0-3201x2401&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46382048/file/6b0d249e53f21eb500518d8cedf3ed2a.jpg?resize=1600x1200",
  // Batch 8 (11 URLs)
  "https://cdn.dribbble.com/userupload/46383037/file/1914bc6ee8d28997c35b004539dc1f8e.jpeg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46387348/file/66dd269a62307eadab15b2c6323f2016.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46395388/file/74e25d5c8942d5ed8fa651ece890d524.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/14006472/file/original-59c4e6b0a4fc4df4ce2a66660bfbd3ee.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46398096/file/a0a32e23c3fea46ff3c0456638b934a0.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46369815/file/5f7440f856c3da8e0b988854c7ca00ec.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46365225/file/0ed746703299b6831bc30a7a4e286f00.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46364167/file/f92263ac902e60aa36124ea637bfd733.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46140290/file/still-fa14c26e93cc1d0fd3b3778ae20a26e7.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/13881414/file/original-f88f82e17d82490f801b9a3c4bd2d0d5.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/17117809/file/original-1eeb3b4efcbbba99e4d45e92b71ec35e.png?resize=1600x1200",
  // Original direct URLs from the list
  "https://cdn.dribbble.com/userupload/42697800/file/original-e603a52f6c10ce38e0c6c149bbf254e0.png",
  "https://cdn.dribbble.com/userupload/42854506/file/original-8205febfb24e98a01751bb0ffb4b129a.png",
];

// Profile URLs that need manual handling via admin UI
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

  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const BUCKET_NAME = "brand-references";

  console.log(`Total CDN image URLs to process: ${CDN_IMAGE_URLS.length}`);
  console.log(`Profile URLs (manual): ${PROFILE_URLS.length}`);
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
  // Also track image URLs to prevent duplicates
  const existingImageUrls = new Set(existingRefs.map(r => {
    // Extract the userupload ID from the URL for comparison
    const match = r.imageUrl.match(/userupload\/(\d+)/);
    return match ? match[1] : r.imageUrl;
  }));

  // Step 2: Process URLs in batches
  const BATCH_SIZE = 5;
  const totalBatches = Math.ceil(CDN_IMAGE_URLS.length / BATCH_SIZE);

  console.log(`\nStep 2: Processing in ${totalBatches} batches of ${BATCH_SIZE}...\n`);

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failedUrls: { url: string; reason: string }[] = [];

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE;
    const batchUrls = CDN_IMAGE_URLS.slice(batchStart, batchStart + BATCH_SIZE);

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Batch ${batchIndex + 1}/${totalBatches}`);
    console.log(`═══════════════════════════════════════════════════════════`);

    for (const imageUrl of batchUrls) {
      try {
        console.log(`\n  Processing: ${imageUrl.substring(0, 70)}...`);

        // Check if this image was already imported (by userupload ID)
        const uploadIdMatch = imageUrl.match(/userupload\/(\d+)/);
        if (uploadIdMatch && existingImageUrls.has(uploadIdMatch[1])) {
          console.log(`    ⚠ Already imported (image ID: ${uploadIdMatch[1]}) - skipping`);
          totalSkipped++;
          continue;
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
          failedUrls.push({ url: imageUrl, reason: `HTTP ${imageResponse.status}` });
          totalFailed++;
          continue;
        }

        const contentType = imageResponse.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          console.log(`    ✗ Not an image: ${contentType}`);
          failedUrls.push({ url: imageUrl, reason: `Not an image: ${contentType}` });
          totalFailed++;
          continue;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Check size
        if (imageBuffer.length > 10 * 1024 * 1024) {
          console.log(`    ✗ Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(1)}MB`);
          failedUrls.push({ url: imageUrl, reason: "Image too large (>10MB)" });
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

        // Add to existing names and image URLs to prevent duplicates within this run
        existingNames.add(classification.name.toLowerCase());
        if (uploadIdMatch) {
          existingImageUrls.add(uploadIdMatch[1]);
        }

        console.log(`    ✓ Imported: "${classification.name}" (${classification.toneBucket}/${classification.energyBucket})`);
        totalSuccess++;

        // Small delay between items
        await delay(1000);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`    ✗ Error: ${errorMsg.substring(0, 100)}`);
        failedUrls.push({ url: imageUrl, reason: errorMsg });
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
  console.log(`║  Total URLs processed:    ${CDN_IMAGE_URLS.length.toString().padStart(5)}                              ║`);
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
      console.log(`   ${failed.url.substring(0, 70)}...`);
      console.log(`      Reason: ${failed.reason}`);
    }
  }
}

// Run the script
importBrandReferences()
  .catch(console.error)
  .finally(() => process.exit());
