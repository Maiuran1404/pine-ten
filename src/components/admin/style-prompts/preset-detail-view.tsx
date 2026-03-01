'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Trash2,
  Save,
  Sparkles,
  RotateCcw,
  Download,
  Copy,
  ImagePlus,
  X,
  Loader2,
  Expand,
} from 'lucide-react'
import { toast } from 'sonner'
import { DELIVERABLE_TYPES, STYLE_AXES } from '@/lib/constants/reference-libraries'
import { cn } from '@/lib/utils'
import { PresetCardImage } from './preset-card-image'
import type { DeliverableStyleReference, CardEditState, CardGenerationState } from './types'

interface PresetDetailViewProps {
  style: DeliverableStyleReference
  editState: CardEditState
  isDirty: boolean
  isSaving: boolean
  genState: CardGenerationState
  hasSubject: boolean
  onUpdateEdit: (updates: Partial<CardEditState>) => void
  onSave: () => void
  onDelete: () => void
  onGenerate: () => void
  onSaveAsReference: () => void
  onClearPreview: () => void
  onUploadReferenceImages: (files: File[]) => Promise<string[] | null>
  onDeleteReferenceImage: (imageUrl: string) => Promise<boolean>
}

export function PresetDetailView({
  style,
  editState,
  isDirty,
  isSaving,
  genState,
  hasSubject,
  onUpdateEdit,
  onSave,
  onDelete,
  onGenerate,
  onSaveAsReference,
  onClearPreview,
  onUploadReferenceImages,
  onDeleteReferenceImage,
}: PresetDetailViewProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [deleteConfirmUrl, setDeleteConfirmUrl] = useState<string | null>(null)
  const [fullscreenRefSrc, setFullscreenRefSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(editState.promptGuide)
    toast.success('Prompt guide copied')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)
    try {
      await onUploadReferenceImages(files)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteRefImage = async (imageUrl: string) => {
    setDeletingUrl(imageUrl)
    try {
      await onDeleteReferenceImage(imageUrl)
    } finally {
      setDeletingUrl(null)
    }
  }

  const referenceImages = style.styleReferenceImages ?? []
  const typeLabel =
    DELIVERABLE_TYPES.find((t) => t.value === style.deliverableType)?.label ?? style.deliverableType
  const axisLabel = STYLE_AXES.find((a) => a.value === style.styleAxis)?.label ?? style.styleAxis

  return (
    <div className="space-y-6 p-6">
      {/* Section 1: Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <Input
              value={editState.name}
              onChange={(e) => onUpdateEdit({ name: e.target.value })}
              className="text-lg font-semibold h-10"
              placeholder="Style name"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{typeLabel}</Badge>
              <Badge variant="outline">{axisLabel}</Badge>
              {style.colorSamples && style.colorSamples.length > 0 && (
                <div className="flex gap-1 items-center ml-1">
                  {style.colorSamples.slice(0, 8).map((color) => (
                    <div
                      key={color}
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Label htmlFor="active-switch" className="text-xs text-muted-foreground">
                {editState.isActive ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id="active-switch"
                checked={editState.isActive}
                onCheckedChange={(checked) => onUpdateEdit({ isActive: checked })}
              />
            </div>

            {isDirty && (
              <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Images — Reference + Preview side by side */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Images</Label>
        <div className="flex items-start gap-4">
          <PresetCardImage
            referenceUrl={style.imageUrl || null}
            previewBlobUrl={genState.previewBlobUrl}
            generationStatus={genState.status}
            error={genState.error}
            name={style.name}
          />

          {/* Generation controls */}
          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onGenerate}
              disabled={!hasSubject || genState.status === 'generating'}
            >
              {genState.status === 'error' ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {genState.status === 'generating'
                ? 'Generating...'
                : genState.status === 'error'
                  ? 'Retry'
                  : 'Generate'}
            </Button>

            {genState.status === 'success' && genState.previewBlobUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-ds-success hover:text-ds-success"
                  onClick={onSaveAsReference}
                >
                  <Download className="h-3.5 w-3.5" />
                  Save as Ref
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={onClearPreview}
                  title="Clear preview"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Reference Images Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Reference Images{referenceImages.length > 0 && ` (${referenceImages.length})`}
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImagePlus className="h-3 w-3" />
            )}
            {isUploading ? 'Uploading...' : 'Add Images'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        {referenceImages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {referenceImages.map((url) => (
              <div
                key={url}
                className="relative group h-20 w-20 rounded-lg border border-border overflow-hidden"
              >
                <img src={url} alt="Reference" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={() => setFullscreenRefSrc(url)}
                    className="p-1.5 rounded-md bg-background/80 hover:bg-background transition-colors"
                    title="View full size"
                  >
                    <Expand className="h-3.5 w-3.5 text-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmUrl(url)}
                    disabled={deletingUrl === url}
                    className="p-1.5 rounded-md bg-background/80 hover:bg-destructive/10 transition-colors"
                    title="Remove image"
                  >
                    {deletingUrl === url ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-xs text-muted-foreground">
              No reference images yet. Upload images to build a visual mood board for this style.
            </p>
          </div>
        )}
      </div>

      {/* Reference image fullscreen dialog */}
      <Dialog open={!!fullscreenRefSrc} onOpenChange={() => setFullscreenRefSrc(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Reference Image — Full Size</DialogTitle>
          {fullscreenRefSrc && (
            <img
              src={fullscreenRefSrc}
              alt="Reference full size"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete reference image confirmation */}
      <AlertDialog
        open={!!deleteConfirmUrl}
        onOpenChange={(open) => !open && setDeleteConfirmUrl(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Reference Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this reference image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteConfirmUrl && (
            <div className="flex justify-center py-2">
              <img
                src={deleteConfirmUrl}
                alt="Image to remove"
                className="h-32 w-32 rounded-md object-cover border border-border"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmUrl) {
                  handleDeleteRefImage(deleteConfirmUrl)
                  setDeleteConfirmUrl(null)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Section 4: Prompt Guide */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Prompt Guide
          </Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={handleCopyPrompt}
            title="Copy prompt"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>
        <Textarea
          value={editState.promptGuide}
          onChange={(e) => onUpdateEdit({ promptGuide: e.target.value })}
          rows={12}
          className="text-sm resize-y min-h-[200px] font-mono"
          placeholder="Enter the prompt guide..."
        />
      </div>

      {/* Section 5: Style Metadata */}
      {(style.colorTemperature ||
        style.energyLevel ||
        style.densityLevel ||
        style.formalityLevel ||
        (style.moodKeywords && style.moodKeywords.length > 0) ||
        (style.industries && style.industries.length > 0) ||
        (style.visualElements && style.visualElements.length > 0)) && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Style Metadata
          </Label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {style.colorTemperature && (
              <MetadataItem label="Color Temperature" value={style.colorTemperature} />
            )}
            {style.energyLevel && <MetadataItem label="Energy Level" value={style.energyLevel} />}
            {style.densityLevel && <MetadataItem label="Density" value={style.densityLevel} />}
            {style.formalityLevel && (
              <MetadataItem label="Formality" value={style.formalityLevel} />
            )}
          </div>
          {style.moodKeywords && style.moodKeywords.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Mood: </span>
              <span className="text-xs">{style.moodKeywords.join(', ')}</span>
            </div>
          )}
          {style.industries && style.industries.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Industries: </span>
              <span className="text-xs">{style.industries.join(', ')}</span>
            </div>
          )}
          {style.visualElements && style.visualElements.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Visual Elements: </span>
              <span className="text-xs">{style.visualElements.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('rounded-md bg-muted/50 px-3 py-2')}>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  )
}
