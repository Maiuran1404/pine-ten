'use client'

import { Button } from '@/components/ui/button'
import { Save, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandHeaderProps {
  hasWebsite: boolean
  hasChanges: boolean
  isSaving: boolean
  isRescanning: boolean
  onSave: () => void
  onRescan: () => void
}

export function BrandHeader({
  hasWebsite,
  hasChanges,
  isSaving,
  isRescanning,
  onSave,
  onRescan,
}: BrandHeaderProps) {
  return (
    <div className="relative z-10 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">My Brand</h1>
          <div className="flex gap-2">
            {hasWebsite && (
              <Button variant="outline" size="sm" onClick={onRescan} disabled={isRescanning}>
                {isRescanning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
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
          </div>
        </div>
      </div>
    </div>
  )
}
