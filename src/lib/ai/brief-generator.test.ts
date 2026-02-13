import { describe, it, expect } from 'vitest'
import {
  generateContentOutline,
  generateDesignerBrief,
  exportBriefAsMarkdown,
  exportBriefAsJSON,
} from './brief-generator'
import type { LiveBrief } from '@/components/chat/brief-panel/types'

function makeLiveBrief(overrides?: Partial<LiveBrief>): LiveBrief {
  return {
    taskSummary: { value: 'Launch campaign for FitApp', confidence: 90, source: 'confirmed' },
    topic: { value: 'fitness app launch', confidence: 80, source: 'confirmed' },
    platform: { value: 'instagram', confidence: 90, source: 'confirmed' },
    contentType: { value: 'post', confidence: 85, source: 'confirmed' },
    intent: { value: 'awareness', confidence: 80, source: 'confirmed' },
    taskType: { value: 'single_asset', confidence: 85, source: 'confirmed' },
    audience: {
      value: {
        name: 'Fitness Enthusiasts',
        demographics: '25-40 year olds',
        psychographics: 'Health-conscious',
        painPoints: ['Finding time to exercise'],
        goals: ['Get in shape'],
      },
      confidence: 70,
      source: 'inferred',
    },
    dimensions: [{ width: 1080, height: 1080, label: 'Square', aspectRatio: '1:1' }],
    visualDirection: {
      selectedStyles: [
        {
          id: 's1',
          name: 'Bold',
          imageUrl: '/styles/bold.png',
          styleAxis: 'bold',
          deliverableType: 'instagram_post',
        },
      ],
      moodKeywords: ['energetic', 'vibrant'],
      colorPalette: ['#FF5733', '#33FF57'],
      typography: { primary: 'Inter', secondary: 'Roboto' },
      avoidElements: ['stock photos'],
    },
    contentOutline: null,
    ...overrides,
  }
}

const BRAND_CONTEXT = {
  name: 'FitApp',
  industry: 'Health & Fitness',
  toneOfVoice: 'Energetic and motivational',
  brandDescription: 'A fitness tracking app for everyday athletes',
}

describe('generateContentOutline', () => {
  it('should generate an outline with correct number of weeks', () => {
    const outline = generateContentOutline({
      topic: 'fitness app',
      platform: 'instagram',
      contentType: 'post',
      intent: 'awareness',
      durationDays: 14,
    })

    expect(outline.weekGroups.length).toBe(2)
    expect(outline.title).toContain('14-Day')
    expect(outline.title).toContain('Instagram')
  })

  it('should create items across weeks', () => {
    const outline = generateContentOutline({
      topic: 'tech product',
      platform: 'linkedin',
      contentType: 'post',
      intent: 'signups',
      durationDays: 7,
    })

    expect(outline.weekGroups.length).toBe(1)
    expect(outline.totalItems).toBeGreaterThan(0)
    const items = outline.weekGroups[0].items
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].platform).toBe('linkedin')
    expect(items[0].contentType).toBe('post')
    expect(items[0].status).toBe('draft')
  })

  it('should expand only the first week', () => {
    const outline = generateContentOutline({
      topic: 'test',
      platform: 'instagram',
      contentType: 'post',
      intent: 'awareness',
      durationDays: 21,
    })

    expect(outline.weekGroups[0].isExpanded).toBe(true)
    if (outline.weekGroups.length > 1) {
      expect(outline.weekGroups[1].isExpanded).toBe(false)
    }
  })

  it('should include audience name in subtitle when provided', () => {
    const outline = generateContentOutline({
      topic: 'test',
      platform: 'instagram',
      contentType: 'post',
      intent: 'education',
      durationDays: 7,
      audienceName: 'Small business owners',
    })

    expect(outline.subtitle).toContain('Small business owners')
  })

  it('should handle all intent types without error', () => {
    const intents = [
      'signups',
      'authority',
      'awareness',
      'sales',
      'engagement',
      'education',
      'announcement',
    ] as const
    for (const intent of intents) {
      const outline = generateContentOutline({
        topic: 'test',
        platform: 'instagram',
        contentType: 'post',
        intent,
        durationDays: 7,
      })
      expect(outline.totalItems).toBeGreaterThan(0)
    }
  })

  it('should interpolate topic into item titles', () => {
    const outline = generateContentOutline({
      topic: 'Organic Coffee',
      platform: 'instagram',
      contentType: 'post',
      intent: 'awareness',
      durationDays: 7,
    })

    const allTitles = outline.weekGroups.flatMap((g) => g.items.map((i) => i.title))
    const hasTopicInTitle = allTitles.some((t) => t.includes('Organic Coffee'))
    expect(hasTopicInTitle).toBe(true)
  })

  it('should assign sequential item numbers', () => {
    const outline = generateContentOutline({
      topic: 'test',
      platform: 'instagram',
      contentType: 'post',
      intent: 'awareness',
      durationDays: 14,
    })

    const allItems = outline.weekGroups.flatMap((g) => g.items)
    for (let i = 0; i < allItems.length; i++) {
      expect(allItems[i].number).toBe(i + 1)
    }
  })
})

