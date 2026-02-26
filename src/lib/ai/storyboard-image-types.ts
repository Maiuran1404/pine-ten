// =============================================================================
// STORYBOARD IMAGE TYPES — shared across all search modules and frontend
// =============================================================================

export type ImageSource =
  | 'film-grab'
  | 'flim-ai'
  | 'eyecannndy'
  | 'pexels'
  | 'unsplash'
  | 'dribbble'
  | 'behance'
  | 'dezeen'
  | 'houzz'
  | 'arena'
export type ImageMediaType = 'still' | 'gif'

export interface StoryboardImageAttribution {
  sourceName: string // "Film-Grab", "Flim.ai", etc.
  sourceUrl: string // Link to source page
  photographer?: string
  filmTitle?: string
  techniqueName?: string
}

export interface StoryboardImage {
  id: string // source-prefixed: "filmgrab_123"
  url: string // Display URL (150-800px)
  originalUrl?: string // Full-size if available
  source: ImageSource
  mediaType: ImageMediaType
  alt: string
  attribution: StoryboardImageAttribution
}

export interface SceneImageMatch {
  sceneNumber: number
  images: StoryboardImage[]
  primaryIndex: number // Index of best image to show
}

export interface StoryboardImageSearchResult {
  sceneMatches: SceneImageMatch[]
  totalDuration: number
  sourcesUsed: ImageSource[]
}

/** Input shape passed to the orchestrator per scene */
export interface SceneSearchInput {
  sceneNumber: number
  imageSearchTerms?: string[]
  filmTitleSuggestions?: string[]
  visualTechniques?: string[]
  visualNote?: string
  description?: string
  title?: string
  voiceover?: string
}
