/**
 * Custom hook for DeliverableStyleScraper component.
 * Manages all data fetching, classification, upload, and scraping state.
 */
'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { parseUrls, parseDribbbleUrls } from './deliverable-style-scraper.utils'
import type { DeliverableType, StyleAxis } from '@/lib/constants/reference-libraries'

interface ScrapedImage {
  url: string
  alt?: string
  width?: number
  height?: number
  source: 'img' | 'og' | 'meta' | 'background'
}

interface ClassifiedImage {
  url: string
  status: 'pending' | 'classifying' | 'classified' | 'uploading' | 'done' | 'error'
  classification?: {
    name: string
    description: string
    deliverableType: DeliverableType
    styleAxis: StyleAxis
    subStyle: string | null
    semanticTags: string[]
    confidence: number
    colorTemperature?: string
    energyLevel?: string
    densityLevel?: string
    formalityLevel?: string
    colorSamples?: string[]
    industries?: string[]
    targetAudience?: string
    visualElements?: string[]
    moodKeywords?: string[]
  }
  error?: string
}

interface DribbbleResult {
  dribbbleUrl: string
  cdnUrl: string | null
  success: boolean
  imported?: {
    id: string
    name: string
    imageUrl: string
    deliverableType: string
    styleAxis: string
  }
  error?: string
  skipped?: boolean
  skipReason?: string
}

interface UseDeliverableStyleScraperDataOptions {
  onUploadComplete?: () => void
}

