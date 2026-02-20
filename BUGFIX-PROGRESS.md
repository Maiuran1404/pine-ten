# Bugfix Progress Tracker

> Tracks progress on issues from BUGFIX-REPORT.md. Each fix is tested, committed, and pushed individually.

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Complete (committed & pushed)
- [S] Skipped (requires architectural changes or not reproducible)

---

## P0 — Critical

| ID      | Title                                                         | Status |
| ------- | ------------------------------------------------------------- | ------ |
| BUG-001 | `/dashboard/undefined` 404 crash on "You decide & submit"     | [x]    |
| BUG-002 | `undefined` string leaks into AI response text                | [x]    |
| BUG-003 | Tasks assigned to client or test users instead of freelancers | [x]    |
| BUG-004 | Content calendar submissions titled as "Launch Video"         | [x]    |
| BUG-005 | "been assigned to been assigned to" duplicated text           | [x]    |

## P1 — High Priority

| ID      | Title                                                     | Status |
| ------- | --------------------------------------------------------- | ------ |
| BUG-006 | Landing page brief shows ad banner dimensions             | [x]    |
| BUG-007 | Platform detection only captures first platform mentioned | [S]    |
| BUG-008 | Summary/Topic/Description fields show raw input           | [x]    |
| BUG-009 | AI text truncation and garbling                           | [x]    |
| BUG-010 | "You decide & submit" triggers double AI messages         | [x]    |

## P2 — Medium Priority

| ID      | Title                                                 | Status |
| ------- | ----------------------------------------------------- | ------ |
| BUG-011 | Storyboard duration under template minimum            | [x]    |
| BUG-012 | Storyboard scene thumbnails show number placeholders  | [x]    |
| BUG-013 | Chat remains active after task submission             | [x]    |
| BUG-014 | Storyboard "Regenerate" button active post-submission | [x]    |
| BUG-015 | AI avatar color inconsistency                         | [x]    |
| BUG-016 | Credits display doesn't update after submission       | [x]    |

## UX Improvements

| ID     | Title                                                 | Status |
| ------ | ----------------------------------------------------- | ------ |
| UX-001 | Add "Content Calendar" category chip to dashboard     | [x]    |
| UX-002 | Fix inconsistent example chip rendering               | [S]    |
| UX-003 | Rename "You decide & submit" chip                     | [x]    |
| UX-004 | Make template detail input multiline                  | [x]    |
| UX-005 | Improve AI thinking state                             | [x]    |
| UX-006 | Add "Skip this question" option                       | [x]    |
| UX-007 | Delay suggestion chips until AI message complete      | [x]    |
| UX-008 | Add brief completion percentage                       | [x]    |
| UX-009 | Auto-generate descriptive task titles                 | [x]    |
| UX-010 | Show specific intent instead of generic               | [x]    |
| UX-011 | Handle missing audience data                          | [x]    |
| UX-012 | Explain revision count                                | [x]    |
| UX-013 | Add pre-submission brief review                       | [ ]    |
| UX-014 | Add "Start Another Project" to success screen         | [x]    |
| UX-015 | Improve "Get Credits to Submit" messaging             | [x]    |
| UX-016 | Move radio buttons to left-aligned                    | [x]    |
| UX-017 | Add "content calendar" language to Social Media modal | [x]    |

---

## Skipped Items

### BUG-007: Platform detection only captures first platform

- **Status**: SKIPPED — requires type-level refactor
- **Root cause**: `platform` field is typed as `InferredField<Platform>` (single value). The `inferFromPatterns()` function returns only the highest-confidence match. Supporting multiple platforms requires changing the type to `InferredField<Platform[]>` or `InferredField<Platform>[]`, which cascades through the entire brief panel, inference engine, state machine, and database schema.
- **Recommendation**: Add this to a future sprint as a dedicated feature.

### UX-002: Fix inconsistent example chip rendering

- **Status**: SKIPPED — not reproducible in code
- **Root cause**: Template chips are always rendered unconditionally in the JSX. The issue may be related to the loading grain overlay staying too long or a hydration timing issue. No conditional logic was found that would hide the chips.

---

## Fix Log

### BUG-001: `/dashboard/undefined` 404 crash

- **Status**: COMPLETE
- **Files**: `src/components/chat/useChatInterfaceData.ts`
- **Root cause**: `result.data.taskId` could be undefined; `handleViewProject` navigated to `/dashboard/tasks/${undefined}`
- **Fix**: Added null check on taskId after API response, fallback navigation to `/dashboard/tasks`
- **Commit**: `13fac35`

### BUG-002: `undefined` string leaks into AI response text

- **Status**: COMPLETE
- **Files**: `src/lib/ai/chat.ts`, `src/lib/ai/video-references.ts`
- **Root cause**: Operator precedence bug in demographics template literal; unguarded matchReasons[0] access
- **Fix**: Fixed ternary logic for demographics, added null checks for ageRange, guarded matchReasons array
- **Commit**: `7dcf9e8`

