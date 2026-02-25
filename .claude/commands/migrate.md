# Database Migration

Guided database schema migration workflow. Dispatches the `db-migration` agent for safe, step-by-step schema changes.

## Arguments

$ARGUMENTS — description of the schema change (e.g., "add `priority` column to tasks table", "create notifications table")

## Steps

1. **Understand the request** — Parse the schema change description from arguments
2. **Explore current schema** — Read `src/db/schema.ts` and identify the tables/relations affected
3. **Dispatch the `db-migration` agent** to execute the migration workflow:
   - Edit `src/db/schema.ts` with the required changes
   - Run `npm run db:generate` to create the migration SQL
   - Read and review the generated migration file for:
     - No accidental `DROP TABLE` or `DROP COLUMN` statements
     - Proper indexes on foreign keys
     - Sensible default values
     - No unintended side effects
   - **Show the migration SQL to the user and wait for approval before applying**
   - Run `npm run db:migrate` to apply the migration
   - Run `npm run typecheck` to verify no type breakage
4. **Report results**:
   - Schema changes made (tables/columns added/modified)
   - Migration file path and name
   - Typecheck result (pass/fail)

## Safety Rules

- **NEVER** drop columns or tables without explicit user confirmation
- **NEVER** run seed scripts (data loss risk)
- **NEVER** use `db:push` — always go through the migration workflow
- **ALWAYS** show generated SQL to the user before applying
- If the migration contains destructive operations, warn the user prominently before proceeding
