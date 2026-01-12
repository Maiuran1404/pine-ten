"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/shared/loading";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Globe,
  Upload,
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
  Users,
  X,
  FileText,
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
} from "@/components/onboarding/types";

// ============================================================================
// BACKGROUND EFFECTS
// ============================================================================

function FloatingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)",
          transform: "rotate(-20deg)",
        }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #8bb58b 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-20 left-10 w-[200px] h-[200px] rounded-full opacity-30 blur-2xl"
        style={{
          background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-25 blur-2xl"
        style={{
          background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

function ParticleDots() {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            opacity: [p.opacity, p.opacity * 0.3, p.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// HEADER
// ============================================================================

function Header({ userEmail }: { userEmail?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-2 gap-1">
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
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
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
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
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

function GlowingCard({ children, glowColor = "#8bb58b", className = "" }: { children: React.ReactNode; glowColor?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute -inset-1 rounded-3xl opacity-50 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${glowColor}40, transparent, ${glowColor}40)`,
        }}
      />
      <div
        className="relative rounded-2xl p-10 sm:p-14 min-h-[400px] flex flex-col justify-center"
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

function ProgressIndicator({ steps, currentStep }: { steps: readonly { id: string; label: string }[]; currentStep: string }) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
              index < currentIndex
                ? "bg-[#8bb58b] text-black"
                : index === currentIndex
                ? "bg-white/20 text-white border border-white/40"
                : "bg-white/5 text-white/40"
            }`}
          >
            {index < currentIndex ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${index < currentIndex ? "bg-[#8bb58b]" : "bg-white/10"}`} />
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
      className="w-full max-w-2xl"
    >
      <motion.div variants={staggerItem} className="text-center mb-12">
        <h1
          className="text-4xl sm:text-5xl text-white mb-4"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          Welcome to Crafted
        </h1>
        <p className="text-white/60 text-lg">
          Let&apos;s set up your brand so everything you create stays consistent.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A - Existing Brand */}
        <motion.button
          variants={staggerItem}
          onClick={() => onSelectRoute("existing")}
          className="group relative p-8 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "rgba(15, 15, 15, 0.9)",
            border: "1px solid rgba(139, 181, 139, 0.3)",
          }}
          whileHover={{ borderColor: "rgba(139, 181, 139, 0.6)" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#8bb58b]/20 flex items-center justify-center mb-6">
            <Building2 className="w-7 h-7 text-[#8bb58b]" />
          </div>
          <h2 className="text-xl text-white font-medium mb-2">I already have a brand</h2>
          <p className="text-white/50 text-sm mb-6">
            Share your website or upload assets — we&apos;ll extract your brand DNA automatically.
          </p>
          <div className="flex items-center gap-2 text-[#8bb58b] text-sm font-medium">
            <span>Get started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>

        {/* Option B - Create Brand */}
        <motion.button
          variants={staggerItem}
          onClick={() => onSelectRoute("create")}
          className="group relative p-8 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "rgba(15, 15, 15, 0.9)",
            border: "1px solid rgba(139, 181, 139, 0.3)",
          }}
          whileHover={{ borderColor: "rgba(139, 181, 139, 0.6)" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#8bb58b]/20 flex items-center justify-center mb-6">
            <Sparkles className="w-7 h-7 text-[#8bb58b]" />
          </div>
          <h2 className="text-xl text-white font-medium mb-2">I want to create a brand</h2>
          <p className="text-white/50 text-sm mb-6">
            Answer a few questions and we&apos;ll generate brand directions for you to choose from.
          </p>
          <div className="flex items-center gap-2 text-[#8bb58b] text-sm font-medium">
            <span>Start building</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-[#8bb58b]/20 text-[#8bb58b] text-xs">
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
  uploadedFiles,
  onFileUpload,
  onRemoveFile,
  onContinue,
  isLoading,
}: {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  uploadedFiles: { name: string; url: string; type: string }[];
  onFileUpload: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  onContinue: () => void;
  isLoading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <GlowingCard>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem} className="text-center mb-8">
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

          {/* Divider */}
          <motion.div variants={staggerItem} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#0f0f0f] px-4 text-white/40">Or upload anything you already have</span>
            </div>
          </motion.div>

          {/* File Upload Area */}
          <motion.div
            variants={staggerItem}
            className={`relative rounded-xl p-6 text-center transition-all cursor-pointer ${
              isDragging ? "border-[#8bb58b] bg-[#8bb58b]/10" : ""
            }`}
            style={{
              background: isDragging ? "rgba(139, 181, 139, 0.1)" : "rgba(40, 40, 40, 0.4)",
              border: isDragging ? "2px dashed rgba(139, 181, 139, 0.6)" : "2px dashed rgba(255, 255, 255, 0.1)",
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.pptx,.ppt,.ai,.eps,.svg"
              className="hidden"
              onChange={(e) => e.target.files && onFileUpload(e.target.files)}
            />
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-white/50 text-sm">
              Logos, decks, designs, brand docs
            </p>
            <p className="text-white/30 text-xs mt-1">
              Drop files here or click to browse
            </p>
          </motion.div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <motion.div variants={staggerItem} className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(40, 40, 40, 0.6)" }}
                >
                  <div className="flex items-center gap-3">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 text-white/50" />
                    ) : (
                      <FileText className="w-4 h-4 text-white/50" />
                    )}
                    <span className="text-white/70 text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                    className="text-white/30 hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Microcopy */}
          <motion.p variants={staggerItem} className="text-white/30 text-xs text-center">
            We&apos;ll use this to understand how your brand looks, sounds, and feels.
          </motion.p>

          {/* Continue Button */}
          <motion.button
            variants={staggerItem}
            onClick={onContinue}
            disabled={!websiteUrl.trim() && uploadedFiles.length === 0}
            className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (websiteUrl.trim() || uploadedFiles.length > 0) ? "#f5f5f0" : "rgba(245, 245, 240, 0.3)",
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
      <div className="text-center">
        <motion.div
          className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center"
          style={{ background: "rgba(139, 181, 139, 0.2)" }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-10 h-10 text-[#8bb58b]" />
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
            className="h-full bg-[#8bb58b] rounded-full"
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
                className={`flex items-center justify-center gap-3 text-sm transition-all ${
                  isComplete ? "text-[#8bb58b]" : isActive ? "text-white" : "text-white/30"
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
}: {
  brandData: BrandData;
  onAdjust: (field: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const dnaCards = [
    {
      id: "snapshot",
      icon: Building2,
      title: "Brand Snapshot",
      description: brandData.description || "Your brand at a glance",
      value: brandData.industry || "Your industry",
    },
    {
      id: "colors",
      icon: Palette,
      title: "Colors",
      description: "The palette your brand uses",
      colors: [brandData.primaryColor, brandData.secondaryColor, brandData.accentColor].filter(Boolean),
    },
    {
      id: "typography",
      icon: Type,
      title: "Typography Direction",
      description: "How text should feel and flow",
      value: brandData.primaryFont || "Modern, clean typography",
    },
    {
      id: "visual",
      icon: Eye,
      title: "Visual Style",
      description: "Your design aesthetic",
      value: brandData.feelBoldMinimal < 50 ? "Bold & Impactful" : "Minimal & Clean",
    },
    {
      id: "tone",
      icon: MessageSquare,
      title: "Tone of Voice",
      description: "How your brand speaks",
      value: brandData.feelPlayfulSerious < 50 ? "Friendly & Approachable" : "Professional & Trustworthy",
    },
  ];

  return (
    <GlowingCard className="max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          This is your Brand DNA
        </h1>
        <p className="text-white/50 text-sm">
          It&apos;s how Crafted keeps everything you make consistent.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {dnaCards.map((card) => (
          <motion.div
            key={card.id}
            className="p-4 rounded-xl flex items-start gap-4"
            style={{ background: "rgba(40, 40, 40, 0.6)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#8bb58b]/20 flex items-center justify-center flex-shrink-0">
              <card.icon className="w-5 h-5 text-[#8bb58b]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm">{card.title}</h3>
              <p className="text-white/40 text-xs mt-0.5">{card.description}</p>
              {card.colors ? (
                <div className="flex gap-2 mt-2">
                  {card.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-lg"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-white/70 text-sm mt-1">{card.value}</p>
              )}
            </div>
            <button
              onClick={() => onAdjust(card.id)}
              className="text-white/40 hover:text-white text-xs underline underline-offset-2 transition-colors"
            >
              Adjust
            </button>
          </motion.div>
        ))}
      </div>

      <p className="text-white/30 text-xs text-center mb-6">
        Nothing here is locked. This evolves as you do.
      </p>

      <div className="flex gap-3">
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
          Looks right
          <Check className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </GlowingCard>
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
  const sliders = [
    {
      id: "feelPlayfulSerious",
      leftLabel: "More playful",
      rightLabel: "More serious",
      leftDesc: "Fun, friendly",
      rightDesc: "Professional",
    },
    {
      id: "feelBoldMinimal",
      leftLabel: "More bold",
      rightLabel: "More minimal",
      leftDesc: "Impactful",
      rightDesc: "Refined",
    },
    {
      id: "feelExperimentalClassic",
      leftLabel: "More experimental",
      rightLabel: "More classic",
      leftDesc: "Cutting-edge",
      rightDesc: "Timeless",
    },
  ];

  return (
    <GlowingCard>
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          Let&apos;s dial it in
        </h1>
        <p className="text-white/50 text-sm">
          These small tweaks help us match your taste.
        </p>
      </div>

      <div className="space-y-8 mb-8">
        {sliders.map((slider) => (
          <div key={slider.id} className="space-y-3">
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-white">{slider.leftLabel}</span>
                <span className="text-white/40 ml-2">{slider.leftDesc}</span>
              </div>
              <div className="text-right">
                <span className="text-white/40 mr-2">{slider.rightDesc}</span>
                <span className="text-white">{slider.rightLabel}</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={brandData[slider.id as keyof BrandData] as number}
              onChange={(e) => setBrandData({ ...brandData, [slider.id]: parseInt(e.target.value) })}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#8bb58b] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
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
          Save & continue
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
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
    <GlowingCard>
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          What do you want to improve first?
        </h1>
        <p className="text-white/50 text-sm">
          Pick what matters right now. You can always add more later.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {CREATIVE_FOCUS_OPTIONS.map((option) => {
          const isSelected = brandData.creativeFocus.includes(option.id);
          const Icon = iconMap[option.id] || Zap;

          return (
            <button
              key={option.id}
              onClick={() => toggleFocus(option.id)}
              className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                isSelected ? "bg-[#8bb58b]/20 border-[#8bb58b]/50" : "hover:bg-white/5"
              }`}
              style={{
                border: isSelected ? "1px solid rgba(139, 181, 139, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-[#8bb58b] text-black" : "bg-white/10 text-white/50"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium text-sm">{option.title}</h3>
                <p className="text-white/40 text-xs">{option.description}</p>
              </div>
              {isSelected && <Check className="w-5 h-5 text-[#8bb58b]" />}
            </button>
          );
        })}
      </div>

      <p className="text-white/30 text-xs text-center mb-6">
        Most teams start with 1–3.
      </p>

      <div className="flex gap-3">
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
      </div>
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
  return (
    <GlowingCard>
      <div className="text-center">
        <motion.div
          className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center bg-[#8bb58b]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Check className="w-10 h-10 text-black" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          You&apos;re all set
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Crafted now understands your brand — and will protect it as you create.
        </p>

        <div className="space-y-4 mb-8 text-left">
          <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(40, 40, 40, 0.6)" }}>
            <div className="w-10 h-10 rounded-lg bg-[#8bb58b]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#8bb58b]" />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Your Brand DNA</h3>
              <p className="text-white/40 text-xs">{brandData.name} • {brandData.industry || "Ready to go"}</p>
            </div>
          </div>

          {brandData.creativeFocus.length > 0 && (
            <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(40, 40, 40, 0.6)" }}>
              <div className="w-10 h-10 rounded-lg bg-[#8bb58b]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#8bb58b]" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Focus Areas</h3>
                <p className="text-white/40 text-xs">
                  {brandData.creativeFocus.length} area{brandData.creativeFocus.length > 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(40, 40, 40, 0.6)" }}>
            <div className="w-10 h-10 rounded-lg bg-[#8bb58b]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#8bb58b]" />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Available Credits</h3>
              <p className="text-white/40 text-xs">Ready to create your first asset</p>
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-4 rounded-xl font-medium text-sm"
          style={{ background: "#f5f5f0", color: "#1a1a1a" }}
        >
          Create your first asset
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
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
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);

  const toggleAudience = (id: string) => {
    const newAudiences = selectedAudiences.includes(id)
      ? selectedAudiences.filter((a) => a !== id)
      : [...selectedAudiences, id];
    setSelectedAudiences(newAudiences);
    setBrandData({ ...brandData, targetAudience: newAudiences.join(", ") });
  };

  return (
    <GlowingCard className="max-w-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          First, tell us what you&apos;re building
        </h1>
        <p className="text-white/50 text-sm">
          This helps us design a brand that actually fits.
        </p>
      </div>

      <div className="space-y-6">
        {/* Product Type */}
        <div className="space-y-3">
          <label className="text-white/70 text-sm font-medium">What are you building?</label>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setBrandData({ ...brandData, productType: type.id })}
                className={`p-3 rounded-xl text-left transition-all ${
                  brandData.productType === type.id
                    ? "bg-[#8bb58b]/20 border-[#8bb58b]/50"
                    : "hover:bg-white/5"
                }`}
                style={{
                  border: brandData.productType === type.id
                    ? "1px solid rgba(139, 181, 139, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <span className="text-white text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <label className="text-white/70 text-sm font-medium">What&apos;s the product or company called?</label>
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: "rgba(40, 40, 40, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <input
              type="text"
              value={brandData.name}
              onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
              className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none"
              placeholder="If undecided, that's okay"
            />
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-3">
          <label className="text-white/70 text-sm font-medium">Who is this for?</label>
          <div className="flex flex-wrap gap-2">
            {TARGET_AUDIENCES.map((audience) => (
              <button
                key={audience.id}
                onClick={() => toggleAudience(audience.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedAudiences.includes(audience.id)
                    ? "bg-[#8bb58b]/20 text-[#8bb58b] border-[#8bb58b]/50"
                    : "text-white/70 hover:bg-white/5"
                }`}
                style={{
                  border: selectedAudiences.includes(audience.id)
                    ? "1px solid rgba(139, 181, 139, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                {audience.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
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
          Continue
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
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
  const getSliderLabel = (value: number, dimension: string) => {
    if (dimension === "feelPlayfulSerious") {
      if (value < 30) return "Startup energy";
      if (value > 70) return "Established confidence";
      return "Balanced approach";
    }
    if (dimension === "feelBoldMinimal") {
      if (value < 30) return "Design-forward";
      if (value > 70) return "Enterprise-ready";
      return "Versatile style";
    }
    if (dimension === "feelFriendlyProfessional") {
      if (value < 30) return "Community-first";
      if (value > 70) return "Business-focused";
      return "Approachable yet capable";
    }
    if (dimension === "feelExperimentalClassic") {
      if (value < 30) return "Innovation-driven";
      if (value > 70) return "Trust-building";
      return "Modern classic";
    }
    if (dimension === "feelPremiumAccessible") {
      if (value < 30) return "Luxury positioning";
      if (value > 70) return "Mass appeal";
      return "Premium quality";
    }
    return "";
  };

  const sliders = [
    { id: "feelPlayfulSerious", left: "Playful", right: "Serious" },
    { id: "feelBoldMinimal", left: "Bold", right: "Minimal" },
    { id: "feelFriendlyProfessional", left: "Friendly", right: "Professional" },
    { id: "feelExperimentalClassic", left: "Experimental", right: "Trusted" },
    { id: "feelPremiumAccessible", left: "Premium", right: "Accessible" },
  ];

  return (
    <GlowingCard className="max-w-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          How should your brand feel?
        </h1>
        <p className="text-white/50 text-sm">
          There are no right answers. Trust your instinct.
        </p>
      </div>

      <div className="space-y-6">
        {sliders.map((slider) => {
          const value = brandData[slider.id as keyof BrandData] as number;
          return (
            <div key={slider.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">{slider.left}</span>
                <span className="text-[#8bb58b] text-xs">{getSliderLabel(value, slider.id)}</span>
                <span className="text-white/70 text-sm">{slider.right}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setBrandData({ ...brandData, [slider.id]: parseInt(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#8bb58b] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-8">
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
          Continue
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
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
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
          </div>
        );
      case "dark":
        return (
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-800" />
          </div>
        );
      case "text-heavy":
        return (
          <div className="w-full h-32 rounded-xl bg-white p-4 flex flex-col justify-center gap-2">
            <div className="h-3 bg-gray-800 rounded w-3/4" />
            <div className="h-2 bg-gray-400 rounded w-full" />
            <div className="h-2 bg-gray-400 rounded w-2/3" />
            <div className="h-2 bg-gray-400 rounded w-5/6" />
          </div>
        );
      case "visual":
        return (
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-[#8bb58b] to-[#4a7c4a] flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/80" />
          </div>
        );
      case "structured":
        return (
          <div className="w-full h-32 rounded-xl bg-white p-3 grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded" />
            ))}
          </div>
        );
      case "expressive":
        return (
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 relative overflow-hidden">
            <div className="absolute top-2 left-4 w-8 h-8 rounded-full bg-white/30 -rotate-12" />
            <div className="absolute bottom-4 right-2 w-12 h-12 rounded-full bg-white/20 rotate-45" />
          </div>
        );
      case "calm":
        return (
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="w-20 h-1 bg-blue-300 rounded" />
          </div>
        );
      case "energetic":
        return (
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-yellow-400 to-red-500 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-2 bg-white rounded-full`} style={{ height: `${20 + Math.random() * 60}%` }} />
            ))}
          </div>
        );
      case "minimal":
        return (
          <div className="w-full h-32 rounded-xl bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-900 rounded-full" />
          </div>
        );
      case "dense":
        return (
          <div className="w-full h-32 rounded-xl bg-gray-900 p-2 grid grid-cols-4 gap-1">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-700 to-gray-800 rounded" />
            ))}
          </div>
        );
      case "geometric":
        return (
          <div className="w-full h-32 rounded-xl bg-white flex items-center justify-center gap-2">
            <div className="w-10 h-10 bg-gray-900" />
            <div className="w-10 h-10 bg-gray-900 rotate-45" />
            <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[34px] border-l-transparent border-r-transparent border-b-gray-900" />
          </div>
        );
      case "organic":
        return (
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <div className="w-16 h-12 bg-green-400 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]" />
          </div>
        );
      default:
        return <div className="w-full h-32 rounded-xl bg-gray-200" />;
    }
  };

  return (
    <GlowingCard className="max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          What feels right to you?
        </h1>
        <p className="text-white/50 text-sm">
          Don&apos;t overthink it. Go with your first reaction.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-8 justify-center">
        {VISUAL_COMPARISON_PAIRS.map((_, i) => (
          <div
            key={i}
            className={`h-1 w-8 rounded-full transition-all ${
              i < currentPairIndex ? "bg-[#8bb58b]" : i === currentPairIndex ? "bg-white/50" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => handleChoice("A")}
          className="group p-4 rounded-2xl transition-all hover:scale-[1.02] hover:bg-white/5"
          style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          {getVisualComponent(currentPair.optionA.visual)}
          <div className="mt-4 text-left">
            <h3 className="text-white font-medium">{currentPair.optionA.label}</h3>
            <p className="text-white/40 text-sm">{currentPair.optionA.description}</p>
          </div>
        </button>

        <button
          onClick={() => handleChoice("B")}
          className="group p-4 rounded-2xl transition-all hover:scale-[1.02] hover:bg-white/5"
          style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          {getVisualComponent(currentPair.optionB.visual)}
          <div className="mt-4 text-left">
            <h3 className="text-white font-medium">{currentPair.optionB.label}</h3>
            <p className="text-white/40 text-sm">{currentPair.optionB.description}</p>
          </div>
        </button>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="py-3 px-6 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={onContinue}
          className="py-3 px-6 rounded-xl font-medium text-sm text-white/50 hover:text-white transition-colors"
        >
          Skip this step
        </button>
      </div>
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
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          One last thing
        </h1>
        <p className="text-white/50 text-sm">
          What should people immediately understand when they see your brand?
        </p>
      </div>

      <div className="space-y-6">
        <div
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
        </div>

        <div className="space-y-2">
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
        </div>
      </div>

      <div className="flex gap-3 mt-8">
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
      </div>

      <button
        onClick={onContinue}
        className="w-full mt-3 py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
      >
        Skip this step
      </button>
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
        <div className="text-center">
          <motion.div
            className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center"
            style={{ background: "rgba(139, 181, 139, 0.2)" }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-10 h-10 text-[#8bb58b]" />
          </motion.div>

          <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            Generating brand directions
          </h1>
          <p className="text-white/50 text-sm">
            Creating personalized options based on your preferences...
          </p>
        </div>
      </GlowingCard>
    );
  }

  return (
    <GlowingCard className="max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl text-white mb-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          Here are a few directions we&apos;d explore
        </h1>
        <p className="text-white/50 text-sm">
          These aren&apos;t final — they&apos;re starting points.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {directions.map((direction) => (
          <button
            key={direction.id}
            onClick={() => onSelectDirection(direction)}
            className={`w-full p-6 rounded-2xl text-left transition-all ${
              selectedDirection?.id === direction.id
                ? "bg-[#8bb58b]/20 border-[#8bb58b]/50"
                : "hover:bg-white/5"
            }`}
            style={{
              border: selectedDirection?.id === direction.id
                ? "1px solid rgba(139, 181, 139, 0.5)"
                : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex gap-1 flex-shrink-0">
                {direction.colorPalette.slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium mb-1">{direction.name}</h3>
                <p className="text-white/50 text-sm mb-3">{direction.narrative}</p>
                <div className="flex flex-wrap gap-2">
                  {direction.moodKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-0.5 rounded-full text-xs text-white/40 bg-white/5"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              {selectedDirection?.id === direction.id && (
                <Check className="w-5 h-5 text-[#8bb58b] flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedDirection}
          className="flex-1 py-4 rounded-xl font-medium text-sm disabled:opacity-40"
          style={{ background: "#f5f5f0", color: "#1a1a1a" }}
        >
          Use this direction
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
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
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [brandDirections, setBrandDirections] = useState<BrandDirection[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<BrandDirection | null>(null);
  const [isGeneratingDirections, setIsGeneratingDirections] = useState(false);

  const scanningTexts = [
    "Studying colors and type",
    "Reading tone and language",
    "Noticing layout patterns",
    "Learning your visual style",
  ];

  // Handle redirects
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }

    const user = session?.user as { onboardingCompleted?: boolean; role?: string } | undefined;
    if (user?.onboardingCompleted) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  // File upload handler
  const handleFileUpload = async (files: FileList) => {
    setIsLoading(true);
    const newFiles: { name: string; url: string; type: string }[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "brand-assets");

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          newFiles.push({
            name: file.name,
            url: result.data.file.fileUrl,
            type: file.type,
          });
        }
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    setBrandData({
      ...brandData,
      brandAssets: [...brandData.brandAssets, ...newFiles.map((f) => f.url)],
    });
    setIsLoading(false);
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setBrandData({
      ...brandData,
      brandAssets: newFiles.map((f) => f.url),
    });
  };

  // Brand extraction
  const handleBrandExtraction = async () => {
    if (!websiteUrl.trim() && uploadedFiles.length === 0) return;

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
        narrative: `This direction feels confident and modern, designed for ${brandData.targetAudience || "your audience"} who value clarity and speed.`,
        colorPalette: ["#1a1a1a", "#3b82f6", "#f5f5f5", "#64748b"],
        typographyStyle: "modern",
        visualStyle: "Clean, geometric, with bold accents",
        moodKeywords: ["Professional", "Trustworthy", "Modern", "Clean"],
      },
      {
        id: "2",
        name: "Warm Innovation",
        narrative: "A friendly, approachable feel that balances warmth with innovation. Perfect for building trust while staying current.",
        colorPalette: ["#f97316", "#fbbf24", "#1f2937", "#f5f5f4"],
        typographyStyle: "bold",
        visualStyle: "Rounded, warm, inviting",
        moodKeywords: ["Friendly", "Innovative", "Approachable", "Dynamic"],
      },
      {
        id: "3",
        name: "Refined Elegance",
        narrative: "Sophisticated and premium, this direction communicates quality and attention to detail.",
        colorPalette: ["#18181b", "#a78bfa", "#fafaf9", "#78716c"],
        typographyStyle: "elegant",
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
    router.push("/dashboard");
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
    <div
      className="min-h-screen relative flex items-center"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        backgroundColor: "#0a0a0a",
      }}
    >
      <FloatingBlobs />
      <ParticleDots />
      <Header userEmail={userEmail} />

      <main className="relative z-10 w-full px-4 py-24 ml-[10%]">
        {/* Progress indicator for non-welcome steps */}
        {step !== "welcome" && step !== "scanning" && step !== "brand-ready" && step !== "complete" && (
          <div className="max-w-xl mb-6">
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
                uploadedFiles={uploadedFiles}
                onFileUpload={handleFileUpload}
                onRemoveFile={removeFile}
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
                onBack={() => setStep("fine-tune")}
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
                onContinue={() => setStep("tone-of-voice")}
                onBack={() => setStep("brand-personality")}
              />
            </motion.div>
          )}

          {step === "tone-of-voice" && (
            <motion.div key="tone-of-voice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ToneOfVoiceStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={generateBrandDirections}
                onBack={() => setStep("visual-instinct")}
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
                  });
                }}
                onContinue={() => setStep("fine-tune")}
                onBack={() => setStep("tone-of-voice")}
                isGenerating={isGeneratingDirections}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Right side - space for animation */}
      <div className="relative z-10 flex-1 h-full">
        {/* Animation placeholder */}
      </div>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/30">
        <p>&copy; {new Date().getFullYear()} Crafted Studio. All rights reserved.</p>
      </footer>
    </div>
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
