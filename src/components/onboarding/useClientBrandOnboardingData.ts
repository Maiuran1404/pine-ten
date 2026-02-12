/**
 * Custom hook for ClientBrandOnboarding component.
 * Manages brand data fetching, website scanning, onboarding submission,
 * and brand reference matching.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import { type BrandData, type OnboardingStep, defaultBrandData } from "./types";
import { detectStyleName } from "./client-brand-onboarding.utils";

interface BrandReference {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  toneBucket: string;
  densityBucket: string;
  colorBucket: string;
  energyBucket: string;
}

interface UseClientBrandOnboardingDataOptions {
  onComplete: () => void;
}

export function useClientBrandOnboardingData({ onComplete }: UseClientBrandOnboardingDataOptions) {
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
  const [brandReferences, setBrandReferences] = useState<BrandReference[]>([]);
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

        const { tone, energy } = data.buckets || {};
        setDetectedStyleName(detectStyleName(tone, energy));
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

  const handleWebsiteScan = useCallback(async () => {
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
  }, [websiteUrl]);

  const handleContinueFromBrandInput = useCallback(() => {
    if (websiteUrl.trim()) {
      handleWebsiteScan();
    }
  }, [websiteUrl, handleWebsiteScan]);

  const handleSubmit = useCallback(async () => {
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

      await refetchSession();

      setStep("complete");
      setIsLoading(false);
      toast.success("Brand profile saved!");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }, [brandData, websiteUrl, refetchSession]);

  const handleColorChange = useCallback((colorKey: keyof BrandData, value: string) => {
    setBrandData((prev) => ({ ...prev, [colorKey]: value }));
  }, []);

  const handleSignOut = useCallback(() => {
    signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } });
  }, []);

  return {
    // Step navigation
    step,
    setStep,

    // Website input
    websiteUrl,
    setWebsiteUrl,

    // Brand data
    brandData,
    setBrandData,

    // Loading/error states
    isLoading,
    scanError,
    setScanError,
    scanProgress,
    hasScannedWebsite,

    // Industry selector
    industryOpen,
    setIndustryOpen,
    industrySearch,
    setIndustrySearch,

    // Brand references
    brandReferences,
    isLoadingReferences,
    detectedStyleName,

    // Actions
    handleWebsiteScan,
    handleContinueFromBrandInput,
    handleSubmit,
    handleColorChange,
    handleSignOut,
    onComplete,
  };
}
