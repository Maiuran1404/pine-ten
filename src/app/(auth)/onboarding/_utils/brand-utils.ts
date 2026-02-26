import { type BrandData, BRAND_TONE_OPTIONS } from '@/components/onboarding/types'

// Convert hex color to RGB values
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Generate a deterministic fallback voice summary when Claude's brandVoiceSummary is empty
export function generateFallbackVoiceSummary(
  brandData: BrandData,
  signals: { tone: number; density: number; warmth: number; energy: number }
): string {
  const toneDescriptor =
    signals.tone < 30
      ? 'composed professionalism'
      : signals.tone < 50
        ? 'measured confidence'
        : signals.tone < 70
          ? 'approachable warmth'
          : 'spirited personality'

  const energyDescriptor =
    signals.energy < 30
      ? 'calm, understated energy'
      : signals.energy < 50
        ? 'steady, grounded energy'
        : signals.energy < 70
          ? 'balanced, dynamic energy'
          : 'vibrant, high energy'

  const brandToneOption = BRAND_TONE_OPTIONS.find((o) => o.value === brandData.brandTone)
  const toneName = brandToneOption?.label.toLowerCase() || 'professional'

  return `Your brand speaks with ${toneDescriptor} and ${energyDescriptor}. The overall voice reads as ${toneName} — consistent and intentional.`
}

