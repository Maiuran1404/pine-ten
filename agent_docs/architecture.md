# Architecture

## Overview

Crafted is a Next.js 16 App Router application that connects clients with freelance designers. Clients describe design tasks via an AI-powered chat (Claude), and the platform automatically assigns the best-fit freelancer using a multi-factor scoring algorithm.

The app serves three user roles through subdomain-based route groups:

- **Clients** create tasks, manage brands, purchase credits
- **Freelancers** receive task assignments, submit deliverables
- **Admins** manage users, configure algorithms, monitor security

## Folder Structure

```
pine-ten/
  src/
    app/                          # Next.js App Router
      (admin)/                    # Admin dashboard (superadmin.getcrafted.ai)
      (auth)/                     # Auth pages: login, signup, reset-password, set-role
      (client)/                   # Client dashboard (app.getcrafted.ai)
      (freelancer)/               # Freelancer portal (artist.getcrafted.ai)
      api/                        # API routes (28+ route groups)
        admin/                    # Admin CRUD endpoints
        auth/[...all]/            # Better Auth catch-all handler
        brand/                    # Brand extraction and management
        chat/                     # AI chat streaming endpoint
        drafts/                   # Chat draft persistence
        freelancer/               # Freelancer profile and task actions
        tasks/                    # Task CRUD and lifecycle
        user/                     # User profile and settings
        webhooks/                 # Stripe webhook handlers
        ...
      layout.tsx                  # Root layout with providers
      page.tsx                    # Landing redirect
    components/
      ui/                         # shadcn/ui primitives (40+ components)
      shared/                     # Cross-cutting components
      admin/                      # Admin-specific components
      chat/                       # AI chat interface (20+ components)
      onboarding/                 # Client/freelancer onboarding flows
      dashboard/                  # Dashboard widgets
      freelancer/                 # Freelancer portal components
      creative-intake/            # Creative intake flow components
    db/
      schema.ts                   # Single-file Drizzle schema (all tables)
      index.ts                    # DB client, pool, withTransaction
      migrations/                 # Drizzle-generated SQL migrations
      seed-styles.ts              # Style reference seeder
      seed-skills.ts              # Skills taxonomy seeder
    hooks/
      use-bulk-selection.ts       # Bulk select/deselect for admin tables
      use-csrf.ts                 # CSRF token management
      use-mobile.ts               # Mobile breakpoint detection
      use-notifications.ts        # Real-time notification polling
      use-queries.ts              # TanStack Query hooks for data fetching
      use-subdomain.ts            # Current subdomain detection
    lib/
      ai/                         # Claude AI integration
      validations/                # Zod schemas (index.ts) + types (types.ts)
      errors.ts                   # APIError class, withErrorHandling, Errors helpers
      auth.ts                     # Better Auth server config
      auth-client.ts              # Better Auth client exports
      require-auth.ts             # Auth guard functions
      config.ts                   # App constants (credits, payouts, rate limits)
      env.ts                      # Server-side env validation
      env.client.ts               # Client-side env validation
      rate-limit.ts               # In-memory rate limiter
      stripe.ts                   # Stripe checkout sessions
      stripe-connect.ts           # Stripe Connect for artist payouts
      assignment-algorithm.ts     # Freelancer matching algorithm
      audit.ts                    # Audit logging helpers
      cache.ts                    # Simple in-memory cache
      csrf.ts                     # CSRF token generation/validation
      logger.ts                   # Pino logger instance
      storage.ts                  # Supabase Storage helpers
      notifications/              # Email (Resend), WhatsApp (Twilio), Slack
      slack/                      # Slack bot and channel management
      scrapers/                   # Web scraping for brand/style imports
    test/
      setup.tsx                   # Vitest global setup file
      factories.ts                # Mock data factories
      utils.ts                    # renderWithProviders, createMockSupabaseClient
      mocks/
        supabase.ts               # Full Supabase client mock
    types/
      index.ts                    # Shared TypeScript types
  e2e/                            # Playwright E2E tests
  scripts/                        # Utility scripts (seed, apply-rls)
  vitest.config.mts               # Vitest configuration
  playwright.config.ts            # Playwright configuration
  drizzle.config.ts               # Drizzle Kit configuration
```

## Data Flow

A typical API request follows this pipeline:

```
Client Request
    |
    v
Rate Limiting (checkRateLimit)
    |
    v
withErrorHandling() wrapper
    |
    v
Authentication (auth.api.getSession / requireAuth / requireRole)
    |
    v
Request Validation (Zod schema from src/lib/validations/index.ts)
    |
    v
Business Logic (Drizzle ORM queries, withTransaction for multi-step ops)
    |
    v
Response: successResponse(data) or throw Errors.*
    |
    v
Error Handler catches: ZodError -> 400, APIError -> custom status, unknown -> 500
```

### Example: Task Creation Flow

1. Client composes task via AI chat (`POST /api/chat`)
2. Chat returns structured task proposal with credits estimate
3. Client confirms and submits (`POST /api/tasks`)
4. Server validates with `createTaskSchema.parse(body)`
5. Transaction: check credits, create task, deduct credits, log activity
6. Assignment algorithm scores freelancers and auto-assigns the best match
7. Notifications sent: admin email, admin WhatsApp, freelancer notification, client confirmation
8. Response: `{ taskId, status: "ASSIGNED", assignedTo, matchScore }`

## Authentication Architecture

### Server-Side (src/lib/auth.ts)

Better Auth is configured with:

- **Drizzle adapter** pointing to `users`, `sessions`, `accounts`, `verifications` tables
- **Email/password** with auto sign-in after signup, no email verification required
- **Google OAuth** social provider
- **Session**: 7-day expiry, daily refresh, no cookie cache (ensures fresh data)
- **Cookie**: `crafted` prefix, `lax` same-site, HTTP-only, shared across subdomains via `.getcrafted.ai` domain cookie
- **Rate limiting**: 100 requests/minute built into Better Auth

