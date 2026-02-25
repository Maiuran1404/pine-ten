# Cleanup

Remove debug artifacts, dead code, and development leftovers from staged or working files.

## Arguments

$ARGUMENTS — optional scope: "staged" (default, only staged files), "all" (entire src/), or a specific file/directory path.

## Steps

1. **Determine scope**:
   - No arguments or "staged" → run `git diff --cached --name-only` to get staged files, fall back to `git diff --name-only` for unstaged changes
   - "all" → scan entire `src/` directory
   - Specific path → scan that path only

2. **Scan for debug artifacts** in the scoped files:

   | Pattern             | Search                                                                                   | Action                                    |
   | ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
   | Console statements  | `console.log`, `console.debug`, `console.info`, `console.warn` (but NOT `console.error`) | Remove                                    |
   | Debugger statements | `debugger`                                                                               | Remove                                    |
   | TODO/FIXME comments | `// TODO`, `// FIXME`, `// HACK`, `// XXX`                                               | List for user review (do not auto-remove) |
   | Commented-out code  | Multi-line `/* ... */` or consecutive `//` lines containing code                         | Flag for user review                      |
   | Test-only code      | `console.log` in test files                                                              | Skip (acceptable in tests)                |

3. **For each finding**:
   - Show the file, line number, and the line content
   - Auto-remove `console.log`, `console.debug`, `console.info`, and `debugger` statements
   - For `console.warn` — only remove if it looks like a debug statement, not a legitimate warning
   - For TODO/FIXME — list them but do NOT remove (user decides)
   - For commented-out code — flag it but do NOT remove (user decides)

4. **After cleanup**, run:
   - `npm run lint` to verify no lint errors introduced
   - `npm run typecheck` to verify no type errors

5. **Report**:

   | Category           | Found | Removed | Flagged |
   | ------------------ | ----- | ------- | ------- |
   | console.log/debug  | N     | N       | -       |
   | debugger           | N     | N       | -       |
   | TODO/FIXME         | N     | -       | N       |
   | Commented-out code | N     | -       | N       |

   List any TODO/FIXME items with file:line for manual review.

## Rules

- **NEVER** remove `console.error` — these are intentional error logging
- **NEVER** remove console statements inside `catch` blocks — these are error handlers
- **NEVER** remove logging that uses the project's `logger` (from `@/lib/logger`)
- **NEVER** auto-remove TODO/FIXME — only flag them
- Skip test files (`*.test.ts`, `*.test.tsx`) unless explicitly asked
