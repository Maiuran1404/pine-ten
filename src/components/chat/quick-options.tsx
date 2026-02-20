'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickOptions as QuickOptionsType } from './types'
import { cn } from '@/lib/utils'

interface QuickOptionsProps {
  options: QuickOptionsType
  onSelect: (option: string) => void
  disabled?: boolean
  showSkip?: boolean
}

/**
 * Displays quick option buttons for user selection
 * Compact horizontal layout with max 5 options
 * Sage green hover/active states matching brand
 */
export function QuickOptions({
  options,
  onSelect,
  disabled = false,
  showSkip = false,
}: QuickOptionsProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const isMultiSelect = options.multiSelect === true

  // Only show first 5 options
  const displayOptions = options.options.slice(0, 5)

  if (displayOptions.length === 0) return null

  const handleOptionClick = (option: string) => {
    if (disabled) return

    if (isMultiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      )
    } else {
      onSelect(option)
    }
  }

  const handleConfirm = () => {
    if (selectedOptions.length > 0) {
      const combinedResponse =
        selectedOptions.length === 1 ? selectedOptions[0] : selectedOptions.join(', ')
      onSelect(combinedResponse)
      setSelectedOptions([])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {displayOptions.map((option, idx) => {
          const isSelected = selectedOptions.includes(option)

          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              type="button"
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 text-[13px] font-normal rounded-full border transition-all duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'whitespace-nowrap cursor-pointer',
                isMultiSelect && isSelected
                  ? // Selected state for multi-select
                    'border-crafted-green bg-crafted-mint/20 text-crafted-forest'
                  : // Default state
                    'border-border bg-muted/40 text-foreground/80 dark:border-border dark:bg-card dark:text-foreground/80',
                // Hover: light sage green with shadow
                'hover:border-crafted-sage hover:bg-crafted-mint/10 hover:shadow-sm hover:text-crafted-forest dark:hover:bg-crafted-green/10 dark:hover:border-crafted-sage/50',
                // Active: stronger sage green with scale
                'active:border-crafted-green active:bg-crafted-mint/20 active:scale-[0.97] dark:active:bg-crafted-green/15'
              )}
            >
              {isMultiSelect && isSelected && <Check className="h-3.5 w-3.5 inline mr-1.5" />}
              {option}
            </motion.button>
          )
        })}
        {showSkip && !isMultiSelect && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: displayOptions.length * 0.04 }}
            type="button"
            onClick={() => onSelect('Skip this question')}
            disabled={disabled}
            className="px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Skip
          </motion.button>
        )}
      </div>

      {isMultiSelect && selectedOptions.length > 0 && (
        <div className="flex justify-start">
          <Button onClick={handleConfirm} disabled={disabled} size="sm" className="gap-2">
            Continue with {selectedOptions.length} selected
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
