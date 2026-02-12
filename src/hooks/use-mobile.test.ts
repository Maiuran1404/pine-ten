import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  let listeners: Map<string, Set<() => void>>

  beforeEach(() => {
    listeners = new Map()

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          if (!listeners.has(query)) listeners.set(query, new Set())
          listeners.get(query)!.add(handler)
        }),
        removeEventListener: vi.fn((_event: string, handler: () => void) => {
          listeners.get(query)?.delete(handler)
        }),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    listeners.clear()
  })

  it('should return false initially for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should return false for exactly 768px (breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true for 767px (one below breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 767 })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should update when window resizes', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
      // Trigger the change listener
      const query = `(max-width: 767px)`
      listeners.get(query)?.forEach((handler) => handler())
    })

    expect(result.current).toBe(true)
  })

  it('should cleanup event listener on unmount', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })

    // Track the mock created during the hook's useEffect
    const removeEventListenerSpy = vi.fn()
    ;(window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }))

    const { unmount } = renderHook(() => useIsMobile())
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
