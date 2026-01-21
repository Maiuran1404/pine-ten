"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { InferredAudience } from "@/components/onboarding/types";

// =============================================================================
// TYPES
// =============================================================================

export interface BrandData {
  // Company basics
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  industryArchetype: string | null;
  description: string | null;
  tagline: string | null;

  // Visual identity
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  brandColors: string[];

  // Typography
  primaryFont: string | null;
  secondaryFont: string | null;

  // Keywords & tone
  keywords: string[];

  // Social links
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  } | null;

  // Contact
  contactEmail: string | null;
  contactPhone: string | null;

  // Onboarding status
  onboardingStatus: string | null;
}

export interface BrandContext {
  // Core brand info
  brand: BrandData | null;

  // Target audiences
  audiences: InferredAudience[];

  // Derived helpers
  brandColors: string[];
  brandTypography: {
    primary: string;
    secondary: string;
  };
  toneOfVoice: string;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBrandData(): BrandContext & { refetch: () => Promise<void> } {
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [audiences, setAudiences] = useState<InferredAudience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrandData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch company data
      const companyResponse = await fetch("/api/user/company");
      if (!companyResponse.ok) {
        throw new Error("Failed to fetch company data");
      }
      const companyData = await companyResponse.json();

      if (companyData.company) {
        setBrand({
          id: companyData.company.id,
          name: companyData.company.name || "",
          website: companyData.company.website,
          industry: companyData.company.industry,
          industryArchetype: companyData.company.industryArchetype,
          description: companyData.company.description,
          tagline: companyData.company.tagline,
          logoUrl: companyData.company.logoUrl,
          primaryColor: companyData.company.primaryColor,
          secondaryColor: companyData.company.secondaryColor,
          accentColor: companyData.company.accentColor,
          backgroundColor: companyData.company.backgroundColor,
          textColor: companyData.company.textColor,
          brandColors: companyData.company.brandColors || [],
          primaryFont: companyData.company.primaryFont,
          secondaryFont: companyData.company.secondaryFont,
          keywords: companyData.company.keywords || [],
          socialLinks: companyData.company.socialLinks,
          contactEmail: companyData.company.contactEmail,
          contactPhone: companyData.company.contactPhone,
          onboardingStatus: companyData.company.onboardingStatus,
        });

        // Fetch audiences for this company
        try {
          const audiencesResponse = await fetch(`/api/audiences?companyId=${companyData.company.id}`);
          if (audiencesResponse.ok) {
            const audiencesData = await audiencesResponse.json();
            setAudiences(audiencesData.audiences || []);
          }
        } catch {
          // Audiences fetch failed, but we still have brand data
          console.warn("Failed to fetch audiences");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandData();
  }, [fetchBrandData]);

  // Derive brand colors array - memoized to prevent infinite re-renders
  const brandColors = useMemo(() => {
    if (!brand) return [];
    return [
      brand.primaryColor,
      brand.secondaryColor,
      brand.accentColor,
      ...(brand.brandColors || []),
    ].filter((c): c is string => !!c);
  }, [brand?.primaryColor, brand?.secondaryColor, brand?.accentColor, brand?.brandColors]);

  // Derive typography - memoized to prevent infinite re-renders
  const brandTypography = useMemo(() => ({
    primary: brand?.primaryFont || "",
    secondary: brand?.secondaryFont || "",
  }), [brand?.primaryFont, brand?.secondaryFont]);

  // Derive tone of voice from industry/archetype
  const toneOfVoice = useMemo(() => deriveToneOfVoice(brand), [brand]);

  return {
    brand,
    audiences,
    brandColors,
    brandTypography,
    toneOfVoice,
    isLoading,
    error,
    refetch: fetchBrandData,
  };
}

// =============================================================================
// HELPER: Derive tone of voice from brand attributes
// =============================================================================

function deriveToneOfVoice(brand: BrandData | null): string {
  if (!brand) return "Professional";

  const { industry, industryArchetype, keywords } = brand;

  // Check keywords for tone indicators
  const keywordsLower = (keywords || []).map((k) => k.toLowerCase());

  if (keywordsLower.some((k) => ["playful", "fun", "creative", "vibrant"].includes(k))) {
    return "Playful & Creative";
  }
  if (keywordsLower.some((k) => ["luxury", "premium", "exclusive", "elegant"].includes(k))) {
    return "Premium & Sophisticated";
  }
  if (keywordsLower.some((k) => ["friendly", "approachable", "warm", "welcoming"].includes(k))) {
    return "Friendly & Approachable";
  }
  if (keywordsLower.some((k) => ["bold", "innovative", "disruptive", "cutting-edge"].includes(k))) {
    return "Bold & Innovative";
  }

  // Derive from archetype
  if (industryArchetype) {
    const archetypeTones: Record<string, string> = {
      hospitality: "Warm & Welcoming",
      "blue-collar": "Direct & Trustworthy",
      "white-collar": "Professional & Authoritative",
      "e-commerce": "Engaging & Persuasive",
      tech: "Modern & Innovative",
    };
    if (archetypeTones[industryArchetype.toLowerCase()]) {
      return archetypeTones[industryArchetype.toLowerCase()];
    }
  }

  // Derive from industry
  if (industry) {
    const industryTones: Record<string, string> = {
      technology: "Modern & Innovative",
      saas: "Clear & Solution-focused",
      finance: "Trustworthy & Professional",
      healthcare: "Caring & Authoritative",
      education: "Informative & Encouraging",
      "food & beverage": "Appetizing & Inviting",
      "fashion & apparel": "Trendy & Aspirational",
      entertainment: "Exciting & Engaging",
    };
    const industryLower = industry.toLowerCase();
    for (const [key, tone] of Object.entries(industryTones)) {
      if (industryLower.includes(key)) {
        return tone;
      }
    }
  }

  return "Professional & Clear";
}

export default useBrandData;
