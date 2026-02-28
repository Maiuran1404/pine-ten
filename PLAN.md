# Fix: Style options not showing + suppress quick options at INSPIRATION stage

## Problem

1. **Right panel stuck on "Preparing style options..."** — When the briefing stage transitions to INSPIRATION (after narrative approval), the right panel's `StyleSelectionPanel` has no styles to show. `latestDeliverableStyles` scans messages for `deliverableStyles` but finds none because the API response that triggered the transition didn't include them.

2. **Quick options shown redundantly** — AI-generated quick options with image cards ("Show me style options" / "I have a style in mind") appear in the chat input area, but these are redundant since the style panel in the right panel handles visual direction selection.

## Changes

### 1. `src/components/chat/useChatInterfaceData.ts` — Suppress quick options at INSPIRATION

Add check: if `briefingStage === 'INSPIRATION'`, return null from `resolvedQuickOptions`.

### 2. `src/hooks/use-style-selection.ts` — Add `fetchInitialStyles()`

New function that calls `/api/chat` with `deliverableStyleMarker: { type: 'initial', deliverableType }`, adds resulting styles to messages.

### 3. `src/components/chat/useChatInterfaceData.ts` — Auto-fetch styles on INSPIRATION entry

New effect: when `briefingStage === 'INSPIRATION'` AND no `deliverableStyles` in messages AND not loading, call `fetchInitialStyles()`. Use ref to prevent re-triggering.

---

# 10x Chat Experience: State-Machine-Driven Creative Briefing

## Context

The current chat experience is unreliable because the AI operates without state awareness. It sometimes asks weird questions, sometimes asks nothing, and the conversation flow is unpredictable. The root cause: the system prompt is static and the AI freelances the entire conversation.

The fix: a **state machine** controls the conversation flow deterministically. The AI generates creative text but the state machine decides what to ask, when to show styles, and what quick options to display.

## Current Problems (Root Causes)

1. **Stateless AI**: System prompt (`chat.ts:56-159`) is identical on message 1 and message 10. No stage awareness, no "what's collected" vs "what's missing".
2. **Assumption-first backfires**: Prompt says "don't ask questions, make assumptions" which causes skipped questions or bizarre recommendations on vague inputs.
3. **Quick options are fragile**: AI sometimes forgets `[QUICK_OPTIONS]`; fallback options are generic ("Sounds good / Tell me more").
4. **300 token cap + aggressive stripping**: Strips bullets, bold, lists, multi-sentence responses - making output feel thin.
5. **Disconnected creative-intake system**: `src/lib/creative-intake/` has structured flows but isn't wired to the main chat.
6. **Tonally flat AI**: All responses sound the same regardless of audience, industry, or deliverable type. Enterprise CTO gets the same voice as sustainable fashion consumer.
7. **Passive REVIEW stage**: Current review just asks "Everything look good?" — low-value confirmation instead of expert consultation.

## Architecture: State Machine + Stage-Aware Prompts

### Flow Stages

```
EXTRACT → TASK_TYPE → INTENT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → (DEEPEN) → SUBMIT
```

1. **EXTRACT** - First message: parse everything possible (task type, intent, platform, topic, style keywords, inspiration references)
2. **TASK_TYPE** - "What are we making?" (if not clear from first message)
3. **INTENT** - "What's the business goal?" (if not inferrable)
4. **INSPIRATION** - Show style references matching context, user picks
5. **STRUCTURE** - Branches by deliverable type (ALL implemented in first pass):
   - **Video** → Storyboard (scene by scene: hook, problem, solution, CTA, etc.)
   - **Website** → Layout (hero section, features, social proof, CTA, footer) — NEW deliverable type
   - **Content** → Content calendar (theme by theme, week by week, with narrative arc + CTA escalation)
   - **Single design** → Design specification (format, dimensions, key elements, copy)
6. **STRATEGIC_REVIEW** - Advisory layer: AI surfaces strategic strengths, flags potential risks/mismatches, offers directional tweaks. User can acknowledge and override. Not a gate.
7. **MOODBOARD** - Hybrid approach: one overall visual direction + optional per-section overrides (e.g., hero section can have different mood than footer)
8. **REVIEW** - Expert consultation: reframes deliverable strategically, identifies strongest element, flags one area for improvement, offers optional optimization. Confident creative-director tone, not passive confirmation.
9. **DEEPEN** (optional) - Offered after REVIEW: refine messaging to production-ready, write actual scripts, generate A/B variants, optimize for conversion, expand into asset-ready specs.
10. **SUBMIT** - Send to production (create task, assign freelancer)

### Key Principle: Skip Stages When Data Is Available

If user says "I want a 30-second Instagram reel launching our new AI tool, similar to Legora's style" — we already have:

- Task type: video/reel
- Platform: Instagram
- Intent: announcement/launch
- Topic: AI tool
- Inspiration: Legora

State machine skips TASK_TYPE and INTENT, goes straight to INSPIRATION (show styles matching "Legora" aesthetic).

---

## Architecture Components

### 1. State Machine (`src/lib/ai/briefing-state-machine.ts`) — NEW

Core types:

```typescript
type BriefingStage =
  | 'EXTRACT'
  | 'TASK_TYPE'
  | 'INTENT'
  | 'INSPIRATION'
  | 'STRUCTURE'
  | 'STRATEGIC_REVIEW'
  | 'MOODBOARD'
  | 'REVIEW'
  | 'DEEPEN'
  | 'SUBMIT'
type DeliverableCategory = 'video' | 'website' | 'content' | 'design' | 'brand' | 'unknown'

interface BriefingState {
  stage: BriefingStage
  deliverableCategory: DeliverableCategory | null
  collected: {
    taskType: InferredField<string> | null
    intent: InferredField<Intent> | null
    platform: InferredField<Platform> | null
    topic: InferredField<string> | null
    audience: InferredField<AudienceBrief> | null
    industry: InferredField<string> | null // for tone calibration
    styleKeywords: string[]
    inspirationRefs: string[]
    selectedStyles: DeliverableStyle[]
    structure: StructureData | null // storyboard, layout, calendar, or design spec
    strategicReview: StrategicReviewData | null // advisory output from STRATEGIC_REVIEW
    overallMoodboard: VisualDirection | null // overall project visual direction
    sectionMoodboards: Record<string, Partial<VisualDirection>> // per-section overrides
    competitiveDifferentiation: string | null // optional competitive positioning angle
    deepenSelections: DeepenOption[] | null // what depth paths the user chose
  }
  toneProfile: ToneProfile | null // calibrated per-conversation
  questionsAsked: string[]
  messageCount: number
}
```

Structure types (branched by deliverable):

```typescript
type StructureData =
  | { type: 'storyboard'; scenes: StoryboardScene[] }
  | { type: 'layout'; sections: LayoutSection[] }
  | { type: 'calendar'; outline: ContentOutline }
  | { type: 'single_design'; specification: DesignSpec }

interface StoryboardScene {
  sceneNumber: number
  title: string
  description: string
  duration: string
  visualNote: string
  hookData?: VideoHookData // scene 1 only — role-specific hook metadata
}
interface VideoHookData {
  targetPersona: string // specific role/title being addressed
  painMetric: string // operational consequence or pain point
  quantifiableImpact: string // number or metric where possible
}
interface LayoutSection {
  sectionName: string
  purpose: string
  contentGuidance: string
  order: number
}
interface ContentOutline {
  totalDuration: string // e.g., "30 days", "12 weeks"
  postingCadence: string // e.g., "3x/week", "daily"
  platforms: string[] // which platforms, cross-posting strategy
  distributionLogic: string // cross-posting and platform-specific notes
  contentPillars: ContentPillar[]
  weeks: ContentWeek[]
  ctaEscalation: CTAEscalationPlan
}
interface ContentPillar {
  name: string
  description: string
  percentage: number // % of total content
}
interface ContentWeek {
  weekNumber: number
  narrativeArc: string // the story this week tells
  theme: string
  posts: ContentPost[]
}
interface ContentPost {
  dayOfWeek: string
  pillarType: 'pillar' | 'support'
  topic: string
  format: string
  cta: string
  engagementTrigger: string // what drives interaction on this post
}
interface CTAEscalationPlan {
  awarenessPhase: { weeks: number[]; ctaStyle: string }
  engagementPhase: { weeks: number[]; ctaStyle: string }
  conversionPhase: { weeks: number[]; ctaStyle: string }
}
interface DesignSpec {
  format: string
  dimensions: Dimension[]
  keyElements: string[]
  copyGuidance: string
}

interface StrategicReviewData {
  strengths: string[]
  risks: string[]
  optimizationSuggestion: string
  inspirationFitScore: 'aligned' | 'minor_mismatch' | 'significant_mismatch'
  inspirationFitNote: string | null // conversational "heads up" if mismatch
  userOverride: boolean // true if user acknowledged mismatch and kept direction
}

type DeepenOption =
  | 'production_copy'
  | 'script_writing'
  | 'ab_variant'
  | 'conversion_optimization'
  | 'asset_specifications'
```

Transition rules: pure functions `(state, inference) → nextStage` evaluated after each message.

### 2. Tone Calibration Module (`src/lib/ai/briefing-tone.ts`) — NEW

Determines AI voice characteristics based on audience, industry, platform, and intent. Computed once at EXTRACT/INTENT and injected into all subsequent prompts.

```typescript
interface ToneProfile {
  languageSharpness: 'direct' | 'conversational' | 'formal'
  technicalDepth: 'high' | 'medium' | 'low'
  emotionalIntensity: 'high' | 'medium' | 'low'
  directnessLevel: 'high' | 'medium' | 'low'
  vocabularyRegister: string[] // industry-specific terms to use/avoid
  toneDescription: string // human-readable summary for prompt injection
}

function calibrateTone(
  audience: AudienceBrief | null,
  industry: string | null,
  platform: Platform | null,
  intent: Intent | null
): ToneProfile
```

Concrete tone mappings:

| Context                      | Sharpness      | Tech Depth | Emotion | Directness | Example Phrasing                                     |
| ---------------------------- | -------------- | ---------- | ------- | ---------- | ---------------------------------------------------- |
| Enterprise CTO               | direct         | high       | low     | high       | "This integrates with existing infrastructure..."    |
| Sustainable fashion consumer | conversational | low        | high    | medium     | "Your story connects with people who care about..."  |
| Travel startup               | conversational | low        | medium  | high       | "Clean, simple, gets out of the user's way..."       |
| B2B SaaS marketing           | direct         | medium     | low     | high       | "This positions you for pipeline conversion..."      |
| Lifestyle/wellness brand     | conversational | low        | high    | low        | "This feels authentic to your community..."          |
| Fintech/banking              | formal         | high       | low     | high       | "This reinforces trust and regulatory compliance..." |

