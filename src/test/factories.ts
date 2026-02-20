/**
 * Test factories for creating mock data
 *
 * Each factory returns a valid object matching the DB schema types,
 * uses sensible defaults, and accepts overrides via a partial parameter.
 *
 * Usage:
 *   const user = createMockUser({ role: 'ADMIN', credits: 100 })
 *   const task = createMockTask({ status: 'IN_PROGRESS', clientId: user.id })
 */

import type {
  users,
  sessions,
  accounts,
  companies,
  freelancerProfiles,
  taskCategories,
  tasks,
  taskFiles,
  taskMessages,
  taskActivityLog,
  notifications,
  creditTransactions,
  taskOffers,
  briefs,
  brandReferences,
  deliverableStyleReferences,
  styleReferences,
  chatDrafts,
  skills,
  artistSkills,
  taskSkillRequirements,
  payouts,
  webhookEvents,
  notificationSettings,
  earlyAccessCodes,
  auditLogs,
  audiences,
  platformSettings,
} from '@/db/schema'

// ============================================
// Type aliases for schema select types
// ============================================
type User = typeof users.$inferSelect
type Session = typeof sessions.$inferSelect
type Account = typeof accounts.$inferSelect
type Company = typeof companies.$inferSelect
type FreelancerProfile = typeof freelancerProfiles.$inferSelect
type TaskCategory = typeof taskCategories.$inferSelect
type Task = typeof tasks.$inferSelect
type TaskFile = typeof taskFiles.$inferSelect
type TaskMessage = typeof taskMessages.$inferSelect
type TaskActivityLogEntry = typeof taskActivityLog.$inferSelect
type Notification = typeof notifications.$inferSelect
type CreditTransaction = typeof creditTransactions.$inferSelect
type TaskOffer = typeof taskOffers.$inferSelect
type Brief = typeof briefs.$inferSelect
type BrandReference = typeof brandReferences.$inferSelect
type DeliverableStyleReference = typeof deliverableStyleReferences.$inferSelect
type StyleReference = typeof styleReferences.$inferSelect
type ChatDraft = typeof chatDrafts.$inferSelect
type Skill = typeof skills.$inferSelect
type ArtistSkill = typeof artistSkills.$inferSelect
type TaskSkillRequirement = typeof taskSkillRequirements.$inferSelect
type Payout = typeof payouts.$inferSelect
type WebhookEvent = typeof webhookEvents.$inferSelect
type NotificationSetting = typeof notificationSettings.$inferSelect
type EarlyAccessCode = typeof earlyAccessCodes.$inferSelect
type AuditLog = typeof auditLogs.$inferSelect
type Audience = typeof audiences.$inferSelect
type PlatformSetting = typeof platformSettings.$inferSelect

// ============================================
// Helper: unique ID generator
// ============================================
let counter = 0

function uniqueId(prefix = ''): string {
  counter++
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}${counter}_${random}`
}

function uniqueUUID(): string {
  // Use crypto.randomUUID when available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`
}

// ============================================
// Auth Session (composite) — preserved from original
// ============================================

export interface MockAuthSession {
  user: User
  session: {
    id: string
    token: string
    expiresAt: Date
  }
}

