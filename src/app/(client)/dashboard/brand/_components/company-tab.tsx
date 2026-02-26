'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploadField } from './image-upload-field'
import { SectionCard } from './section-card'
import { industries, industryArchetypes } from '../_lib/brand-constants'
import type { BrandData } from '../_lib/brand-types'

interface CompanyTabProps {
  brand: BrandData
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
}

export function CompanyTab({ brand, updateField }: CompanyTabProps) {
  return (
    <div className="space-y-6">
      <SectionCard title="Brand Identity" description="Core information about your company">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Company Name</Label>
              <Input
                value={brand.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Industry</Label>
              <Select
                value={brand.industry || ''}
                onValueChange={(value) => updateField('industry', value)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Industry Archetype</Label>
            <Select
              value={brand.industryArchetype || ''}
              onValueChange={(value) => updateField('industryArchetype', value)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select archetype" />
              </SelectTrigger>
              <SelectContent>
                {industryArchetypes.map((arch) => (
                  <SelectItem key={arch.value} value={arch.value}>
                    {arch.label} - {arch.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              High-level business category that helps us tailor creative recommendations
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Description</Label>
            <Textarea
              value={brand.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Tagline</Label>
              <Input
                value={brand.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Your company tagline"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Website</Label>
              <Input
                value={brand.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="yourcompany.com"
                className="h-11"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Brand Assets" description="Logo and favicon for your brand">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label="Logo"
            value={brand.logoUrl}
            onChange={(url) => updateField('logoUrl', url)}
          />
          <ImageUploadField
            label="Favicon"
            value={brand.faviconUrl}
            onChange={(url) => updateField('faviconUrl', url)}
          />
        </div>
      </SectionCard>
    </div>
  )
}
