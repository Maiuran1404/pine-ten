import { db } from "./index";
import { skills } from "./schema";
import { sql } from "drizzle-orm";

// Comprehensive skills taxonomy for design/creative work
const skillsData = [
  // Design Software
  {
    name: "Figma",
    slug: "figma",
    category: "design_software",
    description: "UI/UX design and prototyping tool",
  },
  {
    name: "Adobe Photoshop",
    slug: "photoshop",
    category: "design_software",
    description: "Photo editing and raster graphics",
  },
  {
    name: "Adobe Illustrator",
    slug: "illustrator",
    category: "design_software",
    description: "Vector graphics and illustration",
  },
  {
    name: "Adobe InDesign",
    slug: "indesign",
    category: "design_software",
    description: "Print and digital publishing layout",
  },
  {
    name: "Sketch",
    slug: "sketch",
    category: "design_software",
    description: "UI/UX design tool for Mac",
  },
  {
    name: "Canva",
    slug: "canva",
    category: "design_software",
    description: "Quick design and social media graphics",
  },
  {
    name: "Adobe XD",
    slug: "adobe-xd",
    category: "design_software",
    description: "UI/UX design and prototyping",
  },

  // Video Software
  {
    name: "Adobe After Effects",
    slug: "after-effects",
    category: "video_software",
    description: "Motion graphics and visual effects",
  },
  {
    name: "Adobe Premiere Pro",
    slug: "premiere-pro",
    category: "video_software",
    description: "Professional video editing",
  },
  {
    name: "DaVinci Resolve",
    slug: "davinci-resolve",
    category: "video_software",
    description: "Color grading and video editing",
  },
  {
    name: "Final Cut Pro",
    slug: "final-cut-pro",
    category: "video_software",
    description: "Professional video editing for Mac",
  },
  {
    name: "CapCut",
    slug: "capcut",
    category: "video_software",
    description: "Short-form video editing",
  },
  {
    name: "Cinema 4D",
    slug: "cinema-4d",
    category: "video_software",
    description: "3D modeling and motion graphics",
  },
  {
    name: "Blender",
    slug: "blender",
    category: "video_software",
    description: "3D creation and animation",
  },

  // Design Skills
  {
    name: "Static Ad Design",
    slug: "static-ad-design",
    category: "design_skill",
    description: "Creating static advertisements and banners",
  },
  {
    name: "Social Media Design",
    slug: "social-media-design",
    category: "design_skill",
    description: "Designing for social media platforms",
  },
  {
    name: "UI Design",
    slug: "ui-design",
    category: "design_skill",
    description: "User interface design",
  },
  {
    name: "UX Design",
    slug: "ux-design",
    category: "design_skill",
    description: "User experience design",
  },
  {
    name: "Logo Design",
    slug: "logo-design",
    category: "design_skill",
    description: "Brand logo and identity design",
  },
  {
    name: "Brand Identity",
    slug: "brand-identity",
    category: "design_skill",
    description: "Complete brand identity systems",
  },
  {
    name: "Print Design",
    slug: "print-design",
    category: "design_skill",
    description: "Design for print materials",
  },
  {
    name: "Packaging Design",
    slug: "packaging-design",
    category: "design_skill",
    description: "Product packaging design",
  },
  {
    name: "Illustration",
    slug: "illustration",
    category: "design_skill",
    description: "Custom illustrations and artwork",
  },
  {
    name: "Icon Design",
    slug: "icon-design",
    category: "design_skill",
    description: "Icon and symbol design",
  },
  {
    name: "Infographic Design",
    slug: "infographic-design",
    category: "design_skill",
    description: "Data visualization and infographics",
  },
  {
    name: "Presentation Design",
    slug: "presentation-design",
    category: "design_skill",
    description: "Pitch decks and slide design",
  },
  {
    name: "Email Design",
    slug: "email-design",
    category: "design_skill",
    description: "Email marketing templates",
  },

  // Video Skills
  {
    name: "Motion Graphics",
    slug: "motion-graphics",
    category: "video_skill",
    description: "Animated graphics and text",
  },
  {
    name: "Video Editing",
    slug: "video-editing",
    category: "video_skill",
    description: "Video cutting and assembly",
  },
  {
    name: "Color Grading",
    slug: "color-grading",
    category: "video_skill",
    description: "Professional color correction",
  },
  {
    name: "VFX",
    slug: "vfx",
    category: "video_skill",
    description: "Visual effects and compositing",
  },
  {
    name: "3D Animation",
    slug: "3d-animation",
    category: "video_skill",
    description: "3D character and object animation",
  },
  {
    name: "2D Animation",
    slug: "2d-animation",
    category: "video_skill",
    description: "Traditional 2D animation",
  },
  {
    name: "Explainer Videos",
    slug: "explainer-videos",
    category: "video_skill",
    description: "Educational and product videos",
  },
  {
    name: "Social Media Video",
    slug: "social-media-video",
    category: "video_skill",
    description: "Short-form video for social platforms",
  },
  {
    name: "Product Video",
    slug: "product-video",
    category: "video_skill",
    description: "Product showcase videos",
  },
  {
    name: "Testimonial Video",
    slug: "testimonial-video",
    category: "video_skill",
    description: "Customer testimonial editing",
  },
  {
    name: "YouTube Content",
    slug: "youtube-content",
    category: "video_skill",
    description: "Long-form YouTube video editing",
  },
  {
    name: "TikTok/Reels",
    slug: "tiktok-reels",
    category: "video_skill",
    description: "Short-form vertical video content",
  },
  {
    name: "Podcast Video",
    slug: "podcast-video",
    category: "video_skill",
    description: "Video podcast editing",
  },

  // Style Expertise
  {
    name: "Minimalist Design",
    slug: "minimalist-design",
    category: "style",
    description: "Clean, minimal aesthetic",
  },
  {
    name: "Bold & Vibrant",
    slug: "bold-vibrant",
    category: "style",
    description: "Colorful, high-impact designs",
  },
  {
    name: "Luxury & Premium",
    slug: "luxury-premium",
    category: "style",
    description: "High-end, sophisticated aesthetics",
  },
  {
    name: "Retro & Vintage",
    slug: "retro-vintage",
    category: "style",
    description: "Classic and nostalgic styles",
  },
  {
    name: "Tech & Modern",
    slug: "tech-modern",
    category: "style",
    description: "Clean, tech-forward design",
  },
  {
    name: "Playful & Fun",
    slug: "playful-fun",
    category: "style",
    description: "Energetic, youthful designs",
  },
  {
    name: "Corporate & Professional",
    slug: "corporate-professional",
    category: "style",
    description: "Business-appropriate design",
  },

  // Industry Knowledge
  {
    name: "E-commerce",
    slug: "ecommerce",
    category: "industry",
    description: "E-commerce and retail design",
  },
  {
    name: "SaaS",
    slug: "saas",
    category: "industry",
    description: "Software-as-a-Service design",
  },
  {
    name: "Fashion & Beauty",
    slug: "fashion-beauty",
    category: "industry",
    description: "Fashion and beauty industry",
  },
  {
    name: "Food & Beverage",
    slug: "food-beverage",
    category: "industry",
    description: "F&B industry design",
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    category: "industry",
    description: "Real estate marketing",
  },
  {
    name: "Healthcare",
    slug: "healthcare",
    category: "industry",
    description: "Healthcare and medical design",
  },
  {
    name: "Finance",
    slug: "finance",
    category: "industry",
    description: "Financial services design",
  },
  {
    name: "Education",
    slug: "education",
    category: "industry",
    description: "Educational content design",
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    category: "industry",
    description: "Entertainment industry design",
  },
  {
    name: "Non-profit",
    slug: "non-profit",
    category: "industry",
    description: "Non-profit organization design",
  },
];

async function seedSkills() {
  console.log("Seeding skills (upsert mode - no data will be deleted)...\n");

  let inserted = 0;
  let skipped = 0;

  for (const skill of skillsData) {
    try {
      // Use raw SQL for ON CONFLICT DO NOTHING to avoid overwriting existing data
      await db.execute(sql`
        INSERT INTO skills (name, slug, category, description, is_active)
        VALUES (${skill.name}, ${skill.slug}, ${skill.category}, ${skill.description}, true)
        ON CONFLICT (slug) DO NOTHING
      `);

      console.log(`✓ ${skill.name} (${skill.category})`);
      inserted++;
    } catch (error) {
      console.log(`⊘ Skipped: ${skill.name} (error: ${error})`);
      skipped++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Skills seeding complete!`);
  console.log(`Total skills in data: ${skillsData.length}`);
  console.log(`Note: Using upsert mode - existing skills were not modified`);
  console.log(`========================================\n`);

  process.exit(0);
}

seedSkills().catch((error) => {
  console.error("Error seeding skills:", error);
  process.exit(1);
});
