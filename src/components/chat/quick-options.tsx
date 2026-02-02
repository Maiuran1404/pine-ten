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
 * Compact horizontal layout with max 4 options
 * Sage green hover/active states matching brand
 */
export function QuickOptions({
  options,
  onSelect,
  disabled = false,
}: QuickOptionsProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const isMultiSelect = options.multiSelect === true;

  // Only show first 4 options
  const displayOptions = options.options.slice(0, 4);

  if (displayOptions.length === 0) return null;

  const handleOptionClick = (option: string) => {
    if (disabled) return;

    if (isMultiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
      );
    } else {
      onSelect(option);
    }
  };

  const handleConfirm = () => {
    if (selectedOptions.length > 0) {
      const combinedResponse =
        selectedOptions.length === 1
          ? selectedOptions[0]
          : selectedOptions.join(", ");
      onSelect(combinedResponse);
      setSelectedOptions([]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {displayOptions.map((option, idx) => {
          const isSelected = selectedOptions.includes(option);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "whitespace-nowrap",
                isMultiSelect && isSelected
                  ? // Selected state for multi-select
                    "border-[#7C9A7C] bg-[#E5EFE5] text-[#3D5A3D]"
                  : // Default state
                    "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-card dark:text-gray-200",
                // Hover: light sage green
                "hover:border-[#B8D4B8] hover:bg-[#F0F7F0] dark:hover:bg-[#2A3F2A] dark:hover:border-[#4A6B4A]",
                // Active: stronger sage green
                "active:border-[#7C9A7C] active:bg-[#E5EFE5] dark:active:bg-[#3A4F3A]"
              )}
            >
              {isMultiSelect && isSelected && (
                <Check className="h-3.5 w-3.5 inline mr-1.5" />
              )}
              {option}
            </button>
          );
        })}
      </div>

      {isMultiSelect && selectedOptions.length > 0 && (
        <div className="flex justify-start">
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
