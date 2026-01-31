/**
 * Creative Intake Flow Configuration
 *
 * Defines the question flow, validation rules, and navigation logic
 * for each service type.
 */

import type {
  ServiceType,
  IntakeStage,
  GroupedQuestion,
  QuickOption,
  IntakeData,
  LaunchVideoIntake,
  VideoEditIntake,
  PitchDeckIntake,
  BrandPackageIntake,
  SocialAdsIntake,
  SocialContentIntake,
} from "./types";
import {
  VIDEO_PLATFORMS,
  VIDEO_TYPE_LABELS,
  VIDEO_GOAL_LABELS,
  AD_GOAL_LABELS,
  CONTENT_GOAL_LABELS,
  PLATFORM_LABELS,
  LAUNCH_ASSET_LABELS,
  VIDEO_STYLE_LABELS,
  SMART_DEFAULTS,
} from "./types";

// =============================================================================
// FLOW STEP DEFINITIONS
// =============================================================================

export interface FlowStep {
  id: string;
  stage: IntakeStage;
  questionType: "open" | "grouped" | "quick" | "confirmation";
  // For open questions
  openQuestion?: string;
  // For grouped questions
  groupedQuestions?: GroupedQuestion[];
  // For quick options
  quickOptions?: QuickOption[];
  quickPrompt?: string;
  // Validation
  requiredFields?: string[];
  // Navigation
  nextStep?: string | ((data: Partial<IntakeData>) => string);
  isTerminal?: boolean;
}

export interface FlowConfig {
  serviceType: ServiceType;
  steps: FlowStep[];
  initialStep: string;
}

// =============================================================================
// LAUNCH VIDEO FLOW
// =============================================================================

export const LAUNCH_VIDEO_FLOW: FlowConfig = {
  serviceType: "launch_video",
  initialStep: "context",
  steps: [
    {
      id: "context",
      stage: "context",
      questionType: "open",
      openQuestion:
        "Tell me about your launch - what are you launching, and what's the ONE thing you want viewers to walk away understanding?",
      requiredFields: ["productDescription", "keyMessage"],
      nextStep: "details",
    },
    {
      id: "details",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "platforms",
          label: "Platform(s)",
          type: "multi_select",
          options: VIDEO_PLATFORMS.map((p) => ({
            value: p,
            label: PLATFORM_LABELS[p] || p,
            recommended: ["tiktok", "reels"].includes(p),
          })),
          recommendation: "We recommend TikTok + Reels for maximum reach",
          required: true,
        },
        {
          id: "assetsAvailable",
          label: "What do you have ready?",
          type: "multi_select",
          options: Object.entries(LAUNCH_ASSET_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          required: true,
        },
      ],
      requiredFields: ["platforms", "assetsAvailable"],
      nextStep: "storyline",
    },
    {
      id: "storyline",
      stage: "details",
      questionType: "quick",
      quickPrompt: "For the storyline:",
      quickOptions: [
        { label: "I have ideas", value: "have_ideas" },
        { label: "Create one for me", value: "create_for_me", variant: "recommended" },
      ],
      requiredFields: ["storylinePreference"],
      nextStep: "review",
    },
    {
      id: "review",
      stage: "review",
      questionType: "confirmation",
      isTerminal: true,
    },
  ],
};

// =============================================================================
// VIDEO EDIT FLOW
// =============================================================================

