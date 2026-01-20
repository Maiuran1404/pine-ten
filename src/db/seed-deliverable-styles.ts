import * as dotenv from "dotenv";

// Load environment variables first
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// Sample deliverable style references for testing brand-aware scoring
const deliverableStyleData = [
  // Instagram Post Styles
  {
    name: "Clean Grid",
    description: "Minimal layout with clean typography and plenty of whitespace",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "minimal",
    subStyle: null,
    semanticTags: ["clean", "simple", "whitespace", "modern", "elegant", "professional"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Bold Statement",
    description: "High contrast colors with impactful typography",
    imageUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "bold",
    subStyle: null,
    semanticTags: ["bold", "colorful", "contrast", "impactful", "energetic", "attention-grabbing"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Magazine Style",
    description: "Editorial layout inspired by print magazines",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "editorial",
    subStyle: null,
    semanticTags: ["editorial", "magazine", "sophisticated", "content-rich", "layout", "professional"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Business Professional",
    description: "Corporate-friendly design with trust-building elements",
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "corporate",
    subStyle: null,
    semanticTags: ["corporate", "professional", "business", "trustworthy", "b2b", "enterprise"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Fun & Colorful",
    description: "Vibrant colors with playful elements and illustrations",
    imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "playful",
    subStyle: null,
    semanticTags: ["playful", "fun", "colorful", "energetic", "creative", "friendly"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Luxury Aesthetic",
    description: "Premium feel with elegant typography and refined details",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "premium",
    subStyle: null,
    semanticTags: ["luxury", "premium", "elegant", "sophisticated", "high-end", "refined"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Natural & Organic",
    description: "Earthy tones with natural textures and flowing shapes",
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "organic",
    subStyle: null,
    semanticTags: ["organic", "natural", "earthy", "wellness", "sustainable", "eco-friendly"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Tech Forward",
    description: "Modern digital aesthetic with gradients and geometric shapes",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "tech",
    subStyle: null,
    semanticTags: ["tech", "digital", "modern", "futuristic", "gradient", "startup"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  // Additional minimal styles for variety
  {
    name: "Scandinavian Minimal",
    description: "Nordic-inspired simplicity with muted tones",
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "minimal",
    subStyle: "scandinavian",
    semanticTags: ["minimal", "nordic", "clean", "simple", "muted", "calm"],
    featuredOrder: 1,
    displayOrder: 1,
  },
  {
    name: "Japanese Minimal",
    description: "Zen-inspired design with intentional empty space",
    imageUrl: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
    deliverableType: "instagram_post",
    styleAxis: "minimal",
    subStyle: "japanese",
    semanticTags: ["minimal", "zen", "japanese", "clean", "peaceful", "intentional"],
    featuredOrder: 1,
    displayOrder: 2,
  },
  // LinkedIn Post Styles
  {
    name: "Professional Minimal",
    description: "Clean business design with clear hierarchy",
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "minimal",
    subStyle: null,
    semanticTags: ["professional", "minimal", "business", "clean", "corporate", "b2b"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Thought Leadership",
    description: "Bold statements with professional credibility",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "bold",
    subStyle: null,
    semanticTags: ["bold", "leadership", "professional", "impactful", "authority", "expert"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Enterprise Corporate",
    description: "Trustworthy corporate design for B2B audiences",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "corporate",
    subStyle: null,
    semanticTags: ["corporate", "enterprise", "b2b", "trustworthy", "professional", "business"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Tech Industry",
    description: "Modern tech company aesthetic with gradients",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "tech",
    subStyle: null,
    semanticTags: ["tech", "saas", "startup", "modern", "digital", "innovation"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Executive Premium",
    description: "High-end professional look for C-suite content",
    imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "premium",
    subStyle: null,
    semanticTags: ["premium", "executive", "luxury", "professional", "high-end", "sophisticated"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Editorial Business",
    description: "Magazine-style layouts for long-form content",
    imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "editorial",
    subStyle: null,
    semanticTags: ["editorial", "business", "content", "article", "professional", "magazine"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Team Culture",
    description: "Warm, approachable design for company culture posts",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "organic",
    subStyle: null,
    semanticTags: ["culture", "team", "warm", "approachable", "friendly", "human"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Fun Professional",
    description: "Engaging design that's still business-appropriate",
    imageUrl: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&q=80",
    deliverableType: "linkedin_post",
    styleAxis: "playful",
    subStyle: null,
    semanticTags: ["playful", "professional", "engaging", "creative", "friendly", "approachable"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  // Logo Design Styles
  {
    name: "Clean Wordmark",
    description: "Minimal typography-focused logo with clean lines",
    imageUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "minimal",
    subStyle: "wordmark",
    semanticTags: ["minimal", "wordmark", "typography", "clean", "professional", "modern"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Bold Monogram",
    description: "Strong lettermark with impactful presence",
    imageUrl: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "bold",
    subStyle: "monogram",
    semanticTags: ["bold", "monogram", "lettermark", "strong", "impactful", "memorable"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Corporate Emblem",
    description: "Professional badge-style logo for established businesses",
    imageUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "corporate",
    subStyle: "emblem",
    semanticTags: ["corporate", "emblem", "badge", "professional", "trustworthy", "established"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Playful Mascot",
    description: "Fun character-based logo with personality",
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "playful",
    subStyle: "mascot",
    semanticTags: ["playful", "mascot", "character", "fun", "friendly", "approachable"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Luxury Crest",
    description: "Premium heraldic-inspired logo with refined details",
    imageUrl: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "premium",
    subStyle: "crest",
    semanticTags: ["premium", "luxury", "crest", "elegant", "sophisticated", "high-end"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Organic Hand-drawn",
    description: "Natural, artisanal logo with hand-crafted feel",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "organic",
    subStyle: "handdrawn",
    semanticTags: ["organic", "handdrawn", "artisanal", "natural", "craft", "authentic"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Tech Symbol",
    description: "Modern geometric mark for tech companies",
    imageUrl: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "tech",
    subStyle: "symbol",
    semanticTags: ["tech", "symbol", "geometric", "modern", "digital", "innovative"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Editorial Signature",
    description: "Sophisticated script-based logo with editorial flair",
    imageUrl: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&q=80",
    deliverableType: "logo",
    styleAxis: "editorial",
    subStyle: "signature",
    semanticTags: ["editorial", "signature", "script", "elegant", "sophisticated", "refined"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  // Brand Identity Styles
  {
    name: "Minimal Brand System",
    description: "Clean, cohesive identity with restrained color palette",
    imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "minimal",
    subStyle: null,
    semanticTags: ["minimal", "clean", "cohesive", "system", "simple", "modern"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Bold Brand Expression",
    description: "High-impact identity with striking colors and typography",
    imageUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "bold",
    subStyle: null,
    semanticTags: ["bold", "impactful", "striking", "colorful", "energetic", "memorable"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Corporate Brand Kit",
    description: "Professional identity system for B2B companies",
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "corporate",
    subStyle: null,
    semanticTags: ["corporate", "professional", "b2b", "trustworthy", "business", "enterprise"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Playful Brand World",
    description: "Fun, creative identity with illustrations and patterns",
    imageUrl: "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "playful",
    subStyle: null,
    semanticTags: ["playful", "creative", "fun", "illustrated", "colorful", "friendly"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Premium Brand Suite",
    description: "Luxury identity with refined details and premium materials",
    imageUrl: "https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "premium",
    subStyle: null,
    semanticTags: ["premium", "luxury", "refined", "elegant", "high-end", "sophisticated"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Organic Brand Language",
    description: "Natural, sustainable brand identity with earthy textures",
    imageUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "organic",
    subStyle: null,
    semanticTags: ["organic", "natural", "sustainable", "earthy", "eco-friendly", "authentic"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Tech Brand System",
    description: "Modern digital-first identity for tech startups",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "tech",
    subStyle: null,
    semanticTags: ["tech", "digital", "startup", "modern", "innovative", "saas"],
    featuredOrder: 0,
    displayOrder: 0,
  },
  {
    name: "Editorial Brand Identity",
    description: "Magazine-inspired identity with strong typography",
    imageUrl: "https://images.unsplash.com/photo-1586339949216-35c2747cc36d?w=800&q=80",
    deliverableType: "brand_identity",
    styleAxis: "editorial",
    subStyle: null,
    semanticTags: ["editorial", "magazine", "typography", "sophisticated", "content", "publishing"],
    featuredOrder: 0,
    displayOrder: 0,
  },
];

async function seedDeliverableStyles() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("./index");
  const { deliverableStyleReferences } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  console.log("Seeding deliverable style references (APPEND mode)...");

  // Check existing count
  const existing = await db.select().from(deliverableStyleReferences);
  console.log(`Found ${existing.length} existing deliverable styles`);

  // Get existing names to avoid duplicates
  const existingNames = new Set(existing.map(e => e.name.toLowerCase()));

  // Insert only new styles (don't delete existing!)
  let insertedCount = 0;
  let skippedCount = 0;

  for (const style of deliverableStyleData) {
    if (existingNames.has(style.name.toLowerCase())) {
      console.log(`Skipped (exists): ${style.name}`);
      skippedCount++;
      continue;
    }

    await db.insert(deliverableStyleReferences).values(style);
    console.log(`Inserted: ${style.name} (${style.deliverableType}/${style.styleAxis})`);
    insertedCount++;
  }

  console.log(`\nSeeded ${insertedCount} new styles (skipped ${skippedCount} existing)`);
  console.log(`Total styles in database: ${existing.length + insertedCount}`);
  process.exit(0);
}

seedDeliverableStyles().catch((error) => {
  console.error("Error seeding deliverable styles:", error);
  process.exit(1);
});
