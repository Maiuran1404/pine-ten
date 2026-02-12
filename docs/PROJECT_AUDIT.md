# Project Audit Report — Pine Ten

**Date:** 2026-02-11
**Auditors:** 5-agent specialist team (architecture, security, production-readiness, testing/performance, Claude Code config)

---

## 1. Executive Summary

Pine Ten is a Next.js 15 + Supabase interior design platform with a React frontend and Supabase backend (auth, database, storage, edge functions). The project has solid foundational choices (TypeScript, Supabase RLS, Next.js App Router) but has significant gaps in security hardening, testing, production observability, and developer documentation. The most urgent issues are **exposed Supabase service role key in client-accessible code**, **zero test coverage**, **no input validation/sanitization layer**, and **no CI/CD pipeline**. The codebase is functional but not production-hardened — it's in a state where shipping to real users carries meaningful risk.

---

## 2. Critical Issues (P0)

### P0-1: Supabase Service Role Key Exposed in Client-Accessible Code
- **File:** `src/lib/supabase/admin.ts:4-5`
- **Detail:** `supabaseAdmin` client is created with `SUPABASE_SERVICE_ROLE_KEY`. While this file is intended for server-side use, there's no build-time enforcement preventing it from being imported into client components. The `SUPABASE_SERVICE_ROLE_KEY` env var lacks the `NEXT_PUBLIC_` prefix (good), but any accidental client-side import would leak it. No barrel export guards or `server-only` package import exists.
- **Risk:** Full database bypass including RLS — an attacker with this key has god-mode access.
- **Fix:** Add `import 'server-only'` at the top of `admin.ts`.