The `toneDescription` field is a paragraph injected into every stage prompt:

```
== TONE ==
You are speaking to {audience description}. Use {sharpness} language.
Technical depth: {level}. Emotional resonance: {level}.
{industry-specific vocabulary notes}
Do NOT use: {anti-patterns for this audience}
```

Tone recalibrates if audience/industry/intent changes mid-conversation (e.g., in-place edit at REVIEW).

### 3. Inspiration Fit Check (`src/lib/ai/briefing-strategic.ts`) — NEW

```typescript
function inspirationFitCheck(
  inspirationRefs: string[],
  selectedStyles: DeliverableStyle[],
  audience: AudienceBrief | null,
  industry: string | null,
  intent: Intent | null,
  deliverableCategory: DeliverableCategory | null
): { fitScore: 'aligned' | 'minor_mismatch' | 'significant_mismatch'; note: string | null }
```

This runs at the STRATEGIC_REVIEW stage. It compares the chosen inspiration direction against the stated audience and industry context.

Examples:

- Gymshark-style inspiration + enterprise CTO audience → minor_mismatch: "Gymshark's visual energy is consumer-fitness-coded. For CTOs, consider borrowing the pacing but dialing back the lifestyle intensity."
- Stripe inspiration + B2B SaaS + CTOs → aligned: no note
- Brutalist design + wellness brand → significant_mismatch: "Brutalist aesthetics can feel confrontational for wellness audiences. This could be a bold differentiator or a disconnect — your call."

The note is conversational, not an error. The user always has final say.

### 4. Stage-Aware Prompts (`src/lib/ai/briefing-prompts.ts`) — NEW

`buildSystemPrompt(state, brandContext)` replaces the static `SYSTEM_PROMPT`. Each stage gets a focused prompt with tone calibration injected:

| Stage               | Prompt Focus                                         | AI Task                                                                    | Tone Rule                                       |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| EXTRACT             | "Process first message, confirm what you understood" | Acknowledge + ask first missing thing                                      | Match detected audience/industry if available   |
| TASK_TYPE           | "We need to know what they're making"                | Recommend deliverable type or ask                                          | Calibrated to detected context                  |
| INTENT              | "We know what, need to know why"                     | Infer or ask business goal                                                 | Calibrated to detected context                  |
| INSPIRATION         | "Show visual style references"                       | Frame creative direction, system shows style cards                         | Calibrated                                      |
| STRUCTURE (video)   | "Create scene-by-scene storyboard with strong hook"  | Generate 3-5 scenes, scene 1 must have role-specific hook with pain metric | Calibrated                                      |
| STRUCTURE (website) | "Create section-by-section layout"                   | Generate hero, features, CTA, footer                                       | Calibrated                                      |
| STRUCTURE (content) | "Create strategic content calendar"                  | Generate calendar with cadence, pillars, narrative arcs, CTA escalation    | Calibrated                                      |
| STRUCTURE (design)  | "Create design specification"                        | Generate format, elements, copy guidance                                   | Calibrated                                      |
| STRATEGIC_REVIEW    | "Surface strategic assessment of current direction"  | Strengths, risks, optimization suggestion, inspiration fit check           | **Authority tone**: confident creative director |
| MOODBOARD           | "Finalize visual direction"                          | Summarize colors, typography, mood; ask about per-section overrides        | Calibrated                                      |
| REVIEW              | "Expert consultation on completed brief"             | Reframe strategically, identify strongest element + one improvement area   | **Authority tone**: "This is strong because X." |
| DEEPEN              | "Offer depth escalation paths"                       | Present deepening options relevant to deliverable type                     | **Authority tone**: "I'd push further on X."    |
| SUBMIT              | "Generate task submission"                           | Output `[TASK_READY]` block                                                | **Authority tone**: "This is production-ready." |

Every prompt ends with: "Your response MUST end with a confident statement or clear direction, not a passive question."

Authority tone enforcement for STRATEGIC_REVIEW, REVIEW, DEEPEN, and SUBMIT prompts:

```
== TONE OVERRIDE: AUTHORITY MODE ==
You are a senior creative director presenting your professional assessment.
NEVER use: "What do you think?", "Does this work?", "Everything look good?", "Let me know if..."
ALWAYS use: "This is strong because X.", "The risk is Y.", "I'd recommend Z.", "One thing I'd push on..."
Frame your analysis with confidence. You are the expert in the room.
```

Injected into every prompt:

```
== CURRENT STATE ==
Stage: {stage}
What we know: {collected fields with values}
What's missing: {fields with null values}

== TONE ==
{toneProfile.toneDescription}

== YOUR TASK THIS TURN ==
{stage-specific instructions}
```

### 5. Deterministic Quick Options (`src/lib/ai/briefing-quick-options.ts`) — NEW

`generateQuickOptions(state)` — the AI does NOT produce quick options. The state machine generates them:

| Stage            | Quick Options                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| EXTRACT (vague)  | "Video", "Social content", "Website design", "Branding", "Something else"                        |
| TASK_TYPE        | Context-dependent deliverable options                                                            |
| INTENT           | "Drive signups", "Build authority", "Increase awareness", "Boost sales"                          |
| INSPIRATION      | "I like this direction", "Show me more", "Something different"                                   |
| STRUCTURE        | "Looks good, continue", "I want to adjust this", "Different approach"                            |
| STRATEGIC_REVIEW | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is"               |
| MOODBOARD        | "Ready to review", "Tweak visuals", "Add section-specific direction"                             |
| REVIEW           | "Submit as-is", "Go deeper first", "Make changes"                                                |
| DEEPEN           | Context-dependent deepening options (e.g., "Refine copy", "Write script", "A/B variant", "Done") |

### 6. Enhanced Extractors (`src/lib/ai/briefing-extractors.ts`) — NEW

- `extractStyleKeywords(message)` — matches "light", "airy", "cinematic", "bold", "minimal", etc.
- `extractInspirationReferences(message)` — catches "similar to X", "@handle", URLs, quoted names
- `resolveDeliverableCategory(inference)` — maps inference results to video/website/content/design/brand
- `resolveStructureType(category)` — maps category to storyboard/layout/calendar/design-spec
- `extractAudienceSignals(message)` — detects audience descriptors (CTO, consumer, startup, enterprise)
- `extractIndustrySignals(message)` — detects industry context (SaaS, fashion, fintech, wellness, etc.)

### 7. Response Parser (`src/lib/ai/briefing-response-parser.ts`) — NEW

Parse structured AI outputs for STRUCTURE and STRATEGIC_REVIEW stages:

- `[STORYBOARD]{json}[/STORYBOARD]` — video scenes (with hook data for scene 1)
- `[LAYOUT]{json}[/LAYOUT]` — website sections
- `[CALENDAR]{json}[/CALENDAR]` — content calendar (expanded structure)
- `[DESIGN_SPEC]{json}[/DESIGN_SPEC]` — single design specification
- `[STRATEGIC_REVIEW]{json}[/STRATEGIC_REVIEW]` — strategic assessment data

### 8. Competitive Differentiation Check — Soft Prompt

For website, brand, and product launch deliverables, the AI includes a soft competitive differentiation prompt at the INTENT or STRUCTURE stage if the user hasn't mentioned competition naturally.

Implementation: in `briefing-prompts.ts`, the INTENT and STRUCTURE prompt templates for relevant categories include:

```
If the user hasn't mentioned competitors or competitive positioning, and the deliverable type
is website/brand/product launch, ask one light question:
"Is there anyone in your space doing something similar that you want to differentiate from?"
This is optional — if the user ignores it, move on. If they engage, infer competitive landscape
from topic/industry and suggest a positioning angle stored in state.competitiveDifferentiation.
```

This is NOT a separate stage — it's a soft prompt injected into existing stage templates for relevant deliverable types.

---

## Files to Modify

| File                                          | Changes                                                                                                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/ai/chat.ts`                          | Replace static `SYSTEM_PROMPT` with `buildSystemPrompt(state)`. Raise `max_tokens` 300→800. Strip aggressive post-processing (keep emoji removal + capitalization only). Remove `[QUICK_OPTIONS]` logic entirely. |
| `src/app/api/chat/route.ts`                   | Accept `briefingState` from client. Pipeline: inference → tone calibration → state transitions → build prompt → AI call → parse response → return updated state + content + quick options.                        |
| `src/components/chat/useChatInterfaceData.ts` | Add `briefingState` to component state. Pass in API calls, receive back. Use state-driven quick options instead of AI-generated ones.                                                                             |
| `src/lib/chat-progress.ts`                    | Map `BriefingStage` directly to `ChatStage` — the state machine IS the progress tracker. Add STRATEGIC_REVIEW and DEEPEN to mapping.                                                                              |
| `src/lib/ai/inference-engine.ts`              | Add confirmation detection patterns for REVIEW→SUBMIT and REVIEW→DEEPEN transitions. Add "go deeper" / "submit as-is" intent detection.                                                                           |
| `src/components/chat/brief-panel/types.ts`    | Add `BriefingStage` type (including STRATEGIC_REVIEW, DEEPEN), extend `LiveBrief` with `briefingState`.                                                                                                           |

## New Files

| File                                          | Purpose                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/ai/briefing-state-machine.ts`        | State machine: types, transitions, evaluator                                     |
| `src/lib/ai/briefing-tone.ts`                 | Tone calibration: `calibrateTone()`, `ToneProfile`, tone mappings                |
| `src/lib/ai/briefing-strategic.ts`            | `inspirationFitCheck()`, strategic review data generation                        |
| `src/lib/ai/briefing-prompts.ts`              | Per-stage system prompt templates with tone injection + authority mode           |
| `src/lib/ai/briefing-quick-options.ts`        | Deterministic quick option generation (includes STRATEGIC_REVIEW, DEEPEN)        |
| `src/lib/ai/briefing-extractors.ts`           | Style keyword + inspiration + category + audience + industry extraction          |
| `src/lib/ai/briefing-response-parser.ts`      | Structured output parsing (storyboard, layout, calendar, strategic review, etc.) |
| `src/lib/ai/briefing-state-machine.test.ts`   | Transition logic tests (including STRATEGIC_REVIEW and DEEPEN transitions)       |
| `src/lib/ai/briefing-tone.test.ts`            | Tone calibration tests (audience/industry combos)                                |
| `src/lib/ai/briefing-strategic.test.ts`       | Inspiration fit check tests, strategic review generation tests                   |
| `src/lib/ai/briefing-extractors.test.ts`      | Extraction function tests (including audience/industry extraction)               |
| `src/lib/ai/briefing-prompts.test.ts`         | Prompt builder tests (tone injection, authority mode enforcement)                |
| `src/lib/ai/briefing-response-parser.test.ts` | Response parsing tests (including strategic review parser)                       |
| `src/lib/ai/briefing-quick-options.test.ts`   | Quick option generation tests (including new stages)                             |

