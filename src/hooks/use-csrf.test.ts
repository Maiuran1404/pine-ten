import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCsrf, addCsrfHeader } from './use-csrf'

describe('useCsrf', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should fetch CSRF token on mount', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'test-token-123' }),
    })

    const { result } = renderHook(() => useCsrf())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.csrfToken).toBe('test-token-123')
    expect(result.current.error).toBeNull()
    expect(global.fetch).toHaveBeenCalledWith('/api/csrf')
  })

  it('should return the token via csrfToken', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'my-csrf-token' }),
    })

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.csrfToken).toBe('my-csrf-token')
    })
  })

  it('should handle error when fetch fails with non-ok response', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.csrfToken).toBeNull()
    expect(result.current.error).toBe('Failed to fetch CSRF token')

    consoleSpy.mockRestore()
  })

  it('should handle error when fetch throws a network error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.csrfToken).toBeNull()
    expect(result.current.error).toBe('Network error')

    consoleSpy.mockRestore()
  })

  it('should handle non-Error thrown values', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce('string error')

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch CSRF token')

    consoleSpy.mockRestore()
  })

  it('should re-fetch token when refreshToken is called', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ csrfToken: 'token-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ csrfToken: 'token-2' }),
      })

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.csrfToken).toBe('token-1')
    })

    await act(async () => {
      await result.current.refreshToken()
    })

    expect(result.current.csrfToken).toBe('token-2')
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('should return CSRF headers via getCsrfHeaders when token is available', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'header-token' }),
    })

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.csrfToken).toBe('header-token')
    })

    const headers = result.current.getCsrfHeaders()
    expect(headers).toEqual({ 'x-csrf-token': 'header-token' })
  })

  it('should return empty object from getCsrfHeaders when token is null', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'any' }),
    })

    const { result } = renderHook(() => useCsrf())

    // Before token is loaded, csrfToken is null
    const headers = result.current.getCsrfHeaders()
    expect(headers).toEqual({})
  })

  it('should provide csrfFetch that includes CSRF token in headers', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ csrfToken: 'fetch-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'response' }),
      })

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.csrfToken).toBe('fetch-token')
    })

    await act(async () => {
      await result.current.csrfFetch('/api/some-endpoint', { method: 'POST' })
    })

    const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(lastCall[0]).toBe('/api/some-endpoint')
    const requestHeaders = lastCall[1].headers as Headers
    expect(requestHeaders.get('x-csrf-token')).toBe('fetch-token')
  })

  it('should clear error on re-fetch', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ csrfToken: 'recovered-token' }),
      })

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })

    await act(async () => {
      await result.current.refreshToken()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.csrfToken).toBe('recovered-token')

    consoleSpy.mockRestore()
  })
})

describe('addCsrfHeader', () => {
  it('should add CSRF token to new Headers', () => {
    const headers = addCsrfHeader(undefined, 'my-token')
    expect(headers.get('x-csrf-token')).toBe('my-token')
  })

  it('should add CSRF token while preserving existing headers', () => {
    const existing = { 'Content-Type': 'application/json' }
    const headers = addCsrfHeader(existing, 'my-token')
    expect(headers.get('x-csrf-token')).toBe('my-token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should override existing CSRF token', () => {
    const existing = new Headers({ 'x-csrf-token': 'old-token' })
    const headers = addCsrfHeader(existing, 'new-token')
    expect(headers.get('x-csrf-token')).toBe('new-token')
  })
})
