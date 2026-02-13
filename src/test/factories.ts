/**
 * Test factories for creating mock data
 */

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user_' + Math.random().toString(36).substring(7),
    name: 'Test User',
    email: 'test@example.com',
    role: 'CLIENT',
    credits: 10,
    emailVerified: true,
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockTask(overrides: Partial<MockTask> = {}): MockTask {
  return {
    id: 'task_' + Math.random().toString(36).substring(7),
    clientId: 'user_123',
    freelancerId: null,
    categoryId: null,
    title: 'Test Task',
    description: 'Test description',
    status: 'PENDING',
    requirements: null,
    styleReferences: [],
    chatHistory: [],
    estimatedHours: null,
    creditsUsed: 1,
    maxRevisions: 2,
    revisionsUsed: 0,
    priority: 0,
    deadline: null,
    assignedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    user: createMockUser(),
    session: {
      id: 'session_' + Math.random().toString(36).substring(7),
      token: 'token_' + Math.random().toString(36).substring(7),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    ...overrides,
  }
}

export function createMockFreelancerProfile(
  overrides: Partial<MockFreelancerProfile> = {}
): MockFreelancerProfile {
  return {
    id: 'profile_' + Math.random().toString(36).substring(7),
    userId: 'user_123',
    status: 'APPROVED',
    skills: ['Graphic Design', 'UI/UX'],
    specializations: ['Static Ads'],
    portfolioUrls: ['https://portfolio.example.com'],
    bio: 'Professional designer',
    hourlyRate: '50.00',
    rating: '4.5',
    completedTasks: 10,
    whatsappNumber: null,
    availability: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Types
interface MockUser {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'FREELANCER' | 'ADMIN'
  credits: number
  emailVerified: boolean
  onboardingCompleted: boolean
  createdAt: Date
  updatedAt: Date
  [key: string]: unknown
}

interface MockTask {
  id: string
  clientId: string
  freelancerId: string | null
  categoryId: string | null
  title: string
  description: string
  status: string
  requirements: unknown
  styleReferences: string[]
  chatHistory: unknown[]
  estimatedHours: string | null
  creditsUsed: number
  maxRevisions: number
  revisionsUsed: number
  priority: number
  deadline: Date | null
  assignedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface MockSession {
  user: MockUser
  session: {
    id: string
    token: string
    expiresAt: Date
  }
}

interface MockFreelancerProfile {
  id: string
  userId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  skills: string[]
  specializations: string[]
  portfolioUrls: string[]
  bio: string
  hourlyRate: string
  rating: string
  completedTasks: number
  whatsappNumber: string | null
  availability: boolean
  createdAt: Date
  updatedAt: Date
}