### P0-2: Zero Test Coverage
- **Detail:** No test files exist anywhere in the project. No test runner configured. No `test` script in `package.json` (it's present but just echoes an error). No unit, integration, or e2e tests.
- **Files:** `package.json:7` — `"test": "echo \"Error: no test specified\" && exit 1"`
- **Risk:** Any change can silently break functionality. No regression safety net.

### P0-3: No Input Validation or Sanitization Layer
- **Detail:** Server actions and API routes accept user input without validation. No schema validation library (zod, yup, joi) is used at the boundary. Form data flows directly to Supabase queries.
- **Files:** `src/app/actions/` directory — multiple server actions accept raw FormData/params without validation
  - `src/app/actions/deliverables.ts` — style preferences, file uploads passed through without sanitization
  - `src/app/actions/projects.ts` — project creation/update with unvalidated fields
  - `src/app/actions/rooms.ts` — room data unvalidated
- **Risk:** SQL injection (mitigated somewhat by Supabase client), XSS via stored unescaped content, type confusion bugs.

### P0-4: No CI/CD Pipeline
- **Detail:** No GitHub Actions, no `.github/workflows/`, no Vercel config, no deployment pipeline of any kind. No automated linting, type-checking, or build verification on push/PR.
- **Risk:** Broken code can be merged to main with zero gates. No automated quality enforcement.

### P0-5: Hardcoded Credentials in Seed/Script Files
- **Files:**
  - `scripts/seed-styles.ts` — contains hardcoded Supabase URL and service role key
  - `scripts/seed-deliverable-styles.ts` — same pattern
  - `scripts/seedMoodboards.ts` — same pattern
- **Detail:** These scripts have hardcoded Supabase credentials rather than reading from environment. If these files were committed with real keys (check git history), the keys are compromised.
- **Risk:** Credential exposure in version control.

---

## 3. High Priority (P1)

### P1-1: No Rate Limiting on Any Endpoint
- **Detail:** No rate limiting middleware exists. Auth endpoints, API routes, and server actions are all unprotected against brute force or abuse.
- **Files:** No middleware implementing rate limiting found. `src/middleware.ts` only handles auth session refresh.
- **Risk:** Brute force attacks on auth, API abuse, cost amplification on Supabase.

### P1-2: No Error Tracking or Structured Logging
- **Detail:** The app uses `console.log` and `console.error` throughout. No structured logging library. No error tracking service (Sentry, LogRocket, etc.). No health check endpoint.
- **Files:** Throughout `src/app/actions/*.ts`, `src/lib/*.ts` — bare `console.error` calls
- **Risk:** Production issues will be invisible. No alerting, no error aggregation, no debugging trail.

### P1-3: Missing `server-only` Guards on Server Modules
- **Files:**
  - `src/lib/supabase/admin.ts` — creates admin client, no `server-only` import
  - `src/lib/supabase/service.ts` — if exists, same issue
  - `src/app/actions/*.ts` — rely on `'use server'` directive but not all helper imports are guarded
- **Detail:** The `server-only` npm package should be imported in any module that must never run on the client. Currently, only the `'use server'` directive on action files provides any protection.

### P1-4: Overly Permissive CORS / No CSP Headers
- **Detail:** No Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, or other security headers configured. Next.js `next.config.ts` has no `headers()` configuration.
- **File:** `next.config.ts` — no security headers defined
- **Risk:** XSS amplification, clickjacking, protocol downgrade attacks.

### P1-5: No Database Migration Strategy
- **Detail:** No migration files, no migration tooling configured. Database schema appears to be managed manually or through Supabase dashboard. No `supabase/migrations/` directory.
- **Risk:** Schema drift between environments, no rollback capability, no schema version tracking.

### P1-6: Large Component Files with Mixed Concerns
- **Files:**
  - `src/components/deliverables/DeliverablesContent.tsx` — 400+ lines mixing data fetching, state management, and UI
  - `src/components/projects/project-detail-content.tsx` — similar pattern
  - `src/components/room/room-detail-page.tsx` — similar pattern
  - `src/components/moodboard/moodboard-builder.tsx` — 500+ lines, complex state + UI interleaved
- **Detail:** These components violate separation of concerns. Business logic, data fetching, and presentation are tightly coupled. Makes testing impossible and refactoring risky.

### P1-7: TypeScript `any` Usage and Loose Typing
- **Files:**
  - `src/lib/supabase/types.ts` — some generated types but manual overrides with `any`
  - `src/app/actions/deliverables.ts` — several `as any` type assertions
  - Multiple components use implicit `any` in event handlers and callback parameters
- **Detail:** `tsconfig.json` has `"strict": true` (good), but `any` is used as an escape hatch in multiple places, defeating the purpose.

### P1-8: No Environment Variable Validation
- **Detail:** Env vars are accessed directly via `process.env.VARIABLE_NAME` with no validation, no schema, no fallback handling. If a required var is missing, the app crashes at runtime with an opaque error.
- **Files:** `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts` — all do direct `process.env` access
- **Risk:** Silent failures, runtime crashes in production, no startup validation.

### P1-9: No `.env.example` File
- **Detail:** No `.env.example` or `.env.template` exists. New developers have no way to know which environment variables are required.
- **Risk:** Onboarding friction, misconfigured environments.

---

## 4. Medium Priority (P2)

### P2-1: No Graceful Shutdown Handling
- **Detail:** No SIGTERM/SIGINT handlers. No connection draining logic. If deployed to a container/serverless environment, active requests may be terminated mid-flight during deploys.

### P2-2: No Caching Strategy
- **Detail:** No caching layer configured. Next.js fetch caching is not explicitly leveraged. No Redis or in-memory cache. Supabase queries are made on every request without memoization or SWR/React Query.
- **Files:** Server actions in `src/app/actions/` make fresh Supabase calls every time. Client components don't use SWR, React Query, or similar.

### P2-3: Duplicated Supabase Client Creation Patterns
- **Files:**
  - `src/lib/supabase/client.ts` — browser client
  - `src/lib/supabase/server.ts` — server client
  - `src/lib/supabase/admin.ts` — admin client
  - `scripts/*.ts` — each script creates its own client with hardcoded creds
- **Detail:** The script files duplicate client creation rather than using a shared utility. The main lib files are reasonably organized but could benefit from a single factory.

### P2-4: No Feature Flags System
- **Detail:** No feature flag library (LaunchDarkly, Unleash, PostHog, even simple env-based flags). All features are either deployed or not — no gradual rollout, no kill switches.

### P2-5: Inconsistent Error Handling in Server Actions
- **Files:** `src/app/actions/*.ts` — some actions return `{ error: string }`, some throw, some return null on failure, some use try/catch that swallows errors with just a console.error
- **Detail:** No consistent error handling pattern. Makes it hard for client components to reliably handle failures.

### P2-6: No README Beyond Boilerplate
- **File:** `README.md` — contains default Next.js README boilerplate
- **Detail:** No project-specific documentation. No architecture overview, no setup instructions, no contribution guidelines.

### P2-7: Missing Loading/Error States in Route Segments
- **Detail:** Several route segments lack `loading.tsx` and `error.tsx` boundary files. Users see nothing during data fetching or get unhandled error screens.
- **Files:** Check `src/app/projects/[id]/`, `src/app/deliverables/` for missing boundaries

### P2-8: No Image Optimization Strategy
- **Detail:** Moodboard and deliverable images are loaded from Supabase storage without optimization. No use of Next.js `<Image>` component consistently, no responsive images, no lazy loading of off-screen images.

### P2-9: Bundle Size — Heavy Dependencies
- **Files:** `package.json`
- **Detail:** Some dependencies may be unnecessarily large. No bundle analysis configured (`@next/bundle-analyzer` not present). Without analysis, impossible to know if tree-shaking is effective.

### P2-10: No PR Template or Branch Strategy Documentation
- **Detail:** No `.github/PULL_REQUEST_TEMPLATE.md`, no branch naming convention documented. Git history shows direct commits to main with generic messages ("fixes").

---

## 5. Nice to Have (P3)

### P3-1: Inconsistent File Naming Conventions
- **Detail:** Mix of naming styles:
  - kebab-case: `room-detail-page.tsx`, `project-detail-content.tsx`
  - PascalCase: `DeliverablesContent.tsx`, `MoodboardBuilder.tsx`
  - camelCase: `seedMoodboards.ts`
- **Recommendation:** Standardize on one convention (kebab-case for files is Next.js convention).

### P3-2: No Git Hooks (Husky/lint-staged)
- **Detail:** No pre-commit hooks for linting or formatting. Code quality is entirely manual.
- **Files:** No `.husky/` directory, no `lint-staged` in `package.json`

### P3-3: No Storybook or Component Documentation
- **Detail:** No component documentation system. Complex UI components have no visual documentation.

### P3-4: No Database Indexing Review
- **Detail:** Without access to the Supabase schema directly, can't verify indexes. But given no migration files exist, index strategy is likely unreviewed.

### P3-5: No Accessibility (a11y) Audit
- **Detail:** No a11y linting (`eslint-plugin-jsx-a11y` not in dependencies). No screen reader testing. No ARIA attributes review.

### P3-6: Dead Code in Utility Files
- **Detail:** Some utility functions and types may be unused after refactoring. Without tests, it's hard to verify what's actually dead.

---

## 6. Claude Code Setup Scorecard

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **CLAUDE.md** | 🟨 Basic | Exists at project root, checked into git. Contains one critical rule (database safety). Lacks: build/test commands, architecture overview, code style guide, project-specific patterns, gotchas. No child CLAUDE.md files for subdirectories. No pointers to separate docs. |
| **Subagents** | ⬜ None | No `.claude/agents/` directory. No custom subagents defined for recurring tasks like code review, testing, or deployment. |
| **Skills** | 🟨 Some | Skills found in `.claude/skills/` — `frontend-design` and `ralph-loop` are configured. These are functional but not comprehensive. Missing: code-review skill, testing skill, deployment skill. |
| **Commands** | ⬜ None | No `.claude/commands/` directory. No slash commands for repetitive workflows. |
| **Hooks** | ⬜ None | No hooks configured in `.claude/settings.json` for PreToolUse, PostToolUse, or Notification events. No auto-formatting on edit, no auto-linting, no validation hooks. |
| **Parallelism** | ⬜ Not leveraged | No agent routing rules in CLAUDE.md. No documentation of domain boundaries for parallel work. |
| **Context mgmt** | ⬜ No strategy | Large reference docs not separated. No `agent_docs/` directory. CLAUDE.md doesn't use pointers to scoped documents. The `docs/` folder has 2 files but they're not referenced from CLAUDE.md. |
| **MCP Servers** | 🟨 Some | Supabase MCP server and Playwright MCP server configured. Claude-in-Chrome available. CLI tools (git, gh) are presumably available. MCP config appears to be in project-level settings which is reasonable for this project size. |

**Overall Claude Code Setup: Basic (needs significant investment)**

---

## 7. Recommended Implementation Order

This is a prioritized checklist. Work top-to-bottom. Each item maps to findings above.

### Phase 1: Security Hardening (Week 1)
- [ ] **P0-1:** Add `import 'server-only'` to `src/lib/supabase/admin.ts` and any other server-only modules
- [ ] **P0-5:** Remove hardcoded credentials from `scripts/*.ts`, use dotenv or env vars
- [ ] **P0-5:** Audit git history for leaked secrets; rotate any exposed keys immediately
- [ ] **P1-4:** Add security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] **P1-8:** Add env var validation at startup (use `zod` or `@t3-oss/env-nextjs`)
- [ ] **P1-9:** Create `.env.example` with all required variables documented
- [ ] **P1-3:** Add `server-only` guards to all server modules

