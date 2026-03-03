// =============================================================================
// CINEMATIC VOCABULARY — maps informal camera/lighting notes to professional
// cinematic terminology for image generation prompts. Enriches basic scene
// descriptions with shot specs, lighting presets, color grading, and composition.
//
// No `server-only` — shared module usable by both server routes and admin tools.
// =============================================================================

// ─── Camera Shot Mappings ───────────────────────────────────────────────────

const CAMERA_SHOT_MAP: Record<string, string> = {
  // Close-ups
  'extreme close': 'Extreme close-up (ECU), 100mm macro lens, razor-thin depth of field',
  'close up': 'Close-up (CU), 85mm f/1.4 lens, shallow depth of field, intimate framing',
  'close-up': 'Close-up (CU), 85mm f/1.4 lens, shallow depth of field, intimate framing',
  closeup: 'Close-up (CU), 85mm f/1.4 lens, shallow depth of field, intimate framing',

  // Medium shots
  'medium close': 'Medium close-up (MCU), 50mm f/1.8 lens, chest-up framing',
  medium: 'Medium shot (MS), 35mm lens, waist-up framing, balanced composition',
  'medium wide': 'Medium wide shot (MWS), 28mm lens, full body with environment context',

  // Wide shots
  wide: 'Wide shot (WS), 24mm lens, full scene establishing context',
  'wide angle': 'Wide-angle shot, 16mm lens, expansive field of view, environmental emphasis',
  'extreme wide': 'Extreme wide shot (EWS), 14mm ultra-wide, vast landscape scope',
  establishing: 'Establishing shot, 24mm lens, wide framing showing full location context',
  panoramic: 'Panoramic vista, ultra-wide 12mm lens, sweeping horizontal composition',

  // Aerial / specialized
  aerial: 'Aerial shot, drone perspective, 24mm equivalent, looking down at scene',
  'birds eye': "Bird's eye view, directly overhead, geometric patterns visible",
  overhead: 'Overhead shot, looking straight down, flat graphic composition',
  'low angle': 'Low-angle shot, camera below eye level, 24mm lens, subject appears powerful',
  'high angle': 'High-angle shot, camera above subject, 35mm lens, diminishing perspective',
  dutch: 'Dutch angle (tilted frame), 35mm lens, dramatic tension through asymmetry',
  'over the shoulder': 'Over-the-shoulder (OTS), 50mm lens, foreground subject framing',
  pov: 'Point-of-view (POV) shot, first-person perspective, immersive framing',

  // Movement
  tracking: 'Tracking shot, smooth lateral movement, 35mm lens on dolly',
  dolly: 'Dolly-in shot, gradual forward movement, 50mm lens, increasing intimacy',
  crane: 'Crane shot, sweeping vertical movement, revealing the full scene',
  steadicam: 'Steadicam follow shot, fluid movement, 28mm lens, kinetic energy',
  handheld: 'Handheld shot, slight organic movement, 35mm lens, documentary feel',
  static: 'Static locked-off frame, tripod-mounted, 50mm lens, composed and deliberate',
  'slow motion': 'Slow-motion capture at 120fps, ultra-sharp detail, time-dilated movement',
  'time lapse': 'Time-lapse sequence, accelerated movement, passage of time',
}

/**
 * Maps informal camera notes to professional shot specifications.
 * Checks both cameraNote and visualNote for camera-related terms.
 * Optional overrideMap replaces the hardcoded map when provided (admin config).
 */
export function inferShotSpecs(
  cameraNote?: string,
  visualNote?: string,
  overrideMap?: Record<string, string>
): string {
  const combined = `${cameraNote || ''} ${visualNote || ''}`.toLowerCase()
  const map = overrideMap ?? CAMERA_SHOT_MAP

  for (const [key, spec] of Object.entries(map)) {
    if (combined.includes(key)) return spec
  }

  // Default if no match
  if (cameraNote) return `Camera: ${cameraNote}`
  return 'Medium shot (MS), 35mm lens, balanced cinematic composition'
}

// ─── Lighting Presets ───────────────────────────────────────────────────────

interface LightingContext {
  moodKeywords?: string[]
  voiceover?: string
  colorTemperature?: string
}

