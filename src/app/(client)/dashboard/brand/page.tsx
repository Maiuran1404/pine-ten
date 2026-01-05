"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Save,
  Building2,
  Palette,
  Type,
  Globe,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandData {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  tagline: string | null;
  industry: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  brandColors: string[];
  primaryFont: string | null;
  secondaryFont: string | null;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  } | null;
  contactEmail: string | null;
  contactPhone: string | null;
  keywords: string[];
}

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

const COLOR_PRESETS = {
  primary: ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#000000"],
  secondary: ["#3b82f6", "#1e3a8a", "#4338ca", "#7c3aed", "#be185d", "#9a3412", "#166534", "#155e75", "#334155", "#18181b"],
};

export default function BrandPage() {
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("company");

  useEffect(() => {
    fetchBrand();
  }, []);

  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      if (!response.ok) {
        throw new Error("Failed to fetch brand");
      }
      const result = await response.json();
      setBrand(result.data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load brand information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!brand) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Brand updated successfully!");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRescan = async () => {
    if (!brand?.website) {
      toast.error("No website to scan");
      return;
    }

    setIsRescanning(true);
    try {
      const response = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: brand.website }),
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      const result = await response.json();
      setBrand((prev) =>
        prev
          ? {
              ...prev,
              ...result.data,
              id: prev.id,
            }
          : null
      );
      toast.success("Brand information refreshed from website!");
    } catch {
      toast.error("Failed to scan website");
    } finally {
      setIsRescanning(false);
    }
  };

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
    toast.success("Color copied to clipboard");
  };

  const updateField = (field: keyof BrandData, value: unknown) => {
    setBrand((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const addBrandColor = (color: string) => {
    if (brand && color && !brand.brandColors.includes(color)) {
      updateField("brandColors", [...brand.brandColors, color]);
    }
  };

  const removeBrandColor = (index: number) => {
    if (brand) {
      updateField(
        "brandColors",
        brand.brandColors.filter((_, i) => i !== index)
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#0a0a0a] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48 bg-[#2a2a30]" />
          <Skeleton className="h-[400px] w-full bg-[#2a2a30] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-full bg-[#0a0a0a] p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-[#6b6b6b]" />
          <h3 className="text-lg font-medium text-white">No Brand Set Up</h3>
          <p className="text-[#6b6b6b]">
            Complete onboarding to set up your brand.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "typography", label: "Typography", icon: Type },
    { id: "social", label: "Social", icon: Globe },
  ];

  return (
    <div className="min-h-full bg-[#0a0a0a] relative overflow-hidden">
      {/* Curtain light effect */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.025) 20%,
            rgba(255, 255, 255, 0.015) 40%,
            rgba(255, 255, 255, 0.008) 60%,
            transparent 80%
          )`,
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row min-h-full">
        {/* Left side - Form */}
        <div className="flex-1 p-6 lg:p-8 lg:max-w-2xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">My Brand</h1>
              <p className="text-[#6b6b6b] mt-1">
                Manage your brand identity and visual guidelines
              </p>
            </div>
            <div className="flex gap-2">
              {brand.website && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRescan}
                  disabled={isRescanning}
                  className="border-[#2a2a30] bg-transparent text-[#9a9a9a] hover:text-white hover:bg-[#1a1a1f]"
                >
                  {isRescanning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="bg-white text-black hover:bg-white/90"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#0f0f12] rounded-xl mb-6 border border-[#2a2a30]/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
                  activeTab === tab.id
                    ? "bg-[#1a1a1f] text-white shadow-sm"
                    : "text-[#6b6b6b] hover:text-white"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "company" && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Company Name</Label>
                    <Input
                      value={brand.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Industry</Label>
                    <select
                      value={brand.industry || ""}
                      onChange={(e) => updateField("industry", e.target.value)}
                      className="flex h-11 w-full rounded-md border border-[#2a2a30] bg-[#0f0f12] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3a3a40]"
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
                  <Label className="text-[#9a9a9a] text-sm">Description</Label>
                  <Textarea
                    value={brand.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                    className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] resize-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Tagline</Label>
                    <Input
                      value={brand.tagline || ""}
                      onChange={(e) => updateField("tagline", e.target.value)}
                      placeholder="Your company tagline"
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Website</Label>
                    <Input
                      value={brand.website || ""}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="yourcompany.com"
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Logo URL</Label>
                    <Input
                      value={brand.logoUrl || ""}
                      onChange={(e) => updateField("logoUrl", e.target.value)}
                      placeholder="https://..."
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Favicon URL</Label>
                    <Input
                      value={brand.faviconUrl || ""}
                      onChange={(e) => updateField("faviconUrl", e.target.value)}
                      placeholder="https://..."
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "colors" && (
              <motion.div
                key="colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Main Colors */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { key: "primaryColor", label: "Primary", presets: COLOR_PRESETS.primary },
                    { key: "secondaryColor", label: "Secondary", presets: COLOR_PRESETS.secondary },
                    { key: "accentColor", label: "Accent", presets: COLOR_PRESETS.primary },
                  ].map(({ key, label, presets }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-[#9a9a9a] text-sm">{label}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#0f0f12] border border-[#2a2a30] hover:border-[#3a3a40] transition-colors">
                            <div
                              className="w-10 h-10 rounded-lg border border-white/10"
                              style={{
                                backgroundColor:
                                  (brand[key as keyof BrandData] as string) || "#6366f1",
                              }}
                            />
                            <span className="text-sm font-mono text-[#9a9a9a]">
                              {(brand[key as keyof BrandData] as string) || "#6366f1"}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 bg-[#0f0f12] border-[#2a2a30]" align="start">
                          <div className="space-y-4">
                            <div className="grid grid-cols-5 gap-2">
                              {presets.map((color) => (
                                <button
                                  key={color}
                                  className={cn(
                                    "w-10 h-10 rounded-lg transition-all hover:scale-110",
                                    (brand[key as keyof BrandData] as string) === color
                                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f0f12]"
                                      : "ring-1 ring-white/10"
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateField(key as keyof BrandData, color)}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="color"
                                value={(brand[key as keyof BrandData] as string) || "#ffffff"}
                                onChange={(e) => updateField(key as keyof BrandData, e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer bg-transparent"
                              />
                              <Input
                                value={(brand[key as keyof BrandData] as string) || ""}
                                onChange={(e) => updateField(key as keyof BrandData, e.target.value)}
                                placeholder="#000000"
                                className="flex-1 bg-[#1a1a1f] border-[#2a2a30] text-white h-10 font-mono text-sm"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>

                {/* Background & Text Colors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "backgroundColor", label: "Background" },
                    { key: "textColor", label: "Text" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-[#9a9a9a] text-sm">{label}</Label>
                      <div className="flex gap-2">
                        <div
                          className="w-12 h-12 rounded-lg border border-[#2a2a30] cursor-pointer"
                          style={{
                            backgroundColor: (brand[key as keyof BrandData] as string) || "#1a1a1f",
                          }}
                          onClick={() => {
                            const input = document.getElementById(`${key}-picker`) as HTMLInputElement;
                            input?.click();
                          }}
                        />
                        <Input
                          value={(brand[key as keyof BrandData] as string) || ""}
                          onChange={(e) => updateField(key as keyof BrandData, e.target.value)}
                          placeholder="#000000"
                          className="flex-1 bg-[#0f0f12] border-[#2a2a30] text-white h-12"
                        />
                        <input
                          id={`${key}-picker`}
                          type="color"
                          value={(brand[key as keyof BrandData] as string) || "#ffffff"}
                          onChange={(e) => updateField(key as keyof BrandData, e.target.value)}
                          className="sr-only"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Colors */}
                <div className="space-y-3">
                  <Label className="text-[#9a9a9a] text-sm">Additional Brand Colors</Label>
                  <div className="flex flex-wrap gap-2">
                    {brand.brandColors.map((color, index) => (
                      <div
                        key={index}
                        className="group flex items-center gap-2 bg-[#0f0f12] rounded-lg px-3 py-2 border border-[#2a2a30]"
                      >
                        <div
                          className="w-6 h-6 rounded border border-white/10"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-mono text-[#9a9a9a]">{color}</span>
                        <button
                          onClick={() => copyColor(color)}
                          className="p-1 hover:bg-[#2a2a30] rounded text-[#6b6b6b] hover:text-white"
                        >
                          {copiedColor === color ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => removeBrandColor(index)}
                          className="p-1 hover:bg-red-500/10 rounded text-red-400 text-sm"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 bg-[#0f0f12]/50 rounded-lg px-3 py-2 border-2 border-dashed border-[#2a2a30]">
                      <input
                        type="color"
                        onChange={(e) => addBrandColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent"
                      />
                      <span className="text-sm text-[#4a4a4a]">Add color</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "typography" && (
              <motion.div
                key="typography"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Primary Font (Headings)</Label>
                    <Input
                      value={brand.primaryFont || ""}
                      onChange={(e) => updateField("primaryFont", e.target.value)}
                      placeholder="e.g., Inter, Roboto"
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                    {brand.primaryFont && (
                      <p
                        className="text-lg font-bold text-white mt-3 p-3 bg-[#0f0f12] rounded-lg border border-[#2a2a30]"
                        style={{ fontFamily: brand.primaryFont }}
                      >
                        The quick brown fox
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Secondary Font (Body)</Label>
                    <Input
                      value={brand.secondaryFont || ""}
                      onChange={(e) => updateField("secondaryFont", e.target.value)}
                      placeholder="e.g., Open Sans, Lato"
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                    {brand.secondaryFont && (
                      <p
                        className="text-base text-[#9a9a9a] mt-3 p-3 bg-[#0f0f12] rounded-lg border border-[#2a2a30]"
                        style={{ fontFamily: brand.secondaryFont }}
                      >
                        The quick brown fox
                      </p>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-3">
                  <Label className="text-[#9a9a9a] text-sm">Brand Keywords</Label>
                  <div className="flex flex-wrap gap-2">
                    {brand.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm border border-emerald-500/20"
                      >
                        {keyword}
                        <button
                          onClick={() =>
                            updateField(
                              "keywords",
                              brand.keywords.filter((_, i) => i !== index)
                            )
                          }
                          className="hover:text-red-400 ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <Input
                      placeholder="Add keyword..."
                      className="w-32 bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          updateField("keywords", [...brand.keywords, e.currentTarget.value.trim()]);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "social" && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Contact Email</Label>
                    <Input
                      type="email"
                      value={brand.contactEmail || ""}
                      onChange={(e) => updateField("contactEmail", e.target.value)}
                      placeholder="hello@company.com"
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#9a9a9a] text-sm">Contact Phone</Label>
                    <Input
                      value={brand.contactPhone || ""}
                      onChange={(e) => updateField("contactPhone", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[#9a9a9a] text-sm">Social Media Links</Label>
                  {[
                    { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/..." },
                    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
                    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex gap-3 items-center">
                      <Label className="w-24 text-right text-[#6b6b6b] text-sm">{label}</Label>
                      <Input
                        value={brand.socialLinks?.[key as keyof typeof brand.socialLinks] || ""}
                        onChange={(e) =>
                          updateField("socialLinks", {
                            ...brand.socialLinks,
                            [key]: e.target.value,
                          })
                        }
                        placeholder={placeholder}
                        className="flex-1 bg-[#0f0f12] border-[#2a2a30] text-white focus:border-[#3a3a40] h-11"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side - Live Preview */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-[#0f0f12] border-l border-[#2a2a30]/50 items-center justify-center p-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${brand.primaryColor || "#10b981"}15 0%, transparent 50%)`,
            }}
          />

          <AnimatePresence mode="wait">
            {/* Live Preview Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-md"
            >
              {/* Mock App Preview */}
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-[#2a2a30]/50 bg-[#0a0a0a]">
                {/* App Header */}
                <motion.div
                  className="h-14 flex items-center justify-between px-4"
                  style={{ backgroundColor: brand.primaryColor || "#10b981" }}
                  animate={{ backgroundColor: brand.primaryColor || "#10b981" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {brand.name?.charAt(0)?.toUpperCase() || "C"}
                        </span>
                      </div>
                    )}
                    <motion.span
                      className="text-white font-semibold text-sm"
                      key={brand.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {brand.name || "Your Company"}
                    </motion.span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                </motion.div>

                {/* App Content */}
                <div className="p-5 space-y-4">
                  {/* Hero section */}
                  <div className="space-y-2">
                    <motion.div
                      className="h-3 rounded-full w-3/4"
                      style={{ backgroundColor: brand.textColor || "#ffffff" }}
                      animate={{ backgroundColor: brand.textColor || "#ffffff" }}
                    />
                    <div className="h-2 bg-[#2a2a30] rounded-full w-1/2" />
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-3 pt-2">
                    <motion.div
                      className="h-9 px-4 rounded-lg flex items-center justify-center flex-1"
                      style={{ backgroundColor: brand.primaryColor || "#10b981" }}
                      animate={{ backgroundColor: brand.primaryColor || "#10b981" }}
                    >
                      <span className="text-white text-xs font-medium">Get Started</span>
                    </motion.div>
                    <motion.div
                      className="h-9 px-4 rounded-lg flex items-center justify-center border-2"
                      style={{ borderColor: brand.primaryColor || "#10b981" }}
                      animate={{ borderColor: brand.primaryColor || "#10b981" }}
                    >
                      <motion.span
                        className="text-xs font-medium"
                        style={{ color: brand.primaryColor || "#10b981" }}
                        animate={{ color: brand.primaryColor || "#10b981" }}
                      >
                        Learn More
                      </motion.span>
                    </motion.div>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[brand.primaryColor, brand.secondaryColor].map((color, i) => (
                      <motion.div
                        key={i}
                        className="h-20 rounded-xl p-3"
                        style={{ backgroundColor: `${color || "#10b981"}20` }}
                        animate={{ backgroundColor: `${color || "#10b981"}20` }}
                      >
                        <motion.div
                          className="w-6 h-6 rounded-lg mb-2"
                          style={{ backgroundColor: color || "#10b981" }}
                          animate={{ backgroundColor: color || "#10b981" }}
                        />
                        <div className="h-2 bg-[#2a2a30] rounded w-3/4" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* App Footer */}
                <div className="px-5 py-3 border-t border-[#2a2a30]/50 flex items-center justify-between">
                  <div className="flex gap-2">
                    {brand.brandColors.slice(0, 4).map((color, i) => (
                      <motion.div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  {brand.website && (
                    <span className="text-[#4a4a4a] text-xs flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {brand.website.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              </div>

              {/* Caption */}
              <motion.p
                className="text-center text-[#6b6b6b] text-sm mt-6 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Sparkles className="w-4 h-4" />
                Live preview updates as you type
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
