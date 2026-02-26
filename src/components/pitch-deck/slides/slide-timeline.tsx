/**
 * PDF rendering — CSS variables don't work in PDF context.
 * Hardcoded hex values: #2B2B2B = foreground, #555/#bbb = muted shades, #e8e8e8 = border
 */
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper, SlideHeader, SlideFooter } from './slide-wrapper'

interface SlideTimelineProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideTimeline({ data, logoSrc }: SlideTimelineProps) {
  return (
    <SlideWrapper backgroundColor="#ffffff">
      <SlideHeader date={data.coverDate} clientName={data.clientName} logoSrc={logoSrc} />

      <div style={{ padding: '60px 100px 0' }}>
        {/* Title */}
        <h2
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#2B2B2B',
            margin: 0,
            marginBottom: 48,
            lineHeight: 1.05,
            letterSpacing: '-2.5px',
          }}
        >
          {data.timelineTitle}
        </h2>

        {/* Timeline entries */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {data.milestones.map((milestone, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '32px 0',
                borderBottom: '1px solid #e8e8e8',
                gap: 20,
              }}
            >
              {/* Date */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#2B2B2B',
                  minWidth: 220,
                  flexShrink: 0,
                }}
              >
                {milestone.date}
              </div>
              {/* Dot separator */}
              <span
                style={{
                  fontSize: 16,
                  color: '#bbb',
                  flexShrink: 0,
                }}
              >
                •
              </span>
              {/* Description */}
              <div
                style={{
                  fontSize: 20,
                  color: '#555',
                  fontWeight: 300,
                  lineHeight: 1.55,
                }}
              >
                {milestone.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SlideFooter pageNumber="07" />
    </SlideWrapper>
  )
}
