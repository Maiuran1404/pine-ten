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
    isResettingOnboarding,
    copiedColor,
    hasChanges,
    updateField,
    addBrandColor,
    removeBrandColor,
    handleSave,
    handleRescan,
    handleRedoOnboarding,
    handleDeleteAudience,
    handleSetPrimaryAudience,
    copyColor,
  } = useBrandPage()

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <Skeleton className="h-7 w-32" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <h1 className="text-xl font-semibold text-foreground">My Brand</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">No Brand Set Up</h3>
            <p className="text-muted-foreground">Complete onboarding to set up your brand.</p>
            <Button
              onClick={() => {
                fetch('/api/brand/reset-onboarding', { method: 'POST' }).catch(() => {})
                window.location.href = '/onboarding'
              }}
              className="mt-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Set Up Brand
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background relative overflow-hidden">
      {/* Curtain light effect - only visible in dark mode */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            rgba(13, 148, 136, 0.08) 0%,
            rgba(13, 148, 136, 0.04) 20%,
            rgba(13, 148, 136, 0.02) 40%,
            rgba(13, 148, 136, 0.01) 60%,
            transparent 80%
          )`,
          filter: 'blur(40px)',
        }}
      />

      <BrandHeader
        hasWebsite={!!brand.website}
        hasChanges={hasChanges}
        isSaving={isSaving}
        isRescanning={isRescanning}
        onSave={handleSave}
        onRescan={handleRescan}
      />

      <div className="relative z-10 flex flex-col lg:flex-row min-h-full">
        {/* Left side - Form */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:max-w-2xl">
          <BrandTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {activeTab === 'company' && (
                <CompanyTab
                  brand={brand}
                  isResettingOnboarding={isResettingOnboarding}
                  updateField={updateField}
                  onRedoOnboarding={handleRedoOnboarding}
                />
              )}
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right side - Preview */}
        <BrandPreview brand={brand} audiences={audiences} activeTab={activeTab} />
      </div>
    </div>
  )
}
