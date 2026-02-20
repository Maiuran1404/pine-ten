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
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  chatTestRuns: {
    id: 'id',
    status: 'status',
    scenarioName: 'scenarioName',
    messages: 'messages',
    totalTurns: 'totalTurns',
    finalStage: 'finalStage',
    startedAt: 'startedAt',
    completedAt: 'completedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET } = await import('./route')

function makeRequest() {
  return {
    url: 'http://localhost/api/admin/chat-tests/runs/run-1',
    method: 'GET',
    json: vi.fn(),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function makeParams(runId: string) {
  return { params: Promise.resolve({ runId }) }
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

const mockRun = {
  id: 'run-1',
  status: 'completed',
  scenarioName: 'Instagram Reel for Coffee Brand',
  messages: [
    {
      turn: 1,
      role: 'user',
      content: 'I need a reel for my coffee brand',
      stage: 'EXTRACT',
    },
    {
      turn: 1,
      role: 'assistant',
      content: 'Great! Tell me more about your coffee brand.',
      stage: 'EXTRACT',
    },
  ],
  totalTurns: 5,
  finalStage: 'SUBMIT',
  reachedReview: true,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  durationMs: 45000,
  compositeScore: 85,
  scores: {
    completeness: 90,
    coherence: 80,
    stageProgression: 85,
  },
  briefingState: {
    stage: 'SUBMIT',
    brief: { taskType: { value: 'single_asset', confidence: 0.9 } },
  },
  batchId: 'batch-1',
  scenarioConfig: {
    name: 'Instagram Reel for Coffee Brand',
    contentType: 'reel',
    openingMessage: 'I need a reel for my coffee brand',
  },
}

describe('GET /api/admin/chat-tests/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams('run-1'))
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await GET(makeRequest() as never, makeParams('run-1'))
    expect(response.status).toBe(403)
  })

  it('returns 404 when chat test run not found', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await GET(makeRequest() as never, makeParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
    expect(data.error.message).toContain('Chat test run')
  })

  it('returns run details successfully', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([mockRun]))

    const response = await GET(makeRequest() as never, makeParams('run-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('run-1')
    expect(data.data.status).toBe('completed')
    expect(data.data.scenarioName).toBe('Instagram Reel for Coffee Brand')
    expect(data.data.messages).toHaveLength(2)
    expect(data.data.totalTurns).toBe(5)
    expect(data.data.finalStage).toBe('SUBMIT')
  })

  it('returns run with all associated data', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([mockRun]))

    const response = await GET(makeRequest() as never, makeParams('run-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.compositeScore).toBe(85)
    expect(data.data.scores).toBeDefined()
    expect(data.data.briefingState).toBeDefined()
    expect(data.data.scenarioConfig).toBeDefined()
  })

  it('returns running (incomplete) test run', async () => {
    const runningRun = {
      ...mockRun,
      status: 'running',
      completedAt: null,
      compositeScore: null,
      scores: null,
      finalStage: 'EXTRACT',
      totalTurns: 1,
    }
    mockSelect.mockReturnValueOnce(chainableSelect([runningRun]))

    const response = await GET(makeRequest() as never, makeParams('run-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('running')
    expect(data.data.completedAt).toBeNull()
    expect(data.data.compositeScore).toBeNull()
  })

  it('returns failed test run with error message', async () => {
    const failedRun = {
      ...mockRun,
      status: 'failed',
      errorMessage: 'Conversation did not reach SUBMIT within 30 turns',
      compositeScore: null,
      scores: null,
    }
    mockSelect.mockReturnValueOnce(chainableSelect([failedRun]))

    const response = await GET(makeRequest() as never, makeParams('run-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('failed')
    expect(data.data.errorMessage).toContain('SUBMIT')
  })

  it('uses correct param from URL', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([{ ...mockRun, id: 'run-abc-123' }]))

    const response = await GET(makeRequest() as never, makeParams('run-abc-123'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.id).toBe('run-abc-123')
  })
})
