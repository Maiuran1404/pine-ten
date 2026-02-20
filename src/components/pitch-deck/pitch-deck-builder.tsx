'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { pitchDeckSchema, type PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { defaultPitchDeckContent } from '@/lib/pitch-deck/default-content'
import { PitchDeckForm } from './pitch-deck-form'
import { PitchDeckPreview } from './pitch-deck-preview'

const SLIDE_TAB_MAP: Record<string, number> = {
  global: 0,
  cover: 0,
  about: 1,
  services: 2,
  project: 3,
  overview: 4,
  scope: 5,
  timeline: 6,
  pricing: 7,
  back: 8,
}

export function PitchDeckBuilder() {
  const [activeTab, setActiveTab] = useState('cover')
  const [activeSlide, setActiveSlide] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const form = useForm<PitchDeckFormData>({
    resolver: zodResolver(pitchDeckSchema),
    defaultValues: defaultPitchDeckContent,
    mode: 'onChange',
  })

  const formValues = form.watch()

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const slideIndex = SLIDE_TAB_MAP[tab]
    if (slideIndex !== undefined) {
      setActiveSlide(slideIndex)
    }
  }

  const handleSlideChange = (index: number) => {
    setActiveSlide(index)
    // Find the matching tab for this slide index
    const tab = Object.entries(SLIDE_TAB_MAP).find(
      ([key, value]) => value === index && key !== 'global'
    )
    if (tab) {
      setActiveTab(tab[0])
    }
  }

  const handleGeneratePDF = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error('Please fix form errors before generating PDF')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/admin/pitch-decks/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const filename = `pitch-deck-${formValues.clientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('PDF generated and downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 h-full">
        {/* Left panel - Form */}
        <div className="flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <PitchDeckForm form={form} activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          <div className="pt-4 border-t mt-4">
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-full cursor-pointer"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right panel - Preview */}
        <div className="min-h-0">
          <PitchDeckPreview
            data={formValues}
            activeSlide={activeSlide}
            onSlideChange={handleSlideChange}
          />
        </div>
      </div>
    </div>
  )
}
