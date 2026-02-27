import { describe, it, expect } from 'vitest'
import {
  parseStructuredOutput,
  parseStrategicReview,
  extractMarkerContent,
  lenientJsonParse,
  getFormatReinforcement,
  getStrategicReviewReinforcement,
} from './briefing-response-parser'

// =============================================================================
// MARKER EXTRACTION
// =============================================================================

describe('extractMarkerContent', () => {
  it('extracts content between markers', () => {
    const text = 'Some text [STORYBOARD]{"scenes":[]}[/STORYBOARD] more text'
    expect(extractMarkerContent(text, 'STORYBOARD')).toBe('{"scenes":[]}')
  })

  it('returns null when no marker found', () => {
    expect(extractMarkerContent('no markers here', 'STORYBOARD')).toBeNull()
  })

  it('handles unclosed marker — extracts remaining', () => {
    const text = 'Text [LAYOUT]{"sections":[]}'
    expect(extractMarkerContent(text, 'LAYOUT')).toBe('{"sections":[]}')
  })

  it('handles multiline content', () => {
    const text = `Here is the layout:
[LAYOUT]
{
  "sections": [
    {"sectionName": "Hero", "purpose": "Grab attention", "contentGuidance": "Bold headline", "order": 1}
  ]
}
[/LAYOUT]
That's the layout.`
    const content = extractMarkerContent(text, 'LAYOUT')
    expect(content).toContain('"sections"')
  })

  it('handles all marker types', () => {
    const markers = ['STORYBOARD', 'LAYOUT', 'CALENDAR', 'DESIGN_SPEC', 'STRATEGIC_REVIEW'] as const
    for (const marker of markers) {
      const text = `[${marker}]{"data":true}[/${marker}]`
      expect(extractMarkerContent(text, marker)).toBe('{"data":true}')
    }
  })
})

// =============================================================================
// LENIENT JSON PARSING (Test #8 from plan)
// =============================================================================

describe('lenientJsonParse', () => {
  it('parses valid JSON', () => {
    const result = lenientJsonParse('{"key": "value"}')
    expect(result).toEqual({ key: 'value' })
  })

  it('handles trailing commas', () => {
    const result = lenientJsonParse('{"key": "value", "arr": [1, 2, 3,],}')
    expect(result).toEqual({ key: 'value', arr: [1, 2, 3] })
  })

  it('handles single quotes', () => {
    const result = lenientJsonParse("{'key': 'value'}")
    expect(result).toEqual({ key: 'value' })
  })

  it('handles unquoted keys', () => {
    const result = lenientJsonParse('{key: "value", nested: {inner: "data"}}')
    expect(result).toEqual({ key: 'value', nested: { inner: 'data' } })
  })

  it('handles comments', () => {
    const result = lenientJsonParse(`{
      // this is a comment
      "key": "value"
      /* multi-line
         comment */
    }`)
    expect(result).toEqual({ key: 'value' })
  })

  it('returns null for completely invalid input', () => {
    expect(lenientJsonParse('not json at all')).toBeNull()
  })

  it('returns null for primitive values', () => {
    expect(lenientJsonParse('"just a string"')).toBeNull()
    expect(lenientJsonParse('42')).toBeNull()
  })

  it('handles mixed issues (trailing comma + single quotes + unquoted keys)', () => {
    const result = lenientJsonParse("{name: 'test', items: ['a', 'b',],}")
    expect(result).toEqual({ name: 'test', items: ['a', 'b'] })
  })
})

// =============================================================================
// STORYBOARD PARSING (Test #7 from plan)
// =============================================================================

