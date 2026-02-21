'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { pitchDeckSchema, type PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { defaultPitchDeckContent } from '@/lib/pitch-deck/default-content'
import { PitchDeckChat } from './pitch-deck-chat'
import { PitchDeckPreview } from './pitch-deck-preview'

export function PitchDeckBuilder() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const form = useForm<PitchDeckFormData>({
    resolver: zodResolver(pitchDeckSchema),
    defaultValues: defaultPitchDeckContent,
    mode: 'onChange',
  })

  const formValues = form.watch()

  const handleSlideChange = (index: number) => {
    setActiveSlide(index)
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
    <div className="h-[calc(100vh-5rem)] -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-0 h-full">
        {/* Left panel - Chat */}
        <div className="flex flex-col min-h-0 border-r bg-background">
          <div className="flex-1 overflow-hidden">
            <PitchDeckChat form={form} />
          </div>

          <div className="px-5 py-3 border-t">
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
        <div className="min-h-0 bg-muted/20 p-4">
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
