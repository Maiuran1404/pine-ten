# Component-to-URL Map

Reference for `/verify` to determine which browser URLs to check when source files change.

## Route Groups

### Public & Auth (localhost:3000)

| Page Source                            | Dev URL                       | Auth           |
| -------------------------------------- | ----------------------------- | -------------- |
| `src/app/page.tsx`                     | `localhost:3000`              | None           |
| `src/app/api-docs/page.tsx`            | `localhost:3000/api-docs`     | None           |
| `src/app/(auth)/login/page.tsx`        | `localhost:3000/login`        | None           |
| `src/app/(auth)/register/page.tsx`     | `localhost:3000/register`     | None           |
| `src/app/(auth)/onboarding/page.tsx`   | `localhost:3000/onboarding`   | None           |
| `src/app/(auth)/early-access/page.tsx` | `localhost:3000/early-access` | None           |
| `src/app/(auth)/auth-error/page.tsx`   | `localhost:3000/auth-error`   | None           |
| `src/app/(auth)/join/[token]/page.tsx` | `localhost:3000/join/{token}` | None (dynamic) |

### Client (app.localhost:3000)

| Page Source                                           | Dev URL                                        | Auth             |
| ----------------------------------------------------- | ---------------------------------------------- | ---------------- |
| `src/app/(client)/dashboard/page.tsx`                 | `app.localhost:3000/dashboard`                 | CLIENT           |
| `src/app/(client)/dashboard/chat/page.tsx`            | `app.localhost:3000/dashboard/chat`            | CLIENT           |
| `src/app/(client)/dashboard/intake/page.tsx`          | `app.localhost:3000/dashboard/intake`          | CLIENT           |
| `src/app/(client)/dashboard/tasks/page.tsx`           | `app.localhost:3000/dashboard/tasks`           | CLIENT           |
| `src/app/(client)/dashboard/tasks/[id]/page.tsx`      | `app.localhost:3000/dashboard/tasks/{id}`      | CLIENT (dynamic) |
| `src/app/(client)/dashboard/designs/page.tsx`         | `app.localhost:3000/dashboard/designs`         | CLIENT           |
| `src/app/(client)/dashboard/designs/[id]/page.tsx`    | `app.localhost:3000/dashboard/designs/{id}`    | CLIENT (dynamic) |
| `src/app/(client)/dashboard/credits/page.tsx`         | `app.localhost:3000/dashboard/credits`         | CLIENT           |
| `src/app/(client)/dashboard/settings/page.tsx`        | `app.localhost:3000/dashboard/settings`        | CLIENT           |
| `src/app/(client)/dashboard/brand/page.tsx`           | `app.localhost:3000/dashboard/brand`           | CLIENT           |
| `src/app/(client)/dashboard/website-project/page.tsx` | `app.localhost:3000/dashboard/website-project` | CLIENT           |

### Freelancer (artist.localhost:3000)

| Page Source                                       | Dev URL                                   | Auth                 |
| ------------------------------------------------- | ----------------------------------------- | -------------------- |
| `src/app/(freelancer)/portal/page.tsx`            | `artist.localhost:3000/portal`            | FREELANCER           |
| `src/app/(freelancer)/portal/board/page.tsx`      | `artist.localhost:3000/portal/board`      | FREELANCER           |
| `src/app/(freelancer)/portal/tasks/page.tsx`      | `artist.localhost:3000/portal/tasks`      | FREELANCER           |
| `src/app/(freelancer)/portal/tasks/[id]/page.tsx` | `artist.localhost:3000/portal/tasks/{id}` | FREELANCER (dynamic) |
| `src/app/(freelancer)/portal/payouts/page.tsx`    | `artist.localhost:3000/portal/payouts`    | FREELANCER           |
| `src/app/(freelancer)/portal/settings/page.tsx`   | `artist.localhost:3000/portal/settings`   | FREELANCER           |

### Admin (superadmin.localhost:3000)

