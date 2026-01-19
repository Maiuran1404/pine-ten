import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// All direct CDN image URLs - scraped from Dribbble using Playwright
// Last URL processed: https://dribbble.com/shots/26169395-Static-Ad-Design-Performance-AD-Design
const CDN_IMAGE_URLS = [
  // Batch 1 (10 URLs) - Instagram/Social Media Content
  "https://cdn.dribbble.com/userupload/45056882/file/e848051edd3784799bfa649cdd189a7e.png?crop=34x84-598x507&resize=400x300",
  "https://cdn.dribbble.com/userupload/13823905/file/still-972cba3bd88b8875e218915781d2edcf.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/27539530/file/original-b8801c44fdba2c0a9690b1b09286f431.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/2544893/file/original-a78a5157e950854f88fe7eb3543d64dd.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/17130098/file/original-97a1705e015412335d68505bb34318e3.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/18423937/file/still-3fb67a49ab7a5ef2c5010678beff955f.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46311212/file/4aab38098fbfeef99680c26507d271ff.png?crop=253x0-1693x1080&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/5402454/file/original-eb624b2583e5bd6e2902a1da21582011.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/8076268/file/original-f0a86ceeee021ed78dd45dd57aa990e5.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/4169911/file/original-ca5c37015eacd315792c918f362f9267.png?resize=1600x1200",
  // Batch 2 (10 URLs) - Social Media Packs & Ads
  "https://cdn.dribbble.com/userupload/18321586/file/still-680df70554fb581a5c5a103106f2765a.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/12662470/file/still-8488552dc5ac9e157c3a16af7a373d4b.gif?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46380364/file/still-0128b4009a68efb59fb3b6c8e38c6b7e.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/4166808/file/original-68a7c537c8c69071b732199e3a2d9d06.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/6098543/file/original-3161b94092c515d867a532e11ba51a5c.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/18339938/file/still-65f0418e283905824112a9b08095fd2e.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45887300/file/92c958fa4bea2658ccd48c634a75369c.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45593469/file/81fa0d8441cff17f756773daea6e7ded.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/26321685/file/original-1890c32dbf17993d1238555409a773f0.png?resize=1500x1020",
  "https://cdn.dribbble.com/userupload/46351621/file/6d565e1f81e01b41b069fa90a67cd648.png?resize=1600x1200",
  // Batch 3 (10 URLs) - Instagram Stories & Templates
  "https://cdn.dribbble.com/userupload/45994614/file/still-9bf4a81c730675fb92db2378526a296b.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/9768943/file/original-bf82406abc0dd8735519868230bf3585.jpg?resize=1160x773",
  "https://cdn.dribbble.com/userupload/9606313/file/original-abb6aaa140ff2909080c1c7228622dc5.jpg?resize=1170x780",
  "https://cdn.dribbble.com/userupload/44363563/file/a98b7b85d8a947deb7ce1151c3cfe07e.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/23956087/file/original-9226a8bb231d1153d9d08e89b2416590.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/2955245/file/original-4d6d0f0af0756f2f11785f4801ad469c.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45741582/file/8ef5e9587e1f6cd2a6426813e0cf250c.jpg?resize=800x600",
  "https://cdn.dribbble.com/userupload/45220938/file/5cf110ff486af1ea8cf7d455ccef9cc9.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43140382/file/original-2efa25d8a01709d065027b1409f0d354.jpg?crop=129x0-2209x1560&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43514258/file/original-b6a9b165c4564b0544be447a7e27b0da.jpg?crop=169x30-2169x1530&resize=1600x1200",
  // Batch 4 (10 URLs) - Instagram Templates & Social Media Ads
  "https://cdn.dribbble.com/userupload/43148224/file/original-cec66b0161b3443245bf816ca32a4406.jpg?crop=147x0-2227x1560&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43495318/file/original-0f1996b41d01e4599c041b79e37c3f26.jpg?crop=159x0-2238x1560&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/6701332/file/original-c6039fe3cf41d3f0cf4ce5fbda6a2b0f.jpg?resize=1370x913",
  "https://cdn.dribbble.com/userupload/45315967/file/a03fded272ad67d2215137e3d72802fb.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43269749/file/original-6dc86066b62f05a5ef46f9eaee68d241.png?resize=1450x1084",
  "https://cdn.dribbble.com/userupload/8607492/file/original-ebd1b898a8dba40a33f00eb50f0bb834.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/17388745/file/original-3f4182de0f12149e9d4c8faadab005da.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44555617/file/3eee129d86713d5d8f85f4604f8764de.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45998679/file/22093d3246b5efc33ab410e1b30abfa7.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/7410439/file/original-0cb032f65ee64e3e7e89654a6cee533f.png?resize=1600x1200",
  // Batch 5 (10 URLs) - Social Media Ads
  "https://cdn.dribbble.com/userupload/6739186/file/original-3af24e5d1a81dc7f347b332152ef4409.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44360879/file/6284463f442966a7f34412a9490183d1.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/15860026/file/original-fac07060f80cdd2bd3f7a207058045f7.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/7881851/file/original-04f166b9ab3c3997d1d2982ae223810d.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44571422/file/a8c61432e168bb5b146f58b102b1761c.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44682550/file/6cdb2f90ef4d5ad6e36b055ecb071fb0.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44627518/file/6b1a5b76214a73cb46388aa7170de578.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43269728/file/original-4da0c65f2e774aa7824b678d17f7b206.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/5417336/file/original-8e244c13b0c09bfd118326765b7e507f.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/18191614/file/original-6dd5275426758e25155307f677c37332.jpg?resize=1600x1200",
  // Batch 6 (10 URLs) - Social Media Ads & Banners
  "https://cdn.dribbble.com/userupload/14981218/file/still-6c54c930241b66f0b142aa34866e825c.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44626791/file/7322f11f68129b36d90a2eb362efcda8.jpg?resize=1111x869",
  "https://cdn.dribbble.com/userupload/42655120/file/original-417162715ce82791d107d839fc6ec358.png?crop=0x249-1950x1712&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/4145642/file/original-2bbc75f472edf5d5cf8812621b9be993.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46270999/file/033bc47a636adcbc207b65db1cb7f301.png?crop=0x0-2800x2100&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/41538793/file/original-3a609d0d46a816db6a6289faab725fba.jpg?crop=86x391-958x1046&resize=1025x1320",
  "https://cdn.dribbble.com/userupload/14584407/file/original-29cfe588d8948dede5c48f43eea84b5b.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43765371/file/original-ef6f05b93e876ad5b8c2268134275232.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/18159731/file/original-3eeb51fcd27d72d181bb25cc50f720d4.jpeg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/15957611/file/original-b06121cd23470f31cfb90f0df3f43c32.png?resize=1600x1200",
  // Batch 7 (10 URLs) - Meta Ads
  "https://cdn.dribbble.com/userupload/45230347/file/4c853fa570e90efb11f255d838b7b7b7.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/41977187/file/original-9adac54edd939dfecf664a9137b2b53c.jpg?resize=800x600",
  "https://cdn.dribbble.com/userupload/44044625/file/original-c9b30dc7915c6bf34bcab2b6a1e986bf.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/41548519/file/original-4dce3c36ba3503a737d41dd936f57ffa.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/3277480/file/still-e5310c8a00df08b38c799ce330565ad5.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/45989155/file/ce6daef0e44d67c8c32e2fbdffe47ffb.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46318139/file/073196c54eb79ae1ac313cf7c681ae92.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46000267/file/3e6bc1fcd5dd460138b74189cc34c53c.png?crop=0x33-1080x843&resize=1080x1080",
  "https://cdn.dribbble.com/userupload/44448797/file/2d765e1dab93d6e36fe29b6c5bdc9718.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/40630325/file/original-76239ec87cf7bfe5f8090bb439806e9f.png?resize=1600x1200",
  // Batch 8 (10 URLs) - Meta Ads
  "https://cdn.dribbble.com/userupload/12740989/file/original-5da17d3a0c4ced563a396005a4c47378.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44974562/file/039b4f05eff0dac23e03eb258fa187ec.png?crop=0x0-1600x1200&resize=1600x1200",
  "https://cdn.dribbble.com/userupload/14830168/file/still-25d211687348464418d281174524234f.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/46036598/file/0c3da4e2845d5a9bbeaeb8c3bdf0f193.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43119443/file/original-492e595f78c293d90ad3bf3a0620c740.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/44430836/file/9c639cc1f84e034d043ebd9f0a78a4d9.jpg?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/42537117/file/original-b0d49b9a766a6a17017da91975f91d0f.png?resize=1200x1200",
  "https://cdn.dribbble.com/userupload/16793319/file/original-acc543e3cd6f6e14ac334b432834ae97.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/14137241/file/original-14e83b373a3fb4090df4356da66ec441.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/14114603/file/still-a1c163f69a95420cf6bcf399b12ffa1f.png?resize=1600x1200",
  // Batch 9 (3 URLs) - Static/Performance Ads
  "https://cdn.dribbble.com/userupload/43778535/file/original-93b466137a588d804ae1adc951bc1ed2.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43765449/file/original-3cce668be5ddf9498815b5c0ed235266.png?resize=1600x1200",
  "https://cdn.dribbble.com/userupload/43765254/file/original-3eae29b35815bd56ec8bfa06eb3e0e32.png?resize=1600x1200",
];

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deliverable type detection from image analysis
function inferDeliverableType(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();

  if (text.includes("story") || text.includes("stories")) return "instagram_story";
  if (text.includes("reel")) return "instagram_reel";
  if (text.includes("linkedin")) return "linkedin_post";
  if (text.includes("facebook") || text.includes("fb ad")) return "facebook_ad";
  if (text.includes("twitter") || text.includes("tweet")) return "twitter_post";
  if (text.includes("youtube") || text.includes("thumbnail")) return "youtube_thumbnail";
  if (text.includes("email")) return "email_header";
  if (text.includes("presentation") || text.includes("slide") || text.includes("pitch deck")) return "presentation_slide";
  if (text.includes("banner") || text.includes("web banner")) return "web_banner";
  if (text.includes("video ad") || text.includes("video")) return "video_ad";
  if (text.includes("meta ad") || text.includes("static ad") || text.includes("performance ad")) return "static_ad";
  if (text.includes("instagram") || text.includes("insta") || text.includes("social media")) return "instagram_post";

  return "static_ad"; // default for social media ads
}

