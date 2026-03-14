'use client'

import { useState, useEffect, useRef, type MutableRefObject, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronLeft, ChevronRight, Film, Layout, Calendar, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { type ChatStage, type MoodboardItem } from './types'
import { type LiveBrief } from './brief-panel/types'
import { LabeledProgressBar } from './progress-stepper'
import { MoodboardPanel } from './moodboard/moodboard-panel'
import { UnifiedPanel } from './unified-panel'
import { StructurePanel, type StructurePanelProps } from './structure-panel'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'
import { WEBSITE_STAGE_DESCRIPTIONS } from '@/lib/chat-progress'

interface ChatLayoutProps {
  children: ReactNode
  // Progress stepper props
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  stageDescription?: string
  // Moodboard props
  moodboardItems: MoodboardItem[]
  onRemoveMoodboardItem: (id: string) => void
  onClearMoodboard?: () => void
  // Brief props
  brief?: LiveBrief | null
  onBriefUpdate?: (brief: LiveBrief) => void
  onExportBrief?: () => void
  briefCompletion?: number
  // Submission props
  onRequestSubmit?: () => void
  isReadyForDesigner?: boolean
  // Deliverable category (used to hide irrelevant sections)
  deliverableCategory?: string | null
  // Storyboard props (legacy — used when structure panel is NOT active)
  storyboardScenes?: StoryboardScene[]
  onSceneClick?: (scene: StoryboardScene) => void
  onMultiSceneFeedback?: (scenes: StoryboardScene[]) => void
  onSceneSelectionChange?: (scenes: StoryboardScene[]) => void
  // Structure panel — single passthrough replaces 50+ individual props
  structurePanelVisible?: boolean
  structurePanelProps?: StructurePanelProps
  // Moodboard-to-scene connection (#15)
  onApplyMoodboardToScene?: (item: MoodboardItem, sceneNumber: number) => void
  storyboardSceneCount?: number
  // Imperative handle to open the structure view from children
  viewStructureRef?: MutableRefObject<(() => void) | null>
  // When true, block all interaction on the right panel (AI is streaming)
  isLoading?: boolean
  // Optional customization
  showProgress?: boolean
  showMoodboard?: boolean
  showBrief?: boolean
  className?: string
}

// Icon for the mobile FAB based on structure type
const STRUCTURE_ICONS: Record<string, typeof Film> = {
  storyboard: Film,
  layout: Layout,
  calendar: Calendar,
  single_design: Palette,
}

export function ChatLayout({
  children,
  currentStage,
  completedStages,
  progressPercentage,
  stageDescription,
  moodboardItems,
  onRemoveMoodboardItem,
  onClearMoodboard,
  brief,
  onBriefUpdate,
  onExportBrief,
  briefCompletion = 0,
  onRequestSubmit,
  isReadyForDesigner,
  deliverableCategory,
  storyboardScenes: _storyboardScenes,
  onSceneClick: _onSceneClick,
  onMultiSceneFeedback: _onMultiSceneFeedback,
  onSceneSelectionChange: _onSceneSelectionChange,
  structurePanelVisible = false,
  structurePanelProps,
  onApplyMoodboardToScene,
  storyboardSceneCount,
  viewStructureRef,
  isLoading = false,
  showProgress = true,
  showMoodboard = true,
  showBrief = true,
  className,
}: ChatLayoutProps) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [isMobileStructureOpen, setIsMobileStructureOpen] = useState(false)
  const [canvasActive, setCanvasActive] = useState(false)
  const canvasActiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Active panel signal — highlights the right panel when new content appears.
  // Uses setTimeout(0) to schedule the activation asynchronously and avoid
  // synchronous setState inside the effect body (react-hooks/set-state-in-effect).
  const canvasShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (structurePanelProps?.videoNarrative || structurePanelProps?.structureData) {
      if (canvasShowTimerRef.current) clearTimeout(canvasShowTimerRef.current)
      if (canvasActiveTimerRef.current) clearTimeout(canvasActiveTimerRef.current)
      canvasShowTimerRef.current = setTimeout(() => setCanvasActive(true), 0)
      canvasActiveTimerRef.current = setTimeout(() => setCanvasActive(false), 3000)
    }
    return () => {
      if (canvasShowTimerRef.current) clearTimeout(canvasShowTimerRef.current)
      if (canvasActiveTimerRef.current) clearTimeout(canvasActiveTimerRef.current)
    }
  }, [structurePanelProps?.videoNarrative, structurePanelProps?.structureData])

  // Expose imperative handle so children can open the structure view
  useEffect(() => {
    if (viewStructureRef) {
      viewStructureRef.current = () => {
        setIsMobileStructureOpen(true)
      }
    }
    return () => {
      if (viewStructureRef) viewStructureRef.current = null
    }
  }, [viewStructureRef])

  const showRightPanel = showMoodboard || showBrief
  const StructureIcon = structurePanelProps?.structureType
    ? STRUCTURE_ICONS[structurePanelProps.structureType] || Film
    : Film

  // Website-specific progress labels
  const websiteStageLabels =
    deliverableCategory === 'website'
      ? {
          brief: WEBSITE_STAGE_DESCRIPTIONS.brief,
          style: WEBSITE_STAGE_DESCRIPTIONS.style,
          storyboard: WEBSITE_STAGE_DESCRIPTIONS.storyboard,
          review: WEBSITE_STAGE_DESCRIPTIONS.review,
        }
      : undefined

  return (
    <div className={cn('flex flex-col h-full relative', className)}>
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* ================================================================
            SPLIT LAYOUT — structure panel active
            Chat takes ~40% left, structure panel takes flex-1 right
            ================================================================ */}
        {structurePanelVisible ? (
          <>
            {/* Mobile: full-width chat + header to open structure sheet */}
            <div className="flex flex-col min-w-0 w-full lg:hidden relative">
              <div className="shrink-0 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsMobileStructureOpen(true)}
                >
                  <StructureIcon className="h-4 w-4" />
                  <span className="text-xs">Structure</span>
                </Button>
              </div>
              <div className="flex-1 min-h-0 pb-14 lg:pb-0">{children}</div>
            </div>

            {/* Desktop: Resizable split between chat and structure panel.
                Wrapper div is required because ResizablePanelGroup injects
                inline display:flex which overrides Tailwind's `hidden` class. */}
            <div className="hidden lg:flex h-full w-full">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel id="chat" defaultSize={55} minSize={35} maxSize={65}>
                  <div
                    className={cn(
                      'flex flex-col h-full min-w-0 relative transition-opacity duration-500',
                      canvasActive && 'opacity-[0.92]'
                    )}
                  >
                    <div className="flex-1 min-h-0">{children}</div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel id="structure" defaultSize={45} minSize={35} maxSize={65}>
                  <div
                    className={cn(
                      'flex flex-col h-full bg-muted/20 transition-all duration-500 relative',
                      canvasActive && 'ring-1 ring-crafted-sage/30'
                    )}
                  >
                    {showProgress && (
                      <LabeledProgressBar
                        currentStage={currentStage}
                        completedStages={completedStages}
                        progressPercentage={progressPercentage}
                        stageDescription={stageDescription}
                        stageLabels={websiteStageLabels}
                      />
                    )}
                    {structurePanelProps && <StructurePanel {...structurePanelProps} />}
                    {isLoading && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            {/* Mobile/Tablet: Structure panel bottom sheet */}
            <Sheet open={isMobileStructureOpen} onOpenChange={setIsMobileStructureOpen}>
              <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-xl lg:hidden">
                <div className="h-full pt-4 relative">
                  {structurePanelProps && <StructurePanel {...structurePanelProps} />}
                  {isLoading && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <>
            {/* ================================================================
                STANDARD LAYOUT — no structure panel (original behavior)
                Chat flex-1 + optional right sidebar
                ================================================================ */}
            <div className="flex-1 flex flex-col min-w-0 relative">
              {/* Mobile Header with Panel Toggle */}
              <div className="lg:hidden shrink-0 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-end gap-2">
                {showRightPanel && (
                  <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs">{briefCompletion}%</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 p-0">
                      <div className="h-full pt-8">
                        {showProgress && (
                          <LabeledProgressBar
                            currentStage={currentStage}
                            completedStages={completedStages}
                            progressPercentage={progressPercentage}
                            stageDescription={stageDescription}
                          />
                        )}
                        <UnifiedPanel
                          currentStage={currentStage}
                          completedStages={completedStages}
                          progressPercentage={progressPercentage}
                          brief={brief || null}
                          onBriefUpdate={onBriefUpdate || (() => {})}
                          onExportBrief={onExportBrief}
                          briefCompletion={briefCompletion}
                          moodboardItems={moodboardItems}
                          onRemoveMoodboardItem={onRemoveMoodboardItem}
                          onClearMoodboard={onClearMoodboard}
                          onRequestSubmit={onRequestSubmit}
                          isReadyForDesigner={isReadyForDesigner}
                          deliverableCategory={deliverableCategory}
                          onApplyMoodboardToScene={onApplyMoodboardToScene}
                          storyboardSceneCount={storyboardSceneCount}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>

              {/* Main content */}
              <div className="flex-1 min-h-0">{children}</div>
            </div>

            {/* Right Panel - Unified (Desktop) */}
            {showRightPanel && (
              <AnimatePresence mode="wait">
                {isRightPanelCollapsed ? (
                  <div key="collapsed" className="hidden lg:block relative">
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 z-10 bg-card shadow-sm"
                      onClick={() => setIsRightPanelCollapsed(false)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <motion.div
                    key="expanded"
                    initial={false}
                    animate={{ width: 320, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="hidden lg:flex flex-col shrink-0 border-l border-border/50 bg-muted/30 backdrop-blur-sm h-full overflow-hidden"
                    style={{ width: 320 }}
                  >
                    {/* Progress bar aligned to right panel */}
                    {showProgress && (
                      <LabeledProgressBar
                        currentStage={currentStage}
                        completedStages={completedStages}
                        progressPercentage={progressPercentage}
                        stageDescription={stageDescription}
                        stageLabels={websiteStageLabels}
                      />
                    )}

                    {/* Context header + collapse button */}
                    <div className="shrink-0 flex items-center justify-between px-3 py-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                        Context
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                        onClick={() => setIsRightPanelCollapsed(true)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Unified Panel */}
                    <div className="flex-1 min-h-0 overflow-hidden relative">
                      <UnifiedPanel
                        currentStage={currentStage}
                        completedStages={completedStages}
                        progressPercentage={progressPercentage}
                        brief={brief || null}
                        onBriefUpdate={onBriefUpdate || (() => {})}
                        onExportBrief={onExportBrief}
                        briefCompletion={briefCompletion}
                        moodboardItems={moodboardItems}
                        onRemoveMoodboardItem={onRemoveMoodboardItem}
                        onClearMoodboard={onClearMoodboard}
                        onRequestSubmit={onRequestSubmit}
                        isReadyForDesigner={isReadyForDesigner}
                        deliverableCategory={deliverableCategory}
                      />
                      {/* Block interactions while AI is streaming */}
                      {isLoading && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Tablet Panel - Bottom Drawer Toggle */}
            {showRightPanel && (
              <div className="hidden md:flex lg:hidden fixed bottom-4 right-4 z-50 gap-2">
                <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                  <SheetTrigger asChild>
                    <Button size="lg" className="rounded-full shadow-lg gap-2">
                      <FileText className="h-5 w-5" />
                      Brief
                      {briefCompletion > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                          {briefCompletion}%
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-xl">
                    <div className="h-full pt-4 relative">
                      <UnifiedPanel
                        currentStage={currentStage}
                        completedStages={completedStages}
                        progressPercentage={progressPercentage}
                        brief={brief || null}
                        onBriefUpdate={onBriefUpdate || (() => {})}
                        onExportBrief={onExportBrief}
                        briefCompletion={briefCompletion}
                        moodboardItems={moodboardItems}
                        onRemoveMoodboardItem={onRemoveMoodboardItem}
                        onClearMoodboard={onClearMoodboard}
                        onRequestSubmit={onRequestSubmit}
                        isReadyForDesigner={isReadyForDesigner}
                        onApplyMoodboardToScene={onApplyMoodboardToScene}
                        storyboardSceneCount={storyboardSceneCount}
                      />
                      {isLoading && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Simple two-column layout variant (no progress stepper)
 */
interface SimpleChatLayoutProps {
  children: ReactNode
  moodboardItems: MoodboardItem[]
  onRemoveMoodboardItem: (id: string) => void
  onClearMoodboard?: () => void
  showMoodboard?: boolean
  className?: string
}

export function SimpleChatLayout({
  children,
  moodboardItems,
  onRemoveMoodboardItem,
  onClearMoodboard,
  showMoodboard = true,
  className,
}: SimpleChatLayoutProps) {
  const [isMoodboardOpen, setIsMoodboardOpen] = useState(false)

  return (
    <div className={cn('flex h-full relative', className)}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">{children}</div>

      {/* Moodboard Panel (Desktop) */}
      {showMoodboard && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l border-border"
        >
          <MoodboardPanel
            items={moodboardItems}
            onRemoveItem={onRemoveMoodboardItem}
            onClearAll={onClearMoodboard}
            className="w-full"
          />
        </motion.div>
      )}

      {/* Mobile/Tablet Moodboard Toggle */}
      {showMoodboard && (
        <div className="lg:hidden fixed bottom-20 right-4 z-50">
          <Sheet open={isMoodboardOpen} onOpenChange={setIsMoodboardOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="rounded-full shadow-lg h-12 w-12">
                <Palette className="h-5 w-5" />
                {moodboardItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-medium">
                    {moodboardItems.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <MoodboardPanel
                items={moodboardItems}
                onRemoveItem={onRemoveMoodboardItem}
                onClearAll={onClearMoodboard}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}
