"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Type,
  Image as ImageIcon,
  Plus,
  X,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { VisualDirection } from "./types";
import type { DeliverableStyle } from "../types";

// =============================================================================
// SELECTED STYLES SECTION
// =============================================================================

interface SelectedStylesProps {
  styles: DeliverableStyle[];
  onRemoveStyle?: (styleId: string) => void;
}

function SelectedStyles({ styles, onRemoveStyle }: SelectedStylesProps) {
  if (styles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
        <ImageIcon className="h-6 w-6 text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground">
          No styles selected yet
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          Add styles from the moodboard
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {styles.map((style) => (
        <motion.div
          key={style.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="group relative aspect-square rounded-lg overflow-hidden border border-border"
        >
          <img
            src={style.imageUrl}
            alt={style.name}
            className="w-full h-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-xs text-white font-medium truncate">
                {style.name}
              </p>
              <Badge variant="secondary" className="text-[10px] mt-1">
                {style.styleAxis}
              </Badge>
            </div>
          </div>
          {/* Remove button */}
          {onRemoveStyle && (
            <button
              onClick={() => onRemoveStyle(style.id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/70"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// COLOR PALETTE SECTION
// =============================================================================

interface ColorPaletteProps {
  colors: string[];
  onAddColor?: (color: string) => void;
  onRemoveColor?: (color: string) => void;
}

function ColorPalette({ colors, onAddColor, onRemoveColor }: ColorPaletteProps) {
  const [newColor, setNewColor] = useState("#");
  const [showInput, setShowInput] = useState(false);

  const handleAddColor = () => {
    if (newColor && newColor !== "#" && onAddColor) {
      onAddColor(newColor);
      setNewColor("#");
      setShowInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Color Palette
        </span>
      </div>

      {colors.length === 0 && !showInput ? (
        <div className="text-xs text-muted-foreground/70 italic">
          Colors from brand profile
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {colors.map((color, idx) => (
            <motion.div
              key={`${color}-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative"
            >
              <div
                className="w-8 h-8 rounded-lg border border-border shadow-sm cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
              {onRemoveColor && (
                <button
                  onClick={() => onRemoveColor(color)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </motion.div>
          ))}

          {/* Add color button/input */}
          <AnimatePresence>
            {showInput ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1"
              >
                <Input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="#000000"
                  className="h-8 w-20 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColor();
                    if (e.key === "Escape") setShowInput(false);
                  }}
                />
                <Button size="icon" className="h-8 w-8" onClick={handleAddColor}>
                  <Plus className="h-3 w-3" />
                </Button>
              </motion.div>
            ) : (
              onAddColor && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowInput(true)}
                  className="w-8 h-8 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground/50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
              )
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TYPOGRAPHY SECTION
// =============================================================================

interface TypographyDisplayProps {
  primary: string;
  secondary: string;
}

function TypographyDisplay({ primary, secondary }: TypographyDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Typography
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            Primary
          </p>
          <p className="text-sm font-medium" style={{ fontFamily: primary }}>
            {primary || "Not set"}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            Secondary
          </p>
          <p className="text-sm" style={{ fontFamily: secondary }}>
            {secondary || "Not set"}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MOOD KEYWORDS SECTION
// =============================================================================

interface MoodKeywordsProps {
  keywords: string[];
  onAddKeyword?: (keyword: string) => void;
  onRemoveKeyword?: (keyword: string) => void;
}

function MoodKeywords({
  keywords,
  onAddKeyword,
  onRemoveKeyword,
}: MoodKeywordsProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (newKeyword.trim() && onAddKeyword) {
      onAddKeyword(newKeyword.trim());
      setNewKeyword("");
      setShowInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Mood Keywords
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword, idx) => (
          <Badge
            key={`${keyword}-${idx}`}
            variant="secondary"
            className="text-xs gap-1 pr-1"
          >
            {keyword}
            {onRemoveKeyword && (
              <button
                onClick={() => onRemoveKeyword(keyword)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}

        {/* Add keyword */}
        <AnimatePresence>
          {showInput ? (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1"
            >
              <Input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="keyword"
                className="h-6 w-24 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setShowInput(false);
                }}
                autoFocus
              />
            </motion.div>
          ) : (
            onAddKeyword && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowInput(true)}
                className="h-5 px-2 rounded border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:border-muted-foreground/50 transition-colors flex items-center gap-1"
              >
                <Plus className="h-2.5 w-2.5" />
                Add
              </motion.button>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// AVOID ELEMENTS SECTION
// =============================================================================

interface AvoidElementsProps {
  elements: string[];
  onAddElement?: (element: string) => void;
  onRemoveElement?: (element: string) => void;
}

function AvoidElements({
  elements,
  onAddElement,
  onRemoveElement,
}: AvoidElementsProps) {
  const [newElement, setNewElement] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (newElement.trim() && onAddElement) {
      onAddElement(newElement.trim());
      setNewElement("");
      setShowInput(false);
    }
  };

  if (elements.length === 0 && !showInput && !onAddElement) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Avoid
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {elements.map((element, idx) => (
          <Badge
            key={`${element}-${idx}`}
            variant="outline"
            className="text-xs gap-1 pr-1 border-destructive/30 text-destructive/70"
          >
            {element}
            {onRemoveElement && (
              <button
                onClick={() => onRemoveElement(element)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}

        {/* Add element */}
        <AnimatePresence>
          {showInput ? (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1"
            >
              <Input
                type="text"
                value={newElement}
                onChange={(e) => setNewElement(e.target.value)}
                placeholder="element to avoid"
                className="h-6 w-28 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setShowInput(false);
                }}
                autoFocus
              />
            </motion.div>
          ) : (
            onAddElement && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowInput(true)}
                className="h-5 px-2 rounded border border-dashed border-destructive/30 text-xs text-muted-foreground hover:border-destructive/50 transition-colors flex items-center gap-1"
              >
                <Plus className="h-2.5 w-2.5" />
                Add
              </motion.button>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN VISUAL DIRECTION PANEL
// =============================================================================

interface VisualDirectionPanelProps {
  visualDirection: VisualDirection | null;
  onUpdate: (visualDirection: VisualDirection) => void;
}

export function VisualDirectionPanel({
  visualDirection,
  onUpdate,
}: VisualDirectionPanelProps) {
  // Create default visual direction if null
  const direction: VisualDirection = visualDirection || {
    selectedStyles: [],
    moodKeywords: [],
    colorPalette: [],
    typography: {
      primary: "",
      secondary: "",
    },
    avoidElements: [],
  };

  // Handlers
  const handleAddColor = (color: string) => {
    onUpdate({
      ...direction,
      colorPalette: [...direction.colorPalette, color],
    });
  };

  const handleRemoveColor = (color: string) => {
    onUpdate({
      ...direction,
      colorPalette: direction.colorPalette.filter((c) => c !== color),
    });
  };

  const handleAddKeyword = (keyword: string) => {
    onUpdate({
      ...direction,
      moodKeywords: [...direction.moodKeywords, keyword],
    });
  };

  const handleRemoveKeyword = (keyword: string) => {
    onUpdate({
      ...direction,
      moodKeywords: direction.moodKeywords.filter((k) => k !== keyword),
    });
  };

  const handleAddAvoidElement = (element: string) => {
    onUpdate({
      ...direction,
      avoidElements: [...(direction.avoidElements || []), element],
    });
  };

  const handleRemoveAvoidElement = (element: string) => {
    onUpdate({
      ...direction,
      avoidElements: (direction.avoidElements || []).filter((e) => e !== element),
    });
  };

  const handleRemoveStyle = (styleId: string) => {
    onUpdate({
      ...direction,
      selectedStyles: direction.selectedStyles.filter((s) => s.id !== styleId),
    });
  };

  // Empty state
  if (
    direction.selectedStyles.length === 0 &&
    direction.colorPalette.length === 0 &&
    direction.moodKeywords.length === 0
  ) {
    return (
      <div className="space-y-6">
        {/* Selected Styles */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Selected Styles
            </span>
          </div>
          <SelectedStyles styles={[]} />
        </div>

        {/* Prompt for style selection */}
        <div className="text-center py-4 border border-dashed border-muted-foreground/30 rounded-lg">
          <Sparkles className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Visual direction will be populated from your moodboard selections
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Continue chatting to see style options
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Styles */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Selected Styles
          </span>
          {direction.selectedStyles.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {direction.selectedStyles.length}
            </Badge>
          )}
        </div>
        <SelectedStyles
          styles={direction.selectedStyles}
          onRemoveStyle={handleRemoveStyle}
        />
      </div>

      {/* Color Palette */}
      <ColorPalette
        colors={direction.colorPalette}
        onAddColor={handleAddColor}
        onRemoveColor={handleRemoveColor}
      />

      {/* Typography */}
      {(direction.typography.primary || direction.typography.secondary) && (
        <TypographyDisplay
          primary={direction.typography.primary}
          secondary={direction.typography.secondary}
        />
      )}

      {/* Mood Keywords */}
      <MoodKeywords
        keywords={direction.moodKeywords}
        onAddKeyword={handleAddKeyword}
        onRemoveKeyword={handleRemoveKeyword}
      />

      {/* Avoid Elements */}
      <AvoidElements
        elements={direction.avoidElements || []}
        onAddElement={handleAddAvoidElement}
        onRemoveElement={handleRemoveAvoidElement}
      />
    </div>
  );
}

export default VisualDirectionPanel;
