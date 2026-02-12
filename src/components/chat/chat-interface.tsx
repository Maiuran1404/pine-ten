"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { TypingText } from "./typing-text";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import {
  Check,
  Image as ImageIcon,
  Paperclip,
  FileIcon,
  XCircle,
  Trash2,
  Sparkles,
  RotateCcw,
  Palette,
  Timer,
  ArrowRight,
  Lightbulb,
  Pencil,
  Share2,
  Megaphone,
  Bookmark,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type UploadedFile,
} from "./types";
import { TaskProposalCard } from "./task-proposal-card";
import { FileAttachmentList } from "./file-attachment";
import { VideoReferenceGrid, type VideoReferenceStyle } from "./video-reference-grid";
import { ChatLayout } from "./chat-layout";
import { StyleSelectionGrid } from "./style-selection-grid";
import { StyleDetailModal } from "./style-detail-modal";
import { InlineCollection } from "./inline-collection";
import { TaskSubmissionModal } from "./task-submission-modal";
import { useChatInterfaceData } from "./useChatInterfaceData";

// Task data types for when viewing an active task
export interface TaskFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDeliverable: boolean;
  createdAt: string;
  uploadedBy: string;
}

export interface AssignedArtist {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: string;
  creditsUsed: number;
  maxRevisions: number;
  revisionsUsed: number;
  estimatedHours?: number | null;
  deadline?: string | null;
  assignedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  freelancer?: AssignedArtist | null;
  files?: TaskFile[];
  chatHistory?: Array<{
    role: string;
    content: string;
    timestamp: string;
    attachments?: UploadedFile[];
  }>;
}

interface ChatInterfaceProps {
  draftId: string;
  onDraftUpdate?: () => void;
  initialMessage?: string | null;
  seamlessTransition?: boolean;
  // Task mode props - when viewing an active task
  taskData?: TaskData | null;
  onTaskUpdate?: () => void;
  // Callback when a task is created (to update sidebar)
  onTaskCreated?: (taskId: string) => void;
  // UI control props
  showRightPanel?: boolean;
  onChatStart?: () => void;
}

