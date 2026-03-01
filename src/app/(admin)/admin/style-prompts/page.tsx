'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Plus, Trash2, Save, Eye, EyeOff, Sparkles } from 'lucide-react'
import {
  DELIVERABLE_TYPES,
  STYLE_AXES,
  type DeliverableType,
  type StyleAxis,
} from '@/lib/constants/reference-libraries'
import { useCsrfContext } from '@/providers/csrf-provider'
import { cn } from '@/lib/utils'

interface DeliverableStyleReference {
  id: string
  name: string
  description: string | null
  imageUrl: string
  deliverableType: DeliverableType
  styleAxis: StyleAxis
  subStyle: string | null
  semanticTags: string[]
  featuredOrder: number
  displayOrder: number
  isActive: boolean
  usageCount: number
  createdAt: string
  promptGuide?: string | null
  colorTemperature?: string
  energyLevel?: string
  densityLevel?: string
  formalityLevel?: string
  colorSamples?: string[]
  industries?: string[]
  targetAudience?: string
  visualElements?: string[]
  moodKeywords?: string[]
}

interface CardEditState {
  name: string
  promptGuide: string
  isActive: boolean
}

const defaultCreateForm = {
  name: '',
  description: '',
  imageUrl: '',
  deliverableType: 'instagram_post' as DeliverableType,
  styleAxis: 'minimal' as StyleAxis,
  promptGuide: '',
}

