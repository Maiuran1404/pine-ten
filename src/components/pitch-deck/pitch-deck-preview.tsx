'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideCover } from './slides/slide-cover'
import { SlideAbout } from './slides/slide-about'
import { SlideServices } from './slides/slide-services'
import { SlideProjectDetails } from './slides/slide-project-details'
import { SlideOverview } from './slides/slide-overview'
import { SlideScope } from './slides/slide-scope'
import { SlideTimeline } from './slides/slide-timeline'
import { SlidePricing } from './slides/slide-pricing'
import { SlideBackCover } from './slides/slide-back-cover'

const SLIDE_NAMES = [
  'Cover',
  'About',
  'Services',
  'Project',
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
    const newScale = Math.min(containerWidth / 1920, 0.55)
    setScale(newScale)
  }, [])

  useEffect(() => {
    calculateScale()
    const observer = new ResizeObserver(calculateScale)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [calculateScale])

  const slides = [
    <SlideCover key="cover" data={data} logoSrc="/craftedcombinedwhite.png" />,
    <SlideAbout key="about" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlideServices key="services" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlideProjectDetails key="project" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlideOverview key="overview" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlideScope key="scope" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlideTimeline key="timeline" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlidePricing key="pricing" data={data} logoSrc="/craftedfigurewhite.png" />,
    <SlideBackCover key="back" data={data} logoSrc="/craftedcombinedwhite.png" />,
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