### Client-Side (src/lib/auth-client.ts)

Exports from Better Auth React client:

- `useSession()` -- React hook for current session
- `signIn`, `signUp`, `signOut` -- Auth actions
- `getSession()` -- Imperative session check
- `isAuthenticated()` -- Boolean check helper
- `clearAuthState()` -- Logout with error recovery

### Auth Guards (src/lib/require-auth.ts)

Used in API routes to enforce authentication and authorization:

```typescript
// Require any authenticated user
const { user } = await requireAuth()

// Require specific role
const { user } = await requireRole('ADMIN', 'FREELANCER')

// Shorthand helpers
await requireAdmin()
await requireFreelancer()
await requireClient()

// Resource ownership check
await requireOwnerOrAdmin(resourceOwnerId)
```

All guards throw `APIError` (caught by `withErrorHandling`) on failure.

### Cross-Subdomain Auth

In production, cookies are set on `.getcrafted.ai` so sessions work across:

- `app.getcrafted.ai` (clients)
- `artist.getcrafted.ai` (freelancers)
- `superadmin.getcrafted.ai` (admins)

OAuth callbacks always go through the canonical `app.getcrafted.ai` domain.

## Key Patterns

### ActionResult

Defined in `src/lib/validations/types.ts`:

```typescript
type ActionResult<T> = { data: T; error: null } | { data: null; error: string }
```

Used for type-safe success/error handling in server actions and API responses.

### withErrorHandling

Defined in `src/lib/errors.ts`. Wraps API route handlers to provide consistent error responses:

```typescript
export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      // ... business logic
      return successResponse(data)
    },
    { endpoint: 'GET /api/example' }
  )
}
```

Catches and formats:

- `ZodError` -> 400 with field-level details
- `APIError` -> custom status code with error code
- Unknown errors -> 500 (with message in dev, generic in prod)

### Errors Shorthand

Factory functions for common error types:

```typescript
Errors.unauthorized() // 401
Errors.forbidden() // 403
Errors.notFound('Task') // 404
Errors.badRequest('Invalid data') // 400
Errors.conflict('Already exists') // 409
Errors.insufficientCredits(10, 5) // 400 with details
Errors.rateLimited(60) // 429
Errors.internal() // 500
```

### ErrorCodes

Structured error codes for client-side handling:

- `AUTH_001` through `AUTH_004` -- Authentication errors
- `VAL_001` through `VAL_003` -- Validation errors
- `RES_001` through `RES_003` -- Resource errors
- `BIZ_001` through `BIZ_005` -- Business logic errors
- `PAY_001` through `PAY_003` -- Payment errors
- `SEC_001`, `SEC_002` -- Security/CSRF errors
- `SRV_001` through `SRV_004` -- Server errors

### withTransaction

Defined in `src/db/index.ts`. Wraps multiple database operations in a PostgreSQL transaction:

```typescript
const result = await withTransaction(async (tx) => {
  await tx.insert(users).values({ ... });
  await tx.update(accounts).set({ ... });
  return result;
});
```

### Environment Validation

`src/lib/env.ts` validates all environment variables at startup using Zod. The `getEnv()` function returns a cached, validated env object. Use `getEnvSafe(key)` for optional env vars that should not throw.

### Rate Limiting

`src/lib/rate-limit.ts` provides an in-memory rate limiter with configurable windows:

- API: 100 req/min
- Auth: 20 req/min
- Chat: 30 req/min

Rate limit key is derived from session cookie or IP address.

## Provider Hierarchy

The root layout (`src/app/layout.tsx`) wraps the app in these providers:

```
ThemeProvider (next-themes, dark default)
  QueryProvider (TanStack React Query)
    CsrfProvider (CSRF token for mutations)
      {children}
      Toaster (sonner notifications)
```

## Assignment Algorithm

Located in `src/lib/assignment-algorithm.ts`. When a task is created:

1. **Detect complexity** from estimated hours, skill count, and description length
2. **Detect urgency** from deadline proximity
3. **Score all approved freelancers** across five dimensions:
   - Skill match (35% default weight)
   - Timezone fit (20%)
   - Experience match (20%)
   - Workload balance (15%)
   - Performance history (10%)
4. **Exclude** freelancers who fail hard rules (overloaded, on vacation, night hours for urgent tasks)
5. **Rank** and assign the top scorer
6. **Fallback** to any approved freelancer if no scored match exists

All weights and thresholds are stored in the `assignment_algorithm_config` table and editable by admins.

## External Integrations

| Service          | Purpose                                     | Config Location                                  |
| ---------------- | ------------------------------------------- | ------------------------------------------------ |
| Supabase         | PostgreSQL database + file storage          | `src/db/index.ts`, `src/lib/storage.ts`          |
| Stripe           | Credit purchases + artist payouts (Connect) | `src/lib/stripe.ts`, `src/lib/stripe-connect.ts` |
| Anthropic Claude | AI chat for task intake                     | `src/lib/ai/`                                    |
| Resend           | Transactional email                         | `src/lib/notifications/email.ts`                 |
| Twilio           | WhatsApp notifications                      | `src/lib/notifications/`                         |
| Slack            | Team notifications, client channels         | `src/lib/slack/`                                 |
| Google OAuth     | Social login                                | `src/lib/auth.ts`                                |
| Vercel           | Hosting, analytics, speed insights          | `layout.tsx`                                     |
| Firecrawl        | Web scraping for brand extraction           | `src/lib/scrapers/`                              |
| Orshot           | Template-based design generation            | `src/lib/orshot.ts`                              |
