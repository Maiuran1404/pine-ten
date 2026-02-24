'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Upload,
  Eye,
  Rocket,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { TimelineView } from '../approval/timeline-view'
import { ApproveButton } from '../approval/approve-button'
import type { DeliveryStatus } from '@/lib/validations/website-delivery-schemas'

interface Milestone {
  id: string
  title: string
  description: string
  daysFromStart: number
  status: 'pending' | 'in_progress' | 'completed'
}

interface DeliveryState {
  status: DeliveryStatus
  framerProjectUrl?: string
  framerPreviewUrl?: string
  framerDeployedUrl?: string
}

interface DeliveryActions {
  onPushToFramer: () => void
  onPublishPreview: () => void
  onDeploy: () => void
  isPushing: boolean
  isPublishingPreview: boolean
  isDeploying: boolean
}

interface ApprovalPhaseProps {
  milestones: Milestone[]
  estimatedDays: number
  creditsCost: number
  userCredits: number
  onApprove: () => void
  onGoBack: () => void
  isApproving?: boolean
  sectionCount: number
  skeletonSections?: Array<{
    id: string
    type: string
    title: string
    description: string
  }>
  isApproved?: boolean
  delivery?: DeliveryState
  deliveryActions?: DeliveryActions
}

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Ready to push',
  PUSHING: 'Pushing to Framer...',
  PUSHED: 'Pushed to Framer',
  PREVIEWING: 'Publishing preview...',
  PREVIEW_READY: 'Preview ready',
  DEPLOYING: 'Deploying...',
  DEPLOYED: 'Deployed',
  FAILED: 'Delivery failed',
}

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  PENDING: 'text-muted-foreground',
  PUSHING: 'text-blue-500',
  PUSHED: 'text-blue-600',
  PREVIEWING: 'text-blue-500',
  PREVIEW_READY: 'text-green-500',
  DEPLOYING: 'text-blue-500',
  DEPLOYED: 'text-green-600',
  FAILED: 'text-red-500',
}

function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const isLoading = ['PUSHING', 'PREVIEWING', 'DEPLOYING'].includes(status)
  const isSuccess = ['DEPLOYED'].includes(status)
  const isFailed = status === 'FAILED'

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${DELIVERY_STATUS_COLORS[status]}`}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {isSuccess && <CheckCircle2 className="w-3.5 h-3.5" />}
      {isFailed && <AlertCircle className="w-3.5 h-3.5" />}
      {DELIVERY_STATUS_LABELS[status]}
    </span>
  )
}

function DeliverySection({
  delivery,
  actions,
}: {
  delivery: DeliveryState
  actions: DeliveryActions
}) {
  const { status } = delivery

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Framer Delivery</h3>
        <DeliveryStatusBadge status={status} />
      </div>

      {/* Push to Framer button */}
      {status === 'PENDING' && (
        <button
          onClick={actions.onPushToFramer}
          disabled={actions.isPushing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {actions.isPushing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Push to Framer
        </button>
      )}

      {/* Failed — allow retry */}
      {status === 'FAILED' && (
        <div className="space-y-2">
          <p className="text-xs text-red-500">
            Something went wrong during delivery. You can try again.
          </p>
          <button
            onClick={actions.onPushToFramer}
            disabled={actions.isPushing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {actions.isPushing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Retry Push
          </button>
        </div>
      )}

      {/* Preview button — available after push */}
      {(status === 'PUSHED' || status === 'PREVIEW_READY') && (
        <div className="space-y-2">
          {delivery.framerPreviewUrl && (
            <a
              href={delivery.framerPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View current preview
            </a>
          )}
          <button
            onClick={actions.onPublishPreview}
            disabled={actions.isPublishingPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {actions.isPublishingPreview ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {status === 'PREVIEW_READY' ? 'Refresh Preview' : 'Publish Preview'}
          </button>
        </div>
      )}

      {/* Deploy button — available when preview is ready */}
      {status === 'PREVIEW_READY' && (
        <button
          onClick={actions.onDeploy}
          disabled={actions.isDeploying}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {actions.isDeploying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Deploy to Production
        </button>
      )}

      {/* Deployed — show live URL */}
      {status === 'DEPLOYED' && delivery.framerDeployedUrl && (
        <div className="space-y-2">
          <p className="text-xs text-green-600 dark:text-green-400">
            Your website is live and accessible at:
          </p>
          <a
            href={delivery.framerDeployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {delivery.framerDeployedUrl}
          </a>
        </div>
      )}

      {/* Framer project link */}
      {delivery.framerProjectUrl && status !== 'PENDING' && (
        <a
          href={delivery.framerProjectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open in Framer
        </a>
      )}
    </div>
  )
}

export function ApprovalPhase({
  milestones,
  estimatedDays,
  creditsCost,
  userCredits,
  onApprove,
  onGoBack,
  isApproving,
  sectionCount,
  skeletonSections = [],
  isApproved = false,
  delivery,
  deliveryActions,
}: ApprovalPhaseProps) {
  const [timelineAccepted, setTimelineAccepted] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onGoBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">
            {isApproved ? 'Project Approved' : 'Review & Approve'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground ml-8">
          {isApproved
            ? `Your website design with ${sectionCount} sections has been approved. Manage delivery below.`
            : `Your website design has ${sectionCount} sections. Review the timeline and approve to start production.`}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{sectionCount}</p>
          <p className="text-xs text-muted-foreground">Sections</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">~{estimatedDays}</p>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{creditsCost}</p>
          <p className="text-xs text-muted-foreground">Credits</p>
        </div>
      </div>

      {/* Delivery section — shown only after approval */}
      {isApproved && delivery && deliveryActions && (
        <DeliverySection delivery={delivery} actions={deliveryActions} />
      )}

      {/* Design Summary */}
      {skeletonSections.length > 0 && (
        <div className="rounded-lg border border-border">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            Design Summary
            {showSummary ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showSummary && (
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              {skeletonSections.map((section, index) => (
                <div key={section.id} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-5 flex-shrink-0 pt-0.5">
                    {index + 1}.
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{section.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{section.type}</p>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <TimelineView milestones={milestones} estimatedDays={estimatedDays} />

      {/* Timeline acceptance checkbox — hidden after approval */}
      {!isApproved && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={timelineAccepted}
            onChange={(e) => setTimelineAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-muted-foreground">
            I&apos;ve reviewed the timeline and understand the delivery schedule
          </span>
        </label>
      )}

      {/* Approve — hidden after approval */}
      {!isApproved && (
        <div className="sticky bottom-0 bg-background pt-4 border-t border-border">
          <ApproveButton
            creditsCost={creditsCost}
            userCredits={userCredits}
            onApprove={onApprove}
            isApproving={isApproving}
            disabled={!timelineAccepted}
          />
        </div>
      )}
    </div>
  )
}
