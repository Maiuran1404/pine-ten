# QA Stress Test

Run autonomous E2E QA stress tests against the Pine Ten application using Chrome browser automation.

## Usage

```
/qa [target] [options]
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

| Flag         | Values                                           | Default  | Description                              |
| ------------ | ------------------------------------------------ | -------- | ---------------------------------------- |
| `--depth`    | `shallow`, `normal`, `deep`                      | `normal` | Test intensity level                     |
| `--flows`    | 1-10                                             | 5        | Number of test scenarios per target area |
| `--viewport` | `desktop`, `mobile`, `both`                      | `both`   | Viewport sizes to test                   |
| `--focus`    | `regression`, `adversarial`, `happy-path`, `all` | `all`    | What type of test scenarios to generate  |

## Pipeline

### Step 1: Parse Arguments

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

3. Validate: flows must be 1-10, depth/viewport/focus must be valid values.

### Step 2: Dispatch QA Stress Test Agent

**IMPORTANT**: Use `subagent_type: "general-purpose"` (NOT `"qa-stress-test"`). Custom agent types cannot access Chrome MCP tools — only `general-purpose` agents have access to `mcp__claude-in-chrome__*` tools needed for browser automation.

Before dispatching, read the full agent instructions from `.claude/agents/qa-stress-test.md` and include them in the prompt.

Launch a `general-purpose` agent with:

```
You are the QA Stress Test agent. Follow the instructions below exactly.

[Paste full contents of .claude/agents/qa-stress-test.md here]

## Test Configuration

Target: [parsed target]
Depth: [parsed depth]
Flows: [parsed flows count]
Viewport: [parsed viewport]
Focus: [parsed focus]

Run autonomous QA stress tests on the Pine Ten application.
Follow the 5-phase methodology from the instructions above.

IMPORTANT: You MUST use Chrome browser automation. Start by calling mcp__claude-in-chrome__tabs_context_mcp to connect to Chrome, then create a new tab via mcp__claude-in-chrome__tabs_create_mcp. Only fall back to static analysis if Chrome is genuinely unavailable (extension not connected).
```

### Step 3: Report Results

When the agent completes, display the QA report to the user with:

1. Summary counts (Critical/High/Medium/Low)
2. Any critical or high issues highlighted
3. Offer to create tasks for fixing discovered issues

## Examples

```
/qa video
```

Test video creation flow with default settings (5 flows, normal depth, both viewports, all focus areas).

```
/qa full --depth deep --flows 3
```

Test all areas with deep adversarial testing, 3 flows per area.

```
/qa auth --focus regression
```

Test auth flows focusing on known regressions from CLAUDE.md Known Fragile Areas.

```
/qa onboarding --viewport mobile --depth shallow
```

Quick mobile-only test of the onboarding flow.

```
/qa
```

Auto-detect changed areas from recent git history and test them.
