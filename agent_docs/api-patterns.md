# API Patterns

All API routes live in `src/app/api/` and follow consistent patterns for authentication, validation, error handling, and response formatting.

## Route File Structure

Each API route is a `route.ts` file exporting named HTTP method handlers:

```typescript
// src/app/api/example/route.ts
import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { checkRateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import { requireAuth } from '@/lib/require-auth'

export async function GET(request: NextRequest) {
  const { limited, resetIn } = checkRateLimit(request, 'api', config.rateLimits.api)
  if (limited) {
    return NextResponse.json({ error: 'Too many requests', retryAfter: resetIn }, { status: 429 })
  }

  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // ... business logic ...

      return successResponse(data)
    },
    { endpoint: 'GET /api/example' }
  )
}
```

## Creating a New API Route

### Step 1: Create the route file

Create `src/app/api/<resource>/route.ts`. For dynamic routes use `src/app/api/<resource>/[id]/route.ts`.

### Step 2: Add rate limiting

```typescript
import { checkRateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'

const { limited, resetIn } = checkRateLimit(request, 'api', config.rateLimits.api)
if (limited) {
  return NextResponse.json({ error: 'Too many requests', retryAfter: resetIn }, { status: 429 })
}
```

Available presets from `config.rateLimits`:

- `api`: 100 req/min (general)
- `auth`: 20 req/min (login/signup)
- `chat`: 30 req/min (AI endpoints)

### Step 3: Wrap in withErrorHandling

```typescript
return withErrorHandling(
  async () => {
    // All business logic goes here
    // Any thrown error is caught and formatted
  },
  { endpoint: 'GET /api/resource' }
)
```

### Step 4: Add authentication

Choose the appropriate auth guard from `src/lib/require-auth.ts`:

```typescript
// Any authenticated user
const { user } = await requireAuth()

// Specific role(s)
const { user } = await requireRole('ADMIN')
const { user } = await requireRole('ADMIN', 'FREELANCER')

// Shorthand helpers
const { user } = await requireAdmin()
const { user } = await requireFreelancer()
const { user } = await requireClient()

// Resource ownership
const { user } = await requireOwnerOrAdmin(resource.userId)
```

Alternative: Direct session check (used in some routes):

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
if (!session?.user) {
  throw Errors.unauthorized()
}
```

### Step 5: Validate request body

Add a Zod schema in `src/lib/validations/index.ts`, then use it:

```typescript
import { mySchema } from '@/lib/validations'

const body = await request.json()
const validated = mySchema.parse(body)
```

If validation fails, `withErrorHandling` catches the `ZodError` and returns a 400 response with field-level error details.

### Step 6: Implement business logic

Use Drizzle ORM for database operations:

```typescript
import { db, withTransaction } from '@/db'
import { tasks, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Simple query
const results = await db.select().from(tasks).where(eq(tasks.clientId, user.id))

// Transactional operation
const result = await withTransaction(async (tx) => {
  const [updated] = await tx
    .update(tasks)
    .set({ status: 'COMPLETED' })
    .where(eq(tasks.id, taskId))
    .returning()
  return updated
})
```

### Step 7: Return response

```typescript
// Success response
return successResponse(data) // 200
return successResponse(data, 201) // 201 Created

// Error responses (throw inside withErrorHandling)
throw Errors.unauthorized() // 401
throw Errors.forbidden() // 403
throw Errors.notFound('Task') // 404
throw Errors.badRequest('Invalid') // 400
throw Errors.conflict('Exists') // 409
throw Errors.insufficientCredits(10, 5) // 400
throw Errors.rateLimited(60) // 429
throw Errors.internal() // 500
```

## Validation with Zod

All validation schemas are centralized in `src/lib/validations/index.ts`.

### Adding a New Schema

```typescript
// In src/lib/validations/index.ts

export const myNewSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .transform((val) => val.trim()),
  email: z.string().email(),
  count: z.number().int().min(1).max(100),
  tags: z.array(z.string()).optional().default([]),
  deadline: z.string().datetime().optional().nullable(),
})

// Export the inferred type
export type MyNewInput = z.infer<typeof myNewSchema>
```

### Common Validation Patterns

```typescript
// String with trim transform
title: z.string()
  .min(3, "Title must be at least 3 characters")
  .max(200, "Title must be less than 200 characters")
  .transform(val => val.trim()),

// Optional nullable field
deadline: z.string().datetime().optional().nullable(),

// Enum
status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]),

// Hex color
primaryColor: z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
  .optional()
  .nullable(),

// Phone number
phone: z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .optional()
  .nullable(),

// URL or empty string
website: z.string().url().optional().or(z.literal("")),

// Array of file objects
attachments: z.array(
  z.object({
    fileName: z.string().max(255),
    fileUrl: z.string().url(),
    fileType: z.string(),
    fileSize: z.number().positive(),
  })
).optional().default([]),

