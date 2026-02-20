'use client'

import { useState } from 'react'
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
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type TaskProposal, type MoodboardItem, getDeliveryDateString } from './types'

interface SubmitActionBarProps {
  taskProposal: TaskProposal
  moodboardItems: MoodboardItem[]
  userCredits: number
  isSubmitting: boolean
  onConfirm: () => Promise<void>
  onMakeChanges: () => void
  onInsufficientCredits: () => void
}

export function SubmitActionBar({
  taskProposal,
  moodboardItems,
  userCredits,
  isSubmitting,
  onConfirm,
  onMakeChanges,
  onInsufficientCredits,
}: SubmitActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const creditsRequired = taskProposal.creditsRequired ?? 15
  const deliveryDays = taskProposal.deliveryDays ?? 3
  const hasEnoughCredits = userCredits >= creditsRequired
  const deliveryDate = getDeliveryDateString(deliveryDays)
  const moodboardImages = moodboardItems.filter((item) => item.imageUrl).slice(0, 5)

  const handleSubmitClick = () => {
    if (!hasEnoughCredits) {
      onInsufficientCredits()
      return
    }
    setIsExpanded(true)
  }

  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleGoBack = () => {
    setIsExpanded(false)
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="shrink-0 mt-auto pt-4 pb-6 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full"
    >
      <motion.div
        layout
        className={cn(
          'border-2 rounded-2xl overflow-hidden shadow-lg transition-colors',
          'bg-white dark:bg-card',
          isExpanded
            ? 'border-emerald-500/40 shadow-emerald-500/10'
            : 'border-emerald-500/30 shadow-emerald-500/5'
        )}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Collapsed state */
            <motion.div
              key="collapsed"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                    disabled={isSubmitting}
                    className="gap-1.5 h-9"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Make Changes</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleSubmitClick}
                    disabled={isSubmitting}
                    className={cn(
                      'gap-2 rounded-xl px-6 sm:px-8 font-semibold h-11',
                      hasEnoughCredits
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    )}
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size="sm" />
                    ) : hasEnoughCredits ? (
                      <>
                        Submit Brief
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="p-5 sm:p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                    Ready to Submit
                  </span>
                </div>
                <button
                  onClick={handleGoBack}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <ChevronDown className="h-3 w-3 rotate-180" />
                  Collapse
                </button>
              </div>

              {/* Task title and description */}
              <h3 className="text-lg font-bold text-foreground mb-1">
                {taskProposal.title || 'Your Design Brief'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {taskProposal.description}
              </p>

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

              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                <div className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
                  <Coins className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                  <p className="text-base font-bold text-foreground">{creditsRequired}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
                  <Calendar className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                  <p className="text-base font-bold text-foreground">{deliveryDate}</p>
                  <p className="text-xs text-muted-foreground">delivery</p>
                </div>
                <div
                  className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center"
                  title="Includes 2 rounds of revisions with your designer"
                >
                  <RotateCcw className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                  <p className="text-base font-bold text-foreground">2</p>
                  <p className="text-xs text-muted-foreground">revisions included</p>
                </div>
              </div>

              {/* Credit balance */}
              {!hasEnoughCredits && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
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
                    className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
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
                  disabled={isSubmitting}
                  className="gap-1.5 text-muted-foreground"
                >
                  Go Back
                </Button>
                <Button
                  size="lg"
                  onClick={hasEnoughCredits ? handleConfirm : onInsufficientCredits}
                  disabled={isSubmitting}
                  className={cn(
                    'gap-2 rounded-xl px-8 font-semibold h-12 sm:h-14 text-base',
                    hasEnoughCredits
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
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
      </motion.div>
    </motion.div>
  )
}
