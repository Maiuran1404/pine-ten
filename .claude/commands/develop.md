# Develop

End-to-end feature development workflow. Takes a feature description and runs a structured pipeline from planning through validation.

## Usage

```
/develop <feature description>
```

## Pipeline

### Phase 1: Plan

1. Enter plan mode via `EnterPlanMode`
2. Explore the codebase to understand what exists and what needs to change
3. Produce a scoped implementation plan covering:
   - Schema changes (if any)
   - API routes and Zod schemas
   - Components and hooks
   - Tests needed
   - Files to create vs modify
4. Wait for user approval before proceeding

### Phase 2: Implement (Sequential)

Execute in strict order — each step depends on the previous:

**Step 1: Schema (if needed)**

- Edit `src/db/schema.ts`
- Use the `db-migration` agent: generate migration, review SQL, apply migration
- Run `npm run typecheck` to verify

**Step 2: API Routes & Validation**

- Create/modify API route files using `withErrorHandling` pattern
- Create/modify Zod schemas in `src/lib/validations/`
- Follow all conventions from CLAUDE.md (named exports, server-only, auth checks, CSRF, rate limiting)

**Step 3: Components & Hooks**

- Create/modify React components in `src/components/`
- Create/modify hooks in `src/hooks/`
- If changes touch the briefing subsystem (`src/lib/ai/briefing-*.ts` or `src/components/chat/`), invoke the `briefing-architect` agent for review

**Step 4: Tests**

- Use the `test-writer` agent to generate co-located tests for:
  - New API routes (auth, validation, happy-path)
  - New Zod schemas (valid, invalid, edge cases)
- Run `npm run test` to verify tests pass

### Phase 3: Validate

Run the full validation suite:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`

Report the summary table and quality metrics as defined in `/validate`.

### Phase 4: Summary

Report:

- Files created (with paths)
- Files modified (with paths)
- Migration applied (if any)
- Tests added (count)
- Validation result (pass/fail)

## Rules

- **Never skip plan approval** — always wait for user confirmation after Phase 1
- **Sequential execution** — schema before API, API before components, components before tests
- **No partial delivery** — if any phase fails, stop and report the failure clearly
- **Atomic commits** — do not commit automatically; let the user decide when to commit
- **Briefing subsystem guard** — any changes to `src/lib/ai/briefing-*.ts` or `src/components/chat/` trigger the `briefing-architect` agent for review
