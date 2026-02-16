# 10x Chat Experience: State-Machine-Driven Creative Briefing

## Implementation Plan for Claude Code Agent

> **Instructions**: This is a complete, self-contained implementation plan. Execute phases in order. Each phase lists the exact files to create/modify, the types to implement, and the tests to write. Reference the conversation traces as acceptance criteria.

---

## Context

The current chat experience is unreliable because the AI operates without state awareness. The system prompt (`src/lib/ai/chat.ts:56-158`) is static — identical on message 1 and message 10. The AI freelances the conversation flow: sometimes asks weird questions, sometimes asks nothing, quick options are fragile (AI forgets `[QUICK_OPTIONS]`), the 300-token cap with aggressive post-processing (40+ regex patterns in `chat.ts:428-544`) makes output feel thin, and all responses sound the same regardless of audience or industry.

The fix: a **state machine** controls the conversation flow deterministically. The AI generates creative text but the state machine decides what to ask, when to show styles, and what quick options to display.

### Current System Summary (What Exists Today)

| File                                          | Role               | Key Details                                                                                                                      |
| --------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/ai/chat.ts`                          | Core chat          | Static SYSTEM_PROMPT (lines 56-158), 300 max_tokens, Claude Sonnet 4, aggressive post-processing                                 |
| `src/app/api/chat/route.ts`                   | Chat API           | Rate limited 30/min, marker system ([DELIVERABLE_STYLES], [QUICK_OPTIONS]), brand-aware style fetching, video reference handling |
| `src/lib/ai/inference-engine.ts`              | Silent inference   | Pattern matching for 11 platforms, 8 intents, task types. `inferFromMessage()`, `analyzeRequestCompleteness()`                   |
| `src/lib/ai/brand-style-scoring.ts`           | Style ranking      | Multi-factor: brand 0.35, history 0.3, popularity 0.2, freshness 0.15. `getBrandAwareStyles()`                                   |
| `src/lib/ai/semantic-style-search.ts`         | Style search       | `searchStylesByQuery()`, `aiEnhancedStyleSearch()`, `refineStyleSearch()`                                                        |
| `src/lib/ai/video-references.ts`              | Video refs         | `getVideoReferencesForChat()`, `isVideoDeliverableType()`                                                                        |
| `src/lib/ai/chat-context.ts`                  | Context extraction | `extractStyleContext()`, `detectIndustryFromMessage()`                                                                           |
| `src/components/chat/useChatInterfaceData.ts` | Chat state hook    | 1,743 lines, 30+ useState calls, manages messages/styles/moodboard/drafts/payments                                               |
| `src/components/chat/chat-interface.tsx`      | Chat UI            | 1,213 lines, renders messages/styles/videos/tasks/input                                                                          |
| `src/lib/chat-progress.ts`                    | Progress tracking  | 5 stages: brief, style, details, review, submit                                                                                  |
| `src/components/chat/brief-panel/types.ts`    | Brief types        | LiveBrief with InferredField<T>, completion calculation, readiness check                                                         |
| `src/lib/hooks/use-brief.ts`                  | Brief hook         | Manages LiveBrief, calls inferFromMessage(), applyInferenceToBrief()                                                             |
| `src/lib/chat-drafts.ts`                      | Draft persistence  | ChatDraft interface, localStorage + server sync                                                                                  |
| `src/lib/creative-intake/`                    | Structured intake  | 6 service types, smart defaults (video lengths, posting frequencies), disconnected from chat                                     |
| `src/components/chat/quick-options.tsx`       | Quick option UI    | Up to 4 chips, multi-select mode, sage green color scheme                                                                        |

---

## Flow Stages

```
EXTRACT → TASK_TYPE → INTENT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → (DEEPEN) → SUBMIT
```

1. **EXTRACT** — First message: parse everything possible (task type, intent, platform, topic, style keywords, inspiration references)
2. **TASK_TYPE** — "What are we making?" (if not clear from first message)
3. **INTENT** — "What's the business goal?" (if not inferrable)
4. **INSPIRATION** — Show style references matching context, user picks
5. **STRUCTURE** — Branches by deliverable type:
   - **Video** → Storyboard (scene by scene: hook, problem, solution, CTA)
   - **Website** → Layout (hero, features, social proof, CTA, footer)
   - **Content** → Calendar (pillars, weekly arcs, CTA escalation, engagement triggers)
   - **Single design** → Design specification (format, dimensions, elements, copy)
6. **STRATEGIC_REVIEW** — Advisory layer: strengths, risks, inspiration fit check. User can override.
7. **MOODBOARD** — Overall visual direction + optional per-section overrides
8. **REVIEW** — Expert consultation: reframes strategically, identifies strongest element + one improvement
9. **DEEPEN** (optional) — Refine to production-ready, write scripts, A/B variants, conversion optimization
10. **SUBMIT** — Create task, assign freelancer

**Key principle**: Skip stages when data is available. If user says "Stripe launch videos for B2B SaaS, CTOs, clean minimal" — TASK_TYPE and INTENT are skipped.

---

## Complete Type Definitions

### Core State Types

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

// BriefingState COMPOSES LiveBrief — does NOT duplicate its fields
interface BriefingState {
  stage: BriefingStage
  deliverableCategory: DeliverableCategory | null
  brief: LiveBrief // THE source of truth for taskType, intent, platform, topic, audience

  // Fields that DON'T exist in LiveBrief
  industry: InferredField<string> | null
  styleKeywords: string[]
  inspirationRefs: string[]
  videoReferenceIds: string[]
  structure: StructureData | null
  strategicReview: StrategicReviewData | null
  sectionMoodboards: Record<string, Partial<VisualDirection>>
  competitiveDifferentiation: string | null
  deepenSelections: DeepenOption[] | null
  toneProfile: ToneProfile | null
  turnsInCurrentStage: number
  messageCount: number
}
```

### Structure Types (Branched by Deliverable)

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
  hookData?: VideoHookData // scene 1 only
  referenceVideoId?: string // links to selected video reference
}

interface VideoHookData {
  targetPersona: string // specific role/title (e.g., "CTO", "Head of Growth")
  painMetric: string // operational consequence (e.g., "3-week onboarding bottleneck")
  quantifiableImpact: string // number or metric (e.g., "Teams using X ship 2x faster")
}

interface LayoutSection {
  sectionName: string
  purpose: string
  contentGuidance: string
  order: number
}

interface ContentOutline {
  totalDuration: string // "30 days", "12 weeks"
  postingCadence: string // "3x/week", "daily"
  platforms: string[]
  distributionLogic: string // cross-posting strategy
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
  engagementTrigger: string // what drives interaction
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
```

### Strategic Review Types

```typescript
interface StrategicReviewData {
  strengths: string[]
  risks: string[]
  optimizationSuggestion: string
  inspirationFitScore: 'aligned' | 'minor_mismatch' | 'significant_mismatch'
  inspirationFitNote: string | null
  userOverride: boolean
}

type DeepenOption =
  | 'production_copy'
  | 'script_writing'
  | 'ab_variant'
  | 'conversion_optimization'
  | 'asset_specifications'
```

### Tone Profile Types

```typescript
interface ToneProfile {
  languageSharpness: 'direct' | 'conversational' | 'formal'
  technicalDepth: 'high' | 'medium' | 'low'
  emotionalIntensity: 'high' | 'medium' | 'low'
  directnessLevel: 'high' | 'medium' | 'low'
  vocabularyRegister: string[]
  toneDescription: string // paragraph injected into every stage prompt
}
```

### Tone Mapping Table

| Context                      | Sharpness      | Tech Depth | Emotion | Directness | Example Phrasing                                     |
| ---------------------------- | -------------- | ---------- | ------- | ---------- | ---------------------------------------------------- |
| Enterprise CTO               | direct         | high       | low     | high       | "This integrates with existing infrastructure..."    |
| Sustainable fashion consumer | conversational | low        | high    | medium     | "Your story connects with people who care about..."  |
| Travel startup               | conversational | low        | medium  | high       | "Clean, simple, gets out of the user's way..."       |
| B2B SaaS marketing           | direct         | medium     | low     | high       | "This positions you for pipeline conversion..."      |
| Lifestyle/wellness brand     | conversational | low        | high    | low        | "This feels authentic to your community..."          |
| Fintech/banking              | formal         | high       | low     | high       | "This reinforces trust and regulatory compliance..." |

### Hook API Types (useBriefingStateMachine)

```typescript
// Reducer pattern — one dispatch handles all non-message state changes
type BriefingAction =
  | { type: 'GO_BACK'; stage: BriefingStage }
  | { type: 'PIVOT_CATEGORY'; category: DeliverableCategory }
  | { type: 'STAGE_RESPONSE'; response: 'accept' | 'override' }
  | { type: 'SELECT_DEEPEN'; option: DeepenOption }
  | { type: 'CONFIRM_SUBMIT' }

interface UseBriefingStateMachineReturn {
  // State
  briefingState: BriefingState
  serializedState: SerializedBriefingState

