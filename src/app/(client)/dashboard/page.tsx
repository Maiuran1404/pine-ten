'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithSkeleton, MasonryGridSkeleton } from '@/components/ui/skeletons'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreditPurchaseDialog } from '@/components/shared/credit-purchase-dialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/loading'
import { useSession } from '@/lib/auth-client'
import { getImageVariantUrls } from '@/lib/image/utils'
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
        image:
          'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Feature Highlight',
        description:
          'A focused video that showcases a specific feature or capability of my product. Great for explaining complex functionality in a digestible way.',
        prompt: 'Create a feature highlight video',
        image:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'App Walkthrough',
        description:
          'A clear, guided tour of my app or software showing the user journey from start to finish. Ideal for onboarding and tutorials.',
        prompt: 'Create an app walkthrough video',
        image:
          'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop&q=80',
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
        image:
          'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Sales Deck',
        description:
          'A persuasive presentation built for closing deals. Features benefit-focused messaging and clear calls to action.',
        prompt: 'Create a sales presentation deck',
        image:
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Company Overview',
        description:
          'A versatile introduction to my company that works for partners, clients, and new team members.',
        prompt: 'Design a company overview presentation',
        image:
          'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400&h=300&fit=crop&q=80',
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
        image:
          'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Logo Design',
        description:
          'A custom logo crafted for my brand, including primary logo, wordmark, and icon variations.',
        prompt: 'Design a logo for my brand',
        image:
          'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Brand Refresh',
        description:
          'Modernize and elevate my existing brand while maintaining recognition with updated visual elements.',
        prompt: 'Refresh and modernize my existing brand',
        image:
          'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop&q=80',
      },
    ],
  },
  'Social Media': {
    icon: Share2,
    description: 'Ads, content & video edits',
    modalDescription:
      "Select the content type and platform. Share my goals and any assets, and we'll create scroll-stopping content.",
    options: [
      {
        title: 'Instagram Post',
        description:
          'Eye-catching static posts designed for maximum engagement in the 4:5 feed format.',
        prompt: 'Create Instagram post designs',
        image:
          'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Instagram Story',
        description:
          'Vertical 9:16 content optimized for Stories with interactive elements and dynamic layouts.',
        prompt: 'Create Instagram story designs',
        image:
          'https://images.unsplash.com/photo-1585247226801-bc613c441316?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Instagram Reels',
        description:
          'Short-form vertical video content designed to capture attention in the first second.',
        prompt: 'Create an Instagram Reels video',
        image:
          'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'LinkedIn Content',
        description:
          'Professional content designed for B2B engagement including carousels and thought leadership.',
        prompt: 'Create LinkedIn content',
        image:
          'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Video Edit',
        description:
          'Transform raw footage into polished, platform-ready content with professional editing.',
        prompt: 'Edit my video footage for social media',
        image:
          'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Ad Creatives',
        description:
          'Performance-focused ad designs for Meta, TikTok, Google with A/B testing variations.',
        prompt: 'Create social media ad creatives',
        image:
          'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&h=300&fit=crop&q=80',
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
        image:
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'SaaS Landing Page',
        description:
          'A modern page built for software products with feature highlights, pricing, social proof, and sign-up flows.',
        prompt: 'Design a SaaS landing page',
        image:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Event Landing Page',
        description:
          'A dynamic page for events, launches, or campaigns with countdown timers, speaker bios, and registration.',
        prompt: 'Design an event landing page',
        image:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop&q=80',
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
  const [tasksForReview, setTasksForReview] = useState<
    { id: string; title: string; description: string }[]
  >([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

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
      .catch(console.error)

    // Fetch brand-matched style references (increased limit for all categories)
    setIsLoadingStyles(true)
    fetch('/api/style-references/match?limit=150')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setStyleReferences(data.data)
        }
      })
      .catch(console.error)
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
      <style jsx>{`
        @keyframes float1 {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          33% {
            transform: translate(3%, 5%) rotate(1deg) scale(1.02);
          }
          66% {
            transform: translate(-2%, 3%) rotate(-0.5deg) scale(0.99);
          }
        }
        @keyframes float2 {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          33% {
            transform: translate(-4%, -3%) rotate(-1deg) scale(1.01);
          }
          66% {
            transform: translate(2%, -5%) rotate(0.5deg) scale(1.03);
          }
        }
        @keyframes float3 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(5%, 2%) scale(1.04);
          }
        }
        @keyframes float4 {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(-3%, 4%) rotate(0.5deg);
          }
          50% {
            transform: translate(1%, -2%) rotate(-0.5deg);
          }
          75% {
            transform: translate(4%, 1%) rotate(0.3deg);
          }
        }
        @keyframes float5 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-2%, 3%) scale(1.02);
            opacity: 1;
          }
        }
      `}</style>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Base warm tone */}
        <div className="absolute inset-0 bg-[#f5f3ec] dark:bg-[#0b0d0f]" />

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
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
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

      {/* Submitting loading overlay */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              {/* Animated logo/icon */}
              <div className="relative mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </motion.div>
                </motion.div>

                {/* Pulsing ring */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl bg-emerald-500"
                />
              </div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Creating your request
                </h2>
                <p className="text-sm text-muted-foreground">Setting things up for you...</p>
              </motion.div>

              {/* Animated dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-1.5 mt-6"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 rounded-full bg-emerald-500"
                  />
                ))}
              </motion.div>
            </div>
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

      {/* Main Content — vertically centered like Cardboard */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 min-h-[calc(100vh-3rem)] pb-12">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[780px] mb-3"
        >
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg shadow-black/[0.03] overflow-hidden">
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
                        className={`w-1.5 h-1.5 rounded-full ${
                          credits === 0
                            ? 'bg-red-500'
                            : credits <= 2
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                        }`}
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

        {/* Template Pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[640px] mt-4"
        >
          <p className="text-center text-xs text-muted-foreground/60 mb-3">
            or choose from one of these
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {Object.entries(TEMPLATE_CATEGORIES).map(([category, { icon: Icon }]) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setSelectedOption(null)
                  setModalNotes('')
                }}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-zinc-800/80 hover:border-border hover:shadow-sm active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                <span className="font-medium text-xs text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                  {category}
                </span>
              </button>
            ))}
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
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-2xl rounded-3xl border-0 shadow-2xl">
          {selectedCategory &&
            (() => {
              const category =
                TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES]
              const Icon = category?.icon
              const optionCount = category?.options.length || 0
              // Responsive grid: 1 col on mobile, 2-3 cols on larger screens
              // 6 options = 3 cols (2 rows), 3 options = 3 cols (1 row), 2 options = 2 cols
              const gridCols =
                optionCount >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
              return (
                <>
                  {/* Header */}
                  <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                        {Icon && <Icon className="h-5 w-5 text-white" />}
                      </div>
                      <DialogTitle className="text-lg font-semibold text-foreground">
                        {selectedCategory}
                      </DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground pl-[52px]">
                      {category?.modalDescription}
                    </p>
                  </div>

                  {/* Options Grid */}
                  <div className={`px-5 py-4 grid ${gridCols} gap-3`}>
                    {category?.options.map((option, index) => {
                      const isSelected = selectedOption === option.title
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedOption(isSelected ? null : option.title)}
                          className={`group relative flex flex-col rounded-xl transition-all duration-200 text-left border-2 h-full overflow-hidden ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                              : 'border-border/50 hover:border-emerald-500/40 hover:bg-muted/20'
                          }`}
                        >
                          {/* Image */}
                          <div className="relative w-full h-28 overflow-hidden bg-muted/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={option.image}
                              alt={option.title}
                              className={`w-full h-full object-cover transition-transform duration-300 ${
                                isSelected ? 'scale-105' : 'group-hover:scale-105'
                              }`}
                            />
                            {/* Gradient overlay for better text contrast */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            {/* Selection indicator */}
                            <div
                              className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 backdrop-blur-sm ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-white/60 bg-white/20'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
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
                          </div>
                          {/* Content */}
                          <div className="p-3 flex-1 flex flex-col">
                            <h3
                              className={`font-semibold text-sm mb-1.5 transition-colors ${
                                isSelected
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-foreground'
                              }`}
                            >
                              {option.title}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                              {option.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Notes Input Section */}
                  <div className="px-5 pb-5 pt-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={modalNotes}
                        onChange={(e) => setModalNotes(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && selectedOption) {
                            const option = category?.options.find((o) => o.title === selectedOption)
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
                        className="w-full h-12 px-4 pr-32 rounded-xl border border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-sm transition-all"
                      />
                      <button
                        onClick={() => {
                          if (selectedOption) {
                            const option = category?.options.find((o) => o.title === selectedOption)
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
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:bg-muted disabled:from-muted disabled:to-muted disabled:text-muted-foreground/50 text-white rounded-lg font-medium shadow-md shadow-emerald-500/25 transition-all duration-200 text-sm disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
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
