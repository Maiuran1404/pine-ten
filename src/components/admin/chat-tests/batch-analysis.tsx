'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingDown,
  Timer,
  MousePointerClick,
  ClipboardCopy,
  AlertTriangle,
  XCircle,
  Zap,
} from 'lucide-react'
import { StageFunnel, computeFunnel } from './stage-funnel'
import type { FunnelData } from './stage-funnel'
import { cn } from '@/lib/utils'

const STAGE_ORDER = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
  'DEEPEN',
  'SUBMIT',
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
  DEEPEN: 'Deepen',
  SUBMIT: 'Submit',
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

// ---------------------------------------------------------------------------
// Analysis computation helpers
// ---------------------------------------------------------------------------

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

function computeAllDropoffs(funnel: FunnelData[]): Array<{ stage: string; dropOff: number }> {
  const drops: Array<{ stage: string; dropOff: number }> = []
  for (let i = 1; i < funnel.length; i++) {
    const drop = funnel[i - 1].count - funnel[i].count
    if (drop > 0) {
      drops.push({ stage: funnel[i].stage, dropOff: drop })
    }
  }
  return drops.sort((a, b) => b.dropOff - a.dropOff)
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
    .sort((a, b) => b.turns - a.turns)
}

function getLastMessages(run: Run, count: number): Message[] {
  if (!run.messages) return []
  return run.messages.slice(-count)
}

function truncateContent(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content
  return content.slice(0, maxLen) + '...'
}

// ---------------------------------------------------------------------------
// Failure pattern detection
// ---------------------------------------------------------------------------

interface FailurePattern {
  pattern: string
  count: number
  runs: string[]
  stage: string
  description: string
}

