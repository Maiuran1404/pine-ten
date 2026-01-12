// Onboarding types and constants

import {
  Code,
  ShoppingCart,
  Megaphone,
  DollarSign,
  Heart,
  GraduationCap,
  Home,
  UtensilsCrossed,
  Shirt,
  Film,
  Briefcase,
  Factory,
  HandHeart,
  Building2,
} from "lucide-react";

export interface BrandData {
  name: string;
  website: string;
  description: string;
  tagline: string;
  industry: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  brandColors: string[];
  primaryFont: string;
  secondaryFont: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  contactEmail: string;
  contactPhone: string;
  keywords: string[];
  screenshotUrl?: string;
  // Feel preferences (0-100 scale)
  feelPlayfulSerious: number;
  feelBoldMinimal: number;
  feelExperimentalClassic: number;
  // Additional feel preferences for Route B
  feelFriendlyProfessional: number;
  feelPremiumAccessible: number;
  // Brand signal sliders (0-100 scale, used in fine-tune step)
  signalTone?: number; // Serious (0) ↔ Playful (100)
  signalDensity?: number; // Minimal (0) ↔ Rich (100)
  signalWarmth?: number; // Cold (0) ↔ Warm (100)
  signalPremium?: number; // Accessible (0) ↔ Premium (100)
  // Creative focus areas
  creativeFocus: string[];
  // Brand assets (uploaded files)
  brandAssets: string[];
  // Route B specific fields
  productType?: string; // SaaS, app, marketplace, agency, etc.
  targetAudience?: string;
  brandPositioning?: string; // What should people understand about your brand
  // Visual preferences from instinct test
  visualPreferences?: VisualPreference[];
  // Selected brand direction (Route B)
  selectedDirection?: BrandDirection;
  // Explicit style and tone selections (used in brand DNA reveal)
  visualStyle?: string;
  brandTone?: string;
}

export interface CreativeFocusOption {
  id: string;
  title: string;
  description: string;
}

// Route selection
export type OnboardingRoute = "existing" | "create";

// All possible onboarding steps
export type OnboardingStep =
  // Welcome / Path selection
  | "welcome"
  // Route A - Existing Brand
  | "brand-input"
  | "scanning"
  | "brand-dna-reveal"
  | "fine-tune"
  | "creative-focus"
  | "brand-ready"
  // Route B - Create Brand
  | "brand-intent"
  | "brand-personality"
  | "visual-instinct"
  | "tone-of-voice"
  | "ai-directions"
  | "confirm-direction"
  // Shared final step
  | "complete"
  // Legacy steps (backward compatibility)
  | "company-info"
  | "brand-colors";

// Route A step configuration
export const ROUTE_A_STEPS = [
  { id: "brand-input", label: "Brand" },
  { id: "brand-dna-reveal", label: "DNA" },
  { id: "fine-tune", label: "Style" },
  { id: "creative-focus", label: "Focus" },
  { id: "brand-ready", label: "Ready" },
] as const;

// Route B step configuration
export const ROUTE_B_STEPS = [
  { id: "brand-intent", label: "Intent" },
  { id: "brand-personality", label: "Feel" },
  { id: "visual-instinct", label: "Visual" },
  { id: "tone-of-voice", label: "Tone" },
  { id: "ai-directions", label: "Directions" },
  { id: "confirm-direction", label: "Confirm" },
] as const;

// Keep for backward compatibility
export const STEP_CONFIG = [
  { id: "brand-input", label: "Brand" },
  { id: "company-info", label: "Company" },
  { id: "brand-colors", label: "Colors" },
  { id: "fine-tune", label: "Style" },
  { id: "creative-focus", label: "Focus" },
  { id: "complete", label: "Done" },
] as const;

// Visual Instinct Test types
export interface VisualPreference {
  id: string;
  choice: "A" | "B";
  dimension: string; // e.g., "lightDark", "textVisual", etc.
}

export interface VisualComparisonPair {
  id: string;
  dimension: string;
  optionA: {
    label: string;
    description: string;
    visual: "light" | "dark" | "text-heavy" | "visual" | "structured" | "expressive" | "calm" | "energetic" | "minimal" | "dense" | "geometric" | "organic";
  };
  optionB: {
    label: string;
    description: string;
    visual: "light" | "dark" | "text-heavy" | "visual" | "structured" | "expressive" | "calm" | "energetic" | "minimal" | "dense" | "geometric" | "organic";
  };
}

