'use client'

import { useEffect } from 'react'

interface UseStoryboardKeyboardOptions {
  enabled?: boolean
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

/**
 * Keyboard shortcuts for storyboard panel (#18)
 * - Cmd/Ctrl+Z: Undo
 * - Cmd/Ctrl+Shift+Z: Redo
 */
export function useStoryboardKeyboard({
  enabled = true,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: UseStoryboardKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Don't capture shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo && onRedo) onRedo()
      } else if (mod && e.key === 'z') {
        e.preventDefault()
        if (canUndo && onUndo) onUndo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onUndo, onRedo, canUndo, canRedo])
}
