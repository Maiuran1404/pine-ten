'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Save,
  Building2,
  Palette,
  Type,
  Globe,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
  Users,
  Briefcase,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Audience {
  id: string
  name: string
  isPrimary: boolean
  demographics?: {
    ageRange?: { min: number; max: number }
    gender?: 'all' | 'male' | 'female' | 'other'
    income?: 'low' | 'middle' | 'high' | 'enterprise'
  }
  firmographics?: {
    companySize?: string[]
    industries?: string[]
    jobTitles?: string[]
    departments?: string[]
    decisionMakingRole?: 'decision-maker' | 'influencer' | 'end-user'
  }
  psychographics?: {
    painPoints?: string[]
    goals?: string[]
    values?: string[]
  }
  behavioral?: {
    contentPreferences?: string[]
    platforms?: string[]
    buyingProcess?: 'impulse' | 'considered' | 'committee'
  }
  confidence: number
  sources?: string[]
}

interface BrandData {
  id: string
  name: string
  website: string | null
  description: string | null
  tagline: string | null
  industry: string | null
  industryArchetype: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  backgroundColor: string | null
  textColor: string | null
  brandColors: string[]
  primaryFont: string | null
  secondaryFont: string | null
  socialLinks: {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    youtube?: string
  } | null
  contactEmail: string | null
  contactPhone: string | null
  keywords: string[]
}

const industries = [
  'Technology',
  'E-commerce',
  'SaaS',
  'Marketing & Advertising',
  'Finance',
  'Healthcare',
  'Education',
  'Real Estate',
  'Food & Beverage',
  'Fashion & Apparel',
  'Entertainment',
  'Professional Services',
  'Manufacturing',
  'Non-profit',
  'Recruitment',
  'Banking',
  'Venture Capital',
  'Construction',
  'Electrical Services',
  'Plumbing',
  'HVAC',
  'Restaurants',
  'Cafes',
  'Hotels',
  'Other',
]

const industryArchetypes = [
  {
    value: 'hospitality',
    label: 'Hospitality',
    description: 'Restaurants, Cafes, Hotels',
  },
  {
    value: 'blue-collar',
    label: 'Blue-collar',
    description: 'Trade services, Construction, Manufacturing',
  },
  {
    value: 'white-collar',
    label: 'White-collar',
    description: 'Professional services, Finance, Recruitment',
  },
  {
    value: 'e-commerce',
    label: 'E-commerce',
    description: 'Product-based online businesses',
  },
  {
    value: 'tech',
    label: 'Tech',
    description: 'Technology startups, Software, SaaS',
  },
]

const COLOR_PRESETS = {
  primary: [
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#6366f1',
    '#000000',
  ],
  secondary: [
    '#3b82f6',
    '#1e3a8a',
    '#4338ca',
    '#7c3aed',
    '#be185d',
    '#9a3412',
    '#166534',
    '#155e75',
    '#334155',
    '#18181b',
  ],
}

