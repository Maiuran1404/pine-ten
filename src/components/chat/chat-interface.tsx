'use client'

import { useRef } from 'react'
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
import { CreditPurchaseDialog } from '@/components/shared/credit-purchase-dialog'
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

    // Suggestions
    currentSuggestion,
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

    // Files
    uploadedFiles,
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
    handleStrategicReviewAction,
    handleSceneEdit,
    handleSectionEdit,
    handleSectionReorder,
    handleRegenerateStoryboard,
    handleRegenerateScene,
    handleRegenerateField,

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
    handleEditLastMessage,
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

  return (
    <MotionConfig reducedMotion="user">
      <ChatLayout
        currentStage={progressState.currentStage}
        completedStages={progressState.completedStages}
        progressPercentage={progressState.progressPercentage}
        moodboardItems={moodboardItems}
        onRemoveMoodboardItem={removeMoodboardItem}
        onClearMoodboard={clearMoodboard}
        brief={brief}
        onBriefUpdate={updateBrief}
        onExportBrief={exportBrief}
        briefCompletion={Math.max(briefCompletion, progressState.progressPercentage)}
        onRequestSubmit={handleOpenSubmissionModal}
        isReadyForDesigner={brief ? isBriefReadyForDesigner(brief) : false}
        showProgress={false}
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
        structureType={structureType}
        structureData={storyboardScenes}
        onSceneEdit={handleSceneEdit}
        onRegenerateStoryboard={showSubmissionSuccess ? undefined : handleRegenerateStoryboard}
        onRegenerateScene={showSubmissionSuccess ? undefined : handleRegenerateScene}
        onRegenerateField={showSubmissionSuccess ? undefined : handleRegenerateField}
        onSectionReorder={handleSectionReorder}
        onSectionEdit={handleSectionEdit}
        sceneImageData={sceneImageData}
        isRegenerating={isLoading}
        changedScenes={changedScenes}
        viewStructureRef={viewStructureRef}
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
                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                  <Trash2 className="h-6 w-6 text-red-400" />
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
                  className="bg-red-500 text-white hover:bg-red-600 border-0"
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
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                  <RotateCcw className="h-6 w-6 text-amber-400" />
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
                  className="bg-amber-500 text-white hover:bg-amber-600 border-0"
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
            handleEditLastMessage={handleEditLastMessage}
            onStrategicReviewAction={handleStrategicReviewAction}
            briefingStage={briefingStage}
            onSceneClick={handleSceneClick}
            onMultiSceneFeedback={handleMultiSceneFeedback}
            onViewStoryboard={() => {
              // On mobile/tablet, open the structure bottom sheet
              viewStructureRef.current?.()
            }}
            structurePanelVisible={structurePanelVisible}
            latestStoryboardScenes={
              storyboardScenes?.type === 'storyboard' ? storyboardScenes.scenes : undefined
            }
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
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              isUploading={isUploading}
              uploadedFiles={uploadedFiles}
              pendingTask={pendingTask}
              isTaskMode={isTaskMode}
              seamlessTransition={seamlessTransition}
              ghostText={ghostText}
              smartCompletion={smartCompletion}
              setSmartCompletion={setSmartCompletion}
              currentSuggestion={currentSuggestion}
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
              onQuickOptionClick={handleSendOption}
              hasStrategicReviewCTA={(() => {
                const last = [...messages].reverse().find((m) => m.role === 'assistant')
                return !!(last?.strategicReviewData && !last.strategicReviewData.userOverride)
              })()}
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
              hasStoryboard={
                !!(
                  storyboardScenes &&
                  storyboardScenes.type === 'storyboard' &&
                  storyboardScenes.scenes.length > 0
                )
              }
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
