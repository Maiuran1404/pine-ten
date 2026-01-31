"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  ServiceType,
  IntakeState,
  IntakeMessage,
  IntakeData,
  IntakeSummary,
  GroupedQuestion,
} from "@/lib/creative-intake/types";
import {
  createEmptyIntakeState,
  SERVICE_DEFINITIONS,
} from "@/lib/creative-intake/types";
import {
  getFlowConfig,
  getFlowStep,
  getNextStep,
  validateStep,
  calculateFlowProgress,
  applySmartDefaults,
} from "@/lib/creative-intake/flow-config";
import { getInitialMessage, parseIntakeResponse } from "@/lib/creative-intake/prompts";

const STORAGE_KEY = "creative_intake_draft";

interface UseCreativeIntakeOptions {
  onComplete?: (data: IntakeData) => void;
  persistDraft?: boolean;
}

interface UseCreativeIntakeReturn {
  // State
  state: IntakeState;
  isLoading: boolean;
  error: string | null;

  // Actions
  selectService: (serviceType: ServiceType) => void;
  sendMessage: (content: string) => Promise<void>;
  submitGroupedAnswers: (answers: Record<string, string | string[]>) => void;
  submitQuickOption: (value: string) => void;
  confirmSummary: () => void;
  editSummaryField: (field: string, value: string | string[]) => void;
  reset: () => void;

  // Derived state
  currentStep: string | null;
  progress: number;
  canSubmit: boolean;
}

