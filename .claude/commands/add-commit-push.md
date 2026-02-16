# Add, Commit & Push

Stage all changes, write a detailed conventional commit message, commit, and push to the remote.

## Steps

1. Run `git status` to see all untracked and modified files
2. Run `git diff` to see unstaged changes and `git diff --cached` to see already-staged changes
3. Run `git log --oneline -5` to see recent commit message style
4. Review ALL changes carefully:
   - Identify what was added, modified, or deleted
   - Group changes by logical concern (e.g. feature, fix, refactor, test, chore)
   - Check for files that should NOT be committed (`.env`, credentials, large binaries, node_modules)
   - If any sensitive files are found, warn the user and exclude them
5. Stage all appropriate files using `git add` with specific file paths (avoid `git add -A` if sensitive files are present)
6. Write a detailed conventional commit message following the project format:
   - Use the correct prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
   - First line: concise summary under 72 characters
   - Blank line, then a detailed body explaining:
     - WHAT changed (list key files/components affected)
     - WHY it changed (motivation, issue being solved)
     - HOW it changed (approach taken, notable decisions)
   - Add `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` at the end
7. Create the commit using a HEREDOC for proper formatting
8. Push to the current remote branch with `git push`
   - If the branch has no upstream, use `git push -u origin <branch-name>`
9. Run `git status` after push to confirm clean working tree

## Output

Report:

- Branch name
- Commit hash (short)
- Commit message used
- Files committed (count and list)
- Push status (success/failure)
