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
    chat/           # Chat interface — briefing flow, storyboard, unified panel
    admin/          # Admin-specific components (sidebar, task cards)
    freelancer/     # Freelancer-specific components (sidebar)
  db/               # Drizzle schema, migrations, seeds
    schema.ts       # All tables and relations
  hooks/            # Custom React hooks (queries, chat, briefing, uploads)
  lib/              # Utilities, AI, validations, auth
    supabase/       # Supabase clients (browser + server admin)
    validations/    # Zod schemas (types.ts has ActionResult<T>)
    errors.ts       # withErrorHandling, APIError, Errors helpers
    env.ts          # Env validation (add new vars here)
    auth.ts         # Better Auth config
  providers/        # QueryProvider (React Query), CsrfProvider
  test/             # Test utilities, mocks, factories
```

## Domain Model

### Task Lifecycle

```
PENDING → OFFERED → ASSIGNED → IN_PROGRESS → PENDING_ADMIN_REVIEW → IN_REVIEW → COMPLETED
                                           ↘ REVISION_REQUESTED ↗          ↘ CANCELLED
                                                                            ↘ UNASSIGNABLE
```

- Complexity: SIMPLE / INTERMEDIATE / ADVANCED / EXPERT
- Urgency: CRITICAL / URGENT / STANDARD / FLEXIBLE
- Tasks track max revisions, deadlines, credits used, moodboard references

### Brief Lifecycle

```
DRAFT → READY → SUBMITTED → IN_PROGRESS → COMPLETED
```

Briefs are the structured output of the chat-driven creative intake. Fields: taskSummary, topic, platform, contentType, intent, taskType, audience, visualDirection, contentOutline, brandContext. Tracks completionPercentage.

### Credits

- `users.credits` — integer balance
- `creditTransactions` — tracks PURCHASE / USAGE / REFUND / BONUS with related task + Stripe payment ID
- `taskCategories.baseCredits` — baseline rate per category
- Credit matrix in `chat-interface.utils.ts`: Social 15, Video 30, Logo 40, Branding 60 (adjusted for quantity, animation, multi-platform, urgency)

### Roles

- **CLIENT** — creates briefs via chat, pays credits, reviews deliverables
- **FREELANCER** — receives task offers (match score + escalation), delivers work, gets payouts
- **ADMIN** — manages tasks, reviews deliverables, accesses all portals

## Route Groups & Auth

### Subdomain Routing

| Subdomain                  | Route Group    | Role Required |
| -------------------------- | -------------- | ------------- |
| `app.getcrafted.ai`        | `(client)`     | CLIENT        |
| `artist.getcrafted.ai`     | `(freelancer)` | FREELANCER    |
| `superadmin.getcrafted.ai` | `(admin)`      | ADMIN         |

Dev: `app.localhost:3000`, `artist.localhost:3000`, `superadmin.localhost:3000`

### Auth Defense-in-Depth (3 layers)

1. **Middleware** (`src/middleware.ts`) — Edge-level session cookie check + rate limiting (20/min auth, 100/min API). No DB access — role enforcement is NOT here.
2. **Layouts** — Client-side `useEffect` role checks with redirects. Admin requires ADMIN role + superadmin subdomain. Freelancer allows FREELANCER or ADMIN.
3. **API Routes** — Server-side via `src/lib/require-auth.ts`: `requireAuth()`, `requireRole()`, `requireAdmin()`, `requireFreelancer()`, `requireClient()`, `requireOwnerOrAdmin()`, `requireApprovedFreelancer()`

## Chat & Briefing Flow

The creative briefing is the core product flow. Architecture:

### Hook Composition

```
ChatInterface (render layer)
  └── useChatInterfaceData (facade hook)
        ├── useChatMessages         # message history + streaming API
        ├── useBriefingStateMachine  # 11-stage state machine
        ├── useBrief                 # brief panel state
        ├── useMoodboard            # visual reference collection
        ├── useStyleSelection       # design style picking
        ├── useTaskSubmission       # final task creation + credits
        ├── useFileUpload           # drag-drop attachments
        ├── useSmartCompletion      # predictive text (~60 regex patterns)
        ├── useStoryboard           # video/content scene structure
        └── useDraftPersistence     # localStorage + server sync
```

### Briefing State Machine (11 stages)

```
EXTRACT → TASK_TYPE → INTENT → INSPIRATION → STRUCTURE → ELABORATE
  → STRATEGIC_REVIEW → MOODBOARD → REVIEW → DEEPEN → SUBMIT
