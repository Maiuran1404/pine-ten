'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Globe,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Phone,
  Quote,
  Check,
  X,
  Swords,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandData, Audience, TabId } from '../_lib/brand-types'

interface BrandPreviewProps {
  brand: BrandData
  audiences: Audience[]
  activeTab: TabId
}

const previewAnimation = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
}

function CompanyPreview({ brand }: { brand: BrandData }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
      <div className="p-6 flex items-center gap-4 border-b border-border">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt=""
            className="w-14 h-14 rounded-xl object-contain bg-muted border border-border"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `${brand.primaryColor || '#4a7c4a' /* --crafted-green */}20`,
            }}
          >
            <span
              className="text-xl font-bold"
              style={{ color: brand.primaryColor || '#4a7c4a' /* --crafted-green */ }}
            >
              {brand.name?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-lg truncate">
            {brand.name || 'Your Company'}
          </h3>
          {brand.tagline && (
            <p className="text-sm text-muted-foreground truncate">{brand.tagline}</p>
          )}
        </div>
      </div>
      <div className="p-6">
        {brand.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {brand.description}
          </p>
        )}
        {brand.industry && (
          <div className="mt-4 flex gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
              {brand.industry}
            </span>
            {brand.industryArchetype && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border capitalize">
                {brand.industryArchetype}
              </span>
            )}
          </div>
        )}
      </div>
      {brand.website && (
        <div className="px-6 py-3 border-t border-border">
          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            {brand.website.replace(/^https?:\/\//, '')}
          </span>
        </div>
      )}
    </div>
  )
}

