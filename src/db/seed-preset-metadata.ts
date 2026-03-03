import * as dotenv from 'dotenv'

// Load environment variables first
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

/**
 * Backfill colorSamples, visualElements, densityLevel, and styleReferenceImages
 * for all 18 curated visual style presets.
 *
 * Values are extracted from each preset's existing promptGuide text.
 * This script ONLY updates these 4 fields — all other data is preserved.
 *
 * Run: npx tsx src/db/seed-preset-metadata.ts
 */

const presetMetadata: Record<
  string,
  {
    densityLevel: string
    colorSamples: string[]
    visualElements: string[]
    styleReferenceImages: string[]
  }
> = {
  // ─── 1. Bold & Kinetic ───
  'Bold & Kinetic': {
    densityLevel: 'rich',
    colorSamples: ['#0047AB', '#E63946', '#FFD60A'],
    visualElements: [
      'high-speed shutter',
      'wide-angle low perspective',
      'hard key light',
      'motion blur background',
      'Kodak Vision3 500T grain',
      'specular highlights',
    ],
    styleReferenceImages: [],
  },

  // ─── 2. Corporate Professional ───
  'Corporate Professional': {
    densityLevel: 'balanced',
    colorSamples: ['#1B365D', '#36454F', '#FFFFFF', '#008080', '#C5A55A'],
    visualElements: [
      'large softbox',
      'diffused window light',
      'soft open shadows',
      '50mm-85mm lens',
      'neutral-warm white balance',
    ],
    styleReferenceImages: [],
  },

  // ─── 3. Editorial Documentary ───
  'Editorial Documentary': {
    densityLevel: 'balanced',
    colorSamples: ['#C8A882', '#5A7A8A', '#D4A574', '#3C5A6E'],
    visualElements: [
      'available light only',
      'shallow DOF',
      'Kodak Portra 400 film look',
      'candid framing',
      'rule of thirds',
      'medium-fine grain',
      'negative space for text',
    ],
    styleReferenceImages: [],
  },

  // ─── 4. Clean & Minimal ───
  'Clean & Minimal': {
    densityLevel: 'minimal',
    colorSamples: ['#F5F5F0', '#E8E4E0', '#F0EBE3'],
    visualElements: [
      'single large softbox',
      'macro-capable lens',
      'maximum sharpness',
      'white fill card',
      'low contrast 2:1',
      'matte surfaces',
      'mathematical composition',
    ],
    styleReferenceImages: [],
  },

  // ─── 5. Organic & Natural ───
  'Organic & Natural': {
    densityLevel: 'balanced',
    colorSamples: ['#C27D5A', '#9CAF88', '#D4B896', '#FFF8E7', '#B8860B'],
    visualElements: [
      'golden hour sunlight',
      'vintage lens character',
      'subtle flare and vignetting',
      'Kodak Gold 200 grain',
      'natural materials',
      'warm amber shadows',
    ],
    styleReferenceImages: [],
  },

  // ─── 6. Playful & Energetic ───
  'Playful & Energetic': {
    densityLevel: 'rich',
    colorSamples: ['#FF6B6B', '#FFD93D', '#6EC6E6', '#88D8B0'],
    visualElements: [
      'wide-angle unconventional angles',
      'flat even illumination',
      'ring-light catchlight',
      'high-speed freeze action',
      'strong diagonals',
      'bold patterns',
    ],
    styleReferenceImages: [],
  },

  // ─── 7. Premium Cinematic ───
  'Premium Cinematic': {
    densityLevel: 'rich',
    colorSamples: ['#1A3A4A', '#C67A3C'],
    visualElements: [
      'anamorphic lens',
      '2.39:1 aspect ratio',
      'chiaroscuro lighting',
      'horizontal lens flare',
      'oval bokeh',
      'volumetric haze',
      'rim/edge light',
      'negative fill',
    ],
    styleReferenceImages: [],
  },

  // ─── 8. Tech Futuristic ───
  'Tech Futuristic': {
    densityLevel: 'rich',
    colorSamples: ['#00E5FF', '#7B2FBE', '#FF006E'],
    visualElements: [
      'colored LED edge lighting',
      'dark controlled environment',
      'prismatic reflections',
      'carbon fiber textures',
      'geometric patterns',
      'particle effects',
    ],
    styleReferenceImages: [],
  },

  // ─── 9. Warm Storytelling ───
  'Warm Storytelling': {
    densityLevel: 'balanced',
    colorSamples: ['#D4915E', '#FFF5E6', '#B86B4A', '#3C2415'],
    visualElements: [
      'practical lighting only',
      '85mm f/1.8 lens',
      'candid photojournalistic',
      'Kodak Portra 800 pushed',
      'desk lamp warm glow',
      'venetian shadow patterns',
    ],
    styleReferenceImages: [],
  },

  // ─── 10. Luxury & Refined ───
  'Luxury & Refined': {
    densityLevel: 'minimal',
    colorSamples: ['#0A0A0A', '#FFFFF0', '#C9A96E', '#4A0E2C'],
    visualElements: [
      '100mm macro lens',
      'tilt-shift',
      'single overhead softbox gradient',
      'focused accent highlight',
      'negative fill',
      'tactile surface detail',
      'millimeter composition',
    ],
    styleReferenceImages: [],
  },

  // ─── 11. Urban & Street ───
  'Urban & Street': {
    densityLevel: 'rich',
    colorSamples: ['#4A4A4A', '#FF3366', '#00BFFF', '#FFA500'],
    visualElements: [
      'handheld shooting',
      'deep DOF f/5.6',
      'Cinestill 800T halation',
      'neon reflections in puddles',
      'cross-processed grade',
      'strong vanishing points',
    ],
    styleReferenceImages: [],
  },

  // ─── 12. Bright Startup ───
  'Bright Startup': {
    densityLevel: 'balanced',
    colorSamples: ['#FFFFFF', '#A7C7E7', '#7BC67E', '#F8A4A4', '#D4A574'],
    visualElements: [
      'natural window light',
      'white bounce reflector',
      '35mm f/2.8 lens',
      'bright airy exposure',
      'lifted shadows',
      'wider than expected framing',
    ],
    styleReferenceImages: [],
  },

  // ─── 13. Cinematic Noir ───
  'Cinematic Noir': {
    densityLevel: 'minimal',
    colorSamples: ['#000000', '#FFFFFF', '#8B0000', '#2C3E50'],
    visualElements: [
      'near-monochrome',
      'single hard light source',
      'no fill light',
      'razor-sharp shadow edges',
      'venetian blind shadows',
      'ISO 3200+ grain',
      'low-key 70-80% shadow',
    ],
    styleReferenceImages: [],
  },

  // ─── 14. Outdoor Adventure ───
  'Outdoor Adventure': {
    densityLevel: 'rich',
    colorSamples: ['#2D5016', '#6B4423', '#87CEEB', '#D4A44C', '#7B7B7B'],
    visualElements: [
      '16-24mm ultra-wide lens',
      'natural light drama',
      'golden hour front-light',
      'weather elements',
      'Fujifilm Velvia 50 grade',
      'foreground-midground-background depth',
    ],
    styleReferenceImages: [],
  },

  // ─── 15. Data & Dashboard ───
  'Data & Dashboard': {
    densityLevel: 'balanced',
    colorSamples: ['#1A1A2E', '#00D4FF', '#00FF88', '#FFB800', '#FF6B6B'],
    visualElements: [
      'screen-lit environment',
      'data visualization UI',
      '50mm f/2.8 lens',
      'cool ambient room lighting',
      'blue-white screen glow',
      'minimal fine grain',
    ],
    styleReferenceImages: [],
  },

  // ─── 16. Heritage & Craft ───
  'Heritage & Craft': {
    densityLevel: 'balanced',
    colorSamples: ['#8B6914', '#7B7554', '#8B4513', '#C8B88A', '#6B6B6B'],
    visualElements: [
      'single window light',
      'macro-capable lens',
      'shallow DOF',
      'raking side light',
      'visible dust particles',
      'medium-format Portra grain',
      'darkroom print quality',
    ],
    styleReferenceImages: [],
  },

  // ─── 17. Event & Launch Moment ───
  'Event & Launch Moment': {
    densityLevel: 'rich',
    colorSamples: ['#FFB347', '#4169E1', '#C71585'],
    visualElements: [
      '70-200mm f/2.8 telephoto',
      'mixed event lighting',
      'multi-temperature color',
      'high ISO 3200-6400 grain',
      'slight motion blur',
      'compressed perspective',
    ],
    styleReferenceImages: [],
  },

  // ─── 18. Monochrome Editorial ───
  'Monochrome Editorial': {
    densityLevel: 'balanced',
    colorSamples: ['#0D0D0D', '#A0A0A0', '#F5F5F5'],
    visualElements: [
      'full black and white',
      'hard directional side light',
      'no fill light',
      'silver-gelatin print aesthetic',
      'Ilford HP5+ / Tri-X 400 grain',
      'strong graphic composition',
      'textural contrast',
    ],
    styleReferenceImages: [],
  },
}

