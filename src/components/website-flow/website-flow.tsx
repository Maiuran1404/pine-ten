'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useWebsiteFlow } from '@/hooks/use-website-flow'
import { useCredits } from '@/providers/credit-provider'
import { WebsiteFlowLayout } from './website-flow-layout'
import { WebsiteProgressBar } from './shared/website-progress-bar'
import { InspirationPhase } from './phases/inspiration-phase'
import { InspirationPreview } from './inspiration/inspiration-preview'
import { SkeletonPhase } from './phases/skeleton-phase'
import { SkeletonRenderer } from './skeleton/skeleton-renderer'
import { ApprovalPhase } from './phases/approval-phase'
import { calculateTimeline } from '@/lib/website/timeline-calculator'

export function WebsiteFlow() {
  const router = useRouter()
  const { credits } = useCredits()
  const flow = useWebsiteFlow()

  const handleCaptureScreenshot = useCallback(
    async (url: string) => {
      try {
        const result = await flow.captureScreenshot.mutateAsync(url)
        flow.addInspiration({
          id: `user-${Date.now()}`,
          url,
          screenshotUrl: result.imageUrl,
          name: new URL(url).hostname,
          isUserSubmitted: true,
        })
        toast.success('Screenshot captured!')
      } catch {
        toast.error('Failed to capture screenshot. Please try another URL.')
      }
    },
    [flow]
  )

  const handleAdvanceToSkeleton = useCallback(async () => {
    try {
      await flow.advanceToSkeleton()
      // Auto-send first skeleton generation message
      if (flow.selectedInspirations.length > 0) {
        const names = flow.selectedInspirations.map((i) => i.name).join(', ')
        await flow.sendSkeletonMessage(
          `Generate a website skeleton based on my inspiration picks: ${names}. ${flow.userNotes || ''}`
        )
      }
    } catch {
      toast.error('Failed to proceed. Please try again.')
    }
  }, [flow])

  const handleAdvanceToApproval = useCallback(async () => {
    try {
      await flow.advanceToApproval()
    } catch {
      toast.error('Failed to proceed. Please try again.')
    }
  }, [flow])

  const handleApprove = useCallback(async () => {
    try {
      const result = await flow.approveProject()
      if (result) {
        toast.success('Project approved! Your website design is now in progress.')
        router.push('/dashboard/tasks')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to approve project. Please try again.'
      )
    }
  }, [flow, router])

  const handleSendSkeletonMessage = useCallback(
    async (message: string) => {
      try {
        await flow.sendSkeletonMessage(message)
      } catch {
        toast.error('Failed to send message. Please try again.')
      }
    },
    [flow]
  )

  // Extract skeleton sections for display
  const skeletonSections =
    (flow.project.data?.skeleton as { sections?: Array<Record<string, unknown>> } | null)
      ?.sections ?? []
  const chatMessages = flow.project.data?.chatHistory ?? []

  // Calculate timeline for approval phase
  const timeline = calculateTimeline(skeletonSections.length || 8)

  // Determine right panel content based on phase
  const renderRightPanel = () => {
    switch (flow.phase) {
      case 'INSPIRATION':
        return (
          <InspirationPreview
            selectedInspirations={flow.selectedInspirations}
            onRemove={flow.removeInspiration}
            onUpdateNotes={flow.updateInspirationNotes}
          />
        )
      case 'SKELETON':
        return (
          <SkeletonRenderer
            sections={
              skeletonSections as Array<{
                id: string
                type: string
                title: string
                description: string
                order: number
                fidelity: 'low' | 'mid' | 'high'
                content?: Record<string, unknown>
              }>
            }
            className="h-full"
          />
        )
      case 'APPROVAL':
        return (
          <SkeletonRenderer
            sections={
              skeletonSections as Array<{
                id: string
                type: string
                title: string
                description: string
                order: number
                fidelity: 'low' | 'mid' | 'high'
                content?: Record<string, unknown>
              }>
            }
            className="h-full"
          />
        )
      default:
        return null
    }
  }

  // Determine left panel content based on phase
  const renderLeftPanel = () => {
    switch (flow.phase) {
      case 'INSPIRATION':
        return (
          <InspirationPhase
            inspirations={flow.inspirations.data?.inspirations ?? []}
            isLoadingInspirations={flow.inspirations.isLoading}
            selectedInspirations={flow.selectedInspirations}
            similarWebsites={
              (flow.similarWebsites.data as
                | Array<{
                    inspiration: {
                      id: string
                      name: string
                      url: string
                      screenshotUrl: string
                      industry: string[]
                      styleTags: string[]
                    }
                    score: number
                  }>
                | undefined) ?? []
            }
            isLoadingSimilar={flow.similarWebsites.isPending}
            userNotes={flow.userNotes}
            industryFilter={flow.industryFilter}
            styleFilter={flow.styleFilter}
            onAddInspiration={flow.addInspiration}
            onSetUserNotes={flow.setUserNotes}
            onSetIndustryFilter={flow.setIndustryFilter}
            onSetStyleFilter={flow.setStyleFilter}
            onFindSimilar={flow.findSimilar}
            onCaptureScreenshot={handleCaptureScreenshot}
            isCapturingScreenshot={flow.captureScreenshot.isPending}
            onAdvance={handleAdvanceToSkeleton}
            isAdvancing={
              flow.createProjectMutation.isPending || flow.updateProjectMutation.isPending
            }
          />
        )
      case 'SKELETON':
        return (
          <SkeletonPhase
            messages={
              chatMessages as Array<{
                id: string
                role: 'user' | 'assistant'
                content: string
                timestamp: string
              }>
            }
            onSendMessage={handleSendSkeletonMessage}
            isLoading={flow.skeletonChat.sendMessage.isPending}
            onAdvance={handleAdvanceToApproval}
            isAdvancing={flow.updateProjectMutation.isPending}
            canAdvance={skeletonSections.length > 0}
          />
        )
      case 'APPROVAL':
        return (
          <ApprovalPhase
            milestones={timeline.milestones}
            estimatedDays={timeline.estimatedDays}
            creditsCost={timeline.creditsCost}
            userCredits={credits}
            onApprove={handleApprove}
            isApproving={flow.approvalMutation.isPending}
            sectionCount={skeletonSections.length}
          />
        )
      default:
        return null
    }
  }

  return (
    <WebsiteFlowLayout
      header={<WebsiteProgressBar currentPhase={flow.phase} className="px-6 py-3" />}
      leftPanel={renderLeftPanel()}
      rightPanel={renderRightPanel()}
    />
  )
}
