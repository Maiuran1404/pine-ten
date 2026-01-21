"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  List,
  Palette,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Check,
  Circle,
  Target,
  Layout,
  Users,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  LiveBrief,
  BriefPanelTab,
  FieldSource,
  Intent,
  Platform,
  Dimension,
} from "./types";
import {
  INTENT_DESCRIPTIONS,
  PLATFORM_DISPLAY_NAMES,
  calculateBriefCompletion,
  isBriefReadyForDesigner,
} from "./types";
import { formatDimension } from "@/lib/constants/platform-dimensions";
import { ContentOutlinePanel } from "./content-outline";
import { VisualDirectionPanel } from "./visual-direction";

// =============================================================================
// FIELD STATUS INDICATOR
// =============================================================================

interface FieldStatusProps {
  source: FieldSource;
  className?: string;
}

function FieldStatus({ source, className }: FieldStatusProps) {
  if (source === "confirmed") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Check className={cn("h-3.5 w-3.5 text-green-500", className)} />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Confirmed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (source === "inferred") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Sparkles className={cn("h-3.5 w-3.5 text-amber-500", className)} />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">AI inferred - click to confirm</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Circle className={cn("h-3.5 w-3.5 text-muted-foreground/40", className)} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Pending</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// BRIEF FIELD ROW
// =============================================================================

interface BriefFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  source: FieldSource;
  onConfirm?: () => void;
  onEdit?: () => void;
  className?: string;
}

