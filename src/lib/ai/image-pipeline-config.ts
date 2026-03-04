// =============================================================================
// IMAGE PIPELINE CONFIG — types, defaults, and DB loader for all configurable
// parts of the storyboard image generation pipeline. Stored in platformSettings
// table (key: 'image_pipeline_config') and deep-merged with hardcoded defaults
// so the pipeline works zero-config.
//
// No `server-only` — shared module usable by admin page and server routes.
// =============================================================================

import { db } from '@/db'
import { platformSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ─── Config Types ────────────────────────────────────────────────────────────

export interface PromptConfig {
  /** Quality footer appended to every scene prompt */
  qualityFooter: string
  /** Batch consistency prefix for multi-scene generations */
  batchPrefix: string
  /** Negative prompt to filter artifacts */
  negativePrompt: string
  /** Max character length for assembled prompts */
  promptCap: number
  /** Max character length for subject anchor extraction */
  subjectAnchorCap: number
}

export interface VocabularyMaps {
  cameraShots: Record<string, string>
  moodLighting: Record<string, string>
  colorTemperature: Record<string, string>
  styleAxes: Record<string, string>
  density: Record<string, string>
  energy: Record<string, string>
  industry: Record<string, string>
}

export interface ProviderParams {
  inferenceSteps?: number
  guidanceScale?: number
}

export interface ProviderChainConfig {
  hero: string[]
  consistency: string[]
  standard: string[]
  fallback: string[]
}

export interface ProviderConfig {
  chains: ProviderChainConfig
  params: Record<string, ProviderParams>
}

export interface ExecutionLimits {
  maxRetries: number
  concurrencyLimit: number
  maxStyleRefs: number
  maxScenes: number
  imageSize: '1536x1024' | '1024x1024' | '1024x1536'
}

export interface ImagePipelineConfig {
  prompts: PromptConfig
  vocabulary: VocabularyMaps
  providers: ProviderConfig
  executionLimits: ExecutionLimits
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_IMAGE_PIPELINE_CONFIG: ImagePipelineConfig = {
  prompts: {
    qualityFooter:
      'Captured on location with a cinema-grade camera. Subtle natural film grain, authentic lens characteristics with slight chromatic aberration at edges. Practical lighting from real on-set sources. Lived-in composition — natural skin texture, creased fabrics, real environmental reflections. No text overlays.',
    batchPrefix:
      'Consistent photo series from the same production shoot — matching color grade, same camera and lens setup, identical lighting rig across all frames.',
    negativePrompt:
      'text, watermark, logo, blurry, distorted, low quality, UI elements, buttons, interface, screenshot, words, letters, captions, subtitles, title cards, typography, readable text, overlay text, call to action, CTA button, free trial, sign up, subscribe, AI-generated, 3D render, CGI, digital art, illustration, painting, smooth plastic skin, uncanny valley, symmetrical face, oversaturated, HDR',
    promptCap: 1500,
    subjectAnchorCap: 150,
  },
  vocabulary: {
    cameraShots: {
      'extreme close': 'Extreme close-up (ECU), 100mm macro lens, razor-thin depth of field',
      'close up': 'Close-up (CU), 85mm f/1.4 lens, shallow depth of field, intimate framing',
      'close-up': 'Close-up (CU), 85mm f/1.4 lens, shallow depth of field, intimate framing',
      closeup: 'Close-up (CU), 85mm f/1.4 lens, shallow depth of field, intimate framing',
      'medium close': 'Medium close-up (MCU), 50mm f/1.8 lens, chest-up framing',
      medium: 'Medium shot (MS), 35mm lens, waist-up framing, balanced composition',
      'medium wide': 'Medium wide shot (MWS), 28mm lens, full body with environment context',
      wide: 'Wide shot (WS), 24mm lens, full scene establishing context',
      'wide angle': 'Wide-angle shot, 16mm lens, expansive field of view, environmental emphasis',
      'extreme wide': 'Extreme wide shot (EWS), 14mm ultra-wide, vast landscape scope',
      establishing: 'Establishing shot, 24mm lens, wide framing showing full location context',
      panoramic: 'Panoramic vista, ultra-wide 12mm lens, sweeping horizontal composition',
      aerial: 'Aerial shot, drone perspective, 24mm equivalent, looking down at scene',
      'birds eye': "Bird's eye view, directly overhead, geometric patterns visible",
      overhead: 'Overhead shot, looking straight down, flat graphic composition',
      'low angle': 'Low-angle shot, camera below eye level, 24mm lens, subject appears powerful',
      'high angle': 'High-angle shot, camera above subject, 35mm lens, diminishing perspective',
      dutch: 'Dutch angle (tilted frame), 35mm lens, dramatic tension through asymmetry',
      'over the shoulder': 'Over-the-shoulder (OTS), 50mm lens, foreground subject framing',
      pov: 'Point-of-view (POV) shot, first-person perspective, immersive framing',
      tracking: 'Tracking shot, smooth lateral movement, 35mm lens on dolly',
      dolly: 'Dolly-in shot, gradual forward movement, 50mm lens, increasing intimacy',
      crane: 'Crane shot, sweeping vertical movement, revealing the full scene',
      steadicam: 'Steadicam follow shot, fluid movement, 28mm lens, kinetic energy',
      handheld: 'Handheld shot, slight organic movement, 35mm lens, documentary feel',
      static: 'Static locked-off frame, tripod-mounted, 50mm lens, composed and deliberate',
      'slow motion': 'Slow-motion capture at 120fps, ultra-sharp detail, time-dilated movement',
      'time lapse': 'Time-lapse sequence, accelerated movement, passage of time',
    },
    moodLighting: {
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
      cinematic:
        'Cinematic lighting with motivated sources, naturalistic fall-off, atmospheric depth',
      energetic: 'Dynamic rim lighting, high-contrast edges, electric highlights',
      calm: 'Soft ambient lighting, gentle diffusion, even and peaceful illumination',
      romantic: 'Warm candle-like glow, soft bokeh highlights, intimate atmosphere',
      futuristic: 'Neon edge lighting, cool LED accents, high-tech illumination',
      vintage: 'Warm tungsten-style lighting, soft halation, nostalgic glow',
      epic: 'God-ray lighting, volumetric atmosphere, grand scale illumination',
      intimate: 'Soft practical lighting, close warm sources, gentle shadow play',
    },
    colorTemperature: {
      warm: 'Warm lighting base (3200K tungsten tones), golden highlights, amber shadows',
      cool: 'Cool lighting base (5600K+ daylight), blue-tinted shadows, crisp highlights',
      neutral: 'Neutral balanced lighting (4500K), true-to-life color rendering',
    },
    styleAxes: {
      minimal:
        'Clean, uncluttered composition with generous negative space and restrained elements',
      bold: 'High contrast, saturated colors, impactful visual presence with strong focal points',
      editorial: 'Sophisticated layout, intentional framing, magazine-quality composition',
      corporate: 'Professional, structured composition, clean lines, business-appropriate',
      playful: 'Dynamic composition, vibrant energy, asymmetric balance, joyful movement',
      premium: 'Luxurious finish, rich textures, refined detail, aspirational quality',
      organic: 'Natural textures, earthy tones, flowing forms, handcrafted feel',
      tech: 'Digital-forward aesthetic, clean geometry, gradient accents, innovation-driven',
    },
    density: {
      minimal: 'Sparse composition, 60% negative space, focus on single strong element',
      balanced: 'Balanced composition with clear focal hierarchy and breathing room',
      rich: 'Layered detail, textured depth, visually rich with multiple points of interest',
    },
    energy: {
      calm: 'Static, contemplative composition, still and grounded framing',
      balanced: 'Measured pacing, natural movement, composed dynamism',
      energetic: 'Dynamic angles, implied motion, diagonal tension, kinetic energy',
    },
    industry: {
      tech: 'Tech-forward color grading: clean blues, subtle gradients',
      saas: 'Tech-forward color grading: clean blues, subtle gradients',
      fashion: 'Fashion-grade color: rich blacks, selective color pop, editorial finish',
      luxury: 'Fashion-grade color: rich blacks, selective color pop, editorial finish',
      food: 'Warm appetizing tones, saturated naturals, golden highlights',
      restaurant: 'Warm appetizing tones, saturated naturals, golden highlights',
      health: 'Fresh organic tones, clean whites, calming natural palette',
      wellness: 'Fresh organic tones, clean whites, calming natural palette',
      finance: 'Trust-building palette: deep navy, crisp whites, silver accents',
      banking: 'Trust-building palette: deep navy, crisp whites, silver accents',
    },
  },
  providers: {
    chains: {
      hero: ['flux2-pro', 'imagen4-fast', 'imagen3'],
      consistency: ['flux2-pro', 'flux-kontext', 'imagen4-fast', 'imagen3'],
      standard: ['flux2-pro', 'imagen4-fast', 'imagen3'],
      fallback: ['imagen4-fast', 'imagen3'],
    },
    params: {
      'flux2-pro': { inferenceSteps: 28, guidanceScale: 3.5 },
      'flux-kontext': { inferenceSteps: 28, guidanceScale: 3.5 },
      'imagen4-fast': {},
      imagen3: {},
    },
  },
  executionLimits: {
    maxRetries: 3,
    concurrencyLimit: 4,
    maxStyleRefs: 4,
    maxScenes: 12,
    imageSize: '1536x1024',
  },
}

const PLATFORM_SETTINGS_KEY = 'image_pipeline_config'

// ─── Deep Merge ──────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep-merge source into target. Source values override target values. */
function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return (source ?? target) as T
  }

  const result = { ...target } as Record<string, unknown>
  for (const key of Object.keys(source)) {
    const sourceVal = (source as Record<string, unknown>)[key]
    const targetVal = result[key]

    if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal
    }
  }
  return result as T
}

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Load the image pipeline config from the database (platformSettings).
 * Deep-merges stored overrides with hardcoded defaults so the pipeline
 * always has a complete config even if only some fields were customized.
 *
 * Returns DEFAULT_IMAGE_PIPELINE_CONFIG if no stored config exists.
 */
export async function loadImagePipelineConfig(): Promise<ImagePipelineConfig> {
  const result = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, PLATFORM_SETTINGS_KEY))
    .limit(1)

  if (result.length === 0 || !result[0].value) {
    return DEFAULT_IMAGE_PIPELINE_CONFIG
  }

  const stored = result[0].value as Partial<ImagePipelineConfig>
  return deepMerge(DEFAULT_IMAGE_PIPELINE_CONFIG, stored)
}
