'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DELIVERABLE_TYPES,
  STYLE_AXES,
  type DeliverableType,
  type StyleAxis,
} from '@/lib/constants/reference-libraries'
import type { CreateFormState } from './types'

interface CreatePresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: CreateFormState
  onFormChange: (updates: Partial<CreateFormState>) => void
  onCreate: () => void
  isCreating: boolean
}

export function CreatePresetDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onCreate,
  isCreating,
}: CreatePresetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Style Preset</DialogTitle>
          <DialogDescription>
            Create a curated style with a prompt guide that will be injected into the AI when
            selected by customers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="e.g. Bold Corporate"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="Short description"
            />
          </div>

          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => onFormChange({ imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deliverable Type</Label>
              <Select
                value={form.deliverableType}
                onValueChange={(v) => onFormChange({ deliverableType: v as DeliverableType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Style Axis</Label>
              <Select
                value={form.styleAxis}
                onValueChange={(v) => onFormChange({ styleAxis: v as StyleAxis })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_AXES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt Guide</Label>
            <Textarea
              value={form.promptGuide}
              onChange={(e) => onFormChange({ promptGuide: e.target.value })}
              rows={6}
              placeholder="Enter the prompt guide text that will be injected into the AI system prompt when this style is selected by a customer..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
