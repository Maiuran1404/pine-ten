# Pine Ten (Crafted)

AI-powered interior design marketplace connecting clients with freelance designers. Clients describe projects via a chat-driven creative briefing flow; freelancers receive matched tasks and deliver designs.

## Stack

Next.js 16 (App Router), TypeScript strict, Drizzle ORM, Better Auth, Supabase (storage), Tailwind CSS v4, shadcn/ui, Anthropic AI, Stripe, Resend, Vitest

## Commands

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Start dev server            |
| `npm run build`       | Production build            |
| `npm run test`        | Run tests (Vitest)          |
| `npm run lint`        | ESLint                      |
| `npm run typecheck`   | `npx tsc --noEmit`          |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate`  | Apply migrations            |
| `npm run db:push`     | Push schema to DB           |
| `npm run validate`    | lint + typecheck + test     |

## Architecture

```
src/
  app/              # Next.js App Router — (admin), (auth), (client), (freelancer) route groups
    api/            # API routes (withErrorHandling pattern)
  components/       # React components (shadcn/ui based)
  db/               # Drizzle schema, migrations, seeds
    schema.ts       # All tables and relations
  hooks/            # Custom React hooks
  lib/              # Utilities, AI, validations, auth
    validations/    # Zod schemas (types.ts has ActionResult<T>)
    errors.ts       # withErrorHandling, APIError, Errors helpers
    env.ts          # Env validation (add new vars here)
    auth.ts         # Better Auth config
  test/             # Test utilities, mocks, factories
```

## Code Patterns

### API Routes

All API routes use `withErrorHandling` from `src/lib/errors.ts`:

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

### Error Helpers

`Errors.unauthorized()`, `Errors.notFound("Task")`, `Errors.badRequest("msg")`, `Errors.insufficientCredits(required, available)`, `Errors.rateLimited(retryAfter)`

### ActionResult<T>

Server actions return: `{ data: T; error: null } | { data: null; error: string }`

## Forbidden Patterns

- **NEVER** use `any` or `@ts-ignore` — fix the types properly
- **NEVER** write raw SQL that modifies schema — use Drizzle migrations
- **NEVER** run seed scripts without explicit user permission (377 deliverable style references were lost)
- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- **NEVER** skip Zod validation in API routes
- **NEVER** use default exports (except pages/layouts)
- **NEVER** hardcode credentials or database URLs

## Database

- **ORM**: Drizzle — schema in `src/db/schema.ts`
- Key tables: users, companies, tasks, briefs, taskCategories, freelancerProfiles, creditTransactions, deliverableStyles, brandReferences
- Roles: CLIENT, FREELANCER, ADMIN

### Migration Workflow

1. Edit `src/db/schema.ts`
2. `npm run db:generate` — creates migration SQL
3. Review the generated migration (check for accidental DROP statements)
4. `npm run db:migrate` — apply migration
5. `npm run typecheck` — verify no type breakage

Use the `db-migration` agent for guided workflows.

## Testing

- Vitest + Testing Library, co-located: `foo.ts` → `foo.test.ts`
- Every new API route and Zod schema needs tests
- Mock Supabase: `createMockSupabaseClient` from `src/test/mocks/supabase.ts`
- Factories: `src/test/factories.ts`

## Commits & PRs

Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

```
feat: add credit purchase flow
fix: prevent duplicate task assignment
refactor: extract brief validation into shared schema
```

PR titles follow the same format. Keep commits atomic — one logical change per commit.

## Code Style

- **TypeScript strict** — named exports, `server-only` import for server modules
- **Zod validation first** in every API route
- **kebab-case** file names, `@/` path alias maps to `src/`
- Auth via Better Auth (not Supabase Auth) — see `src/lib/auth.ts`
- New env vars must be added to `src/lib/env.ts`
- Rate limiting via `checkRateLimit`, CSRF on mutations

## Planning Requirements

IMPORTANT: ALWAYS use EnterPlanMode before implementing any task that:

- Touches more than 1 file
- Adds new functionality or features
- Modifies existing behavior or refactors code
- Involves database schema changes
- Has unclear or ambiguous requirements

Only skip planning for trivial single-line fixes (typos, obvious bugs, small tweaks). When in doubt, plan first — never jump straight to implementation.

## Agents & Commands

| Agent              | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `code-reviewer`    | PR review against project conventions          |
| `security-auditor` | Auth, secrets, input validation audits         |
| `test-writer`      | Generate co-located Vitest tests               |
| `db-migration`     | Safe schema → generate → review → migrate flow |
| `refactor`         | DRY refactoring with project conventions       |
| `perf-analyzer`    | Performance audit — config/infra only, no code |

| Command        | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `/review`      | Review staged changes                          |
| `/deep-review` | Deep review with security + perf analysis      |
| `/validate`    | Run full validation suite with summary         |
| `/fix-types`   | Find and fix TypeScript errors                 |
| `/perf-audit`  | Run performance audit (config & infra focused) |

## Multi-Fix Workflow

When fixing multiple bugs or issues in a session, **always test, commit, and push between each fix**. Never batch unrelated fixes into a single commit. This ensures:

- Each fix is isolated and revertable
- Broken fixes don't block other changes
- Git history stays clean and bisectable

## Sub-Agent Dispatch Rules

- **Parallel**: independent file reads, linting + typechecking, test runs across modules
- **Sequential**: schema change → migration → seed, API route → validation schema → test
