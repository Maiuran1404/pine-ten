import Firecrawl from "@mendable/firecrawl-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY || "",
});

async function testFirecrawl(url: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing URL: ${url}`);
  console.log("=".repeat(60));

  try {
    const result = await firecrawl.scrape(url, {
      formats: ["branding"],
      onlyMainContent: false,
    });

    console.log("\n--- RAW BRANDING RESPONSE ---");
    console.log(JSON.stringify(result.branding, null, 2));

    if (result.branding?.colors) {
      console.log("\n--- COLOR KEYS AND VALUES ---");
      Object.entries(result.branding.colors).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    if (result.metadata) {
      console.log("\n--- METADATA ---");
      console.log(JSON.stringify(result.metadata, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Test with a few different sites
const testUrls = process.argv.slice(2);

if (testUrls.length === 0) {
  console.log("Usage: npx tsx scripts/test-firecrawl.ts <url1> [url2] ...");
  console.log("Example: npx tsx scripts/test-firecrawl.ts stripe.com anthropic.com");
  process.exit(1);
}

async function main() {
  for (const url of testUrls) {
    await testFirecrawl(url.startsWith("http") ? url : `https://${url}`);
  }
}

main();
