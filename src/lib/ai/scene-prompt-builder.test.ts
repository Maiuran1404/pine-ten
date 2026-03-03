import { describe, it, expect } from 'vitest'
import { buildScenePrompt, extractSubjectAnchor } from './scene-prompt-builder'
import type { StyleMetadata, BrandContextForPrompt } from './image-providers/types'
import type { ScenePromptInput, BatchContext } from './scene-prompt-builder'

// =============================================================================
// Helpers
// =============================================================================

function makeStyleMetadata(overrides: Partial<StyleMetadata> = {}): StyleMetadata {
  return {
    promptGuides: ['Cinematic documentary style, naturalistic lighting'],
    colorPalette: ['#1a1a2e', '#16213e', '#0f3460'],
    moodKeywords: ['cinematic', 'moody'],
    visualElements: ['shallow depth of field', 'film grain'],
    styleAxes: ['minimal'],
    colorTemperature: 'cool',
    energyLevel: 'calm',
    densityLevel: 'balanced',
    ...overrides,
  }
}

function makeScene(overrides: Partial<ScenePromptInput> = {}): ScenePromptInput {
  return {
    title: 'Opening Scene',
    description: 'A woman walks through a misty forest at dawn',
    visualNote: 'Soft golden light filters through the trees',
    cameraNote: 'wide angle',
    voiceover: 'In the stillness of morning, everything becomes clear',
    transition: 'dissolve',
    sceneNumber: 1,
    ...overrides,
  }
}

// =============================================================================
// buildScenePrompt — rich StyleMetadata path (concise 5-part format)
// =============================================================================