// Function to determine brand archetype based on slider values (4 signals: tone, density, warmth, energy)
export function getBrandArchetype(signals: {
  tone: number
  density: number
  warmth: number
  energy: number
}): string {
  const { tone, density, warmth, energy } = signals

  // Tone: Serious (< 25), A bit serious (25-45), Neutral (45-55), A bit playful (55-75), Playful (> 75)
  const isSerious = tone < 25
  const isBitSerious = tone >= 25 && tone < 45
  const isNeutralTone = tone >= 45 && tone <= 55
  const isBitPlayful = tone > 55 && tone <= 75
  const isPlayful = tone > 75

  // Density: Minimal (< 25), A bit minimal (25-45), Neutral (45-55), A bit rich (55-75), Rich (> 75)
  const isMinimal = density < 25
  const _isBitMinimal = density >= 25 && density < 45
  const isNeutralDensity = density >= 45 && density <= 55
  const _isBitRich = density > 55 && density <= 75
  const isRich = density > 75

  // Warmth: Cold (< 35), Neutral (35-65), Warm (> 65)
  const isCold = warmth < 35
  const _isNeutralWarmth = warmth >= 35 && warmth <= 65
  const isWarm = warmth > 65

  // Energy: Calm (< 25), A bit calm (25-45), Neutral (45-55), A bit energetic (55-75), Energetic (> 75)
  const isCalm = energy < 25
  const _isBitCalm = energy >= 25 && energy < 45
  const isNeutralEnergy = energy >= 45 && energy <= 55
  const _isBitEnergetic = energy > 55 && energy <= 75
  const isEnergetic = energy > 75

  // === PLAYFUL COMBINATIONS ===
  if (isPlayful && isWarm && isEnergetic) return 'boldExplorer'
  if (isPlayful && isWarm && isCalm) return 'everydayJoy'
  if (isPlayful && isWarm && isRich) return 'richStoryteller'
  if (isPlayful && isWarm) return 'friendlyGuide'
  if (isPlayful && isCold && isEnergetic) return 'neonFuturist'
  if (isPlayful && isCold && isCalm) return 'digitalNative'
  if (isPlayful && isCold) return 'vibrantMinimal'
  if (isPlayful && isMinimal) return 'playfulPop'
  if (isPlayful && isRich) return 'creativeRebel'
  if (isPlayful && isCalm) return 'accessibleFun'
  if (isPlayful && isEnergetic) return 'softLuxury'
  if (isPlayful) return 'humanFirst'

  // === SERIOUS COMBINATIONS ===
  if (isSerious && isCold && isEnergetic && isMinimal) return 'elegantMinimalist'
  if (isSerious && isCold && isEnergetic) return 'refinedAuthority'
  if (isSerious && isCold && isMinimal) return 'industrialChic'
  if (isSerious && isCold) return 'techDisruptor'
  if (isSerious && isWarm && isEnergetic && isRich) return 'luxuryStoryteller'
  if (isSerious && isWarm && isEnergetic) return 'organicLuxury'
  if (isSerious && isWarm && isRich) return 'modernHeritage'
  if (isSerious && isWarm) return 'trustedAdvisor'
  if (isSerious && isEnergetic && isMinimal) return 'premiumTech'
  if (isSerious && isEnergetic) return 'quietConfidence'
  if (isSerious && isCalm) return 'corporateChic'
  if (isSerious && isMinimal) return 'cleanSlate'
  if (isSerious && isRich) return 'seriousCraft'
  if (isSerious) return 'classicTrust'

  // === BIT PLAYFUL COMBINATIONS ===
  if (isBitPlayful && isWarm && isEnergetic) return 'warmCraftsman'
  if (isBitPlayful && isWarm && isCalm) return 'boldAccessible'
  if (isBitPlayful && isWarm) return 'humanFirst'
  if (isBitPlayful && isCold && isEnergetic) return 'boldMinimalist'
  if (isBitPlayful && isCold) return 'urbanEdge'
  if (isBitPlayful && isMinimal) return 'cleanSlate'
  if (isBitPlayful && isRich) return 'richStoryteller'
  if (isBitPlayful && isEnergetic) return 'softLuxury'
  if (isBitPlayful && isCalm) return 'accessibleFun'

  // === BIT SERIOUS COMBINATIONS ===
  if (isBitSerious && isCold && isEnergetic) return 'premiumTech'
  if (isBitSerious && isCold) return 'industrialChic'
  if (isBitSerious && isWarm && isEnergetic) return 'modernHeritage'
  if (isBitSerious && isWarm) return 'warmProfessional'
  if (isBitSerious && isEnergetic && isMinimal) return 'elegantMinimalist'
  if (isBitSerious && isEnergetic) return 'quietConfidence'
  if (isBitSerious && isCalm) return 'corporateChic'
  if (isBitSerious && isMinimal) return 'seriousCraft'
  if (isBitSerious && isRich) return 'dynamicLeader'

  // === MINIMAL COMBINATIONS ===
  if (isMinimal && isEnergetic && isCold) return 'elegantMinimalist'
  if (isMinimal && isEnergetic && isWarm) return 'organicLuxury'
  if (isMinimal && isEnergetic) return 'premiumTech'
  if (isMinimal && isCalm && isWarm) return 'zenMaster'
  if (isMinimal && isCalm) return 'cleanSlate'
  if (isMinimal && isWarm) return 'calmCreative'
  if (isMinimal && isCold) return 'boldMinimalist'

  // === RICH COMBINATIONS ===
  if (isRich && isEnergetic && isWarm) return 'luxuryStoryteller'
  if (isRich && isEnergetic && isCold) return 'modernHeritage'
  if (isRich && isEnergetic) return 'richStoryteller'
  if (isRich && isCalm && isWarm) return 'everydayJoy'
  if (isRich && isCalm) return 'creativeRebel'
  if (isRich && isWarm) return 'warmCraftsman'
  if (isRich && isCold) return 'dynamicLeader'

  // === ENERGETIC COMBINATIONS ===
  if (isEnergetic && isCold) return 'refinedAuthority'
  if (isEnergetic && isWarm) return 'organicLuxury'
  if (isEnergetic) return 'quietConfidence'

  // === CALM COMBINATIONS ===
  if (isCalm && isWarm) return 'humanFirst'
  if (isCalm && isCold) return 'digitalNative'
  if (isCalm) return 'boldAccessible'

  // === WARMTH COMBINATIONS ===
  if (isWarm && isNeutralDensity) return 'friendlyGuide'
  if (isCold && isNeutralDensity) return 'techDisruptor'

  // === NEUTRAL / DEFAULT ===
  if (isNeutralTone && isNeutralDensity && isNeutralEnergy) return 'versatileClassic'

  // Fallback based on strongest signal
  if (isEnergetic) return 'quietConfidence'
  if (isCalm) return 'humanFirst'
  if (isPlayful) return 'playfulPop'
  if (isSerious) return 'trustedAdvisor'
  if (isMinimal) return 'cleanSlate'
  if (isRich) return 'richStoryteller'
  if (isWarm) return 'warmCraftsman'
  if (isCold) return 'industrialChic'

  return 'versatileClassic'
}
