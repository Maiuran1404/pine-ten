import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError, z } from 'zod'

// Mock the logger
vi.mock('./logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  APIError,
  ErrorCodes,
  Errors,
  errorResponse,
  handleZodError,
  withErrorHandling,
  successResponse,
} from './errors'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('APIError', () => {
  it('should create an error with correct properties', () => {
    const error = new APIError(ErrorCodes.NOT_FOUND, 'User not found', 404, { userId: '123' })

    expect(error.code).toBe(ErrorCodes.NOT_FOUND)
    expect(error.message).toBe('User not found')
    expect(error.statusCode).toBe(404)
    expect(error.details).toEqual({ userId: '123' })
    expect(error.name).toBe('APIError')
  })

  it('should default to 500 status code', () => {
    const error = new APIError(ErrorCodes.INTERNAL_ERROR, 'Something went wrong')
    expect(error.statusCode).toBe(500)
  })

  it('should be an instance of Error', () => {
    const error = new APIError(ErrorCodes.INTERNAL_ERROR, 'test')
    expect(error).toBeInstanceOf(Error)
  })

  it('should not require details', () => {
    const error = new APIError(ErrorCodes.UNAUTHORIZED, 'No access', 401)
    expect(error.details).toBeUndefined()
  })
})

describe('Errors helper', () => {
  it('unauthorized should create 401 error', () => {
    const error = Errors.unauthorized()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe(ErrorCodes.UNAUTHORIZED)
    expect(error.message).toBe('Unauthorized')
  })

  it('unauthorized should accept custom message', () => {
    const error = Errors.unauthorized('Token expired')
    expect(error.message).toBe('Token expired')
  })

  it('forbidden should create 403 error', () => {
    const error = Errors.forbidden()
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe(ErrorCodes.INSUFFICIENT_PERMISSIONS)
  })

  it('forbidden should accept custom message', () => {
    const error = Errors.forbidden('Admin only')
    expect(error.message).toBe('Admin only')
  })

  it('notFound should create 404 error with resource name', () => {
    const error = Errors.notFound('Task')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Task not found')
  })

  it('notFound should use default resource name', () => {
    const error = Errors.notFound()
    expect(error.message).toBe('Resource not found')
  })

  it('badRequest should create 400 error with details', () => {
    const error = Errors.badRequest('Invalid input', { field: 'email' })
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe(ErrorCodes.INVALID_INPUT)
    expect(error.details).toEqual({ field: 'email' })
  })

  it('conflict should create 409 error', () => {
    const error = Errors.conflict('Resource already exists')
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe(ErrorCodes.CONFLICT)
  })

  it('insufficientCredits should include credit details', () => {
    const error = Errors.insufficientCredits(10, 5)
    expect(error.code).toBe(ErrorCodes.INSUFFICIENT_CREDITS)
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({ required: 10, available: 5 })
  })

  it('rateLimited should create 429 error', () => {
    const error = Errors.rateLimited(60)
    expect(error.statusCode).toBe(429)
    expect(error.details).toEqual({ retryAfter: 60 })
  })

  it('rateLimited should work without retryAfter', () => {
    const error = Errors.rateLimited()
    expect(error.statusCode).toBe(429)
    expect(error.details).toEqual({ retryAfter: undefined })
  })

  it('internal should create 500 error', () => {
    const error = Errors.internal()
    expect(error.statusCode).toBe(500)
    expect(error.message).toBe('Internal server error')
  })

  it('internal should accept custom message', () => {
    const error = Errors.internal('DB connection failed')
    expect(error.message).toBe('DB connection failed')
  })

  it('csrfInvalid should create 403 error', () => {
    const error = Errors.csrfInvalid()
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe(ErrorCodes.CSRF_INVALID)
  })
})

describe('ErrorCodes', () => {
  it('should have unique error codes', () => {
    const codes = Object.values(ErrorCodes)
    const uniqueCodes = new Set(codes)
    expect(codes.length).toBe(uniqueCodes.size)
  })

  it('should have correct prefixes for categories', () => {
    expect(ErrorCodes.UNAUTHORIZED).toMatch(/^AUTH_/)
    expect(ErrorCodes.INVALID_TOKEN).toMatch(/^AUTH_/)
    expect(ErrorCodes.SESSION_EXPIRED).toMatch(/^AUTH_/)
    expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toMatch(/^AUTH_/)
    expect(ErrorCodes.VALIDATION_ERROR).toMatch(/^VAL_/)
    expect(ErrorCodes.INVALID_INPUT).toMatch(/^VAL_/)
    expect(ErrorCodes.MISSING_FIELD).toMatch(/^VAL_/)
    expect(ErrorCodes.NOT_FOUND).toMatch(/^RES_/)
    expect(ErrorCodes.ALREADY_EXISTS).toMatch(/^RES_/)
    expect(ErrorCodes.CONFLICT).toMatch(/^RES_/)
    expect(ErrorCodes.INSUFFICIENT_CREDITS).toMatch(/^BIZ_/)
    expect(ErrorCodes.TASK_NOT_AVAILABLE).toMatch(/^BIZ_/)
    expect(ErrorCodes.PAYMENT_FAILED).toMatch(/^PAY_/)
    expect(ErrorCodes.CSRF_INVALID).toMatch(/^SEC_/)
    expect(ErrorCodes.INTERNAL_ERROR).toMatch(/^SRV_/)
    expect(ErrorCodes.RATE_LIMITED).toMatch(/^SRV_/)
  })

  it('should have all expected error codes', () => {
    const expectedCodes = [
      'UNAUTHORIZED',
      'INVALID_TOKEN',
      'SESSION_EXPIRED',
      'INSUFFICIENT_PERMISSIONS',
      'VALIDATION_ERROR',
      'INVALID_INPUT',
      'MISSING_FIELD',
      'NOT_FOUND',
      'ALREADY_EXISTS',
      'CONFLICT',
      'INSUFFICIENT_CREDITS',
      'TASK_NOT_AVAILABLE',
      'MAX_REVISIONS_REACHED',
      'FREELANCER_NOT_APPROVED',
      'INVALID_STATUS_TRANSITION',
      'PAYMENT_FAILED',
      'INVALID_PACKAGE',
      'WEBHOOK_ERROR',
      'CSRF_INVALID',
      'CSRF_MISSING',
      'INTERNAL_ERROR',
      'DATABASE_ERROR',
      'EXTERNAL_SERVICE_ERROR',
      'RATE_LIMITED',
    ]
    for (const code of expectedCodes) {
      expect(ErrorCodes).toHaveProperty(code)
    }
  })
})

