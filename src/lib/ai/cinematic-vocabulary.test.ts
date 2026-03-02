import { describe, it, expect } from 'vitest'
import {
  inferShotSpecs,
  inferLighting,
  buildColorGrading,
  mapStyleAxis,
  mapDensity,
  mapEnergy,
  enrichTransition,
} from './cinematic-vocabulary'

// =============================================================================
// inferShotSpecs
// =============================================================================

describe('inferShotSpecs', () => {
  describe('close-up variants', () => {
    it('matches "extreme close" keyword', () => {
      const result = inferShotSpecs('extreme close shot')
      expect(result).toContain('Extreme close-up')
      expect(result).toContain('100mm')
    })

    it('matches "close up" with space', () => {
      const result = inferShotSpecs('close up of the product')
      expect(result).toContain('Close-up (CU)')
      expect(result).toContain('85mm')
    })

    it('matches "close-up" with hyphen', () => {
      const result = inferShotSpecs('close-up shot')
      expect(result).toContain('Close-up (CU)')
    })

    it('matches "closeup" single word', () => {
      const result = inferShotSpecs('closeup')
      expect(result).toContain('Close-up (CU)')
    })
  })

  describe('medium shots', () => {
    it('matches "medium close"', () => {
      const result = inferShotSpecs('medium close framing')
      expect(result).toContain('Medium close-up (MCU)')
    })

    it('matches "medium" shot', () => {
      const result = inferShotSpecs('medium shot')
      expect(result).toContain('Medium shot (MS)')
      expect(result).toContain('35mm')
    })

    it('matches "medium wide" — returns "medium" result because "medium" key appears first in map', () => {
      // The CAMERA_SHOT_MAP iterates in insertion order: "medium" is registered before
      // "medium wide", so the string "medium wide shot" matches "medium" first.
      const result = inferShotSpecs('medium wide shot')
      expect(result).toContain('Medium shot (MS)')
    })
  })

  describe('wide shots', () => {
    it('matches "wide" shot', () => {
      const result = inferShotSpecs('wide establishing')
      expect(result).toContain('Wide shot (WS)')
    })

    it('matches "wide angle" — returns "wide" result because "wide" key appears first in map', () => {
      // The CAMERA_SHOT_MAP iterates in insertion order: "wide" is registered before
      // "wide angle", so the string "wide angle lens" matches "wide" first.
      const result = inferShotSpecs('wide angle lens')
      expect(result).toContain('Wide shot (WS)')
      expect(result).toContain('24mm')
    })

    it('matches "extreme wide" — returns "wide" result because "wide" key appears first in map', () => {
      // "wide" is inserted before "extreme wide", so "extreme wide shot" matches "wide" first.
      const result = inferShotSpecs('extreme wide shot of the landscape')
      expect(result).toContain('Wide shot (WS)')
    })

    it('matches "establishing"', () => {
      const result = inferShotSpecs('establishing shot')
      expect(result).toContain('Establishing shot')
    })

    it('matches "panoramic"', () => {
      const result = inferShotSpecs('panoramic view')
      expect(result).toContain('Panoramic vista')
    })
  })

  describe('aerial and specialized shots', () => {
    it('matches "aerial"', () => {
      const result = inferShotSpecs('aerial drone shot')
      expect(result).toContain('Aerial shot')
      expect(result).toContain('drone')
    })

    it('matches "birds eye"', () => {
      const result = inferShotSpecs('birds eye view')
      expect(result).toContain("Bird's eye view")
    })

    it('matches "overhead"', () => {
      const result = inferShotSpecs('overhead angle')
      expect(result).toContain('Overhead shot')
    })

    it('matches "low angle"', () => {
      const result = inferShotSpecs('low angle looking up')
      expect(result).toContain('Low-angle shot')
    })

    it('matches "high angle"', () => {
      const result = inferShotSpecs('high angle looking down')
      expect(result).toContain('High-angle shot')
    })

    it('matches "dutch" angle', () => {
      const result = inferShotSpecs('dutch angle for tension')
      expect(result).toContain('Dutch angle')
    })

    it('matches "over the shoulder"', () => {
      const result = inferShotSpecs('over the shoulder perspective')
      expect(result).toContain('Over-the-shoulder (OTS)')
    })

    it('matches "pov"', () => {
      const result = inferShotSpecs('pov shot')
      expect(result).toContain('Point-of-view (POV)')
    })
  })

  describe('movement shots', () => {
    it('matches "tracking"', () => {
      const result = inferShotSpecs('tracking shot alongside subject')
      expect(result).toContain('Tracking shot')
    })

    it('matches "dolly"', () => {
      const result = inferShotSpecs('dolly in')
      expect(result).toContain('Dolly-in shot')
    })

    it('matches "crane"', () => {
      const result = inferShotSpecs('crane movement')
      expect(result).toContain('Crane shot')
    })

    it('matches "steadicam"', () => {
      const result = inferShotSpecs('steadicam follow')
      expect(result).toContain('Steadicam')
    })

    it('matches "handheld"', () => {
      const result = inferShotSpecs('handheld documentary style')
      expect(result).toContain('Handheld shot')
      expect(result).toContain('documentary')
    })

    it('matches "static"', () => {
      const result = inferShotSpecs('static locked off frame')
      expect(result).toContain('Static locked-off frame')
    })

    it('matches "slow motion"', () => {
      const result = inferShotSpecs('slow motion capture')
      expect(result).toContain('Slow-motion')
      expect(result).toContain('120fps')
    })

    it('matches "time lapse"', () => {
      const result = inferShotSpecs('time lapse sequence')
      expect(result).toContain('Time-lapse')
    })
  })

  describe('visualNote fallback search', () => {
    it('searches visualNote when cameraNote has no match', () => {
      const result = inferShotSpecs(undefined, 'aerial drone perspective')
      expect(result).toContain('Aerial shot')
    })

    it('combines cameraNote and visualNote for matching', () => {
      // cameraNote has no match, but visualNote contains "close up"
      const result = inferShotSpecs('hold steady', 'close up of hands')
      expect(result).toContain('Close-up (CU)')
    })
  })

  describe('default behavior', () => {
    it('returns default medium shot when no keyword matches and no cameraNote', () => {
      const result = inferShotSpecs(undefined, undefined)
      expect(result).toContain('Medium shot (MS)')
      expect(result).toContain('35mm')
      expect(result).toContain('balanced cinematic composition')
    })

    it('returns prefixed cameraNote when no keyword matches but cameraNote is provided', () => {
      const result = inferShotSpecs('unusual custom framing')
      expect(result).toBe('Camera: unusual custom framing')
    })

    it('is case-insensitive', () => {
      const result = inferShotSpecs('AERIAL SHOT')
      expect(result).toContain('Aerial shot')
    })
  })
})