| Page Source                                              | Dev URL                                                   | Auth            |
| -------------------------------------------------------- | --------------------------------------------------------- | --------------- |
| `src/app/(admin)/admin/page.tsx`                         | `superadmin.localhost:3000/admin`                         | ADMIN           |
| `src/app/(admin)/admin/clients/page.tsx`                 | `superadmin.localhost:3000/admin/clients`                 | ADMIN           |
| `src/app/(admin)/admin/freelancers/page.tsx`             | `superadmin.localhost:3000/admin/freelancers`             | ADMIN           |
| `src/app/(admin)/admin/freelancers/[id]/page.tsx`        | `superadmin.localhost:3000/admin/freelancers/{id}`        | ADMIN (dynamic) |
| `src/app/(admin)/admin/tasks/page.tsx`                   | `superadmin.localhost:3000/admin/tasks`                   | ADMIN           |
| `src/app/(admin)/admin/tasks/[id]/page.tsx`              | `superadmin.localhost:3000/admin/tasks/{id}`              | ADMIN (dynamic) |
| `src/app/(admin)/admin/verify/page.tsx`                  | `superadmin.localhost:3000/admin/verify`                  | ADMIN           |
| `src/app/(admin)/admin/verify/[taskId]/page.tsx`         | `superadmin.localhost:3000/admin/verify/{taskId}`         | ADMIN (dynamic) |
| `src/app/(admin)/admin/categories/page.tsx`              | `superadmin.localhost:3000/admin/categories`              | ADMIN           |
| `src/app/(admin)/admin/deliverable-styles/page.tsx`      | `superadmin.localhost:3000/admin/deliverable-styles`      | ADMIN           |
| `src/app/(admin)/admin/brand-references/page.tsx`        | `superadmin.localhost:3000/admin/brand-references`        | ADMIN           |
| `src/app/(admin)/admin/video-references/page.tsx`        | `superadmin.localhost:3000/admin/video-references`        | ADMIN           |
| `src/app/(admin)/admin/coupons/page.tsx`                 | `superadmin.localhost:3000/admin/coupons`                 | ADMIN           |
| `src/app/(admin)/admin/revenue/page.tsx`                 | `superadmin.localhost:3000/admin/revenue`                 | ADMIN           |
| `src/app/(admin)/admin/algorithm/page.tsx`               | `superadmin.localhost:3000/admin/algorithm`               | ADMIN           |
| `src/app/(admin)/admin/chat-logs/page.tsx`               | `superadmin.localhost:3000/admin/chat-logs`               | ADMIN           |
| `src/app/(admin)/admin/chat-tests/page.tsx`              | `superadmin.localhost:3000/admin/chat-tests`              | ADMIN           |
| `src/app/(admin)/admin/chat-tests/[batchId]/page.tsx`    | `superadmin.localhost:3000/admin/chat-tests/{batchId}`    | ADMIN (dynamic) |
| `src/app/(admin)/admin/chat-tests/runs/[runId]/page.tsx` | `superadmin.localhost:3000/admin/chat-tests/runs/{runId}` | ADMIN (dynamic) |
| `src/app/(admin)/admin/security/page.tsx`                | `superadmin.localhost:3000/admin/security`                | ADMIN           |
| `src/app/(admin)/admin/security/runs/[runId]/page.tsx`   | `superadmin.localhost:3000/admin/security/runs/{runId}`   | ADMIN (dynamic) |
| `src/app/(admin)/admin/invite-codes/page.tsx`            | `superadmin.localhost:3000/admin/invite-codes`            | ADMIN           |
| `src/app/(admin)/admin/creative-intake-prompts/page.tsx` | `superadmin.localhost:3000/admin/creative-intake-prompts` | ADMIN           |
| `src/app/(admin)/admin/notifications/page.tsx`           | `superadmin.localhost:3000/admin/notifications`           | ADMIN           |
| `src/app/(admin)/admin/settings/page.tsx`                | `superadmin.localhost:3000/admin/settings`                | ADMIN           |
| `src/app/(admin)/admin/database/page.tsx`                | `superadmin.localhost:3000/admin/database`                | ADMIN           |
| `src/app/(admin)/admin/pitch-decks/page.tsx`             | `superadmin.localhost:3000/admin/pitch-decks`             | ADMIN           |
| `src/app/(admin)/admin/orshot-templates/page.tsx`        | `superadmin.localhost:3000/admin/orshot-templates`        | ADMIN           |
| `src/app/(admin)/admin/artist-invites/page.tsx`          | `superadmin.localhost:3000/admin/artist-invites`          | ADMIN           |
| `src/app/(admin)/admin/storyboard-images/page.tsx`       | `superadmin.localhost:3000/admin/storyboard-images`       | ADMIN           |
| `src/app/(admin)/admin/template-images/page.tsx`         | `superadmin.localhost:3000/admin/template-images`         | ADMIN           |

## Component-to-Page Mapping

When a shared component changes, verify the page it renders on:

| Component Pattern             | Verify URL                               | Auth       |
| ----------------------------- | ---------------------------------------- | ---------- |
| `src/components/chat/*`       | `app.localhost:3000/dashboard/chat`      | CLIENT     |
| `src/components/admin/*`      | `superadmin.localhost:3000/admin`        | ADMIN      |
| `src/components/freelancer/*` | `artist.localhost:3000/portal`           | FREELANCER |
| `src/components/dashboard/*`  | `app.localhost:3000/dashboard`           | CLIENT     |
| `src/components/ui/*`         | Verify the importing page (see fallback) | Varies     |
| `src/components/theme-*`      | `localhost:3000`                         | None       |
| `src/components/landing/*`    | `localhost:3000`                         | None       |

## Fallback Rules

For files not matched above:

1. **Page files** (`src/app/**/page.tsx`): derive URL from file path, stripping route group parentheses
2. **Layout files** (`src/app/**/layout.tsx`): verify the corresponding `page.tsx` URL
3. **Component files**: grep for the component name in page files to find which page imports it
4. **Hook/utility files**: check which components import them, then follow component-to-page mapping
5. **Dynamic routes** (`[id]`, `[token]`, etc.): flag that a real ID is needed — cannot auto-verify