  // Derived (computed from state, recompute on change)
  quickOptions: QuickOptions
  systemPromptContext: string

  // Actions (only 2 methods)
  processMessage: (message: string, inference: InferenceResult) => BriefingState
  dispatch: (action: BriefingAction) => void
}

// Initialization via hook parameter
function useBriefingStateMachine(
  initialState?: SerializedBriefingState,
  options?: { draftId: string; brandAudiences?: InferredAudience[] }
): UseBriefingStateMachineReturn
```

### Parse Result Types

```typescript
interface ParseResult<T> {
  success: boolean
  data: T | null
  isPartial: boolean
  rawText: string
  parseError?: string
}
```

### Stall Config Types

```typescript
interface StallConfig {
  maxTurnsBeforeNarrow: number | null
  maxTurnsBeforeRecommend: number | null
  softNudgeAfter: number | null
}

const STALL_CONFIG: Record<BriefingStage, StallConfig> = {
  EXTRACT: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  TASK_TYPE: { maxTurnsBeforeNarrow: 2, maxTurnsBeforeRecommend: 3, softNudgeAfter: null },
  INTENT: { maxTurnsBeforeNarrow: 2, maxTurnsBeforeRecommend: 3, softNudgeAfter: null },
  INSPIRATION: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  STRUCTURE: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: 4 },
  STRATEGIC_REVIEW: {
    maxTurnsBeforeNarrow: null,
    maxTurnsBeforeRecommend: null,
    softNudgeAfter: null,
  },
  MOODBOARD: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  REVIEW: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  DEEPEN: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  SUBMIT: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
}
```

---

## Architecture Components

### 1. State Machine (`src/lib/ai/briefing-state-machine.ts`)

Core logic for state management and transitions.

**Exports**:

- `BriefingState`, `BriefingStage`, `DeliverableCategory`, `StructureData` types
- `evaluateTransitions(state, inference): BriefingStage` — pure function
- `goBackTo(state, targetStage): BriefingState` — clears only data produced AT and AFTER target stage
- `pivotCategory(state, newCategory): BriefingState` — partial reset to STRUCTURE
- `serialize(state): SerializedBriefingState`
- `deserialize(data): BriefingState`
- `STALL_CONFIG` constant

**Transition Rules**: Pure functions `(state, inference) → nextStage`. Key rules:

- If `brief.taskType` has value with confidence >= 0.75, skip TASK_TYPE
- If `brief.intent` has value with confidence >= 0.75, skip INTENT
- STRUCTURE requires `selectedStyles.length > 0`
- STRATEGIC_REVIEW requires `structure !== null`
- REVIEW requires `overallMoodboard !== null`
- DEEPEN only entered via "Go deeper first" at REVIEW
- SUBMIT requires explicit user confirmation

**goBackTo() clearing rules**:

- Going back to INSPIRATION: clears selectedStyles, preserves intent/topic/audience
- Going back to STRUCTURE: clears structure + strategicReview + moodboard + deepenSelections
- Going back to INTENT: clears intent + all downstream
- If audience/industry changes: triggers tone recalibration

**pivotCategory()**: Preserves intent, topic, audience, styleKeywords, inspirationRefs, overallMoodboard. Clears structure, strategicReview, sectionMoodboards, competitiveDifferentiation, deepenSelections.

### 2. Tone Calibration (`src/lib/ai/briefing-tone.ts`)

**Exports**:

- `ToneProfile` type
- `calibrateTone(audience, industry, platform, intent): ToneProfile`
- `toneToStylePreference(tone: ToneProfile): Partial<StyleContext>` — feeds into brand-style-scoring

Computed once at EXTRACT/INTENT. Recalibrates if audience/industry changes mid-conversation. The `toneDescription` field is injected into every stage prompt:

```
== TONE ==
You are speaking to {audience description}. Use {sharpness} language.
Technical depth: {level}. Emotional resonance: {level}.
{industry-specific vocabulary notes}
Do NOT use: {anti-patterns for this audience}
```

### 3. Strategic Review (`src/lib/ai/briefing-strategic.ts`)

**Exports**:

- `StrategicReviewData` type
- `inspirationFitCheck(inspirationRefs, selectedStyles, audience, industry, intent, category): { fitScore, note }`

Runs at STRATEGIC_REVIEW stage. Examples:

- Gymshark + enterprise CTO → minor_mismatch: "Gymshark's visual energy is consumer-fitness-coded. For CTOs, consider borrowing the pacing but dialing back the lifestyle intensity."
- Stripe + B2B SaaS + CTOs → aligned: no note
- Brutalist + wellness brand → significant_mismatch: "Brutalist aesthetics can feel confrontational for wellness audiences."

Note is conversational, not an error. User always has final say.

### 4. Stage-Aware Prompts (`src/lib/ai/briefing-prompts.ts`)

**Exports**:

- `buildSystemPrompt(state, brandContext): string`

Replaces the static SYSTEM_PROMPT. Each stage gets a focused prompt:

| Stage               | Prompt Focus                                         | AI Task                                                                | Tone Rule                                     |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| EXTRACT             | "Process first message, confirm what you understood" | Acknowledge + ask first missing thing                                  | Match detected audience/industry if available |
| TASK_TYPE           | "We need to know what they're making"                | Recommend deliverable type or ask                                      | Calibrated to detected context                |
| INTENT              | "We know what, need to know why"                     | Infer or ask business goal                                             | Calibrated                                    |
| INSPIRATION         | "Show visual style references"                       | Frame creative direction                                               | Calibrated                                    |
| STRUCTURE (video)   | "Create scene-by-scene storyboard with strong hook"  | Generate 3-5 scenes, scene 1 must have hook with persona + pain metric | Calibrated                                    |
| STRUCTURE (website) | "Create section-by-section layout"                   | Generate hero, features, CTA, footer                                   | Calibrated                                    |
| STRUCTURE (content) | "Create strategic content calendar"                  | Calendar with cadence, pillars, arcs, CTA escalation                   | Calibrated                                    |
| STRUCTURE (design)  | "Create design specification"                        | Format, elements, copy guidance                                        | Calibrated                                    |
| STRATEGIC_REVIEW    | "Surface strategic assessment"                       | Strengths, risks, suggestion, inspiration fit                          | **Authority tone**                            |
| MOODBOARD           | "Finalize visual direction"                          | Colors, typography, mood; per-section overrides                        | Calibrated                                    |
| REVIEW              | "Expert consultation on completed brief"             | Reframe strategically, strongest element + one improvement             | **Authority tone**                            |
| DEEPEN              | "Offer depth escalation paths"                       | Present options relevant to deliverable type                           | **Authority tone**                            |
| SUBMIT              | "Generate task submission"                           | Output [TASK_READY] block                                              | **Authority tone**                            |

**Authority tone override** (STRATEGIC_REVIEW, REVIEW, DEEPEN, SUBMIT):

```
== TONE OVERRIDE: AUTHORITY MODE ==
You are a senior creative director presenting your professional assessment.
NEVER use: "What do you think?", "Does this work?", "Everything look good?", "Let me know if..."
ALWAYS use: "This is strong because X.", "The risk is Y.", "I'd recommend Z.", "One thing I'd push on..."
Frame your analysis with confidence. You are the expert in the room.
```

Every prompt ends with: "Your response MUST end with a confident statement or clear direction, not a passive question."

**Injected into every prompt**:

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

**Stall escalation injection**: `buildSystemPrompt()` checks `turnsInCurrentStage` against `STALL_CONFIG` and injects the appropriate instruction (narrow options, make recommendation, or add soft nudge).

**Video hook guidance** (injected when `deliverableCategory === 'video'`):

```
== HOOK GENERATION (SCENE 1) ==
The opening hook MUST include:
1. Target persona: Reference the specific role ("CTO", "Head of Growth", "Founder")
   — NOT generic ("business leaders", "professionals")
