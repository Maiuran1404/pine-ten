# AI Chat Tone Testing — Bug Report

**Date:** 2026-02-15
**Tested against:** Tone improvements from plan "Improve AI Chat Tone of Voice"
**Test method:** Live browser testing via Chrome, 2 full conversations

---

## Test Conversations

### Conversation 1: Health Supplement Landing Page

- **Flow:** Vague opener → Stripe reference + "clinically proven" differentiator → Audience details → Product details → Style selection → Structure generation
- **Stages hit:** EXTRACT → INTENT → INSPIRATION → STRUCTURE

### Conversation 2: Fintech Brand Identity

- **Flow:** Brand identity for neobank targeting freelancers
- **Stages hit:** EXTRACT (with competitive positioning)

---

## Bugs Found

### BUG 1: BANNED_MID filter creates orphaned sentence fragments (Critical)

**Location:** `src/lib/ai/chat.ts` — BANNED_MID post-processing
**Severity:** High — visibly broken text shown to users

The `BANNED_MID` array includes `"That's a strong"` which is stripped via `String.replaceAll()`. When the AI writes something like _"That's a strong foundation"_, the filter removes `"That's a strong"` and leaves behind `" foundation"` — producing visible artifacts like:

> "Clean, product-first approach with clinical proof as your differentiator. foundation."

The orphaned word + dangling period is clearly broken.

**Root cause:** Simple substring replacement doesn't account for surrounding context. Stripping a phrase mid-sentence leaves behind the rest of the sentence as a fragment.

**Fix options:**

1. Remove `"That's a strong"` from BANNED_MID entirely — it's too aggressive as a substring match. The AI is already prompted not to use hollow praise, so double-filtering is overkill.
2. Use sentence-level matching: if a banned phrase appears, remove the entire sentence rather than just the phrase.
3. Use regex with word boundaries and consume trailing words up to the next punctuation: e.g., `/That's a strong\s+\w+[.,!]?/gi`

---

### BUG 2: BANNED_MID matching is case-sensitive (Medium)

**Location:** `src/lib/ai/chat.ts` — BANNED_MID post-processing
**Severity:** Medium — phrases slip through in different casing

`String.replaceAll()` with a string argument is case-sensitive. The AI may generate `"that's a strong"` (lowercase) or `"Positions you as"` (capitalized) which won't match the exact-case entries in BANNED_MID.

**Fix:** Convert both content and phrases to lowercase for comparison, or use regex with the `i` flag:

```ts
for (const phrase of BANNED_MID) {
  const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  cleanContent = cleanContent.replace(regex, '')
}
```

---

### BUG 3: Structure stage skips clarifying question on first turn (Medium)

**Location:** `src/lib/ai/briefing-prompts.ts` — `buildStructureTask()`
**Severity:** Medium — desired behavior not followed

The plan says: _"On first turn in stage (turnsInCurrentStage === 0), ask ONE clarifying question before generating structure."_

The prompt instruction is correctly prepended when `isFirstTurn` is true. However, when the user explicitly asks "Build the structure," the AI ignores the clarifying question instruction and goes straight to generating the full layout.

**Observed:** AI produced a complete 6-section layout immediately with no clarifying question.

**Root cause:** The prompt instruction is a suggestion, not a hard constraint. When the user gives a direct command ("Build the structure"), the AI prioritizes fulfilling the request over the "ask first" instruction. The instruction competes with the user's explicit directive.

**Fix options:**

1. Make the instruction more forceful: _"You MUST ask one clarifying question before generating any structure. Even if the user asks you to build, ask first."_
2. Accept this as reasonable AI behavior — if the user explicitly asks to build, skipping the question is arguably the right call. The clarifying question is more valuable when the AI auto-advances to STRUCTURE without being asked.

---

### BUG 4: Launch asset prompt not triggered despite "launching next month" (Medium)

**Location:** `src/lib/ai/briefing-prompts.ts` — `buildStructureTask()`
**Severity:** Medium — missed opportunity to collect important assets

The user said _"We're launching next month"_ but the AI never asked for latest product screenshots, UI flows, or assets.

**Root cause:** The `isLaunch` check uses `state.brief.intent.value?.toLowerCase().includes('launch')`. The intent was inferred as `"Signups"` (not `"Launch"`), so the condition evaluates to `false` and the launch asset prompt is never appended.

