import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideTimelineProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideTimeline({ data, logoSrc }: SlideTimelineProps) {
  return (
    <SlideWrapper backgroundColor={data.primaryColor}>
      {/* Logo top-right */}
      {logoSrc && (
        <div style={{ position: 'absolute', top: 60, right: 80 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Logo" style={{ height: 32, objectFit: 'contain' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '80px 80px 60px' }}>
        {/* Section label */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: data.accentColor,
            marginBottom: 16,
          }}
        >
          Timeline
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 52,
            fontWeight: 700,
            margin: 0,
            marginBottom: 60,
            color: '#ffffff',
            lineHeight: 1.2,
          }}
        >
          {data.timelineTitle}
        </h2>

        {/* Timeline items */}
        <div style={{ display: 'flex', gap: 32, position: 'relative' }}>
          {/* Connecting line */}
          {data.milestones.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: 28,
                left: 28,
                right: 28,
                height: 2,
                backgroundColor: `${data.accentColor}30`,
                zIndex: 0,
              }}
            />
          )}

          {data.milestones.map((milestone, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Circle indicator */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: data.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: 28,
                  boxShadow: `0 0 0 8px ${data.primaryColor}, 0 0 0 10px ${data.accentColor}40`,
                }}
              >
                {i + 1}
              </div>

              {/* Card */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '28px 24px',
                  borderRadius: 16,
                  backgroundColor: '#ffffff06',
                  border: '1px solid #ffffff10',
                  width: '100%',
                }}
              >
                {/* Phase name */}
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: 12,
                  }}
                >
                  {milestone.phase}
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: '#ffffff99',
                    margin: 0,
                    marginBottom: 16,
                    fontWeight: 300,
                  }}
                >
                  {milestone.description}
                </p>

                {/* Duration badge */}
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 16px',
                    borderRadius: 20,
                    backgroundColor: `${data.accentColor}20`,
                    color: data.accentColor,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {milestone.duration}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  )
}
