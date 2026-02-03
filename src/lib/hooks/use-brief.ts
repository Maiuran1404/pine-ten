"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  LiveBrief,
  InferenceResult,
  ContentOutline,
  VisualDirection,
  Intent,
  Platform,
  TaskType,
  AudienceBrief,
  ClarifyingQuestion,
} from "@/components/chat/brief-panel/types";
import {
  createEmptyBrief,
  calculateBriefCompletion,
  isBriefReadyForDesigner,
} from "@/components/chat/brief-panel/types";
import {
  inferFromMessage,
  applyInferenceToBrief,
  generateClarifyingQuestions,
  shouldAskClarifyingQuestion,
  generateTaskSummary,
  type InferenceInput,
} from "@/lib/ai/inference-engine";
import {
  generateContentOutline,
  generateDesignerBrief,
  exportBriefAsMarkdown,
} from "@/lib/ai/brief-generator";
import { getDimensionsForPlatform } from "@/lib/constants/platform-dimensions";
import type { InferredAudience } from "@/components/onboarding/types";
import type { DeliverableStyle, MoodboardItem } from "@/components/chat/types";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// BRIEF HOOK
// =============================================================================

interface UseBriefOptions {
  draftId: string;
  brandAudiences?: InferredAudience[];
  brandColors?: string[];
  brandTypography?: {
    primary: string;
    secondary: string;
  };
  brandName?: string;
  brandIndustry?: string;
  brandToneOfVoice?: string;
  brandDescription?: string;
}

interface UseBriefReturn {
  // State
  brief: LiveBrief;
  completion: number;
  isReady: boolean;
  pendingQuestion: ClarifyingQuestion | null;
  isGeneratingOutline: boolean;
  isSaving: boolean;
  isLoading: boolean;
  briefId: string | null;

  // Actions
  processMessage: (message: string) => void;
  confirmField: (field: keyof LiveBrief) => void;
  updateField: <K extends keyof LiveBrief>(field: K, value: LiveBrief[K]) => void;
  updateBrief: (brief: LiveBrief) => void;
  setIntent: (intent: Intent) => void;
  setPlatform: (platform: Platform) => void;
  setTaskType: (taskType: TaskType) => void;
  setAudience: (audience: AudienceBrief) => void;
  setContentOutline: (outline: ContentOutline | null) => void;
  setVisualDirection: (direction: VisualDirection | null) => void;
  addStyleToVisualDirection: (style: DeliverableStyle) => void;
  syncMoodboardToVisualDirection: (items: MoodboardItem[]) => void;
  answerClarifyingQuestion: (questionId: string, answer: string) => void;
  generateOutline: (durationDays?: number) => Promise<void>;
  resetBrief: () => void;
  exportBrief: () => string;
  saveBrief: () => Promise<void>;
}

