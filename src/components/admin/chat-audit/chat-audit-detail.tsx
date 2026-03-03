'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, GitBranch, Layers, Palette, ImageIcon, Info } from 'lucide-react'
import { TabConversation } from './tabs/tab-conversation'
import { TabStageFlow } from './tabs/tab-stage-flow'
import { TabStructure } from './tabs/tab-structure'
import { TabStyles } from './tabs/tab-styles'
import { TabMoodboard } from './tabs/tab-moodboard'
import { TabTaskInfo } from './tabs/tab-task-info'
import type { ChatLogDetail } from '@/types/admin-chat-logs'

interface ChatAuditDetailProps {
  detail: ChatLogDetail | undefined
  isLoading: boolean
}

export function ChatAuditDetail({ detail, isLoading }: ChatAuditDetailProps) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[calc(100%-6rem)] w-full" />
      </div>
    )
  }

  if (!detail) {
    return null
  }

  const hasStructure = detail.structureData != null
  const hasStyles = (detail.styleDetails?.length ?? 0) > 0
  const hasMoodboard = detail.moodboardItems.length > 0

  // Derive stage info from detail
  const briefingState = detail.briefingState
  const currentStage =
    (briefingState?.stage as string) ?? (detail.type === 'task' ? 'SUBMIT' : null)

  const STAGE_ORDER = [
    'EXTRACT',
    'TASK_TYPE',
    'INTENT',
    'INSPIRATION',
    'STRUCTURE',
    'ELABORATE',
    'STRATEGIC_REVIEW',
    'MOODBOARD',
    'REVIEW',
    'DEEPEN',
    'SUBMIT',
  ]
  const stageIdx = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1
  const stagesReached =
    stageIdx >= 0 ? STAGE_ORDER.slice(0, stageIdx + 1) : detail.type === 'task' ? STAGE_ORDER : []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{detail.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{detail.userName}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {detail.type === 'draft' ? 'Draft' : detail.taskStatus?.replace(/_/g, ' ') || 'Task'}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {detail.messages.length} messages
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conversation" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 h-8 w-auto inline-flex justify-start flex-shrink-0">
          <TabsTrigger value="conversation" className="text-xs h-7 gap-1 px-2.5">
            <MessageSquare className="h-3 w-3" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="stages" className="text-xs h-7 gap-1 px-2.5">
            <GitBranch className="h-3 w-3" />
            Stages
          </TabsTrigger>
          {hasStructure && (
            <TabsTrigger value="structure" className="text-xs h-7 gap-1 px-2.5">
              <Layers className="h-3 w-3" />
              Structure
            </TabsTrigger>
          )}
          {hasStyles && (
            <TabsTrigger value="styles" className="text-xs h-7 gap-1 px-2.5">
              <Palette className="h-3 w-3" />
              Styles
            </TabsTrigger>
          )}
          {hasMoodboard && (
            <TabsTrigger value="moodboard" className="text-xs h-7 gap-1 px-2.5">
              <ImageIcon className="h-3 w-3" />
              Moodboard
            </TabsTrigger>
          )}
          <TabsTrigger value="info" className="text-xs h-7 gap-1 px-2.5">
            <Info className="h-3 w-3" />
            Info
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <TabsContent
            value="conversation"
            className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <TabConversation messages={detail.messages} />
          </TabsContent>

          <TabsContent
            value="stages"
            className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <TabStageFlow
              briefingState={briefingState}
              currentStage={currentStage}
              stagesReached={stagesReached}
            />
          </TabsContent>

          {hasStructure && (
            <TabsContent
              value="structure"
              className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <TabStructure structureData={detail.structureData} />
            </TabsContent>
          )}

          {hasStyles && (
            <TabsContent
              value="styles"
              className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <TabStyles styleDetails={detail.styleDetails || []} />
            </TabsContent>
          )}

          {hasMoodboard && (
            <TabsContent
              value="moodboard"
              className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <TabMoodboard moodboardItems={detail.moodboardItems} />
            </TabsContent>
          )}

          <TabsContent
            value="info"
            className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <TabTaskInfo
              userName={detail.userName}
              userEmail={detail.userEmail}
              userImage={detail.userImage}
              taskMetadata={detail.taskMetadata}
              pendingTask={detail.pendingTask}
              createdAt={detail.createdAt}
              updatedAt={detail.updatedAt}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
