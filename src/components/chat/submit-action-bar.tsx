'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading'
import {
  ArrowRight,
  Coins,
  Calendar,
  RotateCcw,
  Pencil,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  FileText,
  Users,
  Target,
  Monitor,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type TaskProposal, type MoodboardItem, getDeliveryDateString } from './types'
import type { LiveBrief } from './brief-panel/types'
import { INTENT_DESCRIPTIONS, PLATFORM_DISPLAY_NAMES } from './brief-panel/types'

interface SubmitActionBarProps {
  taskProposal: TaskProposal
  moodboardItems: MoodboardItem[]
  userCredits: number
  isSubmitting: boolean
  brief?: LiveBrief | null
  onConfirm: () => Promise<void>
  onMakeChanges: () => void
  onInsufficientCredits: () => void
}

export function SubmitActionBar({
  taskProposal,
  moodboardItems,
  userCredits,
  isSubmitting,
  brief,
  onConfirm,
  onMakeChanges,
  onInsufficientCredits,
}: SubmitActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isBriefReviewOpen, setIsBriefReviewOpen] = useState(false)
  // Animation lock: prevents clicks during expand/collapse transitions
  const [isAnimating, setIsAnimating] = useState(false)

  const creditsRequired = taskProposal.creditsRequired ?? 15
  const deliveryDays = taskProposal.deliveryDays ?? 3
  const hasEnoughCredits = userCredits >= creditsRequired
  const deliveryDate = getDeliveryDateString(deliveryDays)
  const moodboardImages = moodboardItems.filter((item) => item.imageUrl).slice(0, 5)

  const handleSubmitClick = useCallback(() => {
    if (isAnimating || isSubmitting) return
    if (!hasEnoughCredits) {
      onInsufficientCredits()
      return
    }
    setIsAnimating(true)
    setIsExpanded(true)
  }, [isAnimating, isSubmitting, hasEnoughCredits, onInsufficientCredits])

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return
    try {
      await onConfirm()
    } catch {
      // Error already handled by useTaskSubmission (shows toast)
      // No re-throw — keeps the UI stable
    }
  }, [isSubmitting, onConfirm])

  const handleGoBack = useCallback(() => {
    if (isAnimating || isSubmitting) return
    setIsAnimating(true)
    // Close brief review before collapsing to prevent nested animation conflicts
    setIsBriefReviewOpen(false)
    setIsExpanded(false)
  }, [isAnimating, isSubmitting])

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false)
  }, [])

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="shrink-0 mt-auto pt-4 pb-6 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full"
    >
      <div
        className={cn(
          'border-2 rounded-2xl overflow-hidden shadow-lg transition-colors duration-200',
          'bg-white dark:bg-card',
          isExpanded
            ? 'border-crafted-green/40 shadow-crafted-green/10'
            : 'border-crafted-green/30 shadow-crafted-green/5'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            /* Collapsed state */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onAnimationComplete={handleAnimationComplete}
              className="p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Task title and meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {taskProposal.title || 'Your Design Brief'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {creditsRequired} credits
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Delivery by {deliveryDate}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onMakeChanges}
                    disabled={isSubmitting || isAnimating}
                    className="gap-1.5 h-9"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Make Changes</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleSubmitClick}
                    disabled={isSubmitting || isAnimating}
                    className={cn(
                      'gap-2 rounded-xl px-6 sm:px-8 font-semibold h-11',
                      hasEnoughCredits
                        ? 'bg-crafted-green hover:bg-crafted-forest text-white shadow-md shadow-crafted-green/20'
                        : 'bg-ds-warning hover:bg-ds-warning/80 text-white'
                    )}
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size="sm" />
                    ) : hasEnoughCredits ? (
                      <>
                        Submit Brief ({creditsRequired} credits)
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        Get Credits to Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Expanded state */
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onAnimationComplete={handleAnimationComplete}
              className="p-5 sm:p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-crafted-green animate-pulse" />
                  <span className="text-xs font-semibold tracking-wider text-crafted-green uppercase">
                    Ready to Submit
                  </span>
                </div>
                <button
                  onClick={handleGoBack}
                  disabled={isAnimating || isSubmitting}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <ChevronDown className="h-3 w-3 rotate-180" />
                  Collapse
                </button>
              </div>

              {/* Task title and description */}
              <h3 className="text-lg font-bold text-foreground mb-1">
                {taskProposal.title || 'Your Design Brief'}
              </h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {taskProposal.description}
              </p>

              {/* Brief review section */}
              {brief && (
                <BriefReviewSection
                  brief={brief}
                  isOpen={isBriefReviewOpen}
                  onToggle={() => setIsBriefReviewOpen((v) => !v)}
                />
              )}

              {/* Moodboard thumbnails */}
              {moodboardImages.length > 0 && (
                <div className="mb-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {moodboardImages.map((item) => (
                      <div
                        key={item.id}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-border/50 shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What happens next */}
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-medium text-foreground mb-1.5">After submission</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Upload brand assets, logos, and product screenshots</li>
                  <li>A matched designer starts working on your brief</li>
                  <li>First draft delivered by {deliveryDate}</li>
                </ul>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                <div className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
                  <Coins className="h-4 w-4 mx-auto mb-1 text-crafted-green" />
                  <p className="text-base font-bold text-foreground">{creditsRequired}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
                  <Calendar className="h-4 w-4 mx-auto mb-1 text-ds-info" />
                  <p className="text-base font-bold text-foreground">{deliveryDate}</p>
                  <p className="text-xs text-muted-foreground">delivery</p>
                </div>
                <div
                  className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center"
                  title="Includes 2 rounds of revisions with your designer"
                >
                  <RotateCcw className="h-4 w-4 mx-auto mb-1 text-ds-role-transition" />
                  <p className="text-base font-bold text-foreground">2</p>
                  <p className="text-xs text-muted-foreground">revisions included</p>
                </div>
              </div>

              {/* Credit balance */}
              {!hasEnoughCredits && (
                <div className="mb-4 p-3 rounded-lg bg-ds-warning/10 border border-ds-warning/30">
                  <p className="text-sm text-ds-warning">
                    <span className="font-medium">Insufficient credits.</span> You need{' '}
                    {creditsRequired - userCredits} more credits ({creditsRequired} required,{' '}
                    {userCredits} available).
                  </p>
                </div>
              )}

              {hasEnoughCredits && (
                <div className="mb-4 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-crafted-green border-crafted-green/20 bg-crafted-green/10 dark:bg-crafted-green/10"
                  >
                    {userCredits} credits available
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({userCredits - creditsRequired} remaining after)
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={handleGoBack}
                  disabled={isSubmitting || isAnimating}
                  className="gap-1.5 text-muted-foreground"
                >
                  Go Back
                </Button>
                <Button
                  size="lg"
                  onClick={hasEnoughCredits ? handleConfirm : onInsufficientCredits}
                  disabled={isSubmitting || isAnimating}
                  className={cn(
                    'gap-2 rounded-xl px-8 font-semibold h-12 sm:h-14 text-base',
                    hasEnoughCredits
                      ? 'bg-crafted-green hover:bg-crafted-forest text-white shadow-lg shadow-crafted-green/25'
                      : 'bg-ds-warning hover:bg-ds-warning/90 text-white'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Submitting...
                    </>
                  ) : hasEnoughCredits ? (
                    <>
                      Confirm & Submit
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Get Credits to Submit
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// =============================================================================
// BRIEF REVIEW SECTION
// =============================================================================

function BriefReviewSection({
  brief,
  isOpen,
  onToggle,
}: {
  brief: LiveBrief
  isOpen: boolean
  onToggle: () => void
}) {
  const intentValue = brief.intent.value ? INTENT_DESCRIPTIONS[brief.intent.value] : null
  const platformValue = brief.platform.value ? PLATFORM_DISPLAY_NAMES[brief.platform.value] : null
  const audienceName = brief.audience.value?.name || null
  const audienceDemographics = brief.audience.value?.demographics || null
  const topicValue = brief.topic.value || null
  const styleCount = brief.visualDirection?.selectedStyles.length ?? 0
  const dimensionCount = brief.dimensions.length

  const fields = [
    { icon: FileText, label: 'Topic', value: topicValue },
    { icon: Target, label: 'Goal', value: intentValue },
    { icon: Monitor, label: 'Platform', value: platformValue },
    {
      icon: Users,
      label: 'Audience',
      value: audienceName
        ? audienceDemographics
          ? `${audienceName} — ${audienceDemographics}`
          : audienceName
        : null,
    },
    {
      icon: Palette,
      label: 'Visual direction',
      value: styleCount > 0 ? `${styleCount} style${styleCount > 1 ? 's' : ''} selected` : null,
    },
  ].filter((f) => f.value)

  if (fields.length === 0) return null

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ChevronRight
          className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-90')}
        />
        Review brief details
        {dimensionCount > 0 && (
          <span className="text-[10px] text-muted-foreground/60">
            ({dimensionCount} size{dimensionCount > 1 ? 's' : ''})
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              {fields.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                    <p className="text-xs text-foreground leading-snug line-clamp-2">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
