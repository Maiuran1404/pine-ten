import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import {
  CacheDurations,
  withCacheHeaders,
  cachedJsonResponse,
  cachedSuccessResponse,
} from './cache'

describe('CacheDurations', () => {
  it('should have correct preset values', () => {
    expect(CacheDurations.NONE).toBe(0)
    expect(CacheDurations.SHORT).toBe(60)
    expect(CacheDurations.MEDIUM).toBe(300)
    expect(CacheDurations.LONG).toBe(3600)
    expect(CacheDurations.EXTENDED).toBe(86400)
  })
})

describe('withCacheHeaders', () => {
  it('should set no-store header when maxAge is 0', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, 0)
    expect(result.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
  })

  it('should set no-store header when maxAge is negative', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, -1)
    expect(result.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
  })

  it('should set public cache-control with max-age', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, 60)
    expect(result.headers.get('Cache-Control')).toBe('public, max-age=60')
  })

  it('should set private cache-control when isPrivate is true', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, 300, undefined, true)
    expect(result.headers.get('Cache-Control')).toBe('private, max-age=300')
  })

  it('should include stale-while-revalidate when provided', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, 60, 120)
    expect(result.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=120'
    )
  })

  it('should combine private, max-age, and stale-while-revalidate', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, 60, 30, true)
    expect(result.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=30'
    )
  })

  it('should return the same response object', () => {
    const response = NextResponse.json({ ok: true })
    const result = withCacheHeaders(response, 60)
    expect(result).toBe(response)
  })
})

describe('cachedJsonResponse', () => {
  it('should return JSON response with default SHORT cache', async () => {
    const result = cachedJsonResponse({ foo: 'bar' })
    const body = await result.json()
    expect(body).toEqual({ foo: 'bar' })
    expect(result.status).toBe(200)
    expect(result.headers.get('Cache-Control')).toBe('public, max-age=60')
  })

  it('should respect custom maxAge', async () => {
    const result = cachedJsonResponse({ foo: 'bar' }, CacheDurations.LONG)
    expect(result.headers.get('Cache-Control')).toBe('public, max-age=3600')
  })

  it('should respect custom status code', async () => {
    const result = cachedJsonResponse({ created: true }, CacheDurations.SHORT, { status: 201 })
    expect(result.status).toBe(201)
  })

  it('should respect private option', async () => {
    const result = cachedJsonResponse({ data: 'secret' }, CacheDurations.SHORT, {
      isPrivate: true,
    })
    expect(result.headers.get('Cache-Control')).toBe('private, max-age=60')
  })

  it('should include stale-while-revalidate when set', async () => {
    const result = cachedJsonResponse({ data: 1 }, CacheDurations.MEDIUM, {
      staleWhileRevalidate: CacheDurations.SHORT,
    })
    expect(result.headers.get('Cache-Control')).toBe(
      'public, max-age=300, stale-while-revalidate=60'
    )
  })
})

describe('cachedSuccessResponse', () => {
  it('should wrap data in success envelope', async () => {
    const result = cachedSuccessResponse({ items: [1, 2, 3] })
    const body = await result.json()
    expect(body).toEqual({ success: true, data: { items: [1, 2, 3] } })
    expect(result.status).toBe(200)
  })

  it('should apply cache headers with default SHORT duration', async () => {
    const result = cachedSuccessResponse({ count: 5 })
    expect(result.headers.get('Cache-Control')).toBe('public, max-age=60')
  })

  it('should apply private cache with stale-while-revalidate', async () => {
    const result = cachedSuccessResponse({ count: 5 }, CacheDurations.SHORT, {
      isPrivate: true,
      staleWhileRevalidate: CacheDurations.SHORT,
    })
    expect(result.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=60'
    )
  })
})
