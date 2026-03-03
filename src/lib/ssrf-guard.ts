import 'server-only'
import { Errors } from '@/lib/errors'

/**
 * SSRF Protection — blocks requests to private/internal IP ranges
 * and cloud metadata endpoints.
 *
 * Apply this to any server-side fetch that accepts a user-supplied URL.
 */

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '::1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
])

/**
 * Throws if the URL points to a private/internal address.
 * Call after parsing and before fetching.
 */
export function assertSafeUrl(url: URL): void {
  const { hostname } = url

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw Errors.badRequest('URL not allowed')
  }

  if (PRIVATE_IP_PATTERNS.some((r) => r.test(hostname))) {
    throw Errors.badRequest('URL not allowed')
  }
}

/**
 * Validates a returnUrl/redirect is a safe relative path.
 * Blocks absolute URLs and protocol-relative URLs.
 */
export function assertSafeRedirect(redirect: string): void {
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    throw Errors.badRequest('Redirect URL must be a relative path')
  }
}
