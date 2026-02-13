'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading'
import {
  Plus,
  Trash2,
  Search,
  Palette,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Upload,
  Grid3X3,
  Eye,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ImageIcon,
  History,
} from 'lucide-react'
import {
  TONE_BUCKETS,
  ENERGY_BUCKETS,
  DENSITY_BUCKETS,
  COLOR_BUCKETS,
  TONE_BUCKET_LABELS,
  ENERGY_BUCKET_LABELS,
  DENSITY_BUCKET_LABELS,
  COLOR_BUCKET_LABELS,
  type ToneBucket,
  type EnergyBucket,
  type DensityBucket,
  type ColorBucket,
} from '@/lib/constants/reference-libraries'
import { VISUAL_STYLE_OPTIONS } from '@/components/onboarding/types'
import { BrandReferenceUploader } from '@/components/admin/brand-reference-uploader'
import { BrandReferenceScraper } from '@/components/admin/brand-reference-scraper'
import { ImportLogsViewer } from '@/components/admin/import-logs-viewer'
import { cn } from '@/lib/utils'

interface BrandReference {
  id: string
  name: string
  description: string | null
  imageUrl: string
  toneBucket: ToneBucket
  energyBucket: EnergyBucket
  densityBucket: DensityBucket
  colorBucket: ColorBucket
  colorSamples: string[]
  visualStyles: string[]
  industries: string[]
  displayOrder: number
  isActive: boolean
  usageCount: number
  createdAt: string
}

const defaultFormState = {
  name: '',
  description: '',
  imageUrl: '',
  toneBucket: 'balanced' as ToneBucket,
  energyBucket: 'balanced' as EnergyBucket,
  densityBucket: 'balanced' as DensityBucket,
  colorBucket: 'neutral' as ColorBucket,
  colorSamples: '',
  visualStyles: [] as string[],
  industries: '',
  displayOrder: 0,
}

