# Crafted — Chat Flow Bug & UX Fix Report

> Generated from manual end-to-end testing of the creative briefing chat flow across Launch Videos, Landing Pages, and Content Calendar categories. Each bug includes reproduction steps, root-cause hints, and the expected fix.

---

## How to Use This Document

Work through issues in priority order (P0 first). Each issue has:

- **Repro steps** so you can verify the bug exists
- **Root-cause hints** pointing to likely files/functions
- **Expected behavior** describing the fix
- **Acceptance criteria** for when it's done

Run `npm run validate` after each fix. Commit each fix individually per the project's multi-fix workflow.

---

## P0 — Critical (Must Fix)

### BUG-001: `/dashboard/undefined` 404 crash on "You decide & submit"

**What happens:** Clicking the "You decide & submit" suggestion chip navigates to `http://localhost:3000/dashboard/undefined` — a 404 page. The user's entire chat session is lost with no recovery.

**Repro:**

1. Go to dashboard, click "Launch Videos" template chip
2. Select "Product Launch Video", add details, click Continue
3. Chat with AI until the scene refinement step appears
4. Click "You decide & submit"
5. Page navigates to `/dashboard/undefined` → 404

**Root-cause hints:**

- The "You decide & submit" chip likely triggers a navigation using a variable (e.g., `taskId`, `draftId`, or a route path) that is `undefined` at that point in the flow
- Look in `src/components/chat/chat-interface.tsx` or `src/components/chat/chat-input-area.tsx` for the handler that processes the "You decide & submit" chip click
- Check if a `draftId` or navigation target is being read before it's been set
- The bug may be specific to the template entry flow (Launch Videos chip → modal → chat) vs the free-form flow where it works

**Expected behavior:** Clicking "You decide & submit" should trigger the submission summary within the current chat page (same behavior as the free-form flow where it works correctly). It should never navigate away from the chat.

**Acceptance criteria:**

- [ ] "You decide & submit" works from both template and free-form entry flows
- [ ] No navigation occurs — submission bar appears inline
- [ ] No `undefined` values in any constructed URLs

---

### BUG-002: `undefined` string leaks into AI response text

**What happens:** The AI chat response contains the literal string `"undefined"` concatenated into the text. Example: `"...natural wellness routines?undefined"`

**Repro:**

1. Click "Social Media" template chip on dashboard
2. Select Instagram + TikTok, add details about a skincare brand
3. Click Continue, select "Build launch awareness" chip
4. Read the AI response — it ends with `"?undefined"`

**Root-cause hints:**

- Look in `src/lib/ai/briefing-state-machine.ts` or the prompt builder logic
- A variable being interpolated into the system prompt or user context is `undefined`
- Check the inference engine where it builds context strings — likely a field like `brandContext`, `audienceInsight`, or `clarifyingContext` that hasn't been set
- Search for string template literals that concatenate optional values without null checks: `` `${someVar}` `` where `someVar` can be undefined

**Expected behavior:** No `undefined` strings should ever appear in AI responses. All template variables must have fallbacks or be omitted when not set.

**Acceptance criteria:**

- [ ] No `"undefined"` text in any AI response across all flow types
- [ ] All string interpolations in prompt builders have null/undefined guards

---

### BUG-003: Tasks assigned to the client or test users instead of freelancers

**What happens:** After submission, the success screen shows:

- "Maiuran Loganathan has been assigned to work on your project" (the submitting CLIENT, not a freelancer)
- "Test Artist User has been assigned" (test data in the database)

**Repro:**

1. Complete any chat flow to submission
2. Click "Confirm & Submit"
3. Read the success message — it names the wrong person

**Root-cause hints:**

- Look in `POST /api/tasks` route (likely `src/app/api/tasks/route.ts`)
- The freelancer assignment algorithm may be falling back to the first user in the DB when no freelancers match
- Check the `taskOffers` creation logic and the ranking/assignment algorithm
- The `freelancerProfiles` table may be empty or the query may not filter by role correctly
- Look for where the success message is constructed — it may read from `task.assignedFreelancerId` which could be null/wrong

**Expected behavior:** Tasks should either:

1. Be assigned to a qualified freelancer (if available), OR
2. Show "Your task is pending assignment — we'll notify you when a designer picks it up" (if no freelancer available)

Never assign back to the client. Never expose test user names.

**Acceptance criteria:**

- [ ] Tasks are never assigned to the submitting client
- [ ] If no freelancer is available, show a "pending assignment" message
- [ ] Test user data is not visible in any user-facing strings
- [ ] Success screen shows correct freelancer name or pending state

---

### BUG-004: Content calendar submissions titled as "Launch Video"

**What happens:** A content calendar request for NaturGlow skincare (via Social Media template) is titled "NaturGlow Launch Video" at the submission step.

**Repro:**

