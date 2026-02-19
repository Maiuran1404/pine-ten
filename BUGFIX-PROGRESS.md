# Bugfix Progress Tracker

> Tracks progress on issues from BUGFIX-REPORT.md. Each fix is tested, committed, and pushed individually.

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Complete (committed & pushed)

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
| BUG-007 | Platform detection only captures first platform mentioned | [ ]    |
| BUG-008 | Summary/Topic/Description fields show raw input           | [ ]    |
| BUG-009 | AI text truncation and garbling                           | [x]    |
| BUG-010 | "You decide & submit" triggers double AI messages         | [x]    |

## P2 — Medium Priority

| ID      | Title                                                 | Status |
| ------- | ----------------------------------------------------- | ------ |
| BUG-011 | Storyboard duration under template minimum            | [ ]    |
| BUG-012 | Storyboard scene thumbnails show number placeholders  | [ ]    |
| BUG-013 | Chat remains active after task submission             | [x]    |
| BUG-014 | Storyboard "Regenerate" button active post-submission | [x]    |
| BUG-015 | AI avatar color inconsistency                         | [x]    |
| BUG-016 | Credits display doesn't update after submission       | [x]    |

## UX Improvements

| ID     | Title                                                 | Status |
| ------ | ----------------------------------------------------- | ------ |
| UX-001 | Add "Content Calendar" category chip to dashboard     | [ ]    |
| UX-002 | Fix inconsistent example chip rendering               | [ ]    |
| UX-003 | Rename "You decide & submit" chip                     | [x]    |
| UX-004 | Make template detail input multiline                  | [x]    |
| UX-005 | Improve AI thinking state                             | [ ]    |
| UX-006 | Add "Skip this question" option                       | [ ]    |
| UX-007 | Delay suggestion chips until AI message complete      | [ ]    |
| UX-008 | Add brief completion percentage                       | [ ]    |
| UX-009 | Auto-generate descriptive task titles                 | [ ]    |
| UX-010 | Show specific intent instead of generic               | [ ]    |
| UX-011 | Handle missing audience data                          | [ ]    |
| UX-012 | Explain revision count                                | [ ]    |
| UX-013 | Add pre-submission brief review                       | [ ]    |
| UX-014 | Add "Start Another Project" to success screen         | [x]    |
| UX-015 | Improve "Get Credits to Submit" messaging             | [x]    |
| UX-016 | Move radio buttons to left-aligned                    | [ ]    |
| UX-017 | Add "content calendar" language to Social Media modal | [x]    |

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

### UX-017: Add "content calendar" language to Social Media modal

- **Status**: COMPLETE
- **Files**: `src/app/(client)/dashboard/page.tsx`
- **Root cause**: Modal description didn't mention content calendars
- **Fix**: Updated description to mention content calendar planning
- **Commit**: `7cdad72`
