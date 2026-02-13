'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertCircle,
  Check,
  Clock,
  Brain,
  Target,
  Globe,
  Briefcase,
  TrendingUp,
  Save,
  Rocket,
  RefreshCw,
  Info,
  ChevronRight,
  Zap,
  Scale,
} from 'lucide-react'

interface AlgorithmConfig {
  id: string | null
  version: number
  name: string
  description: string | null
  isActive: boolean
  weights: {
    skillMatch: number
    timezoneFit: number
    experienceMatch: number
    workloadBalance: number
    performanceHistory: number
  }
  acceptanceWindows: {
    critical: number
    urgent: number
    standard: number
    flexible: number
  }
  escalationSettings: {
    level1SkillThreshold: number
    level2SkillThreshold: number
    level1MaxOffers: number
    level2MaxOffers: number
    level3BroadcastMinutes: number
    maxWorkloadOverride: number
  }
  timezoneSettings: {
    peakHoursStart: string
    peakHoursEnd: string
    peakScore: number
    eveningScore: number
    earlyMorningScore: number
    lateEveningScore: number
    nightScore: number
  }
  experienceMatrix: {
    SIMPLE: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number }
    INTERMEDIATE: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number }
    ADVANCED: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number }
    EXPERT: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number }
  }
  workloadSettings: {
    maxActiveTasks: number
    scorePerTask: number
  }
  exclusionRules: {
    minSkillScoreToInclude: number
    excludeOverloaded: boolean
    excludeNightHoursForUrgent: boolean
    excludeVacationMode: boolean
  }
  bonusModifiers: {
    categorySpecializationBonus: number
    niceToHaveSkillBonus: number
    favoriteArtistBonus: number
  }
  publishedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface ConfigurationListItem {
  id: string
  version: number
  name: string
  isActive: boolean
  publishedAt: string | null
  createdAt: string
}

const WEIGHT_ICONS = {
  skillMatch: Target,
  timezoneFit: Globe,
  experienceMatch: Briefcase,
  workloadBalance: Scale,
  performanceHistory: TrendingUp,
}

const WEIGHT_LABELS = {
  skillMatch: 'Skill Match',
  timezoneFit: 'Timezone Fit',
  experienceMatch: 'Experience Match',
  workloadBalance: 'Workload Balance',
  performanceHistory: 'Performance History',
}

const WEIGHT_DESCRIPTIONS = {
  skillMatch: "How well the artist's skills match the task requirements",
  timezoneFit: 'Whether the artist is in working hours when the task arrives',
  experienceMatch: 'Match between task complexity and artist experience level',
  workloadBalance: 'Current number of active tasks the artist has',
  performanceHistory: "Artist's rating, on-time delivery, and acceptance rates",
}

