# Crafted (Pine Ten)

AI-powered creative design marketplace connecting clients with freelance designers. Clients describe projects through an AI-driven creative briefing flow, and the platform automatically matches them with the best-fit freelancer using a scoring algorithm. Freelancers deliver work through a structured review pipeline, and admins oversee the entire lifecycle.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-green)](https://orm.drizzle.team/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-v1-orange)](https://www.better-auth.com/)

## Tech Stack

| Category      | Technology                                                            |
| ------------- | --------------------------------------------------------------------- |
| Framework     | Next.js 16.0.10 (App Router), React 19                                |
| Language      | TypeScript (strict mode)                                              |
| Database      | PostgreSQL via Drizzle ORM 0.45 (hosted on Supabase)                  |
| Auth          | Better Auth (email/password + Google OAuth)                           |
| Styling       | Tailwind CSS v4, shadcn/ui (Radix UI), Framer Motion                  |
| Forms         | React Hook Form + Zod                                                 |
| Payments      | Stripe (Checkout + Connect for artist payouts)                        |
| AI            | Anthropic Claude (briefing chat), Google Gemini, FAL/Flux (image gen) |
| Email         | Resend (transactional email with queue system)                        |
| Messaging     | Twilio (WhatsApp), Slack (bot + notifications)                        |
| Storage       | Supabase Storage (task files, deliverables, attachments)              |
| Analytics     | PostHog (event tracking), Vercel Analytics & Speed Insights           |
| Monitoring    | Sentry (error tracking + profiling)                                   |
| Rate Limiting | Upstash Redis                                                         |
| Testing       | Vitest (unit/integration), Playwright (E2E)                           |
| State         | TanStack React Query v5                                               |
| Deployment    | Vercel                                                                |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd pine-ten

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values in .env.local

# Push database schema
pnpm db:push

# Start the development server
pnpm dev
```

Dev URLs use subdomain routing:

- `app.localhost:3000` -- Client dashboard
- `artist.localhost:3000` -- Freelancer portal
- `superadmin.localhost:3000` -- Admin dashboard

## Project Structure

```
src/
  app/                        # Next.js App Router
    (admin)/                  #   Admin dashboard (33 pages)
    (auth)/                   #   Auth pages (login, register, onboarding, early-access)
    (client)/                 #   Client dashboard (chat, tasks, designs, brand)
    (freelancer)/             #   Freelancer portal (board, tasks, payouts, settings)
    api/                      #   147 API route handlers
  components/                 # 241 React components (16 component groups)
    ui/                       #   shadcn/ui primitives (Radix-based)
    chat/                     #   AI briefing interface (61 files)
    admin/                    #   Admin dashboards & management
    freelancer/               #   Freelancer portal components
    client/                   #   Client-specific UI
    onboarding/               #   Registration & onboarding flow
    dashboard/                #   Dashboard layouts
    shared/                   #   Cross-portal shared components
    task-detail/              #   Task viewing & editing
    task-launch/              #   Task submission modal
    tasks/                    #   Task list & management
    creative-intake/          #   Structured creative brief
    website-flow/             #   Website design flow
    linear-board/             #   Kanban board interface
    pitch-deck/               #   Presentation generator
    settings/                 #   User settings panels
  db/                         # Database layer
    schema.ts                 #   Drizzle schema (56 tables, 35 enums)
    index.ts                  #   Connection pool, withTransaction
    migrations/               #   Generated Drizzle migrations
    seed-*.ts                 #   Seed scripts (styles, skills, visual presets)
  hooks/                      # 36 custom React hooks
  lib/                        # Shared utilities & business logic
    adapters/                 #   External API adapters
    ai/                       #   AI integration (91 files)
      chat.ts                 #     Claude briefing system prompt
      extractors/             #     Structured data extractors
      image/                  #     Image gen providers (FAL, Flux, Imagen, Gemini)
      scrapers/               #     Image search (Behance, Dribbble, Pexels, etc.)
    constants/                #   Application constants
    creative-intake/          #   Briefing flow logic
    hooks/                    #   Utility hooks
    image/                    #   Image processing utilities
    notifications/            #   Email (Resend), WhatsApp (Twilio), queue system
    scrapers/                 #   Web scraping utilities
    slack/                    #   Slack bot, channels, block builders
    supabase/                 #   Supabase clients (browser + server)
    utils/                    #   General utilities
    validations/              #   Zod schemas for API validation
    website/                  #   Website design engine
    pitch-deck/               #   Pitch deck PDF generation
    storyboard-pdf/           #   Storyboard PDF export
    errors.ts                 #   Error handling (APIError, withErrorHandling)
    auth.ts                   #   Better Auth server config
    auth-client.ts            #   Better Auth client (useSession, signIn)
    require-auth.ts           #   Auth guards (requireAuth, requireRole, requireAdmin)
    assignment-algorithm.ts   #   Freelancer matching & scoring
    stripe.ts                 #   Stripe Checkout integration
    stripe-connect.ts         #   Stripe Connect (artist payouts)
    rate-limit.ts             #   Upstash Redis rate limiter
    env.ts                    #   Environment variable validation (Zod)
    audit.ts                  #   Activity audit logging
    cache.ts                  #   Caching utilities
    logger.ts                 #   Structured logging (Pino)
    storage.ts                #   Supabase Storage helpers
    posthog.ts                #   PostHog analytics client
  providers/                  # Context providers
    query-provider.tsx        #   React Query
    csrf-provider.tsx         #   CSRF token management
    posthog-provider.tsx      #   PostHog analytics
    credit-provider.tsx       #   Credit balance context
    sentry-provider.tsx       #   Sentry error tracking
  test/                       # Test infrastructure
    setup.tsx                 #   Vitest global setup
    factories.ts              #   Mock data factories
    utils.ts                  #   Test helpers (renderWithProviders)
    mocks/                    #   Module mocks (Supabase, etc.)
  types/                      # TypeScript type definitions
  fonts/                      # Custom fonts (Satoshi, Geist)
```

## Available Scripts

| Script                        | Description                             |
| ----------------------------- | --------------------------------------- |
| `pnpm dev`                    | Start development server                |
| `pnpm dev:clean`              | Clean start (clear .next cache)         |
| `pnpm build`                  | Production build                        |
| `pnpm start`                  | Start production server                 |
| `pnpm lint`                   | Run ESLint                              |
| `pnpm lint:fix`               | Run ESLint with auto-fix                |
| `pnpm typecheck`              | TypeScript type checking (no emit)      |
| `pnpm test`                   | Run unit/integration tests (Vitest)     |
| `pnpm test:watch`             | Run tests in watch mode                 |
| `pnpm test:coverage`          | Run tests with coverage report          |
| `pnpm test:ui`                | Open Vitest UI                          |
| `pnpm test:e2e`               | Run end-to-end tests (Playwright)       |
| `pnpm test:e2e:ui`            | Run E2E tests with Playwright UI        |
| `pnpm test:e2e:headed`        | Run E2E tests in headed browser mode    |
| `pnpm db:generate`            | Generate Drizzle migrations from schema |
| `pnpm db:migrate`             | Apply pending migrations                |
| `pnpm db:push`                | Push schema changes directly (dev only) |
| `pnpm db:studio`              | Open Drizzle Studio (database GUI)      |
| `pnpm db:seed`                | Run main database seed                  |
| `pnpm db:seed:styles`         | Seed deliverable style references       |
| `pnpm db:seed:skills`         | Seed freelancer skills                  |
| `pnpm db:seed:visual-presets` | Seed visual presets                     |
| `pnpm db:apply-rls`           | Apply row-level security policies       |
| `pnpm validate`               | Run lint + typecheck + tests            |

## Architecture

### Subdomain Routing

| Subdomain                  | Route Group    | Role Required | Purpose                        |
| -------------------------- | -------------- | ------------- | ------------------------------ |
| `app.getcrafted.ai`        | `(client)`     | CLIENT        | Task creation, tracking, brand |
| `artist.getcrafted.ai`     | `(freelancer)` | FREELANCER    | Task delivery, payouts         |
| `superadmin.getcrafted.ai` | `(admin)`      | ADMIN         | Full platform management       |

### Auth (Defense-in-Depth, 3 layers)

1. **Middleware** -- Edge-level session cookie check + rate limiting (20/min auth, 100/min API)
2. **Layouts** -- Client-side `useEffect` role checks with redirects (gated on hydration)
3. **API Routes** -- Server-side guards: `requireAuth()`, `requireRole()`, `requireAdmin()`, `requireFreelancer()`, `requireClient()`, `requireOwnerOrAdmin()`, `requireApprovedFreelancer()`

Better Auth handles sessions with email/password and Google OAuth. Sessions last 7 days with daily refresh. Cookies are shared across subdomains in production.

### API Pattern

All 147 API routes follow a consistent pattern:

```typescript
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = someSchema.parse(await request.json())
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw Errors.unauthorized()
    return successResponse(data, 201)
  })
}
```

Key patterns: `withErrorHandling` (error wrapper), `Errors.*` (error factories), `ActionResult<T>` (server action return type), `withTransaction` (DB transaction wrapper).

### AI-Powered Briefing Flow

The core product flow is a Claude-driven creative intake with an 11-stage state machine:

```
EXTRACT -> TASK_TYPE -> INTENT -> INSPIRATION -> STRUCTURE -> ELABORATE
  -> STRATEGIC_REVIEW -> MOODBOARD -> REVIEW -> DEEPEN -> SUBMIT
