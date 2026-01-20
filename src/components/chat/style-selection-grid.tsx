"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type DeliverableStyle } from "./types";
import { STYLE_AXES } from "@/lib/constants/reference-libraries";

interface StyleSelectionGridProps {
  styles: DeliverableStyle[];
  selectedStyles: string[];
  moodboardStyleIds: string[];
  onSelectStyle: (style: DeliverableStyle) => void;
  onAddToMoodboard: (style: DeliverableStyle) => void;
  onShowMore?: (styleAxis: string) => void;
  onShowDifferent?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function StyleSelectionGrid({
  styles,
  selectedStyles,
  moodboardStyleIds,
  onSelectStyle,
  onAddToMoodboard,
  onShowMore,
  onShowDifferent,
  isLoading,
  className,
}: StyleSelectionGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  if (!styles || styles.length === 0) {
    return null;
  }

  const getStyleAxisLabel = (value: string) => {
    return STYLE_AXES.find((a) => a.value === value)?.label || value;
  };

  // Check if any styles have brand match scores
  const hasBrandScoring = styles.some((s) => s.brandMatchScore !== undefined);

  const handleAddToMoodboard = (style: DeliverableStyle, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToMoodboard(style);
    setJustAdded(style.id);
    setTimeout(() => setJustAdded(null), 1500);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Brand personalization hint */}
      {hasBrandScoring && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Sorted by match to your brand</span>
        </div>
      )}

      {/* Style grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {styles.map((style, index) => {
          const isSelected = selectedStyles.includes(style.id);
          const isInMoodboard = moodboardStyleIds.includes(style.id);
          const isHovered = hoveredId === style.id;
          const isTopMatch =
            hasBrandScoring && index === 0 && (style.brandMatchScore || 0) >= 70;
          const isGoodMatch = (style.brandMatchScore || 0) >= 60;
          const wasJustAdded = justAdded === style.id;

          return (
            <motion.div
              key={style.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative"
              onMouseEnter={() => setHoveredId(style.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                onClick={() => onSelectStyle(style)}
                className={cn(
                  "group relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200 text-left",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : isInMoodboard
                    ? "border-green-500/50 ring-1 ring-green-500/20"
                    : isTopMatch
                    ? "border-amber-400/50 ring-1 ring-amber-400/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                {/* Image */}
                <div className="aspect-square relative bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={style.imageUrl}
                    alt={style.name}
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-300",
                      isHovered && "scale-105"
                    )}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/400x400?text=Style";
                    }}
                  />

                  {/* Hover overlay */}
                  <AnimatePresence>
                    {isHovered && !isInMoodboard && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center"
                        onClick={(e) => handleAddToMoodboard(style, e)}
                      >
                        <div className="flex flex-col items-center gap-1 text-white">
                          <Plus className="h-6 w-6" />
                          <span className="text-xs font-medium">
                            Add to Moodboard
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {/* In moodboard indicator */}
                  {isInMoodboard && !isSelected && (
                    <div className="absolute top-2 left-2">
                      <Badge className="text-xs bg-green-500 hover:bg-green-500 text-white border-0">
                        <Check className="w-3 h-3 mr-1" />
                        In Moodboard
                      </Badge>
                    </div>
                  )}

                  {/* Just added feedback */}
                  <AnimatePresence>
                    {wasJustAdded && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 bg-green-500/80 flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center gap-1 text-white">
                          <Check className="h-8 w-8" />
                          <span className="text-sm font-medium">Added!</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Top match indicator */}
                  {isTopMatch && !isSelected && !isInMoodboard && (
                    <div className="absolute top-2 left-2">
                      <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Best match
                      </Badge>
                    </div>
                  )}

                  {/* Style axis badge */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-background/80 backdrop-blur-sm"
                    >
                      {getStyleAxisLabel(style.styleAxis)}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <h4 className="font-medium text-sm truncate">{style.name}</h4>
                  {style.matchReason && isGoodMatch ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 line-clamp-1 mt-0.5">
                      {style.matchReason}
                    </p>
                  ) : style.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {style.description}
                    </p>
                  ) : null}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Action buttons */}
      {(onShowMore || onShowDifferent) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onShowMore && styles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowMore(styles[0].styleAxis)}
              disabled={isLoading}
              className="text-xs"
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1" />
              More {getStyleAxisLabel(styles[0].styleAxis)} styles
            </Button>
          )}
          {onShowDifferent && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowDifferent}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Show different styles
            </Button>
          )}
        </div>
      )}

      {/* Selection hint */}
      <p className="text-xs text-muted-foreground">
        Click to select · Hover to add to moodboard · You can pick multiple
      </p>
    </div>
  );
}