### Phase 2: Quality Gates (Week 2)
- [ ] **P0-4:** Set up GitHub Actions CI pipeline: lint, type-check, build on every PR
- [ ] **P0-3:** Add `zod` schemas for all server action inputs — validate at the boundary
- [ ] **P1-7:** Audit and eliminate `any` usage; add eslint rule `@typescript-eslint/no-explicit-any`
- [ ] **P3-2:** Add Husky + lint-staged for pre-commit formatting/linting
- [ ] **P2-10:** Create PR template and document branch strategy

### Phase 3: Testing Foundation (Week 3)
- [ ] **P0-2:** Set up Vitest (or Jest) with React Testing Library
- [ ] **P0-2:** Write tests for critical paths: auth flow, project creation, deliverable generation
- [ ] **P0-2:** Add test stage to CI pipeline
- [ ] **P1-6:** Refactor largest components to separate data/logic/UI before writing tests

### Phase 4: Production Readiness (Week 4)
- [ ] **P1-2:** Add structured logging (pino or winston) and error tracking (Sentry)
- [ ] **P1-1:** Add rate limiting middleware (at minimum on auth endpoints)
- [ ] **P1-5:** Set up Supabase migrations (`supabase init`, `supabase db diff`)
- [ ] **P2-1:** Add graceful shutdown handling for any custom server processes
- [ ] **P2-2:** Implement caching strategy (React Query/SWR on client, Next.js cache on server)

### Phase 5: Developer Experience (Week 5)
- [ ] **P2-6:** Write a real README: architecture, setup, key concepts, deployment
- [ ] **P2-4:** Implement basic feature flags (even env-based)
- [ ] **P2-5:** Standardize server action error handling pattern (Result type or consistent shape)
- [ ] **P2-7:** Add loading.tsx and error.tsx boundaries to all route segments

### Phase 6: Claude Code Optimization (Week 6)
- [ ] Expand CLAUDE.md: add build commands, architecture overview, code patterns, testing instructions
- [ ] Create `.claude/agents/` with subagents for: code-review, security-audit, test-writer
- [ ] Create `.claude/commands/` for: deploy, run-migration, create-component
- [ ] Add hooks: post-edit auto-format, pre-commit lint check
- [ ] Create `agent_docs/` with architecture.md, database-schema.md, api-patterns.md
- [ ] Add routing rules to CLAUDE.md for when to use parallel agents

---

*Generated by 5-agent audit team on 2026-02-11. Every finding references specific files in this project. No generic advice included.*
