import { SlideWrapper, SlideFooter } from '@/components/pitch-deck/slides/slide-wrapper'
import type { StoryboardPdfScene } from '@/lib/validations/storyboard-pdf-schema'

interface StoryboardSummaryProps {
  scenes: StoryboardPdfScene[]
  totalDuration: string
  pageNumber: number
  totalPages: number
  logoSrc?: string
}

function parseDuration(duration: string): number {
  return parseInt(duration.match(/(\d+)/)?.[1] || '0', 10)
}

function formatTimestamp(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function buildTimelineRows(scenes: StoryboardPdfScene[]) {
  const rows: Array<StoryboardPdfScene & { start: string; end: string; dur: number }> = []
  let cumulative = 0
  for (const scene of scenes) {
    const dur = parseDuration(scene.duration)
    const start = formatTimestamp(cumulative)
    cumulative += dur
    const end = formatTimestamp(cumulative)
    rows.push({ ...scene, start, end, dur })
  }
  return rows
}

export function StoryboardSummary({
  scenes,
  totalDuration,
  pageNumber,
  totalPages,
  logoSrc,
}: StoryboardSummaryProps) {
  const rows = buildTimelineRows(scenes)

  // Collect unique attributions
  const attributions = scenes
    .filter((s) => s.resolvedImageAttribution)
    .map((s) => {
      const attr = s.resolvedImageAttribution!
      return `Scene ${s.sceneNumber}: ${attr.sourceName}${attr.photographer ? ` / ${attr.photographer}` : ''}${attr.filmTitle ? ` (${attr.filmTitle})` : ''}`
    })

  return (
    <SlideWrapper backgroundColor="#f5f7f2">
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          height: '100%',
          background:
            'linear-gradient(135deg, transparent 0%, rgba(181,206,172,0.08) 50%, rgba(181,206,172,0.15) 100%)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '50px 80px 0',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: '#2B2B2B',
              margin: 0,
              letterSpacing: '-1.5px',
            }}
          >
            Scene Timeline
          </h2>
          <div
            style={{
              fontSize: 16,
              color: '#888',
              marginTop: 8,
              fontWeight: 400,
            }}
          >
            {scenes.length} scenes · {totalDuration} total
          </div>
        </div>
        {logoSrc && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoSrc} alt="Crafted" style={{ height: 42, objectFit: 'contain' }} />
        )}
      </div>

      {/* Timeline table */}
      <div style={{ padding: '30px 80px 0' }}>
        {/* Table header */}
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #4a7c4a',
            paddingBottom: 10,
            marginBottom: 6,
          }}
        >
          <div style={{ ...headerCell, width: 80 }}>#</div>
          <div style={{ ...headerCell, flex: 1 }}>Scene Title</div>
          <div style={{ ...headerCell, width: 140, textAlign: 'center' as const }}>Duration</div>
          <div style={{ ...headerCell, width: 180, textAlign: 'center' as const }}>Timestamp</div>
          <div style={{ ...headerCell, width: 160, textAlign: 'center' as const }}>Transition</div>
        </div>

        {/* Table rows */}
        {rows.map((row, i) => (
          <div
            key={row.sceneNumber}
            style={{
              display: 'flex',
              padding: '10px 0',
              borderBottom: '1px solid #e5e8e2',
              backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(74,124,74,0.03)',
            }}
          >
            <div
              style={{
                width: 80,
                fontSize: 15,
                fontWeight: 700,
                color: '#4a7c4a',
              }}
            >
              {String(row.sceneNumber).padStart(2, '0')}
            </div>
            <div
              style={{
                flex: 1,
                fontSize: 15,
                fontWeight: 500,
                color: '#2B2B2B',
              }}
            >
              {row.title}
            </div>
            <div
              style={{
                width: 140,
                fontSize: 14,
                color: '#666',
                textAlign: 'center',
              }}
            >
              {row.duration}
            </div>
            <div
              style={{
                width: 180,
                fontSize: 14,
                color: '#666',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            >
              {row.start} – {row.end}
            </div>
            <div
              style={{
                width: 160,
                fontSize: 13,
                color: '#999',
                textAlign: 'center',
              }}
            >
              {row.transition || '—'}
            </div>
          </div>
        ))}

        {/* Total row */}
        <div
          style={{
            display: 'flex',
            padding: '14px 0',
            borderTop: '2px solid #4a7c4a',
            marginTop: 4,
          }}
        >
          <div style={{ width: 80 }} />
          <div
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 900,
              color: '#2B2B2B',
            }}
          >
            Total Duration
          </div>
          <div
            style={{
              width: 140,
              fontSize: 16,
              fontWeight: 700,
              color: '#4a7c4a',
              textAlign: 'center',
            }}
          >
            {totalDuration}
          </div>
          <div style={{ width: 180 }} />
          <div style={{ width: 160 }} />
        </div>
      </div>

      {/* Image attributions */}
      {attributions.length > 0 && (
        <div style={{ padding: '24px 80px 0' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: 6,
            }}
          >
            Image Credits
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#999',
              lineHeight: 1.6,
            }}
          >
            {attributions.join(' · ')}
          </div>
        </div>
      )}

      <SlideFooter
        pageNumber={`${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}
      />
    </SlideWrapper>
  )
}

const headerCell = {
  fontSize: 10,
  fontWeight: 700 as const,
  color: '#4a7c4a',
  textTransform: 'uppercase' as const,
  letterSpacing: '1.5px',
}
