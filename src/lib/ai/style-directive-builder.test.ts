import { describe, it, expect } from 'vitest'
import { buildStyleDirective } from './style-directive-builder'

// =============================================================================
// buildStyleDirective
// =============================================================================

describe('buildStyleDirective', () => {
  describe('STYLE section from promptGuide', () => {
    it('includes STYLE section when promptGuide is provided', () => {
      const result = buildStyleDirective({
        promptGuide: 'Clean minimalist aesthetic with generous whitespace',
      })

      expect(result).toContain('STYLE:')
      expect(result).toContain('Clean minimalist aesthetic with generous whitespace')
    })

    it('omits STYLE section when promptGuide is null', () => {
      const result = buildStyleDirective({ promptGuide: null })

      expect(result).not.toContain('STYLE:')
    })

    it('omits STYLE section when promptGuide is undefined', () => {
      const result = buildStyleDirective({})

      expect(result).not.toContain('STYLE:')
    })

    it('omits STYLE section when promptGuide is empty string', () => {
      const result = buildStyleDirective({ promptGuide: '' })

      expect(result).not.toContain('STYLE:')
    })
  })

  describe('CHARACTER section', () => {
    it('includes CHARACTER section with styleAxis', () => {
      const result = buildStyleDirective({ styleAxis: 'bold' })

      expect(result).toContain('CHARACTER:')
      expect(result).toContain('High contrast')
      expect(result).toContain('saturated colors')
    })

    it('includes CHARACTER section with densityLevel', () => {
      const result = buildStyleDirective({ densityLevel: 'minimal' })

      expect(result).toContain('CHARACTER:')
      expect(result).toContain('Sparse composition')
    })

    it('includes CHARACTER section with energyLevel', () => {
      const result = buildStyleDirective({ energyLevel: 'energetic' })

      expect(result).toContain('CHARACTER:')
      expect(result).toContain('Dynamic angles')
      expect(result).toContain('kinetic energy')
    })

    it('includes CHARACTER section with visualElements', () => {
      const result = buildStyleDirective({
        visualElements: ['bokeh', 'lens flare'],
      })

      expect(result).toContain('CHARACTER:')
      expect(result).toContain('Visual approach: bokeh, lens flare')
    })

    it('combines all CHARACTER fields when all are provided', () => {
      const result = buildStyleDirective({
        styleAxis: 'editorial',
        densityLevel: 'rich',
        energyLevel: 'calm',
        visualElements: ['film grain'],
      })

      expect(result).toContain('CHARACTER:')
      expect(result).toContain('Sophisticated layout')
      expect(result).toContain('Layered detail')
      expect(result).toContain('Static, contemplative')
      expect(result).toContain('Visual approach: film grain')
    })

    it('omits CHARACTER section when no character fields are provided', () => {
      const result = buildStyleDirective({
        promptGuide: 'Minimal style',
        colorSamples: ['#111'],
      })

      expect(result).not.toContain('CHARACTER:')
    })

    it('omits CHARACTER section when styleAxis maps to empty string', () => {
      const result = buildStyleDirective({
        styleAxis: 'nonexistent-axis',
      })

      // No density, energy, or visual elements either
      expect(result).not.toContain('CHARACTER:')
    })

    it('omits CHARACTER section when visualElements is an empty array', () => {
      const result = buildStyleDirective({
        visualElements: [],
      })

      expect(result).not.toContain('CHARACTER:')
    })

    it('omits CHARACTER section when visualElements is null', () => {
      const result = buildStyleDirective({
        visualElements: null,
      })

      expect(result).not.toContain('CHARACTER:')
    })
  })

  describe('PALETTE section', () => {
    it('includes PALETTE section with color samples', () => {
      const result = buildStyleDirective({
        colorSamples: ['#1a1a2e', '#16213e', '#0f3460'],
      })

      expect(result).toContain('PALETTE:')
      expect(result).toContain('#1a1a2e')
      expect(result).toContain('#16213e')
      expect(result).toContain('#0f3460')
    })

    it('limits palette to first 6 color samples', () => {
      const colors = ['#111', '#222', '#333', '#444', '#555', '#666', '#777', '#888']
      const result = buildStyleDirective({ colorSamples: colors })

      expect(result).toContain('#666')
      expect(result).not.toContain('#777')
    })

    it('omits PALETTE section when colorSamples is null', () => {
      const result = buildStyleDirective({ colorSamples: null })

      expect(result).not.toContain('PALETTE:')
    })

    it('omits PALETTE section when colorSamples is empty array', () => {
      const result = buildStyleDirective({ colorSamples: [] })

      expect(result).not.toContain('PALETTE:')
    })
  })

  describe('MOOD and LIGHTING sections', () => {
    it('includes MOOD section when moodKeywords are provided', () => {
      const result = buildStyleDirective({
        moodKeywords: ['dramatic', 'cinematic'],
      })

      expect(result).toContain('MOOD:')
      expect(result).toContain('dramatic, cinematic')
    })

    it('includes LIGHTING section inferred from moodKeywords', () => {
      const result = buildStyleDirective({
        moodKeywords: ['dramatic'],
      })

      expect(result).toContain('LIGHTING:')
      expect(result).toContain('Rembrandt')
    })

    it('includes LIGHTING section inferred from colorTemperature alone when no moodKeywords', () => {
      const result = buildStyleDirective({
        colorTemperature: 'warm',
      })

      expect(result).toContain('LIGHTING:')
      expect(result).toContain('3200K')
      // No MOOD section since no moodKeywords
      expect(result).not.toContain('MOOD:')
    })

    it('combines colorTemperature with moodKeywords in LIGHTING', () => {
      const result = buildStyleDirective({
        moodKeywords: ['elegant'],
        colorTemperature: 'warm',
      })

      expect(result).toContain('MOOD: elegant')
      expect(result).toContain('LIGHTING:')
      expect(result).toContain('3200K')
      expect(result).toContain('Soft diffused lighting')
    })

    it('omits MOOD and LIGHTING when no moodKeywords and no colorTemperature', () => {
      const result = buildStyleDirective({
        promptGuide: 'Simple style',
      })

      expect(result).not.toContain('MOOD:')
      expect(result).not.toContain('LIGHTING:')
    })

    it('omits MOOD section but still adds LIGHTING from colorTemperature when moodKeywords is empty', () => {
      const result = buildStyleDirective({
        moodKeywords: [],
        colorTemperature: 'cool',
      })

      expect(result).not.toContain('MOOD:')
      expect(result).toContain('LIGHTING:')
      expect(result).toContain('5600K')
    })

    it('omits MOOD section but still adds LIGHTING from colorTemperature when moodKeywords is null', () => {
      const result = buildStyleDirective({
        moodKeywords: null,
        colorTemperature: 'neutral',
      })

      expect(result).not.toContain('MOOD:')
      expect(result).toContain('LIGHTING:')
      expect(result).toContain('4500K')
    })
  })

  describe('full fields', () => {
    it('produces output with all five sections when all fields are provided', () => {
      const result = buildStyleDirective({
        promptGuide: 'Cinematic editorial style with natural light',
        styleAxis: 'editorial',
        densityLevel: 'balanced',
        energyLevel: 'calm',
        visualElements: ['shallow DOF', 'anamorphic lens flare'],
        colorSamples: ['#1a1a2e', '#ffffff'],
        moodKeywords: ['elegant', 'sophisticated'],
        colorTemperature: 'cool',
      })

      expect(result).toContain('STYLE:')
      expect(result).toContain('CHARACTER:')
      expect(result).toContain('PALETTE:')
      expect(result).toContain('MOOD:')
      expect(result).toContain('LIGHTING:')
    })

    it('joins sections with newlines', () => {
      const result = buildStyleDirective({
        promptGuide: 'Minimal',
        colorSamples: ['#fff'],
      })

      expect(result).toContain('\n')
      const sections = result.split('\n').filter(Boolean)
      expect(sections.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('null / empty / undefined inputs', () => {
    it('returns empty string when all fields are absent', () => {
      const result = buildStyleDirective({})

      expect(result).toBe('')
    })

    it('returns empty string when all fields are explicitly null', () => {
      const result = buildStyleDirective({
        promptGuide: null,
        colorSamples: null,
        moodKeywords: null,
        visualElements: null,
        styleAxis: null,
        colorTemperature: null,
        energyLevel: null,
        densityLevel: null,
      })

      expect(result).toBe('')
    })

    it('handles single moodKeyword correctly', () => {
      const result = buildStyleDirective({ moodKeywords: ['moody'] })

      expect(result).toContain('MOOD: moody')
      expect(result).toContain('LIGHTING:')
      expect(result).toContain('Low-key lighting')
    })
  })

  describe('styleAxis edge cases', () => {
    it('handles "minimal" styleAxis', () => {
      const result = buildStyleDirective({ styleAxis: 'minimal' })
      expect(result).toContain('uncluttered')
    })

    it('handles "organic" styleAxis', () => {
      const result = buildStyleDirective({ styleAxis: 'organic' })
      expect(result).toContain('Natural textures')
    })

    it('handles "tech" styleAxis', () => {
      const result = buildStyleDirective({ styleAxis: 'tech' })
      expect(result).toContain('Digital-forward')
    })

    it('handles "premium" styleAxis', () => {
      const result = buildStyleDirective({ styleAxis: 'premium' })
      expect(result).toContain('Luxurious')
    })
  })
})
