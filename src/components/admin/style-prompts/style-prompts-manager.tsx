'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
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
import { Plus, Search, LayoutGrid } from 'lucide-react'
import { DELIVERABLE_TYPES } from '@/lib/constants/reference-libraries'
import { useCsrfContext } from '@/providers/csrf-provider'
import { SubjectBar } from './subject-bar'
import { PresetListTable } from './preset-list-table'
import { PresetDetailView } from './preset-detail-view'
import { PresetEmptyState } from './preset-empty-state'
import { GenerationGallery } from './generation-gallery'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
  const [showGallery, setShowGallery] = useState(false)
  const generation = useStyleGeneration()

  // Only show curated presets (styles with promptGuide)
  const presets = styles.filter((s) => s.promptGuide != null && s.promptGuide.trim() !== '')
  const filteredPresets =
    typeFilter === 'all' ? presets : presets.filter((s) => s.deliverableType === typeFilter)
  const typesWithPresets = new Set(presets.map((s) => s.deliverableType))

  // Search-filtered presets for the list
  const searchFilteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return filteredPresets
    const q = searchQuery.toLowerCase()
    return filteredPresets.filter((s) => s.name.toLowerCase().includes(q))
  }, [filteredPresets, searchQuery])

  // Resolve selected preset
  const selectedPreset = presets.find((s) => s.id === selectedId) ?? null

  // Clear selection if selected preset is filtered out
  useEffect(() => {
    if (selectedId && !searchFilteredPresets.some((s) => s.id === selectedId)) {
      // Don't clear if the preset exists but just doesn't match search/filter
      // Only clear if it was truly deleted
      if (!presets.some((s) => s.id === selectedId)) {
        setSelectedId(null)
      }
    }
  }, [selectedId, searchFilteredPresets, presets])

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
      const newStyle = result.data.style
      setStyles((prev) => [...prev, newStyle])
      setSelectedId(newStyle.id)
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
        if (selectedId === style.id) {
          setSelectedId(null)
        }
        toast.success('Style preset deleted')
      } catch (error) {
        console.error('Failed to delete:', error)
        toast.error('Failed to delete preset')
      } finally {
        setIsDeletingId(null)
        setDeleteTarget(null)
      }
    },
    [csrfFetch, selectedId]
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
    setShowGallery(true)
    generation.generateAll(filteredPresets, subject)
  }, [generation, filteredPresets, subject])

  // Count how many presets have generation results (success, error, or generating)
  const generatedCount = useMemo(() => {
    return filteredPresets.filter((p) => {
      const state = generation.getCardState(p.id)
      return state.status !== 'idle'
    }).length
  }, [filteredPresets, generation])

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-[calc(100%-4rem)] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Top bar: title + create button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visual Style Prompts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="text-foreground font-medium">{presets.length}</span> presets configured
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Preset
        </Button>
      </div>

      {/* Master-detail split */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Left Panel: List */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search presets..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Filter tabs */}
            <div className="px-3 py-2 border-b border-border shrink-0">
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList className="flex-wrap h-auto gap-0.5 w-full justify-start">
                  <TabsTrigger value="all" className="text-xs px-2 py-1 h-7">
                    All ({presets.length})
                  </TabsTrigger>
                  {DELIVERABLE_TYPES.filter((t) => typesWithPresets.has(t.value)).map((type) => (
                    <TabsTrigger
                      key={type.value}
                      value={type.value}
                      className="text-xs px-2 py-1 h-7"
                    >
                      {type.label} ({presets.filter((s) => s.deliverableType === type.value).length}
                      )
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Scrollable preset list */}
            <ScrollArea className="flex-1">
              <PresetListTable
                presets={searchFilteredPresets}
                selectedId={selectedId}
                onSelect={setSelectedId}
                editStates={editStates}
                generationStates={generation.cardStates}
              />
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Detail */}
        <ResizablePanel defaultSize={65} minSize={50} maxSize={75}>
          {showGallery ? (
            <ScrollArea className="h-full">
              <div className="p-3 border-b border-border">
                <SubjectBar
                  subject={subject}
                  onSubjectChange={setSubject}
                  onGenerateAll={handleGenerateAll}
                  onStop={generation.stopBatch}
                  batch={generation.batch}
                />
              </div>
              <GenerationGallery
                presets={filteredPresets}
                subject={subject}
                cardStates={generation.cardStates}
                getCardState={generation.getCardState}
                onClose={() => setShowGallery(false)}
                onViewDetails={(id) => {
                  setSelectedId(id)
                  setShowGallery(false)
                }}
                onSaveAsReference={handleSaveAsReference}
              />
            </ScrollArea>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-border shrink-0">
                <SubjectBar
                  subject={subject}
                  onSubjectChange={setSubject}
                  onGenerateAll={handleGenerateAll}
                  onStop={generation.stopBatch}
                  batch={generation.batch}
                />
                {generatedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-1.5 text-xs"
                    onClick={() => setShowGallery(true)}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    View Gallery ({generatedCount} images)
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                {selectedPreset ? (
                  <PresetDetailView
                    key={selectedPreset.id}
                    style={selectedPreset}
                    editState={getEditState(selectedPreset)}
                    isDirty={isDirty(selectedPreset)}
                    isSaving={savingIds.has(selectedPreset.id)}
                    genState={generation.getCardState(selectedPreset.id)}
                    hasSubject={subject.trim().length >= 5}
                    onUpdateEdit={(updates) => updateEditState(selectedPreset.id, updates)}
                    onSave={() => handleSaveCard(selectedPreset)}
                    onDelete={() => setDeleteTarget(selectedPreset)}
                    onGenerate={() => generation.generatePreview(selectedPreset, subject)}
                    onSaveAsReference={() => handleSaveAsReference(selectedPreset.id)}
                    onClearPreview={() => generation.clearPreview(selectedPreset.id)}
                    onUploadReferenceImages={(files) =>
                      handleUploadReferenceImages(selectedPreset.id, files)
                    }
                    onDeleteReferenceImage={(url) =>
                      handleDeleteReferenceImage(selectedPreset.id, url)
                    }
                  />
                ) : (
                  <PresetEmptyState />
                )}
              </ScrollArea>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

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