export const VIDEO_EDIT_FLOW: FlowConfig = {
  serviceType: "video_edit",
  initialStep: "video_type",
  steps: [
    {
      id: "video_type",
      stage: "context",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "videoType",
          label: "What type of video?",
          type: "single_select",
          options: Object.entries(VIDEO_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          required: true,
        },
      ],
      requiredFields: ["videoType"],
      nextStep: "platform_goal",
    },
    {
      id: "platform_goal",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "platforms",
          label: "Platform(s)",
          type: "multi_select",
          options: VIDEO_PLATFORMS.map((p) => ({
            value: p,
            label: PLATFORM_LABELS[p] || p,
          })),
          required: true,
        },
        {
          id: "goal",
          label: "Goal",
          type: "single_select",
          options: Object.entries(VIDEO_GOAL_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          required: true,
        },
        {
          id: "footageLink",
          label: "Raw footage link",
          type: "link",
          placeholder: "Drive, Dropbox, or WeTransfer link",
          required: true,
        },
      ],
      requiredFields: ["platforms", "goal", "footageLink"],
      nextStep: "style",
    },
    {
      id: "style",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "stylePreference",
          label: "Style preference (optional)",
          type: "single_select",
          options: Object.entries(VIDEO_STYLE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          required: false,
        },
        {
          id: "brandAssetsLink",
          label: "Brand assets (optional)",
          type: "link",
          placeholder: "Logo, fonts, brand guidelines",
          required: false,
        },
      ],
      nextStep: "review",
    },
    {
      id: "review",
      stage: "review",
      questionType: "confirmation",
      isTerminal: true,
    },
  ],
};

// =============================================================================
// PITCH DECK FLOW
// =============================================================================

export const PITCH_DECK_FLOW: FlowConfig = {
  serviceType: "pitch_deck",
  initialStep: "deck_upload",
  steps: [
    {
      id: "deck_upload",
      stage: "context",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "currentDeckLink",
          label: "Current deck",
          type: "link",
          placeholder: "Google Slides, Figma, PDF, or PPT link",
          required: true,
        },
        {
          id: "additionalNotes",
          label: "Any context? (upcoming pitch, specific issues)",
          type: "text",
          placeholder: "Optional - investor meeting next week, slide 5 needs work, etc.",
          required: false,
        },
      ],
      requiredFields: ["currentDeckLink"],
      nextStep: "review",
    },
    {
      id: "review",
      stage: "review",
      questionType: "confirmation",
      isTerminal: true,
    },
  ],
};

// =============================================================================
// BRAND PACKAGE FLOW
// =============================================================================

export const BRAND_PACKAGE_FLOW: FlowConfig = {
  serviceType: "brand_package",
  initialStep: "logo_check",
  steps: [
    {
      id: "logo_check",
      stage: "context",
      questionType: "quick",
      quickPrompt: "Do you already have a logo?",
      quickOptions: [
        { label: "Yes, I have a logo", value: "yes" },
        { label: "No, I need one created", value: "no" },
      ],
      requiredFields: ["hasLogo"],
      nextStep: (data) => {
        const brandData = data as Partial<BrandPackageIntake>;
        return brandData.hasLogo ? "logo_upload" : "package_options";
      },
    },
    {
      id: "logo_upload",
      stage: "context",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "logoLink",
          label: "Logo file",
          type: "link",
          placeholder: "Drive or Dropbox link to logo files",
          required: true,
        },
      ],
      requiredFields: ["logoLink"],
      nextStep: "package_options",
    },
    {
      id: "package_options",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "includesItems",
          label: "What should be included?",
          type: "multi_select",
          options: [
            { value: "logo", label: "Logo Design", recommended: true },
            { value: "brand_guidelines", label: "Brand Guidelines", recommended: true },
            { value: "social_templates", label: "Social Media Templates", recommended: true },
            { value: "business_cards", label: "Business Cards" },
            { value: "presentations", label: "Presentation Templates" },
          ],
          recommendation: "We recommend: Logo, Brand Guidelines, Social Templates",
          required: true,
        },
        {
          id: "stylePreferences",
          label: "Style direction (optional)",
          type: "text",
          placeholder: "Modern, classic, bold, minimal, etc.",
          required: false,
        },
      ],
      requiredFields: ["includesItems"],
      nextStep: "review",
    },
    {
      id: "review",
      stage: "review",
      questionType: "confirmation",
      isTerminal: true,
    },
  ],
};

// =============================================================================
// SOCIAL ADS FLOW
// =============================================================================

