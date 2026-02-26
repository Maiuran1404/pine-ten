'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLOR_PRESETS } from '../_lib/brand-constants'
import type { BrandData } from '../_lib/brand-types'

interface ColorsTabProps {
  brand: BrandData
  copiedColor: string | null
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
  addBrandColor: (color: string) => void
  removeBrandColor: (index: number) => void
  copyColor: (color: string) => void
}

type ColorField =
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'backgroundColor'
  | 'textColor'

function getColorValue(brand: BrandData, field: ColorField, fallback = '#6366f1'): string {
  return (brand[field] as string | null) ?? fallback
}

export function ColorsTab({
  brand,
  copiedColor,
  updateField,
  addBrandColor,
  removeBrandColor,
  copyColor,
}: ColorsTabProps) {
  return (
    <div className="space-y-6">
      {/* Main Colors */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            { key: 'primaryColor' as const, label: 'Primary', presets: COLOR_PRESETS.primary },
            {
              key: 'secondaryColor' as const,
              label: 'Secondary',
              presets: COLOR_PRESETS.secondary,
            },
            { key: 'accentColor' as const, label: 'Accent', presets: COLOR_PRESETS.primary },
          ] satisfies Array<{ key: ColorField; label: string; presets: readonly string[] }>
        ).map(({ key, label, presets }) => (
          <div key={key} className="space-y-2">
            <Label className="text-muted-foreground text-sm">{label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:border-ring transition-colors">
                  <div
                    className="w-10 h-10 rounded-lg border border-border"
                    style={{ backgroundColor: getColorValue(brand, key) }}
                  />
                  <span className="text-sm font-mono text-muted-foreground">
                    {getColorValue(brand, key)}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 bg-popover border-border" align="start">
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {presets.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          'w-10 h-10 rounded-lg transition-all hover:scale-110',
                          getColorValue(brand, key) === color
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'ring-1 ring-border'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => updateField(key, color)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={getColorValue(brand, key, '#ffffff')}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <Input
                      value={getColorValue(brand, key, '')}
                      onChange={(e) => updateField(key, e.target.value)}
                      placeholder="#000000"
                      className="flex-1 h-10 font-mono text-sm"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </div>

      {/* Background & Text Colors */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            { key: 'backgroundColor' as const, label: 'Background' },
            { key: 'textColor' as const, label: 'Text' },
          ] satisfies Array<{ key: ColorField; label: string }>
        ).map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label className="text-muted-foreground text-sm">{label}</Label>
            <div className="flex gap-2">
              <div
                className="w-12 h-12 rounded-lg border border-input cursor-pointer"
                style={{ backgroundColor: getColorValue(brand, key, '#1a1a1f') }}
                onClick={() => {
                  const input = document.getElementById(`${key}-picker`) as HTMLInputElement
                  input?.click()
                }}
              />
              <Input
                value={getColorValue(brand, key, '')}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder="#000000"
                className="flex-1 h-12"
              />
              <input
                id={`${key}-picker`}
                type="color"
                value={getColorValue(brand, key, '#ffffff')}
                onChange={(e) => updateField(key, e.target.value)}
                className="sr-only"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Additional Colors */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-sm">Additional Brand Colors</Label>
        <div className="flex flex-wrap gap-2">
          {brand.brandColors.map((color, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border"
            >
              <div
                className="w-6 h-6 rounded border border-border"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-mono text-muted-foreground">{color}</span>
              <button
                onClick={() => copyColor(color)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              >
                {copiedColor === color ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => removeBrandColor(index)}
                className="p-1 hover:bg-destructive/10 rounded text-destructive text-sm"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border-2 border-dashed border-border">
            <input
              type="color"
              onChange={(e) => addBrandColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent"
            />
            <span className="text-sm text-muted-foreground">Add color</span>
          </div>
        </div>
      </div>
    </div>
  )
}
