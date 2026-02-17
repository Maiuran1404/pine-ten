import { describe, it, expect, vi } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Anthropic SDK — needs to be a class-like constructor
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: vi.fn() }
    },
  }
})

// Mock db
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  },
}))

// Mock schema
vi.mock('@/db/schema', () => ({
  styleReferences: { isActive: 'isActive' },
  taskCategories: { isActive: 'isActive' },
  users: { id: 'id' },
  audiences: { companyId: 'companyId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { parseTaskFromChat } = await import('./chat')

// ============================================
// parseTaskFromChat
// ============================================
describe('parseTaskFromChat', () => {
  it('extracts valid task JSON from content', () => {
    const content = `Here's the task:
[TASK_READY]{"title": "Logo Design", "description": "Create a modern logo", "credits": 5}[/TASK_READY]`

    const result = parseTaskFromChat(content)
    expect(result).toEqual({
      title: 'Logo Design',
      description: 'Create a modern logo',
      credits: 5,
    })
  })

  it('returns null when no TASK_READY marker found', () => {
    expect(parseTaskFromChat('Just a regular message')).toBeNull()
  })

  it('returns null for malformed JSON in TASK_READY block', () => {
    const content = '[TASK_READY]not valid json[/TASK_READY]'
    expect(parseTaskFromChat(content)).toBeNull()
  })

  it('strips hex codes from description', () => {
    const content = `[TASK_READY]{"title": "Brand", "description": "Use color (#15202B) and secondary (#FFF)"}[/TASK_READY]`
    const result = parseTaskFromChat(content)
    expect(result).not.toBeNull()
    expect((result as Record<string, string>).description).not.toContain('#15202B')
    expect((result as Record<string, string>).description).not.toContain('#FFF')
  })

  it('handles multiline JSON in TASK_READY block', () => {
    const content = `[TASK_READY]
{
  "title": "Video Ad",
  "description": "Create a 30s video ad"
}
[/TASK_READY]`

    const result = parseTaskFromChat(content)
    expect(result).toEqual({
      title: 'Video Ad',
      description: 'Create a 30s video ad',
    })
  })

  it('handles content before and after TASK_READY block', () => {
    const content = `Great, here's your task:
[TASK_READY]{"title": "Test"}[/TASK_READY]
Let me know if you'd like changes.`

    const result = parseTaskFromChat(content)
    expect(result).toEqual({ title: 'Test' })
  })
})

// ============================================
// Module exports
// ============================================
describe('chat module exports', () => {
  it('exports parseTaskFromChat as a named export', async () => {
    const mod = await import('./chat')
    expect(typeof mod.parseTaskFromChat).toBe('function')
  })

  it('exports chat as a named export', async () => {
    const mod = await import('./chat')
    expect(typeof mod.chat).toBe('function')
  })

  it('exports getStyleReferencesByCategory as a named export', async () => {
    const mod = await import('./chat')
    expect(typeof mod.getStyleReferencesByCategory).toBe('function')
  })
})

// ============================================
// Marker extraction patterns (regex testing)
// ============================================
describe('marker extraction patterns', () => {
  const DELIVERABLE_MARKER_REGEX = /\[DELIVERABLE_STYLES: ([^\]]+)\]/
  const MORE_STYLES_REGEX = /\[MORE_STYLES: ([^,]+),\s*([^\]]+)\]/
  const DIFFERENT_STYLES_REGEX = /\[DIFFERENT_STYLES: ([^\]]+)\]/
  const SEARCH_STYLES_REGEX = /\[SEARCH_STYLES: ([^,]+),\s*([^\]]+)\]/
  const REFINE_STYLE_REGEX = /\[REFINE_STYLE: ([^,]+),\s*([^,]+),\s*([^\]]+)\]/
  const QUICK_OPTIONS_REGEX = /\[QUICK_OPTIONS\]\s*([\s\S]*?)\s*\[\/QUICK_OPTIONS\]/
  const STYLE_REFERENCES_REGEX = /\[STYLE_REFERENCES: ([^\]]+)\]/

  describe('DELIVERABLE_STYLES marker', () => {
    it('extracts deliverable type', () => {
      const match = '[DELIVERABLE_STYLES: instagram_reel]'.match(DELIVERABLE_MARKER_REGEX)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('instagram_reel')
    })

    it('handles whitespace in type', () => {
      const match = '[DELIVERABLE_STYLES:  instagram_post ]'.match(DELIVERABLE_MARKER_REGEX)
      expect(match).not.toBeNull()
      expect(match![1].trim()).toBe('instagram_post')
    })
  })

  describe('MORE_STYLES marker', () => {
    it('extracts type and axis', () => {
      const match = '[MORE_STYLES: instagram_post, bold]'.match(MORE_STYLES_REGEX)
      expect(match).not.toBeNull()
      expect(match![1].trim()).toBe('instagram_post')
      expect(match![2].trim()).toBe('bold')
    })
  })

  describe('DIFFERENT_STYLES marker', () => {
    it('extracts deliverable type', () => {
      const match = '[DIFFERENT_STYLES: static_ad]'.match(DIFFERENT_STYLES_REGEX)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('static_ad')
    })
  })

  describe('SEARCH_STYLES marker', () => {
    it('extracts query and type', () => {
      const match = '[SEARCH_STYLES: dark tech vibes, instagram_reel]'.match(SEARCH_STYLES_REGEX)
      expect(match).not.toBeNull()
      expect(match![1].trim()).toBe('dark tech vibes')
      expect(match![2].trim()).toBe('instagram_reel')
    })
  })

  describe('REFINE_STYLE marker', () => {
    it('extracts refinement query, base style ID, and type', () => {
      const match = '[REFINE_STYLE: warmer tones, style-123, instagram_post]'.match(
        REFINE_STYLE_REGEX
      )
      expect(match).not.toBeNull()
      expect(match![1].trim()).toBe('warmer tones')
      expect(match![2].trim()).toBe('style-123')
      expect(match![3].trim()).toBe('instagram_post')
    })
  })

  describe('QUICK_OPTIONS marker', () => {
    it('extracts JSON options', () => {
      const content = `[QUICK_OPTIONS]{"question": "Ready?", "options": ["Yes", "No"]}[/QUICK_OPTIONS]`
      const match = content.match(QUICK_OPTIONS_REGEX)
      expect(match).not.toBeNull()
      const parsed = JSON.parse(match![1])
      expect(parsed.question).toBe('Ready?')
      expect(parsed.options).toEqual(['Yes', 'No'])
    })

    it('handles multiline JSON', () => {
      const content = `[QUICK_OPTIONS]
{
  "question": "Style preference?",
  "options": ["Bold", "Minimal", "Something else"]
}
[/QUICK_OPTIONS]`
      const match = content.match(QUICK_OPTIONS_REGEX)
      expect(match).not.toBeNull()
      const parsed = JSON.parse(match![1])
      expect(parsed.options).toHaveLength(3)
    })
  })

  describe('STYLE_REFERENCES marker', () => {
    it('extracts comma-separated styles', () => {
      const match = '[STYLE_REFERENCES: Minimalist, Bold, Retro]'.match(STYLE_REFERENCES_REGEX)
      expect(match).not.toBeNull()
      const styles = match![1].split(',').map((s) => s.trim())
      expect(styles).toEqual(['Minimalist', 'Bold', 'Retro'])
    })
  })
})