describe('generateDesignerBrief', () => {
  it('should convert a LiveBrief to a DesignerBrief', () => {
    const brief = makeLiveBrief()
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-123')

    expect(result.taskSummary).toBe('Launch campaign for FitApp')
    expect(result.intent).toBe('awareness')
    expect(result.platform).toBe('instagram')
    expect(result.conversationId).toBe('conv-123')
    expect(result.generatedAt).toBeInstanceOf(Date)
  })

  it('should include visual direction from brief', () => {
    const brief = makeLiveBrief()
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.visualDirection.selectedStyles).toHaveLength(1)
    expect(result.visualDirection.selectedStyles[0].name).toBe('Bold')
    expect(result.visualDirection.moodKeywords).toEqual(['energetic', 'vibrant'])
    expect(result.visualDirection.colorPalette).toEqual(['#FF5733', '#33FF57'])
    expect(result.visualDirection.avoidElements).toEqual(['stock photos'])
  })

  it('should include audience details', () => {
    const brief = makeLiveBrief()
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.audience.name).toBe('Fitness Enthusiasts')
    expect(result.audience.painPoints).toEqual(['Finding time to exercise'])
  })

  it('should handle missing optional fields gracefully', () => {
    const brief = makeLiveBrief({
      audience: { value: null, confidence: 0, source: 'pending' },
      visualDirection: undefined,
    })
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.audience.name).toBe('General Audience')
    expect(result.visualDirection.selectedStyles).toEqual([])
    expect(result.visualDirection.moodKeywords).toEqual([])
  })

  it('should generate copy guidelines from intent and brand tone', () => {
    const brief = makeLiveBrief()
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.content.copyGuidelines).toContain('Energetic and motivational')
    expect(result.content.copyGuidelines).toContain('memorable')
  })

  it('should generate hashtags including platform and topic', () => {
    const brief = makeLiveBrief()
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.content.hashtags).toContain('#instagram')
    expect(result.content.hashtags.some((h: string) => h.includes('fitness'))).toBe(true)
  })

  it('should set content type to multi for multi_asset_plan', () => {
    const brief = makeLiveBrief({
      taskType: { value: 'multi_asset_plan', confidence: 90, source: 'confirmed' },
    })
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.content.type).toBe('multi')
  })

  it('should include brand context', () => {
    const brief = makeLiveBrief()
    const result = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')

    expect(result.brandContext).toEqual(BRAND_CONTEXT)
  })
})

describe('exportBriefAsMarkdown', () => {
  it('should export a valid markdown string', () => {
    const brief = makeLiveBrief()
    const designerBrief = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')
    const md = exportBriefAsMarkdown(designerBrief)

    expect(md).toContain('# Launch campaign for FitApp')
    expect(md).toContain('## Overview')
    expect(md).toContain('## Target Audience')
    expect(md).toContain('## Visual Direction')
    expect(md).toContain('## Brand Context')
    expect(md).toContain('Fitness Enthusiasts')
    expect(md).toContain('FitApp')
  })
})

describe('exportBriefAsJSON', () => {
  it('should export valid parseable JSON', () => {
    const brief = makeLiveBrief()
    const designerBrief = generateDesignerBrief(brief, BRAND_CONTEXT, 'conv-1')
    const json = exportBriefAsJSON(designerBrief)

    const parsed = JSON.parse(json)
    expect(parsed.taskSummary).toBe('Launch campaign for FitApp')
    expect(parsed.brandContext.name).toBe('FitApp')
  })
})
