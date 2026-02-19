import { describe, it, expect } from 'vitest'
import { inferStageFromResponse } from './briefing-stage-inferrer'

describe('inferStageFromResponse', () => {
  // ===========================================================================
  // STRUCTURE marker detection
  // ===========================================================================

  it('infers STRUCTURE from [STORYBOARD] marker', () => {
    const response = `Here's the storyboard:\n[STORYBOARD]{"scenes":[]}[/STORYBOARD]`
    const result = inferStageFromResponse(response, 'STRUCTURE')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRUCTURE')
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('infers STRUCTURE from [LAYOUT] marker', () => {
    const response = `[LAYOUT]{"sections":[]}[/LAYOUT]`
    const result = inferStageFromResponse(response, 'STRUCTURE')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRUCTURE')
  })

  it('infers STRUCTURE from [CALENDAR] marker', () => {
    const response = `[CALENDAR]{"weeks":[]}[/CALENDAR]`
    const result = inferStageFromResponse(response, 'STRUCTURE')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRUCTURE')
  })

  it('infers STRUCTURE from [DESIGN_SPEC] marker', () => {
    const response = `[DESIGN_SPEC]{"format":"poster"}[/DESIGN_SPEC]`
    const result = inferStageFromResponse(response, 'STRUCTURE')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRUCTURE')
  })

  // ===========================================================================
  // STRATEGIC_REVIEW detection
  // ===========================================================================

  it('infers STRATEGIC_REVIEW from [STRATEGIC_REVIEW] marker', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["good"],"risks":["bad"]}[/STRATEGIC_REVIEW]`
    const result = inferStageFromResponse(response, 'STRATEGIC_REVIEW')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRATEGIC_REVIEW')
    expect(result!.confidence).toBe(0.95)
  })

  it('infers STRATEGIC_REVIEW from content heuristics (strengths + risks + optimization)', () => {
    const response = `Your strengths are clear messaging. The risks include narrow audience. I'd optimize by broadening the CTA.`
    const result = inferStageFromResponse(response, 'STRATEGIC_REVIEW')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRATEGIC_REVIEW')
    expect(result!.confidence).toBe(0.75)
  })

  it('does not infer STRATEGIC_REVIEW from partial content (missing optimization)', () => {
    const response = `Your strengths are clear messaging. The risks include narrow audience.`
    const result = inferStageFromResponse(response, 'STRATEGIC_REVIEW')
    expect(result).toBeNull()
  })

  // ===========================================================================
  // INSPIRATION detection
  // ===========================================================================

  it('infers INSPIRATION from [DELIVERABLE_STYLES] marker', () => {
    const response = `Here are some styles:\n[DELIVERABLE_STYLES: launch_video]`
    const result = inferStageFromResponse(response, 'INSPIRATION')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('INSPIRATION')
    expect(result!.confidence).toBe(0.9)
  })

  // ===========================================================================
  // SUBMIT detection
  // ===========================================================================

  it('infers SUBMIT from [TASK_READY] marker', () => {
    const response = `Your brief is ready.\n[TASK_READY]{"title":"Project"}[/TASK_READY]`
    const result = inferStageFromResponse(response, 'SUBMIT')
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('SUBMIT')
    expect(result!.confidence).toBe(0.95)
  })

  // ===========================================================================
  // Legal transition enforcement
  // ===========================================================================

  it('returns null when inferred stage is not a legal transition', () => {
    // EXTRACT cannot jump to ELABORATE (skipping STRUCTURE and INSPIRATION)
    const response = `[STORYBOARD]{"scenes":[]}[/STORYBOARD]`
    const _result = inferStageFromResponse(response, 'ELABORATE')
    // ELABORATE infers as ELABORATE (not STRUCTURE) since currentStage === ELABORATE
    // Instead, test a truly illegal transition: INSPIRATION marker from EXTRACT
    const styleResponse = `[DELIVERABLE_STYLES: video | search: tech dark modern]`
    const styleResult = inferStageFromResponse(styleResponse, 'EXTRACT')
    // INSPIRATION is not a legal transition from EXTRACT
    expect(styleResult).toBeNull()
  })

  it('returns null when SUBMIT inferred but current stage is EXTRACT', () => {
    const response = `[TASK_READY]{"title":"Project"}[/TASK_READY]`
    const result = inferStageFromResponse(response, 'EXTRACT')
    expect(result).toBeNull()
  })

  it('does not allow STRUCTURE inference from INSPIRATION (STRUCTURE is before INSPIRATION)', () => {
    const response = `[STORYBOARD]{"scenes":[]}[/STORYBOARD]`
    const result = inferStageFromResponse(response, 'INSPIRATION')
    expect(result).toBeNull()
  })

  it('does not allow STRATEGIC_REVIEW inference from STRUCTURE (not a legal transition)', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["a"],"risks":["b"]}[/STRATEGIC_REVIEW]`
    const result = inferStageFromResponse(response, 'STRUCTURE')
    expect(result).toBeNull()
  })

  it('rejects STRATEGIC_REVIEW inference from ELABORATE (stage disabled)', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["a"],"risks":["b"]}[/STRATEGIC_REVIEW]`
    const result = inferStageFromResponse(response, 'ELABORATE')
    // STRATEGIC_REVIEW is no longer a legal transition from ELABORATE
    expect(result).toBeNull()
  })

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  it('returns null for a generic response with no markers', () => {
    const response = `Great, let me help you figure out what you need.`
    const result = inferStageFromResponse(response, 'EXTRACT')
    expect(result).toBeNull()
  })

  it('picks highest confidence when multiple markers present', () => {
    // Both STRUCTURE (0.95) and content-based STRATEGIC_REVIEW (0.75) detected
    // but from STRUCTURE, STRATEGIC_REVIEW is legal so both are candidates
    const response = `[STORYBOARD]{"scenes":[]}[/STORYBOARD]\nStrengths include X. Risks include Y. Optimize by Z.`
    const result = inferStageFromResponse(response, 'STRUCTURE')
    // STORYBOARD → STRUCTURE (0.95) vs content heuristic → STRATEGIC_REVIEW (0.75)
    // Both are legal from STRUCTURE, highest confidence wins
    expect(result).not.toBeNull()
    expect(result!.stage).toBe('STRUCTURE')
    expect(result!.confidence).toBe(0.95)
  })
})
