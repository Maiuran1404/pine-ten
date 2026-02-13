/**
 * Chat context extraction utilities for style filtering and industry detection
 */

import {
  INDUSTRY_KEYWORDS,
  CONTEXT_INDUSTRY_KEYWORDS,
  CONTEXT_STYLE_KEYWORDS,
} from '@/lib/constants/style-keywords'
import type { StyleContext } from '@/lib/ai/brand-style-scoring'

/**
 * Detect industry from conversation messages
 */
export function detectIndustryFromMessage(
  messages: { role: string; content: string }[]
): string | null {
  const recentText = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content.toLowerCase())
    .join(' ')

  // Count keyword matches per industry
  const industryScores: Record<string, number> = {}

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (recentText.includes(keyword)) {
        score++
      }
    }
    if (score > 0) {
      industryScores[industry] = score
    }
  }

  // Return the industry with the highest score
  const sortedIndustries = Object.entries(industryScores).sort((a, b) => b[1] - a[1])
  return sortedIndustries.length > 0 ? sortedIndustries[0][0] : null
}

/**
 * Extract context from conversation messages for style filtering
 */
export function extractStyleContext(messages: { role: string; content: string }[]): StyleContext {
  // Combine recent messages for context extraction
  const recentUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3) // Last 3 user messages
    .map((m) => m.content)
    .join(' ')

  const contextText = recentUserMessages.toLowerCase()

  // Extract topic keywords
  const topicKeywords: string[] = []
  const keywords: string[] = []

  // Industry-related keywords
  for (const keyword of CONTEXT_INDUSTRY_KEYWORDS) {
    if (contextText.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Visual style keywords
  for (const keyword of CONTEXT_STYLE_KEYWORDS) {
    if (contextText.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Extract topic from context (product/service mentions)
  const productPatterns = [
    /\b(app|application|platform|software|product|service|tool|solution)\b/gi,
    /\b(launch|launching|promote|promoting|announcing|announcement)\s+(?:a|an|the|my|our)\s+(\w+)/gi,
    /\bfor\s+(?:a|an|the|my|our)\s+(\w+(?:\s+\w+)?)\s+(?:app|product|service|platform|company|brand)/gi,
  ]

  for (const pattern of productPatterns) {
    const matches = contextText.match(pattern)
    if (matches) {
      topicKeywords.push(...matches.slice(0, 2).map((m) => m.trim()))
    }
  }

  // Detect platform preferences
  let platform: string | undefined
  if (contextText.includes('youtube')) platform = 'youtube'
  else if (contextText.includes('tiktok')) platform = 'tiktok'
  else if (contextText.includes('linkedin')) platform = 'linkedin'
  else if (contextText.includes('instagram')) platform = 'instagram'
  else if (contextText.includes('twitter') || contextText.includes('x.com')) platform = 'twitter'
  else if (contextText.includes('facebook')) platform = 'facebook'

  // Build topic string
  const topic = topicKeywords.length > 0 ? topicKeywords.join(' ') : undefined

  // Detect industry from messages
  const detectedIndustry = detectIndustryFromMessage(messages)

  return {
    topic,
    keywords: keywords.length > 0 ? keywords : undefined,
    platform,
    industry: detectedIndustry || undefined,
  }
}
