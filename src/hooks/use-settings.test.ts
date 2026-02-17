import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock sonner
const mockToast = Object.assign(vi.fn(), {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
})
vi.mock('sonner', () => ({
  toast: mockToast,
}))

// Mock auth-client
const mockSignOut = vi.fn()
vi.mock('@/lib/auth-client', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

// next/navigation is already mocked in setup.tsx but we need to capture the push fn
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { useSettings } = await import('./use-settings')

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default fetch returns a valid user
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            user: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
              phone: '+1234567890',
              image: null,
              createdAt: '2024-01-01T00:00:00Z',
            },
          },
        }),
    })
  })

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useSettings())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.userSettings).toBeNull()
  })

  it('fetches and returns user settings', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.userSettings).toEqual({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      image: null,
      createdAt: '2024-01-01T00:00:00Z',
    })
    expect(result.current.formData).toEqual({
      name: 'Test User',
      phone: '+1234567890',
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/user/settings')
  })

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.userSettings).toBeNull()
    expect(mockToast.error).toHaveBeenCalledWith('Failed to load settings')
  })

  it('handles non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.userSettings).toBeNull()
  })

  it('saves profile successfully', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Set up the PUT response
    mockFetch.mockResolvedValueOnce({ ok: true })

    await act(async () => {
      await result.current.handleSaveProfile()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', phone: '+1234567890' }),
    })
    expect(mockToast.success).toHaveBeenCalledWith('Profile updated successfully')
    expect(result.current.isSaving).toBe(false)
  })

  it('handles save profile failure', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockFetch.mockResolvedValueOnce({ ok: false })

    await act(async () => {
      await result.current.handleSaveProfile()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Failed to update profile')
    expect(result.current.isSaving).toBe(false)
  })

  it('handles logout successfully', async () => {
    mockSignOut.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.handleLogout()
    })

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('handles logout failure', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Logout failed'))
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.handleLogout()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Failed to log out')
    expect(result.current.isLoggingOut).toBe(false)
  })

  it('computes initials correctly', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.getInitials('John Doe')).toBe('JD')
    expect(result.current.getInitials('Alice')).toBe('A')
    expect(result.current.getInitials(null)).toBe('U')
    expect(result.current.getInitials(undefined)).toBe('U')
    expect(result.current.getInitials('')).toBe('U')
  })

  it('updates formData via setFormData', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setFormData({ name: 'New Name', phone: '' })
    })

    expect(result.current.formData).toEqual({ name: 'New Name', phone: '' })
  })
})
