# Fix TypeScript Errors

Find and fix all TypeScript errors in the codebase without using `any` or `@ts-ignore`.

## Steps

1. Run `npm run typecheck` to get all current TypeScript errors
2. For each error, read the relevant file and fix the type issue properly:
   - Add missing type annotations
   - Fix type mismatches with correct types
   - Add missing imports
   - Fix incorrect generic parameters
   - Handle nullable types with proper guards
3. **NEVER** use `any`, `@ts-ignore`, or `@ts-expect-error` as fixes
4. After fixing all errors, run `npm run typecheck` again to verify zero errors
5. Run `npm run test` to ensure fixes didn't break tests

## Output

Report what was fixed:

- Number of errors found
- List of files changed with descriptions of fixes
- Final typecheck result (should be 0 errors)
