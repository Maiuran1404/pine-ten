'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingDown, Timer, MousePointerClick, ClipboardCopy } from 'lucide-react'
import { StageFunnel, computeFunnel } from './stage-funnel'
import type { FunnelData } from './stage-funnel'

const STAGE_ORDER = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
] as const

const STAGE_LABELS: Record<string, string> = {
  EXTRACT: 'Extract',
  TASK_TYPE: 'Task Type',
  INTENT: 'Intent',
  INSPIRATION: 'Inspiration',
  STRUCTURE: 'Structure',
  STRATEGIC_REVIEW: 'Strategic Review',
  MOODBOARD: 'Moodboard',
  REVIEW: 'Review',
}

interface Message {
  turn: number
  role: string
  content: string
  stage?: string
  generatedBy?: string
  durationMs?: number
}

interface Run {
  id: string
  scenarioName: string
  status: string
  totalTurns: number
  finalStage: string | null
  reachedReview: boolean
  errorMessage: string | null
  durationMs: number | null
  messages?: Message[]
  scenarioConfig: {
    name: string
    industry: string
    platform: string
    contentType: string
    intent: string
  }
}

interface BatchAnalysisProps {
  runs: Run[]
  batchId: string
}

function computeBottleneck(funnel: FunnelData[]): { stage: string; dropOff: number } | null {
  let maxDrop = 0
  let bottleneck: { stage: string; dropOff: number } | null = null

  for (let i = 1; i < funnel.length; i++) {
    const drop = funnel[i - 1].count - funnel[i].count
    if (drop > maxDrop) {
      maxDrop = drop
      bottleneck = { stage: funnel[i].stage, dropOff: drop }
    }
  }

  return bottleneck
}

function computePerStageTurns(run: Run): Record<string, number> {
  const stageTurns: Record<string, number> = {}
  if (!run.messages) return stageTurns

  for (const msg of run.messages) {
    if (msg.stage && msg.role === 'user') {
      stageTurns[msg.stage] = (stageTurns[msg.stage] ?? 0) + 1
    }
  }
  return stageTurns
}

function computeResponseMethods(runs: Run[]): {
  quickOption: number
  template: number
  haiku: number
  unknown: number
} {
  const result = { quickOption: 0, template: 0, haiku: 0, unknown: 0 }

  for (const run of runs) {
    if (!run.messages) continue
    for (const msg of run.messages) {
      if (msg.role !== 'user') continue
      switch (msg.generatedBy) {
        case 'quick_option':
          result.quickOption++
          break
        case 'template':
          result.template++
          break
        case 'haiku':
          result.haiku++
          break
        default:
          result.unknown++
      }
    }
  }

  return result
}

function detectStalls(run: Run): Array<{ stage: string; turns: number }> {
  const stageTurns = computePerStageTurns(run)
  return Object.entries(stageTurns)
    .filter(([, turns]) => turns >= 3)
    .map(([stage, turns]) => ({ stage, turns }))
}

