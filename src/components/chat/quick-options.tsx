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
 */
export function QuickOptions({ options, onSelect, disabled = false }: QuickOptionsProps) {
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
      const combinedResponse = selectedOptions.length === 1
        ? selectedOptions[0]
        : selectedOptions.join(", ");
      onSelect(combinedResponse);
      setSelectedOptions([]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.options.map((option, idx) => {
          const isSelected = selectedOptions.includes(option);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isMultiSelect && isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer"
              )}
            >
              {isMultiSelect && isSelected && (
                <Check className="h-3 w-3 inline mr-1.5 -ml-0.5" />
              )}
              {option}
            </button>
          );
        })}
      </div>

      {/* Confirm button for multi-select */}
      {isMultiSelect && selectedOptions.length > 0 && (
        <div className="flex justify-end">
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
