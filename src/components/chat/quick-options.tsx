"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickOptions as QuickOptionsType } from "./types";
import { cn } from "@/lib/utils";

interface QuickOptionsProps {
  options: QuickOptionsType;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

/**
 * Displays quick option buttons for user selection
 * Supports both single-select (immediate) and multi-select (with confirm)
 * Clean, modern design with grid layout
 */
export function QuickOptions({
  options,
  onSelect,
  disabled = false,
}: QuickOptionsProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const isMultiSelect = options.multiSelect === true;

  if (options.options.length === 0) return null;

  const handleOptionClick = (option: string) => {
    if (disabled) return;

    if (isMultiSelect) {
      // Toggle selection
      setSelectedOptions((prev) =>
        prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
      );
    } else {
      // Immediate selection
      onSelect(option);
    }
  };

  const handleConfirm = () => {
    if (selectedOptions.length > 0) {
      // Send all selected options as a combined response
      const combinedResponse =
        selectedOptions.length === 1
          ? selectedOptions[0]
          : selectedOptions.join(", ");
      onSelect(combinedResponse);
      setSelectedOptions([]);
    }
  };

  // Determine grid columns based on number of options
  const getGridCols = (count: number) => {
    if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-3", getGridCols(options.options.length))}>
        {options.options.map((option, idx) => {
          const isSelected = selectedOptions.includes(option);
          // Check if this is a "recommended" or primary action (usually the last one or contains certain keywords)
          const isPrimary =
            idx === options.options.length - 1 &&
            (option.toLowerCase().includes("no") ||
              option.toLowerCase().includes("let's") ||
              option.toLowerCase().includes("continue") ||
              option.toLowerCase().includes("decide"));

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                "px-4 py-3 text-sm font-medium rounded-lg border transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                "text-left",
                isPrimary
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
                  : isMultiSelect && isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white dark:bg-card hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
              )}
            >
              {isMultiSelect && isSelected && (
                <Check className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Confirm button for multi-select */}
      {isMultiSelect && selectedOptions.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleConfirm}
            disabled={disabled}
            size="sm"
            className="gap-2"
          >
            Continue with {selectedOptions.length} selected
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