```

Maps to 6 UI stages: brief → style → details → strategic_review → moodboard → review → submit

### Structure Types (branched by deliverable)

- **video** → storyboard with scenes (duration, script, camera notes, transitions)
- **website** → layout sections (headline, CTA, content blocks)
- **content/calendar** → weekly posts, pillars, CTAs, escalation
- **design/brand** → single design specification (format, dimensions, key elements)

### AI Integration

System prompt in `chat.ts` configures Claude as a "senior creative director" that makes proactive recommendations (not open-ended questions). Outputs structured markers: `[DELIVERABLE_STYLES: ...]` for style picker, `[QUICK_OPTIONS]{...}[/QUICK_OPTIONS]` for chip buttons.

## State Management

- **React Query v5** — primary data fetching. Centralized hooks in `src/hooks/use-queries.ts` with `queryKeys` object. 30s stale time, 10min GC, 2x retry.
- **No global state manager** — no Redux, Zustand, or Context for app state.
- **CsrfProvider** — `useCsrfContext()` provides `csrfFetch()` and `getCsrfHeaders()` for mutations.
- **Hook composition** — `useChatInterfaceData()` composes 10+ hooks into a facade. Cross-hook communication via forward refs.
- **Draft persistence** — localStorage + server sync via `useDraftPersistence`.
- **Auth** — `useSession()` from Better Auth (not React Query).

## Supabase Storage

- **Browser client**: `src/lib/supabase/client.ts` (anon key)
- **Server client**: `src/lib/supabase/server.ts` (service role key, singleton)
- **Bucket**: `task-files` (public)
- **Path format**: `tasks/{taskId}/{folder}/{userId}_{timestamp}.{ext}` where folder is `deliverables` or `attachments`
- **Utilities** (`src/lib/storage.ts`): `uploadToStorage()`, `uploadFile()`, `deleteFile()`, `getSignedUrl()` (1-hour expiry)

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
- Key tables: users, companies, tasks, briefs, taskCategories, freelancerProfiles, creditTransactions, deliverableStyleReferences, brandReferences, taskOffers, taskFiles, taskMessages, chatDrafts, payouts
- Key relationships: tasks → taskFiles + taskMessages, freelancerProfiles → artistSkills → skills (proficiency matching), taskOffers (match scores + escalation levels), chatDrafts → briefs

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
- Rate limiting via `checkRateLimit`, CSRF on mutations via `csrfFetch()`

## Planning & Workflow

IMPORTANT: ALWAYS use EnterPlanMode before implementing any task that:

- Touches more than 1 file
- Adds new functionality or features
- Modifies existing behavior or refactors code
- Involves database schema changes
- Has unclear or ambiguous requirements

Only skip planning for trivial single-line fixes (typos, obvious bugs, small tweaks). When in doubt, plan first — never jump straight to implementation.

If something goes sideways during implementation, STOP and re-plan immediately — don't keep pushing.

When given a bug report: just fix it. Investigate logs, errors, and failing tests — then resolve. Zero hand-holding required.

Never mark a task complete without proving it works — run tests, check logs, demonstrate correctness.

## Multi-Fix Workflow

When fixing multiple bugs or issues in a session, **always test, commit, and push between each fix**. Never batch unrelated fixes into a single commit. This ensures:

- Each fix is isolated and revertable
- Broken fixes don't block other changes
- Git history stays clean and bisectable

## Agents & Commands

| Agent               | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `code-reviewer`     | PR review against project conventions                |
| `frontend-designer` | Design-aware frontend builds with visual verify loop |
| `security-auditor`  | Auth, secrets, input validation audits               |
| `test-writer`       | Generate co-located Vitest tests                     |
| `db-migration`      | Safe schema → generate → review → migrate flow       |
| `refactor`          | DRY refactoring with project conventions             |
| `perf-analyzer`     | Performance audit — config/infra only, no code       |

| Command          | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `/review`        | Review staged changes                          |
| `/deep-review`   | Deep review with security + perf analysis      |
| `/design-review` | Design system, accessibility, and visual audit |
| `/validate`      | Run full validation suite with summary         |
| `/fix-types`     | Find and fix TypeScript errors                 |
| `/perf-audit`    | Run performance audit (config & infra focused) |

## Sub-Agent Dispatch Rules

- **Parallel**: independent file reads, linting + typechecking, test runs across modules
- **Sequential**: schema change → migration → seed, API route → validation schema → test
- Use subagents to keep the main context window clean — offload research and exploration
- One task per subagent for focused execution