function detectFailurePatterns(runs: Run[]): FailurePattern[] {
  const failedRuns = runs.filter((r) => !r.reachedReview)
  if (failedRuns.length === 0) return []

  const patterns: Record<string, FailurePattern> = {}

  for (const run of failedRuns) {
    const stalls = detectStalls(run)
    const finalStage = run.finalStage ?? 'UNKNOWN'

    // Pattern: stalled at specific stage
    for (const stall of stalls) {
      const key = `stall_${stall.stage}`
      if (!patterns[key]) {
        patterns[key] = {
          pattern: `Stalled at ${STAGE_LABELS[stall.stage] ?? stall.stage}`,
          count: 0,
          runs: [],
          stage: stall.stage,
          description: `Conversations got stuck at the ${STAGE_LABELS[stall.stage] ?? stall.stage} stage, taking 3+ turns without advancing`,
        }
      }
      patterns[key].count++
      patterns[key].runs.push(run.scenarioName)
    }

    // Pattern: died at specific stage
    const diedKey = `died_${finalStage}`
    if (!patterns[diedKey]) {
      patterns[diedKey] = {
        pattern: `Failed at ${STAGE_LABELS[finalStage] ?? finalStage}`,
        count: 0,
        runs: [],
        stage: finalStage,
        description: `Conversations ended at ${STAGE_LABELS[finalStage] ?? finalStage} without reaching Review`,
      }
    }
    patterns[diedKey].count++
    patterns[diedKey].runs.push(run.scenarioName)

    // Pattern: error message patterns
    if (run.errorMessage) {
      const errorKey = `error_${run.errorMessage.slice(0, 50)}`
      if (!patterns[errorKey]) {
        patterns[errorKey] = {
          pattern: `Error: ${truncateContent(run.errorMessage, 60)}`,
          count: 0,
          runs: [],
          stage: finalStage,
          description: run.errorMessage,
        }
      }
      patterns[errorKey].count++
      patterns[errorKey].runs.push(run.scenarioName)
    }
  }

  return Object.values(patterns).sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// Stage turn heatmap data
// ---------------------------------------------------------------------------

interface StageHeatRow {
  scenarioName: string
  passed: boolean
  stages: Record<string, number>
}

function computeStageHeatmap(runs: Run[]): StageHeatRow[] {
  return runs.map((run) => ({
    scenarioName: run.scenarioName,
    passed: run.reachedReview,
    stages: computePerStageTurns(run),
  }))
}

function heatColor(turns: number): string {
  if (turns === 0) return 'bg-muted/30'
  if (turns === 1) return 'bg-emerald-200'
  if (turns === 2) return 'bg-emerald-400'
  if (turns === 3) return 'bg-amber-300'
  if (turns <= 5) return 'bg-amber-500'
  return 'bg-red-500'
}

function heatTextColor(turns: number): string {
  if (turns === 0) return 'text-muted-foreground/40'
  if (turns <= 2) return 'text-emerald-900'
  if (turns <= 3) return 'text-amber-900'
  return 'text-white'
}

// ---------------------------------------------------------------------------
// Claude Code analysis prompt builder
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(runs: Run[], batchId: string, funnel: FunnelData[]): string {
  const total = runs.length
  const passed = runs.filter((r) => r.reachedReview).length
  const failed = runs.filter((r) => !r.reachedReview).length
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
  const allDropoffs = computeAllDropoffs(funnel)
  const methods = computeResponseMethods(runs)
  const totalMethods = methods.quickOption + methods.template + methods.haiku + methods.unknown
  const failurePatterns = detectFailurePatterns(runs)

  // Stage avg turns
  const stageAvgTurns: Record<string, { total: number; count: number }> = {}
  for (const run of runs) {
    const perStage = computePerStageTurns(run)
    for (const [stage, turns] of Object.entries(perStage)) {
      if (!stageAvgTurns[stage]) stageAvgTurns[stage] = { total: 0, count: 0 }
      stageAvgTurns[stage].total += turns
      stageAvgTurns[stage].count++
    }
  }

  const L: string[] = []

  // ---- SYSTEM CONTEXT ----
  L.push(`# Briefing Chat QA Analysis -- Batch ${batchId}`)
  L.push('')
  L.push(`## System Architecture`)
  L.push(`This is the automated QA test results for our AI-powered creative briefing chat.`)
  L.push(`The chat guides users through building a creative brief via a multi-stage state machine.`)
  L.push('')
  L.push(`### Stage Pipeline (in order)`)
  L.push(`1. EXTRACT -- Parse the user's opening message to infer task type + intent`)
  L.push(`2. TASK_TYPE -- Confirm what they're building (video, design, website, content, brand)`)
  L.push(`3. INTENT -- Confirm why (awareness, sales, signups, education, etc.)`)
  L.push(`4. INSPIRATION -- Show visual style references, user selects styles`)
  L.push(`5. STRUCTURE -- Generate deliverable structure (storyboard/layout/calendar/spec)`)
  L.push(`6. STRATEGIC_REVIEW -- AI provides strategic assessment, user must accept to proceed`)
  L.push(`7. MOODBOARD -- Finalize visual direction (colors, typography, mood)`)
  L.push(`8. REVIEW -- Expert review of completed brief`)
  L.push(`9. DEEPEN -- Optional deepening of brief details`)
  L.push(`10. SUBMIT -- Brief finalized and task created (SUCCESS = reaching this stage)`)
  L.push('')
  L.push(`### Key Files`)
  L.push(`- State machine: src/lib/ai/briefing-state-machine.ts`)
  L.push(`- Stage prompts: src/lib/ai/briefing-prompts.ts (buildSystemPrompt function)`)
  L.push(`- Chat API: src/app/api/chat/route.ts`)
  L.push(`- Test runner: src/app/api/admin/chat-tests/step/route.ts`)
  L.push(`- Test engine: src/lib/ai/chat-test-engine.ts`)
  L.push(`- Scenarios: src/lib/ai/chat-test-scenarios.ts`)
  L.push('')
  L.push(`### How Transitions Work`)
  L.push(
    `- EXTRACT can auto-skip to INSPIRATION if both taskType + intent inferred at confidence >= 0.75`
  )
  L.push(`- STRATEGIC_REVIEW -> MOODBOARD requires explicit user acceptance (dispatch action)`)
  L.push(`- Force-advance triggers after 8 turns stuck in same stage`)
  L.push(
    `- Stage-specific stall intervention at 4 turns (EXTRACT/TASK_TYPE/INTENT) or 6 turns (STRUCTURE)`
  )
  L.push('')
  L.push(`### Synthetic User Reply Strategy (test runner)`)
  L.push(`The test runner generates user replies in 3 tiers:`)
  L.push(`1. Quick Options -- picks from AI-suggested options (prefers positive/agreeable ones)`)
  L.push(`2. Templates -- stage-specific hardcoded replies (e.g., "I'd like a video")`)
  L.push(`3. Haiku Fallback -- Claude Haiku generates a 25-word context-aware response`)
  L.push('')

  // ---- BATCH SUMMARY ----
  L.push(`## Batch Results`)
  L.push(
    `- Pass rate: **${total > 0 ? Math.round((passed / total) * 100) : 0}%** (${passed}/${total} reached SUBMIT)`
  )
  L.push(`- Failed: ${failed}`)
  L.push(`- Avg turns: ${avgTurns}`)
  L.push(`- Avg duration: ${avgDuration ? `${avgDuration}s` : 'N/A'}`)
  L.push('')

  // ---- STAGE FUNNEL ----
  L.push(`## Stage Funnel`)
  for (const item of funnel) {
    const prevItem = funnel[funnel.indexOf(item) - 1]
    const dropLabel =
      prevItem && prevItem.count - item.count > 0 ? ` (DROP: -${prevItem.count - item.count})` : ''
    L.push(
      `- ${STAGE_LABELS[item.stage] ?? item.stage}: ${item.count}/${total} (${item.percentage}%)${dropLabel}`
    )
  }
  L.push('')

  // ---- BOTTLENECK ----
  if (allDropoffs.length > 0) {
    L.push(`## Drop-off Points`)
    for (const drop of allDropoffs) {
      L.push(`- **${STAGE_LABELS[drop.stage] ?? drop.stage}**: -${drop.dropOff} runs lost`)
    }
    L.push('')
  }

  // ---- FAILURE PATTERNS ----
  if (failurePatterns.length > 0) {
    L.push(`## Detected Failure Patterns`)
    for (const fp of failurePatterns.slice(0, 5)) {
      L.push(`### ${fp.pattern} (${fp.count}x)`)
      L.push(`${fp.description}`)
      L.push(`Affected: ${fp.runs.join(', ')}`)
      L.push('')
    }
  }

  // ---- STALL ANALYSIS ----
  const stalledRuns = runs.filter((r) => detectStalls(r).length > 0)
  if (stalledRuns.length > 0) {
    L.push(`## Stall Report`)
    L.push(`${stalledRuns.length} of ${total} runs experienced stalls (3+ turns in one stage):`)
    L.push('')
    const stageStallCounts: Record<string, number> = {}
    for (const run of stalledRuns) {
      for (const stall of detectStalls(run)) {
        stageStallCounts[stall.stage] = (stageStallCounts[stall.stage] ?? 0) + 1
      }
    }
    const sortedStallStages = Object.entries(stageStallCounts).sort((a, b) => b[1] - a[1])
    for (const [stage, count] of sortedStallStages) {
      L.push(`- ${STAGE_LABELS[stage] ?? stage}: ${count} runs stalled here`)
    }
    L.push('')
  }

  // ---- RESPONSE METHODS ----
  L.push(`## Response Method Distribution`)
  if (totalMethods > 0) {
    L.push(
      `- Quick option: ${methods.quickOption} (${Math.round((methods.quickOption / totalMethods) * 100)}%)`
    )
    L.push(
      `- Template: ${methods.template} (${Math.round((methods.template / totalMethods) * 100)}%)`
    )
    L.push(`- Haiku: ${methods.haiku} (${Math.round((methods.haiku / totalMethods) * 100)}%)`)
  } else {
    L.push(`- No response method data available`)
  }
  L.push('')

  // ---- PER-RUN DETAIL ----
  L.push(`## Per-Run Detail`)
  L.push('')

  // Failed runs first with conversation excerpts
  const failedRuns = runs.filter((r) => !r.reachedReview)
  const passedRunsList = runs.filter((r) => r.reachedReview)

  if (failedRuns.length > 0) {
    L.push(`### Failed Runs`)
    L.push('')
    for (const run of failedRuns) {
      const perStage = computePerStageTurns(run)
      const stalls = detectStalls(run)
      const stagesReached = STAGE_ORDER.filter((s) => run.messages?.some((m) => m.stage === s))
      const lastMsgs = getLastMessages(run, 4)

      L.push(
        `#### ${run.scenarioName} -- FAILED at ${STAGE_LABELS[run.finalStage ?? ''] ?? run.finalStage ?? 'UNKNOWN'}`
      )
      L.push(
        `- Scenario: ${run.scenarioConfig.industry} / ${run.scenarioConfig.platform} / ${run.scenarioConfig.contentType} / ${run.scenarioConfig.intent}`
      )
      L.push(`- Total turns: ${run.totalTurns}`)
      L.push(`- Path: ${stagesReached.map((s) => STAGE_LABELS[s] ?? s).join(' -> ')}`)
      if (Object.keys(perStage).length > 0) {
        L.push(
          `- Per-stage turns: ${Object.entries(perStage)
            .map(([s, t]) => `${STAGE_LABELS[s] ?? s}=${t}`)
            .join(', ')}`
        )
      }
      if (stalls.length > 0) {
        L.push(
          `- STALLS: ${stalls.map((s) => `${STAGE_LABELS[s.stage] ?? s.stage} (${s.turns} turns)`).join(', ')}`
        )
      }
      if (run.errorMessage) {
        L.push(`- Error: ${run.errorMessage}`)
      }

      // Last messages at failure point
      if (lastMsgs.length > 0) {
        L.push(`- Last messages before failure:`)
        for (const msg of lastMsgs) {
          const roleLabel = msg.role === 'user' ? 'USER' : 'ASSISTANT'
          const stageLabel = msg.stage ? ` [${msg.stage}]` : ''
          const methodLabel = msg.generatedBy ? ` (${msg.generatedBy})` : ''
          L.push(`  ${roleLabel}${stageLabel}${methodLabel}: ${truncateContent(msg.content, 200)}`)
        }
      }
      L.push('')
    }
  }

  if (passedRunsList.length > 0) {
    L.push(`### Passed Runs`)
    L.push('')
    for (const run of passedRunsList) {
      const perStage = computePerStageTurns(run)
      const stalls = detectStalls(run)
      L.push(`#### ${run.scenarioName} -- PASSED in ${run.totalTurns} turns`)
      L.push(
        `- Scenario: ${run.scenarioConfig.industry} / ${run.scenarioConfig.platform} / ${run.scenarioConfig.contentType} / ${run.scenarioConfig.intent}`
      )
      if (Object.keys(perStage).length > 0) {
        L.push(
          `- Per-stage turns: ${Object.entries(perStage)
            .map(([s, t]) => `${STAGE_LABELS[s] ?? s}=${t}`)
            .join(', ')}`
        )
      }
      if (stalls.length > 0) {
        L.push(
          `- Stalls: ${stalls.map((s) => `${STAGE_LABELS[s.stage] ?? s.stage} (${s.turns} turns)`).join(', ')}`
        )
      }
      L.push('')
    }
  }

  // ---- ACTIONABLE TASK ----
  L.push(`## Task`)
  L.push('')
  L.push(`Analyze the test results above and fix the briefing system to improve the pass rate.`)
  L.push('')
  L.push(`### Step 1: Diagnose`)
  L.push(`Read the failing conversation excerpts above. For each failure pattern:`)
  L.push(
    `- Identify the root cause in the code (state machine transition logic, prompt instructions, or data parsing)`
  )
  L.push(
    `- Check the stage-specific prompt in \`src/lib/ai/briefing-prompts.ts\` for the failing stage`
  )
  L.push(`- Check the transition conditions in \`src/lib/ai/briefing-state-machine.ts\``)
  L.push('')
  L.push(`### Step 2: Fix`)
  L.push(`For each diagnosed issue, implement a fix. Common fixes include:`)
  L.push(
    `- **Transition logic**: Stage advancement conditions in \`evaluateTransitions()\` may be too strict`
  )
  L.push(
    `- **Prompt instructions**: The system prompt for a stage may not guide the AI to produce parseable output`
  )
  L.push(
    `- **Data extraction**: The response parser may fail to extract structured data (storyboard, calendar, etc.)`
  )
  L.push(
    `- **Force-advance thresholds**: Stall detection in the test runner (\`src/app/api/admin/chat-tests/step/route.ts\`) may need tuning`
  )
  L.push('')
  L.push(`### Step 3: Verify`)
  L.push(
    `After making changes, describe what you changed and why. I'll re-run the test batch to verify improvement.`
  )

  return L.join('\n')
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

/** Failure details card showing where and why runs failed */
function FailureBreakdown({ runs }: { runs: Run[] }) {
  const failedRuns = runs.filter((r) => !r.reachedReview)
  if (failedRuns.length === 0) return null

  // Group by final stage
  const byStage: Record<string, Run[]> = {}
  for (const run of failedRuns) {
    const stage = run.finalStage ?? 'UNKNOWN'
    if (!byStage[stage]) byStage[stage] = []
    byStage[stage].push(run)
  }

  const stageEntries = Object.entries(byStage).sort((a, b) => b[1].length - a[1].length)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          Where Runs Failed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageEntries.map(([stage, stageRuns]) => (
            <div key={stage}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{STAGE_LABELS[stage] ?? stage}</span>
                <span className="text-xs text-red-500 font-medium">
                  {stageRuns.length} run{stageRuns.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1">
                {stageRuns.map((run) => {
                  const stalls = detectStalls(run)
                  return (
                    <div
                      key={run.id}
                      className="text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2 space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{run.scenarioName}</span>
                        <span className="text-muted-foreground">{run.totalTurns} turns</span>
                      </div>
                      {stalls.length > 0 && (
                        <p className="text-amber-600">
                          Stalled:{' '}
                          {stalls
                            .map((s) => `${STAGE_LABELS[s.stage] ?? s.stage} (${s.turns}t)`)
                            .join(', ')}
                        </p>
                      )}
                      {run.errorMessage && (
                        <p className="text-red-500 truncate">{run.errorMessage}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Heatmap of turns spent per stage per run */
function StageHeatmap({ runs }: { runs: Run[] }) {
  const heatmap = computeStageHeatmap(runs)
  if (heatmap.length === 0) return null

  const abbreviations: Record<string, string> = {
    EXTRACT: 'EXT',
    TASK_TYPE: 'TT',
    INTENT: 'INT',
    INSPIRATION: 'INS',
    STRUCTURE: 'STR',
    STRATEGIC_REVIEW: 'SR',
    MOODBOARD: 'MB',
    REVIEW: 'REV',
    DEEPEN: 'DEP',
    SUBMIT: 'SUB',
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Turn Heatmap
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-200" /> 1-2
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-300" /> 3
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-500" /> 4-5
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-red-500" /> 6+
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground pb-2 pr-3 min-w-[140px]">
                  Scenario
                </th>
                {STAGE_ORDER.map((stage) => (
                  <th
                    key={stage}
                    className="text-center font-medium text-muted-foreground pb-2 px-1 w-10"
                  >
                    {abbreviations[stage] ?? stage.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row) => (
                <tr key={row.scenarioName} className="border-t border-muted/50">
                  <td className="py-1.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          row.passed ? 'bg-emerald-500' : 'bg-red-500'
                        )}
                      />
                      <span className="truncate max-w-[130px]" title={row.scenarioName}>
                        {row.scenarioName}
                      </span>
                    </div>
                  </td>
                  {STAGE_ORDER.map((stage) => {
                    const turns = row.stages[stage] ?? 0
                    return (
                      <td key={stage} className="py-1.5 px-1 text-center">
                        <div
                          className={cn(
                            'h-7 w-full rounded-sm flex items-center justify-center font-medium',
                            heatColor(turns),
                            heatTextColor(turns)
                          )}
                        >
                          {turns > 0 ? turns : ''}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function BatchAnalysis({ runs, batchId }: BatchAnalysisProps) {
  const funnel = useMemo(() => computeFunnel(runs), [runs])
  const bottleneck = useMemo(() => computeBottleneck(funnel), [funnel])
  const methods = useMemo(() => computeResponseMethods(runs), [runs])

  const passedRuns = runs.filter((r) => r.reachedReview)
  const failedRuns = runs.filter((r) => !r.reachedReview)

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

  const prompt = useMemo(() => buildAnalysisPrompt(runs, batchId, funnel), [runs, batchId, funnel])

  const handleCopyPrompt = async () => {
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

      {/* Key Insights Row */}
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

        {/* Avg Turns */}
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

        {/* Response Methods */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">Response Methods</span>
            </div>
            {totalMethods > 0 ? (
              <div className="space-y-1.5">
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

      {/* Failure Breakdown + Turn Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FailureBreakdown runs={runs} />
        <StageHeatmap runs={runs} />
      </div>

      {/* Stalls Warning */}
      {runs.some((r) => detectStalls(r).length > 0) && (
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Stall Warning</p>
                <div className="space-y-1">
                  {runs
                    .filter((r) => detectStalls(r).length > 0)
                    .map((run) => {
                      const stalls = detectStalls(run)
                      return (
                        <p key={run.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{run.scenarioName}</span>
                          {' -- '}
                          {stalls
                            .map((s) => `${STAGE_LABELS[s.stage] ?? s.stage} (${s.turns} turns)`)
                            .join(', ')}
                        </p>
                      )
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Prompt */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Claude Code Prompt</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
              <ClipboardCopy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-4 max-h-[600px] overflow-y-auto leading-relaxed">
            {prompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
