'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useWebsiteFlow } from '@/hooks/use-website-flow'
import { useWebsiteDelivery } from '@/hooks/use-website-delivery'
import { useCredits } from '@/providers/credit-provider'
import { WebsiteFlowLayout } from './website-flow-layout'
import { WebsiteProgressBar } from './shared/website-progress-bar'
import { InspirationPhase } from './phases/inspiration-phase'
import { InspirationPreview } from './inspiration/inspiration-preview'
import { SkeletonPhase } from './phases/skeleton-phase'
import { SkeletonRenderer } from './skeleton/skeleton-renderer'
import { ApprovalPhase } from './phases/approval-phase'
import { calculateTimeline } from '@/lib/website/timeline-calculator'
import type { WebsiteFlowPhase } from '@/hooks/use-website-flow'
import type { DeliveryStatus } from '@/lib/validations/website-delivery-schemas'

export function WebsiteFlow() {
  const router = useRouter()
  const { credits } = useCredits()
  const flow = useWebsiteFlow()
  const delivery = useWebsiteDelivery()

  // Warn before leaving with unsaved progress
  useEffect(() => {
    const hasProgress =
      flow.selectedInspirations.length > 0 || flow.phase !== 'INSPIRATION' || !!flow.projectId

    if (!hasProgress) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [flow.selectedInspirations.length, flow.phase, flow.projectId])

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

  const handleGoBack = useCallback(async () => {
    try {
      await flow.goBack()
    } catch {
      toast.error('Failed to go back. Please try again.')
    }
  }, [flow])

  const handlePhaseClick = useCallback(
    async (targetPhase: WebsiteFlowPhase) => {
      const phases: WebsiteFlowPhase[] = ['INSPIRATION', 'SKELETON', 'APPROVAL']
      const currentIndex = phases.indexOf(flow.phase)
      const targetIndex = phases.indexOf(targetPhase)

      // Only allow clicking completed (earlier) phases
      if (targetIndex < currentIndex) {
        try {
          await flow.goBack()
        } catch {
          toast.error('Failed to navigate. Please try again.')
        }
      }
    },
    [flow]
  )

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

  const handleGenerateTemplate = useCallback(
    async (industry: string) => {
      try {
        await flow.generateSkeletonFromTemplate(industry)
        toast.success('Template generated! You can now customize it.')
      } catch {
        toast.error('Failed to generate template. Please try again.')
      }
    },
    [flow]
  )

  // Delivery handlers
  const handlePushToFramer = useCallback(async () => {
    if (!flow.projectId) return
    try {
      const result = await delivery.pushToFramer.mutateAsync({ projectId: flow.projectId })
      if (result.success) {
        toast.success('Skeleton pushed to Framer successfully!')
      } else {
        toast.error(result.error || 'Failed to push to Framer.')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to push to Framer. Please try again.'
      )
    }
  }, [flow.projectId, delivery.pushToFramer])

  const handlePublishPreview = useCallback(async () => {
    if (!flow.projectId) return
    try {
      const result = await delivery.publishPreview.mutateAsync({ projectId: flow.projectId })
      toast.success('Preview published!')
      if (result.previewUrl) {
        window.open(result.previewUrl, '_blank')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to publish preview. Please try again.'
      )
    }
  }, [flow.projectId, delivery.publishPreview])

  const handleDeploy = useCallback(async () => {
    if (!flow.projectId) return
    try {
      const result = await delivery.deployToProduction.mutateAsync({ projectId: flow.projectId })
      if (result.success) {
        toast.success('Website deployed to production!')
      } else {
        toast.error(result.error || 'Deployment failed.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deploy. Please try again.')
    }
  }, [flow.projectId, delivery.deployToProduction])

  // Extract skeleton sections for display
  const skeletonSections =
    (flow.project.data?.skeleton as { sections?: Array<Record<string, unknown>> } | null)
      ?.sections ?? []
  const chatMessages = flow.project.data?.chatHistory ?? []

  // Calculate timeline for approval phase
  const timeline = calculateTimeline(skeletonSections.length || 8)

  // Determine if project is approved and extract delivery state
  const isApproved = flow.project.data?.status === 'APPROVED'
  const projectData = flow.project.data as Record<string, unknown> | undefined
  const deliveryState = isApproved
    ? {
        status: ((projectData?.deliveryStatus as string) || 'PENDING') as DeliveryStatus,
        framerProjectUrl: projectData?.framerProjectUrl as string | undefined,
        framerPreviewUrl: projectData?.framerPreviewUrl as string | undefined,
        framerDeployedUrl: projectData?.framerDeployedUrl as string | undefined,
      }
    : undefined

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
            onGoBack={handleGoBack}
            isAdvancing={flow.updateProjectMutation.isPending}
            canAdvance={skeletonSections.length > 0}
            onGenerateTemplate={handleGenerateTemplate}
            isGeneratingTemplate={flow.skeletonChat.generateFromTemplate.isPending}
            hasExistingSkeleton={skeletonSections.length > 0}
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
            onGoBack={handleGoBack}
            isApproving={flow.approvalMutation.isPending}
            sectionCount={skeletonSections.length}
            skeletonSections={
              skeletonSections as Array<{
                id: string
                type: string
                title: string
                description: string
              }>
            }
            isApproved={isApproved}
            delivery={deliveryState}
            deliveryActions={{
              onPushToFramer: handlePushToFramer,
              onPublishPreview: handlePublishPreview,
              onDeploy: handleDeploy,
              isPushing: delivery.pushToFramer.isPending,
              isPublishingPreview: delivery.publishPreview.isPending,
              isDeploying: delivery.deployToProduction.isPending,
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <WebsiteFlowLayout
      header={
        <WebsiteProgressBar
          currentPhase={flow.phase}
          onPhaseClick={handlePhaseClick}
          className="px-6 py-3"
        />
      }
      leftPanel={renderLeftPanel()}
      rightPanel={renderRightPanel()}
    />
  )
}
