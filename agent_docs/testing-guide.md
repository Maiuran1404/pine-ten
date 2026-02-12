# Testing Guide

## Overview

The project uses two testing frameworks:

- **Vitest** for unit and integration tests (fast, happy-dom environment)
- **Playwright** for end-to-end tests (real browser automation)

## Vitest Configuration

Configuration file: `vitest.config.mts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '.next', 'src/test', '**/*.d.ts', '**/*.config.*'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Key settings:

- **Environment:** happy-dom (lightweight DOM implementation)
- **Globals:** enabled (`describe`, `it`, `expect`, `vi` available without imports)
- **Setup file:** `src/test/setup.tsx` runs before every test file
- **Path alias:** `@/` maps to `src/`
- **Pattern:** Tests must be named `*.test.ts` or `*.test.tsx`

## Running Tests

```bash
pnpm test              # Run all tests once
pnpm test:watch        # Watch mode (re-run on file changes)
pnpm test:coverage     # Generate coverage report
pnpm test:ui           # Open Vitest UI in browser
pnpm test:e2e          # Run Playwright E2E tests
pnpm test:e2e:ui       # Playwright with interactive UI
pnpm test:e2e:headed   # Playwright in headed browser mode
pnpm validate          # Run lint + typecheck + tests (CI gate)
```

## Global Test Setup

Located in `src/test/setup.tsx`. This file runs before every test and sets up:

### Next.js Mocks

```typescript
// Router mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(), replace: vi.fn(), back: vi.fn(),
    forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Image component mock
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />,
}));
```

### DOM API Mocks

```typescript
// window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// IntersectionObserver
// ResizeObserver
```

### Cleanup

```typescript
afterEach(() => {
  cleanup()
})
```

React Testing Library's `cleanup()` runs after each test to unmount rendered components.

## Test Utilities

Located in `src/test/utils.ts`.

### renderWithProviders

Wraps a component in `QueryClientProvider` for testing components that use TanStack React Query:

```typescript
import { renderWithProviders } from "@/test/utils";

const { getByText, queryClient } = renderWithProviders(<MyComponent />);
```

The test `QueryClient` is configured with:

- `retry: false` -- No automatic retries
- `gcTime: 0` -- No garbage collection caching

### createMockSupabaseClient

Creates a fully chainable mock Supabase client for testing code that uses Supabase storage or auth:

```typescript
import { createMockSupabaseClient } from "@/test/utils";

const mockClient = createMockSupabaseClient();

// Mock a query chain
mockClient.from("tasks").select().eq("id", "123").single();

// Mock storage
mockClient.storage.from("uploads").upload(...);
mockClient.storage.from("uploads").getPublicUrl("file.png");
```

The mock includes:

- `from()` with chainable query methods (select, insert, update, delete, eq, neq, etc.)
- Terminal methods that resolve: `single()`, `maybeSingle()`, `then()`
- `auth` namespace with `getSession`, `getUser`, `signInWithPassword`, `signOut`
- `storage` namespace with `upload`, `download`, `getPublicUrl`, `remove`, `list`
- `rpc()` for stored procedure calls

### createMockNextRequest

Creates a mock NextRequest object for testing API-like code:

```typescript
import { createMockNextRequest } from '@/test/utils'

const request = createMockNextRequest('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  cookies: { 'crafted.session_token': 'abc123' },
  body: { title: 'Test', description: 'Test task' },
})
```

## Dedicated Supabase Mock

Located in `src/test/mocks/supabase.ts`. A more comprehensive mock with:

```typescript
import { createMockSupabaseClient, mockTableResponse } from '@/test/mocks/supabase'

const client = createMockSupabaseClient(defaultData, defaultError)

// Override response for a specific table
const chain = mockTableResponse(client, 'tasks', [{ id: '1', title: 'Test' }])
```

Includes additional methods vs the utils version:

- `textSearch`, `contains`, `containedBy`, `overlaps`
- `count`, `returns`, `csv`
- `signInWithOAuth`, `signUp`, `onAuthStateChange`, `refreshSession`
- `channel()` with `on()`, `subscribe()`, `unsubscribe()`
- `storage.createSignedUrl`, `storage.move`, `storage.copy`

## Test Factories

Located in `src/test/factories.ts`. Create mock domain objects with sensible defaults:

### createMockUser

```typescript
import { createMockUser } from '@/test/factories'

const user = createMockUser()
// { id: "user_abc", name: "Test User", email: "test@example.com",
//   role: "CLIENT", credits: 10, emailVerified: true, ... }

const admin = createMockUser({ role: 'ADMIN', credits: 0 })
const freelancer = createMockUser({ role: 'FREELANCER', name: 'Designer' })
```

### createMockTask

```typescript
import { createMockTask } from '@/test/factories'

const task = createMockTask()
// { id: "task_xyz", clientId: "user_123", title: "Test Task",
//   description: "Test description", status: "PENDING", creditsUsed: 1, ... }

const completed = createMockTask({ status: 'COMPLETED', completedAt: new Date() })
```

### createMockSession

```typescript
import { createMockSession } from '@/test/factories'

const session = createMockSession()
// { user: MockUser, session: { id, token, expiresAt } }

const adminSession = createMockSession({
  user: createMockUser({ role: 'ADMIN' }),
})
```

### createMockFreelancerProfile

```typescript
import { createMockFreelancerProfile } from '@/test/factories'