export function useCreativeIntake(
  options: UseCreativeIntakeOptions = {}
): UseCreativeIntakeReturn {
  const { onComplete, persistDraft = true } = options;

  const [state, setState] = useState<IntakeState>(() => {
    // Try to restore from localStorage
    if (typeof window !== "undefined" && persistDraft) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            startedAt: new Date(parsed.startedAt),
            updatedAt: new Date(parsed.updatedAt),
          };
        } catch {
          // Invalid saved state, start fresh
        }
      }
    }
    return createEmptyIntakeState(uuidv4());
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    if (persistDraft && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, persistDraft]);

  // Add message helper
  const addMessage = useCallback(
    (message: Omit<IntakeMessage, "id" | "timestamp">) => {
      const newMessage: IntakeMessage = {
        ...message,
        id: uuidv4(),
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        updatedAt: new Date(),
      }));

      return newMessage;
    },
    []
  );

  // Update data helper
  const updateData = useCallback(
    (updates: Partial<IntakeData>) => {
      setState((prev) => {
        const newData = { ...prev.data, ...updates };
        // Apply smart defaults
        const withDefaults = prev.serviceType
          ? applySmartDefaults(prev.serviceType, newData)
          : newData;

        return {
          ...prev,
          data: withDefaults,
          updatedAt: new Date(),
        };
      });
    },
    []
  );

  // Select service
  const selectService = useCallback(
    (serviceType: ServiceType) => {
      const flowConfig = getFlowConfig(serviceType);
      const initialStep = flowConfig.initialStep;

      setState((prev) => ({
        ...prev,
        serviceType,
        stage: "context",
        updatedAt: new Date(),
      }));

      setCurrentStepId(initialStep);

      // Add initial assistant message
      const initialMessage = getInitialMessage(serviceType);
      const step = getFlowStep(serviceType, initialStep);

      addMessage({
        role: "assistant",
        content: initialMessage,
        questionType: step?.questionType === "grouped" ? "grouped" : "open",
        groupedQuestions: step?.groupedQuestions,
        quickOptions: step?.quickOptions?.map((opt) => ({
          label: opt.label,
          value: opt.value,
          variant: opt.variant,
        })),
      });
    },
    [addMessage]
  );

  // Send user message (for open-ended questions)
  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.serviceType || !currentStepId) return;

      setIsLoading(true);
      setError(null);

      // Add user message
      addMessage({
        role: "user",
        content,
      });

      try {
        // Call API to process message
        const response = await fetch("/api/creative-intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType: state.serviceType,
            currentStep: currentStepId,
            messages: state.messages,
            userMessage: content,
            currentData: state.data,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to process message");
        }

        const result = await response.json();

        // Parse the response
        const parsed = parseIntakeResponse(result.response);

        // Update data with extracted info
        if (result.extractedData) {
          updateData(result.extractedData);
        }

        // Determine next step
        const nextStepId = result.nextStep || getNextStep(
          state.serviceType,
          currentStepId,
          { ...state.data, ...result.extractedData }
        );

        if (nextStepId) {
          setCurrentStepId(nextStepId);
          const nextStep = getFlowStep(state.serviceType, nextStepId);

          // Add assistant response with appropriate question type
          addMessage({
            role: "assistant",
            content: parsed.text,
            questionType: nextStep?.questionType === "confirmation"
              ? "confirmation"
              : nextStep?.questionType === "grouped"
                ? "grouped"
                : parsed.groupedQuestions
                  ? "grouped"
                  : "open",
            groupedQuestions: parsed.groupedQuestions?.questions || nextStep?.groupedQuestions,
            quickOptions: parsed.quickOptions?.options || nextStep?.quickOptions?.map((opt) => ({
              label: opt.label,
              value: opt.value,
              variant: opt.variant,
            })),
            summary: parsed.summary,
          });

          // Update stage
          if (nextStep?.stage) {
            setState((prev) => ({
              ...prev,
              stage: nextStep.stage,
            }));
          }
        } else {
          // No next step, add response and move to review
          addMessage({
            role: "assistant",
            content: parsed.text,
            questionType: "confirmation",
            summary: parsed.summary,
          });

          setState((prev) => ({
            ...prev,
            stage: "review",
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [state.serviceType, state.messages, state.data, currentStepId, addMessage, updateData]
  );

  // Submit grouped answers
  const submitGroupedAnswers = useCallback(
    (answers: Record<string, string | string[]>) => {
      if (!state.serviceType || !currentStepId) return;

      // Update data with answers
      updateData(answers as Partial<IntakeData>);

      // Add user message summarizing answers
      const answerSummary = Object.entries(answers)
        .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v.trim() !== ""))
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");

      addMessage({
        role: "user",
        content: answerSummary,
      });

      // Determine next step
      const nextStepId = getNextStep(
        state.serviceType,
        currentStepId,
        { ...state.data, ...answers }
      );

      if (nextStepId) {
        setCurrentStepId(nextStepId);
        const nextStep = getFlowStep(state.serviceType, nextStepId);

        if (nextStep) {
          // Generate assistant message for next step
          let assistantContent = "";

          if (nextStep.questionType === "open" && nextStep.openQuestion) {
            assistantContent = nextStep.openQuestion;
          } else if (nextStep.questionType === "quick" && nextStep.quickPrompt) {
            assistantContent = nextStep.quickPrompt;
          } else if (nextStep.questionType === "grouped") {
            assistantContent = "A few more details:";
          } else if (nextStep.questionType === "confirmation") {
            assistantContent = "Here's what I have:";
          }

          addMessage({
            role: "assistant",
            content: assistantContent,
            questionType: nextStep.questionType,
            groupedQuestions: nextStep.groupedQuestions,
            quickOptions: nextStep.quickOptions?.map((opt) => ({
              label: opt.label,
              value: opt.value,
              variant: opt.variant,
            })),
          });

          setState((prev) => ({
            ...prev,
            stage: nextStep.stage,
          }));
        }
      } else {
        // Move to review stage
        moveToReview();
      }
    },
    [state.serviceType, state.data, currentStepId, addMessage, updateData]
  );

  // Submit quick option
  const submitQuickOption = useCallback(
    (value: string) => {
      if (!state.serviceType || !currentStepId) return;

      const step = getFlowStep(state.serviceType, currentStepId);
      if (!step?.requiredFields) return;

      // Map the value to the required field
      const fieldName = step.requiredFields[0];
      const updates: Record<string, string | boolean> = {};

      // Handle special cases
      if (fieldName === "hasLogo") {
        updates[fieldName] = value === "yes";
      } else {
        updates[fieldName] = value;
      }

      updateData(updates as Partial<IntakeData>);

      // Add user message
      const selectedOption = step.quickOptions?.find((opt) => opt.value === value);
      addMessage({
        role: "user",
        content: selectedOption?.label || value,
      });

      // Move to next step
      const nextStepId = getNextStep(
        state.serviceType,
        currentStepId,
        { ...state.data, ...updates }
      );

      if (nextStepId) {
        setCurrentStepId(nextStepId);
        const nextStep = getFlowStep(state.serviceType, nextStepId);

        if (nextStep) {
          let assistantContent = "";

          if (nextStep.questionType === "open" && nextStep.openQuestion) {
            assistantContent = nextStep.openQuestion;
          } else if (nextStep.questionType === "grouped") {
            assistantContent = "A few more details:";
          } else if (nextStep.questionType === "confirmation") {
            assistantContent = "Here's what I have:";
          }

          addMessage({
            role: "assistant",
            content: assistantContent,
            questionType: nextStep.questionType,
            groupedQuestions: nextStep.groupedQuestions,
            quickOptions: nextStep.quickOptions?.map((opt) => ({
              label: opt.label,
              value: opt.value,
              variant: opt.variant,
            })),
          });

          setState((prev) => ({
            ...prev,
            stage: nextStep.stage,
          }));
        }
      } else {
        moveToReview();
      }
    },
    [state.serviceType, state.data, currentStepId, addMessage, updateData]
  );

  // Move to review stage
  const moveToReview = useCallback(() => {
    if (!state.serviceType) return;

    const finalData = applySmartDefaults(state.serviceType, state.data);
    const serviceDefinition = SERVICE_DEFINITIONS[state.serviceType];

    // Generate summary
    const summary: IntakeSummary = {
      serviceType: state.serviceType,
      title: `${serviceDefinition.label} Brief`,
      items: generateSummaryItems(state.serviceType, finalData),
      recommendations: generateRecommendations(state.serviceType, finalData),
      readyToSubmit: true,
    };

    addMessage({
      role: "assistant",
      content: "Here's what I have. Look good?",
      questionType: "confirmation",
      summary,
    });

    setState((prev) => ({
      ...prev,
      stage: "review",
      data: finalData,
    }));
  }, [state.serviceType, state.data, addMessage]);

  // Confirm summary and complete
  const confirmSummary = useCallback(() => {
    if (!state.serviceType) return;

    setState((prev) => ({
      ...prev,
      stage: "complete",
    }));

    // Clear draft from storage
    if (persistDraft && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Call completion handler
    if (onComplete) {
      onComplete(state.data as IntakeData);
    }
  }, [state.serviceType, state.data, onComplete, persistDraft]);

  // Edit summary field
  const editSummaryField = useCallback(
    (field: string, value: string | string[]) => {
      updateData({ [field]: value } as Partial<IntakeData>);
    },
    [updateData]
  );

  // Reset to start
  const reset = useCallback(() => {
    const newState = createEmptyIntakeState(uuidv4());
    setState(newState);
    setCurrentStepId(null);
    setError(null);

    if (persistDraft && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [persistDraft]);

  // Calculate progress
  const progress = state.serviceType && currentStepId
    ? calculateFlowProgress(state.serviceType, currentStepId)
    : 0;

  // Check if can submit
  const canSubmit = state.stage === "review";

  return {
    state,
    isLoading,
    error,
    selectService,
    sendMessage,
    submitGroupedAnswers,
    submitQuickOption,
    confirmSummary,
    editSummaryField,
    reset,
    currentStep: currentStepId,
    progress,
    canSubmit,
  };
}

// Helper: Generate summary items from data
function generateSummaryItems(
  serviceType: ServiceType,
  data: Partial<IntakeData>
): IntakeSummary["items"] {
  const items: IntakeSummary["items"] = [];

  switch (serviceType) {
    case "launch_video":
      if (data.productDescription) {
        items.push({ label: "Product", value: data.productDescription, source: "user", editable: true });
      }
      if (data.keyMessage) {
        items.push({ label: "Key Message", value: data.keyMessage, source: "user", editable: true });
      }
      if (data.platforms) {
        items.push({ label: "Platforms", value: data.platforms as string[], source: "user", editable: false });
      }
      if (data.recommendedLength) {
        items.push({ label: "Length", value: data.recommendedLength, source: "default", editable: false });
      }
      if (data.storylinePreference) {
        items.push({
          label: "Storyline",
          value: data.storylinePreference === "create_for_me" ? "We'll create one" : "You have ideas",
          source: "user",
          editable: false,
        });
      }
      break;

    case "video_edit":
      if (data.videoType) {
        items.push({ label: "Video Type", value: data.videoType, source: "user", editable: false });
      }
      if (data.platforms) {
        items.push({ label: "Platforms", value: data.platforms as string[], source: "user", editable: false });
      }
      if (data.goal) {
        items.push({ label: "Goal", value: data.goal, source: "user", editable: false });
      }
      if (data.footageLink) {
        items.push({ label: "Footage", value: "Provided ✓", source: "user", editable: false });
      }
      if (data.recommendedLength) {
        items.push({ label: "Length", value: data.recommendedLength, source: "default", editable: false });
      }
      items.push({ label: "Subtitles", value: "Yes", source: "default", editable: false });
      break;

    case "pitch_deck":
      if (data.currentDeckLink) {
        items.push({ label: "Current Deck", value: "Provided ✓", source: "user", editable: false });
      }
      if (data.additionalNotes) {
        items.push({ label: "Notes", value: data.additionalNotes, source: "user", editable: true });
      }
      break;

    case "brand_package":
      items.push({
        label: "Logo",
        value: data.hasLogo ? "Has logo" : "Need logo created",
        source: "user",
        editable: false,
      });
      if (data.includesItems) {
        items.push({ label: "Includes", value: data.includesItems as string[], source: "user", editable: false });
      }
      break;

    case "social_ads":
      if (data.platforms) {
        items.push({ label: "Platforms", value: data.platforms as string[], source: "user", editable: false });
      }
      if (data.goal) {
        items.push({ label: "Goal", value: data.goal, source: "user", editable: false });
      }
      if (data.productOrOffer) {
        items.push({ label: "Promoting", value: data.productOrOffer, source: "user", editable: true });
      }
      if (data.recommendedFormat) {
        items.push({ label: "Format", value: data.recommendedFormat, source: "default", editable: false });
      }
      if (data.recommendedCta) {
        items.push({ label: "CTA", value: data.recommendedCta, source: "default", editable: true });
      }
      break;

    case "social_content":
      if (data.platforms) {
        items.push({ label: "Platforms", value: data.platforms as string[], source: "user", editable: false });
      }
      if (data.goal) {
        items.push({ label: "Goal", value: data.goal, source: "user", editable: false });
      }
      if (data.topics) {
        items.push({ label: "Topics", value: data.topics as string[], source: "user", editable: true });
      }
      if (data.recommendedFrequency) {
        items.push({ label: "Frequency", value: data.recommendedFrequency, source: "default", editable: false });
      }
      if (data.recommendedContentTypes) {
        items.push({ label: "Content Types", value: data.recommendedContentTypes as string[], source: "default", editable: false });
      }
      break;
  }

  return items;
}

// Helper: Generate recommendations
function generateRecommendations(
  serviceType: ServiceType,
  data: Partial<IntakeData>
): string[] {
  const recommendations: string[] = [];

  switch (serviceType) {
    case "launch_video":
      if (data.platforms?.includes("tiktok") || data.platforms?.includes("reels")) {
        recommendations.push("Hook viewers in the first 3 seconds");
      }
      if (data.keyMessage) {
        recommendations.push(`Lead with your key differentiator: "${data.keyMessage}"`);
      }
      break;

    case "video_edit":
      recommendations.push("We'll add dynamic text overlays for key points");
      if (data.videoType === "talking_head") {
        recommendations.push("Consider B-roll footage to break up talking sections");
      }
      break;

    case "pitch_deck":
      recommendations.push("We'll maintain your brand consistency throughout");
      recommendations.push("Focus on visual storytelling over text-heavy slides");
      break;

    case "brand_package":
      recommendations.push("We'll create versatile assets that work across all platforms");
      break;

    case "social_ads":
      if (data.goal === "sales") {
        recommendations.push("Show social proof and urgency in the creative");
      }
      if (data.goal === "awareness") {
        recommendations.push("Focus on brand storytelling over direct selling");
      }
      break;

    case "social_content":
      recommendations.push("Mix educational and entertaining content for best engagement");
      if (data.goal === "authority") {
        recommendations.push("Share unique insights and data from your expertise");
      }
      break;
  }

  return recommendations;
}