1. Click "Social Media" template chip
2. Select Instagram + TikTok, add details about a skincare brand vitamin C serum launch
3. Chat through to "You decide & submit"
4. Read the submission bar title — it says "Launch Video" instead of "Content Calendar"

**Root-cause hints:**

- The task title/category is likely derived from the `taskType` or `contentType` field in the LiveBrief
- The state machine inference may be detecting "launch" in the user's text and classifying as `launch_video` instead of `content_calendar` or `multi_asset_plan`
- Look in `src/lib/ai/briefing-state-machine.ts` at the `TASK_TYPE` stage inference logic
- The deliverable category resolver may prioritize "video" keywords over "calendar" keywords
- Check how `taskSummary` is generated — it may hardcode "Launch Video" for any task with "launch" in the description

**Expected behavior:** The task title should reflect the actual content type: "NaturGlow Social Media Content Calendar" or "NaturGlow Content Calendar — Instagram & TikTok"

**Acceptance criteria:**

- [ ] Content calendar requests are correctly categorized
- [ ] Task title reflects actual deliverable type, not inferred from keyword matching alone
- [ ] The word "launch" in context doesn't override explicit content calendar signals

---

### BUG-005: "been assigned to been assigned to" duplicated text

**What happens:** During the submission transition (before the full success screen renders), a message card briefly shows: `"been assigned to been assigned to"` — duplicated text fragment.

**Repro:**

1. Complete any chat flow to submission
2. Click "Confirm & Submit"
3. Watch the transition carefully — the duplicate text appears for ~2 seconds before the success screen

**Root-cause hints:**

- Look in the submission success component (likely `src/components/chat/submission-success.tsx` or similar)
- There may be a template string like: `"${name} has been assigned to ${assignmentText}"` where `assignmentText` already contains "been assigned to"
- Or two components are both rendering the assignment text

**Expected behavior:** Clean message: "Your task has been submitted! [Name] has been assigned to work on your project."

**Acceptance criteria:**

- [ ] No duplicated text fragments in any submission state
- [ ] Success message renders cleanly in one pass

---

## P1 — High Priority

### BUG-006: Landing page brief shows ad banner dimensions

**What happens:** The DIMENSIONS field in the brief panel shows `728x90`, `300x250`, `336x280` — standard display ad banner sizes — for a landing page request.

**Repro:**

1. Type a landing page request: "I need a landing page design for CloudSync..."
2. Wait for AI response
3. Check the brief panel on the right → DIMENSIONS field

**Root-cause hints:**

- Look at how dimensions are resolved in the inference engine or state machine
- The dimension mapping may be keyed by a broad category like "web" that defaults to ad sizes
- Check `src/lib/ai/briefing-state-machine.ts` for dimension resolution logic
- There may be a mapping of `deliverableType → dimensions` that maps "web" content to banner sizes
- Landing pages should either have no fixed dimensions or show responsive breakpoints (e.g., 1440px, 1024px, 768px, 375px)

**Expected behavior:** Landing pages should show web page dimensions or responsive breakpoints, not ad banner sizes.

**Acceptance criteria:**

- [ ] Landing page requests show appropriate dimensions (responsive breakpoints or "Responsive" label)
- [ ] Ad banner dimensions only appear for actual ad/banner requests
- [ ] Dimension mapping is validated per deliverable type

---

### BUG-007: Platform detection only captures first platform mentioned

**What happens:** User requests "LinkedIn and Twitter posts" but the brief panel only shows Platform: "LinkedIn". Twitter/X is dropped.

**Repro:**

1. Type: "Create a content calendar... 8 weeks of LinkedIn and Twitter posts about AI productivity tools"
2. Wait for AI response
3. Check brief panel → PLATFORM field shows only "LinkedIn"

**Root-cause hints:**

