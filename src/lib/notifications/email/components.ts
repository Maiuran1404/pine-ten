import { colors, fonts, radii, spacing } from './constants'

// ─── Heading ───────────────────────────────────────────────

interface HeadingOpts {
  level?: 1 | 2 | 3
  align?: 'left' | 'center'
  color?: string
}

const headingSizes: Record<1 | 2 | 3, { fontSize: string; lineHeight: string }> = {
  1: { fontSize: '28px', lineHeight: '36px' },
  2: { fontSize: '22px', lineHeight: '30px' },
  3: { fontSize: '18px', lineHeight: '26px' },
}

export function heading(text: string, opts: HeadingOpts = {}): string {
  const { level = 1, align = 'left', color = colors.textHeading } = opts
  const tag = `h${level}` as const
  const size = headingSizes[level]
  return `<${tag} style="margin:0 0 ${spacing.md}px 0;font-family:${fonts.stack};font-size:${size.fontSize};line-height:${size.lineHeight};font-weight:700;color:${color};text-align:${align};letter-spacing:-0.02em;">${text}</${tag}>`
}

// ─── Paragraph ─────────────────────────────────────────────

interface ParagraphOpts {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  align?: 'left' | 'center'
  muted?: boolean
}

const paragraphSizes = {
  sm: '13px',
  md: '15px',
  lg: '17px',
}

export function paragraph(text: string, opts: ParagraphOpts = {}): string {
  const { size = 'md', align = 'left', muted = false } = opts
  const color = opts.color || (muted ? colors.textMuted : colors.textBody)
  return `<p style="margin:0 0 ${spacing.md}px 0;font-family:${fonts.stack};font-size:${paragraphSizes[size]};line-height:1.6;color:${color};text-align:${align};">${text}</p>`
}

// ─── Button (Outlook-safe table pattern) ───────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonOpts {
  variant?: ButtonVariant
  align?: 'left' | 'center'
}

const buttonStyles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: colors.primary, text: '#ffffff', border: colors.primary },
  secondary: { bg: '#ffffff', text: colors.primary, border: colors.border },
  danger: { bg: colors.error, text: '#ffffff', border: colors.error },
}

export function button(text: string, href: string, opts: ButtonOpts = {}): string {
  const { variant = 'primary', align = 'left' } = opts
  const s = buttonStyles[variant]
  // Table-based button for Outlook compatibility
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${spacing.lg}px 0 ${spacing.md}px;${align === 'center' ? 'margin-left:auto;margin-right:auto;' : ''}">
  <tr>
    <td align="center" style="border-radius:${radii.sm};background:${s.bg};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="${s.border}" fillcolor="${s.bg}">
        <w:anchorlock/>
        <center style="color:${s.text};font-family:${fonts.stack};font-size:15px;font-weight:600;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${fonts.stack};font-size:15px;font-weight:600;color:${s.text};text-decoration:none;border-radius:${radii.sm};background:${s.bg};border:1px solid ${s.border};line-height:1;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`
}

// ─── Info Card ─────────────────────────────────────────────

interface InfoRow {
  label: string
  value: string
}

export function infoCard(rows: InfoRow[]): string {
  const rowsHtml = rows
    .map(
      (row, i) => `
    <tr>
      <td style="padding:${spacing.sm}px ${spacing.md}px;${i < rows.length - 1 ? `border-bottom:1px solid ${colors.borderLight};` : ''}color:${colors.textMuted};font-size:13px;font-family:${fonts.stack};white-space:nowrap;vertical-align:top;width:120px;">${row.label}</td>
      <td style="padding:${spacing.sm}px ${spacing.md}px;${i < rows.length - 1 ? `border-bottom:1px solid ${colors.borderLight};` : ''}color:${colors.textHeading};font-size:14px;font-weight:500;font-family:${fonts.stack};vertical-align:top;">${row.value}</td>
    </tr>`
    )
    .join('')

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:${spacing.md}px 0;background:${colors.offWhite};border-radius:${radii.md};border:1px solid ${colors.borderLight};border-collapse:separate;">
  ${rowsHtml}
</table>`
}

// ─── Status Badge ──────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const badgeColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successBg, text: colors.successText },
  warning: { bg: colors.warningBg, text: colors.warningText },
  error: { bg: colors.errorBg, text: colors.errorText },
  info: { bg: colors.infoBg, text: colors.infoText },
  neutral: { bg: colors.neutralBg, text: colors.neutralText },
}

export function statusBadge(text: string, variant: BadgeVariant = 'neutral'): string {
  const c = badgeColors[variant]
  return `<span style="display:inline-block;padding:4px 12px;font-family:${fonts.stack};font-size:12px;font-weight:600;color:${c.text};background:${c.bg};border-radius:${radii.pill};letter-spacing:0.02em;text-transform:uppercase;">${text}</span>`
}

// ─── Callout ───────────────────────────────────────────────

type CalloutVariant = 'success' | 'warning' | 'error' | 'info'

interface CalloutOpts {
  title?: string
}

const calloutColors: Record<CalloutVariant, { bg: string; border: string; text: string }> = {
  success: { bg: colors.successBg, border: colors.primary, text: colors.successText },
  warning: { bg: colors.warningBg, border: colors.warningBorder, text: colors.warningText },
  error: { bg: colors.errorBg, border: colors.error, text: colors.errorText },
  info: { bg: colors.infoBg, border: colors.infoBorder, text: colors.infoText },
}

export function callout(
  text: string,
  variant: CalloutVariant = 'info',
  opts: CalloutOpts = {}
): string {
  const c = calloutColors[variant]
  const titleHtml = opts.title
    ? `<strong style="display:block;margin-bottom:6px;font-size:14px;color:${c.text};">${opts.title}</strong>`
    : ''
  return `
<div style="margin:${spacing.md}px 0;padding:${spacing.md}px ${spacing.lg}px;background:${c.bg};border-left:4px solid ${c.border};border-radius:0 ${radii.sm} ${radii.sm} 0;font-family:${fonts.stack};font-size:14px;line-height:1.6;color:${c.text};">
  ${titleHtml}${text}
</div>`
}

// ─── Divider ───────────────────────────────────────────────

export function divider(): string {
  return `<hr style="margin:${spacing.lg}px 0;border:none;border-top:1px solid ${colors.borderLight};" />`
}

// ─── Spacer ────────────────────────────────────────────────

export function spacer(height: number = spacing.lg): string {
  return `<div style="height:${height}px;line-height:${height}px;font-size:1px;">&nbsp;</div>`
}
