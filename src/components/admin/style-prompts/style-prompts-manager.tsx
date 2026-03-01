'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Sparkles } from 'lucide-react'
import { DELIVERABLE_TYPES } from '@/lib/constants/reference-libraries'
import { useCsrfContext } from '@/providers/csrf-provider'
import { SubjectBar } from './subject-bar'
import { PresetCard } from './preset-card'
import { CreatePresetDialog } from './create-preset-dialog'
import { useStyleGeneration } from './use-style-generation'
import type { DeliverableStyleReference, CardEditState, CreateFormState } from './types'
import { DEFAULT_CREATE_FORM } from './types'

export function StylePromptsManager() {
  const { csrfFetch } = useCsrfContext()

  // Data state
  const [styles, setStyles] = useState<DeliverableStyleReference[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  // Edit state
  const [editStates, setEditStates] = useState<Record<string, CardEditState>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(DEFAULT_CREATE_FORM)
  const [isCreating, setIsCreating] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<DeliverableStyleReference | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Subject + generation
  const [subject, setSubject] = useState('')
  const generation = useStyleGeneration()

  // Only show curated presets (styles with promptGuide)
  const presets = styles.filter((s) => s.promptGuide != null && s.promptGuide.trim() !== '')
  const filteredPresets =
    typeFilter === 'all' ? presets : presets.filter((s) => s.deliverableType === typeFilter)
  const typesWithPresets = new Set(presets.map((s) => s.deliverableType))

  // Fetch styles
  useEffect(() => {
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
    fetchStyles()
  }, [])

  // Edit helpers
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

  const updateEditState = useCallback(
    (id: string, updates: Partial<CardEditState>) => {
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
    },
    [styles]
  )

  // Save card edits
  const handleSaveCard = useCallback(
    async (style: DeliverableStyleReference) => {
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
    },
    [editStates, csrfFetch]
  )

  // Create preset
  const handleCreate = useCallback(async () => {
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
      setCreateForm(DEFAULT_CREATE_FORM)
      toast.success('New style preset created')
    } catch (error) {
      console.error('Failed to create:', error)
      toast.error('Failed to create preset')
    } finally {
      setIsCreating(false)
    }
  }, [createForm, csrfFetch])

  // Delete preset
  const handleDelete = useCallback(
    async (style: DeliverableStyleReference) => {
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
    },
    [csrfFetch]
  )

  // Save preview as reference → update local styles array
  const handleSaveAsReference = useCallback(
    async (styleId: string) => {
      const newUrl = await generation.saveAsReference(styleId)
      if (newUrl) {
        setStyles((prev) => prev.map((s) => (s.id === styleId ? { ...s, imageUrl: newUrl } : s)))
      }
    },
    [generation]
  )

  // Upload reference images for a style
  const handleUploadReferenceImages = useCallback(
    async (styleId: string, files: File[]): Promise<string[] | null> => {
      try {
        const formData = new FormData()
        files.forEach((file) => formData.append('files', file))

        const response = await csrfFetch(
          `/api/admin/deliverable-styles/${styleId}/reference-images`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        const updatedImages: string[] = result.data?.styleReferenceImages ?? []

        // Update local styles state
        setStyles((prev) =>
          prev.map((s) => (s.id === styleId ? { ...s, styleReferenceImages: updatedImages } : s))
        )

        toast.success(`${files.length} reference image${files.length > 1 ? 's' : ''} uploaded`)
        return updatedImages
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        toast.error(`Failed to upload: ${message}`)
        return null
      }
    },
    [csrfFetch]
  )

  // Delete a reference image from a style
  const handleDeleteReferenceImage = useCallback(
    async (styleId: string, imageUrl: string): Promise<boolean> => {
      try {
        const response = await csrfFetch(
          `/api/admin/deliverable-styles/${styleId}/reference-images`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        const updatedImages: string[] = result.data?.styleReferenceImages ?? []

        // Update local styles state
        setStyles((prev) =>
          prev.map((s) => (s.id === styleId ? { ...s, styleReferenceImages: updatedImages } : s))
        )

        toast.success('Reference image removed')
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed'
        toast.error(`Failed to delete: ${message}`)
        return false
      }
    },
    [csrfFetch]
  )

  // Generate All filtered presets
  const handleGenerateAll = useCallback(() => {
    generation.generateAll(filteredPresets, subject)
  }, [generation, filteredPresets, subject])

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
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
            Manage curated style presets, preview AI-generated images, and compare results.{' '}
            <span className="text-foreground font-medium">{presets.length}</span> presets
            configured.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Preset
        </Button>
      </div>

      {/* Subject Bar */}
      <SubjectBar
        subject={subject}
        onSubjectChange={setSubject}
        onGenerateAll={handleGenerateAll}
        onStop={generation.stopBatch}
        batch={generation.batch}
      />

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

      {/* Preset Grid */}
      {filteredPresets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              {typeFilter === 'all'
                ? 'No curated presets found. Create one to get started.'
                : 'No presets for this deliverable type.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
          {filteredPresets.map((style) => {
            const edit = getEditState(style)
            const dirty = isDirty(style)
            const isSaving = savingIds.has(style.id)
            const genState = generation.getCardState(style.id)

            return (
              <PresetCard
                key={style.id}
                style={style}
                editState={edit}
                isDirty={dirty}
                isSaving={isSaving}
                genState={genState}
                hasSubject={subject.trim().length >= 5}
                onUpdateEdit={(updates) => updateEditState(style.id, updates)}
                onSave={() => handleSaveCard(style)}
                onDelete={() => setDeleteTarget(style)}
                onGenerate={() => generation.generatePreview(style, subject)}
                onSaveAsReference={() => handleSaveAsReference(style.id)}
                onClearPreview={() => generation.clearPreview(style.id)}
                onUploadReferenceImages={(files) => handleUploadReferenceImages(style.id, files)}
                onDeleteReferenceImage={(url) => handleDeleteReferenceImage(style.id, url)}
              />
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreatePresetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={createForm}
        onFormChange={(updates) => setCreateForm((prev) => ({ ...prev, ...updates }))}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

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
