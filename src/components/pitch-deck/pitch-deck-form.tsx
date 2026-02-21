'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'

const SLIDE_TABS = [
  { value: 'global', label: 'Settings', slideIndex: -1 },
  { value: 'cover', label: 'Cover', slideIndex: 0 },
  { value: 'about', label: 'About', slideIndex: 2 },
  { value: 'project', label: 'Project', slideIndex: 3 },
  { value: 'overview', label: 'Overview', slideIndex: 4 },
  { value: 'scope', label: 'Scope', slideIndex: 5 },
  { value: 'timeline', label: 'Timeline', slideIndex: 6 },
  { value: 'pricing', label: 'Pricing', slideIndex: 7 },
  { value: 'back', label: 'Back Cover', slideIndex: 8 },
]

interface PitchDeckFormProps {
  form: UseFormReturn<PitchDeckFormData>
  activeTab: string
  onTabChange: (tab: string) => void
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function PitchDeckForm({ form, activeTab, onTabChange }: PitchDeckFormProps) {
  const { register } = form

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1">
        {SLIDE_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="text-xs cursor-pointer">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1 overflow-y-auto mt-4 pr-1">
        {/* Global Settings */}
        <TabsContent value="global" className="space-y-4 mt-0">
          <FieldGroup label="Client Name">
            <Input {...register('clientName')} placeholder="Client name" />
          </FieldGroup>
          <FieldGroup label="Primary Color (Cover Background)">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                {...register('primaryColor')}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input {...register('primaryColor')} className="flex-1" />
            </div>
          </FieldGroup>
          <FieldGroup label="Accent Color (Buttons & Highlights)">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                {...register('accentColor')}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input {...register('accentColor')} className="flex-1" />
            </div>
          </FieldGroup>
        </TabsContent>

        {/* Cover */}
        <TabsContent value="cover" className="space-y-4 mt-0">
          <FieldGroup label="Date">
            <Input {...register('coverDate')} placeholder="Feb 2026" />
          </FieldGroup>
          <p className="text-xs text-muted-foreground">
            The cover displays &quot;[Client] x Crafted&quot; automatically from the client name in
            Settings.
          </p>
        </TabsContent>

        {/* About */}
        <TabsContent value="about" className="space-y-4 mt-0">
          <FieldGroup label="Headline">
            <Input {...register('aboutTitle')} placeholder="Marketing done by AI..." />
          </FieldGroup>
          <FieldGroup label="Body Text">
            <Textarea {...register('aboutBody')} placeholder="Company description..." rows={4} />
          </FieldGroup>
        </TabsContent>

        {/* Project Details */}
        <TabsContent value="project" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('projectDetailsTitle')} placeholder="Project Details" />
          </FieldGroup>
          <ProjectColumnsField form={form} />
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('overviewTitle')} placeholder="Project Overview" />
          </FieldGroup>
          <FieldGroup label="Body Text">
            <Textarea
              {...register('overviewBody')}
              placeholder="Overview description..."
              rows={6}
            />
          </FieldGroup>
        </TabsContent>

        {/* Scope */}
        <TabsContent value="scope" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('scopeTitle')} placeholder="Scope Of Work" />
          </FieldGroup>
          <ScopeCategoriesField form={form} />
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('timelineTitle')} placeholder="Timeline" />
          </FieldGroup>
          <MilestonesField form={form} />
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('pricingTitle')} placeholder="Pricing" />
          </FieldGroup>
          <FieldGroup label="Subtitle">
            <Input {...register('pricingSubtitle')} placeholder="For projects" />
          </FieldGroup>
          <PricingCardsField form={form} />
        </TabsContent>

        {/* Back Cover */}
        <TabsContent value="back" className="space-y-4 mt-0">
          <FieldGroup label="Heading">
            <Input {...register('backCoverMessage')} placeholder="Thank you" />
          </FieldGroup>
          <FieldGroup label="Body Text">
            <Textarea {...register('backCoverBody')} placeholder="Thank you message..." rows={3} />
          </FieldGroup>
          <FieldGroup label="Project Manager Name">
            <Input {...register('contactName')} placeholder="Name" />
          </FieldGroup>
          <FieldGroup label="Contact Email">
            <Input {...register('contactEmail')} placeholder="email@getcrafted.ai" />
          </FieldGroup>
          <FieldGroup label="Contact Phone">
            <Input {...register('contactPhone')} placeholder="+47 48198693" />
          </FieldGroup>
          <FieldGroup label="Website">
            <Input {...register('contactWebsite')} placeholder="getcrafted.ai" />
          </FieldGroup>
        </TabsContent>
      </div>
    </Tabs>
  )
}