### BUG-003: Tasks assigned to client or test users

- **Status**: COMPLETE
- **Files**: `src/app/api/tasks/route.ts`
- **Root cause**: Fallback freelancer query had no client exclusion, role filter, or sort order
- **Fix**: Added `ne(userId, session.user.id)`, `eq(role, FREELANCER)`, vacation filter, rating sort
- **Commit**: `13e6456`

### BUG-004: Content calendar submissions titled as "Launch Video"

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-interface.utils.ts`
- **Root cause**: `constructTaskFromConversation()` checked for "launch"+"video" before "calendar", so content calendar conversations matched "launch" first
- **Fix**: Added content calendar and landing page detection before the launch video check
- **Commit**: `a731d55`

### BUG-005: "been assigned to been assigned to" duplicated text

- **Status**: COMPLETE
- **Files**: `src/components/chat/useChatInterfaceData.ts`
- **Root cause**: Chat message AND SubmissionSuccess overlay both rendered assignment text simultaneously
- **Fix**: Simplified chat message to just "Your task has been submitted!" (overlay handles assignment details)
- **Commit**: `13fac35` (same commit as BUG-001)

### BUG-006: Landing page brief shows ad banner dimensions

- **Status**: COMPLETE
- **Files**: `src/lib/constants/platform-dimensions.ts`
- **Root cause**: Web platform defaulted to all dimensions including ad banners
- **Fix**: Default web platform to hero dimensions instead of showing all
- **Commit**: `810284d`

### BUG-008: Summary/Topic/Description fields show raw input

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-interface.utils.ts`, `src/components/chat/useChatInterfaceData.ts`, `src/lib/ai/inference-engine.ts`
- **Root cause**: `constructTaskFromConversation()` only used raw messages; `generateTaskSummary()` produced redundant output; `extractTopicFallback()` accepted generic words
- **Fix**: Accept optional `LiveBrief` in `constructTaskFromConversation`, prefer refined values, deduplicate topics, reject generic single-word topics
- **Commit**: `c7b7d19`

### BUG-009: AI text truncation and garbling

- **Status**: COMPLETE
- **Files**: `src/lib/ai/chat.ts`
- **Root cause**: Greedy regex `|$` fallback was consuming text beyond closing tags
- **Fix**: Replaced dangerous regex with line-scoped patterns for unclosed tags
- **Commit**: `66babd8`

### BUG-010: "You decide & submit" triggers double AI messages

- **Status**: COMPLETE
- **Files**: `src/components/chat/useChatInterfaceData.ts`
- **Root cause**: `handleRequestTaskSummary` had no guard for pending task state
- **Fix**: Added `if (isLoading || pendingTask) return` guard
- **Commit**: `cbf173c`

### BUG-011: Storyboard duration under template minimum

- **Status**: COMPLETE
- **Files**: `src/lib/ai/briefing-prompts.ts`
- **Root cause**: AI prompt had no duration constraints for storyboards
- **Fix**: Added DURATION REQUIREMENT instruction (30-60s total, 4-6 scenes at 5-10s each)
- **Commit**: `2805895`

### BUG-012: Storyboard scene thumbnails show number placeholders

- **Status**: COMPLETE
- **Files**: `src/components/chat/storyboard-view.tsx`
- **Root cause**: Fallback placeholder showed only scene number
- **Fix**: Replaced number with Film icon + scene title text in gradient placeholder
- **Commit**: `dd9d018`

### BUG-013: Chat remains active after task submission

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-interface.tsx`
- **Root cause**: ChatInputArea rendered regardless of submission state
- **Fix**: Wrapped ChatInputArea in `!showSubmissionSuccess` conditional
- **Commit**: `e0eeb9c`

### BUG-014: Storyboard "Regenerate" button active post-submission

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-interface.tsx`
- **Root cause**: Regenerate handlers always passed through
- **Fix**: Pass `undefined` for regenerate handlers when `showSubmissionSuccess` is true
- **Commit**: `e0eeb9c` (same as BUG-013)

### BUG-015: AI avatar color inconsistency

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-message-list.tsx`
- **Root cause**: Gradient only had light mode colors
- **Fix**: Added `dark:from-emerald-700 dark:to-emerald-500` gradient overrides
- **Commit**: `85ee289`

### BUG-016: Credits display doesn't update after submission

- **Status**: COMPLETE
- **Files**: `src/components/chat/useChatInterfaceData.ts`
- **Root cause**: `dispatchCreditsUpdated` was called with old value instead of new balance
- **Fix**: Calculate `newCredits = userCredits - creditsRequired` and pass to dispatcher
- **Commit**: `cb3165c`

### UX-001: Add "Content Calendar" category chip to dashboard

- **Status**: COMPLETE
- **Files**: `src/app/(client)/dashboard/page.tsx`
- **Fix**: Added "Content Calendar" category with 3 options (Social Media Calendar, Multi-Platform Campaign, Launch Content Plan). Added flex-wrap for 6 chips.
- **Commit**: `5f1c190`

### UX-003: Rename "You decide & submit" chip

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-input-area.tsx`
- **Root cause**: Label was confusing
- **Fix**: Renamed to "I'm ready to submit"
- **Commit**: `d8561ea`