describe('buildScenePrompt with StyleMetadata (rich path)', () => {
  it('includes scene content in the output', () => {
    const scene = makeScene()
    const style = makeStyleMetadata()
    const result = buildScenePrompt(scene, style)

    // Scene content should be present
    expect(result).toContain('Opening Scene')
    expect(result).toContain('A woman walks through a misty forest at dawn')
  })

  it('includes style guide content', () => {
    const style = makeStyleMetadata({
      promptGuides: ['Clean minimalist aesthetic'],
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Clean minimalist aesthetic')
  })

  it('includes camera and lighting info', () => {
    const scene = makeScene({ cameraNote: 'close up' })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('Close-up (CU)')
  })

  it('includes quality footer with photorealistic', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())

    expect(result).toContain('Professional cinematic quality')
    expect(result).toContain('photorealistic')
    expect(result).toContain('no text or watermarks')
  })

  it('includes visual DNA prefix for multi-scene batches', () => {
    const batch: BatchContext = { totalScenes: 3, sceneIndex: 1, isHeroFrame: false }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('Consistent cinematic series')
    expect(result).toContain('same color grading')
  })

  it('includes visual DNA prefix for hero frame in multi-scene batch', () => {
    const batch: BatchContext = { totalScenes: 3, sceneIndex: 0, isHeroFrame: true }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('Consistent cinematic series')
  })

  it('omits visual DNA batch prefix for single-scene batch', () => {
    const batch: BatchContext = { totalScenes: 1, sceneIndex: 0 }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).not.toContain('Consistent cinematic series')
  })

  it('omits visual DNA batch prefix when no batch context', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())
    expect(result).not.toContain('Consistent cinematic series')
  })

  it('includes promptGuides content', () => {
    const style = makeStyleMetadata({
      promptGuides: ['Clean minimalist aesthetic', 'Generous whitespace and restraint'],
    })
    const result = buildScenePrompt(makeScene(), style)

    // First prompt guide is included in the style line
    expect(result).toContain('Clean minimalist aesthetic')
  })

  it('includes styleAxis keywords in visual DNA', () => {
    const style = makeStyleMetadata({ styleAxes: ['editorial'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Sophisticated layout')
  })

  it('includes density keywords in visual DNA', () => {
    const style = makeStyleMetadata({ densityLevel: 'rich' })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Layered detail')
  })

  it('includes energy keywords in visual DNA', () => {
    const style = makeStyleMetadata({ energyLevel: 'energetic' })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Dynamic angles')
  })

  it('includes visualElements in style line', () => {
    const style = makeStyleMetadata({ visualElements: ['bokeh', 'lens flare', 'film grain'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('bokeh')
    expect(result).toContain('lens flare')
    expect(result).toContain('film grain')
  })

  it('includes color palette with style colors', () => {
    const style = makeStyleMetadata({ colorPalette: ['#111111', '#222222'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('#111111')
  })

  it('integrates brand colors into color output', () => {
    const brand: BrandContextForPrompt = {
      colors: { primary: '#4a7c4a', secondary: '#6b9b6b', accent: '#a8d4a8' },
    }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), brand)

    expect(result).toContain('primary #4a7c4a')
    expect(result).toContain('secondary #6b9b6b')
    expect(result).toContain('accent #a8d4a8')
  })

  it('integrates brand industry into color grading', () => {
    const brand: BrandContextForPrompt = { industry: 'tech startup' }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), brand)

    expect(result).toContain('Tech-forward color grading')
  })

  it('omits color palette when colorPalette is empty and no brand colors', () => {
    const style = makeStyleMetadata({ colorPalette: [] })
    const result = buildScenePrompt(makeScene(), style, undefined)

    // Should not contain "Dominant palette"
    expect(result).not.toContain('Dominant palette')
  })

  it('includes mood keywords in visual DNA prefix', () => {
    const style = makeStyleMetadata({ moodKeywords: ['dramatic', 'moody'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('dramatic, moody')
    expect(result).toContain('mood')
  })

  it('uses imageGenerationPrompt directly when provided', () => {
    const scene = makeScene({
      imageGenerationPrompt: 'A lone figure on a windswept cliff at sunset',
    })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('A lone figure on a windswept cliff at sunset')
  })

  it('assembles content from title, visualNote, and description when no imageGenerationPrompt', () => {
    const scene: ScenePromptInput = {
      title: 'Product Launch',
      description: 'Close-up of the new device',
      visualNote: 'Studio lighting with white background',
      sceneNumber: 2,
    }
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('Product Launch')
    expect(result).toContain('Studio lighting with white background')
    expect(result).toContain('Close-up of the new device')
  })

  it('includes lighting inferred from mood and color temperature', () => {
    const style = makeStyleMetadata({
      moodKeywords: ['dramatic'],
      colorTemperature: 'warm',
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Rembrandt')
  })

  it('enforces 1500 character prompt length limit', () => {
    const longGuide = 'A'.repeat(3000)
    const style = makeStyleMetadata({
      promptGuides: [longGuide, longGuide, longGuide],
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result.length).toBeLessThanOrEqual(1500)
  })

  it('does not include instruction-heavy language', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())

    // No "CRITICAL RULE", "DO NOT", or long instruction blocks
    expect(result).not.toContain('CRITICAL RULE')
    expect(result).not.toContain('Do NOT replace')
    expect(result).not.toContain('PRIMARY subject')
    expect(result).not.toContain('CASTING')
  })

  it('does not include MOOD or TRANSITION sections', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())

    // These are no longer separate sections
    expect(result).not.toContain('MOOD:')
    expect(result).not.toContain('TRANSITION:')
  })
})

// =============================================================================
// buildScenePrompt — legacy string path
// =============================================================================

describe('buildScenePrompt with string styleContext (legacy path)', () => {
  it('includes style context content', () => {
    const result = buildScenePrompt(makeScene(), 'Bold editorial aesthetic with high contrast')

    expect(result).toContain('Bold editorial aesthetic with high contrast')
  })

  it('includes subject anchor content from scene fields', () => {
    const result = buildScenePrompt(makeScene(), 'cinematic style')

    expect(result).toContain('Opening Scene')
  })

  it('includes the imageGenerationPrompt when provided', () => {
    const scene = makeScene({
      imageGenerationPrompt: 'Product hero shot on white background',
    })
    const result = buildScenePrompt(scene, 'minimal style')

    expect(result).toContain('Product hero shot on white background')
  })

  it('assembles content from title, visualNote, and description', () => {
    const scene: ScenePromptInput = {
      title: 'Brand Reveal',
      visualNote: 'Logo animation on dark background',
      description: 'The brand emerges from darkness',
      sceneNumber: 3,
    }
    const result = buildScenePrompt(scene, 'dramatic style')

    expect(result).toContain('Brand Reveal')
    expect(result).toContain('Logo animation on dark background')
    expect(result).toContain('The brand emerges from darkness')
  })

  it('includes camera shot spec when no imageGenerationPrompt', () => {
    const scene: ScenePromptInput = {
      title: 'Aerial View',
      cameraNote: 'aerial',
    }
    const result = buildScenePrompt(scene, 'cinematic style')

    expect(result).toContain('Aerial shot')
  })

  it('includes visual DNA prefix for multi-scene batches', () => {
    const batch: BatchContext = { totalScenes: 4, sceneIndex: 2 }
    const result = buildScenePrompt(makeScene(), 'cinematic', undefined, batch)

    expect(result).toContain('Consistent cinematic series')
  })

  it('omits visual DNA prefix for single-scene batches', () => {
    const batch: BatchContext = { totalScenes: 1, sceneIndex: 0 }
    const result = buildScenePrompt(makeScene(), 'cinematic', undefined, batch)

    expect(result).not.toContain('Consistent cinematic series')
  })

  it('includes quality footer', () => {
    const result = buildScenePrompt(makeScene(), 'minimal')

    expect(result).toContain('Professional cinematic quality')
    expect(result).toContain('photorealistic')
  })

  it('enforces 1500 character prompt length limit', () => {
    const longStyle = 'S'.repeat(5000)
    const result = buildScenePrompt(makeScene(), longStyle)

    expect(result.length).toBeLessThanOrEqual(1500)
  })

  it('skips style context when it is an empty string', () => {
    const result = buildScenePrompt(makeScene(), '')

    // Empty style should not add an empty line
    expect(result).not.toContain('\n\n\n')
  })
})

// =============================================================================
// buildScenePrompt — hero frame vs non-hero frame
// =============================================================================

describe('buildScenePrompt — hero vs non-hero batch context', () => {
  it('hero frame includes batch consistency prefix in multi-scene batch', () => {
    const batch: BatchContext = { totalScenes: 5, sceneIndex: 0, isHeroFrame: true }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('Consistent cinematic series')
  })

  it('non-hero frame includes batch consistency prefix', () => {
    const batch: BatchContext = { totalScenes: 5, sceneIndex: 2, isHeroFrame: false }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('Consistent cinematic series')
    expect(result).toContain('same color grading')
  })

  it('single scene batch has no consistency prefix', () => {
    const batch: BatchContext = { totalScenes: 1, sceneIndex: 0, isHeroFrame: true }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).not.toContain('Consistent cinematic series')
  })
})

// =============================================================================
// buildScenePrompt — partial / empty StyleMetadata
// =============================================================================

describe('buildScenePrompt with partial or empty StyleMetadata', () => {
  it('handles StyleMetadata with all arrays empty and no optional fields', () => {
    const style: StyleMetadata = {
      promptGuides: [],
      colorPalette: [],
      moodKeywords: [],
      visualElements: [],
      styleAxes: [],
    }
    const result = buildScenePrompt(makeScene(), style)

    // Should still produce a valid prompt with quality footer
    expect(result).toContain('Professional cinematic quality')
    expect(result).toContain('photorealistic')
    // Should not contain style-dependent content
    expect(result).not.toContain('Dominant palette')
  })

  it('handles missing colorTemperature gracefully', () => {
    const style = makeStyleMetadata({ colorTemperature: undefined, moodKeywords: ['dramatic'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('dramatic')
    expect(result).toContain('mood')
  })

  it('handles multiple styleAxes', () => {
    const style = makeStyleMetadata({ styleAxes: ['bold', 'editorial'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('High contrast')
    expect(result).toContain('Sophisticated layout')
  })

  it('handles unknown styleAxis gracefully', () => {
    const styleNoExtras = makeStyleMetadata({
      styleAxes: ['nonexistent-axis'],
      densityLevel: undefined,
      energyLevel: undefined,
      visualElements: [],
    })
    const result = buildScenePrompt(makeScene(), styleNoExtras)

    // Should still produce a valid prompt
    expect(result).toContain('Professional cinematic quality')
  })
})

// =============================================================================
// extractSubjectAnchor
// =============================================================================

describe('extractSubjectAnchor', () => {
  it('extracts first sentence from imageGenerationPrompt', () => {
    const result = extractSubjectAnchor({
      imageGenerationPrompt:
        'Smartphone showing failed identity scan with red error overlay. Dark moody office setting.',
    })

    expect(result).toBe('Smartphone showing failed identity scan with red error overlay')
  })

  it('uses full imageGenerationPrompt when no period-space found', () => {
    const result = extractSubjectAnchor({
      imageGenerationPrompt: 'Close-up of a laptop with glowing screen',
    })

    expect(result).toBe('Close-up of a laptop with glowing screen')
  })

  it('caps at 150 characters', () => {
    const longPrompt = 'A'.repeat(200)
    const result = extractSubjectAnchor({ imageGenerationPrompt: longPrompt })

    expect(result).toHaveLength(150)
  })

  it('assembles from title + visualNote + description when no imageGenerationPrompt', () => {
    const result = extractSubjectAnchor({
      title: 'Identity Scan',
      visualNote: 'Dark office with blue glow',
      description: 'User frustrated with failed verification',
    })

    expect(result).toBe(
      'Identity Scan — Dark office with blue glow — User frustrated with failed verification'
    )
  })

  it('returns undefined when no scene fields are provided', () => {
    const result = extractSubjectAnchor({})
    expect(result).toBeUndefined()
  })

  it('uses only available fields when some are missing', () => {
    const result = extractSubjectAnchor({ title: 'Product Launch' })
    expect(result).toBe('Product Launch')
  })
})
