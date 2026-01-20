"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type MoodboardItem } from "../types";
import { MoodboardCard } from "./moodboard-card";
import { MoodboardHeader, MoodboardSectionHeader } from "./moodboard-header";
import { ColorSwatches } from "./color-swatches";
import { Palette, Sparkles } from "lucide-react";

interface MoodboardPanelProps {
  items: MoodboardItem[];
  onRemoveItem: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function MoodboardPanel({
  items,
  onRemoveItem,
  onClearAll,
  className,
}: MoodboardPanelProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Group items by type
  const groupedItems = useMemo(() => {
    const styles = items.filter((item) => item.type === "style");
    const uploads = items.filter((item) => item.type === "upload");
    const colors = items.filter((item) => item.type === "color");
    const images = items.filter((item) => item.type === "image");

    return { styles, uploads, colors, images };
  }, [items]);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const hasStyles = groupedItems.styles.length > 0;
  const hasUploads = groupedItems.uploads.length > 0;
  const hasColors = groupedItems.colors.length > 0;

  return (
    <div className={cn("flex flex-col h-full bg-card/50 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <MoodboardHeader
          itemCount={items.length}
          onClearAll={items.length > 0 ? onClearAll : undefined}
        />
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {items.length === 0 ? (
            /* Empty state with helpful tips */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Palette className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Build your moodboard
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Collect styles that match your vision
              </p>
              <div className="space-y-2 text-left max-w-[180px] mx-auto">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px]">1</span>
                  </div>
                  <span>Click style cards to add them</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px]">2</span>
                  </div>
                  <span>Upload your own inspiration</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px]">3</span>
                  </div>
                  <span>Artists will use these as reference</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Selected Styles Section */}
              {hasStyles && (
                <div>
                  <MoodboardSectionHeader
                    title="Selected Styles"
                    itemCount={groupedItems.styles.length}
                    isCollapsed={collapsedSections.styles}
                    onToggleCollapse={() => toggleSection("styles")}
                  />
                  <AnimatePresence>
                    {!collapsedSections.styles && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          {groupedItems.styles.map((item) => (
                            <MoodboardCard
                              key={item.id}
                              item={item}
                              onRemove={onRemoveItem}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Color Palette Section */}
              {hasColors && (
                <div>
                  <MoodboardSectionHeader
                    title="Color Palette"
                    itemCount={groupedItems.colors.length}
                    isCollapsed={collapsedSections.colors}
                    onToggleCollapse={() => toggleSection("colors")}
                  />
                  <AnimatePresence>
                    {!collapsedSections.colors && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2">
                          <ColorSwatches
                            colors={groupedItems.colors.map((item) => ({
                              id: item.id,
                              color: item.metadata?.colorSamples?.[0] || "#888",
                              name: item.name,
                            }))}
                            onRemove={onRemoveItem}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Your Uploads Section */}
              {hasUploads && (
                <div>
                  <MoodboardSectionHeader
                    title="Your Uploads"
                    itemCount={groupedItems.uploads.length}
                    isCollapsed={collapsedSections.uploads}
                    onToggleCollapse={() => toggleSection("uploads")}
                  />
                  <AnimatePresence>
                    {!collapsedSections.uploads && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {groupedItems.uploads.map((item) => (
                            <MoodboardCard
                              key={item.id}
                              item={item}
                              onRemove={onRemoveItem}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      {items.length > 0 && items.length < 3 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Add more items to build your vision</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Export individual components for flexibility
export { MoodboardCard } from "./moodboard-card";
export { MoodboardHeader, MoodboardSectionHeader } from "./moodboard-header";
export { ColorSwatches, ColorSwatch, ExtractedColors } from "./color-swatches";
