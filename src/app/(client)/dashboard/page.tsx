'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithSkeleton, MasonryGridSkeleton } from '@/components/ui/skeletons'
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
  Share2,
  Megaphone,
  Presentation,
  Palette,
  Eye,
  PanelTop,
  Instagram,
  Linkedin,
  Music,
  Youtube,
  Twitter,
  Check,
  Rocket,
  Sparkles,
  Smartphone,
  TrendingUp,
  Handshake,
  Building2,
  PackageOpen,
  PenTool,
  RefreshCw,
  ShoppingBag,
  Monitor,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreditPurchaseDialog } from '@/components/shared/credit-purchase-dialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/loading'
import { useSession } from '@/lib/auth-client'
import { getImageVariantUrls } from '@/lib/image/utils'
import { cn } from '@/lib/utils'
import { useCredits } from '@/providers/credit-provider'

interface UploadedFile {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

interface StyleReference {
  id: string
  name: string
  imageUrl: string
  deliverableType: string | null
  styleAxis: string | null
  contentCategory?: string
  colorTemperature?: string
}

const SOCIAL_MEDIA_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    formats: ['Post', 'Story', 'Reels'],
    defaultFrequency: '3x / week',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    formats: ['Post', 'Carousel'],
    defaultFrequency: '2x / week',
  },
  { id: 'tiktok', name: 'TikTok', icon: Music, formats: ['Video'], defaultFrequency: '3x / week' },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    formats: ['Shorts', 'Long-form'],
    defaultFrequency: '1x / week',
  },
  { id: 'x', name: 'X', icon: Twitter, formats: ['Post', 'Thread'], defaultFrequency: 'Daily' },
] as const

const FREQUENCY_OPTIONS = [
  'Daily',
  '5x / week',
  '3x / week',
  '2x / week',
  '1x / week',
  '2x / month',
  '1x / month',
]

interface PlatformSelection {
  enabled: boolean
  formats: string[]
  frequency: string
}

