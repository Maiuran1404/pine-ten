'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Users,
  Linkedin,
  Instagram,
  Twitter,
  Palette,
  Paintbrush,
} from 'lucide-react'
import {
  type BrandData,
  type InferredAudience,
  VISUAL_STYLE_OPTIONS,
  BRAND_TONE_OPTIONS,
  FONT_OPTIONS,
} from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { EditorPanel } from '@/app/(auth)/onboarding/_components/shared/editor-panel'
import { SectionEditButton } from '@/app/(auth)/onboarding/_components/shared/section-edit-button'
import { useIsMobile } from '@/hooks/use-mobile'
import { BrandCardPreviewPanel } from '@/app/(auth)/onboarding/_components/route-a/brand-card-preview-panel'

export function BrandDNARevealStep({
  brandData,
  onAdjust: _onAdjust,
  onContinue,
  onBack,
  setBrandData,
}: {
  brandData: BrandData
  onAdjust: (field: string) => void
  onContinue: () => void
  onBack: () => void
  setBrandData: (data: BrandData) => void
}) {
  // Inline section editing - each section can be edited independently
  const [editingSection, setEditingSection] = useState<
    'name' | 'colors' | 'typography' | 'style' | 'tone' | null
  >(null)
  const [editingColor, setEditingColor] = useState<'primary' | 'secondary' | 'accent' | null>(null)
  const [editingAudienceIndex, setEditingAudienceIndex] = useState<number | null>(null)
  const [showAddAudience, setShowAddAudience] = useState(false)
  const [newAudienceName, setNewAudienceName] = useState('')
  const [newAudienceType, setNewAudienceType] = useState<'b2b' | 'b2c'>('b2b')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  // Track which logo URL failed so we auto-retry when URL changes
  const [logoErrorUrl, setLogoErrorUrl] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Derive logoError from whether current URL matches the failed URL
  const logoUrl = brandData.logoUrl || brandData.faviconUrl
  const logoError = logoUrl ? logoUrl === logoErrorUrl : false

  // Derive active editing color — null when not in colors section
  const _activeEditingColor = editingSection === 'colors' ? editingColor : null

  // Derive initial style and tone from feel values if not explicitly set
  const getInitialVisualStyle = () => {
    if (brandData.visualStyle) return brandData.visualStyle
    const val = brandData.feelBoldMinimal
    if (val < 30) return 'bold-impactful'
    if (val < 45) return 'modern-sleek'
    if (val < 55) return 'minimal-clean'
    if (val < 70) return 'elegant-refined'
    return 'classic-timeless'
  }

  const getInitialBrandTone = () => {
    if (brandData.brandTone) return brandData.brandTone
    const val = brandData.feelPlayfulSerious
    if (val < 30) return 'playful-witty'
    if (val < 45) return 'friendly-approachable'
    if (val < 55) return 'casual-relaxed'
    if (val < 70) return 'professional-trustworthy'
    return 'authoritative-expert'
  }

  const colors = [brandData.primaryColor, brandData.secondaryColor, brandData.accentColor].filter(
    Boolean
  )
  const primaryColor = colors[0] || '#3b82f6'
  const secondaryColor = colors[1] || '#8b5cf6'

  const getStyleLabel = (value: string) => {
    const option = VISUAL_STYLE_OPTIONS.find((o) => o.value === value)
    return option?.label || 'Minimal & Clean'
  }

  const getToneLabel = (value: string) => {
    const option = BRAND_TONE_OPTIONS.find((o) => o.value === value)
    return option?.label || 'Professional & Trustworthy'
  }

  const visualStyleLabel = getStyleLabel(brandData.visualStyle || getInitialVisualStyle())
  const brandToneLabel = getToneLabel(brandData.brandTone || getInitialBrandTone())

  const getFontFamily = (fontName: string) => {
    const font = FONT_OPTIONS.find((f) => f.value === fontName)
    return font?.family || "'Satoshi', sans-serif"
  }
  const fontFamily = getFontFamily(brandData.primaryFont || 'Satoshi')

  // Group fonts by category for the visual picker
  const groupedFonts = FONT_OPTIONS.reduce(
    (acc, font) => {
      if (!acc[font.category]) acc[font.category] = []
      acc[font.category].push(font)
      return acc
    },
    {} as Record<string, typeof FONT_OPTIONS>
  )

  // Confidence indicator helper
  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 85) return { label: 'Strong match', color: 'var(--ds-status-completed)' }
    if (confidence >= 70) return { label: 'Good match', color: 'var(--ds-info)' }
    if (confidence >= 50) return { label: 'Possible match', color: 'var(--ds-status-pending)' }
    return { label: 'Suggested', color: 'var(--muted-foreground)' }
  }

  // Color getter/setter helpers for one-at-a-time color editing
  const getColorValue = (which: 'primary' | 'secondary' | 'accent') => {
    if (which === 'primary') return brandData.primaryColor || '#3b82f6'
    if (which === 'secondary') return brandData.secondaryColor || '#8b5cf6'
    return brandData.accentColor || '#f59e0b'
  }

  const setColorValue = (which: 'primary' | 'secondary' | 'accent', color: string) => {
    if (which === 'primary') setBrandData({ ...brandData, primaryColor: color })
    else if (which === 'secondary') setBrandData({ ...brandData, secondaryColor: color })
    else setBrandData({ ...brandData, accentColor: color })
  }

  // Color presets for quick selection
  const colorPresets = [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#6366f1',
    '#ef4444',
    '#14b8a6',
    '#000000',
    '#374151',
    '#78716c',
    '#1e3a8a',
    '#166534',
  ]

  // Audience management functions
  const handleRemoveAudience = (index: number) => {
    const newAudiences = [...(brandData.audiences || [])]
    newAudiences.splice(index, 1)
    // If we removed the primary, make the first one primary
    if (newAudiences.length > 0 && !newAudiences.some((a) => a.isPrimary)) {
      newAudiences[0].isPrimary = true
    }
    setBrandData({ ...brandData, audiences: newAudiences })
  }

  const handleSetPrimaryAudience = (index: number) => {
    const newAudiences = (brandData.audiences || []).map((a, i) => ({
      ...a,
      isPrimary: i === index,
    }))
    setBrandData({ ...brandData, audiences: newAudiences })
  }

  const handleAddAudience = () => {
    if (!newAudienceName.trim()) return
    const newAudience: InferredAudience = {
      name: newAudienceName.trim(),
      isPrimary: !brandData.audiences?.length,
      confidence: 80,
      firmographics:
        newAudienceType === 'b2b'
          ? {
              jobTitles: [],
              companySize: [],
              industries: [],
            }
          : undefined,
      demographics:
        newAudienceType === 'b2c'
          ? {
              ageRange: { min: 18, max: 65 },
              gender: 'all',
            }
          : undefined,
    }
    setBrandData({
      ...brandData,
      audiences: [...(brandData.audiences || []), newAudience],
    })
    setNewAudienceName('')
    setShowAddAudience(false)
  }

  const handleUpdateAudienceName = (index: number, name: string) => {
    const newAudiences = [...(brandData.audiences || [])]
    newAudiences[index] = { ...newAudiences[index], name }
    setBrandData({ ...brandData, audiences: newAudiences })
    setEditingAudienceIndex(null)
  }

  const handleToggleSection = (
    section: 'name' | 'colors' | 'typography' | 'style' | 'tone',
    isActive: boolean
  ) => {
    setEditingSection(isActive ? null : section)
  }

  const accentColor = brandData.accentColor || '#f59e0b'
  const descriptionText = brandData.description || brandData.industry || 'Your brand story'
  const isDescriptionLong = descriptionText.length > 120

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full max-w-2xl"
    >
      {/* Celebration header */}
      <motion.div variants={staggerItem} className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-crafted-olive/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-crafted-olive" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">Here&apos;s what we found</p>
          <p className="text-white/40 text-xs">Your brand DNA, extracted and ready to refine</p>
        </div>
      </motion.div>

      {/* === Section 1: Brand Identity (Hero) === */}
      <motion.div
        variants={staggerItem}
        className="relative rounded-2xl overflow-hidden mb-4"
        style={{
          background: 'var(--surface-overlay)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: `0 0 60px ${primaryColor}10, 0 0 30px ${secondaryColor}08`,
        }}
      >
        {/* Subtle brand color glow at top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-20 rounded-full opacity-20 blur-[80px]"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
          }}
        />

        <div className="relative p-6 sm:p-8">
          {/* Header with Logo and Name - Editable inline */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${
                  secondaryColor || primaryColor
                })`,
                boxShadow: `0 8px 32px ${primaryColor}30`,
              }}
            >
              {(brandData.logoUrl || brandData.faviconUrl) && !logoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandData.logoUrl || brandData.faviconUrl}
                  alt={brandData.name || 'Brand logo'}
                  className="w-full h-full object-contain p-2"
                  onError={() => setLogoErrorUrl(brandData.logoUrl || brandData.faviconUrl || null)}
                />
              ) : (
                <span className="text-white font-bold text-2xl sm:text-3xl" style={{ fontFamily }}>
                  {brandData.name?.[0]?.toUpperCase() || 'B'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 group/name">
                <div
                  className={
                    editingSection === 'name'
                      ? ''
                      : 'opacity-0 group-hover/name:opacity-100 transition-opacity'
                  }
                >
                  <SectionEditButton
                    section="name"
                    isActive={editingSection === 'name'}
                    onToggle={handleToggleSection}
                  />
                </div>
              </div>
              {editingSection === 'name' ? (
                <input
                  type="text"
                  value={brandData.name}
                  onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                  className="text-3xl sm:text-4xl text-white font-bold bg-transparent border-b border-white/20 focus:border-crafted-olive outline-none w-full"
                  style={{ fontFamily }}
                  placeholder="Brand name"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-3xl sm:text-4xl text-white font-bold truncate"
                  style={{ fontFamily }}
                >
                  {brandData.name || 'Your Brand'}
                </h1>
              )}
              {/* Industry tag */}
              {brandData.industry && (
                <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs text-white/50 bg-white/5 border border-white/8">
                  {brandData.industry}
                </span>
              )}
              {/* Compact social links - icon only */}
              {(brandData.socialLinks?.linkedin ||
                brandData.socialLinks?.twitter ||
                brandData.socialLinks?.instagram) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {brandData.socialLinks?.linkedin && (
                    <a
                      href={brandData.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-[#0A66C2] transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {brandData.socialLinks?.twitter && (
                    <a
                      href={brandData.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-white/70 transition-colors"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {brandData.socialLinks?.instagram && (
                    <a
                      href={brandData.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-[#E4405F] transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expandable Description */}
          <div>
            <p
              className={`text-white/60 text-sm leading-relaxed ${
                !descriptionExpanded && isDescriptionLong ? 'line-clamp-2' : ''
              }`}
            >
              {descriptionText}
            </p>
            {isDescriptionLong && (
              <button
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="text-crafted-olive text-xs font-medium mt-1 hover:text-white transition-colors"
              >
                {descriptionExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* === Section 2: Visual Language === */}
      <motion.div
        variants={staggerItem}
        className="rounded-2xl p-5 sm:p-6 mb-4"
        style={{
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-white/40" />
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
            Visual Language
          </span>
        </div>

        {/* Color swatches - enlarged with labels */}
        <div className="mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {(['primary', 'secondary', 'accent'] as const).map((which) => (
              <button
                key={which}
                onClick={() => {
                  setEditingSection(editingSection === 'colors' ? null : 'colors')
                  setEditingColor(which)
                }}
                className={`flex flex-col items-center gap-1.5 transition-all ${
                  editingSection === 'colors' && editingColor === which
                    ? 'scale-105'
                    : 'hover:scale-105'
                }`}
              >
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl"
                  style={{
                    backgroundColor: getColorValue(which),
                    boxShadow: `0 4px 12px ${getColorValue(which)}30`,
                  }}
                />
                <span className="text-white/40 text-[10px] capitalize">{which}</span>
              </button>
            ))}
          </div>

          {/* Gradient bar showing full palette */}
          <div
            className="h-2 rounded-full mt-3"
            style={{
              background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor}, ${accentColor})`,
            }}
          />
        </div>

        {/* Typography specimen */}
        <div className="mb-3">
          <button
            onClick={() => setEditingSection(editingSection === 'typography' ? null : 'typography')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${
              editingSection === 'typography'
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'bg-white/[0.03] hover:bg-white/5 border border-white/8'
            }`}
          >
            <span
              className="text-2xl text-white/80 font-semibold leading-none"
              style={{ fontFamily }}
            >
              Aa
            </span>
            <div>
              <span className="text-white text-sm font-medium" style={{ fontFamily }}>
                {brandData.primaryFont || 'Satoshi'}
              </span>
              <span className="text-white/30 text-xs block">Primary typeface</span>
            </div>
          </button>
        </div>

        {/* Editor panels for colors and typography */}
        <AnimatePresence>
          {editingSection === 'colors' && (
            <EditorPanel
              isOpen={editingSection === 'colors'}
              title="Brand Colors"
              isMobile={isMobile}
              onClose={() => setEditingSection(null)}
            >
              <div className="pt-4 pb-2 space-y-3">
                {/* Color swatches row - click to expand */}
                <div className="flex items-center gap-3">
                  {(['primary', 'secondary', 'accent'] as const).map((which) => (
                    <button
                      key={which}
                      onClick={() => setEditingColor(editingColor === which ? null : which)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                        editingColor === which
                          ? 'bg-white/10 ring-1 ring-white/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{
                          backgroundColor: getColorValue(which),
                          boxShadow: `0 2px 8px ${getColorValue(which)}30`,
                        }}
                      />
                      <span className="text-white/50 text-xs capitalize">{which}</span>
                    </button>
                  ))}
                </div>

                {/* Single expanded preset grid */}
                <AnimatePresence>
                  {editingColor && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <p className="text-white/40 text-xs font-medium mb-2 capitalize">
                          {editingColor}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {colorPresets.map((color) => (
                            <button
                              key={color}
                              onClick={() => setColorValue(editingColor, color)}
                              className={`w-8 h-8 rounded-lg transition-all ${
                                getColorValue(editingColor) === color
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-raised'
                                  : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <div className="relative">
                            <input
                              type="color"
                              value={getColorValue(editingColor)}
                              onChange={(e) => setColorValue(editingColor, e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer opacity-0 absolute inset-0"
                            />
                            <div className="w-8 h-8 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                              <span className="text-white/40 text-sm">+</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </EditorPanel>
          )}

          {editingSection === 'typography' && (
            <EditorPanel
              isOpen={editingSection === 'typography'}
              title="Typography"
              isMobile={isMobile}
              onClose={() => setEditingSection(null)}
            >
              <div className="pt-4 max-h-48 overflow-y-auto">
                {Object.entries(groupedFonts).map(([category, fonts]) => (
                  <div key={category} className="mb-3">
                    <p className="text-white/40 text-xs font-medium mb-2">{category}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {fonts.map((font) => (
                        <button
                          key={font.value}
                          onClick={() =>
                            setBrandData({
                              ...brandData,
                              primaryFont: font.value,
                            })
                          }
                          className={`px-3 py-2 rounded-lg text-left transition-all ${
                            brandData.primaryFont === font.value
                              ? 'bg-crafted-olive/20 ring-1 ring-crafted-olive'
                              : 'bg-white/5 hover:bg-white/8 border border-white/8'
                          }`}
                        >
                          <span className="text-white text-sm" style={{ fontFamily: font.family }}>
                            {font.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </EditorPanel>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === Section 3: Brand Personality === */}
      <motion.div
        variants={staggerItem}
        className="rounded-2xl p-5 sm:p-6 mb-4"
        style={{
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Paintbrush className="w-4 h-4 text-white/40" />
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
            Brand Personality
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Style */}
          <button
            onClick={() => setEditingSection(editingSection === 'style' ? null : 'style')}
            className={`px-4 py-3 rounded-xl text-left transition-all ${
              editingSection === 'style'
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'bg-white/[0.03] hover:bg-white/5 border border-white/8'
            }`}
          >
            <span className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">
              Visual Style
            </span>
            <span className="text-white text-sm font-medium">{visualStyleLabel}</span>
          </button>

          {/* Tone */}
          <button
            onClick={() => setEditingSection(editingSection === 'tone' ? null : 'tone')}
            className={`px-4 py-3 rounded-xl text-left transition-all ${
              editingSection === 'tone'
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'bg-white/[0.03] hover:bg-white/5 border border-white/8'
            }`}
          >
            <span className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">
              Brand Tone
            </span>
            <span className="text-white text-sm font-medium">{brandToneLabel}</span>
          </button>
        </div>

        {/* Editor panels for style and tone */}
        <AnimatePresence>
          {editingSection === 'style' && (
            <EditorPanel
              isOpen={editingSection === 'style'}
              title="Visual Style"
              isMobile={isMobile}
              onClose={() => setEditingSection(null)}
            >
              <div className="pt-4 flex flex-wrap gap-2">
                {VISUAL_STYLE_OPTIONS.map((style) => {
                  const currentStyle = brandData.visualStyle || getInitialVisualStyle()
                  const isSelected = currentStyle === style.value
                  return (
                    <button
                      key={style.value}
                      onClick={() =>
                        setBrandData({
                          ...brandData,
                          visualStyle: style.value,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-crafted-olive text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/8'
                      }`}
                    >
                      {style.label}
                    </button>
                  )
                })}
              </div>
            </EditorPanel>
          )}

          {editingSection === 'tone' && (
            <EditorPanel
              isOpen={editingSection === 'tone'}
              title="Brand Tone"
              isMobile={isMobile}
              onClose={() => setEditingSection(null)}
            >
              <div className="pt-4 flex flex-wrap gap-2">
                {BRAND_TONE_OPTIONS.map((tone) => {
                  const currentTone = brandData.brandTone || getInitialBrandTone()
                  const isSelected = currentTone === tone.value
                  return (
                    <button
                      key={tone.value}
                      onClick={() =>
                        setBrandData({
                          ...brandData,
                          brandTone: tone.value,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-crafted-olive text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/8'
                      }`}
                    >
                      {tone.label}
                    </button>
                  )
                })}
              </div>
            </EditorPanel>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === Section 4: Target Audiences === */}
      <motion.div
        variants={staggerItem}
        className="rounded-2xl p-5 sm:p-6 mb-4"
        style={{
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/40" />
            <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
              Target Audiences
            </span>
          </div>
          {!showAddAudience && (
            <button
              onClick={() => setShowAddAudience(true)}
              className="text-xs text-crafted-olive hover:text-white transition-colors font-medium"
            >
              + Add
            </button>
          )}
        </div>

        {/* Quick audience suggestions */}
        {(!brandData.audiences || brandData.audiences.length < 3) && !showAddAudience && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(() => {
              const archetype = (brandData.industryArchetype || '').toLowerCase()
              const existingNames = (brandData.audiences || []).map((a) => a.name.toLowerCase())
              const suggestions =
                archetype.includes('tech') || archetype.includes('saas')
                  ? [
                      'Engineering Teams',
                      'Product Managers',
                      'CTOs & VPs',
                      'Developers',
                      'Startup Founders',
                    ]
                  : archetype.includes('e-commerce') || archetype.includes('ecommerce')
                    ? [
                        'Online Shoppers',
                        'Repeat Customers',
                        'Wholesale Buyers',
                        'Brand Enthusiasts',
                      ]
                    : archetype.includes('hospitality')
                      ? ['Hotel Guests', 'Corporate Travelers', 'Event Planners', 'Families']
                      : [
                          'Small Businesses',
                          'Enterprise Teams',
                          'Consumers',
                          'Founders',
                          'Creators',
                        ]
              return suggestions
                .filter((s) => !existingNames.includes(s.toLowerCase()))
                .slice(0, 4)
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      const newAudience: InferredAudience = {
                        name: suggestion,
                        isPrimary: !brandData.audiences?.length,
                        confidence: 70,
                      }
                      setBrandData({
                        ...brandData,
                        audiences: [...(brandData.audiences || []), newAudience],
                      })
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-white/60 hover:bg-crafted-olive/20 hover:text-crafted-olive border border-white/8 transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))
            })()}
          </div>
        )}

        {/* Add new audience form */}
        {showAddAudience && (
          <div
            className="p-3 rounded-xl mb-2"
            style={{
              background: 'color-mix(in srgb, var(--crafted-olive) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--crafted-olive) 30%, transparent)',
            }}
          >
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setNewAudienceType('b2b')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  newAudienceType === 'b2b'
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Building2 className="w-3 h-3 inline mr-1" />
                B2B (Companies)
              </button>
              <button
                onClick={() => setNewAudienceType('b2c')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  newAudienceType === 'b2c'
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Users className="w-3 h-3 inline mr-1" />
                B2C (Individuals)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAudienceName}
                onChange={(e) => setNewAudienceName(e.target.value)}
                placeholder={
                  newAudienceType === 'b2b'
                    ? 'e.g., HR Leaders at SMBs'
                    : 'e.g., Job seekers in tech'
                }
                className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] text-white bg-white/5 border border-white/10 focus:border-crafted-olive outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddAudience()}
              />
              <button
                onClick={handleAddAudience}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-crafted-olive text-black/80 hover:bg-white transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddAudience(false)
                  setNewAudienceName('')
                }}
                className="px-2 py-1.5 rounded-lg text-[10px] text-white/40 hover:text-white/70"
              >
                Cancel
              </button>
            </div>
            <p className="text-white/30 text-[9px] mt-2">
              {newAudienceType === 'b2b'
                ? 'Tip: For marketplaces like recruitment, add both your clients (companies hiring) and your service recipients (job seekers).'
                : "Tip: Describe who you're serving directly - individuals, consumers, or end users."}
            </p>
          </div>
        )}

        {/* Existing audiences - simplified rows */}
        {brandData.audiences && brandData.audiences.length > 0 ? (
          <div className="space-y-1">
            {brandData.audiences.map((audience, index) => (
              <div
                key={index}
                className="px-3 py-2.5 rounded-xl flex items-center gap-3 group"
                style={{
                  background: audience.isPrimary
                    ? 'color-mix(in srgb, var(--ds-highlight) 8%, transparent)'
                    : 'transparent',
                }}
              >
                {/* Confidence dot */}
                {(() => {
                  const indicator = getConfidenceIndicator(audience.confidence)
                  return (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: indicator.color }}
                      title={indicator.label}
                    />
                  )
                })()}

                {/* Name */}
                <div className="min-w-0 flex-1">
                  {editingAudienceIndex === index ? (
                    <input
                      type="text"
                      defaultValue={audience.name}
                      autoFocus
                      className="text-white text-sm font-medium bg-transparent border-b border-white/30 focus:border-crafted-olive outline-none w-full"
                      onBlur={(e) => handleUpdateAudienceName(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleUpdateAudienceName(index, e.currentTarget.value)
                        if (e.key === 'Escape') setEditingAudienceIndex(null)
                      }}
                    />
                  ) : (
                    <span className="text-white text-sm font-medium truncate block">
                      {audience.name}
                    </span>
                  )}
                </div>

                {/* Primary badge */}
                {audience.isPrimary && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--ds-highlight) 35%, transparent)',
                      color: 'var(--ds-highlight-text)',
                    }}
                  >
                    Primary
                  </span>
                )}

                {/* Actions - visible on hover only */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingAudienceIndex(index)}
                    className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                    title="Edit name"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  {!audience.isPrimary && (
                    <button
                      onClick={() => handleSetPrimaryAudience(index)}
                      className="p-1 rounded-lg text-white/30 hover:text-crafted-olive hover:bg-crafted-olive/10 transition-all"
                      title="Set as primary"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveAudience(index)}
                    className="p-1 rounded-lg text-white/30 hover:text-ds-error hover:bg-ds-error/10 transition-all"
                    title="Remove"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showAddAudience && (
            <button
              onClick={() => setShowAddAudience(true)}
              className="w-full p-4 rounded-xl text-center text-white/40 text-sm hover:text-white/60 hover:bg-white/5 transition-colors"
              style={{ border: '1px dashed rgba(255, 255, 255, 0.15)' }}
            >
              + Add your target audiences
            </button>
          )
        )}
      </motion.div>

      {/* === Inline Preview (desktop only) === */}
      <motion.div variants={staggerItem} className="hidden sm:block mb-4">
        <BrandCardPreviewPanel brandData={brandData} />
      </motion.div>

      {/* === Action Buttons === */}
      <motion.div variants={staggerItem} className="flex items-center gap-3 mt-2">
        <button
          onClick={onBack}
          className="px-4 py-3 rounded-xl font-medium text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-1.5" />
          Back
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white text-black/90 flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--button-cream) 95%, transparent)' }}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </button>
      </motion.div>
    </motion.div>
  )
}
