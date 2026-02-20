import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideProjectDetailsProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideProjectDetails({ data, logoSrc }: SlideProjectDetailsProps) {
  return (
    <SlideWrapper backgroundColor={data.primaryColor}>
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: `1px solid ${data.accentColor}15`,
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
          The Project
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
          {data.projectDetailsTitle}
        </h2>

        <div style={{ display: 'flex', gap: 80 }}>
          {/* Left - project info */}
          <div style={{ flex: 1 }}>
            {/* Project name */}
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: '#ffffff',
                marginBottom: 24,
              }}
            >
              {data.projectName}
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: 20,
                lineHeight: 1.7,
                color: '#ffffffcc',
                margin: 0,
                fontWeight: 300,
              }}
            >
              {data.projectDescription}
            </p>
          </div>

          {/* Right - objectives */}
          {data.projectObjectives.length > 0 && (
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#ffffff',
                  marginBottom: 24,
                }}
              >
                Key Objectives
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {data.projectObjectives.map((objective, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: data.accentColor,
                        flexShrink: 0,
                        marginTop: 8,
                      }}
                    />
                    <span style={{ fontSize: 18, color: '#ffffffcc', lineHeight: 1.5 }}>
                      {objective}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SlideWrapper>
  )
}
