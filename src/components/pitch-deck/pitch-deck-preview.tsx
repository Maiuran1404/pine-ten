'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideCover } from './slides/slide-cover'
import { SlideToc } from './slides/slide-toc'
import { SlideAbout } from './slides/slide-about'
import { SlideProjectDetails } from './slides/slide-project-details'
import { SlideOverview } from './slides/slide-overview'
import { SlideScope } from './slides/slide-scope'
import { SlideTimeline } from './slides/slide-timeline'
import { SlidePricing } from './slides/slide-pricing'
import { SlideBackCover } from './slides/slide-back-cover'

const SLIDE_NAMES = [
  'Cover',
  'Contents',
  'About',
  'Project Details',
  'Overview',
  'Scope',
  'Timeline',
  'Pricing',
  'Back Cover',
]

interface PitchDeckPreviewProps {
  data: PitchDeckFormData
  activeSlide: number
  onSlideChange: (index: number) => void
}

export function PitchDeckPreview({ data, activeSlide, onSlideChange }: PitchDeckPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)

  const calculateScale = useCallback(() => {
    if (!containerRef.current) return
    const containerWidth = containerRef.current.offsetWidth - 32
    // Reserve ~140px for navigation + thumbnail strip below the preview
    const containerHeight = containerRef.current.offsetHeight - 140
    const scaleByWidth = containerWidth / 1920
    const scaleByHeight = containerHeight / 1080
    setScale(Math.max(0.15, Math.min(scaleByWidth, scaleByHeight) * 0.75))
  }, [])

  useEffect(() => {
    calculateScale()
    const observer = new ResizeObserver(calculateScale)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [calculateScale])

  const combinedBlackLogo = '/craftedcombintedblack.png'
  const figureWhiteLogo = '/craftedfigurewhite.png'

  const slides = [
    <SlideCover key="cover" data={data} figureLogoSrc={figureWhiteLogo} />,
    <SlideToc key="toc" />,
    <SlideAbout key="about" data={data} logoSrc={combinedBlackLogo} />,
    <SlideProjectDetails key="project" data={data} logoSrc={combinedBlackLogo} />,
    <SlideOverview key="overview" data={data} logoSrc={combinedBlackLogo} />,
    <SlideScope key="scope" data={data} logoSrc={combinedBlackLogo} />,
    <SlideTimeline key="timeline" data={data} logoSrc={combinedBlackLogo} />,
    <SlidePricing key="pricing" data={data} logoSrc={combinedBlackLogo} />,
    <SlideBackCover key="back" data={data} logoSrc={combinedBlackLogo} />,
  ]

  return (
    <div ref={containerRef} className="flex flex-col gap-4 h-full">
      {/* Main preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-muted/30 rounded-lg p-4">
        <div
          style={{
            width: 1920 * scale,
            height: 1080 * scale,
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: 1920,
              height: 1080,
            }}
          >
            {slides[activeSlide]}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSlideChange(Math.max(0, activeSlide - 1))}
          disabled={activeSlide === 0}
          className="cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm text-muted-foreground">
          Slide {activeSlide + 1} / {slides.length} — {SLIDE_NAMES[activeSlide]}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onSlideChange(Math.min(slides.length - 1, activeSlide + 1))}
          disabled={activeSlide === slides.length - 1}
          className="cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-1">
        {slides.map((slide, i) => (
          <button
            key={i}
            onClick={() => onSlideChange(i)}
            className="cursor-pointer flex-shrink-0 rounded overflow-hidden transition-all"
            style={{
              width: 120,
              height: 67.5,
              position: 'relative',
              border: i === activeSlide ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              opacity: i === activeSlide ? 1 : 0.6,
            }}
          >
            <div
              style={{
                transform: 'scale(0.0625)',
                transformOrigin: 'top left',
                width: 1920,
                height: 1080,
                pointerEvents: 'none',
              }}
            >
              {slide}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
