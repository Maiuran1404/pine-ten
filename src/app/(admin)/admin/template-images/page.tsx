'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingSpinner } from '@/components/shared/loading'
import { GalleryThumbnails, ImageIcon, Trash2, Upload, ExternalLink } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'

// Must match the dashboard template structure
const TEMPLATE_STRUCTURE: Record<string, { options: Array<{ title: string; optionKey: string }> }> =
  {
    'launch-videos': {
      options: [
        { title: 'Product Launch Video', optionKey: 'product-launch-video' },
        { title: 'Feature Highlight', optionKey: 'feature-highlight' },
        { title: 'App Walkthrough', optionKey: 'app-walkthrough' },
      ],
    },
    'pitch-deck': {
      options: [
        { title: 'Investor Pitch Deck', optionKey: 'investor-pitch-deck' },
        { title: 'Sales Deck', optionKey: 'sales-deck' },
        { title: 'Company Overview', optionKey: 'company-overview' },
      ],
    },
    branding: {
      options: [
        { title: 'Full Brand Package', optionKey: 'full-brand-package' },
        { title: 'Logo Design', optionKey: 'logo-design' },
        { title: 'Brand Refresh', optionKey: 'brand-refresh' },
      ],
    },
    'social-media': {
      options: [
        { title: 'Instagram Post', optionKey: 'instagram-post' },
        { title: 'Instagram Story', optionKey: 'instagram-story' },
        { title: 'Instagram Reels', optionKey: 'instagram-reels' },
        { title: 'LinkedIn Content', optionKey: 'linkedin-content' },
        { title: 'Video Edit', optionKey: 'video-edit' },
        { title: 'Ad Creatives', optionKey: 'ad-creatives' },
      ],
    },
    'content-calendar': {
      options: [
        { title: 'Social Media Calendar', optionKey: 'social-media-calendar' },
        { title: 'Multi-Platform Campaign', optionKey: 'multi-platform-campaign' },
        { title: 'Launch Content Plan', optionKey: 'launch-content-plan' },
      ],
    },
    'landing-page': {
      options: [
        { title: 'Product Landing Page', optionKey: 'product-landing-page' },
        { title: 'SaaS Landing Page', optionKey: 'saas-landing-page' },
        { title: 'Event Landing Page', optionKey: 'event-landing-page' },
      ],
    },
  }

const CATEGORY_LABELS: Record<string, string> = {
  'launch-videos': 'Launch Videos',
  'pitch-deck': 'Pitch Deck',
  branding: 'Branding',
  'social-media': 'Social Media',
  'content-calendar': 'Content Calendar',
  'landing-page': 'Landing Page',
}

