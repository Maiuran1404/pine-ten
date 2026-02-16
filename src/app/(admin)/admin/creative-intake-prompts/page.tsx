'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Save,
  RotateCcw,
  Sparkles,
  Rocket,
  Film,
  Presentation,
  Palette,
  Target,
  Share2,
  Info,
  AlertCircle,
  Loader2,
  Code,
  MessageSquare,
  Settings2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import the default prompts and types
import { SERVICE_DEFINITIONS, SMART_DEFAULTS, type ServiceType } from '@/lib/creative-intake/types'
import { BASE_INTAKE_PROMPT, SERVICE_PROMPTS } from '@/lib/creative-intake/prompts'

// Icons mapping
const SERVICE_ICONS: Record<ServiceType, React.ElementType> = {
  launch_video: Rocket,
  video_edit: Film,
  pitch_deck: Presentation,
  brand_package: Palette,
  social_ads: Target,
  social_content: Share2,
}

interface PromptConfig {
  basePrompt: string
  servicePrompts: Record<ServiceType, string>
  smartDefaults: typeof SMART_DEFAULTS
  settings: {
    maxExchanges: number
    enableInference: boolean
    enableSmartDefaults: boolean
    enableRecommendations: boolean
  }
}

const DEFAULT_CONFIG: PromptConfig = {
  basePrompt: BASE_INTAKE_PROMPT,
  servicePrompts: SERVICE_PROMPTS,
  smartDefaults: SMART_DEFAULTS,
  settings: {
    maxExchanges: 4,
    enableInference: true,
    enableSmartDefaults: true,
    enableRecommendations: true,
  },
}

