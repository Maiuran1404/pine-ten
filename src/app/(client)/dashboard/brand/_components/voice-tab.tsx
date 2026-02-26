'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { SectionCard } from './section-card'
import type { BrandData } from '../_lib/brand-types'

interface VoiceTabProps {
  brand: BrandData
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
}

function TagInput({
  label,
  tags,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string
  tags: string[]
  placeholder: string
  onAdd: (value: string) => void
  onRemove: (index: number) => void
}) {
  const [inputValue, setInputValue] = useState('')

  function handleAdd() {
    const value = inputValue.trim()
    if (!value) return
    onAdd(value)
    setInputValue('')
  }

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-sm">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((item, index) => (
          <Badge key={index} variant="secondary" className="gap-1">
            {item}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder={placeholder}
          className="h-11"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function VoiceTab({ brand, updateField }: VoiceTabProps) {
  function updateVoiceField(field: string, value: unknown) {
    updateField('brandVoice', {
      ...brand.brandVoice,
      [field]: value,
    })
  }

  function addTag(field: string, value: string) {
    const existing =
      (brand.brandVoice?.[field as keyof NonNullable<BrandData['brandVoice']>] as
        | string[]
        | undefined) || []
    updateVoiceField(field, [...existing, value])
  }

  function removeTag(field: string, index: number) {
    const existing =
      (brand.brandVoice?.[field as keyof NonNullable<BrandData['brandVoice']>] as
        | string[]
        | undefined) || []
    updateVoiceField(
      field,
      existing.filter((_, i) => i !== index)
    )
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Messaging Foundation" description="Core messages and brand promise">
        <div className="space-y-4">
          <TagInput
            label="Messaging Pillars"
            tags={brand.brandVoice?.messagingPillars || []}
            placeholder="Add a messaging pillar"
            onAdd={(value) => addTag('messagingPillars', value)}
            onRemove={(index) => removeTag('messagingPillars', index)}
          />

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Brand Promise</Label>
            <Input
              value={brand.brandVoice?.brandPromise || ''}
              onChange={(e) => updateVoiceField('brandPromise', e.target.value)}
              placeholder="The core promise your brand makes"
              className="h-11"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tone Guidelines" description="How your brand should and shouldn't sound">
        <div className="space-y-4">
          <TagInput
            label="Tone DO's"
            tags={brand.brandVoice?.toneDoList || []}
            placeholder="e.g. Be conversational, Use active voice"
            onAdd={(value) => addTag('toneDoList', value)}
            onRemove={(index) => removeTag('toneDoList', index)}
          />

          <TagInput
            label="Tone DON'Ts"
            tags={brand.brandVoice?.toneDontList || []}
            placeholder="e.g. Don't use jargon, Avoid passive voice"
            onAdd={(value) => addTag('toneDontList', value)}
            onRemove={(index) => removeTag('toneDontList', index)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Language Guide" description="Phrases to embrace and avoid">
        <div className="space-y-4">
          <TagInput
            label="Key Phrases"
            tags={brand.brandVoice?.keyPhrases || []}
            placeholder="Add a key phrase to use"
            onAdd={(value) => addTag('keyPhrases', value)}
            onRemove={(index) => removeTag('keyPhrases', index)}
          />

          <TagInput
            label="Avoid Phrases"
            tags={brand.brandVoice?.avoidPhrases || []}
            placeholder="Add a phrase to avoid"
            onAdd={(value) => addTag('avoidPhrases', value)}
            onRemove={(index) => removeTag('avoidPhrases', index)}
          />
        </div>
      </SectionCard>
    </div>
  )
}
