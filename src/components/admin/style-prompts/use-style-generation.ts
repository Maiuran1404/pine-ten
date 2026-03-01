import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import type { CardGenerationState, BatchState, DeliverableStyleReference } from './types'

const BATCH_DELAY_MS = 500

export function useStyleGeneration() {
  const { csrfFetch } = useCsrfContext()
  const [cardStates, setCardStates] = useState<Record<string, CardGenerationState>>({})
  const [batch, setBatch] = useState<BatchState>({
    isRunning: false,
    completed: 0,
    total: 0,
  })
  const abortRef = useRef<AbortController | null>(null)

  const getCardState = useCallback(
    (id: string): CardGenerationState => {
      return (
        cardStates[id] ?? { status: 'idle', previewBlobUrl: null, previewBase64: null, error: null }
      )
    },
    [cardStates]
  )

  const updateCardState = useCallback((id: string, updates: Partial<CardGenerationState>) => {
    setCardStates((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { status: 'idle', previewBlobUrl: null, previewBase64: null, error: null }),
        ...updates,
      },
    }))
  }, [])

  const generatePreview = useCallback(
    async (
      style: DeliverableStyleReference,
      subject: string,
      signal?: AbortSignal
    ): Promise<boolean> => {
      if (!style.promptGuide) return false

      updateCardState(style.id, { status: 'generating', error: null })

      try {
        const response = await csrfFetch('/api/admin/style-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            promptGuide: style.promptGuide,
            styleName: style.name,
            styleId: style.id,
          }),
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        const base64 = result.data?.base64

        if (!base64) {
          throw new Error('No image data returned')
        }

        // Convert base64 to blob URL for display
        const byteCharacters = atob(base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/png' })
        const blobUrl = URL.createObjectURL(blob)

        // Revoke previous blob URL
        const prev = cardStates[style.id]?.previewBlobUrl
        if (prev) URL.revokeObjectURL(prev)

        updateCardState(style.id, {
          status: 'success',
          previewBlobUrl: blobUrl,
          previewBase64: base64,
          error: null,
        })
        return true
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          updateCardState(style.id, { status: 'idle', error: null })
          return false
        }
        const message = err instanceof Error ? err.message : 'Generation failed'
        updateCardState(style.id, { status: 'error', error: message })
        return false
      }
    },
    [csrfFetch, updateCardState, cardStates]
  )

  const generateAll = useCallback(
    async (presets: DeliverableStyleReference[], subject: string) => {
      if (batch.isRunning) return

      const eligible = presets.filter((p) => p.promptGuide)
      if (eligible.length === 0) {
        toast.error('No presets with prompt guides to generate')
        return
      }

      const controller = new AbortController()
      abortRef.current = controller

      setBatch({ isRunning: true, completed: 0, total: eligible.length })

      let completed = 0
      for (const preset of eligible) {
        if (controller.signal.aborted) break

        await generatePreview(preset, subject, controller.signal)
        completed++
        setBatch((prev) => ({ ...prev, completed }))

        // Breathing room between calls
        if (!controller.signal.aborted && completed < eligible.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
        }
      }

      setBatch((prev) => ({ ...prev, isRunning: false }))
      abortRef.current = null

      if (!controller.signal.aborted) {
        toast.success(`Generated ${completed}/${eligible.length} previews`)
      }
    },
    [batch.isRunning, generatePreview]
  )

  const stopBatch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      setBatch((prev) => ({ ...prev, isRunning: false }))
      toast.info('Batch generation stopped')
    }
  }, [])

  const saveAsReference = useCallback(
    async (styleId: string): Promise<string | null> => {
      const state = cardStates[styleId]
      if (!state?.previewBase64) {
        toast.error('No preview image to save')
        return null
      }

      try {
        const response = await csrfFetch('/api/admin/style-preview/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ styleId, base64: state.previewBase64 }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        toast.success('Preview saved as reference image')
        return result.data?.imageUrl ?? null
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed'
        toast.error(`Failed to save: ${message}`)
        return null
      }
    },
    [cardStates, csrfFetch]
  )

  const clearPreview = useCallback(
    (id: string) => {
      const prev = cardStates[id]?.previewBlobUrl
      if (prev) URL.revokeObjectURL(prev)
      updateCardState(id, {
        status: 'idle',
        previewBlobUrl: null,
        previewBase64: null,
        error: null,
      })
    },
    [cardStates, updateCardState]
  )

  return {
    cardStates,
    getCardState,
    batch,
    generatePreview,
    generateAll,
    stopBatch,
    saveAsReference,
    clearPreview,
  }
}
