'use client'

import { useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { Image as ImageIcon, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import dynamic from 'next/dynamic'

const CreditPurchaseDialog = dynamic(() =>
  import('@/components/shared/credit-purchase-dialog').then((mod) => ({
    default: mod.CreditPurchaseDialog,
  }))
)
import { type UploadedFile } from './types'
import { isBriefReadyForDesigner } from './brief-panel/types'
import { ChatLayout } from './chat-layout'
import { StyleDetailModal } from './style-detail-modal'
import { SubmissionSuccess } from './submission-success'
import { useChatInterfaceData } from './useChatInterfaceData'
import { ChatMessageList } from './chat-message-list'
import { ChatInputArea } from './chat-input-area'

// Task data types for when viewing an active task
export interface TaskFile {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  isDeliverable: boolean
  createdAt: string
  uploadedBy: string
}

export interface AssignedArtist {
  id: string
  name: string
  email: string
  image?: string | null
}

export interface TaskData {
  id: string
  title: string
  description: string
  status: string
  creditsUsed: number
  maxRevisions: number
  revisionsUsed: number
  estimatedHours?: number | null
  deadline?: string | null
  assignedAt?: string | null
  completedAt?: string | null
  createdAt: string
  freelancer?: AssignedArtist | null
  files?: TaskFile[]
  chatHistory?: Array<{
    role: string
    content: string
    timestamp: string
    attachments?: UploadedFile[]
  }>
}

interface ChatInterfaceProps {
  draftId: string
  onDraftUpdate?: () => void
  initialMessage?: string | null
  seamlessTransition?: boolean
  // Task mode props - when viewing an active task
  taskData?: TaskData | null
  onTaskUpdate?: () => void
  // Callback when a task is created (to update sidebar)
  onTaskCreated?: (taskId: string) => void
  // UI control props
  showRightPanel?: boolean
  onChatStart?: () => void
}

export function ChatInterface({
  draftId,
  onDraftUpdate,
  initialMessage,
  seamlessTransition = false,
  taskData: initialTaskData,
  onTaskUpdate,
  onTaskCreated,
  showRightPanel = true,
  onChatStart,
}: ChatInterfaceProps) {
  const viewStructureRef = useRef<(() => void) | null>(null)

  const {
    // Router/session
    router: _router,
    session: _session,
    userCredits,

    // Messages and chat
    messages,
    setMessages: _setMessages,
    input,
    setInput,
    isLoading,
    isUploading,
    animatingMessageId,
    setAnimatingMessageId,
    completedTypingIds,
    setCompletedTypingIds,
    copiedMessageId: _copiedMessageId,
    messageFeedback: _messageFeedback,

    // Error state
    lastSendError,
    handleRetry,

    // Auto-continue confirmation
    needsAutoContinueConfirmation,
    handleConfirmAutoContinue,
    handleDismissAutoContinue,

    // Suggestions
    ghostText,
    smartCompletion,
    setSmartCompletion,

    // Style selection
    selectedStyles,
    hoveredStyleName,
    setHoveredStyleName,
    selectedDeliverableStyles: _selectedDeliverableStyles,
    selectedStyleForModal,
    setSelectedStyleForModal,
    lastStyleMessageIndex,

    // Task
    pendingTask,
    setPendingTask: _setPendingTask,
    taskData: _taskData,
    isTaskMode,
    assignedArtist: _assignedArtist,
    deliverables: _deliverables,
    taskFiles: _taskFiles,
    taskSubmitted: _taskSubmitted,
    showManualSubmit,
    showCreditDialog,
    setShowCreditDialog,
    showSubmissionModal: _showSubmissionModal,
    setShowSubmissionModal: _setShowSubmissionModal,
    showSubmissionSuccess,
    submittedTaskId,
    submittedAssignedArtist,

    // Moodboard
    moodboardItems,
    moodboardStyleIds,
    moodboardHasStyles: _moodboardHasStyles,
    addMoodboardItem: _addMoodboardItem,
    removeMoodboardItem,
    clearMoodboard,
    hasMoodboardItem,
    addFromStyle: _addFromStyle,
    addFromUpload: _addFromUpload,

    // Brief
    brief,
    briefCompletion,
    isBriefReady: _isBriefReady,
    updateBrief,
    generateOutline: _generateOutline,
    exportBrief,

    // Brand data
    brandData: _brandData,
    isBrandLoading: _isBrandLoading,

    // Progress
    progressState,
    briefingStage,
    deliverableCategory,
    setDeliverableCategory,
    estimatedCredits,
    targetDurationSeconds,

    // Files
    uploadedFiles,
    pendingFiles,
    hasFiles,
    allAttachments: _allAttachments,
    isDragging,

    // Refs
    scrollAreaRef,
    fileInputRef,
    inputRef,
    requestStartTimeRef,

    // User info
    userName: _userName,
    userInitial: _userInitial,

    // Chat title & dialogs
    chatTitle: _chatTitle,
    lastSavedAt,
    showDeleteDialog,
    setShowDeleteDialog,
    showStartOverDialog,
    setShowStartOverDialog,

    // Last user message index (for edit button)
    lastUserMessageIndex,

    // Quick options
    resolvedQuickOptions,

    // Scene references
    sceneReferences,
    setSceneReferences,
    handleSceneClick,
    handleMultiSceneFeedback,
    handleSceneSelectionChange,

    // Storyboard / Structure panel
    storyboardScenes,
    structureType,
    structurePanelVisible,
    changedScenes,
    sceneImageData,
    websiteGlobalStyles,
    websiteFidelity: _websiteFidelity,
    handleStrategicReviewAction,
    handleSceneEdit,
    handleSceneReorder,
    handleSceneImageReplace,
    handleSectionEdit,
    handleSectionReorder,
    handleRegenerateStoryboard,
    handleRegenerateScene,
    handleRegenerateField,
    undo,
    redo,
    canUndo,
    canRedo,
    // Video narrative
    videoNarrative,
    narrativeApproved,
    storyboardReviewed,
    handleApproveNarrative,
    handleApproveStoryboard,
    handleNarrativeFieldEdit,
    handleRegenerateNarrative: _handleRegenerateNarrative,
    handleRetryGeneration,
    handleEditNarrative,
    // DALL-E image generation
    imageGenerationProgress,
    isGeneratingImages,
    handleRegenerateImage,
    // Style change from storyboard toolbar
    handleChangeVisualStyle,
    handleFetchStylesForChange,

    // Website inspiration
    websiteInspirations,
    websiteInspirationIds,
    addWebsiteInspiration,
    removeWebsiteInspiration,
    captureWebsiteScreenshot,
    isCapturingScreenshot,
    inspirationGallery,
    isGalleryLoading,
    industryFilter: _industryFilter,
    setIndustryFilter: _setIndustryFilter,
    styleFilter: _styleFilter,
    setStyleFilter: _setStyleFilter,
    // Visual similarity & notes
    findSimilarWebsites,
    similarWebsiteResults,
    isFindingSimilar,
    canFindSimilar,
    updateInspirationNotes,

    // Handlers
    handleSend,
    handleSendOption,
    handleDiscard: _handleDiscard,
    handleCopyMessage: _handleCopyMessage,
    handleMessageFeedback: _handleMessageFeedback,
    handleStyleSelect,
    handleStyleCardClick: _handleStyleCardClick,
    handleAddToCollection,
    handleRemoveFromCollection,
    handleClearStyleCollection,
    handleSubmitStyles,
    handleSubmitDeliverableStyles,
    handleConfirmStyleSelection,
    handleSelectVideo,
    handleShowMoreStyles,
    handleShowDifferentStyles,
    handleConfirmTask,
    handleOpenSubmissionModal,
    handleInsufficientCredits,
    handleViewProject,
    handleRejectTask,
    handleRequestTaskSummary,
    handleDeleteChat,
    handleStartOver,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    addExternalLink,
    uploadFiles,
    refreshCredits: _refreshCredits,
    scrollToBottom: _scrollToBottom,
  } = useChatInterfaceData({
    draftId,
    onDraftUpdate,
    initialMessage,
    seamlessTransition,
    taskData: initialTaskData,
    onTaskUpdate,
    onTaskCreated,
    onChatStart,
  })

  // Extract latest deliverable styles from messages for the style selection panel
  const latestDeliverableStyles = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].deliverableStyles?.length) return messages[i].deliverableStyles!
    }
    return []
  }, [messages])

  // Current selected styles from brief visual direction (for storyboard toolbar label)
  const currentStyles = useMemo(
    () => brief?.visualDirection?.selectedStyles ?? [],
    [brief?.visualDirection?.selectedStyles]
  )

  // Compute primitives for ChatInputArea to avoid passing full messages array
  const hasInlineStylePicker = useMemo(() => {
    const lastAssistant = messages.findLast((m) => m.role === 'assistant')
    return !!lastAssistant?.videoReferences?.length || !!lastAssistant?.deliverableStyles?.length
  }, [messages])

  const hasStrategicReviewCTA = useMemo(() => {
    const last = messages.findLast((m) => m.role === 'assistant')
    return !!(last?.strategicReviewData && !last.strategicReviewData.userOverride)
  }, [messages])

  // Stabilize storyboard scenes reference for ChatMessageList memo
  const latestStoryboardScenesMemo = useMemo(
    () => (storyboardScenes?.type === 'storyboard' ? storyboardScenes.scenes : undefined),
    [storyboardScenes]
  )

  // Stabilize onViewStoryboard callback for ChatMessageList memo
  const handleViewStoryboard = useCallback(() => {
    viewStructureRef.current?.()
  }, [])

  // Intercept quick option chips that map to specific UI actions
  // instead of sending as a plain chat message
  const handleQuickOptionClick = useCallback(
    (option: string) => {
      const lower = option.toLowerCase()

      // Submission intent → trigger task summary
      const submissionPhrases = ['submit as-is', 'done, submit now']
      if (submissionPhrases.includes(lower)) {
        handleRequestTaskSummary()
        return
      }

      // At REVIEW/DEEPEN stage, "good enough, move on" signals submission intent.
      // For video projects, require storyboard reviewed first.
      if (
        (briefingStage === 'REVIEW' || briefingStage === 'DEEPEN') &&
        (!storyboardScenes || storyboardReviewed) &&
        /\b(good enough|move on|submit|let'?s go|ready to submit|done|ship it)\b/i.test(lower)
      ) {
        handleRequestTaskSummary()
        return
      }

      // Narrative approval intent → trigger handleApproveNarrative (same as
      // clicking "Continue to Storyboard" button in the narrative panel)
      if (
        videoNarrative &&
        !narrativeApproved &&
        /\b(looks good|approve|approved|let'?s build|build the storyboard|that works|move forward|continue)\b/i.test(
          lower
        )
      ) {
        handleApproveNarrative(videoNarrative)
        return
      }

      // Storyboard approval intent → trigger handleApproveStoryboard
      // (allows deriveStage to advance past ELABORATE → REVIEW)
      if (
        storyboardScenes?.type === 'storyboard' &&
        storyboardScenes.scenes.length > 0 &&
        !storyboardReviewed &&
        /\b(looks good|good enough|approve|approved|that works|move forward|move on|continue|let'?s (go|move|continue|review)|ready to review)\b/i.test(
          lower
        )
      ) {
        handleApproveStoryboard()
        return
      }

      handleSendOption(option)
    },
    [
      handleSendOption,
      handleRequestTaskSummary,
      videoNarrative,
      narrativeApproved,
      handleApproveNarrative,
      storyboardScenes,
      storyboardReviewed,
      handleApproveStoryboard,
      briefingStage,
    ]
  )

  // Build structure panel props as a single passthrough object
  const structurePanelProps = useMemo(
    () => ({
      structureType: structureType ?? null,
      structureData: storyboardScenes ?? null,
      briefingStage: briefingStage ?? undefined,
      sceneImageData,
      isChatLoading: isLoading,
      isRegenerating: isLoading,
      changedScenes,
      onUndo: undo,
      onRedo: redo,
      canUndo,
      canRedo,
      onSceneClick: handleSceneClick,
      onSelectionChange: handleSceneSelectionChange,
      onSceneEdit: handleSceneEdit,
      onSceneReorder: handleSceneReorder,
      onRegenerateStoryboard: showSubmissionSuccess ? undefined : handleRegenerateStoryboard,
      onRegenerateScene: showSubmissionSuccess ? undefined : handleRegenerateScene,
      onRegenerateField: showSubmissionSuccess ? undefined : handleRegenerateField,
      targetDurationSeconds,
      onSectionReorder: handleSectionReorder,
      onSectionEdit: handleSectionEdit,
      websiteGlobalStyles,
      websiteInspirations,
      websiteInspirationIds,
      inspirationGallery,
      isGalleryLoading,
      isCapturingScreenshot,
      onInspirationSelect: (item: {
        id: string
        name: string
        url: string
        screenshotUrl: string
      }) =>
        addWebsiteInspiration({
          id: item.id,
          url: item.url,
          screenshotUrl: item.screenshotUrl,
          name: item.name,
        }),
      onRemoveInspiration: removeWebsiteInspiration,
      onCaptureScreenshot: captureWebsiteScreenshot,
      onFindSimilar: findSimilarWebsites,
      similarResults: similarWebsiteResults,
      isFindingSimilar,
      canFindSimilar,
      onUpdateInspirationNotes: updateInspirationNotes,
      videoNarrative,
      narrativeApproved,
      storyboardReviewed,
      onApproveNarrative: handleApproveNarrative,
      onApproveStoryboard: handleApproveStoryboard,
      onNarrativeFieldEdit: handleNarrativeFieldEdit,
      lastSendError,
      onRetryGeneration: handleRetryGeneration,
      onEditNarrative: handleEditNarrative,
      imageGenerationProgress,
      isGeneratingImages,
      onRegenerateImage: handleRegenerateImage,
      styleSelectionStyles: latestDeliverableStyles,
      confirmedStyleIds: moodboardStyleIds,
      onStyleConfirmSelection: handleConfirmStyleSelection,
      onStyleShowMore: handleShowMoreStyles,
      onStyleShowDifferent: handleShowDifferentStyles,
      // Style change from storyboard toolbar
      currentStyles,
      onChangeVisualStyle: handleChangeVisualStyle,
      onOpenStyleSheet: handleFetchStylesForChange,
      isStyleLoading: isLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable handlers from hooks
    [
      structureType,
      storyboardScenes,
      briefingStage,
      sceneImageData,
      isLoading,
      changedScenes,
      canUndo,
      canRedo,
      showSubmissionSuccess,
      targetDurationSeconds,
      websiteGlobalStyles,
      websiteInspirations,
      websiteInspirationIds,
      inspirationGallery,
      isGalleryLoading,
      isCapturingScreenshot,
      similarWebsiteResults,
      isFindingSimilar,
      canFindSimilar,
      videoNarrative,
      narrativeApproved,
      storyboardReviewed,
      lastSendError,
      imageGenerationProgress,
      isGeneratingImages,
      latestDeliverableStyles,
      moodboardStyleIds,
      currentStyles,
    ]
  )

  return (
    <MotionConfig reducedMotion="user">
      <ChatLayout
        currentStage={progressState.currentStage}
        completedStages={progressState.completedStages}
        progressPercentage={progressState.progressPercentage}
        stageDescription={
          'stageDescription' in progressState
            ? (progressState.stageDescription as string)
            : undefined
        }
        moodboardItems={moodboardItems}
        onRemoveMoodboardItem={removeMoodboardItem}
        onClearMoodboard={clearMoodboard}
        brief={brief}
        onBriefUpdate={updateBrief}
        onExportBrief={exportBrief}
        briefCompletion={Math.max(briefCompletion, progressState.progressPercentage)}
        onRequestSubmit={handleOpenSubmissionModal}
        isReadyForDesigner={brief ? isBriefReadyForDesigner(brief) : false}
        showProgress={messages.length > 0}
        showMoodboard={seamlessTransition && !isTaskMode && showRightPanel}
        showBrief={seamlessTransition && !isTaskMode && showRightPanel}
        deliverableCategory={deliverableCategory}
        storyboardScenes={
          storyboardScenes?.type === 'storyboard' ? storyboardScenes.scenes : undefined
        }
        onSceneClick={handleSceneClick}
        onMultiSceneFeedback={handleMultiSceneFeedback}
        onSceneSelectionChange={handleSceneSelectionChange}
        structurePanelVisible={structurePanelVisible}
        structurePanelProps={structurePanelProps}
        onApplyMoodboardToScene={(item, sceneNumber) =>
          handleSceneImageReplace(sceneNumber, item.imageUrl)
        }
        storyboardSceneCount={
          storyboardScenes?.type === 'storyboard' ? storyboardScenes.scenes.length : 0
        }
        viewStructureRef={viewStructureRef}
        isLoading={isLoading}
        className={cn(seamlessTransition ? 'h-full' : 'h-[calc(100vh-12rem)]')}
      >
        <div
          className="flex flex-col h-full relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground">Drop files here</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Images, videos, PDFs, and more
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat header - removed Start Over and delete buttons per user request */}

          {/* Delete confirmation dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="bg-card border-border max-w-md">
              <AlertDialogHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-center text-foreground">
                  Delete this chat?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-muted-foreground">
                  This will permanently delete this conversation and all its messages. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
                <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteChat}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Start Over confirmation dialog */}
          <AlertDialog open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
            <AlertDialogContent className="bg-card border-border max-w-md">
              <AlertDialogHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-ds-warning/10 flex items-center justify-center mb-2">
                  <RotateCcw className="h-6 w-6 text-ds-warning" />
                </div>
                <AlertDialogTitle className="text-center text-foreground">
                  Start fresh?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-muted-foreground">
                  This will clear the current conversation and start a new one. Your moodboard and
                  brief will also be reset.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
                <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleStartOver}
                  className="bg-ds-warning text-white hover:bg-ds-warning/90 border-0"
                >
                  Start Over
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Messages - scrollable area */}
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            seamlessTransition={seamlessTransition}
            animatingMessageId={animatingMessageId}
            setAnimatingMessageId={setAnimatingMessageId}
            completedTypingIds={completedTypingIds}
            setCompletedTypingIds={setCompletedTypingIds}
            selectedStyles={selectedStyles}
            hoveredStyleName={hoveredStyleName}
            setHoveredStyleName={setHoveredStyleName}
            lastStyleMessageIndex={lastStyleMessageIndex}
            moodboardStyleIds={moodboardStyleIds}
            moodboardItems={moodboardItems}
            pendingTask={pendingTask}
            isTaskMode={isTaskMode}
            showManualSubmit={showManualSubmit}
            userCredits={userCredits}
            lastUserMessageIndex={lastUserMessageIndex}
            scrollAreaRef={scrollAreaRef}
            requestStartTimeRef={requestStartTimeRef}
            handleStyleSelect={handleStyleSelect}
            handleSubmitStyles={handleSubmitStyles}
            handleAddToCollection={handleAddToCollection}
            handleRemoveFromCollection={handleRemoveFromCollection}
            handleConfirmStyleSelection={handleConfirmStyleSelection}
            handleShowMoreStyles={handleShowMoreStyles}
            handleShowDifferentStyles={handleShowDifferentStyles}
            handleSubmitDeliverableStyles={handleSubmitDeliverableStyles}
            removeMoodboardItem={removeMoodboardItem}
            handleClearStyleCollection={handleClearStyleCollection}
            handleSelectVideo={handleSelectVideo}
            handleOpenSubmissionModal={handleOpenSubmissionModal}
            handleRejectTask={handleRejectTask}
            handleRequestTaskSummary={handleRequestTaskSummary}
            onStrategicReviewAction={handleStrategicReviewAction}
            briefingStage={briefingStage}
            structureType={structureType}
            onSceneClick={handleSceneClick}
            onMultiSceneFeedback={handleMultiSceneFeedback}
            onViewStoryboard={handleViewStoryboard}
            structurePanelVisible={structurePanelVisible}
            latestStoryboardScenes={latestStoryboardScenesMemo}
            onInlineUpload={uploadFiles}
            isUploading={isUploading}
            uploadedFiles={uploadedFiles}
            onRemoveUploadedFile={removeFile}
            onAddExternalLink={addExternalLink}
            lastSendError={lastSendError}
            onRetry={handleRetry}
          />

          {/* Input area / Submit action bar — hidden after successful submission */}
          {!showSubmissionSuccess && (
            <ChatInputArea
              messageCount={messages.length}
              hasInlineStylePicker={hasInlineStylePicker}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              pendingFiles={pendingFiles}
              hasFiles={hasFiles}
              pendingTask={pendingTask}
              isTaskMode={isTaskMode}
              seamlessTransition={seamlessTransition}
              ghostText={ghostText}
              smartCompletion={smartCompletion}
              setSmartCompletion={setSmartCompletion}
              fileInputRef={fileInputRef}
              inputRef={inputRef}
              userCredits={userCredits}
              briefingStage={briefingStage}
              moodboardItems={moodboardItems}
              onConfirmTask={handleConfirmTask}
              onMakeChanges={handleRejectTask}
              onInsufficientCredits={handleInsufficientCredits}
              isSubmitting={isLoading}
              brief={brief}
              stateMachineQuickOptions={resolvedQuickOptions}
              onQuickOptionClick={handleQuickOptionClick}
              hasStrategicReviewCTA={hasStrategicReviewCTA}
              animatingMessageId={animatingMessageId}
              handleSend={handleSend}
              handleFileUpload={handleFileUpload}
              handleRequestTaskSummary={handleRequestTaskSummary}
              removeFile={removeFile}
              sceneReferences={sceneReferences}
              onRemoveSceneReference={(sceneNumber: number) =>
                setSceneReferences((prev) => prev.filter((s) => s.sceneNumber !== sceneNumber))
              }
              deliverableCategory={deliverableCategory}
              estimatedCredits={estimatedCredits}
              lastSavedAt={lastSavedAt}
              hasStoryboard={
                !!(
                  storyboardScenes &&
                  storyboardScenes.type === 'storyboard' &&
                  storyboardScenes.scenes.length > 0
                )
              }
              needsAutoContinueConfirmation={needsAutoContinueConfirmation}
              onConfirmAutoContinue={handleConfirmAutoContinue}
              onDismissAutoContinue={handleDismissAutoContinue}
              onCategoryDetected={setDeliverableCategory}
            />
          )}

          {/* Submission success celebration overlay */}
          <AnimatePresence>
            {showSubmissionSuccess && submittedTaskId && (
              <SubmissionSuccess
                taskId={submittedTaskId}
                assignedArtist={submittedAssignedArtist}
                onViewProject={handleViewProject}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Style Detail Modal */}
        <StyleDetailModal
          style={selectedStyleForModal}
          isOpen={!!selectedStyleForModal}
          onClose={() => setSelectedStyleForModal(null)}
          isInCollection={
            selectedStyleForModal ? hasMoodboardItem(selectedStyleForModal.id) : false
          }
          onAddToCollection={handleAddToCollection}
          onRemoveFromCollection={handleRemoveFromCollection}
        />

        {/* Task Submission Modal (kept for backward compat, no longer rendered) */}

        {/* Credit Purchase Dialog */}
        <CreditPurchaseDialog
          open={showCreditDialog}
          onOpenChange={setShowCreditDialog}
          requiredCredits={pendingTask?.creditsRequired || 0}
          currentCredits={userCredits}
          pendingTaskState={pendingTask ? { taskProposal: pendingTask, draftId } : undefined}
        />
      </ChatLayout>
    </MotionConfig>
  )
}
