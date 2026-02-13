import { config } from '@/lib/config'

// Brand color tokens
export const colors = {
  primary: '#4a7c4a', // sage green — buttons, accents, success
  primaryDark: '#3d6b3d', // darker sage for hover
  dark: '#2d5a2d', // forest green — admin header
  subtle: '#e8f5e8', // light green bg
  bodyBg: '#f4f6f4', // outer email bg
  cardBg: '#ffffff', // content area
  offWhite: '#f8faf8', // info card bg
  textHeading: '#1a1a1a',
  textBody: '#3d4d3d',
  textMuted: '#6b7b6b',
  border: '#e2e8e2',
  borderLight: '#eef2ee',
  // Semantic
  success: '#4a7c4a',
  successBg: '#e8f5e8',
  successText: '#2d5a2d',
  warning: '#b8860b',
  warningBg: '#fef9ee',
  warningText: '#7a5a08',
  warningBorder: '#f0d68a',
  error: '#c0392b',
  errorBg: '#fdf2f2',
  errorText: '#922b21',
  errorBorder: '#f5c6cb',
  info: '#3a7ca5',
  infoBg: '#eef6fb',
  infoText: '#2c6083',
  infoBorder: '#a8d4e6',
  neutral: '#6b7b6b',
  neutralBg: '#f4f6f4',
  neutralText: '#3d4d3d',
} as const

// Typography
export const fonts = {
  stack: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace",
} as const

// Spacing (px)
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const

// Border radius
export const radii = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  pill: '100px',
} as const

// Asset helpers
export function logoUrl(): string {
  return `${config.app.url}/craftedcombintedblack.png`
}

export function figureLogoUrl(): string {
  return `${config.app.url}/craftedfigureblack.png`
}

export function appUrl(): string {
  return config.app.url
}

export function appName(): string {
  return config.app.name
}
