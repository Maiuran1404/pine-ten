'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import type { BrandData } from '../_lib/brand-types'

interface PositioningTabProps {
  brand: BrandData
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
}

export function PositioningTab({ brand, updateField }: PositioningTabProps) {
  const [differentiatorInput, setDifferentiatorInput] = useState('')

  const differentiators = brand.positioning?.differentiators || []

  function addDifferentiator() {
    const value = differentiatorInput.trim()
    if (!value) return
    updateField('positioning', {
      ...brand.positioning,
      differentiators: [...differentiators, value],
    })
    setDifferentiatorInput('')
  }

  function removeDifferentiator(index: number) {
    updateField('positioning', {
      ...brand.positioning,
      differentiators: differentiators.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Unique Value Proposition</Label>
        <Textarea
          value={brand.positioning?.uvp || ''}
          onChange={(e) =>
            updateField('positioning', {
              ...brand.positioning,
              uvp: e.target.value,
            })
          }
          rows={3}
          className="resize-none"
          placeholder="What makes your brand uniquely valuable?"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Mission Statement</Label>
        <Textarea
          value={brand.positioning?.missionStatement || ''}
          onChange={(e) =>
            updateField('positioning', {
              ...brand.positioning,
              missionStatement: e.target.value,
            })
          }
          rows={3}
          className="resize-none"
          placeholder="Your brand's core mission"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Positioning Statement</Label>
        <Textarea
          value={brand.positioning?.positioningStatement || ''}
          onChange={(e) =>
            updateField('positioning', {
              ...brand.positioning,
              positioningStatement: e.target.value,
            })
          }
          rows={3}
          className="resize-none"
          placeholder="For [target market], [brand] is the [category] that [key benefit] because [reason to believe]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Differentiators</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {differentiators.map((item, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => removeDifferentiator(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={differentiatorInput}
            onChange={(e) => setDifferentiatorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addDifferentiator()
              }
            }}
            placeholder="Add a differentiator"
            className="h-11"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={addDifferentiator}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Target Market</Label>
        <Textarea
          value={brand.positioning?.targetMarket || ''}
          onChange={(e) =>
            updateField('positioning', {
              ...brand.positioning,
              targetMarket: e.target.value,
            })
          }
          rows={3}
          className="resize-none"
          placeholder="Describe your ideal target market"
        />
      </div>
    </div>
  )
}
