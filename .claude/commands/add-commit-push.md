# Add, Commit, Push & Merge

Stage changes, validate, commit, push, and merge into main. Zero dirty state when done.

## Step 0: Environment & Context

1. Run these in parallel to establish context:
   - `git status` — untracked + modified files
   - `git diff && git diff --cached` — unstaged + staged changes
   - `git log --oneline -5` — recent commit style
   - `git branch --show-current` — current branch name
   - `ls node_modules/.package-lock.json 2>/dev/null` — check if deps are installed
2. If `node_modules` is missing or stale, run `npm install` before proceeding.
3. Determine if we're in a **git worktree** by checking if `.git` is a file (not a directory): `test -f .git && echo "worktree" || echo "main-repo"`
   - If worktree: find the main worktree path via `git worktree list | head -1 | awk '{print $1}'`
   - Store the main worktree path and feature branch name for Phase 2.

## Phase 1: Add, Commit & Push

### Review Changes

4. Review ALL changes carefully:
   - Identify what was added, modified, or deleted
   - Group changes by logical concern (feat, fix, refactor, test, chore)
   - Check for files that should NOT be committed (`.env`, credentials, large binaries)
   - If sensitive files are found, warn the user and exclude them

### Validate (run lint + typecheck in parallel)

5. Run these TWO checks **in parallel**:
   - `npm run lint -- --max-warnings 0`
   - `npm run typecheck`
6. Analyze results:
   - If errors exist ONLY in files we changed → fix them, re-run
   - If errors are ONLY in files we did NOT change → these are pre-existing, note them but proceed
   - If mix → fix our errors, note the pre-existing ones
7. Run `npx vitest run --changed HEAD~1` — if failures are only in files we didn't touch, note and proceed.

### Commit

8. Stage files using `git add` with specific file paths (never `git add -A` if sensitive files present)
9. Write a conventional commit message:
   - Prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
   - First line: concise summary under 72 chars
   - Body: WHAT changed, WHY, HOW
   - End with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
10. Commit using a HEREDOC for formatting.

### Post-commit cleanup

11. Run `git status` immediately after commit.
    - If lint-staged/prettier left modified files → stage + commit as `chore: apply lint-staged formatting`
    - Repeat until working tree is clean.

### Push

12. Push to the current remote branch:
    - If no upstream: `git push -u origin <branch-name>`
    - Otherwise: `git push`
13. **If the Husky pre-push hook fails** on pre-existing errors (errors only in files NOT part of this commit):
    - Do NOT ask the user. Use `git push --no-verify` automatically.
    - Report that pre-existing errors were bypassed in the output.
14. Run `git status` — must be clean. If not, go back to step 11.

## Phase 2: Merge into Main

15. If already on `main` → skip, report "Already on main, nothing to merge".

### Worktree-aware merge

16. **If in a worktree** (detected in Step 0):
    - `cd` to the main worktree path found in Step 0
    - Run `git status` there to check for dirty state
    - **If main worktree has uncommitted changes**: run `git stash push -m "auto-stash before merge from <branch-name>"`. NEVER commit other sessions' WIP — stash it and restore after.
    - `git pull origin main` to get latest
    - `git merge <feature-branch-name> --no-ff`
    - Handle conflicts (see step 18)
    - Push main: `git push origin main` (use `--no-verify` if pre-existing errors)
    - **If we stashed**: run `git stash pop` to restore the WIP
    - `cd` back to the worktree

17. **If NOT in a worktree** (normal repo):
    - `git checkout main && git pull origin main`
    - `git merge <feature-branch-name> --no-ff`
    - Handle conflicts (see step 18)
    - Push main: `git push origin main` (use `--no-verify` if pre-existing errors)
    - `git checkout <feature-branch-name>` to return

### Conflict resolution

18. **If merge conflicts occur**:
    - List conflicted files: `git diff --name-only --diff-filter=U`
    - For EACH file, show the conflict markers + surrounding context
    - **ASK the user** for each conflict:
      - Keep main's version ("theirs")
      - Keep feature branch version ("ours")
      - Manual resolution (user provides content)
    - Stage resolved files, run typecheck + lint to verify
    - Complete merge with `git commit`

19. Final `git status` in both worktrees (if applicable) — confirm clean state.

## Critical Rules

- NEVER commit other sessions' uncommitted work on main. Always stash + restore.
- NEVER force-push to main. If push fails due to remote changes, ask the user.
- NEVER auto-resolve merge conflicts. Always ask the user.
- Pre-existing errors (in files we didn't change) should be bypassed with `--no-verify`, not asked about.
- Run lint + typecheck in parallel to save time.
- Detect worktree vs normal repo ONCE at the start, not when the merge fails.

## Output

Report:

- **Validation**: lint PASS/FAIL, typecheck PASS/FAIL, tests PASS/FAIL/N/A
- **Pre-existing issues**: list any bypassed errors (if any)
- **Branch**: feature branch name
- **Commit**: hash (short)
- **Message**: commit message
- **Files**: count and list
- **Push (branch)**: SUCCESS
- **Merge into main**: SUCCESS / SUCCESS (conflicts resolved) / SKIPPED
- **Push (main)**: SUCCESS / SKIPPED
- **Stash**: restored / N/A
- **Final branch**: current branch at end
- **Working tree**: clean
