export type FidelityLevel = 'low' | 'mid' | 'high'

export interface FidelityConfig {
  level: FidelityLevel
  label: string
  description: string
  showColors: boolean
  showTypography: boolean
  showContent: boolean
  showImages: boolean
}

export const FIDELITY_CONFIGS: Record<FidelityLevel, FidelityConfig> = {
  low: {
    level: 'low',
    label: 'Wireframe',
    description: 'Basic layout structure with placeholder blocks',
    showColors: false,
    showTypography: false,
    showContent: false,
    showImages: false,
  },
  mid: {
    level: 'mid',
    label: 'Content Layout',
    description: 'Layout with placeholder text and content structure',
    showColors: false,
    showTypography: true,
    showContent: true,
    showImages: false,
  },
  high: {
    level: 'high',
    label: 'Styled Preview',
    description: 'Full preview with colors, typography, and image placeholders',
    showColors: true,
    showTypography: true,
    showContent: true,
    showImages: true,
  },
}

export function calculateFidelity(
  chatTurns: number,
  hasFeedback: boolean,
  hasStylePreferences: boolean
): FidelityLevel {
  if (hasStylePreferences && chatTurns >= 4) return 'high'
  if (hasFeedback && chatTurns >= 2) return 'mid'
  return 'low'
}

export function getFidelityConfig(level: FidelityLevel): FidelityConfig {
  return FIDELITY_CONFIGS[level]
}

export function getNextFidelity(current: FidelityLevel): FidelityLevel | null {
  if (current === 'low') return 'mid'
  if (current === 'mid') return 'high'
  return null
}
