import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external dependencies before importing templates
vi.mock('@/lib/config', () => ({
  config: {
    app: { name: 'Crafted', url: 'https://getcrafted.ai' },
    credits: { pricePerCredit: 4.9 },
    notifications: {
      email: {
        from: 'Crafted <noreply@getcrafted.ai>',
        adminEmail: 'admin@getcrafted.ai',
      },
    },
  },
}))

vi.mock('@/lib/slack', () => ({
  notifySlack: vi.fn().mockResolvedValue(undefined),
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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    },
  })),
}))

import { emailTemplates } from './user-templates'

describe('email user templates', () => {
  const allUserTemplates = [
    { name: 'taskAssigned', args: ['Jane', 'Logo Design', 'https://example.com/task/1'] },
    { name: 'taskCompleted', args: ['Bob', 'Logo Design', 'https://example.com/task/1'] },
    {
      name: 'revisionRequested',
      args: ['Jane', 'Logo Design', 'https://example.com/task/1', 'Please adjust colors'],
    },
    {
      name: 'taskAssignedToClient',
      args: ['Bob', 'Logo Design', 'Jane Doe', 'https://example.com/task/1'],
    },
    {
      name: 'deliverableSubmittedToClient',
      args: ['Bob', 'Logo Design', 'Jane Doe', 'https://example.com/task/1'],
    },
    {
      name: 'taskApprovedForClient',
      args: ['Bob', 'Logo Design', 'https://example.com/assets'],
    },
    { name: 'taskApprovedForFreelancer', args: ['Jane', 'Logo Design', 10] },
    { name: 'lowCredits', args: ['Bob', 5, 'https://example.com/credits'] },
    {
      name: 'freelancerApproved',
      args: ['Jane', 'https://example.com/portal'],
    },
    { name: 'freelancerRejected', args: ['Jane'] },
    {
      name: 'welcomeClient',
      args: ['Bob', 'https://example.com/dashboard'],
    },
    {
      name: 'creditsPurchased',
      args: ['Bob', 50, 'https://example.com/dashboard'],
    },
    {
      name: 'passwordReset',
      args: ['Bob', 'https://example.com/reset'],
    },
    {
      name: 'emailVerification',
      args: ['Bob', 'https://example.com/verify'],
    },
  ] as const

  it.each(allUserTemplates)('$name returns subject and html', ({ name, args }) => {
    const templateFn = emailTemplates[name as keyof typeof emailTemplates] as (...a: unknown[]) => {
      subject: string
      html: string
    }
    const result = templateFn(...args)

    expect(result).toHaveProperty('subject')
    expect(result).toHaveProperty('html')
    expect(typeof result.subject).toBe('string')
    expect(typeof result.html).toBe('string')
    expect(result.subject.length).toBeGreaterThan(0)
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('all user templates use branded layout', () => {
    const result = emailTemplates.welcomeClient('Test', 'https://example.com')
    // Check for branded elements
    expect(result.html).toContain('<!DOCTYPE html')
    expect(result.html).toContain('#f4f6f4') // body bg
    expect(result.html).toContain('getcrafted.ai') // footer link
    expect(result.html).toContain('Unsubscribe') // footer
  })

  it('taskAssigned includes task info', () => {
    const result = emailTemplates.taskAssigned(
      'Jane',
      'Banner Design',
      'https://example.com/task/1'
    )
    expect(result.subject).toContain('Banner Design')
    expect(result.html).toContain('Jane')
    expect(result.html).toContain('Banner Design')
    expect(result.html).toContain('https://example.com/task/1')
  })

  it('revisionRequested includes feedback in callout', () => {
    const result = emailTemplates.revisionRequested(
      'Jane',
      'Logo',
      'https://example.com/task/1',
      'Make it bigger'
    )
    expect(result.html).toContain('Make it bigger')
    expect(result.html).toContain('Client Feedback')
  })

  it('welcomeClient includes getting started steps', () => {
    const result = emailTemplates.welcomeClient('Bob', 'https://example.com/dashboard')
    expect(result.html).toContain('Step 1')
    expect(result.html).toContain('Step 2')
    expect(result.html).toContain('Step 3')
  })

  it('lowCredits includes warning callout', () => {
    const result = emailTemplates.lowCredits('Bob', 5, 'https://example.com/credits')
    expect(result.html).toContain('Balance Alert')
    expect(result.html).toContain('5 credits')
  })

  it('passwordReset uses centered layout', () => {
    const result = emailTemplates.passwordReset('Bob', 'https://example.com/reset')
    expect(result.html).toContain('text-align:center')
    expect(result.html).toContain('1 hour')
  })

  it('emailVerification uses centered layout', () => {
    const result = emailTemplates.emailVerification('Bob', 'https://example.com/verify')
    expect(result.html).toContain('text-align:center')
    expect(result.html).toContain('24 hours')
  })

  it('creditsPurchased shows credit badge', () => {
    const result = emailTemplates.creditsPurchased('Bob', 50, 'https://example.com/dashboard')
    expect(result.html).toContain('50 credits')
    expect(result.html).toContain('text-transform:uppercase') // badge
  })
})