export default function AlgorithmPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [configurations, setConfigurations] = useState<ConfigurationListItem[]>([])
  const [activeConfig, setActiveConfig] = useState<AlgorithmConfig | null>(null)
  const [editingConfig, setEditingConfig] = useState<AlgorithmConfig | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const [newVersionDescription, setNewVersionDescription] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/algorithm')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()

      setConfigurations(data.configurations || [])
      setActiveConfig(data.activeConfig)
      setEditingConfig(JSON.parse(JSON.stringify(data.activeConfig))) // Deep clone
    } catch (_error) {
      toast.error('Failed to load algorithm configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateWeight = (key: keyof AlgorithmConfig['weights'], value: number) => {
    if (!editingConfig) return

    const currentTotal = Object.values(editingConfig.weights).reduce((a, b) => a + b, 0)
    const currentValue = editingConfig.weights[key]
    const diff = value - currentValue
    const newTotal = currentTotal + diff

    // If going over 100, cap the value
    if (newTotal > 100) {
      value = currentValue + (100 - currentTotal + diff)
    }

    setEditingConfig({
      ...editingConfig,
      weights: {
        ...editingConfig.weights,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateAcceptanceWindow = (
    key: keyof AlgorithmConfig['acceptanceWindows'],
    value: number
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      acceptanceWindows: {
        ...editingConfig.acceptanceWindows,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateEscalationSetting = (
    key: keyof AlgorithmConfig['escalationSettings'],
    value: number
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      escalationSettings: {
        ...editingConfig.escalationSettings,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateTimezoneSettings = (
    key: keyof AlgorithmConfig['timezoneSettings'],
    value: string | number
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      timezoneSettings: {
        ...editingConfig.timezoneSettings,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateExperienceMatrix = (
    complexity: keyof AlgorithmConfig['experienceMatrix'],
    level: 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT',
    value: number
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      experienceMatrix: {
        ...editingConfig.experienceMatrix,
        [complexity]: {
          ...editingConfig.experienceMatrix[complexity],
          [level]: value,
        },
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateWorkloadSettings = (
    key: keyof AlgorithmConfig['workloadSettings'],
    value: number
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      workloadSettings: {
        ...editingConfig.workloadSettings,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateExclusionRule = (
    key: keyof AlgorithmConfig['exclusionRules'],
    value: boolean | number
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      exclusionRules: {
        ...editingConfig.exclusionRules,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const updateBonusModifier = (key: keyof AlgorithmConfig['bonusModifiers'], value: number) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      bonusModifiers: {
        ...editingConfig.bonusModifiers,
        [key]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const createNewVersion = async () => {
    if (!editingConfig) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingConfig,
          name: newVersionName || `Configuration v${configurations.length + 1}`,
          description: newVersionDescription,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create new version')
      }

      toast.success('New configuration version created')
      setNewVersionDialogOpen(false)
      setNewVersionName('')
      setNewVersionDescription('')
      setHasUnsavedChanges(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create new version')
    } finally {
      setIsSaving(false)
    }
  }

  const publishConfiguration = async () => {
    if (!editingConfig?.id) {
      // Need to create first
      await createNewVersion()
      return
    }

    try {
      setIsPublishing(true)
      const response = await fetch('/api/admin/algorithm/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingConfig.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to publish')
      }

      toast.success('Configuration published and now active!')
      setPublishDialogOpen(false)
      setHasUnsavedChanges(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }

  const resetToDefault = () => {
    if (!activeConfig) return
    setEditingConfig(JSON.parse(JSON.stringify(activeConfig)))
    setHasUnsavedChanges(false)
    toast.info('Reset to active configuration')
  }

  const weightsTotal = editingConfig
    ? Object.values(editingConfig.weights).reduce((a, b) => a + b, 0)
    : 0

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Assignment Algorithm
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure how tasks are automatically matched to artists
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={resetToDefault} disabled={!hasUnsavedChanges}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Dialog open={newVersionDialogOpen} onOpenChange={setNewVersionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!hasUnsavedChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save as New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save New Configuration Version</DialogTitle>
                <DialogDescription>
                  This will create a new draft version. You can publish it later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Version Name</Label>
                  <Input
                    placeholder={`Configuration v${configurations.length + 1}`}
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="What changes does this version include?"
                    value={newVersionDescription}
                    onChange={(e) => setNewVersionDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewVersionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createNewVersion} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Version'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Rocket className="h-4 w-4 mr-2" />
                Publish
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish Configuration</DialogTitle>
                <DialogDescription>
                  This will make these settings active immediately. All new task assignments will
                  use this configuration.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>This action cannot be undone easily.</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={publishConfiguration} disabled={isPublishing}>
                  {isPublishing ? 'Publishing...' : 'Publish Now'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Configuration Status */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">Active Configuration:</span>
              <span>{activeConfig?.name || 'Default'}</span>
              {activeConfig?.publishedAt && (
                <span className="text-muted-foreground text-sm">
                  Published {new Date(activeConfig.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-green-500 border-green-500">
              v{activeConfig?.version || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How the Algorithm Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  1
                </div>
                Score All Artists
              </div>
              <p className="text-sm text-muted-foreground pl-10">
                When a task is created, the algorithm calculates a match score (0-100) for each
                available artist based on weighted factors.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  2
                </div>
                Offer to Best Match
              </div>
              <p className="text-sm text-muted-foreground pl-10">
                The highest-scoring artist receives the task offer and has a limited time to accept
                based on task urgency.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  3
                </div>
                Escalate if Needed
              </div>
              <p className="text-sm text-muted-foreground pl-10">
                If declined or expired, the offer moves to the next best artist. After multiple
                attempts, it escalates to admin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {editingConfig && (
        <Tabs defaultValue="weights" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="weights">Weights</TabsTrigger>
            <TabsTrigger value="acceptance">Acceptance</TabsTrigger>
            <TabsTrigger value="escalation">Escalation</TabsTrigger>
            <TabsTrigger value="timezone">Timezone</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
          </TabsList>

          {/* Weights Tab */}
          <TabsContent value="weights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scoring Weights</CardTitle>
                <CardDescription>
                  Adjust the importance of each factor in the matching algorithm. Weights must sum
                  to 100%.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div
                  className={`text-center p-3 rounded-lg ${
                    weightsTotal === 100
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  Total: {weightsTotal}%{' '}
                  {weightsTotal === 100 ? (
                    <Check className="inline h-4 w-4 ml-1" />
                  ) : (
                    <span>(must equal 100%)</span>
                  )}
                </div>

                {(
                  Object.entries(editingConfig.weights) as [
                    keyof AlgorithmConfig['weights'],
                    number,
                  ][]
                ).map(([key, value]) => {
                  const Icon = WEIGHT_ICONS[key]
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <Label className="text-base">{WEIGHT_LABELS[key]}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{WEIGHT_DESCRIPTIONS[key]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={value}
                            onChange={(e) => updateWeight(key, parseInt(e.target.value) || 0)}
                            className="w-20 text-right"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      <Slider
                        value={[value]}
                        max={100}
                        step={5}
                        onValueChange={([v]) => updateWeight(key, v)}
                        className="cursor-pointer"
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Visual Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Weight Distribution Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {(
                    Object.entries(editingConfig.weights) as [
                      keyof AlgorithmConfig['weights'],
                      number,
                    ][]
                  ).map(([key, value], index) => {
                    const colors = [
                      'bg-blue-500',
                      'bg-green-500',
                      'bg-purple-500',
                      'bg-orange-500',
                      'bg-pink-500',
                    ]
                    return (
                      <TooltipProvider key={key}>
                        <Tooltip>
                          <TooltipTrigger
                            className={`${colors[index]} transition-all`}
                            style={{ width: `${value}%` }}
                          />
                          <TooltipContent>
                            {WEIGHT_LABELS[key]}: {value}%
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                  {(
                    Object.entries(editingConfig.weights) as [
                      keyof AlgorithmConfig['weights'],
                      number,
                    ][]
                  ).map(([key, _value], index) => {
                    const colors = [
                      'bg-blue-500',
                      'bg-green-500',
                      'bg-purple-500',
                      'bg-orange-500',
                      'bg-pink-500',
                    ]
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${colors[index]}`} />
                        <span>{WEIGHT_LABELS[key].split(' ')[0]}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acceptance Windows Tab */}
          <TabsContent value="acceptance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Acceptance Windows
                </CardTitle>
                <CardDescription>
                  How long an artist has to accept a task offer before it moves to the next best
                  match.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(
                  Object.entries(editingConfig.acceptanceWindows) as [
                    keyof AlgorithmConfig['acceptanceWindows'],
                    number,
                  ][]
                ).map(([key, value]) => {
                  const urgencyColors = {
                    critical: 'text-red-500',
                    urgent: 'text-orange-500',
                    standard: 'text-blue-500',
                    flexible: 'text-green-500',
                  }
                  const urgencyDescriptions = {
                    critical: 'Deadline < 4 hours',
                    urgent: 'Deadline < 24 hours',
                    standard: 'Deadline < 72 hours',
                    flexible: 'Deadline > 72 hours or none',
                  }
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className={`text-base capitalize ${urgencyColors[key]}`}>
                            {key} Tasks
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {urgencyDescriptions[key]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={value}
                            onChange={(e) =>
                              updateAcceptanceWindow(key, parseInt(e.target.value) || 1)
                            }
                            className="w-24 text-right"
                          />
                          <span className="text-muted-foreground w-16">minutes</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {value < 60
                          ? `${value} minutes`
                          : value === 60
                            ? '1 hour'
                            : `${Math.floor(value / 60)}h ${value % 60}m`}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalation Tab */}
          <TabsContent value="escalation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChevronRight className="h-5 w-5" />
                  Escalation Settings
                </CardTitle>
                <CardDescription>
                  Configure how the algorithm escalates when artists decline or don&apos;t respond
                  to offers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Level 1 - Best Matches</h4>
                    <div className="space-y-4 pl-4 border-l-2 border-blue-500">
                      <div className="space-y-2">
                        <Label>Minimum Skill Score</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={editingConfig.escalationSettings.level1SkillThreshold}
                            onChange={(e) =>
                              updateEscalationSetting(
                                'level1SkillThreshold',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Only artists with skill score above this are considered
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Offers</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={editingConfig.escalationSettings.level1MaxOffers}
                          onChange={(e) =>
                            updateEscalationSetting(
                              'level1MaxOffers',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-24"
                        />
                        <p className="text-xs text-muted-foreground">
                          Number of artists to try before escalating
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Level 2 - Relaxed Matching</h4>
                    <div className="space-y-4 pl-4 border-l-2 border-orange-500">
                      <div className="space-y-2">
                        <Label>Minimum Skill Score</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={editingConfig.escalationSettings.level2SkillThreshold}
                            onChange={(e) =>
                              updateEscalationSetting(
                                'level2SkillThreshold',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Offers</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={editingConfig.escalationSettings.level2MaxOffers}
                          onChange={(e) =>
                            updateEscalationSetting(
                              'level2MaxOffers',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-24"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Workload Override</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">+</span>
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            value={editingConfig.escalationSettings.maxWorkloadOverride}
                            onChange={(e) =>
                              updateEscalationSetting(
                                'maxWorkloadOverride',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-24"
                          />
                          <span className="text-muted-foreground">extra tasks</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Allow slightly overloaded artists in Level 2
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Level 3 - Broadcast Mode</h4>
                  <div className="pl-4 border-l-2 border-red-500">
                    <div className="space-y-2">
                      <Label>Broadcast Duration</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={5}
                          max={120}
                          value={editingConfig.escalationSettings.level3BroadcastMinutes}
                          onChange={(e) =>
                            updateEscalationSetting(
                              'level3BroadcastMinutes',
                              parseInt(e.target.value) || 30
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">minutes</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Task is posted to all artists for this duration before admin intervention
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timezone Tab */}
          <TabsContent value="timezone" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Timezone Scoring
                </CardTitle>
                <CardDescription>
                  Configure how artist local time affects their matching score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peak Hours Start</Label>
                    <Input
                      type="time"
                      value={editingConfig.timezoneSettings.peakHoursStart}
                      onChange={(e) => updateTimezoneSettings('peakHoursStart', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peak Hours End</Label>
                    <Input
                      type="time"
                      value={editingConfig.timezoneSettings.peakHoursEnd}
                      onChange={(e) => updateTimezoneSettings('peakHoursEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Time Period Scores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'peakScore' as const,
                        label: 'Peak Hours (9AM-6PM)',
                        color: 'text-green-500',
                      },
                      {
                        key: 'eveningScore' as const,
                        label: 'Evening (6PM-9PM)',
                        color: 'text-blue-500',
                      },
                      {
                        key: 'earlyMorningScore' as const,
                        label: 'Early Morning (7AM-9AM)',
                        color: 'text-yellow-500',
                      },
                      {
                        key: 'lateEveningScore' as const,
                        label: 'Late Evening (9PM-11PM)',
                        color: 'text-orange-500',
                      },
                      {
                        key: 'nightScore' as const,
                        label: 'Night (11PM-7AM)',
                        color: 'text-red-500',
                      },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className={color}>{label}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={editingConfig.timezoneSettings[key] as number}
                            onChange={(e) =>
                              updateTimezoneSettings(key, parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                          <span className="text-muted-foreground text-sm">pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experience Matrix Tab */}
          <TabsContent value="experience" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience Matching Matrix
                </CardTitle>
                <CardDescription>
                  Define how task complexity should match with artist experience level. Higher
                  scores = better match.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Task Complexity</th>
                        <th className="text-center py-3 px-4">Junior</th>
                        <th className="text-center py-3 px-4">Mid</th>
                        <th className="text-center py-3 px-4">Senior</th>
                        <th className="text-center py-3 px-4">Expert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['SIMPLE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const).map(
                        (complexity) => (
                          <tr key={complexity} className="border-b">
                            <td className="py-3 px-4 font-medium capitalize">
                              {complexity.toLowerCase()}
                            </td>
                            {(['JUNIOR', 'MID', 'SENIOR', 'EXPERT'] as const).map((level) => {
                              const value = editingConfig.experienceMatrix[complexity][level]
                              const colorClass =
                                value >= 80
                                  ? 'bg-green-500/20'
                                  : value >= 50
                                    ? 'bg-yellow-500/20'
                                    : 'bg-red-500/20'
                              return (
                                <td key={level} className="py-3 px-4 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={value}
                                    onChange={(e) =>
                                      updateExperienceMatrix(
                                        complexity,
                                        level,
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className={`w-16 text-center mx-auto ${colorClass}`}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Tip: Use lower scores to prevent mismatches (e.g., 0 for Junior artists on Expert
                  tasks).
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workload Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Maximum Active Tasks</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={editingConfig.workloadSettings.maxActiveTasks}
                      onChange={(e) =>
                        updateWorkloadSettings('maxActiveTasks', parseInt(e.target.value) || 5)
                      }
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Artists with this many tasks are excluded from new assignments
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Score Penalty per Task</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={editingConfig.workloadSettings.scorePerTask}
                        onChange={(e) =>
                          updateWorkloadSettings('scorePerTask', parseInt(e.target.value) || 20)
                        }
                        className="w-24"
                      />
                      <span className="text-muted-foreground">points per task</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exclusion Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Minimum Skill Score to Include</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editingConfig.exclusionRules.minSkillScoreToInclude}
                        onChange={(e) =>
                          updateExclusionRule(
                            'minSkillScoreToInclude',
                            parseInt(e.target.value) || 50
                          )
                        }
                        className="w-24"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'excludeOverloaded' as const,
                        label: 'Exclude overloaded artists',
                      },
                      {
                        key: 'excludeNightHoursForUrgent' as const,
                        label: 'Exclude night hours for urgent tasks',
                      },
                      {
                        key: 'excludeVacationMode' as const,
                        label: 'Exclude artists on vacation',
                      },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingConfig.exclusionRules[key] as boolean}
                          onChange={(e) => updateExclusionRule(key, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Bonus Modifiers
                  </CardTitle>
                  <CardDescription>
                    Extra points added to an artist&apos;s score for specific conditions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Category Specialization Bonus</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">+</span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={editingConfig.bonusModifiers.categorySpecializationBonus}
                          onChange={(e) =>
                            updateBonusModifier(
                              'categorySpecializationBonus',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">pts</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When artist&apos;s preferred category matches task
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Nice-to-Have Skill Bonus</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">+</span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={editingConfig.bonusModifiers.niceToHaveSkillBonus}
                          onChange={(e) =>
                            updateBonusModifier(
                              'niceToHaveSkillBonus',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">pts</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Per optional skill matched</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Favorite Artist Bonus</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">+</span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={editingConfig.bonusModifiers.favoriteArtistBonus}
                          onChange={(e) =>
                            updateBonusModifier(
                              'favoriteArtistBonus',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">pts</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When client has favorited the artist
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Version History */}
      {configurations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {configurations.slice(0, 5).map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    config.isActive ? 'bg-green-500/10 border-green-500/20' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={config.isActive ? 'default' : 'outline'}>
                      v{config.version}
                    </Badge>
                    <span className="font-medium">{config.name}</span>
                    {config.isActive && <Badge className="bg-green-500">Active</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {config.publishedAt
                      ? `Published ${new Date(config.publishedAt).toLocaleDateString()}`
                      : `Created ${new Date(config.createdAt).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
