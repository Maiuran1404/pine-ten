import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideOverviewProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideOverview({ data, logoSrc }: SlideOverviewProps) {
  return (
    <SlideWrapper backgroundColor={data.primaryColor}>
      {/* Subtle background lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `repeating-linear-gradient(90deg, ${data.accentColor}05, ${data.accentColor}05 1px, transparent 1px, transparent 120px)`,
        }}
      />

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
          Overview
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 52,
            fontWeight: 700,
            margin: 0,
            marginBottom: 48,
            color: '#ffffff',
            lineHeight: 1.2,
          }}
        >
          {data.overviewTitle}
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: 24,
            lineHeight: 1.8,
            color: '#ffffffcc',
            margin: 0,
            marginBottom: 60,
            fontWeight: 300,
            maxWidth: '75%',
          }}
        >
          {data.overviewBody}
        </p>

        {/* Key points */}
        {data.overviewKeyPoints.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 32,
            }}
          >
            {data.overviewKeyPoints.map((point, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '20px 28px',
                  borderRadius: 12,
                  backgroundColor: '#ffffff06',
                  border: `1px solid ${data.accentColor}20`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: data.accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: 18, color: '#ffffffdd', fontWeight: 400 }}>{point}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideWrapper>
  )
}
