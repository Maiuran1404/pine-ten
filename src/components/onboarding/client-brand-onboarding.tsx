"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface ClientBrandOnboardingProps {
  onComplete: () => void;
}

interface BrandData {
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
}

type OnboardingStep = "brand-input" | "scanning" | "company-info" | "brand-colors" | "complete";

const STEP_CONFIG = [
  { id: "brand-input", label: "Brand" },
  { id: "company-info", label: "Company" },
  { id: "brand-colors", label: "Colors" },
  { id: "complete", label: "Done" },
] as const;

const defaultBrandData: BrandData = {
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
};

const industries = [
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

// Decorative curved lines component
function DecorativeLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 600 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <line x1="0" y1="250" x2="600" y2="250" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" />
      <line x1="0" y1="620" x2="600" y2="620" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" />
      <path
        d="M 420 0 L 420 250 Q 420 420 250 420 Q 80 420 80 590 L 80 620"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        fill="none"
      />
    </svg>
  );
}

// Grainy texture overlay
function GrainOverlay() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter2)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.25,
          mixBlendMode: "soft-light",
        }}
      />
    </>
  );
}

// Segmented Progress Bar Component
function SegmentedProgress({
  currentStep,
  steps
}: {
  currentStep: OnboardingStep;
  steps: typeof STEP_CONFIG;
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex gap-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-300",
            index <= currentIndex
              ? "bg-foreground"
              : "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

export function ClientBrandOnboarding({ onComplete }: ClientBrandOnboardingProps) {
  const { refetch: refetchSession } = useSession();
  const [step, setStep] = useState<OnboardingStep>("brand-input");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandData, setBrandData] = useState<BrandData>(defaultBrandData);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [hasScannedWebsite, setHasScannedWebsite] = useState(false);

  // Animate scanning progress
  useEffect(() => {
    if (step === "scanning" && isLoading) {
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [step, isLoading]);

  const handleWebsiteScan = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    setStep("scanning");
    setIsLoading(true);
    setScanError(null);
    setScanProgress(0);

    try {
      const response = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to scan website");
      }

      setScanProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setBrandData({
        ...defaultBrandData,
        ...result.data,
        website: websiteUrl,
      });

      setHasScannedWebsite(true);
      setStep("company-info");
      toast.success("Brand information extracted!");
    } catch (error) {
      console.error("Scan error:", error);
      setScanError(error instanceof Error ? error.message : "Failed to scan website");
      toast.error("Failed to scan website. You can enter details manually.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFromBrandInput = () => {
    if (websiteUrl.trim()) {
      handleWebsiteScan();
    }
  };

  const handleSubmit = async () => {
    if (!brandData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

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
        throw new Error("Failed to complete onboarding");
      }

      setStep("complete");
      setIsLoading(false);

      refetchSession().catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Welcome aboard!");
      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleColorChange = (colorKey: keyof BrandData, value: string) => {
    setBrandData((prev) => ({ ...prev, [colorKey]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* Left side - Form content */}
      <div className="flex-1 flex flex-col bg-background overflow-y-auto">
        {/* Header with progress */}
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="px-6 sm:px-10 lg:px-16 py-4">
            {/* Segmented Progress Bar */}
            <SegmentedProgress currentStep={step} steps={STEP_CONFIG} />
          </div>
        </header>

        {/* Logo */}
        <div className="px-6 sm:px-10 lg:px-16 pt-8">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)" }}
            >
              C
            </div>
            <span className="font-semibold text-lg tracking-tight">Crafted</span>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 px-6 sm:px-10 lg:px-16 py-10">
          <div className="max-w-md">
            <AnimatePresence mode="wait">
              {/* Brand Input Step */}
              {step === "brand-input" && (
                <motion.div
                  key="brand-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Header */}
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Show us your brand
                    </h1>
                    <p className="text-muted-foreground">
                      Give us one thing — we&apos;ll take care of the rest.
                    </p>
                  </div>

                  {/* Website URL Input */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Paste your website URL
                    </Label>
                    <Input
                      placeholder="yourcompany.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleContinueFromBrandInput()}
                      className="h-12 text-base"
                    />
                  </div>

                  {/* CTA Button */}
                  <Button
                    size="lg"
                    onClick={handleContinueFromBrandInput}
                    disabled={!websiteUrl.trim()}
                    className="w-full h-12 font-semibold"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted-foreground/20" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-background px-4 text-muted-foreground">
                        or
                      </span>
                    </div>
                  </div>

                  {/* No website button */}
                  <button
                    onClick={() => setStep("company-info")}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    I don&apos;t have a website — <span className="underline underline-offset-4">Create my brand</span>
                  </button>
                </motion.div>
              )}

              {/* Scanning Step */}
              {step === "scanning" && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {scanError ? (
                    <>
                      <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                          Scan failed
                        </h1>
                        <p className="text-muted-foreground">
                          {scanError}
                        </p>
                      </div>

                      <div className="p-6 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                        <AlertCircle className="h-8 w-8 text-red-600 mb-4" />
                        <p className="text-sm text-muted-foreground">
                          We couldn&apos;t scan your website. You can try again or enter your brand details manually.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => { setScanError(null); setStep("brand-input"); }}
                          className="flex-1 h-12"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                        <Button
                          onClick={() => {
                            setBrandData({ ...defaultBrandData, website: websiteUrl });
                            setStep("company-info");
                          }}
                          className="flex-1 h-12"
                        >
                          Enter Manually
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                          Analyzing your website
                        </h1>
                        <p className="text-muted-foreground">
                          Our AI is extracting your brand identity.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-foreground rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${scanProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>

                        <div className="space-y-3">
                          {[
                            { threshold: 10, text: "Fetching website content" },
                            { threshold: 30, text: "Capturing visual elements" },
                            { threshold: 50, text: "Analyzing brand colors" },
                            { threshold: 70, text: "Extracting typography" },
                            { threshold: 90, text: "Building brand profile" },
                          ].map((item) => (
                            <div
                              key={item.text}
                              className={cn(
                                "flex items-center gap-3 text-sm transition-all duration-300",
                                scanProgress > item.threshold
                                  ? "text-foreground"
                                  : "text-muted-foreground/50"
                              )}
                            >
                              {scanProgress > item.threshold ? (
                                <CheckCircle2 className="h-5 w-5 text-teal-500 flex-shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                              )}
                              {item.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* Company Info Step */}
              {step === "company-info" && (
                <motion.div
                  key="company-info"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {hasScannedWebsite ? "Review your company" : "Tell us about your company"}
                    </h1>
                    <p className="text-muted-foreground">
                      {hasScannedWebsite
                        ? "We extracted this from your website. Feel free to edit."
                        : "Help our designers understand your business."}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Company name</Label>
                      <Input
                        placeholder="Acme Inc."
                        value={brandData.name}
                        onChange={(e) => setBrandData((prev) => ({ ...prev, name: e.target.value }))}
                        className="h-12 text-base"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Industry</Label>
                      <select
                        value={brandData.industry || ""}
                        onChange={(e) => setBrandData((prev) => ({ ...prev, industry: e.target.value }))}
                        className="w-full h-12 rounded-md border border-input bg-background px-3 text-base"
                      >
                        <option value="">Select industry</option>
                        {industries.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Description (optional)</Label>
                      <Textarea
                        placeholder="Brief description of your company..."
                        value={brandData.description}
                        onChange={(e) => setBrandData((prev) => ({ ...prev, description: e.target.value }))}
                        className="min-h-[100px] text-base resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("brand-input")}
                      className="h-12"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep("brand-colors")}
                      disabled={!brandData.name.trim()}
                      className="flex-1 h-12 font-semibold"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Brand Colors Step */}
              {step === "brand-colors" && (
                <motion.div
                  key="brand-colors"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {hasScannedWebsite ? "Review your brand colors" : "Set your brand colors"}
                    </h1>
                    <p className="text-muted-foreground">
                      {hasScannedWebsite
                        ? "We detected these colors. Adjust them if needed."
                        : "Choose colors that represent your brand."}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { key: "primaryColor", label: "Primary color", desc: "Main brand color" },
                      { key: "secondaryColor", label: "Secondary color", desc: "Supporting color" },
                      { key: "accentColor", label: "Accent color", desc: "Highlights & CTAs" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="space-y-3">
                        <div>
                          <Label className="text-sm font-semibold">{label}</Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            className="w-12 h-12 rounded-lg border-2 border-input cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                            style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || "#14b8a6" }}
                            onClick={() => document.getElementById(`${key}-picker`)?.click()}
                          />
                          <Input
                            value={(brandData[key as keyof BrandData] as string) || ""}
                            onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                            placeholder="#000000"
                            className="h-12 text-base font-mono"
                          />
                          <input
                            id={`${key}-picker`}
                            type="color"
                            value={(brandData[key as keyof BrandData] as string) || "#14b8a6"}
                            onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                            className="sr-only"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("company-info")}
                      className="h-12"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 h-12 font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <Check className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Complete Step */}
              {step === "complete" && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      You&apos;re all set!
                    </h1>
                    <p className="text-muted-foreground">
                      Your brand profile has been saved. Redirecting to dashboard...
                    </p>
                  </div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Check className="h-8 w-8 text-white" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 sm:px-10 lg:px-16 py-6 border-t mt-auto">
          <div className="max-w-md space-y-3">
            <p className="text-sm text-muted-foreground">
              You can continue anytime. We&apos;ve saved your progress.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
                Have questions? Contact us.
              </a>
            </div>
            <button className="text-sm text-muted-foreground hover:text-foreground font-medium">
              Log out
            </button>
          </div>
        </footer>
      </div>

      {/* Right side - Branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 0% 0%, #2dd4bf 0%, transparent 50%),
              radial-gradient(ellipse at 100% 30%, #3b82f6 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, #1e3a8a 0%, transparent 60%),
              radial-gradient(ellipse at 30% 70%, #4338ca 0%, transparent 50%),
              linear-gradient(180deg, #14b8a6 0%, #3b82f6 35%, #4338ca 65%, #1e3a8a 100%)
            `,
          }}
        />

        <GrainOverlay />
        <DecorativeLines />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div />

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Turn your ideas into stunning designs
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Connect with world-class designers who bring your vision to life. Fast, professional, and tailored to your needs.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white" />
              <div className="w-3 h-3 rounded-full bg-white/60" />
              <div className="w-3 h-3 rounded-full bg-white/40" />
              <div className="w-3 h-3 rounded-full bg-white/30" />
            </div>
            <span className="text-4xl font-light tracking-wide text-white">Crafted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
