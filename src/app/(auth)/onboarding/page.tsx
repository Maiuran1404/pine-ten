"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/shared/loading";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Globe,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Palette,
  Type,
  Eye,
  MessageSquare,
  Target,
  Layout,
  Share2,
  Presentation,
  BookOpen,
  Zap,
  Building2,
  Image as ImageIcon,
} from "lucide-react";
import {
  type BrandData,
  type OnboardingStep,
  type OnboardingRoute,
  type VisualPreference,
  type BrandDirection,
  defaultBrandData,
  CREATIVE_FOCUS_OPTIONS,
  VISUAL_COMPARISON_PAIRS,
  PRODUCT_TYPES,
  TARGET_AUDIENCES,
  ROUTE_A_STEPS,
  ROUTE_B_STEPS,
  VISUAL_STYLE_OPTIONS,
  BRAND_TONE_OPTIONS,
  FONT_OPTIONS,
} from "@/components/onboarding/types";
import { InfiniteGrid } from "@/components/ui/infinite-grid-integration";

// ============================================================================
// HEADER
// ============================================================================

function Header({ userEmail }: { userEmail?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-2 gap-1">
          <div className="w-2 h-2 rounded-full bg-[#EDBA8D]" />
          <div className="w-2 h-2 rounded-full bg-[#9AA48C]" />
          <div className="w-2 h-2 rounded-full bg-[#D2ECF2]" />
          <div className="w-2 h-2 rounded-full bg-[#EDBA8D]" />
        </div>
        <span className="text-white/90 text-sm font-medium tracking-wide uppercase">
          Crafted
        </span>
      </div>

      {userEmail && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10 transition-colors"
          >
            {userEmail}
            <ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-xl">
              <button
                onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
                className="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

function GlowingCard({ children, glowColor = "#9AA48C", className = "" }: { children: React.ReactNode; glowColor?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute -inset-1 rounded-3xl opacity-50 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${glowColor}40, transparent, ${glowColor}40)`,
        }}
      />
      <div
        className="relative rounded-2xl p-8 sm:p-10 flex flex-col justify-center"
        style={{
          background: "rgba(15, 15, 15, 0.9)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${glowColor}30`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ProgressIndicator({ steps, currentStep, accentColor = "#9AA48C" }: { steps: readonly { id: string; label: string }[]; currentStep: string; accentColor?: string }) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
              index === currentIndex
                ? "bg-white/20 text-white border border-white/40"
                : index > currentIndex
                ? "bg-white/5 text-white/40"
                : "text-black"
            }`}
            style={index < currentIndex ? { backgroundColor: accentColor } : undefined}
          >
            {index < currentIndex ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className="w-8 h-0.5"
              style={{ backgroundColor: index < currentIndex ? accentColor : "rgba(255, 255, 255, 0.1)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// WELCOME SCREEN
// ============================================================================

function WelcomeScreen({ onSelectRoute }: { onSelectRoute: (route: OnboardingRoute) => void }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <motion.div variants={staggerItem} className="text-left mb-8">
        <h1
          className="text-3xl sm:text-4xl text-white mb-3"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          Welcome to Crafted
        </h1>
        <p className="text-white/60 text-base">
          Let&apos;s set up your brand so everything you create stays consistent.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Option A - Existing Brand */}
        <motion.button
          variants={staggerItem}
          onClick={() => onSelectRoute("existing")}
          className="group relative p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "rgba(15, 15, 15, 0.9)",
            border: "1px solid rgba(139, 181, 139, 0.3)",
          }}
          whileHover={{ borderColor: "rgba(139, 181, 139, 0.6)" }}
        >
          <div className="w-12 h-12 rounded-xl bg-[#9AA48C]/20 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-[#9AA48C]" />
          </div>
          <h2 className="text-lg text-white font-medium mb-1.5">I already have a brand</h2>
          <p className="text-white/50 text-sm mb-4">
            Share your website or upload assets — we&apos;ll extract your brand DNA automatically.
          </p>
          <div className="flex items-center gap-2 text-[#9AA48C] text-sm font-medium">
            <span>Get started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>

        {/* Option B - Create Brand */}
        <motion.button
          variants={staggerItem}
          onClick={() => onSelectRoute("create")}
          className="group relative p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "rgba(15, 15, 15, 0.9)",
            border: "1px solid rgba(139, 181, 139, 0.3)",
          }}
          whileHover={{ borderColor: "rgba(139, 181, 139, 0.6)" }}
        >
          <div className="w-12 h-12 rounded-xl bg-[#9AA48C]/20 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-[#9AA48C]" />
          </div>
          <h2 className="text-lg text-white font-medium mb-1.5">I want to create a brand</h2>
          <p className="text-white/50 text-sm mb-4">
            Answer a few questions and we&apos;ll generate brand directions for you to choose from.
          </p>
          <div className="flex items-center gap-2 text-[#9AA48C] text-sm font-medium">
            <span>Start building</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[#9AA48C]/20 text-[#9AA48C] text-xs">
            ~5 min
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ROUTE A - EXISTING BRAND FLOW
// ============================================================================

function BrandInputStep({
  websiteUrl,
  setWebsiteUrl,
  onContinue,
  isLoading,
}: {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  onContinue: () => void;
  isLoading: boolean;
}) {
  return (
    <GlowingCard>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
            Show us your brand
          </h1>
          <p className="text-white/50 text-sm">
            Give us one thing — we&apos;ll take care of the rest.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Website URL Input */}
          <motion.div variants={staggerItem} className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Paste your website URL</label>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: "rgba(40, 40, 40, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Globe className="w-5 h-5 text-white/30" />
              </div>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full bg-transparent py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none"
                placeholder="yourcompany.com"
                onKeyDown={(e) => e.key === "Enter" && websiteUrl.trim() && onContinue()}
              />
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.button
            variants={staggerItem}
            onClick={onContinue}
            disabled={!websiteUrl.trim()}
            className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: websiteUrl.trim() ? "#f5f5f0" : "rgba(245, 245, 240, 0.3)",
              color: "#1a1a1a",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Analyzing...
              </span>
            ) : (
              "Continue"
            )}
          </motion.button>
        </div>
      </motion.div>
    </GlowingCard>
  );
}

function ScanningStep({ progress, scanningTexts }: { progress: number; scanningTexts: string[] }) {
  return (
    <GlowingCard>
      <div className="text-left">
        <motion.div
          className="w-20 h-20 rounded-full mb-8 flex items-center justify-center"
          style={{ background: "rgba(139, 181, 139, 0.2)" }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-10 h-10 text-[#9AA48C]" />
        </motion.div>

        <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
          Extracting your Brand DNA
        </h1>
        <p className="text-white/50 text-sm mb-8">
          This usually takes less than a minute.
        </p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-[#9AA48C] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Animated scanning texts */}
        <div className="space-y-3">
          {scanningTexts.map((text, index) => {
            const isComplete = progress > (index + 1) * (100 / scanningTexts.length);
            const isActive = progress > index * (100 / scanningTexts.length) && !isComplete;

            return (
              <motion.div
                key={text}
                className={`flex items-center gap-3 text-sm transition-all ${
                  isComplete ? "text-[#9AA48C]" : isActive ? "text-white" : "text-white/30"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : isActive ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-current rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-current" />
                )}
                {text}
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlowingCard>
  );
}

