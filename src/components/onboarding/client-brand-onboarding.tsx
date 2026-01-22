"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import { useSession, signOut } from "@/lib/auth-client";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Globe,
  Sparkles,
  Target,
  Layout,
  Share2,
  Presentation,
  BookOpen,
  Zap,
  Users,
  Building2,
  Briefcase,
  X,
  ChevronDown,
  ChevronUp,
  Linkedin,
  Instagram,
  Twitter,
} from "lucide-react";

import {
  type BrandData,
  type OnboardingStep,
  type InferredAudience,
  STEP_CONFIG,
  defaultBrandData,
  CREATIVE_FOCUS_OPTIONS,
  industries,
  getIndustryIcon,
  COLOR_PRESETS,
} from "./types";
import { SegmentedProgress } from "./segmented-progress";

interface ClientBrandOnboardingProps {
  onComplete: () => void;
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

  // Brand references state
  const [brandReferences, setBrandReferences] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string;
    toneBucket: string;
    densityBucket: string;
    colorBucket: string;
    energyBucket: string;
  }>>([]);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [detectedStyleName, setDetectedStyleName] = useState("Your Brand Style");

  // Fetch brand references based on slider values
  const fetchBrandReferences = useCallback(async () => {
    setIsLoadingReferences(true);
    try {
      const response = await fetch("/api/brand-references/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalTone: brandData.signalTone ?? 50,
          signalDensity: brandData.signalDensity ?? 50,
          signalWarmth: brandData.signalWarmth ?? 50,
          signalEnergy: brandData.signalEnergy ?? 50,
          limit: 12,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBrandReferences(data.references || []);

        // Determine style name based on buckets
        const { tone, energy } = data.buckets || {};
        if (tone === "playful" && energy === "bold") {
          setDetectedStyleName("Vibrant Bold");
        } else if (tone === "playful" && energy === "minimal") {
          setDetectedStyleName("Playful Minimal");
        } else if (tone === "serious" && energy === "bold") {
          setDetectedStyleName("Professional Impact");
        } else if (tone === "serious" && energy === "minimal") {
          setDetectedStyleName("Elegant Refined");
        } else if (tone === "balanced" && energy === "balanced") {
          setDetectedStyleName("Versatile Classic");
        } else if (tone === "playful") {
          setDetectedStyleName("Spirited Modern");
        } else if (tone === "serious") {
          setDetectedStyleName("Corporate Clean");
        } else if (energy === "bold") {
          setDetectedStyleName("Bold Statement");
        } else if (energy === "minimal") {
          setDetectedStyleName("Clean Minimal");
        } else {
          setDetectedStyleName("Your Brand Style");
        }
      }
    } catch {
      // Silently fail - brand references are enhancement only
    } finally {
      setIsLoadingReferences(false);
    }
  }, [brandData.signalTone, brandData.signalDensity, brandData.signalWarmth, brandData.signalEnergy]);

  // Fetch brand references when on fine-tune step and sliders change
  useEffect(() => {
    if (step === "fine-tune") {
      const debounceTimer = setTimeout(() => {
        fetchBrandReferences();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [step, fetchBrandReferences]);

  // Helper to get slider label based on value
  const getSliderLabel = (value: number, lowLabel: string, highLabel: string): string => {
    if (value < 35) return lowLabel;
    if (value > 65) return highLabel;
    return "Balanced";
  };

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

      // Await session refresh to ensure onboardingCompleted is updated before navigating
      await refetchSession();

      setStep("complete");
      setIsLoading(false);
      toast.success("Brand profile saved!");
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
          <div className="max-w-md lg:max-w-xl">
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

                    {/* Social Links Section - Only show if we found some */}
                    {hasScannedWebsite && (brandData.socialLinks?.linkedin || brandData.socialLinks?.instagram || brandData.socialLinks?.twitter) && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Share2 className="h-4 w-4" />
                          Social profiles found
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {brandData.socialLinks?.linkedin && (
                            <a
                              href={brandData.socialLinks.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors text-sm font-medium"
                            >
                              <Linkedin className="h-4 w-4" />
                              LinkedIn
                              <CheckCircle2 className="h-3 w-3" />
                            </a>
                          )}
                          {brandData.socialLinks?.instagram && (
                            <a
                              href={brandData.socialLinks.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors text-sm font-medium"
                            >
                              <Instagram className="h-4 w-4" />
                              Instagram
                              <CheckCircle2 className="h-3 w-3" />
                            </a>
                          )}
                          {brandData.socialLinks?.twitter && (
                            <a
                              href={brandData.socialLinks.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors text-sm font-medium"
                            >
                              <Twitter className="h-4 w-4" />
                              X / Twitter
                              <CheckCircle2 className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inferred Audiences Section - Only show if we have audiences */}
                    {hasScannedWebsite && brandData.audiences && brandData.audiences.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Target audiences we detected
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Based on your website, here&apos;s who we think you&apos;re targeting:
                        </p>
                        <div className="space-y-2">
                          {brandData.audiences.map((audience, index) => (
                            <div
                              key={index}
                              className={cn(
                                "p-4 rounded-xl border-2 transition-all",
                                audience.isPrimary
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border bg-background"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div
                                    className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                      audience.isPrimary ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {audience.firmographics?.jobTitles?.length ? (
                                      <Briefcase className="w-5 h-5" />
                                    ) : (
                                      <Users className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-foreground">{audience.name}</span>
                                      {audience.isPrimary && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-foreground text-background font-medium">
                                          Primary
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {audience.confidence}% confidence
                                      </span>
                                    </div>

                                    {/* Compact details */}
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {audience.firmographics?.jobTitles?.slice(0, 2).map((title, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                          {title}
                                        </span>
                                      ))}
                                      {audience.firmographics?.companySize?.slice(0, 1).map((size, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                          {size} employees
                                        </span>
                                      ))}
                                      {audience.behavioral?.buyingProcess && (
                                        <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground capitalize">
                                          {audience.behavioral.buyingProcess} purchase
                                        </span>
                                      )}
                                    </div>

                                    {/* Pain points preview */}
                                    {audience.psychographics?.painPoints && audience.psychographics.painPoints.length > 0 && (
                                      <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                                        Pain points: {audience.psychographics.painPoints.slice(0, 2).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Remove button */}
                                <button
                                  onClick={() => {
                                    setBrandData((prev) => ({
                                      ...prev,
                                      audiences: prev.audiences?.filter((_, i) => i !== index) || [],
                                    }));
                                  }}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Remove audience"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You can edit these later in your brand settings.
                        </p>
                      </div>
                    )}
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

                        {/* Content section */}
                        <div className="p-4 space-y-3">
                          {/* Placeholder content lines */}
                          <div className="space-y-2">
                            <div className="h-2.5 bg-gray-200 rounded-full w-3/4" />
                            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                          </div>

                          {/* CTA Buttons */}
                          <div className="flex gap-2 pt-1">
                            <div
                              className="h-7 px-3 rounded-lg flex items-center justify-center flex-1 transition-all duration-300"
                              style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            >
                              <span className="text-white text-[11px] font-medium">Get Started</span>
                            </div>
                            <div
                              className="h-7 px-3 rounded-lg flex items-center justify-center border-2 transition-all duration-300"
                              style={{ borderColor: brandData.primaryColor || "#14b8a6", color: brandData.primaryColor || "#14b8a6" }}
                            >
                              <span className="text-[11px] font-medium">Learn</span>
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
                      { key: "primaryColor", label: "Primary", defaultColor: "#14b8a6", presets: COLOR_PRESETS.primary },
                      { key: "secondaryColor", label: "Secondary", defaultColor: "#3b82f6", presets: COLOR_PRESETS.secondary },
                    ].map(({ key, label, defaultColor, presets }) => (
                      <Popover key={key}>
                        <PopoverTrigger asChild>
                          <button className="flex flex-col items-center gap-2 group cursor-pointer">
                            <div
                              className="w-16 h-16 rounded-2xl shadow-lg cursor-pointer group-hover:scale-105 transition-all duration-200 ring-4 ring-white"
                              style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || defaultColor }}
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

                            {/* Color Wheel Picker */}
                            <div className="relative">
                              <label
                                htmlFor={`${key}-wheel`}
                                className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border hover:border-foreground/50 cursor-pointer transition-colors group"
                              >
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                  {/* Rainbow gradient background */}
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background: "conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000)"
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium group-hover:text-foreground transition-colors">Pick from color wheel</div>
                                  <div className="text-xs text-muted-foreground">Choose any color</div>
                                </div>
                              </label>
                              <input
                                id={`${key}-wheel`}
                                type="color"
                                value={(brandData[key as keyof BrandData] as string) || defaultColor}
                                onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>

                            {/* Custom Hex Input */}
                            <div className="flex gap-2 items-center">
                              <div
                                className="w-10 h-10 rounded-lg border-2 border-input flex-shrink-0"
                                style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || defaultColor }}
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
                      onClick={() => setStep("fine-tune")}
                      className="flex-1 h-12 font-semibold cursor-pointer"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Fine-tune the Feel Step - Sliders with Brand Reference Preview */}
              {step === "fine-tune" && (
                <motion.div
                  key="fine-tune"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Let&apos;s dial it in
                    </h1>
                    <p className="text-muted-foreground">
                      Adjust these core signals to match your brand feel.
                    </p>
                  </div>

                  {/* Slider Controls */}
                  <div className="space-y-8">
                    {/* Tone Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Tone</Label>
                        <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          {getSliderLabel(brandData.signalTone ?? 50, "Serious", "Spirited")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Serious</span>
                          <span>Playful</span>
                        </div>
                        <Slider
                          value={[brandData.signalTone ?? 50]}
                          onValueChange={([value]) =>
                            setBrandData((prev) => ({ ...prev, signalTone: value }))
                          }
                          max={100}
                          step={1}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Visual Density Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Visual Density</Label>
                        <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          {getSliderLabel(brandData.signalDensity ?? 50, "Clean", "Rich")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Minimal</span>
                          <span>Rich</span>
                        </div>
                        <Slider
                          value={[brandData.signalDensity ?? 50]}
                          onValueChange={([value]) =>
                            setBrandData((prev) => ({ ...prev, signalDensity: value }))
                          }
                          max={100}
                          step={1}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Warmth Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Warmth</Label>
                        <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          {getSliderLabel(brandData.signalWarmth ?? 50, "Cool", "Warm")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cold</span>
                          <span>Warm</span>
                        </div>
                        <Slider
                          value={[brandData.signalWarmth ?? 50]}
                          onValueChange={([value]) =>
                            setBrandData((prev) => ({ ...prev, signalWarmth: value }))
                          }
                          max={100}
                          step={1}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Energy Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Energy</Label>
                        <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          {getSliderLabel(brandData.signalEnergy ?? 50, "Calm", "Energetic")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Calm</span>
                          <span>Energetic</span>
                        </div>
                        <Slider
                          value={[brandData.signalEnergy ?? 50]}
                          onValueChange={([value]) =>
                            setBrandData((prev) => ({ ...prev, signalEnergy: value }))
                          }
                          max={100}
                          step={1}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("brand-colors")}
                      className="h-12 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep("creative-focus")}
                      className="flex-1 h-12 font-semibold cursor-pointer"
                    >
                      Save & continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Creative Focus Step */}
              {step === "creative-focus" && (
                <motion.div
                  key="creative-focus"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      What do you want to improve first?
                    </h1>
                    <p className="text-muted-foreground">
                      Pick what matters right now. You can always add more later.
                    </p>
                  </div>

                  {/* Creative Focus Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CREATIVE_FOCUS_OPTIONS.map((option) => {
                      const isSelected = brandData.creativeFocus.includes(option.id);
                      const IconComponent = {
                        "ads": Target,
                        "landing-pages": Layout,
                        "social": Share2,
                        "pitch-decks": Presentation,
                        "brand-guidelines": BookOpen,
                      }[option.id] || Zap;

                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            setBrandData((prev) => ({
                              ...prev,
                              creativeFocus: isSelected
                                ? prev.creativeFocus.filter((id) => id !== option.id)
                                : [...prev.creativeFocus, option.id],
                            }));
                          }}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-4",
                            isSelected
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:border-foreground/50 bg-background"
                          )}
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                              isSelected ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                            )}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{option.title}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Most teams start with 1–3.
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("fine-tune")}
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
                          Continue
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Complete Step - Brand Ready */}
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
                      You&apos;re all set
                    </h1>
                    <p className="text-muted-foreground">
                      Crafted now understands your brand — and will protect it as you create.
                    </p>
                  </div>

                  {/* Summary Items */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Your Brand DNA</p>
                        <p className="text-sm text-muted-foreground">{brandData.name} • {brandData.industry || "Brand profile saved"}</p>
                      </div>
                    </div>

                    {brandData.creativeFocus.length > 0 && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                          <Target className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">What you want to focus on</p>
                          <p className="text-sm text-muted-foreground">
                            {brandData.creativeFocus.length} area{brandData.creativeFocus.length > 1 ? "s" : ""} selected
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Available credits</p>
                        <p className="text-sm text-muted-foreground">Ready to create your first asset</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={onComplete}
                    className="w-full h-12 font-semibold cursor-pointer"
                  >
                    Create your first asset
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
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
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
              className="text-sm text-muted-foreground hover:text-foreground font-medium cursor-pointer"
            >
              Log out
            </button>
          </div>
        </footer>
      </div>

      {/* Right side - Subtle preview panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-muted">
        {/* Dynamic Content based on step */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 w-full">
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
                    className="w-32 h-32 rounded-3xl bg-background border border-border shadow-lg flex items-center justify-center mx-auto"
                    animate={{
                      boxShadow: ["0 4px 20px rgba(0,0,0,0.08)", "0 8px 30px rgba(0,0,0,0.12)", "0 4px 20px rgba(0,0,0,0.08)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Globe className="w-16 h-16 text-muted-foreground/60" />
                  </motion.div>
                </div>
                <div className="space-y-3 max-w-sm">
                  <h2 className="text-2xl font-bold text-foreground">Your brand starts here</h2>
                  <p className="text-muted-foreground">
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
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/30" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/20" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/20" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/30" />
                  </motion.div>

                  {/* Center building icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="w-24 h-24 rounded-2xl bg-background border border-border shadow-lg flex items-center justify-center"
                      animate={{
                        scale: [1, 1.05, 1],
                        boxShadow: ["0 4px 20px rgba(0,0,0,0.08)", "0 8px 30px rgba(0,0,0,0.15)", "0 4px 20px rgba(0,0,0,0.08)"]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-12 h-12 text-primary/70" />
                    </motion.div>
                  </div>

                  {/* Floating particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-primary/40"
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
                  <h2 className="text-2xl font-bold text-foreground">Building your brand</h2>
                  <p className="text-muted-foreground">
                    Analyzing colors, typography, and visual identity...
                  </p>
                  <div className="w-48 h-1.5 bg-border rounded-full mx-auto overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
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
                  className="bg-background rounded-3xl border border-border shadow-xl overflow-hidden"
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
                      className="w-20 h-20 rounded-2xl bg-background shadow-xl border border-border flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      {brandData.industry ? (
                        (() => {
                          const IconComponent = getIndustryIcon(brandData.industry);
                          return <IconComponent className="w-10 h-10 text-foreground" />;
                        })()
                      ) : (
                        <span className="text-3xl font-bold text-foreground">
                          {brandData.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </motion.div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 pt-4 space-y-4">
                    <div>
                      <motion.h3
                        className="text-xl font-bold text-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        key={brandData.name}
                      >
                        {brandData.name || "Your Company"}
                      </motion.h3>
                      {brandData.industry && (
                        <motion.p
                          className="text-muted-foreground text-sm mt-1"
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
                        className="text-muted-foreground text-sm line-clamp-3"
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
                        className="flex items-center gap-2 text-muted-foreground text-sm"
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
                  className="text-center text-muted-foreground text-sm mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Preview of your brand card
                </motion.p>
              </motion.div>
            )}

            {/* Brand Colors Step - Simple color preview */}
            {step === "brand-colors" && (
              <motion.div
                key="preview-colors"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                {/* Color circles display */}
                <div className="flex items-center justify-center gap-6">
                  <motion.div
                    className="w-28 h-28 rounded-full shadow-xl"
                    style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                    animate={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="w-28 h-28 rounded-full shadow-xl"
                    style={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                    animate={{ backgroundColor: brandData.secondaryColor || "#3b82f6" }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Company name with brand color */}
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-foreground">{brandData.name || "Your Brand"}</h2>
                  <p className="text-muted-foreground text-sm">Your brand colors</p>
                </div>
              </motion.div>
            )}

            {/* Fine-tune Step - Brand Reference Masonry Grid */}
            {step === "fine-tune" && (
              <motion.div
                key="preview-fine-tune"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full flex flex-col items-center justify-center h-full"
              >
                {/* Brand Reference Masonry Grid */}
                {brandReferences.length > 0 ? (
                  <div className="space-y-6 w-full max-w-2xl">
                    {/* Masonry Grid - 4 columns */}
                    <div className="grid grid-cols-4 gap-3">
                      {brandReferences.slice(0, 12).map((ref, index) => {
                        // Create varying heights for masonry effect
                        const heights = ["h-24", "h-32", "h-28", "h-36", "h-24", "h-32"];
                        const heightClass = heights[index % heights.length];

                        return (
                          <motion.div
                            key={ref.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "rounded-xl overflow-hidden bg-muted/50",
                              heightClass
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ref.imageUrl}
                              alt={ref.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://via.placeholder.com/200x200?text=Brand";
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Style Name Label */}
                    <motion.div
                      className="text-center space-y-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h3 className="text-2xl font-semibold text-foreground">
                        {detectedStyleName}
                      </h3>
                      {brandReferences.length > 0 && (
                        <p className="text-muted-foreground text-sm">
                          Similar to{" "}
                          {brandReferences.slice(0, 3).map((r, i) => (
                            <span key={r.id}>
                              <span className="text-foreground">{r.name}</span>
                              {i < Math.min(brandReferences.length - 1, 2) ? ", " : ""}
                            </span>
                          ))}
                        </p>
                      )}
                    </motion.div>
                  </div>
                ) : (
                  /* Loading State or Empty State */
                  <div className="text-center space-y-4">
                    {isLoadingReferences ? (
                      <>
                        <LoadingSpinner size="lg" />
                        <p className="text-muted-foreground">Finding matching styles...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                          <Sparkles className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {detectedStyleName}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            Adjust the sliders to see matching brand styles
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Creative Focus Step - Focus areas preview */}
            {step === "creative-focus" && (
              <motion.div
                key="preview-creative-focus"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
              >
                <motion.div
                  className="bg-background rounded-3xl border border-border shadow-xl p-8 space-y-6"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Your focus areas</h3>
                    <p className="text-sm text-muted-foreground">
                      {brandData.creativeFocus.length > 0
                        ? `${brandData.creativeFocus.length} selected`
                        : "Select what matters most"}
                    </p>
                  </div>

                  {/* Selected focus items */}
                  <div className="space-y-3">
                    {brandData.creativeFocus.length > 0 ? (
                      brandData.creativeFocus.map((focusId) => {
                        const option = CREATIVE_FOCUS_OPTIONS.find((o) => o.id === focusId);
                        const IconComponent = {
                          "ads": Target,
                          "landing-pages": Layout,
                          "social": Share2,
                          "pitch-decks": Presentation,
                          "brand-guidelines": BookOpen,
                        }[focusId] || Zap;

                        return (
                          <motion.div
                            key={focusId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5"
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                            >
                              <IconComponent className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{option?.title}</span>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Select focus areas to see them here
                      </div>
                    )}
                  </div>

                  {/* Brand footer */}
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: brandData.primaryColor || "#14b8a6" }}
                    >
                      <span className="text-white font-bold text-xs">
                        {brandData.name?.charAt(0)?.toUpperCase() || "C"}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{brandData.name || "Your Brand"}</span>
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
                  className="w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-lg"
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
                  <h2 className="text-2xl font-bold text-foreground">{brandData.name || "Your brand"} is ready!</h2>
                  <p className="text-muted-foreground">
                    Your brand profile has been saved. Get ready to create amazing designs.
                  </p>
                </div>

                {/* Mini brand summary */}
                <motion.div
                  className="bg-background border border-border shadow-lg rounded-xl p-4 max-w-xs mx-auto"
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
                      <p className="font-semibold text-foreground">{brandData.name}</p>
                      <p className="text-muted-foreground text-sm">{brandData.industry || "Your Company"}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
