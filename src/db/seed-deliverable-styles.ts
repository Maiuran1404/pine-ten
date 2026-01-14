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
];

async function seedDeliverableStyles() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("./index");
  const { deliverableStyleReferences } = await import("./schema");

  console.log("Seeding deliverable style references...");

  // Check existing count
  const existing = await db.select().from(deliverableStyleReferences);
  console.log(`Found ${existing.length} existing deliverable styles`);

  if (existing.length > 0) {
    console.log("Clearing existing deliverable styles...");
    await db.delete(deliverableStyleReferences);
  }

  // Insert new styles
  for (const style of deliverableStyleData) {
    await db.insert(deliverableStyleReferences).values(style);
    console.log(`Inserted: ${style.name} (${style.deliverableType}/${style.styleAxis})`);
  }

  console.log(`\nSeeded ${deliverableStyleData.length} deliverable style references successfully!`);
  process.exit(0);
}

seedDeliverableStyles().catch((error) => {
  console.error("Error seeding deliverable styles:", error);
  process.exit(1);
});