export function createMockAuthSession(overrides: Partial<MockAuthSession> = {}): MockAuthSession {
  return {
    user: createMockUser(overrides.user),
    session: {
      id: uniqueId('session_'),
      token: uniqueId('token_'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides.session,
    },
  }
}

/**
 * @deprecated Use createMockAuthSession instead. Kept for backward compatibility.
 */
export function createMockSession(overrides: Partial<MockAuthSession> = {}): MockAuthSession {
  return createMockAuthSession(overrides)
}

// ============================================
// 1. Users
// ============================================

export function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? uniqueId('user_')
  return {
    id,
    name: 'Test User',
    email: `${id}@example.com`,
    emailVerified: true,
    image: null,
    role: 'CLIENT',
    phone: null,
    credits: 10,
    companyId: null,
    onboardingCompleted: true,
    onboardingData: null,
    notificationPreferences: null,
    slackUserId: null,
    slackDmChannelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/** Convenience: create a CLIENT user */
export function createMockClientUser(overrides: Partial<User> = {}): User {
  return createMockUser({ role: 'CLIENT', credits: 10, ...overrides })
}

/** Convenience: create a FREELANCER user */
export function createMockFreelancerUser(overrides: Partial<User> = {}): User {
  return createMockUser({ role: 'FREELANCER', name: 'Test Freelancer', credits: 0, ...overrides })
}

/** Convenience: create an ADMIN user */
export function createMockAdminUser(overrides: Partial<User> = {}): User {
  return createMockUser({ role: 'ADMIN', name: 'Admin User', credits: 0, ...overrides })
}

// ============================================
// 2. Sessions (DB table)
// ============================================

export function createMockDbSession(overrides: Partial<Session> = {}): Session {
  return {
    id: uniqueId('sess_'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    token: uniqueId('tok_'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'vitest/1.0',
    userId: uniqueId('user_'),
    ...overrides,
  }
}

// ============================================
// 3. Accounts
// ============================================

export function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: uniqueId('acct_'),
    accountId: uniqueId('ext_acct_'),
    providerId: 'credential',
    userId: uniqueId('user_'),
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 4. Companies
// ============================================

export function createMockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: uniqueUUID(),
    name: 'Test Company',
    website: 'https://testcompany.example.com',
    industry: 'Technology',
    industryArchetype: 'Tech',
    description: 'A test company for unit tests',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    brandColors: [],
    primaryFont: 'Inter',
    secondaryFont: 'Roboto',
    socialLinks: null,
    contactEmail: 'contact@testcompany.example.com',
    contactPhone: null,
    brandAssets: null,
    tagline: 'Test tagline',
    keywords: [],
    onboardingStatus: 'NOT_STARTED',
    slackChannelId: null,
    slackChannelName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 5. Freelancer Profiles
// ============================================

export function createMockFreelancerProfile(
  overrides: Partial<FreelancerProfile> = {}
): FreelancerProfile {
  return {
    id: uniqueUUID(),
    userId: uniqueId('user_'),
    status: 'APPROVED',
    skills: ['Graphic Design', 'UI/UX'],
    specializations: ['Static Ads'],
    portfolioUrls: ['https://portfolio.example.com'],
    bio: 'Professional designer with 5 years of experience',
    timezone: 'America/New_York',
    hourlyRate: '50.00',
    rating: '4.50',
    completedTasks: 10,
    whatsappNumber: null,
    availability: true,
    experienceLevel: 'MID',
    maxConcurrentTasks: 3,
    acceptsUrgentTasks: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    avgResponseTimeMinutes: null,
    acceptanceRate: null,
    onTimeRate: null,
    preferredCategories: [],
    minCreditsToAccept: 1,
    vacationMode: false,
    vacationUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 6. Task Categories
// ============================================

export function createMockTaskCategory(overrides: Partial<TaskCategory> = {}): TaskCategory {
  const name = overrides.name ?? 'Static Ads'
  return {
    id: uniqueUUID(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: `${name} category for testing`,
    baseCredits: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 7. Tasks
// ============================================

export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: uniqueUUID(),
    clientId: uniqueId('user_'),
    freelancerId: null,
    categoryId: null,
    title: 'Test Task',
    description: 'Test description for a design task',
    status: 'PENDING',
    requirements: null,
    styleReferences: [],
    moodboardItems: [],
    chatHistory: [],
    structureData: null,
    estimatedHours: null,
    creditsUsed: 1,
    maxRevisions: 2,
    revisionsUsed: 0,
    priority: 0,
    deadline: null,
    assignedAt: null,
    completedAt: null,
    complexity: 'INTERMEDIATE',
    urgency: 'STANDARD',
    offeredTo: null,
    offerExpiresAt: null,
    escalationLevel: 0,
    requiredSkills: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/** Convenience: create a task with ASSIGNED status */
export function createMockAssignedTask(overrides: Partial<Task> = {}): Task {
  return createMockTask({
    status: 'ASSIGNED',
    freelancerId: uniqueId('user_'),
    assignedAt: new Date(),
    ...overrides,
  })
}

/** Convenience: create a task with IN_PROGRESS status */
export function createMockInProgressTask(overrides: Partial<Task> = {}): Task {
  return createMockTask({
    status: 'IN_PROGRESS',
    freelancerId: uniqueId('user_'),
    assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    ...overrides,
  })
}

/** Convenience: create a task with COMPLETED status */
export function createMockCompletedTask(overrides: Partial<Task> = {}): Task {
  return createMockTask({
    status: 'COMPLETED',
    freelancerId: uniqueId('user_'),
    assignedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedAt: new Date(),
    ...overrides,
  })
}

// ============================================
// 8. Task Files
// ============================================

export function createMockTaskFile(overrides: Partial<TaskFile> = {}): TaskFile {
  return {
    id: uniqueUUID(),
    taskId: uniqueUUID(),
    uploadedBy: uniqueId('user_'),
    fileName: 'test-design.png',
    fileUrl: 'https://storage.example.com/files/test-design.png',
    fileType: 'image/png',
    fileSize: 1024000,
    isDeliverable: false,
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 9. Task Messages
// ============================================

export function createMockTaskMessage(overrides: Partial<TaskMessage> = {}): TaskMessage {
  return {
    id: uniqueUUID(),
    taskId: uniqueUUID(),
    senderId: uniqueId('user_'),
    content: 'This is a test message',
    attachments: [],
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 10. Task Activity Log
// ============================================

export function createMockTaskActivityLog(
  overrides: Partial<TaskActivityLogEntry> = {}
): TaskActivityLogEntry {
  return {
    id: uniqueUUID(),
    taskId: uniqueUUID(),
    actorId: uniqueId('user_'),
    actorType: 'client',
    action: 'created',
    previousStatus: null,
    newStatus: 'PENDING',
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 11. Credit Transactions
// ============================================

export function createMockCreditTransaction(
  overrides: Partial<CreditTransaction> = {}
): CreditTransaction {
  return {
    id: uniqueUUID(),
    userId: uniqueId('user_'),
    amount: 5,
    type: 'PURCHASE',
    description: 'Purchased 5 credits',
    relatedTaskId: null,
    stripePaymentId: null,
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 12. Notifications
// ============================================

export function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: uniqueUUID(),
    userId: uniqueId('user_'),
    type: 'TASK_ASSIGNED',
    channel: 'IN_APP',
    title: 'New Task Assigned',
    content: 'You have been assigned a new task.',
    relatedTaskId: null,
    sentAt: null,
    readAt: null,
    status: 'PENDING',
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 13. Task Offers
// ============================================

export function createMockTaskOffer(overrides: Partial<TaskOffer> = {}): TaskOffer {
  return {
    id: uniqueUUID(),
    taskId: uniqueUUID(),
    artistId: uniqueId('user_'),
    matchScore: '85.00',
    escalationLevel: 1,
    offeredAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    respondedAt: null,
    response: 'PENDING',
    declineReason: null,
    declineNote: null,
    scoreBreakdown: {
      skillScore: 90,
      timezoneScore: 80,
      experienceScore: 85,
      workloadScore: 70,
      performanceScore: 95,
    },
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 14. Briefs
// ============================================

export function createMockBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    id: uniqueUUID(),
    userId: uniqueId('user_'),
    companyId: null,
    draftId: null,
    taskId: null,
    status: 'DRAFT',
    completionPercentage: 0,
    taskSummary: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    topic: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    platform: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    contentType: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    intent: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    taskType: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    audience: {
      value: null,
      confidence: 0,
      source: 'pending',
    },
    dimensions: null,
    visualDirection: null,
    contentOutline: null,
    brandContext: null,
    clarifyingQuestionsAsked: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 15. Brand References
// ============================================

export function createMockBrandReference(overrides: Partial<BrandReference> = {}): BrandReference {
  return {
    id: uniqueUUID(),
    name: 'Test Brand Reference',
    description: 'A test brand reference for unit tests',
    imageUrl: 'https://storage.example.com/brand-refs/test.jpg',
    toneBucket: 'balanced',
    energyBucket: 'balanced',
    densityBucket: 'balanced',
    premiumBucket: 'balanced',
    colorBucket: 'neutral',
    colorSamples: ['#3B82F6', '#EF4444', '#10B981'],
    visualStyles: ['minimal', 'modern'],
    industries: ['technology'],
    displayOrder: 0,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 16. Deliverable Style References
// ============================================

export function createMockDeliverableStyleReference(
  overrides: Partial<DeliverableStyleReference> = {}
): DeliverableStyleReference {
  return {
    id: uniqueUUID(),
    name: 'Minimalist Clean',
    description: 'A clean minimalist style',
    imageUrl: 'https://storage.example.com/styles/minimalist.jpg',
    deliverableType: 'instagram_post',
    styleAxis: 'minimal',
    subStyle: null,
    semanticTags: ['clean', 'whitespace', 'modern'],
    colorTemperature: 'cool',
    energyLevel: 'calm',
    densityLevel: 'minimal',
    formalityLevel: 'balanced',
    colorSamples: ['#FFFFFF', '#F3F4F6', '#3B82F6'],
    industries: ['technology', 'fashion'],
    targetAudience: 'b2c',
    visualElements: ['typography-heavy'],
    moodKeywords: ['professional', 'elegant'],
    imageHash: null,
    sourceUrl: null,
    exampleOutputUrl: null,
    videoUrl: null,
    videoThumbnailUrl: null,
    videoDuration: null,
    videoTags: [],
    featuredOrder: 0,
    displayOrder: 0,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 17. Style References
// ============================================

export function createMockStyleReference(overrides: Partial<StyleReference> = {}): StyleReference {
  return {
    id: uniqueUUID(),
    category: 'static_ads',
    name: 'Bold Typography',
    description: 'A bold typography-focused style',
    imageUrl: 'https://storage.example.com/style-refs/bold-typo.jpg',
    tags: ['bold', 'typography', 'modern'],
    usageCount: 0,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 18. Chat Drafts
// ============================================

export function createMockChatDraft(overrides: Partial<ChatDraft> = {}): ChatDraft {
  return {
    id: uniqueUUID(),
    clientId: uniqueId('user_'),
    title: 'New Request',
    messages: [],
    selectedStyles: [],
    pendingTask: null,
    briefingState: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 19. Skills
// ============================================

export function createMockSkill(overrides: Partial<Skill> = {}): Skill {
  const name = overrides.name ?? 'Graphic Design'
  return {
    id: uniqueUUID(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    category: 'design',
    description: `${name} skill for testing`,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 20. Artist Skills
// ============================================

export function createMockArtistSkill(overrides: Partial<ArtistSkill> = {}): ArtistSkill {
  return {
    id: uniqueUUID(),
    artistId: uniqueId('user_'),
    skillId: uniqueUUID(),
    proficiencyLevel: 'INTERMEDIATE',
    yearsExperience: '3.0',
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 21. Task Skill Requirements
// ============================================

export function createMockTaskSkillRequirement(
  overrides: Partial<TaskSkillRequirement> = {}
): TaskSkillRequirement {
  return {
    id: uniqueUUID(),
    taskId: uniqueUUID(),
    skillId: uniqueUUID(),
    isRequired: true,
    minProficiency: 'INTERMEDIATE',
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 22. Payouts
// ============================================

export function createMockPayout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: uniqueUUID(),
    freelancerId: uniqueId('user_'),
    creditsAmount: 10,
    grossAmountUsd: '100.00',
    platformFeeUsd: '30.00',
    netAmountUsd: '70.00',
    artistPercentage: 70,
    status: 'PENDING',
    payoutMethod: null,
    stripeConnectAccountId: null,
    stripeTransferId: null,
    stripePayoutId: null,
    processedAt: null,
    failureReason: null,
    requestedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 23. Webhook Events
// ============================================

export function createMockWebhookEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: uniqueUUID(),
    eventId: uniqueId('evt_'),
    eventType: 'checkout.session.completed',
    provider: 'stripe',
    payload: null,
    processedAt: new Date(),
    status: 'processed',
    errorMessage: null,
    ...overrides,
  }
}

// ============================================
// 24. Notification Settings
// ============================================

export function createMockNotificationSetting(
  overrides: Partial<NotificationSetting> = {}
): NotificationSetting {
  return {
    id: uniqueUUID(),
    eventType: 'TASK_ASSIGNED',
    name: 'Task Assigned',
    description: 'Sent when a task is assigned to a freelancer',
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: true,
    notifyFreelancer: true,
    notifyAdmin: false,
    emailSubject: 'Task Assigned: {{taskTitle}}',
    emailTemplate: '<p>A new task has been assigned.</p>',
    whatsappTemplate: 'You have been assigned task: {{taskTitle}}',
    updatedAt: new Date(),
    updatedBy: null,
    ...overrides,
  }
}

// ============================================
// 25. Early Access Codes
// ============================================

export function createMockEarlyAccessCode(
  overrides: Partial<EarlyAccessCode> = {}
): EarlyAccessCode {
  return {
    id: uniqueUUID(),
    code: uniqueId('EARLY_').toUpperCase(),
    description: 'Test early access code',
    maxUses: 100,
    usedCount: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 26. Audit Logs
// ============================================

export function createMockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: uniqueUUID(),
    actorId: uniqueId('user_'),
    actorEmail: 'admin@example.com',
    actorRole: 'ADMIN',
    action: 'USER_CREATE',
    resourceType: 'user',
    resourceId: uniqueId('user_'),
    details: null,
    previousValue: null,
    newValue: null,
    success: true,
    errorMessage: null,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest/1.0',
    endpoint: '/api/admin/users',
    createdAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 27. Audiences
// ============================================

export function createMockAudience(overrides: Partial<Audience> = {}): Audience {
  return {
    id: uniqueUUID(),
    companyId: uniqueUUID(),
    name: 'HR Directors',
    isPrimary: false,
    demographics: null,
    firmographics: null,
    psychographics: null,
    behavioral: null,
    confidence: 50,
    sources: ['website'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// 28. Platform Settings
// ============================================

export function createMockPlatformSetting(
  overrides: Partial<PlatformSetting> = {}
): PlatformSetting {
  return {
    id: uniqueUUID(),
    key: 'credit_price_usd',
    value: 10,
    description: 'Price per credit in USD',
    updatedBy: null,
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// Re-export legacy types for backward compatibility
// ============================================

/** @deprecated Import the Drizzle schema type directly instead */
export type MockUser = User
/** @deprecated Import the Drizzle schema type directly instead */
export type MockTask = Task
/** @deprecated Use MockAuthSession instead */
export type MockSession = MockAuthSession
/** @deprecated Import the Drizzle schema type directly instead */
export type MockFreelancerProfile = FreelancerProfile
