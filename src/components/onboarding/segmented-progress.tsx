"use client";

import { cn } from "@/lib/utils";
import { type OnboardingStep, STEP_CONFIG } from "./types";

interface SegmentedProgressProps {
  currentStep: OnboardingStep;
  steps?: typeof STEP_CONFIG;
}

/**
 * Segmented progress bar for onboarding steps
 */
export function SegmentedProgress({
  currentStep,
  steps = STEP_CONFIG
}: SegmentedProgressProps) {
  // Get the progress index - scanning counts as having completed brand-input
  const getProgressIndex = () => {
    if (currentStep === "scanning") {
      // During scanning, brand-input is complete (index 0 filled)
      return 1;
    }
    const index = steps.findIndex(s => s.id === currentStep);
    return index >= 0 ? index : 0;
  };

  const currentIndex = getProgressIndex();

  return (
    <div className="flex gap-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-300",
            index < currentIndex
              ? "bg-foreground"
              : index === currentIndex
                ? "bg-foreground"
                : "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}
