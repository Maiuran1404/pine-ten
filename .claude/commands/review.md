# Review Staged Changes

Review all staged git changes for code quality, security, and adherence to project conventions.

## Steps

1. Run `git diff --cached --name-only` to list staged files
2. Run `git diff --cached` to see the full diff
3. For each changed file, check:
   - TypeScript strict compliance (no `any`, no `@ts-ignore`)
   - API routes use `withErrorHandling` and validate with Zod first
   - Named exports (except pages/layouts)
   - `server-only` import on server modules
   - No Supabase service role key in client code
   - New env vars added to `src/lib/env.ts`
   - kebab-case file names
   - Rate limiting on public endpoints
   - CSRF validation on mutations
4. Check if new API routes have corresponding tests
5. Check if new Zod schemas have corresponding tests
6. Summarize findings with file paths and line numbers

## Output

For each file: list issues found or mark as PASS.
End with: total files reviewed, issues found, recommended actions.
