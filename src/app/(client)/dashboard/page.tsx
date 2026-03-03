'use client'

import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Paperclip,
  Image as ImageIcon,
  Upload,
  FileText,
  FileVideo,
  FileArchive,
  File,
  X,
  Eye,
  Check,
  Zap,
  ArrowRight,
  Film,
  Share2,
  Palette,
  Bookmark,
  LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'

const CreditPurchaseDialog = dynamic(() =>
  import('@/components/shared/credit-purchase-dialog').then((mod) => ({
    default: mod.CreditPurchaseDialog,
  }))
)
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/loading'
import { QuickBriefForm, type QuickBriefData } from '@/components/chat/quick-brief-form'
import { useSession } from '@/lib/auth-client'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCredits } from '@/providers/credit-provider'
import { useTasks, useTemplateImages } from '@/hooks/use-queries'
import { TEMPLATE_CATEGORIES } from './_constants/template-categories'
import { SOCIAL_MEDIA_PLATFORMS, FREQUENCY_OPTIONS } from './_constants/social-media'
import type { UploadedFile, PlatformSelection } from './_types/dashboard-types'
import { useKeywordTagging } from '@/hooks/use-keyword-tagging'

// Category visuals for keyword tag chips
const CATEGORY_ICON: Record<string, typeof Film> = {
  video: Film,
  website: LayoutGrid,
  content: Share2,
  design: Palette,
  brand: Bookmark,
}

const CATEGORY_ICON_BG: Record<string, string> = {
  video: 'bg-crafted-green/15',
  website: 'bg-crafted-sage/15',
  content: 'bg-crafted-mint/20',
  design: 'bg-crafted-green/15',
  brand: 'bg-crafted-sage/15',
}

