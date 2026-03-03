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
// buildScenePrompt — rich StyleMetadata path
// =============================================================================

describe('buildScenePrompt with StyleMetadata (rich path)', () => {
  it('includes all sections in the output', () => {
    const scene = makeScene()
    const style = makeStyleMetadata()
    const brand: BrandContextForPrompt = {
      colors: { primary: '#4a7c4a' },
      industry: 'wellness',
    }
    const batch: BatchContext = { totalScenes: 3, sceneIndex: 0, isHeroFrame: true }

    const result = buildScenePrompt(scene, style, brand, batch)

    // 1. SUBJECT — front-loaded narrative anchor
    expect(result).toContain('SUBJECT')
    expect(result).toContain('PRIMARY subject')
    // 2. SCENE CONTENT — moved before style
    expect(result).toContain('SCENE CONTENT')
    // 3. CASTING
    expect(result).toContain('CASTING')
    // 4. No VISUAL CONTINUITY for hero frame
    expect(result).not.toContain('VISUAL CONTINUITY')
    // 5. STYLE DIRECTION — as modifier
    expect(result).toContain('STYLE DIRECTION')
    expect(result).toContain('AS A MODIFIER')
    // 6. STYLE CHARACTER
    expect(result).toContain('STYLE CHARACTER')
    // 7. COLOR PALETTE
    expect(result).toContain('COLOR PALETTE')
    // 8. ATMOSPHERE
    expect(result).toContain('ATMOSPHERE')
    // 9. CAMERA
    expect(result).toContain('CAMERA')
    // 10. LIGHTING
    expect(result).toContain('LIGHTING')
    // 11. MOOD
    expect(result).toContain('MOOD')
    // 12. TRANSITION
    expect(result).toContain('TRANSITION')
    // 13. QUALITY DIRECTIVE
    expect(result).toContain('QUALITY DIRECTIVE')
  })

  it('places SUBJECT and SCENE CONTENT before STYLE DIRECTION', () => {
    const scene = makeScene({ imageGenerationPrompt: 'A smartphone showing identity scan' })
    const style = makeStyleMetadata()
    const result = buildScenePrompt(scene, style)

    const subjectPos = result.indexOf('SUBJECT:')
    const sceneContentPos = result.indexOf('SCENE CONTENT:')
    const stylePos = result.indexOf('STYLE DIRECTION:')

    expect(subjectPos).toBeLessThan(sceneContentPos)
    expect(sceneContentPos).toBeLessThan(stylePos)
  })

  it('includes VISUAL CONTINUITY for non-hero batch frames', () => {
    const batch: BatchContext = { totalScenes: 3, sceneIndex: 1, isHeroFrame: false }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('VISUAL CONTINUITY')
    expect(result).toContain('scene 2 of 3')
    expect(result).toContain('hero frame (scene 1)')
  })

  it('does NOT include VISUAL CONTINUITY for single-scene batch', () => {
    const batch: BatchContext = { totalScenes: 1, sceneIndex: 0 }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).not.toContain('VISUAL CONTINUITY')
  })

  it('does NOT include VISUAL CONTINUITY when no batch context provided', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())
    expect(result).not.toContain('VISUAL CONTINUITY')
  })

  it('includes promptGuides in STYLE DIRECTION', () => {
    const style = makeStyleMetadata({
      promptGuides: ['Clean minimalist aesthetic', 'Generous whitespace and restraint'],
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Clean minimalist aesthetic')
    expect(result).toContain('Generous whitespace and restraint')
  })

  it('omits STYLE DIRECTION when promptGuides is empty', () => {
    const style = makeStyleMetadata({ promptGuides: [] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).not.toContain('STYLE DIRECTION')
  })

  it('includes styleAxis in STYLE CHARACTER', () => {
    const style = makeStyleMetadata({ styleAxes: ['editorial'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('STYLE CHARACTER')
    expect(result).toContain('Sophisticated layout')
  })

  it('includes density in STYLE CHARACTER', () => {
    const style = makeStyleMetadata({ densityLevel: 'rich' })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Layered detail')
  })

  it('includes energy in STYLE CHARACTER', () => {
    const style = makeStyleMetadata({ energyLevel: 'energetic' })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Dynamic angles')
  })

  it('includes visualElements in STYLE CHARACTER', () => {
    const style = makeStyleMetadata({ visualElements: ['bokeh', 'lens flare', 'film grain'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Visual approach: bokeh, lens flare, film grain')
  })

  it('omits STYLE CHARACTER when no character fields are populated', () => {
    const style = makeStyleMetadata({
      styleAxes: [],
      densityLevel: undefined,
      energyLevel: undefined,
      visualElements: [],
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).not.toContain('STYLE CHARACTER')
  })

  it('includes COLOR PALETTE with style colors', () => {
    const style = makeStyleMetadata({ colorPalette: ['#111111', '#222222'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('COLOR PALETTE')
    expect(result).toContain('#111111')
  })

  it('integrates brand colors into COLOR PALETTE', () => {
    const brand: BrandContextForPrompt = {
      colors: { primary: '#4a7c4a', secondary: '#6b9b6b', accent: '#a8d4a8' },
    }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), brand)

    expect(result).toContain('primary #4a7c4a')
    expect(result).toContain('secondary #6b9b6b')
    expect(result).toContain('accent #a8d4a8')
  })

  it('integrates brand industry into COLOR PALETTE color grading note', () => {
    const brand: BrandContextForPrompt = { industry: 'tech startup' }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), brand)

    expect(result).toContain('Tech-forward color grading')
  })

  it('omits COLOR PALETTE when colorPalette is empty and no brand colors', () => {
    const style = makeStyleMetadata({ colorPalette: [] })
    const result = buildScenePrompt(makeScene(), style, undefined)

    expect(result).not.toContain('COLOR PALETTE')
  })

  it('includes ATMOSPHERE with mood keywords', () => {
    const style = makeStyleMetadata({ moodKeywords: ['dramatic', 'moody'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('ATMOSPHERE')
    expect(result).toContain('dramatic, moody')
  })

  it('includes color temperature in ATMOSPHERE when present', () => {
    const style = makeStyleMetadata({ colorTemperature: 'warm', moodKeywords: ['romantic'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('Warm-toned atmosphere')
  })

  it('omits ATMOSPHERE when no mood keywords', () => {
    const style = makeStyleMetadata({ moodKeywords: [] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).not.toContain('ATMOSPHERE')
  })

  it('uses imageGenerationPrompt directly in SCENE CONTENT when provided', () => {
    const scene = makeScene({
      imageGenerationPrompt: 'A lone figure on a windswept cliff at sunset',
    })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('SCENE CONTENT: A lone figure on a windswept cliff at sunset')
    // Should NOT include the title-based assembly
    expect(result).not.toContain('Scene 1: Opening Scene')
  })

  it('assembles SCENE CONTENT from title, visualNote, and description when no imageGenerationPrompt', () => {
    const scene: ScenePromptInput = {
      title: 'Product Launch',
      description: 'Close-up of the new device',
      visualNote: 'Studio lighting with white background',
      sceneNumber: 2,
    }
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('Scene 2: Product Launch')
    expect(result).toContain('Studio lighting with white background')
    expect(result).toContain('Close-up of the new device')
  })

  it('prefixes scene title without sceneNumber when sceneNumber is absent', () => {
    const scene: ScenePromptInput = { title: 'Hero Shot' }
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('Scene: Hero Shot')
  })

  it('omits SCENE CONTENT when no scene fields are provided', () => {
    const scene: ScenePromptInput = {}
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).not.toContain('SCENE CONTENT')
  })

  it('includes enriched CAMERA section', () => {
    const scene = makeScene({ cameraNote: 'close up' })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('CAMERA:')
    expect(result).toContain('Close-up (CU)')
  })

  it('includes LIGHTING inferred from mood and color temperature', () => {
    const style = makeStyleMetadata({
      moodKeywords: ['dramatic'],
      colorTemperature: 'warm',
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('LIGHTING:')
    expect(result).toContain('Rembrandt')
  })

  it('includes MOOD section with voiceover text', () => {
    const scene = makeScene({ voiceover: 'In the stillness, everything is possible' })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('MOOD:')
    expect(result).toContain('In the stillness, everything is possible')
    expect(result).toContain('Do NOT render any words, letters, or readable text')
  })

  it('omits MOOD section when no voiceover', () => {
    const scene = makeScene({ voiceover: undefined })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).not.toContain('MOOD:')
  })

  it('includes enriched TRANSITION', () => {
    const scene = makeScene({ transition: 'dissolve' })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).toContain('TRANSITION:')
    expect(result).toContain('Dissolve transition')
  })

  it('omits TRANSITION when no transition provided', () => {
    const scene = makeScene({ transition: undefined })
    const result = buildScenePrompt(scene, makeStyleMetadata())

    expect(result).not.toContain('TRANSITION:')
  })

  it('always includes QUALITY DIRECTIVE', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())

    expect(result).toContain('QUALITY DIRECTIVE')
    expect(result).toContain('ARRI Alexa 35')
    expect(result).toContain('photorealistic')
    expect(result).toContain('no text, watermarks')
  })

  it('enforces 8000 character prompt length limit', () => {
    const longGuide = 'A'.repeat(3000)
    const style = makeStyleMetadata({
      promptGuides: [longGuide, longGuide, longGuide],
    })
    const result = buildScenePrompt(makeScene(), style)

    expect(result.length).toBeLessThanOrEqual(8000)
  })

  it('sections are separated by double newlines', () => {
    const result = buildScenePrompt(makeScene(), makeStyleMetadata())

    expect(result).toContain('\n\n')
  })
})

// =============================================================================
// buildScenePrompt — legacy string path
// =============================================================================

describe('buildScenePrompt with string styleContext (legacy path)', () => {
  it('includes STYLE DIRECTION from the string as modifier', () => {
    const result = buildScenePrompt(makeScene(), 'Bold editorial aesthetic with high contrast')

    expect(result).toContain('STYLE DIRECTION: Apply as modifier to the subject above')
    expect(result).toContain('Bold editorial aesthetic with high contrast')
  })

  it('includes SUBJECT anchor from scene fields', () => {
    const result = buildScenePrompt(makeScene(), 'cinematic style')

    expect(result).toContain('SUBJECT:')
    expect(result).toContain('Opening Scene')
    expect(result).toContain('PRIMARY subject')
  })

  it('includes the imageGenerationPrompt in SCENE CONTENT when provided', () => {
    const scene = makeScene({
      imageGenerationPrompt: 'Product hero shot on white background',
    })
    const result = buildScenePrompt(scene, 'minimal style')

    expect(result).toContain('SCENE CONTENT: Product hero shot on white background')
    // The scene title should NOT appear because imageGenerationPrompt takes over
    expect(result).not.toContain('Scene 1: Opening Scene')
  })

  it('assembles content from title, visualNote, and description', () => {
    const scene: ScenePromptInput = {
      title: 'Brand Reveal',
      visualNote: 'Logo animation on dark background',
      description: 'The brand emerges from darkness',
      sceneNumber: 3,
    }
    const result = buildScenePrompt(scene, 'dramatic style')

    expect(result).toContain('Scene 3: Brand Reveal')
    expect(result).toContain('Logo animation on dark background')
    expect(result).toContain('The brand emerges from darkness')
  })

  it('includes camera shot in the output', () => {
    const scene = makeScene({ cameraNote: 'aerial' })
    const result = buildScenePrompt(scene, 'cinematic style')

    expect(result).toContain('Camera:')
    expect(result).toContain('Aerial shot')
  })

  it('includes voiceover mood context', () => {
    const scene = makeScene({ voiceover: 'The world is yours' })
    const result = buildScenePrompt(scene, 'epic style')

    expect(result).toContain('Mood context')
    expect(result).toContain('The world is yours')
    expect(result).toContain('do NOT render as text')
  })

  it('omits voiceover section when no voiceover provided', () => {
    const scene = makeScene({ voiceover: undefined })
    const result = buildScenePrompt(scene, 'minimal style')

    expect(result).not.toContain('Mood context')
  })

  it('includes enriched transition', () => {
    const scene = makeScene({ transition: 'fade' })
    const result = buildScenePrompt(scene, 'soft style')

    expect(result).toContain('Transition:')
    expect(result).toContain('Fade transition')
  })

  it('omits transition when not provided', () => {
    const scene = makeScene({ transition: undefined })
    const result = buildScenePrompt(scene, 'style')

    expect(result).not.toContain('Transition:')
  })

  it('includes VISUAL CONSISTENCY for multi-scene batches', () => {
    const batch: BatchContext = { totalScenes: 4, sceneIndex: 2 }
    const result = buildScenePrompt(makeScene(), 'cinematic', undefined, batch)

    expect(result).toContain('VISUAL CONSISTENCY')
    expect(result).toContain('scene 3 of 4')
  })

  it('omits VISUAL CONSISTENCY for single-scene batches', () => {
    const batch: BatchContext = { totalScenes: 1, sceneIndex: 0 }
    const result = buildScenePrompt(makeScene(), 'cinematic', undefined, batch)

    expect(result).not.toContain('VISUAL CONSISTENCY')
  })

  it('includes ARRI quality directive', () => {
    const result = buildScenePrompt(makeScene(), 'minimal')

    expect(result).toContain('ARRI Alexa 35')
    expect(result).toContain('photorealistic')
  })

  it('enforces 8000 character prompt length limit', () => {
    const longStyle = 'S'.repeat(5000)
    const result = buildScenePrompt(makeScene(), longStyle)

    expect(result.length).toBeLessThanOrEqual(8000)
  })

  it('skips STYLE DIRECTION when styleContext is an empty string', () => {
    const result = buildScenePrompt(makeScene(), '')

    expect(result).not.toContain('STYLE DIRECTION')
  })
})

// =============================================================================
// buildScenePrompt — hero frame vs non-hero frame
// =============================================================================

describe('buildScenePrompt — hero vs non-hero batch context', () => {
  it('hero frame does NOT add VISUAL CONTINUITY even in multi-scene batch', () => {
    const batch: BatchContext = { totalScenes: 5, sceneIndex: 0, isHeroFrame: true }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).not.toContain('VISUAL CONTINUITY')
  })

  it('non-hero frame at sceneIndex 2 references scene 3 of N', () => {
    const batch: BatchContext = { totalScenes: 5, sceneIndex: 2, isHeroFrame: false }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('scene 3 of 5')
  })

  it('non-hero frame maintains palette consistency but emphasizes scene distinction', () => {
    const batch: BatchContext = { totalScenes: 3, sceneIndex: 1, isHeroFrame: false }
    const result = buildScenePrompt(makeScene(), makeStyleMetadata(), undefined, batch)

    expect(result).toContain('hero frame (scene 1)')
    expect(result).toContain('color palette')
    expect(result).toContain('distinctly different composition')
    expect(result).toContain('SCENE DISTINCTION')
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

    // Should still produce a valid prompt with CAMERA and QUALITY DIRECTIVE
    expect(result).toContain('CAMERA:')
    expect(result).toContain('QUALITY DIRECTIVE')
    // Should omit sections that have no data
    expect(result).not.toContain('STYLE DIRECTION')
    expect(result).not.toContain('STYLE CHARACTER')
    expect(result).not.toContain('COLOR PALETTE')
    expect(result).not.toContain('ATMOSPHERE')
  })

  it('handles missing colorTemperature gracefully in ATMOSPHERE', () => {
    const style = makeStyleMetadata({ colorTemperature: undefined, moodKeywords: ['dramatic'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('ATMOSPHERE: dramatic mood.')
    // No temperature phrase
    expect(result).not.toContain('toned atmosphere')
  })

  it('handles multiple styleAxes', () => {
    const style = makeStyleMetadata({ styleAxes: ['bold', 'editorial'] })
    const result = buildScenePrompt(makeScene(), style)

    expect(result).toContain('High contrast')
    expect(result).toContain('Sophisticated layout')
  })

  it('handles unknown styleAxis gracefully (does not add to character parts)', () => {
    // If no other character parts exist, STYLE CHARACTER should be omitted
    const styleNoExtras = makeStyleMetadata({
      styleAxes: ['nonexistent-axis'],
      densityLevel: undefined,
      energyLevel: undefined,
      visualElements: [],
    })
    const result = buildScenePrompt(makeScene(), styleNoExtras)

    expect(result).not.toContain('STYLE CHARACTER')
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
