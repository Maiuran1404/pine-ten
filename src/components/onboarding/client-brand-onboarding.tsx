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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Globe,
  Building2,
  ShoppingCart,
  Code,
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
  Sparkles,
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

// Industry icon mapping
const getIndustryIcon = (industry: string) => {
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
  // Get the progress index - scanning counts as having completed brand-input
  const getProgressIndex = () => {
    if (currentStep === "scanning") {
      // During scanning, brand-input is complete (index 0 filled)
      return 1;
    }
    const index = steps.findIndex(s => s.id === currentStep);
    return index >= 0 ? index : 0;
  };

  const currentIndex = getProgressIndex();

  return (
    <div className="flex gap-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-300",
            index < currentIndex
              ? "bg-foreground"
              : index === currentIndex
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
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");

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
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                      <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={industryOpen}
                            className="w-full h-12 justify-between text-base font-normal cursor-pointer"
                          >
                            {brandData.industry || "Select or type industry..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search or type industry..."
                              value={industrySearch}
                              onValueChange={setIndustrySearch}
                              className="h-11"
                            />
                            <CommandList>
                              <CommandEmpty>
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent cursor-pointer"
                                  onClick={() => {
                                    setBrandData((prev) => ({ ...prev, industry: industrySearch }));
                                    setIndustryOpen(false);
                                    setIndustrySearch("");
                                  }}
                                >
                                  Use &quot;{industrySearch}&quot;
                                </button>
                              </CommandEmpty>
                              <CommandGroup>
                                {industries
                                  .filter((ind) =>
                                    ind.toLowerCase().includes(industrySearch.toLowerCase())
                                  )
                                  .map((ind) => (
                                    <CommandItem
                                      key={ind}
                                      value={ind}
                                      onSelect={() => {
                                        setBrandData((prev) => ({ ...prev, industry: ind }));
                                        setIndustryOpen(false);
                                        setIndustrySearch("");
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          brandData.industry === ind ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {ind}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
                      Click on the colors below to customize your brand.
                    </p>
                  </div>

                  {/* Live Preview Card */}
                  <div className="relative">
                    <div
                      className="rounded-2xl p-5 transition-all duration-300"
                      style={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                    >
                      {/* Mock App UI Preview */}
                      <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                        {/* Header bar */}
                        <div
                          className="h-12 flex items-center justify-between px-4 transition-all duration-300"
                          style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {brandData.name?.charAt(0)?.toUpperCase() || "C"}
                              </span>
                            </div>
                            <span className="text-white font-semibold text-sm">
                              {brandData.name || "Your Company"}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-white/40" />
                            <div className="w-2 h-2 rounded-full bg-white/40" />
                            <div className="w-2 h-2 rounded-full bg-white/40" />
                          </div>
                        </div>

                        {/* Hero section */}
                        <div className="p-4 space-y-4">
                          {/* Headline */}
                          <div className="space-y-1">
                            <h3 className="font-bold text-gray-900 text-sm leading-tight">
                              {brandData.industry
                                ? `Welcome to ${brandData.name || "Your Company"}`
                                : "Welcome to your brand"}
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                              {brandData.description
                                ? brandData.description.slice(0, 80) + (brandData.description.length > 80 ? "..." : "")
                                : brandData.industry
                                  ? `Your trusted ${brandData.industry.toLowerCase()} partner`
                                  : "Your company description will appear here"}
                            </p>
                          </div>

                          {/* Stats or features based on industry */}
                          <div className="flex gap-2">
                            {(brandData.industry === "E-commerce" || brandData.industry === "SaaS") ? (
                              <>
                                <div className="flex-1 p-2 rounded-lg bg-gray-50 text-center">
                                  <div className="text-sm font-bold" style={{ color: brandData.primaryColor || "#14b8a6" }}>2.4k+</div>
                                  <div className="text-[10px] text-gray-500">Users</div>
                                </div>
                                <div className="flex-1 p-2 rounded-lg bg-gray-50 text-center">
                                  <div className="text-sm font-bold" style={{ color: brandData.primaryColor || "#14b8a6" }}>98%</div>
                                  <div className="text-[10px] text-gray-500">Satisfaction</div>
                                </div>
                                <div className="flex-1 p-2 rounded-lg bg-gray-50 text-center">
                                  <div className="text-sm font-bold" style={{ color: brandData.primaryColor || "#14b8a6" }}>24/7</div>
                                  <div className="text-[10px] text-gray-500">Support</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div
                                  className="w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center"
                                  style={{ backgroundColor: `${brandData.primaryColor || "#14b8a6"}20` }}
                                >
                                  <Check className="w-4 h-4" style={{ color: brandData.primaryColor || "#14b8a6" }} />
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-700">
                                    {brandData.industry || "Professional"} Excellence
                                  </div>
                                  <div className="text-[10px] text-gray-400">Trusted by thousands</div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* CTA Buttons */}
                          <div className="flex gap-2">
                            <div
                              className="h-8 px-4 rounded-lg flex items-center justify-center flex-1 transition-all duration-300"
                              style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            >
                              <span className="text-white text-xs font-medium">Get Started</span>
                            </div>
                            <div
                              className="h-8 px-4 rounded-lg flex items-center justify-center border-2 transition-all duration-300"
                              style={{ borderColor: brandData.primaryColor || "#14b8a6", color: brandData.primaryColor || "#14b8a6" }}
                            >
                              <span className="text-xs font-medium">Learn More</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Floating elements */}
                      <div
                        className="absolute -top-2 -right-2 w-14 h-14 rounded-full opacity-20 transition-all duration-300"
                        style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                      />
                      <div
                        className="absolute -bottom-3 -left-3 w-20 h-20 rounded-full opacity-10 transition-all duration-300"
                        style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                      />
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div className="flex gap-6 justify-center">
                    {[
                      { key: "primaryColor", label: "Primary", presets: ["#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#000000"] },
                      { key: "secondaryColor", label: "Secondary", presets: ["#3b82f6", "#1e3a8a", "#4338ca", "#7c3aed", "#be185d", "#9a3412", "#166534", "#155e75", "#334155", "#18181b"] },
                    ].map(({ key, label, presets }) => (
                      <Popover key={key}>
                        <PopoverTrigger asChild>
                          <button className="flex flex-col items-center gap-2 group cursor-pointer">
                            <div
                              className="w-16 h-16 rounded-2xl shadow-lg cursor-pointer group-hover:scale-105 transition-all duration-200 ring-4 ring-white"
                              style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || "#14b8a6" }}
                            />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4" align="center">
                          <div className="space-y-4">
                            <div className="text-sm font-medium">{label} color</div>

                            {/* Preset Colors Grid */}
                            <div className="grid grid-cols-5 gap-2">
                              {presets.map((color) => (
                                <button
                                  key={color}
                                  className={cn(
                                    "w-10 h-10 rounded-lg cursor-pointer hover:scale-110 transition-all duration-150 ring-offset-2",
                                    (brandData[key as keyof BrandData] as string) === color
                                      ? "ring-2 ring-foreground"
                                      : "ring-1 ring-border hover:ring-2 hover:ring-foreground/50"
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleColorChange(key as keyof BrandData, color)}
                                />
                              ))}
                            </div>

                            {/* Custom Color Input */}
                            <div className="flex gap-2 items-center">
                              <div
                                className="w-10 h-10 rounded-lg border-2 border-input flex-shrink-0"
                                style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || "#14b8a6" }}
                              />
                              <Input
                                value={(brandData[key as keyof BrandData] as string) || ""}
                                onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                                placeholder="#000000"
                                className="h-10 font-mono text-sm"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("company-info")}
                      className="h-12 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 h-12 font-semibold cursor-pointer"
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

      {/* Right side - Dynamic Branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden">
        {/* Dynamic Gradient background - changes based on brand colors */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: step === "brand-colors" || step === "complete"
              ? `
                radial-gradient(ellipse at 0% 0%, ${brandData.primaryColor}88 0%, transparent 50%),
                radial-gradient(ellipse at 100% 30%, ${brandData.secondaryColor}88 0%, transparent 50%),
                radial-gradient(ellipse at 50% 100%, ${brandData.secondaryColor}44 0%, transparent 60%),
                radial-gradient(ellipse at 30% 70%, ${brandData.primaryColor}66 0%, transparent 50%),
                linear-gradient(180deg, ${brandData.primaryColor} 0%, ${brandData.secondaryColor} 50%, ${brandData.primaryColor}88 100%)
              `
              : `
                radial-gradient(ellipse at 0% 0%, #2dd4bf 0%, transparent 50%),
                radial-gradient(ellipse at 100% 30%, #3b82f6 0%, transparent 50%),
                radial-gradient(ellipse at 50% 100%, #1e3a8a 0%, transparent 60%),
                radial-gradient(ellipse at 30% 70%, #4338ca 0%, transparent 50%),
                linear-gradient(180deg, #14b8a6 0%, #3b82f6 35%, #4338ca 65%, #1e3a8a 100%)
              `
          }}
          transition={{ duration: 0.7 }}
        />

        <GrainOverlay />
        <DecorativeLines />

        {/* Dynamic Content based on step */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full">
          <AnimatePresence mode="wait">
            {/* Brand Input Step - Welcome state */}
            {step === "brand-input" && (
              <motion.div
                key="preview-welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                <div className="relative">
                  <motion.div
                    className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto"
                    animate={{
                      boxShadow: ["0 0 0 0 rgba(255,255,255,0.2)", "0 0 0 20px rgba(255,255,255,0)", "0 0 0 0 rgba(255,255,255,0.2)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Globe className="w-16 h-16 text-white/80" />
                  </motion.div>
                </div>
                <div className="space-y-3 max-w-sm">
                  <h2 className="text-2xl font-bold">Your brand starts here</h2>
                  <p className="text-white/70">
                    Enter your website URL and we&apos;ll automatically extract your brand identity
                  </p>
                </div>
              </motion.div>
            )}

            {/* Scanning Step - Building animation */}
            {step === "scanning" && (
              <motion.div
                key="preview-scanning"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                {/* Animated building blocks */}
                <div className="relative w-48 h-48 mx-auto">
                  {/* Orbiting elements */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/40" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/30" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/30" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/40" />
                  </motion.div>

                  {/* Center building icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                      animate={{
                        scale: [1, 1.05, 1],
                        borderColor: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.2)"]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-12 h-12 text-white/80" />
                    </motion.div>
                  </div>

                  {/* Floating particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-white/40"
                      initial={{
                        x: Math.random() * 192 - 96,
                        y: Math.random() * 192 - 96,
                        opacity: 0
                      }}
                      animate={{
                        y: [0, Math.random() * -50 - 20],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: i * 0.3
                      }}
                      style={{ left: "50%", top: "50%" }}
                    />
                  ))}
                </div>

                <div className="space-y-3 max-w-sm">
                  <h2 className="text-2xl font-bold">Building your brand</h2>
                  <p className="text-white/70">
                    Analyzing colors, typography, and visual identity...
                  </p>
                  <div className="w-48 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Company Info Step - Show extracted brand */}
            {step === "company-info" && (
              <motion.div
                key="preview-company"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
              >
                {/* Brand Card */}
                <motion.div
                  className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {/* Card Header with gradient */}
                  <div
                    className="h-24 relative"
                    style={{
                      background: brandData.primaryColor
                        ? `linear-gradient(135deg, ${brandData.primaryColor}, ${brandData.secondaryColor || brandData.primaryColor})`
                        : 'linear-gradient(135deg, #14b8a6, #3b82f6)'
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                  </div>

                  {/* Company Icon */}
                  <div className="relative px-6 -mt-10">
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      {brandData.industry ? (
                        (() => {
                          const IconComponent = getIndustryIcon(brandData.industry);
                          return <IconComponent className="w-10 h-10 text-gray-700" />;
                        })()
                      ) : (
                        <span className="text-3xl font-bold text-gray-700">
                          {brandData.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </motion.div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 pt-4 space-y-4">
                    <div>
                      <motion.h3
                        className="text-xl font-bold text-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        key={brandData.name}
                      >
                        {brandData.name || "Your Company"}
                      </motion.h3>
                      {brandData.industry && (
                        <motion.p
                          className="text-white/60 text-sm mt-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          key={brandData.industry}
                        >
                          {brandData.industry}
                        </motion.p>
                      )}
                    </div>

                    {brandData.description && (
                      <motion.p
                        className="text-white/70 text-sm line-clamp-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        key={brandData.description}
                      >
                        {brandData.description}
                      </motion.p>
                    )}

                    {brandData.website && (
                      <motion.div
                        className="flex items-center gap-2 text-white/50 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Globe className="w-4 h-4" />
                        <span className="truncate">{brandData.website}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                <motion.p
                  className="text-center text-white/50 text-sm mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Preview of your brand card
                </motion.p>
              </motion.div>
            )}

            {/* Brand Colors Step - Live color preview */}
            {step === "brand-colors" && (
              <motion.div
                key="preview-colors"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
              >
                {/* Color-themed brand card */}
                <motion.div
                  className="rounded-3xl overflow-hidden shadow-2xl"
                  style={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                  animate={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6">
                    {/* Mini app preview */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                      {/* App header */}
                      <motion.div
                        className="h-12 flex items-center px-4 gap-3"
                        style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                        animate={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            {brandData.name?.charAt(0)?.toUpperCase() || "C"}
                          </span>
                        </div>
                        <span className="text-white font-semibold text-sm truncate">
                          {brandData.name || "Your Brand"}
                        </span>
                      </motion.div>

                      {/* App content */}
                      <div className="p-4 space-y-4">
                        {/* Content blocks */}
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                        </div>

                        {/* Colored elements */}
                        <div className="flex gap-2">
                          <motion.div
                            className="h-8 px-4 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            animate={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-white text-xs font-medium">Primary</span>
                          </motion.div>
                          <motion.div
                            className="h-8 px-4 rounded-lg flex items-center justify-center border-2"
                            style={{
                              borderColor: brandData.primaryColor || "#14b8a6",
                              color: brandData.primaryColor || "#14b8a6"
                            }}
                            animate={{
                              borderColor: brandData.primaryColor || "#14b8a6",
                              color: brandData.primaryColor || "#14b8a6"
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-xs font-medium">Secondary</span>
                          </motion.div>
                        </div>

                        {/* Color swatches */}
                        <div className="flex items-center gap-2 pt-2">
                          <motion.div
                            className="w-8 h-8 rounded-full shadow-md"
                            style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            animate={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            transition={{ duration: 0.3 }}
                          />
                          <motion.div
                            className="w-8 h-8 rounded-full shadow-md"
                            style={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                            animate={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                            transition={{ duration: 0.3 }}
                          />
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400">Your palette</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer text */}
                  <div className="px-6 pb-6">
                    <p className="text-white/70 text-sm text-center">
                      This is how your brand will look across the platform
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Complete Step - Success state */}
            {step === "complete" && (
              <motion.div
                key="preview-complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                {/* Success animation */}
                <motion.div
                  className="w-32 h-32 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Check className="w-16 h-16 text-white" />
                  </motion.div>
                </motion.div>

                <div className="space-y-3 max-w-sm">
                  <h2 className="text-2xl font-bold">{brandData.name || "Your brand"} is ready!</h2>
                  <p className="text-white/70">
                    Your brand profile has been saved. Get ready to create amazing designs.
                  </p>
                </div>

                {/* Mini brand summary */}
                <motion.div
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-xs mx-auto"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                    >
                      <span className="text-white font-bold">
                        {brandData.name?.charAt(0)?.toUpperCase() || "C"}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{brandData.name}</p>
                      <p className="text-white/60 text-sm">{brandData.industry || "Your Company"}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom branding - always visible */}
        <div className="absolute bottom-8 left-12 right-12 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-3 h-3 rounded-full"
                animate={{
                  backgroundColor: step === "brand-colors" || step === "complete"
                    ? brandData.primaryColor || "white"
                    : "white"
                }}
                transition={{ duration: 0.3 }}
              />
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
