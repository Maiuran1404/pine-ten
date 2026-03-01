'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sparkles, Square, ChevronDown, Bookmark, X } from 'lucide-react'
import type { BatchState } from './types'

const STORAGE_KEY = 'style-preview-subjects'
const MAX_SAVED = 20

interface SubjectBarProps {
  subject: string
  onSubjectChange: (value: string) => void
  onGenerateAll: () => void
  onStop: () => void
  batch: BatchState
  disabled?: boolean
}

export function SubjectBar({
  subject,
  onSubjectChange,
  onGenerateAll,
  onStop,
  batch,
  disabled,
}: SubjectBarProps) {
  const [savedSubjects, setSavedSubjects] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [popoverOpen, setPopoverOpen] = useState(false)

  const saveSubject = useCallback(() => {
    if (!subject.trim()) return
    const trimmed = subject.trim()
    setSavedSubjects((prev) => {
      const filtered = prev.filter((s) => s !== trimmed)
      const next = [trimmed, ...filtered].slice(0, MAX_SAVED)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [subject])

  const removeSavedSubject = useCallback((toRemove: string) => {
    setSavedSubjects((prev) => {
      const next = prev.filter((s) => s !== toRemove)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const progressPercent = batch.total > 0 ? (batch.completed / batch.total) * 100 : 0
  const canGenerate = subject.trim().length >= 5 && !batch.isRunning && !disabled

  return (
    <div className="sticky top-0 z-10 bg-card border border-border rounded-lg p-4 space-y-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Describe an image subject to preview across all styles..."
            className="text-base h-11 pr-10"
            disabled={batch.isRunning}
          />
          {subject.trim() && !batch.isRunning && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={saveSubject}
              title="Save subject"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
        </div>

        {savedSubjects.length > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 gap-1.5 shrink-0">
                <ChevronDown className="h-4 w-4" />
                Saved
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {savedSubjects.map((s) => (
                  <div key={s} className="flex items-center gap-2 group">
                    <button
                      className="flex-1 text-left text-sm px-2 py-1.5 rounded hover:bg-accent truncate"
                      onClick={() => {
                        onSubjectChange(s)
                        setPopoverOpen(false)
                      }}
                    >
                      {s}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => removeSavedSubject(s)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {batch.isRunning ? (
          <Button
            variant="destructive"
            size="sm"
            className="h-11 gap-1.5 shrink-0"
            onClick={onStop}
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-11 gap-1.5 shrink-0"
            onClick={onGenerateAll}
            disabled={!canGenerate}
          >
            <Sparkles className="h-4 w-4" />
            Generate All
          </Button>
        )}
      </div>

      {batch.isRunning && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Generating {batch.completed}/{batch.total}...
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}
    </div>
  )
}
