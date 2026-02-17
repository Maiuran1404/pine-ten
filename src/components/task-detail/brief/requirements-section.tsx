'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

interface RequirementsSectionProps {
  requirements: Record<string, unknown> | null
}

export function RequirementsSection({ requirements }: RequirementsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!requirements) {
    return null
  }

  const projectType = requirements.projectType as string | undefined
  const platforms = requirements.platforms as string[] | undefined
  const dimensions = requirements.dimensions as string[] | undefined
  const keyMessage = requirements.keyMessage as string | undefined
  const deliverables = requirements.deliverables as string[] | undefined
  const additionalNotes = requirements.additionalNotes as string | undefined

  const hasContent =
    projectType ||
    platforms?.length ||
    dimensions?.length ||
    keyMessage ||
    deliverables?.length ||
    additionalNotes

  if (!hasContent) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
        <span>Show requirements</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-4 rounded-lg border border-border/60 p-4">
          {projectType && (
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project Type
              </span>
              <p className="text-sm">{projectType}</p>
            </div>
          )}

          {platforms && platforms.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Platforms
              </span>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {dimensions && dimensions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dimensions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dimensions.map((dim) => (
                  <Badge key={dim} variant="outline" className="text-xs">
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {keyMessage && (
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key Message
              </span>
              <p className="text-sm">{keyMessage}</p>
            </div>
          )}

          {deliverables && deliverables.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Deliverables
              </span>
              <ul className="list-disc pl-5 space-y-0.5">
                {deliverables.map((item) => (
                  <li key={item} className="text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {additionalNotes && (
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Additional Notes
              </span>
              <p className="text-sm text-muted-foreground">{additionalNotes}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