2. Pain metric: Name a specific operational consequence
   — NOT vague ("struggling with growth")
   — YES specific ("losing 40% of pipeline to manual follow-up")
3. Quantifiable impact: Include a number or metric where data supports it
   — "Teams using X ship 2x faster" not "Teams using X are more productive"
The hook should feel like it was written by someone who worked in the target industry.
```

**Content calendar requirements** (injected when `deliverableCategory === 'content'`):

```
== CONTENT CALENDAR REQUIREMENTS ==
1. POSTING CADENCE: State explicit frequency (e.g., "3x/week: Mon, Wed, Fri")
2. CONTENT PILLARS: Define 2-4 pillars with percentage allocation
3. WEEKLY NARRATIVE ARC: Each week tells a coherent story — not random topics
4. PILLAR vs SUPPORT: Label each post as pillar (flagship) or support (lighter)
5. CTA ESCALATION: First third = awareness CTAs, middle = engagement, final = conversion
6. ENGAGEMENT TRIGGERS: Each post has a specific interaction driver
7. DISTRIBUTION LOGIC: Specify platforms and cross-posting strategy
```

**Competitive differentiation soft prompt** (injected at INTENT/STRUCTURE for website/brand/product launch):

```
If the user hasn't mentioned competitors and the deliverable is website/brand/product launch:
"Is there anyone in your space doing something similar that you want to differentiate from?"
Optional — if user ignores, move on. If they engage, store in state.competitiveDifferentiation.
```

Harvests smart defaults from `src/lib/creative-intake/` for STRUCTURE prompts (video durations, posting frequencies).

### 5. Deterministic Quick Options (`src/lib/ai/briefing-quick-options.ts`)

**Exports**:

- `generateQuickOptions(state): QuickOptions`

AI does NOT produce quick options. State machine generates them:

| Stage            | Quick Options                                                                      |
| ---------------- | ---------------------------------------------------------------------------------- |
| EXTRACT (vague)  | "Video", "Social content", "Website design", "Branding", "Something else"          |
| TASK_TYPE        | Context-dependent deliverable options                                              |
| INTENT           | "Drive signups", "Build authority", "Increase awareness", "Boost sales"            |
| INSPIRATION      | "I like this direction", "Show me more", "Something different"                     |
| STRUCTURE        | "Looks good, continue", "I want to adjust this", "Different approach"              |
| STRATEGIC_REVIEW | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" |
| MOODBOARD        | "Ready to review", "Tweak visuals", "Add section-specific direction"               |
| REVIEW           | "Submit as-is", "Go deeper first", "Make changes"                                  |
| DEEPEN           | Context-dependent options + "Done, submit now"                                     |

Quick options are adjusted by stall config (narrowed at turn 2, recommendation at turn 3 for TASK_TYPE/INTENT).

### 6. Enhanced Extractors (`src/lib/ai/briefing-extractors.ts`)

**Exports**:

- `extractStyleKeywords(message): string[]` — "light", "airy", "cinematic", "bold", "minimal", etc.
- `extractInspirationReferences(message): string[]` — "similar to X", "@handle", URLs, quoted names
- `resolveDeliverableCategory(inference): DeliverableCategory` — maps inference to category
- `resolveStructureType(category): StructureData['type']` — maps category to structure type
- `extractAudienceSignals(message): AudienceSignal[]` — CTO, consumer, startup, enterprise
- `extractIndustrySignals(message): string[]` — SaaS, fashion, fintech, wellness, etc.

Harvests inference patterns from `src/lib/creative-intake/types.ts` for pitch_deck/brand_package detection.

### 7. Response Parser (`src/lib/ai/briefing-response-parser.ts`)

**Exports**:

- `parseStructuredOutput(aiResponse, expectedType): ParseResult<StructureData>`

Parses structured AI outputs:

- `[STORYBOARD]{json}[/STORYBOARD]` — video scenes (with hook data)
- `[LAYOUT]{json}[/LAYOUT]` — website sections
- `[CALENDAR]{json}[/CALENDAR]` — content calendar
- `[DESIGN_SPEC]{json}[/DESIGN_SPEC]` — design specification
- `[STRATEGIC_REVIEW]{json}[/STRATEGIC_REVIEW]` — strategic assessment

**Tiered fallback for malformed output**:

**Tier 1 — Lenient parsing** (automatic, no retry):

- Strip trailing commas, fix unquoted keys, handle single quotes
- Partial extraction if marker present but JSON broken → `isPartial: true`

**Tier 2 — Retry with format reinforcement** (max 1 retry):

- Additional AI call with format reminder appended
- Does NOT count as user turn

**Tier 3 — Text-only fallback** (graceful degradation):

- Show AI response as plain text
- State machine stays at current stage
- Quick options include "Generate [storyboard/layout/calendar]" to retry

**Invariant**: Conversation always continues. User always sees something useful. State machine never enters an error state.

---

## Stall Recovery

Instead of forcing defaults on stuck users, use **escalating assistance** per stage:

**Quick-decision stages** (TASK_TYPE, INTENT):

| Turn | Behavior                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Normal question with quick options                                                                                                                                       |
| 2    | AI narrows to 2 options with reasoning. Quick options: 2 recommended + "Something else"                                                                                  |
| 3    | Confident recommendation: "Let's go with X — we can always adjust later." Quick options: "Sounds good", "Actually, let's do Y", "I need to think about this differently" |

Turn 3 does NOT auto-advance. "I need to think about this differently" resets turn counter and reframes the question.

**Exploration stages** (INSPIRATION, STRUCTURE, MOODBOARD): **No turn limit.** After 4 turns in STRUCTURE without progression, soft nudge: "We've got a solid foundation. Want to keep refining, or move on?"

**Consultation stages** (STRATEGIC_REVIEW, REVIEW, DEEPEN): **No turn limit, no nudges.** User controls pacing.

**Single-pass stages** (EXTRACT, SUBMIT): Exactly 1 turn each.

---

## Hybrid Moodboard

- **Global moodboard** applies to ALL sections by default (colors, typography, mood)
- **Per-section overrides** are additive — extend/tweak the global, not replace it
- **Overrides do NOT cascade** — each section is independent
- **No override = uses global** (always)

```typescript
function getMoodboardForSection(state, sectionId): VisualDirection {
  const global = state.collected.overallMoodboard
  const override = state.collected.sectionMoodboards[sectionId]
  if (!override) return global
  return mergeMoodboards(global, override) // deep merge, override wins on conflicts
}
```

---

## DEEPEN Stage Options by Deliverable

| Deliverable | Available Options                                                 |
| ----------- | ----------------------------------------------------------------- |
| Video       | Refine script to production-ready, Generate A/B hook variant      |
| Website     | Refine copy to production-ready, Conversion optimization pass     |
| Content     | Refine messaging per post, Generate A/B content variants          |
| Design      | Expand into asset-ready specifications, Generate variant concepts |
| All         | Optimize for conversion, Expand into full asset specifications    |

DEEPEN can loop — user selects multiple depth paths before submitting.

---

## In-Place Edits vs Backward Navigation

**In-place edit** (stays at current stage):

- At MOODBOARD: "make it more brutalist" → updates styleKeywords + overallMoodboard, stays
- At REVIEW: "change audience to Gen Z" → updates audience, triggers tone recalibration, stays
- Structure is NOT wiped — visual direction doesn't invalidate content structure

**Backward jump** (goes to previous stage):

- "Show me different styles" → jump to INSPIRATION, clear selectedStyles
- "Change what we're making" → jump to TASK_TYPE, clear downstream

Detection: Inference classifies messages as in-place-edit vs backward-jump vs forward-progress.

---

## Extension Points

Adding a new deliverable type (e.g., pitch deck) touches 6 files:

| File                          | Addition                                             |
| ----------------------------- | ---------------------------------------------------- |
| `briefing-state-machine.ts`   | Add to `DeliverableCategory` + `StructureData` union |
| `briefing-tone.ts`            | Add tone mapping for typical audience                |
| `briefing-prompts.ts`         | Add one STRUCTURE prompt template                    |
| `briefing-quick-options.ts`   | Add to EXTRACT stage options                         |
| `briefing-extractors.ts`      | Add patterns to `resolveDeliverableCategory()`       |
| `briefing-response-parser.ts` | Add new structured output parser                     |

Transition rules DON'T change — they're based on collected data presence, not specific categories.

---

## Latency Impact

Extraction + state machine + tone calibration: **~3ms** (pure regex + object construction). Negligible vs DB queries (50-200ms) and AI API call (2000-5000ms).

Pipeline: extractors → tone calibration → state transition → build prompt → AI call (streaming) → parse response → return.

---

## State Rehydration

- `BriefingState` serialized as part of `ChatDraft` in localStorage via `saveDraft()`
- On page load: draft → briefingState restores exact stage + tone
- State machine never re-derives from messages — it's persisted
- Phase 5 adds database persistence via `briefing_state` jsonb column in chat_drafts

---

## Files to Modify

| File                                          | Changes                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/ai/chat.ts`                          | Feature-flag: use `buildSystemPrompt()` when enabled, existing when not. Raise max_tokens 300→800 when enabled. Reduce post-processing to emoji/cap/hex only. Remove `[QUICK_OPTIONS]` parsing.                                                                                |
| `src/app/api/chat/route.ts`                   | Accept `briefingState` from client. Feature-flagged pipeline: inference → tone cal → state transitions → build prompt → AI call → parse response → state-driven style fetching → return updated state + content + quick options. Preserve skip-AI-call for "more"/"different". |
| `src/components/chat/useChatInterfaceData.ts` | Replace direct `useBrief` with `useBriefingStateMachine` (internally uses `useBrief`). Pass briefingState in API calls. Use state-driven quick options.                                                                                                                        |
| `src/lib/chat-progress.ts`                    | Map `BriefingStage` → `ChatStage`. Add STRATEGIC_REVIEW and DEEPEN.                                                                                                                                                                                                            |
| `src/lib/ai/inference-engine.ts`              | Add confirmation detection for REVIEW→SUBMIT and REVIEW→DEEPEN. Add "go deeper"/"submit as-is" intent.                                                                                                                                                                         |
| `src/components/chat/brief-panel/types.ts`    | Add `BriefingStage`, structure types (StoryboardScene, LayoutSection, etc.), extend LiveBrief with briefingState reference.                                                                                                                                                    |
| `src/lib/chat-drafts.ts`                      | Add optional `briefingState` field to `ChatDraft` interface.                                                                                                                                                                                                                   |
| `src/lib/env.ts`                              | Add `BRIEFING_STATE_MACHINE_ENABLED` env var.                                                                                                                                                                                                                                  |
| `src/lib/hooks/use-brief.ts`                  | Accept optional BriefingState for syncing structure data back into LiveBrief.                                                                                                                                                                                                  |
| `src/lib/creative-intake/index.ts`            | Add `@deprecated` notice.                                                                                                                                                                                                                                                      |

