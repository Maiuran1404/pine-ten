'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Eye,
  EyeOff,
  Trash2,
  Save,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
  Copy,
  ImagePlus,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { DELIVERABLE_TYPES, STYLE_AXES } from '@/lib/constants/reference-libraries'
import { cn } from '@/lib/utils'
import { PresetCardImage } from './preset-card-image'
import type { DeliverableStyleReference, CardEditState, CardGenerationState } from './types'

interface PresetCardProps {
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

export function PresetCard({
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
}: PresetCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const truncatedPrompt =
    editState.promptGuide.length > 200
      ? editState.promptGuide.slice(0, 200) + '...'
      : editState.promptGuide

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

  return (
    <Card
      className={cn(
        'relative transition-all',
        !editState.isActive && 'opacity-60',
        isDirty && 'ring-2 ring-primary/50'
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top Row: Images + Name + Badges */}
        <div className="flex items-start gap-3">
          <PresetCardImage
            referenceUrl={style.imageUrl || null}
            previewBlobUrl={genState.previewBlobUrl}
            generationStatus={genState.status}
            error={genState.error}
            name={style.name}
          />

          <div className="flex-1 min-w-0 space-y-2">
            <Input
              value={editState.name}
              onChange={(e) => onUpdateEdit({ name: e.target.value })}
              className="h-8 text-sm font-semibold"
              placeholder="Style name"
            />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                {DELIVERABLE_TYPES.find((t) => t.value === style.deliverableType)?.label ??
                  style.deliverableType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {STYLE_AXES.find((a) => a.value === style.styleAxis)?.label ?? style.styleAxis}
              </Badge>
              {style.colorSamples && style.colorSamples.length > 0 && (
                <div className="flex gap-0.5 items-center ml-1">
                  {style.colorSamples.slice(0, 5).map((color) => (
                    <div
                      key={color}
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reference Images */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Reference Images{referenceImages.length > 0 && ` (${referenceImages.length})`}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ImagePlus className="h-3 w-3" />
              )}
              {isUploading ? 'Uploading...' : 'Add'}
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
          {referenceImages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {referenceImages.map((url) => (
                <div
                  key={url}
                  className="relative group h-12 w-12 rounded border border-border overflow-hidden"
                >
                  <img src={url} alt="Reference" className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleDeleteRefImage(url)}
                    disabled={deletingUrl === url}
                    className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {deletingUrl === url ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prompt Guide */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Prompt Guide</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground"
                onClick={handleCopyPrompt}
                title="Copy prompt"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Less' : 'More'}
              </Button>
            </div>
          </div>
          {expanded ? (
            <Textarea
              value={editState.promptGuide}
              onChange={(e) => onUpdateEdit({ promptGuide: e.target.value })}
              rows={10}
              className="text-sm resize-y min-h-[200px]"
              placeholder="Enter the prompt guide..."
            />
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {truncatedPrompt || <span className="italic">No prompt guide</span>}
            </p>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* Generate button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
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

            {/* Save as Reference (only when preview exists) */}
            {genState.status === 'success' && genState.previewBlobUrl && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-ds-success hover:text-ds-success"
                  onClick={onSaveAsReference}
                >
                  <Download className="h-3.5 w-3.5" />
                  Save as Ref
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={onClearPreview}
                  title="Clear preview"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {/* Active toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateEdit({ isActive: !editState.isActive })}
              className={cn(
                'h-8 gap-1.5 text-xs',
                editState.isActive
                  ? 'text-ds-success hover:text-ds-success'
                  : 'text-muted-foreground'
              )}
            >
              {editState.isActive ? (
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

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Save button when dirty */}
          {isDirty && (
            <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