function BrandDNARevealStep({
  brandData,
  onAdjust,
  onContinue,
  onBack,
  setBrandData,
}: {
  brandData: BrandData;
  onAdjust: (field: string) => void;
  onContinue: () => void;
  onBack: () => void;
  setBrandData: (data: BrandData) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);

  // Derive initial style and tone from feel values if not explicitly set
  const getInitialVisualStyle = () => {
    if (brandData.visualStyle) return brandData.visualStyle;
    // Map feelBoldMinimal to a style
    const val = brandData.feelBoldMinimal;
    if (val < 30) return "bold-impactful";
    if (val < 45) return "modern-sleek";
    if (val < 55) return "minimal-clean";
    if (val < 70) return "elegant-refined";
    return "classic-timeless";
  };

  const getInitialBrandTone = () => {
    if (brandData.brandTone) return brandData.brandTone;
    // Map feelPlayfulSerious to a tone
    const val = brandData.feelPlayfulSerious;
    if (val < 30) return "playful-witty";
    if (val < 45) return "friendly-approachable";
    if (val < 55) return "casual-relaxed";
    if (val < 70) return "professional-trustworthy";
    return "authoritative-expert";
  };

  const [tempValues, setTempValues] = useState({
    name: brandData.name,
    description: brandData.description,
    primaryColor: brandData.primaryColor,
    secondaryColor: brandData.secondaryColor,
    accentColor: brandData.accentColor,
    primaryFont: brandData.primaryFont || "Satoshi",
    visualStyle: getInitialVisualStyle(),
    brandTone: getInitialBrandTone(),
  });

  const colors = [brandData.primaryColor, brandData.secondaryColor, brandData.accentColor].filter(Boolean);
  const primaryColor = colors[0] || "#3b82f6";
  const secondaryColor = colors[1] || "#8b5cf6";

  // Get display labels for current values
  const getStyleLabel = (value: string) => {
    const option = VISUAL_STYLE_OPTIONS.find(o => o.value === value);
    return option?.label || "Minimal & Clean";
  };

  const getToneLabel = (value: string) => {
    const option = BRAND_TONE_OPTIONS.find(o => o.value === value);
    return option?.label || "Professional & Trustworthy";
  };

  const visualStyleLabel = getStyleLabel(brandData.visualStyle || getInitialVisualStyle());
  const brandToneLabel = getToneLabel(brandData.brandTone || getInitialBrandTone());

  // Get font family for display
  const getFontFamily = (fontName: string) => {
    const font = FONT_OPTIONS.find(f => f.value === fontName);
    return font?.family || "'Satoshi', sans-serif";
  };
  const fontFamily = getFontFamily(brandData.primaryFont || "Satoshi");

  const handleStartEdit = () => {
    setTempValues({
      name: brandData.name,
      description: brandData.description,
      primaryColor: brandData.primaryColor,
      secondaryColor: brandData.secondaryColor,
      accentColor: brandData.accentColor,
      primaryFont: brandData.primaryFont || "Satoshi",
      visualStyle: brandData.visualStyle || getInitialVisualStyle(),
      brandTone: brandData.brandTone || getInitialBrandTone(),
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setBrandData({
      ...brandData,
      name: tempValues.name,
      description: tempValues.description,
      primaryColor: tempValues.primaryColor,
      secondaryColor: tempValues.secondaryColor || "",
      accentColor: tempValues.accentColor || "",
      primaryFont: tempValues.primaryFont,
      visualStyle: tempValues.visualStyle,
      brandTone: tempValues.brandTone,
    });
    setIsEditing(false);
    setEditField(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditField(null);
  };

  // Group fonts by category for better UX
  const groupedFonts = FONT_OPTIONS.reduce((acc, font) => {
    if (!acc[font.category]) acc[font.category] = [];
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, typeof FONT_OPTIONS>);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full max-w-md"
    >
      {/* Glassmorphic Card */}
      <motion.div
        variants={staggerItem}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "rgba(20, 20, 20, 0.7)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: `0 0 60px ${primaryColor}10, 0 0 30px ${secondaryColor}08`,
        }}
      >
        {/* Subtle brand color glow at top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-20 rounded-full opacity-15 blur-[60px]"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
        />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            {/* Logo/Initial */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <span className="text-white/90 font-semibold text-base" style={{ fontFamily }}>
                {(isEditing ? tempValues.name : brandData.name)?.[0]?.toUpperCase() || "B"}
              </span>
            </div>

            {/* Edit/Save/Cancel buttons */}
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-full text-xs text-white/40 hover:text-white/70 transition-colors"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-full text-xs text-black/80 hover:bg-white transition-colors"
                  style={{
                    background: "rgba(154, 164, 140, 0.9)",
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded-full text-xs text-white/40 hover:text-white/70 transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)"
                }}
              >
                Edit
              </button>
            )}
          </div>

          {/* Brand Name & Description */}
          <div className="mb-6">
            <p className="text-white/30 text-xs mb-1" style={{ fontFamily: "'Times New Roman', serif", fontStyle: "italic" }}>
              This is
            </p>
            {isEditing ? (
              <input
                type="text"
                value={tempValues.name}
                onChange={(e) => setTempValues({ ...tempValues, name: e.target.value })}
                className="text-2xl text-white font-medium mb-2 bg-transparent border-b border-white/20 focus:border-[#9AA48C] outline-none w-full"
                style={{ fontFamily }}
                placeholder="Brand name"
              />
            ) : (
              <h1 className="text-2xl text-white font-medium mb-2" style={{ fontFamily }}>
                {brandData.name || "Your Brand"}
              </h1>
            )}
            {isEditing ? (
              <textarea
                value={tempValues.description}
                onChange={(e) => setTempValues({ ...tempValues, description: e.target.value })}
                className="text-white/40 text-sm leading-relaxed bg-transparent border border-white/10 rounded-lg p-2 focus:border-[#9AA48C] outline-none w-full resize-none"
                rows={3}
                placeholder="Brand description"
              />
            ) : (
              <p className="text-white/40 text-sm leading-relaxed">
                {brandData.description || brandData.industry || "Your brand story will appear here."}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-5" />

          {/* Color Palette */}
          <div className="flex items-center gap-3 mb-5">
            {isEditing ? (
              <>
                <div className="relative">
                  <input
                    type="color"
                    value={tempValues.primaryColor || "#3b82f6"}
                    onChange={(e) => setTempValues({ ...tempValues, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer opacity-0 absolute inset-0"
                  />
                  <div
                    className="w-8 h-8 rounded-lg ring-2 ring-white/20"
                    style={{ backgroundColor: tempValues.primaryColor || "#3b82f6" }}
                  />
                </div>
                <div className="relative">
                  <input
                    type="color"
                    value={tempValues.secondaryColor || "#8b5cf6"}
                    onChange={(e) => setTempValues({ ...tempValues, secondaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer opacity-0 absolute inset-0"
                  />
                  <div
                    className="w-8 h-8 rounded-lg ring-2 ring-white/20"
                    style={{ backgroundColor: tempValues.secondaryColor || "#8b5cf6" }}
                  />
                </div>
                <div className="relative">
                  <input
                    type="color"
                    value={tempValues.accentColor || "#f59e0b"}
                    onChange={(e) => setTempValues({ ...tempValues, accentColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer opacity-0 absolute inset-0"
                  />
                  <div
                    className="w-8 h-8 rounded-lg ring-2 ring-white/20"
                    style={{ backgroundColor: tempValues.accentColor || "#f59e0b" }}
                  />
                </div>
              </>
            ) : (
              colors.length > 0 ? colors.map((color, i) => (
                <motion.div
                  key={i}
                  className="w-8 h-8 rounded-lg"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 2px 12px ${color}30`
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                />
              )) : (
                <>
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: "#3b82f6" }} />
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: "#8b5cf6" }} />
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: "#f59e0b" }} />
                </>
              )
            )}
            <span className="text-white/20 text-xs ml-1">Colors</span>
          </div>

          {/* Typography & Style Row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <span className="text-white/20 text-[10px] uppercase tracking-wider block mb-1">Type</span>
              {isEditing ? (
                <select
                  value={tempValues.primaryFont || "Satoshi"}
                  onChange={(e) => setTempValues({ ...tempValues, primaryFont: e.target.value })}
                  className="text-white text-sm font-medium bg-transparent border-none outline-none w-full cursor-pointer"
                  style={{ fontFamily: getFontFamily(tempValues.primaryFont) }}
                >
                  {Object.entries(groupedFonts).map(([category, fonts]) => (
                    <optgroup key={category} label={category} style={{ background: "#1a1a1a", color: "#666" }}>
                      {fonts.map((font) => (
                        <option key={font.value} value={font.value} style={{ background: "#1a1a1a", color: "#fff", fontFamily: font.family }}>
                          {font.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <p className="text-white text-sm font-medium" style={{ fontFamily }}>
                  {brandData.primaryFont || "Satoshi"}
                </p>
              )}
            </div>

            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <span className="text-white/20 text-[10px] uppercase tracking-wider block mb-1">Style</span>
              {isEditing ? (
                <select
                  value={tempValues.visualStyle}
                  onChange={(e) => setTempValues({ ...tempValues, visualStyle: e.target.value })}
                  className="text-white text-sm font-medium bg-transparent border-none outline-none w-full cursor-pointer"
                >
                  {VISUAL_STYLE_OPTIONS.map((style) => (
                    <option key={style.value} value={style.value} style={{ background: "#1a1a1a" }}>
                      {style.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-white text-sm font-medium">
                  {visualStyleLabel}
                </p>
              )}
            </div>
          </div>

          {/* Tone */}
          <div
            className="p-3 rounded-xl mb-6"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}
          >
            <span className="text-white/20 text-[10px] uppercase tracking-wider block mb-1">Tone</span>
            {isEditing ? (
              <select
                value={tempValues.brandTone}
                onChange={(e) => setTempValues({ ...tempValues, brandTone: e.target.value })}
                className="text-white text-sm font-medium bg-transparent border-none outline-none w-full cursor-pointer"
              >
                {BRAND_TONE_OPTIONS.map((tone) => (
                  <option key={tone.value} value={tone.value} style={{ background: "#1a1a1a" }}>
                    {tone.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-white text-sm font-medium">
                {brandToneLabel}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="flex-1 py-3 rounded-xl font-medium text-xs text-white/40 hover:text-white/70 transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)"
                }}
              >
                <ArrowLeft className="w-3 h-3 inline mr-1" />
                Back
              </button>
              <button
                onClick={onContinue}
                className="flex-1 py-3 rounded-xl font-medium text-xs transition-all hover:bg-white text-black/80"
                style={{
                  background: "rgba(245, 245, 240, 0.9)",
                }}
              >
                Looks right
                <Check className="w-3 h-3 inline ml-1" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer text */}
      <p className="text-white/20 text-[10px] text-center mt-4">
        Nothing here is locked. Your brand evolves as you do.
      </p>
    </motion.div>
  );
}

// Brand archetype image sets - images that work together as a cohesive direction
const BRAND_ARCHETYPE_IMAGES: Record<string, string[]> = {
  boldExplorer: [
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=600&fit=crop",
  ],
  refinedAuthority: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop",
  ],
  friendlyGuide: [
    "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop",
  ],
  techDisruptor: [
    "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633186710895-309db2eca9e4?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
  ],
  elegantMinimalist: [
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545665277-5937489579f2?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
  ],
  luxuryStoryteller: [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553484771-047a44eee27b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop",
  ],
  versatileClassic: [
    "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop",
  ],
  creativeRebel: [
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=400&h=600&fit=crop",
  ],
  trustedAdvisor: [
    "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop",
  ],
  // New archetypes for more coverage
  zenMaster: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1518012312832-96bbe1de3e2f?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop",
  ],
  urbanEdge: [
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=400&h=600&fit=crop",
  ],
  warmCraftsman: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0?w=400&h=600&fit=crop",
  ],
  neonFuturist: [
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633186710895-309db2eca9e4?w=400&h=600&fit=crop",
  ],
  cleanSlate: [
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545665277-5937489579f2?w=400&h=600&fit=crop",
  ],
  corporateChic: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&h=600&fit=crop",
  ],
  playfulPop: [
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop",
  ],
  seriousCraft: [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553484771-047a44eee27b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop",
  ],
  dynamicLeader: [
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
  ],
  softLuxury: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=600&fit=crop",
  ],
  boldMinimalist: [
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
  ],
  humanFirst: [
    "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=400&h=600&fit=crop",
  ],
  techWarm: [
    "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633186710895-309db2eca9e4?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
  ],
  accessibleFun: [
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop",
  ],
  quietConfidence: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
  ],
  richStoryteller: [
    "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
  ],
  premiumTech: [
    "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=600&fit=crop",
  ],
  everydayJoy: [
    "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
  ],
  modernHeritage: [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553484771-047a44eee27b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=600&fit=crop",
  ],
  energeticPro: [
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=600&fit=crop",
  ],
  calmCreative: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1518012312832-96bbe1de3e2f?w=400&h=600&fit=crop",
  ],
  industrialChic: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
  ],
  organicLuxury: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0?w=400&h=600&fit=crop",
  ],
  digitalNative: [
    "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633186710895-309db2eca9e4?w=400&h=600&fit=crop",
  ],
  classicTrust: [
    "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553484771-047a44eee27b?w=400&h=600&fit=crop",
  ],
  vibrantMinimal: [
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=600&fit=crop",
  ],
  warmProfessional: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=600&fit=crop",
  ],
  boldAccessible: [
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=600&fit=crop",
  ],
};

// Brand archetype definitions with names and similar brands
const BRAND_ARCHETYPES: Record<string, { name: string; brands: string[] }> = {
  boldExplorer: { name: "Bold Explorer", brands: ["Red Bull", "GoPro", "Spotify"] },
  refinedAuthority: { name: "Refined Authority", brands: ["McKinsey", "Bloomberg", "IBM"] },
  friendlyGuide: { name: "Friendly Guide", brands: ["Airbnb", "Mailchimp", "Slack"] },
  techDisruptor: { name: "Tech Disruptor", brands: ["Tesla", "SpaceX", "Stripe"] },
  elegantMinimalist: { name: "Elegant Minimalist", brands: ["Apple", "Muji", "Aesop"] },
  luxuryStoryteller: { name: "Luxury Storyteller", brands: ["Hermès", "Rolex", "Cartier"] },
  versatileClassic: { name: "Versatile Classic", brands: ["Google", "Microsoft", "Adobe"] },
  creativeRebel: { name: "Creative Rebel", brands: ["Figma", "Notion", "Discord"] },
  trustedAdvisor: { name: "Trusted Advisor", brands: ["Deloitte", "Salesforce", "HubSpot"] },
  zenMaster: { name: "Zen Master", brands: ["Headspace", "Calm", "Patagonia"] },
  urbanEdge: { name: "Urban Edge", brands: ["Nike", "Adidas", "Supreme"] },
  warmCraftsman: { name: "Warm Craftsman", brands: ["Etsy", "Anthropologie", "West Elm"] },
  neonFuturist: { name: "Neon Futurist", brands: ["Cyberpunk", "Razer", "Alienware"] },
  cleanSlate: { name: "Clean Slate", brands: ["Everlane", "Glossier", "Away"] },
  corporateChic: { name: "Corporate Chic", brands: ["WeWork", "LinkedIn", "Dropbox"] },
  playfulPop: { name: "Playful Pop", brands: ["Duolingo", "Snapchat", "TikTok"] },
  seriousCraft: { name: "Serious Craft", brands: ["Monocle", "Kinfolk", "Cereal"] },
  dynamicLeader: { name: "Dynamic Leader", brands: ["Amazon", "Netflix", "Uber"] },
  softLuxury: { name: "Soft Luxury", brands: ["Goop", "Net-a-Porter", "Mejuri"] },
  boldMinimalist: { name: "Bold Minimalist", brands: ["Tesla", "Bang & Olufsen", "Rimowa"] },
  humanFirst: { name: "Human First", brands: ["Warby Parker", "Casper", "Allbirds"] },
  techWarm: { name: "Tech Warm", brands: ["Spotify", "Asana", "Monday.com"] },
  accessibleFun: { name: "Accessible Fun", brands: ["Target", "IKEA", "Trader Joe's"] },
  quietConfidence: { name: "Quiet Confidence", brands: ["Porsche", "Montblanc", "Leica"] },
  richStoryteller: { name: "Rich Storyteller", brands: ["National Geographic", "Airbnb", "Patagonia"] },
  premiumTech: { name: "Premium Tech", brands: ["Apple", "Sonos", "Dyson"] },
  everydayJoy: { name: "Everyday Joy", brands: ["Coca-Cola", "McDonald's", "Disney"] },
  modernHeritage: { name: "Modern Heritage", brands: ["Burberry", "Coach", "Ralph Lauren"] },
  energeticPro: { name: "Energetic Pro", brands: ["Gatorade", "Under Armour", "Peloton"] },
  calmCreative: { name: "Calm Creative", brands: ["Pinterest", "Squarespace", "Behance"] },
  industrialChic: { name: "Industrial Chic", brands: ["Caterpillar", "Carhartt", "Yeti"] },
  organicLuxury: { name: "Organic Luxury", brands: ["Aesop", "Le Labo", "Byredo"] },
  digitalNative: { name: "Digital Native", brands: ["Twitch", "Discord", "Roblox"] },
  classicTrust: { name: "Classic Trust", brands: ["Goldman Sachs", "Morgan Stanley", "Vanguard"] },
  vibrantMinimal: { name: "Vibrant Minimal", brands: ["Stripe", "Linear", "Vercel"] },
  warmProfessional: { name: "Warm Professional", brands: ["Zendesk", "Intercom", "Drift"] },
  boldAccessible: { name: "Bold Accessible", brands: ["Canva", "Wix", "Shopify"] },
};

// Function to determine brand archetype based on slider values (4 signals: tone, density, warmth, premium)
function getBrandArchetype(signals: {
  tone: number;
  density: number;
  warmth: number;
  premium: number;
}): string {
  const { tone, density, warmth, premium } = signals;

  // Tone: Serious (< 25), A bit serious (25-45), Neutral (45-55), A bit playful (55-75), Playful (> 75)
  const isSerious = tone < 25;
  const isBitSerious = tone >= 25 && tone < 45;
  const isNeutralTone = tone >= 45 && tone <= 55;
  const isBitPlayful = tone > 55 && tone <= 75;
  const isPlayful = tone > 75;

  // Density: Minimal (< 25), A bit minimal (25-45), Neutral (45-55), A bit rich (55-75), Rich (> 75)
  const isMinimal = density < 25;
  const isBitMinimal = density >= 25 && density < 45;
  const isNeutralDensity = density >= 45 && density <= 55;
  const isBitRich = density > 55 && density <= 75;
  const isRich = density > 75;

  // Warmth: Cold (< 35), Neutral (35-65), Warm (> 65)
  const isCold = warmth < 35;
  const isNeutralWarmth = warmth >= 35 && warmth <= 65;
  const isWarm = warmth > 65;

  // Premium: Accessible (< 25), A bit accessible (25-45), Neutral (45-55), A bit premium (55-75), Premium (> 75)
  const isAccessible = premium < 25;
  const isBitAccessible = premium >= 25 && premium < 45;
  const isNeutralPremium = premium >= 45 && premium <= 55;
  const isBitPremium = premium > 55 && premium <= 75;
  const isPremium = premium > 75;

  // === PLAYFUL COMBINATIONS ===
  if (isPlayful && isWarm && isPremium) return "boldExplorer";
  if (isPlayful && isWarm && isAccessible) return "everydayJoy";
  if (isPlayful && isWarm && isRich) return "richStoryteller";
  if (isPlayful && isWarm) return "friendlyGuide";
  if (isPlayful && isCold && isPremium) return "neonFuturist";
  if (isPlayful && isCold && isAccessible) return "digitalNative";
  if (isPlayful && isCold) return "vibrantMinimal";
  if (isPlayful && isMinimal) return "playfulPop";
  if (isPlayful && isRich) return "creativeRebel";
  if (isPlayful && isAccessible) return "accessibleFun";
  if (isPlayful && isPremium) return "softLuxury";
  if (isPlayful) return "humanFirst";

  // === SERIOUS COMBINATIONS ===
  if (isSerious && isCold && isPremium && isMinimal) return "elegantMinimalist";
  if (isSerious && isCold && isPremium) return "refinedAuthority";
  if (isSerious && isCold && isMinimal) return "industrialChic";
  if (isSerious && isCold) return "techDisruptor";
  if (isSerious && isWarm && isPremium && isRich) return "luxuryStoryteller";
  if (isSerious && isWarm && isPremium) return "organicLuxury";
  if (isSerious && isWarm && isRich) return "modernHeritage";
  if (isSerious && isWarm) return "trustedAdvisor";
  if (isSerious && isPremium && isMinimal) return "premiumTech";
  if (isSerious && isPremium) return "quietConfidence";
  if (isSerious && isAccessible) return "corporateChic";
  if (isSerious && isMinimal) return "cleanSlate";
  if (isSerious && isRich) return "seriousCraft";
  if (isSerious) return "classicTrust";

  // === BIT PLAYFUL COMBINATIONS ===
  if (isBitPlayful && isWarm && isPremium) return "warmCraftsman";
  if (isBitPlayful && isWarm && isAccessible) return "boldAccessible";
  if (isBitPlayful && isWarm) return "humanFirst";
  if (isBitPlayful && isCold && isPremium) return "boldMinimalist";
  if (isBitPlayful && isCold) return "urbanEdge";
  if (isBitPlayful && isMinimal) return "cleanSlate";
  if (isBitPlayful && isRich) return "richStoryteller";
  if (isBitPlayful && isPremium) return "softLuxury";
  if (isBitPlayful && isAccessible) return "accessibleFun";

  // === BIT SERIOUS COMBINATIONS ===
  if (isBitSerious && isCold && isPremium) return "premiumTech";
  if (isBitSerious && isCold) return "industrialChic";
  if (isBitSerious && isWarm && isPremium) return "modernHeritage";
  if (isBitSerious && isWarm) return "warmProfessional";
  if (isBitSerious && isPremium && isMinimal) return "elegantMinimalist";
  if (isBitSerious && isPremium) return "quietConfidence";
  if (isBitSerious && isAccessible) return "corporateChic";
  if (isBitSerious && isMinimal) return "seriousCraft";
  if (isBitSerious && isRich) return "dynamicLeader";

  // === MINIMAL COMBINATIONS ===
  if (isMinimal && isPremium && isCold) return "elegantMinimalist";
  if (isMinimal && isPremium && isWarm) return "organicLuxury";
  if (isMinimal && isPremium) return "premiumTech";
  if (isMinimal && isAccessible && isWarm) return "zenMaster";
  if (isMinimal && isAccessible) return "cleanSlate";
  if (isMinimal && isWarm) return "calmCreative";
  if (isMinimal && isCold) return "boldMinimalist";

  // === RICH COMBINATIONS ===
  if (isRich && isPremium && isWarm) return "luxuryStoryteller";
  if (isRich && isPremium && isCold) return "modernHeritage";
  if (isRich && isPremium) return "richStoryteller";
  if (isRich && isAccessible && isWarm) return "everydayJoy";
  if (isRich && isAccessible) return "creativeRebel";
  if (isRich && isWarm) return "warmCraftsman";
  if (isRich && isCold) return "dynamicLeader";

  // === PREMIUM COMBINATIONS ===
  if (isPremium && isCold) return "refinedAuthority";
  if (isPremium && isWarm) return "organicLuxury";
  if (isPremium) return "quietConfidence";

  // === ACCESSIBLE COMBINATIONS ===
  if (isAccessible && isWarm) return "humanFirst";
  if (isAccessible && isCold) return "digitalNative";
  if (isAccessible) return "boldAccessible";

  // === WARMTH COMBINATIONS ===
  if (isWarm && isNeutralDensity) return "friendlyGuide";
  if (isCold && isNeutralDensity) return "techDisruptor";

  // === NEUTRAL / DEFAULT ===
  if (isNeutralTone && isNeutralDensity && isNeutralPremium) return "versatileClassic";

  // Fallback based on strongest signal
  if (isPremium) return "quietConfidence";
  if (isAccessible) return "humanFirst";
  if (isPlayful) return "playfulPop";
  if (isSerious) return "trustedAdvisor";
  if (isMinimal) return "cleanSlate";
  if (isRich) return "richStoryteller";
  if (isWarm) return "warmCraftsman";
  if (isCold) return "industrialChic";

  return "versatileClassic";
}

function MoodPreviewPanel({ brandData }: { brandData: BrandData }) {
  // Get slider values for all signals (4 signals now)
  const getSignalValue = (id: string): number => {
    const value = brandData[id as keyof BrandData];
    if (typeof value === 'number') return value;
    // Fallback to old values
    switch (id) {
      case 'signalTone': return brandData.feelPlayfulSerious as number || 50;
      case 'signalDensity': return brandData.feelBoldMinimal as number || 50;
      case 'signalWarmth': return 50;
      case 'signalPremium': return brandData.feelExperimentalClassic as number || 50;
      default: return 50;
    }
  };

  // Get all signal values (4 signals)
  const signals = {
    tone: getSignalValue('signalTone'),
    density: getSignalValue('signalDensity'),
    warmth: getSignalValue('signalWarmth'),
    premium: getSignalValue('signalPremium'),
  };

  // Get the current brand archetype
  const archetypeKey = getBrandArchetype(signals);
  const archetype = BRAND_ARCHETYPES[archetypeKey];
  const images = BRAND_ARCHETYPE_IMAGES[archetypeKey];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-3xl"
    >
      {/* Scrolling Image Columns - 4 columns showing cohesive archetype images */}
      <div className="relative">
        <div className="flex gap-4 justify-center">
          {images.slice(0, 4).map((imageSrc, index) => (
            <motion.div
              key={`column-${archetypeKey}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative flex-shrink-0"
              style={{ width: "140px" }}
            >
              {/* Scrolling container */}
              <div
                className="relative h-[420px] overflow-hidden rounded-2xl"
                style={{
                  background: "rgba(15, 15, 15, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Top fade gradient */}
                <div
                  className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(10, 10, 10, 1) 0%, rgba(10, 10, 10, 0.7) 50%, transparent 100%)",
                  }}
                />

                {/* Bottom fade gradient */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none"
                  style={{
                    background: "linear-gradient(0deg, rgba(10, 10, 10, 1) 0%, rgba(10, 10, 10, 0.7) 50%, transparent 100%)",
                  }}
                />

                {/* Scrolling images */}
                <motion.div
                  key={`scroll-${archetypeKey}-${index}`}
                  className="flex flex-col gap-3 p-2"
                  animate={{
                    y: index % 2 === 0
                      ? [0, -(images.length * (200 + 12))]
                      : [-(images.length * (200 + 12)), 0],
                  }}
                  transition={{
                    y: {
                      duration: 20 + index * 4,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }}
                >
                  {/* Repeat all archetype images for seamless scrolling */}
                  {[...images, ...images, ...images].map((src, imgIndex) => (
                    <motion.div
                      key={`${archetypeKey}-${index}-${imgIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative flex-shrink-0 rounded-xl overflow-hidden shadow-lg"
                      style={{
                        width: "100%",
                        height: "200px",
                      }}
                    >
                      <img
                        src={src}
                        alt={`${archetype.name} design ${imgIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Archetype Name and Similar Brands */}
      <motion.div
        key={archetypeKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 text-center"
      >
        {/* Archetype Name */}
        <h3
          className="text-2xl text-white mb-2"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          {archetype.name}
        </h3>

        {/* Similar Brands */}
        <p className="text-white/40 text-sm">
          Similar to{" "}
          <span className="text-white/60">
            {archetype.brands.join(", ")}
          </span>
        </p>
      </motion.div>
    </motion.div>
  );
}

// Core brand signal sliders configuration (4 signals)
const BRAND_SIGNAL_SLIDERS = [
  {
    id: "signalTone",
    name: "Tone",
    leftLabel: "Serious",
    rightLabel: "Playful",
    description: "Emotional seriousness of expression",
    levels: ["Serious", "Composed", "Balanced", "Spirited", "Playful"],
  },
  {
    id: "signalDensity",
    name: "Visual Density",
    leftLabel: "Minimal",
    rightLabel: "Rich",
    description: "Amount of visual information per surface",
    levels: ["Minimal", "Clean", "Balanced", "Detailed", "Rich"],
  },
  {
    id: "signalWarmth",
    name: "Warmth",
    leftLabel: "Cold",
    rightLabel: "Warm",
    description: "How human and inviting the visual language feels",
    levels: ["Cold", "Neutral", "Warm"],
  },
  {
    id: "signalPremium",
    name: "Premium Feel",
    leftLabel: "Accessible",
    rightLabel: "Premium",
    description: "Price perception and craftsmanship",
    levels: ["Accessible", "Approachable", "Balanced", "Elevated", "Premium"],
  },
];

// Simple stepped slider component
function BrandSignalSlider({
  slider,
  value,
  onChange,
  accentColor = "#9AA48C",
}: {
  slider: typeof BRAND_SIGNAL_SLIDERS[0];
  value: number;
  onChange: (value: number) => void;
  accentColor?: string;
}) {
  const numSteps = slider.levels.length;
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get current level index and label
  const getLevelIndex = (val: number) => {
    const stepSize = 100 / (numSteps - 1);
    return Math.round(val / stepSize);
  };

  const currentLevelIndex = getLevelIndex(value);
  const currentLevel = slider.levels[currentLevelIndex];

  // Snap value to nearest step
  const snapToStep = (val: number) => {
    const stepSize = 100 / (numSteps - 1);
    const stepIndex = Math.round(val / stepSize);
    return Math.min(Math.max(stepIndex * stepSize, 0), 100);
  };

  // Calculate value from mouse/touch position
  const getValueFromPosition = (clientX: number) => {
    if (!sliderRef.current) return value;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    return snapToStep(percentage);
  };

  // Handle pointer down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const newValue = getValueFromPosition(e.clientX);
    onChange(newValue);
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newValue = getValueFromPosition(e.clientX);
    onChange(newValue);
  };

  // Handle pointer up
  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      {/* Slider header */}
      <div className="flex justify-between items-center">
        <span className="text-white text-sm font-medium">{slider.name}</span>
        <motion.span
          key={currentLevel}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs font-medium px-2.5 py-1 rounded-full text-[#9AA48C]"
          style={{
            background: "rgba(154, 164, 140, 0.15)",
            border: "1px solid rgba(154, 164, 140, 0.3)",
          }}
        >
          {currentLevel}
        </motion.span>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[11px] text-white/40 font-medium">
        <span>{slider.leftLabel}</span>
        <span>{slider.rightLabel}</span>
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className="relative h-10 flex items-center cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/10" />

        {/* Filled track */}
        <motion.div
          className="absolute left-0 h-1 rounded-full bg-[#9AA48C]"
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />

        {/* Step indicators */}
        <div className="absolute inset-x-0 flex justify-between pointer-events-none">
          {slider.levels.map((_, index) => {
            const stepPosition = (index / (numSteps - 1)) * 100;
            const isActive = value >= stepPosition;

            return (
              <div
                key={index}
                className="w-0.5 h-3 rounded-full transition-colors duration-150"
                style={{
                  backgroundColor: isActive ? "rgba(154, 164, 140, 0.8)" : "rgba(255, 255, 255, 0.2)",
                }}
              />
            );
          })}
        </div>

        {/* Thumb */}
        <motion.div
          className="absolute pointer-events-none"
          initial={false}
          animate={{ left: `${value}%` }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        >
          <motion.div
            className="relative rounded-full -ml-2.5 bg-[#9AA48C]"
            style={{
              width: "20px",
              height: "20px",
              boxShadow: isDragging
                ? "0 2px 12px rgba(154, 164, 140, 0.5)"
                : "0 2px 8px rgba(154, 164, 140, 0.3)",
            }}
            animate={{
              scale: isDragging ? 1.2 : 1,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {/* Inner dot */}
            <div
              className="absolute rounded-full"
              style={{
                width: "6px",
                height: "6px",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function FineTuneStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
}: {
  brandData: BrandData;
  setBrandData: (data: BrandData) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  // Use brand primary color or fallback to default
  const accentColor = brandData.primaryColor || "#9AA48C";

  // Get the number of levels for a slider by id
  const getNumLevels = (id: string): number => {
    const slider = BRAND_SIGNAL_SLIDERS.find(s => s.id === id);
    return slider?.levels.length || 5;
  };

  // Snap value to nearest step
  const snapToStep = (val: number, numLevels: number) => {
    const stepSize = 100 / (numLevels - 1);
    const stepIndex = Math.round(val / stepSize);
    return Math.min(Math.max(stepIndex * stepSize, 0), 100);
  };

  // Initialize signal values if not present (4 signals)
  const getSignalValue = (id: string): number => {
    const numLevels = getNumLevels(id);
    const value = brandData[id as keyof BrandData];
    if (typeof value === 'number') {
      return snapToStep(value, numLevels);
    }
    // Map from old values if available, then snap
    let rawValue: number;
    switch (id) {
      case 'signalTone': rawValue = brandData.feelPlayfulSerious as number || 50; break;
      case 'signalDensity': rawValue = brandData.feelBoldMinimal as number || 50; break;
      case 'signalWarmth': rawValue = 50; break;
      case 'signalPremium': rawValue = brandData.feelExperimentalClassic as number || 50; break;
      default: rawValue = 50;
    }
    return snapToStep(rawValue, numLevels);
  };

  return (
    <GlowingCard glowColor="#9AA48C" className="max-w-lg">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1 className="text-2xl sm:text-3xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            Let&apos;s dial it in
          </h1>
          <p className="text-white/50 text-sm">
            Adjust these core signals to match your brand feel.
          </p>
        </motion.div>

        <div className="space-y-6 mb-8">
          {BRAND_SIGNAL_SLIDERS.map((slider) => (
            <motion.div key={slider.id} variants={staggerItem}>
              <BrandSignalSlider
                slider={slider}
                value={getSignalValue(slider.id)}
                onChange={(value) => setBrandData({ ...brandData, [slider.id]: value })}
                accentColor={accentColor}
              />
            </motion.div>
          ))}
        </div>

        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm transition-all hover:opacity-90"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            Save & continue
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  );
}

function CreativeFocusStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
  isLoading,
}: {
  brandData: BrandData;
  setBrandData: (data: BrandData) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const toggleFocus = (id: string) => {
    const newFocus = brandData.creativeFocus.includes(id)
      ? brandData.creativeFocus.filter((f) => f !== id)
      : [...brandData.creativeFocus, id];
    setBrandData({ ...brandData, creativeFocus: newFocus });
  };

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "ads": Target,
    "landing-pages": Layout,
    "social": Share2,
    "pitch-decks": Presentation,
    "brand-guidelines": BookOpen,
  };

  return (
    <GlowingCard glowColor="#9AA48C">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
            What do you want to improve first?
          </h1>
          <p className="text-white/50 text-sm">
            Pick what matters right now. You can always add more later.
          </p>
        </motion.div>

        <div className="space-y-3 mb-6">
          {CREATIVE_FOCUS_OPTIONS.map((option) => {
            const isSelected = brandData.creativeFocus.includes(option.id);
            const Icon = iconMap[option.id] || Zap;

            return (
              <motion.button
                key={option.id}
                variants={staggerItem}
                onClick={() => toggleFocus(option.id)}
                className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                  isSelected ? "bg-[#9AA48C]/20 border-[#9AA48C]/50" : "hover:bg-white/5"
                }`}
                style={{
                  border: isSelected ? "1px solid rgba(154, 164, 140, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-[#9AA48C] text-black" : "bg-white/10 text-white/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium text-sm">{option.title}</h3>
                  <p className="text-white/40 text-xs">{option.description}</p>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#9AA48C]" />}
              </motion.button>
            );
          })}
        </div>

        <motion.p variants={staggerItem} className="text-white/30 text-xs text-left mb-6">
          Most teams start with 1–3.
        </motion.p>

        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="flex-1 py-4 rounded-xl font-medium text-sm"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Saving...
              </span>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  );
}

function BrandReadyStep({
  brandData,
  onComplete,
}: {
  brandData: BrandData;
  onComplete: () => void;
}) {
  const accentColor = brandData.primaryColor || "#9AA48C";

  return (
    <GlowingCard glowColor={accentColor}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="text-left"
      >
        <motion.div
          className="w-20 h-20 rounded-full mb-8 flex items-center justify-center"
          style={{ backgroundColor: accentColor }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <Check className="w-10 h-10 text-black" />
        </motion.div>

        <motion.div variants={staggerItem}>
          <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
            You&apos;re all set
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Crafted now understands your brand — and will protect it as you create.
          </p>
        </motion.div>

        <div className="space-y-4 mb-8 text-left">
          <motion.div variants={staggerItem} className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(40, 40, 40, 0.6)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}30` }}>
              <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Your Brand DNA</h3>
              <p className="text-white/40 text-xs">{brandData.name} • {brandData.industry || "Ready to go"}</p>
            </div>
          </motion.div>

          {brandData.creativeFocus.length > 0 && (
            <motion.div variants={staggerItem} className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(40, 40, 40, 0.6)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}30` }}>
                <Target className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Focus Areas</h3>
                <p className="text-white/40 text-xs">
                  {brandData.creativeFocus.length} area{brandData.creativeFocus.length > 1 ? "s" : ""} selected
                </p>
              </div>
            </motion.div>
          )}

          <motion.div variants={staggerItem} className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(40, 40, 40, 0.6)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}30` }}>
              <Zap className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Available Credits</h3>
              <p className="text-white/40 text-xs">Ready to create your first asset</p>
            </div>
          </motion.div>
        </div>

        <motion.button
          variants={staggerItem}
          onClick={onComplete}
          className="w-full py-4 rounded-xl font-medium text-sm"
          style={{ background: "#f5f5f0", color: "#1a1a1a" }}
        >
          Create your first asset
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </motion.button>
      </motion.div>
    </GlowingCard>
  );
}

// ============================================================================
// ROUTE B - CREATE BRAND FLOW
// ============================================================================

function BrandIntentStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
}: {
  brandData: BrandData;
  setBrandData: (data: BrandData) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(
    brandData.targetAudience ? brandData.targetAudience.split(", ").filter(Boolean) : []
  );

  const toggleAudience = (id: string) => {
    const newAudiences = selectedAudiences.includes(id)
      ? selectedAudiences.filter((a) => a !== id)
      : [...selectedAudiences, id];
    setSelectedAudiences(newAudiences);
    setBrandData({ ...brandData, targetAudience: newAudiences.join(", ") });
  };

  return (
    <GlowingCard>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
            Tell us about your brand
          </h1>
          <p className="text-white/50 text-sm">
            Give us a few details — we&apos;ll create something that fits.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Company Name */}
          <motion.div variants={staggerItem} className="space-y-2">
            <label className="text-white/70 text-sm font-medium">What&apos;s your brand called?</label>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: "rgba(40, 40, 40, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Building2 className="w-5 h-5 text-white/30" />
              </div>
              <input
                type="text"
                value={brandData.name}
                onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                className="w-full bg-transparent py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none"
                placeholder="Company or product name"
              />
            </div>
          </motion.div>

          {/* Product Type */}
          <motion.div variants={staggerItem} className="space-y-3">
            <label className="text-white/70 text-sm font-medium">What are you building?</label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setBrandData({ ...brandData, productType: type.id })}
                  className={`p-3 rounded-xl text-center transition-all duration-200 ${
                    brandData.productType === type.id
                      ? "bg-[#9AA48C]/20"
                      : "hover:bg-white/5"
                  }`}
                  style={{
                    border: brandData.productType === type.id
                      ? "1px solid rgba(154, 164, 140, 0.5)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span className={`text-sm font-medium ${brandData.productType === type.id ? "text-[#9AA48C]" : "text-white/80"}`}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Target Audience */}
          <motion.div variants={staggerItem} className="space-y-3">
            <label className="text-white/70 text-sm font-medium">Who is this for?</label>
            <div className="flex flex-wrap gap-2">
              {TARGET_AUDIENCES.map((audience) => (
                <button
                  key={audience.id}
                  onClick={() => toggleAudience(audience.id)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                    selectedAudiences.includes(audience.id)
                      ? "bg-[#9AA48C]/20 text-[#9AA48C]"
                      : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`}
                  style={{
                    border: selectedAudiences.includes(audience.id)
                      ? "1px solid rgba(154, 164, 140, 0.5)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {audience.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="flex gap-3 mt-8">
          <button
            onClick={onBack}
            className="flex-1 py-4 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            Continue
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  );
}

function BrandPersonalityStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
}: {
  brandData: BrandData;
  setBrandData: (data: BrandData) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  // Get the number of levels for a slider by id
  const getNumLevels = (id: string): number => {
    const slider = BRAND_SIGNAL_SLIDERS.find(s => s.id === id);
    return slider?.levels.length || 5;
  };

  // Snap value to nearest step
  const snapToStep = (val: number, numLevels: number) => {
    const stepSize = 100 / (numLevels - 1);
    const stepIndex = Math.round(val / stepSize);
    return Math.min(Math.max(stepIndex * stepSize, 0), 100);
  };

  // Get signal value with proper snapping
  const getSignalValue = (id: string): number => {
    const numLevels = getNumLevels(id);
    const value = brandData[id as keyof BrandData];
    if (typeof value === 'number') {
      return snapToStep(value, numLevels);
    }
    // Map from old values if available
    let rawValue: number;
    switch (id) {
      case 'signalTone': rawValue = brandData.feelPlayfulSerious as number || 50; break;
      case 'signalDensity': rawValue = brandData.feelBoldMinimal as number || 50; break;
      case 'signalWarmth': rawValue = 50; break;
      case 'signalPremium': rawValue = brandData.feelExperimentalClassic as number || 50; break;
      default: rawValue = 50;
    }
    return snapToStep(rawValue, numLevels);
  };

  return (
    <GlowingCard glowColor="#9AA48C" className="max-w-lg">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1 className="text-2xl sm:text-3xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            How should your brand feel?
          </h1>
          <p className="text-white/50 text-sm">
            Adjust these core signals to define your brand personality.
          </p>
        </motion.div>

        <div className="space-y-6 mb-8">
          {BRAND_SIGNAL_SLIDERS.map((slider) => (
            <motion.div key={slider.id} variants={staggerItem}>
              <BrandSignalSlider
                slider={slider}
                value={getSignalValue(slider.id)}
                onChange={(value) => setBrandData({ ...brandData, [slider.id]: value })}
                accentColor="#9AA48C"
              />
            </motion.div>
          ))}
        </div>

        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm transition-all hover:opacity-90"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            Continue
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  );
}

function VisualInstinctStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
}: {
  brandData: BrandData;
  setBrandData: (data: BrandData) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const currentPair = VISUAL_COMPARISON_PAIRS[currentPairIndex];

  const handleChoice = (choice: "A" | "B") => {
    const newPreference: VisualPreference = {
      id: currentPair.id,
      choice,
      dimension: currentPair.dimension,
    };

    const existingPrefs = brandData.visualPreferences || [];
    const updatedPrefs = [...existingPrefs.filter((p) => p.id !== currentPair.id), newPreference];
    setBrandData({ ...brandData, visualPreferences: updatedPrefs });

    if (currentPairIndex < VISUAL_COMPARISON_PAIRS.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      onContinue();
    }
  };

  const getVisualComponent = (visual: string) => {
    switch (visual) {
      case "light":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-gray-200" />
          </div>
        );
      case "dark":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-gray-800" />
          </div>
        );
      case "text-heavy":
        return (
          <div className="w-full h-28 rounded-xl bg-white p-4 flex flex-col justify-center gap-1.5">
            <div className="h-2.5 bg-gray-800 rounded w-3/4" />
            <div className="h-1.5 bg-gray-400 rounded w-full" />
            <div className="h-1.5 bg-gray-400 rounded w-2/3" />
            <div className="h-1.5 bg-gray-400 rounded w-5/6" />
          </div>
        );
      case "visual":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-[#9AA48C] to-[#7A8575] flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-white/80" />
          </div>
        );
      case "structured":
        return (
          <div className="w-full h-28 rounded-xl bg-white p-2.5 grid grid-cols-3 gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded" />
            ))}
          </div>
        );
      case "expressive":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 relative overflow-hidden">
            <div className="absolute top-2 left-4 w-6 h-6 rounded-full bg-white/30 -rotate-12" />
            <div className="absolute bottom-3 right-2 w-10 h-10 rounded-full bg-white/20 rotate-45" />
          </div>
        );
      case "calm":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="w-16 h-1 bg-blue-300 rounded" />
          </div>
        );
      case "energetic":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-yellow-400 to-red-500 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1.5 bg-white rounded-full" style={{ height: `${20 + (i % 3) * 20}%` }} />
            ))}
          </div>
        );
      case "minimal":
        return (
          <div className="w-full h-28 rounded-xl bg-white flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-900 rounded-full" />
          </div>
        );
      case "dense":
        return (
          <div className="w-full h-28 rounded-xl bg-gray-900 p-2 grid grid-cols-4 gap-1">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-700 to-gray-800 rounded" />
            ))}
          </div>
        );
      case "geometric":
        return (
          <div className="w-full h-28 rounded-xl bg-white flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-gray-900" />
            <div className="w-8 h-8 bg-gray-900 rotate-45" />
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[28px] border-l-transparent border-r-transparent border-b-gray-900" />
          </div>
        );
      case "organic":
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <div className="w-14 h-10 bg-green-400 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]" />
          </div>
        );
      default:
        return <div className="w-full h-28 rounded-xl bg-gray-200" />;
    }
  };

  return (
    <GlowingCard>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-6">
          <h1 className="text-2xl sm:text-3xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            What feels right to you?
          </h1>
          <p className="text-white/50 text-sm">
            Go with your gut. There are no wrong answers.
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div variants={staggerItem} className="flex gap-1.5 mb-6">
          {VISUAL_COMPARISON_PAIRS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < currentPairIndex ? "bg-[#9AA48C]" : i === currentPairIndex ? "bg-white/40" : "bg-white/10"
              }`}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPairIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            <button
              onClick={() => handleChoice("A")}
              className="group p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: "rgba(40, 40, 40, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {getVisualComponent(currentPair.optionA.visual)}
              <div className="mt-3 text-left">
                <h3 className="text-white font-medium text-sm">{currentPair.optionA.label}</h3>
                <p className="text-white/40 text-xs">{currentPair.optionA.description}</p>
              </div>
            </button>

            <button
              onClick={() => handleChoice("B")}
              className="group p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: "rgba(40, 40, 40, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {getVisualComponent(currentPair.optionB.visual)}
              <div className="mt-3 text-left">
                <h3 className="text-white font-medium text-sm">{currentPair.optionB.label}</h3>
                <p className="text-white/40 text-xs">{currentPair.optionB.description}</p>
              </div>
            </button>
          </motion.div>
        </AnimatePresence>

        <motion.div variants={staggerItem} className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            Skip to directions
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  );
}

function ToneOfVoiceStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
}: {
  brandData: BrandData;
  setBrandData: (data: BrandData) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const examples = [
    "We're fast and technical",
    "We're calm and trustworthy",
    "We're modern but serious",
    "We're bold and creative",
    "We're friendly and approachable",
  ];

  return (
    <GlowingCard>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
            One last thing
          </h1>
          <p className="text-white/50 text-sm">
            What should people immediately understand when they see your brand?
          </p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            variants={staggerItem}
            className="relative rounded-xl overflow-hidden"
            style={{
              background: "rgba(40, 40, 40, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <textarea
              value={brandData.brandPositioning || ""}
              onChange={(e) => setBrandData({ ...brandData, brandPositioning: e.target.value })}
              className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none min-h-[120px] resize-none"
              placeholder="Describe your brand in a sentence..."
            />
          </motion.div>

          <motion.div variants={staggerItem} className="space-y-2">
            <p className="text-white/40 text-xs">Examples:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setBrandData({ ...brandData, brandPositioning: example })}
                  className="px-3 py-1.5 rounded-full text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="flex gap-3 mt-8">
          <button
            onClick={onBack}
            className="flex-1 py-4 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-4 rounded-xl font-medium text-sm"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            Generate Directions
            <Sparkles className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>

        <motion.button
          variants={staggerItem}
          onClick={onContinue}
          className="w-full mt-3 py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Skip this step
        </motion.button>
      </motion.div>
    </GlowingCard>
  );
}

function AIDirectionsStep({
  brandData,
  directions,
  selectedDirection,
  onSelectDirection,
  onContinue,
  onBack,
  isGenerating,
}: {
  brandData: BrandData;
  directions: BrandDirection[];
  selectedDirection: BrandDirection | null;
  onSelectDirection: (direction: BrandDirection) => void;
  onContinue: () => void;
  onBack: () => void;
  isGenerating: boolean;
}) {
  if (isGenerating) {
    return (
      <GlowingCard>
        <div className="text-left">
          <motion.div
            className="w-16 h-16 rounded-full mb-6 flex items-center justify-center"
            style={{ background: "rgba(154, 164, 140, 0.2)" }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-[#9AA48C]" />
          </motion.div>

          <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            Creating your brand directions
          </h1>
          <p className="text-white/50 text-sm">
            Building personalized options based on your preferences...
          </p>
        </div>
      </GlowingCard>
    );
  }

  return (
    <GlowingCard>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-left mb-6">
          <h1 className="text-2xl sm:text-3xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            Choose a direction
          </h1>
          <p className="text-white/50 text-sm">
            Pick the one that feels right. You can always refine it later.
          </p>
        </motion.div>

        <div className="space-y-6 mb-8">
          {directions.map((direction) => {
            const isSelected = selectedDirection?.id === direction.id;
            const getFontFamilyCSS = (fontName: string) => {
              const font = FONT_OPTIONS.find(f => f.value === fontName);
              return font?.family || `'${fontName}', sans-serif`;
            };
            return (
              <motion.button
                key={direction.id}
                variants={staggerItem}
                onClick={() => onSelectDirection(direction)}
                className={`w-full rounded-2xl text-left transition-all overflow-hidden ${
                  isSelected ? "ring-2 ring-[#9AA48C]" : "hover:ring-1 hover:ring-white/20"
                }`}
                style={{
                  background: "rgba(20, 20, 20, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Header with name and check */}
                <div className="p-5 pb-4 flex items-center justify-between border-b border-white/5">
                  <div>
                    <p className="text-white/30 text-xs mb-1">Direction</p>
                    <h3 className="text-white text-lg font-medium">{direction.name}</h3>
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-[#9AA48C]/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#9AA48C]" />
                    </div>
                  )}
                </div>

                {/* Color Palette Section */}
                <div className="p-5 border-b border-white/5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-4">Color Palette</p>
                  <div className="flex justify-between gap-2">
                    {direction.colorPalette.slice(0, 5).map((color, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div
                          className="w-full aspect-square rounded-full mb-2 mx-auto max-w-[48px]"
                          style={{
                            backgroundColor: color,
                            boxShadow: color === "#ffffff" || color === "#fafaf9" || color === "#f5f5f5" || color === "#f5f5f4"
                              ? "inset 0 0 0 1px rgba(0,0,0,0.08)"
                              : undefined
                          }}
                        />
                        <p className="text-white/60 text-[10px] leading-tight mb-0.5 truncate">
                          {direction.colorNames?.[i] || "Color"}
                        </p>
                        <p className="text-white/30 text-[9px] font-mono">
                          {color.replace("#", "").toLowerCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography Section */}
                <div className="p-5 border-b border-white/5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-4">Typography</p>
                  <div className="flex gap-8">
                    {/* Primary Font */}
                    <div className="flex-1">
                      <div
                        className="text-4xl text-white/90 mb-1"
                        style={{ fontFamily: getFontFamilyCSS(direction.primaryFont) }}
                      >
                        Aa
                      </div>
                      <p className="text-white/50 text-xs">{direction.primaryFont}</p>
                    </div>
                    {/* Secondary Font */}
                    <div className="flex-1">
                      <div
                        className="text-4xl text-white/90 mb-1"
                        style={{ fontFamily: getFontFamilyCSS(direction.secondaryFont) }}
                      >
                        Aa
                      </div>
                      <p className="text-white/50 text-xs">{direction.secondaryFont}</p>
                    </div>
                  </div>
                </div>

                {/* Description & Keywords */}
                <div className="p-5">
                  <p className="text-white/50 text-sm mb-4">{direction.narrative}</p>
                  <div className="flex flex-wrap gap-2">
                    {direction.moodKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 rounded-full text-xs text-white/50 border border-white/10"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={!selectedDirection}
            className="flex-1 py-3 rounded-xl font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "#f5f5f0", color: "#1a1a1a" }}
          >
            Continue
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  );
}

// ============================================================================
// MAIN ONBOARDING COMPONENT
// ============================================================================

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending, refetch: refetchSession } = useSession();

  const [route, setRoute] = useState<OnboardingRoute | null>(null);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [brandData, setBrandData] = useState<BrandData>(defaultBrandData);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [brandDirections, setBrandDirections] = useState<BrandDirection[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<BrandDirection | null>(null);
  const [isGeneratingDirections, setIsGeneratingDirections] = useState(false);
  const [showingCompletionScreen, setShowingCompletionScreen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const scanningTexts = [
    "Studying colors and type",
    "Reading tone and language",
    "Noticing layout patterns",
    "Learning your visual style",
  ];

  // Compute sphere colors based on brand data for steps after brand extraction
  // Must be defined here before any early returns to follow Rules of Hooks
  const brandColorSteps: OnboardingStep[] = ["brand-dna-reveal", "fine-tune", "creative-focus", "brand-ready"];
  const sphereColors = useMemo((): [string, string, string] | undefined => {
    if (brandColorSteps.includes(step)) {
      const colors = [brandData.primaryColor, brandData.secondaryColor, brandData.accentColor].filter(Boolean);
      if (colors.length >= 2) {
        return [
          colors[0] || "#3b82f6",
          colors[1] || colors[0] || "#8b5cf6",
          colors[2] || colors[1] || colors[0] || "#f59e0b"
        ] as [string, string, string];
      }
    }
    return undefined;
  }, [step, brandData.primaryColor, brandData.secondaryColor, brandData.accentColor]);

  // Handle redirects
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }

    // Skip redirect if we're intentionally showing the completion screen
    if (showingCompletionScreen) {
      return;
    }

    const user = session?.user as { onboardingCompleted?: boolean; role?: string } | undefined;
    if (user?.onboardingCompleted) {
      router.push("/dashboard");
    }
  }, [session, isPending, router, showingCompletionScreen]);

  // Brand extraction
  const handleBrandExtraction = async () => {
    if (!websiteUrl.trim()) return;

    setStep("scanning");
    setIsLoading(true);
    setScanProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      if (websiteUrl.trim()) {
        const response = await fetch("/api/brand/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteUrl }),
        });

        const result = await response.json();

        if (response.ok && result.data) {
          setBrandData({
            ...brandData,
            ...result.data,
            website: websiteUrl,
          });
        }
      }

      clearInterval(progressInterval);
      setScanProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 500));
      setStep("brand-dna-reveal");
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Failed to extract brand. Please try again.");
      setStep("brand-input");
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  // Generate brand directions for Route B
  const generateBrandDirections = useCallback(async () => {
    setIsGeneratingDirections(true);
    setStep("ai-directions");

    // Simulate AI generation - in production, call your AI endpoint
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate directions based on user preferences
    const directions: BrandDirection[] = [
      {
        id: "1",
        name: "Modern Confidence",
        narrative: `A confident, forward-thinking identity designed for ${brandData.targetAudience || "your audience"} who value clarity and precision.`,
        colorPalette: ["#f5f5f5", "#3b82f6", "#1a1a1a", "#64748b", "#0ea5e9"],
        colorNames: ["Cloud White", "Electric Blue", "Midnight", "Steel Gray", "Sky Blue"],
        typographyStyle: "modern",
        primaryFont: "Inter",
        secondaryFont: "DM Sans",
        visualStyle: "Clean, geometric, with bold accents",
        moodKeywords: ["Professional", "Trustworthy", "Modern", "Clean"],
      },
      {
        id: "2",
        name: "Warm Innovation",
        narrative: "An approachable feel that balances warmth with innovation. Perfect for building genuine connections.",
        colorPalette: ["#c8d69b", "#f6e6a5", "#3971b8", "#fbfcee", "#343b1b"],
        colorNames: ["Tea Green", "Vanilla", "Celtic Blue", "Ivory", "Dark Brown"],
        typographyStyle: "bold",
        primaryFont: "Poppins",
        secondaryFont: "Lato",
        visualStyle: "Rounded, warm, inviting",
        moodKeywords: ["Friendly", "Innovative", "Approachable", "Dynamic"],
      },
      {
        id: "3",
        name: "Refined Elegance",
        narrative: "Sophisticated and premium, communicating quality and meticulous attention to detail.",
        colorPalette: ["#fafaf9", "#a78bfa", "#18181b", "#78716c", "#e4e4e7"],
        colorNames: ["Pearl White", "Soft Violet", "Onyx", "Warm Stone", "Silver Mist"],
        typographyStyle: "elegant",
        primaryFont: "Cormorant Garamond",
        secondaryFont: "Outfit",
        visualStyle: "Minimal, luxurious, refined",
        moodKeywords: ["Premium", "Elegant", "Sophisticated", "Quality"],
      },
    ];

    setBrandDirections(directions);
    setIsGeneratingDirections(false);
  }, [brandData.targetAudience]);

  // Save onboarding data
  const handleSaveOnboarding = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "client",
          data: {
            brand: brandData,
            hasWebsite: !!websiteUrl.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding");
      }

      // Set flag before refetching to prevent auto-redirect
      setShowingCompletionScreen(true);
      await refetchSession();
      setStep("brand-ready");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    // Wait for exit animation to complete before navigating
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  // Route selection handler
  const handleRouteSelect = (selectedRoute: OnboardingRoute) => {
    setRoute(selectedRoute);
    if (selectedRoute === "existing") {
      setStep("brand-input");
    } else {
      setStep("brand-intent");
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userEmail = session.user?.email || undefined;
  const currentSteps = route === "existing" ? ROUTE_A_STEPS : ROUTE_B_STEPS;

  return (
    <motion.div
      className="h-screen relative flex items-center overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        backgroundColor: "#0a0a0a",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Infinite Grid Background - uses brand colors on brand-dna-reveal step */}
      <InfiniteGrid
        gridSize={50}
        speedX={0.3}
        speedY={0.3}
        spotlightRadius={250}
        backgroundOpacity={0.03}
        highlightOpacity={0.15}
        showBlurSpheres={true}
        sphereColors={sphereColors}
        className="!fixed inset-0"
      />
      <Header userEmail={userEmail} />

      <main className="relative z-10 px-4 py-16 ml-[10%] max-w-2xl">
        {/* Progress indicator for non-welcome steps */}
        {step !== "welcome" && step !== "scanning" && step !== "brand-ready" && step !== "complete" && (
          <div className="mb-6">
            <ProgressIndicator steps={currentSteps} currentStep={step} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {step === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WelcomeScreen onSelectRoute={handleRouteSelect} />
            </motion.div>
          )}

          {/* Route A Steps */}
          {step === "brand-input" && (
            <motion.div key="brand-input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <BrandInputStep
                websiteUrl={websiteUrl}
                setWebsiteUrl={setWebsiteUrl}
                onContinue={handleBrandExtraction}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === "scanning" && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScanningStep progress={scanProgress} scanningTexts={scanningTexts} />
            </motion.div>
          )}

          {step === "brand-dna-reveal" && (
            <motion.div key="brand-dna-reveal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <BrandDNARevealStep
                brandData={brandData}
                setBrandData={setBrandData}
                onAdjust={(field) => console.log("Adjust:", field)}
                onContinue={() => setStep("fine-tune")}
                onBack={() => setStep("brand-input")}
              />
            </motion.div>
          )}

          {step === "fine-tune" && (
            <motion.div key="fine-tune" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <FineTuneStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={() => setStep("creative-focus")}
                onBack={() => route === "existing" ? setStep("brand-dna-reveal") : setStep("brand-personality")}
              />
            </motion.div>
          )}

          {step === "creative-focus" && (
            <motion.div key="creative-focus" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <CreativeFocusStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={handleSaveOnboarding}
                onBack={() => setStep(route === "create" ? "ai-directions" : "fine-tune")}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === "brand-ready" && (
            <motion.div key="brand-ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <BrandReadyStep brandData={brandData} onComplete={handleComplete} />
            </motion.div>
          )}

          {/* Route B Steps */}
          {step === "brand-intent" && (
            <motion.div key="brand-intent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <BrandIntentStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={() => setStep("brand-personality")}
                onBack={() => { setRoute(null); setStep("welcome"); }}
              />
            </motion.div>
          )}

          {step === "brand-personality" && (
            <motion.div key="brand-personality" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <BrandPersonalityStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={() => setStep("visual-instinct")}
                onBack={() => setStep("brand-intent")}
              />
            </motion.div>
          )}

          {step === "visual-instinct" && (
            <motion.div key="visual-instinct" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <VisualInstinctStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={generateBrandDirections}
                onBack={() => setStep("brand-personality")}
              />
            </motion.div>
          )}

          {step === "ai-directions" && (
            <motion.div key="ai-directions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AIDirectionsStep
                brandData={brandData}
                directions={brandDirections}
                selectedDirection={selectedDirection}
                onSelectDirection={(dir) => {
                  setSelectedDirection(dir);
                  setBrandData({
                    ...brandData,
                    selectedDirection: dir,
                    primaryColor: dir.colorPalette[0],
                    secondaryColor: dir.colorPalette[1],
                    accentColor: dir.colorPalette[2],
                    backgroundColor: dir.colorPalette[3],
                    primaryFont: dir.primaryFont,
                    secondaryFont: dir.secondaryFont,
                  });
                }}
                onContinue={() => setStep("creative-focus")}
                onBack={() => setStep("visual-instinct")}
                isGenerating={isGeneratingDirections}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Right side - mood preview for fine-tune step */}
      <div className="relative z-10 flex-1 h-full hidden lg:flex items-center justify-center pr-[10%]">
        <AnimatePresence mode="wait">
          {step === "fine-tune" && (
            <MoodPreviewPanel key="mood-preview" brandData={brandData} />
          )}
        </AnimatePresence>
      </div>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/30">
        <p>&copy; {new Date().getFullYear()} Crafted Studio. All rights reserved.</p>
      </footer>
    </motion.div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
