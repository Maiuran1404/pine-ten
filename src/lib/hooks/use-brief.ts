"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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
import { getDimensionsForPlatform } from "@/lib/constants/platform-dimensions";
import type { InferredAudience } from "@/components/onboarding/types";
import type { DeliverableStyle, MoodboardItem } from "@/components/chat/types";

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
}

interface UseBriefReturn {
  // State
  brief: LiveBrief;
  completion: number;
  isReady: boolean;
  pendingQuestion: ClarifyingQuestion | null;

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
  resetBrief: () => void;
  exportBrief: () => string;
}

export function useBrief({
  draftId,
  brandAudiences = [],
  brandColors = [],
  brandTypography = { primary: "", secondary: "" },
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

  // Computed values
  const completion = useMemo(() => calculateBriefCompletion(brief), [brief]);
  const isReady = useMemo(() => isBriefReadyForDesigner(brief), [brief]);

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

      // Apply inference to brief
      setBrief((currentBrief) =>
        applyInferenceToBrief(currentBrief, inference, brandAudiences)
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

  // Export brief as text
  const exportBrief = useCallback(() => {
    const sections: string[] = [];

    sections.push("# Designer Brief");
    sections.push("");

    if (brief.taskSummary.value) {
      sections.push(`## ${brief.taskSummary.value}`);
      sections.push("");
    }

    if (brief.intent.value) {
      sections.push(`**Intent:** ${brief.intent.value}`);
    }

    if (brief.platform.value) {
      sections.push(`**Platform:** ${brief.platform.value}`);
    }

    if (brief.dimensions.length > 0) {
      const dimsText = brief.dimensions
        .map((d) => `${d.name} (${d.width}x${d.height})`)
        .join(", ");
      sections.push(`**Dimensions:** ${dimsText}`);
    }

    if (brief.audience.value) {
      sections.push("");
      sections.push("### Target Audience");
      sections.push(`**Name:** ${brief.audience.value.name}`);
      if (brief.audience.value.demographics) {
        sections.push(`**Demographics:** ${brief.audience.value.demographics}`);
      }
      if (brief.audience.value.painPoints?.length) {
        sections.push(`**Pain Points:** ${brief.audience.value.painPoints.join(", ")}`);
      }
      if (brief.audience.value.goals?.length) {
        sections.push(`**Goals:** ${brief.audience.value.goals.join(", ")}`);
      }
    }

    if (brief.topic.value) {
      sections.push("");
      sections.push(`### Topic`);
      sections.push(brief.topic.value);
    }

    if (brief.contentOutline?.weekGroups.length) {
      sections.push("");
      sections.push("### Content Outline");
      brief.contentOutline.weekGroups.forEach((group) => {
        sections.push(`\n**${group.label}**`);
        group.items.forEach((item) => {
          sections.push(`${item.number}. **${item.title}** - ${item.description}`);
        });
      });
    }

    if (brief.visualDirection) {
      sections.push("");
      sections.push("### Visual Direction");
      if (brief.visualDirection.selectedStyles.length) {
        sections.push(
          `**Styles:** ${brief.visualDirection.selectedStyles.map((s) => s.name).join(", ")}`
        );
      }
      if (brief.visualDirection.colorPalette.length) {
        sections.push(`**Colors:** ${brief.visualDirection.colorPalette.join(", ")}`);
      }
      if (brief.visualDirection.moodKeywords.length) {
        sections.push(`**Mood:** ${brief.visualDirection.moodKeywords.join(", ")}`);
      }
    }

    return sections.join("\n");
  }, [brief]);

  return {
    brief,
    completion,
    isReady,
    pendingQuestion,
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
    resetBrief,
    exportBrief,
  };
}

export default useBrief;