// Progressive loading indicator component - minimal design
function LoadingIndicator({
  requestStartTime,
}: {
  requestStartTime: number | null;
}) {
  const [loadingStage, setLoadingStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const loadingMessages = [
    "Reading between the lines...",
    "Mapping out your moodboard...",
    "Curating the perfect visuals...",
    "Polishing the final touches...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (requestStartTime) {
        const elapsed = Math.floor((Date.now() - requestStartTime) / 1000);
        setElapsedTime(elapsed);

        // Progress through stages based on time
        if (elapsed >= 8) setLoadingStage(3);
        else if (elapsed >= 5) setLoadingStage(2);
        else if (elapsed >= 2) setLoadingStage(1);
        else setLoadingStage(0);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [requestStartTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      {/* Minimal avatar - just a green circle */}
      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30"
        />
        <div className="w-2.5 h-2.5 rounded-full bg-white" />
      </div>
      <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          {/* Progressive message with shimmer effect */}
          <motion.div
            key={loadingStage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm relative overflow-hidden"
          >
            <span className="text-muted-foreground">
              {loadingMessages[loadingStage]}
            </span>
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent -skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.5,
              }}
            />
          </motion.div>
          {/* Timer */}
          {elapsedTime > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              {elapsedTime}s
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
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
  const {
    // Router/session
    router,
    session,
    userCredits,

    // Messages and chat
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    isUploading,
    animatingMessageId,
    setAnimatingMessageId,
    completedTypingIds,
    setCompletedTypingIds,
    copiedMessageId,
    messageFeedback,

    // Suggestions
    suggestionIndex,
    setSuggestionIndex,
    currentSuggestion,
    ghostText,
    quickOptionSuggestion,
    smartCompletion,
    setSmartCompletion,

    // Style selection
    selectedStyles,
    hoveredStyleName,
    setHoveredStyleName,
    selectedDeliverableStyles,
    selectedStyleForModal,
    setSelectedStyleForModal,
    lastStyleMessageIndex,

    // Task
    pendingTask,
    setPendingTask,
    taskData,
    isTaskMode,
    assignedArtist,
    deliverables,
    taskFiles,
    taskSubmitted,
    showManualSubmit,
    showCreditDialog,
    setShowCreditDialog,
    showSubmissionModal,
    setShowSubmissionModal,

    // Moodboard
    moodboardItems,
    moodboardStyleIds,
    moodboardHasStyles,
    addMoodboardItem,
    removeMoodboardItem,
    clearMoodboard,
    hasMoodboardItem,
    addFromStyle,
    addFromUpload,

    // Brief
    brief,
    briefCompletion,
    isBriefReady,
    updateBrief,
    generateOutline,
    exportBrief,

    // Brand data
    brandData,
    isBrandLoading,

    // Progress
    progressState,

    // Files
    uploadedFiles,
    allAttachments,
    isDragging,

    // Refs
    scrollAreaRef,
    fileInputRef,
    inputRef,
    requestStartTimeRef,

    // User info
    userName,
    userInitial,

    // Chat title & dialogs
    chatTitle,
    showDeleteDialog,
    setShowDeleteDialog,
    showStartOverDialog,
    setShowStartOverDialog,

    // Last user message index (for edit button)
    lastUserMessageIndex,

    // Handlers
    handleSend,
    handleSendOption,
    handleDiscard,
    handleCopyMessage,
    handleMessageFeedback,
    handleStyleSelect,
    handleStyleCardClick,
    handleAddToCollection,
    handleRemoveFromCollection,
    handleClearStyleCollection,
    handleSubmitStyles,
    handleSubmitDeliverableStyles,
    handleConfirmStyleSelection,
    handleSelectVideo,
    handleQuickOptionClick,
    handleShowMoreStyles,
    handleShowDifferentStyles,
    handleConfirmTask,
    handleOpenSubmissionModal,
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
    uploadFiles,
    refreshCredits,
    scrollToBottom,
  } = useChatInterfaceData({
    draftId,
    onDraftUpdate,
    initialMessage,
    seamlessTransition,
    taskData: initialTaskData,
    onTaskUpdate,
    onTaskCreated,
    onChatStart,
  });

  return (
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
      briefCompletion={Math.max(
        briefCompletion,
        progressState.progressPercentage
      )}
      showProgress={false}
      showMoodboard={seamlessTransition && !isTaskMode && showRightPanel}
      showBrief={seamlessTransition && !isTaskMode && showRightPanel}
      className={cn(seamlessTransition ? "h-full" : "h-[calc(100vh-12rem)]")}
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
                <p className="text-lg font-medium text-foreground">
                  Drop files here
                </p>
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
                This will permanently delete this conversation and all its
                messages. This action cannot be undone.
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
        <AlertDialog
          open={showStartOverDialog}
          onOpenChange={setShowStartOverDialog}
        >
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <RotateCcw className="h-6 w-6 text-amber-400" />
              </div>
              <AlertDialogTitle className="text-center text-foreground">
                Start fresh?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                This will clear the current conversation and start a new one.
                Your moodboard and brief will also be reset.
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
        <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={
                    seamlessTransition && index > 0
                      ? { opacity: 0, y: 10 }
                      : false
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    /* Assistant message - left aligned with sparkle avatar */
                    <div className="group max-w-[85%] flex items-start gap-3">
                      {/* Sparkle avatar */}
                      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Thinking time indicator */}
                        {message.thinkingTime && (
                          <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                            <Lightbulb className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              Thought for {message.thinkingTime}s
                            </span>
                          </div>
                        )}
                        {/* Message content - clean text without heavy borders */}
                        <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
                          {/* NOTE: Removed onOptionClick and multiSelect - markdown lists should render
                              as plain text, not clickable options. Quick options are handled separately
                              via the quickOptions system from the API response. */}
                          <TypingText
                            content={message.content}
                            animate={animatingMessageId === message.id}
                            speed={25}
                            onComplete={() => {
                              if (animatingMessageId === message.id) {
                                setAnimatingMessageId(null);
                                // Mark this message's typing as complete to show CTAs
                                setCompletedTypingIds((prev) =>
                                  new Set(prev).add(message.id)
                                );
                              }
                            }}
                            className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>p:last-child]:mb-0 text-foreground"
                          />

                          {/* Attachments */}
                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <div className="mt-3 ml-8">
                                <FileAttachmentList
                                  files={message.attachments}
                                />
                              </div>
                            )}

                          {/* Style References - only show after typing completes */}
                          {message.styleReferences &&
                            message.styleReferences.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-5 ml-8"
                              >
                                <p className="text-sm font-medium mb-4 text-foreground">
                                  Which style direction resonates with you?
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
                                  {message.styleReferences
                                    .slice(0, 3)
                                    .map((style, idx) => {
                                      const isHovered =
                                        hoveredStyleName === style.name;
                                      const isSelected =
                                        selectedStyles.includes(style.name);
                                      return (
                                        <div
                                          key={`${style.name}-${idx}`}
                                          role="button"
                                          tabIndex={0}
                                          aria-pressed={isSelected}
                                          aria-label={`Select ${style.name} style`}
                                          className={cn(
                                            "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                            isHovered &&
                                              "scale-110 z-10 shadow-2xl",
                                            isSelected
                                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                                              : isHovered &&
                                                  "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                                          )}
                                          onClick={() =>
                                            handleStyleSelect(style.name)
                                          }
                                          onMouseEnter={() =>
                                            setHoveredStyleName(style.name)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredStyleName(null)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              handleStyleSelect(style.name);
                                            }
                                          }}
                                        >
                                          {/* Selection indicator */}
                                          {isSelected && (
                                            <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                              <Check className="h-4 w-4 text-primary-foreground" />
                                            </div>
                                          )}

                                          {/* Image */}
                                          <div className="aspect-[4/3] bg-muted overflow-hidden">
                                            {style.imageUrl ? (
                                              <img
                                                src={style.imageUrl}
                                                alt={style.name}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                              </div>
                                            )}
                                          </div>

                                          {/* Hover overlay with name - only visible on THIS card */}
                                          {(isHovered || isSelected) && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-200">
                                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <p className="text-white text-sm font-semibold">
                                                  {style.name}
                                                </p>
                                                {style.description && (
                                                  <p className="text-white/80 text-xs line-clamp-2 mt-1">
                                                    {style.description}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <p className="text-xs text-muted-foreground ml-1">
                                    Click to select · You can pick multiple or
                                    describe something else
                                  </p>
                                  {selectedStyles.length > 0 && (
                                    <Button
                                      onClick={handleSubmitStyles}
                                      disabled={isLoading}
                                      size="sm"
                                      className="gap-2"
                                    >
                                      Continue with{" "}
                                      {selectedStyles.length === 1
                                        ? "style"
                                        : `${selectedStyles.length} styles`}
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}

                          {/* Deliverable Style References - only show after typing completes */}
                          {message.deliverableStyles &&
                            message.deliverableStyles.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-5 ml-8"
                              >
                                {/* Only show full grid for the most recent message with styles */}
                                {index === lastStyleMessageIndex ? (
                                  <div className="space-y-4">
                                    <StyleSelectionGrid
                                      styles={message.deliverableStyles}
                                      collectionStyleIds={moodboardStyleIds}
                                      onAddToCollection={handleAddToCollection}
                                      onRemoveFromCollection={
                                        handleRemoveFromCollection
                                      }
                                      onConfirmSelection={
                                        handleConfirmStyleSelection
                                      }
                                      onShowMore={handleShowMoreStyles}
                                      onShowDifferent={
                                        handleShowDifferentStyles
                                      }
                                      isLoading={
                                        isLoading || index < messages.length - 1
                                      }
                                    />
                                    {/* Inline collection - shows collected styles (hidden when using new flow) */}
                                    {false && moodboardStyleIds.length > 0 && (
                                      <InlineCollection
                                        items={moodboardItems.filter(
                                          (i) => i.type === "style"
                                        )}
                                        onRemoveItem={removeMoodboardItem}
                                        onClearAll={handleClearStyleCollection}
                                        onContinue={() =>
                                          handleSubmitDeliverableStyles(
                                            message.deliverableStyles || []
                                          )
                                        }
                                        isLoading={
                                          isLoading ||
                                          index < messages.length - 1
                                        }
                                      />
                                    )}
                                  </div>
                                ) : (
                                  /* Collapsed summary for older style messages */
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Palette className="h-4 w-4" />
                                    <span>
                                      {Math.min(
                                        3,
                                        message.deliverableStyles.length
                                      )}{" "}
                                      style options shown
                                    </span>
                                    {moodboardStyleIds.length > 0 && (
                                      <span className="text-primary">
                                        •{" "}
                                        {
                                          moodboardStyleIds.filter((id) =>
                                            message.deliverableStyles?.some(
                                              (s) => s.id === id
                                            )
                                          ).length
                                        }{" "}
                                        in collection
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )}

                          {/* Video References - for launch videos and video ads */}
                          {message.videoReferences &&
                            message.videoReferences.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="mt-5 ml-8"
                              >
                                <VideoReferenceGrid
                                  videos={message.videoReferences}
                                  onSelectVideo={handleSelectVideo}
                                  isLoading={isLoading}
                                  title="Video Style References"
                                />
                              </motion.div>
                            )}

                          {/* Task Proposal - with actions when it's the pending task */}
                          {message.taskProposal && (
                            <div className="mt-4 ml-8">
                              <TaskProposalCard
                                proposal={message.taskProposal}
                                showActions={
                                  pendingTask?.title ===
                                  message.taskProposal.title
                                }
                                onSubmit={handleOpenSubmissionModal}
                                onMakeChanges={handleRejectTask}
                                isLoading={isLoading}
                                userCredits={userCredits}
                              />
                            </div>
                          )}

                          {/* Quick Options removed - using input field suggestions instead */}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* User message - beige/cream bubble with edit icon and avatar */
                    <div className="max-w-[75%] group">
                      <div className="flex flex-col items-end">
                        {/* Selected style image - shows above the text when style was selected */}
                        {message.selectedStyle &&
                          message.selectedStyle.imageUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-[200px] border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
                              <img
                                src={message.selectedStyle.imageUrl}
                                alt={message.selectedStyle.name}
                                className="w-full h-auto object-cover"
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          )}
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-4 py-3 relative border border-emerald-200/50 dark:border-emerald-800/30 w-fit">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {/* Edit icon - appears on hover for last message */}
                          {index === lastUserMessageIndex &&
                            !isLoading &&
                            !isTaskMode &&
                            !pendingTask && (
                              <button
                                onClick={handleEditLastMessage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/30 hover:text-foreground transition-all"
                                title="Edit this message"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                        </div>
                        {/* User attachments */}
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div className="mt-2">
                              <FileAttachmentList files={message.attachments} />
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Enhanced loading indicator with progressive messages */}
            {isLoading && (
              <LoadingIndicator
                requestStartTime={requestStartTimeRef.current}
              />
            )}

            {/* Inline submit prompt - shown as an AI message when ready to submit */}
            {!isLoading &&
              !pendingTask &&
              !isTaskMode &&
              (() => {
                // Check if the last assistant message asked a question (ends with ?)
                const lastAssistantMsg = messages
                  .filter((m) => m.role === "assistant")
                  .pop();
                const lastMsg = messages[messages.length - 1];
                const aiJustAskedQuestion =
                  lastMsg?.role === "assistant" &&
                  lastAssistantMsg?.content?.trim().endsWith("?");

                // Don't show submit prompt if AI just asked a question
                if (aiJustAskedQuestion) return null;

                // Don't show immediately after a style selection
                const lastUserMessage = messages
                  .filter((m) => m.role === "user")
                  .slice(-1)[0];
                const lastUserWasStyleSelection =
                  lastUserMessage?.content?.includes("style selected") ||
                  lastUserMessage?.content?.includes("Style selected") ||
                  lastUserMessage?.selectedStyle != null;

                // Show when AI indicates ready or user has enough context
                // BUT not right after a style selection (let user respond first)
                const shouldShow =
                  showManualSubmit ||
                  (moodboardItems.length > 0 &&
                    messages.filter((m) => m.role === "user").length >= 3 &&
                    !lastUserWasStyleSelection);

                if (!shouldShow) return null;

                // Render as a subtle inline CTA, not a fake AI message
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-center"
                  >
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/60 border border-border/50 backdrop-blur-sm">
                      <Button
                        onClick={handleRequestTaskSummary}
                        disabled={isLoading}
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Summary
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        or keep chatting
                      </span>
                    </div>
                  </motion.div>
                );
              })()}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="shrink-0 mt-auto pt-4 pb-6 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full">
          {/* Pending uploads preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.filter(Boolean).map((file) => {
                if (!file || !file.fileUrl) return null;
                return (
                  <div
                    key={file.fileUrl}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
                  >
                    {file.fileType?.startsWith("image/") ? (
                      <img
                        src={file.fileUrl}
                        alt={file.fileName || "Uploaded file"}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm max-w-[100px] truncate text-foreground">
                      {file.fileName || "File"}
                    </span>
                    <button
                      onClick={() => removeFile(file.fileUrl)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick submit button - positioned above input on the right */}
          {messages.length > 0 && !pendingTask && !isLoading && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestTaskSummary}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7 px-3"
              >
                <Sparkles className="h-3.5 w-3.5" />
                You decide & submit
              </Button>
            </div>
          )}

          {/* Modern input box - matching design reference */}
          <div className="border border-border rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-sm overflow-hidden shadow-sm">
            {/* Input field with auto-resize and ghost text */}
            <div className="relative">
              {/* Ghost text suggestion overlay */}
              {ghostText && (
                <div className="absolute inset-0 px-4 py-4 pointer-events-none flex items-start">
                  <span className="text-sm text-transparent">{input}</span>
                  <span className="text-sm text-muted-foreground/40">
                    {ghostText}
                  </span>
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize textarea
                  const target = e.target;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  // Tab to accept suggestion (smart completion or quick option)
                  if (e.key === "Tab" && ghostText) {
                    e.preventDefault();
                    // For smart completions, append the completion
                    if (smartCompletion && input.trim().length >= 3) {
                      setInput(input.trim() + " " + smartCompletion);
                      setSmartCompletion(null); // Clear so new completions can generate
                    } else if (currentSuggestion) {
                      // For quick options, use the full suggestion
                      setInput(currentSuggestion);
                    }
                  }
                  // Arrow down to cycle through quick options (only when empty)
                  else if (
                    e.key === "ArrowDown" &&
                    quickOptionSuggestion &&
                    !input.trim()
                  ) {
                    e.preventDefault();
                    setSuggestionIndex((prev) => prev + 1);
                  }
                  // Arrow up to cycle back through quick options
                  else if (
                    e.key === "ArrowUp" &&
                    quickOptionSuggestion &&
                    !input.trim()
                  ) {
                    e.preventDefault();
                    setSuggestionIndex((prev) => Math.max(0, prev - 1));
                  }
                  // Escape to clear smart completion
                  else if (e.key === "Escape" && smartCompletion) {
                    setSmartCompletion(null);
                  }
                  // Submit on Enter (without shift) or Cmd/Ctrl+Enter
                  else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  ghostText
                    ? "" // Hide placeholder when showing ghost text
                    : messages.length === 0
                    ? "What would you like to create today?"
                    : "Type your message..."
                }
                rows={1}
                className="w-full bg-transparent px-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm resize-none min-h-[52px] max-h-[200px] transition-all relative z-10"
                style={{ height: "auto", overflow: "hidden" }}
              />
              {/* Tab hint - show different hints based on context */}
              {ghostText && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs z-0 pointer-events-none">
                  {/* Show arrow keys only when empty and have quick options */}
                  {!input.trim() && quickOptionSuggestion && (
                    <>
                      <div className="flex items-center gap-1.5 text-muted-foreground/60">
                        <div className="flex items-center gap-0.5">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                            ↑
                          </kbd>
                          <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                            ↓
                          </kbd>
                        </div>
                        <span className="text-[11px]">browse</span>
                      </div>
                      <span className="text-muted-foreground/30">•</span>
                    </>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground/60">
                    <kbd className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                      Tab
                    </kbd>
                    <span className="text-[11px]">
                      {input.trim() ? "insert suggestion" : "use suggestion"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
              {/* Left toolbar */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Attach files"
                  >
                    {isUploading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Add image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>
                {/* Divider */}
                <div className="h-4 w-px bg-border" />
                {/* Credits indicator */}
                <div className="flex items-center gap-1.5 text-sm">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      userCredits === 0
                        ? "bg-red-500"
                        : userCredits < 15
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    )}
                  />
                  <span className="text-muted-foreground">
                    {userCredits} credits available
                  </span>
                </div>
                {/* Word count hint - only show when user starts typing */}
                {input.trim().length > 0 &&
                  (() => {
                    const wordCount = input
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length;
                    const solidPromptWords = 10;
                    const greatPromptWords = 20;

                    // Calculate progress percentage for the gradient bar
                    const progress = Math.min(
                      (wordCount / greatPromptWords) * 100,
                      100
                    );

                    if (wordCount >= greatPromptWords) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-600">
                              Great detail!
                            </span>
                          </div>
                        </div>
                      );
                    } else if (wordCount >= solidPromptWords) {
                      const wordsNeeded = greatPromptWords - wordCount;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            +{wordsNeeded} for best results
                          </span>
                        </div>
                      );
                    } else {
                      const wordsNeeded = solidPromptWords - wordCount;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-rose-500 dark:text-rose-400">
                            +{wordsNeeded} for a solid prompt
                          </span>
                        </div>
                      );
                    }
                  })()}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={
                    !input.trim() && uploadedFiles.length === 0
                  }
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : "Submit"}
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced empty state with quick start suggestions */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 space-y-4"
            >
              {/* Popular requests - clickable cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Instagram Carousel",
                    prompt: "Create a 5-slide Instagram carousel about ",
                    icon: LayoutGrid,
                    hint: "5 slides",
                  },
                  {
                    label: "Story Series",
                    prompt: "Design Instagram stories to promote ",
                    icon: Share2,
                    hint: "3-5 stories",
                  },
                  {
                    label: "LinkedIn Post",
                    prompt: "Create a professional LinkedIn post announcing ",
                    icon: Bookmark,
                    hint: "1 image",
                  },
                  {
                    label: "Ad Campaign",
                    prompt: "Design ads for a campaign promoting ",
                    icon: Megaphone,
                    hint: "multi-size",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setInput(item.prompt);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all text-left group",
                      "bg-white/60 dark:bg-card/60 backdrop-blur-sm",
                      "hover:border-emerald-500/50 hover:bg-white dark:hover:bg-card hover:shadow-md",
                      "border-border/50"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-600/20 transition-colors">
                      <item.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.hint}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Keyboard hint */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  {typeof navigator !== "undefined" &&
                  /Mac/.test(navigator.userAgent)
                    ? "⌘"
                    : "Ctrl"}
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  Enter
                </kbd>
                <span className="ml-1">to send</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Style Detail Modal */}
      <StyleDetailModal
        style={selectedStyleForModal}
        isOpen={!!selectedStyleForModal}
        onClose={() => setSelectedStyleForModal(null)}
        isInCollection={
          selectedStyleForModal
            ? hasMoodboardItem(selectedStyleForModal.id)
            : false
        }
        onAddToCollection={handleAddToCollection}
        onRemoveFromCollection={handleRemoveFromCollection}
      />

      {/* Task Submission Modal */}
      <TaskSubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        onConfirm={handleConfirmTask}
        onMakeChanges={handleRejectTask}
        taskProposal={pendingTask}
        moodboardItems={moodboardItems}
        userCredits={userCredits}
        isSubmitting={isLoading}
      />

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        requiredCredits={pendingTask?.creditsRequired || 0}
        currentCredits={userCredits}
        pendingTaskState={
          pendingTask ? { taskProposal: pendingTask, draftId } : undefined
        }
      />
    </ChatLayout>
  );
}
