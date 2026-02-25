# Check Ready

Pre-push safety gate. Runs all quality checks and flags issues that would cause CI failure or code quality problems.

## Steps

Run all checks and report a comprehensive readiness assessment.

### 1. Code Quality (parallel)

Run these three in parallel:

- `npm run lint -- --max-warnings 0` — must match CI exactly (zero warnings)
- `npm run typecheck`
- `npm run test`

### 2. Debug Artifact Scan

Scan staged and unstaged changes for debug leftovers:

```
git diff --cached --name-only
git diff --name-only
```

In those changed files, search for:

- `console.log` / `console.debug` / `console.info` (not `console.error`)
- `debugger` statements
- `// @ts-ignore` or `// @ts-expect-error`
- `any` type usage (new occurrences only — compare with base branch)

### 3. Test Coverage Check

For each file in the diff:

- If it's an API route (`src/app/api/**/route.ts`), check for co-located `route.test.ts`
- If it's a Zod schema (`src/lib/validations/*.ts`), check for co-located `.test.ts`
- Flag any new routes or schemas without tests

### 4. Env Var Check

Search changed files for new `process.env.` references and verify they exist in `src/lib/env.ts`.

### 5. Commit Message Suggestion

Analyze the staged diff and suggest a conventional commit message:

- Determine prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Write a concise summary line (under 72 chars)
- Suggest a body with what/why/how

## Output

```
## Readiness Report

| Check              | Status    | Details                    |
| ------------------ | --------- | -------------------------- |
| Lint               | PASS/FAIL | N errors, N warnings       |
| Typecheck          | PASS/FAIL | N errors                   |
| Tests              | PASS/FAIL | N passed, N failed         |
| Debug artifacts    | PASS/WARN | N found                    |
| Test coverage      | PASS/WARN | N files missing tests      |
| Env vars           | PASS/WARN | N unregistered vars        |

## Verdict: READY / NOT READY / READY WITH WARNINGS

## Suggested Commit Message
<conventional commit message>
```

If NOT READY, list every blocking issue with file:line.
If READY WITH WARNINGS, list non-blocking issues the developer should be aware of.
