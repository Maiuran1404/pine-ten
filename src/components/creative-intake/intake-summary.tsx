"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Edit2,
  Sparkles,
  ChevronRight,
  FileText,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IntakeSummary as IntakeSummaryType, SummaryItem } from "@/lib/creative-intake/types";
import type { ServiceType } from "@/lib/creative-intake/types";
import { SERVICE_DEFINITIONS } from "@/lib/creative-intake/types";

interface IntakeSummaryCardProps {
  summary: IntakeSummaryType;
  onEdit?: (field: string, newValue: string | string[]) => void;
  onConfirm: () => void;
  onAddMore?: () => void;
  disabled?: boolean;
  className?: string;
}

export function IntakeSummaryCard({
  summary,
  onEdit,
  onConfirm,
  onAddMore,
  disabled = false,
  className,
}: IntakeSummaryCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const serviceDefinition = SERVICE_DEFINITIONS[summary.serviceType];

  const handleStartEdit = (item: SummaryItem) => {
    if (!item.editable || !onEdit) return;
    setEditingField(item.label);
    setEditValue(Array.isArray(item.value) ? item.value.join(", ") : item.value);
  };

  const handleSaveEdit = () => {
    if (editingField && onEdit) {
      onEdit(editingField, editValue);
    }
    setEditingField(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-muted/30 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">{summary.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {serviceDefinition?.label} brief
        </p>
      </div>

      {/* Summary Items */}
      <div className="p-4 space-y-3">
        {summary.items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </span>
                {item.source === "default" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    recommended
                  </span>
                )}
                {item.source === "inferred" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    inferred
                  </span>
                )}
              </div>

              {editingField === item.label ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-8 w-8 p-0 text-muted-foreground"
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-foreground mt-0.5">
                  {Array.isArray(item.value) ? item.value.join(", ") : item.value}
                </p>
              )}
            </div>

            {item.editable && onEdit && editingField !== item.label && (
              <button
                onClick={() => handleStartEdit(item)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                disabled={disabled}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-primary/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Recommendations
              </span>
            </div>
            <ul className="space-y-1.5">
              {summary.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Sparkles className="h-3 w-3 mt-1 text-primary shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center justify-between gap-3">
        {onAddMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddMore}
            disabled={disabled}
            className="text-muted-foreground"
          >
            Add more details
          </Button>
        )}
        <Button
          onClick={onConfirm}
          disabled={disabled || !summary.readyToSubmit}
          className="gap-2 ml-auto"
        >
          {summary.readyToSubmit ? (
            <>
              Looks good
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              Missing required info
              <AlertCircle className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Smart recommendation badge/pill for inline display
 */
interface SmartRecommendationProps {
  recommendation: string;
  onAccept?: () => void;
  className?: string;
}

export function SmartRecommendation({
  recommendation,
  onAccept,
  className,
}: SmartRecommendationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-primary/10 text-primary text-xs",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span>{recommendation}</span>
      {onAccept && (
        <button
          onClick={onAccept}
          className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        >
          <Check className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}

/**
 * Progress indicator for intake flow
 */
interface IntakeProgressProps {
  serviceType: ServiceType;
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function IntakeProgress({
  serviceType,
  currentStep,
  totalSteps,
  className,
}: IntakeProgressProps) {
  const serviceDefinition = SERVICE_DEFINITIONS[serviceType];
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {serviceDefinition?.label}
        </span>
        <span className="text-muted-foreground">
          {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

/**
 * Next step indicator
 */
interface NextStepIndicatorProps {
  nextStep: string;
  className?: string;
}

export function NextStepIndicator({
  nextStep,
  className,
}: NextStepIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
    >
      <ChevronRight className="h-3 w-3" />
      <span>Next: {nextStep}</span>
    </motion.div>
  );
}
