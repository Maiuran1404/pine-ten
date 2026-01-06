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
  // Creative focus areas
  creativeFocus: string[];
}

export interface CreativeFocusOption {
  id: string;
  title: string;
  description: string;
}

export type OnboardingStep =
  | "brand-input"
  | "scanning"
  | "company-info"
  | "brand-colors"
  | "fine-tune"
  | "creative-focus"
  | "complete";

export const STEP_CONFIG = [
  { id: "brand-input", label: "Brand" },
  { id: "company-info", label: "Company" },
  { id: "brand-colors", label: "Colors" },
  { id: "fine-tune", label: "Style" },
  { id: "creative-focus", label: "Focus" },
  { id: "complete", label: "Done" },
] as const;

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
  creativeFocus: [],
};

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
