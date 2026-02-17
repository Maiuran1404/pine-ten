'use client'

import { motion } from 'framer-motion'
import { Layout, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  BrowserChrome,
  WireframeLabel,
  ImagePlaceholder,
  TextLines,
  ButtonShape,
  CircleIcon,
  NavBar,
  BlockRect,
  CheckRow,
  ChevronBar,
  QuoteGlyph,
} from '@/components/chat/wireframe'
import type { LayoutSection } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface LayoutPreviewProps {
  sections: LayoutSection[]
  className?: string
}

// =============================================================================
// SECTION KEYWORD MATCHING
// =============================================================================

type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'cta'
  | 'footer'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'fallback'

function detectSectionType(sectionName: string): SectionType {
  const name = sectionName.toLowerCase()

  if (/hero|header/.test(name)) return 'hero'
  if (/features?|benefits?/.test(name)) return 'features'
  if (/social\s*proof|testimonials?/.test(name)) return 'testimonials'
  if (/cta|call[\s-]*to[\s-]*action/.test(name)) return 'cta'
  if (/footer/.test(name)) return 'footer'
  if (/pricing/.test(name)) return 'pricing'
  if (/faq/.test(name)) return 'faq'
  if (/gallery|portfolio/.test(name)) return 'gallery'

  return 'fallback'
}

// =============================================================================
// SECTION WIREFRAME RENDERERS
// =============================================================================

function HeroBlock() {
  return (
    <div className="space-y-3 p-4">
      <NavBar />
      <ImagePlaceholder className="h-28 w-full" />
      <TextLines lines={2} widths={[80, 55]} size="lg" />
      <ButtonShape width="w-24" />
    </div>
  )
}

function FeaturesBlock() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <CircleIcon size="lg" />
          <TextLines lines={3} widths={[90, 70, 50]} size="sm" />
        </div>
      ))}
    </div>
  )
}

function TestimonialsBlock() {
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <QuoteGlyph className="text-3xl" />
      <TextLines lines={2} widths={[75, 55]} size="sm" className="w-3/4" />
      <CircleIcon size="sm" className="mt-1" />
    </div>
  )
}

function CtaBlock() {
  return (
    <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 border-y border-slate-300 dark:border-slate-600 py-5 px-4">
      <ButtonShape width="w-28" />
    </div>
  )
}

function FooterBlock() {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <BlockRect key={i} className="w-4 h-4" />
          ))}
        </div>
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <TextLines key={i} lines={3} widths={[100, 80, 60]} size="sm" className="w-12" />
          ))}
        </div>
      </div>
    </div>
  )
}

function PricingBlock() {
  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden"
        >
          <div className="h-4 bg-slate-200 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600" />
          <div className="p-2 space-y-1.5">
            <CheckRow />
            <CheckRow />
            <CheckRow />
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqBlock() {
  return (
    <div className="space-y-1.5 p-4">
      {[1, 2, 3, 4].map((i) => (
        <ChevronBar key={i} />
      ))}
    </div>
  )
}

function GalleryBlock() {
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {[1, 2, 3, 4].map((i) => (
        <ImagePlaceholder key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

function FallbackBlock({ sectionName }: { sectionName: string }) {
  return (
    <div className="relative p-4">
      <div className="h-16 w-full border rounded-sm border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <span className="text-[9px] text-slate-400 dark:text-slate-500">{sectionName}</span>
      </div>
    </div>
  )
}

// =============================================================================
// SECTION WIREFRAME DISPATCHER
// =============================================================================

function renderSectionWireframe(type: SectionType, sectionName: string) {
  switch (type) {
    case 'hero':
      return <HeroBlock />
    case 'features':
      return <FeaturesBlock />
    case 'testimonials':
      return <TestimonialsBlock />
    case 'cta':
      return <CtaBlock />
    case 'footer':
      return <FooterBlock />
    case 'pricing':
      return <PricingBlock />
    case 'faq':
      return <FaqBlock />
    case 'gallery':
      return <GalleryBlock />
    case 'fallback':
      return <FallbackBlock sectionName={sectionName} />
  }
}

// =============================================================================
// SECTION BLOCK
// =============================================================================

function SectionBlock({ section, index }: { section: LayoutSection; index: number }) {
  const type = detectSectionType(section.sectionName)
  const tooltip = [section.purpose, section.contentGuidance].filter(Boolean).join(' — ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="relative"
      title={tooltip}
    >
      {/* Label */}
      <div className="absolute top-1.5 left-1.5 z-10">
        <WireframeLabel>{section.sectionName}</WireframeLabel>
      </div>

      {/* Divider between sections */}
      {index > 0 && (
        <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
      )}

      {/* Wireframe content */}
      {renderSectionWireframe(type, section.sectionName)}
    </motion.div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function LayoutEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Layers className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Layout preview will appear here</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Section-by-section breakdown with purpose and content guidance
      </p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LayoutPreview({ sections, className }: LayoutPreviewProps) {
  if (sections.length === 0) {
    return <LayoutEmpty />
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layout className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Page Layout</span>
        <Badge variant="secondary" className="text-xs">
          {sections.length} {sections.length === 1 ? 'section' : 'sections'}
        </Badge>
      </div>

      {/* Figma-style browser wireframe */}
      <BrowserChrome>
        {sortedSections.map((section, index) => (
          <SectionBlock key={section.order} section={section} index={index} />
        ))}
      </BrowserChrome>
    </div>
  )
}
