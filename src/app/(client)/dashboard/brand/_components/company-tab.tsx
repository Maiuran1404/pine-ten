'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react'
import { ImageUploadField } from './image-upload-field'
import { industries, industryArchetypes } from '../_lib/brand-constants'
import type { BrandData } from '../_lib/brand-types'

interface CompanyTabProps {
  brand: BrandData
  isResettingOnboarding: boolean
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
  onRedoOnboarding: () => void
}

export function CompanyTab({
  brand,
  isResettingOnboarding,
  updateField,
  onRedoOnboarding,
}: CompanyTabProps) {
  return (
    <div className="space-y-6">
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

      {/* Danger Zone */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mt-1">
                This will reset your current brand settings and take you through onboarding again.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={isResettingOnboarding}
                  >
                    {isResettingOnboarding ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Redo onboarding
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redo brand onboarding?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset your current brand settings and take you through the
                      onboarding process again. Your existing brand data will be replaced with the
                      new information you provide.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onRedoOnboarding}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
