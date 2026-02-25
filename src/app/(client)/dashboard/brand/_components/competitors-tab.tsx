'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { BrandData } from '../_lib/brand-types'

interface CompetitorsTabProps {
  brand: BrandData
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
}

export function CompetitorsTab({ brand, updateField }: CompetitorsTabProps) {
  const competitors = brand.competitors || []

  function addCompetitor() {
    updateField('competitors', [
      ...competitors,
      { name: '', website: '', positioning: '', strengths: '', weaknesses: '' },
    ])
  }

  function removeCompetitor(index: number) {
    updateField(
      'competitors',
      competitors.filter((_, i) => i !== index)
    )
  }

  function updateCompetitor(index: number, field: string, value: string) {
    const updated = competitors.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    updateField('competitors', updated)
  }

  return (
    <div className="space-y-6">
      {competitors.map((competitor, index) => (
        <div key={index} className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">Competitor {index + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeCompetitor(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Name</Label>
              <Input
                value={competitor.name}
                onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                placeholder="Competitor name"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Website</Label>
              <Input
                value={competitor.website || ''}
                onChange={(e) => updateCompetitor(index, 'website', e.target.value)}
                placeholder="https://competitor.com"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Positioning</Label>
            <Textarea
              value={competitor.positioning || ''}
              onChange={(e) => updateCompetitor(index, 'positioning', e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="How do they position themselves?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Strengths</Label>
              <Textarea
                value={competitor.strengths || ''}
                onChange={(e) => updateCompetitor(index, 'strengths', e.target.value)}
                rows={2}
                className="resize-none"
                placeholder="What are they good at?"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Weaknesses</Label>
              <Textarea
                value={competitor.weaknesses || ''}
                onChange={(e) => updateCompetitor(index, 'weaknesses', e.target.value)}
                rows={2}
                className="resize-none"
                placeholder="Where do they fall short?"
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={addCompetitor}>
        <Plus className="h-4 w-4 mr-2" />
        Add Competitor
      </Button>
    </div>
  )
}
