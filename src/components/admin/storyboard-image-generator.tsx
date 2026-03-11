'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Play,
  Square,
  Download,
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Search,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Clock,
  Camera,
  Mic,
} from 'lucide-react'
import {
  buildScenePrompt as buildScenePromptShared,
  type ScenePromptInput,
} from '@/lib/ai/scene-prompt-builder'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoryboardScene {
  sceneNumber: number
  title: string
  description: string
  duration: string
  visualNote: string
  voiceover?: string
  transition?: string
  cameraNote?: string
}

type SceneStatus = 'idle' | 'generating' | 'done' | 'error'

interface TaskOption {
  id: string
  title: string
  status: string
  clientName?: string
}

// ─── Mock Storyboard Data ────────────────────────────────────────────────────

const MOCK_SCENES: StoryboardScene[] = [
  {
    sceneNumber: 1,
    title: 'Opening Hook — The Problem',
    description:
      'A cluttered desk covered in crumpled paper, sticky notes, and empty coffee cups. A laptop screen shows a chaotic social media dashboard with declining metrics. The mood is overwhelmed and frantic.',
    duration: '3s',
    visualNote:
      'Overhead shot looking down at the desk. Warm tungsten desk lamp as key light, cool blue screen glow as fill. Shallow depth of field on the laptop screen.',
    voiceover: 'You spend hours creating content... but nothing seems to land.',
    cameraNote: 'Slow push-in from overhead, 24fps',
    transition: 'Smash cut to black',
  },
  {
    sceneNumber: 2,
    title: 'The Turning Point',
    description:
      'Same desk, now clean and organized. A single monitor displays a clean, minimal dashboard with upward-trending graphs. Morning sunlight streams through a window, casting long warm shadows.',
    duration: '4s',
    visualNote:
      'Medium wide shot, eye level. Golden hour light from camera-left window. Clean negative space. The monitor is the focal point with bokeh plants in foreground.',
    voiceover: 'What if your creative process just... worked?',
    cameraNote: 'Static frame, subtle Ken Burns zoom on monitor',
    transition: 'Dissolve',
  },
  {
    sceneNumber: 3,
    title: 'Product Reveal — The Interface',
    description:
      'Close-up of hands interacting with a beautiful, modern design interface. Dragging elements, selecting colors, adjusting typography. Every interaction feels fluid and intentional.',
    duration: '5s',
    visualNote:
      'Tight close-up on hands and screen. Soft rim light on fingers. Screen content is bright and vivid against a dark workspace. Motion blur on cursor movements.',
    voiceover: 'Meet Crafted — design tools built for people with taste.',
    cameraNote: 'Handheld, slight movement, 60fps for smooth slow-mo moments',
    transition: 'Quick cut montage',
  },
  {
    sceneNumber: 4,
    title: 'Social Proof — Results',
    description:
      "Split screen showing before/after of a brand's social media presence. Left side is generic and cluttered, right side is cohesive, beautiful, and clearly performing well. Engagement numbers animate upward.",
    duration: '4s',
    visualNote:
      'Clean split composition, left side desaturated/cool tones, right side warm and vibrant. Animated counters. Subtle parallax between the two halves.',
    voiceover: 'Brands that switch to Crafted see 3x more engagement in the first month.',
    cameraNote: 'Static frame with animated elements',
    transition: 'Wipe right',
  },
  {
    sceneNumber: 5,
    title: 'Call to Action — The Close',
    description:
      'Minimal dark background with the Crafted logo centered. A simple tagline appears below. A glowing CTA button pulses gently. The mood is confident, clean, and aspirational.',
    duration: '4s',
    visualNote:
      'Centered composition on dark background. Logo in white, tagline in muted gray. Subtle particle effects or light leaks around the edges. The CTA button has a warm glow.',
    voiceover: 'Start creating content that actually matters. Try Crafted free.',
    cameraNote: 'Static, logo animates in with spring physics',
    transition: 'Fade to black',
  },
]

// ─── Default prompt ──────────────────────────────────────────────────────────

const DEFAULT_BASE_PROMPT = `A high-quality cinematic storyboard frame. Photorealistic rendering with dramatic lighting and strong composition. Professional film production quality. Wide 16:9 cinematic aspect ratio. No text, no UI elements, no watermarks, no words, no logos.`

// ─── Prompt builder (delegates to shared module for parity with production) ─

