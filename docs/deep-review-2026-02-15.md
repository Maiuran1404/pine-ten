# Deep Review Implementation Plan — 2026-02-15

Full codebase review of `src/` covering architecture, code quality, tests, and performance. All issues have been triaged with decisions locked in.

## Priority Order

Work through these in order. Each item includes the exact files to modify and the approach agreed upon.

---

### 1. Add `server-only` imports to server modules (30 min)

**Problem:** Only 5 files in `src/lib/` have `import 'server-only'`. Major server modules like `auth.ts`, `require-auth.ts`, `stripe.ts`, `ai/chat.ts`, and `notifications/` lack it. An accidental client-side import could leak `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, etc.

**Action:** Add `import 'server-only'` as the first import to these files:

- `src/lib/auth.ts`
- `src/lib/require-auth.ts`
- `src/lib/stripe.ts`
- `src/lib/stripe-connect.ts`
- `src/lib/ai/chat.ts`
- `src/lib/ai/inference-engine.ts`
- `src/lib/ai/brand-style-scoring.ts`
- `src/lib/ai/semantic-style-search.ts`
- `src/lib/ai/brief-generator.ts`
- `src/lib/ai/video-references.ts`
- `src/lib/notifications/` (all server files)
- `src/lib/assignment-algorithm.ts`
- `src/lib/audit.ts`
- `src/lib/rate-limit.ts`
- `src/lib/csrf.ts`
- `src/lib/cache.ts`

**Verify:** `npm run build` — any client component importing these will fail at build time (desired behavior).

---

### 2. Replace raw `auth.api.getSession()` with `requireAuth` helpers (30 min)

**Problem:** 6 API routes bypass the centralized auth helpers and do manual session/role checks:

- `src/app/api/early-access/record-usage/route.ts`
- `src/app/api/freelancer/stats/route.ts`
- `src/app/api/artist/tasks/[taskId]/accept/route.ts`
- `src/app/api/artist/tasks/[taskId]/decline/route.ts`
- `src/app/api/admin/algorithm/route.ts`
- `src/app/api/admin/algorithm/publish/route.ts`

**Action:** Replace `auth.api.getSession()` + manual `if (!session?.user)` / `if (user.role !== 'ADMIN')` checks with the appropriate helper:

- Admin routes: `await requireAdmin()`
- Freelancer routes: `await requireRole('FREELANCER')`
- General auth routes: `await requireAuth()`

Import from `@/lib/require-auth`.

---

### 3. Replace raw `<img>` with `OptimizedImage` (15 min)

**Problem:** `src/components/chat/brief-panel/visual-direction.tsx:44` uses a raw `<img>` tag, bypassing Next.js image optimization.

**Action:** Replace:

```tsx
<img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
```

With `OptimizedImage` from `@/components/ui/optimized-image` (or `next/image` directly with `fill` prop). May need to add the image domain to `remotePatterns` in `next.config`.

---

### 4. Add LIMIT to admin freelancer queries (15 min)

**Problem:** `src/app/api/admin/freelancers/route.ts` GET handler fetches all freelancer profiles with no `.limit()`. Same issue in `src/app/api/admin/tasks/[id]/reassign/route.ts` GET endpoint.

**Action:** Add `.limit(200)` to both queries. This is a stopgap — proper cursor pagination comes later when the admin UI needs it.

---

### 5. Wire CSRF protection into mutation routes (1-2 days)

**Problem:** `src/lib/csrf.ts` has a complete `withCsrfProtection` middleware wrapper (line 71) with constant-time token comparison. The client-side `useCsrf` hook sends the `x-csrf-token` header. But **zero API routes** actually validate the token server-side. The entire CSRF system is dead code on the validation side.

**Action:** Compose CSRF validation into `withErrorHandling` so all mutation routes get it automatically. Approach:

1. Modify `withErrorHandling` in `src/lib/errors.ts` to accept an option like `{ csrf: true }`
2. When enabled, call `validateCsrfToken(request)` before executing the handler
3. OR: Create a new `withMutationHandling` that composes `withErrorHandling` + `withCsrfProtection`
4. Apply to all POST/PUT/PATCH/DELETE routes
5. Exclude webhook routes (Stripe, Slack) that use their own signature verification

**Files:** `src/lib/errors.ts`, `src/lib/csrf.ts`, all mutation API routes.

---

### 6. Add middleware-level rate limiting (1 day)

**Problem:** Only 7 of ~80+ API routes have `withRateLimit`. Most mutation routes have no rate limiting at all, including `/api/csrf` (token generation).

**Action:** Add rate limiting in `middleware.ts` (or create it) with tiered limits:

- `/api/admin/*` — 200 req/min (lenient, admin only)
- `/api/chat` — 30 req/min (already exists per-route, move to middleware)
- `/api/tasks` POST — 10 req/min
- `/api/webhooks/*` — exempt (external services)
- Default authenticated — 100 req/min
- Default unauthenticated — 60 req/min

**Files:** `src/middleware.ts` (create or extend), `src/lib/rate-limit.ts`.

---

### 7. Use Next.js `after()` for notifications (30 min)

**Problem:** In `src/app/api/tasks/route.ts`, after task creation, notifications are sent sequentially (admin, WhatsApp, in-app, email). Each is a separate network call adding 2-5 seconds to the API response.

**Action:** Wrap notification calls in Next.js `after()` so they execute after the response is sent:

```typescript
import { after } from 'next/server'

// Inside the handler, after returning the response:
after(async () => {
  // fire all notifications
})
```

Apply the same pattern to other routes that send notifications after mutations (task reassign, freelancer approve/reject, etc.).

---

### 8. Parallelize chat post-AI processing (1-2 hours)

**Problem:** `src/app/api/chat/route.ts` (585 lines) runs style references, brand-aware styles, and video references sequentially after the AI response. These are independent operations.

**Action:** After the `chat()` call returns, wrap steps 3-5 in `Promise.allSettled`:

```typescript
const [styleRefsResult, deliverableStylesResult, videoRefsResult] = await Promise.allSettled([
  getStyleReferences(...),
  getBrandAwareStyles(...),
  getVideoReferences(...),
])
```

Handle each result individually (use value if fulfilled, log and continue if rejected).

**Files:** `src/app/api/chat/route.ts` (lines ~317-530).

---

### 9. Extract freelancer query helper (1 hour)

**Problem:** `src/app/api/admin/freelancers/[id]/route.ts` has the exact same 15-field `.select()` block duplicated at lines 70-93 and 102-125. Only the `.where()` clause differs.

**Action:** Create `src/lib/queries/freelancer.ts` with:

- A `freelancerProfileSelect` constant defining the shared field selection
- A `findFreelancerProfile(idOrUserId: string)` helper that tries profile ID first, then user ID
- Import and use in the admin route and any other routes querying freelancer profiles

---

### 10. Centralize inline Zod schemas into `validations/admin.ts` (1 hour)

**Problem:** 5 Zod schemas are defined inline in route files instead of the centralized validations module. Additionally, `createCouponSchema` exists in BOTH `admin/coupons/route.ts` AND `lib/validations/index.ts` with **different validation rules** (code max length 25 vs 50) — this is a divergence bug.

**Action:**

1. Create `src/lib/validations/admin.ts` for admin-only schemas
2. Move these schemas there: `updateFreelancerSchema`, `bulkActionSchema`, `updateCouponSchema`, `deleteSchema`, `reassignSchema`
3. Resolve the `createCouponSchema` divergence — pick the correct validation rules
4. Re-export from `src/lib/validations/index.ts` barrel
5. Update imports in all affected route files
6. Add tests in `src/lib/validations/admin-schemas.test.ts` (may already partially exist)

---

### 11. Cache style/brand scoring queries (half day)

**Problem:** Every chat response triggers `getBrandAwareStyles()` or `searchStylesByQuery()`, querying `deliverableStyleReferences` + computing brand scores. This data changes infrequently (admin imports) but is queried on every chat message. Only `admin/stats` uses caching.

**Action:** Add `unstable_cache` (or the project's `cachedSuccessResponse` pattern) to style queries:

- `src/lib/ai/brand-style-scoring.ts` — cache `getBrandAwareStyles()` with 5-min TTL
- `src/lib/ai/semantic-style-search.ts` — cache `searchStylesByQuery()` with 5-min TTL
- Add tag-based invalidation: call `revalidateTag('deliverable-styles')` in admin import routes

**Files:** `src/lib/ai/brand-style-scoring.ts`, `src/lib/ai/semantic-style-search.ts`, admin import routes.

---

### 12. Write assignment algorithm tests (1-2 days)

**Problem:** `src/lib/assignment-algorithm.ts` is 28KB of core business logic for matching tasks to freelancers. It has zero test coverage. A bug here silently assigns the wrong freelancer.

**Action:** Create `src/lib/assignment-algorithm.test.ts` with comprehensive tests:

- Scoring function unit tests (skill match, availability, performance history, workload)
- Edge cases: no available freelancers, tied scores, single freelancer
- `rankArtistsForTask()` integration test with mocked DB
- Tier fallback behavior (tier 1 → tier 2 → tier 3)
- Config loading and defaults

Use factories from `src/test/factories.ts` for mock data.

---

### 13. Write Stripe webhook tests (1 day)

**Problem:** `src/app/api/webhooks/stripe/route.ts` and `src/app/api/webhooks/stripe/checkout/route.ts` handle payment lifecycle with zero test coverage. Bugs mean credits not granted or duplicated.

**Action:** Create test files for both webhook routes:

- Mock Stripe signature verification
- Test `checkout.session.completed` → credits granted
- Test idempotency (duplicate event IDs rejected)
- Test invalid payload rejection
- Test `invoice.payment_succeeded` handling
- Test missing/malformed event data

Reference `src/app/api/admin/settings/route.test.ts` for the mocking pattern.

---

### 14. Auto-generate API route test stubs (2-3 days)

**Problem:** Only 3 of ~80+ API routes have tests (3.7% coverage).

**Action:** Use the `test-writer` agent to scaffold test stubs for all untested routes. Then manually review and augment:

- Prioritize: tasks CRUD, chat, upload, credits, user settings, freelancer routes
- Each stub should test: auth check, Zod validation, happy path, error path
- Use existing test patterns from `admin/settings/route.test.ts` as template

---

### 15. Write component tests for complex UI (2-3 days)

**Problem:** Only 1 component test exists (`ui/empty-state.test.tsx`). Chat components have significant business logic untested.

**Action:** Write tests for:

- `src/components/chat/chat-interface.tsx` — hooks, state management, message handling
- `src/components/chat/task-submission-modal.tsx` — form validation, submission flow
- Onboarding flow components
- Credit purchase dialog

Use `renderWithProviders` from `src/test/utils.ts` and React Testing Library.

---

### 16. Split AI module into sub-domains + ChatService (1-2 days)

**Problem:** `src/lib/ai/` has 32 non-test files (~400KB+) in a flat structure. The 585-line chat route does too much orchestration.

**Action:**

1. Reorganize into sub-domains:
   - `src/lib/ai/briefing/` — state-machine, prompts, extractors, tone, quick-options, response-parser, strategic
   - `src/lib/ai/style/` — brand-style-scoring, semantic-style-search, style-filter, style-dna, deliverable-styles
   - `src/lib/ai/chat/` — chat, chat-context, video-references
   - `src/lib/ai/inference/` — inference-engine, infer-audiences
   - `src/lib/ai/classify/` — classify-brand-image, classify-deliverable-style
2. Add barrel exports (`index.ts`) in each sub-domain
3. Extract chat route orchestration into a `ChatService` class/module
4. Update all imports

**Note:** This is a pure refactor — no logic changes. Run `npm run validate` after to confirm nothing breaks.
