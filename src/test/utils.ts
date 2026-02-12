import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Create a fresh QueryClient for testing (no retries, no cache)
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * Render a component wrapped in QueryClientProvider
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const queryClient = options?.queryClient ?? createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  }
}

/**
 * Create a mock Supabase client with chainable methods
 */
export function createMockSupabaseClient() {
  const mockResult = { data: null, error: null }

  const chainable = () => {
    const chain: Record<string, unknown> = {}
    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'like',
      'ilike',
      'in',
      'order',
      'limit',
      'range',
      'single',
      'maybeSingle',
      'match',
      'filter',
      'or',
      'not',
      'is',
    ]
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain)
    }
    // Terminal methods return the result
    chain.then = vi.fn().mockResolvedValue(mockResult)
    chain.single = vi.fn().mockResolvedValue(mockResult)
    chain.maybeSingle = vi.fn().mockResolvedValue(mockResult)
    return chain
  }

  return {
    from: vi.fn().mockReturnValue(chainable()),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/file.png' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://example.com/file.png' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _mockResult: mockResult,
  }
}

/**
 * Create a mock NextRequest object for testing API-like code
 */
export function createMockNextRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    cookies?: Record<string, string>
    body?: unknown
  } = {}
) {
  const { method = 'GET', headers = {}, cookies = {}, body } = options

  const headerMap = new Map(Object.entries(headers))

  const cookieStore = {
    get: (name: string) => {
      const value = cookies[name]
      return value ? { name, value } : undefined
    },
    getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    has: (name: string) => name in cookies,
    set: vi.fn(),
    delete: vi.fn(),
  }

  return {
    url,
    method,
    headers: {
      get: (name: string) => headerMap.get(name) ?? null,
      has: (name: string) => headerMap.has(name),
      entries: () => headerMap.entries(),
      forEach: (cb: (value: string, key: string) => void) => headerMap.forEach(cb),
    },
    cookies: cookieStore,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    nextUrl: new URL(url),
    ip: headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1',
  }
}
