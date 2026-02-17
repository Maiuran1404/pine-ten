import { describe, it, expect } from 'vitest'
import { inferFromMessage } from './inference-engine'

// =============================================================================
// TASK_TYPE PATTERNS — video / website / logo / presentation
// =============================================================================

describe('inferFromMessage — TASK_TYPE patterns', () => {
  it('"video" infers taskType single_asset at >= 0.7', () => {
    const result = inferFromMessage({
      message: 'Create a product launch video for my SaaS product',
    })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('"cinematic" infers taskType single_asset at >= 0.7', () => {
    const result = inferFromMessage({ message: 'I need a cinematic intro for my brand' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('"website" infers taskType single_asset at >= 0.7', () => {
    const result = inferFromMessage({ message: 'Design a website for my consulting firm' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('"landing page" infers taskType single_asset at >= 0.7', () => {
    const result = inferFromMessage({ message: 'Build a landing page for our new product' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('"logo" infers taskType single_asset at >= 0.8', () => {
    const result = inferFromMessage({ message: 'Design a logo for my yoga studio' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('"brand identity" infers taskType single_asset at >= 0.8', () => {
    const result = inferFromMessage({ message: 'Create a brand identity for our startup' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('"presentation" infers taskType single_asset at >= 0.8', () => {
    const result = inferFromMessage({ message: 'I need a presentation for our board meeting' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('"pitch deck" infers taskType single_asset at >= 0.8', () => {
    const result = inferFromMessage({ message: 'Create a pitch deck for investors' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('"animation" infers taskType single_asset at >= 0.7', () => {
    const result = inferFromMessage({ message: 'Create a motion graphic animation for our app' })
    expect(result.taskType.value).toBe('single_asset')
    expect(result.taskType.confidence).toBeGreaterThanOrEqual(0.7)
  })
})
