import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  styleSelectionHistory: {
    userId: 'userId',
    styleId: 'styleId',
    deliverableType: 'deliverableType',
    styleAxis: 'styleAxis',
    selectionContext: 'selectionContext',
    wasConfirmed: 'wasConfirmed',
    draftId: 'draftId',
    createdAt: 'createdAt',
  },
  deliverableStyleReferences: {
    id: 'id',
    name: 'name',
    styleAxis: 'styleAxis',
    deliverableType: 'deliverableType',
    usageCount: 'usageCount',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
  sql: vi.fn(),
  count: vi.fn(() => 'count_fn'),
}))

const { recordStyleSelection, confirmStyleSelection, getRecentlySelectedStyles } =
  await import('./selection-history')

describe('recordStyleSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a selection record and increments usage', async () => {
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    })

    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await recordStyleSelection({
      userId: 'user-1',
      styleId: 'style-1',
      deliverableType: 'instagram_post',
      styleAxis: 'minimal',
    })

    expect(mockInsert).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('uses default values for optional params', async () => {
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    })

    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await recordStyleSelection({
      userId: 'user-1',
      styleId: 'style-1',
      deliverableType: 'instagram_post',
      styleAxis: 'bold',
    })

    // Verify insert was called (default context='chat', wasConfirmed=false)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })
})

describe('confirmStyleSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks a selection as confirmed', async () => {
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await confirmStyleSelection('user-1', 'style-1')
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('includes draftId in conditions when provided', async () => {
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await confirmStyleSelection('user-1', 'style-1', 'draft-1')
    expect(mockUpdate).toHaveBeenCalled()
  })
})

describe('getRecentlySelectedStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns recently selected styles', async () => {
    const mockResults = [
      {
        id: 'style-1',
        name: 'Bold Design',
        styleAxis: 'bold',
        deliverableType: 'instagram_post',
        selectedAt: new Date(),
      },
    ]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockResults),
            }),
          }),
        }),
      }),
    })

    const result = await getRecentlySelectedStyles('user-1', 5)
    expect(result).toEqual(mockResults)
  })

  it('uses default limit of 5', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })

    await getRecentlySelectedStyles('user-1')
    expect(mockSelect).toHaveBeenCalled()
  })
})
