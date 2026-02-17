import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Notification } from './use-notifications'

// Mock sonner
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}))

// ---- EventSource mock -------------------------------------------------------
class MockEventSource {
  static instances: MockEventSource[] = []

  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  url: string
  close = vi.fn()

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  simulateOpen() {
    this.onopen?.(new Event('open'))
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }

  simulateError() {
    this.onerror?.(new Event('error'))
  }
}

vi.stubGlobal('EventSource', MockEventSource)

// ---- Import hook after mocks ------------------------------------------------
const { useNotifications } = await import('./use-notifications')

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    MockEventSource.instances = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty notifications initially', () => {
    const { result } = renderHook(() => useNotifications({ enabled: false }))

    expect(result.current.notifications).toEqual([])
    expect(result.current.isConnected).toBe(false)
    expect(result.current.unreadCount).toBe(0)
    expect(result.current.connectionError).toBeNull()
  })

  it('connects to SSE endpoint when enabled', () => {
    renderHook(() => useNotifications({ enabled: true }))

    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0].url).toBe('/api/notifications/stream')
  })

  it('does not connect when disabled', () => {
    renderHook(() => useNotifications({ enabled: false }))

    expect(MockEventSource.instances).toHaveLength(0)
  })

  it('sets isConnected on open', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true }))

    act(() => {
      MockEventSource.instances[0].simulateOpen()
    })

    expect(result.current.isConnected).toBe(true)
    expect(result.current.connectionError).toBeNull()
  })

  it('receives and stores notifications', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true, showToasts: false }))
    const es = MockEventSource.instances[0]

    const notification: Notification = {
      type: 'task_assigned',
      taskId: 'task-1',
      title: 'New Task',
      message: 'You have been assigned a task',
      timestamp: new Date().toISOString(),
    }

    act(() => {
      es.simulateMessage(notification)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0]).toEqual(notification)
    expect(result.current.unreadCount).toBe(1)
  })

  it('ignores heartbeat messages', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true, showToasts: false }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateMessage({ type: 'heartbeat', timestamp: new Date().toISOString() })
    })

    expect(result.current.notifications).toHaveLength(0)
  })

  it('ignores connected messages', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true, showToasts: false }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateMessage({ type: 'connected', timestamp: new Date().toISOString() })
    })

    expect(result.current.notifications).toHaveLength(0)
  })

  it('limits notifications to 50', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true, showToasts: false }))
    const es = MockEventSource.instances[0]

    act(() => {
      for (let i = 0; i < 55; i++) {
        es.simulateMessage({
          type: 'new_message',
          message: `msg-${i}`,
          timestamp: new Date().toISOString(),
        })
      }
    })

    expect(result.current.notifications).toHaveLength(50)
  })

  it('handles connection errors and sets connectionError', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateError()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectionError).toBeTruthy()
    expect(es.close).toHaveBeenCalled()
  })

  it('marks notifications as read by taskId', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true, showToasts: false }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateMessage({
        type: 'task_assigned',
        taskId: 'task-1',
        message: 'Assigned',
        timestamp: new Date().toISOString(),
      })
      es.simulateMessage({
        type: 'task_update',
        taskId: 'task-2',
        message: 'Updated',
        timestamp: new Date().toISOString(),
      })
    })

    expect(result.current.notifications).toHaveLength(2)

    act(() => {
      result.current.markAsRead('task-1')
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].taskId).toBe('task-2')
  })

  it('clears all notifications', () => {
    const { result } = renderHook(() => useNotifications({ enabled: true, showToasts: false }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateMessage({
        type: 'task_assigned',
        message: 'test',
        timestamp: new Date().toISOString(),
      })
    })

    expect(result.current.notifications).toHaveLength(1)

    act(() => {
      result.current.clearNotifications()
    })

    expect(result.current.notifications).toHaveLength(0)
    expect(result.current.unreadCount).toBe(0)
  })

  it('cleans up EventSource on unmount', () => {
    const { unmount } = renderHook(() => useNotifications({ enabled: true }))
    const es = MockEventSource.instances[0]

    unmount()

    expect(es.close).toHaveBeenCalled()
  })

  it('calls onNotification callback', () => {
    const onNotification = vi.fn()
    renderHook(() => useNotifications({ enabled: true, showToasts: false, onNotification }))
    const es = MockEventSource.instances[0]

    const notification: Notification = {
      type: 'new_message',
      message: 'Hello',
      timestamp: new Date().toISOString(),
    }

    act(() => {
      es.simulateMessage(notification)
    })

    expect(onNotification).toHaveBeenCalledWith(notification)
  })

  it('shows toast for task_completed notifications', async () => {
    const { toast } = await import('sonner')
    renderHook(() => useNotifications({ enabled: true, showToasts: true }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateMessage({
        type: 'task_completed',
        message: 'Task done',
        title: 'Completed',
        taskId: 'task-1',
        timestamp: new Date().toISOString(),
      })
    })

    expect(toast.success).toHaveBeenCalledWith(
      'Task done',
      expect.objectContaining({
        description: 'Completed',
      })
    )
  })

  it('schedules reconnection with exponential backoff on error', () => {
    renderHook(() => useNotifications({ enabled: true }))
    const es = MockEventSource.instances[0]

    act(() => {
      es.simulateError()
    })

    // First backoff: 1000ms (1000 * 2^0)
    expect(MockEventSource.instances).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should have reconnected — new instance
    expect(MockEventSource.instances).toHaveLength(2)
  })
})