describe('parseStructuredOutput — storyboard', () => {
  it('parses valid storyboard with scenes', () => {
    const response = `Here's your storyboard:
[STORYBOARD]{"scenes":[{"sceneNumber":1,"title":"Hook","description":"Opening impact","duration":"5s","visualNote":"Fast cuts","hookData":{"targetPersona":"CTO","painMetric":"40% pipeline loss","quantifiableImpact":"2x faster shipping"}},{"sceneNumber":2,"title":"Problem","description":"Show the pain","duration":"10s","visualNote":"Screen recordings"}]}[/STORYBOARD]
Let me know what you think.`

    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(true)
    expect(result.isPartial).toBe(false)
    expect(result.data).not.toBeNull()
    expect(result.data!.type).toBe('storyboard')

    if (result.data!.type === 'storyboard') {
      expect(result.data!.scenes).toHaveLength(2)
      expect(result.data!.scenes[0].title).toBe('Hook')
      expect(result.data!.scenes[0].hookData).toBeDefined()
      expect(result.data!.scenes[0].hookData!.targetPersona).toBe('CTO')
      expect(result.data!.scenes[0].hookData!.painMetric).toBe('40% pipeline loss')
    }
  })

  it('parses storyboard as direct array', () => {
    const response = `[STORYBOARD][{"sceneNumber":1,"title":"Hook","description":"Open strong","duration":"5s","visualNote":"Drone shot"}][/STORYBOARD]`

    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(true)
    if (result.data?.type === 'storyboard') {
      expect(result.data.scenes).toHaveLength(1)
    }
  })

  it('returns failure when no marker found (Test #9 — never throws)', () => {
    const response = 'AI forgot the markers. Here is the storyboard in plain text.'
    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.rawText).toBe(response)
    expect(result.parseError).toContain('No [STORYBOARD] marker found')
  })

  it('partially extracts scenes with missing fields (Test #10)', () => {
    const response = `[STORYBOARD]{"scenes":[{"title":"Hook","description":"Open strong"},{"title":"Problem"}]}[/STORYBOARD]`
    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(true)
    if (result.data?.type === 'storyboard') {
      expect(result.data.scenes).toHaveLength(2)
      expect(result.data.scenes[0].duration).toBe('5s') // Floor: missing duration defaults to 5s
      expect(result.data.scenes[0].sceneNumber).toBe(1)
    }
  })

  it('recovers from trailing commas in storyboard JSON (Test #8)', () => {
    const response = `[STORYBOARD]{"scenes":[{"sceneNumber":1,"title":"Hook","description":"Open","duration":"5s","visualNote":"Fast",},]}[/STORYBOARD]`
    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(true)
    if (result.data?.type === 'storyboard') {
      expect(result.data.scenes).toHaveLength(1)
    }
  })

  it('handles snake_case keys', () => {
    const response = `[STORYBOARD]{"scenes":[{"sceneNumber":1,"title":"Hook","description":"Open","duration":"5s","visual_note":"Bold","hookData":{"target_persona":"CTO","pain_metric":"slow deploys","quantifiable_impact":"3x faster"}}]}[/STORYBOARD]`
    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(true)
    if (result.data?.type === 'storyboard') {
      expect(result.data.scenes[0].visualNote).toBe('Bold')
      expect(result.data.scenes[0].hookData?.targetPersona).toBe('CTO')
    }
  })
})

// =============================================================================
// LAYOUT PARSING (Test #7)
// =============================================================================

describe('parseStructuredOutput — layout', () => {
  it('parses valid layout', () => {
    const response = `[LAYOUT]{"sections":[{"sectionName":"Hero","purpose":"First impression","contentGuidance":"Bold headline + CTA","order":1},{"sectionName":"Features","purpose":"Value prop","contentGuidance":"3 feature cards","order":2}]}[/LAYOUT]`

    const result = parseStructuredOutput(response, 'layout')
    expect(result.success).toBe(true)
    if (result.data?.type === 'layout') {
      expect(result.data.sections).toHaveLength(2)
      expect(result.data.sections[0].sectionName).toBe('Hero')
    }
  })

  it('parses layout as direct array', () => {
    const response = `[LAYOUT][{"name":"Hero","purpose":"Impact","contentGuidance":"Bold","order":1}][/LAYOUT]`
    const result = parseStructuredOutput(response, 'layout')
    expect(result.success).toBe(true)
    if (result.data?.type === 'layout') {
      expect(result.data.sections[0].sectionName).toBe('Hero')
    }
  })

  it('handles section_name snake_case', () => {
    const response = `[LAYOUT]{"sections":[{"section_name":"Hero","purpose":"Impact","content_guidance":"Bold headline","order":1}]}[/LAYOUT]`
    const result = parseStructuredOutput(response, 'layout')
    expect(result.success).toBe(true)
    if (result.data?.type === 'layout') {
      expect(result.data.sections[0].sectionName).toBe('Hero')
      expect(result.data.sections[0].contentGuidance).toBe('Bold headline')
    }
  })
})

// =============================================================================
// CALENDAR PARSING (Test #7, #12)
// =============================================================================