## Key Design Decisions

1. **State lives on client**: `BriefingState` sent with each API call, returned updated. No extra DB round-trips. Persisted via existing `saveDraft()` localStorage.
2. **State machine controls flow, AI generates text**: AI never decides what to ask next. It adds creative flair within guardrails.
3. **Quick options are deterministic**: From `generateQuickOptions(state)`, not AI output. Eliminates fragility.
4. **Token limit raised to 800**: Stage-aware prompts produce focused responses naturally.
5. **Inference engine preserved**: Existing `inferFromMessage()` is robust. State machine consumes its output + new extractors.
6. **Website is a new deliverable type**: Website/landing page design added as a first-class deliverable category.
7. **Hybrid moodboard**: One overall `VisualDirection` + `Record<string, Partial<VisualDirection>>` for per-section overrides.
8. **All branches built at once**: Video storyboard, website layout, content calendar, single design — all in first pass.
9. **STRATEGIC_REVIEW is advisory, not a gate**: User can override any flagged mismatch. Flow never blocks.
10. **DEEPEN is optional**: Only entered if user chooses "Go deeper first" at REVIEW. Otherwise skipped straight to SUBMIT.
11. **Tone calibration is global**: Computed once, injected into every stage prompt. Recalibrates on audience/industry changes.
12. **Authority tone at key moments**: STRATEGIC_REVIEW, REVIEW, DEEPEN, and SUBMIT use confident creative-director framing. No passive questions.
13. **Competitive differentiation is a soft prompt, not a stage**: Injected into INTENT/STRUCTURE prompts for relevant deliverable types. User can ignore it.

## Implementation Order

### Phase 1: State Machine Core + Tone System (~8 files + tests, no UI changes)

1. Create `briefing-state-machine.ts` — `BriefingState` type (with STRATEGIC_REVIEW, DEEPEN stages), `TransitionRule[]`, `evaluateTransitions()`
2. Create `briefing-tone.ts` — `ToneProfile` type, `calibrateTone()` function with audience/industry/platform/intent mappings
3. Create `briefing-strategic.ts` — `inspirationFitCheck()`, `StrategicReviewData` type, strategic assessment generation helpers
4. Create `briefing-extractors.ts` — `extractStyleKeywords()`, `extractInspirationReferences()`, `resolveDeliverableCategory()`, `resolveStructureType()`, `extractAudienceSignals()`, `extractIndustrySignals()`
5. Create `briefing-prompts.ts` — `buildSystemPrompt(state, brandContext)` with per-stage templates, tone injection, authority mode for STRATEGIC_REVIEW/REVIEW/DEEPEN/SUBMIT, competitive differentiation soft prompt for relevant categories, video hook guidance in STRUCTURE(video) template
6. Create `briefing-quick-options.ts` — `generateQuickOptions(state)` including STRATEGIC_REVIEW and DEEPEN options, updated REVIEW options
7. Create `briefing-response-parser.ts` — parse `[STORYBOARD]`, `[LAYOUT]`, `[CALENDAR]`, `[DESIGN_SPEC]`, `[STRATEGIC_REVIEW]`
8. Write tests for all of the above

### Phase 2: API Integration (backend wiring)

9. Modify `chat.ts` — replace `SYSTEM_PROMPT` with `buildSystemPrompt()`, raise tokens, reduce post-processing
10. Modify `route.ts` — accept/return `briefingState`, run state machine pipeline (including tone calibration step and strategic review at appropriate stage)
11. Add `briefingState` (including `toneProfile`, `strategicReview`, `deepenSelections`) to chat validation schema in `src/lib/validations/index.ts`

### Phase 3: Client Integration (frontend wiring)

12. Modify `useChatInterfaceData.ts` — carry `briefingState` through conversation lifecycle
13. Modify `chat-progress.ts` — map `BriefingStage` → `ChatStage` (add STRATEGIC_REVIEW and DEEPEN to progress bar)
14. Wire deterministic quick options into the input UI (including new STRATEGIC_REVIEW and DEEPEN quick options)
15. Update `brief-panel/types.ts` with new types

### Phase 4: Structure Rendering (new UI components)

16. Storyboard rendering component (video structure display + editing, with hook data display for scene 1)
17. Layout preview component (website section display + editing)
18. Enhanced content calendar component (theme-by-theme display with pillar indicators, narrative arc labels, CTA escalation visual, engagement triggers)
19. Design spec display component
20. Per-section moodboard override UI in the moodboard panel
21. Strategic review display component (strengths/risks/suggestion cards, inspiration fit indicator, override buttons)
22. DEEPEN stage UI (option selection cards with descriptions)

## Ambiguous Responses & Turn Limits

**Rule: Max 2 turns per stage before forcing progression.**

| Turn   | Behavior                                                                   |
| ------ | -------------------------------------------------------------------------- |
| Turn 1 | Ask the question normally with quick options                               |
| Turn 2 | AI narrows options, makes a recommendation                                 |
| Turn 3 | Force progression: pick smart default based on brand/context, move forward |

State tracks `turnsInCurrentStage` (resets on transition). No stage ever becomes an interrogation.

## In-Place Edits vs Backward Navigation

**Two operations the state machine supports**:

**In-place edit** (stays at current stage): User tweaks a previous field without going back.

- At MOODBOARD: "make it more brutalist" → updates `styleKeywords` + `overallMoodboard`, stays at MOODBOARD
- At REVIEW: "change audience to Gen Z" → updates `audience`, **triggers tone recalibration**, stays at REVIEW
- **Structure is NOT wiped** — visual direction doesn't invalidate content structure

**Backward jump** (goes to previous stage): User explicitly wants to redo a step.

- "Show me different styles" → jump to INSPIRATION, clear `selectedStyles`
- "Change what we're making" → jump to TASK_TYPE, clear downstream

```typescript
function goBackTo(state, targetStage): BriefingState {
  // Clear only data produced AT and AFTER the target stage
  // Preserve everything before
  // E.g., going back to INSPIRATION: clears selectedStyles, preserves intent/topic/audience
  // Going back to STRUCTURE: clears structure + strategicReview + moodboard + deepenSelections
  // Going back to INTENT: clears intent + all downstream
  // If audience/industry changes: trigger tone recalibration
}
```

**Detection**: Inference classifies messages as in-place-edit vs backward-jump vs forward-progress.

## Latency Impact

Extraction + state machine + tone calibration total: **~3ms** (pure regex + array iteration + object construction). Negligible vs:

- DB queries: 50-200ms (already parallelized)
- AI API call: 2000-5000ms

Pipeline: extractors → tone calibration → state transition → build prompt → AI call (streaming) → parse response → return. Extraction and tone calibration run sequentially before AI call since the prompt depends on the post-transition stage and tone profile.

## State Rehydration (Refresh / Return After Days)

- `BriefingState` (including `toneProfile`) is serialized as part of the `ChatDraft` in localStorage via existing `saveDraft()` mechanism
- On page load: draft loads from localStorage → `briefingState` restores exact stage + tone
- State machine never re-derives state from messages — it's persisted
- For durability: also persist `briefingState` in the `chatDrafts` DB table (JSON column, same as messages)
- When server sync is re-enabled, state travels with it for cross-device continuity

## Hybrid Moodboard Mental Model

- **Global moodboard** applies to ALL sections by default (colors, typography, mood)
- **Per-section overrides** are additive — they extend/tweak the global, not replace it
- **Overrides do NOT cascade downstream** — each section is independent
- **No override = uses global** (always)

Example: Website project — global is "clean, dark navy, Inter font". Hero override adds "bold, dramatic". Features/CTA/Footer stay on global.

Resolution:

```typescript
function getMoodboardForSection(state, sectionId): VisualDirection {
  const global = state.collected.overallMoodboard
  const override = state.collected.sectionMoodboards[sectionId]
  if (!override) return global
  return mergeMoodboards(global, override) // deep merge, override wins on conflicts
}
```

## Category Pivots (Escape Hatch)

If user at REVIEW says "actually make this a website" — this is a **partial reset**, not start-over.

```typescript
function pivotCategory(state, newCategory): BriefingState {
  return {
    ...state,
    stage: 'STRUCTURE', // Reset to STRUCTURE
    deliverableCategory: newCategory,
    collected: {
      ...state.collected,
      // PRESERVE: intent, topic, audience, styleKeywords, inspirationRefs, overallMoodboard
      // CLEAR: structure, strategicReview, sectionMoodboards, competitiveDifferentiation, deepenSelections
      structure: null,
      strategicReview: null,
      sectionMoodboards: {},
      competitiveDifferentiation: null,
      deepenSelections: null,
    },
  }
}
```

Detection: inference engine runs on every message. If a REVIEW-stage message has strong signals for a different category, state machine triggers `pivotCategory()`.

## Extension Points (New Deliverable Types)

Adding a new type (e.g., pitch deck) touches **6 files**, each with a small addition:

| File                          | Addition                                                          |
| ----------------------------- | ----------------------------------------------------------------- |
| `briefing-state-machine.ts`   | Add to `DeliverableCategory` union + `StructureData` union member |
| `briefing-tone.ts`            | Add tone mapping for the new category's typical audience          |
| `briefing-prompts.ts`         | Add one STRUCTURE prompt template                                 |
| `briefing-quick-options.ts`   | Add to EXTRACT stage options                                      |
| `briefing-extractors.ts`      | Add patterns to `resolveDeliverableCategory()`                    |
| `briefing-response-parser.ts` | Add new structured output parser                                  |

Transition rules DON'T change — they're based on collected data presence, not specific categories.

## Video Hook Generation Guidance

The STRUCTURE (video) prompt template includes specific hook generation rules for scene 1:

```
== HOOK GENERATION (SCENE 1) ==
The opening hook MUST include:
1. Target persona: Reference the specific role or persona (e.g., "CTO", "Head of Growth", "Founder")
   — NOT generic ("business leaders", "professionals")
2. Pain metric: Name a specific operational consequence or pain point
   — NOT vague ("struggling with growth", "need better tools")
   — YES specific ("losing 40% of pipeline to manual follow-up", "3-week onboarding bottleneck")
3. Quantifiable impact: Include a number or metric where data supports it
   — "Teams using X ship 2x faster" not "Teams using X are more productive"

The hook should feel like it was written by someone who has worked in the target industry,
not by someone who read a SaaS marketing playbook.
```

