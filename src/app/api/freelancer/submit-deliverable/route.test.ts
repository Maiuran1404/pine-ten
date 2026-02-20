import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

vi.mock('@/lib/notifications', () => ({
  adminNotifications: { deliverablePendingReview: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/notifications/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    deliverableSubmittedToClient: vi.fn().mockReturnValue({
      subject: 'Deliverable Submitted',
      html: '<p>Submitted</p>',
    }),
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
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
  tasks: { id: 'id', freelancerId: 'freelancerId', status: 'status', clientId: 'clientId' },
  taskFiles: {},
  taskMessages: {},
  users: { id: 'id', name: 'name', email: 'email' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/freelancer/submit-deliverable',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/freelancer/submit-deliverable', () => {
  const validBody = {
    taskId: '123e4567-e89b-12d3-a456-426614174000',
    files: [
      {
        fileName: 'design.png',
        fileUrl: 'https://storage.example.com/design.png',
        fileType: 'image/png',
        fileSize: 1024,
      },
    ],
    message: 'Here are the deliverables',
  }

  function setupAuth(userId = 'freelancer-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test Artist', email: 'artist@test.com' },
    })
  }

  function setupInsert() {
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
  }

  function setupUpdate() {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  }

  it('returns 400 when taskId is missing', async () => {
    setupAuth()

    const response = await POST(makeRequest({ files: validBody.files }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('returns 400 when files array is empty', async () => {
    setupAuth()

    const response = await POST(
      makeRequest({ taskId: '123e4567-e89b-12d3-a456-426614174000', files: [] }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('returns 404 when task not found or not assigned to user', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 400 when task status does not allow submission', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'COMPLETED',
          creditsUsed: 5,
        },
      ])
    )

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Cannot submit deliverable')
  })

  it('successfully submits deliverable and returns 200', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'ASSIGNED',
          creditsUsed: 5,
        },
      ])
    )

    setupInsert()
    setupUpdate()

    // User lookups for notifications
    mockSelect.mockReturnValueOnce(
      chainableSelect([{ name: 'Test Artist', email: 'artist@test.com' }])
    )
    mockSelect.mockReturnValueOnce(
      chainableSelect([{ name: 'Test Client', email: 'client@test.com' }])
    )

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('allows submission for IN_PROGRESS status', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          title: 'Test',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_PROGRESS',
          creditsUsed: 5,
        },
      ])
    )

    setupInsert()
    setupUpdate()
    mockSelect.mockReturnValueOnce(chainableSelect([{ name: 'Artist', email: 'a@t.com' }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ name: 'Client', email: 'c@t.com' }]))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(200)
  })

  it('allows submission for REVISION_REQUESTED status', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          title: 'Test',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'REVISION_REQUESTED',
          creditsUsed: 5,
        },
      ])
    )

    setupInsert()
    setupUpdate()
    mockSelect.mockReturnValueOnce(chainableSelect([{ name: 'Artist', email: 'a@t.com' }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ name: 'Client', email: 'c@t.com' }]))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(200)
  })
})
