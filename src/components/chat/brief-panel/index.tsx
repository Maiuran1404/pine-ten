"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Check, Circle, ChevronRight, Copy } from "lucide-react";
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
// SLEEK FIELD ROW - Minimal design
// =============================================================================

interface SleekFieldProps {
  label: string;
  value: string | null;
  source: FieldSource;
}

function SleekField({ label, value, source }: SleekFieldProps) {
  const hasValue = value && value.trim().length > 0;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {hasValue ? (
          <>
            <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
              {value}
            </span>
            {source === "confirmed" ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : source === "inferred" ? (
              <Circle className="h-2 w-2 fill-amber-400 text-amber-400 shrink-0" />
            ) : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN BRIEF PANEL COMPONENT - Sleek version
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

  return (
    <div className={cn("flex flex-col h-full bg-transparent", className)}>
      {/* Minimal Header */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Brief
          </span>
          {/* Completion indicator */}
          <div className="flex items-center gap-1">
            <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isReady ? "bg-emerald-500" : "bg-emerald-500/60"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {completion}%
            </span>
          </div>
        </div>
        <button
          onClick={handleCopyBrief}
          className="p-1 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {copiedBrief ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Brief Fields - Clean list */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          <SleekField
            label="Summary"
            value={brief.taskSummary.value}
            source={brief.taskSummary.source}
          />
          <SleekField
            label="Intent"
            value={intentValue}
            source={brief.intent.source}
          />
          <SleekField
            label="Platform"
            value={platformValue}
            source={brief.platform.source}
          />
          <SleekField
            label="Audience"
            value={audienceValue}
            source={brief.audience.source}
          />
          <SleekField
            label="Topic"
            value={brief.topic.value}
            source={brief.topic.source}
          />

          {/* Dimensions if available */}
          {brief.dimensions.length > 0 && (
            <div className="pt-3 mt-2 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                Dimensions
              </span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {brief.dimensions.map((dim, idx) => (
                  <span
                    key={`${dim.width}x${dim.height}-${idx}`}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground"
                  >
                    {dim.width}×{dim.height}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visual direction colors if available */}
          {brief.visualDirection?.colors &&
            brief.visualDirection.colors.length > 0 && (
              <div className="pt-3 mt-2 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  Colors
                </span>
                <div className="flex gap-1 mt-1.5">
                  {brief.visualDirection.colors
                    .slice(0, 5)
                    .map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border border-border/50"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
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
