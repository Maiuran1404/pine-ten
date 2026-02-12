# Scaffold New API Route

Create a new API route with validation schema and test file.

## Arguments

$ARGUMENTS — the route path (e.g., "tasks/[id]/comments") and HTTP methods (e.g., "GET POST")

## Steps

1. Parse the route path and methods from arguments
2. Create the route file at `src/app/api/{path}/route.ts` with:
   - Imports: `withErrorHandling`, `successResponse`, `Errors` from `@/lib/errors`
   - Imports: `auth` from `@/lib/auth`, `headers` from `next/headers`
   - Zod schema import from `@/lib/validations`
   - Each method handler wrapped in `withErrorHandling`
   - Session check with `auth.api.getSession()`
   - Zod validation as the first operation for POST/PUT/PATCH
   - Rate limiting via `checkRateLimit`
3. Create or update the Zod schema in `src/lib/validations/` with appropriate schema
4. Create the test file at the same path as the route: `src/app/api/{path}/route.test.ts` with:
   - Auth test (returns 401 without session)
   - Validation test (returns 400 on bad input)
   - Happy path test (returns correct status and data)
   - Mock `@/lib/auth` and `@/db`
5. Run `npm run typecheck` to verify no type errors
6. Run `npm run test` to verify tests pass
