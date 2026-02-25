'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWebsiteDelivery } from '@/hooks/use-website-delivery'
import { useWebsiteProject } from '@/hooks/use-website-draft'
import {
  Upload,
  Eye,
  Rocket,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebsiteDeliveryTabProps {
  projectId: string
  taskId: string
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

interface PipelineStep {
  id: string
  label: string
  description: string
  status: StepStatus
  actionLabel: string
  icon: React.ReactNode
  url: string | null
  urlLabel: string
}

const STATUS_BADGE_MAP: Record<
  StepStatus,
  { variant: 'secondary' | 'default' | 'destructive' | 'outline'; label: string }
> = {
  pending: { variant: 'outline', label: 'Pending' },
  in_progress: { variant: 'secondary', label: 'In Progress' },
  completed: { variant: 'default', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
}

function deriveStepStatuses(deliveryStatus: string): {
  push: StepStatus
  preview: StepStatus
  deploy: StepStatus
} {
  switch (deliveryStatus) {
    case 'PENDING':
      return { push: 'pending', preview: 'pending', deploy: 'pending' }
    case 'PUSHING':
      return { push: 'in_progress', preview: 'pending', deploy: 'pending' }
    case 'PUSHED':
      return { push: 'completed', preview: 'pending', deploy: 'pending' }
    case 'PREVIEWING':
      return { push: 'completed', preview: 'in_progress', deploy: 'pending' }
    case 'PREVIEW_READY':
      return { push: 'completed', preview: 'completed', deploy: 'pending' }
    case 'DEPLOYING':
      return { push: 'completed', preview: 'completed', deploy: 'in_progress' }
    case 'DEPLOYED':
      return { push: 'completed', preview: 'completed', deploy: 'completed' }
    case 'FAILED':
      return { push: 'failed', preview: 'pending', deploy: 'pending' }
    default:
      return { push: 'pending', preview: 'pending', deploy: 'pending' }
  }
}

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'in_progress':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-red-600" />
    default:
      return null
  }
}

export function WebsiteDeliveryTab({ projectId, taskId }: WebsiteDeliveryTabProps) {
  const { data: project, isLoading: isProjectLoading } = useWebsiteProject(projectId)
  const { pushToFramer, publishPreview, deployToProduction } = useWebsiteDelivery()
  const [activeAction, setActiveAction] = useState<string | null>(null)

  if (isProjectLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading delivery pipeline...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">No website project found for this task.</p>
      </div>
    )
  }

  const stepStatuses = deriveStepStatuses(project.deliveryStatus)

  const handlePush = async () => {
    setActiveAction('push')
    try {
      await pushToFramer.mutateAsync({ projectId })
      toast.success('Skeleton pushed to Framer successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to push to Framer')
    } finally {
      setActiveAction(null)
    }
  }

  const handlePreview = async () => {
    setActiveAction('preview')
    try {
      const result = await publishPreview.mutateAsync({ projectId })
      toast.success('Preview published successfully')
      if (result.previewUrl) {
        window.open(result.previewUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish preview')
    } finally {
      setActiveAction(null)
    }
  }

  const handleDeploy = async () => {
    setActiveAction('deploy')
    try {
      await deployToProduction.mutateAsync({ projectId })
      toast.success('Website deployed to production')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deploy')
    } finally {
      setActiveAction(null)
    }
  }

  const steps: PipelineStep[] = [
    {
      id: 'push',
      label: 'Push to Framer',
      description: 'Push the approved skeleton layout to Framer for visual editing.',
      status: stepStatuses.push,
      actionLabel: stepStatuses.push === 'completed' ? 'Re-push' : 'Push to Framer',
      icon: <Upload className="h-5 w-5" />,
      url: project.framerProjectUrl,
      urlLabel: 'Open in Framer',
    },
    {
      id: 'preview',
      label: 'Preview',
      description: 'Generate a shareable preview link to review the site before deploying.',
      status: stepStatuses.preview,
      actionLabel: stepStatuses.preview === 'completed' ? 'Refresh Preview' : 'Generate Preview',
      icon: <Eye className="h-5 w-5" />,
      url: project.framerPreviewUrl,
      urlLabel: 'View Preview',
    },
    {
      id: 'deploy',
      label: 'Deploy',
      description: 'Deploy the website to production. This makes it live for everyone.',
      status: stepStatuses.deploy,
      actionLabel: stepStatuses.deploy === 'completed' ? 'Redeploy' : 'Deploy to Production',
      icon: <Rocket className="h-5 w-5" />,
      url: project.framerDeployedUrl,
      urlLabel: 'Visit Site',
    },
  ]

  const actionHandlers: Record<string, () => Promise<void>> = {
    push: handlePush,
    preview: handlePreview,
    deploy: handleDeploy,
  }

  const isStepActionable = (stepId: string): boolean => {
    switch (stepId) {
      case 'push':
        return stepStatuses.push !== 'in_progress'
      case 'preview':
        return stepStatuses.push === 'completed' && stepStatuses.preview !== 'in_progress'
      case 'deploy':
        return stepStatuses.preview === 'completed' && stepStatuses.deploy !== 'in_progress'
      default:
        return false
    }
  }

  // Suppress unused variable warning — taskId is kept in props for future use
  void taskId

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-foreground">Website Delivery Pipeline</h3>
        <p className="text-xs text-muted-foreground">
          Push your approved design to Framer, preview it, then deploy to production.
        </p>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const badgeConfig = STATUS_BADGE_MAP[step.status]
          const isActionable = isStepActionable(step.id)
          const isActive = activeAction === step.id

          return (
            <div key={step.id}>
              <Card
                className={cn(
                  'relative overflow-hidden p-4 transition-colors',
                  step.status === 'completed' && 'border-green-200 bg-green-50/50',
                  step.status === 'in_progress' && 'border-blue-200 bg-blue-50/50',
                  step.status === 'failed' && 'border-red-200 bg-red-50/50'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number + Icon */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      step.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : step.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : step.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <StepStatusIcon status={step.status} />
                    {step.status === 'pending' && (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-foreground">{step.label}</h4>
                      <Badge variant={badgeConfig.variant} className="text-xs">
                        {badgeConfig.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>

                    {/* URL Link (when available) */}
                    {step.url && (
                      <a
                        href={step.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {step.urlLabel}
                      </a>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant={step.status === 'completed' ? 'outline' : 'default'}
                      disabled={!isActionable || isActive}
                      onClick={actionHandlers[step.id]}
                    >
                      {isActive ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {step.icon}
                          <span className="ml-1.5">{step.actionLabel}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Deployed URL Highlight */}
      {project.framerDeployedUrl && stepStatuses.deploy === 'completed' && (
        <Card className="border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Website is live!</p>
              <a
                href={project.framerDeployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 hover:underline"
              >
                {project.framerDeployedUrl}
              </a>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href={project.framerDeployedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Visit Site
              </a>
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