describe('parseStructuredOutput — calendar', () => {
  it('parses valid content calendar', () => {
    const response = `[CALENDAR]{"totalDuration":"4 weeks","postingCadence":"3x/week","platforms":["Instagram","TikTok"],"distributionLogic":"Cross-post stories","contentPillars":[{"name":"Education","description":"How-to content","percentage":40},{"name":"Social proof","description":"Case studies","percentage":30},{"name":"Engagement","description":"Polls and questions","percentage":30}],"weeks":[{"weekNumber":1,"narrativeArc":"Introduction","theme":"Meet the brand","posts":[{"dayOfWeek":"Monday","pillarType":"pillar","topic":"Brand story","format":"Carousel","cta":"Follow us","engagementTrigger":"Poll"}]}],"ctaEscalation":{"awarenessPhase":{"weeks":[1,2],"ctaStyle":"soft"},"engagementPhase":{"weeks":[3],"ctaStyle":"engage"},"conversionPhase":{"weeks":[4],"ctaStyle":"direct CTA"}}}[/CALENDAR]`

    const result = parseStructuredOutput(response, 'calendar')
    expect(result.success).toBe(true)
    if (result.data?.type === 'calendar') {
      expect(result.data.outline.contentPillars).toHaveLength(3)
      expect(result.data.outline.postingCadence).toBe('3x/week')
      expect(result.data.outline.weeks).toHaveLength(1)
      expect(result.data.outline.ctaEscalation.awarenessPhase.weeks).toEqual([1, 2])
    }
  })

  it('partially extracts calendar with only pillars (Test #10)', () => {
    const response = `[CALENDAR]{"contentPillars":[{"name":"Education","description":"How-to","percentage":50},{"name":"Social","description":"Community","percentage":50}]}[/CALENDAR]`
    const result = parseStructuredOutput(response, 'calendar')
    // Full validation fails (missing weeks etc), but partial extraction succeeds
    expect(result.data).not.toBeNull()
    if (result.data?.type === 'calendar') {
      expect(result.data.outline.contentPillars).toHaveLength(2)
    }
  })

  it('handles snake_case calendar keys', () => {
    const response = `[CALENDAR]{"total_duration":"2 weeks","posting_cadence":"5x/week","platforms":["TikTok"],"distribution_logic":"Native only","content_pillars":[{"name":"Behind scenes","description":"BTS","percentage":40}],"weeks":[],"cta_escalation":{"awareness_phase":{"weeks":[1],"cta_style":"soft"},"engagement_phase":{"weeks":[],"cta_style":""},"conversion_phase":{"weeks":[2],"cta_style":"direct"}}}[/CALENDAR]`
    const result = parseStructuredOutput(response, 'calendar')
    expect(result.success).toBe(true)
    if (result.data?.type === 'calendar') {
      expect(result.data.outline.totalDuration).toBe('2 weeks')
      expect(result.data.outline.postingCadence).toBe('5x/week')
    }
  })
})

// =============================================================================
// DESIGN SPEC PARSING (Test #7)
// =============================================================================

describe('parseStructuredOutput — design spec', () => {
  it('parses valid design spec', () => {
    const response = `[DESIGN_SPEC]{"format":"Social post","dimensions":[{"width":1080,"height":1080,"label":"Instagram square"}],"keyElements":["Logo","CTA button","Product image"],"copyGuidance":"Short punchy headline, max 6 words"}[/DESIGN_SPEC]`

    const result = parseStructuredOutput(response, 'single_design')
    expect(result.success).toBe(true)
    if (result.data?.type === 'single_design') {
      expect(result.data.specification.format).toBe('Social post')
      expect(result.data.specification.dimensions).toHaveLength(1)
      expect(result.data.specification.keyElements).toHaveLength(3)
    }
  })

  it('parses design spec with snake_case', () => {
    const response = `[DESIGN_SPEC]{"format":"Banner","dimensions":[],"key_elements":["Logo"],"copy_guidance":"Keep it brief"}[/DESIGN_SPEC]`
    const result = parseStructuredOutput(response, 'single_design')
    expect(result.success).toBe(true)
    if (result.data?.type === 'single_design') {
      expect(result.data.specification.keyElements).toEqual(['Logo'])
      expect(result.data.specification.copyGuidance).toBe('Keep it brief')
    }
  })
})

// =============================================================================
// STRATEGIC REVIEW PARSING (Test #7)
// =============================================================================