This is injected into the STRUCTURE prompt only when `deliverableCategory === 'video'`.

## Content Calendar Strategic Logic

When `deliverableCategory === 'content'`, the STRUCTURE prompt enforces strategic calendar creation:

```
== CONTENT CALENDAR REQUIREMENTS ==
1. POSTING CADENCE: State explicit frequency (e.g., "3x/week: Mon, Wed, Fri")
2. CONTENT PILLARS: Define 2-4 content pillars with percentage allocation
   (e.g., Educational 40%, Behind-the-scenes 25%, Social proof 20%, Promotional 15%)
3. WEEKLY NARRATIVE ARC: Each week tells a coherent story — not random topics
   Week 1 might be "Establishing the problem", Week 2 "Introducing the solution"
4. PILLAR vs SUPPORT: Label each post as pillar (flagship) or support (lighter, engagement-focused)
5. CTA ESCALATION: First third = awareness CTAs (follow, save, share)
   Middle third = engagement CTAs (comment, DM, sign up for newsletter)
   Final third = conversion CTAs (buy, book, start trial)
6. ENGAGEMENT TRIGGERS: Each post has a specific interaction driver
   (question, poll, controversial take, behind-the-scenes reveal, user callout)
7. DISTRIBUTION LOGIC: Specify platforms and cross-posting strategy
   (e.g., "Full post on Instagram, thread version on X, behind-the-scenes on Stories")
```

## DEEPEN Stage: Depth Escalation Paths

After REVIEW, before SUBMIT, the user can optionally enter DEEPEN. Available depth options depend on deliverable type:

| Deliverable | Available Deepen Options                                          |
| ----------- | ----------------------------------------------------------------- |
| Video       | Refine script to production-ready, Generate A/B hook variant      |
| Website     | Refine copy to production-ready, Conversion optimization pass     |
| Content     | Refine messaging per post, Generate A/B content variants          |
| Design      | Expand into asset-ready specifications, Generate variant concepts |
| All         | Optimize for conversion, Expand into full asset specifications    |

The DEEPEN stage can loop — user can select multiple depth paths before submitting. Quick options at DEEPEN include the relevant options plus "Done, submit now".

## Extraction Pipeline Validation (10 Example Messages)

| #   | First Message                                              | taskType            | intent                            | audience/industry detected | styleKW     | inspirationRefs | Tone Profile                              | Landing Stage   |
| --- | ---------------------------------------------------------- | ------------------- | --------------------------------- | -------------------------- | ----------- | --------------- | ----------------------------------------- | --------------- |
| 1   | "I want a design that is light and airy similar to legora" | null                | null                              | none                       | ["light"]   | ["legora"]      | default (recalibrate later)               | **TASK_TYPE**   |
| 2   | "Stripe launch videos for B2B SaaS, CTOs, clean minimal"   | video (0.85)        | announcement (0.85)               | CTOs / SaaS                | ["minimal"] | ["Stripe"]      | direct, high-tech, low-emotion            | **INSPIRATION** |
| 3   | "30-day Instagram content plan, sustainable fashion"       | multi_asset (0.95)  | null                              | consumer / fashion         | []          | []              | conversational, low-tech, high-emotion    | **INTENT**      |
| 4   | "We're launching a new AI tool next month"                 | null                | announcement (0.7)                | none                       | []          | []              | default (recalibrate later)               | **TASK_TYPE**   |
| 5   | "Website landing page, bold, conversion-focused"           | website (0.85)      | signups (0.75)                    | none                       | ["bold"]    | []              | default (recalibrate later)               | **INSPIRATION** |
| 6   | "Logo for a yoga studio"                                   | single_asset (0.85) | default for brand                 | consumer / wellness        | []          | []              | conversational, low-tech, high-emotion    | **INSPIRATION** |
| 7   | "3 Instagram reels, fitness app, Gymshark style"           | multi_asset (0.9)   | signups (0.9)                     | consumer / fitness         | ["edgy"]    | ["Gymshark"]    | conversational, medium-tech, high-emotion | **INSPIRATION** |
| 8   | "Pitch deck for investor meeting next week"                | slide (0.9)         | null (gap: no fundraising intent) | investors / startup        | []          | []              | formal, high-tech, low-emotion            | **INTENT**      |
| 9   | "LinkedIn thought leadership, CEO, weekly posts"           | multi_asset (0.85)  | authority (0.95)                  | executives / professional  | []          | []              | direct, medium-tech, low-emotion          | **INSPIRATION** |
| 10  | "Something cool for our new product"                       | null                | null                              | none                       | []          | []              | default (recalibrate later)               | **TASK_TYPE**   |

**Observations from validation**:

- Detailed messages (2, 5, 7) skip straight to INSPIRATION — good
- Vague messages (1, 4, 10) correctly land at TASK_TYPE — good
- Moderate messages (3, 8, 9) land at INTENT — one piece missing — good
- Brand category (6) needs special rule: default intent for logos/branding — noted
- Pitch deck (8) exposes gap: intent enum needs "fundraising" for presentations — add to implementation
- Tone profiles are immediately calibrated when audience/industry signals are present (2, 3, 6, 7, 8, 9)
- Messages without audience/industry signals (1, 4, 5, 10) get default tone, recalibrated when data arrives

## Full End-to-End Conversation Traces (10 Traces)

### Trace 1: Stripe-Style B2B Video — Detailed first message, smooth path (6 turns)

**First message**: "Stripe launch videos for B2B SaaS, CTOs, clean minimal"
**Tone**: direct, high-tech, low-emotion (CTO/SaaS calibrated)

| Turn | User Message                                             | Stage Before     | Stage After          | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                            | Quick Options                                                                      | State Mutation                                                                                           |
| ---- | -------------------------------------------------------- | ---------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1    | "Stripe launch videos for B2B SaaS, CTOs, clean minimal" | EXTRACT          | **INSPIRATION**      | "Launch video for CTOs — Stripe-caliber execution. Here's what fits that direction." [DELIVERABLE_STYLES shown]                                                                                                                                                                                                                                                                     | "I like this direction", "Show me more", "Something different"                     | taskType=video, intent=announcement, audience=CTOs, style=["minimal"], refs=["Stripe"], tone calibrated  |
| 2    | [selects Dark Tech style]                                | INSPIRATION      | **STRUCTURE**        | "5-scene storyboard. Scene 1 hook: 'Your engineering team loses 6 hours/week to deployment friction.' Pacing mirrors Stripe's precision." [STORYBOARD]                                                                                                                                                                                                                              | "Looks good, continue", "Adjust scenes", "Different approach"                      | selectedStyles=[DarkTech], structure=storyboard(5 scenes, hook has CTO persona + pain metric)            |
| 3    | "Looks good, continue"                                   | STRUCTURE        | **STRATEGIC_REVIEW** | "This is well-positioned. Stripe's visual language maps directly to CTO expectations — reliability, precision, craft. Strong alignment between inspiration and audience. One thing I'd push on: the problem scene could reference a specific operational metric (deployment frequency, MTTR) to land harder with technical leadership."                                             | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={strengths: [...], risks: [], fitScore: 'aligned', suggestion: "add operational metric"} |
| 4    | "Good catch, let's adjust"                               | STRATEGIC_REVIEW | **MOODBOARD**        | "Updated scene 2 to reference MTTR. Visual direction: dark navy, electric blue accents, Inter Bold, generous negative space."                                                                                                                                                                                                                                                       | "Ready to review", "Tweak visuals", "Customize scene"                              | structure updated with metric, overallMoodboard set                                                      |
| 5    | "Ready to review"                                        | MOODBOARD        | **REVIEW**           | "This positions you as the infrastructure-grade solution in a market full of toy tools. Strongest element: the hook directly names the CTO's operational pain. The storyboard pacing builds technical credibility before the product reveal. One area I'd strengthen: the CTA could reference integration speed rather than generic 'get started' — CTOs care about time-to-value." | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                        |
| 6    | "Submit as-is"                                           | REVIEW           | **SUBMIT**           | "This is production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                        | —                                                                                  | task created                                                                                             |

**Stages hit**: EXTRACT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Stages skipped**: TASK_TYPE, INTENT (inferred), DEEPEN (user chose submit)
**STRATEGIC_REVIEW**: Flagged nothing major (aligned), offered optimization. User accepted tweak.
**REVIEW consultation**: Reframed positioning, identified strongest element, suggested CTA improvement.
**Tone**: Direct, technical language throughout. No "What do you think?" anywhere.

---

### Trace 2: Sustainable Fashion Content — Needs intent, emotional tone (8 turns)

**First message**: "30-day Instagram content plan, sustainable fashion"
**Tone**: conversational, low-tech, high-emotion (consumer/fashion calibrated)

