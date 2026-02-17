import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockMessagesCreate = vi.fn()
vi.mock('twilio', () => ({
  default: () => ({
    messages: {
      create: (...args: unknown[]) => mockMessagesCreate(...args),
    },
  }),
}))

vi.mock('@/lib/config', () => ({
  config: {
    notifications: {
      whatsapp: {
        number: 'whatsapp:+1234567890',
        adminNumber: '+0987654321',
      },
    },
  },
}))

const { sendWhatsApp, notifyAdminWhatsApp, whatsappTemplates, adminWhatsAppTemplates } =
  await import('./whatsapp')

describe('sendWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends message with formatted whatsapp: prefix', async () => {
    mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM123' })

    const result = await sendWhatsApp({ to: '+1555555555', message: 'Hello' })
    expect(result).toEqual({ success: true, sid: 'SM123' })
    expect(mockMessagesCreate).toHaveBeenCalledWith({
      from: 'whatsapp:+1234567890',
      to: 'whatsapp:+1555555555',
      body: 'Hello',
    })
  })

  it('does not double-prefix whatsapp: numbers', async () => {
    mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM456' })

    await sendWhatsApp({ to: 'whatsapp:+1555555555', message: 'Hi' })
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'whatsapp:+1555555555',
      })
    )
  })

  it('returns error on failure', async () => {
    const error = new Error('Twilio error')
    mockMessagesCreate.mockRejectedValueOnce(error)

    const result = await sendWhatsApp({ to: '+1555555555', message: 'Hello' })
    expect(result.success).toBe(false)
    expect(result.error).toBe(error)
  })
})

describe('notifyAdminWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends message to admin number', async () => {
    mockMessagesCreate.mockResolvedValueOnce({ sid: 'SM789' })

    const result = await notifyAdminWhatsApp('New task created')
    expect(result).toEqual({ success: true, sid: 'SM789' })
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'whatsapp:+0987654321',
        body: 'New task created',
      })
    )
  })
})

describe('whatsappTemplates', () => {
  it('generates taskAssigned message', () => {
    const msg = whatsappTemplates.taskAssigned('Logo Design', 'https://example.com/task/1')
    expect(msg).toContain('Logo Design')
    expect(msg).toContain('https://example.com/task/1')
    expect(msg).toContain('New Task Assigned')
  })

  it('generates taskCompleted message', () => {
    const msg = whatsappTemplates.taskCompleted('Logo Design', 'https://example.com/task/1')
    expect(msg).toContain('Task Completed')
    expect(msg).toContain('Logo Design')
  })

  it('generates revisionRequested message', () => {
    const msg = whatsappTemplates.revisionRequested('Logo Design', 'https://example.com/task/1')
    expect(msg).toContain('Revision Requested')
    expect(msg).toContain('Logo Design')
  })

  it('generates newTaskAvailable message', () => {
    const msg = whatsappTemplates.newTaskAvailable('Banner Ad', 5, 'https://example.com/task/2')
    expect(msg).toContain('New Task Available')
    expect(msg).toContain('Banner Ad')
    expect(msg).toContain('5')
  })
})

describe('adminWhatsAppTemplates', () => {
  it('generates newTaskCreated message', () => {
    const msg = adminWhatsAppTemplates.newTaskCreated({
      taskTitle: 'Landing Page',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      category: 'web_design',
      creditsUsed: 10,
      taskUrl: 'https://example.com/task/3',
    })
    expect(msg).toContain('Landing Page')
    expect(msg).toContain('John Doe')
    expect(msg).toContain('john@example.com')
    expect(msg).toContain('10')
  })

  it('generates newUserSignup message', () => {
    const msg = adminWhatsAppTemplates.newUserSignup({
      name: 'Jane',
      email: 'jane@test.com',
      role: 'CLIENT',
    })
    expect(msg).toContain('New User Signup')
    expect(msg).toContain('Jane')
    expect(msg).toContain('CLIENT')
  })

  it('includes signup URL when provided', () => {
    const msg = adminWhatsAppTemplates.newUserSignup({
      name: 'Jane',
      email: 'jane@test.com',
      role: 'CLIENT',
      signupUrl: 'https://example.com/admin/users',
    })
    expect(msg).toContain('https://example.com/admin/users')
  })
})
