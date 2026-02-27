# Video Creation Briefing Flow — Bug Report

**Date**: 2026-02-26
**Tested by**: Automated browser testing (3 full end-to-end tests + 2 partial)
**Flow**: Client chat → video creation → briefing → storyboard → submission
**URL**: `app.localhost:3000/dashboard/chat`

---

## Test Scenarios

| Test | Input Method           | Video Type                                          | Reached Submission?                             |
| ---- | ---------------------- | --------------------------------------------------- | ----------------------------------------------- |
| 1    | Direct text input      | 30s product launch video (FitPulse fitness app)     | No — AI narrated fake submission                |
| 2    | Launch Videos template | 45s cinematic launch video (AquaGreen water bottle) | No — AI narrated fake submission                |
| 3    | Direct text input      | 15s TikTok ad (BrewBox coffee subscription)         | No — AI narrated fake submission                |
| 4    | Direct text input      | 60s explainer video (TaskFlow SaaS tool)            | Partial — page reset bug blocked test           |
| 5    | Skipped                | Brand story video                                   | Skipped — same core bugs confirmed in tests 1-3 |

---

## CRITICAL BUGS

### BUG-1: No Submit Button / No Actual Task Submission

- **Severity**: CRITICAL (flow-blocking)
- **Repro rate**: 100% (all 3 completed tests)
- **Steps to reproduce**:
  1. Start a new chat and describe a video project
  2. Answer all AI questions through the briefing flow
  3. Click "Submit to designer" quick option (or type "I want to submit")
  4. Observe: AI says "I'm submitting your brief to our designer network" but nothing actually happens
- **Expected**: A real submit button/confirmation dialog appears, credits are deducted, a task is created in the system
- **Actual**: The AI generates a message _describing_ a submission, but:
  - No task is created in the database
  - No credits are deducted (stays at 500)
  - No confirmation UI or success state appears
  - No redirect to a task detail page
  - The step indicator never reaches 7/7
  - The user is left in a dead-end chat with no actionable next step
- **Root cause**: In `src/components/chat/chat-message-list.tsx` line ~950, the submit button render is gated on `!briefingStage`:
  ```typescript
  {
    !isLoading &&
      !pendingTask &&
      !isTaskMode &&
      !briefingStage && // ← This hides the button during the entire state machine flow
      (() => {
        // Submit button rendering logic
      })()
  }
  ```
  Since `briefingStage` is always set to one of the 11 state machine stages during the briefing flow, the submit button **never renders**. The AI talks about submitting, but the actual submission code path is never triggered.
- **Impact**: Users cannot complete the core product flow. No tasks are ever created from the video briefing chat.

---

### BUG-2: Storyboard Regenerates When User Approves It

- **Severity**: CRITICAL (data loss, UX confusion)
- **Repro rate**: 100% (all tests with storyboard flow)
- **Steps to reproduce**:
  1. Start a video chat and progress to the storyboard stage
  2. Review the generated storyboard (e.g., 4 scenes with names, timings, scripts)
  3. Click "Looks good, let's build scenes" or "Perfect, let's move forward"
  4. Observe: The storyboard completely regenerates with different scenes
- **Expected**: The approved storyboard is preserved and the flow advances to the next stage
- **Actual**:
  - The storyboard regenerates with entirely new scenes, names, timings, and images
  - Scene names revert from descriptive (e.g., "The Problem", "The Solution") to generic ("Scene 1", "Scene 2")
  - Scene count may change (e.g., 4 scenes → 5 scenes in Test 2)
  - User's explicit approval is ignored
- **Root cause**: In `src/hooks/use-storyboard.ts` lines 475-480:
  ```typescript
  const handleApproveNarrative = useCallback(() => {
    setNarrativeApproved(true)
    handleSendOption("The story narrative looks great. Let's build the storyboard based on this.")
  }, [handleSendOption])
  ```
  `handleSendOption()` sends a message to the AI, which interprets it as a request to generate/regenerate the storyboard rather than preserving the existing one.
- **Impact**: Users lose their approved storyboard content. Creates a frustrating loop where approval triggers regeneration.