// Template categories and sub-options based on service offerings
const TEMPLATE_CATEGORIES = {
  'Launch Videos': {
    icon: Megaphone,
    description: 'Product videos that convert',
    modalDescription:
      "Select the video type that fits my launch goals. Add details about my product and we'll craft the perfect brief.",
    options: [
      {
        title: 'Product Launch Video',
        description:
          'A polished 30-60 second cinematic video that introduces my product to the world. Perfect for social media announcements, landing pages, and investor presentations.',
        prompt: 'Create a product launch video',
        icon: Rocket,
      },
      {
        title: 'Feature Highlight',
        description:
          'A focused video that showcases a specific feature or capability of my product. Great for explaining complex functionality in a digestible way.',
        prompt: 'Create a feature highlight video',
        icon: Sparkles,
      },
      {
        title: 'App Walkthrough',
        description:
          'A clear, guided tour of my app or software showing the user journey from start to finish. Ideal for onboarding and tutorials.',
        prompt: 'Create an app walkthrough video',
        icon: Smartphone,
      },
    ],
  },
  'Pitch Deck': {
    icon: Presentation,
    description: 'Investor-ready presentations',
    modalDescription:
      "Choose the presentation style that matches my audience. Share my existing deck or key points and we'll design something compelling.",
    options: [
      {
        title: 'Investor Pitch Deck',
        description:
          'A visually striking presentation designed to capture investor attention and communicate my vision clearly. Typically 10-15 slides.',
        prompt: 'Redesign my investor pitch deck',
        icon: TrendingUp,
      },
      {
        title: 'Sales Deck',
        description:
          'A persuasive presentation built for closing deals. Features benefit-focused messaging and clear calls to action.',
        prompt: 'Create a sales presentation deck',
        icon: Handshake,
      },
      {
        title: 'Company Overview',
        description:
          'A versatile introduction to my company that works for partners, clients, and new team members.',
        prompt: 'Design a company overview presentation',
        icon: Building2,
      },
    ],
  },
  Branding: {
    icon: Palette,
    description: 'Complete visual identity',
    modalDescription:
      "Tell us about my brand personality and goals. We'll create a visual identity that sets me apart.",
    options: [
      {
        title: 'Full Brand Package',
        description:
          'A complete visual identity system including logo design, color palette, typography, and brand guidelines.',
        prompt: 'Create a full brand package with logo and visual identity',
        icon: PackageOpen,
      },
      {
        title: 'Logo Design',
        description:
          'A custom logo crafted for my brand, including primary logo, wordmark, and icon variations.',
        prompt: 'Design a logo for my brand',
        icon: PenTool,
      },
      {
        title: 'Brand Refresh',
        description:
          'Modernize and elevate my existing brand while maintaining recognition with updated visual elements.',
        prompt: 'Refresh and modernize my existing brand',
        icon: RefreshCw,
      },
    ],
  },
  'Social Media': {
    icon: Share2,
    description: 'Ads, content & video edits',
    modalDescription: 'Choose your platforms and posting frequency.',
    options: [
      {
        title: 'Instagram Post',
        description:
          'Eye-catching static posts designed for maximum engagement in the 4:5 feed format.',
        prompt: 'Create Instagram post designs',
        icon: Instagram,
      },
      {
        title: 'Instagram Story',
        description:
          'Vertical 9:16 content optimized for Stories with interactive elements and dynamic layouts.',
        prompt: 'Create Instagram story designs',
        icon: Instagram,
      },
      {
        title: 'Instagram Reels',
        description:
          'Short-form vertical video content designed to capture attention in the first second.',
        prompt: 'Create an Instagram Reels video',
        icon: FileVideo,
      },
      {
        title: 'LinkedIn Content',
        description:
          'Professional content designed for B2B engagement including carousels and thought leadership.',
        prompt: 'Create LinkedIn content',
        icon: Linkedin,
      },
      {
        title: 'Video Edit',
        description:
          'Transform raw footage into polished, platform-ready content with professional editing.',
        prompt: 'Edit my video footage for social media',
        icon: FileVideo,
      },
      {
        title: 'Ad Creatives',
        description:
          'Performance-focused ad designs for Meta, TikTok, Google with A/B testing variations.',
        prompt: 'Create social media ad creatives',
        icon: Megaphone,
      },
    ],
  },
  'Landing Page': {
    icon: PanelTop,
    description: 'High-converting web pages',
    modalDescription:
      "Pick a landing page style and tell us about my product or campaign. We'll design a page that drives action.",
    options: [
      {
        title: 'Product Landing Page',
        description:
          'A conversion-focused page that showcases my product with compelling visuals, benefits, and a clear call to action.',
        prompt: 'Design a product landing page',
        icon: ShoppingBag,
      },
      {
        title: 'SaaS Landing Page',
        description:
          'A modern page built for software products with feature highlights, pricing, social proof, and sign-up flows.',
        prompt: 'Design a SaaS landing page',
        icon: Monitor,
      },
      {
        title: 'Event Landing Page',
        description:
          'A dynamic page for events, launches, or campaigns with countdown timers, speaker bios, and registration.',
        prompt: 'Design an event landing page',
        icon: CalendarDays,
      },
    ],
  },
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
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([])
  const [isLoadingStyles, setIsLoadingStyles] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [modalNotes, setModalNotes] = useState('')
  const [platformSelections, setPlatformSelections] = useState<Record<string, PlatformSelection>>(
    {}
  )
  const [tasksForReview, setTasksForReview] = useState<
    { id: string; title: string; description: string }[]
  >([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const prefersReduced = useReducedMotion()
  const [fetchError, setFetchError] = useState<string | null>(null)

  const userName = session?.user?.name?.split(' ')[0] || 'there'

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

  // Fetch tasks and style references on mount only
  useEffect(() => {
    // Fetch tasks needing client review
    fetch('/api/tasks?limit=10&view=client')
      .then((res) => res.json())
      .then((data) => {
        const allTasks = data.data?.tasks || data.tasks || []
        setTasksForReview(allTasks.filter((t: { status: string }) => t.status === 'IN_REVIEW'))
      })
      .catch(() => setFetchError('Failed to load tasks'))

    // Fetch brand-matched style references (increased limit for all categories)
    setIsLoadingStyles(true)
    fetch('/api/style-references/match?limit=150')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setStyleReferences(data.data)
        }
      })
      .catch(() => setFetchError('Failed to load style references'))
      .finally(() => setIsLoadingStyles(false))
  }, [])

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

        {/* Large sage-green wash — top left canopy */}
        <div
          className="absolute -top-[20%] -left-[15%] w-[90%] h-[85%] rounded-[40%_60%_55%_45%/50%_40%_60%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 40% 40%, rgba(140,190,130,0.35) 0%, rgba(160,200,150,0.18) 40%, transparent 70%)',
            animation: 'float1 45s ease-in-out infinite',
          }}
        />

        {/* Warm golden bloom — morning sunlight */}
        <div
          className="absolute top-[5%] right-[-10%] w-[70%] h-[65%] rounded-[55%_45%_50%_50%/45%_55%_45%_55%]"
          style={{
            background:
              'radial-gradient(ellipse at 60% 50%, rgba(230,200,130,0.3) 0%, rgba(220,190,120,0.12) 50%, transparent 75%)',
            animation: 'float2 55s ease-in-out infinite',
          }}
        />

        {/* Deep emerald — lower foliage */}
        <div
          className="absolute bottom-[-15%] left-[0%] w-[80%] h-[60%] rounded-[45%_55%_60%_40%/55%_45%_50%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 60%, rgba(100,170,120,0.28) 0%, rgba(120,180,130,0.1) 45%, transparent 70%)',
            animation: 'float3 60s ease-in-out infinite',
          }}
        />

        {/* Soft mint accent — mid-page organic detail */}
        <div
          className="absolute top-[35%] left-[25%] w-[50%] h-[45%] rounded-[50%_50%_45%_55%/45%_55%_50%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 45% 50%, rgba(150,210,170,0.22) 0%, transparent 65%)',
            animation: 'float4 50s ease-in-out infinite',
          }}
        />

        {/* Warm peach bloom — like afternoon light */}
        <div
          className="absolute top-[2%] left-[45%] w-[45%] h-[35%] rounded-[50%]"
          style={{
            background: 'radial-gradient(circle, rgba(240,200,150,0.25) 0%, transparent 60%)',
            animation: 'float5 35s ease-in-out infinite',
          }}
        />

        {/* Bottom-right warm glow */}
        <div
          className="absolute bottom-[0%] right-[-5%] w-[55%] h-[50%] rounded-[50%_50%_40%_60%/40%_60%_50%_50%]"
          style={{
            background:
              'radial-gradient(ellipse at 60% 60%, rgba(200,180,130,0.2) 0%, transparent 65%)',
            animation: 'float1 65s ease-in-out infinite reverse',
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
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0 animate-pulse">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-orange-800 dark:text-orange-300">
                    Deliverable ready for review
                  </p>
                  <p className="text-sm text-foreground font-medium truncate">{task.title}</p>
                </div>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
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
              onClick={() => setFetchError(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content — vertically centered like Cardboard */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 min-h-[calc(100vh-3rem)] pb-12">
        {/* Welcome Header */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-[1.7rem] sm:text-[2rem] font-medium text-foreground tracking-[-0.01em] leading-snug">
            What are we creating today, {userName}?
          </h1>
          <p className="text-[0.95rem] text-muted-foreground mt-2">
            Bring in your ideas and let&apos;s get started.
          </p>
        </motion.div>

        {/* Main Input Card */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.4,
            delay: prefersReduced ? 0 : 0.08,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="w-full max-w-[780px] mb-3"
        >
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg shadow-black/[0.03] overflow-hidden">
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
            <div className="px-4 sm:px-5 pt-4 pb-2">
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
                placeholder={
                  uploadedFiles.length > 0
                    ? 'Add a message or just send...'
                    : 'Describe what you want to create...'
                }
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-[0.95rem] leading-relaxed resize-none min-h-[40px] max-h-[150px]"
                rows={1}
              />
            </div>

            {/* Toolbar Row */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pb-3 pt-1">
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
          className="w-full max-w-[780px] mt-5"
        >
          <p className="text-center text-xs text-muted-foreground/60 mb-4">
            or choose from one of these examples
          </p>
          <div className="flex items-center justify-center gap-3">
            {Object.entries(TEMPLATE_CATEGORIES).map(([category, { icon: Icon }]) => {
              const gradients: Record<string, string> = {
                'Launch Videos': 'from-[var(--crafted-green)] to-[var(--crafted-forest)]',
                'Pitch Deck': 'from-[var(--crafted-green-light)] to-[var(--crafted-green)]',
                Branding: 'from-[var(--crafted-sage)] to-[var(--crafted-green)]',
                'Social Media': 'from-[var(--crafted-forest)] to-[var(--crafted-green)]',
                'Landing Page': 'from-[var(--crafted-green-light)] to-[var(--crafted-forest)]',
              }
              const gradient = gradients[category] || 'from-gray-500 to-gray-600'
              return (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category)
                    setSelectedOption(null)
                    setModalNotes('')
                    setPlatformSelections({})
                  }}
                  className="group relative flex flex-col items-center justify-center gap-1.5 w-[120px] h-[72px] rounded-lg overflow-hidden shadow-md hover:shadow-xl hover:scale-[1.04] active:scale-[0.97] transition-all duration-200 cursor-pointer shrink-0"
                >
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-90 group-hover:opacity-100 transition-opacity',
                      gradient
                    )}
                  />
                  <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                      backgroundSize: '128px 128px',
                    }}
                  />
                  <Icon className="relative z-10 h-5 w-5 text-white/90 drop-shadow-sm" />
                  <span className="relative z-10 text-white text-xs font-semibold leading-tight drop-shadow-md">
                    {category}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
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
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border border-border/30 shadow-2xl shadow-black/10 bg-card">
          {selectedCategory &&
            (() => {
              const category =
                TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES]
              const Icon = category?.icon

              return (
                <>
                  {/* Header */}
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-[var(--crafted-green)] flex items-center justify-center shrink-0">
                        {Icon && <Icon className="h-4.5 w-4.5 text-white" />}
                      </div>
                      <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                        {selectedCategory}
                      </DialogTitle>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed pl-12">
                      {category?.modalDescription}
                    </p>
                  </div>

                  {selectedCategory === 'Social Media' ? (
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
                          <input
                            type="text"
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
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
                            placeholder="Add any details or goals..."
                            className="w-full h-11 px-4 pr-28 rounded-lg border border-border/40 bg-card text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-[var(--crafted-green)]/20 focus:border-[var(--crafted-green)]/40 text-sm transition-all"
                          />
                          <button
                            onClick={() => {
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
                            }}
                            disabled={
                              Object.values(platformSelections).filter((v) => v.enabled).length ===
                              0
                            }
                            className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[var(--crafted-green)] hover:bg-[var(--crafted-forest)] disabled:bg-muted disabled:text-muted-foreground/40 text-white rounded-md font-medium text-sm transition-all duration-150 disabled:cursor-not-allowed"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Options List (non-Social Media categories) */}
                      <div className="px-5 pb-4 flex flex-col gap-2">
                        {category?.options.map((option) => {
                          const isSelected = selectedOption === option.title
                          return (
                            <button
                              key={option.title}
                              onClick={() => setSelectedOption(isSelected ? null : option.title)}
                              className={cn(
                                'group relative flex items-start gap-4 rounded-xl px-4 py-3.5 text-left transition-all duration-150 ring-1 ring-inset',
                                isSelected
                                  ? 'ring-[var(--crafted-green)] bg-[var(--crafted-green)]/[0.06] dark:bg-[var(--crafted-green)]/10 shadow-sm'
                                  : 'ring-black/[0.06] dark:ring-white/[0.06] hover:ring-[var(--crafted-green)]/40 hover:bg-[var(--crafted-green)]/[0.02]'
                              )}
                            >
                              {/* Icon */}
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-lg shrink-0 flex items-center justify-center transition-colors',
                                  isSelected
                                    ? 'bg-[var(--crafted-green)] text-white'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                <option.icon className="w-5 h-5" />
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pt-0.5">
                                <h3
                                  className={cn(
                                    'font-semibold text-sm leading-snug transition-colors',
                                    isSelected
                                      ? 'text-[var(--crafted-forest)] dark:text-[var(--crafted-sage)]'
                                      : 'text-foreground'
                                  )}
                                >
                                  {option.title}
                                </h3>
                                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                                  {option.description}
                                </p>
                              </div>
                              {/* Radio indicator */}
                              <div
                                className={cn(
                                  'mt-1 w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-150',
                                  isSelected
                                    ? 'border-[var(--crafted-green)] bg-[var(--crafted-green)]'
                                    : 'border-black/15 dark:border-white/20 group-hover:border-[var(--crafted-green)]/50'
                                )}
                              >
                                {isSelected && (
                                  <div className="w-[6px] h-[6px] rounded-full bg-white" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Notes + Continue */}
                      <div className="px-5 pb-5 pt-1 border-t border-border/20">
                        <div className="relative mt-3">
                          <input
                            type="text"
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && selectedOption) {
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
                            placeholder="Add any specific details or requirements..."
                            className="w-full h-11 px-4 pr-28 rounded-lg border border-border/40 bg-card text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-[var(--crafted-green)]/20 focus:border-[var(--crafted-green)]/40 text-sm transition-all"
                          />
                          <button
                            onClick={() => {
                              if (selectedOption) {
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
                            disabled={!selectedOption}
                            className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[var(--crafted-green)] hover:bg-[var(--crafted-forest)] disabled:bg-muted disabled:text-muted-foreground/40 text-white rounded-md font-medium text-sm transition-all duration-150 disabled:cursor-not-allowed"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )
            })()}
        </DialogContent>
      </Dialog>

      {/* Inspiration Gallery - Grouped by Content Type */}
      {styleReferences.length > 0 && (
        <div className="relative w-full pt-8">
          {/* Explore divider - editorial style */}
          <div className="flex items-center gap-4 max-w-7xl mx-auto px-4 sm:px-6 mb-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-border/60" />
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Explore styles
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-border/60" />
          </div>

          {/* Grouped Masonry Grid */}
          <div className="relative pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              {/* Show skeleton while loading */}
              {isLoadingStyles ? (
                <MasonryGridSkeleton count={15} columns={5} showHeader={true} />
              ) : (
                /* Group references by contentCategory */
                (() => {
                  const groups = styleReferences.reduce(
                    (acc, ref) => {
                      const group = ref.contentCategory || 'other'
                      if (!acc[group]) acc[group] = []
                      acc[group].push(ref)
                      return acc
                    },
                    {} as Record<string, StyleReference[]>
                  )

                  const groupLabels: Record<string, { label: string; icon: string }> = {
                    instagram_post: {
                      label: 'Popular Instagram posts',
                      icon: '📱',
                    },
                    instagram_story: {
                      label: 'Popular Instagram stories',
                      icon: '📲',
                    },
                    instagram_reel: {
                      label: 'Popular Instagram reels',
                      icon: '🎬',
                    },
                    linkedin_post: {
                      label: 'Popular LinkedIn posts',
                      icon: '💼',
                    },
                    linkedin_banner: {
                      label: 'Popular LinkedIn banners',
                      icon: '🖼️',
                    },
                    static_ad: { label: 'Popular static ads', icon: '🎯' },
                    facebook_ad: { label: 'Popular Facebook ads', icon: '👥' },
                    twitter_post: {
                      label: 'Popular Twitter posts',
                      icon: '🐦',
                    },
                    youtube_thumbnail: {
                      label: 'Popular YouTube thumbnails',
                      icon: '▶️',
                    },
                    email_header: {
                      label: 'Popular email headers',
                      icon: '📧',
                    },
                    web_banner: { label: 'Popular web banners', icon: '🌐' },
                    presentation_slide: {
                      label: 'Popular presentation slides',
                      icon: '📊',
                    },
                    video_ad: { label: 'Popular video ads', icon: '🎥' },
                    other: { label: 'More inspiration', icon: '💡' },
                  }

                  const orderedGroups = [
                    'instagram_post',
                    'instagram_story',
                    'linkedin_post',
                    'static_ad',
                    'facebook_ad',
                    'instagram_reel',
                    'twitter_post',
                    'youtube_thumbnail',
                    'linkedin_banner',
                    'email_header',
                    'web_banner',
                    'presentation_slide',
                    'video_ad',
                    'other',
                  ]

                  return orderedGroups.map((groupKey, groupIndex) => {
                    const allRefs = groups[groupKey]
                    if (!allRefs || allRefs.length === 0) return null

                    // Limit to 15 items per category for cleaner display
                    const refs = allRefs.slice(0, 15)
                    const { label, icon } = groupLabels[groupKey] || {
                      label: groupKey,
                      icon: '📌',
                    }

                    return (
                      <div key={groupKey} className={groupIndex > 0 ? 'mt-12' : ''}>
                        {/* Group Header */}
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-base">{icon}</span>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
                            {label}
                          </h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {allRefs.length} {allRefs.length === 1 ? 'style' : 'styles'}
                          </span>
                        </div>
                        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                          {refs.map((ref) => {
                            const variantUrls = getImageVariantUrls(ref.imageUrl)
                            return (
                              <div
                                key={ref.id}
                                className="break-inside-avoid rounded-2xl overflow-hidden ring-1 ring-black/[0.04] shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                              >
                                <ImageWithSkeleton
                                  src={variantUrls.preview}
                                  alt={ref.name}
                                  className="w-full"
                                  skeletonClassName="bg-muted/30 min-h-[150px]"
                                  loading="lazy"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>

            {/* Fade overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-10" />
          </div>
        </div>
      )}

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
      <Skeleton className="h-28 w-full max-w-[640px] rounded-2xl mb-3" />
      <Skeleton className="h-3.5 w-64 mx-auto mb-6" />
      <div className="flex gap-2 flex-wrap justify-center">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-30 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
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
