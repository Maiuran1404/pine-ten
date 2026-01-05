"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn("rounded-xl overflow-hidden border border-[#2a2a30]/50", className)}
    style={{
      background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.6) 0%, rgba(12, 12, 15, 0.8) 100%)',
      backdropFilter: 'blur(12px)',
    }}
  >
    {children}
  </div>
);

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
      <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-7 w-32 bg-[#2a2a30]" />
            <Skeleton className="h-4 w-64 mt-2 bg-[#2a2a30]" />
          </div>
          <Skeleton className="h-10 w-32 bg-[#2a2a30]" />
        </div>
        <GlassCard className="p-6">
          <Skeleton className="h-32 w-full bg-[#2a2a30]" />
        </GlassCard>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-full bg-[#0a0a0a] p-6">
        <GlassCard className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-[#6b6b6b] mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Brand Set Up</h3>
          <p className="text-[#6b6b6b]">
            Complete onboarding to set up your brand.
          </p>
        </GlassCard>
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
    <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              onClick={handleRescan}
              disabled={isRescanning}
              className="border-[#2a2a30] bg-transparent text-[#6b6b6b] hover:text-white hover:bg-[#2a2a30]/50"
            >
              {isRescanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rescan Website
                </>
              )}
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="bg-white text-black hover:bg-white/90">
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Brand Preview Card */}
      <GlassCard>
        <div className="p-6">
          <div
            className="rounded-xl p-6 transition-all"
            style={{
              backgroundColor: brand.backgroundColor || "#1a1a1f",
              border: `2px solid ${brand.primaryColor || "#6366f1"}`,
            }}
          >
            <div className="flex items-start gap-4">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="w-16 h-16 rounded-lg object-contain bg-white"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: brand.primaryColor || "#6366f1" }}
                >
                  {brand.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2
                  className="text-xl font-bold"
                  style={{
                    color: brand.textColor || "#ffffff",
                    fontFamily: brand.primaryFont || "inherit",
                  }}
                >
                  {brand.name}
                </h2>
                {brand.tagline && (
                  <p
                    className="text-sm mt-1"
                    style={{
                      color: brand.textColor || "#ffffff",
                      opacity: 0.7,
                    }}
                  >
                    {brand.tagline}
                  </p>
                )}
                {brand.website && (
                  <a
                    href={
                      brand.website.startsWith("http")
                        ? brand.website
                        : `https://${brand.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm mt-2 hover:underline"
                    style={{ color: brand.primaryColor || "#6366f1" }}
                  >
                    <Globe className="h-3 w-3" />
                    {brand.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="flex gap-2 mt-4">
              {[
                { color: brand.primaryColor, label: "Primary" },
                { color: brand.secondaryColor, label: "Secondary" },
                { color: brand.accentColor, label: "Accent" },
              ]
                .filter((c) => c.color)
                .map(({ color, label }) => (
                  <button
                    key={label}
                    onClick={() => copyColor(color!)}
                    className="group relative px-4 py-2 rounded-md text-white text-sm font-medium transition-transform hover:scale-105"
                    style={{ backgroundColor: color! }}
                  >
                    {label}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {copiedColor === color ? "Copied!" : color}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-black"
                : "bg-[#1a1a1f] text-[#6b6b6b] hover:text-white hover:bg-[#2a2a30]"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "company" && (
        <GlassCard>
          <div className="p-5 border-b border-[#2a2a30]/40">
            <h2 className="text-sm font-medium text-white">Company Information</h2>
            <p className="text-xs text-[#4a4a4a] mt-1">Basic information about your company</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#9a9a9a]">Company Name</Label>
                <Input
                  id="name"
                  value={brand.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-[#9a9a9a]">Industry</Label>
                <select
                  id="industry"
                  value={brand.industry || ""}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[#2a2a30] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3a3a40]"
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
              <Label htmlFor="description" className="text-[#9a9a9a]">Description</Label>
              <Textarea
                id="description"
                value={brand.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tagline" className="text-[#9a9a9a]">Tagline</Label>
                <Input
                  id="tagline"
                  value={brand.tagline || ""}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-[#9a9a9a]">Website</Label>
                <Input
                  id="website"
                  value={brand.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="text-[#9a9a9a]">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={brand.logoUrl || ""}
                  onChange={(e) => updateField("logoUrl", e.target.value)}
                  placeholder="https://..."
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl" className="text-[#9a9a9a]">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  value={brand.faviconUrl || ""}
                  onChange={(e) => updateField("faviconUrl", e.target.value)}
                  placeholder="https://..."
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === "colors" && (
        <GlassCard>
          <div className="p-5 border-b border-[#2a2a30]/40">
            <h2 className="text-sm font-medium text-white">Brand Colors</h2>
            <p className="text-xs text-[#4a4a4a] mt-1">Your brand&apos;s color palette</p>
          </div>
          <div className="p-5 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: "primaryColor", label: "Primary Color" },
                { key: "secondaryColor", label: "Secondary Color" },
                { key: "accentColor", label: "Accent Color" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-[#9a9a9a]">{label}</Label>
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded-lg border border-[#2a2a30] cursor-pointer transition-transform hover:scale-105"
                      style={{
                        backgroundColor:
                          (brand[key as keyof BrandData] as string) ||
                          "#1a1a1f",
                      }}
                      onClick={() => {
                        const input = document.getElementById(
                          `${key}-picker`
                        ) as HTMLInputElement;
                        input?.click();
                      }}
                    />
                    <div className="flex-1 space-y-1">
                      <Input
                        value={
                          (brand[key as keyof BrandData] as string) || ""
                        }
                        onChange={(e) =>
                          updateField(
                            key as keyof BrandData,
                            e.target.value
                          )
                        }
                        placeholder="#000000"
                        className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs text-[#6b6b6b] hover:text-white hover:bg-[#2a2a30]"
                        onClick={() =>
                          copyColor(
                            (brand[key as keyof BrandData] as string) || ""
                          )
                        }
                      >
                        {copiedColor ===
                        (brand[key as keyof BrandData] as string) ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <input
                      id={`${key}-picker`}
                      type="color"
                      value={
                        (brand[key as keyof BrandData] as string) || "#ffffff"
                      }
                      onChange={(e) =>
                        updateField(key as keyof BrandData, e.target.value)
                      }
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
                  <Label className="text-[#9a9a9a]">{label}</Label>
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded-lg border border-[#2a2a30] cursor-pointer"
                      style={{
                        backgroundColor:
                          (brand[key as keyof BrandData] as string) ||
                          "#1a1a1f",
                      }}
                      onClick={() => {
                        const input = document.getElementById(
                          `${key}-picker`
                        ) as HTMLInputElement;
                        input?.click();
                      }}
                    />
                    <Input
                      value={(brand[key as keyof BrandData] as string) || ""}
                      onChange={(e) =>
                        updateField(key as keyof BrandData, e.target.value)
                      }
                      placeholder="#000000"
                      className="flex-1 bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                    />
                    <input
                      id={`${key}-picker`}
                      type="color"
                      value={
                        (brand[key as keyof BrandData] as string) || "#ffffff"
                      }
                      onChange={(e) =>
                        updateField(key as keyof BrandData, e.target.value)
                      }
                      className="sr-only"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Colors */}
            <div className="space-y-2">
              <Label className="text-[#9a9a9a]">Additional Brand Colors</Label>
              <div className="flex flex-wrap gap-2">
                {brand.brandColors.map((color, index) => (
                  <div
                    key={index}
                    className="group relative flex items-center gap-2 bg-[#1a1a1f] rounded-lg px-3 py-2 border border-[#2a2a30]"
                  >
                    <div
                      className="w-6 h-6 rounded border border-[#2a2a30]"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-mono text-[#9a9a9a]">{color}</span>
                    <button
                      onClick={() => copyColor(color)}
                      className="p-1 hover:bg-[#2a2a30] rounded text-[#6b6b6b] hover:text-white"
                    >
                      {copiedColor === color ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => removeBrandColor(index)}
                      className="p-1 hover:bg-red-500/10 rounded text-red-400"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 bg-[#1a1a1f]/50 rounded-lg px-3 py-2 border-2 border-dashed border-[#2a2a30]">
                  <input
                    type="color"
                    onChange={(e) => addBrandColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                  <span className="text-sm text-[#4a4a4a]">
                    Add color
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === "typography" && (
        <GlassCard>
          <div className="p-5 border-b border-[#2a2a30]/40">
            <h2 className="text-sm font-medium text-white">Typography</h2>
            <p className="text-xs text-[#4a4a4a] mt-1">Font settings for your brand</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryFont" className="text-[#9a9a9a]">Primary Font (Headings)</Label>
                <Input
                  id="primaryFont"
                  value={brand.primaryFont || ""}
                  onChange={(e) => updateField("primaryFont", e.target.value)}
                  placeholder="e.g., Inter, Roboto, Montserrat"
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
                {brand.primaryFont && (
                  <p
                    className="text-lg font-bold text-white mt-2"
                    style={{ fontFamily: brand.primaryFont }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryFont" className="text-[#9a9a9a]">Secondary Font (Body)</Label>
                <Input
                  id="secondaryFont"
                  value={brand.secondaryFont || ""}
                  onChange={(e) =>
                    updateField("secondaryFont", e.target.value)
                  }
                  placeholder="e.g., Open Sans, Lato, Source Sans Pro"
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
                {brand.secondaryFont && (
                  <p
                    className="text-base text-[#9a9a9a] mt-2"
                    style={{ fontFamily: brand.secondaryFont }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                )}
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label className="text-[#9a9a9a]">Brand Keywords</Label>
              <div className="flex flex-wrap gap-2">
                {brand.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#6366f1]/10 text-[#818cf8] rounded-full text-sm border border-[#6366f1]/20"
                  >
                    {keyword}
                    <button
                      onClick={() =>
                        updateField(
                          "keywords",
                          brand.keywords.filter((_, i) => i !== index)
                        )
                      }
                      className="hover:text-red-400"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <Input
                  placeholder="Add keyword..."
                  className="w-32 bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      e.currentTarget.value.trim()
                    ) {
                      updateField("keywords", [
                        ...brand.keywords,
                        e.currentTarget.value.trim(),
                      ]);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === "social" && (
        <GlassCard>
          <div className="p-5 border-b border-[#2a2a30]/40">
            <h2 className="text-sm font-medium text-white">Contact & Social Media</h2>
            <p className="text-xs text-[#4a4a4a] mt-1">Your contact information and social profiles</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-[#9a9a9a]">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={brand.contactEmail || ""}
                  onChange={(e) =>
                    updateField("contactEmail", e.target.value)
                  }
                  placeholder="hello@company.com"
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-[#9a9a9a]">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={brand.contactPhone || ""}
                  onChange={(e) =>
                    updateField("contactPhone", e.target.value)
                  }
                  placeholder="+1 (555) 000-0000"
                  className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[#9a9a9a]">Social Media Links</Label>
              {[
                { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/..." },
                { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
                { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
                { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
                { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="flex gap-3 items-center">
                  <Label className="w-24 text-right text-[#6b6b6b]">{label}</Label>
                  <Input
                    value={brand.socialLinks?.[key as keyof typeof brand.socialLinks] || ""}
                    onChange={(e) =>
                      updateField("socialLinks", {
                        ...brand.socialLinks,
                        [key]: e.target.value,
                      })
                    }
                    placeholder={placeholder}
                    className="flex-1 bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
                  />
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
