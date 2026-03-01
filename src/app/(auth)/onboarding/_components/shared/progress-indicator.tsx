'use client'

import { Check } from 'lucide-react'

export function ProgressIndicator({
  steps,
  currentStep,
  accentColor = 'var(--crafted-olive)',
}: {
  steps: readonly { id: string; label: string }[]
  currentStep: string
  accentColor?: string
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium transition-all ${
                index === currentIndex
                  ? 'bg-white/20 text-white border border-white/40'
                  : index > currentIndex
                    ? 'bg-white/5 text-white/40'
                    : 'text-black'
              }`}
              style={index < currentIndex ? { backgroundColor: accentColor } : undefined}
            >
              {index < currentIndex ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : index + 1}
            </div>
            <span
              className={`hidden sm:block text-[10px] font-medium transition-colors ${
                index === currentIndex
                  ? 'text-white/70'
                  : index < currentIndex
                    ? 'text-white/50'
                    : 'text-white/30'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className="w-4 sm:w-8 h-0.5 -mt-4 sm:-mt-3"
              style={{
                backgroundColor: index < currentIndex ? accentColor : 'var(--border-subtle)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