export function useDeliverableStyleScraperData({
  onUploadComplete,
}: UseDeliverableStyleScraperDataOptions = {}) {
  const [activeTab, setActiveTab] = useState<'urls' | 'scrape' | 'dribbble'>('urls')

  // URL Import state
  const [urlInput, setUrlInput] = useState('')

  // Dribbble Import state
  const [dribbbleInput, setDribbbleInput] = useState('')
  const [isDribbbleProcessing, setIsDribbbleProcessing] = useState(false)
  const [dribbbleDryRun, setDribbbleDryRun] = useState(false)
  const [dribbbleResults, setDribbbleResults] = useState<DribbbleResult[]>([])
  const [dribbbleSummary, setDribbbleSummary] = useState<{
    total: number
    successful: number
    skipped: number
    failed: number
    invalidUrls: number
    remaining: number
  } | null>(null)

  // Page Scraper state
  const [pageUrl, setPageUrl] = useState('')
  const [isScrapingPage, setIsScrapingPage] = useState(false)
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [useFirecrawl, setUseFirecrawl] = useState(false)
  const [minSize, setMinSize] = useState('200')

  // Classification/Upload state
  const [classifiedImages, setClassifiedImages] = useState<ClassifiedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<'input' | 'select' | 'classify' | 'review'>('input')

  // Handle Dribbble import
  const handleDribbbleImport = useCallback(async () => {
    const urls = parseDribbbleUrls(dribbbleInput)
    if (urls.length === 0) {
      toast.error('No valid Dribbble shot URLs found')
      return
    }

    setIsDribbbleProcessing(true)
    setDribbbleResults([])
    setDribbbleSummary(null)

    try {
      const response = await fetch('/api/admin/deliverable-styles/scrape-dribbble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          dryRun: dribbbleDryRun,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process Dribbble URLs')
      }

      const data = await response.json()
      setDribbbleResults(data.results || [])
      setDribbbleSummary(data.summary || null)

      if (!dribbbleDryRun) {
        const successCount = data.summary?.successful || 0
        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} design reference(s)`)
          onUploadComplete?.()
        }
        if (data.summary?.failed > 0) {
          toast.error(`Failed to import ${data.summary.failed} URL(s)`)
        }
      } else {
        toast.success(
          `Dry run complete. Found ${data.results?.length || 0} images ready for import.`
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process Dribbble URLs')
    } finally {
      setIsDribbbleProcessing(false)
    }
  }, [dribbbleInput, dribbbleDryRun, onUploadComplete])

  // Reset Dribbble state
  const handleDribbbleReset = useCallback(() => {
    setDribbbleInput('')
    setDribbbleResults([])
    setDribbbleSummary(null)
    setDribbbleDryRun(false)
  }, [])

  // Scrape a page for images
  const handleScrapePage = useCallback(async () => {
    if (!pageUrl) {
      toast.error('Please enter a URL')
      return
    }

    setIsScrapingPage(true)
    setScrapedImages([])
    setSelectedImages(new Set())

    try {
      const response = await fetch('/api/admin/deliverable-styles/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: pageUrl,
          useFirecrawl,
          minSize: parseInt(minSize) || 200,
          limit: 100,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to scrape page')
      }

      const data = await response.json()
      setScrapedImages(data.images)

      if (data.images.length === 0) {
        toast.error('No images found on this page')
      } else {
        toast.success(`Found ${data.images.length} images`)
        setStep('select')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scrape page')
    } finally {
      setIsScrapingPage(false)
    }
  }, [pageUrl, useFirecrawl, minSize])

  // Toggle image selection
  const toggleImageSelection = useCallback((url: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(url)) {
        newSet.delete(url)
      } else {
        newSet.add(url)
      }
      return newSet
    })
  }, [])

  // Select all images
  const selectAllImages = useCallback(() => {
    setSelectedImages(new Set(scrapedImages.map((img) => img.url)))
  }, [scrapedImages])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedImages(new Set())
  }, [])

  // Start classification process
  const handleStartClassification = useCallback(async () => {
    let urls: string[] = []

    if (activeTab === 'urls') {
      urls = parseUrls(urlInput)
      if (urls.length === 0) {
        toast.error('No valid URLs found')
        return
      }
    } else {
      urls = Array.from(selectedImages)
      if (urls.length === 0) {
        toast.error('Please select at least one image')
        return
      }
    }

    setClassifiedImages(urls.map((url) => ({ url, status: 'pending' })))
    setStep('classify')
    setIsProcessing(true)
    setProgress(0)

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]

      setClassifiedImages((prev) =>
        prev.map((img) => (img.url === url ? { ...img, status: 'classifying' } : img))
      )

      try {
        const response = await fetch('/api/admin/deliverable-styles/import-urls', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        })

        const data = await response.json()
        const result = data.results?.[0]

        if (result?.success) {
          setClassifiedImages((prev) =>
            prev.map((img) =>
              img.url === url
                ? { ...img, status: 'classified', classification: result.classification }
                : img
            )
          )
        } else {
          setClassifiedImages((prev) =>
            prev.map((img) =>
              img.url === url
                ? { ...img, status: 'error', error: result?.error || 'Classification failed' }
                : img
            )
          )
        }
      } catch {
        setClassifiedImages((prev) =>
          prev.map((img) =>
            img.url === url ? { ...img, status: 'error', error: 'Network error' } : img
          )
        )
      }

      setProgress(((i + 1) / urls.length) * 100)
    }

    setIsProcessing(false)
    setStep('review')
  }, [activeTab, urlInput, selectedImages])

  // Update classification for an image
  const updateClassification = useCallback(
    (url: string, field: string, value: string | string[]) => {
      setClassifiedImages((prev) =>
        prev.map((img) =>
          img.url === url && img.classification
            ? {
                ...img,
                classification: {
                  ...img.classification,
                  [field]: value,
                },
              }
            : img
        )
      )
    },
    []
  )

  // Upload all classified images
  const handleUploadAll = useCallback(async () => {
    const toUpload = classifiedImages.filter((img) => img.status === 'classified')

    if (toUpload.length === 0) {
      toast.error('No images to upload')
      return
    }

    setIsProcessing(true)
    setProgress(0)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < toUpload.length; i++) {
      const img = toUpload[i]

      setClassifiedImages((prev) =>
        prev.map((item) => (item.url === img.url ? { ...item, status: 'uploading' } : item))
      )

      try {
        const response = await fetch('/api/admin/deliverable-styles/import-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [img.url] }),
        })

        const data = await response.json()
        const result = data.results?.[0]

        if (result?.success) {
          setClassifiedImages((prev) =>
            prev.map((item) => (item.url === img.url ? { ...item, status: 'done' } : item))
          )
          successCount++
        } else {
          setClassifiedImages((prev) =>
            prev.map((item) =>
              item.url === img.url
                ? { ...item, status: 'error', error: result?.error || 'Upload failed' }
                : item
            )
          )
          errorCount++
        }
      } catch {
        setClassifiedImages((prev) =>
          prev.map((item) =>
            item.url === img.url ? { ...item, status: 'error', error: 'Network error' } : item
          )
        )
        errorCount++
      }

      setProgress(((i + 1) / toUpload.length) * 100)
    }

    setIsProcessing(false)

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} images`)
      onUploadComplete?.()
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} images`)
    }
  }, [classifiedImages, onUploadComplete])

  // Remove an image from the list
  const removeImage = useCallback((url: string) => {
    setClassifiedImages((prev) => prev.filter((img) => img.url !== url))
  }, [])

  // Reset to start
  const handleReset = useCallback(() => {
    setStep('input')
    setUrlInput('')
    setPageUrl('')
    setScrapedImages([])
    setSelectedImages(new Set())
    setClassifiedImages([])
    setProgress(0)
  }, [])

  const classifiedCount = classifiedImages.filter((img) => img.status === 'classified').length
  const doneCount = classifiedImages.filter((img) => img.status === 'done').length
  const errorCount = classifiedImages.filter((img) => img.status === 'error').length

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // URL import
    urlInput,
    setUrlInput,

    // Dribbble
    dribbbleInput,
    setDribbbleInput,
    isDribbbleProcessing,
    dribbbleDryRun,
    setDribbbleDryRun,
    dribbbleResults,
    dribbbleSummary,

    // Page scraper
    pageUrl,
    setPageUrl,
    isScrapingPage,
    scrapedImages,
    selectedImages,
    useFirecrawl,
    setUseFirecrawl,
    minSize,
    setMinSize,

    // Classification/Upload
    classifiedImages,
    isProcessing,
    progress,
    step,

    // Computed counts
    classifiedCount,
    doneCount,
    errorCount,

    // Handlers
    handleDribbbleImport,
    handleDribbbleReset,
    handleScrapePage,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    handleStartClassification,
    updateClassification,
    handleUploadAll,
    removeImage,
    handleReset,
  }
}
