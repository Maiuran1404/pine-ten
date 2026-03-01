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

### Hydration & Redirects

Any redirect based on role or subdomain in a layout **MUST** gate on `portal.isHydrated` before executing. Without this guard, redirects fire before the auth session is loaded, causing infinite redirect loops or flashing wrong-portal pages. This has been fixed 3+ times — treat it as a strict rule.

- Better Auth session cache has ~5min TTL — after DB role changes, the client session may be stale. Account for this in redirect logic.
- Layout role checks run client-side (`useEffect`), so they see the hydrated session, not the server-rendered one.

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

#### AI Chat Behavior Rules

These rules are hard-won from repeated bugs — violating them causes visible UX issues:

- **Quick options must derive from the AI's current message content**, not from stage inference or generic defaults. If the AI asks about audience, the chips must be audience options — never unrelated CTAs.
- **Each AI message must end with exactly one forward-looking question** to guide the user to the next step. No dead-end messages, no multiple questions competing for attention.
- **Never show unrelated CTAs or UI elements** for a stage the user hasn't reached (e.g., don't show video reference grids while still asking about audience).
- **Stage transitions are driven by the state machine**, not by AI message content. The AI informs the state machine, but the state machine owns progression.

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
- **NEVER** change fundamental UX interaction patterns (e.g., iframe to screenshots, modal to inline) without explicit user approval — these are product decisions
- **NEVER** implement major visual redesigns without user approval of the approach first
- **NEVER** use bare `fetch` for mutations — always use `csrfFetch()` from `useCsrfContext()`
- **NEVER** use `db.execute(sql\`...\`)` for queries — always use typed Drizzle query builder (`db.select()`, `db.insert()`, etc.)
- **NEVER** remove or rename a function, type, or export without first grepping for all references and updating them in the same edit batch — this breaks parallel agents
- **NEVER** use raw Tailwind palette colors (`emerald-500`, `violet-300`, `amber-600`, etc.) or hardcoded hex/rgb values for styling — all colors must come from design tokens in `globals.css` (see Color System section under Design Language)
- **NEVER** remove or alter existing functionality, buttons, or interactive elements when making design/frontend changes — design updates must preserve 100% of current behavior unless the user explicitly approves otherwise

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

Use `/migrate` for guided workflows (dispatches the `db-migration` agent).

## Testing

- Vitest + Testing Library, co-located: `foo.ts` → `foo.test.ts`
- Every new API route and Zod schema needs tests
- Use `/add-test` to generate tests for existing files (dispatches `test-writer` agent)
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
- New env vars: use `/add-env` to scaffold across `env.ts` + `.env.example` + CI
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

### During Plan Design

Every plan must answer these two questions before implementation begins:

1. **"Is this the simplest correct approach?"** — If you're adding layers, abstractions, or config that aren't strictly required, simplify.
2. **"Am I fighting the architecture?"** — If the plan requires workarounds, monkey-patches, or bypassing existing patterns, the approach is wrong. Redesign to work _with_ the codebase.

If either answer raises a red flag, redesign the approach or dispatch `/first-principles` on the affected scope before proceeding.

## First-Principles Thinking

Apply these 5 mental checks during every plan phase. This is a 30-second discipline, not a full audit — catch problems before they become code:

1. **Complexity check** — Is this the simplest correct solution? If you're reaching for an abstraction, indirection, or config layer, ask whether a direct approach works. Three similar lines > one premature helper.
2. **Boundary check** — Does the change respect existing module boundaries? If you're importing across route groups, reaching into hook internals, or coupling things that are currently decoupled, reconsider.
3. **State check** — Am I adding state when I could derive it? New `useState`, new DB columns, new cache entries — each is a future sync bug. Prefer computed values over stored ones.
4. **Bug magnet check** — Am I creating a new coordination point that will break? Race conditions, ordering dependencies, implicit contracts between components — these are the things that end up in "Known Fragile Areas."
5. **Fresh-eyes check** — If I were building this subsystem from scratch today, would I choose this design? If no, consider whether the refactor cost is worth paying now vs. accumulating more debt.

6. **Prevention check** — Am I designing out bugs, or will I need to catch them at runtime? Prefer compile-time guarantees (types, exhaustive switches) over runtime checks. If you're adding a try/catch, ask whether the error could be prevented structurally instead.

**Escape hatch**: If any check raises a red flag on a non-trivial change, dispatch `/first-principles` for a deep audit before proceeding with implementation.

