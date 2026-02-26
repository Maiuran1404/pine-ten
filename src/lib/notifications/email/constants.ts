import { config } from '@/lib/config'

// Brand color tokens — hardcoded hex required for email rendering (CSS vars unavailable)
// Each value references a design token from globals.css
export const colors = {
  primary: '#4a7c4a' /* --crafted-green */,
  primaryDark: '#3d6b3d' /* --crafted-green hover variant */,
  dark: '#2d5a2d' /* --crafted-forest */,
  subtle: '#e8f5e8' /* --crafted-mint light variant */,
  bodyBg: '#f4f6f4' /* --background light variant */,
  cardBg: '#ffffff' /* --card light mode */,
  offWhite: '#f8faf8' /* --muted light variant */,
  textHeading: '#1a1a1a' /* --foreground light mode */,
  textBody: '#3d4d3d' /* --foreground muted */,
  textMuted: '#6b7b6b' /* --muted-foreground light mode */,
  border: '#e2e8e2' /* --border light mode */,
  borderLight: '#eef2ee' /* --border-subtle light variant */,
  // Semantic status colors
  success: '#4a7c4a' /* --ds-success / --crafted-green */,
  successBg: '#e8f5e8' /* --ds-success light bg */,
  successText: '#2d5a2d' /* --crafted-forest */,
  warning: '#b8860b' /* --ds-warning */,
  warningBg: '#fef9ee' /* --ds-warning light bg */,
  warningText: '#7a5a08' /* --ds-warning dark */,
  warningBorder: '#f0d68a' /* --ds-warning border */,
  error: '#c0392b' /* --ds-error */,
  errorBg: '#fdf2f2' /* --ds-error light bg */,
  errorText: '#922b21' /* --ds-error dark */,
  errorBorder: '#f5c6cb' /* --ds-error border */,
  info: '#3a7ca5' /* --ds-info */,
  infoBg: '#eef6fb' /* --ds-info light bg */,
  infoText: '#2c6083' /* --ds-info dark */,
  infoBorder: '#a8d4e6' /* --ds-info border */,
  neutral: '#6b7b6b' /* --muted-foreground */,
  neutralBg: '#f4f6f4' /* --muted */,
  neutralText: '#3d4d3d' /* --foreground muted */,
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

// Asset helpers — hosted on Supabase Storage (public bucket) for reliable email delivery
const SUPABASE_STORAGE_BASE = `${config.supabase.url}/storage/v1/object/public/uploads/email`

export function logoUrl(): string {
  return `${SUPABASE_STORAGE_BASE}/logo-combined-white.png`
}

export function figureLogoUrl(): string {
  return `${SUPABASE_STORAGE_BASE}/logo-figure-white.png`
}

export function appUrl(): string {
  return config.app.url
}

export function appName(): string {
  return config.app.name
}