const CATEGORY_SUBTITLE: Record<string, string> = {
  video: 'Motion & Film',
  website: 'Web Design',
  content: 'Social & Content',
  design: 'Graphic Design',
  brand: 'Brand Identity',
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { credits, isLoading: isLoadingCredits } = useCredits()
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [modalNotes, setModalNotes] = useState('')
  const [platformSelections, setPlatformSelections] = useState<Record<string, PlatformSelection>>(
    {}
  )
  const [quickMode, setQuickMode] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const prefersReduced = useReducedMotion()

  // Keyword tagging — detects deliverable keywords inline
  const { detectedTags } = useKeywordTagging(chatInput)

  // React Query hooks — deduplicate across StrictMode remounts
  const { data: tasksData, error: tasksError } = useTasks({ limit: 10, view: 'client' })
  const { data: templateImagesData } = useTemplateImages()

  // Derive values from query data
  const tasksForReview = useMemo(() => {
    const allTasks = tasksData?.tasks || []
    return allTasks.filter((t) => t.status === 'IN_REVIEW')
  }, [tasksData])

  const templateImageMap = useMemo(() => {
    const map = new Map<string, string>()
    if (templateImagesData?.images) {
      for (const img of templateImagesData.images) {
        const key = img.optionKey ? `${img.categoryKey}:${img.optionKey}` : img.categoryKey
        map.set(key, img.imageUrl)
      }
    }
    return map
  }, [templateImagesData])

  const fetchError =
    !dismissedError && tasksError ? tasksError.message || 'Failed to load tasks' : null

  const userName = session?.user?.name?.split(' ')[0] || 'there'

  // Status color map for recent activity cards
  const statusConfig: Record<string, { label: string; colorClass: string }> = {
    PENDING: { label: 'Pending', colorClass: 'bg-ds-status-pending' },
    OFFERED: { label: 'Offered', colorClass: 'bg-ds-status-assigned' },
    ASSIGNED: { label: 'Assigned', colorClass: 'bg-ds-status-assigned' },
    IN_PROGRESS: { label: 'In Progress', colorClass: 'bg-ds-status-in-progress' },
    PENDING_ADMIN_REVIEW: { label: 'Under Review', colorClass: 'bg-ds-status-review' },
    IN_REVIEW: { label: 'Ready for Review', colorClass: 'bg-ds-status-review' },
    REVISION_REQUESTED: { label: 'Revision', colorClass: 'bg-ds-status-revision' },
  }

  // Recent active tasks (exclude completed/cancelled)
  const recentActiveTasks = useMemo(() => {
    const allTasks = tasksData?.tasks || []
    return allTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').slice(0, 4)
  }, [tasksData])

  // Handle payment redirect toasts
  useEffect(() => {
    const payment = searchParams.get('payment')
    const creditsParam = searchParams.get('credits')

    if (payment === 'success' && creditsParam) {
      toast.success(`Successfully purchased ${creditsParam} credits!`)
    } else if (payment === 'cancelled') {
      toast.info('Payment was cancelled')
    }
  }, [searchParams])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current && chatInput) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px'
    }
  }, [chatInput])

  // File upload logic
  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setIsUploading(true)

    try {
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'attachments')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || errorData.message || 'Upload failed')
        }

        const data = await response.json()
        // API returns { success: true, data: { file: {...} } }
        return (data.data?.file || data.file) as UploadedFile
      })

      const newFiles = await Promise.all(uploadPromises)
      setUploadedFiles((prev) => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) uploaded successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await uploadFiles(files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await uploadFiles(files)
    }
  }

  const removeFile = (fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl))
  }

  const handleSubmit = async (message?: string) => {
    const finalMessage = message || chatInput.trim()
    if ((!finalMessage && uploadedFiles.length === 0) || isSending) return

    // Don't check credits here - let users start chatting freely
    // Payment is only required when confirming/submitting the actual task

    setIsSending(true)

    // Store files in sessionStorage for the chat page to pick up
    if (uploadedFiles.length > 0) {
      sessionStorage.setItem('pending_chat_files', JSON.stringify(uploadedFiles))
    }
    setUploadedFiles([])
    setChatInput('')

    router.push(
      `/dashboard/chat?message=${encodeURIComponent(
        finalMessage || `Attached ${uploadedFiles.length} file(s)`
      )}`
    )
  }

  const _handleTemplateClick = (prompt: string) => {
    setChatInput(prompt)
    inputRef.current?.focus()
    // Place cursor at the end of the prompt
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = prompt.length
      }
    }, 0)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-foreground" />
    if (fileType?.startsWith('video/')) return <FileVideo className="h-5 w-5 text-foreground" />
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5 text-foreground" />
    if (fileType?.includes('zip') || fileType?.includes('archive'))
      return <FileArchive className="h-5 w-5 text-foreground" />
    return <File className="h-5 w-5 text-foreground" />
  }

  return (
    <div
      className="relative min-h-screen"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Organic nature background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Base warm tone */}
        <div className="absolute inset-0 bg-background" />

        {/* Large sage-green wash — top left canopy (canonical organic blob gradient — keep exact rgba) */}
        <div
          className="absolute -top-[20%] -left-[15%] w-[90%] h-[85%] rounded-[40%_60%_55%_45%/50%_40%_60%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 40% 40%, rgba(140,190,130,0.35) 0%, rgba(160,200,150,0.18) 40%, transparent 70%)' /* --crafted-sage variants */,
            animation: 'float1 45s ease-in-out infinite, blob-breathe-slow 8s ease-in-out infinite',
          }}
        />

        {/* Warm golden bloom — morning sunlight (canonical organic blob gradient — keep exact rgba) */}
        <div
          className="absolute top-[5%] right-[-10%] w-[70%] h-[65%] rounded-[55%_45%_50%_50%/45%_55%_45%_55%]"
          style={{
            background:
              'radial-gradient(ellipse at 60% 50%, rgba(230,200,130,0.3) 0%, rgba(220,190,120,0.12) 50%, transparent 75%)' /* warm golden accent */,
            animation:
              'float2 55s ease-in-out infinite, blob-breathe-medium 10s ease-in-out infinite',
          }}
        />

        {/* Deep emerald — lower foliage (canonical organic blob gradient — keep exact rgba) */}
        <div
          className="absolute bottom-[-15%] left-[0%] w-[80%] h-[60%] rounded-[45%_55%_60%_40%/55%_45%_50%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 60%, rgba(100,170,120,0.28) 0%, rgba(120,180,130,0.1) 45%, transparent 70%)' /* --crafted-green variants */,
            animation: 'float3 60s ease-in-out infinite, blob-breathe-fast 7s ease-in-out infinite',
          }}
        />

        {/* Soft mint accent — mid-page organic detail (canonical organic blob gradient — keep exact rgba) */}
        <div
          className="absolute top-[35%] left-[25%] w-[50%] h-[45%] rounded-[50%_50%_45%_55%/45%_55%_50%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 45% 50%, rgba(150,210,170,0.22) 0%, transparent 65%)' /* --crafted-mint variant */,
            animation:
              'float4 50s ease-in-out infinite, blob-breathe-slow 12s ease-in-out infinite',
          }}
        />

        {/* Warm peach bloom — like afternoon light (canonical organic blob gradient — keep exact rgba) */}
        <div
          className="absolute top-[2%] left-[45%] w-[45%] h-[35%] rounded-[50%]"
          style={{
            background:
              'radial-gradient(circle, rgba(240,200,150,0.25) 0%, transparent 60%)' /* warm peach accent */,
            animation:
              'float5 35s ease-in-out infinite, blob-breathe-medium 9s ease-in-out infinite',
          }}
        />

        {/* Bottom-right warm glow (canonical organic blob gradient — keep exact rgba) */}
        <div
          className="absolute bottom-[0%] right-[-5%] w-[55%] h-[50%] rounded-[50%_50%_40%_60%/40%_60%_50%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 60% 60%, rgba(200,180,130,0.2) 0%, transparent 65%)' /* warm golden accent */,
            animation:
              'float1 65s ease-in-out infinite reverse, blob-breathe-fast 11s ease-in-out infinite',
          }}
        />

        {/* Grain overlay for organic texture */}
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.1]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
      />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <p className="text-xl font-medium text-foreground">Drop files here</p>
              <p className="text-sm text-muted-foreground mt-2">Images, videos, PDFs, and more</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submitting loading overlay — grain effect */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="loading-grain fixed inset-0 z-50"
          >
            <span
              className="loading-grain-wordmark pointer-events-none absolute inset-0 z-[2] flex select-none items-center justify-center font-satoshi text-2xl font-light tracking-[0.3em] text-foreground"
              aria-hidden="true"
            >
              crafted
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks Needing Review Banner */}
      {tasksForReview.length > 0 && (
        <div className="px-4 sm:px-6 pt-6 max-w-3xl mx-auto w-full">
          {tasksForReview.map((task) => (
            <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-ds-status-revision bg-ds-status-revision/5 hover:bg-ds-status-revision/10 transition-colors cursor-pointer mb-3">
                <div className="w-10 h-10 rounded-full bg-ds-status-revision/15 flex items-center justify-center shrink-0 animate-pulse">
                  <Eye className="h-5 w-5 text-ds-status-revision" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ds-status-revision">
                    Deliverable ready for review
                  </p>
                  <p className="text-sm text-foreground font-medium truncate">{task.title}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-ds-status-revision hover:bg-ds-status-revision/90 text-white shrink-0"
                >
                  Review Now
                </Button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {fetchError && (
        <div className="px-4 sm:px-6 pt-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--ds-error)]/30 bg-[var(--ds-error)]/5">
            <div className="w-8 h-8 rounded-full bg-[var(--ds-error)]/10 flex items-center justify-center shrink-0">
              <X className="h-4 w-4 text-[var(--ds-error)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{fetchError}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try refreshing the page</p>
            </div>
            <button
              onClick={() => setDismissedError(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content — vertically centered like Cardboard */}
      {/* Using my-auto instead of justify-center to avoid the "unsafe center" bug:
          when content overflows a justify-center container, the top content
          becomes inaccessible (can't scroll to it). my-auto achieves the same
          visual centering but gracefully falls back to top-aligned on overflow. */}
      <div className="flex flex-col items-center px-4 sm:px-6 min-h-[calc(100vh-3rem)] pb-12">
        <div className="mt-[18vh] flex flex-col items-center w-full">
          {/* Welcome Header */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-6"
          >
            <h1 className="text-[1.7rem] sm:text-[2rem] font-normal text-foreground tracking-[-0.02em] leading-snug">
              What are we creating today, {userName}?
            </h1>
            <p className="text-[0.95rem] text-muted-foreground mt-2 font-light">
              Bring in your ideas and let&apos;s get started.
            </p>
          </motion.div>

          {/* Recent Activity Chips */}
          {recentActiveTasks.length > 0 && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReduced ? 0 : 0.35,
                delay: prefersReduced ? 0 : 0.04,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="flex items-center justify-center gap-2 flex-wrap mb-4"
            >
              {recentActiveTasks.map((task) => {
                const config = statusConfig[task.status] || {
                  label: task.status,
                  colorClass: 'bg-muted-foreground',
                }
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/60 border border-border/40 backdrop-blur-sm text-xs hover:border-crafted-sage/30 hover:bg-card/80 transition-all duration-200"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.colorClass)} />
                    <span className="text-muted-foreground font-medium">{config.label}</span>
                    <span className="text-foreground/70 truncate max-w-[120px]">{task.title}</span>
                  </Link>
                )
              })}
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-crafted-sage hover:text-crafted-green transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          )}

          {/* Main Input Card */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: prefersReduced ? 0 : 0.4,
              delay: prefersReduced ? 0 : 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="w-full max-w-[780px] mb-3"
          >
            {/* Animated gradient border wrapper */}
            <div
              className={cn(
                'rounded-[18px] p-[1.5px] transition-all duration-300',
                isFocused
                  ? 'gradient-border-animation'
                  : chatInput.trim()
                    ? 'bg-border/40'
                    : 'breathing-glow-animation'
              )}
              style={
                isFocused
                  ? {
                      background: `conic-gradient(from var(--border-angle), var(--crafted-mint), var(--crafted-green), var(--crafted-sage), var(--crafted-forest), var(--crafted-mint))`,
                      animation: 'gradient-border-spin 3s linear infinite',
                    }
                  : !chatInput.trim()
                    ? {
                        animation: 'breathing-glow 3s ease-in-out infinite',
                      }
                    : undefined
              }
            >
              <div className="bg-white dark:bg-card/90 backdrop-blur-xl rounded-[17px] border-0 shadow-lg shadow-black/[0.03] overflow-hidden">
                {/* Uploaded files preview */}
                {uploadedFiles.length > 0 && (
                  <div className="px-4 py-3 border-b border-border/30">
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.filter(Boolean).map((file) => (
                        <div
                          key={file.fileUrl}
                          className="relative group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50"
                        >
                          {file.fileType?.startsWith('image/') ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={file.fileUrl}
                              alt={file.fileName}
                              className="h-5 w-5 rounded object-cover"
                            />
                          ) : (
                            <span className="[&>svg]:h-4 [&>svg]:w-4">
                              {getFileIcon(file.fileType)}
                            </span>
                          )}
                          <span className="text-sm max-w-[150px] truncate text-foreground">
                            {file.fileName}
                          </span>
                          <button
                            onClick={() => removeFile(file.fileUrl)}
                            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Remove file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Input Area */}
                <div className="px-5 sm:px-6 pt-5 pb-2.5">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={
                      uploadedFiles.length > 0
                        ? 'Add a message or just send...'
                        : 'Describe what you want to create...'
                    }
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-[0.95rem] leading-relaxed resize-none min-h-[40px] max-h-[150px]"
                    rows={1}
                  />
                </div>

                {/* Detected keyword entity cards — Perplexity style */}
                <AnimatePresence mode="popLayout">
                  {detectedTags.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="px-5 sm:px-6 pb-2"
                    >
                      <div className="flex flex-wrap gap-2">
                        {detectedTags.map((tag) => {
                          const Icon = CATEGORY_ICON[tag.category] ?? Film
                          return (
                            <div
                              key={tag.label}
                              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-muted/60 border border-border/50"
                            >
                              <div
                                className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                  CATEGORY_ICON_BG[tag.category] ?? CATEGORY_ICON_BG.content
                                )}
                              >
                                <Icon className="h-3.5 w-3.5 text-crafted-forest dark:text-crafted-mint" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground leading-tight truncate">
                                  {tag.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                  {CATEGORY_SUBTITLE[tag.category] ?? tag.category}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toolbar Row */}
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pb-3.5 pt-1">
                  {/* Left side - attachment icons and credits */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                      title="Attach file"
                    >
                      {isUploading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Paperclip className="h-[18px] w-[18px]" />
                      )}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                      title="Add image"
                    >
                      <ImageIcon className="h-[18px] w-[18px]" />
                    </button>

                    <div className="w-px h-4 bg-border/50 mx-2" />

                    {/* Credits indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {isLoadingCredits ? (
                        <Skeleton className="h-3.5 w-24" />
                      ) : (
                        <>
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              credits === 0
                                ? 'bg-[var(--ds-error)]'
                                : credits <= 2
                                  ? 'bg-[var(--ds-warning)]'
                                  : 'bg-[var(--ds-success)]'
                            )}
                          />
                          <span>{credits} credits</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side - Submit arrow */}
                  <button
                    onClick={() => handleSubmit()}
                    disabled={
                      isSending || isUploading || (!chatInput.trim() && uploadedFiles.length === 0)
                    }
                    aria-label="Send message"
                    className="flex items-center justify-center w-8 h-8 bg-foreground hover:bg-foreground/80 text-background rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Drag and drop hint */}
            <p className="text-center text-xs text-muted-foreground/60 mt-2.5">
              Drag and drop or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
              >
                click here
              </button>{' '}
              to add your images, videos or files.
            </p>
          </motion.div>

          {/* Template Cards */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReduced ? 0 : 0.4,
              delay: prefersReduced ? 0 : 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="w-full max-w-[640px] mt-4"
          >
            <p className="text-center text-xs text-muted-foreground/60 mb-4">
              or start from a template
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(TEMPLATE_CATEGORIES)
                .filter(([category]) =>
                  ['Launch Videos', 'Pitch Deck', 'Landing Page', 'Content Calendar'].includes(
                    category
                  )
                )
                .map(([category, { icon: Icon, categoryKey, options }], index) => {
                  const categoryImage = templateImageMap.get(categoryKey)
                  const gradientStyles: Record<string, React.CSSProperties> = {
                    'Launch Videos': {
                      background:
                        'linear-gradient(135deg, rgba(140,190,130,0.15) 0%, rgba(200,180,130,0.1) 100%)',
                    },
                    'Pitch Deck': {
                      background:
                        'linear-gradient(135deg, rgba(160,200,150,0.13) 0%, rgba(230,200,130,0.1) 100%)',
                    },
                    Branding: {
                      background:
                        'linear-gradient(135deg, rgba(150,210,170,0.13) 0%, rgba(200,180,130,0.1) 100%)',
                    },
                    'Social Media': {
                      background:
                        'linear-gradient(135deg, rgba(100,170,120,0.15) 0%, rgba(160,200,150,0.1) 100%)',
                    },
                    'Content Calendar': {
                      background:
                        'linear-gradient(135deg, rgba(140,190,130,0.13) 0%, rgba(150,210,170,0.1) 100%)',
                    },
                    'Landing Page': {
                      background:
                        'linear-gradient(135deg, rgba(160,200,150,0.12) 0%, rgba(100,170,120,0.1) 100%)',
                    },
                  }
                  const cardStyle = gradientStyles[category] || {
                    background: 'rgba(140,190,130,0.12)',
                  }
                  return (
                    <motion.div
                      key={category}
                      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: prefersReduced ? 0 : 0.35,
                        delay: prefersReduced ? 0 : 0.3 + index * 0.05,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    >
                      <button
                        onClick={() => {
                          setSelectedCategory(category)
                          setSelectedOption(null)
                          setModalNotes('')
                          setPlatformSelections({})
                        }}
                        className="group relative flex flex-col items-start justify-between w-full h-[120px] p-4 rounded-xl overflow-hidden ring-1 ring-crafted-sage/10 hover:ring-crafted-sage/25 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer backdrop-blur-sm"
                      >
                        {categoryImage ? (
                          <>
                            <Image
                              src={categoryImage}
                              alt={category}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, 170px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 group-hover:from-black/70 transition-colors" />
                          </>
                        ) : (
                          <>
                            <div
                              className="absolute inset-0 group-hover:brightness-95 transition-all"
                              style={cardStyle}
                            />
                            <div
                              className="absolute inset-0 opacity-[0.12]"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                                backgroundSize: '128px 128px',
                              }}
                            />
                          </>
                        )}
                        <div className="relative z-10 flex flex-col items-start">
                          <span className="text-foreground/80 text-[13px] font-medium tracking-[-0.01em] leading-snug">
                            {category}
                          </span>
                          <span className="text-foreground/45 text-[10px] font-light mt-0.5">
                            {options.length} templates
                          </span>
                        </div>
                        <Icon className="relative z-10 h-5 w-5 text-foreground/50" />
                      </button>
                    </motion.div>
                  )
                })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Category Options Modal */}
      <Dialog
        open={!!selectedCategory}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCategory(null)
            setSelectedOption(null)
            setModalNotes('')
            setPlatformSelections({})
            setQuickMode(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border border-border/30 shadow-2xl shadow-black/10 bg-card">
          {selectedCategory &&
            (() => {
              const category =
                TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES]
              const Icon = category?.icon
              const headerImage = category ? templateImageMap.get(category.categoryKey) : undefined

              return (
                <>
                  {/* Header */}
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      {headerImage ? (
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
                          <Image
                            src={headerImage}
                            alt={selectedCategory}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[var(--crafted-green)] flex items-center justify-center shrink-0">
                          {Icon && <Icon className="h-4.5 w-4.5 text-white" />}
                        </div>
                      )}
                      <DialogTitle className="text-base font-semibold text-foreground tracking-tight flex-1">
                        {selectedCategory}
                      </DialogTitle>
                      {/* Quick Brief toggle (#9) */}
                      {selectedCategory !== 'Social Media' && (
                        <button
                          type="button"
                          onClick={() => setQuickMode((q) => !q)}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors',
                            quickMode
                              ? 'bg-ds-warning/10 text-ds-warning border-ds-warning/30'
                              : 'border-border text-muted-foreground hover:border-ds-warning/30'
                          )}
                        >
                          <Zap className="h-3 w-3" />
                          Quick
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed pl-12">
                      {category?.modalDescription}
                    </p>
                  </div>

                  {quickMode && selectedCategory !== 'Social Media' ? (
                    <div className="px-6 pb-6">
                      <QuickBriefForm
                        onSubmit={(brief: QuickBriefData) => {
                          const parts = [
                            `Create a ${selectedCategory?.toLowerCase() || 'video'}: ${brief.goal}`,
                          ]
                          if (brief.audience) parts.push(`Target audience: ${brief.audience}`)
                          if (brief.style) parts.push(`Style: ${brief.style}`)
                          parts.push(`Duration: ${brief.duration}s`)
                          if (brief.platforms.length > 0)
                            parts.push(`Platforms: ${brief.platforms.join(', ')}`)
                          handleSubmit(parts.join('. '))
                        }}
                        isLoading={isSending}
                      />
                    </div>
                  ) : selectedCategory === 'Social Media' ? (
                    <>
                      {/* Platform Picker */}
                      <div className="px-5 pb-4 flex flex-col gap-2.5">
                        {SOCIAL_MEDIA_PLATFORMS.map((platform) => {
                          const sel = platformSelections[platform.id]
                          const isEnabled = sel?.enabled ?? false
                          const PlatformIcon = platform.icon
                          return (
                            <div
                              key={platform.id}
                              className={cn(
                                'rounded-xl ring-1 ring-inset transition-all duration-200',
                                isEnabled
                                  ? 'ring-[var(--crafted-green)] bg-[var(--crafted-green)]/5 dark:bg-[var(--crafted-green)]/10'
                                  : 'ring-black/[0.06] dark:ring-white/[0.06]'
                              )}
                            >
                              <div
                                className={cn(
                                  'flex items-center gap-3 px-4 py-3',
                                  !isEnabled && 'opacity-50'
                                )}
                              >
                                {/* Checkbox + Icon + Name */}
                                <button
                                  onClick={() => {
                                    setPlatformSelections((prev) => {
                                      const current = prev[platform.id]
                                      if (current?.enabled) {
                                        const next = { ...prev }
                                        delete next[platform.id]
                                        return next
                                      }
                                      return {
                                        ...prev,
                                        [platform.id]: {
                                          enabled: true,
                                          formats: [...platform.formats],
                                          frequency: platform.defaultFrequency,
                                        },
                                      }
                                    })
                                  }}
                                  className="flex items-center gap-3 min-w-0 text-left shrink-0"
                                >
                                  <div
                                    className={cn(
                                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150',
                                      isEnabled
                                        ? 'border-[var(--crafted-green)] bg-[var(--crafted-green)]'
                                        : 'border-border/60 bg-card'
                                    )}
                                  >
                                    {isEnabled && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <PlatformIcon
                                    className={cn(
                                      'h-4.5 w-4.5 shrink-0',
                                      isEnabled
                                        ? 'text-[var(--crafted-forest)] dark:text-[var(--crafted-sage)]'
                                        : 'text-muted-foreground'
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      'font-semibold text-sm',
                                      isEnabled
                                        ? 'text-[var(--crafted-forest)] dark:text-[var(--crafted-sage)]'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {platform.name}
                                  </span>
                                </button>

                                {/* Format Pills + Frequency — pushed right, allowed to wrap */}
                                <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                                  {platform.formats.map((format) => {
                                    const isFormatActive = sel?.formats.includes(format) ?? false
                                    return (
                                      <button
                                        key={format}
                                        disabled={!isEnabled}
                                        onClick={() => {
                                          if (!isEnabled) return
                                          setPlatformSelections((prev) => {
                                            const current = prev[platform.id]
                                            if (!current) return prev
                                            const currentFormats = current.formats
                                            if (isFormatActive && currentFormats.length <= 1)
                                              return prev
                                            return {
                                              ...prev,
                                              [platform.id]: {
                                                ...current,
                                                formats: isFormatActive
                                                  ? currentFormats.filter((f) => f !== format)
                                                  : [...currentFormats, format],
                                              },
                                            }
                                          })
                                        }}
                                        className={cn(
                                          'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150',
                                          isEnabled && isFormatActive
                                            ? 'bg-[var(--crafted-green)]/10 text-[var(--crafted-forest)] dark:text-[var(--crafted-sage)]'
                                            : 'bg-muted text-muted-foreground',
                                          isEnabled
                                            ? 'cursor-pointer hover:bg-[var(--crafted-green)]/15'
                                            : 'cursor-default'
                                        )}
                                      >
                                        {format}
                                      </button>
                                    )
                                  })}

                                  {/* Frequency Select */}
                                  <select
                                    disabled={!isEnabled}
                                    value={sel?.frequency ?? platform.defaultFrequency}
                                    onChange={(e) => {
                                      setPlatformSelections((prev) => {
                                        const current = prev[platform.id]
                                        if (!current) return prev
                                        return {
                                          ...prev,
                                          [platform.id]: { ...current, frequency: e.target.value },
                                        }
                                      })
                                    }}
                                    className={cn(
                                      'h-7 text-xs rounded-md border border-border/40 bg-card px-2 pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--crafted-green)]/20 focus:border-[var(--crafted-green)]/40 transition-all appearance-none shrink-0',
                                      !isEnabled
                                        ? 'cursor-default text-muted-foreground'
                                        : 'cursor-pointer text-foreground'
                                    )}
                                    style={{
                                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                      backgroundRepeat: 'no-repeat',
                                      backgroundPosition: 'right 6px center',
                                    }}
                                  >
                                    {FREQUENCY_OPTIONS.map((freq) => (
                                      <option key={freq} value={freq}>
                                        {freq}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Notes + Continue for Social Media */}
                      <div className="px-5 pb-5 pt-1 border-t border-border/20">
                        <div className="relative mt-3">
                          <textarea
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                const enabledPlatforms = Object.entries(platformSelections).filter(
                                  ([, v]) => v.enabled
                                )
                                if (enabledPlatforms.length > 0) {
                                  const platformDescriptions = enabledPlatforms.map(([id, s]) => {
                                    const p = SOCIAL_MEDIA_PLATFORMS.find((pl) => pl.id === id)
                                    return `${p?.name} (${s.formats.join(', ')} — ${s.frequency})`
                                  })
                                  const prompt = `Create social media content. Platforms: ${platformDescriptions.join(', ')}.${modalNotes ? ` Additional notes: ${modalNotes}` : ''}`
                                  handleSubmit(prompt)
                                  setSelectedCategory(null)
                                  setModalNotes('')
                                  setPlatformSelections({})
                                }
                              }
                            }}
                            rows={2}
                            placeholder="Add any details or goals..."
                            className="w-full min-h-[60px] px-4 py-2.5 pr-28 rounded-lg border border-border/40 bg-card text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-[var(--crafted-green)]/20 focus:border-[var(--crafted-green)]/40 text-sm transition-all resize-none"
                          />
                          <button
                            onClick={() => {
                              const enabledPlatforms = Object.entries(platformSelections).filter(
                                ([, v]) => v.enabled
                              )
                              if (enabledPlatforms.length === 0) {
                                toast.error('Select at least one platform to continue')
                                return
                              }
                              const platformDescriptions = enabledPlatforms.map(([id, s]) => {
                                const p = SOCIAL_MEDIA_PLATFORMS.find((pl) => pl.id === id)
                                return `${p?.name} (${s.formats.join(', ')} — ${s.frequency})`
                              })
                              const prompt = `Create social media content. Platforms: ${platformDescriptions.join(', ')}.${modalNotes ? ` Additional notes: ${modalNotes}` : ''}`
                              handleSubmit(prompt)
                              setSelectedCategory(null)
                              setModalNotes('')
                              setPlatformSelections({})
                            }}
                            className={cn(
                              'absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 text-white rounded-md font-medium text-sm transition-all duration-150',
                              Object.values(platformSelections).filter((v) => v.enabled).length ===
                                0
                                ? 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                                : 'bg-[var(--crafted-green)] hover:bg-[var(--crafted-forest)]'
                            )}
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Options List (non-Social Media categories) */}
                      <div className="px-5 pb-3 space-y-1">
                        {category?.options.map((option) => {
                          const isSelected = selectedOption === option.title
                          return (
                            <button
                              key={option.title}
                              onClick={() => setSelectedOption(isSelected ? null : option.title)}
                              className={cn(
                                'group w-full flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition-all duration-150',
                                isSelected
                                  ? 'bg-crafted-green/8 ring-1 ring-crafted-sage/30'
                                  : 'hover:bg-muted/40'
                              )}
                            >
                              {/* Icon */}
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-lg shrink-0 flex items-center justify-center transition-colors duration-150',
                                  isSelected ? 'bg-crafted-green/15' : 'bg-muted/60'
                                )}
                              >
                                <option.icon
                                  className={cn(
                                    'w-[18px] h-[18px] transition-colors duration-150',
                                    isSelected ? 'text-crafted-sage' : 'text-muted-foreground'
                                  )}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <h3
                                  className={cn(
                                    'text-sm font-medium leading-snug transition-colors duration-150',
                                    isSelected ? 'text-foreground' : 'text-foreground/70'
                                  )}
                                >
                                  {option.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {option.description}
                                </p>
                              </div>

                              {/* Thumbnail */}
                              {templateImageMap.get(option.optionKey) && (
                                <div className="shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-muted/40">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={templateImageMap.get(option.optionKey)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              {/* Selection indicator */}
                              <div
                                className={cn(
                                  'w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-150',
                                  isSelected
                                    ? 'border-crafted-sage bg-crafted-sage'
                                    : 'border-muted-foreground/25'
                                )}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-2.5 h-2.5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Notes + Continue */}
                      <div className="px-5 pb-5 pt-1">
                        <div className="border-t border-border/50 pt-4">
                          <textarea
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && selectedOption) {
                                e.preventDefault()
                                const option = category?.options.find(
                                  (o) => o.title === selectedOption
                                )
                                if (option) {
                                  const fullPrompt = modalNotes
                                    ? `${option.prompt}. ${option.description} Additional notes: ${modalNotes}`
                                    : `${option.prompt}. ${option.description}`
                                  handleSubmit(fullPrompt)
                                  setSelectedCategory(null)
                                  setSelectedOption(null)
                                  setModalNotes('')
                                }
                              }
                            }}
                            rows={2}
                            placeholder="Add any specific details or requirements..."
                            className="w-full bg-muted/30 rounded-lg border border-border/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none focus:border-crafted-sage/40 focus:bg-muted/40 transition-colors duration-150"
                          />
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => {
                                if (!selectedOption) {
                                  toast.error('Select an option to continue')
                                  return
                                }
                                const option = category?.options.find(
                                  (o) => o.title === selectedOption
                                )
                                if (option) {
                                  const fullPrompt = modalNotes
                                    ? `${option.prompt}. ${option.description} Additional notes: ${modalNotes}`
                                    : `${option.prompt}. ${option.description}`
                                  handleSubmit(fullPrompt)
                                  setSelectedCategory(null)
                                  setSelectedOption(null)
                                  setModalNotes('')
                                }
                              }}
                              disabled={!selectedOption}
                              className={cn(
                                'px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                                'disabled:opacity-40 disabled:cursor-not-allowed',
                                'bg-crafted-green text-white hover:bg-crafted-forest'
                              )}
                            >
                              Continue
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )
            })()}
        </DialogContent>
      </Dialog>

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        currentCredits={credits || 0}
        requiredCredits={1}
      />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] px-6 pb-12">
      <div className="text-center mb-6">
        <Skeleton className="h-8 w-80 mx-auto mb-2" />
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>
      <Skeleton className="h-32 w-full max-w-[780px] rounded-2xl mb-3" />
      <Skeleton className="h-3.5 w-64 mx-auto mb-3" />
      {/* Activity chip skeletons */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-[480px] w-full">
        <Skeleton className="h-[85px] rounded-xl" />
        <Skeleton className="h-[85px] rounded-xl" />
        <Skeleton className="h-[85px] rounded-xl" />
        <Skeleton className="h-[85px] rounded-xl" />
        <Skeleton className="h-[85px] rounded-xl" />
        <Skeleton className="h-[85px] rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