## Debugging Protocol

When something is broken, follow this sequence — don't guess-and-check:

1. **Reproduce** — Confirm the bug exists. Check `git log --oneline -10` for recent changes that could be the cause.
2. **Hypothesize** — Generate 2-3 ranked hypotheses. Common culprits: null/undefined values, race conditions, stale cache (React Query / Better Auth ~5min TTL), type mismatches, env differences.
3. **Isolate** — Divide and conquer. Is it client or server? Data layer or render layer? Bisect the code path until you find the boundary where data goes wrong.
4. **Test** — One change at a time. If you change two things and the bug disappears, you don't know which fixed it.
5. **Explain** — Rubber duck: can you explain the root cause in one sentence? If not, you haven't found it yet.

For systematic investigation, dispatch `/debug` which uses the full debugging agent with Pine Ten-specific guidance for auth, briefing flow, and database issues.

## Multi-Fix Workflow

When fixing multiple bugs or issues in a session, **always test, commit, and push between each fix**. Never batch unrelated fixes into a single commit. This ensures:

- Each fix is isolated and revertable
- Broken fixes don't block other changes
- Git history stays clean and bisectable

## Visual Verification

After any change to `.tsx` component or page files, visual verification is mandatory:

1. Use `/verify` to check affected pages in the browser
2. Fix any visual issues before committing
3. This applies to both manual edits and `/develop` pipeline runs

Visual verification catches layout bugs, responsive issues, render errors, and console errors that static analysis cannot detect. URL mappings for all pages are in `.claude/url-map.md`.

## Agents & Commands

| Agent                | Purpose                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| `code-reviewer`      | PR review against project conventions                                        |
| `frontend-designer`  | Design-aware frontend builds with visual verify loop                         |
| `security-auditor`   | Auth, secrets, input validation audits                                       |
| `test-writer`        | Generate co-located Vitest tests                                             |
| `db-migration`       | Safe schema → generate → review → migrate flow                               |
| `refactor`           | DRY refactoring with project conventions                                     |
| `perf-analyzer`      | Performance audit — config/infra only, no code                               |
| `first-principles`   | Fresh-eyes architectural audit — wrong abstractions, complexity, bug magnets |
| `qa-stress-test`     | Autonomous E2E QA stress testing with Chrome browser automation              |
| `solution-architect` | Root cause analysis + elegant fix design from QA findings or bug reports     |
| `debug`              | Systematic debugging — reproduce, isolate, fix with structured methodology   |

| Command             | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `/review`           | Review staged changes                                                         |
| `/deep-review`      | Deep review with security + perf analysis                                     |
| `/design-review`    | Design system, accessibility, and visual audit                                |
| `/validate`         | Run full validation suite with summary                                        |
| `/fix-types`        | Find and fix TypeScript errors                                                |
| `/perf-audit`       | Run performance audit (config & infra focused)                                |
| `/migrate`          | Guided database migration (dispatches db-migration)                           |
| `/add-test`         | Generate co-located tests (dispatches test-writer)                            |
| `/security-audit`   | Run security audit (dispatches security-auditor)                              |
| `/cleanup`          | Remove debug artifacts and flag dead code                                     |
| `/refactor`         | DRY + performance refactoring (dispatches refactor)                           |
| `/debug`            | Systematic bug investigation (dispatches debug)                               |
| `/check-ready`      | Pre-push safety gate with readiness report                                    |
| `/add-env`          | Scaffold env var across env.ts + .env.example + CI                            |
| `/verify`           | Visual verification loop (browser screenshots + console)                      |
| `/first-principles` | First-principles architectural audit (dispatches first-principles)            |
| `/qa`               | Run QA stress tests (dispatches qa-stress-test)                               |
| `/qa-fix`           | QA stress test + root cause fix design (qa-stress-test -> solution-architect) |

## Proactive Command Usage

Use these commands automatically in the appropriate context — don't wait for the user to ask:

