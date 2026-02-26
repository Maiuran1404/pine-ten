# First Principles Audit

Analyze the codebase from first principles — as if seeing it for the first time and asking "if I were building this today, what would I do differently?"

## Arguments

$ARGUMENTS — optional scope (e.g., "src/components/chat", "src/hooks", "briefing system", "state management"). If empty, audit the entire `src/` directory.

## Workflow

### Step 1: Scope Discovery

If a scope was provided, identify the relevant files and directories. If no scope, start with the highest-traffic areas:

1. Read `CLAUDE.md` to understand the intended architecture
2. Use Glob/Grep to map the file tree and identify the largest/most-complex modules
3. Identify the 3-5 subsystems that contain the most files or the most complexity

### Step 2: Deep Analysis

Launch the `first-principles` agent to perform the audit. Pass it the scope (or "full codebase" if unscoped).

The agent will work through 5 lenses:

1. **Complexity Audit** — what's more complex than the problem requires?
2. **Boundary Analysis** — are modules split along the right lines?
3. **State & Data Flow** — does state live where it's used?
4. **Bug Magnets** — where will the next 10 bugs come from?
5. **"If I Were Starting Today"** — what's the simplest architecture that works?

### Step 3: Interactive Review

Present findings one at a time, ordered by severity. For each finding:

1. Explain the current approach and why it's problematic
2. Describe what you'd build instead (concrete, not hand-wavy)
3. Estimate the migration path and effort
4. Use AskUserQuestion to get the user's take before moving to the next finding

Group findings into:

- **Act on now** — high impact, reasonable effort
- **Plan for** — high impact, needs design work
- **Accept for now** — low impact or high migration cost
- **Already known** — overlaps with CLAUDE.md "Known Fragile Areas"

### Step 4: Summary

After all findings are reviewed, produce a prioritized action plan based on the user's responses.

## Rules

- This is a thinking exercise, not a refactoring session — do NOT make code changes
- Be opinionated but honest about tradeoffs
- Respect that the codebase was built under real constraints — don't be dismissive
- Focus on structural/architectural issues, not code style or convention enforcement
- If the user disagrees with a finding, accept it gracefully and move on
- Don't resurface known issues from CLAUDE.md without adding new insight
