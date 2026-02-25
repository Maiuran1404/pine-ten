'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Users, Briefcase, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Audience } from '../_lib/brand-types'

interface AudiencesTabProps {
  audiences: Audience[]
  onDelete: (id: string) => void
  onSetPrimary: (id: string) => void
}

export function AudiencesTab({ audiences, onDelete, onSetPrimary }: AudiencesTabProps) {
  const [expandedAudience, setExpandedAudience] = useState<string | null>(null)

  if (audiences.length === 0) {
    return (
      <div className="text-center py-12 px-6 rounded-xl border border-dashed border-border">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No audiences yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Target audiences are automatically inferred when you scan a website during onboarding.
          Click &quot;Redo onboarding&quot; to scan your website again.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {audiences.length} audience{audiences.length !== 1 ? 's' : ''} identified from your
          website
        </p>
      </div>

      <div className="space-y-3">
        {audiences.map((audience) => (
          <div
            key={audience.id}
            className={cn(
              'rounded-xl border transition-all',
              audience.isPrimary
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card hover:border-border/80'
            )}
          >
            {/* Audience Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() =>
                setExpandedAudience(expandedAudience === audience.id ? null : audience.id)
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      audience.isPrimary
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {audience.firmographics?.jobTitles?.length ? (
                      <Briefcase className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{audience.name}</span>
                      {audience.isPrimary && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{audience.confidence}% confidence</span>
                      {audience.firmographics?.jobTitles &&
                        audience.firmographics.jobTitles.length > 0 && (
                          <span className="text-muted-foreground/50">&#8226;</span>
                        )}
                      {audience.firmographics?.jobTitles?.slice(0, 2).map((title, i) => (
                        <span key={i} className="text-muted-foreground">
                          {title}
                          {i === 0 &&
                            audience.firmographics?.jobTitles &&
                            audience.firmographics.jobTitles.length > 1 &&
                            ','}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedAudience === audience.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedAudience === audience.id && (
              <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
                {/* Firmographics */}
                {audience.firmographics && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Firmographics
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {audience.firmographics.companySize?.map((size, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                        >
                          {size} employees
                        </span>
                      ))}
                      {audience.firmographics.industries?.map((ind, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                        >
                          {ind}
                        </span>
                      ))}
                      {audience.firmographics.decisionMakingRole && (
                        <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground capitalize">
                          {audience.firmographics.decisionMakingRole}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Pain Points */}
                {audience.psychographics?.painPoints &&
                  audience.psychographics.painPoints.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Pain Points
                      </h4>
                      <ul className="space-y-1">
                        {audience.psychographics.painPoints.map((pain, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-muted-foreground/50 mt-1">&#8226;</span>
                            {pain}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Goals */}
                {audience.psychographics?.goals && audience.psychographics.goals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Goals
                    </h4>
                    <ul className="space-y-1">
                      {audience.psychographics.goals.map((goal, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-muted-foreground/50 mt-1">&#8226;</span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Behavioral */}
                {audience.behavioral && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Behavioral
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {audience.behavioral.platforms?.map((platform, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                        >
                          {platform}
                        </span>
                      ))}
                      {audience.behavioral.buyingProcess && (
                        <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground capitalize">
                          {audience.behavioral.buyingProcess} purchase
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {!audience.isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSetPrimary(audience.id)
                      }}
                    >
                      Set as Primary
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove audience?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove &quot;{audience.name}&quot; from your target
                          audiences. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(audience.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
