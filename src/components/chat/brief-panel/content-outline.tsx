'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  FileText,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type {
  ContentOutline,
  OutlineItem,
  WeekGroup,
  TaskType,
  Platform,
  ContentType,
} from './types'
import { PLATFORM_DISPLAY_NAMES } from './types'

// =============================================================================
// OUTLINE ITEM COMPONENT
// =============================================================================

interface OutlineItemRowProps {
  item: OutlineItem
  onUpdate: (item: OutlineItem) => void
  onDelete: () => void
  isDragging?: boolean
}

function OutlineItemRow({ item, onUpdate, onDelete, isDragging }: OutlineItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description)

  const handleSave = () => {
    onUpdate({
      ...item,
      title: editTitle,
      description: editDescription,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(item.title)
    setEditDescription(item.description)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <motion.div layout className="bg-muted/50 rounded-lg p-3 space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title..."
          className="h-8 text-sm font-medium"
          autoFocus
        />
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description..."
          className="min-h-[60px] text-sm resize-none"
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all cursor-pointer',
        isDragging && 'opacity-50'
      )}
      onClick={() => setIsEditing(true)}
    >
      {/* Number Badge */}
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
        {item.number}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{item.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        {/* Metadata badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {item.scheduledDate && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1">
              <Calendar className="h-2.5 w-2.5" />
              Day {item.day}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] h-5">
            {item.contentType}
          </Badge>
        </div>
      </div>

      {/* Actions (visible on hover) */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  )
}

// =============================================================================
// WEEK GROUP COMPONENT
// =============================================================================

interface WeekGroupSectionProps {
  group: WeekGroup
  onToggle: () => void
  onUpdateItem: (itemId: string, item: OutlineItem) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: () => void
}

function WeekGroupSection({
  group,
  onToggle,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: WeekGroupSectionProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Week Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {group.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{group.label}</span>
          <Badge variant="secondary" className="text-xs">
            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>
      </button>

      {/* Week Content */}
      <AnimatePresence initial={false}>
        {group.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {group.items.map((item) => (
                <OutlineItemRow
                  key={item.id}
                  item={item}
                  onUpdate={(updatedItem) => onUpdateItem(item.id, updatedItem)}
                  onDelete={() => onDeleteItem(item.id)}
                />
              ))}

              {/* Add Item Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={onAddItem}
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add item to {group.label.toLowerCase()}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// SINGLE ASSET OUTLINE
// =============================================================================

interface SingleAssetOutlineProps {
  outline: ContentOutline | null
  onOutlineUpdate: (outline: ContentOutline) => void
}

function SingleAssetOutline({ outline, onOutlineUpdate }: SingleAssetOutlineProps) {
  if (!outline || outline.weekGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Content outline will appear here once generated
        </p>
      </div>
    )
  }

  // For single asset, just show the items directly without week grouping
  const allItems = outline.weekGroups.flatMap((g) => g.items)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{outline.title}</h4>
        <Badge variant="secondary" className="text-xs">
          {allItems.length} {allItems.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>
      {outline.subtitle && <p className="text-xs text-muted-foreground">{outline.subtitle}</p>}
      <div className="space-y-2">
        {allItems.map((item, idx) => (
          <OutlineItemRow
            key={item.id}
            item={item}
            onUpdate={(updatedItem) => {
              const newGroups = outline.weekGroups.map((g) => ({
                ...g,
                items: g.items.map((i) => (i.id === item.id ? updatedItem : i)),
              }))
              onOutlineUpdate({ ...outline, weekGroups: newGroups })
            }}
            onDelete={() => {
              const newGroups = outline.weekGroups.map((g) => ({
                ...g,
                items: g.items.filter((i) => i.id !== item.id),
              }))
              onOutlineUpdate({
                ...outline,
                weekGroups: newGroups,
                totalItems: outline.totalItems - 1,
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN CONTENT OUTLINE PANEL
// =============================================================================

interface ContentOutlinePanelProps {
  outline: ContentOutline | null
  taskType: TaskType | null
  onOutlineUpdate: (outline: ContentOutline | null) => void
}

export function ContentOutlinePanel({
  outline,
  taskType,
  onOutlineUpdate,
}: ContentOutlinePanelProps) {
  // Toggle week group expansion
  const handleToggleWeek = useCallback(
    (weekNumber: number) => {
      if (!outline) return
      const newGroups = outline.weekGroups.map((g) =>
        g.weekNumber === weekNumber ? { ...g, isExpanded: !g.isExpanded } : g
      )
      onOutlineUpdate({ ...outline, weekGroups: newGroups })
    },
    [outline, onOutlineUpdate]
  )

  // Update an item
  const handleUpdateItem = useCallback(
    (weekNumber: number, itemId: string, updatedItem: OutlineItem) => {
      if (!outline) return
      const newGroups = outline.weekGroups.map((g) =>
        g.weekNumber === weekNumber
          ? {
              ...g,
              items: g.items.map((i) => (i.id === itemId ? updatedItem : i)),
            }
          : g
      )
      onOutlineUpdate({ ...outline, weekGroups: newGroups })
    },
    [outline, onOutlineUpdate]
  )

  // Delete an item
  const handleDeleteItem = useCallback(
    (weekNumber: number, itemId: string) => {
      if (!outline) return
      const newGroups = outline.weekGroups.map((g) =>
        g.weekNumber === weekNumber ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g
      )
      onOutlineUpdate({
        ...outline,
        weekGroups: newGroups,
        totalItems: outline.totalItems - 1,
      })
    },
    [outline, onOutlineUpdate]
  )

  // Add an item to a week
  const handleAddItem = useCallback(
    (weekNumber: number) => {
      if (!outline) return
      const group = outline.weekGroups.find((g) => g.weekNumber === weekNumber)
      if (!group) return

      const newItem: OutlineItem = {
        id: `item-${Date.now()}`,
        number: outline.totalItems + 1,
        title: 'New Item',
        description: 'Add description...',
        platform: 'instagram',
        contentType: 'post',
        dimensions: { width: 1080, height: 1080, label: 'Square', aspectRatio: '1:1' },
        week: weekNumber,
        day: (weekNumber - 1) * 7 + group.items.length + 1,
        status: 'draft',
      }

      const newGroups = outline.weekGroups.map((g) =>
        g.weekNumber === weekNumber ? { ...g, items: [...g.items, newItem] } : g
      )

      onOutlineUpdate({
        ...outline,
        weekGroups: newGroups,
        totalItems: outline.totalItems + 1,
      })
    },
    [outline, onOutlineUpdate]
  )

  // Empty state
  if (!outline || outline.weekGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-1">
          {taskType === 'multi_asset_plan'
            ? 'Content outline will be generated'
            : 'No outline needed for single assets'}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {taskType === 'multi_asset_plan'
            ? 'Continue the conversation to build your content plan'
            : "Single assets don't require an outline"}
        </p>
      </div>
    )
  }

  // Single asset view
  if (taskType === 'single_asset') {
    return <SingleAssetOutline outline={outline} onOutlineUpdate={onOutlineUpdate} />
  }

  // Multi-asset plan with week grouping
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold">{outline.title}</h4>
        {outline.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{outline.subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {outline.totalItems} total items
          </Badge>
          <Badge variant="outline" className="text-xs">
            {outline.weekGroups.length} weeks
          </Badge>
        </div>
      </div>

      {/* Week Groups */}
      <div className="space-y-3">
        {outline.weekGroups.map((group) => (
          <WeekGroupSection
            key={group.weekNumber}
            group={group}
            onToggle={() => handleToggleWeek(group.weekNumber)}
            onUpdateItem={(itemId, item) => handleUpdateItem(group.weekNumber, itemId, item)}
            onDeleteItem={(itemId) => handleDeleteItem(group.weekNumber, itemId)}
            onAddItem={() => handleAddItem(group.weekNumber)}
          />
        ))}
      </div>

      {/* Add Week Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const newWeekNumber = outline.weekGroups.length + 1
          onOutlineUpdate({
            ...outline,
            weekGroups: [
              ...outline.weekGroups,
              {
                weekNumber: newWeekNumber,
                label: `Week ${newWeekNumber}`,
                items: [],
                isExpanded: true,
              },
            ],
          })
        }}
      >
        <Plus className="h-3.5 w-3.5 mr-2" />
        Add Week
      </Button>
    </div>
  )
}

// =============================================================================
// HELPER: Generate outline from AI response
// =============================================================================

export function generateOutlineFromItems(
  items: Array<{ title: string; description: string }>,
  platform: Platform = 'instagram',
  contentType: ContentType = 'post',
  durationDays: number = 30
): ContentOutline {
  const weeksCount = Math.ceil(durationDays / 7)
  const itemsPerWeek = Math.ceil(items.length / weeksCount)

  const weekGroups: WeekGroup[] = []

  for (let week = 1; week <= weeksCount; week++) {
    const startIdx = (week - 1) * itemsPerWeek
    const weekItems = items.slice(startIdx, startIdx + itemsPerWeek)

    const outlineItems: OutlineItem[] = weekItems.map((item, idx) => ({
      id: `item-${week}-${idx}`,
      number: startIdx + idx + 1,
      title: item.title,
      description: item.description,
      platform,
      contentType,
      dimensions: { width: 1080, height: 1080, label: 'Square', aspectRatio: '1:1' },
      week,
      day: (week - 1) * 7 + idx + 1,
      status: 'draft' as const,
    }))

    weekGroups.push({
      weekNumber: week,
      label: `Week ${week}`,
      items: outlineItems,
      isExpanded: week === 1, // Only first week expanded by default
    })
  }

  return {
    title: `${durationDays}-Day Content Plan`,
    subtitle: `${items.length} pieces of content across ${weeksCount} weeks`,
    totalItems: items.length,
    weekGroups,
  }
}

export default ContentOutlinePanel
