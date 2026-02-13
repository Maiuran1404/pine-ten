'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/shared/loading'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'

interface ClientOnboardingProps {
  onComplete: () => void
}

const useCases = [
  { id: 'social_ads', label: 'Social Media Ads' },
  { id: 'display_ads', label: 'Display Advertising' },
  { id: 'video_content', label: 'Video Content' },
  { id: 'brand_assets', label: 'Brand Assets' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'other', label: 'Other' },
]

const stylePreferences = [
  { id: 'minimalist', label: 'Minimalist', image: '/styles/minimalist.jpg' },
  { id: 'bold', label: 'Bold & Colorful', image: '/styles/bold.jpg' },
  { id: 'corporate', label: 'Corporate', image: '/styles/corporate.jpg' },
  { id: 'playful', label: 'Playful & Fun', image: '/styles/playful.jpg' },
  { id: 'elegant', label: 'Elegant & Luxury', image: '/styles/elegant.jpg' },
  { id: 'modern', label: 'Modern & Clean', image: '/styles/modern.jpg' },
]

export function ClientOnboarding({ onComplete }: ClientOnboardingProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    teamSize: '',
    useCases: [] as string[],
    stylePreferences: [] as string[],
    brandColors: '',
  })

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const handleUseCaseToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(id)
        ? prev.useCases.filter((u) => u !== id)
        : [...prev.useCases, id],
    }))
  }

  const handleStyleToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      stylePreferences: prev.stylePreferences.includes(id)
        ? prev.stylePreferences.filter((s) => s !== id)
        : [...prev.stylePreferences, id],
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client',
          data: formData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      toast.success("Welcome aboard! Let's get started.")
      onComplete()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {step === 1 && 'Tell us about yourself'}
          {step === 2 && 'What do you need?'}
          {step === 3 && 'Your style preferences'}
        </CardTitle>
        <CardDescription>
          {step === 1 && 'Help us personalize your experience'}
          {step === 2 && 'Select all that apply'}
          {step === 3 && 'Select styles you prefer (you can choose multiple)'}
        </CardDescription>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (optional)</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc."
                value={formData.companyName}
                onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., E-commerce, SaaS, Marketing"
                value={formData.industry}
                onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <Input
                id="teamSize"
                placeholder="e.g., 1-10, 11-50, 51-200"
                value={formData.teamSize}
                onChange={(e) => setFormData((prev) => ({ ...prev, teamSize: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {useCases.map((useCase) => (
              <div
                key={useCase.id}
                className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  formData.useCases.includes(useCase.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => handleUseCaseToggle(useCase.id)}
              >
                <Checkbox
                  checked={formData.useCases.includes(useCase.id)}
                  onCheckedChange={() => handleUseCaseToggle(useCase.id)}
                />
                <span className="text-sm font-medium">{useCase.label}</span>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stylePreferences.map((style) => (
                <div
                  key={style.id}
                  className={`relative rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    formData.stylePreferences.includes(style.id)
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleStyleToggle(style.id)}
                >
                  <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center text-muted-foreground text-xs">
                    {style.label}
                  </div>
                  <p className="text-sm font-medium text-center">{style.label}</p>
                  {formData.stylePreferences.includes(style.id) && (
                    <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandColors">Brand Colors (optional)</Label>
              <Input
                id="brandColors"
                placeholder="e.g., #000000, #FFFFFF, Blue"
                value={formData.brandColors}
                onChange={(e) => setFormData((prev) => ({ ...prev, brandColors: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isLoading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Finishing...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
