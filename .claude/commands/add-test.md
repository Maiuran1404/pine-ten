# Generate Tests

Generate co-located Vitest tests for existing source files. Dispatches the `test-writer` agent.

## Arguments

$ARGUMENTS — file path(s) to generate tests for (e.g., "src/app/api/tasks/route.ts", "src/lib/validations/task-schemas.ts")

## Steps

1. **Parse target files** from arguments. If no arguments given, detect files that are missing tests:
   - Run `git diff --name-only HEAD~1` to find recently changed files
   - Check which ones lack a co-located `.test.ts` file
   - Suggest those files to the user

2. **For each target file**, read it and classify:
   - **API route** (`src/app/api/**/route.ts`) → generate auth, validation, and happy-path tests
   - **Zod schema** (`src/lib/validations/*.ts`) → generate valid input, invalid input, and edge case tests
   - **Hook** (`src/hooks/*.ts`) → generate render and behavior tests
   - **Utility** (`src/lib/*.ts`) → generate unit tests for exported functions
   - **Component** (`src/components/**/*.tsx`) → generate render and interaction tests

3. **Dispatch the `test-writer` agent** to generate tests following project conventions:
   - Co-located: `foo.ts` → `foo.test.ts`
   - Use `vi.mock()` for external dependencies (`@/lib/auth`, `@/db`, Supabase)
   - Use factories from `src/test/factories.ts` for test data
   - Use `createMockNextRequest()` from `src/test/utils.ts` for API route tests
   - Use `renderWithProviders()` from `src/test/utils.ts` for component tests

4. **Run tests** — `npm run test -- <test-file-path>` to verify generated tests pass

5. **Report**:
   - Files created (with paths)
   - Test count (describe blocks, test cases)
   - Test result (pass/fail)
   - Any tests that need manual attention (e.g., complex mocks)

## Rules

- Never overwrite existing test files — extend them or ask the user
- Every API route test must include: 401 auth test, 400 validation test, happy-path test
- Every Zod schema test must include: valid input, missing required fields, edge cases
- No real network calls or database connections in tests
- Run tests after generation to confirm they pass