interface TemplateImage {
  id: string
  categoryKey: string
  optionKey: string | null
  imageUrl: string
  sourceUrl: string | null
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export default function TemplateImagesPage() {
  const { csrfFetch } = useCsrfContext()
  const [images, setImages] = useState<TemplateImage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<{
    categoryKey: string
    optionKey: string | null
  } | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [sourceUrlInput, setSourceUrlInput] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/template-images')
      const data = await res.json()
      if (data?.success) {
        setImages(data.data?.images || [])
      }
    } catch {
      toast.error('Failed to load template images')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const getImageForSlot = (
    categoryKey: string,
    optionKey: string | null
  ): TemplateImage | undefined => {
    return images.find((img) => img.categoryKey === categoryKey && img.optionKey === optionKey)
  }

  const handleSave = async () => {
    if (!editingSlot || !imageUrlInput.trim()) {
      toast.error('Please enter an image URL')
      return
    }

    setSaving(true)
    try {
      const res = await csrfFetch('/api/admin/template-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryKey: editingSlot.categoryKey,
          optionKey: editingSlot.optionKey,
          imageUrl: imageUrlInput.trim(),
          sourceUrl: sourceUrlInput.trim() || null,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        toast.success('Template image saved')
        setEditingSlot(null)
        setImageUrlInput('')
        setSourceUrlInput('')
        fetchImages()
      } else {
        toast.error(data?.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save template image')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await csrfFetch(`/api/admin/template-images?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data?.success) {
        toast.success('Image removed')
        fetchImages()
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete template image')
    }
  }

  const totalSlots = Object.values(TEMPLATE_STRUCTURE).reduce(
    (acc, cat) => acc + 1 + cat.options.length,
    0
  )
  const filledSlots = images.filter((img) => img.isActive).length

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GalleryThumbnails className="h-6 w-6" />
          Template Preview Images
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage preview images for dashboard template cards and modal options.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Slots" value={totalSlots} icon={ImageIcon} />
        <StatCard label="Images Set" value={filledSlots} icon={Upload} />
        <StatCard
          label="Coverage"
          value={`${totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0}%`}
          icon={GalleryThumbnails}
        />
      </div>

      {/* Category Grid */}
      {Object.entries(TEMPLATE_STRUCTURE).map(([categoryKey, category]) => (
        <Card key={categoryKey}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {CATEGORY_LABELS[categoryKey] || categoryKey}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Category cover image */}
              <ImageSlot
                label="Category Cover"
                image={getImageForSlot(categoryKey, null)}
                isEditing={
                  editingSlot?.categoryKey === categoryKey && editingSlot?.optionKey === null
                }
                onEdit={() => {
                  const existing = getImageForSlot(categoryKey, null)
                  setEditingSlot({ categoryKey, optionKey: null })
                  setImageUrlInput(existing?.imageUrl || '')
                  setSourceUrlInput(existing?.sourceUrl || '')
                }}
                onDelete={(id) => handleDelete(id)}
                imageUrlInput={imageUrlInput}
                sourceUrlInput={sourceUrlInput}
                onImageUrlChange={setImageUrlInput}
                onSourceUrlChange={setSourceUrlInput}
                onSave={handleSave}
                onCancel={() => {
                  setEditingSlot(null)
                  setImageUrlInput('')
                  setSourceUrlInput('')
                }}
                saving={saving}
              />

              {/* Option images */}
              {category.options.map((option) => (
                <ImageSlot
                  key={option.optionKey}
                  label={option.title}
                  image={getImageForSlot(categoryKey, option.optionKey)}
                  isEditing={
                    editingSlot?.categoryKey === categoryKey &&
                    editingSlot?.optionKey === option.optionKey
                  }
                  onEdit={() => {
                    const existing = getImageForSlot(categoryKey, option.optionKey)
                    setEditingSlot({ categoryKey, optionKey: option.optionKey })
                    setImageUrlInput(existing?.imageUrl || '')
                    setSourceUrlInput(existing?.sourceUrl || '')
                  }}
                  onDelete={(id) => handleDelete(id)}
                  imageUrlInput={imageUrlInput}
                  sourceUrlInput={sourceUrlInput}
                  onImageUrlChange={setImageUrlInput}
                  onSourceUrlChange={setSourceUrlInput}
                  onSave={handleSave}
                  onCancel={() => {
                    setEditingSlot(null)
                    setImageUrlInput('')
                    setSourceUrlInput('')
                  }}
                  saving={saving}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ImageSlot({
  label,
  image,
  isEditing,
  onEdit,
  onDelete,
  imageUrlInput,
  sourceUrlInput,
  onImageUrlChange,
  onSourceUrlChange,
  onSave,
  onCancel,
  saving,
}: {
  label: string
  image: TemplateImage | undefined
  isEditing: boolean
  onEdit: () => void
  onDelete: (id: string) => void
  imageUrlInput: string
  sourceUrlInput: string
  onImageUrlChange: (v: string) => void
  onSourceUrlChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  if (isEditing) {
    return (
      <div className="border rounded-lg p-3 space-y-2 bg-muted/30 ring-2 ring-primary/20">
        <p className="text-xs font-medium truncate">{label}</p>
        <Input
          placeholder="Image URL"
          value={imageUrlInput}
          onChange={(e) => onImageUrlChange(e.target.value)}
          className="text-xs h-8"
        />
        <Input
          placeholder="Source URL (optional)"
          value={sourceUrlInput}
          onChange={(e) => onSourceUrlChange(e.target.value)}
          className="text-xs h-8"
        />
        {imageUrlInput && (
          <div className="relative aspect-video rounded overflow-hidden bg-muted">
            <img src={imageUrlInput} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex gap-1.5">
          <Button size="sm" onClick={onSave} disabled={saving} className="flex-1 h-7 text-xs">
            {saving ? <LoadingSpinner className="w-3 h-3" /> : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (image) {
    return (
      <div className="group relative border rounded-lg overflow-hidden">
        <div className="aspect-video bg-muted">
          <img src={image.imageUrl} alt={label} className="w-full h-full object-cover" />
        </div>
        <div className="p-2">
          <p className="text-xs font-medium truncate">{label}</p>
        </div>
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button size="icon" variant="secondary" className="h-6 w-6" onClick={onEdit}>
            <Upload className="h-3 w-3" />
          </Button>
          {image.sourceUrl && (
            <a
              href={image.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button
            size="icon"
            variant="destructive"
            className="h-6 w-6"
            onClick={() => onDelete(image.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onEdit}
      className="border border-dashed rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 aspect-video hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground/60 text-center truncate w-full">{label}</p>
    </button>
  )
}
