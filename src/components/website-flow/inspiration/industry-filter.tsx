'use client'

import { cn } from '@/lib/utils'

const INDUSTRIES = [
  'Law Firm',
  'SaaS',
  'Agency',
  'E-commerce',
  'Portfolio',
  'Restaurant',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Education',
]

const STYLES = ['Minimal', 'Bold', 'Corporate', 'Playful', 'Premium', 'Dark', 'Light', 'Editorial']

interface IndustryFilterProps {
  selectedIndustry?: string
  selectedStyle?: string
  onIndustryChange: (industry: string | undefined) => void
  onStyleChange: (style: string | undefined) => void
}

export function IndustryFilter({
  selectedIndustry,
  selectedStyle,
  onIndustryChange,
  onStyleChange,
}: IndustryFilterProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Industry
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map((industry) => {
            const value = industry.toLowerCase().replace(/\s+/g, '-')
            const isSelected = selectedIndustry === value
            return (
              <button
                key={industry}
                onClick={() => onIndustryChange(isSelected ? undefined : value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-ds-success text-white'
                    : 'bg-muted text-foreground hover:bg-accent'
                )}
              >
                {industry}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Style
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((style) => {
            const value = style.toLowerCase()
            const isSelected = selectedStyle === value
            return (
              <button
                key={style}
                onClick={() => onStyleChange(isSelected ? undefined : value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-ds-status-review text-white'
                    : 'bg-muted text-foreground hover:bg-accent'
                )}
              >
                {style}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
