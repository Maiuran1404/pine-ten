'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Save, RefreshCw, MoreHorizontal, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandData } from '../_lib/brand-types'

interface BrandHeaderProps {
  brand: BrandData
  overallCompletion: number
  hasChanges: boolean
  isSaving: boolean
  isRescanning: boolean
  onSave: () => void
  onRescan: () => void
  onRedoOnboarding: () => void
}

function CompletenessRing({
  percentage,
  size = 40,
  strokeWidth = 3,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--crafted-green)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-foreground">{percentage}%</span>
    </div>
  )
}

export function BrandHeader({
  brand,
  overallCompletion,
  hasChanges,
  isSaving,
  isRescanning,
  onSave,
  onRescan,
  onRedoOnboarding,
}: BrandHeaderProps) {
  const [showRedoDialog, setShowRedoDialog] = useState(false)

  return (
    <div className="relative z-10 border-b border-border">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: brand identity cluster */}
          <div className="flex items-center gap-3 min-w-0">
            {brand.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={brand.logoUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-contain bg-muted border border-border flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${brand.primaryColor || 'var(--crafted-green)'}20`,
                }}
              >
                <span
                  className="text-base font-bold"
                  style={{ color: brand.primaryColor || 'var(--crafted-green)' }}
                >
                  {brand.name?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">
                {brand.name || 'My Brand'}
              </h1>
              {brand.tagline && (
                <p className="text-xs text-muted-foreground truncate">{brand.tagline}</p>
              )}
            </div>
          </div>

          {/* Right: ring + save + overflow */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block">
              <CompletenessRing percentage={overallCompletion} />
            </div>

            <Button
              onClick={onSave}
              disabled={isSaving}
              size="sm"
              className={cn(
                hasChanges &&
                  !isSaving &&
                  'ring-2 ring-primary/50 ring-offset-1 ring-offset-background'
              )}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                  {hasChanges && (
                    <span className="ml-1.5 w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {brand.website && (
                  <DropdownMenuItem onClick={onRescan} disabled={isRescanning}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', isRescanning && 'animate-spin')} />
                    {isRescanning ? 'Scanning...' : 'Rescan website'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowRedoDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Redo onboarding
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Controlled AlertDialog outside DropdownMenu to prevent unmount issues */}
      <AlertDialog open={showRedoDialog} onOpenChange={setShowRedoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Redo brand onboarding?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will reset your current brand settings and take you through the onboarding
              process again. Your existing brand data will be replaced with the new information you
              provide.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRedoOnboarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