const MOOD_LIGHTING_MAP: Record<string, string> = {
  dramatic: 'High contrast Rembrandt lighting, deep shadows, single strong key light',
  moody: 'Low-key lighting, dominant shadows, atmospheric haze, pool of light',
  mysterious: 'Chiaroscuro lighting, deep shadow pockets, silhouetted edges',
  dark: 'Noir lighting, harsh shadows, minimal fill, isolated pools of light',
  bright: 'High-key lighting, soft fill, minimal shadows, airy and open',
  cheerful: 'Bright natural lighting, soft diffused fill, warm and inviting',
  playful: 'Colorful accent lighting, vibrant practicals, dynamic light play',
  elegant: 'Soft diffused lighting, gentle gradients, refined highlight control',
  luxurious: 'Rich golden lighting, warm practicals, jewel-tone accents in shadows',
  professional: 'Clean three-point lighting, balanced exposure, corporate precision',
  cinematic: 'Cinematic lighting with motivated sources, naturalistic fall-off, atmospheric depth',
  energetic: 'Dynamic rim lighting, high-contrast edges, electric highlights',
  calm: 'Soft ambient lighting, gentle diffusion, even and peaceful illumination',
  romantic: 'Warm candle-like glow, soft bokeh highlights, intimate atmosphere',
  futuristic: 'Neon edge lighting, cool LED accents, high-tech illumination',
  vintage: 'Warm tungsten-style lighting, soft halation, nostalgic glow',
  epic: 'God-ray lighting, volumetric atmosphere, grand scale illumination',
  intimate: 'Soft practical lighting, close warm sources, gentle shadow play',
}

const COLOR_TEMP_MAP: Record<string, string> = {
  warm: 'Warm lighting base (3200K tungsten tones), golden highlights, amber shadows',
  cool: 'Cool lighting base (5600K+ daylight), blue-tinted shadows, crisp highlights',
  neutral: 'Neutral balanced lighting (4500K), true-to-life color rendering',
}

/**
 * Infers lighting direction from mood keywords, color temperature, and voiceover mood.
 * Combines multiple signals for rich lighting description.
 * Optional override maps replace the hardcoded maps when provided (admin config).
 */
export function inferLighting(
  ctx: LightingContext,
  overrideMoodMap?: Record<string, string>,
  overrideColorTempMap?: Record<string, string>
): string {
  const parts: string[] = []
  const moodMap = overrideMoodMap ?? MOOD_LIGHTING_MAP
  const colorTempMap = overrideColorTempMap ?? COLOR_TEMP_MAP

  // Color temperature base
  if (ctx.colorTemperature && colorTempMap[ctx.colorTemperature]) {
    parts.push(colorTempMap[ctx.colorTemperature])
  }

  // Mood-based lighting (first match from keywords)
  if (ctx.moodKeywords) {
    for (const keyword of ctx.moodKeywords) {
      const lower = keyword.toLowerCase()
      if (moodMap[lower]) {
        parts.push(moodMap[lower])
        break // Take first match only
      }
    }
  }

  // Voiceover mood inference (simple sentiment)
  if (ctx.voiceover && parts.length === 0) {
    const lower = ctx.voiceover.toLowerCase()
    if (lower.includes('excit') || lower.includes('energy') || lower.includes('bold')) {
      parts.push('Dynamic lighting with strong directional key, energetic rim highlights')
    } else if (lower.includes('calm') || lower.includes('peace') || lower.includes('serene')) {
      parts.push('Soft ambient lighting, gentle diffusion, tranquil atmosphere')
    } else if (lower.includes('urgent') || lower.includes('intense') || lower.includes('power')) {
      parts.push('High contrast dramatic lighting, deep shadows, powerful key light')
    }
  }

  return parts.length > 0 ? parts.join('. ') : 'Natural cinematic lighting with motivated sources'
}

// ─── Color Grading ──────────────────────────────────────────────────────────

/**
 * Builds a color grading section from style palette colors and brand colors.
 * Style colors define the aesthetic, brand colors are accent anchors.
 * Optional overrideIndustryMap replaces the hardcoded industry-color mapping.
 */
