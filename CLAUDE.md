# Pine Ten (Crafted) — Interior Design Platform

## Stack

Next.js 16 (App Router), TypeScript strict, Drizzle ORM, Better Auth, Supabase (storage), Tailwind CSS v4, shadcn/ui, Anthropic AI, Stripe, Resend, Vitest

## Commands

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Start dev server            |
| `npm run build`       | Production build            |
| `npm run test`        | Run tests (Vitest)          |
| `npm run test:watch`  | Watch mode tests            |
| `npm run lint`        | ESLint                      |
| `npm run typecheck`   | `npx tsc --noEmit`          |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate`  | Apply migrations            |
| `npm run db:push`     | Push schema to DB           |
| `npm run validate`    | lint + typecheck + test     |

## Architecture

```
src/
  app/              # Next.js App Router
    (admin)/        # Admin route group
    (auth)/         # Auth route group
    (client)/       # Client route group
    (freelancer)/   # Freelancer route group
    api/            # API routes (withErrorHandling pattern)
  components/       # React components (shadcn/ui based)
  db/               # Drizzle schema, migrations, seeds
    schema.ts       # All tables and relations
    migrations/     # SQL migration files
  hooks/            # Custom React hooks
  lib/              # Utilities, AI, validations, auth
    validations/    # Zod schemas (types.ts has ActionResult<T>)
    errors.ts       # withErrorHandling, APIError, Errors helpers
    env.ts          # Env validation (add new vars here)
    auth.ts         # Better Auth config
    rate-limit.ts   # Rate limiting
  test/             # Test utilities, mocks, factories
    mocks/supabase.ts  # Supabase mock client
  types/            # Shared TypeScript types
```

## Code Patterns

### API Routes

All API routes use `withErrorHandling` from `src/lib/errors.ts`:

```typescript
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { someSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = someSchema.parse(await request.json()) // Zod validation first
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw Errors.unauthorized()
    // ... business logic
    return successResponse(data, 201)
  })
}
```

### ActionResult<T>

For client-side server action returns: `type ActionResult<T> = { data: T; error: null } | { data: null; error: string }`

### Error Helpers

`Errors.unauthorized()`, `Errors.notFound("Task")`, `Errors.badRequest("msg")`, `Errors.insufficientCredits(required, available)`, `Errors.rateLimited(retryAfter)`

## Code Style

- **TypeScript strict** — no `any`, no `@ts-ignore`
- **Named exports** everywhere (except default exports for pages/layouts)
- **`server-only`** import for server modules
- **Zod validation first** in every API route before any logic
- **kebab-case** file names
- **Path alias**: `@/` maps to `src/`

## Testing

- **Framework**: Vitest + Testing Library
- Every new API route needs a test
- Every new Zod schema needs a test
- Mock Supabase with `createMockSupabaseClient` from `src/test/mocks/supabase.ts`
- Mock helpers in `src/test/utils.ts` (renderWithProviders, createMockNextRequest)
- Factories in `src/test/factories.ts`
- Co-locate tests: `src/lib/errors.test.ts` next to `src/lib/errors.ts`

## Database

- **ORM**: Drizzle — schema in `src/db/schema.ts`
- **NEVER** write raw SQL that modifies schema — use Drizzle migrations
- **NEVER** run seed scripts without explicit user permission
- 377 deliverable style references were lost by running a seed script without permission
- Key tables: users, companies, tasks, briefs, taskCategories, freelancerProfiles, creditTransactions, deliverableStyles, brandReferences
- Roles: CLIENT, FREELANCER, ADMIN

## Gotchas

- Supabase admin client uses service role key — NEVER expose in client code
- Environment variables validated in `src/lib/env.ts` — add new vars there
- Rate limiting configured in middleware and per-route via `checkRateLimit`
- Auth via Better Auth (not Supabase Auth) — see `src/lib/auth.ts`
- CSRF protection on mutation routes via `src/app/api/csrf/route.ts`

## Sub-Agent Dispatch Rules

- **Parallel**: independent file reads, linting + typechecking, test runs across modules
- **Sequential**: schema change -> migration -> seed, API route -> validation schema -> test
- Use `code-reviewer` agent for PR reviews
- Use `security-auditor` agent for auth/RLS/env audits
- Use `test-writer` agent for generating test files