function buildAnalysisPrompt(runs: Run[], batchId: string, funnel: FunnelData[]): string {
  const total = runs.length
  const passed = runs.filter((r) => r.reachedReview).length
  const failed = runs.filter((r) => r.status === 'failed').length
  const avgTurns = total > 0 ? (runs.reduce((s, r) => s + r.totalTurns, 0) / total).toFixed(1) : '-'
  const runsWithDuration = runs.filter((r) => r.durationMs)
  const avgDuration =
    runsWithDuration.length > 0
      ? Math.round(
          runsWithDuration.reduce((s, r) => s + (r.durationMs ?? 0), 0) /
            runsWithDuration.length /
            1000
        )
      : null

  const bottleneck = computeBottleneck(funnel)
  const methods = computeResponseMethods(runs)
  const totalMethods = methods.quickOption + methods.template + methods.haiku + methods.unknown

  // Stage with most average turns
  const stageAvgTurns: Record<string, { total: number; count: number }> = {}
  for (const run of runs) {
    const perStage = computePerStageTurns(run)
    for (const [stage, turns] of Object.entries(perStage)) {
      if (!stageAvgTurns[stage]) stageAvgTurns[stage] = { total: 0, count: 0 }
      stageAvgTurns[stage].total += turns
      stageAvgTurns[stage].count++
    }
  }

  const lines: string[] = []
  lines.push(`# Chat Test Batch Analysis`)
  lines.push(`Batch ID: ${batchId}`)
  lines.push('')
  lines.push(`## Batch Summary`)
  lines.push(`- Total runs: ${total}`)
  lines.push(
    `- Pass rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}% (${passed}/${total})`
  )
  lines.push(`- Failed: ${failed}`)
  lines.push(`- Avg turns: ${avgTurns}`)
  lines.push(`- Avg duration: ${avgDuration ? `${avgDuration}s` : 'N/A'}`)
  lines.push('')

  lines.push(`## Stage Funnel`)
  for (const item of funnel) {
    const prevItem = funnel[funnel.indexOf(item) - 1]
    const dropLabel = prevItem ? ` (drop: -${prevItem.count - item.count})` : ''
    lines.push(
      `- ${STAGE_LABELS[item.stage] ?? item.stage}: ${item.count}/${total} (${item.percentage}%)${dropLabel}`
    )
  }
  lines.push('')

  lines.push(`## Bottleneck Analysis`)
  if (bottleneck) {
    lines.push(
      `- Biggest drop-off: ${STAGE_LABELS[bottleneck.stage] ?? bottleneck.stage} (-${bottleneck.dropOff} runs)`
    )
  } else {
    lines.push(`- No drop-offs detected`)
  }

  lines.push(`- Stages with most avg turns:`)
  const sortedStages = Object.entries(stageAvgTurns)
    .map(([stage, data]) => ({ stage, avg: data.total / data.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
  for (const s of sortedStages) {
    lines.push(`  - ${STAGE_LABELS[s.stage] ?? s.stage}: ${s.avg.toFixed(1)} avg turns`)
  }
  lines.push('')

  lines.push(`## Per-Run Breakdown`)
  for (const run of runs) {
    const perStage = computePerStageTurns(run)
    const stalls = detectStalls(run)
    const stagesReached = STAGE_ORDER.filter((s) => run.messages?.some((m) => m.stage === s))
    const runMethods = { quickOption: 0, template: 0, haiku: 0 }
    run.messages
      ?.filter((m) => m.role === 'user')
      .forEach((m) => {
        if (m.generatedBy === 'quick_option') runMethods.quickOption++
        else if (m.generatedBy === 'template') runMethods.template++
        else if (m.generatedBy === 'haiku') runMethods.haiku++
      })

    lines.push(`### ${run.scenarioName}`)
    lines.push(
      `- Status: ${run.reachedReview ? 'PASSED' : run.status === 'failed' ? 'FAILED' : 'INCOMPLETE'}`
    )
    lines.push(
      `- Industry: ${run.scenarioConfig.industry}, Platform: ${run.scenarioConfig.platform}`
    )
    lines.push(
      `- Content type: ${run.scenarioConfig.contentType}, Intent: ${run.scenarioConfig.intent}`
    )
    lines.push(`- Total turns: ${run.totalTurns}, Final stage: ${run.finalStage ?? 'N/A'}`)
    lines.push(`- Duration: ${run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : 'N/A'}`)
    lines.push(`- Stages reached: ${stagesReached.map((s) => STAGE_LABELS[s] ?? s).join(' -> ')}`)
    lines.push(
      `- Response methods: quick_option=${runMethods.quickOption}, template=${runMethods.template}, haiku=${runMethods.haiku}`
    )

    if (Object.keys(perStage).length > 0) {
      lines.push(
        `- Per-stage turns: ${Object.entries(perStage)
          .map(([s, t]) => `${STAGE_LABELS[s] ?? s}=${t}`)
          .join(', ')}`
      )
    }

    if (stalls.length > 0) {
      lines.push(
        `- STALLS DETECTED: ${stalls.map((s) => `${STAGE_LABELS[s.stage] ?? s.stage} (${s.turns} turns)`).join(', ')}`
      )
    }

    if (run.errorMessage) {
      lines.push(`- Error: ${run.errorMessage}`)
    }
    lines.push('')
  }

  lines.push(`## Response Method Distribution`)
  if (totalMethods > 0) {
    lines.push(
      `- Quick option: ${methods.quickOption} (${Math.round((methods.quickOption / totalMethods) * 100)}%)`
    )
    lines.push(
      `- Template: ${methods.template} (${Math.round((methods.template / totalMethods) * 100)}%)`
    )
    lines.push(`- Haiku: ${methods.haiku} (${Math.round((methods.haiku / totalMethods) * 100)}%)`)
  } else {
    lines.push(`- No response method data available`)
  }
  lines.push('')

  lines.push(`## Analysis Request`)
  lines.push(`Based on the data above, please provide:`)
  lines.push(`1. Root cause analysis for any failures — what went wrong and why?`)
  lines.push(
    `2. Stage-specific issues — which stages are problematic and what patterns do you see?`
  )
  lines.push(`3. Turn efficiency analysis — are certain stages taking too many turns? Why?`)
  lines.push(
    `4. Response method impact — how do quick_option vs template vs haiku responses affect outcomes?`
  )
  lines.push(
    `5. Top 3-5 actionable improvements to the briefing algorithm, ordered by expected impact.`
  )

  return lines.join('\n')
}

export function BatchAnalysis({ runs, batchId }: BatchAnalysisProps) {
  const funnel = useMemo(() => computeFunnel(runs), [runs])
  const bottleneck = useMemo(() => computeBottleneck(funnel), [funnel])
  const methods = useMemo(() => computeResponseMethods(runs), [runs])

  const passedRuns = runs.filter((r) => r.reachedReview)
  const failedRuns = runs.filter((r) => r.status === 'failed')

  const avgTurnsPassed =
    passedRuns.length > 0
      ? (passedRuns.reduce((s, r) => s + r.totalTurns, 0) / passedRuns.length).toFixed(1)
      : '-'
  const avgTurnsFailed =
    failedRuns.length > 0
      ? (failedRuns.reduce((s, r) => s + r.totalTurns, 0) / failedRuns.length).toFixed(1)
      : '-'

  const totalMethods = methods.quickOption + methods.template + methods.haiku + methods.unknown
  const qoPct = totalMethods > 0 ? Math.round((methods.quickOption / totalMethods) * 100) : 0
  const tplPct = totalMethods > 0 ? Math.round((methods.template / totalMethods) * 100) : 0
  const haikuPct = totalMethods > 0 ? Math.round((methods.haiku / totalMethods) * 100) : 0

  const handleCopyPrompt = async () => {
    const prompt = buildAnalysisPrompt(runs, batchId, funnel)
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success('Analysis prompt copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <div className="space-y-4">
      {/* Stage Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Stage Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <StageFunnel funnel={funnel} totalRuns={runs.length} />
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Biggest Drop-off */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">Biggest Drop-off</span>
            </div>
            {bottleneck ? (
              <div>
                <p className="text-lg font-semibold">
                  {STAGE_LABELS[bottleneck.stage] ?? bottleneck.stage}
                </p>
                <p className="text-xs text-red-500">-{bottleneck.dropOff} runs lost</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-emerald-600">None</p>
            )}
          </CardContent>
        </Card>

        {/* Avg Turns to Complete */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Avg Turns</span>
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <p className="text-lg font-semibold text-emerald-600">{avgTurnsPassed}</p>
                <p className="text-[10px] text-muted-foreground">passed</p>
              </div>
              <div className="text-muted-foreground/30">|</div>
              <div>
                <p className="text-lg font-semibold text-red-500">{avgTurnsFailed}</p>
                <p className="text-[10px] text-muted-foreground">failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Method Distribution */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">Response Methods</span>
            </div>
            {totalMethods > 0 ? (
              <div className="space-y-1.5">
                {/* Stacked bar */}
                <div className="flex h-2.5 rounded-full overflow-hidden">
                  {qoPct > 0 && <div className="bg-violet-500" style={{ width: `${qoPct}%` }} />}
                  {tplPct > 0 && <div className="bg-blue-400" style={{ width: `${tplPct}%` }} />}
                  {haikuPct > 0 && (
                    <div className="bg-amber-400" style={{ width: `${haikuPct}%` }} />
                  )}
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    Quick {qoPct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    Template {tplPct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Haiku {haikuPct}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Copy Prompt Button */}
      <Button variant="outline" className="w-full" onClick={handleCopyPrompt}>
        <ClipboardCopy className="h-4 w-4 mr-2" />
        Copy Analysis Prompt to Clipboard
      </Button>
    </div>
  )
}