export const VISUAL_COMPARISON_PAIRS: VisualComparisonPair[] = [
  {
    id: "1",
    dimension: "lightDark",
    optionA: { label: "Light & Airy", description: "Clean, open, bright", visual: "light" },
    optionB: { label: "Dark & Bold", description: "Rich, dramatic, impactful", visual: "dark" },
  },
  {
    id: "2",
    dimension: "textVisual",
    optionA: { label: "Content-First", description: "Words tell the story", visual: "text-heavy" },
    optionB: { label: "Visual-First", description: "Images lead the way", visual: "visual" },
  },
  {
    id: "3",
    dimension: "structuredExpressive",
    optionA: { label: "Structured", description: "Grid-based, organized", visual: "structured" },
    optionB: { label: "Expressive", description: "Freeform, artistic", visual: "expressive" },
  },
  {
    id: "4",
    dimension: "calmEnergetic",
    optionA: { label: "Calm", description: "Peaceful, serene", visual: "calm" },
    optionB: { label: "Energetic", description: "Dynamic, exciting", visual: "energetic" },
  },
  {
    id: "5",
    dimension: "minimalDense",
    optionA: { label: "Minimal", description: "Less is more", visual: "minimal" },
    optionB: { label: "Rich", description: "More is more", visual: "dense" },
  },
  {
    id: "6",
    dimension: "geometricOrganic",
    optionA: { label: "Geometric", description: "Sharp, angular shapes", visual: "geometric" },
    optionB: { label: "Organic", description: "Soft, natural forms", visual: "organic" },
  },
];

// Brand Direction (AI-generated options for Route B)
export interface BrandDirection {
  id: string;
  name: string;
  narrative: string;
  colorPalette: string[];
  typographyStyle: "modern" | "classic" | "bold" | "elegant" | "playful";
  visualStyle: string;
  moodKeywords: string[];
}

export const defaultBrandData: BrandData = {
  name: "",
  website: "",
  description: "",
  tagline: "",
  industry: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#14b8a6",
  secondaryColor: "#3b82f6",
  accentColor: "#4338ca",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  brandColors: [],
  primaryFont: "",
  secondaryFont: "",
  socialLinks: {},
  contactEmail: "",
  contactPhone: "",
  keywords: [],
  // Feel preferences default to middle (50)
  feelPlayfulSerious: 50,
  feelBoldMinimal: 50,
  feelExperimentalClassic: 50,
  feelFriendlyProfessional: 50,
  feelPremiumAccessible: 50,
  // Brand signal sliders default to middle (50)
  signalTone: 50,
  signalDensity: 50,
  signalWarmth: 50,
  signalPremium: 50,
  creativeFocus: [],
  brandAssets: [],
  productType: "",
  targetAudience: "",
  brandPositioning: "",
  visualPreferences: [],
};

// Product type options for Route B
export const PRODUCT_TYPES = [
  { id: "saas", label: "SaaS", description: "Software as a service" },
  { id: "app", label: "App", description: "Mobile or web application" },
  { id: "marketplace", label: "Marketplace", description: "Two-sided platform" },
  { id: "agency", label: "Agency", description: "Service-based business" },
  { id: "ecommerce", label: "E-commerce", description: "Online store" },
  { id: "media", label: "Media/Content", description: "Publishing or content" },
  { id: "fintech", label: "Fintech", description: "Financial technology" },
  { id: "healthtech", label: "Healthtech", description: "Healthcare technology" },
  { id: "other", label: "Something else", description: "Tell us more" },
];

// Target audience options
export const TARGET_AUDIENCES = [
  { id: "founders", label: "Founders & Startups" },
  { id: "developers", label: "Developers" },
  { id: "designers", label: "Designers" },
  { id: "marketers", label: "Marketers" },
  { id: "enterprises", label: "Enterprise Teams" },
  { id: "smb", label: "Small Businesses" },
  { id: "consumers", label: "Consumers" },
  { id: "creators", label: "Creators" },
];

