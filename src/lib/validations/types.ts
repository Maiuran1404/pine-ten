/**
 * Standardized result type for API responses
 */
export type ActionResult<T> = { data: T; error: null } | { data: null; error: string }
