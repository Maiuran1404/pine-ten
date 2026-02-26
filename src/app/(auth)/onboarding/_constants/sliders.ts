// Core brand signal sliders configuration (4 signals)
export const BRAND_SIGNAL_SLIDERS = [
  {
    id: 'signalTone',
    name: 'Tone',
    leftLabel: 'Serious',
    rightLabel: 'Playful',
    description: 'Emotional seriousness of expression',
    levels: ['Serious', 'Composed', 'Balanced', 'Spirited', 'Playful'],
  },
  {
    id: 'signalDensity',
    name: 'Visual Density',
    leftLabel: 'Minimal',
    rightLabel: 'Rich',
    description: 'Amount of visual information per surface',
    levels: ['Minimal', 'Clean', 'Balanced', 'Detailed', 'Rich'],
  },
  {
    id: 'signalWarmth',
    name: 'Warmth',
    leftLabel: 'Cold',
    rightLabel: 'Warm',
    description: 'How human and inviting the visual language feels',
    levels: ['Cold', 'Neutral', 'Warm'],
  },
  {
    id: 'signalEnergy',
    name: 'Energy',
    leftLabel: 'Calm',
    rightLabel: 'Energetic',
    description: 'How dynamic and vibrant the visual language feels',
    levels: ['Calm', 'Relaxed', 'Balanced', 'Dynamic', 'Energetic'],
  },
]
