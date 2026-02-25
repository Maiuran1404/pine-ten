# Refactor

Analyze code for DRY violations, pattern inconsistencies, and extraction opportunities. Dispatches the `refactor` agent.

## Arguments

$ARGUMENTS — file path, directory, or description of what to refactor (e.g., "src/hooks/", "extract shared auth logic", "consolidate task validation schemas")

## Steps

1. **Understand the target** — Parse arguments to determine scope:
   - File path → refactor that specific file
   - Directory → analyze all files in that directory for patterns
   - Description → search the codebase for relevant code

2. **Analyze for refactoring opportunities** by dispatching the `refactor` agent:

   **DRY Violations**
   - Repeated code blocks across files (3+ similar lines)
   - Duplicate Zod schemas in different validation files
   - Repeated `vi.mock()` setups across test files
   - Similar API route boilerplate that could be abstracted

   **Pattern Inconsistencies**
   - API routes not using `withErrorHandling`
   - Missing `server-only` imports on server modules
   - Default exports where named exports should be used
   - Inconsistent error handling patterns

   **Extraction Opportunities**
   - Repeated UI patterns → shared component
   - Repeated hook logic → custom hook in `src/hooks/`
   - Repeated validation logic → shared schema in `src/lib/validations/`
   - Repeated utility functions → shared module in `src/lib/`

3. **Present findings** to the user before making changes:
   - What will be extracted/consolidated
   - Where the shared code will live
   - Which files will be modified
   - Wait for user approval

4. **Implement the refactoring** (after approval):
   - Use Edit tool (prefer editing over rewriting)
   - Preserve exact behavior — no functional changes
   - Update all import paths

5. **Verify**:
   - `npm run typecheck` — no type errors
   - `npm run test` — no test failures
   - `npm run lint` — no lint errors

6. **Report**:
   - Files created (shared utilities/hooks/components)
   - Files modified (updated imports/usage)
   - Lines removed (deduplication savings)
   - Verification results (all pass/fail)

## Rules

- **NEVER** change functionality — refactoring is behavior-preserving
- **ALWAYS** present the plan before making changes
- **ALWAYS** verify with typecheck + tests after changes
- Prefer small, incremental extractions over large rewrites
- Don't create abstractions for one-time operations