| Trigger                                               | Command                               |
| ----------------------------------------------------- | ------------------------------------- |
| Schema change requested                               | `/migrate`                            |
| New API route or Zod schema created without tests     | `/add-test`                           |
| Before committing/pushing code                        | `/check-ready`                        |
| New `process.env.*` reference needed                  | `/add-env`                            |
| Duplicate code noticed during implementation          | `/refactor`                           |
| After a big feature is done, before PR                | `/security-audit` then `/check-ready` |
| Debug console statements spotted in diff              | `/cleanup`                            |
| Code ready to commit and push                         | `/add-commit-push`                    |
| After creating/modifying any `.tsx` component or page | `/verify`                             |
| Touching a Known Fragile Area                         | `/first-principles` on affected scope |
| Modifying chat hook composition or briefing flow      | `/first-principles` on chat subsystem |
| Same subsystem has had 2+ bugs in recent sessions     | `/first-principles` on that subsystem |
| Feature touches 3+ subsystems or route groups         | `/first-principles` before impl       |
| Major refactor planned (new boundaries or patterns)   | `/first-principles` before impl       |
| After major feature complete, before PR               | `/qa` on affected flows               |
| After QA finds 5+ issues                              | `/qa-fix` for root cause analysis     |
| Something is broken and the cause isn't obvious       | `/debug`                              |

## Sub-Agent Dispatch Rules

- **Parallel**: independent file reads, linting + typechecking, test runs across modules
- **Sequential**: schema change → migration → seed, API route → validation schema → test
- Use subagents to keep the main context window clean — offload research and exploration
- One task per subagent for focused execution

## Parallel Agent Safety

Multiple agents may be editing the same codebase concurrently. This causes breakage when one agent removes, renames, or refactors code that another agent depends on. Follow these rules strictly:

### Before Editing a File

1. **Re-read any file before editing it** — never rely on a stale read from earlier in the session. Another agent may have modified it since you last read it.
2. **Check for callers before removing/renaming** — before deleting or renaming any function, type, constant, or export, grep the codebase for all references. If other files use it, update them too or leave the original in place.
3. **Never remove a function/type/export without updating all references** — this is the #1 source of parallel agent breakage. If you remove `isNavigationOption()` from a file, every file that calls it must be updated in the same edit batch.

### When Refactoring Shared Code

- **Prefer adding over removing** — if you're replacing a function, add the new one alongside the old one first. Only remove the old one after confirming zero remaining references.
- **Export renames need aliases** — if renaming an export, add `export { newName as oldName }` temporarily until all consumers are updated, or update all consumers in the same commit.
- **Run typecheck after edits** — always `npm run typecheck` after any refactor that touches exports, function signatures, or shared types. Fix all errors before moving on.

### Commit Discipline with Parallel Agents

- **Never commit code that doesn't typecheck** — if `npm run typecheck` fails, fix it before committing. Another agent may pull your broken state.
- **Commit frequently** — small, passing commits reduce the window for conflicts.
- **Pull before editing shared files** — if you know other agents are active, check `git status` and `git diff` for uncommitted changes from other agents before starting edits on the same files.

## Design Language

The established visual identity for Crafted:

- **Font**: Satoshi (primary), system fallbacks
- **Style**: Premium, immersive — grainy/textured backgrounds, subtle gradient accents, generous whitespace
- **Palette**: Dark mode dominant, warm accent tones, high contrast for readability
- **Components**: shadcn/ui base with custom styling to match the premium aesthetic

For any UI/UX decisions, use the `frontend-designer` agent and `/design-review`. Don't make aesthetic judgment calls independently — the design language is intentional and should be preserved.

### Color System (Strict Token Usage)

**All colors MUST come from the defined design tokens.** Never use raw hex values, Tailwind named palette colors (`emerald-*`, `violet-*`, `amber-*`, etc.), or arbitrary color values (`bg-[#abc123]`, `text-[#abc123]`). The only source of truth for colors is `globals.css` CSS custom properties.

#### Allowed Color Tokens

**Brand Greens** (use via `crafted-green`, `crafted-green-light`, `crafted-sage`, `crafted-mint`, `crafted-forest`):

| Token                   | Light     | Purpose                         |
| ----------------------- | --------- | ------------------------------- |
| `--crafted-green`       | `#4a7c4a` | Primary brand accent            |
| `--crafted-green-light` | `#6b9b6b` | Lighter accent                  |
| `--crafted-sage`        | `#8bb58b` | Subtle accent, links            |
| `--crafted-mint`        | `#a8d4a8` | Very light accent, hover states |
| `--crafted-forest`      | `#2d5a2d` | Deep accent, headings           |

**Semantic Tokens** (shadcn/ui — use via Tailwind classes like `bg-background`, `text-foreground`, `border-border`, etc.):
`background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`