export default function CreativeIntakePromptsPage() {
  const [config, setConfig] = useState<PromptConfig>(DEFAULT_CONFIG)
  const [savedConfig, setSavedConfig] = useState<PromptConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [activeService, setActiveService] = useState<ServiceType>('launch_video')

  // Check for unsaved changes
  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(savedConfig)

  // Load saved config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/creative-intake-prompts')
      if (response.ok) {
        const data = await response.json()
        if (data.data?.config) {
          setConfig(data.data.config)
          setSavedConfig(data.data.config)
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      // Use defaults if fetch fails
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/creative-intake-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setSavedConfig(config)
      toast.success('Prompts saved successfully')
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save prompts')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    toast.info('Reset to defaults (not saved yet)')
  }

  const handleRevert = () => {
    setConfig(savedConfig)
    toast.info('Reverted to last saved state')
  }

  const updateBasePrompt = (value: string) => {
    setConfig((prev) => ({ ...prev, basePrompt: value }))
  }

  const updateServicePrompt = (service: ServiceType, value: string) => {
    setConfig((prev) => ({
      ...prev,
      servicePrompts: {
        ...prev.servicePrompts,
        [service]: value,
      },
    }))
  }

  const updateSettings = (key: keyof PromptConfig['settings'], value: number | boolean) => {
    setConfig((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }))
  }

  const updateSmartDefault = (
    category: keyof typeof SMART_DEFAULTS,
    key: string,
    value: string | string[]
  ) => {
    setConfig((prev) => ({
      ...prev,
      smartDefaults: {
        ...prev.smartDefaults,
        [category]: {
          ...prev.smartDefaults[category],
          [key]: value,
        },
      },
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creative Intake Prompts</h1>
          <p className="text-muted-foreground">
            Configure the AI prompts and smart defaults for the creative intake chat
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleRevert} disabled={!hasUnsavedChanges}>
            Revert
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Algorithm Overview Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            How the Intake Algorithm Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-medium">Service Selection</h4>
                <p className="text-sm text-muted-foreground">User picks from 6 service types</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-medium">Context Gathering</h4>
                <p className="text-sm text-muted-foreground">
                  1 open question to understand the project
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-medium">Grouped Details</h4>
                <p className="text-sm text-muted-foreground">
                  Multi-select questions with recommendations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                4
              </div>
              <div>
                <h4 className="font-medium">Review & Confirm</h4>
                <p className="text-sm text-muted-foreground">Summary with smart defaults applied</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="base-prompt" className="gap-2">
            <Code className="h-4 w-4" />
            Base Prompt
          </TabsTrigger>
          <TabsTrigger value="service-prompts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Service Prompts
          </TabsTrigger>
          <TabsTrigger value="smart-defaults" className="gap-2">
            <Zap className="h-4 w-4" />
            Smart Defaults
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Intake Behavior Settings</CardTitle>
              <CardDescription>Configure how the intake chat behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxExchanges">Maximum Exchanges</Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum back-and-forth messages before forcing completion
                  </p>
                  <Input
                    id="maxExchanges"
                    type="number"
                    min={2}
                    max={10}
                    value={config.settings.maxExchanges}
                    onChange={(e) => updateSettings('maxExchanges', parseInt(e.target.value) || 4)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Inference</Label>
                      <p className="text-sm text-muted-foreground">
                        AI extracts info from natural language
                      </p>
                    </div>
                    <Switch
                      checked={config.settings.enableInference}
                      onCheckedChange={(v) => updateSettings('enableInference', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Smart Defaults</Label>
                      <p className="text-sm text-muted-foreground">
                        Auto-apply recommendations based on context
                      </p>
                    </div>
                    <Switch
                      checked={config.settings.enableSmartDefaults}
                      onCheckedChange={(v) => updateSettings('enableSmartDefaults', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Recommendations</Label>
                      <p className="text-sm text-muted-foreground">
                        Display inline recommendations in UI
                      </p>
                    </div>
                    <Switch
                      checked={config.settings.enableRecommendations}
                      onCheckedChange={(v) => updateSettings('enableRecommendations', v)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Service Types Overview</CardTitle>
              <CardDescription>The 6 creative services available in intake</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(SERVICE_DEFINITIONS).map(([key, service]) => {
                  const Icon = SERVICE_ICONS[key as ServiceType]
                  return (
                    <div key={key} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{service.label}</h4>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                        <Badge variant="secondary" className="mt-2">
                          ~{service.estimatedQuestions} questions
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Base Prompt Tab */}
        <TabsContent value="base-prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Base System Prompt</CardTitle>
              <CardDescription>
                This prompt is included for ALL service types. It defines the AI&apos;s personality,
                communication style, and response format rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    The base prompt sets the foundation. Service-specific prompts are appended to
                    it.
                  </span>
                </div>
                <Textarea
                  value={config.basePrompt}
                  onChange={(e) => updateBasePrompt(e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Enter the base system prompt..."
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{config.basePrompt.length} characters</span>
                  <span>~{Math.ceil(config.basePrompt.length / 4)} tokens</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Prompts Tab */}
        <TabsContent value="service-prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service-Specific Prompts</CardTitle>
              <CardDescription>
                Each service has its own prompt that defines the question flow, required fields, and
                smart defaults to apply.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {/* Service Selector */}
                <div className="w-64 shrink-0 space-y-2">
                  {Object.entries(SERVICE_DEFINITIONS).map(([key, service]) => {
                    const Icon = SERVICE_ICONS[key as ServiceType]
                    const isActive = activeService === key
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveService(key as ServiceType)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted border border-transparent'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <div>
                          <div className="font-medium text-sm">{service.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {service.estimatedQuestions} questions
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Prompt Editor */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {SERVICE_DEFINITIONS[activeService].label} Prompt
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {SERVICE_DEFINITIONS[activeService].description}
                      </p>
                    </div>
                    <Badge variant="outline">{activeService}</Badge>
                  </div>
                  <Textarea
                    value={config.servicePrompts[activeService]}
                    onChange={(e) => updateServicePrompt(activeService, e.target.value)}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder={`Enter the ${SERVICE_DEFINITIONS[activeService].label} prompt...`}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{config.servicePrompts[activeService].length} characters</span>
                    <span>
                      Total with base: ~
                      {Math.ceil(
                        (config.basePrompt.length + config.servicePrompts[activeService].length) / 4
                      )}{' '}
                      tokens
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Defaults Tab */}
        <TabsContent value="smart-defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Smart Defaults Configuration</CardTitle>
              <CardDescription>
                These defaults are automatically applied based on user selections. They reduce the
                number of questions needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {/* Video Length Defaults */}
                <AccordionItem value="video-length">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Video Length by Platform
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-3 pt-4">
                      {Object.entries(config.smartDefaults.videoLength).map(
                        ([platform, length]) => (
                          <div key={platform} className="space-y-2">
                            <Label className="capitalize">{platform}</Label>
                            <Input
                              value={length}
                              onChange={(e) =>
                                updateSmartDefault('videoLength', platform, e.target.value)
                              }
                              placeholder="e.g., 15-30s"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Ad Format Defaults */}
                <AccordionItem value="ad-format">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Ad Format by Goal
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2 pt-4">
                      {Object.entries(config.smartDefaults.adFormat).map(([goal, format]) => (
                        <div key={goal} className="space-y-2">
                          <Label className="capitalize">{goal}</Label>
                          <Select
                            value={format}
                            onValueChange={(v) => updateSmartDefault('adFormat', goal, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="static">Static</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="carousel">Carousel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Posting Frequency Defaults */}
                <AccordionItem value="posting-frequency">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Posting Frequency by Goal
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2 pt-4">
                      {Object.entries(config.smartDefaults.postingFrequency).map(([goal, freq]) => (
                        <div key={goal} className="space-y-2">
                          <Label className="capitalize">{goal}</Label>
                          <Select
                            value={freq}
                            onValueChange={(v) => updateSmartDefault('postingFrequency', goal, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3x_week">3x per week</SelectItem>
                              <SelectItem value="5x_week">5x per week</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Content Types Defaults */}
                <AccordionItem value="content-types">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Content Types by Goal
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2 pt-4">
                      {Object.entries(config.smartDefaults.contentTypes).map(([goal, types]) => (
                        <div key={goal} className="space-y-2">
                          <Label className="capitalize">{goal}</Label>
                          <Input
                            value={Array.isArray(types) ? types.join(', ') : types}
                            onChange={(e) =>
                              updateSmartDefault(
                                'contentTypes',
                                goal,
                                e.target.value.split(',').map((t) => t.trim())
                              )
                            }
                            placeholder="educational, storytelling"
                          />
                          <p className="text-xs text-muted-foreground">Comma-separated list</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Video Style Defaults */}
                <AccordionItem value="video-style">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      Video Style by Type
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-3 pt-4">
                      {Object.entries(config.smartDefaults.videoStyle).map(([type, style]) => (
                        <div key={type} className="space-y-2">
                          <Label className="capitalize">{type.replace(/_/g, ' ')}</Label>
                          <Select
                            value={style}
                            onValueChange={(v) => updateSmartDefault('videoStyle', type, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clean">Clean</SelectItem>
                              <SelectItem value="energetic">Energetic</SelectItem>
                              <SelectItem value="cinematic">Cinematic</SelectItem>
                              <SelectItem value="meme">Meme</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
