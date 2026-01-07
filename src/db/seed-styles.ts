import { db } from "./index";
import { styleReferences } from "./schema";

const styleData = [
  // Static Ads Styles
  {
    category: "static_ads",
    name: "Minimalist",
    description: "Clean lines, ample white space, and simple typography. Less is more.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    tags: ["clean", "simple", "modern", "elegant"],
  },
  {
    category: "static_ads",
    name: "Bold & Vibrant",
    description: "Eye-catching colors, strong contrasts, and dynamic compositions.",
    imageUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80",
    tags: ["colorful", "energetic", "bold", "striking"],
  },
  {
    category: "static_ads",
    name: "Retro & Vintage",
    description: "Nostalgic aesthetics with classic typography and muted color palettes.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    tags: ["retro", "vintage", "classic", "nostalgic"],
  },
  {
    category: "static_ads",
    name: "Luxury & Premium",
    description: "Sophisticated elegance with gold accents, dark tones, and refined details.",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
    tags: ["luxury", "premium", "elegant", "sophisticated"],
  },
  {
    category: "static_ads",
    name: "Playful & Fun",
    description: "Bright colors, quirky illustrations, and energetic compositions.",
    imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80",
    tags: ["playful", "fun", "colorful", "creative"],
  },

  // Video/Motion Styles
  {
    category: "video_motion",
    name: "Cinematic",
    description: "Film-quality visuals with dramatic lighting and professional color grading.",
    imageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    tags: ["cinematic", "dramatic", "film", "professional"],
  },
  {
    category: "video_motion",
    name: "Motion Graphics",
    description: "Animated text, shapes, and icons with smooth transitions.",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    tags: ["motion", "animated", "dynamic", "modern"],
  },
  {
    category: "video_motion",
    name: "Stop Motion",
    description: "Frame-by-frame animation with handcrafted, tactile aesthetics.",
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
    tags: ["stop-motion", "handmade", "creative", "unique"],
  },
  {
    category: "video_motion",
    name: "Fast-Paced",
    description: "Quick cuts, energetic music, and high-impact visuals.",
    imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80",
    tags: ["fast", "energetic", "dynamic", "impactful"],
  },
  {
    category: "video_motion",
    name: "Documentary",
    description: "Authentic, story-driven content with natural lighting and real moments.",
    imageUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800&q=80",
    tags: ["documentary", "authentic", "storytelling", "natural"],
  },

  // Social Media Styles
  {
    category: "social_media",
    name: "Instagram Aesthetic",
    description: "Cohesive grid, curated colors, and lifestyle-focused imagery.",
    imageUrl: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80",
    tags: ["instagram", "aesthetic", "lifestyle", "cohesive"],
  },
  {
    category: "social_media",
    name: "TikTok Native",
    description: "Vertical format, trending sounds, and authentic Gen-Z appeal.",
    imageUrl: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80",
    tags: ["tiktok", "vertical", "trending", "authentic"],
  },
  {
    category: "social_media",
    name: "Meme Culture",
    description: "Relatable humor, internet culture references, and shareable content.",
    imageUrl: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=800&q=80",
    tags: ["meme", "funny", "viral", "relatable"],
  },
  {
    category: "social_media",
    name: "Professional/LinkedIn",
    description: "Corporate-friendly, thought leadership, and business-focused.",
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
    tags: ["professional", "corporate", "linkedin", "business"],
  },
  {
    category: "social_media",
    name: "User-Generated Style",
    description: "Raw, authentic content that feels real and unpolished.",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    tags: ["ugc", "authentic", "raw", "real"],
  },

  // UI/UX Styles
  {
    category: "ui_ux",
    name: "Glassmorphism",
    description: "Frosted glass effects, transparency, and soft shadows.",
    imageUrl: "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800&q=80",
    tags: ["glass", "transparent", "modern", "sleek"],
  },
  {
    category: "ui_ux",
    name: "Neumorphism",
    description: "Soft UI with subtle shadows creating 3D depth on flat surfaces.",
    imageUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80",
    tags: ["neumorphic", "soft", "3d", "subtle"],
  },
  {
    category: "ui_ux",
    name: "Dark Mode First",
    description: "Designed for dark interfaces with accent colors and high contrast.",
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    tags: ["dark", "modern", "contrast", "sleek"],
  },
  {
    category: "ui_ux",
    name: "Brutalist",
    description: "Raw, bold, and intentionally rough with unconventional layouts.",
    imageUrl: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=800&q=80",
    tags: ["brutalist", "raw", "bold", "unconventional"],
  },
  {
    category: "ui_ux",
    name: "Skeuomorphic",
    description: "Realistic textures and shadows mimicking real-world objects.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    tags: ["skeuomorphic", "realistic", "textured", "classic"],
  },
];

async function seedStyles() {
  console.log("Seeding style references...");

  // Clear existing styles
  await db.delete(styleReferences);
  console.log("Cleared existing styles");

  // Insert new styles
  for (const style of styleData) {
    await db.insert(styleReferences).values(style);
    console.log(`Inserted: ${style.name} (${style.category})`);
  }

  console.log(`\nSeeded ${styleData.length} style references successfully!`);
  process.exit(0);
}

seedStyles().catch((error) => {
  console.error("Error seeding styles:", error);
  process.exit(1);
});