function ColorsPreview({ brand }: { brand: BrandData }) {
  const colors = [
    { label: 'Primary', value: brand.primaryColor },
    { label: 'Secondary', value: brand.secondaryColor },
    { label: 'Accent', value: brand.accentColor },
    { label: 'Background', value: brand.backgroundColor },
    { label: 'Text', value: brand.textColor },
  ].filter((c) => c.value)

  return (
    <div className="space-y-4 w-full max-w-md">
      {/* Swatches */}
      <div className="grid grid-cols-5 gap-3">
        {colors.map(({ label, value }) => (
          <div key={label} className="text-center">
            <div
              className="w-full aspect-square rounded-xl border border-border shadow-sm"
              style={{ backgroundColor: value || '#6366f1' }}
            />
            <span className="text-xs text-muted-foreground mt-1.5 block">{label}</span>
          </div>
        ))}
      </div>

      {/* Mini UI mockup */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
        <div
          className="h-12 flex items-center px-4"
          style={{ backgroundColor: brand.primaryColor || '#4a7c4a' /* --crafted-green */ }}
        >
          <span className="text-white text-sm font-medium">{brand.name || 'Preview'}</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div
              className="h-8 px-4 rounded-lg flex items-center"
              style={{ backgroundColor: brand.primaryColor || '#4a7c4a' /* --crafted-green */ }}
            >
              <span className="text-white text-xs">Primary</span>
            </div>
            <div
              className="h-8 px-4 rounded-lg flex items-center border-2"
              style={{ borderColor: brand.secondaryColor || '#3b82f6' }}
            >
              <span className="text-xs" style={{ color: brand.secondaryColor || '#3b82f6' }}>
                Secondary
              </span>
            </div>
            <div
              className="h-8 px-4 rounded-lg flex items-center"
              style={{ backgroundColor: `${brand.accentColor || '#8b5cf6'}20` }}
            >
              <span className="text-xs" style={{ color: brand.accentColor || '#8b5cf6' }}>
                Accent
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[brand.primaryColor, brand.secondaryColor].map((color, i) => (
              <div
                key={i}
                className="h-16 rounded-lg p-3"
                style={{ backgroundColor: `${color || '#4a7c4a' /* --crafted-green */}15` }}
              >
                <div
                  className="w-5 h-5 rounded mb-2"
                  style={{ backgroundColor: color || '#4a7c4a' /* --crafted-green */ }}
                />
                <div className="h-1.5 bg-muted-foreground/20 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
        {brand.brandColors.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex gap-2">
            {brand.brandColors.slice(0, 6).map((color, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypographyPreview({ brand }: { brand: BrandData }) {
  // Load Google Fonts for preview
  useEffect(() => {
    const fonts = [brand.primaryFont, brand.secondaryFont, brand.headingFont].filter(
      Boolean
    ) as string[]
    fonts.forEach((font) => {
      const encoded = encodeURIComponent(font)
      const id = `google-font-preview-${encoded}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`
      document.head.appendChild(link)
    })
  }, [brand.primaryFont, brand.secondaryFont, brand.headingFont])

  const hasDesignTokens =
    brand.fontSizes || brand.fontWeights || brand.spacingUnit || brand.borderRadius

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card p-6 space-y-6">
        {/* Display/Heading font specimen (if different from primary) */}
        {brand.headingFont && brand.headingFont !== brand.primaryFont && (
          <>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Display Font
              </span>
              <div
                className="mt-2 space-y-1"
                style={{ fontFamily: brand.headingFont || 'inherit' }}
              >
                <p className="text-3xl font-bold text-foreground">Aa Bb Cc</p>
                <p className="text-xl font-semibold text-foreground">The quick brown fox</p>
              </div>
              <span className="text-xs text-muted-foreground mt-2 block font-mono">
                {brand.headingFont}
              </span>
            </div>
            <div className="border-t border-border" />
          </>
        )}

        {/* Heading font specimen */}
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Heading Font
          </span>
          <div className="mt-2 space-y-1" style={{ fontFamily: brand.primaryFont || 'inherit' }}>
            <p className="text-3xl font-bold text-foreground">Aa Bb Cc</p>
            <p className="text-xl font-semibold text-foreground">The quick brown fox</p>
            <p className="text-base font-medium text-muted-foreground">jumps over the lazy dog</p>
          </div>
          <span className="text-xs text-muted-foreground mt-2 block font-mono">
            {brand.primaryFont || 'System default'}
          </span>
        </div>

        <div className="border-t border-border" />

        {/* Body font specimen */}
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Body Font</span>
          <div className="mt-2 space-y-1" style={{ fontFamily: brand.secondaryFont || 'inherit' }}>
            <p className="text-lg text-foreground">Aa Bb Cc</p>
            <p className="text-base text-foreground leading-relaxed">
              The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
            </p>
            <p className="text-sm text-muted-foreground">0123456789 !@#$%^&*()</p>
          </div>
          <span className="text-xs text-muted-foreground mt-2 block font-mono">
            {brand.secondaryFont || 'System default'}
          </span>
        </div>

        {/* Design tokens */}
        {hasDesignTokens && (
          <>
            <div className="border-t border-border" />
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Design Tokens
              </span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {brand.fontSizes?.h1 && (
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <span className="text-[10px] text-muted-foreground uppercase">H1</span>
                    <p className="text-sm font-medium text-foreground">{brand.fontSizes.h1}</p>
                  </div>
                )}
                {brand.fontSizes?.h2 && (
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <span className="text-[10px] text-muted-foreground uppercase">H2</span>
                    <p className="text-sm font-medium text-foreground">{brand.fontSizes.h2}</p>
                  </div>
                )}
                {brand.fontSizes?.body && (
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <span className="text-[10px] text-muted-foreground uppercase">Body</span>
                    <p className="text-sm font-medium text-foreground">{brand.fontSizes.body}</p>
                  </div>
                )}
                {brand.spacingUnit && (
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <span className="text-[10px] text-muted-foreground uppercase">Spacing</span>
                    <p className="text-sm font-medium text-foreground">{brand.spacingUnit}px</p>
                  </div>
                )}
                {brand.borderRadius && (
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <span className="text-[10px] text-muted-foreground uppercase">Radius</span>
                    <p className="text-sm font-medium text-foreground">{brand.borderRadius}</p>
                  </div>
                )}
                {brand.fontWeights?.bold && (
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <span className="text-[10px] text-muted-foreground uppercase">Bold</span>
                    <p className="text-sm font-medium text-foreground">{brand.fontWeights.bold}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Keywords */}
      {brand.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {brand.keywords.map((kw, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-xs border border-primary/20 bg-primary/10 text-primary"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const SOCIAL_ICONS = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
} as const

function SocialPreview({ brand }: { brand: BrandData }) {
  const socialEntries = Object.entries(brand.socialLinks || {}).filter(
    ([, url]) => url && url.trim()
  )

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
        {/* Profile header */}
        <div
          className="h-20 relative"
          style={{
            background: `linear-gradient(135deg, ${brand.primaryColor || '#4a7c4a' /* --crafted-green */}, ${brand.secondaryColor || '#3b82f6'})`,
          }}
        />
        <div className="px-6 -mt-8 pb-4">
          <div className="flex items-end gap-4">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt=""
                className="w-16 h-16 rounded-xl object-contain bg-card border-4 border-card shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-card border-4 border-card shadow-sm flex items-center justify-center">
                <span
                  className="text-xl font-bold"
                  style={{ color: brand.primaryColor || '#4a7c4a' /* --crafted-green */ }}
                >
                  {brand.name?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              </div>
            )}
          </div>
          <h3 className="font-semibold text-foreground mt-3">{brand.name || 'Your Company'}</h3>
          {brand.tagline && <p className="text-sm text-muted-foreground">{brand.tagline}</p>}
        </div>

        {/* Contact info */}
        {(brand.contactEmail || brand.contactPhone) && (
          <div className="px-6 py-3 border-t border-border space-y-2">
            {brand.contactEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{brand.contactEmail}</span>
              </div>
            )}
            {brand.contactPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{brand.contactPhone}</span>
              </div>
            )}
          </div>
        )}

        {/* Social links */}
        {socialEntries.length > 0 && (
          <div className="px-6 py-3 border-t border-border">
            <div className="flex gap-3">
              {socialEntries.map(([key]) => {
                const Icon = SOCIAL_ICONS[key as keyof typeof SOCIAL_ICONS]
                return Icon ? (
                  <div
                    key={key}
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AudiencesPreview({ audiences }: { audiences: Audience[] }) {
  if (audiences.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm">No audiences identified yet</div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {audiences.slice(0, 3).map((audience) => (
        <div
          key={audience.id}
          className={cn(
            'rounded-xl border p-4',
            audience.isPrimary ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground text-sm">{audience.name}</span>
              {audience.isPrimary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  Primary
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{audience.confidence}%</span>
          </div>
          {/* Confidence bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                audience.isPrimary ? 'bg-primary' : 'bg-muted-foreground/40'
              )}
              style={{ width: `${audience.confidence}%` }}
            />
          </div>
          {audience.psychographics?.painPoints && audience.psychographics.painPoints.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
              {audience.psychographics.painPoints[0]}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function PositioningPreview({ brand }: { brand: BrandData }) {
  const positioning = brand.positioning
  if (!positioning?.uvp && !positioning?.differentiators?.length) {
    return <div className="text-center text-muted-foreground text-sm">No positioning data yet</div>
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* UVP Card */}
      {positioning?.uvp && (
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Value Proposition
          </span>
          <p className="text-base text-foreground mt-2 leading-relaxed font-medium">
            {positioning.uvp}
          </p>
        </div>
      )}

      {/* Mission */}
      {positioning?.missionStatement && (
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Mission</span>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {positioning.missionStatement}
          </p>
        </div>
      )}

      {/* Differentiator chips */}
      {positioning?.differentiators && positioning.differentiators.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {positioning.differentiators.map((d, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full text-xs border border-primary/20 bg-primary/10 text-primary font-medium"
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function VoicePreview({ brand }: { brand: BrandData }) {
  const voice = brand.brandVoice
  if (!voice?.brandPromise && !voice?.toneDoList?.length && !voice?.toneDontList?.length) {
    return <div className="text-center text-muted-foreground text-sm">No voice guidelines yet</div>
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Brand promise quote */}
      {voice?.brandPromise && (
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card p-6">
          <Quote className="w-5 h-5 text-muted-foreground/40 mb-2" />
          <p className="text-base text-foreground italic leading-relaxed">{voice.brandPromise}</p>
          <span className="text-xs text-muted-foreground mt-3 block uppercase tracking-wider">
            Brand Promise
          </span>
        </div>
      )}

      {/* Tone do/don't columns */}
      {voice?.toneDoList?.length || voice?.toneDontList?.length ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Do column */}
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-xs font-medium text-crafted-green uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              Do
            </span>
            <ul className="mt-2 space-y-1.5">
              {(voice?.toneDoList || []).slice(0, 4).map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Don't column */}
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-xs font-medium text-destructive uppercase tracking-wider flex items-center gap-1.5">
              <X className="w-3 h-3" />
              Don&apos;t
            </span>
            <ul className="mt-2 space-y-1.5">
              {(voice?.toneDontList || []).slice(0, 4).map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Messaging pillars */}
      {voice?.messagingPillars && voice.messagingPillars.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {voice.messagingPillars.map((pillar, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-xs border border-primary/20 bg-primary/10 text-primary"
            >
              {pillar}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function CompetitorsPreview({ brand }: { brand: BrandData }) {
  const competitors = brand.competitors || []
  if (competitors.length === 0) {
    return <div className="text-center text-muted-foreground text-sm">No competitors added yet</div>
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {competitors.slice(0, 4).map((competitor, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground text-sm truncate">
              {competitor.name || `Competitor ${i + 1}`}
            </span>
          </div>
          {competitor.positioning && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {competitor.positioning}
            </p>
          )}
          <div className="flex gap-4">
            {competitor.strengths && (
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-crafted-green uppercase tracking-wider font-medium">
                  Strengths
                </span>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {competitor.strengths}
                </p>
              </div>
            )}
            {competitor.weaknesses && (
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-destructive uppercase tracking-wider font-medium">
                  Weaknesses
                </span>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {competitor.weaknesses}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BrandPreview({ brand, audiences, activeTab }: BrandPreviewProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const previewContent = (
    <AnimatePresence mode="wait">
      <motion.div key={activeTab} {...previewAnimation} className="w-full flex justify-center">
        {activeTab === 'company' && <CompanyPreview brand={brand} />}
        {activeTab === 'colors' && <ColorsPreview brand={brand} />}
        {activeTab === 'typography' && <TypographyPreview brand={brand} />}
        {activeTab === 'social' && <SocialPreview brand={brand} />}
        {activeTab === 'audiences' && <AudiencesPreview audiences={audiences} />}
        {activeTab === 'positioning' && <PositioningPreview brand={brand} />}
        {activeTab === 'voice' && <VoicePreview brand={brand} />}
        {activeTab === 'competitors' && <CompetitorsPreview brand={brand} />}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <>
      {/* Desktop preview */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-accent dark:bg-muted border-l border-border items-center justify-center p-8 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${
              brand.primaryColor || '#4a7c4a' /* --crafted-green */
            }08 0%, transparent 50%)`,
          }}
        />
        <div className="relative z-10 w-full max-w-md">
          {previewContent}
          <motion.p
            className="text-center text-muted-foreground text-sm mt-6 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4" />
            Live preview updates as you type
          </motion.p>
        </div>
      </div>

      {/* Mobile collapsible preview */}
      <div className="lg:hidden border-t border-border">
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full flex items-center justify-between px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Preview
          </span>
          {mobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {mobileExpanded && <div className="px-6 pb-6 bg-muted">{previewContent}</div>}
      </div>
    </>
  )
}
