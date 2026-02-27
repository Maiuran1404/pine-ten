'use client'

import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '@/components/shared/loading'
import { InfiniteGrid } from '@/components/ui/infinite-grid-integration'
import { FreelancerOnboarding } from '@/components/onboarding/freelancer-onboarding'

// Shared components
import { Header } from '@/app/(auth)/onboarding/_components/shared/header'
import { ProgressIndicator } from '@/app/(auth)/onboarding/_components/shared/progress-indicator'
import { WelcomeScreen } from '@/app/(auth)/onboarding/_components/shared/welcome-screen'
import { CreativeFocusStep } from '@/app/(auth)/onboarding/_components/shared/creative-focus-step'
import { BrandReadyStep } from '@/app/(auth)/onboarding/_components/shared/brand-ready-step'

// Route A components
import { BrandInputStep } from '@/app/(auth)/onboarding/_components/route-a/brand-input-step'
import { ScanningStep } from '@/app/(auth)/onboarding/_components/route-a/scanning-step'
import { BrandDNARevealStep } from '@/app/(auth)/onboarding/_components/route-a/brand-dna-reveal-step'
import { BrandCardPreviewPanel } from '@/app/(auth)/onboarding/_components/route-a/brand-card-preview-panel'
import { FineTuneStep } from '@/app/(auth)/onboarding/_components/route-a/fine-tune-step'

// Route B components
import { BrandIntentStep } from '@/app/(auth)/onboarding/_components/route-b/brand-intent-step'
import { BrandPersonalityStep } from '@/app/(auth)/onboarding/_components/route-b/brand-personality-step'
import { VisualInstinctStep } from '@/app/(auth)/onboarding/_components/route-b/visual-instinct-step'
import { AIDirectionsStep } from '@/app/(auth)/onboarding/_components/route-b/ai-directions-step'
import { MoodPreviewPanel } from '@/app/(auth)/onboarding/_components/route-b/mood-preview-panel'

// State hook
import { useOnboardingState } from '@/app/(auth)/onboarding/_hooks/use-onboarding-state'

function OnboardingContent() {
  const {
    session,
    isPending,
    userEmail,
    isFreelancerOnboarding,
    router,
    route,
    step,
    setStep,
    setRoute,
    currentSteps,
    brandData,
    setBrandData,
    websiteUrl,
    setWebsiteUrl,
    isLoading,
    scanProgress,
    scanningTexts,
    brandDirections,
    selectedDirection,
    isGeneratingDirections,
    sphereColors,
    isExiting,
    handleRouteSelect,
    handleBrandExtraction,
    generateBrandDirections,
    handleSaveOnboarding,
    handleComplete,
    handleSelectDirection,
  } = useOnboardingState()

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (isFreelancerOnboarding) {
    return (
      <FreelancerOnboarding
        onComplete={() => {
          router.push('/portal')
        }}
      />
    )
  }

  return (
    <motion.div
      className="min-h-dvh relative flex flex-col lg:flex-row items-center overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-background"
      style={{
        fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <InfiniteGrid
        gridSize={50}
        speedX={0.3}
        speedY={0.3}
        spotlightRadius={250}
        backgroundOpacity={0.03}
        highlightOpacity={0.15}
        showBlurSpheres={true}
        sphereColors={sphereColors}
        className="!fixed inset-0"
      />
      <Header userEmail={userEmail} />

      <main className="relative z-10 px-4 sm:px-6 py-20 sm:py-16 mx-auto lg:mx-0 lg:ml-[10%] w-full max-w-2xl">
        {step !== 'welcome' && step !== 'scanning' && step !== 'complete' && (
          <div className="mb-6">
            <ProgressIndicator steps={currentSteps} currentStep={step} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <WelcomeScreen onSelectRoute={handleRouteSelect} />
            </motion.div>
          )}

          {step === 'brand-input' && (
            <motion.div
              key="brand-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BrandInputStep
                websiteUrl={websiteUrl}
                setWebsiteUrl={setWebsiteUrl}
                onContinue={handleBrandExtraction}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ScanningStep progress={scanProgress} scanningTexts={scanningTexts} />
            </motion.div>
          )}

          {step === 'brand-dna-reveal' && (
            <motion.div
              key="brand-dna-reveal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BrandDNARevealStep
                brandData={brandData}
                setBrandData={setBrandData}
                onAdjust={(field) => console.log('Adjust:', field)}
                onContinue={() => setStep('fine-tune')}
                onBack={() => setStep('brand-input')}
              />
            </motion.div>
          )}

          {step === 'fine-tune' && (
            <motion.div
              key="fine-tune"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FineTuneStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={() => setStep('creative-focus')}
                onBack={() =>
                  route === 'existing' ? setStep('brand-dna-reveal') : setStep('brand-personality')
                }
              />
            </motion.div>
          )}

          {step === 'creative-focus' && (
            <motion.div
              key="creative-focus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CreativeFocusStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={handleSaveOnboarding}
                onBack={() => setStep(route === 'create' ? 'ai-directions' : 'fine-tune')}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === 'brand-ready' && (
            <motion.div
              key="brand-ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <BrandReadyStep brandData={brandData} onComplete={handleComplete} />
            </motion.div>
          )}

          {step === 'brand-intent' && (
            <motion.div
              key="brand-intent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BrandIntentStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={() => setStep('brand-personality')}
                onBack={() => {
                  setRoute(null)
                  setStep('welcome')
                }}
              />
            </motion.div>
          )}

          {step === 'brand-personality' && (
            <motion.div
              key="brand-personality"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BrandPersonalityStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={() => setStep('visual-instinct')}
                onBack={() => setStep('brand-intent')}
              />
            </motion.div>
          )}

          {step === 'visual-instinct' && (
            <motion.div
              key="visual-instinct"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <VisualInstinctStep
                brandData={brandData}
                setBrandData={setBrandData}
                onContinue={generateBrandDirections}
                onBack={() => setStep('brand-personality')}
              />
            </motion.div>
          )}

          {step === 'ai-directions' && (
            <motion.div
              key="ai-directions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AIDirectionsStep
                brandData={brandData}
                directions={brandDirections}
                selectedDirection={selectedDirection}
                onSelectDirection={handleSelectDirection}
                onContinue={() => setStep('creative-focus')}
                onBack={() => setStep('visual-instinct')}
                isGenerating={isGeneratingDirections}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="relative z-10 flex-1 h-full hidden lg:flex items-center justify-center pr-[10%]">
        <AnimatePresence mode="wait">
          {step === 'brand-dna-reveal' && (
            <BrandCardPreviewPanel key="brand-card-preview" brandData={brandData} />
          )}
          {step === 'fine-tune' && <MoodPreviewPanel key="mood-preview" brandData={brandData} />}
        </AnimatePresence>
      </div>

      <footer className="relative lg:absolute bottom-0 lg:bottom-6 left-0 right-0 text-center text-[10px] sm:text-xs text-white/30 py-4 lg:py-0 px-4">
        <p>&copy; {new Date().getFullYear()} Crafted. All rights reserved.</p>
      </footer>
    </motion.div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
