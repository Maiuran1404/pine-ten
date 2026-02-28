# Add, Commit, Push & Merge

Stage ALL changes, run pre-push validation (lint + typecheck + affected tests), write a detailed conventional commit message, commit, push to the remote, and merge the current branch into main. NEVER leave dirty state behind.

## Steps

### Phase 1: Add, Commit & Push

1. Run `git status` to see all untracked and modified files
2. Run `git diff` to see unstaged changes and `git diff --cached` to see already-staged changes
3. Run `git log --oneline -5` to see recent commit message style
4. Review ALL changes carefully:
   - Identify what was added, modified, or deleted
   - Group changes by logical concern (e.g. feature, fix, refactor, test, chore)
   - Check for files that should NOT be committed (`.env`, credentials, large binaries, node_modules)
   - If any sensitive files are found, warn the user and exclude them
5. **Pre-push validation** — run these checks BEFORE committing to catch issues early:
   - Run `npm run lint -- --max-warnings 0` — this mirrors the CI check exactly. Fix ALL errors and warnings (prefix unused vars with `_`, remove unused imports, etc.). Re-run lint until it passes cleanly with zero errors and zero warnings.
   - Run `npm run typecheck` — abort and fix any TypeScript errors before proceeding
   - Run `npx vitest run --changed HEAD~1` — run tests affected by changed files
   - If ANY check fails: report the errors, fix them, and re-run validation until ALL THREE pass
   - Do NOT proceed to staging/committing until validation passes
6. Stage ALL files using `git add` with specific file paths (avoid `git add -A` if sensitive files are present)
7. Write a detailed conventional commit message following the project format:
   - Use the correct prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
   - First line: concise summary under 72 characters
   - Blank line, then a detailed body explaining:
     - WHAT changed (list key files/components affected)
     - WHY it changed (motivation, issue being solved)
     - HOW it changed (approach taken, notable decisions)
   - Add `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` at the end
8. Create the commit using a HEREDOC for proper formatting
9. IMPORTANT — Post-commit lint-staged cleanup:
   - Run `git status` immediately after the commit
   - If there are ANY modified files (lint-staged/prettier often reformat files during the pre-commit hook, leaving unstaged changes behind), stage them ALL and create a follow-up commit:
     - `git add <all dirty files>`
     - `git commit -m "chore: apply lint-staged formatting"`
   - Repeat until `git status` shows a completely clean working tree
10. Push to the current remote branch with `git push`
    - If the branch has no upstream, use `git push -u origin <branch-name>`
    - Note: the Husky pre-push hook will also run typecheck + changed tests as a safety net
11. Run `git status` one final time to confirm clean working tree. If it is NOT clean, go back to step 9.

### Phase 2: Merge into Main

12. Determine the current branch name with `git branch --show-current`
    - If already on `main`, skip the merge phase entirely and report "Already on main, nothing to merge"
13. Fetch latest main: `git fetch origin main`
14. Switch to main: `git checkout main` and pull latest: `git pull origin main`
15. Merge the feature branch into main: `git merge <branch-name> --no-ff`
    - The `--no-ff` flag ensures a merge commit is created for clean history
16. **Handle merge conflicts** — if the merge produces conflicts:
    - Run `git diff --name-only --diff-filter=U` to list ALL conflicted files
    - For EACH conflicted file, show the user the conflict markers and surrounding context
    - **ASK the user** how they want to resolve each conflict — present clear options:
      - Keep the version from main ("theirs")
      - Keep the version from the feature branch ("ours")
      - Manually specify the resolution (user provides the content)
    - Apply the user's chosen resolution for each file
    - Stage resolved files with `git add <file>`
    - After ALL conflicts are resolved, run `npm run typecheck` and `npm run lint -- --max-warnings 0` to verify the merge is clean
    - Complete the merge with `git commit` (the merge commit message is auto-generated)
17. If the merge succeeds cleanly (no conflicts), push main: `git push origin main`
18. Switch back to the feature branch: `git checkout <branch-name>`
19. Run `git status` to confirm clean state

## CRITICAL RULES

- The working tree MUST be clean after this command finishes. No modified files, no untracked files (except intentionally gitignored ones). If lint-staged, prettier, or any pre-commit hook modifies files during the commit, those modifications MUST be committed in a follow-up commit before pushing.
- NEVER force-push to main. If the push to main fails due to remote changes, ask the user before proceeding.
- NEVER auto-resolve merge conflicts. ALWAYS show the conflicts to the user and ask for their decision.
- If ANY validation fails after conflict resolution, report the errors and ask the user how to proceed.

## Output

Report:

- **Validation**: lint PASS/FAIL, typecheck PASS/FAIL, affected tests PASS/FAIL (N passed, N failed)
- **Branch**: feature branch name
- **Commit**: hash(es) (short)
- **Message**: commit message(s) used
- **Files**: count and list
- **Push (branch)**: success/failure
- **Merge into main**: success/failure/conflicts resolved
- **Push (main)**: success/failure
- **Final branch**: which branch you're on at the end
- **Working tree**: must be clean
