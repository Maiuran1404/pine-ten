import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/ai/briefing-state-machine', () => ({}))

// Mock localStorage
const mockStorage: Record<string, string> = {}
const mockDispatchEvent = vi.fn()

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    mockStorage[key] = val
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  }),
})

vi.stubGlobal('window', {
  ...globalThis,
  dispatchEvent: mockDispatchEvent,
  localStorage: globalThis.localStorage,
})

vi.stubGlobal(
  'CustomEvent',
  class CustomEvent {
    type: string
    constructor(type: string) {
      this.type = type
    }
  }
)

const { getDrafts, getDraft, saveDraft, deleteDraft, generateDraftId, generateDraftTitle } =
  await import('./chat-drafts')

function createMockDraft(
  overrides: Partial<{ id: string; title: string; createdAt: string }> = {}
) {
  return {
    id: overrides.id || 'draft-1',
    title: overrides.title || 'Test Draft',
    messages: [],
    selectedStyles: [],
    pendingTask: null,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('getDrafts', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    vi.clearAllMocks()
  })

  it('returns empty array when no drafts stored', () => {
    const drafts = getDrafts()
    expect(drafts).toEqual([])
  })

  it('returns parsed drafts from localStorage', () => {
    const draft = createMockDraft()
    mockStorage['crafted_chat_drafts'] = JSON.stringify([draft])

    const drafts = getDrafts()
    expect(drafts).toHaveLength(1)
    expect(drafts[0].id).toBe('draft-1')
  })

  it('returns empty array on parse error', () => {
    mockStorage['crafted_chat_drafts'] = 'invalid-json'
    const drafts = getDrafts()
    expect(drafts).toEqual([])
  })
})

describe('getDraft', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    vi.clearAllMocks()
  })

  it('returns the draft with matching id', () => {
    const draft = createMockDraft({ id: 'abc' })
    mockStorage['crafted_chat_drafts'] = JSON.stringify([draft])

    const result = getDraft('abc')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('abc')
  })

  it('returns null when draft not found', () => {
    mockStorage['crafted_chat_drafts'] = JSON.stringify([createMockDraft()])
    expect(getDraft('nonexistent')).toBeNull()
  })
})

describe('saveDraft', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    vi.clearAllMocks()
  })

  it('adds new draft to localStorage', () => {
    const draft = createMockDraft({ id: 'new-1' })
    saveDraft(draft as never)

    const stored = JSON.parse(mockStorage['crafted_chat_drafts'])
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('new-1')
  })

  it('updates existing draft', () => {
    const draft = createMockDraft({ id: 'draft-1', title: 'Original' })
    mockStorage['crafted_chat_drafts'] = JSON.stringify([draft])

    const updated = { ...draft, title: 'Updated' }
    saveDraft(updated as never)

    const stored = JSON.parse(mockStorage['crafted_chat_drafts'])
    expect(stored).toHaveLength(1)
    expect(stored[0].title).toBe('Updated')
  })

  it('limits to 10 drafts', () => {
    const drafts = Array.from({ length: 12 }, (_, i) => createMockDraft({ id: `draft-${i}` }))
    mockStorage['crafted_chat_drafts'] = JSON.stringify(drafts)

    saveDraft(createMockDraft({ id: 'draft-new' }) as never)

    const stored = JSON.parse(mockStorage['crafted_chat_drafts'])
    expect(stored.length).toBeLessThanOrEqual(10)
  })

  it('dispatches drafts-updated event', async () => {
    saveDraft(createMockDraft() as never)
    await new Promise((resolve) => queueMicrotask(resolve))
    expect(mockDispatchEvent).toHaveBeenCalled()
  })
})

describe('deleteDraft', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    vi.clearAllMocks()
  })

  it('removes the draft with matching id', () => {
    const drafts = [createMockDraft({ id: 'a' }), createMockDraft({ id: 'b' })]
    mockStorage['crafted_chat_drafts'] = JSON.stringify(drafts)

    deleteDraft('a')

    const stored = JSON.parse(mockStorage['crafted_chat_drafts'])
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('b')
  })

  it('does nothing when draft not found', () => {
    const drafts = [createMockDraft({ id: 'a' })]
    mockStorage['crafted_chat_drafts'] = JSON.stringify(drafts)

    deleteDraft('nonexistent')

    const stored = JSON.parse(mockStorage['crafted_chat_drafts'])
    expect(stored).toHaveLength(1)
  })
})

describe('generateDraftId', () => {
  it('returns a UUID-format string', () => {
    const id = generateDraftId()
    expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i)
  })

  it('generates unique IDs', () => {
    const id1 = generateDraftId()
    const id2 = generateDraftId()
    expect(id1).not.toBe(id2)
  })
})

describe('generateDraftTitle', () => {
  it('returns "New Request" for empty messages', () => {
    expect(generateDraftTitle([])).toBe('New Request')
  })

  it('detects instagram deliverable type', () => {
    const messages = [{ role: 'user', content: 'I need an instagram post for launch' }]
    const title = generateDraftTitle(messages)
    expect(title).toContain('Instagram')
  })

  it('detects purpose words like launch', () => {
    const messages = [{ role: 'user', content: 'instagram post for our product launch' }]
    const title = generateDraftTitle(messages)
    expect(title).toContain('Launch')
  })

  it('falls back to truncated message for generic content', () => {
    const longMsg = 'This is a very long message that should be truncated for the title display'
    const messages = [{ role: 'user', content: longMsg }]
    const title = generateDraftTitle(messages)
    expect(title.length).toBeLessThan(longMsg.length + 30) // account for date suffix
  })

  it('extracts quoted text as key subject', () => {
    const messages = [{ role: 'user', content: 'instagram post for "Acme Corp" launch' }]
    const title = generateDraftTitle(messages)
    expect(title).toContain('Acme Corp')
  })
})
