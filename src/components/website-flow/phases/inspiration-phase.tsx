'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Globe, Search } from 'lucide-react'
import { UrlInput } from '../inspiration/url-input'
import { IndustryFilter } from '../inspiration/industry-filter'
import { InspirationGallery } from '../inspiration/inspiration-gallery'
import { SimilarWebsites } from '../inspiration/similar-websites'
import { NotesInput } from '../shared/notes-input'

interface SelectedInspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
  isUserSubmitted?: boolean
}

interface InspirationPhaseProps {
  inspirations: Array<{
    id: string
    name: string
    url: string
    screenshotUrl: string
    industry: string[]
    styleTags: string[]
  }>
  isLoadingInspirations: boolean
  selectedInspirations: SelectedInspiration[]
  similarWebsites: Array<{
    inspiration: {
      id: string
      name: string
      url: string
      screenshotUrl: string
      industry: string[]
      styleTags: string[]
    }
    score: number
  }>
  isLoadingSimilar: boolean
  userNotes: string
  industryFilter?: string
  styleFilter?: string
  onAddInspiration: (insp: SelectedInspiration) => void
  onSetUserNotes: (notes: string) => void
  onSetIndustryFilter: (industry: string | undefined) => void
  onSetStyleFilter: (style: string | undefined) => void
  onFindSimilar: () => void
  onCaptureScreenshot: (url: string) => void
  isCapturingScreenshot: boolean
  onAdvance: () => void
  isAdvancing: boolean
}

export function InspirationPhase({
  inspirations,
  isLoadingInspirations,
  selectedInspirations,
  similarWebsites,
  isLoadingSimilar,
  userNotes,
  industryFilter,
  styleFilter,
  onAddInspiration,
  onSetUserNotes,
  onSetIndustryFilter,
  onSetStyleFilter,
  onFindSimilar,
  onCaptureScreenshot,
  isCapturingScreenshot,
  onAdvance,
  isAdvancing,
}: InspirationPhaseProps) {
  const [showGallery, setShowGallery] = useState(false)
  const selectedIds = selectedInspirations.map((i) => i.id)

  const handleUrlSubmit = (url: string) => {
    onCaptureScreenshot(url)
  }

  const handleSelectFromGallery = (insp: {
    id: string
    name: string
    url: string
    screenshotUrl: string
    industry: string[]
    styleTags: string[]
  }) => {
    onAddInspiration({
      id: insp.id,
      url: insp.url,
      screenshotUrl: insp.screenshotUrl,
      name: insp.name,
    })
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Find Your Inspiration</h2>
          {selectedInspirations.length > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
              {selectedInspirations.length}/5 selected
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Paste website URLs you love, or browse our curated gallery
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <UrlInput onSubmit={handleUrlSubmit} isLoading={isCapturingScreenshot} />
        <button
          onClick={() => setShowGallery(!showGallery)}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          {showGallery ? <Globe className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
          {showGallery ? 'Hide gallery' : 'Show me inspirations'}
        </button>
      </div>

      {/* Gallery */}
      {showGallery && (
        <div className="space-y-4">
          <IndustryFilter
            selectedIndustry={industryFilter}
            selectedStyle={styleFilter}
            onIndustryChange={onSetIndustryFilter}
            onStyleChange={onSetStyleFilter}
          />
          <InspirationGallery
            inspirations={inspirations}
            selectedIds={selectedIds}
            onSelect={handleSelectFromGallery}
            isLoading={isLoadingInspirations}
          />
        </div>
      )}

      {/* Similar Websites */}
      {selectedInspirations.length > 0 && (
        <SimilarWebsites
          similar={similarWebsites}
          selectedIds={selectedIds}
          onSelect={handleSelectFromGallery}
          onFindSimilar={onFindSimilar}
          isLoading={isLoadingSimilar}
          canSearch={selectedInspirations.filter((i) => !i.isUserSubmitted).length > 0}
        />
      )}

      {/* Notes */}
      {selectedInspirations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Additional Notes</h3>
          <NotesInput
            value={userNotes}
            onChange={onSetUserNotes}
            placeholder="e.g., I liked these designs but it's important that our legal expertise comes across clearly"
          />
        </div>
      )}

      {/* Advance Button */}
      {selectedInspirations.length > 0 && (
        <div className="sticky bottom-0 bg-background pt-4 border-t border-border">
          <Button
            onClick={onAdvance}
            disabled={isAdvancing || selectedInspirations.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
          >
            Continue to Design
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