export default function StylePromptsPage() {
  const { csrfFetch } = useCsrfContext()
  const [styles, setStyles] = useState<DeliverableStyleReference[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [isCreating, setIsCreating] = useState(false)
  const [editStates, setEditStates] = useState<Record<string, CardEditState>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<DeliverableStyleReference | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Only show curated presets (styles with promptGuide)
  const presets = styles.filter((s) => s.promptGuide != null && s.promptGuide.trim() !== '')

  const filteredPresets =
    typeFilter === 'all' ? presets : presets.filter((s) => s.deliverableType === typeFilter)

  // Get deliverable types that have presets
  const typesWithPresets = new Set(presets.map((s) => s.deliverableType))

  useEffect(() => {
    fetchStyles()
  }, [])

  const fetchStyles = async () => {
    try {
      const response = await fetch('/api/admin/deliverable-styles')
      if (response.ok) {
        const result = await response.json()
        setStyles(result.data?.styles || [])
      }
    } catch (error) {
      console.error('Failed to fetch styles:', error)
      toast.error('Failed to load styles')
    } finally {
      setIsLoading(false)
    }
  }

  const getEditState = useCallback(
    (style: DeliverableStyleReference): CardEditState => {
      return (
        editStates[style.id] ?? {
          name: style.name,
          promptGuide: style.promptGuide || '',
          isActive: style.isActive,
        }
      )
    },
    [editStates]
  )

  const isDirty = useCallback(
    (style: DeliverableStyleReference): boolean => {
      const edit = editStates[style.id]
      if (!edit) return false
      return (
        edit.name !== style.name ||
        edit.promptGuide !== (style.promptGuide || '') ||
        edit.isActive !== style.isActive
      )
    },
    [editStates]
  )

  const updateEditState = (id: string, updates: Partial<CardEditState>) => {
    setEditStates((prev) => {
      const style = styles.find((s) => s.id === id)
      if (!style) return prev
      const current = prev[id] ?? {
        name: style.name,
        promptGuide: style.promptGuide || '',
        isActive: style.isActive,
      }
      return { ...prev, [id]: { ...current, ...updates } }
    })
  }

  const handleSaveCard = async (style: DeliverableStyleReference) => {
    const edit = editStates[style.id]
    if (!edit) return

    if (!edit.name.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setSavingIds((prev) => new Set(prev).add(style.id))
    try {
      const response = await csrfFetch(`/api/admin/deliverable-styles/${style.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: edit.name.trim(),
          promptGuide: edit.promptGuide.trim() || null,
          isActive: edit.isActive,
        }),
      })

      if (!response.ok) throw new Error('Failed to update')

      const result = await response.json()
      setStyles((prev) => prev.map((s) => (s.id === style.id ? result.data.style : s)))
      setEditStates((prev) => {
        const next = { ...prev }
        delete next[style.id]
        return next
      })
      toast.success('Style prompt saved')
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save changes')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(style.id)
        return next
      })
    }
  }

  const handleToggleActive = async (style: DeliverableStyleReference) => {
    updateEditState(style.id, { isActive: !getEditState(style).isActive })
  }

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.imageUrl.trim() || !createForm.promptGuide.trim()) {
      toast.error('Name, image URL, and prompt guide are required')
      return
    }

    setIsCreating(true)
    try {
      const response = await csrfFetch('/api/admin/deliverable-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          imageUrl: createForm.imageUrl.trim(),
          deliverableType: createForm.deliverableType,
          styleAxis: createForm.styleAxis,
          promptGuide: createForm.promptGuide.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to create')

      const result = await response.json()
      setStyles((prev) => [...prev, result.data.style])
      setDialogOpen(false)
      setCreateForm(defaultCreateForm)
      toast.success('New style preset created')
    } catch (error) {
      console.error('Failed to create:', error)
      toast.error('Failed to create preset')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (style: DeliverableStyleReference) => {
    setIsDeletingId(style.id)
    try {
      const response = await csrfFetch(`/api/admin/deliverable-styles/${style.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      setStyles((prev) => prev.filter((s) => s.id !== style.id))
      setEditStates((prev) => {
        const next = { ...prev }
        delete next[style.id]
        return next
      })
      toast.success('Style preset deleted')
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('Failed to delete preset')
    } finally {
      setIsDeletingId(null)
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visual Style Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage curated style presets and their AI prompt guides.{' '}
            <span className="text-foreground font-medium">{presets.length}</span> presets
            configured.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Preset
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({presets.length})</TabsTrigger>
          {DELIVERABLE_TYPES.filter((t) => typesWithPresets.has(t.value)).map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label} ({presets.filter((s) => s.deliverableType === type.value).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Preset Cards Grid */}
      {filteredPresets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              {typeFilter === 'all'
                ? 'No curated presets found. Create one to get started.'
                : `No presets for this deliverable type.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((style) => {
            const edit = getEditState(style)
            const dirty = isDirty(style)
            const isSaving = savingIds.has(style.id)

            return (
              <Card
                key={style.id}
                className={cn(
                  'relative transition-all',
                  !edit.isActive && 'opacity-60',
                  dirty && 'ring-2 ring-primary/50'
                )}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Image + Name Row */}
                  <div className="flex items-start gap-3">
                    {style.imageUrl ? (
                      <img
                        src={style.imageUrl}
                        alt={style.name}
                        className="h-16 w-16 rounded-md object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input
                        value={edit.name}
                        onChange={(e) => updateEditState(style.id, { name: e.target.value })}
                        className="h-8 text-sm font-semibold"
                        placeholder="Style name"
                      />
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {DELIVERABLE_TYPES.find((t) => t.value === style.deliverableType)
                            ?.label ?? style.deliverableType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {STYLE_AXES.find((a) => a.value === style.styleAxis)?.label ??
                            style.styleAxis}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Guide Textarea */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prompt Guide</Label>
                    <Textarea
                      value={edit.promptGuide}
                      onChange={(e) => updateEditState(style.id, { promptGuide: e.target.value })}
                      rows={5}
                      className="text-sm resize-y min-h-[100px]"
                      placeholder="Enter the prompt guide text that will be injected into the AI system prompt when this style is selected..."
                    />
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(style)}
                        className={cn(
                          'h-8 gap-1.5 text-xs',
                          edit.isActive
                            ? 'text-ds-success hover:text-ds-success'
                            : 'text-muted-foreground'
                        )}
                      >
                        {edit.isActive ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Inactive
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(style)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {dirty && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveCard(style)}
                        disabled={isSaving}
                        className="h-8 gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Style Preset</DialogTitle>
            <DialogDescription>
              Create a curated style with a prompt guide that will be injected into the AI when
              selected by customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Bold Corporate"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={createForm.imageUrl}
                onChange={(e) => setCreateForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deliverable Type</Label>
                <Select
                  value={createForm.deliverableType}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, deliverableType: v as DeliverableType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Style Axis</Label>
                <Select
                  value={createForm.styleAxis}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, styleAxis: v as StyleAxis }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_AXES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prompt Guide</Label>
              <Textarea
                value={createForm.promptGuide}
                onChange={(e) => setCreateForm((f) => ({ ...f, promptGuide: e.target.value }))}
                rows={6}
                placeholder="Enter the prompt guide text that will be injected into the AI system prompt when this style is selected by a customer..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Style Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isDeletingId === deleteTarget?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingId === deleteTarget?.id ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