export const CREATIVE_FOCUS_OPTIONS: CreativeFocusOption[] = [
  { id: "ads", title: "Ads that actually convert", description: "On-brand, ready to launch." },
  { id: "landing-pages", title: "Landing page visuals", description: "Make your site feel premium." },
  { id: "social", title: "Social content", description: "Consistent posts, no designers needed." },
  { id: "pitch-decks", title: "Pitch decks", description: "Clear, confident, investor-ready." },
  { id: "brand-guidelines", title: "Brand guidelines", description: "So things don't fall apart as you grow." },
];

export const industries = [
  "Technology",
  "E-commerce",
  "SaaS",
  "Marketing & Advertising",
  "Finance",
  "Healthcare",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Fashion & Apparel",
  "Entertainment",
  "Professional Services",
  "Manufacturing",
  "Non-profit",
  "Other",
];

// Industry icon mapping
export const getIndustryIcon = (industry: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "Technology": Code,
    "E-commerce": ShoppingCart,
    "SaaS": Code,
    "Marketing & Advertising": Megaphone,
    "Finance": DollarSign,
    "Healthcare": Heart,
    "Education": GraduationCap,
    "Real Estate": Home,
    "Food & Beverage": UtensilsCrossed,
    "Fashion & Apparel": Shirt,
    "Entertainment": Film,
    "Professional Services": Briefcase,
    "Manufacturing": Factory,
    "Non-profit": HandHeart,
  };
  return iconMap[industry] || Building2;
};

// Color presets for color pickers
export const COLOR_PRESETS = {
  primary: ["#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#000000"],
  secondary: ["#3b82f6", "#1e3a8a", "#4338ca", "#7c3aed", "#be185d", "#9a3412", "#166534", "#155e75", "#334155", "#18181b"],
};

// Visual Style Options
export const VISUAL_STYLE_OPTIONS = [
  { value: "minimal-clean", label: "Minimal & Clean", description: "Simple, whitespace-focused, uncluttered" },
  { value: "bold-impactful", label: "Bold & Impactful", description: "Strong contrasts, commanding presence" },
  { value: "elegant-refined", label: "Elegant & Refined", description: "Sophisticated, luxurious, polished" },
  { value: "modern-sleek", label: "Modern & Sleek", description: "Contemporary, cutting-edge, streamlined" },
  { value: "playful-vibrant", label: "Playful & Vibrant", description: "Colorful, energetic, fun" },
  { value: "organic-natural", label: "Organic & Natural", description: "Earthy, flowing, nature-inspired" },
  { value: "tech-futuristic", label: "Tech & Futuristic", description: "Digital, innovative, forward-thinking" },
  { value: "classic-timeless", label: "Classic & Timeless", description: "Traditional, enduring, heritage" },
  { value: "artistic-expressive", label: "Artistic & Expressive", description: "Creative, unique, unconventional" },
  { value: "corporate-professional", label: "Corporate & Professional", description: "Business-focused, trustworthy, established" },
  { value: "warm-inviting", label: "Warm & Inviting", description: "Cozy, welcoming, friendly aesthetics" },
  { value: "edgy-disruptive", label: "Edgy & Disruptive", description: "Rebellious, challenging norms, provocative" },
];

// Brand Tone Options
export const BRAND_TONE_OPTIONS = [
  { value: "friendly-approachable", label: "Friendly & Approachable", description: "Warm, conversational, relatable" },
  { value: "professional-trustworthy", label: "Professional & Trustworthy", description: "Credible, reliable, expert" },
  { value: "playful-witty", label: "Playful & Witty", description: "Humorous, clever, light-hearted" },
  { value: "bold-confident", label: "Bold & Confident", description: "Assertive, self-assured, direct" },
  { value: "sophisticated-refined", label: "Sophisticated & Refined", description: "Cultured, elegant, discerning" },
  { value: "innovative-visionary", label: "Innovative & Visionary", description: "Forward-thinking, pioneering, ambitious" },
  { value: "empathetic-caring", label: "Empathetic & Caring", description: "Understanding, supportive, compassionate" },
  { value: "authoritative-expert", label: "Authoritative & Expert", description: "Knowledgeable, commanding, leading" },
  { value: "casual-relaxed", label: "Casual & Relaxed", description: "Easy-going, informal, laid-back" },
  { value: "inspiring-motivational", label: "Inspiring & Motivational", description: "Uplifting, empowering, encouraging" },
  { value: "premium-exclusive", label: "Premium & Exclusive", description: "Luxury, high-end, selective" },
  { value: "rebellious-edgy", label: "Rebellious & Edgy", description: "Unconventional, provocative, challenging" },
];