export const SOCIAL_ADS_FLOW: FlowConfig = {
  serviceType: "social_ads",
  initialStep: "product_goal",
  steps: [
    {
      id: "product_goal",
      stage: "context",
      questionType: "open",
      openQuestion:
        "What are you promoting with these ads, and what's your main goal - driving sales, getting sign-ups, building awareness, or capturing leads?",
      requiredFields: ["productOrOffer", "goal"],
      nextStep: "platform_content",
    },
    {
      id: "platform_content",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "platforms",
          label: "Platform(s)",
          type: "multi_select",
          options: [
            { value: "instagram", label: "Instagram", recommended: true },
            { value: "facebook", label: "Facebook", recommended: true },
            { value: "linkedin", label: "LinkedIn" },
            { value: "tiktok", label: "TikTok" },
            { value: "snapchat", label: "Snapchat" },
          ],
          required: true,
        },
        {
          id: "hasContent",
          label: "Do you have content ready?",
          type: "single_select",
          options: [
            { value: "yes", label: "Yes, I have photos/videos" },
            { value: "no", label: "No, I need content created" },
          ],
          required: true,
        },
      ],
      requiredFields: ["platforms", "hasContent"],
      nextStep: (data) => {
        const adData = data as Partial<SocialAdsIntake>;
        return adData.hasContent ? "content_link" : "review";
      },
    },
    {
      id: "content_link",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "contentLink",
          label: "Content link",
          type: "link",
          placeholder: "Drive or Dropbox link to your photos/videos",
          required: true,
        },
      ],
      requiredFields: ["contentLink"],
      nextStep: "review",
    },
    {
      id: "review",
      stage: "review",
      questionType: "confirmation",
      isTerminal: true,
    },
  ],
};

// =============================================================================
// SOCIAL CONTENT FLOW
// =============================================================================

export const SOCIAL_CONTENT_FLOW: FlowConfig = {
  serviceType: "social_content",
  initialStep: "platform_goal",
  steps: [
    {
      id: "platform_goal",
      stage: "context",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "platforms",
          label: "Platform(s)",
          type: "multi_select",
          options: [
            { value: "instagram", label: "Instagram", recommended: true },
            { value: "linkedin", label: "LinkedIn", recommended: true },
            { value: "tiktok", label: "TikTok" },
            { value: "facebook", label: "Facebook" },
            { value: "twitter", label: "Twitter/X" },
          ],
          required: true,
        },
        {
          id: "goal",
          label: "Main goal",
          type: "single_select",
          options: Object.entries(CONTENT_GOAL_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          required: true,
        },
      ],
      requiredFields: ["platforms", "goal"],
      nextStep: "topics",
    },
    {
      id: "topics",
      stage: "details",
      questionType: "grouped",
      groupedQuestions: [
        {
          id: "topics",
          label: "Topics/themes to cover",
          type: "text",
          placeholder: "What topics matter to your audience? (e.g., industry tips, behind the scenes, product features)",
          required: true,
        },
        {
          id: "styleExamples",
          label: "Any accounts you love? (optional)",
          type: "text",
          placeholder: "@ handles or links to content you admire",
          required: false,
        },
      ],
      requiredFields: ["topics"],
      nextStep: "review",
    },
    {
      id: "review",
      stage: "review",
      questionType: "confirmation",
      isTerminal: true,
    },
  ],
};

// =============================================================================
// FLOW REGISTRY
// =============================================================================

export const FLOW_CONFIGS: Record<ServiceType, FlowConfig> = {
  launch_video: LAUNCH_VIDEO_FLOW,
  video_edit: VIDEO_EDIT_FLOW,
  pitch_deck: PITCH_DECK_FLOW,
  brand_package: BRAND_PACKAGE_FLOW,
  social_ads: SOCIAL_ADS_FLOW,
  social_content: SOCIAL_CONTENT_FLOW,
};

