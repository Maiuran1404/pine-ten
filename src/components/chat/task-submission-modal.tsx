"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Coins,
  Calendar,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Palette,
  Tag,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import { type TaskProposal, type MoodboardItem, getDeliveryDateString } from "./types";

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onMakeChanges: () => void;
  taskProposal: TaskProposal | null;
  moodboardItems: MoodboardItem[];
  userCredits: number;
  isSubmitting?: boolean;
}

export function TaskSubmissionModal({
  isOpen,
  onClose,
  onConfirm,
  onMakeChanges,
  taskProposal,
  moodboardItems,
  userCredits,
  isSubmitting = false,
}: TaskSubmissionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const hasEnoughCredits = taskProposal
    ? userCredits >= taskProposal.creditsRequired
    : false;

  const displayMoodboardItems = moodboardItems.slice(0, 6);
  const remainingCount = moodboardItems.length - 6;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onClose();
      }, 2000);
    } catch {
      // Error handled by parent
    } finally {
      setIsConfirming(false);
    }
  };

  const handleMakeChanges = () => {
    onMakeChanges();
    onClose();
  };

  if (!taskProposal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Confetti overlay */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background/95 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-semibold text-foreground mb-2"
              >
                Request Submitted!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground"
              >
                We&apos;re finding the perfect artist for you
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Ready to Create Magic
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Review your request before submitting
              </DialogDescription>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Task Summary Card */}
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {taskProposal.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {taskProposal.description}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  <Tag className="h-3 w-3 mr-1" />
                  {taskProposal.category}
                </Badge>
              </div>
            </div>

            {/* Moodboard Preview */}
            {moodboardItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">
                    Your Moodboard
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    ({moodboardItems.length} items)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {displayMoodboardItems.map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      {item.type === "color" ? (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundColor:
                              item.metadata?.colorSamples?.[0] || "#888",
                          }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        +{remainingCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Delivery Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Timeline */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery</p>
                    <p className="text-sm font-medium text-foreground">
                      {taskProposal.deliveryDays
                        ? getDeliveryDateString(taskProposal.deliveryDays)
                        : `~${taskProposal.estimatedHours}h`}
                    </p>
                  </div>
                </div>

                {/* Revisions */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Revisions</p>
                    <p className="text-sm font-medium text-foreground">
                      2 included
                    </p>
                  </div>
                </div>

                {/* Credits */}
                <div
                  className={cn(
                    "col-span-2 flex items-center gap-3 p-3 rounded-lg",
                    hasEnoughCredits
                      ? "bg-green-500/10"
                      : "bg-destructive/10"
                  )}
                >
                  <Coins
                    className={cn(
                      "h-5 w-5",
                      hasEnoughCredits
                        ? "text-green-500"
                        : "text-destructive"
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      Credits Required
                    </p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        hasEnoughCredits
                          ? "text-green-500"
                          : "text-destructive"
                      )}
                    >
                      {taskProposal.creditsRequired} credits
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Your balance</p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        hasEnoughCredits
                          ? "text-foreground"
                          : "text-destructive"
                      )}
                    >
                      {userCredits} credits
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insufficient credits warning */}
            {!hasEnoughCredits && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Insufficient credits
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You need {taskProposal.creditsRequired - userCredits} more
                    credits to submit this request.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleMakeChanges}
              disabled={isConfirming || isSubmitting}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Make Changes
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!hasEnoughCredits || isConfirming || isSubmitting}
              className="flex-1"
            >
              {isConfirming || isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : !hasEnoughCredits ? (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Buy Credits
                </>
              ) : (
                <>
                  Submit Request
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
