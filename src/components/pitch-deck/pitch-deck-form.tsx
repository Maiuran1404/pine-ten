'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'

const SLIDE_TABS = [
  { value: 'global', label: 'Settings', slideIndex: -1 },
  { value: 'cover', label: 'Cover', slideIndex: 0 },
  { value: 'about', label: 'About', slideIndex: 1 },
  { value: 'services', label: 'Services', slideIndex: 2 },
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
          <FieldGroup label="Primary Color (Background)">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                {...register('primaryColor')}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input {...register('primaryColor')} className="flex-1" />
            </div>
          </FieldGroup>
          <FieldGroup label="Accent Color">
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
          <FieldGroup label="Title">
            <Input {...register('coverTitle')} placeholder="Design Proposal" />
          </FieldGroup>
          <FieldGroup label="Subtitle">
            <Input {...register('coverSubtitle')} placeholder="Interior Design Services" />
          </FieldGroup>
          <FieldGroup label="Date">
            <Input {...register('coverDate')} placeholder="February 2026" />
          </FieldGroup>
        </TabsContent>

        {/* About */}
        <TabsContent value="about" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('aboutTitle')} placeholder="About Us" />
          </FieldGroup>
          <FieldGroup label="Body Text">
            <Textarea {...register('aboutBody')} placeholder="Company description..." rows={4} />
          </FieldGroup>
          <AboutHighlightsField form={form} />
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('servicesTitle')} placeholder="Our Services" />
          </FieldGroup>
          <ServicesField form={form} />
        </TabsContent>

        {/* Project Details */}
        <TabsContent value="project" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('projectDetailsTitle')} placeholder="Project Details" />
          </FieldGroup>
          <FieldGroup label="Project Name">
            <Input {...register('projectName')} placeholder="Living Space Redesign" />
          </FieldGroup>
          <FieldGroup label="Project Description">
            <Textarea
              {...register('projectDescription')}
              placeholder="Project description..."
              rows={3}
            />
          </FieldGroup>
          <ObjectivesField form={form} />
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
              rows={4}
            />
          </FieldGroup>
          <KeyPointsField form={form} />
        </TabsContent>

        {/* Scope */}
        <TabsContent value="scope" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('scopeTitle')} placeholder="Scope of Work" />
          </FieldGroup>
          <ScopeField form={form} />
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('timelineTitle')} placeholder="Project Timeline" />
          </FieldGroup>
          <MilestonesField form={form} />
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="space-y-4 mt-0">
          <FieldGroup label="Section Title">
            <Input {...register('pricingTitle')} placeholder="Investment" />
          </FieldGroup>
          <PricingField form={form} />
          <FieldGroup label="Total">
            <Input {...register('pricingTotal')} placeholder="$9,000" />
          </FieldGroup>
          <FieldGroup label="Notes">
            <Textarea
              {...register('pricingNotes')}
              placeholder="Additional pricing notes..."
              rows={2}
            />
          </FieldGroup>
        </TabsContent>

        {/* Back Cover */}
        <TabsContent value="back" className="space-y-4 mt-0">
          <FieldGroup label="Closing Message">
            <Textarea
              {...register('backCoverMessage')}
              placeholder="Thank you message..."
              rows={2}
            />
          </FieldGroup>
          <FieldGroup label="Contact Email">
            <Input {...register('contactEmail')} placeholder="hello@crafted.design" />
          </FieldGroup>
          <FieldGroup label="Contact Phone">
            <Input {...register('contactPhone')} placeholder="+61 400 000 000" />
          </FieldGroup>
          <FieldGroup label="Website">
            <Input {...register('contactWebsite')} placeholder="www.crafted.design" />
          </FieldGroup>
        </TabsContent>
      </div>
    </Tabs>
  )
}

// ---- Dynamic array fields ----

function AboutHighlightsField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'aboutHighlights' as never,
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Highlights</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append('' as never)}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="flex gap-2">
          <Input
            {...form.register(`aboutHighlights.${i}` as const)}
            placeholder={`Highlight ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="cursor-pointer flex-shrink-0 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function ServicesField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'services',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Services</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: '', description: '' })}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Service {i + 1}</span>
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
          <Input {...form.register(`services.${i}.name`)} placeholder="Service name" />
          <Textarea
            {...form.register(`services.${i}.description`)}
            placeholder="Description"
            rows={2}
          />
        </div>
      ))}
    </div>
  )
}

function ObjectivesField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'projectObjectives' as never,
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Objectives</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append('' as never)}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="flex gap-2">
          <Input
            {...form.register(`projectObjectives.${i}` as const)}
            placeholder={`Objective ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="cursor-pointer flex-shrink-0 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function KeyPointsField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'overviewKeyPoints' as never,
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Key Points</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append('' as never)}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="flex gap-2">
          <Input
            {...form.register(`overviewKeyPoints.${i}` as const)}
            placeholder={`Key point ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="cursor-pointer flex-shrink-0 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function ScopeField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'scopeItems',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Scope Items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ title: '', description: '', included: true })}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch(`scopeItems.${i}.included`)}
                onCheckedChange={(checked) => form.setValue(`scopeItems.${i}.included`, checked)}
              />
              <span className="text-xs text-muted-foreground">Included</span>
            </div>
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
          <Input {...form.register(`scopeItems.${i}.title`)} placeholder="Scope item title" />
          <Textarea
            {...form.register(`scopeItems.${i}.description`)}
            placeholder="Description"
            rows={2}
          />
        </div>
      ))}
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
          onClick={() => append({ phase: '', description: '', duration: '' })}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Phase {i + 1}</span>
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
          <Input {...form.register(`milestones.${i}.phase`)} placeholder="Phase name" />
          <Textarea
            {...form.register(`milestones.${i}.description`)}
            placeholder="Description"
            rows={2}
          />
          <Input {...form.register(`milestones.${i}.duration`)} placeholder="e.g., 2 weeks" />
        </div>
      ))}
    </div>
  )
}

function PricingField({ form }: { form: UseFormReturn<PitchDeckFormData> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pricingItems',
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Line Items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ item: '', description: '', price: '' })}
          className="cursor-pointer"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Item {i + 1}</span>
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
          <Input {...form.register(`pricingItems.${i}.item`)} placeholder="Item name" />
          <Textarea
            {...form.register(`pricingItems.${i}.description`)}
            placeholder="Description"
            rows={2}
          />
          <Input {...form.register(`pricingItems.${i}.price`)} placeholder="$0,000" />
        </div>
      ))}
    </div>
  )
}
