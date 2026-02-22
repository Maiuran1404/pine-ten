'use client'

import { useState, useEffect, type MutableRefObject, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronLeft, ChevronRight, Film, Layout, Calendar, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { type ChatStage, type MoodboardItem } from './types'
import { type LiveBrief } from './brief-panel/types'
import { TopProgressBar } from './progress-stepper'
import { MoodboardPanel } from './moodboard/moodboard-panel'
import { UnifiedPanel } from './unified-panel'
import { StructurePanel } from './structure-panel'
import type { StructureData, StoryboardScene, LayoutSection } from '@/lib/ai/briefing-state-machine'
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
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
  onSectionReorder?: (sections: LayoutSection[]) => void
  onSectionEdit?: (sectionIndex: number, field: string, value: string) => void
  // Scene image data from multi-source search (Film-Grab, Flim.ai, Pexels, Eyecannndy)
  sceneImageData?: Map<number, SceneImageData>
  // Loading state for regeneration
  isRegenerating?: boolean
  // Changed scene numbers for visual diff highlighting
  changedScenes?: Set<number>
  // Imperative handle to open the structure view from children
  viewStructureRef?: MutableRefObject<(() => void) | null>
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
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField,
  onSectionReorder,
  onSectionEdit,
  sceneImageData,
  isRegenerating,
  changedScenes,
  viewStructureRef,
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

  const showRightPanel = showMoodboard || showBrief
  const StructureIcon = structureType ? STRUCTURE_ICONS[structureType] || Film : Film

  return (
    <div className={cn('flex flex-col h-full relative', className)}>
      {/* Top Progress Bar - Subtle, takes minimal space */}
      {showProgress && (
        <TopProgressBar
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
            {/* Left: Chat area (60%) */}
            <div className="flex flex-col min-w-0 w-full lg:w-[60%] lg:min-w-[400px] relative">
              {/* Mobile header */}
              <div className="lg:hidden shrink-0 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-end gap-2">
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
              {/* Main content */}
              <div className="flex-1 min-h-0">{children}</div>
            </div>

            {/* Right: Structure panel (40%) */}
            <div className="hidden lg:flex lg:w-[40%] min-w-[320px] flex-col border-l border-border/50 bg-muted/20">
              <StructurePanel
                structureType={structureType ?? null}
                structureData={structureData ?? null}
                sceneImageData={sceneImageData}
                isRegenerating={isRegenerating}
                changedScenes={changedScenes}
                onSceneClick={onSceneClick}
                onSelectionChange={onSceneSelectionChange}
                onSceneEdit={onSceneEdit}
                onRegenerateStoryboard={onRegenerateStoryboard}
                onRegenerateScene={onRegenerateScene}
                onRegenerateField={onRegenerateField}
                onSectionReorder={onSectionReorder}
                onSectionEdit={onSectionEdit}
              />
            </div>

            {/* Mobile/Tablet: Structure panel bottom sheet */}
            <Sheet open={isMobileStructureOpen} onOpenChange={setIsMobileStructureOpen}>
              <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-xl lg:hidden">
                <div className="h-full pt-4">
                  <StructurePanel
                    structureType={structureType ?? null}
                    structureData={structureData ?? null}
                    sceneImageData={sceneImageData}
                    isRegenerating={isRegenerating}
                    changedScenes={changedScenes}
                    onSceneClick={onSceneClick}
                    onSelectionChange={onSceneSelectionChange}
                    onSceneEdit={onSceneEdit}
                    onRegenerateStoryboard={onRegenerateStoryboard}
                    onRegenerateScene={onRegenerateScene}
                    onRegenerateField={onRegenerateField}
                    onSectionReorder={onSectionReorder}
                    onSectionEdit={onSectionEdit}
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