function BriefField({
  icon,
  label,
  value,
  source,
  onConfirm,
  onEdit,
  className,
}: BriefFieldProps) {
  const handleClick = () => {
    if (source === "inferred" && onConfirm) {
      onConfirm();
    } else if (onEdit) {
      onEdit();
    }
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border transition-all",
        source === "pending" && "border-dashed border-muted-foreground/30 bg-muted/30",
        source === "inferred" && "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer",
        source === "confirmed" && "border-green-500/30 bg-green-500/5",
        className
      )}
      onClick={handleClick}
    >
      <div className="shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <FieldStatus source={source} />
        </div>
        {value ? (
          <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground/60 mt-0.5 italic">
            Not yet determined...
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DIMENSIONS DISPLAY
// =============================================================================

interface DimensionsDisplayProps {
  dimensions: Dimension[];
  platform: Platform | null;
}

function DimensionsDisplay({ dimensions, platform }: DimensionsDisplayProps) {
  if (dimensions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground/60 italic">
        Dimensions will be set based on platform
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {dimensions.map((dim, idx) => (
        <Badge
          key={`${dim.width}x${dim.height}-${idx}`}
          variant="secondary"
          className="text-xs font-normal"
        >
          {dim.name}: {dim.width}x{dim.height}
        </Badge>
      ))}
    </div>
  );
}

// =============================================================================
// COMPLETION PROGRESS
// =============================================================================

interface CompletionProgressProps {
  percentage: number;
  isReady: boolean;
}

function CompletionProgress({ percentage, isReady }: CompletionProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Brief completion
        </span>
        <span className="text-xs font-medium">
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isReady ? "bg-green-500" : "bg-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      {isReady && (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ready for designer
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BRIEF TAB CONTENT
// =============================================================================

interface BriefTabContentProps {
  brief: LiveBrief;
  onFieldConfirm: (field: keyof LiveBrief) => void;
  onFieldEdit: (field: keyof LiveBrief) => void;
}

function BriefTabContent({ brief, onFieldConfirm, onFieldEdit }: BriefTabContentProps) {
  const intentValue = brief.intent.value
    ? `${brief.intent.value.charAt(0).toUpperCase() + brief.intent.value.slice(1)}`
    : null;

  const platformValue = brief.platform.value
    ? PLATFORM_DISPLAY_NAMES[brief.platform.value]
    : null;

  const audienceValue = brief.audience.value?.name || null;

  return (
    <div className="space-y-3">
      {/* Task Summary */}
      <BriefField
        icon={<FileText className="h-4 w-4" />}
        label="Summary"
        value={brief.taskSummary.value}
        source={brief.taskSummary.source}
        onConfirm={() => onFieldConfirm("taskSummary")}
        onEdit={() => onFieldEdit("taskSummary")}
      />

      {/* Intent */}
      <BriefField
        icon={<Target className="h-4 w-4" />}
        label="Intent"
        value={intentValue}
        source={brief.intent.source}
        onConfirm={() => onFieldConfirm("intent")}
        onEdit={() => onFieldEdit("intent")}
      />

      {/* Platform */}
      <BriefField
        icon={<Layout className="h-4 w-4" />}
        label="Platform"
        value={platformValue}
        source={brief.platform.source}
        onConfirm={() => onFieldConfirm("platform")}
        onEdit={() => onFieldEdit("platform")}
      />

      {/* Dimensions */}
      <div className="p-3 rounded-lg border border-muted-foreground/20 bg-muted/30">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Dimensions
          </span>
        </div>
        <DimensionsDisplay
          dimensions={brief.dimensions}
          platform={brief.platform.value}
        />
      </div>

      {/* Audience */}
      <BriefField
        icon={<Users className="h-4 w-4" />}
        label="Audience"
        value={audienceValue}
        source={brief.audience.source}
        onConfirm={() => onFieldConfirm("audience")}
        onEdit={() => onFieldEdit("audience")}
      />

      {/* Topic */}
      <BriefField
        icon={<FileText className="h-4 w-4" />}
        label="Topic"
        value={brief.topic.value}
        source={brief.topic.source}
        onConfirm={() => onFieldConfirm("topic")}
        onEdit={() => onFieldEdit("topic")}
      />
    </div>
  );
}

// =============================================================================
// MAIN BRIEF PANEL COMPONENT
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
  const [activeTab, setActiveTab] = useState<BriefPanelTab>("brief");
  const [copiedBrief, setCopiedBrief] = useState(false);

  const completion = calculateBriefCompletion(brief);
  const isReady = isBriefReadyForDesigner(brief);

  // Confirm an inferred field
  const handleFieldConfirm = useCallback(
    (field: keyof LiveBrief) => {
      const fieldValue = brief[field];
      if (fieldValue && typeof fieldValue === "object" && "source" in fieldValue) {
        const updatedBrief = {
          ...brief,
          [field]: { ...fieldValue, source: "confirmed" as const },
          updatedAt: new Date(),
        };
        onBriefUpdate(updatedBrief);
      }
    },
    [brief, onBriefUpdate]
  );

  // Edit a field (would open a modal or inline edit)
  const handleFieldEdit = useCallback((field: keyof LiveBrief) => {
    // TODO: Implement field editing UI
    console.log("Edit field:", field);
  }, []);

  // Copy brief to clipboard
  const handleCopyBrief = useCallback(async () => {
    const briefText = `
Task Summary: ${brief.taskSummary.value || "TBD"}
Intent: ${brief.intent.value || "TBD"}
Platform: ${brief.platform.value ? PLATFORM_DISPLAY_NAMES[brief.platform.value] : "TBD"}
Dimensions: ${brief.dimensions.map(d => `${d.name} (${d.width}x${d.height})`).join(", ") || "TBD"}
Audience: ${brief.audience.value?.name || "TBD"}
Topic: ${brief.topic.value || "TBD"}
    `.trim();

    await navigator.clipboard.writeText(briefText);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  }, [brief]);

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-l border-border h-full",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Live Brief</h3>
            {isReady && (
              <Badge variant="default" className="bg-green-500 text-xs">
                Ready
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopyBrief}
                  >
                    {copiedBrief ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Copy brief</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {onExportBrief && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onExportBrief}
                      disabled={!isReady}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Export brief</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onToggleExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleExpanded}
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Completion Progress */}
        <div className="mt-3">
          <CompletionProgress percentage={completion} isReady={isReady} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BriefPanelTab)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="shrink-0 grid grid-cols-3 mx-4 mt-3 h-9">
          <TabsTrigger value="brief" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Brief
          </TabsTrigger>
          <TabsTrigger value="outline" className="text-xs gap-1.5">
            <List className="h-3.5 w-3.5" />
            Outline
          </TabsTrigger>
          <TabsTrigger value="visual" className="text-xs gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Visual
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <TabsContent value="brief" className="mt-0 focus-visible:outline-none">
                <BriefTabContent
                  brief={brief}
                  onFieldConfirm={handleFieldConfirm}
                  onFieldEdit={handleFieldEdit}
                />
              </TabsContent>

              <TabsContent value="outline" className="mt-0 focus-visible:outline-none">
                <ContentOutlinePanel
                  outline={brief.contentOutline}
                  taskType={brief.taskType.value}
                  onOutlineUpdate={(outline) => {
                    onBriefUpdate({
                      ...brief,
                      contentOutline: outline,
                      updatedAt: new Date(),
                    });
                  }}
                />
              </TabsContent>

              <TabsContent value="visual" className="mt-0 focus-visible:outline-none">
                <VisualDirectionPanel
                  visualDirection={brief.visualDirection}
                  onUpdate={(visualDirection) => {
                    onBriefUpdate({
                      ...brief,
                      visualDirection,
                      updatedAt: new Date(),
                    });
                  }}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}

// =============================================================================
// COLLAPSIBLE BRIEF PANEL
// =============================================================================

interface CollapsibleBriefPanelProps extends Omit<BriefPanelProps, "isExpanded" | "onToggleExpanded"> {
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
        initial={{ width: 48 }}
        animate={{ width: 48 }}
        className="flex flex-col items-center py-4 gap-3 bg-card border-l border-border h-full"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setIsExpanded(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
              isReady ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
            )}
          >
            {completion}%
          </div>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 320 }}
      animate={{ width: 320 }}
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
