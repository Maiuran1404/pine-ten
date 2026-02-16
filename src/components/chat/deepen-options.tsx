'use client'

import { motion } from 'framer-motion'
import { PenLine, FileText, GitBranch, TrendingUp, Package, Layers, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { DeepenOption, DeliverableCategory } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface DeepenOptionsProps {
  deliverableCategory: DeliverableCategory
  selectedOptions: DeepenOption[]
  onAction: (option: DeepenOption) => void
  disabled?: boolean
  className?: string
}

// =============================================================================
// OPTION CONFIG
// =============================================================================

interface OptionConfig {
  label: string
  description: string
  icon: typeof PenLine
  categories: DeliverableCategory[]
}

const OPTION_CONFIG: Record<DeepenOption, OptionConfig> = {
  production_copy: {
    label: 'Production Copy',
    description: 'Refine messaging to production-ready quality',
    icon: PenLine,
    categories: ['video', 'website', 'content', 'design', 'brand'],
  },
  script_writing: {
    label: 'Script Writing',
    description: 'Full production script with timing and direction notes',
    icon: FileText,
    categories: ['video'],
  },
  ab_variant: {
    label: 'A/B Variant',
    description: 'Generate alternative versions for testing',
    icon: GitBranch,
    categories: ['video', 'website', 'content', 'design'],
  },
  conversion_optimization: {
    label: 'Conversion Optimization',
    description: 'Optimize CTAs, flow, and conversion triggers',
    icon: TrendingUp,
    categories: ['website', 'content'],
  },
  asset_specifications: {
    label: 'Asset Specifications',
    description: 'Expand into detailed, production-ready asset specs',
    icon: Package,
    categories: ['design', 'brand', 'video', 'website', 'content'],
  },
}

// =============================================================================
// OPTION CARD
// =============================================================================

function OptionCard({
  config,
  isSelected,
  onSelect,
  disabled,
  index,
}: {
  option: DeepenOption
  config: OptionConfig
  isSelected: boolean
  onSelect: () => void
  disabled: boolean
  index: number
}) {
  const Icon = config.icon

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
          : 'border-border/40 bg-white/60 dark:bg-card/60 hover:border-border hover:bg-white/80 dark:hover:bg-card/80',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
          )}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{config.label}</span>
            {isSelected && (
              <Badge variant="default" className="text-[9px] h-4">
                Selected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
      </div>
    </motion.button>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function DeepenEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Layers className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Depth options will appear here</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Choose how to refine your brief before submission
      </p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DeepenOptions({
  deliverableCategory,
  selectedOptions,
  onAction,
  disabled = false,
  className,
}: DeepenOptionsProps) {
  // Filter options by deliverable category
  const availableOptions = (Object.entries(OPTION_CONFIG) as [DeepenOption, OptionConfig][]).filter(
    ([, config]) =>
      config.categories.includes(deliverableCategory) ||
      config.categories.includes(deliverableCategory)
  )

  if (availableOptions.length === 0) {
    return <DeepenEmpty />
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Go Deeper</span>
        </div>
        {selectedOptions.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {selectedOptions.length} selected
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Select areas to refine before submitting your brief.
      </p>

      {/* Option cards */}
      <div className="space-y-2">
        {availableOptions.map(([option, config], index) => (
          <OptionCard
            key={option}
            option={option}
            config={config}
            isSelected={selectedOptions.includes(option)}
            onSelect={() => onAction(option)}
            disabled={disabled}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
