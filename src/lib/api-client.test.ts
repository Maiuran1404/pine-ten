import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Reset module state between tests
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('apiClient', () => {
  it('makes a GET request without CSRF token', async () => {
    const { apiClient } = await import('./api-client')

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
      status: 200,
    })

    const result = await apiClient('/api/test', { method: 'GET' })
    expect(result).toEqual({ success: true, data: { id: 1 } })
    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'GET' }))
  })

  it('sends JSON body for POST requests', async () => {
    // Setup CSRF fetch first, then the actual request
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ csrfToken: 'test-token' }),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true }),
        status: 200,
      })

    const { apiClient } = await import('./api-client')
    const result = await apiClient('/api/test', {
      method: 'POST',
      body: { name: 'test' },
    })
    expect(result).toEqual({ success: true })
  })

  it('skips CSRF when skipCsrf is true', async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ success: true }),
      status: 200,
    })

    const { apiClient } = await import('./api-client')
    await apiClient('/api/test', { method: 'POST', body: { x: 1 }, skipCsrf: true })

    // Should only be called once (no CSRF fetch)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on CSRF 403 error', async () => {
    // CSRF fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ csrfToken: 'token-1' }),
      })
      // First request returns 403 with CSRF error
      .mockResolvedValueOnce({
        status: 403,
        clone: () => ({
          json: vi.fn().mockResolvedValue({ error: { code: 'SEC_001' } }),
        }),
        json: vi.fn().mockResolvedValue({ error: { code: 'SEC_001' } }),
      })
      // CSRF refresh
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ csrfToken: 'token-2' }),
      })
      // Retry request
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true }),
        status: 200,
      })

    const { apiClient } = await import('./api-client')
    const result = await apiClient('/api/test', { method: 'POST', body: { x: 1 } })
    expect(result).toEqual({ success: true })
  })
})

describe('api convenience methods', () => {
  it('api.get calls apiClient with GET method', async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ success: true }),
      status: 200,
    })

    const { api } = await import('./api-client')
    await api.get('/api/items')
    expect(mockFetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({ method: 'GET' }))
  })

  it('api.post calls apiClient with POST method', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ csrfToken: 'tok' }),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true }),
        status: 200,
      })

    const { api } = await import('./api-client')
    await api.post('/api/items', { name: 'New Item' })
    // Second fetch call should be the POST
    const postCall = mockFetch.mock.calls[1]
    expect(postCall[0]).toBe('/api/items')
  })

  it('api.delete calls apiClient with DELETE method', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ csrfToken: 'tok' }),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true }),
        status: 200,
      })

    const { api } = await import('./api-client')
    await api.delete('/api/items/1')
    const deleteCall = mockFetch.mock.calls[1]
    expect(deleteCall[0]).toBe('/api/items/1')
  })
})

describe('uploadFile', () => {
  it('sends FormData with CSRF token', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ csrfToken: 'tok' }),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true }),
        status: 200,
      })

    const { uploadFile } = await import('./api-client')
    const formData = new FormData()
    formData.append('file', new Blob(['hello']), 'test.txt')

    const result = await uploadFile('/api/upload', formData)
    expect(result).toEqual({ success: true })
  })
})

describe('refreshCsrfToken', () => {
  it('clears cached token and fetches a new one', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ csrfToken: 'new-token' }),
    })

    const { refreshCsrfToken } = await import('./api-client')
    await refreshCsrfToken()
    expect(mockFetch).toHaveBeenCalledWith('/api/csrf')
  })
})