### UX-004: Make template detail input multiline

- **Status**: COMPLETE
- **Files**: `src/app/(client)/dashboard/page.tsx`
- **Root cause**: Single-line inputs too cramped for descriptions
- **Fix**: Converted `<input type="text">` to `<textarea>` with rows=2 and Shift+Enter handling
- **Commit**: `7cdad72`

### UX-005: Improve AI thinking state

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-message-list.tsx`
- **Fix**: Extended loading messages from 4 to 6 stages covering 0-25+ seconds. Stage-specific messages at 3s, 7s, 12s, 18s, 25s.
- **Commit**: `f48b6a9`

### UX-006: Add "Skip this question" option

- **Status**: COMPLETE
- **Files**: `src/components/chat/quick-options.tsx`, `src/components/chat/chat-input-area.tsx`
- **Fix**: Added lightweight "Skip" button after quick option chips (hidden during EXTRACT stage). Sends "Skip this question" as the response.
- **Commit**: `51d11fa`

### UX-007: Delay suggestion chips until AI message complete

- **Status**: COMPLETE
- **Files**: `src/components/chat/chat-input-area.tsx`, `src/components/chat/chat-interface.tsx`
- **Fix**: Added `animatingMessageId` prop to ChatInputArea; gated quick options rendering on animation completion.
- **Commit**: `302bc15`

### UX-008: Add brief completion percentage

- **Status**: COMPLETE
- **Files**: `src/components/chat/brief-panel/index.tsx`
- **Fix**: Added descriptive label ("X% complete" / "Ready to submit") above the progress bar. Increased bar height.
- **Commit**: `f2fb67d`

### UX-009: Auto-generate descriptive task titles

- **Status**: COMPLETE (addressed by BUG-008 fix)
- **Fix**: `constructTaskFromConversation` now prefers brief's refined `taskSummary` and `topic` over raw regex extraction. `generateTaskSummary` deduplicates redundant parts.
- **Commit**: `c7b7d19` (same as BUG-008)

### UX-010: Show specific intent instead of generic

- **Status**: COMPLETE
- **Files**: `src/components/chat/brief-panel/index.tsx`
- **Fix**: Display `INTENT_DESCRIPTIONS` instead of raw enum values. Changed placeholder from "Launch / Promote / Engage" to "What's the goal of this project?"
- **Commit**: `26cd5cb`

### UX-011: Handle missing audience data

- **Status**: COMPLETE
- **Files**: `src/components/chat/brief-panel/index.tsx`
- **Fix**: Changed audience placeholder from "From your brand profile" to "Tell us about your audience"
- **Commit**: `26cd5cb` (same as UX-010)

### UX-012: Explain revision count

- **Status**: COMPLETE
- **Files**: `src/components/chat/submit-action-bar.tsx`
- **Fix**: Changed label from "revisions" to "revisions included". Added tooltip: "Includes 2 rounds of revisions with your designer"
- **Commit**: `3f5785c`

### UX-014: Add "Start Another Project" to success screen

- **Status**: COMPLETE
- **Files**: `src/components/chat/submission-success.tsx`
- **Root cause**: No way to start a new project after submission
- **Fix**: Added "Start Another Project" button with router.push('/dashboard')
- **Commit**: `d8561ea`

### UX-015: Improve "Get Credits to Submit" messaging

- **Status**: COMPLETE
- **Files**: `src/components/chat/submit-action-bar.tsx`
- **Root cause**: Message didn't show math
- **Fix**: Show "You need X more credits (Y required, Z available)"
- **Commit**: `d8561ea`

### UX-016: Move radio buttons to left-aligned

- **Status**: COMPLETE
- **Files**: `src/app/(client)/dashboard/page.tsx`
- **Fix**: Moved radio indicator from right side to left side of template options in Launch Videos modal
- **Commit**: `5f1c190` (same as UX-001)

### UX-017: Add "content calendar" language to Social Media modal

- **Status**: COMPLETE
- **Files**: `src/app/(client)/dashboard/page.tsx`
- **Root cause**: Modal description didn't mention content calendars
- **Fix**: Updated description to mention content calendar planning
- **Commit**: `7cdad72`

---

## Remaining Items

### UX-013: Add pre-submission brief review

- **Status**: NOT STARTED
- **Description**: Before "Confirm & Submit", show an expandable summary of the full brief (summary, audience, platform, structure, visual direction) that users can review and edit inline.
- **Complexity**: Medium — requires adding a review panel to the submit action bar that pulls data from the LiveBrief. Consider adding a collapsible section between the task title and the stats cards in the expanded SubmitActionBar.
