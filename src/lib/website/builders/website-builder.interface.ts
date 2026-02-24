/**
 * Abstract interface for website builders (Framer, Webflow, etc.)
 * Defines the contract for pushing skeletons to external website building platforms.
 */

export interface PushResult {
  success: boolean
  projectUrl: string
  previewUrl?: string
  error?: string
}

export interface DeployResult {
  success: boolean
  deployedUrl: string
  error?: string
}

export interface WebsiteBuilderConnection {
  readonly type: string
  pushSkeleton(skeleton: SkeletonData): Promise<PushResult>
  applyStyles(styles: GlobalStylesData): Promise<void>
  publishPreview(): Promise<{ previewUrl: string }>
  deployToProduction(): Promise<DeployResult>
  disconnect(): Promise<void>
}

export interface SkeletonData {
  sections: Array<{
    id: string
    type: string
    title: string
    description: string
    order: number
    content?: Record<string, unknown>
  }>
  globalStyles?: GlobalStylesData
}

export interface GlobalStylesData {
  primaryColor?: string
  secondaryColor?: string
  fontPrimary?: string
  fontSecondary?: string
  layoutDensity?: 'compact' | 'balanced' | 'spacious'
}