// Stats Card Component
function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
}: {
  label: string
  value: number | string
  subtext?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <div
            className={cn(
              'p-3 rounded-xl',
              trend === 'up' && 'bg-green-500/10 text-green-500',
              trend === 'down' && 'bg-red-500/10 text-red-500',
              (!trend || trend === 'neutral') && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Coverage Matrix Cell
function MatrixCell({
  count,
  tone: _tone,
  energy: _energy,
  onClick,
  isSelected,
}: {
  count: number
  tone: ToneBucket
  energy: EnergyBucket
  onClick: () => void
  isSelected: boolean
}) {
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-red-500/20 border-red-500/30'
    if (count < 3) return 'bg-yellow-500/20 border-yellow-500/30'
    if (count < 6) return 'bg-green-500/20 border-green-500/30'
    return 'bg-green-500/40 border-green-500/50'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105',
        getColorIntensity(count),
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs text-muted-foreground">{count === 1 ? 'image' : 'images'}</span>
    </button>
  )
}

// Onboarding Preview Component
function OnboardingPreview({
  references,
  signals,
}: {
  references: BrandReference[]
  signals: { tone: number; density: number; warmth: number; energy: number }
}) {
  // Filter references based on current slider values
  const filteredRefs = useMemo(() => {
    const getToneBucket = (v: number): ToneBucket =>
      v < 35 ? 'playful' : v > 65 ? 'serious' : 'balanced'
    const getEnergyBucket = (v: number): EnergyBucket =>
      v < 35 ? 'calm' : v > 65 ? 'energetic' : 'balanced'
    const getDensityBucket = (v: number): DensityBucket =>
      v < 35 ? 'minimal' : v > 65 ? 'rich' : 'balanced'
    const getColorBucket = (v: number): ColorBucket =>
      v < 35 ? 'cool' : v > 65 ? 'warm' : 'neutral'

    const toneBucket = getToneBucket(signals.tone)
    const energyBucket = getEnergyBucket(signals.energy)
    const densityBucket = getDensityBucket(signals.density)
    const colorBucket = getColorBucket(signals.warmth)

    // Score each reference
    const scored = references
      .filter((r) => r.isActive)
      .map((ref) => {
        let score = 0
        if (ref.toneBucket === toneBucket) score += 3
        else if (ref.toneBucket === 'balanced') score += 1
        if (ref.energyBucket === energyBucket) score += 3
        else if (ref.energyBucket === 'balanced') score += 1
        if (ref.densityBucket === densityBucket) score += 2
        else if (ref.densityBucket === 'balanced') score += 1
        if (ref.colorBucket === colorBucket) score += 2
        else if (ref.colorBucket === 'neutral') score += 1
        return { ...ref, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    return scored
  }, [references, signals])

  const displayImages =
    filteredRefs.length >= 4
      ? filteredRefs.slice(0, 4).map((r) => r.imageUrl)
      : filteredRefs.length > 0
        ? [...filteredRefs.map((r) => r.imageUrl), ...filteredRefs.map((r) => r.imageUrl)].slice(
            0,
            4
          )
        : []

  return (
    <div className="relative bg-[#1a1a1a] rounded-2xl p-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]" />

      {/* Content */}
      <div className="relative">
        {/* Scrolling columns */}
        {displayImages.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-white/40">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No matching references for these settings</p>
              <p className="text-sm mt-1">Upload more images to improve coverage</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 justify-center h-[300px] overflow-hidden">
            {displayImages.map((imageSrc, index) => (
              <motion.div
                key={`col-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex-shrink-0 w-[100px]"
              >
                <div className="relative h-full overflow-hidden rounded-xl">
                  {/* Gradient overlays */}
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1a1a1a] to-transparent z-10" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1a1a1a] to-transparent z-10" />

                  {/* Scrolling animation */}
                  <motion.div
                    className="flex flex-col gap-2"
                    animate={{
                      y:
                        index % 2 === 0
                          ? [0, -(filteredRefs.length * 140)]
                          : [-(filteredRefs.length * 140), 0],
                    }}
                    transition={{
                      y: {
                        duration: 30 + index * 5,
                        repeat: Infinity,
                        ease: 'linear',
                      },
                    }}
                  >
                    {[...filteredRefs, ...filteredRefs, ...filteredRefs].map((ref, imgIndex) => (
                      <div
                        key={`${index}-${imgIndex}`}
                        className="w-full h-[130px] rounded-lg overflow-hidden flex-shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ref.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Match info */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            Showing <span className="text-white font-medium">{filteredRefs.length}</span> matching
            references
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BrandReferencesPage() {
  const [references, setReferences] = useState<BrandReference[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [, setDeletingId] = useState<string | null>(null)
  const [, setTogglingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRef, setEditingRef] = useState<BrandReference | null>(null)
  const [formState, setFormState] = useState(defaultFormState)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedCell, setSelectedCell] = useState<{
    tone: ToneBucket
    energy: EnergyBucket
  } | null>(null)

  // Preview sliders
  const [previewSignals, setPreviewSignals] = useState({
    tone: 50,
    density: 50,
    warmth: 50,
    energy: 50,
  })

  useEffect(() => {
    fetchReferences()
  }, [])

  const fetchReferences = async () => {
    try {
      const response = await fetch('/api/admin/brand-references')
      if (response.ok) {
        const result = await response.json()
        setReferences(result.data?.references || [])
      }
    } catch (error) {
      console.error('Failed to fetch brand references:', error)
      toast.error('Failed to load brand references')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const active = references.filter((r) => r.isActive)
    const totalUsage = references.reduce((sum, r) => sum + r.usageCount, 0)

    // Coverage matrix
    const matrix: Record<string, number> = {}
    TONE_BUCKETS.forEach((t) => {
      ENERGY_BUCKETS.forEach((e) => {
        const key = `${t}-${e}`
        matrix[key] = active.filter((r) => r.toneBucket === t && r.energyBucket === e).length
      })
    })

    // Find gaps (cells with 0 or < 2 images)
    const gaps = Object.entries(matrix).filter(([, count]) => count < 2).length

    return {
      total: references.length,
      active: active.length,
      inactive: references.length - active.length,
      totalUsage,
      avgUsage: references.length > 0 ? Math.round(totalUsage / references.length) : 0,
      matrix,
      gaps,
      coverageScore: Math.round(((9 - gaps) / 9) * 100),
    }
  }, [references])

  const openCreateDialog = () => {
    setEditingRef(null)
    setFormState(defaultFormState)
    setDialogOpen(true)
  }

  const openEditDialog = (ref: BrandReference) => {
    setEditingRef(ref)
    setFormState({
      name: ref.name,
      description: ref.description || '',
      imageUrl: ref.imageUrl,
      toneBucket: ref.toneBucket,
      energyBucket: ref.energyBucket,
      densityBucket: ref.densityBucket || 'balanced',
      colorBucket: ref.colorBucket,
      colorSamples: ref.colorSamples.join(', '),
      visualStyles: ref.visualStyles,
      industries: ref.industries.join(', '),
      displayOrder: ref.displayOrder,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formState.name || !formState.imageUrl) {
      toast.error('Please fill in name and image URL')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formState.name,
        description: formState.description || null,
        imageUrl: formState.imageUrl,
        toneBucket: formState.toneBucket,
        energyBucket: formState.energyBucket,
        densityBucket: formState.densityBucket,
        colorBucket: formState.colorBucket,
        colorSamples: formState.colorSamples
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        visualStyles: formState.visualStyles,
        industries: formState.industries
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        displayOrder: formState.displayOrder,
      }

      if (editingRef) {
        const response = await fetch(`/api/admin/brand-references/${editingRef.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error('Failed to update')

        const result = await response.json()
        setReferences((prev) =>
          prev.map((r) => (r.id === editingRef.id ? result.data.reference : r))
        )
        toast.success('Brand reference updated!')
      } else {
        const response = await fetch('/api/admin/brand-references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error('Failed to create')

        const result = await response.json()
        setReferences((prev) => [result.data.reference, ...prev])
        toast.success('Brand reference created!')
      }

      setDialogOpen(false)
      setFormState(defaultFormState)
      setEditingRef(null)
    } catch {
      toast.error(
        editingRef ? 'Failed to update brand reference' : 'Failed to create brand reference'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/brand-references?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      setReferences((prev) => prev.filter((r) => r.id !== id))
      toast.success('Brand reference deleted')
    } catch {
      toast.error('Failed to delete brand reference')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (ref: BrandReference) => {
    setTogglingId(ref.id)
    try {
      const response = await fetch(`/api/admin/brand-references/${ref.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ref.isActive }),
      })

      if (!response.ok) throw new Error('Failed to toggle')

      const result = await response.json()
      setReferences((prev) => prev.map((r) => (r.id === ref.id ? result.data.reference : r)))
      toast.success(
        result.data.reference.isActive ? 'Reference activated' : 'Reference deactivated'
      )
    } catch {
      toast.error('Failed to toggle status')
    } finally {
      setTogglingId(null)
    }
  }

  const toggleVisualStyle = (styleValue: string) => {
    setFormState((prev) => ({
      ...prev,
      visualStyles: prev.visualStyles.includes(styleValue)
        ? prev.visualStyles.filter((s) => s !== styleValue)
        : [...prev.visualStyles, styleValue],
    }))
  }

  // Filter references for browse view
  const filteredReferences = useMemo(() => {
    let filtered = references

    if (searchTerm) {
      filtered = filtered.filter(
        (ref) =>
          ref.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ref.visualStyles.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCell) {
      filtered = filtered.filter(
        (ref) => ref.toneBucket === selectedCell.tone && ref.energyBucket === selectedCell.energy
      )
    }

    return filtered
  }, [references, searchTerm, selectedCell])

  // Group references by tone and energy for matrix view
  const _groupedReferences = useMemo(() => {
    const groups: Record<string, BrandReference[]> = {}
    TONE_BUCKETS.forEach((t) => {
      ENERGY_BUCKETS.forEach((e) => {
        const key = `${t}-${e}`
        groups[key] = references.filter(
          (r) => r.toneBucket === t && r.energyBucket === e && r.isActive
        )
      })
    })
    return groups
  }, [references])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Library</h1>
          <p className="text-muted-foreground">
            Manage brand inspiration references shown during onboarding
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Reference
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total References"
                  value={stats.total}
                  subtext={`${stats.active} active, ${stats.inactive} inactive`}
                  icon={ImageIcon}
                />
                <StatCard
                  label="Coverage Score"
                  value={`${stats.coverageScore}%`}
                  subtext={
                    stats.gaps > 0 ? `${stats.gaps} category gaps` : 'All categories covered'
                  }
                  icon={stats.gaps > 0 ? AlertCircle : CheckCircle}
                  trend={
                    stats.coverageScore >= 80
                      ? 'up'
                      : stats.coverageScore >= 50
                        ? 'neutral'
                        : 'down'
                  }
                />
                <StatCard
                  label="Total Usage"
                  value={stats.totalUsage}
                  subtext={`Avg ${stats.avgUsage} per reference`}
                  icon={TrendingUp}
                  trend="up"
                />
                <StatCard
                  label="Active"
                  value={stats.active}
                  subtext="Ready to show"
                  icon={Palette}
                />
              </div>

              {/* Coverage Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Coverage Matrix
                  </CardTitle>
                  <CardDescription>
                    Click a cell to view images in that category. Red = 0 images, Yellow = 1-2,
                    Green = 3+
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-2xl mx-auto">
                    {/* Header row */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div /> {/* Empty corner cell */}
                      {ENERGY_BUCKETS.map((energy) => (
                        <div
                          key={energy}
                          className="text-center text-sm font-medium text-muted-foreground py-2"
                        >
                          {ENERGY_BUCKET_LABELS[energy]}
                        </div>
                      ))}
                    </div>

                    {/* Matrix rows */}
                    {TONE_BUCKETS.map((tone) => (
                      <div key={tone} className="grid grid-cols-4 gap-2 mb-2">
                        {/* Row label */}
                        <div className="flex items-center justify-end pr-3 text-sm font-medium text-muted-foreground">
                          {TONE_BUCKET_LABELS[tone]}
                        </div>

                        {/* Cells */}
                        {ENERGY_BUCKETS.map((energy) => (
                          <MatrixCell
                            key={`${tone}-${energy}`}
                            count={stats.matrix[`${tone}-${energy}`] || 0}
                            tone={tone}
                            energy={energy}
                            isSelected={
                              selectedCell?.tone === tone && selectedCell?.energy === energy
                            }
                            onClick={() => {
                              setSelectedCell({ tone, energy })
                              setActiveTab('browse')
                            }}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                        <span className="text-muted-foreground">Empty</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/30" />
                        <span className="text-muted-foreground">1-2</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
                        <span className="text-muted-foreground">3-5</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500/40 border border-green-500/50" />
                        <span className="text-muted-foreground">6+</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setActiveTab('upload')}>
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Upload Images
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('preview')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Onboarding
                    </Button>
                    {stats.gaps > 0 && (
                      <Button
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        onClick={() => {
                          // Find first gap
                          for (const tone of TONE_BUCKETS) {
                            for (const energy of ENERGY_BUCKETS) {
                              if ((stats.matrix[`${tone}-${energy}`] || 0) < 2) {
                                setSelectedCell({ tone, energy })
                                setActiveTab('browse')
                                return
                              }
                            }
                          }
                        }}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Fill Coverage Gaps
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
                <CardDescription>
                  Drag and drop images to automatically classify them using AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrandReferenceUploader onUploadComplete={fetchReferences} />
              </CardContent>
            </Card>

            {/* Web Import / Scraper */}
            <BrandReferenceScraper onUploadComplete={fetchReferences} />
          </div>

          {/* Tips */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h3 className="font-medium mb-3">Tips for Great References</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Use high-quality brand images (logos, ads, packaging, websites)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Include diverse styles across all personality categories
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Aim for 3-6 images per category for good coverage
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Review AI classifications and adjust if needed
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Scrape from Dribbble, Behance, or design blogs for inspiration
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-6 mt-6">
          {/* Top bar with search and view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search references..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {references.filter((r) => r.isActive).length} active references
            </p>
          </div>

          {/* Mini Matrix Navigation */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-6">
                <div className="text-sm font-medium text-muted-foreground">Filter by category:</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedCell === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCell(null)}
                  >
                    All
                  </Button>
                  <div className="h-6 w-px bg-border" />
                  {/* Mini matrix grid */}
                  <div className="grid grid-cols-3 gap-1">
                    {TONE_BUCKETS.map((tone) =>
                      ENERGY_BUCKETS.map((energy) => {
                        const count = stats.matrix[`${tone}-${energy}`] || 0
                        const isSelected =
                          selectedCell?.tone === tone && selectedCell?.energy === energy
                        return (
                          <button
                            key={`${tone}-${energy}`}
                            onClick={() => setSelectedCell({ tone, energy })}
                            className={cn(
                              'w-8 h-8 rounded text-xs font-medium transition-all',
                              count === 0 && 'bg-red-500/20 text-red-600 hover:bg-red-500/30',
                              count > 0 &&
                                count < 3 &&
                                'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30',
                              count >= 3 && 'bg-green-500/20 text-green-600 hover:bg-green-500/30',
                              isSelected && 'ring-2 ring-primary ring-offset-1'
                            )}
                            title={`${TONE_BUCKET_LABELS[tone]} × ${ENERGY_BUCKET_LABELS[energy]}`}
                          >
                            {count}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
                {selectedCell && (
                  <Badge variant="secondary" className="ml-auto">
                    {TONE_BUCKET_LABELS[selectedCell.tone]} ×{' '}
                    {ENERGY_BUCKET_LABELS[selectedCell.energy]}
                    <button
                      onClick={() => setSelectedCell(null)}
                      className="ml-2 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : selectedCell ? (
            /* Filtered view - single category */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {TONE_BUCKET_LABELS[selectedCell.tone]} ×{' '}
                    {ENERGY_BUCKET_LABELS[selectedCell.energy]}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filteredReferences.length} reference
                    {filteredReferences.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to this category
                </Button>
              </div>
              {filteredReferences.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No references in this category yet</p>
                    <Button onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Reference
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className={cn(
                        'group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer',
                        !ref.isActive && 'opacity-50'
                      )}
                      onClick={() => openEditDialog(ref)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ref.imageUrl}
                        alt={ref.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'https://via.placeholder.com/400x400?text=Error'
                        }}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium truncate">{ref.name}</p>
                          <p className="text-white/60 text-xs">Used {ref.usageCount}×</p>
                        </div>
                        {/* Quick actions */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleActive(ref)
                            }}
                          >
                            {ref.isActive ? (
                              <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(ref.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Status indicator */}
                      {!ref.isActive && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            Off
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Grouped view - all categories */
            <div className="space-y-8">
              {TONE_BUCKETS.map((tone) => {
                const toneRefs = references.filter(
                  (r) =>
                    r.toneBucket === tone &&
                    r.isActive &&
                    (searchTerm === '' || r.name.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                if (toneRefs.length === 0 && searchTerm) return null

                return (
                  <div key={tone} className="space-y-4">
                    {/* Tone header */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{TONE_BUCKET_LABELS[tone]}</h3>
                      <Badge variant="outline">{toneRefs.length}</Badge>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Energy sub-groups */}
                    <div className="grid gap-6 md:grid-cols-3">
                      {ENERGY_BUCKETS.map((energy) => {
                        const cellRefs = toneRefs.filter((r) => r.energyBucket === energy)
                        const cellKey = `${tone}-${energy}`

                        return (
                          <div
                            key={cellKey}
                            className={cn(
                              'rounded-xl border p-4 transition-colors',
                              cellRefs.length === 0
                                ? 'border-dashed bg-muted/30'
                                : 'bg-card hover:border-primary/30'
                            )}
                          >
                            {/* Sub-header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {ENERGY_BUCKET_LABELS[energy]}
                                </span>
                                <span
                                  className={cn(
                                    'text-xs px-1.5 py-0.5 rounded',
                                    cellRefs.length === 0 && 'bg-red-500/10 text-red-500',
                                    cellRefs.length > 0 &&
                                      cellRefs.length < 3 &&
                                      'bg-yellow-500/10 text-yellow-600',
                                    cellRefs.length >= 3 && 'bg-green-500/10 text-green-600'
                                  )}
                                >
                                  {cellRefs.length}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setSelectedCell({ tone, energy })}
                              >
                                View all
                              </Button>
                            </div>

                            {/* Thumbnails */}
                            {cellRefs.length === 0 ? (
                              <div
                                className="aspect-[3/2] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setSelectedCell({ tone, energy })
                                  openCreateDialog()
                                }}
                              >
                                <div className="text-center">
                                  <Plus className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                                  <span className="text-xs text-muted-foreground">Add images</span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5">
                                {cellRefs.slice(0, 6).map((ref, i) => (
                                  <div
                                    key={ref.id}
                                    className={cn(
                                      'aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
                                      i >= 3 && 'hidden sm:block'
                                    )}
                                    onClick={() => openEditDialog(ref)}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={ref.imageUrl}
                                      alt={ref.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        ;(e.target as HTMLImageElement).src =
                                          'https://via.placeholder.com/100x100?text=Err'
                                      }}
                                    />
                                  </div>
                                ))}
                                {cellRefs.length > 6 && (
                                  <div
                                    className="aspect-square rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80"
                                    onClick={() => setSelectedCell({ tone, energy })}
                                  >
                                    <span className="text-sm font-medium text-muted-foreground">
                                      +{cellRefs.length - 6}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Adjust Brand Signals</CardTitle>
                <CardDescription>
                  Move the sliders to see how different personality combinations look
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Tone</Label>
                      <Badge variant="outline">
                        {previewSignals.tone < 35
                          ? 'Playful'
                          : previewSignals.tone > 65
                            ? 'Serious'
                            : 'Balanced'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Playful</span>
                      <Slider
                        value={[previewSignals.tone]}
                        onValueChange={([v]) => setPreviewSignals((p) => ({ ...p, tone: v }))}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">Serious</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Energy</Label>
                      <Badge variant="outline">
                        {previewSignals.energy < 35
                          ? 'Calm'
                          : previewSignals.energy > 65
                            ? 'Energetic'
                            : 'Balanced'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Calm</span>
                      <Slider
                        value={[previewSignals.energy]}
                        onValueChange={([v]) => setPreviewSignals((p) => ({ ...p, energy: v }))}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        Energetic
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Visual Density</Label>
                      <Badge variant="outline">
                        {previewSignals.density < 35
                          ? 'Minimal'
                          : previewSignals.density > 65
                            ? 'Rich'
                            : 'Balanced'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Minimal</span>
                      <Slider
                        value={[previewSignals.density]}
                        onValueChange={([v]) => setPreviewSignals((p) => ({ ...p, density: v }))}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">Rich</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Warmth</Label>
                      <Badge variant="outline">
                        {previewSignals.warmth < 35
                          ? 'Cool'
                          : previewSignals.warmth > 65
                            ? 'Warm'
                            : 'Neutral'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Cool</span>
                      <Slider
                        value={[previewSignals.warmth]}
                        onValueChange={([v]) => setPreviewSignals((p) => ({ ...p, warmth: v }))}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">Warm</span>
                    </div>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground text-xs mb-3 block">Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewSignals({
                          tone: 20,
                          energy: 70,
                          density: 40,
                          warmth: 60,
                        })
                      }
                    >
                      Playful & Bold
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewSignals({
                          tone: 80,
                          energy: 30,
                          density: 30,
                          warmth: 40,
                        })
                      }
                    >
                      Serious & Minimal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewSignals({
                          tone: 50,
                          energy: 50,
                          density: 50,
                          warmth: 50,
                        })
                      }
                    >
                      Balanced
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewSignals({
                          tone: 70,
                          energy: 40,
                          density: 70,
                          warmth: 70,
                        })
                      }
                    >
                      Premium Luxury
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Onboarding Preview</h3>
                <Badge variant="outline">Live Preview</Badge>
              </div>
              <OnboardingPreview references={references} signals={previewSignals} />
              <p className="text-sm text-muted-foreground text-center">
                This shows how the scrolling reference images will appear during client onboarding
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Import History Tab */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <ImportLogsViewer
            target="brand_reference"
            title="Brand Library Import History"
            description="View all imports to the brand reference library"
          />
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRef ? 'Edit Brand Reference' : 'Add Brand Reference'}</DialogTitle>
            <DialogDescription>
              {editingRef
                ? 'Update the brand reference details'
                : 'Add a new brand inspiration reference'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g., Modern Tech Startup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formState.displayOrder}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      displayOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                value={formState.imageUrl}
                onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                placeholder="https://..."
              />
              {formState.imageUrl && (
                <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formState.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Brief description of this brand style..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Tone *</Label>
                <Select
                  value={formState.toneBucket}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      toneBucket: value as ToneBucket,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_BUCKETS.map((bucket) => (
                      <SelectItem key={bucket} value={bucket}>
                        {TONE_BUCKET_LABELS[bucket]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Energy *</Label>
                <Select
                  value={formState.energyBucket}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      energyBucket: value as EnergyBucket,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENERGY_BUCKETS.map((bucket) => (
                      <SelectItem key={bucket} value={bucket}>
                        {ENERGY_BUCKET_LABELS[bucket]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Density *</Label>
                <Select
                  value={formState.densityBucket}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      densityBucket: value as DensityBucket,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DENSITY_BUCKETS.map((bucket) => (
                      <SelectItem key={bucket} value={bucket}>
                        {DENSITY_BUCKET_LABELS[bucket]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color *</Label>
                <Select
                  value={formState.colorBucket}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      colorBucket: value as ColorBucket,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_BUCKETS.map((bucket) => (
                      <SelectItem key={bucket} value={bucket}>
                        {COLOR_BUCKET_LABELS[bucket]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Visual Styles</Label>
              <div className="flex flex-wrap gap-2">
                {VISUAL_STYLE_OPTIONS.map((style) => (
                  <Badge
                    key={style.value}
                    variant={formState.visualStyles.includes(style.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleVisualStyle(style.value)}
                  >
                    {style.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorSamples">Color Samples (comma-separated hex)</Label>
              <Input
                id="colorSamples"
                value={formState.colorSamples}
                onChange={(e) => setFormState({ ...formState, colorSamples: e.target.value })}
                placeholder="#FF5733, #2C3E50, #3498DB"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industries">Industries (comma-separated)</Label>
              <Input
                id="industries"
                value={formState.industries}
                onChange={(e) => setFormState({ ...formState, industries: e.target.value })}
                placeholder="Technology, SaaS, Finance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <LoadingSpinner size="sm" /> : editingRef ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
