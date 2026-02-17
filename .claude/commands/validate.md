# Validate

Run the full validation suite and report a summary.

## Steps

1. Run `npm run lint` — report any ESLint errors
2. Run `npm run typecheck` — report any TypeScript errors
3. Run `npm run test` — report any test failures

Run all three in parallel since they are independent.

## Output

Report a summary table:

| Check     | Status    | Details              |
| --------- | --------- | -------------------- |
| Lint      | PASS/FAIL | N errors, N warnings |
| Typecheck | PASS/FAIL | N errors             |
| Tests     | PASS/FAIL | N passed, N failed   |

If all pass, report "All checks passed."
If any fail, list the specific errors with file paths and line numbers.

## Quality Metrics

After the pass/fail table, gather and report quality metrics:

1. **Test coverage inventory**:
   - Count total test files: `Glob("src/**/*.test.ts")` + `Glob("src/**/*.test.tsx")`
   - Count total API route files: `Glob("src/app/api/**/route.ts")`
   - Count total Zod validation files: `Glob("src/lib/validations/*.ts")` (exclude `types.ts` and `index.ts`)

2. **Missing test detection**:
   - For each API route file at `src/app/api/**/route.ts`, check if a co-located `route.test.ts` exists in the same directory
   - For each Zod validation file, check if a co-located `.test.ts` exists
   - List any files missing co-located tests

3. **Report format**:

```
## Quality Metrics

| Metric                        | Count |
| ----------------------------- | ----- |
| Test files                    | N     |
| API routes                    | N     |
| API routes with tests         | N/M   |
| Zod schemas                   | N     |
| Zod schemas with tests        | N/M   |

### API routes missing tests
- `src/app/api/example/route.ts`

### Zod schemas missing tests
- `src/lib/validations/example-schemas.ts`
```

4. **Regression flag**: If you have results from a previous run stored in context, compare counts and flag any metric that decreased (e.g., "Test files decreased from 165 to 161").