```

Hook composition architecture:

```
ChatInterface (render layer)
  -> useChatInterfaceData (facade hook)
       |-- useChatMessages          # message history + streaming
       |-- useBriefingStateMachine  # 11-stage state machine
       |-- useBrief                 # brief panel state
       |-- useMoodboard            # visual reference collection
       |-- useStyleSelection       # design style picker
       |-- useTaskSubmission       # task creation + credits
       |-- useFileUpload           # drag-drop attachments
       |-- useSmartCompletion      # predictive text (~60 regex patterns)
       |-- useStoryboard           # video/content scene structure
       '-- useDraftPersistence     # localStorage + server sync
```

Claude is configured as a "senior creative director" that makes proactive recommendations and outputs structured markers for UI components.

### Task Lifecycle

```
PENDING -> OFFERED -> ASSIGNED -> IN_PROGRESS -> PENDING_ADMIN_REVIEW -> IN_REVIEW -> COMPLETED
                                              \-> REVISION_REQUESTED -/           \-> CANCELLED
                                                                                   \-> UNASSIGNABLE
```

### Freelancer Matching

When a client creates a task, the system scores available freelancers based on skill match, timezone fit, experience level, workload balance, and performance history. Weights are admin-configurable. Falls back to any approved freelancer if no scored match is found.

### Credit System

- `users.credits` -- integer balance
- `creditTransactions` -- tracks PURCHASE / USAGE / REFUND / BONUS
- Pricing varies by deliverable type: Social (15), Video (30), Logo (40), Branding (60), adjusted for quantity, animation, multi-platform, and urgency

## Key Features

- **AI Creative Briefing** -- Claude-driven 11-stage intake with smart completions and quick options
- **Freelancer Matching** -- Scoring algorithm (skills, timezone, workload, performance)
- **Storyboard Builder** -- Scene-based video planning with PDF export
- **Website Design Flow** -- Skeleton generation, similarity engine, fidelity levels
- **Moodboard & Style DNA** -- Visual reference collection and design style profiling
- **Kanban Board** -- Drag-and-drop task management for freelancers
- **Image Generation Pipeline** -- Multiple AI providers (FAL, Flux, Imagen, Gemini) with fallbacks
- **Image Search** -- Aggregated search across Behance, Dribbble, Pexels, and 7+ sources
- **Brand Extraction** -- Automated brand asset extraction via Firecrawl
- **Credit System** -- Task-based pricing with transaction tracking
- **Stripe Connect** -- Artist payouts via connected accounts
- **Multi-Channel Notifications** -- Email (Resend), WhatsApp (Twilio), Slack
- **Admin Tools** -- 33 management pages for tasks, freelancers, security, and configuration
- **Pitch Deck Generator** -- AI-generated presentation PDFs
- **PDF Exports** -- Storyboards, pitch decks, deliverable summaries
- **Analytics** -- PostHog event tracking (50+ events), Vercel Analytics, Sentry error monitoring
- **Security** -- CSRF protection, rate limiting, RLS policies, CSP headers, automated security audit framework

## Database

PostgreSQL via Drizzle ORM with 56 tables and 35 custom enums. Key domains:

- **Users & Auth** -- users, sessions, accounts, companies, freelancerProfiles, artistSkills
- **Tasks** -- tasks, taskFiles, taskMessages, taskOffers, taskActivityLog, taskCategories
- **Design** -- styleReferences, brandReferences, deliverableStyleReferences, skills
- **Billing** -- creditTransactions, payouts, stripeConnectAccounts, subscriptions
- **Content** -- contentTemplates, contentBatches, contentItems, websiteProjects
- **Admin** -- assignmentAlgorithmConfig, platformSettings, auditLogs, securityTests

### Migration Workflow

```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration
pnpm db:generate
# 3. Review the generated SQL (check for accidental DROPs)
# 4. Apply migration
pnpm db:migrate
# 5. Verify types
pnpm typecheck
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. 42 configuration variables across these groups:

