/**
 * Content-Based Stage Inferrer for Briefing State Machine
 *
 * When AI responses are missing [BRIEF_META] markers, this module
 * analyzes the response content to infer what stage the conversation
 * should be in. Used as Tier 1 fallback before evaluateTransitions().
 *
 * All functions are pure — no side effects, no API calls.
 */

import type { BriefingStage } from './briefing-state-machine'
import { getLegalTransitions } from './briefing-state-machine'

// =============================================================================
// TYPES
// =============================================================================

export interface StageInference {
  stage: BriefingStage
  confidence: number
  reason: string
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Infer the intended stage from the AI response content.
 * Only returns inferences that are legal transitions from the current stage
 * and meet the minimum confidence threshold (0.7).
 *
 * @param aiResponse - Full AI response text
 * @param currentStage - Current briefing stage
 * @returns StageInference or null if no confident inference can be made
 */
export function inferStageFromResponse(
  aiResponse: string,
  currentStage: BriefingStage
): StageInference | null {
  const candidates: StageInference[] = []

  // Detect structure markers → STRUCTURE or ELABORATE
  if (
    /\[STORYBOARD\]/.test(aiResponse) ||
    /\[LAYOUT\]/.test(aiResponse) ||
    /\[CALENDAR\]/.test(aiResponse) ||
    /\[DESIGN_SPEC\]/.test(aiResponse)
  ) {
    // During ELABORATE stage, structure markers indicate elaborated content, not a new structure
    const inferredStage = currentStage === 'ELABORATE' ? 'ELABORATE' : 'STRUCTURE'
    candidates.push({
      stage: inferredStage,
      confidence: 0.95,
      reason:
        currentStage === 'ELABORATE'
          ? 'Elaborated structure marker detected'
          : 'Structure marker detected',
    })
  }

  // Detect strategic review marker → STRATEGIC_REVIEW
  if (/\[STRATEGIC_REVIEW\]/.test(aiResponse)) {
    candidates.push({
      stage: 'STRATEGIC_REVIEW',
      confidence: 0.95,
      reason: 'Strategic review marker detected',
    })
  } else if (
    /\bstrengths?\b/i.test(aiResponse) &&
    /\brisks?\b/i.test(aiResponse) &&
    /\boptimiz/i.test(aiResponse)
  ) {
    // Content heuristic: mentions strengths + risks + optimization without marker
    candidates.push({
      stage: 'STRATEGIC_REVIEW',
      confidence: 0.75,
      reason: 'Strategic review content detected (strengths + risks + optimization)',
    })
  }

  // Detect deliverable styles marker → INSPIRATION
  if (/\[DELIVERABLE_STYLES[^\]]*\]/.test(aiResponse)) {
    candidates.push({
      stage: 'INSPIRATION',
      confidence: 0.9,
      reason: 'Deliverable styles marker detected',
    })
  }

  // Detect task ready marker → SUBMIT
  if (/\[TASK_READY\]/.test(aiResponse)) {
    candidates.push({
      stage: 'SUBMIT',
      confidence: 0.95,
      reason: 'Task ready marker detected',
    })
  }

  // Filter to only legal transitions from current stage with sufficient confidence
  const legal = new Set(getLegalTransitions(currentStage))
  const legalCandidates = candidates
    .filter((c) => legal.has(c.stage))
    .filter((c) => c.confidence >= 0.7)
    .sort((a, b) => b.confidence - a.confidence)

  return legalCandidates[0] ?? null
}
