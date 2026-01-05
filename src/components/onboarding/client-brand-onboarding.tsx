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
  Globe,
  Palette,
  Building2,
  Search,
  AlertCircle,
  Wand2,
  CheckCircle2,
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Link2,
  X,
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

type OnboardingStep = "welcome" | "website" | "scanning" | "brand-form" | "complete";

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

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

export function ClientBrandOnboarding({ onComplete }: ClientBrandOnboardingProps) {
  const { refetch: refetchSession } = useSession();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandData, setBrandData] = useState<BrandData>(defaultBrandData);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const steps: OnboardingStep[] = uploadedFiles.length > 0 && !websiteUrl.trim()
    ? ["welcome", "brand-form", "complete"]
    : ["welcome", "scanning", "brand-form", "complete"];

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

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

      setStep("brand-form");
      toast.success("Brand information extracted!");
    } catch (error) {
      console.error("Scan error:", error);
      setScanError(error instanceof Error ? error.message : "Failed to scan website");
      toast.error("Failed to scan website. You can enter details manually.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleContinue = () => {
    if (websiteUrl.trim()) {
      handleWebsiteScan();
    } else if (uploadedFiles.length > 0) {
      // Skip scanning, go directly to brand form
      setHasWebsite(false);
      setStep("brand-form");
    } else {
      toast.error("Please enter a website URL or upload brand assets");
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
            hasWebsite,
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

  const addBrandColor = (color: string) => {
    if (color && !brandData.brandColors.includes(color)) {
      setBrandData((prev) => ({
        ...prev,
        brandColors: [...prev.brandColors, color],
      }));
    }
  };

  const removeBrandColor = (index: number) => {
    setBrandData((prev) => ({
      ...prev,
      brandColors: prev.brandColors.filter((_, i) => i !== index),
    }));
  };

  // Gradient button style
  const gradientButtonStyle = {
    background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* Left side - Form content */}
      <div className="flex-1 flex flex-col bg-background overflow-y-auto">
        {/* Progress bar */}
        <div className="sticky top-0 z-10 bg-background">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {/* Welcome Step */}
              {step === "welcome" && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span>Brand Setup</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to Crafted Studio</h1>
                    <p className="text-muted-foreground text-lg">
                      Let&apos;s set up your brand so our designers can create stunning on-brand content for you.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {[
                      { icon: Globe, title: "Import from Website", desc: "We'll scan your site" },
                      { icon: Wand2, title: "AI-Powered Analysis", desc: "Extract colors & fonts" },
                      { icon: Zap, title: "Instant Setup", desc: "Ready in seconds" },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
                        <div className="p-2 rounded-lg bg-teal-500/10">
                          <item.icon className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setStep("website")}
                    className="w-full h-12 text-white border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    style={gradientButtonStyle}
                  >
                    Get Started
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Website Step */}
              {step === "website" && (
                <motion.div
                  key="website"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {hasWebsite === null ? (
                    <>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Do you have a website?</h2>
                        <p className="text-muted-foreground">We can automatically extract your brand identity</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <button
                          onClick={() => setHasWebsite(true)}
                          className="group p-6 rounded-xl border-2 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all text-left"
                        >
                          <Globe className="h-10 w-10 text-teal-600 mb-3" />
                          <p className="font-semibold mb-1">Yes, I have a website</p>
                          <p className="text-sm text-muted-foreground">We&apos;ll scan and extract your brand</p>
                        </button>

                        <button
                          onClick={() => {
                            setHasWebsite(false);
                            setStep("brand-form");
                          }}
                          className="group p-6 rounded-xl border-2 hover:border-muted-foreground hover:bg-muted/50 transition-all text-left"
                        >
                          <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="font-semibold mb-1">Not yet</p>
                          <p className="text-sm text-muted-foreground">I&apos;ll set up my brand manually</p>
                        </button>
                      </div>

                      <Button variant="ghost" onClick={() => setStep("welcome")} className="w-full">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Enter your website URL</h2>
                        <p className="text-muted-foreground">We&apos;ll scan it and extract your brand colors, fonts, and more</p>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="example.com"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleWebsiteScan()}
                            className="h-12 pl-12 text-lg"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setHasWebsite(null)} className="flex-1 h-12">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                          </Button>
                          <Button
                            onClick={handleWebsiteScan}
                            disabled={!websiteUrl.trim()}
                            className="flex-1 h-12 text-white border-0"
                            style={gradientButtonStyle}
                          >
                            Scan Website
                            <Search className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* Scanning Step */}
              {step === "scanning" && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 text-center"
                >
                  {scanError ? (
                    <>
                      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Scan Failed</h2>
                        <p className="text-muted-foreground">{scanError}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setScanError(null); setStep("website"); }} className="flex-1">
                          Try Again
                        </Button>
                        <Button
                          onClick={() => { setBrandData({ ...defaultBrandData, website: websiteUrl }); setStep("brand-form"); }}
                          className="flex-1 text-white border-0"
                          style={gradientButtonStyle}
                        >
                          Enter Manually
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 animate-ping" />
                        <div className="absolute inset-2 rounded-full border-4 border-blue-500/30 animate-ping delay-100" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
                            style={gradientButtonStyle}
                          >
                            <Wand2 className="h-7 w-7 text-white animate-pulse" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold mb-2">Analyzing your website</h2>
                        <p className="text-muted-foreground">Our AI is extracting your brand identity</p>
                      </div>

                      <div className="space-y-4 max-w-xs mx-auto">
                        <Progress value={scanProgress} className="h-2" />
                        <div className="space-y-2 text-left">
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
                                "flex items-center gap-2 text-sm transition-colors",
                                scanProgress > item.threshold ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              {scanProgress > item.threshold ? (
                                <CheckCircle2 className="h-4 w-4 text-teal-500" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
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

              {/* Brand Form Step */}
              {step === "brand-form" && (
                <motion.div
                  key="brand-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">{hasWebsite ? "Review your brand" : "Set up your brand"}</h2>
                    <p className="text-muted-foreground">
                      {hasWebsite ? "We extracted this from your website. Feel free to edit." : "Tell us about your brand to get started."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Company Info */}
                    <div className="p-4 rounded-xl border space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        <h3 className="font-semibold">Company Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label>Company Name *</Label>
                          <Input
                            placeholder="Acme Inc."
                            value={brandData.name}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, name: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Industry</Label>
                          <select
                            value={brandData.industry || ""}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, industry: e.target.value }))}
                            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                          >
                            <option value="">Select industry</option>
                            {industries.map((ind) => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Brief description of your company..."
                            value={brandData.description}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, description: e.target.value }))}
                            className="mt-1 min-h-[60px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="p-4 rounded-xl border space-y-4">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-teal-600" />
                        <h3 className="font-semibold">Brand Colors</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: "primaryColor", label: "Primary" },
                          { key: "secondaryColor", label: "Secondary" },
                          { key: "accentColor", label: "Accent" },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <Label className="text-xs">{label}</Label>
                            <div className="mt-1 flex gap-2">
                              <div
                                className="w-10 h-10 rounded-lg border cursor-pointer hover:scale-105 transition-transform"
                                style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || "#14b8a6" }}
                                onClick={() => document.getElementById(`${key}-picker`)?.click()}
                              />
                              <Input
                                value={(brandData[key as keyof BrandData] as string) || ""}
                                onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                                placeholder="#000000"
                                className="flex-1 text-sm"
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
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (hasWebsite && brandData.website) {
                          setStep("website");
                        } else {
                          setStep("website");
                          setHasWebsite(null);
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 h-12"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || !brandData.name.trim()}
                      className="flex-1 h-12 text-white border-0"
                      style={gradientButtonStyle}
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <Check className="h-10 w-10 text-white" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
                    <p className="text-muted-foreground">Your brand profile has been saved. Redirecting to dashboard...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Crafted Studio. All rights reserved.</p>
        </footer>
      </div>

      {/* Right side - Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
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
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-2xl font-bold">C</span>
            </div>
            <div>
              <span className="text-xl font-semibold tracking-tight">Crafted Studio</span>
              <div className="text-sm text-white/70">Design Platform</div>
            </div>
          </div>

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
