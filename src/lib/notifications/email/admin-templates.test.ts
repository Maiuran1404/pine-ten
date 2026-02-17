import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    app: { name: 'Crafted', url: 'https://getcrafted.ai' },
    credits: { pricePerCredit: 4.9 },
    payouts: { creditValueUSD: 10 },
    notifications: {
      email: {
        from: 'Crafted <noreply@getcrafted.ai>',
        adminEmail: 'admin@getcrafted.ai',
      },
    },
  },
}))

const mockNotifySlack = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/slack', () => ({
  notifySlack: (...args: unknown[]) => mockNotifySlack(...args),
  SlackEventType: {
    NEW_CLIENT_SIGNUP: 'NEW_CLIENT_SIGNUP',
    FREELANCER_APPLICATION: 'FREELANCER_APPLICATION',
    TASK_CREATED: 'TASK_CREATED',
    TASK_ASSIGNED: 'TASK_ASSIGNED',
    TASK_COMPLETED: 'TASK_COMPLETED',
    CREDIT_PURCHASE: 'CREDIT_PURCHASE',
    FREELANCER_APPROVED: 'FREELANCER_APPROVED',
    FREELANCER_REJECTED: 'FREELANCER_REJECTED',
    REVISION_REQUESTED: 'REVISION_REQUESTED',
    TASK_PENDING_REVIEW: 'TASK_PENDING_REVIEW',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

const mockNotifyAdmin = vi.fn().mockResolvedValue({ success: true })
const mockSendEmail = vi.fn().mockResolvedValue({ success: true })

vi.mock('../email', () => ({
  notifyAdmin: (...args: unknown[]) => mockNotifyAdmin(...args),
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

const { adminNotifications } = await import('./admin-templates')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('adminNotifications', () => {
  it('newClientSignup calls notifySlack and notifyAdmin', async () => {
    await adminNotifications.newClientSignup({
      name: 'John Doe',
      email: 'john@example.com',
      userId: 'user-1',
      company: { name: 'Acme Inc', industry: 'Tech' },
    })

    expect(mockNotifySlack).toHaveBeenCalledWith(
      'NEW_CLIENT_SIGNUP',
      expect.objectContaining({
        user: expect.objectContaining({ name: 'John Doe', email: 'john@example.com' }),
      })
    )
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      'New Client Signup',
      expect.stringContaining('John Doe')
    )
  })

  it('newFreelancerApplication includes skills and portfolio', async () => {
    await adminNotifications.newFreelancerApplication({
      name: 'Jane Artist',
      email: 'jane@example.com',
      skills: ['Illustration', 'UI Design'],
      portfolioUrls: ['https://portfolio.example.com'],
      userId: 'user-2',
    })

    expect(mockNotifySlack).toHaveBeenCalledWith(
      'FREELANCER_APPLICATION',
      expect.objectContaining({
        freelancer: expect.objectContaining({ name: 'Jane Artist' }),
      })
    )
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      'New Freelancer Application',
      expect.stringContaining('Jane Artist')
    )
  })

  it('newTaskCreated includes task and credit info', async () => {
    await adminNotifications.newTaskCreated({
      taskId: 'task-1',
      taskTitle: 'Logo Design',
      clientName: 'Bob',
      clientEmail: 'bob@example.com',
      category: 'static-ads',
      creditsUsed: 5,
    })

    expect(mockNotifySlack).toHaveBeenCalledWith(
      'TASK_CREATED',
      expect.objectContaining({
        task: expect.objectContaining({ id: 'task-1', title: 'Logo Design' }),
      })
    )
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      'New Task Created',
      expect.stringContaining('Logo Design')
    )
  })

  it('taskAssigned notifies with freelancer and client details', async () => {
    await adminNotifications.taskAssigned({
      taskId: 'task-1',
      taskTitle: 'Banner Design',
      freelancerName: 'Jane',
      freelancerEmail: 'jane@example.com',
      clientName: 'Bob',
    })

    expect(mockNotifySlack).toHaveBeenCalledWith(
      'TASK_ASSIGNED',
      expect.objectContaining({
        task: expect.objectContaining({ title: 'Banner Design' }),
      })
    )
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      'Task Assigned',
      expect.stringContaining('Banner Design')
    )
  })

  it('taskCompleted sends success notification', async () => {
    await adminNotifications.taskCompleted({
      taskId: 'task-1',
      taskTitle: 'Video Ad',
      freelancerName: 'Jane',
      clientName: 'Bob',
    })

    expect(mockNotifySlack).toHaveBeenCalledWith(
      'TASK_COMPLETED',
      expect.objectContaining({
        task: expect.objectContaining({ title: 'Video Ad' }),
      })
    )
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      'Task Completed',
      expect.stringContaining('Video Ad')
    )
  })

  it('creditPurchase includes amount and payment info', async () => {
    await adminNotifications.creditPurchase({
      clientName: 'Bob',
      clientEmail: 'bob@example.com',
      credits: 50,
      amount: 245,
      paymentId: 'pi_123',
    })

    expect(mockNotifySlack).toHaveBeenCalledWith(
      'CREDIT_PURCHASE',
      expect.objectContaining({
        purchase: expect.objectContaining({ credits: 50, amount: 245 }),
      })
    )
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Credit Purchase', expect.stringContaining('Bob'))
  })

  it('deliverableVerified sends email to client via sendEmail', async () => {
    await adminNotifications.deliverableVerified({
      taskTitle: 'Logo Design',
      clientName: 'Bob',
      clientEmail: 'bob@example.com',
      freelancerName: 'Jane',
      taskUrl: 'https://getcrafted.ai/tasks/1',
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bob@example.com',
        subject: expect.stringContaining('Logo Design'),
      })
    )
    // This template does NOT call notifyAdmin — it sends directly to client
    expect(mockNotifyAdmin).not.toHaveBeenCalled()
  })

  it('taskUnassignable sends urgent notification', async () => {
    await adminNotifications.taskUnassignable({
      taskId: 'task-1',
      taskTitle: 'Complex Video',
      reason: 'No matching freelancers',
      escalationLevel: 2,
    })

    expect(mockNotifySlack).toHaveBeenCalled()
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      'URGENT: Task Could Not Be Assigned',
      expect.stringContaining('Complex Video')
    )
  })
})
