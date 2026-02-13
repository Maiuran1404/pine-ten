'use client'

import { AIUploader, PendingUpload } from './ai-uploader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TONE_BUCKETS,
  ENERGY_BUCKETS,
  DENSITY_BUCKETS,
  COLOR_BUCKETS,
  TONE_BUCKET_LABELS,
  ENERGY_BUCKET_LABELS,
  DENSITY_BUCKET_LABELS,
  COLOR_BUCKET_LABELS,
  type ToneBucket,
  type EnergyBucket,
  type DensityBucket,
  type ColorBucket,
} from '@/lib/constants/reference-libraries'

interface BrandClassification {
  name: string
  description: string
  toneBucket: ToneBucket
  energyBucket: EnergyBucket
  densityBucket: DensityBucket
  colorBucket: ColorBucket
  colorSamples: string[]
  confidence: number
}

interface BrandReferenceUploaderProps {
  onUploadComplete?: () => void
}

export function BrandReferenceUploader({ onUploadComplete }: BrandReferenceUploaderProps) {
  const renderClassificationEditor = (
    upload: PendingUpload<BrandClassification>,
    updateClassification: (id: string, field: string, value: unknown) => void
  ) => {
    if (!upload.classification) return null

    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Brand Name</label>
            <Input
              value={upload.classification.name}
              onChange={(e) => updateClassification(upload.id, 'name', e.target.value)}
              className="h-8 mt-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <Badge variant="outline" className="text-xs">
              Confidence: {Math.round((upload.classification.confidence || 0) * 100)}%
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Tone</label>
            <Select
              value={upload.classification.toneBucket}
              onValueChange={(v) => updateClassification(upload.id, 'toneBucket', v)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {TONE_BUCKET_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Energy</label>
            <Select
              value={upload.classification.energyBucket}
              onValueChange={(v) => updateClassification(upload.id, 'energyBucket', v)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENERGY_BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {ENERGY_BUCKET_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Density</label>
            <Select
              value={upload.classification.densityBucket}
              onValueChange={(v) => updateClassification(upload.id, 'densityBucket', v)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DENSITY_BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {DENSITY_BUCKET_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Color</label>
            <Select
              value={upload.classification.colorBucket}
              onValueChange={(v) => updateClassification(upload.id, 'colorBucket', v)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {COLOR_BUCKET_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Color samples preview */}
        {upload.classification.colorSamples.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Colors:</span>
            {upload.classification.colorSamples.map((color, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <AIUploader<BrandClassification>
      apiEndpoint="/api/admin/brand-references/upload"
      resourceName="brand references"
      dropzoneText="Drag & drop brand images here"
      onUploadComplete={onUploadComplete}
      renderClassificationEditor={renderClassificationEditor}
    />
  )
}
