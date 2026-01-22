"use client";

import { useState, useMemo } from "react";
import { Check, ChevronRight, RefreshCw, Sparkles, Search, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  // Example output support
  exampleOutputUrl?: string | null;
}

interface DeliverableStyleGridProps {
  styles: DeliverableStyle[];
  selectedStyles: string[];
  onSelectStyle: (style: DeliverableStyle) => void;
  onShowMore?: (styleAxis: string) => void;
  onShowDifferent?: () => void;
  isLoading?: boolean;
  // New props for pagination info
  totalAvailable?: number;
  shownAxes?: string[];
}

export function DeliverableStyleGrid({
  styles,
  selectedStyles,
  onSelectStyle,
  onShowMore,
  onShowDifferent,
  isLoading,
  totalAvailable,
  shownAxes,
}: DeliverableStyleGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [exampleModal, setExampleModal] = useState<{ style: DeliverableStyle; url: string } | null>(null);

  // Filter styles by search query
  const filteredStyles = useMemo(() => {
    if (!searchQuery.trim()) return styles;
    const query = searchQuery.toLowerCase();
    return styles.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.styleAxis.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.semanticTags?.some(t => t.toLowerCase().includes(query))
    );
  }, [styles, searchQuery]);

  if (!styles || styles.length === 0) {
    return null;
  }

  const getStyleAxisLabel = (value: string) => {
    return STYLE_AXES.find((a) => a.value === value)?.label || value;
  };

  // Check if any styles have brand match scores
  const hasBrandScoring = styles.some(s => s.brandMatchScore !== undefined);

  // Calculate available axes for "show different" button
  const currentAxes = new Set(styles.map(s => s.styleAxis));
  const allKnownAxes = STYLE_AXES.map(a => a.value);
  const seenAxes = new Set([...(shownAxes || []), ...currentAxes]);
  const remainingAxes = allKnownAxes.filter(a => !seenAxes.has(a));
  const hasMoreDifferentStyles = remainingAxes.length > 0;

  return (
    <div className="space-y-3">
      {/* Header with personalization hint and search toggle */}
      <div className="flex items-center justify-between">
        {hasBrandScoring && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sorted by match to your brand</span>
          </div>
        )}
        {styles.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
            <span className="ml-1">{showSearch ? "Close" : "Search"}</span>
          </Button>
        )}
      </div>

      {/* Search input */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search styles by name, tags, or mood..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* No results message */}
      {filteredStyles.length === 0 && searchQuery && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No styles found for "{searchQuery}"
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredStyles.map((style, index) => {
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
                {/* Example output button */}
                {style.exampleOutputUrl && (
                  <button
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-background/90 backdrop-blur-sm border border-border/50 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExampleModal({ style, url: style.exampleOutputUrl! });
                    }}
                    title="See example output"
                  >
                    <Eye className="w-3 h-3" />
                    Example
                  </button>
                )}
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
          {onShowMore && filteredStyles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowMore(filteredStyles[0].styleAxis)}
              disabled={isLoading}
              className="text-xs"
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1" />
              More {getStyleAxisLabel(filteredStyles[0].styleAxis)} styles
            </Button>
          )}
          {onShowDifferent && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowDifferent}
              disabled={isLoading || !hasMoreDifferentStyles}
              className="text-xs"
              title={!hasMoreDifferentStyles ? "All style directions shown" : undefined}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isLoading && "animate-spin")} />
              {hasMoreDifferentStyles
                ? `Show different styles (${remainingAxes.length} more)`
                : "All styles shown"}
            </Button>
          )}
        </div>
      )}

      {/* Example Output Modal */}
      <Dialog open={!!exampleModal} onOpenChange={(open) => !open && setExampleModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Example: {exampleModal?.style.name}
            </DialogTitle>
          </DialogHeader>
          {exampleModal && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={exampleModal.url}
                  alt={`Example output for ${exampleModal.style.name}`}
                  className="w-full h-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/800x600?text=Example+Not+Available";
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{exampleModal.style.name}</p>
                  {exampleModal.style.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {exampleModal.style.description}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onSelectStyle(exampleModal.style);
                    setExampleModal(null);
                  }}
                >
                  Select this style
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
