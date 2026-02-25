'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, LayoutTemplate, Loader2 } from 'lucide-react'
import { INDUSTRY_OPTIONS } from '@/lib/website/industry-templates'
import { SkeletonChat } from '../skeleton/skeleton-chat'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SkeletonPhaseProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  onAdvance: () => void
  onGoBack: () => void
  isAdvancing: boolean
  canAdvance: boolean
  onGenerateTemplate?: (industry: string) => void
  isGeneratingTemplate?: boolean
  hasExistingSkeleton?: boolean
}

export function SkeletonPhase({
  messages,
  onSendMessage,
  isLoading,
  onAdvance,
  onGoBack,
  isAdvancing,
  canAdvance,
  onGenerateTemplate,
  isGeneratingTemplate,
  hasExistingSkeleton,
}: SkeletonPhaseProps) {
  const [showTemplates, setShowTemplates] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Design Your Website</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Chat with our AI to shape your website section by section
            </p>
          </div>
        </div>
      </div>

      {!hasExistingSkeleton && onGenerateTemplate && (
        <div className="px-6 pb-3">
          {!showTemplates ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
              disabled={isGeneratingTemplate}
              className="gap-2"
            >
              <LayoutTemplate className="w-4 h-4" />
              Quick Template
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">
                  Pick an industry to generate a starter template
                </p>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((industry) => (
                  <button
                    key={industry.value}
                    onClick={() => {
                      onGenerateTemplate(industry.value)
                      setShowTemplates(false)
                    }}
                    disabled={isGeneratingTemplate}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {industry.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isGeneratingTemplate && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating template...
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <SkeletonChat messages={messages} onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>

      {canAdvance && (
        <div className="px-6 pb-6 pt-3 border-t border-border">
          <Button
            onClick={onAdvance}
            disabled={isAdvancing}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
          >
            Review & Approve
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
