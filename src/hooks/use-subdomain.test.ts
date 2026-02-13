import { describe, it, expect } from 'vitest'
import { getPortalFromHostname, PORTAL_CONFIGS } from './use-subdomain'

describe('getPortalFromHostname', () => {
  it('should return "artist" for artist.localhost', () => {
    expect(getPortalFromHostname('artist.localhost')).toBe('artist')
  })

  it('should return "artist" for artist.example.com', () => {
    expect(getPortalFromHostname('artist.example.com')).toBe('artist')
  })

  it('should return "artist" for artist.localhost:3000 (with port)', () => {
    expect(getPortalFromHostname('artist.localhost:3000')).toBe('artist')
  })

  it('should return "superadmin" for superadmin.localhost', () => {
    expect(getPortalFromHostname('superadmin.localhost')).toBe('superadmin')
  })

  it('should return "superadmin" for superadmin.example.com', () => {
    expect(getPortalFromHostname('superadmin.example.com')).toBe('superadmin')
  })

  it('should return "app" for localhost', () => {
    expect(getPortalFromHostname('localhost')).toBe('app')
  })

  it('should return "app" for localhost:3000', () => {
    expect(getPortalFromHostname('localhost:3000')).toBe('app')
  })

  it('should return "app" for app.localhost', () => {
    expect(getPortalFromHostname('app.localhost')).toBe('app')
  })

  it('should return "app" for app.example.com', () => {
    expect(getPortalFromHostname('app.example.com')).toBe('app')
  })

  it('should return "app" for unrecognized domains', () => {
    expect(getPortalFromHostname('unknown.example.com')).toBe('app')
  })
})

describe('PORTAL_CONFIGS', () => {
  it('should have configs for all portal types', () => {
    expect(PORTAL_CONFIGS).toHaveProperty('app')
    expect(PORTAL_CONFIGS).toHaveProperty('artist')
    expect(PORTAL_CONFIGS).toHaveProperty('superadmin')
    expect(PORTAL_CONFIGS).toHaveProperty('default')
  })

  it('should have correct default redirects', () => {
    expect(PORTAL_CONFIGS.app.defaultRedirect).toBe('/dashboard')
    expect(PORTAL_CONFIGS.artist.defaultRedirect).toBe('/portal')
    expect(PORTAL_CONFIGS.superadmin.defaultRedirect).toBe('/admin')
  })

  it('should have correct portal type in each config', () => {
    expect(PORTAL_CONFIGS.app.type).toBe('app')
    expect(PORTAL_CONFIGS.artist.type).toBe('artist')
    expect(PORTAL_CONFIGS.superadmin.type).toBe('superadmin')
    expect(PORTAL_CONFIGS.default.type).toBe('default')
  })

  it('each config should have all required fields', () => {
    for (const [, config] of Object.entries(PORTAL_CONFIGS)) {
      expect(config).toHaveProperty('type')
      expect(config).toHaveProperty('name')
      expect(config).toHaveProperty('description')
      expect(config).toHaveProperty('tagline')
      expect(config).toHaveProperty('accentColor')
      expect(config).toHaveProperty('bgGradient')
      expect(config).toHaveProperty('icon')
      expect(config).toHaveProperty('defaultRedirect')
    }
  })
})