// ---- Dynamic array fields ----

function ProjectColumnsField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'projectDetailsColumns',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Columns</Label>
        {fields.length < 4 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ title: '', description: '' })}
            className="cursor-pointer"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Column {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              className="cursor-pointer h-6 w-6 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input
            {...form.register(`projectDetailsColumns.${i}.title`)}
            placeholder="Column title"
          />
          <Textarea
            {...form.register(`projectDetailsColumns.${i}.description`)}
            placeholder="Description"
            rows={3}
          />
        </div>
      ))}
    </div>
  )
}

function ScopeCategoriesField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'scopeCategories',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Categories</Label>
        {fields.length < 4 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ title: '', items: [''] })}
            className="cursor-pointer"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Category
          </Button>
        )}
      </div>
      {fields.map((field, i) => (
        <ScopeCategoryItem key={field.id} form={form} index={i} onRemove={() => remove(i)} />
      ))}
    </div>
  )
}

function ScopeCategoryItem({
  form,
  index,
  onRemove,
}: {
  form: UseFormReturn<PitchDeckFormData>
  index: number
  onRemove: () => void
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `scopeCategories.${index}.items` as never,
  })

  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Category {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="cursor-pointer h-6 w-6 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Input {...form.register(`scopeCategories.${index}.title`)} placeholder="Category title" />
      <div className="space-y-1 ml-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Items</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append('' as never)}
            className="cursor-pointer h-6 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Item
          </Button>
        </div>
        {fields.map((itemField, j) => (
          <div key={itemField.id} className="flex gap-1">
            <Input
              {...form.register(`scopeCategories.${index}.items.${j}` as const)}
              placeholder={`Item ${j + 1}`}
              className="text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(j)}
              className="cursor-pointer flex-shrink-0 h-9 w-9 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MilestonesField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'milestones',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Milestones</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ date: '', description: '' })}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Milestone {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              className="cursor-pointer h-6 w-6 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input {...form.register(`milestones.${i}.date`)} placeholder="e.g., Sunday 8th" />
          <Input {...form.register(`milestones.${i}.description`)} placeholder="Description" />
        </div>
      ))}
    </div>
  )
}

function PricingCardsField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pricingCards',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Pricing Cards</Label>
        {fields.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                label: 'Custom offer',
                price: '',
                priceDescription: '',
                ctaText: "Let's work together!",
                includedItems: [''],
              })
            }
            className="cursor-pointer"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Card
          </Button>
        )}
      </div>
      {fields.map((field, i) => (
        <PricingCardItem key={field.id} form={form} index={i} onRemove={() => remove(i)} />
      ))}
    </div>
  )
}

function PricingCardItem({
  form,
  index,
  onRemove,
}: {
  form: UseFormReturn<PitchDeckFormData>
  index: number
  onRemove: () => void
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `pricingCards.${index}.includedItems` as never,
  })

  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Card {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="cursor-pointer h-6 w-6 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Input {...form.register(`pricingCards.${index}.label`)} placeholder="Card label" />
      <Input {...form.register(`pricingCards.${index}.price`)} placeholder="$5,000" />
      <Input
        {...form.register(`pricingCards.${index}.priceDescription`)}
        placeholder="Pricing for..."
      />
      <Input
        {...form.register(`pricingCards.${index}.ctaText`)}
        placeholder="Let's work together!"
      />
      <div className="space-y-1 ml-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Included Items</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append('' as never)}
            className="cursor-pointer h-6 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Item
          </Button>
        </div>
        {fields.map((itemField, j) => (
          <div key={itemField.id} className="flex gap-1">
            <Input
              {...form.register(`pricingCards.${index}.includedItems.${j}` as const)}
              placeholder={`Item ${j + 1}`}
              className="text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(j)}
              className="cursor-pointer flex-shrink-0 h-9 w-9 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