const profile = createMockFreelancerProfile()
// { id: "profile_xyz", userId: "user_123", status: "APPROVED",
//   skills: ["Graphic Design", "UI/UX"], rating: "4.5", ... }
```

## Testing Validation Schemas

Test files for validation schemas are colocated: `src/lib/validations/*.test.ts`.

### Pattern

```typescript
import { describe, it, expect } from 'vitest'
import { createTaskSchema } from '@/lib/validations'

describe('createTaskSchema', () => {
  it('accepts valid input', () => {
    const result = createTaskSchema.safeParse({
      title: 'Design a logo',
      description: 'Need a modern logo for our brand',
      creditsRequired: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects short title', () => {
    const result = createTaskSchema.safeParse({
      title: 'ab',
      description: 'Need a modern logo for our brand',
      creditsRequired: 10,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title')
    }
  })

  it('trims whitespace from title', () => {
    const result = createTaskSchema.parse({
      title: '  Design a logo  ',
      description: 'Need a modern logo for our brand',
      creditsRequired: 10,
    })
    expect(result.title).toBe('Design a logo')
  })

  it('defaults optional arrays to empty', () => {
    const result = createTaskSchema.parse({
      title: 'Design a logo',
      description: 'Need a modern logo for our brand',
      creditsRequired: 10,
    })
    expect(result.attachments).toEqual([])
    expect(result.styleReferences).toEqual([])
  })
})
```

### Existing Schema Test Files

- `src/lib/validations/index.test.ts` -- Core schema tests
- `src/lib/validations/admin-schemas.test.ts` -- Admin schemas
- `src/lib/validations/brand-schemas.test.ts` -- Brand schemas
- `src/lib/validations/chat-schemas.test.ts` -- Chat schemas
- `src/lib/validations/freelancer-schemas.test.ts` -- Freelancer schemas
- `src/lib/validations/task-schemas.test.ts` -- Task schemas

## Testing Library Code

Unit tests for library modules are colocated: `src/lib/*.test.ts`.

### Testing Error Handling

```typescript
// src/lib/errors.test.ts
import { describe, it, expect, vi } from "vitest";
import { withErrorHandling, Errors, APIError, ErrorCodes } from "@/lib/errors";
import { ZodError } from "zod";

describe("withErrorHandling", () => {
  it("returns handler result on success", async () => {
    const result = await withErrorHandling(async () => {
      return NextResponse.json({ success: true });
    });
    // assert result
  });

  it("handles ZodError", async () => {
    const result = await withErrorHandling(async () => {
      throw new ZodError([...]);
    });
    // assert 400 response with field errors
  });

  it("handles APIError", async () => {
    const result = await withErrorHandling(async () => {
      throw Errors.notFound("Task");
    });
    // assert 404 response
  });
});
```

### Testing Config

```typescript
// src/lib/config.test.ts
import { describe, it, expect } from 'vitest'
import { config } from '@/lib/config'

describe('config', () => {
  it('has valid credit pricing', () => {
    expect(config.credits.pricePerCredit).toBeGreaterThan(0)
  })

  it('has valid rate limits', () => {
    expect(config.rateLimits.api.max).toBeGreaterThan(0)
    expect(config.rateLimits.api.window).toBeGreaterThan(0)
  })
})
```

## Testing Hooks

Hook tests are colocated: `src/hooks/*.test.ts`.

```typescript
// src/hooks/use-mobile.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

describe('useIsMobile', () => {
  it('returns false for desktop viewport', () => {
    // window.matchMedia is mocked in setup.tsx
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
```

## Testing Components

Components that use React Query need `renderWithProviders`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { MyComponent } from "@/components/my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    renderWithProviders(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("handles click", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderWithProviders(<MyComponent onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
```

### Mocking Modules in Component Tests

```typescript
// Mock an API client function
vi.mock('@/lib/api-client', () => ({
  fetchTasks: vi.fn().mockResolvedValue({ data: [], error: null }),
}))

// Mock auth client
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { id: '1', name: 'Test', role: 'CLIENT' } },
    isPending: false,
  }),
}))
```

## Testing API Routes

API route tests verify the full request/response cycle:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockNextRequest } from '@/test/utils'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    // ...chain as needed
  },
}))

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/tasks/route')
    const request = createMockNextRequest('http://localhost:3000/api/tasks')
    const response = await GET(request as any)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
  })
})
```

## E2E Testing with Playwright

### Configuration

File: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
```

Key settings:

- Tests live in `e2e/` directory
- Auto-starts dev server if not running (non-CI)
- Screenshots on failure, traces on first retry
- Single Chrome browser project
- Parallel in dev, sequential in CI

### Writing E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('redirect unauthenticated users', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
```

## Test File Location Convention

Tests are **colocated** with their source files:

```
src/lib/errors.ts          -> src/lib/errors.test.ts
src/lib/config.ts          -> src/lib/config.test.ts
src/lib/env.ts             -> src/lib/env.test.ts
src/lib/rate-limit.ts      -> src/lib/rate-limit.test.ts
src/lib/utils.ts           -> src/lib/utils.test.ts
src/hooks/use-mobile.ts    -> src/hooks/use-mobile.test.ts
src/hooks/use-bulk-selection.ts -> src/hooks/use-bulk-selection.test.ts
src/lib/validations/index.ts -> src/lib/validations/index.test.ts
                              src/lib/validations/admin-schemas.test.ts
                              src/lib/validations/brand-schemas.test.ts
                              ...
```

E2E tests are in a separate top-level `e2e/` directory.

## CI Integration

The `pnpm validate` script runs the full quality gate:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Pre-commit hooks (Husky + lint-staged) automatically run:

- `eslint --fix` on `.ts` and `.tsx` files
- `prettier --write` on `.ts`, `.tsx`, `.json`, `.md`, `.yml` files