// =============================================================================
// inferLighting
// =============================================================================

describe('inferLighting', () => {
  describe('mood keyword matching', () => {
    it('maps "dramatic" to Rembrandt lighting', () => {
      const result = inferLighting({ moodKeywords: ['dramatic'] })
      expect(result).toContain('Rembrandt')
      expect(result).toContain('deep shadows')
    })

    it('maps "moody" to low-key lighting', () => {
      const result = inferLighting({ moodKeywords: ['moody'] })
      expect(result).toContain('Low-key lighting')
      expect(result).toContain('atmospheric haze')
    })

    it('maps "mysterious" to chiaroscuro', () => {
      const result = inferLighting({ moodKeywords: ['mysterious'] })
      expect(result).toContain('Chiaroscuro')
    })

    it('maps "dark" to noir lighting', () => {
      const result = inferLighting({ moodKeywords: ['dark'] })
      expect(result).toContain('Noir lighting')
    })

    it('maps "bright" to high-key lighting', () => {
      const result = inferLighting({ moodKeywords: ['bright'] })
      expect(result).toContain('High-key lighting')
      expect(result).toContain('minimal shadows')
    })

    it('maps "cheerful" to bright natural lighting', () => {
      const result = inferLighting({ moodKeywords: ['cheerful'] })
      expect(result).toContain('Bright natural lighting')
    })

    it('maps "playful" to colorful accent lighting', () => {
      const result = inferLighting({ moodKeywords: ['playful'] })
      expect(result).toContain('Colorful accent lighting')
    })

    it('maps "elegant" to soft diffused lighting', () => {
      const result = inferLighting({ moodKeywords: ['elegant'] })
      expect(result).toContain('Soft diffused lighting')
    })

    it('maps "luxurious" to golden lighting', () => {
      const result = inferLighting({ moodKeywords: ['luxurious'] })
      expect(result).toContain('golden lighting')
    })

    it('maps "professional" to three-point lighting', () => {
      const result = inferLighting({ moodKeywords: ['professional'] })
      expect(result).toContain('three-point lighting')
    })

    it('maps "cinematic" to motivated sources', () => {
      const result = inferLighting({ moodKeywords: ['cinematic'] })
      expect(result).toContain('motivated sources')
    })

    it('maps "energetic" to dynamic rim lighting', () => {
      const result = inferLighting({ moodKeywords: ['energetic'] })
      expect(result).toContain('Dynamic rim lighting')
    })

    it('maps "calm" to soft ambient lighting', () => {
      const result = inferLighting({ moodKeywords: ['calm'] })
      expect(result).toContain('Soft ambient lighting')
    })

    it('maps "romantic" to warm candle-like glow', () => {
      const result = inferLighting({ moodKeywords: ['romantic'] })
      expect(result).toContain('candle-like glow')
    })

    it('maps "futuristic" to neon edge lighting', () => {
      const result = inferLighting({ moodKeywords: ['futuristic'] })
      expect(result).toContain('Neon edge lighting')
    })

    it('maps "vintage" to tungsten-style lighting', () => {
      const result = inferLighting({ moodKeywords: ['vintage'] })
      expect(result).toContain('tungsten-style lighting')
    })

    it('maps "epic" to god-ray lighting', () => {
      const result = inferLighting({ moodKeywords: ['epic'] })
      expect(result).toContain('God-ray lighting')
    })

    it('maps "intimate" to soft practical lighting', () => {
      const result = inferLighting({ moodKeywords: ['intimate'] })
      expect(result).toContain('Soft practical lighting')
    })

    it('takes only the first matching keyword from the array', () => {
      const result = inferLighting({ moodKeywords: ['dramatic', 'bright'] })
      expect(result).toContain('Rembrandt')
      // Should not contain both
      expect(result).not.toContain('High-key')
    })

    it('is case-insensitive for mood keywords', () => {
      const result = inferLighting({ moodKeywords: ['DRAMATIC'] })
      expect(result).toContain('Rembrandt')
    })
  })

  describe('color temperature mapping', () => {
    it('maps "warm" color temperature', () => {
      const result = inferLighting({ colorTemperature: 'warm' })
      expect(result).toContain('3200K')
      expect(result).toContain('golden highlights')
    })

    it('maps "cool" color temperature', () => {
      const result = inferLighting({ colorTemperature: 'cool' })
      expect(result).toContain('5600K')
      expect(result).toContain('blue-tinted shadows')
    })

    it('maps "neutral" color temperature', () => {
      const result = inferLighting({ colorTemperature: 'neutral' })
      expect(result).toContain('4500K')
      expect(result).toContain('true-to-life')
    })

    it('combines color temperature and mood keyword with a period separator', () => {
      const result = inferLighting({ colorTemperature: 'warm', moodKeywords: ['dramatic'] })
      expect(result).toContain('3200K')
      expect(result).toContain('Rembrandt')
      expect(result).toContain('. ')
    })
  })

  describe('voiceover sentiment inference', () => {
    it('infers energetic lighting from excit* in voiceover', () => {
      const result = inferLighting({ voiceover: 'Feel the excitement and rush' })
      expect(result).toContain('Dynamic lighting')
      expect(result).toContain('energetic rim highlights')
    })

    it('infers energetic lighting from "energy" in voiceover', () => {
      const result = inferLighting({ voiceover: 'Pure energy in every move' })
      expect(result).toContain('Dynamic lighting')
    })

    it('infers energetic lighting from "bold" in voiceover', () => {
      const result = inferLighting({ voiceover: 'Be bold, be daring' })
      expect(result).toContain('Dynamic lighting')
    })

    it('infers calm lighting from "calm" in voiceover', () => {
      const result = inferLighting({ voiceover: 'Find calm in the stillness' })
      expect(result).toContain('Soft ambient lighting')
      expect(result).toContain('tranquil')
    })

    it('infers calm lighting from "peace" in voiceover', () => {
      const result = inferLighting({ voiceover: 'Inner peace flows through you' })
      expect(result).toContain('Soft ambient lighting')
    })

    it('infers calm lighting from "serene" in voiceover', () => {
      const result = inferLighting({ voiceover: 'A serene morning awaits' })
      expect(result).toContain('Soft ambient lighting')
    })

    it('infers dramatic lighting from "urgent" in voiceover', () => {
      const result = inferLighting({ voiceover: 'This is urgent — act now' })
      expect(result).toContain('High contrast dramatic lighting')
    })

    it('infers dramatic lighting from "intense" in voiceover', () => {
      const result = inferLighting({ voiceover: 'Intense focus on what matters' })
      expect(result).toContain('High contrast dramatic lighting')
    })

    it('infers dramatic lighting from "power" in voiceover', () => {
      const result = inferLighting({ voiceover: 'Power through every obstacle' })
      expect(result).toContain('High contrast dramatic lighting')
    })

    it('voiceover inference is skipped when mood keywords already matched', () => {
      const result = inferLighting({
        moodKeywords: ['elegant'],
        voiceover: 'Feel the excitement',
      })
      // elegant (from moodKeywords) should win — voiceover only activates when parts is empty
      expect(result).toContain('Soft diffused lighting')
      expect(result).not.toContain('Dynamic lighting')
    })
  })

  describe('default fallback', () => {
    it('returns default natural cinematic lighting when nothing matches', () => {
      const result = inferLighting({})
      expect(result).toBe('Natural cinematic lighting with motivated sources')
    })

    it('returns default when voiceover contains no known sentiment', () => {
      const result = inferLighting({ voiceover: 'Welcome to our product overview' })
      expect(result).toBe('Natural cinematic lighting with motivated sources')
    })

    it('returns default with empty moodKeywords array', () => {
      const result = inferLighting({ moodKeywords: [] })
      expect(result).toBe('Natural cinematic lighting with motivated sources')
    })
  })
})

