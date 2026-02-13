import { describe, it, expect } from 'vitest'
import {
  heading,
  paragraph,
  button,
  infoCard,
  statusBadge,
  callout,
  divider,
  spacer,
} from './components'
import { colors } from './constants'

describe('email components', () => {
  describe('heading', () => {
    it('renders h1 by default with correct styling', () => {
      const result = heading('Hello World')
      expect(result).toContain('<h1')
      expect(result).toContain('Hello World')
      expect(result).toContain('28px')
      expect(result).toContain(colors.textHeading)
    })

    it('renders h2 with smaller font size', () => {
      const result = heading('Subtitle', { level: 2 })
      expect(result).toContain('<h2')
      expect(result).toContain('22px')
    })

    it('renders h3 with smallest font size', () => {
      const result = heading('Small', { level: 3 })
      expect(result).toContain('<h3')
      expect(result).toContain('18px')
    })

    it('supports center alignment', () => {
      const result = heading('Centered', { align: 'center' })
      expect(result).toContain('text-align:center')
    })

    it('supports custom color', () => {
      const result = heading('Green', { color: '#ff0000' })
      expect(result).toContain('#ff0000')
    })
  })

  describe('paragraph', () => {
    it('renders with body color by default', () => {
      const result = paragraph('Some text')
      expect(result).toContain('<p')
      expect(result).toContain('Some text')
      expect(result).toContain(colors.textBody)
    })

    it('renders muted variant', () => {
      const result = paragraph('Muted text', { muted: true })
      expect(result).toContain(colors.textMuted)
    })

    it('renders small size', () => {
      const result = paragraph('Small', { size: 'sm' })
      expect(result).toContain('13px')
    })

    it('renders large size', () => {
      const result = paragraph('Large', { size: 'lg' })
      expect(result).toContain('17px')
    })

    it('supports center alignment', () => {
      const result = paragraph('Center', { align: 'center' })
      expect(result).toContain('text-align:center')
    })
  })

  describe('button', () => {
    it('renders primary button with sage green', () => {
      const result = button('Click Me', 'https://example.com')
      expect(result).toContain('Click Me')
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain(colors.primary)
    })

    it('renders danger button with error color', () => {
      const result = button('Delete', 'https://example.com', {
        variant: 'danger',
      })
      expect(result).toContain(colors.error)
    })

    it('renders secondary button with white bg', () => {
      const result = button('Cancel', 'https://example.com', {
        variant: 'secondary',
      })
      expect(result).toContain('#ffffff')
    })

    it('includes Outlook VML fallback', () => {
      const result = button('Test', 'https://example.com')
      expect(result).toContain('v:roundrect')
      expect(result).toContain('[if mso]')
    })

    it('supports center alignment', () => {
      const result = button('Center', 'https://example.com', {
        align: 'center',
      })
      expect(result).toContain('margin-left:auto;margin-right:auto')
    })
  })

  describe('infoCard', () => {
    it('renders rows with labels and values', () => {
      const result = infoCard([
        { label: 'Name', value: 'John' },
        { label: 'Email', value: 'john@test.com' },
      ])
      expect(result).toContain('Name')
      expect(result).toContain('John')
      expect(result).toContain('Email')
      expect(result).toContain('john@test.com')
    })

    it('uses off-white background', () => {
      const result = infoCard([{ label: 'Key', value: 'Val' }])
      expect(result).toContain(colors.offWhite)
    })

    it('renders border between rows except last', () => {
      const result = infoCard([
        { label: 'A', value: '1' },
        { label: 'B', value: '2' },
      ])
      expect(result).toContain(colors.borderLight)
    })
  })

  describe('statusBadge', () => {
    it('renders success badge', () => {
      const result = statusBadge('Active', 'success')
      expect(result).toContain('Active')
      expect(result).toContain(colors.successBg)
      expect(result).toContain(colors.successText)
    })

    it('renders error badge', () => {
      const result = statusBadge('Failed', 'error')
      expect(result).toContain(colors.errorBg)
      expect(result).toContain(colors.errorText)
    })

    it('renders with pill border-radius', () => {
      const result = statusBadge('Test', 'info')
      expect(result).toContain('100px')
    })

    it('uses uppercase text', () => {
      const result = statusBadge('test', 'neutral')
      expect(result).toContain('text-transform:uppercase')
    })
  })

  describe('callout', () => {
    it('renders warning callout with left border', () => {
      const result = callout('Watch out!', 'warning')
      expect(result).toContain('Watch out!')
      expect(result).toContain('border-left:4px solid')
      expect(result).toContain(colors.warningBg)
    })

    it('renders with optional title', () => {
      const result = callout('Body text', 'info', { title: 'Note' })
      expect(result).toContain('<strong')
      expect(result).toContain('Note')
      expect(result).toContain('Body text')
    })

    it('renders error callout', () => {
      const result = callout('Error occurred', 'error')
      expect(result).toContain(colors.errorBg)
      expect(result).toContain(colors.error)
    })

    it('renders success callout', () => {
      const result = callout('All good', 'success')
      expect(result).toContain(colors.successBg)
    })
  })

  describe('divider', () => {
    it('renders hr element', () => {
      const result = divider()
      expect(result).toContain('<hr')
      expect(result).toContain(colors.borderLight)
    })
  })

  describe('spacer', () => {
    it('renders with default height', () => {
      const result = spacer()
      expect(result).toContain('24px')
    })

    it('renders with custom height', () => {
      const result = spacer(40)
      expect(result).toContain('40px')
    })
  })
})
