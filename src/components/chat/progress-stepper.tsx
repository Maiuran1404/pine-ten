"use client";

import { motion } from "framer-motion";
import { Check, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ChatStage } from "@/components/chat/types";
import {
  CHAT_STAGES,
  STAGE_DESCRIPTIONS,
  isStageCompleted,
  isCurrentStage,
} from "@/lib/chat-progress";

interface ProgressStepperProps {
  currentStage: ChatStage;
  completedStages: ChatStage[];
  progressPercentage: number;
  className?: string;
}

export function ProgressStepper({
  currentStage,
  completedStages,
  progressPercentage,
  className,
}: ProgressStepperProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Progress</h3>
            <p className="text-xs text-muted-foreground">
              {progressPercentage}% complete
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 px-4 py-2">
        <div className="space-y-0">
          {CHAT_STAGES.map((stage, index) => {
            const isCompleted = isStageCompleted(stage, completedStages);
            const isCurrent = isCurrentStage(stage, currentStage);
            const isLast = index === CHAT_STAGES.length - 1;

            return (
              <div key={stage} className="flex items-start gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  {/* Dot/Check */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted
                        ? "var(--primary)"
                        : isCurrent
                        ? "var(--primary)"
                        : "transparent",
                      borderColor: isCompleted || isCurrent
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                      isCompleted && "bg-primary border-primary",
                      isCurrent && !isCompleted && "border-primary bg-primary/10",
                      !isCompleted && !isCurrent && "border-muted-foreground/30"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    ) : isCurrent ? (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    ) : (
                      <Circle className="h-2 w-2 text-muted-foreground/50" />
                    )}
                  </motion.div>

                  {/* Connecting line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 h-8",
                        isCompleted
                          ? "bg-primary"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="pt-0.5 pb-6">
                  <motion.p
                    initial={false}
                    animate={{
                      color: isCurrent || isCompleted
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                    }}
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-foreground",
                      isCompleted && "text-foreground",
                      !isCurrent && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {STAGE_DESCRIPTIONS[stage]}
                  </motion.p>
                  {isCurrent && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-primary mt-0.5"
                    >
                      Current step
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-auto px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {progressPercentage === 100
            ? "Ready to create!"
            : "Complete all steps to submit"}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact horizontal progress indicator for mobile
 */
interface CompactProgressProps {
  currentStage: ChatStage;
  completedStages: ChatStage[];
  progressPercentage: number;
  className?: string;
}

export function CompactProgress({
  currentStage,
  completedStages,
  progressPercentage,
  className,
}: CompactProgressProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {CHAT_STAGES.map((stage) => {
          const isCompleted = isStageCompleted(stage, completedStages);
          const isCurrent = isCurrentStage(stage, currentStage);

          return (
            <motion.div
              key={stage}
              initial={false}
              animate={{
                scale: isCurrent ? 1.2 : 1,
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isCompleted && "bg-primary",
                isCurrent && !isCompleted && "bg-primary/50",
                !isCompleted && !isCurrent && "bg-muted"
              )}
              title={STAGE_DESCRIPTIONS[stage]}
            />
          );
        })}
      </div>

      {/* Percentage */}
      <span className="text-xs text-muted-foreground">
        {progressPercentage}%
      </span>
    </div>
  );
}

/**
 * Subtle top progress bar - minimal design that doesn't take much space
 */
interface TopProgressBarProps {
  currentStage: ChatStage;
  completedStages: ChatStage[];
  progressPercentage: number;
  className?: string;
}

export function TopProgressBar({
  currentStage,
  completedStages,
  progressPercentage,
  className,
}: TopProgressBarProps) {
  const currentStageLabel = STAGE_DESCRIPTIONS[currentStage];

  return (
    <div className={cn("w-full", className)}>
      {/* Thin progress bar at very top */}
      <div className="h-1 bg-muted/50 w-full">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Compact info row */}
      <div className="px-4 py-1.5 flex items-center justify-between text-xs border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-2">
          {/* Stage dots */}
          <div className="flex items-center gap-1">
            {CHAT_STAGES.map((stage) => {
              const isCompleted = isStageCompleted(stage, completedStages);
              const isCurrent = isCurrentStage(stage, currentStage);

              return (
                <div
                  key={stage}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    isCompleted && "bg-primary",
                    isCurrent && !isCompleted && "bg-primary/60",
                    !isCompleted && !isCurrent && "bg-muted-foreground/30"
                  )}
                  title={STAGE_DESCRIPTIONS[stage]}
                />
              );
            })}
          </div>

          {/* Current step label */}
          <span className="text-muted-foreground">
            {currentStageLabel}
          </span>
        </div>

        {/* Percentage */}
        <span className="text-muted-foreground/70">
          {progressPercentage}%
        </span>
      </div>
    </div>
  );
}
