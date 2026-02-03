"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type DeliverableStyle } from "./types";

interface StyleSelectionGridProps {
  styles: DeliverableStyle[];
  collectionStyleIds: string[];
  onCardClick?: (style: DeliverableStyle) => void;
  onAddToCollection: (style: DeliverableStyle) => void;
  onRemoveFromCollection: (styleId: string) => void;
  onConfirmSelection?: (selectedStyles: DeliverableStyle[]) => void;
  onShowMore?: (styleAxis: string) => void;
  onShowDifferent?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function StyleSelectionGrid({
  styles,
  collectionStyleIds,
  onAddToCollection,
  onRemoveFromCollection,
  onConfirmSelection,
  onShowMore,
  onShowDifferent,
  isLoading,
  className,
}: StyleSelectionGridProps) {
  const [selectedStyle, setSelectedStyle] = useState<DeliverableStyle | null>(
    null
  );
  const [hoveredStyleId, setHoveredStyleId] = useState<string | null>(null);

  if (!styles || styles.length === 0) {
    return null;
  }

  const handleCardClick = (style: DeliverableStyle) => {
    // Single selection - clicking selects/deselects
    if (selectedStyle?.id === style.id) {
      setSelectedStyle(null);
    } else {
      setSelectedStyle(style);
    }
  };

  const handleConfirm = () => {
    if (selectedStyle && onConfirmSelection) {
      onConfirmSelection([selectedStyle]);
      setSelectedStyle(null);
    }
  };

  // Limit to showing only 3 styles
  const displayedStyles = styles.slice(0, 3);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Clean style grid */}
      <div className="grid grid-cols-3 gap-6 max-w-2xl">
        {displayedStyles.map((style, index) => {
          const isSelected = selectedStyle?.id === style.id;
          const isHovered = hoveredStyleId === style.id;

          return (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.5, zIndex: 50 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => handleCardClick(style)}
              onMouseEnter={() => setHoveredStyleId(style.id)}
              onMouseLeave={() => setHoveredStyleId(null)}
              className={cn(
                "relative aspect-[4/5] rounded-xl overflow-hidden transition-shadow duration-200",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                  : "hover:shadow-2xl hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background"
              )}
            >
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={style.imageUrl}
                alt={style.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/400x500?text=Style";
                }}
              />

              {/* Hover overlay with name - only visible on THIS card's hover */}
              {(isHovered || isSelected) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">
                      {style.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Confirm button - shows when a style is selected */}
      <AnimatePresence>
        {selectedStyle && onConfirmSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Continue with {selectedStyle.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal action links - only show when no selection */}
      {!selectedStyle && (onShowMore || onShowDifferent) && (
        <div className="flex items-center gap-4 text-xs">
          {onShowMore && styles.length > 0 && (
            <button
              onClick={() => onShowMore(styles[0].styleAxis)}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              More like these →
            </button>
          )}
          {onShowDifferent && (
            <button
              onClick={onShowDifferent}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Show different
            </button>
          )}
        </div>
      )}
    </div>
  );
}