// ============================================
// Content cleaning patterns
// ============================================
describe('content cleaning patterns', () => {
  const cleanContent = (content: string): string => {
    let cleaned = content
      .replace(/\[STYLE_REFERENCES: [^\]]+\]/g, '')
      .replace(/\[DELIVERABLE_STYLES: [^\]]+\]/g, '')
      .replace(/\[MORE_STYLES: [^\]]+\]/g, '')
      .replace(/\[DIFFERENT_STYLES: [^\]]+\]/g, '')
      .replace(/\[SEARCH_STYLES: [^\]]+\]/g, '')
      .replace(/\[REFINE_STYLE: [^\]]+\]/g, '')
      .replace(/\[QUICK_OPTIONS\][\s\S]*?(?:\[\/QUICK_OPTIONS\]|$)/g, '')
      .replace(/\[\/QUICK_OPTIONS\]/g, '')
      .replace(/\[QUICK_OPTIONS[^\]]*$/gm, '')
      .trim()

    const BANNED_OPENERS = [
      /^Strong direction[.!,\s—-]*/i,
      /^Smart move[.!,\s—-]*/i,
      /^Bold choice[.!,\s—-]*/i,
      /^Perfect[.!,\s—-]*/i,
      /^Great[.!,\s—-]*/i,
      /^Excellent[.!,\s—-]*/i,
      /^Amazing[.!,\s—-]*/i,
      /^Awesome[.!,\s—-]*/i,
      /^Love it[.!,\s—-]*/i,
      /^Love that[.!,\s—-]*/i,
    ]

    for (const pattern of BANNED_OPENERS) {
      cleaned = cleaned.replace(pattern, '')
    }

    cleaned = cleaned
      .replace(
        /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu,
        ''
      )
      .replace(/\s*\(?\s*#[A-Fa-f0-9]{3,8}\s*\)?\s*/g, ' ')
      .replace(/\bcolor\s*\(\s*\)/gi, 'color')
      .replace(/\bcolors\s*\(\s*\)/gi, 'colors')
      .replace(/\(\s*\)/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (cleaned.length > 0) {
      const firstLetterIndex = cleaned.search(/[a-zA-Z]/)
      if (firstLetterIndex !== -1) {
        const firstLetter = cleaned.charAt(firstLetterIndex)
        if (firstLetter >= 'a' && firstLetter <= 'z') {
          cleaned =
            cleaned.slice(0, firstLetterIndex) +
            firstLetter.toUpperCase() +
            cleaned.slice(firstLetterIndex + 1)
        }
      }
    }

    return cleaned
  }

  it('strips all marker types', () => {
    const content =
      'Check these out [DELIVERABLE_STYLES: instagram_reel] and more [STYLE_REFERENCES: Bold]'
    const result = cleanContent(content)
    expect(result).not.toContain('[DELIVERABLE_STYLES')
    expect(result).not.toContain('[STYLE_REFERENCES')
  })

  it('strips QUICK_OPTIONS blocks', () => {
    const content =
      'Here is the plan.\n[QUICK_OPTIONS]{"question": "Ready?", "options": ["Yes"]}[/QUICK_OPTIONS]'
    const result = cleanContent(content)
    expect(result).not.toContain('QUICK_OPTIONS')
    expect(result).toBe('Here is the plan.')
  })

  it('removes banned openers', () => {
    expect(cleanContent('Perfect! Here is your design.')).toBe('Here is your design.')
    expect(cleanContent('Great, let me help.')).toBe('Let me help.')
    expect(cleanContent('Amazing! This looks good.')).toBe('This looks good.')
    expect(cleanContent('Love it — moving forward.')).toBe('Moving forward.')
  })

  it('removes emojis', () => {
    const result = cleanContent('Here is your design 🎨 looking good 🔥')
    expect(result).not.toContain('🎨')
    expect(result).not.toContain('🔥')
  })

  it('strips hex codes', () => {
    const result = cleanContent('Use primary color (#15202B) and accent (#FF6B35)')
    expect(result).not.toContain('#15202B')
    expect(result).not.toContain('#FF6B35')
  })

  it('capitalizes first letter', () => {
    expect(cleanContent('lowercase start')).toBe('Lowercase start')
  })

  it('preserves already-capitalized content', () => {
    expect(cleanContent('Already capitalized')).toBe('Already capitalized')
  })

  it('collapses excessive whitespace', () => {
    const result = cleanContent('Too    many   spaces')
    expect(result).toBe('Too many spaces')
  })

  it('collapses excessive newlines', () => {
    const result = cleanContent('Line 1\n\n\n\n\nLine 2')
    expect(result).toBe('Line 1\n\nLine 2')
  })

  it('handles empty content after cleaning', () => {
    const result = cleanContent('[DELIVERABLE_STYLES: instagram_reel]')
    expect(result).toBe('')
  })
})
