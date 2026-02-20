import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideBackCoverProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideBackCover({ data, logoSrc }: SlideBackCoverProps) {
  return (
    <SlideWrapper backgroundColor={data.primaryColor}>
      {/* Background radial gradient */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${data.accentColor}10, transparent 70%)`,
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `radial-gradient(circle, ${data.accentColor}06 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '60%',
        }}
      >
        {/* Logo */}
        {logoSrc && (
          <div style={{ marginBottom: 48 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Logo"
              style={{ height: 50, objectFit: 'contain', margin: '0 auto' }}
            />
          </div>
        )}

        {/* Message */}
        <h2
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
            marginBottom: 48,
            lineHeight: 1.3,
          }}
        >
          {data.backCoverMessage}
        </h2>

        {/* Accent line */}
        <div
          style={{
            width: 60,
            height: 3,
            backgroundColor: data.accentColor,
            borderRadius: 2,
            margin: '0 auto 48px',
          }}
        />

        {/* Contact info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          {data.contactEmail && (
            <span style={{ fontSize: 18, color: '#ffffffbb', fontWeight: 300 }}>
              {data.contactEmail}
            </span>
          )}
          {data.contactPhone && (
            <span style={{ fontSize: 18, color: '#ffffffbb', fontWeight: 300 }}>
              {data.contactPhone}
            </span>
          )}
          {data.contactWebsite && (
            <span style={{ fontSize: 18, color: data.accentColor, fontWeight: 500 }}>
              {data.contactWebsite}
            </span>
          )}
        </div>
      </div>
    </SlideWrapper>
  )
}
