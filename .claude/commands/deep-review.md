# Deep Review

Review this plan thoroughly before making any code changes. For every issue or recommendation, explain the concrete tradeoffs, give me an opinionated recommendation, and ask for my input before assuming a direction.

## Arguments

$ARGUMENTS — optional scope (e.g., "src/app/api/tasks", "src/lib/auth.ts", "recent changes"). If empty, review the entire `src/` directory.

## Engineering Preferences

Use these to guide your recommendations:

- DRY is important — flag repetition aggressively.
- Well-tested code is non-negotiable; I'd rather have too many tests than too few.
- I want code that's "engineered enough" — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction, unnecessary complexity).
- I err on the side of handling more edge cases, not fewer; thoughtfulness > speed.
- Bias toward explicit over clever.

## Project Conventions

Pine Ten uses: Next.js App Router, TypeScript strict, Drizzle ORM, Better Auth, Supabase storage, Tailwind CSS v4, shadcn/ui, Vitest.

Enforce these conventions during review:

- TypeScript strict — no `any`, no `@ts-ignore`
- Named exports everywhere (except page/layout defaults)
- `server-only` import on server modules
- Zod validation first in every API route
- All API routes wrapped in `withErrorHandling` from `src/lib/errors.ts`
- Error helpers: `Errors.unauthorized()`, `Errors.notFound()`, `Errors.badRequest()`, etc.
- `ActionResult<T>` for client-side server action returns
- kebab-case file names
- Path alias `@/` maps to `src/`
- Auth via Better Auth (`src/lib/auth.ts`) — NOT Supabase Auth
- Env vars validated in `src/lib/env.ts`
- Rate limiting via `checkRateLimit` on public endpoints
- CSRF protection on mutation routes
- Supabase service role key NEVER in client code
- Drizzle ORM only — NEVER raw SQL for schema changes

## Review Sections

Work through these 4 sections in order.

### 1. Architecture Review

Evaluate:

- Overall system design and component boundaries.
- Dependency graph and coupling concerns (check imports between route groups).
- Data flow patterns and potential bottlenecks (client -> API -> DB -> Supabase).
- Scaling characteristics and single points of failure.
- Security architecture (auth, data access, API boundaries, role checks for CLIENT/FREELANCER/ADMIN).

### 2. Code Quality Review

Evaluate:

- Code organization and module structure.
- DRY violations — be aggressive here.
- Error handling patterns and missing edge cases (call these out explicitly).
- Technical debt hotspots.
- Areas that are over-engineered or under-engineered relative to my preferences.

### 3. Test Review

Evaluate:

- Test coverage gaps (unit, integration, e2e).
- Every API route should have a test. Every Zod schema should have a test.
- Test quality and assertion strength.
- Missing edge case coverage — be thorough.
- Untested failure modes and error paths.
- Proper use of mocks: `createMockSupabaseClient`, `createMockNextRequest`, factories from `src/test/`.

### 4. Performance Review

Evaluate:

- N+1 queries and database access patterns (check Drizzle queries).
- Memory-usage concerns.
- Caching opportunities.
- Slow or high-complexity code paths.
- Next.js-specific: unnecessary client components, missing Suspense boundaries, unoptimized images.

## Issue Reporting Format

For every specific issue (bug, smell, design concern, or risk):

1. **NUMBER** the issue (e.g., Issue #1, Issue #2).
2. Describe the problem concretely, with file and line references.
3. Present 2-3 options using **LETTERS** (A, B, C), including "do nothing" where reasonable.
4. For each option, specify: implementation effort, risk, impact on other code, and maintenance burden.
5. Give your recommended option and why, mapped to my engineering preferences above.
6. Make the recommended option always **Option A** (first in the list).

## Workflow

BEFORE YOU START:

Use AskUserQuestion to ask which review mode I want:

- **BIG CHANGE**: Work through interactively, one section at a time (Architecture -> Code Quality -> Tests -> Performance) with at most 4 top issues in each section.
- **SMALL CHANGE**: Work through interactively ONE question per review section.

FOR EACH STAGE OF REVIEW:

1. Output the explanation and pros/cons of each issue.
2. Give your opinionated recommendation and why.
3. Use AskUserQuestion so I can choose. Make sure each option clearly labels the issue NUMBER and option LETTER so there's no confusion.
4. After each section, pause and ask for my feedback before moving on to the next section.

## Rules

- Do not assume my priorities on timeline or scale.
- After each section, pause and ask for feedback before moving on.
- If the scoped area is small, skip sections that aren't relevant (e.g., skip Architecture for a single utility file).
- Use the Explore agent or Grep/Glob to thoroughly investigate the codebase before reporting issues — do not guess.
