'use client'

import { useState, useEffect, type MutableRefObject, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronLeft, ChevronRight, Film, Layout, Calendar, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useGroupRef } from 'react-resizable-panels'
import { type ChatStage, type MoodboardItem } from './types'
import { type LiveBrief } from './brief-panel/types'
import { LabeledProgressBar } from './progress-stepper'
import { MoodboardPanel } from './moodboard/moodboard-panel'
import { UnifiedPanel } from './unified-panel'
import { StructurePanel } from './structure-panel'
import type {
  StructureData,
  StoryboardScene,
  LayoutSection,
  WebsiteGlobalStyles,
  WebsiteInspiration,
  VideoNarrative,
} from '@/lib/ai/briefing-state-machine'
import type { SceneImageData } from '@/hooks/use-storyboard'

interface ChatLayoutProps {
  children: ReactNode
  // Progress stepper props
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
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
  // Structure panel props (new split layout)
  structurePanelVisible?: boolean
  structureType?: StructureData['type'] | null
  structureData?: StructureData | null
  onSceneEdit?: (sceneNumber: number, field: string, value: string) => void
  onSceneReorder?: (scenes: StoryboardScene[]) => void
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
  onSectionReorder?: (sections: LayoutSection[]) => void
  onSectionEdit?: (sectionIndex: number, field: string, value: string) => void
  // Moodboard-to-scene connection (#15)
  onApplyMoodboardToScene?: (item: MoodboardItem, sceneNumber: number) => void
  storyboardSceneCount?: number
  // Scene image data from multi-source search (Film-Grab, Flim.ai, Pexels, Eyecannndy)
  sceneImageData?: Map<number, SceneImageData>
  // Loading state for regeneration
  isRegenerating?: boolean
  // Changed scene numbers for visual diff highlighting (#21: field-level diffs)
  changedScenes?: Map<number, { field: string; oldValue: string; newValue: string }[]>
  // Undo/Redo (#20)
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  // Imperative handle to open the structure view from children
  viewStructureRef?: MutableRefObject<(() => void) | null>
  // Website-specific props
  websiteGlobalStyles?: WebsiteGlobalStyles | null
  websiteInspirations?: WebsiteInspiration[]
  websiteInspirationIds?: string[]
  inspirationGallery?: Array<{
    id: string
    name: string
    url: string
    screenshotUrl: string
    industry: string[]
    styleTags: string[]
  }>
  isGalleryLoading?: boolean
  isCapturingScreenshot?: boolean
  onInspirationSelect?: (item: {
    id: string
    name: string
    url: string
    screenshotUrl: string
  }) => void
  onRemoveInspiration?: (id: string) => void
  onCaptureScreenshot?: (url: string) => Promise<WebsiteInspiration>
  // Visual similarity & notes
  onFindSimilar?: () => void
  similarResults?: Array<{
    inspiration: {
      id: string
      name: string
      url: string
      screenshotUrl: string
      thumbnailUrl: string | null
      industry: string[]
      styleTags: string[]
    }
    score: number
  }>
  isFindingSimilar?: boolean
  canFindSimilar?: boolean
  onUpdateInspirationNotes?: (id: string, notes: string) => void
  // Video narrative props
  videoNarrative?: VideoNarrative | null
  narrativeApproved?: boolean
  onApproveNarrative?: () => void
  onNarrativeFieldEdit?: (field: 'concept' | 'narrative' | 'hook', value: string) => void
  onRegenerateNarrative?: () => void
  // Briefing stage (used by structure panel for fidelity)
  briefingStage?: string | null
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
  onSceneClick,
  onMultiSceneFeedback: _onMultiSceneFeedback,
  onSceneSelectionChange,
  structurePanelVisible = false,
  structureType,
  structureData,
  onSceneEdit,
  onSceneReorder,
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField,
  onSectionReorder,
  onSectionEdit,
  onApplyMoodboardToScene,
  storyboardSceneCount,
  sceneImageData,
  isRegenerating,
  changedScenes,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  viewStructureRef,
  websiteGlobalStyles,
  websiteInspirations,
  websiteInspirationIds,
  inspirationGallery,
  isGalleryLoading,
  isCapturingScreenshot,
  onInspirationSelect,
  onRemoveInspiration,
  onCaptureScreenshot,
  onFindSimilar,
  similarResults,
  isFindingSimilar,
  canFindSimilar,
  onUpdateInspirationNotes,
  videoNarrative,
  narrativeApproved,
  onApproveNarrative,
  onNarrativeFieldEdit,
  onRegenerateNarrative,
  briefingStage,
  showProgress = true,
  showMoodboard = true,
  showBrief = true,
  className,
}: ChatLayoutProps) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [isMobileStructureOpen, setIsMobileStructureOpen] = useState(false)

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

  // Resizable panel snap points (chat panel percentages)
  // Only allow these discrete sizes — prevents panels from being squished too small
  const SNAP_POINTS = [35, 45, 55, 65]
  const groupRef = useGroupRef()

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      const chatSize = Object.values(layout)[0]
      if (chatSize == null) return
      const nearest = SNAP_POINTS.reduce((prev, curr) =>
        Math.abs(curr - chatSize) < Math.abs(prev - chatSize) ? curr : prev
      )
      if (Math.abs(chatSize - nearest) > 0.5) {
        const keys = Object.keys(layout)
        if (keys.length === 2) {
          groupRef.current?.setLayout({ [keys[0]]: nearest, [keys[1]]: 100 - nearest })
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const showRightPanel = showMoodboard || showBrief
  const StructureIcon = structureType ? STRUCTURE_ICONS[structureType] || Film : Film

  return (
    <div className={cn('flex flex-col h-full relative', className)}>
      {/* Top Progress Bar - Subtle, takes minimal space */}
      {showProgress && (
        <LabeledProgressBar
          currentStage={currentStage}
          completedStages={completedStages}
          progressPercentage={progressPercentage}
        />
      )}

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
              <div className="flex-1 min-h-0">{children}</div>
            </div>

            {/* Desktop: Resizable split between chat and structure panel */}
            <ResizablePanelGroup
              orientation="horizontal"
              className="hidden lg:flex h-full"
              groupRef={groupRef}
              onLayoutChanged={handleLayoutChanged}
            >
              <ResizablePanel id="chat" defaultSize={55} minSize={35} maxSize={65}>
                <div className="flex flex-col h-full min-w-0 relative">
                  <div className="flex-1 min-h-0">{children}</div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="structure" defaultSize={45} minSize={35} maxSize={65}>
                <div className="flex flex-col h-full bg-muted/20">
                  <StructurePanel
                    structureType={structureType ?? null}
                    structureData={structureData ?? null}
                    briefingStage={briefingStage ?? undefined}
                    sceneImageData={sceneImageData}
                    isRegenerating={isRegenerating}
                    changedScenes={changedScenes}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onSceneClick={onSceneClick}
                    onSelectionChange={onSceneSelectionChange}
                    onSceneEdit={onSceneEdit}
                    onSceneReorder={onSceneReorder}
                    onRegenerateStoryboard={onRegenerateStoryboard}
                    onRegenerateScene={onRegenerateScene}
                    onRegenerateField={onRegenerateField}
                    onSectionReorder={onSectionReorder}
                    onSectionEdit={onSectionEdit}
                    websiteGlobalStyles={websiteGlobalStyles}
                    websiteInspirations={websiteInspirations}
                    websiteInspirationIds={websiteInspirationIds}
                    inspirationGallery={inspirationGallery}
                    isGalleryLoading={isGalleryLoading}
                    isCapturingScreenshot={isCapturingScreenshot}
                    onInspirationSelect={onInspirationSelect}
                    onRemoveInspiration={onRemoveInspiration}
                    onCaptureScreenshot={onCaptureScreenshot}
                    onFindSimilar={onFindSimilar}
                    similarResults={similarResults}
                    isFindingSimilar={isFindingSimilar}
                    canFindSimilar={canFindSimilar}
                    onUpdateInspirationNotes={onUpdateInspirationNotes}
                    videoNarrative={videoNarrative}
                    narrativeApproved={narrativeApproved}
                    onApproveNarrative={onApproveNarrative}
                    onNarrativeFieldEdit={onNarrativeFieldEdit}
                    onRegenerateNarrative={onRegenerateNarrative}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile/Tablet: Structure panel bottom sheet */}
            <Sheet open={isMobileStructureOpen} onOpenChange={setIsMobileStructureOpen}>
              <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-xl lg:hidden">
                <div className="h-full pt-4">
                  <StructurePanel
                    structureType={structureType ?? null}
                    structureData={structureData ?? null}
                    briefingStage={briefingStage ?? undefined}
                    sceneImageData={sceneImageData}
                    isRegenerating={isRegenerating}
                    changedScenes={changedScenes}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onSceneClick={onSceneClick}
                    onSelectionChange={onSceneSelectionChange}
                    onSceneEdit={onSceneEdit}
                    onSceneReorder={onSceneReorder}
                    onRegenerateStoryboard={onRegenerateStoryboard}
                    onRegenerateScene={onRegenerateScene}
                    onRegenerateField={onRegenerateField}
                    onSectionReorder={onSectionReorder}
                    onSectionEdit={onSectionEdit}
                    websiteGlobalStyles={websiteGlobalStyles}
                    websiteInspirations={websiteInspirations}
                    websiteInspirationIds={websiteInspirationIds}
                    inspirationGallery={inspirationGallery}
                    isGalleryLoading={isGalleryLoading}
                    isCapturingScreenshot={isCapturingScreenshot}
                    onInspirationSelect={onInspirationSelect}
                    onRemoveInspiration={onRemoveInspiration}
                    onCaptureScreenshot={onCaptureScreenshot}
                    videoNarrative={videoNarrative}
                    narrativeApproved={narrativeApproved}
                    onApproveNarrative={onApproveNarrative}
                    onNarrativeFieldEdit={onNarrativeFieldEdit}
                    onRegenerateNarrative={onRegenerateNarrative}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Mobile FAB for structure panel */}
            <div className="lg:hidden fixed bottom-4 right-4 z-50">
              <Button
                size="lg"
                className="rounded-full shadow-lg gap-2"
                onClick={() => setIsMobileStructureOpen(true)}
              >
                <StructureIcon className="h-5 w-5" />
                Structure
              </Button>
            </div>
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
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hidden lg:flex flex-col shrink-0 border-l border-border/50 bg-muted/30 backdrop-blur-sm h-full"
                  >
                    {/* Collapse button */}
                    <div className="shrink-0 flex items-center justify-start px-3 py-2">
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
                    <div className="flex-1 min-h-0 overflow-hidden">
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
                    <div className="h-full pt-4">
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
