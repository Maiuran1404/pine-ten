"use client";

import { Check, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STYLE_AXES } from "@/lib/constants/reference-libraries";

export interface DeliverableStyle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  deliverableType: string;
  styleAxis: string;
  subStyle: string | null;
  semanticTags: string[];
  // Brand-aware scoring fields
  brandMatchScore?: number;
  matchReason?: string;
}

interface DeliverableStyleGridProps {
  styles: DeliverableStyle[];
  selectedStyles: string[];
  onSelectStyle: (style: DeliverableStyle) => void;
  onShowMore?: (styleAxis: string) => void;
  onShowDifferent?: () => void;
  isLoading?: boolean;
}

export function DeliverableStyleGrid({
  styles,
  selectedStyles,
  onSelectStyle,
  onShowMore,
  onShowDifferent,
  isLoading,
}: DeliverableStyleGridProps) {
  if (!styles || styles.length === 0) {
    return null;
  }

  const getStyleAxisLabel = (value: string) => {
    return STYLE_AXES.find((a) => a.value === value)?.label || value;
  };

  // Check if any styles have brand match scores
  const hasBrandScoring = styles.some(s => s.brandMatchScore !== undefined);

  return (
    <div className="space-y-3">
      {/* Show personalization hint if brand scoring is active */}
      {hasBrandScoring && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Sorted by match to your brand</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {styles.map((style, index) => {
          const isSelected = selectedStyles.includes(style.id);
          const isTopMatch = hasBrandScoring && index === 0 && (style.brandMatchScore || 0) >= 70;
          const isGoodMatch = (style.brandMatchScore || 0) >= 60;

          return (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style)}
              className={cn(
                "group relative rounded-xl overflow-hidden border-2 transition-all duration-200 text-left",
                isSelected
                  ? "border-primary ring-2 ring-primary/20"
                  : isTopMatch
                  ? "border-amber-400/50 ring-1 ring-amber-400/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Image */}
              <div className="aspect-square relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.imageUrl}
                  alt={style.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/400x400?text=Style";
                  }}
                />
                {/* Selection overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                {/* Top match indicator */}
                {isTopMatch && !isSelected && (
                  <div className="absolute top-2 left-2">
                    <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white border-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Best match
                    </Badge>
                  </div>
                )}
                {/* Style axis badge */}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
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
    </div>
  );
}
