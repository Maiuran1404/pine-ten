# Crafted (Pine Ten)

Professional design services platform connecting clients with freelance designers. Clients submit design tasks through an AI-powered chat interface, and the platform automatically matches them with the best-fit freelancer using a scoring algorithm.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-green)](https://orm.drizzle.team/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-v1-orange)](https://www.better-auth.com/)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Drizzle ORM (hosted on Supabase)
- **Auth:** Better Auth (email/password + Google OAuth)
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Payments:** Stripe (checkout + Connect for artist payouts)
- **AI:** Anthropic Claude (chat-based task intake)
- **Email:** Resend
- **Messaging:** Twilio (WhatsApp), Slack
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **State:** TanStack React Query
- **Deployment:** Vercel

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd pine-ten

# Install dependencies (requires pnpm)
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values in .env.local

# Push database schema
pnpm db:push

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/                    # Next.js App Router pages and API routes
    (admin)/              # Admin dashboard route group
    (auth)/               # Auth pages (login, signup, etc.)
    (client)/             # Client dashboard route group
    (freelancer)/         # Freelancer portal route group
    api/                  # API routes (tasks, auth, chat, brand, etc.)
  components/             # React components
    ui/                   # shadcn/ui primitives
    shared/               # Shared components across route groups
    admin/                # Admin-specific components
    chat/                 # AI chat interface components
    onboarding/           # Onboarding flow components
    dashboard/            # Dashboard components
    freelancer/           # Freelancer portal components
  db/                     # Database layer
    schema.ts             # Drizzle ORM schema (all tables, enums, relations)
    index.ts              # Database client, connection pool, withTransaction
    migrations/           # Generated Drizzle migrations
  hooks/                  # Custom React hooks
  lib/                    # Shared utilities and business logic
    ai/                   # Claude AI integration (chat, prompts)
    validations/          # Zod schemas for API request validation
    errors.ts             # Error handling (APIError, withErrorHandling, Errors)
    auth.ts               # Better Auth server configuration
    auth-client.ts        # Better Auth client (useSession, signIn, signOut)
    require-auth.ts       # Auth guards (requireAuth, requireRole, requireAdmin)
    config.ts             # App configuration constants
    env.ts                # Environment variable validation (Zod)
    rate-limit.ts         # In-memory rate limiter
    stripe.ts             # Stripe checkout integration
    stripe-connect.ts     # Stripe Connect (artist payouts)
    assignment-algorithm.ts  # Freelancer matching/scoring algorithm
    notifications/        # Email, WhatsApp, Slack notification senders
    slack/                # Slack bot integration
  test/                   # Test infrastructure
    setup.tsx             # Vitest global setup (mocks for Next.js, DOM APIs)
    factories.ts          # Mock data factories (createMockUser, etc.)
    utils.ts              # Test helpers (renderWithProviders, createMockSupabaseClient)
    mocks/                # Module mocks (Supabase client)
  types/                  # TypeScript type definitions
```

## Available Scripts

| Script               | Description                             |
| -------------------- | --------------------------------------- |
| `pnpm dev`           | Start development server                |
| `pnpm build`         | Production build                        |
| `pnpm start`         | Start production server                 |
| `pnpm lint`          | Run ESLint                              |
| `pnpm lint:fix`      | Run ESLint with auto-fix                |
| `pnpm typecheck`     | TypeScript type checking (no emit)      |
| `pnpm test`          | Run unit/integration tests (Vitest)     |
| `pnpm test:watch`    | Run tests in watch mode                 |
| `pnpm test:coverage` | Run tests with coverage report          |
| `pnpm test:e2e`      | Run end-to-end tests (Playwright)       |
| `pnpm db:generate`   | Generate Drizzle migrations from schema |
| `pnpm db:migrate`    | Apply pending migrations                |
| `pnpm db:push`       | Push schema changes directly (dev only) |
| `pnpm db:studio`     | Open Drizzle Studio (database GUI)      |
| `pnpm validate`      | Run lint + typecheck + tests            |

## Architecture Overview

### Route Groups

The app uses Next.js route groups to separate concerns:

- **(admin)** -- Admin dashboard for managing freelancers, tasks, settings, brand references, and security
- **(auth)** -- Login, signup, password reset, role selection
- **(client)** -- Client dashboard with AI chat for task creation, task tracking, brand management
- **(freelancer)** -- Freelancer portal for viewing assigned tasks, submitting deliverables

### API Pattern

All API routes follow a consistent pattern:

1. Rate limiting via `checkRateLimit()`
2. Wrap handler in `withErrorHandling()` for consistent error responses
3. Auth check via `auth.api.getSession()` or `requireAuth()`/`requireRole()`
4. Request validation with Zod schemas from `src/lib/validations/`
5. Business logic with Drizzle ORM queries
6. Return via `successResponse()` or throw from `Errors.*`

### Key Patterns

- **ActionResult<T>** -- Standardized result type: `{ data: T; error: null } | { data: null; error: string }`
- **withErrorHandling** -- Wraps async handlers to catch ZodError, APIError, and unknown errors
- **Errors.\*** -- Shorthand error factories (`Errors.unauthorized()`, `Errors.notFound()`, etc.)
- **withTransaction** -- Database transaction wrapper with automatic rollback

### Authentication Flow

Better Auth handles sessions with email/password and Google OAuth. Sessions last 7 days with daily refresh. Cookies are shared across subdomains in production (app, artist, superadmin subdomains). Auth guards (`requireAuth`, `requireRole`, `requireAdmin`, etc.) protect API routes.

### Assignment Algorithm

When a client creates a task, the system scores available freelancers based on skill match, timezone fit, experience level, workload balance, and performance history. Weights are admin-configurable. Falls back to any approved freelancer if no scored match is found.

## Deployment

The app is deployed on Vercel with the following subdomain structure:

- `app.getcrafted.ai` -- Client-facing application
- `artist.getcrafted.ai` -- Freelancer portal
- `superadmin.getcrafted.ai` -- Admin dashboard

Database is hosted on Supabase (PostgreSQL). File storage uses Supabase Storage. Stripe handles payments and artist payouts via Stripe Connect.

## Contributing

1. Create a feature branch from `main`
2. Run `pnpm validate` before committing (lint + typecheck + tests)
3. Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier automatically
4. Follow existing code patterns -- use `withErrorHandling`, Zod validation, and `ActionResult`
5. Write tests for new validation schemas and API routes

## Agent Documentation

Detailed documentation for AI coding agents is available in the `agent_docs/` directory:

- [Architecture](agent_docs/architecture.md) -- Folder structure, data flow, auth, key patterns
- [Database Schema](agent_docs/database-schema.md) -- Tables, enums, relations, Drizzle patterns
- [API Patterns](agent_docs/api-patterns.md) -- Route creation, validation, error handling
- [Testing Guide](agent_docs/testing-guide.md) -- Vitest setup, mocking, test factories, E2E
