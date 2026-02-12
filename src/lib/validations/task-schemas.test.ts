import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  updateTaskSchema,
  taskMessageSchema,
  taskRevisionSchema,
  claimTaskSchema,
  submitDeliverableSchema,
  saveDraftSchema,
} from './index'

describe('Task Schemas', () => {
  describe('createTaskSchema', () => {
    const validTask = {
      title: 'Design a logo',
      description: 'Create a minimalist logo for our startup company',
      creditsRequired: 5,
    }

    it('should accept valid minimal task', () => {
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })

    it('should trim title whitespace', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        title: '  Design a logo  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Design a logo')
      }
    })

    it('should trim description whitespace', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        description: '  Create a minimalist logo  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Create a minimalist logo')
      }
    })

    it('should reject title shorter than 3 chars', () => {
      const result = createTaskSchema.safeParse({ ...validTask, title: 'Hi' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('3 characters')
      }
    })

    it('should reject title longer than 200 chars', () => {
      const result = createTaskSchema.safeParse({ ...validTask, title: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('should reject description shorter than 10 chars', () => {
      const result = createTaskSchema.safeParse({ ...validTask, description: 'Short' })
      expect(result.success).toBe(false)
    })

    it('should reject description longer than 5000 chars', () => {
      const result = createTaskSchema.safeParse({ ...validTask, description: 'a'.repeat(5001) })
      expect(result.success).toBe(false)
    })

    it('should reject 0 credits', () => {
      const result = createTaskSchema.safeParse({ ...validTask, creditsRequired: 0 })
      expect(result.success).toBe(false)
    })

    it('should reject negative credits', () => {
      const result = createTaskSchema.safeParse({ ...validTask, creditsRequired: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject more than 100 credits', () => {
      const result = createTaskSchema.safeParse({ ...validTask, creditsRequired: 101 })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer credits', () => {
      const result = createTaskSchema.safeParse({ ...validTask, creditsRequired: 2.5 })
      expect(result.success).toBe(false)
    })

    it('should accept exactly 1 credit', () => {
      const result = createTaskSchema.safeParse({ ...validTask, creditsRequired: 1 })
      expect(result.success).toBe(true)
    })

    it('should accept exactly 100 credits', () => {
      const result = createTaskSchema.safeParse({ ...validTask, creditsRequired: 100 })
      expect(result.success).toBe(true)
    })

    it('should default chatHistory to empty array', () => {
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.chatHistory).toEqual([])
      }
    })

    it('should default styleReferences to empty array', () => {
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.styleReferences).toEqual([])
      }
    })

    it('should default attachments to empty array', () => {
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.attachments).toEqual([])
      }
    })

    it('should default moodboardItems to empty array', () => {
      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moodboardItems).toEqual([])
      }
    })

    it('should accept valid attachments', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        attachments: [
          {
            fileName: 'logo.png',
            fileUrl: 'https://example.com/logo.png',
            fileType: 'image/png',
            fileSize: 1024,
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject attachment with invalid URL', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        attachments: [
          {
            fileName: 'logo.png',
            fileUrl: 'not-a-url',
            fileType: 'image/png',
            fileSize: 1024,
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should reject attachment with negative fileSize', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        attachments: [
          {
            fileName: 'logo.png',
            fileUrl: 'https://example.com/logo.png',
            fileType: 'image/png',
            fileSize: -1,
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid moodboard items', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        moodboardItems: [
          {
            id: 'item_1',
            type: 'style',
            imageUrl: 'https://example.com/style.png',
            name: 'Modern Style',
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject moodboard item with invalid type', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        moodboardItems: [
          {
            id: 'item_1',
            type: 'invalid_type',
            imageUrl: 'https://example.com/style.png',
            name: 'Modern Style',
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should accept nullable optional fields', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        category: null,
        requirements: null,
        estimatedHours: null,
        deadline: null,
        briefId: null,
        briefData: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid ISO datetime deadline', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        deadline: '2025-12-31T23:59:59.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid deadline format', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        deadline: 'next-friday',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid UUID briefId', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        briefId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid briefId format', () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        briefId: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateTaskSchema', () => {
    it('should accept valid partial update', () => {
      const result = updateTaskSchema.safeParse({ title: 'New Title' })
      expect(result.success).toBe(true)
    })

    it('should accept empty object (no update fields)', () => {
      const result = updateTaskSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept valid status transitions', () => {
      const statuses = [
        'PENDING',
        'ASSIGNED',
        'IN_PROGRESS',
        'IN_REVIEW',
        'REVISION_REQUESTED',
        'COMPLETED',
        'CANCELLED',
      ]
      for (const status of statuses) {
        const result = updateTaskSchema.safeParse({ status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid status', () => {
      const result = updateTaskSchema.safeParse({ status: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should accept priority values 0-3', () => {
      for (let p = 0; p <= 3; p++) {
        const result = updateTaskSchema.safeParse({ priority: p })
        expect(result.success).toBe(true)
      }
    })

    it('should reject priority outside 0-3 range', () => {
      expect(updateTaskSchema.safeParse({ priority: -1 }).success).toBe(false)
      expect(updateTaskSchema.safeParse({ priority: 4 }).success).toBe(false)
    })

    it('should reject non-integer priority', () => {
      const result = updateTaskSchema.safeParse({ priority: 1.5 })
      expect(result.success).toBe(false)
    })

    it('should accept nullable deadline', () => {
      const result = updateTaskSchema.safeParse({ deadline: null })
      expect(result.success).toBe(true)
    })
  })

  describe('taskMessageSchema', () => {
    it('should accept valid message', () => {
      const result = taskMessageSchema.safeParse({ content: 'Hello world' })
      expect(result.success).toBe(true)
    })

    it('should reject empty content', () => {
      const result = taskMessageSchema.safeParse({ content: '' })
      expect(result.success).toBe(false)
    })

    it('should reject content over 5000 chars', () => {
      const result = taskMessageSchema.safeParse({ content: 'a'.repeat(5001) })
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from content', () => {
      const result = taskMessageSchema.safeParse({ content: '  trimmed  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('trimmed')
      }
    })

    it('should default attachments to empty array', () => {
      const result = taskMessageSchema.safeParse({ content: 'Hello' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.attachments).toEqual([])
      }
    })

    it('should validate attachment URLs', () => {
      const result = taskMessageSchema.safeParse({
        content: 'Check this',
        attachments: ['https://example.com/file.png'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid attachment URLs', () => {
      const result = taskMessageSchema.safeParse({
        content: 'Check this',
        attachments: ['not-a-url'],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('taskRevisionSchema', () => {
    it('should accept valid feedback', () => {
      const result = taskRevisionSchema.safeParse({
        feedback: 'Please change the color scheme to blue',
      })
      expect(result.success).toBe(true)
    })

    it('should reject feedback shorter than 10 chars', () => {
      const result = taskRevisionSchema.safeParse({ feedback: 'Bad' })
      expect(result.success).toBe(false)
    })

    it('should reject feedback longer than 2000 chars', () => {
      const result = taskRevisionSchema.safeParse({ feedback: 'a'.repeat(2001) })
      expect(result.success).toBe(false)
    })

    it('should trim feedback whitespace', () => {
      const result = taskRevisionSchema.safeParse({
        feedback: '  Please change the color scheme  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feedback).toBe('Please change the color scheme')
      }
    })
  })

  describe('claimTaskSchema', () => {
    it('should accept valid UUID', () => {
      const result = claimTaskSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = claimTaskSchema.safeParse({ taskId: 'not-a-uuid' })
      expect(result.success).toBe(false)
    })

    it('should reject missing taskId', () => {
      const result = claimTaskSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('submitDeliverableSchema', () => {
    const validDeliverable = {
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      files: [
        {
          fileName: 'design.psd',
          fileUrl: 'https://example.com/design.psd',
          fileType: 'application/psd',
          fileSize: 5000,
        },
      ],
    }

    it('should accept valid deliverable', () => {
      const result = submitDeliverableSchema.safeParse(validDeliverable)
      expect(result.success).toBe(true)
    })

    it('should require at least one file', () => {
      const result = submitDeliverableSchema.safeParse({
        ...validDeliverable,
        files: [],
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid taskId', () => {
      const result = submitDeliverableSchema.safeParse({
        ...validDeliverable,
        taskId: 'bad-id',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional message', () => {
      const result = submitDeliverableSchema.safeParse({
        ...validDeliverable,
        message: 'Here are the final designs',
      })
      expect(result.success).toBe(true)
    })

    it('should reject message over 2000 chars', () => {
      const result = submitDeliverableSchema.safeParse({
        ...validDeliverable,
        message: 'a'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })

    it('should reject file with invalid URL', () => {
      const result = submitDeliverableSchema.safeParse({
        ...validDeliverable,
        files: [
          {
            fileName: 'design.psd',
            fileUrl: 'not-a-url',
            fileType: 'application/psd',
            fileSize: 5000,
          },
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('saveDraftSchema', () => {
    it('should accept empty object', () => {
      const result = saveDraftSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept valid draft with all fields', () => {
      const result = saveDraftSchema.safeParse({
        id: 'draft_1',
        title: 'My Draft',
        messages: [{ role: 'user', content: 'Hello' }],
        selectedStyles: ['style1'],
        pendingTask: { title: 'Task' },
      })
      expect(result.success).toBe(true)
    })

    it('should accept nullable pendingTask', () => {
      const result = saveDraftSchema.safeParse({ pendingTask: null })
      expect(result.success).toBe(true)
    })

    it('should reject title over 200 chars', () => {
      const result = saveDraftSchema.safeParse({ title: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })
})
