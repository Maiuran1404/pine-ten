'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrandPage } from './_hooks/use-brand-page'
import { BrandHeader } from './_components/brand-header'
import { BrandTabs } from './_components/brand-tabs'
import { CompanyTab } from './_components/company-tab'
import { ColorsTab } from './_components/colors-tab'
import { TypographyTab } from './_components/typography-tab'
import { SocialTab } from './_components/social-tab'
import { AudiencesTab } from './_components/audiences-tab'
import { PositioningTab } from './_components/positioning-tab'
import { VoiceTab } from './_components/voice-tab'
import { CompetitorsTab } from './_components/competitors-tab'
import { BrandPreview } from './_components/brand-preview'
import type { TabId } from './_lib/brand-types'

export default function BrandPage() {
  const [activeTab, setActiveTab] = useState<TabId>('company')
  const {
    brand,
    audiences,
    isLoading,
    isSaving,
    isRescanning,
    isDeepScanning,
    isEnrichingCompetitors,
    isExtractingPdf,
    copiedColor,
    hasChanges,
    tabCompletionStatus,
    overallCompletion,
    updateField,
    addBrandColor,
    removeBrandColor,
    handleSave,
    handleRescan,
    handleDeepScan,
    handleEnrichCompetitors,
    handleExtractPdf,
    handleRedoOnboarding,
    isResettingOnboarding,
    handleDeleteAudience,
    handleSetPrimaryAudience,
    copyColor,
  } = useBrandPage()

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-base font-semibold text-foreground">My Brand</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">No Brand Set Up</h3>
            <p className="text-muted-foreground">Complete onboarding to set up your brand.</p>
            <Button
              onClick={handleRedoOnboarding}
              disabled={isResettingOnboarding}
              className="mt-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isResettingOnboarding ? 'Resetting...' : 'Set Up Brand'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background relative overflow-hidden">
      {/* Curtain light effect */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none opacity-60 dark:opacity-100"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            color-mix(in srgb, var(--crafted-green) 8%, transparent) 0%,
            color-mix(in srgb, var(--crafted-green) 4%, transparent) 20%,
            color-mix(in srgb, var(--crafted-green) 2%, transparent) 40%,
            color-mix(in srgb, var(--crafted-green) 1%, transparent) 60%,
            transparent 80%
          )`,
          filter: 'blur(40px)',
        }}
      />

      <BrandHeader
        brand={brand}
        overallCompletion={overallCompletion}
        hasChanges={hasChanges}
        isSaving={isSaving}
        isRescanning={isRescanning}
        isDeepScanning={isDeepScanning}
        isExtractingPdf={isExtractingPdf}
        onSave={handleSave}
        onRescan={handleRescan}
        onDeepScan={handleDeepScan}
        onExtractPdf={handleExtractPdf}
        onRedoOnboarding={handleRedoOnboarding}
      />

      <div className="relative z-10 flex flex-col md:flex-row min-h-full">
        {/* Left: nav rail */}
        <div className="hidden md:block px-4 pt-6">
          <BrandTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabCompletionStatus={tabCompletionStatus}
          />
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden px-4 pt-4">
          <BrandTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabCompletionStatus={tabCompletionStatus}
          />
        </div>

        {/* Center: form content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'company' && <CompanyTab brand={brand} updateField={updateField} />}
              {activeTab === 'colors' && (
                <ColorsTab
                  brand={brand}
                  copiedColor={copiedColor}
                  updateField={updateField}
                  addBrandColor={addBrandColor}
                  removeBrandColor={removeBrandColor}
                  copyColor={copyColor}
                />
              )}
              {activeTab === 'typography' && (
                <TypographyTab brand={brand} updateField={updateField} />
              )}
              {activeTab === 'social' && <SocialTab brand={brand} updateField={updateField} />}
              {activeTab === 'audiences' && (
                <AudiencesTab
                  audiences={audiences}
                  onDelete={handleDeleteAudience}
                  onSetPrimary={handleSetPrimaryAudience}
                />
              )}
              {activeTab === 'positioning' && (
                <PositioningTab brand={brand} updateField={updateField} />
              )}
              {activeTab === 'voice' && <VoiceTab brand={brand} updateField={updateField} />}
              {activeTab === 'competitors' && (
                <CompetitorsTab
                  brand={brand}
                  updateField={updateField}
                  onEnrichCompetitors={handleEnrichCompetitors}
                  isEnrichingCompetitors={isEnrichingCompetitors}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: preview */}
        <BrandPreview brand={brand} audiences={audiences} activeTab={activeTab} />
      </div>
    </div>
  )
}
