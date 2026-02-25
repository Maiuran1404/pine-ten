# Visual Verify

Visually verify UI changes in the browser. Takes screenshots at desktop and mobile breakpoints, checks console errors, and reports issues.

## Usage

```
/verify [file paths or page URLs]
```

- With arguments: verify the specified files or URLs
- Without arguments: auto-detect changed `.tsx` files from `git diff --name-only`

## Pipeline

### Step 1: Detect Targets

If `$ARGUMENTS` is provided, parse it as file paths or URLs. Otherwise:

```bash
git diff --name-only HEAD
```

Filter to `.tsx` files only. If no `.tsx` files changed, report "No UI files to verify" and stop.

### Step 2: Map Files to URLs

Read `.claude/url-map.md` and match each changed file to its browser URL:

1. **Page files** (`src/app/**/page.tsx`): look up directly in the Route Groups tables
2. **Component files** (`src/components/**`): look up in the Component-to-Page Mapping table
3. **Unmapped files**: grep for the component's export name in page files to find the importing page
4. **Dynamic routes** (`[id]`, `[token]`): flag in the report that a real ID is needed — skip auto-verify for these

Deduplicate URLs. Cap at 5 pages per run. If more than 5 pages are affected, verify the 5 most likely to be impacted and list the rest as "skipped — verify manually".

### Step 3: Check Dev Server

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If the server is not running (connection refused or non-200):

1. Start it: `npm run dev` (run in background)
2. Poll `curl localhost:3000` every 2 seconds, up to 15 seconds
3. If still not responding after 15s, report "Dev server failed to start" and stop

### Step 4: Verify Each Page

For each URL (max 5):

#### 4a. Open the page

- Call `tabs_context_mcp` to get existing tabs (or create a group)
- Create a new tab via `tabs_create_mcp`
- Navigate to the URL via `navigate`

#### 4b. Desktop verification (1280x900)

- Resize window to 1280x900 via `resize_window`
- Wait 2 seconds for render (`computer` action: `wait`, duration: 2)
- Take a screenshot (`computer` action: `screenshot`)
- Check console for errors: `read_console_messages` with `onlyErrors: true`

#### 4c. Mobile verification (375x812)

- Resize window to 375x812
- Wait 1 second for reflow
- Take a screenshot

#### 4d. Analyze

Examine both screenshots for:

- **Render errors**: blank screens, error boundaries, hydration mismatches
- **Layout issues**: overlapping elements, broken flexbox/grid
- **Overflow**: horizontal scroll, content cut off
- **Spacing**: inconsistent gaps, elements touching edges
- **Text**: truncation without ellipsis, unreadable font sizes
- **Missing elements**: expected components not rendering
- **Console errors**: React errors, failed API calls, undefined references

### Step 5: Check Agentation Annotations

Call `agentation_get_all_pending` to check for any pending human annotations from the browser.

If annotations exist:

1. Acknowledge each annotation via `agentation_acknowledge`
2. Include them in the report as "Human Feedback" items

### Step 6: Report

Output a summary table:

```
## Visual Verification Report

| Page | Desktop | Mobile | Console | Status |
|------|---------|--------|---------|--------|
| /dashboard/chat | OK | Overflow detected | 0 errors | NEEDS FIX |
| /dashboard | OK | OK | 2 errors | NEEDS FIX |
| /login | OK | OK | 0 errors | PASS |
```

For each issue, provide:

- Screenshot reference (the tool will have shown it inline)
- Specific description of the problem
- Suggested fix (file and approximate location)

If there are pending agentation annotations, list them:

```
### Human Annotations
- [annotation-id]: "Button text is cut off on mobile" (on /dashboard/chat)
```

### Step 7: Fix Loop

If issues were found:

1. List all issues and ask the user: "Should I fix these issues?"
2. If confirmed, fix each issue
3. Re-run verification ONLY on the affected pages (not all pages)
4. For agentation annotations: fix the issue, reply to the annotation with what changed via `agentation_reply`, then resolve via `agentation_resolve` after user confirms

Repeat until all pages pass or user says to stop.

## Rules

- **Never skip mobile verification** — responsive issues are the most common bugs
- **Always check console errors** — they reveal runtime issues screenshots miss
- **Report before fixing** — never auto-fix without showing the user what's wrong first
- **Auth-gated pages**: if the page redirects to login or shows unauthorized, flag it in the report as "Auth required — not logged in". Never enter credentials.
- **Dynamic routes** (`/tasks/[id]`): flag that a real ID is needed. Ask the user for one or skip.
- **Max 5 pages per run** — keeps verification focused and fast
- **Re-verify only affected pages** — after fixes, don't re-check pages that already passed