export function useBrief({
  draftId,
  brandAudiences = [],
  brandColors = [],
  brandTypography = { primary: "", secondary: "" },
  brandName = "",
  brandIndustry = "",
  brandToneOfVoice = "",
  brandDescription = "",
}: UseBriefOptions): UseBriefReturn {
  // Initialize brief
  const [brief, setBrief] = useState<LiveBrief>(() => {
    const newBrief = createEmptyBrief(draftId);

    // Pre-populate with brand data
    if (brandColors.length > 0) {
      newBrief.visualDirection = {
        selectedStyles: [],
        moodKeywords: [],
        colorPalette: brandColors,
        typography: brandTypography,
        avoidElements: [],
      };
    }

    // Set default audience if available
    if (brandAudiences.length > 0) {
      const primaryAudience = brandAudiences.find((a) => a.isPrimary) || brandAudiences[0];
      newBrief.audience = {
        value: {
          name: primaryAudience.name,
          demographics: primaryAudience.demographics
            ? `Ages ${primaryAudience.demographics.ageRange?.min}-${primaryAudience.demographics.ageRange?.max}`
            : undefined,
          psychographics: primaryAudience.psychographics?.values?.join(", "),
          painPoints: primaryAudience.psychographics?.painPoints,
          goals: primaryAudience.psychographics?.goals,
          source: "inferred",
        },
        confidence: 0.6,
        source: "inferred",
      };
    }

    return newBrief;
  });

  const [pendingQuestion, setPendingQuestion] = useState<ClarifyingQuestion | null>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [briefId, setBriefId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  // Computed values
  const completion = useMemo(() => calculateBriefCompletion(brief), [brief]);
  const isReady = useMemo(() => isBriefReadyForDesigner(brief), [brief]);

  // Debounce brief changes for auto-save (500ms delay - fast enough to save before refresh)
  const debouncedBrief = useDebounce(brief, 500);

  // Load brief from database on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadBrief = async () => {
      try {
        const response = await fetch(`/api/briefs?draftId=${draftId}`);
        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        if (data.brief) {
          setBrief(data.brief);
          setBriefId(data.brief.id);
          lastSavedRef.current = JSON.stringify(data.brief);
        }
      } catch (error) {
        console.error("Failed to load brief:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBrief();
  }, [draftId]);

  // Auto-save brief when it changes (debounced)
  useEffect(() => {
    if (isLoading) return;

    const briefJson = JSON.stringify(debouncedBrief);
    if (briefJson === lastSavedRef.current) return;

    const saveBrief = async () => {
      setIsSaving(true);
      try {
        const response = await fetch("/api/briefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: debouncedBrief,
            draftId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setBriefId(data.id);
          lastSavedRef.current = briefJson;
        }
      } catch (error) {
        console.error("Failed to auto-save brief:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveBrief();
  }, [debouncedBrief, draftId, isLoading]);

  // Manual save function
  const saveBrief = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          draftId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBriefId(data.id);
        lastSavedRef.current = JSON.stringify(brief);
      }
    } catch (error) {
      console.error("Failed to save brief:", error);
    } finally {
      setIsSaving(false);
    }
  }, [brief, draftId]);

  // Process a user message and update brief via inference
  const processMessage = useCallback(
    (message: string) => {
      // Add to conversation history
      setConversationHistory((prev) => [...prev.slice(-5), message]);

      // Run inference
      const inferenceInput: InferenceInput = {
        message,
        conversationHistory,
        brandAudiences,
      };

      const inference = inferFromMessage(inferenceInput);

      // Apply inference to brief, passing the original message for audience matching
      setBrief((currentBrief) =>
        applyInferenceToBrief(currentBrief, inference, brandAudiences, message)
      );

      // Check if we need to ask a clarifying question
      if (shouldAskClarifyingQuestion(inference)) {
        const questions = generateClarifyingQuestions(
          inference,
          brief.clarifyingQuestionsAsked
        );
        if (questions.length > 0) {
          setPendingQuestion(questions[0]);
        }
      } else {
        setPendingQuestion(null);
      }
    },
    [conversationHistory, brandAudiences, brief.clarifyingQuestionsAsked]
  );

  // Confirm an inferred field
  const confirmField = useCallback((field: keyof LiveBrief) => {
    setBrief((current) => {
      const fieldValue = current[field];
      if (fieldValue && typeof fieldValue === "object" && "source" in fieldValue) {
        return {
          ...current,
          [field]: { ...fieldValue, source: "confirmed" as const },
          updatedAt: new Date(),
        };
      }
      return current;
    });
  }, []);

  // Update a specific field
  const updateField = useCallback(<K extends keyof LiveBrief>(
    field: K,
    value: LiveBrief[K]
  ) => {
    setBrief((current) => ({
      ...current,
      [field]: value,
      updatedAt: new Date(),
    }));
  }, []);

  // Update entire brief
  const updateBrief = useCallback((newBrief: LiveBrief) => {
    setBrief(newBrief);
  }, []);

  // Set intent
  const setIntent = useCallback((intent: Intent) => {
    setBrief((current) => ({
      ...current,
      intent: { value: intent, confidence: 1, source: "confirmed" },
      updatedAt: new Date(),
    }));
  }, []);

  // Set platform (and auto-populate dimensions)
  const setPlatform = useCallback((platform: Platform) => {
    const dimensions = getDimensionsForPlatform(platform);
    setBrief((current) => ({
      ...current,
      platform: { value: platform, confidence: 1, source: "confirmed" },
      dimensions,
      updatedAt: new Date(),
    }));
  }, []);

  // Set task type
  const setTaskType = useCallback((taskType: TaskType) => {
    setBrief((current) => ({
      ...current,
      taskType: { value: taskType, confidence: 1, source: "confirmed" },
      updatedAt: new Date(),
    }));
  }, []);

  // Set audience
  const setAudience = useCallback((audience: AudienceBrief) => {
    setBrief((current) => ({
      ...current,
      audience: { value: audience, confidence: 1, source: "confirmed" },
      updatedAt: new Date(),
    }));
  }, []);

  // Set content outline
  const setContentOutline = useCallback((outline: ContentOutline | null) => {
    setBrief((current) => ({
      ...current,
      contentOutline: outline,
      updatedAt: new Date(),
    }));
  }, []);

  // Set visual direction
  const setVisualDirection = useCallback((direction: VisualDirection | null) => {
    setBrief((current) => ({
      ...current,
      visualDirection: direction,
      updatedAt: new Date(),
    }));
  }, []);

  // Add a style to visual direction
  const addStyleToVisualDirection = useCallback((style: DeliverableStyle) => {
    setBrief((current) => {
      const currentDirection = current.visualDirection || {
        selectedStyles: [],
        moodKeywords: [],
        colorPalette: brandColors,
        typography: brandTypography,
        avoidElements: [],
      };

      // Don't add if already exists
      if (currentDirection.selectedStyles.some((s) => s.id === style.id)) {
        return current;
      }

      return {
        ...current,
        visualDirection: {
          ...currentDirection,
          selectedStyles: [...currentDirection.selectedStyles, style],
        },
        updatedAt: new Date(),
      };
    });
  }, [brandColors, brandTypography]);

  // Sync moodboard items to visual direction
  const syncMoodboardToVisualDirection = useCallback(
    (items: MoodboardItem[]) => {
      setBrief((current) => {
        const styles: DeliverableStyle[] = items
          .filter((item) => item.type === "style" && item.metadata?.styleId)
          .map((item) => ({
            id: item.metadata!.styleId!,
            name: item.name,
            description: null,
            imageUrl: item.imageUrl,
            deliverableType: item.metadata?.deliverableType || "",
            styleAxis: item.metadata?.styleAxis || "",
            subStyle: null,
            semanticTags: [],
          }));

        const colors: string[] = [
          ...brandColors,
          ...items
            .filter((item) => item.type === "color")
            .flatMap((item) => item.metadata?.colorSamples || []),
        ];

        return {
          ...current,
          visualDirection: {
            selectedStyles: styles,
            moodKeywords: current.visualDirection?.moodKeywords || [],
            colorPalette: [...new Set(colors)],
            typography: brandTypography,
            avoidElements: current.visualDirection?.avoidElements || [],
          },
          updatedAt: new Date(),
        };
      });
    },
    [brandColors, brandTypography]
  );

  // Answer a clarifying question
  const answerClarifyingQuestion = useCallback(
    (questionId: string, answer: string) => {
      setBrief((current) => {
        let updated = { ...current, updatedAt: new Date() };

        // Apply the answer based on question type
        if (questionId === "platform") {
          const dimensions = getDimensionsForPlatform(answer as Platform);
          updated = {
            ...updated,
            platform: { value: answer as Platform, confidence: 1, source: "confirmed" },
            dimensions,
          };
        } else if (questionId === "intent") {
          updated = {
            ...updated,
            intent: { value: answer as Intent, confidence: 1, source: "confirmed" },
          };
        }

        // Mark question as asked
        updated.clarifyingQuestionsAsked = [
          ...current.clarifyingQuestionsAsked,
          questionId,
        ];

        return updated;
      });

      setPendingQuestion(null);
    },
    []
  );

  // Generate content outline for multi-asset plans (AI-powered)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  const generateOutline = useCallback(
    async (durationDays: number = 30) => {
      if (!brief.platform.value || !brief.intent.value) {
        return; // Need platform and intent to generate outline
      }

      setIsGeneratingOutline(true);

      try {
        // Call AI-powered outline generation API
        const response = await fetch("/api/brief/generate-outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: brief.topic.value || "content",
            platform: brief.platform.value,
            contentType: "post",
            intent: brief.intent.value,
            durationDays,
            audienceName: brief.audience.value?.name,
            audienceDescription: brief.audience.value?.psychographics,
            brandName,
            brandIndustry,
            brandTone: brandToneOfVoice,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate outline");
        }

        const data = await response.json();

        setBrief((current) => ({
          ...current,
          contentOutline: data.outline,
          updatedAt: new Date(),
        }));
      } catch (error) {
        console.error("Failed to generate AI outline, falling back to template:", error);

        // Fallback to local template-based generation
        const outline = generateContentOutline({
          topic: brief.topic.value || "content",
          platform: brief.platform.value,
          contentType: "post",
          intent: brief.intent.value,
          durationDays,
          audienceName: brief.audience.value?.name,
        });

        setBrief((current) => ({
          ...current,
          contentOutline: outline,
          updatedAt: new Date(),
        }));
      } finally {
        setIsGeneratingOutline(false);
      }
    },
    [brief.platform.value, brief.intent.value, brief.topic.value, brief.audience.value?.name, brief.audience.value?.psychographics, brandName, brandIndustry, brandToneOfVoice]
  );

  // Reset brief
  const resetBrief = useCallback(() => {
    const newBrief = createEmptyBrief(draftId);

    if (brandColors.length > 0) {
      newBrief.visualDirection = {
        selectedStyles: [],
        moodKeywords: [],
        colorPalette: brandColors,
        typography: brandTypography,
        avoidElements: [],
      };
    }

    setBrief(newBrief);
    setPendingQuestion(null);
    setConversationHistory([]);
  }, [draftId, brandColors, brandTypography]);

  // Export brief as formatted markdown
  const exportBrief = useCallback(() => {
    const designerBrief = generateDesignerBrief(
      brief,
      {
        name: brandName || "Brand",
        industry: brandIndustry || "General",
        toneOfVoice: brandToneOfVoice || "Professional",
        brandDescription: brandDescription || "",
      },
      draftId
    );

    return exportBriefAsMarkdown(designerBrief);
  }, [brief, brandName, brandIndustry, brandToneOfVoice, brandDescription, draftId]);

  return {
    brief,
    completion,
    isReady,
    pendingQuestion,
    isGeneratingOutline,
    isSaving,
    isLoading,
    briefId,
    processMessage,
    confirmField,
    updateField,
    updateBrief,
    setIntent,
    setPlatform,
    setTaskType,
    setAudience,
    setContentOutline,
    setVisualDirection,
    addStyleToVisualDirection,
    syncMoodboardToVisualDirection,
    answerClarifyingQuestion,
    generateOutline,
    resetBrief,
    exportBrief,
    saveBrief,
  };
}

export default useBrief;
