import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Centralized logger using Pino
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ userId }, "User logged in");
 *   logger.error({ err, taskId }, "Failed to create task");
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  ...(isProduction && {
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
  base: {
    env: process.env.NODE_ENV,
    ...(isProduction && { service: 'crafted-api' }),
  },
})

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Request logger middleware helper
 */
export function logRequest(method: string, path: string, userId?: string, duration?: number) {
  logger.info({
    type: 'request',
    method,
    path,
    userId,
    duration,
  })
}

/**
 * Error logger with sanitization
 */
export function logError(error: unknown, context: Record<string, unknown> = {}) {
  const err = error instanceof Error ? error : new Error(String(error))

  logger.error({
    err: {
      message: err.message,
      name: err.name,
      stack: isDevelopment ? err.stack : undefined,
    },
    ...context,
  })
}

export default logger
