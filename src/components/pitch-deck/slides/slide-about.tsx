import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideAboutProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideAbout({ data, logoSrc }: SlideAboutProps) {
  return (
    <SlideWrapper backgroundColor={data.primaryColor}>
      {/* Background accent */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${data.accentColor}15, transparent 70%)`,
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
          Who We Are
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
          {data.aboutTitle}
        </h2>

        <div style={{ display: 'flex', gap: 80 }}>
          {/* Body text */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 22,
                lineHeight: 1.7,
                color: '#ffffffcc',
                margin: 0,
                fontWeight: 300,
              }}
            >
              {data.aboutBody}
            </p>
          </div>

          {/* Highlights */}
          {data.aboutHighlights.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {data.aboutHighlights.map((highlight, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: `${data.accentColor}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 20,
                        fontWeight: 700,
                        color: data.accentColor,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <span style={{ fontSize: 20, color: '#ffffffdd', fontWeight: 400 }}>
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 4,
          background: `linear-gradient(90deg, ${data.accentColor}, transparent)`,
        }}
      />
    </SlideWrapper>
  )
}