- The platform inference in `src/lib/ai/briefing-state-machine.ts` may extract only a single platform
- The LiveBrief `platform` field may be typed as `string` instead of `string[]`
- Check if the inference uses a regex/match that stops after the first hit
- "Twitter" may also not be in the recognized platform list (it's now "X")

**Expected behavior:** All mentioned platforms should be captured. Brief should show "LinkedIn, X (Twitter)" or similar.

**Acceptance criteria:**

- [ ] Multiple platforms are captured when mentioned
- [ ] Both "Twitter" and "X" are recognized as the same platform
- [ ] Brief panel displays all selected platforms

---

### BUG-008: Summary/Topic/Description fields show raw input instead of refined values

**What happens:** Multiple fields in the brief panel display raw, unprocessed user input:

- Summary: "YouTube Video - Video" (redundant), "Web Content" (generic), "Launch Video" (raw input)
- Topic: "Video" (meaningless), "Platform. The page should drive free trial signups" (raw fragment)
- Submission description: "launch video" (just the 2-word initial input)

**Repro:** Occurs in every flow tested. Check the brief panel after the first AI response.

**Root-cause hints:**

- Look at where `taskSummary`, `topic`, and the submission `description` are populated
- The inference engine likely copies raw text fragments instead of generating clean summaries
- Check the `EXTRACT` stage in `src/lib/ai/briefing-state-machine.ts`
- The submission card may read from the first user message or a raw brief field instead of the AI-refined version

**Expected behavior:**

- Summary: "[Brand] [Content Type] for [Platform]" → e.g., "TaskFlow Launch Video for YouTube"
- Topic: Descriptive topic → e.g., "SaaS Project Management Tool Launch"
- Description: AI-generated brief summary, not the raw first message

**Acceptance criteria:**

- [ ] Summary field includes brand name and content type
- [ ] Topic field describes the actual subject matter
- [ ] Submission description uses AI-refined brief, not raw input
- [ ] No redundant text like "Video - Video"

---

### BUG-009: AI text truncation and garbling

**What happens:** AI responses contain truncated or garbled text:

- "A for VogueThread" → should be "A cinematic launch video for VogueThread"
- "You page for CloudSync" → should be "Your page for CloudSync"
- "I need to nail the to nail the say Gen Z shoppers" → garbled duplication

**Repro:** Occurs intermittently across flows. More frequent with template entry flows.

**Root-cause hints:**

- The response may be getting truncated during streaming or parsing
- Check `POST /api/chat` response parsing logic
- Look for where `[BRIEF_META]`, `[STRUCTURE_DATA]`, or other special tags are stripped from the response — the stripping may be cutting into the main content
- The garbling ("to nail the to nail the say") suggests a buffer/streaming issue where chunks are duplicated

**Expected behavior:** AI responses should be grammatically complete and free of truncation artifacts.

**Acceptance criteria:**

- [ ] No truncated words at message boundaries
- [ ] No duplicated text fragments within messages
- [ ] Response parsing doesn't cut into main content when stripping special tags

---

### BUG-010: "You decide & submit" triggers double AI messages skipping user input

**What happens:** Clicking "You decide & submit" produces TWO consecutive AI messages:

1. A response to the current question (with its own follow-up chips)
2. Immediately followed by "Here's a summary of your design brief. Review the details below and submit when you're ready!"

The user's answer to the current question is skipped entirely.

**Repro:** Click "You decide & submit" at any chat step that has it. Two AI bubbles appear back-to-back.

**Root-cause hints:**

- The "You decide & submit" handler likely sends a message AND triggers the submission flow simultaneously
- Look at the chip click handler in `src/components/chat/chat-input-area.tsx` or `chat-interface.tsx`
- It may be sending the chip text as a user message (triggering an AI response) AND calling a separate submission function
- The state machine may be transitioning through two stages in one API call

**Expected behavior:** "You decide & submit" should either:

1. Skip directly to the submission summary (one AI message: "Here's your summary"), OR
2. Show a confirmation dialog before jumping to submission

It should NOT produce two AI messages.

**Acceptance criteria:**

- [ ] "You decide & submit" produces exactly one transition
- [ ] No double AI messages
- [ ] Brief completion state is validated before allowing submission

---

## P2 — Medium Priority

### BUG-011: Storyboard duration under template minimum

**What happens:** VogueThread launch video storyboard totals 0:22, but the Product Launch Video template specifies "30-60 second cinematic video."

**Root-cause hints:** Check storyboard generation in the AI prompt — it may not enforce minimum duration from the template spec.

**Fix:** Validate total storyboard duration against the template's specified range. If under minimum, either auto-adjust scene durations or flag to the user.

---

### BUG-012: Storyboard scene thumbnails show number placeholders

**What happens:** Some flows show numbered placeholder boxes (1, 2, 3, 4, 5) instead of stock photo thumbnails for storyboard scenes.

**Root-cause hints:** The thumbnail fetch may be failing silently. Check the image/thumbnail resolution logic in the storyboard component. May be a missing fallback or a failed API call to fetch relevant stock images.

**Fix:** Ensure graceful fallback for missing thumbnails (placeholder image with scene description text, not just a number).

---

### BUG-013: Chat remains active after task submission

**What happens:** After "Your task has been submitted!", the chat input field, Submit button, and suggestion chips remain active. Users can still type and send messages.

**Root-cause hints:** Look in `chat-interface.tsx` for a `isSubmitted` or `taskCreated` state that should disable the input area.

**Fix:** After successful submission, disable the chat input, hide suggestion chips, and show only the success screen with "View Your Project" / "Start New Project" actions.

---

### BUG-014: Storyboard "Regenerate" button active post-submission

**What happens:** The storyboard panel still shows a clickable "Regenerate" button after the brief has been submitted.

**Fix:** Disable or hide the Regenerate button when the brief status is SUBMITTED or COMPLETED.

---

### BUG-015: AI avatar color inconsistency

**What happens:** The AI avatar alternates between green (branded) and gray across messages. In some flows, all avatars turn gray.

**Root-cause hints:** Look in `src/components/chat/chat-message-list.tsx` — the avatar may conditionally render based on a loading state or message type that isn't consistent.

**Fix:** Ensure all AI messages use the same branded green avatar regardless of message state.

---

### BUG-016: Credits display doesn't update immediately after submission

**What happens:** Credits still show the pre-submission amount during the "Your task has been submitted" processing state. Only updates on page navigation.

**Fix:** Invalidate/refetch the credits balance immediately after successful task creation.

---

## UX Improvements

### Navigation & Discovery

#### UX-001: Add "Content Calendar" category chip to dashboard

The dashboard shows: Launch Videos, Pitch Deck, Branding, Social Media, Landing Page — but no "Content Calendar." The content calendar flow is hidden inside "Social Media." Either add a dedicated chip or rename to "Social Media & Content Calendar."

#### UX-002: Fix inconsistent example chip rendering

The category chips (Launch Videos, Pitch Deck, etc.) sometimes appear on the dashboard, sometimes don't. Ensure they always render on a fresh dashboard visit.

#### UX-003: Rename "You decide & submit" chip

Current wording is ambiguous — sounds like "you (AI) decide." Rename to "Skip to submission" or "I'm ready to submit" to clearly indicate the user is choosing to proceed.

#### UX-004: Make template detail input multiline

The single-line input in template modals truncates long text. Replace with a textarea that can show 2-3 lines.

### Chat Experience

#### UX-005: Improve AI thinking state

15-36 second thinking times with just "Thinking..." and "Almost there..." are long. Add progressive status messages, show brief fields being populated in real-time, or add content-specific loading hints ("Designing your storyboard...", "Mapping your content strategy...").

#### UX-006: Add "Skip this question" option

Each AI question should have a lightweight skip option separate from "You decide & submit." Some questions are nice-to-have and users should be able to skip without jumping to submission.

#### UX-007: Delay suggestion chips until AI message is complete

Chips currently appear while the AI is still typing, leading to premature clicks. Wait until the full message is rendered before showing chips.

#### UX-008: Add brief completion percentage

The progress dots in the right panel are small and unlabeled. Add a prominent "Brief: 65% complete" indicator so users know how close they are to submission-ready.

### Brief Panel

#### UX-009: Auto-generate descriptive task titles

Replace generic titles with formatted titles: `[Brand] [Content Type] for [Platform]`

- "TaskFlow Launch Video for YouTube"
- "CloudSync Landing Page"
- "NaturGlow Content Calendar — Instagram & TikTok"

#### UX-010: Show specific intent instead of generic "Launch / Promote / Engage"

The INTENT field always shows "Launch / Promote / Engage" regardless of what the user said. Show the actual intent: "Drive free trial signups", "Build brand awareness", "Generate leads", etc.

#### UX-011: Handle missing audience data

AUDIENCE always shows "From your brand profile" even when no brand profile exists. Show "Not specified — tell us about your audience" with a prompt to add it.

### Submission Flow

#### UX-012: Explain the revision count

The submission card shows "2 revisions" without context. Add a tooltip or note: "Includes 2 rounds of revisions with your designer."

#### UX-013: Add pre-submission brief review

Before the final "Confirm & Submit", show an expandable summary of the full brief (summary, audience, platform, structure, visual direction) that users can review and edit inline.

#### UX-014: Add "Start Another Project" to success screen

The success screen only has "View Your Project." Add a second CTA: "Start Another Project" that returns to the dashboard.

#### UX-015: Improve "Get Credits to Submit" messaging

When the user has insufficient credits, show the math: "You need 12 more credits (30 required, 18 available)" instead of just "Get Credits to Submit."

### Template Modals

#### UX-016: Move radio buttons to left-aligned (Launch Videos modal)

Radio buttons in the Launch Videos modal are right-aligned, which breaks standard form convention. Move to left-aligned.

#### UX-017: Add "content calendar" language to Social Media modal

The Social Media modal title and description don't mention "calendar" or "schedule." Add a subtitle: "Plan your content calendar and posting schedule."

---

## Testing Gaps (Not Yet Tested)

The following scenarios were not covered and should be tested:

- Pitch Deck template flow
- Branding template flow
- Empty message submission
- Very long messages (1000+ characters)
- Changing topics mid-conversation (e.g., start with video, switch to landing page)
- File/image upload during chat
- Resuming a saved draft
- Multiple browser tabs with different drafts
- Mobile/responsive behavior
- Keyboard-only navigation (accessibility)
- Rate limiting behavior under rapid message sending
