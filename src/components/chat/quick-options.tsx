"use client";

import { QuickOptions as QuickOptionsType } from "./types";

interface QuickOptionsProps {
  options: QuickOptionsType;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

/**
 * Displays quick option buttons for user selection
 */
export function QuickOptions({ options, onSelect, disabled = false }: QuickOptionsProps) {
  if (options.options.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">{options.question}</p>
      <div className="flex flex-wrap gap-2">
        {options.options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(option)}
            disabled={disabled}
            className="px-4 py-2 text-sm font-medium rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
