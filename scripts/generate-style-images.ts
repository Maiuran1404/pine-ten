/**
 * Script to generate AI representative images for all curated style presets.
 * Calls DALL-E directly and uploads to Supabase storage.
 *
 * Usage: npx tsx scripts/generate-style-images.ts [--dry-run] [--style-id=<id>]
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const BUCKET = 'deliverable-styles'

// ── Hex extraction ──────────────────────────────────────────────────────────

function extractHexColors(text: string): string[] {
  const hexRegex = /#[0-9A-Fa-f]{6}\b/g
  const matches = text.match(hexRegex) || []
  return [...new Set(matches.map((c) => c.toUpperCase()))].slice(0, 8)
}

// ── Prompt condensation ─────────────────────────────────────────────────────

function buildImagePrompt(name: string, promptGuide: string): string {
  const sentences = promptGuide
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  const visualKeywords =
    /color|light|shadow|texture|gradient|palette|tone|mood|surface|grain|lens|camera|shot|photograph|background|foreground|atmosphere|warm|cool|contrast|matte|gloss|metallic|organic|soft|hard|bright|dark|minimal|rich|clean|raw|polished/i
  const visualSentences = sentences.filter((s) => visualKeywords.test(s))

  const selectedSentences: string[] = []
  let wordCount = 0
  for (const sentence of visualSentences) {
    const words = sentence.split(/\s+/).length
    if (wordCount + words > 150) break
    selectedSentences.push(sentence)
    wordCount += words
  }

  if (wordCount < 80) {
    for (const sentence of sentences) {
      if (selectedSentences.includes(sentence)) continue
      const words = sentence.split(/\s+/).length
      if (wordCount + words > 150) break
      selectedSentences.push(sentence)
      wordCount += words
    }
  }

  const visualDescription = selectedSentences.join('. ').replace(/\.\./g, '.')

  return `Create a professional visual reference image for the "${name}" style direction. ${visualDescription}. This is a standalone atmospheric mood image showcasing this aesthetic. Photorealistic, editorial quality, square format.`
}

// ── DALL-E call ─────────────────────────────────────────────────────────────

async function generateImage(prompt: string): Promise<{ base64: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  if (data.data?.[0]?.b64_json) {
    return { base64: data.data[0].b64_json }
  }
  throw new Error('No base64 data in response')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Dynamic imports after dotenv has loaded
  const { db } = await import('../src/db')
  const { deliverableStyleReferences } = await import('../src/db/schema')
  const { and, eq, isNotNull } = await import('drizzle-orm')
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')

  // Inline Supabase admin client (can't import server.ts due to server-only guard)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

  const uploadImage = async (styleId: string, base64Data: string): Promise<string> => {
    const buffer = Buffer.from(base64Data, 'base64')
    const path = `generated/${styleId}.png`

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    })

    if (error) {
      if (error.message.includes('not found')) {
        await supabase.storage.createBucket(BUCKET, { public: true })
        const { error: retryError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
          contentType: 'image/png',
          upsert: true,
        })
        if (retryError) throw retryError
      } else {
        throw error
      }
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return urlData.publicUrl
  }

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const styleIdArg = args.find((a) => a.startsWith('--style-id='))?.split('=')[1]

  console.log(`\n🎨 Style Image Generator`)
  console.log(`   Mode: ${dryRun ? 'DRY RUN (colors only)' : 'FULL (generate + upload)'}`)
  if (styleIdArg) console.log(`   Style ID: ${styleIdArg}`)
  console.log('')

  const conditions = [
    eq(deliverableStyleReferences.isActive, true),
    isNotNull(deliverableStyleReferences.promptGuide),
  ]
  if (styleIdArg) {
    conditions.push(eq(deliverableStyleReferences.id, styleIdArg))
  }

  const presets = await db
    .select()
    .from(deliverableStyleReferences)
    .where(and(...conditions))

  console.log(`Found ${presets.length} presets with prompt guides\n`)

  let success = 0
  let errors = 0

  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i]
    const promptGuide = preset.promptGuide!
    const colorSamples = extractHexColors(promptGuide)

    // Always update colors
    if (colorSamples.length > 0) {
      await db
        .update(deliverableStyleReferences)
        .set({ colorSamples, updatedAt: new Date() })
        .where(eq(deliverableStyleReferences.id, preset.id))
    }

    if (dryRun) {
      console.log(
        `  [${i + 1}/${presets.length}] ${preset.name} — colors: ${colorSamples.join(', ') || 'none'}`
      )
      success++
      continue
    }

    try {
      process.stdout.write(`  [${i + 1}/${presets.length}] ${preset.name}...`)

      const imagePrompt = buildImagePrompt(preset.name, promptGuide)
      const result = await generateImage(imagePrompt)
      const publicUrl = await uploadImage(preset.id, result.base64)

      await db
        .update(deliverableStyleReferences)
        .set({ imageUrl: publicUrl, colorSamples, updatedAt: new Date() })
        .where(eq(deliverableStyleReferences.id, preset.id))

      console.log(` ✅ ${publicUrl.slice(0, 80)}...`)
      success++

      // Rate limit delay
      if (i < presets.length - 1) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.log(` ❌ ${msg}`)
      errors++
    }
  }

  console.log(`\n✨ Done: ${success} success, ${errors} errors out of ${presets.length} total\n`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
