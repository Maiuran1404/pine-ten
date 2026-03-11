'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QuickOptions as QuickOptionsType, QuickOptionItem } from './types'
import { cn } from '@/lib/utils'

interface QuickOptionsProps {
  options: QuickOptionsType
  onSelect: (option: string) => void
  disabled?: boolean
  showSkip?: boolean
}

/** Normalize option to a label string */
function getLabel(option: string | QuickOptionItem): string {
  return typeof option === 'string' ? option : option.label
}

/** Check if an option is a navigation action (go back, skip, continue) */
function isNavigationOption(label: string): boolean {
  const lower = label.toLowerCase()
  return (
    lower.startsWith('go back') ||
    lower.startsWith('skip') ||
    lower.startsWith('continue') ||
    lower.startsWith('move on')
  )
}

/** Check if any option has an image */
function hasImages(options: (string | QuickOptionItem)[]): boolean {
  return options.some((o) => typeof o === 'object' && o !== null && 'imageUrl' in o && o.imageUrl)
}

/**
 * Displays quick option buttons for user selection
 * Compact horizontal layout with max 5 options (text pills)
 * Grid layout with image cards when images are available
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

  const showImageCards = hasImages(displayOptions)

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

  // Image card layout for style direction chips
  if (showImageCards) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {displayOptions.map((option, idx) => {
            const label = getLabel(option)
            const imageUrl =
              typeof option === 'object' && 'imageUrl' in option ? option.imageUrl : undefined
            const isSelected = selectedOptions.includes(label)

            // Fallback to text pill if this specific option has no image
            if (!imageUrl) {
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  type="button"
                  onClick={() => handleOptionClick(label)}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 text-[13px] font-normal rounded-full border transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'whitespace-nowrap cursor-pointer',
                    isMultiSelect && isSelected
                      ? 'border-crafted-green bg-crafted-mint/20 text-crafted-forest'
                      : 'border-border bg-muted/40 text-foreground/80 dark:border-border dark:bg-card dark:text-foreground/80',
                    'hover:border-crafted-sage hover:bg-crafted-mint/10 hover:shadow-sm hover:text-crafted-forest dark:hover:bg-crafted-green/10 dark:hover:border-crafted-sage/50',
                    'active:border-crafted-green active:bg-crafted-mint/20 active:scale-[0.97] dark:active:bg-crafted-green/15'
                  )}
                >
                  {isMultiSelect && isSelected && <Check className="h-3.5 w-3.5 inline mr-1.5" />}
                  <span className="truncate" title={label}>
                    {label}
                  </span>
                </motion.button>
              )
            }

            return (
              <motion.button
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                type="button"
                onClick={() => handleOptionClick(label)}
                disabled={disabled}
                className={cn(
                  'group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer',
                  'border-2 transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isMultiSelect && isSelected
                    ? 'border-crafted-green ring-2 ring-crafted-green/30 scale-[0.98]'
                    : 'border-transparent hover:border-crafted-sage/60 hover:shadow-lg',
                  'active:scale-[0.96]'
                )}
              >
                {/* Image */}
                <img
                  src={imageUrl}
                  alt={label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Bottom gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <span
                    className="text-white text-[13px] font-medium leading-tight drop-shadow-sm line-clamp-2"
                    title={label}
                  >
                    {label}
                  </span>
                </div>

                {/* Multi-select check badge */}
                {isMultiSelect && isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-crafted-green flex items-center justify-center shadow-md">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {showSkip && !isMultiSelect && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: displayOptions.length * 0.06 }}
            type="button"
            onClick={() => onSelect('Skip this question')}
            disabled={disabled}
            className="px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Skip
          </motion.button>
        )}

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

  // Default text pill layout
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {displayOptions
          .filter((o) => !isNavigationOption(getLabel(o)))
          .map((option, idx) => {
            const label = getLabel(option)
            const isSelected = selectedOptions.includes(label)

            return (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                type="button"
                onClick={() => handleOptionClick(label)}
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
                <span className="truncate" title={label}>
                  {label}
                </span>
              </motion.button>
            )
          })}
      </div>
      {/* Navigation options in a separate row */}
      {displayOptions.some((o) => isNavigationOption(getLabel(o))) && (
        <div className="flex flex-wrap gap-2 items-center">
          {displayOptions
            .filter((o) => isNavigationOption(getLabel(o)))
            .map((option, idx) => {
              const label = getLabel(option)
              return (
                <motion.button
                  key={`nav-${idx}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  type="button"
                  onClick={() => handleOptionClick(label)}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 text-[13px] font-normal rounded-full border transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'whitespace-nowrap cursor-pointer',
                    'border-dashed border-border text-muted-foreground',
                    'hover:border-crafted-sage hover:text-foreground hover:shadow-sm',
                    'active:scale-[0.97]'
                  )}
                >
                  <span className="truncate" title={label}>
                    {label}
                  </span>
                </motion.button>
              )
            })}
        </div>
      )}
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