| Turn | User Message                                         | Stage Before     | Stage After           | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Quick Options                                                                      | State Mutation                                                                                                              |
| ---- | ---------------------------------------------------- | ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1    | "30-day Instagram content plan, sustainable fashion" | EXTRACT          | **INTENT**            | "Love this — sustainable fashion content has real storytelling potential. What's the heartbeat of this campaign?"                                                                                                                                                                                                                                                                                                                                                                                                    | "Build awareness", "Drive sales", "Educate", "Grow community"                      | taskType=multi_asset, platform=instagram, topic="sustainable fashion", tone calibrated                                      |
| 2    | "Build awareness and educate"                        | INTENT           | **INSPIRATION**       | "Awareness + education — that's a trust-building play. Here are visual directions that feel authentic to sustainability storytelling." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                          | "I like this direction", "Show me more", "Something different"                     | intent=awareness+education                                                                                                  |
| 3    | [selects Organic Earth style]                        | INSPIRATION      | **STRUCTURE**         | "30-day calendar: 5x/week. Pillars: Impact Stories (35%), Behind the Process (25%), Community Voices (25%), Gentle Nudges (15%). Week 1 arc: 'Why this matters.' CTA escalation starts with 'Save this' and builds to 'Join the movement.'" [CALENDAR]                                                                                                                                                                                                                                                               | "Looks good, continue", "Adjust", "More posts"                                     | selectedStyles=[OrganicEarth], structure=calendar with pillars, arcs, CTAs                                                  |
| 4    | "Looks good, continue"                               | STRUCTURE        | **STRATEGIC_REVIEW**  | "This calendar tells a story your audience will feel. The pillar balance is right — Impact Stories lead because that's what drives shares in sustainability. One heads-up: the Gentle Nudges pillar sits at 15% which is conservative for a 30-day push. If you're measuring conversion, consider bumping to 20% in weeks 3-4 when trust is established."                                                                                                                                                            | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={strengths: ["pillar balance", "narrative arc"], risks: ["conservative conversion %"], fitScore: 'aligned'} |
| 5    | "I hear you but keep it as-is"                       | STRATEGIC_REVIEW | **MOODBOARD**         | "Understood — your audience, your call. Visual direction: warm earth tones, natural textures, handwritten accents, candid photography style."                                                                                                                                                                                                                                                                                                                                                                        | "Ready to review", "Tweak visuals", "Customize week"                               | userOverride=true, overallMoodboard set                                                                                     |
| 6    | "Customize Week 2"                                   | MOODBOARD        | **MOODBOARD** (stays) | "Week 2 — 'The Process' — gets a rawer, behind-the-scenes feel. Slightly desaturated, documentary-style framing."                                                                                                                                                                                                                                                                                                                                                                                                    | "Ready to review", "Customize another", "Change overall"                           | sectionMoodboards["week-2"] set                                                                                             |
| 7    | "Ready to review"                                    | MOODBOARD        | **REVIEW**            | "This positions your brand as the transparent voice in sustainable fashion — not preachy, not performative, just real. Strongest element: the narrative arc from 'why this matters' to 'join the movement' mirrors how trust actually builds. The calendar's engagement triggers are specific enough to drive interaction without feeling formulaic. One thing I'd push on: Week 4's conversion CTAs could reference a specific action (newsletter signup, first purchase discount) rather than generic 'shop now.'" | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                           |
| 8    | "Submit as-is"                                       | REVIEW           | **SUBMIT**            | "This is ready to bring to life. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —                                                                                  | task created                                                                                                                |

**Stages hit**: EXTRACT → INTENT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD (x2) → REVIEW → SUBMIT
**Stages skipped**: TASK_TYPE (inferred), DEEPEN
**STRATEGIC_REVIEW**: Flagged conservative conversion allocation. User overrode — system accepted immediately.
**REVIEW**: Expert consultation, reframed as "transparent voice", specific improvement suggestion.
**Tone**: Conversational, emotional, community-focused throughout. "Love this", "feels authentic", "your audience, your call."

---

### Trace 3: Vague Start → Website — Needs everything, competitive check (9 turns)

**First message**: "I want a design that is light and airy similar to legora"
**Tone**: default initially, recalibrated at INTENT