| Group         | Variables                                                          |
| ------------- | ------------------------------------------------------------------ |
| Core          | `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_DOMAIN`   |
| Supabase      | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`            |
| Auth          | `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   |
| Payments      | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                       |
| AI            | `ANTHROPIC_API_KEY`, `FAL_KEY`, `GEMINI_API_KEY`, `ORSHOT_API_KEY` |
| Email         | `RESEND_API_KEY`, `ADMIN_EMAIL`                                    |
| WhatsApp      | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`                          |
| Analytics     | `POSTHOG_KEY`, `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`       |
| Rate Limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`               |
| Web Scraping  | `FIRECRAWL_API_KEY`                                                |
| Logging       | `LOG_LEVEL`                                                        |
| Slack         | Bot credentials + channel IDs (7 vars, see `.env.example`)         |

## Deployment

Deployed on Vercel with subdomain routing:

- `app.getcrafted.ai` -- Client application
- `artist.getcrafted.ai` -- Freelancer portal
- `superadmin.getcrafted.ai` -- Admin dashboard

Database hosted on Supabase (PostgreSQL). File storage via Supabase Storage. Payments via Stripe + Stripe Connect. Error monitoring via Sentry. Analytics via PostHog + Vercel Analytics.

### Infrastructure Highlights

- Security headers (CSP, HSTS, X-Frame-Options) configured in `next.config.ts`
- PostHog reverse proxy for ad blocker bypass
- 50MB request body size limit for file uploads
- Optimized package imports for 17+ libraries

## Contributing

1. Create a feature branch from `main`
2. Follow conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
3. Run `pnpm validate` before committing (lint + typecheck + tests)
4. Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier automatically
5. Follow existing code patterns -- use `withErrorHandling`, Zod validation, `csrfFetch()` for mutations
6. Write tests for new API routes and Zod schemas

## Agent Documentation

Detailed documentation for AI coding agents is available in the `agent_docs/` directory:

- [Architecture](agent_docs/architecture.md) -- Folder structure, data flow, auth, key patterns
- [Database Schema](agent_docs/database-schema.md) -- Tables, enums, relations, Drizzle patterns
- [API Patterns](agent_docs/api-patterns.md) -- Route creation, validation, error handling
- [Testing Guide](agent_docs/testing-guide.md) -- Vitest setup, mocking, test factories, E2E
