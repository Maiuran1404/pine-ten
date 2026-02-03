"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Circle, ChevronRight, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LiveBrief, FieldSource } from "./types";
import {
  PLATFORM_DISPLAY_NAMES,
  calculateBriefCompletion,
  isBriefReadyForDesigner,
} from "./types";

// =============================================================================
// SLEEK FIELD ROW - With suggestions
// =============================================================================

interface SleekFieldProps {
  label: string;
  value: string | null;
  source: FieldSource;
  suggestion?: string | null;
  onUseSuggestion?: () => void;
}

function SleekField({
  label,
  value,
  source,
  suggestion,
  onUseSuggestion,
}: SleekFieldProps) {
  const hasValue = value && value.trim().length > 0;

  return (
    <div className="py-2.5 border-b border-border/20 last:border-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </span>
        {hasValue &&
          (source === "confirmed" ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : source === "inferred" ? (
            <div className="flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
              <span className="text-[9px] text-amber-500">AI</span>
            </div>
          ) : null)}
      </div>
      {hasValue ? (
        <p className="text-sm text-foreground leading-snug">{value}</p>
      ) : suggestion ? (
        <button
          onClick={onUseSuggestion}
          className="group flex items-center gap-1.5 text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <span className="italic">{suggestion}</span>
          <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">
            click to use
          </span>
        </button>
      ) : (
        <span className="text-sm text-muted-foreground/30 italic">
          Mention in chat...
        </span>
      )}
    </div>
  );
}

// =============================================================================
// MAIN BRIEF PANEL COMPONENT - Sleek version with brand suggestions
// =============================================================================

interface BriefPanelProps {
  brief: LiveBrief;
  onBriefUpdate: (brief: LiveBrief) => void;
  onExportBrief?: () => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function BriefPanel({
  brief,
  onBriefUpdate,
  onExportBrief,
  className,
  isExpanded = true,
  onToggleExpanded,
}: BriefPanelProps) {
  const [copiedBrief, setCopiedBrief] = useState(false);

  const completion = calculateBriefCompletion(brief);
  const isReady = isBriefReadyForDesigner(brief);

  // Copy brief to clipboard
  const handleCopyBrief = useCallback(async () => {
    const briefText = `
Task: ${brief.taskSummary.value || "TBD"}
Intent: ${brief.intent.value || "TBD"}
Platform: ${
      brief.platform.value
        ? PLATFORM_DISPLAY_NAMES[brief.platform.value]
        : "TBD"
    }
Audience: ${brief.audience.value?.name || "TBD"}
Topic: ${brief.topic.value || "TBD"}
    `.trim();

    await navigator.clipboard.writeText(briefText);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  }, [brief]);

  // Get display values
  const platformValue = brief.platform.value
    ? PLATFORM_DISPLAY_NAMES[brief.platform.value]
    : null;
  const audienceValue = brief.audience.value?.name || null;
  const intentValue = brief.intent.value
    ? brief.intent.value.charAt(0).toUpperCase() + brief.intent.value.slice(1)
    : null;

  // Handlers to apply suggestions
  const applySuggestion = useCallback(
    (field: keyof LiveBrief, value: unknown) => {
      onBriefUpdate({
        ...brief,
        [field]:
          typeof value === "string"
            ? { value, confidence: 0.7, source: "inferred" as const }
            : value,
        updatedAt: new Date(),
      });
    },
    [brief, onBriefUpdate]
  );

  return (
    <div className={cn("flex flex-col h-full bg-transparent", className)}>
      {/* Minimal Header with progress */}
      <div className="shrink-0 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
            Your Brief
          </span>
          <button
            onClick={handleCopyBrief}
            className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {copiedBrief ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-border/30 overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isReady ? "bg-emerald-500" : "bg-emerald-500/50"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span
            className={cn(
              "text-[10px] tabular-nums",
              isReady ? "text-emerald-500" : "text-muted-foreground/50"
            )}
          >
            {completion}%
          </span>
        </div>
      </div>

      {/* Brief Fields */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          <SleekField
            label="Summary"
            value={brief.taskSummary.value}
            source={brief.taskSummary.source}
            suggestion={
              !brief.taskSummary.value ? "Describe your project..." : null
            }
          />
          <SleekField
            label="Intent"
            value={intentValue}
            source={brief.intent.source}
            suggestion={
              !brief.intent.value ? "Launch / Promote / Engage" : null
            }
            onUseSuggestion={() =>
              applySuggestion("intent", {
                value: "launch",
                confidence: 0.5,
                source: "inferred",
              })
            }
          />
          <SleekField
            label="Platform"
            value={platformValue}
            source={brief.platform.source}
            suggestion={
              !brief.platform.value ? "Instagram / LinkedIn / Web" : null
            }
            onUseSuggestion={() =>
              applySuggestion("platform", {
                value: "instagram",
                confidence: 0.5,
                source: "inferred",
              })
            }
          />
          <SleekField
            label="Audience"
            value={audienceValue}
            source={brief.audience.source}
            suggestion={
              brief.audience.value?.name ? null : "From your brand profile"
            }
          />
          <SleekField
            label="Topic"
            value={brief.topic.value}
            source={brief.topic.source}
            suggestion={!brief.topic.value ? "What's this about?" : null}
          />

          {/* Dimensions - compact */}
          {brief.dimensions.length > 0 && (
            <div className="pt-3 mt-1">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                Dimensions
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {brief.dimensions.slice(0, 3).map((dim, idx) => (
                  <span
                    key={`${dim.width}x${dim.height}-${idx}`}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground/70"
                  >
                    {dim.width}×{dim.height}
                  </span>
                ))}
                {brief.dimensions.length > 3 && (
                  <span className="text-[10px] text-muted-foreground/40">
                    +{brief.dimensions.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Colors from brand */}
          {brief.visualDirection?.colorPalette &&
            brief.visualDirection.colorPalette.length > 0 && (
              <div className="pt-3 mt-1">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Brand Colors
                </span>
                <div className="flex gap-1.5 mt-1.5">
                  {brief.visualDirection.colorPalette
                    .slice(0, 5)
                    .map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                </div>
              </div>
            )}

          {/* Ready indicator */}
          {isReady && (
            <div className="mt-4 pt-3 border-t border-border/20">
              <div className="flex items-center gap-2 text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Ready to submit</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// COLLAPSIBLE BRIEF PANEL
// =============================================================================

interface CollapsibleBriefPanelProps
  extends Omit<BriefPanelProps, "isExpanded" | "onToggleExpanded"> {
  defaultExpanded?: boolean;
}

export function CollapsibleBriefPanel({
  defaultExpanded = true,
  ...props
}: CollapsibleBriefPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!isExpanded) {
    const completion = calculateBriefCompletion(props.brief);
    const isReady = isBriefReadyForDesigner(props.brief);

    return (
      <motion.div
        initial={{ width: 40 }}
        animate={{ width: 40 }}
        className="flex flex-col items-center py-4 gap-3 h-full"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsExpanded(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium",
            isReady
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-muted text-muted-foreground"
          )}
        >
          {completion}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 260 }}
      animate={{ width: 260 }}
      className="h-full"
    >
      <BriefPanel
        {...props}
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded(false)}
      />
    </motion.div>
  );
}

export default BriefPanel;
