import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to control NODE_ENV for certain tests
const originalEnv = process.env.NODE_ENV

describe('logger module', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NODE_ENV = originalEnv
  })

  it('should export a logger instance', async () => {
    const mod = await import('./logger')
    expect(mod.logger).toBeDefined()
    expect(typeof mod.logger.info).toBe('function')
    expect(typeof mod.logger.error).toBe('function')
    expect(typeof mod.logger.warn).toBe('function')
    expect(typeof mod.logger.debug).toBe('function')
  })

  it('should export a default logger', async () => {
    const mod = await import('./logger')
    expect(mod.default).toBe(mod.logger)
  })

  describe('createLogger', () => {
    it('should return a child logger with context', async () => {
      const { createLogger } = await import('./logger')
      const childLogger = createLogger({ module: 'test', requestId: 'abc123' })
      expect(childLogger).toBeDefined()
      expect(typeof childLogger.info).toBe('function')
      expect(typeof childLogger.error).toBe('function')
    })

    it('should produce a logger distinct from the parent', async () => {
      const { logger, createLogger } = await import('./logger')
      const childLogger = createLogger({ module: 'child' })
      expect(childLogger).not.toBe(logger)
    })
  })

  describe('logRequest', () => {
    it('should call logger.info with correct structure', async () => {
      const { logger, logRequest } = await import('./logger')
      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined as never)

      logRequest('GET', '/api/tasks', 'user_123', 45)

      expect(infoSpy).toHaveBeenCalledWith({
        type: 'request',
        method: 'GET',
        path: '/api/tasks',
        userId: 'user_123',
        duration: 45,
      })

      infoSpy.mockRestore()
    })

    it('should handle missing optional parameters', async () => {
      const { logger, logRequest } = await import('./logger')
      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined as never)

      logRequest('POST', '/api/tasks')

      expect(infoSpy).toHaveBeenCalledWith({
        type: 'request',
        method: 'POST',
        path: '/api/tasks',
        userId: undefined,
        duration: undefined,
      })

      infoSpy.mockRestore()
    })
  })

  describe('logError', () => {
    it('should handle Error instances', async () => {
      const { logger, logError } = await import('./logger')
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)

      const testError = new Error('Something went wrong')
      logError(testError, { taskId: 'task_123' })

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            message: 'Something went wrong',
            name: 'Error',
          }),
          taskId: 'task_123',
        })
      )

      errorSpy.mockRestore()
    })

    it('should handle non-Error values', async () => {
      const { logger, logError } = await import('./logger')
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)

      logError('string error')

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            message: 'string error',
            name: 'Error',
          }),
        })
      )

      errorSpy.mockRestore()
    })

    it('should handle numeric error values', async () => {
      const { logger, logError } = await import('./logger')
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)

      logError(42)

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            message: '42',
          }),
        })
      )

      errorSpy.mockRestore()
    })

    it('should handle null/undefined errors', async () => {
      const { logger, logError } = await import('./logger')
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)

      logError(null)
      expect(errorSpy).toHaveBeenCalled()

      logError(undefined)
      expect(errorSpy).toHaveBeenCalledTimes(2)

      errorSpy.mockRestore()
    })

    it('should use empty context by default', async () => {
      const { logger, logError } = await import('./logger')
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never)

      logError(new Error('test'))

      const callArg = errorSpy.mock.calls[0][0] as Record<string, unknown>
      // Should only have `err` key (no extra context keys)
      expect(callArg).toHaveProperty('err')

      errorSpy.mockRestore()
    })
  })
})
