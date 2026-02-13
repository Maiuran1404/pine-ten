'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  type MoodboardItem,
  type DeliverableStyle,
  type UploadedFile,
} from '@/components/chat/types'

interface UseMoodboardOptions {
  initialItems?: MoodboardItem[]
  onItemsChange?: (items: MoodboardItem[]) => void
}

interface UseMoodboardReturn {
  items: MoodboardItem[]
  addItem: (item: Omit<MoodboardItem, 'id' | 'order' | 'addedAt'>) => MoodboardItem
  removeItem: (id: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  clearAll: () => void
  hasItem: (id: string) => boolean
  getItemCount: () => number
  addFromStyle: (style: DeliverableStyle) => MoodboardItem
  addFromUpload: (file: UploadedFile) => MoodboardItem
  addColor: (color: string, name?: string) => MoodboardItem
}

/**
 * Hook for managing moodboard state
 * Provides add, remove, reorder, and clear operations with animation support
 */
export function useMoodboard(options: UseMoodboardOptions = {}): UseMoodboardReturn {
  const { initialItems = [], onItemsChange } = options
  const [items, setItems] = useState<MoodboardItem[]>(initialItems)

  // Notify parent when items change
  useEffect(() => {
    onItemsChange?.(items)
  }, [items, onItemsChange])

  const generateId = useCallback(() => {
    return `moodboard_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }, [])

  const addItem = useCallback(
    (item: Omit<MoodboardItem, 'id' | 'order' | 'addedAt'>): MoodboardItem => {
      const newItem: MoodboardItem = {
        ...item,
        id: generateId(),
        order: items.length,
        addedAt: new Date(),
      }

      setItems((prev) => [...prev, newItem])
      return newItem
    },
    [items.length, generateId]
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id)
      // Reorder remaining items
      return filtered.map((item, index) => ({
        ...item,
        order: index,
      }))
    })
  }, [])

  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev]
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem)
      // Update order values
      return newItems.map((item, index) => ({
        ...item,
        order: index,
      }))
    })
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
  }, [])

  const hasItem = useCallback(
    (id: string) => {
      return items.some((item) => item.id === id || item.metadata?.styleId === id)
    },
    [items]
  )

  const getItemCount = useCallback(() => {
    return items.length
  }, [items])

  /**
   * Add a deliverable style to the moodboard
   */
  const addFromStyle = useCallback(
    (style: DeliverableStyle): MoodboardItem => {
      return addItem({
        type: 'style',
        imageUrl: style.imageUrl,
        name: style.name,
        metadata: {
          styleId: style.id,
          styleAxis: style.styleAxis,
          deliverableType: style.deliverableType,
        },
      })
    },
    [addItem]
  )

  /**
   * Add an uploaded file to the moodboard
   */
  const addFromUpload = useCallback(
    (file: UploadedFile): MoodboardItem => {
      return addItem({
        type: 'upload',
        imageUrl: file.fileUrl,
        name: file.fileName,
      })
    },
    [addItem]
  )

  /**
   * Add a color swatch to the moodboard
   */
  const addColor = useCallback(
    (color: string, name?: string): MoodboardItem => {
      return addItem({
        type: 'color',
        imageUrl: '', // Colors don't have images
        name: name || color,
        metadata: {
          colorSamples: [color],
        },
      })
    },
    [addItem]
  )

  return {
    items,
    addItem,
    removeItem,
    reorderItems,
    clearAll,
    hasItem,
    getItemCount,
    addFromStyle,
    addFromUpload,
    addColor,
  }
}

/**
 * Serialize moodboard items for storage
 */
export function serializeMoodboardItems(items: MoodboardItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      ...item,
      addedAt: item.addedAt.toISOString(),
    }))
  )
}

/**
 * Deserialize moodboard items from storage
 */
export function deserializeMoodboardItems(data: string): MoodboardItem[] {
  try {
    const parsed = JSON.parse(data)
    return parsed.map((item: MoodboardItem & { addedAt: string }) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    }))
  } catch {
    return []
  }
}