// =============================================================================
// buildColorGrading
// =============================================================================

describe('buildColorGrading', () => {
  it('includes style colors as dominant palette', () => {
    const result = buildColorGrading(['#1a1a1a', '#ffffff', '#3b82f6'])
    expect(result).toContain('Dominant palette')
    expect(result).toContain('#1a1a1a')
    expect(result).toContain('#ffffff')
    expect(result).toContain('#3b82f6')
  })

  it('limits style colors to first 6', () => {
    const colors = ['#111', '#222', '#333', '#444', '#555', '#666', '#777', '#888']
    const result = buildColorGrading(colors)
    expect(result).toContain('#666')
    expect(result).not.toContain('#777')
  })

  it('includes brand primary color', () => {
    const result = buildColorGrading([], { primary: '#ff0000' })
    expect(result).toContain('primary #ff0000')
    expect(result).toContain('Brand color integration')
  })

  it('includes brand secondary color', () => {
    const result = buildColorGrading([], { secondary: '#00ff00' })
    expect(result).toContain('secondary #00ff00')
  })

  it('includes brand accent color', () => {
    const result = buildColorGrading([], { accent: '#0000ff' })
    expect(result).toContain('accent #0000ff')
  })

  it('includes all brand colors when all are provided', () => {
    const result = buildColorGrading([], {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
    })
    expect(result).toContain('primary #ff0000')
    expect(result).toContain('secondary #00ff00')
    expect(result).toContain('accent #0000ff')
    expect(result).toContain('woven through highlights')
  })

  describe('industry-specific notes', () => {
    it('adds tech color note for "tech" industry', () => {
      const result = buildColorGrading([], undefined, 'tech startup')
      expect(result).toContain('Tech-forward color grading')
      expect(result).toContain('clean blues')
    })

    it('adds tech color note for "saas" industry', () => {
      const result = buildColorGrading([], undefined, 'B2B SaaS platform')
      expect(result).toContain('Tech-forward color grading')
    })

    it('adds fashion color note for "fashion" industry', () => {
      const result = buildColorGrading([], undefined, 'luxury fashion brand')
      expect(result).toContain('Fashion-grade color')
      expect(result).toContain('rich blacks')
    })

    it('adds fashion color note for "luxury" industry', () => {
      const result = buildColorGrading([], undefined, 'luxury goods')
      expect(result).toContain('Fashion-grade color')
    })

    it('adds food color note for "food" industry', () => {
      const result = buildColorGrading([], undefined, 'food delivery startup')
      expect(result).toContain('Warm appetizing tones')
    })

    it('adds food color note for "restaurant" industry', () => {
      const result = buildColorGrading([], undefined, 'fine restaurant')
      expect(result).toContain('Warm appetizing tones')
    })

    it('adds health color note for "health" industry', () => {
      const result = buildColorGrading([], undefined, 'health app')
      expect(result).toContain('Fresh organic tones')
    })

    it('adds health color note for "wellness" industry', () => {
      const result = buildColorGrading([], undefined, 'wellness coaching')
      expect(result).toContain('Fresh organic tones')
    })

    it('adds finance color note for "finance" industry', () => {
      const result = buildColorGrading([], undefined, 'personal finance tool')
      expect(result).toContain('Trust-building palette')
      expect(result).toContain('deep navy')
    })

    it('adds finance color note for "banking" industry', () => {
      const result = buildColorGrading([], undefined, 'banking app')
      expect(result).toContain('Trust-building palette')
    })

    it('is case-insensitive for industry matching', () => {
      const result = buildColorGrading([], undefined, 'TECH COMPANY')
      expect(result).toContain('Tech-forward color grading')
    })
  })

  it('returns empty string when no inputs provided', () => {
    const result = buildColorGrading([])
    expect(result).toBe('')
  })

  it('combines style colors, brand colors, and industry note', () => {
    const result = buildColorGrading(['#111', '#222'], { primary: '#ff0000' }, 'tech company')
    expect(result).toContain('Dominant palette')
    expect(result).toContain('Brand color integration')
    expect(result).toContain('Tech-forward color grading')
  })
})

