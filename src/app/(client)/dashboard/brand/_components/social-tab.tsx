'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SOCIAL_PLATFORMS } from '../_lib/brand-constants'
import type { BrandData } from '../_lib/brand-types'

interface SocialTabProps {
  brand: BrandData
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
}

export function SocialTab({ brand, updateField }: SocialTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Contact Email</Label>
          <Input
            type="email"
            value={brand.contactEmail || ''}
            onChange={(e) => updateField('contactEmail', e.target.value)}
            placeholder="hello@company.com"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Contact Phone</Label>
          <Input
            value={brand.contactPhone || ''}
            onChange={(e) => updateField('contactPhone', e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-muted-foreground text-sm">Social Media Links</Label>
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon: Icon }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <Input
              value={brand.socialLinks?.[key] || ''}
              onChange={(e) =>
                updateField('socialLinks', {
                  ...brand.socialLinks,
                  [key]: e.target.value,
                })
              }
              placeholder={placeholder}
              className="h-11"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