---

## MAJOR BUGS

### BUG-3: Literal `undefined` Appended to AI Messages

- **Severity**: MAJOR (visible to user, looks broken)
- **Repro rate**: ~60% (observed in Test 2, intermittent)
- **Steps to reproduce**:
  1. Start a video chat via the Launch Videos template
  2. Observe the first AI response message
  3. Look at the end of the AI's question text
- **Expected**: Clean question text ending with `?`
- **Actual**: The word `undefined` is appended to the end of the message:
  - _"...the lifestyle it represents?**undefined**"_
  - _"...everyday millennial life? **undefined**"_
- **Likely cause**: A variable concatenation where a value is `undefined` instead of an empty string, possibly in quick options generation or AI message post-processing.
- **Impact**: Makes the product look broken/unpolished.

---

### BUG-4: Scene With 0-Second Duration

- **Severity**: MAJOR (data integrity)
- **Repro rate**: ~33% (observed in Test 1 final storyboard)
- **Steps to reproduce**:
  1. Progress through the video briefing flow until storyboard regenerates
  2. Observe Scene 1 timing
- **Expected**: Every scene has a positive duration
- **Actual**: Scene 1 shows `0:00-0:00` with `0s` duration. Scene 2 also starts at `0:00`, creating an overlapping time range.
- **Impact**: Invalid storyboard data would be sent to designers if submission worked.

---

### BUG-5: Video Duration Drifts From User's Requested Length

- **Severity**: MAJOR (ignores user requirement)
- **Repro rate**: ~66% (observed in Tests 1 and 2)
- **Steps to reproduce**:
  1. Request a specific video duration (e.g., "30-second video")
  2. Progress through the flow and observe the storyboard header
- **Expected**: Storyboard total matches the requested duration
- **Actual**:
  - Test 1: User asked for **30 seconds** → storyboard showed `0:48 ✓ 60s` (48 seconds total, 60s target)
  - Test 2: User asked for **45 seconds** → storyboard showed `✓ 60s` target instead of 45s
- **Impact**: The AI ignores the user's explicit duration requirement. The `✓ 60s` target appears to be a hardcoded default.

---

## MEDIUM BUGS

### BUG-6: Text Overlap / Flicker During AI Response Loading

- **Severity**: MEDIUM (visual glitch)
- **Repro rate**: 100% (every AI response transition)
- **What happens**: While the AI is processing ("Thinking..."), the previous message's question label (e.g., "What makes AquaGreen different?") and loading state text (e.g., "Designing your storyboard...") overlap at the bottom of the chat area. Old grayed-out quick options also persist underneath, creating a messy layered appearance.
- **Example overlaps observed**:
  - "How about now?" + "Designing your storyboard..."
  - "What makes AquaGreen different?" + "Thinking about your project..."
  - "Next step for your video" + "Submit to designer"

---

### BUG-7: Step Progress Indicator Stuck / Jumps Erratically

- **Severity**: MEDIUM (confusing UX)
- **Repro rate**: 100%
- **What happens**: The "X of 7 steps" progress indicator at the top of the right panel behaves inconsistently:
  - Test 1: Started at "3 of 7", jumped to "5 of 7", never reached 7
  - Test 2: Started at "3 of 7", jumped to "5 of 7", never reached 7
  - Test 3: Started at "1 of 7", moved to "2 of 7", stayed there
  - **Never reaches "7 of 7"** in any test
- **Root cause**: Multiple state machine stages (11 internal stages) collapse to the same chat stage (7 display stages). For example, `REVIEW` and `DEEPEN` both map to `'review'`, causing the indicator to skip numbers. The final step is unreachable because the submit UI never renders.
- **Also**: The step label text sometimes doesn't match the actual flow stage (e.g., "Refine your moodboard" shown when no moodboard was ever presented).

---

### BUG-8: Stale Quick Options Persist Below New Messages

- **Severity**: MEDIUM (visual clutter, potential misclicks)
- **Repro rate**: 100%
- **What happens**: After the AI responds to a user's quick option selection, the previous set of quick option chips remain visible (grayed out) below the new AI message. This creates visual noise and confusion about which options are currently interactive.

