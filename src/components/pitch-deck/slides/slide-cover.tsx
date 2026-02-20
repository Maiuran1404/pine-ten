import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideCoverProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideCover({ data, logoSrc }: SlideCoverProps) {
  return (
    <SlideWrapper backgroundColor={data.primaryColor}>
      {/* Accent diagonal stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55%',
          height: '100%',
          background: `linear-gradient(135deg, transparent 0%, ${data.accentColor}15 50%, ${data.accentColor}30 100%)`,
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `radial-gradient(circle, ${data.accentColor}08 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Logo top-left */}
      {logoSrc && (
        <div style={{ position: 'absolute', top: 60, left: 80 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        </div>
      )}

      {/* Main content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 80,
          transform: 'translateY(-50%)',
          maxWidth: '60%',
        }}
      >
        {/* Client name label */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: data.accentColor,
            marginBottom: 24,
          }}
        >
          Prepared for {data.clientName}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 20,
            color: '#ffffff',
          }}
        >
          {data.coverTitle}
        </h1>

        {/* Subtitle */}
        {data.coverSubtitle && (
          <p
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: '#ffffff99',
              margin: 0,
              marginBottom: 40,
              lineHeight: 1.4,
            }}
          >
            {data.coverSubtitle}
          </p>
        )}

        {/* Accent line */}
        <div
          style={{
            width: 80,
            height: 4,
            backgroundColor: data.accentColor,
            borderRadius: 2,
            marginBottom: 24,
          }}
        />

        {/* Date */}
        {data.coverDate && (
          <p
            style={{
              fontSize: 16,
              color: '#ffffff66',
              margin: 0,
              fontWeight: 400,
            }}
          >
            {data.coverDate}
          </p>
        )}
      </div>
    </SlideWrapper>
  )
}
