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
