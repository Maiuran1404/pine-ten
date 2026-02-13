'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OptionChip {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface OptionChipsProps {
  options: OptionChip[]
  onSelect: (option: OptionChip) => void
  multiSelect?: boolean
  selectedIds?: string[]
  onConfirm?: (selectedIds: string[]) => void
  disabled?: boolean
  columns?: 1 | 2 | 3 | 4
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OptionChips({
  options,
  onSelect,
  multiSelect = false,
  selectedIds = [],
  onConfirm,
  disabled = false,
  columns = 2,
  size = 'md',
  className,
}: OptionChipsProps) {
  const [internalSelected, setInternalSelected] = useState<string[]>(selectedIds)
  const selected = multiSelect ? internalSelected : selectedIds

  const handleSelect = (option: OptionChip) => {
    if (disabled || option.disabled) return

    if (multiSelect) {
      const newSelected = internalSelected.includes(option.id)
        ? internalSelected.filter((id) => id !== option.id)
        : [...internalSelected, option.id]
      setInternalSelected(newSelected)
    }

    onSelect(option)
  }

  const handleConfirm = () => {
    if (onConfirm && internalSelected.length > 0) {
      onConfirm(internalSelected)
    }
  }

  const sizeClasses = {
    sm: 'min-h-10 px-3 py-2 text-sm',
    md: 'min-h-12 px-4 py-3 text-sm',
    lg: 'min-h-14 px-5 py-4 text-base',
  }

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('grid gap-2', gridClasses[columns])}>
        {options.map((option, index) => {
          const isSelected = selected.includes(option.id)

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => handleSelect(option)}
              disabled={disabled || option.disabled}
              className={cn(
                'relative flex items-center gap-3 rounded-xl border-2 text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                sizeClasses[size],
                isSelected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-foreground',
                (disabled || option.disabled) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Selection indicator */}
              {multiSelect && (
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              )}

              {/* Icon */}
              {option.icon && <div className="shrink-0 text-muted-foreground">{option.icon}</div>}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {option.description}
                  </p>
                )}
              </div>

              {/* Arrow for single select */}
              {!multiSelect && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </motion.button>
          )
        })}
      </div>

      {/* Confirm button for multi-select */}
      {multiSelect && onConfirm && internalSelected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button onClick={handleConfirm} disabled={disabled} className="gap-2">
            Continue with {internalSelected.length} selected
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Simple option chips from string array (for quick options)
 */
interface SimpleOptionChipsProps {
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
  className?: string
}

export function SimpleOptionChips({
  options,
  onSelect,
  disabled = false,
  className,
}: SimpleOptionChipsProps) {
  return (
    <OptionChips
      options={options.map((opt) => ({ id: opt, label: opt }))}
      onSelect={(opt) => onSelect(opt.label)}
      disabled={disabled}
      columns={options.length > 4 ? 2 : options.length > 2 ? 2 : 1}
      className={className}
    />
  )
}

/**
 * Inline option chips (horizontal layout for fewer options)
 */
interface InlineOptionChipsProps {
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
  className?: string
}

export function InlineOptionChips({
  options,
  onSelect,
  disabled = false,
  className,
}: InlineOptionChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option, index) => (
        <motion.button
          key={option}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={cn(
            'px-4 py-2 rounded-full border border-border bg-card text-sm',
            'hover:border-primary hover:bg-primary/5 hover:text-primary',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'transition-colors duration-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {option}
        </motion.button>
      ))}
    </div>
  )
}