async function seedPresetMetadata() {
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const postgres = (await import('postgres')).default
  const { deliverableStyleReferences } = await import('./schema')
  const { eq, isNotNull } = await import('drizzle-orm')

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const client = postgres(connectionString, { prepare: false, ssl: 'require' })
  const db = drizzle(client)

  console.log('Backfilling preset metadata (colorSamples, visualElements, densityLevel)...\n')

  // Fetch all presets (records with a promptGuide)
  const presets = await db
    .select()
    .from(deliverableStyleReferences)
    .where(isNotNull(deliverableStyleReferences.promptGuide))

  console.log(`Found ${presets.length} presets with promptGuide\n`)

  let updatedCount = 0
  let skippedCount = 0

  for (const preset of presets) {
    const metadata = presetMetadata[preset.name]
    if (!metadata) {
      console.log(`  Skipped (no metadata mapping): ${preset.name}`)
      skippedCount++
      continue
    }

    // Only update if fields are currently empty/null
    const needsUpdate =
      !preset.densityLevel ||
      !preset.colorSamples ||
      (preset.colorSamples as string[]).length === 0 ||
      !preset.visualElements ||
      (preset.visualElements as string[]).length === 0

    if (!needsUpdate) {
      console.log(`  Skipped (already populated): ${preset.name}`)
      skippedCount++
      continue
    }

    await db
      .update(deliverableStyleReferences)
      .set({
        densityLevel: metadata.densityLevel,
        colorSamples: metadata.colorSamples,
        visualElements: metadata.visualElements,
        // Only set styleReferenceImages if we have any (preserve existing)
        ...(metadata.styleReferenceImages.length > 0
          ? { styleReferenceImages: metadata.styleReferenceImages }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(deliverableStyleReferences.id, preset.id))

    console.log(
      `  Updated: ${preset.name} — density=${metadata.densityLevel}, ` +
        `colors=${metadata.colorSamples.length}, elements=${metadata.visualElements.length}`
    )
    updatedCount++
  }

  console.log(`\n✓ Updated ${updatedCount} presets`)
  if (skippedCount > 0) console.log(`○ Skipped ${skippedCount} presets`)

  await client.end()
  process.exit(0)
}

seedPresetMetadata().catch((error) => {
  console.error('Error seeding preset metadata:', error)
  process.exit(1)
})