// Style axis detection
function inferStyleAxis(name: string, description: string, colorSamples: string[]): string {
  const text = `${name} ${description}`.toLowerCase();

  if (text.includes("minimal") || text.includes("clean") || text.includes("simple")) return "minimal";
  if (text.includes("bold") || text.includes("vibrant") || text.includes("colorful")) return "bold";
  if (text.includes("editorial") || text.includes("magazine")) return "editorial";
  if (text.includes("corporate") || text.includes("professional") || text.includes("business")) return "corporate";
  if (text.includes("playful") || text.includes("fun") || text.includes("creative")) return "playful";
  if (text.includes("premium") || text.includes("luxury") || text.includes("elegant")) return "premium";
  if (text.includes("organic") || text.includes("natural")) return "organic";
  if (text.includes("tech") || text.includes("saas") || text.includes("software") || text.includes("ai")) return "tech";

  // Infer from colors if no text match
  if (colorSamples.length > 0) {
    const hasNeutral = colorSamples.some(c => {
      const hex = c.replace("#", "").toLowerCase();
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
    });
    if (hasNeutral) return "minimal";
  }

  return "bold"; // default
}

async function importDeliverableReferences() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║       DELIVERABLE STYLE REFERENCES IMPORT SCRIPT              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");

  // Dynamic imports
  const { db } = await import("../src/db");
  const { deliverableStyleReferences } = await import("../src/db/schema");
  const { classifyBrandImage } = await import("../src/lib/ai/classify-brand-image");
  const { optimizeImage } = await import("../src/lib/image/optimize");
  const { createClient } = await import("@supabase/supabase-js");

  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const BUCKET_NAME = "deliverable-references";

  console.log(`Total CDN image URLs to process: ${CDN_IMAGE_URLS.length}`);
  console.log("");

  // Step 1: Get existing references to check for duplicates
  console.log("Step 1: Checking existing deliverable style references...");
  const existingRefs = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      imageUrl: deliverableStyleReferences.imageUrl,
    })
    .from(deliverableStyleReferences);

  console.log(`Found ${existingRefs.length} existing references in database`);

  // Create set of existing names (lowercased) for deduplication
  const existingNames = new Set(existingRefs.map((r) => r.name.toLowerCase()));
  // Also track image URLs to prevent duplicates
  const existingImageUrls = new Set(
    existingRefs.map((r) => {
      // Extract the userupload ID from the URL for comparison
      const match = r.imageUrl.match(/userupload\/(\d+)/);
      return match ? match[1] : r.imageUrl;
    })
  );

  // Step 2: Process URLs in batches
  const BATCH_SIZE = 5;
  const totalBatches = Math.ceil(CDN_IMAGE_URLS.length / BATCH_SIZE);

  console.log(
    `\nStep 2: Processing in ${totalBatches} batches of ${BATCH_SIZE}...\n`
  );

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
          console.log(
            `    ⚠ Already imported (image ID: ${uploadIdMatch[1]}) - skipping`
          );
          totalSkipped++;
          continue;
        }

        // Fetch the image
        console.log(`    → Downloading image...`);
        const imageResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        });

        if (!imageResponse.ok) {
          console.log(
            `    ✗ Failed to download image: ${imageResponse.status}`
          );
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
          console.log(
            `    ✗ Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(1)}MB`
          );
          failedUrls.push({ url: imageUrl, reason: "Image too large (>10MB)" });
          totalFailed++;
          continue;
        }

        // Optimize image
        console.log(`    → Optimizing image...`);
        const variants = await optimizeImage(imageBuffer);

        // Classify with AI (reusing brand image classifier)
        console.log(`    → Classifying with AI...`);
        const base64ForAI = variants.full.buffer.toString("base64");
        const classification = await classifyBrandImage(base64ForAI, "image/webp");

        // Check for duplicate by name
        if (existingNames.has(classification.name.toLowerCase())) {
          console.log(`    ⚠ Duplicate name: "${classification.name}" - skipping`);
          totalSkipped++;
          continue;
        }

        // Infer deliverable type and style axis
        const deliverableType = inferDeliverableType(
          classification.name,
          classification.description
        );
        const styleAxis = inferStyleAxis(
          classification.name,
          classification.description,
          classification.colorSamples || []
        );

        // Upload to Supabase
        console.log(`    → Uploading to storage...`);
        const timestamp = Date.now();
        const cleanName = classification.name
          .replace(/[^a-zA-Z0-9-]/g, "_")
          .substring(0, 50);
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
        await db.insert(deliverableStyleReferences).values({
          name: classification.name,
          description: classification.description,
          imageUrl: finalImageUrl,
          deliverableType: deliverableType,
          styleAxis: styleAxis,
          colorTemperature: classification.colorBucket?.includes("warm")
            ? "warm"
            : classification.colorBucket?.includes("cool")
              ? "cool"
              : "neutral",
          energyLevel: classification.energyBucket || "balanced",
          densityLevel: classification.densityBucket || "balanced",
          formalityLevel: "balanced",
          colorSamples: classification.colorSamples || [],
          semanticTags: [],
          industries: [],
          visualElements: [],
          moodKeywords: [],
          isActive: true,
        });

        // Add to existing names and image URLs to prevent duplicates within this run
        existingNames.add(classification.name.toLowerCase());
        if (uploadIdMatch) {
          existingImageUrls.add(uploadIdMatch[1]);
        }

        console.log(
          `    ✓ Imported: "${classification.name}" (${deliverableType}/${styleAxis})`
        );
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
  console.log(
    `║  Total URLs processed:    ${CDN_IMAGE_URLS.length.toString().padStart(5)}                              ║`
  );
  console.log(
    `║  Successfully imported:   ${totalSuccess.toString().padStart(5)}                              ║`
  );
  console.log(
    `║  Failed:                  ${totalFailed.toString().padStart(5)}                              ║`
  );
  console.log(
    `║  Skipped (duplicates):    ${totalSkipped.toString().padStart(5)}                              ║`
  );
  console.log("╚════════════════════════════════════════════════════════════════╝");

  // Check final count
  const finalCount = await db
    .select({ id: deliverableStyleReferences.id })
    .from(deliverableStyleReferences);

  console.log(`\n📊 Final database count: ${finalCount.length} deliverable style references`);

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
importDeliverableReferences()
  .catch(console.error)
  .finally(() => process.exit());
