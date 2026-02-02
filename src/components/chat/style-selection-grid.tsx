"use client";

import { motion } from "framer-motion";
import { Check, Plus, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type DeliverableStyle } from "./types";
import { STYLE_AXES } from "@/lib/constants/reference-libraries";

interface StyleSelectionGridProps {
  styles: DeliverableStyle[];
  collectionStyleIds: string[];
  onCardClick: (style: DeliverableStyle) => void;
  onAddToCollection: (style: DeliverableStyle) => void;
  onRemoveFromCollection: (styleId: string) => void;
  onShowMore?: (styleAxis: string) => void;
  onShowDifferent?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function StyleSelectionGrid({
  styles,
  collectionStyleIds,
  onCardClick,
  onAddToCollection,
  onRemoveFromCollection,
  onShowMore,
  onShowDifferent,
  isLoading,
  className,
}: StyleSelectionGridProps) {
  if (!styles || styles.length === 0) {
    return null;
  }

  const getStyleAxisLabel = (value: string) => {
    return STYLE_AXES.find((a) => a.value === value)?.label || value;
  };

  // Check if any styles have brand match scores
  const hasBrandScoring = styles.some((s) => s.brandMatchScore !== undefined);

  const handleCollectionToggle = (style: DeliverableStyle, e: React.MouseEvent) => {
    e.stopPropagation();
    const isInCollection = collectionStyleIds.includes(style.id);
    if (isInCollection) {
      onRemoveFromCollection(style.id);
    } else {
      onAddToCollection(style);
    }
  };

  // Limit to showing only 3 styles
  const displayedStyles = styles.slice(0, 3);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Brand personalization hint */}
      {hasBrandScoring && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Sorted by match to your brand</span>
        </div>
      )}

      {/* Style grid - 3 columns, smaller images */}
      <div className="grid grid-cols-3 gap-2 max-w-2xl">
        {displayedStyles.map((style, index) => {
          const isInCollection = collectionStyleIds.includes(style.id);
          const isTopMatch =
            hasBrandScoring && index === 0 && (style.brandMatchScore || 0) >= 70;
          const isGoodMatch = (style.brandMatchScore || 0) >= 60;

          return (
            <motion.div
              key={style.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative"
            >
              <button
                onClick={() => onCardClick(style)}
                className={cn(
                  "group relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200 text-left",
                  isInCollection
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
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/400x400?text=Style";
                    }}
                  />

                  {/* Corner add/remove button - always visible */}
                  <button
                    onClick={(e) => handleCollectionToggle(style, e)}
                    className={cn(
                      "absolute top-1.5 left-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 z-10",
                      isInCollection
                        ? "bg-green-500 text-white shadow-md hover:bg-green-600"
                        : "bg-background/90 backdrop-blur-sm border border-border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    )}
                    title={isInCollection ? "Remove from collection" : "Add to collection"}
                  >
                    {isInCollection ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>

                  {/* Top match indicator */}
                  {isTopMatch && !isInCollection && (
                    <div className="absolute top-1.5 left-10">
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-500 hover:bg-amber-500 text-white border-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        Best
                      </Badge>
                    </div>
                  )}

                  {/* Style axis badge */}
                  <div className="absolute top-1.5 right-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm"
                    >
                      {getStyleAxisLabel(style.styleAxis)}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <h4 className="font-medium text-xs truncate">{style.name}</h4>
                  {style.matchReason && isGoodMatch ? (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 line-clamp-1 mt-0.5">
                      {style.matchReason}
                    </p>
                  ) : style.description ? (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
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

      {/* Selection hint - updated text */}
      <p className="text-xs text-muted-foreground">
        Tap to preview · Click + to collect
      </p>
    </div>
  );
}
