import { redirect } from 'next/navigation'

/**
 * Catch-all route for unknown dashboard sub-routes.
 * Redirects to /dashboard instead of showing a 404.
 * Handles cases like /dashboard/undefined from stale bookmarks or race conditions.
 */
export default function DashboardCatchAllPage() {
  redirect('/dashboard')
}