// =============================================================================
// FLOW NAVIGATION HELPERS
// =============================================================================

export function getFlowConfig(serviceType: ServiceType): FlowConfig {
  return FLOW_CONFIGS[serviceType];
}

export function getFlowStep(serviceType: ServiceType, stepId: string): FlowStep | undefined {
  const config = FLOW_CONFIGS[serviceType];
  return config.steps.find((s) => s.id === stepId);
}

export function getNextStep(
  serviceType: ServiceType,
  currentStepId: string,
  data: Partial<IntakeData>
): string | null {
  const step = getFlowStep(serviceType, currentStepId);
  if (!step || step.isTerminal) return null;

  if (typeof step.nextStep === "function") {
    return step.nextStep(data);
  }
  return step.nextStep || null;
}

export function validateStep(
  serviceType: ServiceType,
  stepId: string,
  data: Partial<IntakeData>
): { valid: boolean; missingFields: string[] } {
  const step = getFlowStep(serviceType, stepId);
  if (!step?.requiredFields) {
    return { valid: true, missingFields: [] };
  }

  const missingFields = step.requiredFields.filter((field) => {
    const value = data[field as keyof IntakeData];
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function calculateFlowProgress(
  serviceType: ServiceType,
  currentStepId: string
): number {
  const config = FLOW_CONFIGS[serviceType];
  const currentIndex = config.steps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / config.steps.length) * 100);
}

// =============================================================================
// SMART DEFAULTS APPLICATION
// =============================================================================

export function applySmartDefaults(
  serviceType: ServiceType,
  data: Partial<IntakeData>
): Partial<IntakeData> {
  const enhanced = { ...data };

  switch (serviceType) {
    case "launch_video": {
      const launchData = enhanced as Partial<LaunchVideoIntake>;
      if (launchData.platforms?.length) {
        // Apply recommended length based on platforms
        const hasShortForm = launchData.platforms.some((p) =>
          ["tiktok", "reels", "snapchat"].includes(p)
        );
        launchData.recommendedLength = hasShortForm ? "30-45s" : "60-90s";
      }
      // Default storyline preference
      if (!launchData.storylinePreference) {
        launchData.storylinePreference = "create_for_me";
      }
      break;
    }

    case "video_edit": {
      const videoData = enhanced as Partial<VideoEditIntake>;
      // Apply length based on platform
      if (videoData.platforms?.length) {
        const hasShortForm = videoData.platforms.some((p) =>
          ["tiktok", "reels", "snapchat"].includes(p)
        );
        videoData.recommendedLength = hasShortForm ? "15-30s" : "60-90s";
      }
      // Default subtitles and overlays for social
      videoData.subtitles = true;
      videoData.textOverlays = true;
      // Apply style based on video type
      if (videoData.videoType) {
        videoData.stylePreference =
          videoData.stylePreference || SMART_DEFAULTS.videoStyle[videoData.videoType];
      }
      break;
    }

    case "social_ads": {
      const adData = enhanced as Partial<SocialAdsIntake>;
      // Apply format recommendation based on goal
      if (adData.goal) {
        adData.recommendedFormat = SMART_DEFAULTS.adFormat[adData.goal];
      }
      // Apply CTA based on goal
      const ctaMap: Record<string, string> = {
        sales: "Shop now",
        signups: "Sign up free",
        awareness: "Learn more",
        leads: "Get quote",
      };
      if (adData.goal && !adData.recommendedCta) {
        adData.recommendedCta = ctaMap[adData.goal] || "Learn more";
      }
      break;
    }

    case "social_content": {
      const contentData = enhanced as Partial<SocialContentIntake>;
      // Apply frequency and content types based on goal
      if (contentData.goal) {
        contentData.recommendedFrequency = SMART_DEFAULTS.postingFrequency[contentData.goal];
        contentData.recommendedContentTypes = SMART_DEFAULTS.contentTypes[contentData.goal];
      }
      break;
    }
  }

  return enhanced;
}