**Dashboard Tokens** (use via `ds-success`, `ds-warning`, `ds-error` Tailwind classes):
`--ds-accent`, `--ds-accent-light`, `--ds-accent-dark`, `--ds-accent-muted`, `--ds-bg-*`, `--ds-border-*`, `--ds-text-*`, `--ds-success`, `--ds-warning`, `--ds-error`

**Gradients** (use via CSS utility classes):
`crafted-gradient` (135deg), `crafted-gradient-simple`, `crafted-gradient-radial`

#### Color Usage Rules

1. **Use Tailwind token classes** — `bg-background`, `text-foreground`, `border-border`, `bg-accent`, `text-muted-foreground`, `bg-crafted-green`, `text-crafted-sage`, `bg-ds-success`, etc.
2. **Use CSS variables with `var()`** for inline styles — `var(--crafted-green)`, `var(--ds-accent)`, `var(--background)`, etc.
3. **Opacity modifiers are OK** on tokens — `bg-crafted-green/20`, `text-crafted-sage/50`, `border-ds-accent/30`.
4. **For new semantic needs**, add a new CSS custom property to `globals.css` `:root` and `.dark` blocks, register it in the `@theme inline` block, then use the Tailwind class. Never sprinkle one-off hex codes.
5. **Status colors** — success: `ds-success`, warning: `ds-warning`, error: `ds-error` or `destructive`. No other reds/greens/ambers for status.
6. **Third-party brand colors** (Google, LinkedIn, etc.) are the only acceptable hardcoded hex values — use a comment explaining the brand source.
7. **PDF/email rendering** — where CSS variables are unavailable, hardcode values that exactly match the token values from `globals.css`. Reference the token name in a comment: `fill: '#4a7c4a' /* --crafted-green */`.

#### Forbidden Color Patterns

- **NEVER** use raw Tailwind palette colors: `emerald-*`, `green-*`, `violet-*`, `purple-*`, `amber-*`, `blue-*`, `cyan-*`, `rose-*`, `red-*`, `yellow-*`, `teal-*`, `indigo-*`, `fuchsia-*`, `pink-*`, `orange-*`, `lime-*`, `sky-*`, `stone-*`, `slate-*`, `gray-*`, `zinc-*`, `neutral-*` — use semantic tokens instead.
- **NEVER** use arbitrary color values like `bg-[#10b981]`, `text-[#9AA48C]`, `border-[rgba(99,102,241,0.5)]` — add a CSS variable if the token doesn't exist.
- **NEVER** introduce a new color without adding it as a CSS custom property in `globals.css` first.
- **NEVER** use different color values between light and dark mode for the same semantic purpose unless intentionally designed (e.g., `--ds-accent` should feel like the same brand color in both modes).

### Viewport-Height Design (Single-Screen Rule)

All pages and flows MUST fit within a single viewport height (`h-dvh`) by default. Users should not need to scroll to see the complete UI including all CTAs and action buttons.

**When to apply:**

- Onboarding flows, auth pages, modals, settings panels, dashboards, portals
- Any page with a primary action (submit, continue, save) — the CTA must be visible without scrolling

**Exceptions (scrolling allowed):**

- Data tables with many rows
- Infinite scroll / feed-style content
- Long-form content pages (articles, documentation)
- Chat message history
- Pages where the user explicitly requested scrollable layout

**Implementation pattern:**

- Use `h-dvh` (not `min-h-dvh`) on the outermost container
- Use `flex` + `flex-1` + `min-h-0` + `overflow-y-auto` on content areas as a safety valve
- Design step/card content to fit comfortably — prefer compact spacing over scroll
- On mobile, allow `overflow-y-auto` since small viewports may not fit all content

## Known Fragile Areas

These areas have repeatedly broken across sessions. Treat changes here with extra care — test thoroughly and verify visually:

- **Superadmin login redirect flow** — hydration race between auth session loading and role-based redirect logic. Must gate on `portal.isHydrated`.
- **Storyboard/structure data persistence** — scene data, structure content, and visual references must survive page refresh via draft persistence. Test the full save → refresh → restore cycle.
- **Quick options alignment** — chip buttons must match the AI's current message context. Regression: generic/stage-based chips appearing instead of message-derived ones.
- **Submit button / progress bar visibility** — at the final briefing stage, the submit CTA and progress indicator must be visible and functional. Regression: elements hidden by conditional rendering bugs.
- **Chat scroll behavior** — auto-scroll to latest message, but respect user scroll-up. Regression: scroll jumps or stuck-at-top issues.