---

### BUG-9: Inconsistent Right Panel Behavior Between Video Types

- **Severity**: MEDIUM (UX inconsistency)
- **Repro rate**: 100%
- **What happens**: The right panel displays different components depending on the video type, with no clear rationale:
  - **Product launch video** (Tests 1-2): Shows "Video Blueprint" with narrative + CTA immediately on first AI response, then transitions to a storyboard with scene cards
  - **TikTok ad** (Test 3): Shows a "CONTEXT" extraction panel (Summary, Details, Platform, Intent, Audience, Topic), then transitions to "Design Specification"
- **Impact**: Users get a different experience depending on video type. The "Video Blueprint" approach is more engaging, while the "CONTEXT" panel feels like a form being filled out.

---

## LOW BUGS

### BUG-10: AI Text Truncation / Grammatical Artifacts

- **Severity**: LOW
- **Repro rate**: ~60%
- **Examples**:
  - Test 2: _"The narrative gives us a solid from."_ (missing "foundation" — truncated during streaming)
  - Test 3: _"The discovery angle is strong. **Leading** Here's the structure"_ (extra word "Leading" — generation artifact)
  - Test 1: _"Ready to submit this brief to"_ (sentence cut off mid-thought)

---

### BUG-11: Duplicate Dimension Tags in Context Panel

- **Severity**: LOW (cosmetic)
- **Repro rate**: ~33% (observed in Test 3)
- **What happens**: The CONTEXT panel on the right side shows `1080x1920` listed twice in the Details section.

---

### BUG-12: "New Chat" Button / Navigation Doesn't Clear Draft

- **Severity**: LOW (navigation issue)
- **Repro rate**: ~50% (observed between tests)
- **What happens**: After completing a chat:
  - Clicking "New Chat" in the sidebar doesn't navigate to a fresh chat
  - Navigating to `/dashboard` retains the `?draft=` URL parameter
  - The old conversation persists until a completely new browser tab is opened

---

## Summary Table

| #   | Bug                                | Severity | Repro | Root Cause File                          |
| --- | ---------------------------------- | -------- | ----- | ---------------------------------------- |
| 1   | No actual task submission          | CRITICAL | 100%  | `chat-message-list.tsx:~950`             |
| 2   | Storyboard regenerates on approval | CRITICAL | 100%  | `use-storyboard.ts:475-480`              |
| 3   | `undefined` in AI messages         | MAJOR    | ~60%  | Unknown — likely message post-processing |
| 4   | Scene with 0-second duration       | MAJOR    | ~33%  | Storyboard timing calculation            |
| 5   | Video duration drifts from request | MAJOR    | ~66%  | Hardcoded 60s target default             |
| 6   | Text overlap during loading        | MEDIUM   | 100%  | Chat message list rendering              |
| 7   | Step indicator stuck/jumps         | MEDIUM   | 100%  | `chat-progress.ts` stage mapping         |
| 8   | Stale quick options persist        | MEDIUM   | 100%  | Quick options cleanup logic              |
| 9   | Inconsistent panel between types   | MEDIUM   | 100%  | Branching logic in right panel           |
| 10  | AI text truncation/grammar         | LOW      | ~60%  | Streaming/post-processing                |
| 11  | Duplicate dimension tags           | LOW      | ~33%  | Context extraction                       |
| 12  | New Chat doesn't clear draft       | LOW      | ~50%  | Draft persistence / routing              |

---

## Recommended Fix Priority

1. **BUG-1** (submit button) — This is the #1 blocker. Users literally cannot complete the product flow.
2. **BUG-2** (storyboard regeneration) — Approval should preserve content, not destroy it.
3. **BUG-3** (`undefined` text) — Quick win, likely a simple null check.
4. **BUG-5** (duration drift) — Check for hardcoded 60s default.
5. **BUG-6** (text overlap) — Visual polish, affects perceived quality.
6. **BUG-7** (step indicator) — Audit stage mapping alignment.
