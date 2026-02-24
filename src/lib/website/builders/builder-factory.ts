import 'server-only'
import type { WebsiteBuilderConnection } from './website-builder.interface'
import { FramerBuilder } from './framer-builder'

export type BuilderType = 'framer'

/**
 * Factory to create a website builder connection.
 * Currently supports Framer; extensible for Webflow, WordPress, etc.
 */
export function createBuilder(
  type: BuilderType,
  config: { apiKey: string; projectUrl: string }
): WebsiteBuilderConnection {
  switch (type) {
    case 'framer':
      return new FramerBuilder(config.apiKey, config.projectUrl)
    default: {
      // Exhaustive check — TypeScript will flag if a BuilderType variant is unhandled
      const _exhaustive: never = type
      throw new Error(`Unknown builder type: ${_exhaustive}`)
    }
  }
}