| Turn | User Message                                                                            | Stage Before     | Stage After           | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Quick Options                                                                      | State Mutation                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "Light and airy similar to legora"                                                      | EXTRACT          | **TASK_TYPE**         | "Great starting point — Legora's aesthetic is distinctive. What are we creating with this direction?"                                                                                                                                                                                                                                                                                                                                                                                                                                                | "Video", "Social content", "Website design", "Branding", "Something else"          | style=["light"], refs=["legora"]                                                                                                                      |
| 2    | "Website design"                                                                        | TASK_TYPE        | **INTENT**            | "Website it is. What's the purpose — what should visitors do when they land?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | "Landing page (signups)", "Brand showcase", "E-commerce", "Portfolio"              | category=website                                                                                                                                      |
| 3    | "Product landing page for our DTC skincare brand"                                       | INTENT           | **INSPIRATION**       | "DTC skincare — clean, trust-forward, conversion-focused. Legora's airy feel maps well here. Is there anyone in the skincare space you're positioning against or want to stand apart from?" [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                     | "I like this direction", "Show me more", "Something different"                     | intent=signups, audience=consumer, industry=skincare, tone recalibrated (conversational, low-tech, high-emotion), competitive check prompted          |
| 4    | "We're differentiated by our clinical testing — not like typical 'clean beauty' brands" | INSPIRATION      | **STRUCTURE**         | "That's a strong angle — clinical credibility in a market drowning in vague 'natural' claims. Style selected: Airy Minimal. 7-section layout: Hero (clinical proof headline), Trust Bar (certifications), Product Showcase, Clinical Results, Ingredients Transparency, Testimonials, CTA." [LAYOUT]                                                                                                                                                                                                                                                 | "Looks good, continue", "Add section", "Remove", "Rearrange"                       | competitiveDifferentiation="clinical testing differentiation", selectedStyles=[AiryMinimal], structure=layout(7 sections)                             |
| 5    | "Add a pricing section before CTA"                                                      | STRUCTURE        | **STRUCTURE** (stays) | "Done — Pricing section added. 8 sections total. Pricing positioned right before CTA to reduce friction between decision and action."                                                                                                                                                                                                                                                                                                                                                                                                                | "Looks good, continue", "More changes"                                             | structure updated (8 sections)                                                                                                                        |
| 6    | "Looks good, continue"                                                                  | STRUCTURE        | **STRATEGIC_REVIEW**  | "Strong foundation. Your clinical differentiation is the strongest strategic asset here — it gives you permission to charge premium without the typical DTC 'trust us' problem. Legora's airy aesthetic pairs well with clinical credibility; it feels premium without being clinical-cold. One thing I'd flag: the Trust Bar is positioned second, but for a clinical-differentiation play, consider leading with clinical results higher — possibly as part of the hero or immediately after. When your differentiator is proof, lead with proof." | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={strengths: ["clinical differentiation", "airy+clinical pairing"], risks: ["proof positioning could be higher"], fitScore: 'aligned'} |
| 7    | "Good catch, let's adjust"                                                              | STRATEGIC_REVIEW | **MOODBOARD**         | "Moved Clinical Results to position 2, right after Hero. Trust Bar now supports rather than leads. Visual direction: soft whites, light gray, generous whitespace, clean sans-serif, clinical photography with warmth."                                                                                                                                                                                                                                                                                                                              | "Ready to review", "Tweak visuals", "Customize hero"                               | structure reordered, overallMoodboard set                                                                                                             |
| 8    | "Ready to review"                                                                       | MOODBOARD        | **REVIEW**            | "This positions you as the skincare brand that doesn't need to hide behind aesthetics — your product stands on evidence. Strongest element: leading with clinical results immediately after the hero. Most DTC skincare sites bury proof below the fold. This inverts that and builds trust faster. One area for improvement: the testimonials section could include before/after clinical data alongside customer quotes to reinforce the clinical angle through social proof."                                                                     | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                                                     |
| 9    | "Submit as-is"                                                                          | REVIEW           | **SUBMIT**            | "This is production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —                                                                                  | task created                                                                                                                                          |

**Stages hit**: EXTRACT → TASK_TYPE → INTENT → INSPIRATION → STRUCTURE (x2) → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Stages skipped**: DEEPEN
**Competitive differentiation**: Naturally surfaced at INTENT → user engaged → woven into entire brief
**STRATEGIC_REVIEW**: Identified proof-positioning optimization. User accepted.
**Tone**: Shifted from default to conversational/emotional after DTC skincare audience was established at turn 3.

---

### Trace 4: Fitness Reels with Gymshark Inspiration — Mismatch flagged (7 turns)

**First message**: "3 Instagram reels, fitness app, Gymshark style"
**Tone**: conversational, medium-tech, high-emotion (consumer/fitness calibrated)

| Turn | User Message                                                                | Stage Before     | Stage After           | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Quick Options                                                                      | State Mutation                                                                                                                                         |
| ---- | --------------------------------------------------------------------------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | "3 Instagram reels, fitness app, Gymshark style"                            | EXTRACT          | **INSPIRATION**       | "Gymshark energy for a fitness app — high intensity, community-driven. Here's what captures that." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                                                          | "I like this direction", "Show me more", "Something different"                     | taskType=video, intent=signups, platform=instagram, audience=consumer/fitness, refs=["Gymshark"], style=["edgy"], tone calibrated                      |
| 2    | [selects Bold Fitness style]                                                | INSPIRATION      | **STRUCTURE**         | "3-reel storyboard. Reel 1 hook: 'You're tracking 4 apps to do what one should handle — here's why your gains are stalling.' Each reel: 15s, hook → pain → demo → CTA." [STORYBOARD]                                                                                                                                                                                                                                                                                                                             | "Looks good, continue", "Adjust scenes", "Different approach"                      | selectedStyles=[BoldFitness], structure=storyboard(3 reels)                                                                                            |
| 3    | "Actually, this is for enterprise corporate wellness, not consumer fitness" | STRUCTURE        | **STRUCTURE** (stays) | "That changes the game. Updating — corporate wellness has a completely different buyer psychology. Recalibrating."                                                                                                                                                                                                                                                                                                                                                                                               | "Looks good, continue", "Adjust", "Different approach"                             | audience=enterprise/corporate wellness, tone recalibrated (direct, medium-tech, low-emotion), structure regenerated                                    |
| 4    | "Looks good, continue"                                                      | STRUCTURE        | **STRATEGIC_REVIEW**  | "Important flag: Gymshark's visual style is consumer-fitness-coded — high energy, influencer-driven, gym culture. For enterprise corporate wellness buyers (HR directors, benefits managers), this aesthetic can read as unserious. I'd recommend borrowing Gymshark's pacing and production quality but dialing back the lifestyle intensity. Think: professional athletes training, not gym selfies. The energy translates; the aesthetic needs refinement for boardroom credibility."                         | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={fitScore: 'significant_mismatch', note: "Gymshark consumer-coded vs enterprise buyer", suggestion: "borrow pacing, refine aesthetic"} |
| 5    | "Good catch, let's adjust"                                                  | STRATEGIC_REVIEW | **MOODBOARD**         | "Adjusted: premium athletic aesthetic, clean corporate palette, professional training footage over gym culture imagery. Visual direction: dark charcoal, clean whites, minimal text, authoritative typography."                                                                                                                                                                                                                                                                                                  | "Ready to review", "Tweak visuals", "Customize reel"                               | structure refined, overallMoodboard set                                                                                                                |
| 6    | "Ready to review"                                                           | MOODBOARD        | **REVIEW**            | "This positions you as the serious corporate wellness platform — not another consumer fitness app that bolted on a B2B page. Strongest element: the hook references specific HR pain points (absenteeism costs, benefits ROI) which is exactly what gets budget approval. The Gymshark-inspired pacing keeps it engaging without sacrificing credibility. One thing I'd push on: Reel 3's CTA should reference pilot program or ROI calculator rather than 'sign up' — enterprise buyers don't impulse-convert." | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                                                      |
| 7    | "Submit as-is"                                                              | REVIEW           | **SUBMIT**            | "Production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —                                                                                  | task created                                                                                                                                           |

**Stages hit**: EXTRACT → INSPIRATION → STRUCTURE (x2, audience pivot) → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Stages skipped**: TASK_TYPE, INTENT, DEEPEN
**STRATEGIC_REVIEW**: Flagged **significant mismatch** between Gymshark inspiration and enterprise audience. User accepted adjustment.
**Tone recalibration**: Shifted from consumer/high-emotion to enterprise/direct mid-conversation when audience changed.

---

### Trace 5: AI Tool Launch — Vague start, competitive check, DEEPEN path (10 turns)

**First message**: "We're launching a new AI tool next month"
**Tone**: default initially, recalibrated at INTENT

| Turn | User Message                                           | Stage Before     | Stage After          | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Quick Options                                                                                                                   | State Mutation                                                                                                                          |
| ---- | ------------------------------------------------------ | ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "We're launching a new AI tool next month"             | EXTRACT          | **TASK_TYPE**        | "An AI tool launch — plenty of directions we can take this. What's the hero deliverable?"                                                                                                                                                                                                                                                                                                                                                                                                                                                            | "Video", "Social content", "Website design", "Branding", "Something else"                                                       | intent=announcement(0.7)                                                                                                                |
| 2    | "Website landing page"                                 | TASK_TYPE        | **INTENT**           | "Landing page for the launch. What's the primary conversion goal — what should visitors do?"                                                                                                                                                                                                                                                                                                                                                                                                                                                         | "Sign up for beta", "Join waitlist", "Book a demo", "Start free trial"                                                          | category=website                                                                                                                        |
| 3    | "Waitlist signups, targeting developers and dev teams" | INTENT           | **INSPIRATION**      | "Developer audience, waitlist conversion. Clean, technical, no-nonsense. Any tools or sites in the AI space you admire or want to differentiate from?" [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                                          | "I like this direction", "Show me more", "Something different"                                                                  | intent=signups, audience=developers, industry=AI/devtools, tone calibrated (direct, high-tech, low-emotion), competitive check prompted |
| 4    | "Not really, just make it look sharp"                  | INSPIRATION      | **STRUCTURE**        | "Sharp it is. [selects Dev Dark style automatically] 6-section layout: Hero (one-liner + waitlist CTA), Demo/Preview, How It Works (3 steps), Use Cases, Social Proof (GitHub stars, early adopters), Final CTA." [LAYOUT]                                                                                                                                                                                                                                                                                                                           | "Looks good, continue", "Add section", "Rearrange"                                                                              | selectedStyles=[DevDark], structure=layout(6 sections), competitive check skipped (user didn't engage)                                  |
| 5    | "Looks good, continue"                                 | STRUCTURE        | **STRATEGIC_REVIEW** | "Solid foundation. The layout follows the developer landing page playbook — hero with clear value prop, demo early, social proof before final CTA. Two strategic notes: (1) Developer audiences convert better when they can see the tool working before signing up — consider making the Demo section interactive or showing real output. (2) The 'How It Works' section should speak in the developer's workflow language, not product-marketing language. Show the integration, not the features."                                                | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is"                                              | strategicReview={strengths: ["developer-optimized layout"], risks: ["demo could be more concrete"], fitScore: 'aligned'}                |
| 6    | "Good catch, let's adjust"                             | STRATEGIC_REVIEW | **MOODBOARD**        | "Updated Demo section to 'Live Preview' with interactive terminal mockup guidance. 'How It Works' rewritten as integration steps. Visual direction: near-black background, monospace accents, syntax-highlighted code snippets, electric green accent."                                                                                                                                                                                                                                                                                              | "Ready to review", "Tweak visuals", "Customize section"                                                                         | structure refined, overallMoodboard set                                                                                                 |
| 7    | "Ready to review"                                      | MOODBOARD        | **REVIEW**           | "This positions you as the tool that respects developers' intelligence — no marketing theater, just show the work. Strongest element: the Live Preview section. Developer tools that let prospects touch the product before committing see 2-3x higher waitlist conversion. The dark aesthetic with code-native typography signals 'built by developers, for developers.' One thing I'd push on: the Hero one-liner needs to be extremely specific about what the tool does — developers bounce in under 5 seconds if they can't classify the tool." | "Submit as-is", "Go deeper first", "Make changes"                                                                               | —                                                                                                                                       |
| 8    | "Go deeper first"                                      | REVIEW           | **DEEPEN**           | "Good call. What would be most valuable to refine?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | "Refine hero copy to production-ready", "Conversion optimization pass", "Generate A/B landing page variant", "Done, submit now" | stage=DEEPEN                                                                                                                            |
| 9    | "Refine hero copy to production-ready"                 | DEEPEN           | **DEEPEN** (stays)   | "Three hero copy options: (1) '[Tool name]: Ship AI features in 3 lines of code' (2) '[Tool name]: Your existing codebase + AI, no rewrite required' (3) '[Tool name]: From API call to production AI in under 10 minutes.' I'd go with option 2 — it addresses the biggest developer fear (rewriting existing code) and implies zero-friction integration."                                                                                                                                                                                         | "Use option 1", "Use option 2", "Use option 3", "Done, submit now"                                                              | deepenSelections=["production_copy"]                                                                                                    |
| 10   | "Use option 2, submit now"                             | DEEPEN           | **SUBMIT**           | "Hero copy locked: 'Your existing codebase + AI, no rewrite required.' This is production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                   | —                                                                                                                               | hero copy finalized, task created                                                                                                       |

**Stages hit**: EXTRACT → TASK_TYPE → INTENT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → DEEPEN → SUBMIT
**Stages skipped**: None (all hit including optional DEEPEN)
**Competitive differentiation**: Soft prompt at INSPIRATION — user declined, system moved on.
**DEEPEN**: User chose to refine hero copy. AI provided 3 options with confident recommendation.
**Tone**: Technical, direct, developer-native language. "No marketing theater", "zero-friction integration."

---

### Trace 6: Yoga Studio Logo — Simple brand, fast path (6 turns)

**First message**: "Logo for a yoga studio"
**Tone**: conversational, low-tech, high-emotion (consumer/wellness calibrated)

| Turn | User Message                   | Stage Before     | Stage After          | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Quick Options                                                                      | State Mutation                                                                                                                                                             |
| ---- | ------------------------------ | ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "Logo for a yoga studio"       | EXTRACT          | **INSPIRATION**      | "A yoga studio identity — this is about capturing a feeling. Here are directions that resonate with wellness spaces." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                               | "I like this direction", "Show me more", "Something different"                     | taskType=single_asset, category=brand, intent=default(brand), audience=consumer/wellness, tone calibrated                                                                  |
| 2    | [selects Zen Minimal style]    | INSPIRATION      | **STRUCTURE**        | "Zen Minimal — perfect for this. Design spec: primary mark (wordmark + symbol), icon-only variant, horizontal lockup. Symbol explores: breath, flow, balance. Typography: clean sans-serif with organic warmth. Color: muted earth tones with one accent." [DESIGN_SPEC]                                                                                                                                                                                                 | "Looks good, continue", "Adjust elements", "Different approach"                    | selectedStyles=[ZenMinimal], structure=designSpec                                                                                                                          |
| 3    | "Looks good, continue"         | STRUCTURE        | **STRATEGIC_REVIEW** | "Clean direction. Zen Minimal is the dominant aesthetic in yoga/wellness branding right now — which means it's safe but potentially undifferentiated. If the studio has a unique angle (hot yoga, aerial, power yoga, meditation-focused), leaning into that could create a more distinctive mark. This is a 'good vs memorable' decision. The current direction is polished and appropriate. A more distinctive direction would require a stronger concept."            | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={strengths: ["appropriate", "polished"], risks: ["potentially undifferentiated"], fitScore: 'minor_mismatch', note: "Zen Minimal is dominant in category"} |
| 4    | "I hear you but keep it as-is" | STRATEGIC_REVIEW | **MOODBOARD**        | "Your call — polished and appropriate is a valid strategy. Visual direction: warm white, sage green, soft clay, clean lines, organic curves in the symbol."                                                                                                                                                                                                                                                                                                              | "Ready to review", "Tweak visuals"                                                 | userOverride=true, overallMoodboard set                                                                                                                                    |
| 5    | "Ready to review"              | MOODBOARD        | **REVIEW**           | "This delivers a professional, trustworthy yoga studio identity. Strongest element: the mark system (primary + icon + lockup) gives flexibility across signage, digital, and merchandise. The muted palette communicates calm without being forgettable. One thing to consider: when the logo is at small sizes (social media avatar, favicon), the zen minimal approach can disappear. The icon-only variant needs enough character to hold attention at 32x32 pixels." | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                                                                          |
| 6    | "Submit as-is"                 | REVIEW           | **SUBMIT**           | "Briefing submitted. Clean and intentional." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                                                  | task created                                                                                                                                                               |

**Stages hit**: EXTRACT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Stages skipped**: TASK_TYPE (inferred), INTENT (default for brand), DEEPEN
**STRATEGIC_REVIEW**: Flagged minor mismatch — not with inspiration/audience, but with market saturation of the chosen style. User overrode.
**Tone**: Warm, calm, wellness-appropriate. "Capturing a feeling", "organic warmth."

---

### Trace 7: LinkedIn Thought Leadership — Content calendar with full strategic calendar (8 turns)

**First message**: "LinkedIn thought leadership, CEO, weekly posts"
**Tone**: direct, medium-tech, low-emotion (executive/professional calibrated)

| Turn | User Message                                     | Stage Before     | Stage After           | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Quick Options                                                                                                              | State Mutation                                                                                                                 |
| ---- | ------------------------------------------------ | ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | "LinkedIn thought leadership, CEO, weekly posts" | EXTRACT          | **INSPIRATION**       | "CEO thought leadership on LinkedIn — this is about building authority that translates to pipeline. Here's what resonates in executive content." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                                                                                                                         | "I like this direction", "Show me more", "Something different"                                                             | taskType=multi_asset, platform=linkedin, intent=authority, audience=executives, tone calibrated                                |
| 2    | [selects Executive Authority style]              | INSPIRATION      | **STRUCTURE**         | "12-week calendar. 2x/week (Tue + Thu). Pillars: Industry Perspective (40%), Leadership Lessons (30%), Company Culture (20%), Contrarian Takes (10%). Week 1 arc: 'Establishing the lens.' CTA escalation: Weeks 1-4 awareness (follow, share), Weeks 5-8 engagement (comment, tag someone), Weeks 9-12 conversion (DM for consulting, visit site, download framework). Each post has engagement trigger (question, data point, controversial framing)." [CALENDAR]                                                                                                                                                           | "Looks good, continue", "Adjust", "Different cadence"                                                                      | selectedStyles=[ExecAuth], structure=calendar(12 weeks, pillars, arcs, CTAs, triggers)                                         |
| 3    | "Make it 3x/week and add a Friday casual post"   | STRUCTURE        | **STRUCTURE** (stays) | "Updated: Mon (Industry), Wed (Leadership), Fri (Behind-the-Scenes / casual). Friday posts are support content — lighter, more personal, builds relatability alongside authority. Pillar rebalance: Industry 35%, Leadership 25%, Culture/Casual 25%, Contrarian 15%."                                                                                                                                                                                                                                                                                                                                                        | "Looks good, continue", "More changes"                                                                                     | structure updated (3x/week, Friday casual added)                                                                               |
| 4    | "Looks good, continue"                           | STRUCTURE        | **STRATEGIC_REVIEW**  | "This is a strong content engine. The 3x/week cadence with Friday casual is the right move for LinkedIn — data shows personal posts from executives outperform industry takes on engagement metrics. The CTA escalation from awareness to conversion is well-paced across 12 weeks. One strategic consideration: the Contrarian Takes pillar (15%) is your highest-risk, highest-reward content. These posts will drive the most engagement but also the most scrutiny. I'd recommend front-loading contrarian takes after the authority pillars have established credibility — don't lead with controversy."                 | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is"                                         | strategicReview={strengths: ["cadence", "CTA escalation", "casual Friday"], risks: ["contrarian timing"], fitScore: 'aligned'} |
| 5    | "Looks good, continue"                           | STRATEGIC_REVIEW | **MOODBOARD**         | "Visual direction: clean white backgrounds, professional photography, minimal branded frames, navy/charcoal text overlays. Friday posts get looser framing — phone photos, informal composition."                                                                                                                                                                                                                                                                                                                                                                                                                             | "Ready to review", "Tweak visuals"                                                                                         | overallMoodboard set, sectionMoodboards["friday-casual"] set                                                                   |
| 6    | "Ready to review"                                | MOODBOARD        | **REVIEW**            | "This positions your CEO as the voice of authority in your industry — not thought leadership for vanity, but thought leadership that builds trust equity convertible to business outcomes. Strongest element: the CTA escalation. Most CEO LinkedIn strategies post randomly and hope for followers. This systematically moves audience from awareness to conversion. The Friday casual pillar humanizes without undermining. One thing I'd push on: Weeks 9-12 conversion CTAs should reference a specific asset (framework PDF, diagnostic call) rather than generic 'visit our website.' Give people a reason to convert." | "Submit as-is", "Go deeper first", "Make changes"                                                                          | —                                                                                                                              |
| 7    | "Go deeper first"                                | REVIEW           | **DEEPEN**            | "What would add the most value?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | "Refine post copy for Week 1", "Generate A/B variant for contrarian posts", "Optimize conversion CTAs", "Done, submit now" | stage=DEEPEN                                                                                                                   |
| 8    | "Optimize conversion CTAs, then submit"          | DEEPEN           | **SUBMIT**            | "Conversion CTAs refined: Week 9 = 'DM me "framework" for our [Industry] Operating Playbook', Week 10 = 'We're opening 5 diagnostic call slots — link in comments', Week 11 = 'Reply with your biggest [challenge] and I'll record a 2-min response', Week 12 = 'Doors open [date] — [specific offer].' These are specific, scarce, and action-oriented. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                    | —                                                                                                                          | deepenSelections=["conversion_optimization"], task created                                                                     |

**Stages hit**: EXTRACT → INSPIRATION → STRUCTURE (x2) → STRATEGIC_REVIEW → MOODBOARD → REVIEW → DEEPEN → SUBMIT
**Stages skipped**: TASK_TYPE, INTENT
**Content calendar features**: Posting cadence, pillars with %, narrative arcs, CTA escalation, engagement triggers, distribution logic — all present
**DEEPEN**: User chose conversion optimization. AI provided specific, actionable CTAs.
**Tone**: Direct, professional, ROI-focused. "Trust equity convertible to business outcomes."

---

### Trace 8: Pitch Deck for Investors — Formal tone, fundraising intent (7 turns)

**First message**: "Pitch deck for investor meeting next week"
**Tone**: formal, high-tech, low-emotion (investor/startup calibrated)

| Turn | User Message                                                 | Stage Before     | Stage After          | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Quick Options                                                                      | State Mutation                                                                                                                                                              |
| ---- | ------------------------------------------------------------ | ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "Pitch deck for investor meeting next week"                  | EXTRACT          | **INTENT**           | "Investor pitch deck — understood. What stage and what's the ask?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | "Seed round", "Series A", "Series B+", "Bridge/extension"                          | taskType=slide, audience=investors, industry=startup, tone calibrated                                                                                                       |
| 2    | "Series A, raising $5M for our fintech platform"             | INTENT           | **INSPIRATION**      | "Series A, $5M, fintech. Institutional investors at this stage want market size, traction, and unit economics. Here's what reads as credible in fintech decks." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                                                                                                               | "I like this direction", "Show me more", "Something different"                     | intent=fundraising, topic="fintech platform Series A"                                                                                                                       |
| 3    | [selects Fintech Professional style]                         | INSPIRATION      | **STRUCTURE**        | "12-slide structure: Cover, Problem (regulatory compliance costs), Solution, Market Size ($X TAM), Business Model, Traction (MRR, growth rate), Unit Economics (CAC/LTV), Competitive Landscape, Team, Go-to-Market, Financials (18-month projection), The Ask ($5M, use of funds). Is there a specific competitor landscape you want to address?" [DESIGN_SPEC for slides]                                                                                                                                                                                                                                                        | "Looks good, continue", "Add slide", "Rearrange"                                   | selectedStyles=[FintechPro], structure=designSpec(12 slides), competitive check prompted                                                                                    |
| 4    | "We compete with legacy compliance tools — we're 10x faster" | STRUCTURE        | **STRATEGIC_REVIEW** | "That's a strong differentiator. Stored for the competitive landscape slide. Strategic assessment: the 12-slide structure follows the standard Series A framework investors expect — deviating from this structure at Series A is risky. Your strongest strategic asset is the speed differentiator (10x) — this should appear in the Problem slide (legacy tools are slow), Solution slide (your speed), and Competitive slide (direct comparison). One risk: 'fintech' can mean many things to investors. The Problem slide needs to be extremely specific about which compliance problem and for which financial institutions." | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | competitiveDifferentiation="10x faster than legacy compliance", strategicReview={strengths: ["standard structure", "clear differentiator"], risks: ["fintech specificity"]} |
| 5    | "Looks good, continue"                                       | STRATEGIC_REVIEW | **MOODBOARD**        | "Visual direction: dark navy, white text, minimal data visualizations, clean sans-serif, fintech-grade typography. Traction slides use bold numbers. No gradients, no decorative elements — let the data speak."                                                                                                                                                                                                                                                                                                                                                                                                                   | "Ready to review", "Tweak visuals"                                                 | overallMoodboard set                                                                                                                                                        |
| 6    | "Ready to review"                                            | MOODBOARD        | **REVIEW**           | "This deck tells the story investors need at Series A: clear problem, defensible solution, proof of traction, and a specific ask. Strongest element: threading the 10x speed differentiator across Problem, Solution, and Competitive slides creates a cohesive narrative rather than a feature list. The 12-slide structure respects investor time — no filler. One thing I'd push on: the Financials slide should include a sensitivity analysis or key assumptions callout. Sophisticated Series A investors will challenge your projections — showing you've stress-tested them builds confidence."                            | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                                                                           |
| 7    | "Submit as-is"                                               | REVIEW           | **SUBMIT**           | "Deck structure is investor-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                  | task created                                                                                                                                                                |

**Stages hit**: EXTRACT → INTENT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Stages skipped**: TASK_TYPE (inferred), DEEPEN
**Competitive differentiation**: User engaged naturally at STRUCTURE — woven into strategic review.
**Tone**: Formal, precise, financial language. "Unit economics", "sensitivity analysis", "stress-tested."

---

### Trace 9: Bold Website Landing Page — Fast path, no mismatches (6 turns)

**First message**: "Website landing page, bold, conversion-focused"
**Tone**: default initially (no audience signal), recalibrated at INSPIRATION

| Turn | User Message                                     | Stage Before     | Stage After          | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                            | Quick Options                                                                      | State Mutation                                                                                                                                                  |
| ---- | ------------------------------------------------ | ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "Website landing page, bold, conversion-focused" | EXTRACT          | **INSPIRATION**      | "Bold, conversion-focused landing page. Here are directions that hit hard." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                                    | "I like this direction", "Show me more", "Something different"                     | taskType=website, intent=signups, style=["bold"], tone=default                                                                                                  |
| 2    | [selects Bold Impact style]                      | INSPIRATION      | **STRUCTURE**        | "Bold Impact. 6-section layout: Hero (big claim + CTA above fold), Problem Agitation, Solution, Social Proof, Objection Handling, Final CTA with urgency." [LAYOUT]                                                                                                                                                                                                                                                                                                 | "Looks good, continue", "Add section", "Rearrange"                                 | selectedStyles=[BoldImpact], structure=layout(6 sections)                                                                                                       |
| 3    | "Looks good, continue"                           | STRUCTURE        | **STRATEGIC_REVIEW** | "This is a conversion-first layout — every section serves the CTA. The Problem Agitation → Solution → Social Proof sequence is a proven conversion framework. Bold Impact style matches the conversion intent perfectly — no mismatch. One thing I'd push on: the Objection Handling section is underused in most landing pages but it's the highest-leverage section for conversion. Make sure it addresses the top 3 reasons people don't buy, not generic FAQs." | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={strengths: ["conversion-first layout", "style-intent alignment"], risks: [], fitScore: 'aligned', suggestion: "strengthen objection handling"} |
| 4    | "Looks good, continue"                           | STRATEGIC_REVIEW | **MOODBOARD**        | "Visual direction: high contrast, black/white with one electric accent color, oversized typography, sharp edges, aggressive CTAs with hover animations."                                                                                                                                                                                                                                                                                                            | "Ready to review", "Tweak visuals", "Customize section"                            | overallMoodboard set                                                                                                                                            |
| 5    | "Ready to review"                                | MOODBOARD        | **REVIEW**           | "This is a conversion machine. Strongest element: the Problem Agitation section — most landing pages skip straight to features. Agitating the pain before presenting the solution increases desire. The bold aesthetic reinforces urgency throughout. One area: the Final CTA should differ from the Hero CTA — if Hero says 'Start Free Trial', Final should add scarcity or social proof ('Join 2,000+ teams' or 'Limited spots this month')."                    | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                                                               |
| 6    | "Submit as-is"                                   | REVIEW           | **SUBMIT**           | "Production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                                                  | task created                                                                                                                                                    |

**Stages hit**: EXTRACT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Stages skipped**: TASK_TYPE, INTENT (inferred), DEEPEN
**STRATEGIC_REVIEW**: No mismatches — offered specific optimization (objection handling). User acknowledged and moved on.
**Tone**: Stayed default/direct since no specific audience was identified. Conversion-focused language throughout.

---

### Trace 10: "Something cool for our new product" — Maximum ambiguity, full journey (10 turns)

**First message**: "Something cool for our new product"
**Tone**: default initially, recalibrated progressively

| Turn | User Message                                             | Stage Before     | Stage After          | AI Response (summarized)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Quick Options                                                                                                               | State Mutation                                                                                                                         |
| ---- | -------------------------------------------------------- | ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "Something cool for our new product"                     | EXTRACT          | **TASK_TYPE**        | "New product — exciting. What's the hero deliverable for this launch?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | "Video", "Social content", "Website design", "Branding", "Something else"                                                   | topic="new product"                                                                                                                    |
| 2    | "Social content"                                         | TASK_TYPE        | **INTENT**           | "Social content for the launch. What's the primary goal — what should this content make people do?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | "Drive awareness", "Drive signups", "Build hype", "Educate"                                                                 | category=content                                                                                                                       |
| 3    | "Build hype for the launch, it's a travel app for Gen Z" | INTENT           | **INSPIRATION**      | "Gen Z travel app — this needs to feel native to how they actually discover things. Not corporate, not try-hard. Here's what hits with that audience." [DELIVERABLE_STYLES]                                                                                                                                                                                                                                                                                                                                                                                                | "I like this direction", "Show me more", "Something different"                                                              | intent=awareness/hype, audience=GenZ, industry=travel, tone calibrated (conversational, low-tech, high-emotion)                        |
| 4    | [selects Lo-Fi Authentic style]                          | INSPIRATION      | **STRUCTURE**        | "Lo-Fi Authentic — smart choice, this is how Gen Z content actually spreads. 2-week pre-launch calendar. 5x/week across Instagram + TikTok. Pillars: Behind-the-Build (35%), Destination Teasers (30%), Community Hype (25%), FOMO Drops (10%). Week 1 arc: 'What we're building and why.' Week 2 arc: 'It's almost here.' CTA escalation: Week 1 = save/follow, Week 2 = join waitlist/share with friends. Engagement triggers: polls, 'guess the feature', countdown stickers, duet challenges." [CALENDAR]                                                              | "Looks good, continue", "Adjust", "Different approach"                                                                      | selectedStyles=[LoFiAuth], structure=calendar(2 weeks, 5x/week, pillars, arcs, CTAs, triggers, cross-posting)                          |
| 5    | "Looks good, continue"                                   | STRUCTURE        | **STRATEGIC_REVIEW** | "This calendar is designed to spread, not just post. The Lo-Fi Authentic style is the right play for Gen Z — overproduced content signals 'ad' and gets scrolled past. Behind-the-Build pillar is your strongest asset because Gen Z values transparency and process over polish. One heads-up: FOMO Drops at 10% might be too subtle for a 2-week pre-launch. When you're building hype with a deadline, scarcity messaging should escalate more aggressively in the final 3-4 days. Consider bumping FOMO to 20% in Week 2."                                             | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is"                                          | strategicReview={strengths: ["lo-fi strategy", "transparency pillar"], risks: ["FOMO too subtle for pre-launch"], fitScore: 'aligned'} |
| 6    | "Good catch, let's adjust"                               | STRATEGIC_REVIEW | **MOODBOARD**        | "Week 2 FOMO bumped to 20%, Community Hype adjusted. Visual direction: phone-shot aesthetic, minimal editing, raw textures, vibrant but not oversaturated, Gen Z meme-adjacent energy without trying too hard."                                                                                                                                                                                                                                                                                                                                                            | "Ready to review", "Tweak visuals", "Customize week"                                                                        | structure updated, overallMoodboard set                                                                                                |
| 7    | "Ready to review"                                        | MOODBOARD        | **REVIEW**           | "This positions your launch as an event Gen Z discovers, not an ad they're served. Strongest element: the pillar balance and lo-fi aesthetic work together — Behind-the-Build content filmed on phones feels like a friend sharing something cool, not a brand marketing at you. The 2-week concentrated push creates genuine momentum. One thing I'd push on: the duet challenge engagement trigger in Week 2 needs a specific hook — 'show us your dream trip' is vague. 'Pack for a trip in 10 seconds using only [app name]' is specific, fun, and shows the product." | "Submit as-is", "Go deeper first", "Make changes"                                                                           | —                                                                                                                                      |
| 8    | "Go deeper first"                                        | REVIEW           | **DEEPEN**           | "What would add the most value?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | "Refine post copy for key posts", "Generate A/B variant for launch day", "Optimize engagement triggers", "Done, submit now" | stage=DEEPEN                                                                                                                           |
| 9    | "Generate A/B variant for launch day"                    | DEEPEN           | **DEEPEN** (stays)   | "Launch day A/B: Variant A — 'It's here. [App name] is live.' (understated, let the product speak). Variant B — '6 months of building. 47 countries mapped. 0 boring itineraries. [App name] is live.' (specific, builds credibility through numbers). I'd test B first — Gen Z responds to specificity over hype."                                                                                                                                                                                                                                                        | "Use Variant A", "Use Variant B", "Keep both for testing", "Done, submit now"                                               | deepenSelections=["ab_variant"]                                                                                                        |
| 10   | "Keep both for testing, submit"                          | DEEPEN           | **SUBMIT**           | "Both variants preserved for A/B testing on launch day. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                           | both variants stored, task created                                                                                                     |

**Stages hit**: EXTRACT → TASK_TYPE → INTENT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → DEEPEN → SUBMIT
**Stages skipped**: None (all stages hit, including both optional stages)
**STRATEGIC_REVIEW**: Caught FOMO allocation issue for pre-launch timeline. User accepted.
**DEEPEN**: User chose A/B variant generation. AI provided two with a recommendation.
**Tone**: Shifted from default to Gen Z-native conversational after turn 3. "Meme-adjacent energy without trying too hard."

---

**Observations across 10 traces**:

1. **Turn counts**: 6 turns (fast, detailed start) to 10 turns (vague start + DEEPEN). Average: ~7.5 turns.
2. **STRATEGIC_REVIEW always adds value**: Even when aligned (no mismatch), it surfaces optimization opportunities. Significant mismatch (Trace 4) caught a real issue. Minor mismatch (Trace 6) flagged market saturation.
3. **User override works naturally**: "I hear you but keep it as-is" transitions immediately. No friction, no re-prompting.
4. **Tone calibration is noticeable across traces**: Compare Trace 1 (CTO: direct, technical) vs Trace 2 (sustainable fashion: warm, emotional) vs Trace 8 (investor: formal, financial). Same system, different voices.
5. **REVIEW consultation vs old confirmation**: Every REVIEW identifies strongest element + one improvement. "This is strong because X. I'd push on Y." Never "Does this look good?"
6. **DEEPEN is used 3/10 times**: Users who want depth get it. Others skip straight to submit. Optional stages don't slow down fast users.
7. **Content calendar strategic features**: Traces 2, 7, 10 all show posting cadence, pillars with %, narrative arcs, CTA escalation, engagement triggers, and distribution logic.
8. **Video hooks**: Traces 1 and 4 show persona-specific hooks with pain metrics (CTO: "deployment friction", corporate wellness: "absenteeism costs").
9. **Competitive differentiation**: Soft prompt appeared in Traces 3, 5, 8. Users engaged in 3 and 8, declined in 5. System moved on gracefully in all cases.
10. **Authority tone at key moments**: STRATEGIC_REVIEW, REVIEW, and SUBMIT across all traces use "This is strong because...", "I'd push on...", "Production-ready." Zero instances of "What do you think?" or "Does this work?"

## Verification

1. **Unit tests**: State transitions cover all 10 example messages above (including STRATEGIC_REVIEW and DEEPEN transitions)
2. **Unit tests**: Extraction functions with sample messages (including audience/industry extraction)
3. **Unit tests**: Tone calibration with various audience/industry/platform combos
4. **Unit tests**: Inspiration fit check with aligned, minor mismatch, and significant mismatch scenarios
5. **Unit tests**: Prompt builder produces correct stage-specific prompts with tone injection and authority mode
6. **Unit tests**: Response parser correctly extracts storyboard/layout/calendar/strategic-review structures
7. **Unit tests**: `pivotCategory()` preserves correct fields and clears others (including strategicReview and deepenSelections)
8. **Unit tests**: Content calendar validation — cadence, pillars, narrative arcs, CTA escalation all present
9. **Unit tests**: Video hook validation — scene 1 has persona, pain metric, quantifiable impact
10. **Unit tests**: DEEPEN stage transitions and option generation by deliverable type
11. **Manual test**: Each of the 10 example messages lands on the correct stage
12. **Manual test**: Skip behavior works (detailed first messages jump to INSPIRATION)
13. **Manual test**: Each branch works (video→storyboard, website→layout, content→calendar, design→spec)
14. **Manual test**: Moodboard hybrid works (overall + per-section overrides)
15. **Manual test**: Category pivot works (video→website at REVIEW resets to STRUCTURE, clears strategicReview)
16. **Manual test**: State rehydration works (refresh page, state + tone profile restores)
17. **Manual test**: STRATEGIC_REVIEW flow — aligned (proceeds), minor mismatch (user overrides), significant mismatch (user adjusts)
18. **Manual test**: Tone calibration audible difference between enterprise and consumer conversations
19. **Manual test**: REVIEW consultation provides strategic framing, not passive confirmation
20. **Manual test**: DEEPEN stage loop works (select multiple depth paths before submitting)
21. **Manual test**: Content calendar shows cadence, pillars, narrative arcs, CTA escalation, engagement triggers
22. **Manual test**: Video hooks are role-specific with pain metrics
23. **Manual test**: Authority tone at STRATEGIC_REVIEW, REVIEW, DEEPEN, SUBMIT — no passive questions
24. **Regression**: `npm run validate` passes (lint + typecheck + test)
