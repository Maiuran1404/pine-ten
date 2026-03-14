'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { WebsiteStyleVariant } from '@/lib/ai/briefing-state-machine'

export interface WebsiteStyleVariantsProps {
  variants: WebsiteStyleVariant[]
  isGenerating: boolean
  selectedVariant: WebsiteStyleVariant | null
  onSelectVariant: (variant: WebsiteStyleVariant) => void
  onConfirmStyle: () => void
  className?: string
}

function VariantSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 p-4 space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-3 w-full bg-muted rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-6 rounded-full bg-muted" />
        <div className="h-6 w-6 rounded-full bg-muted" />
      </div>
      <div className="h-3 w-32 bg-muted rounded" />
      <div className="h-3 w-20 bg-muted rounded" />
    </div>
  )
}

export function WebsiteStyleVariants({
  variants,
  isGenerating,
  selectedVariant,
  onSelectVariant,
  onConfirmStyle,
  className,
}: WebsiteStyleVariantsProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-crafted-green" />
          <span className="text-sm font-semibold text-foreground">Style Variants</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Pick a visual direction for your website
        </p>
      </div>

      {/* Variant cards */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-3"
            >
              <VariantSkeleton />
              <VariantSkeleton />
              <VariantSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="variants"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid gap-3"
            >
              {variants.map((variant, index) => {
                const isSelected = selectedVariant?.id === variant.id
                return (
                  <motion.button
                    key={variant.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    onClick={() => onSelectVariant(variant)}
                    className={cn(
                      'relative rounded-xl border p-4 text-left transition-all duration-200',
                      'hover:border-crafted-green/40 hover:bg-accent/30',
                      isSelected
                        ? 'border-crafted-green ring-2 ring-crafted-green/30 bg-crafted-green/5'
                        : 'border-border/40 bg-background'
                    )}
                  >
                    {/* Selected check */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 h-5 w-5 rounded-full bg-crafted-green flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-white" />
                      </motion.div>
                    )}

                    {/* Variant name */}
                    <h3 className="text-sm font-semibold text-foreground pr-6">{variant.name}</h3>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mt-1">{variant.description}</p>

                    {/* Color dots + font pair + density */}
                    <div className="flex items-center gap-4 mt-3">
                      {/* Color dots */}
                      <div className="flex items-center gap-1.5">
                        {variant.globalStyles.primaryColor && (
                          <span
                            className="h-5 w-5 rounded-full border border-border/60 shrink-0"
                            style={{ backgroundColor: variant.globalStyles.primaryColor }}
                            title={`Primary: ${variant.globalStyles.primaryColor}`}
                          />
                        )}
                        {variant.globalStyles.secondaryColor && (
                          <span
                            className="h-5 w-5 rounded-full border border-border/60 shrink-0"
                            style={{ backgroundColor: variant.globalStyles.secondaryColor }}
                            title={`Secondary: ${variant.globalStyles.secondaryColor}`}
                          />
                        )}
                      </div>

                      {/* Font pair */}
                      {(variant.globalStyles.fontPrimary || variant.globalStyles.fontSecondary) && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {[variant.globalStyles.fontPrimary, variant.globalStyles.fontSecondary]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
                      )}

                      {/* Layout density */}
                      {variant.globalStyles.layoutDensity && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                          {variant.globalStyles.layoutDensity}
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer: confirm button */}
      <div className="shrink-0 px-4 py-3 border-t border-border/40 space-y-2">
        <Button
          size="lg"
          className="gap-2 w-full bg-crafted-green hover:bg-crafted-forest text-white rounded-xl h-11 font-medium shadow-sm shadow-crafted-green/15"
          onClick={onConfirmStyle}
          disabled={!selectedVariant || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating styles...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Confirm style
            </>
          )}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          Or describe your own style in the chat
        </p>
      </div>
    </div>
  )
}