describe('errorResponse', () => {
  it('should return NextResponse with correct JSON body', async () => {
    const response = errorResponse(ErrorCodes.NOT_FOUND, 'Task not found', 404)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe(ErrorCodes.NOT_FOUND)
    expect(body.error.message).toBe('Task not found')
    expect(body.error.requestId).toMatch(/^req_/)
  })

  it('should set correct status code', () => {
    const response = errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    expect(response.status).toBe(401)
  })

  it('should include details when provided', async () => {
    const response = errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, {
      fields: { name: ['Required'] },
    })

    const body = await response.json()
    expect(body.error.details).toEqual({ fields: { name: ['Required'] } })
  })

  it('should default to 500 status code', () => {
    const response = errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error')
    expect(response.status).toBe(500)
  })

  it('should generate unique requestId', async () => {
    const r1 = errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error 1')
    const r2 = errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error 2')

    const b1 = await r1.json()
    const b2 = await r2.json()
    expect(b1.error.requestId).not.toBe(b2.error.requestId)
  })
})

describe('handleZodError', () => {
  it('should format single field error', async () => {
    const schema = z.object({ name: z.string().min(2) })
    try {
      schema.parse({ name: '' })
    } catch (error) {
      const response = handleZodError(error as ZodError)
      const body = await response.json()

      expect(body.success).toBe(false)
      expect(body.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(body.error.message).toBe('Validation failed')
      expect(body.error.details).toHaveProperty('fields')
    }
  })

  it('should format multiple field errors', async () => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
    })
    try {
      schema.parse({ name: '', email: 'bad' })
    } catch (error) {
      const response = handleZodError(error as ZodError)
      const body = await response.json()

      const fields = body.error.details?.fields as Record<string, string[]>
      expect(fields).toHaveProperty('name')
      expect(fields).toHaveProperty('email')
    }
  })

  it('should format nested field paths', async () => {
    const schema = z.object({
      address: z.object({ city: z.string().min(1) }),
    })
    try {
      schema.parse({ address: { city: '' } })
    } catch (error) {
      const response = handleZodError(error as ZodError)
      const body = await response.json()

      const fields = body.error.details?.fields as Record<string, string[]>
      expect(fields).toHaveProperty('address.city')
    }
  })

  it('should return 400 status code', () => {
    const schema = z.object({ x: z.string() })
    try {
      schema.parse({ x: 123 })
    } catch (error) {
      const response = handleZodError(error as ZodError)
      expect(response.status).toBe(400)
    }
  })
})

describe('withErrorHandling', () => {
  it('should return handler result on success', async () => {
    const result = await withErrorHandling(async () => 'success')
    expect(result).toBe('success')
  })

  it('should catch ZodError and return formatted response', async () => {
    const schema = z.object({ name: z.string() })

    const result = await withErrorHandling(async () => {
      schema.parse({ name: 123 })
    })

    // Should be a NextResponse
    expect(result).toHaveProperty('status')
    const body = await (result as Response).json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
  })

  it('should catch APIError and return formatted response', async () => {
    const result = await withErrorHandling(async () => {
      throw new APIError(ErrorCodes.NOT_FOUND, 'Not found', 404)
    })

    const body = await (result as Response).json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('should catch unknown errors and return 500', async () => {
    const result = await withErrorHandling(async () => {
      throw new Error('Unexpected failure')
    })

    const body = await (result as Response).json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it('should pass context to logger on unknown errors', async () => {
    const { logger } = await import('./logger')

    await withErrorHandling(
      async () => {
        throw new Error('fail')
      },
      { route: '/api/test' }
    )

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { route: '/api/test' },
        type: 'unhandled_error',
      })
    )
  })
})

describe('successResponse', () => {
  it('should return success format with data', async () => {
    const response = successResponse({ id: '123', name: 'Test' })
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual({ id: '123', name: 'Test' })
  })

  it('should default to 200 status code', () => {
    const response = successResponse('ok')
    expect(response.status).toBe(200)
  })

  it('should accept custom status code', () => {
    const response = successResponse({ created: true }, 201)
    expect(response.status).toBe(201)
  })

  it('should handle null data', async () => {
    const response = successResponse(null)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })

  it('should handle array data', async () => {
    const response = successResponse([1, 2, 3])
    const body = await response.json()
    expect(body.data).toEqual([1, 2, 3])
  })
})
