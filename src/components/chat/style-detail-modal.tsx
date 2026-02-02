"use client";

import { motion } from "framer-motion";
import { Check, Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type DeliverableStyle } from "./types";
import { STYLE_AXES } from "@/lib/constants/reference-libraries";

interface StyleDetailModalProps {
  style: DeliverableStyle | null;
  isOpen: boolean;
  onClose: () => void;
  isInCollection: boolean;
  onAddToCollection: (style: DeliverableStyle) => void;
  onRemoveFromCollection: (styleId: string) => void;
}

export function StyleDetailModal({
  style,
  isOpen,
  onClose,
  isInCollection,
  onAddToCollection,
  onRemoveFromCollection,
}: StyleDetailModalProps) {
  if (!style) return null;

  const getStyleAxisLabel = (value: string) => {
    return STYLE_AXES.find((a) => a.value === value)?.label || value;
  };

  const isGoodMatch = (style.brandMatchScore || 0) >= 60;
  const isTopMatch = (style.brandMatchScore || 0) >= 70;

  const handleToggleCollection = () => {
    if (isInCollection) {
      onRemoveFromCollection(style.id);
    } else {
      onAddToCollection(style);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={style.imageUrl}
            alt={style.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/400x400?text=Style";
            }}
          />

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {isTopMatch && (
              <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Best match
              </Badge>
            )}
            {isInCollection && (
              <Badge className="text-xs bg-green-500 hover:bg-green-500 text-white border-0">
                <Check className="w-3 h-3 mr-1" />
                In collection
              </Badge>
            )}
          </div>

          {/* Style axis badge */}
          <div className="absolute top-3 right-3">
            <Badge
              variant="secondary"
              className="text-xs bg-background/80 backdrop-blur-sm"
            >
              {getStyleAxisLabel(style.styleAxis)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg">{style.name}</DialogTitle>
            {style.description && (
              <DialogDescription className="text-sm text-muted-foreground">
                {style.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Brand match reason */}
          {style.matchReason && isGoodMatch && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {style.matchReason}
              </p>
            </div>
          )}

          {/* Action button */}
          <Button
            onClick={handleToggleCollection}
            variant={isInCollection ? "outline" : "default"}
            className="w-full gap-2"
          >
            {isInCollection ? (
              <>
                <X className="w-4 h-4" />
                Remove from collection
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to collection
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
