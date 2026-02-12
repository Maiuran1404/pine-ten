import { vi } from 'vitest'

/**
 * Comprehensive mock for Supabase client operations
 * Use this to mock @supabase/supabase-js or project supabase client
 */

type MockResult = { data: unknown; error: unknown }

function createChainableMock(resolvedValue: MockResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const queryMethods = [
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
    'is',
    'or',
    'not',
    'filter',
    'match',
    'order',
    'limit',
    'range',
    'textSearch',
    'contains',
    'containedBy',
    'overlaps',
  ]

  for (const method of queryMethods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Terminal methods that resolve
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  chain.then = vi.fn((resolve) => resolve(resolvedValue))
  chain.csv = vi.fn().mockResolvedValue(resolvedValue)
  chain.returns = vi.fn().mockReturnValue(chain)
  chain.count = vi.fn().mockReturnValue(chain)

  return chain
}

export function createMockSupabaseClient(
  defaultData: unknown = null,
  defaultError: unknown = null
) {
  const defaultResult: MockResult = { data: defaultData, error: defaultError }

  const storageBucket = {
    upload: vi.fn().mockResolvedValue({ data: { path: 'uploads/test.png' }, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/test.png' },
    }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    move: vi.fn().mockResolvedValue({ data: null, error: null }),
    copy: vi.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/test.png' },
      error: null,
    }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  const client = {
    from: vi.fn().mockReturnValue(createChainableMock(defaultResult)),
    rpc: vi.fn().mockResolvedValue(defaultResult),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { provider: 'google', url: 'https://example.com/auth' },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue(storageBucket),
      listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
      getBucket: vi.fn().mockResolvedValue({ data: null, error: null }),
      createBucket: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  }

  return client
}

/**
 * Helper to set mock responses for specific table queries
 */
export function mockTableResponse(
  client: ReturnType<typeof createMockSupabaseClient>,
  _table: string,
  data: unknown,
  error: unknown = null
) {
  const chain = createChainableMock({ data, error })
  client.from.mockReturnValue(chain)
  return chain
}