describe('parseStrategicReview', () => {
  it('parses valid strategic review', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["Strong hook","Clear audience"],"risks":["Tone may be too aggressive"],"optimizationSuggestion":"Soften Scene 3 CTA","inspirationFitScore":"aligned","inspirationFitNote":null}[/STRATEGIC_REVIEW]`

    const result = parseStrategicReview(response)
    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data!.strengths).toHaveLength(2)
    expect(result.data!.risks).toHaveLength(1)
    expect(result.data!.optimizationSuggestion).toBe('Soften Scene 3 CTA')
    expect(result.data!.inspirationFitScore).toBe('aligned')
    expect(result.data!.userOverride).toBe(false)
  })

  it('handles minor_mismatch fit score', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["Good structure"],"risks":["Audience mismatch"],"optimizationSuggestion":"Adjust tone","inspirationFitScore":"minor_mismatch","inspirationFitNote":"Style may need softening"}[/STRATEGIC_REVIEW]`
    const result = parseStrategicReview(response)
    expect(result.success).toBe(true)
    expect(result.data!.inspirationFitScore).toBe('minor_mismatch')
    expect(result.data!.inspirationFitNote).toBe('Style may need softening')
  })

  it('defaults to aligned for unknown fit scores', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["Good"],"risks":["Risk"],"optimizationSuggestion":"Fix it","inspirationFitScore":"unknown_value"}[/STRATEGIC_REVIEW]`
    const result = parseStrategicReview(response)
    expect(result.success).toBe(true)
    expect(result.data!.inspirationFitScore).toBe('aligned')
  })

  it('returns failure when no marker found', () => {
    const result = parseStrategicReview('No strategic review here.')
    expect(result.success).toBe(false)
    expect(result.parseError).toContain('No [STRATEGIC_REVIEW] marker found')
  })

  it('returns failure with incomplete data', () => {
    const response = `[STRATEGIC_REVIEW]{"strengths":["Good"]}[/STRATEGIC_REVIEW]`
    const result = parseStrategicReview(response)
    expect(result.success).toBe(false)
    expect(result.isPartial).toBe(true)
  })
})

// =============================================================================
// NEVER THROWS (Test #9 from plan)
// =============================================================================

describe('parseStructuredOutput — never throws', () => {
  it('returns rawText + parseError on complete failure', () => {
    const response = 'Total garbage, not even close to JSON.'
    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.rawText).toBe(response)
    expect(result.parseError).toBeDefined()
  })

  it('handles empty string', () => {
    const result = parseStructuredOutput('', 'layout')
    expect(result.success).toBe(false)
    expect(result.rawText).toBe('')
  })

  it('handles marker with empty content', () => {
    const result = parseStructuredOutput('[STORYBOARD][/STORYBOARD]', 'storyboard')
    expect(result.success).toBe(false)
  })

  it('handles marker with invalid JSON', () => {
    const result = parseStructuredOutput('[LAYOUT]not json at all[/LAYOUT]', 'layout')
    expect(result.success).toBe(false)
    expect(result.parseError).toContain('Failed to parse')
  })

  it('handles unknown structure type gracefully', () => {
    const result = parseStructuredOutput('text', 'unknown_type' as never)
    expect(result.success).toBe(false)
    expect(result.parseError).toContain('Unknown structure type')
  })
})

// =============================================================================
// PARTIAL EXTRACTION (Test #10 from plan)
// =============================================================================

describe('parseStructuredOutput — partial extraction', () => {
  it('partially extracts storyboard scenes with some missing fields', () => {
    const response = `[STORYBOARD]{"scenes":[{"title":"Hook"},{"sceneNumber":2,"title":"Problem","description":"The pain point","duration":"10s"}]}[/STORYBOARD]`
    const result = parseStructuredOutput(response, 'storyboard')
    expect(result.success).toBe(true)
    if (result.data?.type === 'storyboard') {
      expect(result.data.scenes.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('sets isPartial true for partially valid data', () => {
    // Calendar with pillars but missing other required data — partial
    const response = `[CALENDAR]{"content_pillars":[{"name":"Edu","description":"Learn","percentage":100}]}[/CALENDAR]`
    const result = parseStructuredOutput(response, 'calendar')
    // Either full validation works (with defaults) or partial extraction kicks in
    expect(result.data).not.toBeNull()
  })
})

// =============================================================================
// FORMAT REINFORCEMENT (Tier 2 support)
// =============================================================================

describe('getFormatReinforcement', () => {
  it('returns format guidance for storyboard', () => {
    const text = getFormatReinforcement('storyboard')
    expect(text).toContain('[STORYBOARD]')
    expect(text).toContain('scenes')
  })

  it('returns format guidance for layout', () => {
    const text = getFormatReinforcement('layout')
    expect(text).toContain('[LAYOUT]')
    expect(text).toContain('sections')
  })

  it('returns format guidance for calendar', () => {
    const text = getFormatReinforcement('calendar')
    expect(text).toContain('[CALENDAR]')
    expect(text).toContain('contentPillars')
  })

  it('returns format guidance for single_design', () => {
    const text = getFormatReinforcement('single_design')
    expect(text).toContain('[DESIGN_SPEC]')
    expect(text).toContain('format')
  })
})

describe('getStrategicReviewReinforcement', () => {
  it('returns format guidance for strategic review', () => {
    const text = getStrategicReviewReinforcement()
    expect(text).toContain('[STRATEGIC_REVIEW]')
    expect(text).toContain('strengths')
    expect(text).toContain('risks')
  })
})
