import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Must mock "server-only" before importing env module
vi.mock('server-only', () => ({}))

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Store original env
const originalEnv = { ...process.env }

// A complete set of valid env vars for testing
function getValidEnv(): Record<string, string> {
  return {
    NEXT_PUBLIC_APP_NAME: 'Crafted',
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    NEXT_PUBLIC_BASE_DOMAIN: 'example.com',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.service',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    BETTER_AUTH_URL: 'https://auth.example.com',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    STRIPE_SECRET_KEY: 'sk_test_1234567890abcdef',
    STRIPE_WEBHOOK_SECRET: 'whsec_1234567890abcdef',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
    ANTHROPIC_API_KEY: 'sk-ant-api03-key123456',
    RESEND_API_KEY: 're_1234567890abcdef',
    EMAIL_FROM: 'Crafted <noreply@example.com>',
    NODE_ENV: 'test',
  }
}

describe('env module', () => {
  beforeEach(() => {
    vi.resetModules()
    // Restore env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('validateEnv', () => {
    it('should succeed with all valid env vars', async () => {
      Object.assign(process.env, getValidEnv())
      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).not.toThrow()
      const result = validateEnv()
      expect(result.NEXT_PUBLIC_APP_URL).toBe('https://app.example.com')
    })

    it('should throw when required DATABASE_URL is missing', async () => {
      const env = getValidEnv()
      delete env.DATABASE_URL
      Object.assign(process.env, env)
      // Remove from process.env too
      delete process.env.DATABASE_URL

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should throw when NEXT_PUBLIC_APP_URL is not a valid URL', async () => {
      const env = getValidEnv()
      env.NEXT_PUBLIC_APP_URL = 'not-a-url'
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should throw when BETTER_AUTH_SECRET is too short', async () => {
      const env = getValidEnv()
      env.BETTER_AUTH_SECRET = 'short'
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should throw when STRIPE_SECRET_KEY does not start with sk_', async () => {
      const env = getValidEnv()
      env.STRIPE_SECRET_KEY = 'invalid_key_123'
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should throw when ANTHROPIC_API_KEY does not start with sk-ant-', async () => {
      const env = getValidEnv()
      env.ANTHROPIC_API_KEY = 'wrong-prefix-key'
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should throw when RESEND_API_KEY does not start with re_', async () => {
      const env = getValidEnv()
      env.RESEND_API_KEY = 'invalid_api_key'
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should throw when STRIPE_WEBHOOK_SECRET does not start with whsec_', async () => {
      const env = getValidEnv()
      env.STRIPE_WEBHOOK_SECRET = 'invalid_webhook_secret'
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow('Environment validation failed')
    })

    it('should accept BETTER_AUTH_SECRET of exactly 32 chars', async () => {
      const env = getValidEnv()
      env.BETTER_AUTH_SECRET = 'x'.repeat(32)
      Object.assign(process.env, env)

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).not.toThrow()
    })

    it('should default NODE_ENV to development when not set', async () => {
      const env = getValidEnv()
      delete env.NODE_ENV
      Object.assign(process.env, env)
      delete process.env.NODE_ENV

      const { validateEnv } = await import('./env')
      const result = validateEnv()
      expect(result.NODE_ENV).toBe('development')
    })

    it('should default NEXT_PUBLIC_APP_NAME to Crafted', async () => {
      const env = getValidEnv()
      delete env.NEXT_PUBLIC_APP_NAME
      Object.assign(process.env, env)
      delete process.env.NEXT_PUBLIC_APP_NAME

      const { validateEnv } = await import('./env')
      const result = validateEnv()
      expect(result.NEXT_PUBLIC_APP_NAME).toBe('Crafted')
    })
  })

  describe('getEnv', () => {
    it('should return validated env', async () => {
      Object.assign(process.env, getValidEnv())
      const { getEnv } = await import('./env')
      const env = getEnv()
      expect(env.NEXT_PUBLIC_APP_URL).toBe('https://app.example.com')
    })

    it('should cache the result after first call', async () => {
      Object.assign(process.env, getValidEnv())
      const { getEnv } = await import('./env')
      const first = getEnv()
      const second = getEnv()
      expect(first).toBe(second) // Same reference
    })
  })

  describe('getEnvSafe', () => {
    it('should return value for valid key', async () => {
      Object.assign(process.env, getValidEnv())
      const { getEnvSafe } = await import('./env')
      expect(getEnvSafe('NEXT_PUBLIC_APP_URL')).toBe('https://app.example.com')
    })

    it('should return undefined when env validation fails', async () => {
      // Do not set any env vars, so validation will fail
      // Clear critical keys
      delete process.env.DATABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.STRIPE_SECRET_KEY
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.RESEND_API_KEY
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.BETTER_AUTH_SECRET
      delete process.env.STRIPE_WEBHOOK_SECRET
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      delete process.env.EMAIL_FROM

      const { getEnvSafe } = await import('./env')
      const result = getEnvSafe('DATABASE_URL')
      expect(result).toBeUndefined()
    })
  })

  describe('checkEnvHealth', () => {
    it('should return healthy when all required keys are present', async () => {
      Object.assign(process.env, getValidEnv())
      const { checkEnvHealth } = await import('./env')
      const health = checkEnvHealth()
      expect(health.healthy).toBe(true)
      expect(health.missing).toEqual([])
    })

    it('should identify missing required variables', async () => {
      delete process.env.DATABASE_URL
      delete process.env.STRIPE_SECRET_KEY

      const { checkEnvHealth } = await import('./env')
      const health = checkEnvHealth()
      expect(health.healthy).toBe(false)
      expect(health.missing).toContain('DATABASE_URL')
      expect(health.missing).toContain('STRIPE_SECRET_KEY')
    })

    it('should check all 6 required keys', async () => {
      // Remove all required keys
      delete process.env.DATABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.BETTER_AUTH_SECRET
      delete process.env.STRIPE_SECRET_KEY
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.RESEND_API_KEY

      const { checkEnvHealth } = await import('./env')
      const health = checkEnvHealth()
      expect(health.missing).toHaveLength(6)
      expect(health.missing).toContain('DATABASE_URL')
      expect(health.missing).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(health.missing).toContain('BETTER_AUTH_SECRET')
      expect(health.missing).toContain('STRIPE_SECRET_KEY')
      expect(health.missing).toContain('ANTHROPIC_API_KEY')
      expect(health.missing).toContain('RESEND_API_KEY')
    })
  })
})
