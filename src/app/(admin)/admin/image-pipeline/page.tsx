'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Save,
  RotateCcw,
  Loader2,
  Wand2,
  ArrowRight,
  Plus,
  Trash2,
  Eye,
  Settings2,
  Clapperboard,
  Type,
  Layers,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCsrfContext } from '@/providers/csrf-provider'
import type { ImagePipelineConfig, VocabularyMaps } from '@/lib/ai/image-pipeline-config'

type VocabularyKey = keyof VocabularyMaps

export default function ImagePipelinePage() {
  const { csrfFetch } = useCsrfContext()
  const [config, setConfig] = useState<ImagePipelineConfig | null>(null)
  const [defaults, setDefaults] = useState<ImagePipelineConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Preview state
  const [previewScene, setPreviewScene] = useState({
    title: 'The Problem',
    description: 'User struggling with outdated software',
    visualNote: 'Dark office, harsh fluorescent light',
    cameraNote: 'close up',
    voiceover: 'You know that feeling when nothing works?',
    imageGenerationPrompt:
      'Close-up of a cracked phone screen showing a frozen loading bar, harsh fluorescent office light reflecting off the glass',
  })
  const [previewResult, setPreviewResult] = useState<{
    assembledPrompt: string
    parts: Array<{ label: string; content: string }>
    charCount: number
    promptCap: number
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  // Load config
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/image-pipeline')
        if (!res.ok) throw new Error('Failed to load config')
        const data = await res.json()
        setDefaults(data.data.defaults)

        if (data.data.config) {
          // Deep merge stored config with defaults for the editor
          setConfig(deepMerge(data.data.defaults, data.data.config))
        } else {
          setConfig(structuredClone(data.data.defaults))
        }
      } catch {
        toast.error('Failed to load image pipeline config')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateConfig = useCallback(
    <K extends keyof ImagePipelineConfig>(section: K, updates: Partial<ImagePipelineConfig[K]>) => {
      setConfig((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          [section]: { ...prev[section], ...updates },
        }
      })
      setHasChanges(true)
    },
    []
  )

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await csrfFetch('/api/admin/image-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Image pipeline config saved')
      setHasChanges(false)
    } catch {
      toast.error('Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!defaults) return
    setConfig(structuredClone(defaults))
    setHasChanges(true)
    toast.info('Config reset to defaults — save to apply')
  }

  const handlePreview = async () => {
    if (!config) return
    setPreviewing(true)
    try {
      const res = await csrfFetch('/api/admin/image-pipeline/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, scene: previewScene }),
      })
      if (!res.ok) throw new Error('Preview failed')
      const data = await res.json()
      setPreviewResult(data.data)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Clapperboard className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Image Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Configure storyboard image generation prompts, vocabulary, and providers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Pipeline Flow Diagram */}
      <div className="shrink-0 border-b bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <PipelineStep icon={<Wand2 className="h-3.5 w-3.5" />} label="AI Prompt" active />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <PipelineStep icon={<Type className="h-3.5 w-3.5" />} label="Scene Content" />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <PipelineStep icon={<Layers className="h-3.5 w-3.5" />} label="Vocab Lookups" />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <PipelineStep icon={<Eye className="h-3.5 w-3.5" />} label="Color Palette" />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <PipelineStep icon={<Zap className="h-3.5 w-3.5" />} label="Quality Footer" />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <PipelineStep icon={<Settings2 className="h-3.5 w-3.5" />} label="Provider Chain" />
        </div>
      </div>

      {/* Tabbed Editors */}
      <div className="min-h-0 flex-1">
        <Tabs defaultValue="prompts" className="flex h-full flex-col">
          <div className="shrink-0 border-b px-6">
            <TabsList className="h-10">
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="vocabulary">Cinematic Vocabulary</TabsTrigger>
              <TabsTrigger value="providers">Provider Config</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <TabsContent value="prompts" className="mt-0">
              <PromptsTab config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="vocabulary" className="mt-0">
              <VocabularyTab config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="providers" className="mt-0">
              <ProviderTab config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="execution" className="mt-0">
              <ExecutionTab config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <PreviewTab
                scene={previewScene}
                setScene={setPreviewScene}
                result={previewResult}
                onPreview={handlePreview}
                previewing={previewing}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Pipeline Step Chip ──────────────────────────────────────────────────────

function PipelineStep({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5',
        active ? 'border-ds-accent bg-ds-accent/10 text-ds-accent' : 'text-muted-foreground'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  )
}

// ─── Tab: Prompts ────────────────────────────────────────────────────────────

function PromptsTab({
  config,
  updateConfig,
}: {
  config: ImagePipelineConfig
  updateConfig: <K extends keyof ImagePipelineConfig>(
    section: K,
    updates: Partial<ImagePipelineConfig[K]>
  ) => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality Footer</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.qualityFooter}
            onChange={(e) => updateConfig('prompts', { qualityFooter: e.target.value })}
            rows={3}
            className="font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Appended to every assembled prompt. Defines the overall image quality standard.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Consistency Prefix</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.batchPrefix}
            onChange={(e) => updateConfig('prompts', { batchPrefix: e.target.value })}
            rows={2}
            className="font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Prepended to all scenes in a multi-scene batch to ensure visual consistency.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Negative Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.prompts.negativePrompt}
            onChange={(e) => updateConfig('prompts', { negativePrompt: e.target.value })}
            rows={3}
            className="font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sent to providers that support negative prompts (filters unwanted artifacts).
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt Cap</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={config.prompts.promptCap}
              onChange={(e) =>
                updateConfig('prompts', { promptCap: parseInt(e.target.value) || 1500 })
              }
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Max characters for assembled prompts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject Anchor Cap</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={config.prompts.subjectAnchorCap}
              onChange={(e) =>
                updateConfig('prompts', { subjectAnchorCap: parseInt(e.target.value) || 150 })
              }
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Max characters for subject extraction
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab: Vocabulary ─────────────────────────────────────────────────────────

const VOCABULARY_TABS: Array<{ key: VocabularyKey; label: string }> = [
  { key: 'cameraShots', label: 'Camera Shots' },
  { key: 'moodLighting', label: 'Mood Lighting' },
  { key: 'colorTemperature', label: 'Color Temp' },
  { key: 'styleAxes', label: 'Style Axes' },
  { key: 'density', label: 'Density' },
  { key: 'energy', label: 'Energy' },
  { key: 'industry', label: 'Industry' },
]

function VocabularyTab({
  config,
  updateConfig,
}: {
  config: ImagePipelineConfig
  updateConfig: <K extends keyof ImagePipelineConfig>(
    section: K,
    updates: Partial<ImagePipelineConfig[K]>
  ) => void
}) {
  const [activeVocab, setActiveVocab] = useState<VocabularyKey>('cameraShots')

  const updateVocabEntry = (vocabKey: VocabularyKey, entryKey: string, value: string) => {
    const updated = { ...config.vocabulary[vocabKey], [entryKey]: value }
    updateConfig('vocabulary', { [vocabKey]: updated } as Partial<VocabularyMaps>)
  }

  const deleteVocabEntry = (vocabKey: VocabularyKey, entryKey: string) => {
    const updated = { ...config.vocabulary[vocabKey] }
    delete updated[entryKey]
    updateConfig('vocabulary', { [vocabKey]: updated } as Partial<VocabularyMaps>)
  }

  const addVocabEntry = (vocabKey: VocabularyKey) => {
    const newKey = `new-${Date.now()}`
    updateVocabEntry(vocabKey, newKey, 'New description')
  }

  const map = config.vocabulary[activeVocab]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VOCABULARY_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeVocab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveVocab(tab.key)}
          >
            {tab.label}
            <Badge variant="secondary" className="ml-1.5">
              {Object.keys(config.vocabulary[tab.key]).length}
            </Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="grid grid-cols-[200px_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
              <span>Key</span>
              <span>Description</span>
              <span />
            </div>
            {Object.entries(map).map(([key, description]) => (
              <div key={key} className="grid grid-cols-[200px_1fr_40px] gap-2">
                <Input
                  value={key}
                  onChange={(e) => {
                    const newMap = { ...map }
                    delete newMap[key]
                    newMap[e.target.value] = description
                    updateConfig('vocabulary', { [activeVocab]: newMap } as Partial<VocabularyMaps>)
                  }}
                  className="font-mono text-xs"
                />
                <Input
                  value={description}
                  onChange={(e) => updateVocabEntry(activeVocab, key, e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteVocabEntry(activeVocab, key)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => addVocabEntry(activeVocab)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Entry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Provider Config ────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<string, string> = {
  hero: 'Hero Frame (best quality)',
  consistency: 'Consistency Scenes',
  standard: 'Standard Regeneration',
  fallback: 'Fallback (cheapest)',
}

function ProviderTab({
  config,
  updateConfig,
}: {
  config: ImagePipelineConfig
  updateConfig: <K extends keyof ImagePipelineConfig>(
    section: K,
    updates: Partial<ImagePipelineConfig[K]>
  ) => void
}) {
  const moveProvider = (
    strategy: keyof ImagePipelineConfig['providers']['chains'],
    index: number,
    direction: 'up' | 'down'
  ) => {
    const chain = [...config.providers.chains[strategy]]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= chain.length) return
    ;[chain[index], chain[newIndex]] = [chain[newIndex], chain[index]]
    updateConfig('providers', {
      chains: { ...config.providers.chains, [strategy]: chain },
    })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {(
        Object.keys(config.providers.chains) as Array<
          keyof ImagePipelineConfig['providers']['chains']
        >
      ).map((strategy) => (
        <Card key={strategy}>
          <CardHeader>
            <CardTitle className="text-sm">{STRATEGY_LABELS[strategy] || strategy}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {config.providers.chains[strategy].map((provider, i) => (
                <div
                  key={`${strategy}-${i}`}
                  className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm"
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {i + 1}
                  </Badge>
                  <span className="flex-1 font-mono text-xs">{provider}</span>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => moveProvider(strategy, i, 'up')}
                    >
                      <span className="text-xs">↑</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === config.providers.chains[strategy].length - 1}
                      onClick={() => moveProvider(strategy, i, 'down')}
                    >
                      <span className="text-xs">↓</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Tab: Execution ──────────────────────────────────────────────────────────

function ExecutionTab({
  config,
  updateConfig,
}: {
  config: ImagePipelineConfig
  updateConfig: <K extends keyof ImagePipelineConfig>(
    section: K,
    updates: Partial<ImagePipelineConfig[K]>
  ) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Max Retries</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min={1}
            max={10}
            value={config.executionLimits.maxRetries}
            onChange={(e) =>
              updateConfig('executionLimits', { maxRetries: parseInt(e.target.value) || 3 })
            }
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Per-provider retry attempts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Concurrency Limit</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min={1}
            max={8}
            value={config.executionLimits.concurrencyLimit}
            onChange={(e) =>
              updateConfig('executionLimits', { concurrencyLimit: parseInt(e.target.value) || 4 })
            }
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Parallel scene generations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Max Style Refs</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min={1}
            max={9}
            value={config.executionLimits.maxStyleRefs}
            onChange={(e) =>
              updateConfig('executionLimits', { maxStyleRefs: parseInt(e.target.value) || 4 })
            }
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Style reference images per scene</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Max Scenes</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min={1}
            max={24}
            value={config.executionLimits.maxScenes}
            onChange={(e) =>
              updateConfig('executionLimits', { maxScenes: parseInt(e.target.value) || 12 })
            }
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Max scenes per batch</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Image Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['1536x1024', '1024x1024', '1024x1536'] as const).map((size) => (
              <Button
                key={size}
                variant={config.executionLimits.imageSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig('executionLimits', { imageSize: size })}
              >
                {size === '1536x1024' ? '3:2' : size === '1024x1024' ? '1:1' : '2:3'}
              </Button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{config.executionLimits.imageSize}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Preview ────────────────────────────────────────────────────────────

function PreviewTab({
  scene,
  setScene,
  result,
  onPreview,
  previewing,
}: {
  scene: {
    title: string
    description: string
    visualNote: string
    cameraNote: string
    voiceover: string
    imageGenerationPrompt: string
  }
  setScene: React.Dispatch<
    React.SetStateAction<{
      title: string
      description: string
      visualNote: string
      cameraNote: string
      voiceover: string
      imageGenerationPrompt: string
    }>
  >
  result: {
    assembledPrompt: string
    parts: Array<{ label: string; content: string }>
    charCount: number
    promptCap: number
  } | null
  onPreview: () => void
  previewing: boolean
}) {
  const PART_COLORS: Record<string, string> = {
    'Visual DNA': 'border-l-ds-accent',
    'Subject + Content': 'border-l-ds-success',
    'Style + Camera': 'border-l-ds-warning',
    'Color Palette': 'border-l-[var(--crafted-sage)]',
    'Quality Footer': 'border-l-ds-error',
  }

  return (
    <div className="grid h-full grid-cols-2 gap-6">
      {/* Left: Scene Editor */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Sample Scene</h3>
        {(
          [
            'title',
            'description',
            'visualNote',
            'cameraNote',
            'voiceover',
            'imageGenerationPrompt',
          ] as const
        ).map((field) => (
          <div key={field}>
            <Label className="text-xs capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
            {field === 'imageGenerationPrompt' || field === 'description' ? (
              <Textarea
                value={scene[field] || ''}
                onChange={(e) => setScene({ ...scene, [field]: e.target.value })}
                rows={2}
                className="mt-1 font-mono text-xs"
              />
            ) : (
              <Input
                value={scene[field] || ''}
                onChange={(e) => setScene({ ...scene, [field]: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
            )}
          </div>
        ))}
        <Button onClick={onPreview} disabled={previewing} className="mt-2">
          {previewing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="mr-1.5 h-3.5 w-3.5" />
          )}
          Assemble Prompt
        </Button>
      </div>

      {/* Right: Assembled Result */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Assembled Prompt</h3>
          {result && (
            <Badge variant={result.charCount > result.promptCap ? 'destructive' : 'secondary'}>
              {result.charCount} / {result.promptCap} chars
            </Badge>
          )}
        </div>

        {result ? (
          <div className="space-y-2">
            {result.parts.map((part, i) => (
              <div
                key={i}
                className={cn(
                  'rounded border-l-4 bg-muted/30 px-3 py-2',
                  PART_COLORS[part.label] || 'border-l-border'
                )}
              >
                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {part.label}
                </span>
                <p className="font-mono text-xs leading-relaxed">{part.content}</p>
              </div>
            ))}

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Raw Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                  {result.assembledPrompt}
                </pre>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
            Click &quot;Assemble Prompt&quot; to preview
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return (source ?? target) as T
  }
  const result = { ...target } as Record<string, unknown>
  for (const key of Object.keys(source)) {
    const sourceVal = (source as Record<string, unknown>)[key]
    const targetVal = result[key]
    if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal
    }
  }
  return result as T
}