## New Files

| File                                                        | Purpose                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/ai/briefing-state-machine.ts`                      | BriefingState composing LiveBrief, transitions, serialization   |
| `src/lib/ai/briefing-tone.ts`                               | ToneProfile, calibrateTone(), toneToStylePreference()           |
| `src/lib/ai/briefing-strategic.ts`                          | inspirationFitCheck(), strategic review generation              |
| `src/lib/ai/briefing-prompts.ts`                            | Per-stage prompt templates with tone injection + authority mode |
| `src/lib/ai/briefing-quick-options.ts`                      | Deterministic quick option generation                           |
| `src/lib/ai/briefing-extractors.ts`                         | Style/inspiration/category/audience/industry extraction         |
| `src/lib/ai/briefing-response-parser.ts`                    | Structured output parsing with tiered fallback                  |
| `src/hooks/use-briefing-state-machine.ts`                   | Client-side hook wrapping state machine logic                   |
| `src/components/chat/chat-message-list.tsx`                 | Extracted message rendering (from chat-interface.tsx split)     |
| `src/components/chat/chat-input-area.tsx`                   | Extracted input area (from chat-interface.tsx split)            |
| `src/components/chat/storyboard-view.tsx`                   | Video storyboard rendering                                      |
| `src/components/chat/layout-preview.tsx`                    | Website layout rendering                                        |
| `src/components/chat/design-spec-view.tsx`                  | Design spec rendering                                           |
| `src/components/chat/brief-panel/content-calendar.tsx`      | Enhanced calendar with pillars, arcs, CTAs                      |
| `src/components/chat/strategic-review-card.tsx`             | Strategic review display with accept/override                   |
| `src/components/chat/deepen-options.tsx`                    | DEEPEN stage option cards                                       |
| `src/components/chat/section-moodboard.tsx`                 | Per-section moodboard override UI                               |
| Co-located `.test.ts` files for all new `src/lib/ai/` files |

---

## Implementation Order

### Phase 0: Prerequisite Refactors (no behavior changes)

1. Split `chat-interface.tsx` → `chat-message-list.tsx` + `chat-input-area.tsx` + orchestrator
2. Add `BRIEFING_STATE_MACHINE_ENABLED` feature flag to `src/lib/env.ts`
3. Add `@deprecated` to `src/lib/creative-intake/index.ts`
4. Add optional `briefingState` field to `ChatDraft` interface in `src/lib/chat-drafts.ts`

### Phase 1: State Machine Core (pure logic, no UI/API changes)

5. `briefing-state-machine.ts` — BriefingState composing LiveBrief, TransitionRule[], evaluateTransitions(), serialize/deserialize, goBackTo(), pivotCategory(), STALL_CONFIG
6. `briefing-tone.ts` — ToneProfile, calibrateTone(), toneToStylePreference()
7. `briefing-strategic.ts` — inspirationFitCheck(), StrategicReviewData
8. `briefing-extractors.ts` — All extraction functions (harvest from creative-intake)
9. `briefing-prompts.ts` — buildSystemPrompt() with per-stage templates, tone injection, authority mode, video hook guidance, content calendar requirements, competitive differentiation soft prompt, stall escalation injection
10. `briefing-quick-options.ts` — generateQuickOptions() for all stages (including stall-adjusted options)
11. `briefing-response-parser.ts` — Parse structured AI outputs with tiered fallback (lenient parse, retry, text-only)
12. Tests for all of the above

### Phase 2: Backend Integration (behind feature flag)

13. Modify `chat.ts` — feature-flagged prompt switching, reduced post-processing, raised token limit
14. Modify `route.ts` — state machine pipeline alongside legacy, state-driven style fetching at INSPIRATION (uses existing `getBrandAwareStyles()`), preserve skip-AI-call optimization for "more"/"different"
15. Create `src/hooks/use-briefing-state-machine.ts` hook
16. Add briefingState to chat validation schema in `src/lib/validations/index.ts`

### Phase 3: Frontend Integration (behind feature flag)

17. Modify `useChatInterfaceData.ts` — consume useBriefingStateMachine
18. Modify `chat-progress.ts` — map BriefingStage → ChatStage
19. Wire deterministic quick options into input UI

### Phase 4a: Structure Display Components (read-only)

20. Storyboard view (video scenes + hook data display)
21. Layout preview (website sections)
22. Design spec display

### Phase 4b: Content Calendar Component

23. Enhanced calendar with pillars, narrative arcs, CTA escalation, engagement triggers (new component, distinct from existing content-outline.tsx)

### Phase 4c: Interactive Stage Components

24. Strategic review card (strengths/risks, fit indicator, accept/override buttons)
25. DEEPEN options (selection cards by deliverable type)
26. Per-section moodboard override UI

### Phase 5: Database Persistence + Cleanup

27. DB migration: add `briefing_state` jsonb column to chat_drafts
28. Remove feature flag (enable by default)
29. Clean up legacy code paths

---

## Key Design Decisions

1. **BriefingState composes LiveBrief** — single source of truth, no field duplication
2. **State machine controls flow, AI generates text** — deterministic conversation progression
3. **Quick options are deterministic** — from generateQuickOptions(state), not AI output
4. **Feature-flagged rollout** — safe gradual migration, A/B testable
5. **Token limit raised to 800** — stage-aware prompts produce focused responses naturally
6. **Inference engine preserved** — existing inferFromMessage() consumed by state machine
7. **Brand-style-scoring preserved** — INSPIRATION integrates with existing multi-factor scoring
8. **Skip-AI-call optimization preserved** — "more"/"different" style requests bypass AI
9. **Creative intake harvested, not deleted** — useful constants absorbed, system deprecated
10. **Minimal hook API** — 2 methods (processMessage, dispatch) + 3 derived values
11. **chat-interface.tsx split** — message list, input area, orchestrator
12. **Escalating assistance, not forced defaults** — only TASK_TYPE/INTENT escalate; exploration/consultation stages have no limits
13. **Parse-error fallback** — tiered (lenient → 1 retry → text-only). Conversation never stalls.

---

## Extraction Pipeline Validation (10 Example First Messages)

| #   | First Message                                              | taskType            | intent              | audience/industry         | styleKW     | inspirationRefs | Tone                                      | Landing Stage |
| --- | ---------------------------------------------------------- | ------------------- | ------------------- | ------------------------- | ----------- | --------------- | ----------------------------------------- | ------------- |
| 1   | "I want a design that is light and airy similar to legora" | null                | null                | none                      | ["light"]   | ["legora"]      | default                                   | TASK_TYPE     |
| 2   | "Stripe launch videos for B2B SaaS, CTOs, clean minimal"   | video (0.85)        | announcement (0.85) | CTOs / SaaS               | ["minimal"] | ["Stripe"]      | direct, high-tech, low-emotion            | INSPIRATION   |
| 3   | "30-day Instagram content plan, sustainable fashion"       | multi_asset (0.95)  | null                | consumer / fashion        | []          | []              | conversational, low-tech, high-emotion    | INTENT        |
| 4   | "We're launching a new AI tool next month"                 | null                | announcement (0.7)  | none                      | []          | []              | default                                   | TASK_TYPE     |
| 5   | "Website landing page, bold, conversion-focused"           | website (0.85)      | signups (0.75)      | none                      | ["bold"]    | []              | default                                   | INSPIRATION   |
| 6   | "Logo for a yoga studio"                                   | single_asset (0.85) | default for brand   | consumer / wellness       | []          | []              | conversational, low-tech, high-emotion    | INSPIRATION   |
| 7   | "3 Instagram reels, fitness app, Gymshark style"           | multi_asset (0.9)   | signups (0.9)       | consumer / fitness        | ["edgy"]    | ["Gymshark"]    | conversational, medium-tech, high-emotion | INSPIRATION   |
| 8   | "Pitch deck for investor meeting next week"                | slide (0.9)         | null                | investors / startup       | []          | []              | formal, high-tech, low-emotion            | INTENT        |
| 9   | "LinkedIn thought leadership, CEO, weekly posts"           | multi_asset (0.85)  | authority (0.95)    | executives / professional | []          | []              | direct, medium-tech, low-emotion          | INSPIRATION   |
| 10  | "Something cool for our new product"                       | null                | null                | none                      | []          | []              | default                                   | TASK_TYPE     |

---

## Full Conversation Traces (10)

### Trace 1: Stripe-Style B2B Video — Detailed start, fast path (6 turns)

**First message**: "Stripe launch videos for B2B SaaS, CTOs, clean minimal"
**Tone**: direct, high-tech, low-emotion (CTO/SaaS calibrated)

| Turn | User                                                     | Stage →                          | AI Response                                                                                                                                                                                                                                                                  | Quick Options                                                                      | State Changes                                                                                                          |
| ---- | -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1    | "Stripe launch videos for B2B SaaS, CTOs, clean minimal" | EXTRACT → **INSPIRATION**        | "Launch video for CTOs — Stripe-caliber execution. Here's what fits that direction." [styles shown]                                                                                                                                                                          | "I like this direction", "Show me more", "Something different"                     | taskType=video, intent=announcement, audience=CTOs, industry=SaaS, style=["minimal"], refs=["Stripe"], tone calibrated |
| 2    | [selects Dark Tech style]                                | INSPIRATION → **STRUCTURE**      | "5-scene storyboard. Scene 1 hook: 'Your engineering team loses 6 hours/week to deployment friction.' Pacing mirrors Stripe's precision." [STORYBOARD]                                                                                                                       | "Looks good, continue", "Adjust scenes", "Different approach"                      | selectedStyles=[DarkTech], structure=storyboard(5 scenes, hook has CTO persona + pain metric)                          |
| 3    | "Looks good, continue"                                   | STRUCTURE → **STRATEGIC_REVIEW** | "Well-positioned. Stripe's visual language maps directly to CTO expectations — reliability, precision, craft. One thing I'd push on: the problem scene could reference a specific operational metric (MTTR, deployment frequency) to land harder with technical leadership." | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview={strengths:[...], fitScore:'aligned', suggestion:"add operational metric"}                             |
| 4    | "Good catch, let's adjust"                               | STRATEGIC_REVIEW → **MOODBOARD** | dispatch({type:'STAGE_RESPONSE', response:'accept'}). "Updated scene 2 to reference MTTR. Visual direction: dark navy, electric blue accents, Inter Bold, generous negative space."                                                                                          | "Ready to review", "Tweak visuals", "Customize scene"                              | structure updated, overallMoodboard set                                                                                |
| 5    | "Ready to review"                                        | MOODBOARD → **REVIEW**           | "This positions you as the infrastructure-grade solution in a market full of toy tools. Strongest element: the hook directly names the CTO's operational pain. One area I'd strengthen: the CTA could reference integration speed rather than generic 'get started.'"        | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                                                      |
| 6    | "Submit as-is"                                           | REVIEW → **SUBMIT**              | dispatch({type:'CONFIRM_SUBMIT'}). "Production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                                                      | —                                                                                  | task created                                                                                                           |

**Stages hit**: EXTRACT → INSPIRATION → STRUCTURE → STRATEGIC_REVIEW → MOODBOARD → REVIEW → SUBMIT
**Skipped**: TASK_TYPE, INTENT (inferred), DEEPEN (user chose submit)

---

### Trace 2: Sustainable Fashion Content — Needs intent, emotional tone (8 turns)

**First message**: "30-day Instagram content plan, sustainable fashion"
**Tone**: conversational, low-tech, high-emotion (consumer/fashion calibrated)

| Turn | User                                                 | Stage →                           | AI Response                                                                                                                                                                                                                                                                                                                                                      | Quick Options                                                                      | State Changes                                                                          |
| ---- | ---------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | "30-day Instagram content plan, sustainable fashion" | EXTRACT → **INTENT**              | "Love this — sustainable fashion content has real storytelling potential. What's the heartbeat of this campaign?"                                                                                                                                                                                                                                                | "Build awareness", "Drive sales", "Educate", "Grow community"                      | taskType=multi_asset, platform=instagram, topic="sustainable fashion", tone calibrated |
| 2    | "Build awareness and educate"                        | INTENT → **INSPIRATION**          | "Awareness + education — that's a trust-building play. Here are visual directions that feel authentic to sustainability storytelling." [styles shown]                                                                                                                                                                                                            | "I like this direction", "Show me more", "Something different"                     | intent=awareness+education                                                             |
| 3    | [selects Organic Earth style]                        | INSPIRATION → **STRUCTURE**       | "30-day calendar: 5x/week. Pillars: Impact Stories (35%), Behind the Process (25%), Community Voices (25%), Gentle Nudges (15%). Week 1 arc: 'Why this matters.' CTA escalation starts with 'Save this' and builds to 'Join the movement.'" [CALENDAR]                                                                                                           | "Looks good, continue", "Adjust", "More posts"                                     | selectedStyles=[OrganicEarth], structure=calendar                                      |
| 4    | "Looks good, continue"                               | STRUCTURE → **STRATEGIC_REVIEW**  | "This calendar tells a story your audience will feel. The pillar balance is right — Impact Stories lead because that's what drives shares in sustainability. One heads-up: Gentle Nudges at 15% is conservative for a 30-day push. If you're measuring conversion, consider bumping to 20% in weeks 3-4."                                                        | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview set, fitScore='aligned'                                                |
| 5    | "I hear you but keep it as-is"                       | STRATEGIC_REVIEW → **MOODBOARD**  | dispatch({type:'STAGE_RESPONSE', response:'override'}). "Your audience, your call. Visual direction: warm earth tones, natural textures, handwritten accents, candid photography."                                                                                                                                                                               | "Ready to review", "Tweak visuals", "Customize week"                               | userOverride=true, overallMoodboard set                                                |
| 6    | "Customize Week 2"                                   | MOODBOARD → **MOODBOARD** (stays) | "Week 2 — 'The Process' — gets a rawer, behind-the-scenes feel. Slightly desaturated, documentary-style framing."                                                                                                                                                                                                                                                | "Ready to review", "Customize another", "Change overall"                           | sectionMoodboards["week-2"] set                                                        |
| 7    | "Ready to review"                                    | MOODBOARD → **REVIEW**            | "This positions your brand as the transparent voice in sustainable fashion — not preachy, not performative, just real. Strongest element: the narrative arc from 'why this matters' to 'join the movement' mirrors how trust actually builds. One thing I'd push on: Week 4's conversion CTAs could reference a specific action rather than generic 'shop now.'" | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                      |
| 8    | "Submit as-is"                                       | REVIEW → **SUBMIT**               | "This is ready to bring to life. Briefing submitted." [TASK_READY]                                                                                                                                                                                                                                                                                               | —                                                                                  | task created                                                                           |

---

### Trace 3: Vague Start → Website — Needs everything, competitive check (9 turns)

**First message**: "I want a design that is light and airy similar to legora"
**Tone**: default → recalibrated at turn 3 (DTC skincare = conversational, high-emotion)

| Turn | User                                                                    | Stage →                           | AI Response                                                                                                                                                                                             | Quick Options                                                                      | State Changes                                                                              |
| ---- | ----------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | "Light and airy similar to legora"                                      | EXTRACT → **TASK_TYPE**           | "Great starting point — Legora's aesthetic is distinctive. What are we creating?"                                                                                                                       | "Video", "Social content", "Website design", "Branding", "Something else"          | style=["light"], refs=["legora"]                                                           |
| 2    | "Website design"                                                        | TASK_TYPE → **INTENT**            | "Website it is. What should visitors do when they land?"                                                                                                                                                | "Landing page (signups)", "Brand showcase", "E-commerce", "Portfolio"              | category=website                                                                           |
| 3    | "Product landing page for our DTC skincare brand"                       | INTENT → **INSPIRATION**          | "DTC skincare — clean, trust-forward. Legora's airy feel maps well. Anyone in skincare you're positioning against?" [styles shown]                                                                      | "I like this direction", "Show me more", "Something different"                     | intent=signups, audience=consumer, industry=skincare, tone recalibrated, competitive check |
| 4    | "We're differentiated by clinical testing — not typical 'clean beauty'" | INSPIRATION → **STRUCTURE**       | "Strong angle — clinical credibility. 7-section layout: Hero (clinical proof), Trust Bar, Product Showcase, Clinical Results, Ingredients, Testimonials, CTA." [LAYOUT]                                 | "Looks good, continue", "Add section", "Remove", "Rearrange"                       | competitiveDifferentiation set, structure=layout(7)                                        |
| 5    | "Add a pricing section before CTA"                                      | STRUCTURE → **STRUCTURE** (stays) | "Done — 8 sections. Pricing before CTA reduces friction."                                                                                                                                               | "Looks good, continue", "More changes"                                             | structure updated                                                                          |
| 6    | "Looks good, continue"                                                  | STRUCTURE → **STRATEGIC_REVIEW**  | "Strong foundation. Clinical differentiation is your strongest asset — permission to charge premium. One flag: Trust Bar is second, but consider leading with clinical results higher."                 | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview set                                                                        |
| 7    | "Good catch, let's adjust"                                              | STRATEGIC_REVIEW → **MOODBOARD**  | "Moved Clinical Results to position 2. Visual: soft whites, light gray, whitespace, clinical photography with warmth."                                                                                  | "Ready to review", "Tweak visuals", "Customize hero"                               | structure reordered, overallMoodboard set                                                  |
| 8    | "Ready to review"                                                       | MOODBOARD → **REVIEW**            | "Positions you as the brand that doesn't hide behind aesthetics — evidence first. Strongest element: clinical results above the fold. One area: testimonials could include before/after clinical data." | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                                                          |
| 9    | "Submit as-is"                                                          | REVIEW → **SUBMIT**               | "Production-ready. Briefing submitted." [TASK_READY]                                                                                                                                                    | —                                                                                  | task created                                                                               |

---

### Trace 4: Fitness Reels — Significant Mismatch (7 turns)

**First message**: "3 Instagram reels, fitness app, Gymshark style"
**Tone**: conversational → recalibrated to direct (enterprise) at turn 3

| Turn | User                                                  | Stage →                           | AI Response                                                                                                                                                                        | Quick Options                                                                      | State Changes                                                 |
| ---- | ----------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | "3 Instagram reels, fitness app, Gymshark style"      | EXTRACT → **INSPIRATION**         | "Gymshark energy — high intensity, community-driven." [styles + video refs]                                                                                                        | "I like this direction", "Show me more", "Something different"                     | taskType=video, refs=["Gymshark"], tone calibrated            |
| 2    | [selects Bold Fitness style]                          | INSPIRATION → **STRUCTURE**       | "3-reel storyboard. Hook: 'You're tracking 4 apps to do what one should handle.'" [STORYBOARD]                                                                                     | "Looks good, continue", "Adjust scenes", "Different approach"                      | structure=storyboard(3 reels)                                 |
| 3    | "Actually, this is for enterprise corporate wellness" | STRUCTURE → **STRUCTURE** (stays) | "That changes the game — completely different buyer psychology. Recalibrating." [regenerated]                                                                                      | "Looks good, continue", "Adjust", "Different approach"                             | audience=enterprise, tone recalibrated, structure regenerated |
| 4    | "Looks good, continue"                                | STRUCTURE → **STRATEGIC_REVIEW**  | "Important flag: Gymshark's style is consumer-fitness-coded. For enterprise buyers (HR directors), this reads as unserious. Borrow the pacing, dial back the lifestyle intensity." | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | fitScore='significant_mismatch'                               |
| 5    | "Good catch, let's adjust"                            | STRATEGIC_REVIEW → **MOODBOARD**  | "Adjusted: premium athletic aesthetic, corporate palette, professional training footage."                                                                                          | "Ready to review", "Tweak visuals", "Customize reel"                               | structure refined, overallMoodboard set                       |
| 6    | "Ready to review"                                     | MOODBOARD → **REVIEW**            | "Positions you as serious corporate wellness — not a consumer app with a B2B page bolted on. Hooks reference HR pain points."                                                      | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                                             |
| 7    | "Submit as-is"                                        | REVIEW → **SUBMIT**               | "Production-ready." [TASK_READY]                                                                                                                                                   | —                                                                                  | task created                                                  |

---

### Trace 5: AI Tool Launch — Full Journey with DEEPEN (10 turns)

**First message**: "We're launching a new AI tool next month"
**Tone**: default → developer (direct, high-tech) at turn 3

| Turn | User                                       | Stage →                          | AI Response                                                                                                                                              | Quick Options                                                                      | State Changes                        |
| ---- | ------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| 1    | "We're launching a new AI tool next month" | EXTRACT → **TASK_TYPE**          | "AI tool launch — plenty of directions. What's the hero deliverable?"                                                                                    | "Video", "Social content", "Website design", "Branding", "Something else"          | intent=announcement(0.7)             |
| 2    | "Website landing page"                     | TASK_TYPE → **INTENT**           | "What's the primary conversion goal?"                                                                                                                    | "Sign up for beta", "Join waitlist", "Book a demo", "Start free trial"             | category=website                     |
| 3    | "Waitlist signups, targeting developers"   | INTENT → **INSPIRATION**         | "Developer audience, waitlist. Clean, technical. Any AI tools you want to differentiate from?" [styles]                                                  | "I like this direction", "Show me more", "Something different"                     | tone calibrated, competitive check   |
| 4    | "Not really, just make it look sharp"      | INSPIRATION → **STRUCTURE**      | "6-section layout: Hero, Demo/Preview, How It Works, Use Cases, Social Proof, Final CTA." [LAYOUT]                                                       | "Looks good, continue", "Add section", "Rearrange"                                 | structure=layout(6)                  |
| 5    | "Looks good, continue"                     | STRUCTURE → **STRATEGIC_REVIEW** | "Follows the developer playbook. Two notes: (1) Make Demo interactive. (2) 'How It Works' should speak workflow language, not marketing."                | "Looks good, continue", "Good catch, let's adjust", "I hear you but keep it as-is" | strategicReview set                  |
| 6    | "Good catch, let's adjust"                 | STRATEGIC_REVIEW → **MOODBOARD** | "Updated Demo to 'Live Preview'. Visual: near-black, monospace, syntax highlighting, electric green."                                                    | "Ready to review", "Tweak visuals", "Customize section"                            | structure refined                    |
| 7    | "Ready to review"                          | MOODBOARD → **REVIEW**           | "Respects developers' intelligence. Live Preview drives 2-3x waitlist conversion. Hero one-liner must be extremely specific — devs bounce in 5 seconds." | "Submit as-is", "Go deeper first", "Make changes"                                  | —                                    |
| 8    | "Go deeper first"                          | REVIEW → **DEEPEN**              | "What would be most valuable?"                                                                                                                           | "Refine hero copy", "Conversion optimization", "A/B variant", "Done, submit now"   | stage=DEEPEN                         |
| 9    | "Refine hero copy to production-ready"     | DEEPEN → **DEEPEN** (stays)      | "Three options: (1) 'Ship AI in 3 lines' (2) 'Your codebase + AI, no rewrite' (3) 'API to production in 10 min.' I'd go option 2."                       | "Option 1", "Option 2", "Option 3", "Done, submit now"                             | deepenSelections=["production_copy"] |
| 10   | "Use option 2, submit now"                 | DEEPEN → **SUBMIT**              | "Hero locked. Briefing submitted." [TASK_READY]                                                                                                          | —                                                                                  | task created                         |

---

### Trace 6: Yoga Studio Logo — Simple brand (6 turns)

| Turn | User                     | Stage →                          | AI Response                                                                                   | Quick Options                            |
| ---- | ------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1    | "Logo for a yoga studio" | EXTRACT → **INSPIRATION**        | "Capturing a feeling." [styles]                                                               | "I like this", "Show more", "Different"  |
| 2    | [selects Zen Minimal]    | INSPIRATION → **STRUCTURE**      | "Design spec: wordmark + symbol, icon variant, lockup." [DESIGN_SPEC]                         | "Looks good", "Adjust", "Different"      |
| 3    | "Looks good, continue"   | STRUCTURE → **STRATEGIC_REVIEW** | "Zen Minimal is dominant in yoga branding — polished but potentially undifferentiated."       | "Continue", "Let's adjust", "Keep as-is" |
| 4    | "Keep it as-is"          | STRATEGIC_REVIEW → **MOODBOARD** | "Visual: warm white, sage green, soft clay, organic curves."                                  | "Ready to review", "Tweak"               |
| 5    | "Ready to review"        | MOODBOARD → **REVIEW**           | "Professional identity. Strongest: mark system gives flexibility. Watch: icon-only at 32x32." | "Submit", "Go deeper", "Changes"         |
| 6    | "Submit as-is"           | REVIEW → **SUBMIT**              | "Briefing submitted." [TASK_READY]                                                            | —                                        |

---

### Trace 7: LinkedIn Thought Leadership — Calendar + DEEPEN (8 turns)

| Turn | User                                             | Stage →                          | AI Response                                                                                                 | Quick Options                                            |
| ---- | ------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | "LinkedIn thought leadership, CEO, weekly posts" | EXTRACT → **INSPIRATION**        | "Building authority that translates to pipeline." [styles]                                                  | "I like this", "More", "Different"                       |
| 2    | [selects Executive Authority]                    | INSPIRATION → **STRUCTURE**      | "12-week calendar. 2x/week. Pillars: Industry 40%, Leadership 30%, Culture 20%, Contrarian 10%." [CALENDAR] | "Continue", "Adjust", "Different cadence"                |
| 3    | "Make it 3x/week, add Friday casual"             | STRUCTURE → **STRUCTURE**        | "Updated: Mon/Wed/Fri. Friday = behind-the-scenes."                                                         | "Continue", "More changes"                               |
| 4    | "Looks good, continue"                           | STRUCTURE → **STRATEGIC_REVIEW** | "Friday casual is right. Contrarian takes = highest-risk/reward. Front-load after authority established."   | "Continue", "Let's adjust", "Keep as-is"                 |
| 5    | "Looks good, continue"                           | STRATEGIC_REVIEW → **MOODBOARD** | "Visual: clean white, professional photography. Friday = looser framing."                                   | "Ready to review", "Tweak"                               |
| 6    | "Ready to review"                                | MOODBOARD → **REVIEW**           | "Systematically moves audience from awareness to conversion. Weeks 9-12 CTAs need specific assets."         | "Submit", "Go deeper", "Changes"                         |
| 7    | "Go deeper first"                                | REVIEW → **DEEPEN**              | "What adds most value?"                                                                                     | "Week 1 copy", "A/B contrarian", "Optimize CTAs", "Done" |
| 8    | "Optimize conversion CTAs, then submit"          | DEEPEN → **SUBMIT**              | "CTAs refined: DM triggers, diagnostic calls, response recordings, doors open." [TASK_READY]                | —                                                        |

---

### Trace 8: Stall Recovery — Indecisive User (9 turns)

**Demonstrates escalating assistance without forcing choices.**

| Turn | User                                        | Stage →                          | AI Response                                                                                         | Quick Options                                             | Stall               |
| ---- | ------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------- |
| 1    | "I need something for my business"          | EXTRACT → **TASK_TYPE**          | "Let's figure out the right deliverable."                                                           | "Video", "Social content", "Website", "Branding", "Other" | turn=1              |
| 2    | "Not sure, maybe social or video?"          | TASK_TYPE (stays)                | [**Narrow**] "Video = single impact piece. Social content = ongoing calendar. Which sounds closer?" | "Video (impact)", "Social (ongoing)", "Something else"    | turn=2, narrowed    |
| 3    | "Hmm, ongoing but not totally sure"         | TASK_TYPE (stays)                | [**Recommend**] "Let's go with social content — we can always pivot. Sound good?"                   | "Sounds good", "Actually, video", "Think differently"     | turn=3, recommended |
| 4    | "Sounds good"                               | TASK_TYPE → **INTENT**           | "Content calendar it is. What's the main goal?"                                                     | "Awareness", "Signups", "Authority", "Educate"            | turn reset          |
| 5    | "Fintech startup, build trust with clients" | INTENT → **INSPIRATION**         | "Fintech trust-building — credibility > hype." [styles]                                             | "I like this", "More", "Different"                        | tone calibrated     |
| 6    | [selects Clean Finance]                     | INSPIRATION → **STRUCTURE**      | "8-week calendar. Pillars: Industry 35%, Credibility 30%, Culture 20%, Client 15%." [CALENDAR]      | "Continue", "Adjust", "Different cadence"                 | —                   |
| 7    | "Looks good, continue"                      | STRUCTURE → **STRATEGIC_REVIEW** | "Product Credibility is highest-leverage. Client Success right at 15% for early-stage."             | "Continue", "Let's adjust", "Keep as-is"                  | —                   |
| 8    | "Looks good, continue"                      | STRATEGIC_REVIEW → **MOODBOARD** | "Visual: navy, white, clean data viz, regulatory typography."                                       | "Ready to review", "Tweak"                                | —                   |
| 9    | "Ready to review, submit"                   | MOODBOARD → **SUBMIT**           | "Fintech content engine built for trust. Briefing submitted." [TASK_READY]                          | —                                                         | —                   |

**Key**: User never auto-advanced. Explicit "Sounds good" confirmed the recommendation.

---

### Trace 9: Parse-Error Fallback — Malformed AI Output (8 turns)

**Demonstrates tiered fallback when AI returns broken structured output.**

| Turn | User                                      | Stage →                          | AI Response                                                                   | System Behavior                                                                               |
| ---- | ----------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1    | "Launch video for SaaS, startup founders" | EXTRACT → **INSPIRATION**        | "Energy, clarity, speed." [styles + video refs]                               | Normal                                                                                        |
| 2    | [selects Startup Energy]                  | INSPIRATION → **STRUCTURE**      | AI forgets [STORYBOARD] marker                                                | **Tier 1 fails. Tier 2 retry fires** (invisible).                                             |
| 2b   | (invisible)                               | —                                | Retry succeeds with proper marker                                             | User sees final result seamlessly. structure=storyboard(4)                                    |
| 3    | "Looks good, continue"                    | STRUCTURE → **STRATEGIC_REVIEW** | "Founders respond to speed + specificity. Scene 3 should mirror hook's pain." | Normal                                                                                        |
| 4    | "Good catch, let's adjust"                | STRATEGIC_REVIEW → **MOODBOARD** | "Scene 3 updated. Visual: bright, fast, screen recordings + motion graphics." | Normal                                                                                        |
| 5    | "Ready to review"                         | MOODBOARD → **REVIEW**           | AI returns malformed JSON                                                     | **Tier 1 + Tier 2 both fail. Tier 3: text-only.** User sees prose. REVIEW works fine as text. |
| 6    | "Submit as-is"                            | REVIEW → **SUBMIT**              | "Briefing submitted." [TASK_READY]                                            | Normal                                                                                        |

**Invariant**: User never saw an error. Conversation never stalled.

---

### Trace 10: "Something Cool" — Maximum Ambiguity (10 turns)

| Turn | User                                      | Stage →                          | AI Response                                                                                                     | Quick Options                                                |
| ---- | ----------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | "Something cool for our new product"      | EXTRACT → **TASK_TYPE**          | "What's the hero deliverable?"                                                                                  | "Video", "Social", "Website", "Branding", "Other"            |
| 2    | "Social content"                          | TASK_TYPE → **INTENT**           | "What should this content make people do?"                                                                      | "Awareness", "Signups", "Build hype", "Educate"              |
| 3    | "Build hype, it's a travel app for Gen Z" | INTENT → **INSPIRATION**         | "Needs to feel native to how Gen Z discovers things." [styles]                                                  | "I like this", "More", "Different"                           |
| 4    | [selects Lo-Fi Authentic]                 | INSPIRATION → **STRUCTURE**      | "2-week pre-launch. 5x/week. Pillars: Behind-Build 35%, Destinations 30%, Community 25%, FOMO 10%." [CALENDAR]  | "Continue", "Adjust", "Different"                            |
| 5    | "Looks good, continue"                    | STRUCTURE → **STRATEGIC_REVIEW** | "Lo-Fi is right — overproduced = scrolled past. FOMO at 10% too subtle for 2-week push. Bump to 20% in Week 2." | "Continue", "Let's adjust", "Keep as-is"                     |
| 6    | "Good catch, let's adjust"                | STRATEGIC_REVIEW → **MOODBOARD** | "FOMO bumped. Visual: phone-shot, raw textures, meme-adjacent energy."                                          | "Review", "Tweak", "Customize week"                          |
| 7    | "Ready to review"                         | MOODBOARD → **REVIEW**           | "Launch as an event they discover, not an ad. Duet challenge needs specific hook."                              | "Submit", "Go deeper", "Changes"                             |
| 8    | "Go deeper first"                         | REVIEW → **DEEPEN**              | "What adds most value?"                                                                                         | "Post copy", "A/B launch day", "Engagement triggers", "Done" |
| 9    | "A/B variant for launch day"              | DEEPEN (stays)                   | "A: understated. B: specific numbers. I'd test B — Gen Z responds to specificity."                              | "Variant A", "Variant B", "Keep both", "Done"                |
| 10   | "Keep both, submit"                       | DEEPEN → **SUBMIT**              | "Both preserved for A/B. Briefing submitted." [TASK_READY]                                                      | —                                                            |

---

### Observations Across 10 Traces

1. **Turn counts**: 6-10. Average ~7.8 turns.
2. **STRATEGIC_REVIEW always adds value**: Even aligned cases surface optimization.
3. **User override works naturally**: "Keep it as-is" → immediate advance.
4. **Tone calibration visible**: CTO (technical) vs fashion (emotional) vs Gen Z (lo-fi).
5. **REVIEW = expert consultation**: Strongest element + one improvement. Never passive.
6. **DEEPEN used 3/10**: Optional stages don't slow fast users.
7. **Stall recovery (Trace 8)**: Helped indecisive user without forcing. User confirmed.
8. **Parse fallback (Trace 9)**: Tier 2 recovered silently. Tier 3 worked as prose.
9. **Competitive differentiation**: Soft prompt 3/10 traces. Users engaged 2/3 times.
10. **Authority tone**: Zero "What do you think?" across all traces.

---

## Verification

### Unit Tests

1. State transitions cover all 10 example messages + STRATEGIC_REVIEW/DEEPEN transitions
2. Extraction functions with sample messages (audience/industry)
3. Tone calibration with audience/industry/platform combos
4. toneToStylePreference() produces valid StyleContext
5. Inspiration fit check (aligned, minor mismatch, significant mismatch)
6. Prompt builder: correct stage-specific prompts, tone injection, authority mode
7. Response parser: storyboard/layout/calendar/strategic-review extraction
8. Response parser: lenient parsing recovers from trailing commas, unquoted keys, single quotes
9. Response parser: returns rawText + parseError on complete failure (never throws)
10. Response parser: partial extraction populates what's valid, sets isPartial=true
11. pivotCategory() preserves correct fields, clears downstream
12. Content calendar validation: cadence, pillars, arcs, CTA escalation
13. Video hook validation: scene 1 has persona, pain metric, quantifiable impact
14. DEEPEN transitions and option generation by deliverable type
15. BriefingState → LiveBrief composition: brief fields readable from state.brief.\*
16. Serialization/deserialization roundtrip preserves all state
17. Stall config: TASK_TYPE/INTENT narrow options after 2 turns, recommend after 3
18. Stall config: STRUCTURE soft nudge appears after 4 turns
19. Stall config: INSPIRATION/MOODBOARD/REVIEW/DEEPEN have no limits
20. dispatch({ type: 'STAGE_RESPONSE', response: 'accept' }) advances from STRATEGIC_REVIEW
21. dispatch({ type: 'STAGE_RESPONSE', response: 'override' }) advances and sets userOverride=true
22. dispatch({ type: 'SELECT_DEEPEN', option }) adds to deepenSelections without advancing

### Manual Tests

23. Each of 10 example messages lands on correct stage
24. Skip behavior works (detailed first messages jump to INSPIRATION)
25. Each branch works (video→storyboard, website→layout, content→calendar, design→spec)
26. Moodboard hybrid works (overall + per-section overrides)
27. Category pivot works (video→website resets to STRUCTURE, clears downstream)
28. State rehydration: refresh page, state + tone profile restores
29. STRATEGIC_REVIEW: aligned (proceeds), minor mismatch (override), significant mismatch (adjust)
30. Tone calibration difference audible between enterprise and consumer
31. REVIEW provides strategic framing, not passive confirmation
32. DEEPEN loop: select multiple depth paths before submitting
33. Authority tone at STRATEGIC_REVIEW/REVIEW/DEEPEN/SUBMIT — no passive questions
34. Feature flag: disabled = existing behavior, enabled = new state machine
35. "Show more"/"Something different" at INSPIRATION skips AI call (performance)
36. Brand-style-scoring integration: styles at INSPIRATION reflect company brand profile
37. Stall recovery at TASK_TYPE: vague responses 3x → AI recommends (never auto-advances)
38. Stall recovery at STRUCTURE: 4+ turns → soft nudge, user can dismiss
39. Parse-error fallback: malformed AI → text-only + "Generate structure" quick option
40. Parse-error fallback: partial JSON → partial structure with "incomplete" indicator
41. `npm run validate` passes (lint + typecheck + test)