// =============================================================================
// mapStyleAxis
// =============================================================================

describe('mapStyleAxis', () => {
  it('maps "minimal"', () => {
    const result = mapStyleAxis('minimal')
    expect(result).toContain('uncluttered')
    expect(result).toContain('negative space')
  })

  it('maps "bold"', () => {
    const result = mapStyleAxis('bold')
    expect(result).toContain('High contrast')
    expect(result).toContain('saturated colors')
  })

  it('maps "editorial"', () => {
    const result = mapStyleAxis('editorial')
    expect(result).toContain('Sophisticated layout')
    expect(result).toContain('magazine-quality')
  })

  it('maps "corporate"', () => {
    const result = mapStyleAxis('corporate')
    expect(result).toContain('Professional')
    expect(result).toContain('business-appropriate')
  })

  it('maps "playful"', () => {
    const result = mapStyleAxis('playful')
    expect(result).toContain('Dynamic composition')
    expect(result).toContain('vibrant energy')
  })

  it('maps "premium"', () => {
    const result = mapStyleAxis('premium')
    expect(result).toContain('Luxurious')
    expect(result).toContain('aspirational')
  })

  it('maps "organic"', () => {
    const result = mapStyleAxis('organic')
    expect(result).toContain('Natural textures')
    expect(result).toContain('earthy tones')
  })

  it('maps "tech"', () => {
    const result = mapStyleAxis('tech')
    expect(result).toContain('Digital-forward')
    expect(result).toContain('innovation-driven')
  })

  it('is case-insensitive', () => {
    const result = mapStyleAxis('MINIMAL')
    expect(result).toContain('uncluttered')
  })

  it('returns empty string for undefined', () => {
    expect(mapStyleAxis(undefined)).toBe('')
  })

  it('returns empty string for unknown axis', () => {
    expect(mapStyleAxis('nonexistent-style')).toBe('')
  })
})