function buildAdminScenePrompt(scene: StoryboardScene, styleContext: string): string {
  const input: ScenePromptInput = {
    sceneNumber: scene.sceneNumber,
    title: scene.title,
    description: scene.description,
    visualNote: scene.visualNote,
    cameraNote: scene.cameraNote,
    voiceover: scene.voiceover,
    transition: scene.transition,
  }
  return buildScenePromptShared(input, styleContext)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StoryboardImageGenerator() {
  // Source mode: 'mock' for testing, 'task' for real tasks
  const [sourceMode, setSourceMode] = useState<'mock' | 'task'>('mock')

  // Task selection
  const [taskSearch, setTaskSearch] = useState('')
  const [taskResults, setTaskResults] = useState<TaskOption[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskOption | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Scenes
  const [scenes, setScenes] = useState<StoryboardScene[]>(MOCK_SCENES)
  const [basePrompt, setBasePrompt] = useState(DEFAULT_BASE_PROMPT)

  // Generation state
  const [statuses, setStatuses] = useState<Record<number, SceneStatus>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [generated, setGenerated] = useState<Record<number, string>>({})
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const abortRef = useRef(false)

  // Prompt editor
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  // ─── Task search ──────────────────────────────────────────────────────────

  const searchTasks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTaskResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/admin/tasks?search=${encodeURIComponent(query)}&limit=10`)
      if (!res.ok) throw new Error('Failed to search tasks')
      const data = await res.json()
      const tasks = (data.data?.tasks || data.data || []).map(
        (t: { id: string; title: string; status: string; client?: { name?: string } }) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          clientName: t.client?.name,
        })
      )
      setTaskResults(tasks)
    } catch {
      toast.error('Failed to search tasks')
    } finally {
      setIsSearching(false)
    }
  }, [])

  const selectTask = useCallback(async (task: TaskOption) => {
    setSelectedTask(task)
    setTaskResults([])
    setTaskSearch('')

    try {
      const res = await fetch(`/api/tasks/${task.id}`)
      if (!res.ok) throw new Error('Failed to load task')
      const data = await res.json()

      // Try to extract storyboard scenes from briefingState or structureData
      const briefState = data.data?.briefingState || data.data?.task?.briefingState
      const structureData = data.data?.structureData || data.data?.task?.structureData

      let storyboardScenes: StoryboardScene[] | null = null

      if (briefState?.structure?.type === 'storyboard' && briefState.structure.scenes?.length) {
        storyboardScenes = briefState.structure.scenes
      } else if (structureData?.type === 'storyboard' && structureData.scenes?.length) {
        storyboardScenes = structureData.scenes
      }

      if (storyboardScenes && storyboardScenes.length > 0) {
        setScenes(storyboardScenes)
        setStatuses({})
        setErrors({})
        setGenerated({})
        toast.success(`Loaded ${storyboardScenes.length} storyboard scenes`)
      } else {
        toast.error('No storyboard data found on this task. Try a video task.')
      }
    } catch {
      toast.error('Failed to load task details')
    }
  }, [])

  // ─── Switch to mock ───────────────────────────────────────────────────────

  const loadMockStoryboard = useCallback(() => {
    setScenes(MOCK_SCENES)
    setSelectedTask(null)
    setStatuses({})
    setErrors({})
    setGenerated({})
    toast.success('Loaded mock storyboard with 5 scenes')
  }, [])

  // ─── Image generation ─────────────────────────────────────────────────────

  const generateImage = useCallback(
    async (scene: StoryboardScene) => {
      const key = scene.sceneNumber
      setStatuses((s) => ({ ...s, [key]: 'generating' }))
      setErrors((e) => ({ ...e, [key]: '' }))

      try {
        const prompt = buildAdminScenePrompt(scene, basePrompt)
        const res = await fetch('/api/admin/storyboard-images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, size: '1536x1024', quality: 'high' }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error?.message || `API error: ${res.status}`)
        }

        if (data.data?.imageUrl) {
          setGenerated((g) => ({ ...g, [key]: data.data.imageUrl }))
          setStatuses((s) => ({ ...s, [key]: 'done' }))
        } else {
          throw new Error('No image returned')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setErrors((e) => ({ ...e, [key]: message }))
        setStatuses((s) => ({ ...s, [key]: 'error' }))
      }
    },
    [basePrompt]
  )

  const generateAll = useCallback(async () => {
    abortRef.current = false
    for (const scene of scenes) {
      if (abortRef.current) break
      if (statuses[scene.sceneNumber] === 'done') continue
      await generateImage(scene)
      // Rate-limit delay between scenes
      if (!abortRef.current) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }, [generateImage, statuses, scenes])

  const stopAll = useCallback(() => {
    abortRef.current = true
  }, [])

  // ─── Download ─────────────────────────────────────────────────────────────

  const downloadImage = useCallback((scene: StoryboardScene, dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    const slug = scene.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    a.download = `scene-${scene.sceneNumber}-${slug}.png`
    a.click()
  }, [])

  // ─── Save to Supabase ─────────────────────────────────────────────────────

  const saveToTask = useCallback(
    async (scene: StoryboardScene) => {
      if (!selectedTask) {
        toast.error('Select a task first to save images')
        return
      }

      const imageUrl = generated[scene.sceneNumber]
      if (!imageUrl) return

      setSaving((s) => ({ ...s, [scene.sceneNumber]: true }))

      try {
        const res = await fetch('/api/admin/storyboard-images/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imageUrl,
            taskId: selectedTask.id,
            sceneNumber: scene.sceneNumber,
            sceneTitle: scene.title,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to save')
        }

        toast.success(`Scene ${scene.sceneNumber} saved to task`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed'
        toast.error(message)
      } finally {
        setSaving((s) => ({ ...s, [scene.sceneNumber]: false }))
      }
    },
    [selectedTask, generated]
  )

  // ─── Derived state ────────────────────────────────────────────────────────

  const isGenerating = Object.values(statuses).some((s) => s === 'generating')
  const doneCount = Object.values(statuses).filter((s) => s === 'done').length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Source Tabs */}
      <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as 'mock' | 'task')}>
        <TabsList>
          <TabsTrigger value="mock" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Mock Storyboard
          </TabsTrigger>
          <TabsTrigger value="task" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            From Task
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mock" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Test with Mock Storyboard</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    5-scene Crafted product video storyboard for testing image generation
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadMockStoryboard}>
                  <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                  Load Mock
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="task" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Search for a task with storyboard data</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={taskSearch}
                    onChange={(e) => {
                      setTaskSearch(e.target.value)
                      searchTasks(e.target.value)
                    }}
                    placeholder="Search by task title or ID..."
                    className="pl-9"
                  />
                </div>
              </div>

              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </div>
              )}

              {taskResults.length > 0 && (
                <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                  {taskResults.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => selectTask(task)}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {task.status}
                        </Badge>
                        {task.clientName && (
                          <span className="text-xs text-muted-foreground">{task.clientName}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedTask && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                  <span className="text-sm">
                    Selected: <strong>{selectedTask.title}</strong>
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedTask.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Base Prompt Editor */}
      <div>
        <button
          onClick={() => setShowPromptEditor(!showPromptEditor)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPromptEditor ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Style Context
          {basePrompt !== DEFAULT_BASE_PROMPT && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              Modified
            </Badge>
          )}
        </button>

        {showPromptEditor && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              rows={4}
              className="text-sm font-mono"
              placeholder="Base style prompt prepended to every scene..."
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Prepended to every scene&apos;s prompt. Controls the overall visual style.
              </p>
              {basePrompt !== DEFAULT_BASE_PROMPT && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBasePrompt(DEFAULT_BASE_PROMPT)}
                  className="text-xs h-7"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate All Controls */}
      <div className="flex items-center gap-3">
        <Button onClick={generateAll} disabled={isGenerating || scenes.length === 0}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Generate All Scenes
            </>
          )}
        </Button>

        {isGenerating && (
          <Button variant="destructive" size="sm" onClick={stopAll}>
            <Square className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
        )}

        <span className="text-sm text-muted-foreground">
          {isGenerating ? 'Generating images...' : `${doneCount} / ${scenes.length} scenes done`}
        </span>
      </div>

      {/* Scene Grid */}
      {scenes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No scenes loaded. Use the mock storyboard or search for a task above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scenes.map((scene) => {
            const status = statuses[scene.sceneNumber] || 'idle'
            const error = errors[scene.sceneNumber]
            const imageUrl = generated[scene.sceneNumber]
            const isExpanded = expandedPrompt === scene.sceneNumber
            const isSaving = saving[scene.sceneNumber]

            return (
              <Card
                key={scene.sceneNumber}
                className={
                  status === 'error'
                    ? 'border-destructive/50'
                    : status === 'done'
                      ? 'border-ds-success/30'
                      : ''
                }
              >
                {/* Image Preview */}
                <div className="aspect-video bg-muted/30 flex items-center justify-center relative overflow-hidden rounded-t-lg">
                  {imageUrl ? (
                    <img src={imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                  ) : status === 'generating' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">No image yet</span>
                  )}

                  {/* Scene number badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 text-[10px] font-mono"
                  >
                    Scene {scene.sceneNumber}
                  </Badge>
                </div>

                <CardContent className="pt-3 pb-4 space-y-2.5">
                  {/* Title + Duration */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{scene.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {scene.duration}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {scene.description}
                  </p>

                  {/* Scene metadata pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {scene.cameraNote && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        <Camera className="h-2.5 w-2.5" />
                        {scene.cameraNote.slice(0, 30)}
                        {scene.cameraNote.length > 30 ? '...' : ''}
                      </span>
                    )}
                    {scene.voiceover && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        <Mic className="h-2.5 w-2.5" />
                        VO
                      </span>
                    )}
                    {scene.transition && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        {scene.transition}
                      </span>
                    )}
                  </div>

                  {/* Prompt toggle */}
                  <button
                    onClick={() => setExpandedPrompt(isExpanded ? null : scene.sceneNumber)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {isExpanded ? 'Hide prompt' : 'View prompt'}
                  </button>

                  {isExpanded && (
                    <pre className="text-[11px] text-muted-foreground bg-muted/30 rounded-md p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono">
                      {buildAdminScenePrompt(scene, basePrompt)}
                    </pre>
                  )}

                  {/* Error */}
                  {error && <p className="text-xs text-destructive">{error}</p>}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant={status === 'done' ? 'outline' : 'default'}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      disabled={status === 'generating'}
                      onClick={() => generateImage(scene)}
                    >
                      {status === 'generating' ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating
                        </>
                      ) : status === 'done' ? (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Generate
                        </>
                      )}
                    </Button>

                    {imageUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => downloadImage(scene, imageUrl)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>

                        {selectedTask && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={isSaving}
                            onClick={() => saveToTask(scene)}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
