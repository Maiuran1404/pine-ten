# Add Environment Variable

Scaffold a new environment variable across all required files in one step.

## Arguments

$ARGUMENTS — variable name, type hint, and optionality (e.g., "ACME_API_KEY string required", "NEXT_PUBLIC_FEATURE_FLAG boolean optional")

## Steps

1. **Parse arguments** to extract:
   - Variable name (e.g., `ACME_API_KEY`)
   - Type/format hint: `string`, `url`, `email`, `key` (has a prefix), or a specific prefix like `sk-`
   - Required or optional
   - If not enough info provided, ask the user

2. **Determine Zod validator** based on type:
   - `string` → `z.string().min(1)`
   - `url` → `z.string().url()`
   - `email` → `z.string().email()`
   - `key` with prefix → `z.string().startsWith('<prefix>')`
   - `boolean` → `z.string().transform(v => v === 'true').optional()`
   - Add `.optional()` if the variable is optional

3. **Determine the section** in `src/lib/env.ts`:
   - `NEXT_PUBLIC_*` → near other public vars
   - `*_API_KEY` → near other API keys
   - `*_SECRET` → near other secrets
   - Otherwise → add a new commented section

4. **Update files**:

   **`src/lib/env.ts`** — Add the variable to `envSchema` with:
   - A comment explaining what it's for
   - The appropriate Zod validator
   - Placed in the correct section (grouped with related vars)

   **`.env.example`** — Add the variable with a placeholder value and comment:

   ```
   # Description of what this var is for
   ACME_API_KEY=your-acme-api-key-here
   ```

   **`.github/workflows/ci.yml`** — If the variable is required (not optional), add a mock value to the CI env block so builds don't fail. Use a clearly fake value (e.g., `sk-ant-test-key-for-ci`).

   **`src/lib/env.ts` `checkEnvHealth()`** — If the variable is required and critical for app startup, add it to the `required` array.

5. **Verify** — Run `npm run typecheck` to confirm the new env type is available

6. **Report**:
   - Variable name and Zod type
   - Files modified (with line numbers)
   - Reminder to add the actual value to `.env.local`

## Rules

- **NEVER** add the actual secret value — only placeholders
- **NEVER** edit `.env` or `.env.local` directly (blocked by hooks)
- Variables with `SECRET`, `KEY`, or `TOKEN` in the name must NEVER be `NEXT_PUBLIC_`
- If a `NEXT_PUBLIC_` variable contains `SECRET` or `KEY`, warn the user about client exposure