// =============================================================================
// mapDensity
// =============================================================================

describe('mapDensity', () => {
  it('maps "minimal" density', () => {
    const result = mapDensity('minimal')
    expect(result).toContain('Sparse composition')
    expect(result).toContain('60% negative space')
  })

  it('maps "balanced" density', () => {
    const result = mapDensity('balanced')
    expect(result).toContain('Balanced composition')
    expect(result).toContain('breathing room')
  })

  it('maps "rich" density', () => {
    const result = mapDensity('rich')
    expect(result).toContain('Layered detail')
    expect(result).toContain('multiple points of interest')
  })

  it('is case-insensitive', () => {
    const result = mapDensity('MINIMAL')
    expect(result).toContain('Sparse composition')
  })

  it('returns empty string for undefined', () => {
    expect(mapDensity(undefined)).toBe('')
  })

  it('returns empty string for unknown density', () => {
    expect(mapDensity('unknown-density')).toBe('')
  })
})

// =============================================================================
// mapEnergy
// =============================================================================

describe('mapEnergy', () => {
  it('maps "calm" energy', () => {
    const result = mapEnergy('calm')
    expect(result).toContain('Static')
    expect(result).toContain('contemplative')
    expect(result).toContain('grounded')
  })

  it('maps "balanced" energy', () => {
    const result = mapEnergy('balanced')
    expect(result).toContain('Measured pacing')
    expect(result).toContain('composed dynamism')
  })

  it('maps "energetic" energy', () => {
    const result = mapEnergy('energetic')
    expect(result).toContain('Dynamic angles')
    expect(result).toContain('diagonal tension')
    expect(result).toContain('kinetic energy')
  })

  it('is case-insensitive', () => {
    const result = mapEnergy('CALM')
    expect(result).toContain('Static')
  })

  it('returns empty string for undefined', () => {
    expect(mapEnergy(undefined)).toBe('')
  })

  it('returns empty string for unknown energy level', () => {
    expect(mapEnergy('unknown-energy')).toBe('')
  })
})