// Partial schema for updates
export const updateSchema = createSchema.partial();
```

### Existing Schemas

| Schema                        | Used By                        |
| ----------------------------- | ------------------------------ |
| `createTaskSchema`            | POST /api/tasks                |
| `updateTaskSchema`            | PATCH /api/tasks/[id]          |
| `taskMessageSchema`           | POST /api/tasks/[id]/messages  |
| `chatMessageSchema`           | POST /api/chat                 |
| `chatStreamSchema`            | POST /api/chat/stream          |
| `updateBrandSchema`           | PATCH /api/brand               |
| `extractBrandSchema`          | POST /api/brand/extract        |
| `onboardingSchema`            | POST /api/user/onboarding      |
| `updateUserSettingsSchema`    | PATCH /api/user/settings       |
| `createCheckoutSchema`        | POST /api/webhooks/stripe      |
| `adminFreelancerActionSchema` | Admin freelancer actions       |
| `createCategorySchema`        | Admin category CRUD            |
| `createStyleReferenceSchema`  | Admin style reference CRUD     |
| `adminCreditsSchema`          | Admin manual credit adjustment |
| `submitDeliverableSchema`     | POST /api/freelancer/submit    |
| `createCouponSchema`          | Admin coupon creation          |
| `saveDraftSchema`             | PUT /api/drafts                |
| `creativeIntakeSchema`        | POST /api/creative-intake      |
| `generateOutlineSchema`       | POST /api/brief/outline        |
| `stripeConnectActionSchema`   | Stripe Connect actions         |

## ActionResult Type

Defined in `src/lib/validations/types.ts`:

```typescript
export type ActionResult<T> = { data: T; error: null } | { data: null; error: string }
```

Used for type-safe return values from server actions and API client functions. The consumer can check `result.error` to determine success/failure.

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Unauthorized",
    "details": {},
    "requestId": "req_1234567_abc"
  }
}
```

### Success Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Code Categories

| Prefix   | Category       | Example                        |
| -------- | -------------- | ------------------------------ |
| AUTH\_\* | Authentication | AUTH_001 (Unauthorized)        |
| VAL\_\*  | Validation     | VAL_001 (Validation Error)     |
| RES\_\*  | Resource       | RES_001 (Not Found)            |
| BIZ\_\*  | Business Logic | BIZ_001 (Insufficient Credits) |
| PAY\_\*  | Payment        | PAY_001 (Payment Failed)       |
| SEC\_\*  | Security       | SEC_001 (CSRF Invalid)         |
| SRV\_\*  | Server         | SRV_001 (Internal Error)       |

### Custom APIError Class

```typescript
import { APIError, ErrorCodes } from '@/lib/errors'

// Throw a custom error
throw new APIError(ErrorCodes.INVALID_STATUS_TRANSITION, 'Cannot cancel a completed task', 400, {
  currentStatus: 'COMPLETED',
  requestedStatus: 'CANCELLED',
})
```

### withErrorHandling Behavior

1. **ZodError** -> Extracts field errors, returns 400 with `{ fields: { fieldName: ["error msg"] } }`
2. **APIError** -> Returns the error's status code with its code, message, and details
3. **Unknown Error** -> Returns 500. In development, includes the actual error message. In production, returns "An unexpected error occurred".

All errors are logged with a unique `requestId` for tracing.

## Rate Limiting

### In-Memory Implementation

Located in `src/lib/rate-limit.ts`. Uses a `Map<string, { count, resetTime }>` with periodic cleanup.

### Rate Limit Key

Derived from:

1. Session cookie (if present): `user:${cookiePrefix}`
2. IP address fallback: `ip:${ip}` (from `x-forwarded-for` or `x-real-ip`)

Combined with prefix: `api:user:abc123` or `auth:ip:1.2.3.4`

### Response Headers

Rate-limited responses include:

- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 45` (seconds)
- `Retry-After: 45`

Non-limited responses include:

- `X-RateLimit-Remaining: 87`
- `X-RateLimit-Reset: 45`

### withRateLimit Wrapper (Alternative)

For routes that want rate limiting as middleware:

```typescript
import { withRateLimit } from "@/lib/rate-limit";

export const GET = withRateLimit(
  async (request) => { ... },
  "api",
  { window: 60, max: 50 }
);
```

## CSRF Protection

`src/lib/csrf.ts` generates and validates CSRF tokens. The `CsrfProvider` component in the root layout provides the token to client components. Mutation endpoints should validate the CSRF token from the `x-csrf-token` header.

## Logging

All API routes use the Pino logger from `src/lib/logger.ts`:

```typescript
import { logger } from '@/lib/logger'

logger.info({ taskId, userId }, 'Task created')
logger.error({ err: error, context }, 'Failed to process')
logger.warn({ remaining: credits }, 'Low credit balance')
```

## API Client (Client-Side)

`src/lib/api-client.ts` provides typed fetch wrappers for calling API routes from React components, including CSRF token injection and error handling.

## Complete Route Example

```typescript
// src/app/api/example/route.ts
import { NextRequest } from 'next/server'
import { db, withTransaction } from '@/db'
import { items, users } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { checkRateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import { requireAuth } from '@/lib/require-auth'
import { mySchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const { limited, resetIn } = checkRateLimit(request, 'api', config.rateLimits.api)
  if (limited) {
    return NextResponse.json({ error: 'Too many requests', retryAfter: resetIn }, { status: 429 })
  }

  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const body = await request.json()
      const { name, count } = mySchema.parse(body)

      const result = await withTransaction(async (tx) => {
        const [item] = await tx.insert(items).values({ name, count, userId: user.id }).returning()

        await tx.update(users).set({ updatedAt: new Date() }).where(eq(users.id, user.id))

        return item
      })

      logger.info({ itemId: result.id, userId: user.id }, 'Item created')

      return successResponse(result, 201)
    },
    { endpoint: 'POST /api/example' }
  )
}
```
