'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { toast } from 'sonner'
import {
  type BrandData,
  type OnboardingStep,
  type OnboardingRoute,
  type BrandDirection,
  defaultBrandData,
  ROUTE_A_STEPS,
  ROUTE_B_STEPS,
} from '@/components/onboarding/types'
import { useSubdomain } from '@/hooks/use-subdomain'
import { BRAND_COLOR_STEPS } from '@/app/(auth)/onboarding/_constants/brand-color-steps'

export function useOnboardingState() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const portal = useSubdomain()
  const { data: session, isPending, refetch: refetchSession } = useSession()

  // Restore state from sessionStorage on mount
  const getInitialState = useCallback(() => {
    if (typeof window === 'undefined') return { route: null, step: 'welcome' as OnboardingStep }

    // Coming from brand page reset — start fresh
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset') === 'true') {
      sessionStorage.removeItem('onboarding-state')
      return { route: null, step: 'welcome' as OnboardingStep }
    }

    try {
      const saved = sessionStorage.getItem('onboarding-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        let restoredStep = (parsed.step || 'welcome') as OnboardingStep
        // Don't restore transient steps — they need an active process running
        if (restoredStep === 'scanning') {
          restoredStep = 'brand-input'
        }
        return {
          route: parsed.route || null,
          step: restoredStep,
        }
      }
    } catch {
      // Ignore parse errors
    }
    return { route: null, step: 'welcome' as OnboardingStep }
  }, [])

  const initialState = getInitialState()
  const [route, setRoute] = useState<OnboardingRoute | null>(initialState.route)
  const [step, setStep] = useState<OnboardingStep>(initialState.step)
  const [brandData, setBrandData] = useState<BrandData>(defaultBrandData)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [brandDirections, setBrandDirections] = useState<BrandDirection[]>([])
  const [selectedDirection, setSelectedDirection] = useState<BrandDirection | null>(null)
  const [isGeneratingDirections, setIsGeneratingDirections] = useState(false)
  const [showingCompletionScreen, setShowingCompletionScreen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Save state to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && step !== 'welcome') {
      sessionStorage.setItem('onboarding-state', JSON.stringify({ route, step }))
    }
  }, [route, step])

  // Clear sessionStorage when onboarding is completed
  const clearOnboardingState = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('onboarding-state')
    }
  }, [])

  const scanningTexts = [
    'Studying colors and type',
    'Reading tone and language',
    'Noticing layout patterns',
    'Learning your visual style',
  ]

  // Compute sphere colors based on brand data for steps after brand extraction
  // Must be defined here before any early returns to follow Rules of Hooks
  const sphereColors = useMemo((): [string, string, string] | undefined => {
    if (BRAND_COLOR_STEPS.includes(step)) {
      const colors = [
        brandData.primaryColor,
        brandData.secondaryColor,
        brandData.accentColor,
      ].filter(Boolean)
      if (colors.length >= 2) {
        return [
          colors[0] || '#3b82f6',
          colors[1] || colors[0] || '#8b5cf6',
          colors[2] || colors[1] || colors[0] || '#f59e0b',
        ] as [string, string, string]
      }
    }
    return undefined
  }, [step, brandData.primaryColor, brandData.secondaryColor, brandData.accentColor])

  // Force session refresh when arriving from a brand reset so the stale
  // Better Auth cookie cache (~5min TTL) is replaced with fresh DB state.
  // Without this, session.user.onboardingCompleted would remain `true` for
  // up to 5 minutes after the reset API set it to `false`.
  const isReset = searchParams.get('reset') === 'true'
  useEffect(() => {
    if (isReset) {
      refetchSession().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  // Handle redirects
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
      return
    }

    // Skip redirect if we're intentionally showing the completion screen
    if (showingCompletionScreen) {
      return
    }

    // Skip redirect if coming from brand page reset — session cache may be stale
    // (refetchSession above will correct this, but the first render may still
    // see the stale value before the refetch completes)
    if (isReset) {
      return
    }

    const user = session?.user as { onboardingCompleted?: boolean; role?: string } | undefined
    if (user?.onboardingCompleted) {
      router.push('/dashboard')
    }
  }, [session, isPending, router, showingCompletionScreen, isReset])

  // Brand extraction
  const handleBrandExtraction = async () => {
    if (!websiteUrl.trim()) return

    setStep('scanning')
    setIsLoading(true)
    setScanProgress(0)

    // Animate progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 500)

    try {
      if (websiteUrl.trim()) {
        const response = await fetch('/api/brand/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl }),
        })

        const result = await response.json()

        if (!response.ok) {
          // API returned an error - show error message and go back
          clearInterval(progressInterval)
          const errorMessage =
            (typeof result.error === 'string' ? result.error : result.error?.message) ||
            'Failed to extract brand information from this website.'
          toast.error(errorMessage)
          setStep('brand-input')
          setIsLoading(false)
          return
        }

        if (result.data) {
          setBrandData({
            ...brandData,
            ...result.data,
            website: websiteUrl,
          })
        }
      }

      clearInterval(progressInterval)
      setScanProgress(100)

      await new Promise((resolve) => setTimeout(resolve, 500))
      setStep('brand-dna-reveal')
    } catch (error) {
      console.error('Extraction error:', error)
      toast.error('Failed to extract brand. Please try again.')
      setStep('brand-input')
    } finally {
      clearInterval(progressInterval)
      setIsLoading(false)
    }
  }

  // Generate brand directions for Route B
  const generateBrandDirections = useCallback(async () => {
    setIsGeneratingDirections(true)
    setStep('ai-directions')

    // Simulate AI generation - in production, call your AI endpoint
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate directions based on user preferences
    const directions: BrandDirection[] = [
      {
        id: '1',
        name: 'Modern Confidence',
        narrative: `A confident, forward-thinking identity designed for ${
          brandData.targetAudience || 'your audience'
        } who value clarity and precision.`,
        colorPalette: ['#f5f5f5', '#3b82f6', '#1a1a1a', '#64748b', '#0ea5e9'],
        colorNames: ['Cloud White', 'Electric Blue', 'Midnight', 'Steel Gray', 'Sky Blue'],
        typographyStyle: 'modern',
        primaryFont: 'Inter',
        secondaryFont: 'DM Sans',
        visualStyle: 'Clean, geometric, with bold accents',
        moodKeywords: ['Professional', 'Trustworthy', 'Modern', 'Clean'],
      },
      {
        id: '2',
        name: 'Warm Innovation',
        narrative:
          'An approachable feel that balances warmth with innovation. Perfect for building genuine connections.',
        colorPalette: ['#c8d69b', '#f6e6a5', '#3971b8', '#fbfcee', '#343b1b'],
        colorNames: ['Tea Green', 'Vanilla', 'Celtic Blue', 'Ivory', 'Dark Brown'],
        typographyStyle: 'bold',
        primaryFont: 'Poppins',
        secondaryFont: 'Lato',
        visualStyle: 'Rounded, warm, inviting',
        moodKeywords: ['Friendly', 'Innovative', 'Approachable', 'Dynamic'],
      },
      {
        id: '3',
        name: 'Refined Elegance',
        narrative:
          'Sophisticated and premium, communicating quality and meticulous attention to detail.',
        colorPalette: ['#fafaf9', '#a78bfa', '#18181b', '#78716c', '#e4e4e7'],
        colorNames: ['Pearl White', 'Soft Violet', 'Onyx', 'Warm Stone', 'Silver Mist'],
        typographyStyle: 'elegant',
        primaryFont: 'Cormorant Garamond',
        secondaryFont: 'Outfit',
        visualStyle: 'Minimal, luxurious, refined',
        moodKeywords: ['Premium', 'Elegant', 'Sophisticated', 'Quality'],
      },
    ]

    setBrandDirections(directions)
    setIsGeneratingDirections(false)
  }, [brandData.targetAudience])

  // Save onboarding data
  const handleSaveOnboarding = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client',
          data: {
            brand: brandData,
            hasWebsite: !!websiteUrl.trim(),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          typeof errorData.error === 'string'
            ? errorData.error
            : errorData.message || 'Failed to save onboarding'
        console.error('Onboarding API error:', errorMessage, errorData)
        throw new Error(errorMessage)
      }

      // Set flag before navigating to prevent auto-redirect
      setShowingCompletionScreen(true)
      clearOnboardingState()
      setIsExiting(true)
      // Refetch session in background — don't block navigation
      refetchSession().catch(() => {})
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (error) {
      console.error('Save error:', error)
      const message = error instanceof Error ? error.message : 'Failed to save. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    clearOnboardingState()
    setIsExiting(true)
    // Wait for exit animation to complete before navigating
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  // Route selection handler
  const handleRouteSelect = (selectedRoute: OnboardingRoute) => {
    setRoute(selectedRoute)
    if (selectedRoute === 'existing') {
      setStep('brand-input')
    } else {
      setStep('brand-intent')
    }
  }

  // Direction selection handler (updates brandData with direction colors/fonts)
  const handleSelectDirection = (dir: BrandDirection) => {
    setSelectedDirection(dir)
    setBrandData({
      ...brandData,
      selectedDirection: dir,
      primaryColor: dir.colorPalette[0],
      secondaryColor: dir.colorPalette[1],
      accentColor: dir.colorPalette[2],
      backgroundColor: dir.colorPalette[3],
      primaryFont: dir.primaryFont,
      secondaryFont: dir.secondaryFont,
    })
  }

  // Derived state
  const isFreelancerOnboarding =
    searchParams.get('type') === 'freelancer' || portal.type === 'artist'
  const userEmail = session?.user?.email || undefined
  const currentSteps = route === 'existing' ? ROUTE_A_STEPS : ROUTE_B_STEPS

  return {
    // Auth state
    session,
    isPending,
    userEmail,
    isFreelancerOnboarding,

    // Navigation
    router,
    route,
    step,
    setStep,
    setRoute,
    currentSteps,

    // Brand data
    brandData,
    setBrandData,
    websiteUrl,
    setWebsiteUrl,

    // Loading / progress
    isLoading,
    scanProgress,
    scanningTexts,

    // Directions (Route B)
    brandDirections,
    selectedDirection,
    isGeneratingDirections,

    // Visual
    sphereColors,
    isExiting,

    // Handlers
    handleRouteSelect,
    handleBrandExtraction,
    generateBrandDirections,
    handleSaveOnboarding,
    handleComplete,
    handleSelectDirection,
  }
}
