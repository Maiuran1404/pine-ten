# QA Fix

Run QA stress tests then trace findings to root causes and design elegant minimal fixes.

Two agents, one command: the QA agent finds symptoms, the solution architect finds causes and cures.

## Usage

```
/qa-fix [target] [options]
```

## Arguments

Parse `$ARGUMENTS` for the target area and optional flags.

### Target areas

| Target       | What it tests                                                            |
| ------------ | ------------------------------------------------------------------------ |
| `video`      | Video creation briefing flow (chat -> narrative -> storyboard -> submit) |
| `design`     | Design/branding briefing flow                                            |
| `social`     | Social media content briefing flow                                       |
| `website`    | Website design briefing flow                                             |
| `onboarding` | New user onboarding + first chat experience                              |
| `tasks`      | Task management across client, freelancer, and admin portals             |
| `auth`       | Login, signup, role switching, redirect flows                            |
| `credits`    | Credit purchase and usage flows                                          |
| `full`       | All target areas sequentially                                            |

### Flags

| Flag        | Values                      | Default  | Description                                             |
| ----------- | --------------------------- | -------- | ------------------------------------------------------- |
| `--depth`   | `shallow`, `normal`, `deep` | `normal` | QA intensity level                                      |
| `--skip-qa` | flag                        | off      | Skip browser QA, use static analysis + fix history only |

## Pipeline

### Step 1: Parse & Run QA

Parse `$ARGUMENTS` into config:

```
Arguments: $ARGUMENTS
```

**Parsing rules:**

1. First non-flag word is the target. If no target specified, auto-detect from changed files:

   ```bash
   git diff --name-only HEAD~5
   ```

   Map changed files to target areas:
   - `src/components/chat/*`, `src/hooks/use-chat-*` -> `video` (default content type)
   - `src/app/(auth)/onboarding/*` -> `onboarding`
   - `src/app/(auth)/login/*`, `src/app/(auth)/register/*` -> `auth`
   - `src/app/(client)/dashboard/tasks/*` -> `tasks`
   - `src/app/(client)/dashboard/credits/*` -> `credits`
   - `src/app/(client)/dashboard/brand/*` -> `design`
   - If multiple areas changed, test all of them
   - If no UI files changed, default to `full` with `--depth shallow`

2. Parse flags with their values. Unrecognized flags are ignored.

**If `--skip-qa` is set:** Skip to Step 2 in static analysis mode — no browser QA.

**Otherwise:** Dispatch the `qa-stress-test` agent:

```
Target: [parsed target]
Depth: [parsed depth]
Flows: 3
Viewport: both
Focus: all

Run autonomous QA stress tests on the Pine Ten application.
Follow the 5-phase methodology defined in your agent instructions.
```

**Browser automation priority**:

1. **Chrome first** — try connecting via `tabs_context_mcp`. If Chrome responds, use the Claude-in-Chrome MCP tools for full interactive testing.
2. **Playwright fallback** — if Chrome is unavailable (extension not responding, no connection after 2 attempts), fall back to Playwright via Bash. Run headless Chromium tests using the existing `playwright.config.ts` and `e2e/` test directory, or generate ad-hoc Playwright scripts for the target area.
3. **Static analysis last resort** — if both Chrome and Playwright fail (e.g., no browsers installed, Playwright not available), fall back to code-level static analysis.

The QA agent handles this cascade automatically — no flag needed.

### Step 2: Run Solution Architect

Gather context for the solution architect:

1. **QA findings** from Step 1 (or note that we're in static analysis mode)
2. **Known Fragile Areas** — read from CLAUDE.md
3. **Recent fix history**:
   ```bash
   git log --oneline -30 --grep="fix" -- [target paths]
   ```
4. **Recent fix diffs** — for the last 5 fix commits in the target area, read their diffs

Dispatch the `solution-architect` agent with all gathered context:

```
## Target
[parsed target area]

## QA Findings
[Full QA report from Step 1, or "Static analysis mode — no browser QA available"]

## Known Fragile Areas (from CLAUDE.md)
[Paste the Known Fragile Areas section]

## Recent Fix History
[Output of git log]

## Recent Fix Diffs
[Diffs from last 5 fix commits]

Trace these symptoms to root causes and produce decision records.
Follow the methodology defined in your agent instructions.
```

### Step 3: Present & Act

Display the solution architect's decision records to the user:

1. Show each decision record ordered by leverage (most bugs killed per fix first)
2. Show the impact summary
3. Ask: **"Which decisions do you want to implement? (all / pick by number / none)"**
4. If user picks decisions: begin implementation starting with highest-leverage decision

No approval gates between QA and architecture — deliver the full analysis, then let the user decide what to implement.

## Examples

```
/qa-fix video
```

Full pipeline: QA stress test the video flow, then trace findings to root causes and propose fixes.

```
/qa-fix video --depth shallow
```

Quick QA pass on video flow, then root cause analysis.

```
/qa-fix --skip-qa
```

Skip browser testing. Analyze using code inspection, git fix history, and known fragile areas. Auto-detect target from recent changes.

```
/qa-fix auth --skip-qa
```

Static analysis only on the auth subsystem — mine fix history and code patterns for root causes.

```
/qa-fix full --depth deep
```

Deep QA across all areas, then comprehensive root cause analysis.