export default function BrandPage() {
  const router = useRouter()
  const [brand, setBrand] = useState<BrandData | null>(null)
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRescanning, setIsRescanning] = useState(false)
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false)
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('company')
  const [expandedAudience, setExpandedAudience] = useState<string | null>(null)

  useEffect(() => {
    fetchBrand()
    fetchAudiences()
  }, [])

  const fetchBrand = async () => {
    try {
      const response = await fetch('/api/brand')

      // Handle case where user hasn't completed onboarding yet
      if (response.status === 404) {
        setBrand(null)
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch brand')
      }
      const result = await response.json()
      setBrand(result.data)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load brand information')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAudiences = async () => {
    try {
      const response = await fetch('/api/audiences')
      if (response.ok) {
        const result = await response.json()
        setAudiences(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch audiences:', error)
      // Silently fail - audiences are optional
    }
  }

  const handleDeleteAudience = async (audienceId: string) => {
    try {
      const response = await fetch(`/api/audiences/${audienceId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setAudiences(audiences.filter((a) => a.id !== audienceId))
        toast.success('Audience removed')
      } else {
        throw new Error('Failed to delete')
      }
    } catch {
      toast.error('Failed to remove audience')
    }
  }

  const handleSetPrimaryAudience = async (audienceId: string) => {
    try {
      const response = await fetch(`/api/audiences/${audienceId}/primary`, {
        method: 'PUT',
      })
      if (response.ok) {
        setAudiences(
          audiences.map((a) => ({
            ...a,
            isPrimary: a.id === audienceId,
          }))
        )
        toast.success('Primary audience updated')
      } else {
        throw new Error('Failed to update')
      }
    } catch {
      toast.error('Failed to update primary audience')
    }
  }

  const handleSave = async () => {
    if (!brand) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      toast.success('Brand updated successfully!')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRescan = async () => {
    if (!brand?.website) {
      toast.error('No website to scan')
      return
    }

    setIsRescanning(true)
    try {
      const response = await fetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: brand.website }),
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const result = await response.json()
      setBrand((prev) =>
        prev
          ? {
              ...prev,
              ...result.data,
              id: prev.id,
            }
          : null
      )
      toast.success('Brand information refreshed from website!')
    } catch {
      toast.error('Failed to scan website')
    } finally {
      setIsRescanning(false)
    }
  }

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    setCopiedColor(color)
    setTimeout(() => setCopiedColor(null), 2000)
    toast.success('Color copied to clipboard')
  }

  const handleRedoOnboarding = () => {
    setIsResettingOnboarding(true)

    // Start the API call but don't wait for it - redirect immediately
    fetch('/api/brand/reset-onboarding', {
      method: 'POST',
    }).catch(() => {
      // Silently ignore errors - onboarding page will handle any issues
    })

    // Redirect immediately using window.location for faster navigation
    window.location.href = '/onboarding'
  }

  const updateField = (field: keyof BrandData, value: unknown) => {
    setBrand((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const addBrandColor = (color: string) => {
    if (brand && color && !brand.brandColors.includes(color)) {
      updateField('brandColors', [...brand.brandColors, color])
    }
  }

  const removeBrandColor = (index: number) => {
    if (brand) {
      updateField(
        'brandColors',
        brand.brandColors.filter((_, i) => i !== index)
      )
    }
  }

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
                // Reset onboarding status in background - don't wait
                fetch('/api/brand/reset-onboarding', { method: 'POST' }).catch(() => {})
                // Redirect immediately
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

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'social', label: 'Social', icon: Globe },
    { id: 'audiences', label: 'Audiences', icon: Users },
  ]

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

      {/* Header */}
      <div className="relative z-10 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">My Brand</h1>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isResettingOnboarding}>
                    {isResettingOnboarding ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Redo onboarding
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redo brand onboarding?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset your current brand settings and take you through the
                      onboarding process again. Your existing brand data will be replaced with the
                      new information you provide.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRedoOnboarding}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {brand.website && (
                <Button variant="outline" size="sm" onClick={handleRescan} disabled={isRescanning}>
                  {isRescanning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-full">
        {/* Left side - Form */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:max-w-2xl">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-4 sm:mb-6 border border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap min-w-0',
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Company Name</Label>
                    <Input
                      value={brand.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Industry</Label>
                    <select
                      value={brand.industry || ''}
                      onChange={(e) => updateField('industry', e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select industry</option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Industry Archetype</Label>
                  <select
                    value={brand.industryArchetype || ''}
                    onChange={(e) => updateField('industryArchetype', e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select archetype</option>
                    {industryArchetypes.map((arch) => (
                      <option key={arch.value} value={arch.value}>
                        {arch.label} - {arch.description}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    High-level business category that helps us tailor creative recommendations
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Description</Label>
                  <Textarea
                    value={brand.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Tagline</Label>
                    <Input
                      value={brand.tagline || ''}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="Your company tagline"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Website</Label>
                    <Input
                      value={brand.website || ''}
                      onChange={(e) => updateField('website', e.target.value)}
                      placeholder="yourcompany.com"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Logo URL</Label>
                    <Input
                      value={brand.logoUrl || ''}
                      onChange={(e) => updateField('logoUrl', e.target.value)}
                      placeholder="https://..."
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Favicon URL</Label>
                    <Input
                      value={brand.faviconUrl || ''}
                      onChange={(e) => updateField('faviconUrl', e.target.value)}
                      placeholder="https://..."
                      className="h-11"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'colors' && (
              <motion.div
                key="colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Main Colors */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      key: 'primaryColor',
                      label: 'Primary',
                      presets: COLOR_PRESETS.primary,
                    },
                    {
                      key: 'secondaryColor',
                      label: 'Secondary',
                      presets: COLOR_PRESETS.secondary,
                    },
                    {
                      key: 'accentColor',
                      label: 'Accent',
                      presets: COLOR_PRESETS.primary,
                    },
                  ].map(({ key, label, presets }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-muted-foreground text-sm">{label}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:border-ring transition-colors">
                            <div
                              className="w-10 h-10 rounded-lg border border-border"
                              style={{
                                backgroundColor:
                                  (brand[key as keyof BrandData] as string) || '#6366f1',
                              }}
                            />
                            <span className="text-sm font-mono text-muted-foreground">
                              {(brand[key as keyof BrandData] as string) || '#6366f1'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 bg-popover border-border" align="start">
                          <div className="space-y-4">
                            <div className="grid grid-cols-5 gap-2">
                              {presets.map((color) => (
                                <button
                                  key={color}
                                  className={cn(
                                    'w-10 h-10 rounded-lg transition-all hover:scale-110',
                                    (brand[key as keyof BrandData] as string) === color
                                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                                      : 'ring-1 ring-border'
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateField(key as keyof BrandData, color)}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="color"
                                value={(brand[key as keyof BrandData] as string) || '#ffffff'}
                                onChange={(e) =>
                                  updateField(key as keyof BrandData, e.target.value)
                                }
                                className="w-10 h-10 rounded cursor-pointer bg-transparent"
                              />
                              <Input
                                value={(brand[key as keyof BrandData] as string) || ''}
                                onChange={(e) =>
                                  updateField(key as keyof BrandData, e.target.value)
                                }
                                placeholder="#000000"
                                className="flex-1 h-10 font-mono text-sm"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>

                {/* Background & Text Colors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: 'backgroundColor', label: 'Background' },
                    { key: 'textColor', label: 'Text' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-muted-foreground text-sm">{label}</Label>
                      <div className="flex gap-2">
                        <div
                          className="w-12 h-12 rounded-lg border border-input cursor-pointer"
                          style={{
                            backgroundColor: (brand[key as keyof BrandData] as string) || '#1a1a1f',
                          }}
                          onClick={() => {
                            const input = document.getElementById(
                              `${key}-picker`
                            ) as HTMLInputElement
                            input?.click()
                          }}
                        />
                        <Input
                          value={(brand[key as keyof BrandData] as string) || ''}
                          onChange={(e) => updateField(key as keyof BrandData, e.target.value)}
                          placeholder="#000000"
                          className="flex-1 h-12"
                        />
                        <input
                          id={`${key}-picker`}
                          type="color"
                          value={(brand[key as keyof BrandData] as string) || '#ffffff'}
                          onChange={(e) => updateField(key as keyof BrandData, e.target.value)}
                          className="sr-only"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Colors */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-sm">Additional Brand Colors</Label>
                  <div className="flex flex-wrap gap-2">
                    {brand.brandColors.map((color, index) => (
                      <div
                        key={index}
                        className="group flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border"
                      >
                        <div
                          className="w-6 h-6 rounded border border-border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-mono text-muted-foreground">{color}</span>
                        <button
                          onClick={() => copyColor(color)}
                          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                        >
                          {copiedColor === color ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => removeBrandColor(index)}
                          className="p-1 hover:bg-red-500/10 rounded text-red-400 text-sm"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border-2 border-dashed border-border">
                      <input
                        type="color"
                        onChange={(e) => addBrandColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent"
                      />
                      <span className="text-sm text-muted-foreground">Add color</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'typography' && (
              <motion.div
                key="typography"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Primary Font (Headings)</Label>
                    <Input
                      value={brand.primaryFont || ''}
                      onChange={(e) => updateField('primaryFont', e.target.value)}
                      placeholder="e.g., Inter, Roboto"
                      className="h-11"
                    />
                    {brand.primaryFont && (
                      <p
                        className="text-lg font-bold text-foreground mt-3 p-3 bg-muted rounded-lg border border-border"
                        style={{ fontFamily: brand.primaryFont }}
                      >
                        The quick brown fox
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Secondary Font (Body)</Label>
                    <Input
                      value={brand.secondaryFont || ''}
                      onChange={(e) => updateField('secondaryFont', e.target.value)}
                      placeholder="e.g., Open Sans, Lato"
                      className="h-11"
                    />
                    {brand.secondaryFont && (
                      <p
                        className="text-base text-muted-foreground mt-3 p-3 bg-muted rounded-lg border border-border"
                        style={{ fontFamily: brand.secondaryFont }}
                      >
                        The quick brown fox
                      </p>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-sm">Brand Keywords</Label>
                  <div className="flex flex-wrap gap-2">
                    {brand.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
                      >
                        {keyword}
                        <button
                          onClick={() =>
                            updateField(
                              'keywords',
                              brand.keywords.filter((_, i) => i !== index)
                            )
                          }
                          className="hover:text-red-400 ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <Input
                      placeholder="Add keyword..."
                      className="w-32 h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          updateField('keywords', [...brand.keywords, e.currentTarget.value.trim()])
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Contact Email</Label>
                    <Input
                      type="email"
                      value={brand.contactEmail || ''}
                      onChange={(e) => updateField('contactEmail', e.target.value)}
                      placeholder="hello@company.com"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Contact Phone</Label>
                    <Input
                      value={brand.contactPhone || ''}
                      onChange={(e) => updateField('contactPhone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-muted-foreground text-sm">Social Media Links</Label>
                  {[
                    {
                      key: 'twitter',
                      label: 'Twitter / X',
                      placeholder: 'https://twitter.com/...',
                    },
                    {
                      key: 'linkedin',
                      label: 'LinkedIn',
                      placeholder: 'https://linkedin.com/company/...',
                    },
                    {
                      key: 'instagram',
                      label: 'Instagram',
                      placeholder: 'https://instagram.com/...',
                    },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex gap-3 items-center">
                      <Label className="w-24 text-right text-muted-foreground text-sm">
                        {label}
                      </Label>
                      <Input
                        value={brand.socialLinks?.[key as keyof typeof brand.socialLinks] || ''}
                        onChange={(e) =>
                          updateField('socialLinks', {
                            ...brand.socialLinks,
                            [key]: e.target.value,
                          })
                        }
                        placeholder={placeholder}
                        className="flex-1 h-11"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'audiences' && (
              <motion.div
                key="audiences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {audiences.length === 0 ? (
                  <div className="text-center py-12 px-6 rounded-xl border border-dashed border-border">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No audiences yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Target audiences are automatically inferred when you scan a website during
                      onboarding. Click &quot;Redo onboarding&quot; to scan your website again.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        {audiences.length} audience
                        {audiences.length !== 1 ? 's' : ''} identified from your website
                      </p>
                    </div>

                    <div className="space-y-3">
                      {audiences.map((audience) => (
                        <div
                          key={audience.id}
                          className={cn(
                            'rounded-xl border transition-all',
                            audience.isPrimary
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border bg-card hover:border-border/80'
                          )}
                        >
                          {/* Audience Header */}
                          <div
                            className="p-4 cursor-pointer"
                            onClick={() =>
                              setExpandedAudience(
                                expandedAudience === audience.id ? null : audience.id
                              )
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className={cn(
                                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                                    audience.isPrimary
                                      ? 'bg-primary/20 text-primary'
                                      : 'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {audience.firmographics?.jobTitles?.length ? (
                                    <Briefcase className="w-5 h-5" />
                                  ) : (
                                    <Users className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground">
                                      {audience.name}
                                    </span>
                                    {audience.isPrimary && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <span>{audience.confidence}% confidence</span>
                                    {audience.firmographics?.jobTitles &&
                                      audience.firmographics.jobTitles.length > 0 && (
                                        <span className="text-muted-foreground/50">•</span>
                                      )}
                                    {audience.firmographics?.jobTitles
                                      ?.slice(0, 2)
                                      .map((title, i) => (
                                        <span key={i} className="text-muted-foreground">
                                          {title}
                                          {i === 0 &&
                                            audience.firmographics?.jobTitles &&
                                            audience.firmographics.jobTitles.length > 1 &&
                                            ','}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {expandedAudience === audience.id ? (
                                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {expandedAudience === audience.id && (
                            <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
                              {/* Firmographics */}
                              {audience.firmographics && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                    Firmographics
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {audience.firmographics.companySize?.map((size, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                                      >
                                        {size} employees
                                      </span>
                                    ))}
                                    {audience.firmographics.industries?.map((ind, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                                      >
                                        {ind}
                                      </span>
                                    ))}
                                    {audience.firmographics.decisionMakingRole && (
                                      <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground capitalize">
                                        {audience.firmographics.decisionMakingRole}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Psychographics */}
                              {audience.psychographics?.painPoints &&
                                audience.psychographics.painPoints.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                      Pain Points
                                    </h4>
                                    <ul className="space-y-1">
                                      {audience.psychographics.painPoints.map((pain, i) => (
                                        <li
                                          key={i}
                                          className="text-sm text-muted-foreground flex items-start gap-2"
                                        >
                                          <span className="text-muted-foreground/50 mt-1">•</span>
                                          {pain}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                              {audience.psychographics?.goals &&
                                audience.psychographics.goals.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                      Goals
                                    </h4>
                                    <ul className="space-y-1">
                                      {audience.psychographics.goals.map((goal, i) => (
                                        <li
                                          key={i}
                                          className="text-sm text-muted-foreground flex items-start gap-2"
                                        >
                                          <span className="text-muted-foreground/50 mt-1">•</span>
                                          {goal}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                              {/* Behavioral */}
                              {audience.behavioral && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                    Behavioral
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {audience.behavioral.platforms?.map((platform, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                                      >
                                        {platform}
                                      </span>
                                    ))}
                                    {audience.behavioral.buyingProcess && (
                                      <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground capitalize">
                                        {audience.behavioral.buyingProcess} purchase
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                {!audience.isPrimary && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSetPrimaryAudience(audience.id)
                                    }}
                                  >
                                    Set as Primary
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteAudience(audience.id)
                                  }}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side - Live Preview */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-muted border-l border-border items-center justify-center p-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${
                brand.primaryColor || '#10b981'
              }15 0%, transparent 50%)`,
            }}
          />

          <AnimatePresence mode="wait">
            {/* Live Preview Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-md"
            >
              {/* Mock App Preview */}
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
                {/* App Header */}
                <motion.div
                  className="h-14 flex items-center justify-between px-4"
                  style={{ backgroundColor: brand.primaryColor || '#10b981' }}
                  animate={{ backgroundColor: brand.primaryColor || '#10b981' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt=""
                        className="w-8 h-8 rounded-lg object-contain bg-white/10"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {brand.name?.charAt(0)?.toUpperCase() || 'C'}
                        </span>
                      </div>
                    )}
                    <motion.span
                      className="text-white font-semibold text-sm"
                      key={brand.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {brand.name || 'Your Company'}
                    </motion.span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                </motion.div>

                {/* App Content */}
                <div className="p-5 space-y-4">
                  {/* Hero section */}
                  <div className="space-y-2">
                    <motion.div
                      className="h-3 rounded-full w-3/4"
                      style={{
                        backgroundColor: brand.textColor || 'currentColor',
                      }}
                      animate={{
                        backgroundColor: brand.textColor || 'currentColor',
                      }}
                    />
                    <div className="h-2 bg-muted-foreground/30 rounded-full w-1/2" />
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-3 pt-2">
                    <motion.div
                      className="h-9 px-4 rounded-lg flex items-center justify-center flex-1"
                      style={{
                        backgroundColor: brand.primaryColor || '#10b981',
                      }}
                      animate={{
                        backgroundColor: brand.primaryColor || '#10b981',
                      }}
                    >
                      <span className="text-white text-xs font-medium">Get Started</span>
                    </motion.div>
                    <motion.div
                      className="h-9 px-4 rounded-lg flex items-center justify-center border-2"
                      style={{ borderColor: brand.primaryColor || '#10b981' }}
                      animate={{ borderColor: brand.primaryColor || '#10b981' }}
                    >
                      <motion.span
                        className="text-xs font-medium"
                        style={{ color: brand.primaryColor || '#10b981' }}
                        animate={{ color: brand.primaryColor || '#10b981' }}
                      >
                        Learn More
                      </motion.span>
                    </motion.div>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[brand.primaryColor, brand.secondaryColor].map((color, i) => (
                      <motion.div
                        key={i}
                        className="h-20 rounded-xl p-3"
                        style={{ backgroundColor: `${color || '#10b981'}20` }}
                        animate={{
                          backgroundColor: `${color || '#10b981'}20`,
                        }}
                      >
                        <motion.div
                          className="w-6 h-6 rounded-lg mb-2"
                          style={{ backgroundColor: color || '#10b981' }}
                          animate={{ backgroundColor: color || '#10b981' }}
                        />
                        <div className="h-2 bg-muted-foreground/30 rounded w-3/4" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* App Footer */}
                <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                  <div className="flex gap-2">
                    {brand.brandColors.slice(0, 4).map((color, i) => (
                      <motion.div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  {brand.website && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {brand.website.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </div>
              </div>

              {/* Caption */}
              <motion.p
                className="text-center text-muted-foreground text-sm mt-6 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Sparkles className="w-4 h-4" />
                Live preview updates as you type
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
