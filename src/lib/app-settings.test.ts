import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  platformSettings: {
    id: 'id',
    key: 'key',
    value: 'value',
    updatedBy: 'updatedBy',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
}))

const { getSetting, setSetting, getAllSettings, clearSettingsCache } =
  await import('./app-settings')

describe('getSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSettingsCache()
  })

  it('returns value from database', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ value: 99 }]),
        }),
      }),
    })

    const result = await getSetting('creditPrice')
    expect(result).toBe(99)
  })

  it('returns default when no row in database', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const result = await getSetting('creditPrice')
    expect(result).toBe(49) // Default
  })

  it('uses cache on second call', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ value: 55 }]),
        }),
      }),
    })

    const result1 = await getSetting('creditPrice')
    const result2 = await getSetting('creditPrice')

    expect(result1).toBe(55)
    expect(result2).toBe(55)
    // DB should only be queried once
    expect(mockSelect).toHaveBeenCalledTimes(1)
  })

  it('returns default on database error', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    })

    const result = await getSetting('maintenanceMode')
    expect(result).toBe(false) // Default for maintenanceMode
  })

  it('returns null for unknown setting with no default', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const result = await getSetting('unknownSetting')
    expect(result).toBeNull()
  })
})

describe('setSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSettingsCache()
  })

  it('updates existing setting', async () => {
    // Check if existing
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'setting-1' }]),
        }),
      }),
    })

    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await setSetting('creditPrice', 100, 'admin-1')
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('inserts new setting when not existing', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    })

    await setSetting('newSetting', 'value')
    expect(mockInsert).toHaveBeenCalled()
  })
})

describe('getAllSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSettingsCache()
  })

  it('returns merged defaults and DB values', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi
        .fn()
        .mockResolvedValue([
          { key: 'creditPrice', value: 99, id: '1', updatedBy: null, updatedAt: null },
        ]),
    })

    const result = await getAllSettings()
    expect(result.creditPrice).toBe(99) // Overridden from DB
    expect(result.maxRevisions).toBe(2) // Default value
  })

  it('returns defaults on database error', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockRejectedValue(new Error('DB error')),
    })

    const result = await getAllSettings()
    expect(result.creditPrice).toBe(49)
    expect(result.maintenanceMode).toBe(false)
  })
})

describe('clearSettingsCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSettingsCache()
  })

  it('forces DB query on next getSetting call', async () => {
    // First call
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ value: 50 }]),
        }),
      }),
    })
    await getSetting('creditPrice')
    expect(mockSelect).toHaveBeenCalledTimes(1)

    // Clear cache
    clearSettingsCache()

    // Second call should hit DB again
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ value: 75 }]),
        }),
      }),
    })
    const result = await getSetting('creditPrice')
    expect(result).toBe(75)
    expect(mockSelect).toHaveBeenCalledTimes(2)
  })
})