**Fix options:**

1. Check broader signals beyond just the intent field — scan conversation history or topic for "launch" mentions.
2. Add "launch" as a secondary intent signal: if the topic or any user message mentions "launch/launching," set a flag on the briefing state.
3. Use a separate `isLaunchContext` field on BriefingState that gets set by the inference engine when launch-related language is detected anywhere in the conversation.

---

### BUG 5: Differentiator not explicitly acknowledged before structure (Low)

**Location:** `src/lib/ai/briefing-prompts.ts` — `buildStructureTask()` clarify prefix
**Severity:** Low — prompt instruction partially followed

The plan says: _"If the user already shared a key differentiator (e.g., 'we're clinically proven'), acknowledge it first — 'That's a strong angle, we should lead with that.' Then lay out the structure."_

**Observed:** The AI incorporated "clinically proven" into the structure correctly (Headline: "Lead with the clinical differentiator") but did NOT explicitly call it out as a strong angle before generating the layout. It went straight to the structure.

**Root cause:** Same as BUG 3 — the clarifying prefix instruction is being skipped when the user asks to build directly. The differentiator acknowledgment is part of that prefix.

---

### BUG 6: Passive question closings persist (Low)

**Location:** Multiple stages
**Severity:** Low — tone inconsistency

The `CLOSING_INSTRUCTION` says: _"Your response MUST end with a confident statement or clear direction, not a passive question."_

**Observed closings:**

- _"What's your gut reaction to this structure?"_ (STRUCTURE stage)
- _"Does that match what you had in mind, or were you thinking something different?"_ (INSPIRATION stage)

These are passive questions, not confident statements. The instruction is present but the AI doesn't reliably follow it.

**Fix options:**

1. Make the closing instruction stage-specific and more forceful in authority stages (STRUCTURE, STRATEGIC_REVIEW, REVIEW).
2. Add post-processing to detect and flag responses ending with `?` in authority stages.
3. Accept that some question closings are appropriate when asking for confirmation of a recommendation — the issue is mainly when they're wishy-washy.

---

## Working as Intended (Passes)

| Test Case                                              | Result  | Notes                                                                             |
| ------------------------------------------------------ | ------- | --------------------------------------------------------------------------------- |
| Vague first message → clarifying question              | PASS    | "What's the main job this page needs to do?" — meaningful, not generic            |
| Stripe reference → acknowledge once, extract principle | PASS    | Said "clean, product-first approach" — never repeated "Stripe" again              |
| No hollow affirmations in openers                      | PASS    | Used "Got it." — natural, not formulaic                                           |
| No stacked adjectives                                  | PASS    | No instances of "clean, trust-forward, conversion-focused" patterns               |
| Competitive positioning → propose concrete player      | PASS    | "I'm thinking Novo, Lili, that space is getting crowded" — exactly right          |
| Varied sentence length                                 | PASS    | Mix of short and longer sentences throughout                                      |
| Overall warmer tone                                    | PASS    | "white-coat syndrome", "benefits for real people, not lab rats" — creative, human |
| No banned phrases in output                            | PARTIAL | Banned phrases are stripped but stripping creates artifacts (see BUG 1)           |

---

## Not Yet Tested

These scenarios need manual testing in longer conversations:

1. **Strategic review stage** — Does it lead with risks instead of sandwiching critique?
2. **Review stage** — Does it give 1-2 key insights only, or still verbose?
3. **Submit stage** — Is the summary tight?
4. **User keeps citing same reference** — Does the AI stop parroting it after the first acknowledgment?
5. **Creative intake flow** (separate from briefing) — Are the communication style changes reflected?
6. **500 token limit on lighter stages** — Does EXTRACT/INTENT output feel complete or truncated?

---

## Priority Fixes

1. **BUG 1** (Critical) — Fix BANNED_MID to avoid orphaned fragments. Either remove "That's a strong" or use sentence-level removal.
2. **BUG 2** (Medium) — Make BANNED_MID case-insensitive.
3. **BUG 4** (Medium) — Broaden launch detection beyond intent field.
4. **BUG 3** (Medium) — Consider making clarifying question more forceful or accepting explicit user overrides.
