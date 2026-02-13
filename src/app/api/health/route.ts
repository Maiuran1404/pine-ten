import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { checkEnvHealth } from '@/lib/env'
import { logger } from '@/lib/logger'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: { status: string; latency?: number; error?: string }
    environment: { status: string; missing?: string[] }
  }
}

/**
 * Health check endpoint for monitoring
 * GET /api/health
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const _startTime = Date.now()
  const checks: HealthStatus['checks'] = {
    database: { status: 'unknown' },
    environment: { status: 'unknown' },
  }

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await db.execute(sql`SELECT 1`)
    const dbLatency = Date.now() - dbStart

    checks.database = {
      status: dbLatency < 1000 ? 'healthy' : 'degraded',
      latency: dbLatency,
    }

    if (dbLatency >= 1000) {
      overallStatus = 'degraded'
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
    overallStatus = 'unhealthy'
  }

  // Check environment variables
  try {
    const envHealth = checkEnvHealth()
    checks.environment = {
      status: envHealth.healthy ? 'healthy' : 'degraded',
      ...(envHealth.missing.length > 0 && { missing: envHealth.missing }),
    }

    if (!envHealth.healthy && overallStatus === 'healthy') {
      overallStatus = 'degraded'
    }
  } catch (error) {
    logger.warn({ err: error }, 'Failed to check environment health')
    checks.environment = { status: 'unknown' }
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}