export function buildColorGrading(
  styleColors: string[],
  brandColors?: { primary?: string; secondary?: string; accent?: string },
  industry?: string,
  overrideIndustryMap?: Record<string, string>
): string {
  const parts: string[] = []

  // Style palette as dominant colors
  if (styleColors.length > 0) {
    const colorList = styleColors.slice(0, 6).join(', ')
    parts.push(`Dominant palette: ${colorList}`)
  }

  // Brand colors as accent integration
  const brandEntries: string[] = []
  if (brandColors?.primary) brandEntries.push(`primary ${brandColors.primary}`)
  if (brandColors?.secondary) brandEntries.push(`secondary ${brandColors.secondary}`)
  if (brandColors?.accent) brandEntries.push(`accent ${brandColors.accent}`)

  if (brandEntries.length > 0) {
    parts.push(
      `Brand color integration: ${brandEntries.join(', ')} woven through highlights and environmental details`
    )
  }

  // Industry-specific color notes
  if (industry) {
    const lower = industry.toLowerCase()

    if (overrideIndustryMap) {
      // Check override map for any matching key
      for (const [key, description] of Object.entries(overrideIndustryMap)) {
        if (lower.includes(key.toLowerCase())) {
          parts.push(description)
          break
        }
      }
    } else {
      // Hardcoded defaults
      if (lower.includes('tech') || lower.includes('saas')) {
        parts.push('Tech-forward color grading: clean blues, subtle gradients')
      } else if (lower.includes('fashion') || lower.includes('luxury')) {
        parts.push('Fashion-grade color: rich blacks, selective color pop, editorial finish')
      } else if (lower.includes('food') || lower.includes('restaurant')) {
        parts.push('Warm appetizing tones, saturated naturals, golden highlights')
      } else if (lower.includes('health') || lower.includes('wellness')) {
        parts.push('Fresh organic tones, clean whites, calming natural palette')
      } else if (lower.includes('finance') || lower.includes('banking')) {
        parts.push('Trust-building palette: deep navy, crisp whites, silver accents')
      }
    }
  }

  return parts.length > 0 ? parts.join('. ') : ''
}

// ─── Style Axis Mappings ────────────────────────────────────────────────────

const STYLE_AXIS_MAP: Record<string, string> = {
  minimal: 'Clean, uncluttered composition with generous negative space and restrained elements',
  bold: 'High contrast, saturated colors, impactful visual presence with strong focal points',
  editorial: 'Sophisticated layout, intentional framing, magazine-quality composition',
  corporate: 'Professional, structured composition, clean lines, business-appropriate',
  playful: 'Dynamic composition, vibrant energy, asymmetric balance, joyful movement',
  premium: 'Luxurious finish, rich textures, refined detail, aspirational quality',
  organic: 'Natural textures, earthy tones, flowing forms, handcrafted feel',
  tech: 'Digital-forward aesthetic, clean geometry, gradient accents, innovation-driven',
}

/** Map a style axis to composition and aesthetic modifiers */
export function mapStyleAxis(axis?: string, overrideMap?: Record<string, string>): string {
  if (!axis) return ''
  const map = overrideMap ?? STYLE_AXIS_MAP
  return map[axis.toLowerCase()] || ''
}

// ─── Density Level ──────────────────────────────────────────────────────────

const DENSITY_MAP: Record<string, string> = {
  minimal: 'Sparse composition, 60% negative space, focus on single strong element',
  balanced: 'Balanced composition with clear focal hierarchy and breathing room',
  rich: 'Layered detail, textured depth, visually rich with multiple points of interest',
}

/** Map density level to visual complexity */
export function mapDensity(level?: string, overrideMap?: Record<string, string>): string {
  if (!level) return ''
  const map = overrideMap ?? DENSITY_MAP
  return map[level.toLowerCase()] || ''
}

// ─── Energy Level ───────────────────────────────────────────────────────────

const ENERGY_MAP: Record<string, string> = {
  calm: 'Static, contemplative composition, still and grounded framing',
  balanced: 'Measured pacing, natural movement, composed dynamism',
  energetic: 'Dynamic angles, implied motion, diagonal tension, kinetic energy',
}

/** Map energy level to composition dynamism */
export function mapEnergy(level?: string, overrideMap?: Record<string, string>): string {
  if (!level) return ''
  const map = overrideMap ?? ENERGY_MAP
  return map[level.toLowerCase()] || ''
}

// ─── Transition Enrichment ──────────────────────────────────────────────────

const TRANSITION_MAP: Record<string, string> = {
  cut: 'Hard cut — maintain tonal consistency with adjacent scenes',
  dissolve: 'Dissolve transition — soften edges, overlap color grading',
  fade: 'Fade transition — gentle luminance change, ethereal quality',
  wipe: 'Wipe transition — maintain strong compositional edge alignment',
  zoom: 'Zoom transition — center-weighted composition for smooth zoom continuity',
  match: 'Match cut — align key visual elements with preceding scene',
  'j-cut': 'J-cut — atmospheric setup, mood anticipation before visual reveal',
  'l-cut': 'L-cut — visual lingers as audio shifts, contemplative exit framing',
  whip: 'Whip pan — motion blur edges, energetic directional flow',
  morph: 'Morph transition — shared shapes/colors between scenes for seamless blend',
}

/** Enrich transition notes with visual continuity language */
export function enrichTransition(transition?: string): string {
  if (!transition) return ''
  const lower = transition.toLowerCase()
  for (const [key, description] of Object.entries(TRANSITION_MAP)) {
    if (lower.includes(key)) return description
  }
  return `Transition: ${transition}`
}
