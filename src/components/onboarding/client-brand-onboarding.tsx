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
  Sparkles,
  Search,
  AlertCircle,
  Wand2,
  Zap,
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
  const { refetch: refetchSession } = useSession();
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

      // Refetch the session to get the updated onboardingCompleted status
      await refetchSession();

      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Welcome aboard!");
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <Progress value={progress} className="h-1 rounded-none bg-white/10" />
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex items-center justify-center p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-24 h-24 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-violet-500/30"
              >
                <Sparkles className="h-12 w-12 text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl sm:text-5xl font-bold text-white mb-4"
              >
                Welcome to Crafted Studio
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg sm:text-xl text-slate-300 mb-12 max-w-lg mx-auto"
              >
                Let&apos;s set up your brand so our designers can create
                stunning on-brand content for you.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid gap-4 sm:grid-cols-3 mb-12"
              >
                {[
                  { icon: Globe, title: "Import from Website", desc: "We'll scan your site" },
                  { icon: Wand2, title: "AI-Powered Analysis", desc: "Extract colors & fonts" },
                  { icon: Zap, title: "Instant Setup", desc: "Ready in seconds" },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
                  >
                    <item.icon className="h-8 w-8 text-violet-400 mx-auto mb-3" />
                    <p className="text-white font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Button
                  size="lg"
                  onClick={() => setStep("website")}
                  className="h-14 px-10 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-xl shadow-violet-500/25"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Website Input Step */}
          {step === "website" && (
            <motion.div
              key="website"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-xl"
            >
              {hasWebsite === null ? (
                <>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center"
                  >
                    Do you have a website?
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-300 mb-10 text-center text-lg"
                  >
                    We can automatically extract your brand identity
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <button
                      onClick={() => setHasWebsite(true)}
                      className="group relative bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-violet-500/50 hover:bg-white/10 rounded-2xl p-8 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                      <Globe className="h-16 w-16 text-violet-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-xl font-semibold text-white mb-2">Yes, I have a website</p>
                      <p className="text-sm text-slate-400">We&apos;ll scan it and extract your brand</p>
                    </button>

                    <button
                      onClick={() => {
                        setHasWebsite(false);
                        setStep("brand-form");
                      }}
                      className="group relative bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-slate-500/50 hover:bg-white/10 rounded-2xl p-8 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                      <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-xl font-semibold text-white mb-2">Not yet</p>
                      <p className="text-sm text-slate-400">I&apos;ll set up my brand manually</p>
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-center"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => setStep("welcome")}
                      className="text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center"
                  >
                    Enter your website URL
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-300 mb-10 text-center text-lg"
                  >
                    We&apos;ll scan it and extract your brand colors, fonts, and more
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        placeholder="example.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleWebsiteScan()}
                        className="h-14 pl-12 text-lg bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setHasWebsite(null)}
                        className="flex-1 h-12 bg-transparent border-white/20 text-white hover:bg-white/10"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleWebsiteScan}
                        disabled={!websiteUrl.trim()}
                        className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0"
                      >
                        Scan Website
                        <Search className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {/* Scanning Step */}
          {step === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-lg text-center"
            >
              {scanError ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6"
                  >
                    <AlertCircle className="h-10 w-10 text-red-400" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-4">Scan Failed</h2>
                  <p className="text-slate-400 mb-8">{scanError}</p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScanError(null);
                        setStep("website");
                      }}
                      className="bg-transparent border-white/20 text-white hover:bg-white/10"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => {
                        setBrandData({ ...defaultBrandData, website: websiteUrl });
                        setStep("brand-form");
                      }}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0"
                    >
                      Enter Manually
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mx-auto w-32 h-32 mb-8">
                    {/* Animated rings */}
                    <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-4 border-violet-500/30 animate-ping delay-100" />
                    <div className="absolute inset-4 rounded-full border-4 border-violet-500/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <Wand2 className="h-8 w-8 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2">Analyzing your website</h2>
                  <p className="text-slate-400 mb-8">Our AI is extracting your brand identity</p>

                  <div className="space-y-4 max-w-xs mx-auto">
                    <Progress value={scanProgress} className="h-2 bg-white/10" />

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
                            "flex items-center gap-2 text-sm transition-colors duration-300",
                            scanProgress > item.threshold ? "text-white" : "text-slate-500"
                          )}
                        >
                          {scanProgress > item.threshold ? (
                            <CheckCircle2 className="h-4 w-4 text-violet-400" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-600" />
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
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-4xl h-full flex flex-col"
            >
              <div className="text-center mb-8 pt-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {hasWebsite ? "Review your brand" : "Set up your brand"}
                </h2>
                <p className="text-slate-400">
                  {hasWebsite
                    ? "We extracted this from your website. Feel free to edit."
                    : "Tell us about your brand to get started."}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4">
                <div className="grid gap-8 lg:grid-cols-2 pb-8">
                  {/* Left Column - Form */}
                  <div className="space-y-6">
                    {/* Company Info */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-violet-400" />
                        Company Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-300">Company Name *</Label>
                          <Input
                            placeholder="Acme Inc."
                            value={brandData.name}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, name: e.target.value }))}
                            className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Industry</Label>
                          <select
                            value={brandData.industry || ""}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, industry: e.target.value }))}
                            className="mt-1.5 w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          >
                            <option value="" className="bg-slate-900">Select industry</option>
                            {industries.map((ind) => (
                              <option key={ind} value={ind} className="bg-slate-900">{ind}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-slate-300">Description</Label>
                          <Textarea
                            placeholder="Brief description of your company..."
                            value={brandData.description}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, description: e.target.value }))}
                            className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500 min-h-[80px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-300">Tagline</Label>
                            <Input
                              placeholder="Your tagline"
                              value={brandData.tagline}
                              onChange={(e) => setBrandData((prev) => ({ ...prev, tagline: e.target.value }))}
                              className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-300">Logo URL</Label>
                            <Input
                              placeholder="https://..."
                              value={brandData.logoUrl}
                              onChange={(e) => setBrandData((prev) => ({ ...prev, logoUrl: e.target.value }))}
                              className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Palette className="h-5 w-5 text-violet-400" />
                        Brand Colors
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: "primaryColor", label: "Primary" },
                            { key: "secondaryColor", label: "Secondary" },
                            { key: "accentColor", label: "Accent" },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <Label className="text-slate-400 text-xs">{label}</Label>
                              <div className="mt-1.5 flex gap-2">
                                <div
                                  className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer hover:scale-105 transition-transform"
                                  style={{ backgroundColor: (brandData[key as keyof BrandData] as string) || "#6366f1" }}
                                  onClick={() => document.getElementById(`${key}-picker`)?.click()}
                                />
                                <Input
                                  value={(brandData[key as keyof BrandData] as string) || ""}
                                  onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                                  placeholder="#000000"
                                  className="flex-1 bg-white/10 border-white/20 text-white text-sm placeholder:text-slate-500 focus:border-violet-500"
                                />
                                <input
                                  id={`${key}-picker`}
                                  type="color"
                                  value={(brandData[key as keyof BrandData] as string) || "#6366f1"}
                                  onChange={(e) => handleColorChange(key as keyof BrandData, e.target.value)}
                                  className="sr-only"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Additional Colors */}
                        <div>
                          <Label className="text-slate-400 text-xs">Additional Colors</Label>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {brandData.brandColors.map((color, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1"
                              >
                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                                <span className="text-xs text-slate-300">{color}</span>
                                <button onClick={() => removeBrandColor(index)} className="text-slate-400 hover:text-red-400 ml-1">
                                  &times;
                                </button>
                              </div>
                            ))}
                            <label className="flex items-center gap-1 bg-white/5 hover:bg-white/10 rounded-full px-3 py-1 cursor-pointer border border-dashed border-white/20">
                              <input
                                type="color"
                                onChange={(e) => addBrandColor(e.target.value)}
                                className="w-4 h-4 rounded cursor-pointer"
                              />
                              <span className="text-xs text-slate-400">Add</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Typography</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-300">Primary Font</Label>
                          <Input
                            placeholder="e.g., Inter"
                            value={brandData.primaryFont}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, primaryFont: e.target.value }))}
                            className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Secondary Font</Label>
                          <Input
                            placeholder="e.g., Open Sans"
                            value={brandData.secondaryFont}
                            onChange={(e) => setBrandData((prev) => ({ ...prev, secondaryFont: e.target.value }))}
                            className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Preview */}
                  <div className="lg:sticky lg:top-0">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Brand Preview</h3>

                      {/* Preview Card */}
                      <div
                        className="rounded-xl p-6 transition-all border-2"
                        style={{
                          backgroundColor: brandData.backgroundColor || "#ffffff",
                          borderColor: brandData.primaryColor || "#6366f1",
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {brandData.logoUrl ? (
                            <img
                              src={brandData.logoUrl}
                              alt="Logo"
                              className="w-12 h-12 rounded-lg object-contain bg-white"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                              style={{ backgroundColor: brandData.primaryColor || "#6366f1" }}
                            >
                              {brandData.name?.[0]?.toUpperCase() || "C"}
                            </div>
                          )}
                          <div>
                            <h4
                              className="font-bold text-lg"
                              style={{
                                color: brandData.textColor || "#1f2937",
                                fontFamily: brandData.primaryFont || "inherit",
                              }}
                            >
                              {brandData.name || "Your Company"}
                            </h4>
                            {brandData.tagline && (
                              <p
                                className="text-sm opacity-70"
                                style={{ color: brandData.textColor || "#1f2937" }}
                              >
                                {brandData.tagline}
                              </p>
                            )}
                          </div>
                        </div>

                        <p
                          className="text-sm mb-4 opacity-80"
                          style={{
                            color: brandData.textColor || "#1f2937",
                            fontFamily: brandData.secondaryFont || "inherit",
                          }}
                        >
                          {brandData.description || "Your company description will appear here."}
                        </p>

                        <div className="flex gap-2">
                          <button
                            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                            style={{ backgroundColor: brandData.primaryColor || "#6366f1" }}
                          >
                            Primary
                          </button>
                          <button
                            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                            style={{ backgroundColor: brandData.secondaryColor || "#8b5cf6" }}
                          >
                            Secondary
                          </button>
                          <button
                            className="px-4 py-2 rounded-lg text-sm font-medium border-2"
                            style={{
                              borderColor: brandData.accentColor || "#ec4899",
                              color: brandData.accentColor || "#ec4899",
                            }}
                          >
                            Accent
                          </button>
                        </div>
                      </div>

                      {/* Color Palette */}
                      <div className="mt-6">
                        <p className="text-sm text-slate-400 mb-2">Color Palette</p>
                        <div className="flex gap-2">
                          {[brandData.primaryColor, brandData.secondaryColor, brandData.accentColor, ...brandData.brandColors]
                            .filter(Boolean)
                            .slice(0, 6)
                            .map((color, i) => (
                              <div
                                key={i}
                                className="w-10 h-10 rounded-lg border border-white/20 shadow-lg"
                                style={{ backgroundColor: color || "#6366f1" }}
                                title={color || ""}
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-white/10 p-4 flex gap-3 bg-slate-950/50 backdrop-blur-sm">
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
                  className="flex-1 h-12 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !brandData.name.trim()}
                  className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0"
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
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-28 h-28 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30"
              >
                <Check className="h-14 w-14 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white mb-4"
              >
                You&apos;re all set!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-slate-400 text-lg"
              >
                Your brand profile has been saved. Redirecting to dashboard...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
