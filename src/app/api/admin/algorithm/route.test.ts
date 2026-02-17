import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  assignmentAlgorithmConfig: {
    id: 'id',
    version: 'version',
    isActive: 'isActive',
    createdAt: 'createdAt',
  },
  skills: { isActive: 'isActive', category: 'category', name: 'name' },
}))

vi.mock('@/lib/assignment-algorithm', () => ({
  DEFAULT_CONFIG: {
    weights: {
      skillMatch: 30,
      timezoneFit: 15,
      experienceMatch: 25,
      workloadBalance: 15,
      performanceHistory: 15,
    },
    acceptanceWindows: {},
    escalationSettings: {},
    timezoneSettings: {},
    experienceMatrix: {},
    workloadSettings: {},
    exclusionRules: {},
    bonusModifiers: {},
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/algorithm',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET, POST, PUT } = await import('./route')

describe('GET /api/admin/algorithm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const request = makeRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should return algorithm configurations with active config', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockConfigs = [
      {
        id: 'config-1',
        version: 2,
        name: 'Config v2',
        description: 'Latest config',
        isActive: true,
        weights: {
          skillMatch: 30,
          timezoneFit: 15,
          experienceMatch: 25,
          workloadBalance: 15,
          performanceHistory: 15,
        },
        acceptanceWindows: {},
        escalationSettings: {},
        timezoneSettings: {},
        experienceMatrix: {},
        workloadSettings: {},
        exclusionRules: {},
        bonusModifiers: {},
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const mockSkills = [{ id: 'skill-1', name: 'React', category: 'frontend', isActive: true }]

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      if (callIndex === 0) {
        callIndex++
        return {
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockConfigs),
          }),
        }
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockSkills),
          }),
        }),
      }
    })

    const request = makeRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.configurations).toHaveLength(1)
    expect(data.data.activeConfig.id).toBe('config-1')
    expect(data.data.skills).toHaveLength(1)
    expect(data.data.defaultConfig).toBeDefined()
  })

  it('should return default config when no active config exists', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      if (callIndex === 0) {
        callIndex++
        return {
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }
    })

    const request = makeRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.activeConfig.id).toBeNull()
    expect(data.data.activeConfig.name).toBe('Default Configuration')
  })
})

describe('POST /api/admin/algorithm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const request = makeRequest({
      weights: {
        skillMatch: 30,
        timezoneFit: 15,
        experienceMatch: 25,
        workloadBalance: 15,
        performanceHistory: 15,
      },
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should create a new algorithm configuration', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    // Get latest version
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ version: 1 }]),
        }),
      }),
    })

    const newConfig = {
      id: 'config-new',
      version: 2,
      name: 'Configuration v2',
      isActive: false,
    }

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newConfig]),
      }),
    })

    const request = makeRequest({
      weights: {
        skillMatch: 30,
        timezoneFit: 15,
        experienceMatch: 25,
        workloadBalance: 15,
        performanceHistory: 15,
      },
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.config.version).toBe(2)
    expect(data.data.config.isActive).toBe(false)
  })

  it('should return 400 when weights do not sum to 100', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({
      weights: {
        skillMatch: 50,
        timezoneFit: 50,
        experienceMatch: 50,
        workloadBalance: 50,
        performanceHistory: 50,
      },
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})

describe('PUT /api/admin/algorithm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when id missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({ name: 'Updated Config' })
    const response = await PUT(request)

    expect(response.status).toBe(400)
  })

  it('should return 400 when trying to edit active config', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'config-1', isActive: true }]),
      }),
    })

    const request = makeRequest({ id: 'config-1', name: 'Updated' })
    const response = await PUT(request)

    expect(response.status).toBe(400)
  })

  it('should update a draft configuration', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'config-2',
            isActive: false,
            name: 'Draft Config',
            description: 'A draft',
            weights: {
              skillMatch: 30,
              timezoneFit: 15,
              experienceMatch: 25,
              workloadBalance: 15,
              performanceHistory: 15,
            },
            acceptanceWindows: {},
            escalationSettings: {},
            timezoneSettings: {},
            experienceMatrix: {},
            workloadSettings: {},
            exclusionRules: {},
            bonusModifiers: {},
          },
        ]),
      }),
    })

    const updatedConfig = {
      id: 'config-2',
      name: 'Updated Draft Config',
      isActive: false,
    }

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedConfig]),
        }),
      }),
    })

    const request = makeRequest({ id: 'config-2', name: 'Updated Draft Config' })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.config.name).toBe('Updated Draft Config')
  })
})