// Expanded Font Options
export const FONT_OPTIONS = [
  // Sans-serif - Modern
  { value: "Satoshi", label: "Satoshi", family: "'Satoshi', sans-serif", category: "Modern Sans" },
  { value: "Inter", label: "Inter", family: "'Inter', sans-serif", category: "Modern Sans" },
  { value: "DM Sans", label: "DM Sans", family: "'DM Sans', sans-serif", category: "Modern Sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', sans-serif", category: "Modern Sans" },
  { value: "Outfit", label: "Outfit", family: "'Outfit', sans-serif", category: "Modern Sans" },
  { value: "Space Grotesk", label: "Space Grotesk", family: "'Space Grotesk', sans-serif", category: "Modern Sans" },
  { value: "Manrope", label: "Manrope", family: "'Manrope', sans-serif", category: "Modern Sans" },
  { value: "Sora", label: "Sora", family: "'Sora', sans-serif", category: "Modern Sans" },
  // Sans-serif - Classic
  { value: "Helvetica", label: "Helvetica", family: "'Helvetica Neue', Helvetica, sans-serif", category: "Classic Sans" },
  { value: "Arial", label: "Arial", family: "'Arial', sans-serif", category: "Classic Sans" },
  { value: "Futura", label: "Futura", family: "'Futura', sans-serif", category: "Classic Sans" },
  { value: "Avenir", label: "Avenir", family: "'Avenir', sans-serif", category: "Classic Sans" },
  { value: "Proxima Nova", label: "Proxima Nova", family: "'Proxima Nova', sans-serif", category: "Classic Sans" },
  { value: "Montserrat", label: "Montserrat", family: "'Montserrat', sans-serif", category: "Classic Sans" },
  { value: "Lato", label: "Lato", family: "'Lato', sans-serif", category: "Classic Sans" },
  { value: "Open Sans", label: "Open Sans", family: "'Open Sans', sans-serif", category: "Classic Sans" },
  { value: "Roboto", label: "Roboto", family: "'Roboto', sans-serif", category: "Classic Sans" },
  // Serif - Elegant
  { value: "Times New Roman", label: "Times New Roman", family: "'Times New Roman', Times, serif", category: "Classic Serif" },
  { value: "Georgia", label: "Georgia", family: "'Georgia', serif", category: "Classic Serif" },
  { value: "Playfair Display", label: "Playfair Display", family: "'Playfair Display', serif", category: "Elegant Serif" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond", family: "'Cormorant Garamond', serif", category: "Elegant Serif" },
  { value: "Libre Baskerville", label: "Libre Baskerville", family: "'Libre Baskerville', serif", category: "Elegant Serif" },
  { value: "Source Serif Pro", label: "Source Serif Pro", family: "'Source Serif Pro', serif", category: "Elegant Serif" },
  { value: "Merriweather", label: "Merriweather", family: "'Merriweather', serif", category: "Classic Serif" },
  { value: "Lora", label: "Lora", family: "'Lora', serif", category: "Classic Serif" },
  { value: "Fraunces", label: "Fraunces", family: "'Fraunces', serif", category: "Elegant Serif" },
  // Display & Unique
  { value: "Poppins", label: "Poppins", family: "'Poppins', sans-serif", category: "Geometric" },
  { value: "Raleway", label: "Raleway", family: "'Raleway', sans-serif", category: "Geometric" },
  { value: "Josefin Sans", label: "Josefin Sans", family: "'Josefin Sans', sans-serif", category: "Geometric" },
  { value: "Bebas Neue", label: "Bebas Neue", family: "'Bebas Neue', sans-serif", category: "Display" },
  { value: "Oswald", label: "Oswald", family: "'Oswald', sans-serif", category: "Display" },
];
