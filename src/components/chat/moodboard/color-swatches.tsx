"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorSwatchProps {
  color: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ColorSwatch({
  color,
  name,
  size = "md",
  onRemove,
  onClick,
  className,
}: ColorSwatchProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn("group relative", className)}
    >
      <button
        onClick={onClick}
        className={cn(
          sizeClasses[size],
          "rounded-full border-2 border-white shadow-sm",
          "transition-transform hover:scale-110",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
        style={{ backgroundColor: color }}
        aria-label={name || color}
        title={name || color}
      />
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "absolute -top-1 -right-1 w-4 h-4 rounded-full",
            "bg-destructive text-destructive-foreground",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
          aria-label={`Remove ${name || color}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </motion.div>
  );
}

interface ColorSwatchesProps {
  colors: Array<{ color: string; name?: string; id: string }>;
  onRemove?: (id: string) => void;
  onAddColor?: () => void;
  size?: "sm" | "md" | "lg";
  maxDisplay?: number;
  className?: string;
}

export function ColorSwatches({
  colors,
  onRemove,
  onAddColor,
  size = "md",
  maxDisplay = 8,
  className,
}: ColorSwatchesProps) {
  const displayColors = colors.slice(0, maxDisplay);
  const remainingCount = colors.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AnimatePresence>
        {displayColors.map((item) => (
          <ColorSwatch
            key={item.id}
            color={item.color}
            name={item.name}
            size={size}
            onRemove={onRemove ? () => onRemove(item.id) : undefined}
          />
        ))}
      </AnimatePresence>

      {remainingCount > 0 && (
        <div
          className={cn(
            "rounded-full bg-muted text-muted-foreground",
            "flex items-center justify-center text-xs font-medium",
            size === "sm" && "w-6 h-6",
            size === "md" && "w-8 h-8",
            size === "lg" && "w-10 h-10"
          )}
        >
          +{remainingCount}
        </div>
      )}

      {onAddColor && (
        <button
          onClick={onAddColor}
          className={cn(
            "rounded-full border-2 border-dashed border-muted-foreground/30",
            "flex items-center justify-center",
            "text-muted-foreground hover:border-primary hover:text-primary",
            "transition-colors",
            size === "sm" && "w-6 h-6",
            size === "md" && "w-8 h-8",
            size === "lg" && "w-10 h-10"
          )}
          aria-label="Add color"
        >
          <Plus className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
        </button>
      )}
    </div>
  );
}

interface ExtractedColorsProps {
  imageUrl: string;
  colors: string[];
  className?: string;
}

export function ExtractedColors({
  colors,
  className,
}: ExtractedColorsProps) {
  if (colors.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">Extracted colors</p>
      <div className="flex items-center gap-1">
        {colors.map((color, idx) => (
          <div
            key={idx}
            className="w-6 h-6 rounded-md shadow-sm first:rounded-l-lg last:rounded-r-lg"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}