// =============================================================================
// enrichTransition
// =============================================================================

describe('enrichTransition', () => {
  it('enriches "cut" transition', () => {
    const result = enrichTransition('cut')
    expect(result).toContain('Hard cut')
    expect(result).toContain('tonal consistency')
  })

  it('enriches "dissolve" transition', () => {
    const result = enrichTransition('dissolve')
    expect(result).toContain('Dissolve transition')
    expect(result).toContain('overlap color grading')
  })

  it('enriches "fade" transition', () => {
    const result = enrichTransition('fade')
    expect(result).toContain('Fade transition')
    expect(result).toContain('ethereal quality')
  })

  it('enriches "wipe" transition', () => {
    const result = enrichTransition('wipe')
    expect(result).toContain('Wipe transition')
    expect(result).toContain('edge alignment')
  })

  it('enriches "zoom" transition', () => {
    const result = enrichTransition('zoom')
    expect(result).toContain('Zoom transition')
    expect(result).toContain('center-weighted')
  })

  it('enriches "match" transition', () => {
    const result = enrichTransition('match')
    expect(result).toContain('Match cut')
    expect(result).toContain('key visual elements')
  })

  it('enriches "j-cut" transition — returns "cut" result because "cut" key appears first in map', () => {
    // The TRANSITION_MAP iterates in insertion order: "cut" is registered before "j-cut",
    // and "j-cut".includes("cut") is true, so "cut" wins.
    const result = enrichTransition('j-cut')
    expect(result).toContain('Hard cut')
  })

  it('enriches "l-cut" transition — returns "cut" result because "cut" key appears first in map', () => {
    // Same reason as j-cut above: "l-cut".includes("cut") matches "cut" key first.
    const result = enrichTransition('l-cut')
    expect(result).toContain('Hard cut')
  })

  it('enriches "whip" transition', () => {
    const result = enrichTransition('whip')
    expect(result).toContain('Whip pan')
    expect(result).toContain('motion blur')
  })

  it('enriches "morph" transition', () => {
    const result = enrichTransition('morph')
    expect(result).toContain('Morph transition')
    expect(result).toContain('seamless blend')
  })

  it('is case-insensitive', () => {
    const result = enrichTransition('FADE')
    expect(result).toContain('Fade transition')
  })

  it('does partial matching (transition type within a longer string)', () => {
    const result = enrichTransition('slow fade to black')
    expect(result).toContain('Fade transition')
  })

  it('returns prefixed fallback for unknown transition type', () => {
    const result = enrichTransition('spinning vortex')
    expect(result).toBe('Transition: spinning vortex')
  })

  it('returns empty string for undefined', () => {
    expect(enrichTransition(undefined)).toBe('')
  })
})
