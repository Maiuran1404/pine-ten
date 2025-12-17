"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  Palette,
  Building2,
  Sparkles,
  Search,
  AlertCircle,
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
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  accentColor: "#ec4899",
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

export function ClientBrandOnboarding({ onComplete }: ClientBrandOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandData, setBrandData] = useState<BrandData>(defaultBrandData);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const steps: OnboardingStep[] = hasWebsite === false
    ? ["welcome", "website", "brand-form", "complete"]
    : ["welcome", "website", "scanning", "brand-form", "complete"];

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Animate scanning progress
  useEffect(() => {
    if (step === "scanning" && isLoading) {
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
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

      // Small delay to show 100% completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      setBrandData({
        ...defaultBrandData,
        ...result.data,
        website: websiteUrl,
      });

      setStep("brand-form");
      toast.success("Brand information extracted successfully!");
    } catch (error) {
      console.error("Scan error:", error);
      setScanError(error instanceof Error ? error.message : "Failed to scan website");
      toast.error("Failed to scan website. You can enter details manually.");
    } finally {
      setIsLoading(false);
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

      // Short delay to show completion animation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success("Welcome aboard! Your brand is set up.");
      onComplete();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Welcome Step */}
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-2xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">
                  Welcome to Crafted Studio
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  Let&apos;s set up your brand so our designers can create
                  on-brand content for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-3 mb-8">
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <Globe className="h-8 w-8 text-violet-500 mb-2" />
                    <p className="text-sm font-medium">Import from Website</p>
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll scan your site
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <Palette className="h-8 w-8 text-violet-500 mb-2" />
                    <p className="text-sm font-medium">Extract Colors & Fonts</p>
                    <p className="text-xs text-muted-foreground">
                      AI-powered analysis
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <Building2 className="h-8 w-8 text-violet-500 mb-2" />
                    <p className="text-sm font-medium">Build Brand Profile</p>
                    <p className="text-xs text-muted-foreground">
                      Ready for designs
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-lg"
                  onClick={() => setStep("website")}
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Website Input Step */}
        {step === "website" && (
          <motion.div
            key="website"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <Progress value={progress} className="mb-4" />
                <CardTitle className="text-2xl">
                  Do you have a website?
                </CardTitle>
                <CardDescription>
                  We can automatically extract your brand identity from your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasWebsite === null ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      onClick={() => setHasWebsite(true)}
                      className="flex flex-col items-center p-6 rounded-xl border-2 border-muted hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all"
                    >
                      <Globe className="h-12 w-12 text-violet-500 mb-3" />
                      <p className="font-semibold text-lg">Yes, I have a website</p>
                      <p className="text-sm text-muted-foreground text-center mt-1">
                        We&apos;ll scan it and extract your brand
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setHasWebsite(false);
                        setStep("brand-form");
                      }}
                      className="flex flex-col items-center p-6 rounded-xl border-2 border-muted hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all"
                    >
                      <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="font-semibold text-lg">Not yet</p>
                      <p className="text-sm text-muted-foreground text-center mt-1">
                        I&apos;ll set up my brand manually
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-base">
                        Your Website URL
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="website"
                          placeholder="example.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="pl-10 h-12 text-lg"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleWebsiteScan();
                            }
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter your website URL and we&apos;ll automatically extract your
                        brand colors, fonts, and more.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setHasWebsite(null)}
                        className="flex-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleWebsiteScan}
                        disabled={!websiteUrl.trim()}
                        className="flex-1"
                      >
                        Scan Website
                        <Search className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {hasWebsite === null && (
                  <Button
                    variant="ghost"
                    onClick={() => setStep("welcome")}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Scanning Step */}
        {step === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <Progress value={progress} className="mb-4" />
                <CardTitle className="text-2xl">
                  {scanError ? "Scan Failed" : "Scanning Your Website"}
                </CardTitle>
                <CardDescription>
                  {scanError
                    ? "We couldn't extract brand information automatically"
                    : "Our AI is analyzing your website to extract brand information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {scanError ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-muted-foreground mb-6">{scanError}</p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setScanError(null);
                          setStep("website");
                        }}
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={() => {
                          setBrandData({ ...defaultBrandData, website: websiteUrl });
                          setStep("brand-form");
                        }}
                      >
                        Enter Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="relative mx-auto w-24 h-24 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-muted" />
                      <div
                        className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"
                        style={{ animationDuration: "1s" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-violet-500" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Progress value={scanProgress} className="h-2" />
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className={scanProgress > 10 ? "text-foreground" : ""}>
                          {scanProgress > 10 && "✓ "} Fetching website content...
                        </p>
                        <p className={scanProgress > 30 ? "text-foreground" : ""}>
                          {scanProgress > 30 && "✓ "} Capturing screenshots...
                        </p>
                        <p className={scanProgress > 50 ? "text-foreground" : ""}>
                          {scanProgress > 50 && "✓ "} Analyzing brand colors...
                        </p>
                        <p className={scanProgress > 70 ? "text-foreground" : ""}>
                          {scanProgress > 70 && "✓ "} Extracting typography...
                        </p>
                        <p className={scanProgress > 85 ? "text-foreground" : ""}>
                          {scanProgress > 85 && "✓ "} Finalizing brand profile...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Brand Form Step */}
        {step === "brand-form" && (
          <motion.div
            key="brand-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <Progress value={progress} className="mb-4" />
                <CardTitle className="text-2xl">
                  {hasWebsite ? "Review Your Brand" : "Set Up Your Brand"}
                </CardTitle>
                <CardDescription>
                  {hasWebsite
                    ? "We extracted this information from your website. Feel free to edit anything."
                    : "Tell us about your brand so we can create on-brand designs for you."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Company Info Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-violet-500" />
                    Company Information
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Inc."
                        value={brandData.name}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <select
                        id="industry"
                        value={brandData.industry}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, industry: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select industry</option>
                        {industries.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your company..."
                      value={brandData.description}
                      onChange={(e) =>
                        setBrandData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input
                        id="tagline"
                        placeholder="Your company tagline"
                        value={brandData.tagline}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, tagline: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://..."
                        value={brandData.logoUrl}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, logoUrl: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Colors Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-violet-500" />
                    Brand Colors
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { key: "primaryColor", label: "Primary Color" },
                      { key: "secondaryColor", label: "Secondary Color" },
                      { key: "accentColor", label: "Accent Color" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        <div className="flex gap-2">
                          <div
                            className="w-10 h-10 rounded-md border cursor-pointer"
                            style={{ backgroundColor: brandData[key as keyof BrandData] as string || "#ffffff" }}
                            onClick={() => {
                              const input = document.getElementById(`${key}-picker`) as HTMLInputElement;
                              input?.click();
                            }}
                          />
                          <Input
                            id={key}
                            placeholder="#000000"
                            value={brandData[key as keyof BrandData] as string || ""}
                            onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                            className="flex-1"
                          />
                          <input
                            id={`${key}-picker`}
                            type="color"
                            value={brandData[key as keyof BrandData] as string || "#ffffff"}
                            onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                            className="sr-only"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { key: "backgroundColor", label: "Background Color" },
                      { key: "textColor", label: "Text Color" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        <div className="flex gap-2">
                          <div
                            className="w-10 h-10 rounded-md border cursor-pointer"
                            style={{ backgroundColor: brandData[key as keyof BrandData] as string || "#ffffff" }}
                            onClick={() => {
                              const input = document.getElementById(`${key}-picker`) as HTMLInputElement;
                              input?.click();
                            }}
                          />
                          <Input
                            id={key}
                            placeholder="#000000"
                            value={brandData[key as keyof BrandData] as string || ""}
                            onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                            className="flex-1"
                          />
                          <input
                            id={`${key}-picker`}
                            type="color"
                            value={brandData[key as keyof BrandData] as string || "#ffffff"}
                            onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                            className="sr-only"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Additional Brand Colors */}
                  <div className="space-y-2">
                    <Label>Additional Brand Colors</Label>
                    <div className="flex flex-wrap gap-2">
                      {brandData.brandColors.map((color, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-muted rounded-full px-2 py-1"
                        >
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs">{color}</span>
                          <button
                            onClick={() => removeBrandColor(index)}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          onChange={(e) => addBrandColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground">Add color</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Typography Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Typography</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primaryFont">Primary Font</Label>
                      <Input
                        id="primaryFont"
                        placeholder="e.g., Inter, Roboto"
                        value={brandData.primaryFont}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, primaryFont: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryFont">Secondary Font</Label>
                      <Input
                        id="secondaryFont"
                        placeholder="e.g., Open Sans"
                        value={brandData.secondaryFont}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, secondaryFont: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Card */}
                {(brandData.name || brandData.primaryColor !== "#6366f1") && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Preview</h3>
                    <div
                      className="p-6 rounded-xl border-2"
                      style={{
                        backgroundColor: brandData.backgroundColor || "#ffffff",
                        borderColor: brandData.primaryColor || "#6366f1",
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {brandData.logoUrl ? (
                          <img
                            src={brandData.logoUrl}
                            alt="Logo"
                            className="w-10 h-10 rounded object-contain"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: brandData.primaryColor || "#6366f1" }}
                          >
                            {brandData.name?.[0]?.toUpperCase() || "C"}
                          </div>
                        )}
                        <div>
                          <h4
                            className="font-bold"
                            style={{
                              color: brandData.textColor || "#1f2937",
                              fontFamily: brandData.primaryFont || "inherit",
                            }}
                          >
                            {brandData.name || "Your Company"}
                          </h4>
                          {brandData.tagline && (
                            <p
                              className="text-sm"
                              style={{ color: brandData.textColor || "#1f2937", opacity: 0.7 }}
                            >
                              {brandData.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 rounded-md text-white text-sm font-medium"
                          style={{ backgroundColor: brandData.primaryColor || "#6366f1" }}
                        >
                          Primary Button
                        </button>
                        <button
                          className="px-4 py-2 rounded-md text-sm font-medium"
                          style={{
                            backgroundColor: brandData.secondaryColor || "#8b5cf6",
                            color: "#ffffff",
                          }}
                        >
                          Secondary
                        </button>
                        <button
                          className="px-4 py-2 rounded-md text-sm font-medium border"
                          style={{
                            borderColor: brandData.accentColor || "#ec4899",
                            color: brandData.accentColor || "#ec4899",
                          }}
                        >
                          Accent
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (hasWebsite && brandData.website) {
                        setStep("website");
                      } else if (hasWebsite === false) {
                        setStep("website");
                        setHasWebsite(null);
                      } else {
                        setStep("website");
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !brandData.name.trim()}
                    className="flex-1"
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
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Complete Step */}
        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-2xl">
              <CardContent className="pt-12 pb-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mb-6"
                >
                  <Check className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
                <p className="text-muted-foreground">
                  Your brand profile has been saved. You can edit it anytime from your dashboard.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
