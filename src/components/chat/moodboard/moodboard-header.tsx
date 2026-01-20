"use client";

import { motion } from "framer-motion";
import { Trash2, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MoodboardHeaderProps {
  itemCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function MoodboardHeader({
  itemCount,
  isCollapsed = false,
  onToggleCollapse,
  onClearAll,
  className,
}: MoodboardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Palette className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Moodboard</h3>
          <p className="text-xs text-muted-foreground">
            {itemCount === 0
              ? "No items yet"
              : `${itemCount} item${itemCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {itemCount > 0 && onClearAll && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onClearAll}
            aria-label="Clear all items"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand moodboard" : "Collapse moodboard"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

interface MoodboardSectionHeaderProps {
  title: string;
  itemCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function MoodboardSectionHeader({
  title,
  itemCount,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: MoodboardSectionHeaderProps) {
  return (
    <button
      onClick={onToggleCollapse}
      className={cn(
        "flex items-center justify-between w-full py-2",
        "text-left hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">{title}</span>
        {itemCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
          >
            {itemCount}
          </motion.span>
        )}
      </div>
      {isCollapsed ? (
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      ) : (
        <ChevronUp className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}
