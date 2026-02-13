/**
 * Custom hook for BrandReferenceScraper component.
 * Manages all data fetching, classification, upload, and scraping state.
 */
'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { parseUrls, parsePageUrls, fetchImageAsBase64 } from './brand-reference-scraper.utils'
import type {
  ToneBucket,
  EnergyBucket,
  DensityBucket,
  ColorBucket,
} from '@/lib/constants/reference-libraries'

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
    toneBucket: ToneBucket
    energyBucket: EnergyBucket
    densityBucket: DensityBucket
    colorBucket: ColorBucket
    colorSamples: string[]
    confidence: number
  }
  error?: string
}

interface UseBrandReferenceScraperDataOptions {
  onUploadComplete?: () => void
}

export function useBrandReferenceScraperData({
  onUploadComplete,
}: UseBrandReferenceScraperDataOptions = {}) {
  const [activeTab, setActiveTab] = useState<'urls' | 'scrape'>('urls')

  // URL Import state
  const [urlInput, setUrlInput] = useState('')

  // Page Scraper state
  const [pageUrl, setPageUrl] = useState('')
  const [pageUrls, setPageUrls] = useState('')
  const [isScrapingPage, setIsScrapingPage] = useState(false)
  const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, currentUrl: '' })
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [useFirecrawl, setUseFirecrawl] = useState(false)
  const [minSize, setMinSize] = useState('200')

  // Classification/Upload state
  const [classifiedImages, setClassifiedImages] = useState<ClassifiedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<'input' | 'select' | 'classify' | 'review'>('input')

  // Scrape a single page for images
  const scrapeSinglePage = useCallback(
    async (url: string): Promise<ScrapedImage[]> => {
      const response = await fetch('/api/admin/brand-references/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
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
      return data.images || []
    },
    [useFirecrawl, minSize]
  )

  // Scrape a page for images (single URL)
  const handleScrapePage = useCallback(async () => {
    if (!pageUrl) {
      toast.error('Please enter a URL')
      return
    }

    setIsScrapingPage(true)
    setScrapedImages([])
    setSelectedImages(new Set())
    setScrapeProgress({ current: 0, total: 1, currentUrl: pageUrl })

    try {
      const images = await scrapeSinglePage(pageUrl)
      setScrapedImages(images)

      if (images.length === 0) {
        toast.error('No images found on this page')
      } else {
        toast.success(`Found ${images.length} images`)
        setStep('select')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scrape page')
    } finally {
      setIsScrapingPage(false)
      setScrapeProgress({ current: 0, total: 0, currentUrl: '' })
    }
  }, [pageUrl, scrapeSinglePage])

  // Scrape multiple pages for images (bulk)
  const handleBulkScrape = useCallback(async () => {
    const urls = parsePageUrls(pageUrls)
    if (urls.length === 0) {
      toast.error('No valid URLs found')
      return
    }

    setIsScrapingPage(true)
    setScrapedImages([])
    setSelectedImages(new Set())

    const allImages: ScrapedImage[] = []
    const seenUrls = new Set<string>()
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      setScrapeProgress({ current: i + 1, total: urls.length, currentUrl: url })

      try {
        const images = await scrapeSinglePage(url)
        for (const img of images) {
          if (!seenUrls.has(img.url)) {
            seenUrls.add(img.url)
            allImages.push(img)
          }
        }
        successCount++
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error)
        errorCount++
      }
    }

    setScrapedImages(allImages)
    setIsScrapingPage(false)
    setScrapeProgress({ current: 0, total: 0, currentUrl: '' })

    if (allImages.length === 0) {
      toast.error('No images found from any of the pages')
    } else {
      toast.success(
        `Found ${allImages.length} unique images from ${successCount} pages${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
      )
      setStep('select')
    }
  }, [pageUrls, scrapeSinglePage])

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

    const batchSize = 3
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)

      setClassifiedImages((prev) =>
        prev.map((img) => (batch.includes(img.url) ? { ...img, status: 'classifying' } : img))
      )

      await Promise.all(
        batch.map(async (url) => {
          try {
            const { base64, mediaType } = await fetchImageAsBase64(url)

            const response = await fetch('/api/admin/brand-references/import-urls', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: [{ url, base64, mediaType }] }),
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
          } catch (error) {
            setClassifiedImages((prev) =>
              prev.map((img) =>
                img.url === url
                  ? {
                      ...img,
                      status: 'error',
                      error: error instanceof Error ? error.message : 'Network error',
                    }
                  : img
              )
            )
          }
        })
      )

      setProgress((Math.min(i + batchSize, urls.length) / urls.length) * 100)
    }

    setIsProcessing(false)
    setStep('review')
  }, [activeTab, urlInput, selectedImages])

  // Update classification for an image
  const updateClassification = useCallback((url: string, field: string, value: string) => {
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
  }, [])

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

    const batchSize = 2
    for (let i = 0; i < toUpload.length; i += batchSize) {
      const batch = toUpload.slice(i, i + batchSize)

      setClassifiedImages((prev) =>
        prev.map((item) =>
          batch.some((b) => b.url === item.url) ? { ...item, status: 'uploading' } : item
        )
      )

      await Promise.all(
        batch.map(async (img) => {
          try {
            const { base64, mediaType } = await fetchImageAsBase64(img.url)

            const response = await fetch('/api/admin/brand-references/import-urls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: [
                  {
                    url: img.url,
                    base64,
                    mediaType,
                    classification: img.classification,
                  },
                ],
              }),
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
          } catch (error) {
            setClassifiedImages((prev) =>
              prev.map((item) =>
                item.url === img.url
                  ? {
                      ...item,
                      status: 'error',
                      error: error instanceof Error ? error.message : 'Network error',
                    }
                  : item
              )
            )
            errorCount++
          }
        })
      )

      setProgress((Math.min(i + batchSize, toUpload.length) / toUpload.length) * 100)
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
    setPageUrls('')
    setScrapedImages([])
    setSelectedImages(new Set())
    setClassifiedImages([])
    setProgress(0)
    setScrapeProgress({ current: 0, total: 0, currentUrl: '' })
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

    // Page scraper
    pageUrl,
    setPageUrl,
    pageUrls,
    setPageUrls,
    isScrapingPage,
    scrapeProgress,
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
    handleScrapePage,
    handleBulkScrape,
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
