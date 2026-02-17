import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelectDistinctOn = vi.fn()
const mockSelect = vi.fn()
const mockSelectDistinct = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/db', () => ({
  db: {
    selectDistinctOn: (...args: unknown[]) => mockSelectDistinctOn(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    selectDistinct: (...args: unknown[]) => mockSelectDistinct(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  deliverableStyleReferences: {
    id: 'id',
    name: 'name',
    description: 'description',
    imageUrl: 'imageUrl',
    deliverableType: 'deliverableType',
    styleAxis: 'styleAxis',
    subStyle: 'subStyle',
    semanticTags: 'semanticTags',
    featuredOrder: 'featuredOrder',
    displayOrder: 'displayOrder',
    isActive: 'isActive',
    usageCount: 'usageCount',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}))

const {
  getInitialDeliverableStyles,
  getMoreOfStyle,
  getDifferentStyles,
  incrementStyleUsage,
  getAvailableStyleAxes,
  getStyleCount,
} = await import('./deliverable-styles')

describe('getInitialDeliverableStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns distinct styles per axis for a deliverable type', async () => {
    const mockStyles = [
      { id: '1', name: 'Minimal Clean', styleAxis: 'minimal', deliverableType: 'instagram_post' },
      { id: '2', name: 'Bold Impact', styleAxis: 'bold', deliverableType: 'instagram_post' },
    ]

    mockSelectDistinctOn.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockStyles),
        }),
      }),
    })

    const result = await getInitialDeliverableStyles('instagram_post')
    expect(result).toEqual(mockStyles)
    expect(mockSelectDistinctOn).toHaveBeenCalled()
  })
})

describe('getMoreOfStyle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated styles for a specific axis', async () => {
    const mockStyles = [{ id: '3', name: 'Minimal Light', styleAxis: 'minimal' }]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockStyles),
            }),
          }),
        }),
      }),
    })

    const result = await getMoreOfStyle('instagram_post', 'minimal', 0, 4)
    expect(result).toEqual(mockStyles)
  })
})

describe('getDifferentStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns styles excluding specified axes', async () => {
    const mockStyles = [{ id: '4', name: 'Playful Fun', styleAxis: 'playful' }]

    mockSelectDistinctOn.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockStyles),
          }),
        }),
      }),
    })

    const result = await getDifferentStyles('instagram_post', ['minimal', 'bold'], 4)
    expect(result).toEqual(mockStyles)
  })
})

describe('incrementStyleUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing for empty array', async () => {
    await incrementStyleUsage([])
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('increments usage count for given style IDs', async () => {
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await incrementStyleUsage(['id-1', 'id-2'])
    expect(mockUpdate).toHaveBeenCalled()
  })
})

describe('getAvailableStyleAxes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns distinct style axes for a deliverable type', async () => {
    mockSelectDistinct.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ styleAxis: 'minimal' }, { styleAxis: 'bold' }]),
      }),
    })

    const result = await getAvailableStyleAxes('instagram_post')
    expect(result).toEqual(['minimal', 'bold'])
  })
})

describe('getStyleCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns count for deliverable type', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 42 }]),
      }),
    })

    const result = await getStyleCount('instagram_post')
    expect(result).toBe(42)
  })

  it('returns 0 when no results', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const result = await getStyleCount('instagram_post')
    expect(result).toBe(0)
  })
})
