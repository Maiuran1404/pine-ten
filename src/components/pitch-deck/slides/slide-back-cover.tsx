/**
 * PDF rendering — CSS variables don't work in PDF context.
 * Hardcoded hex values: #f5f7f2 = light bg, #2B2B2B = foreground, #395C2D = --crafted-forest,
 * #666/#aaa = muted shades
 */
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper, SlideFooter } from './slide-wrapper'

interface SlideBackCoverProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideBackCover({ data, logoSrc }: SlideBackCoverProps) {
  return (
    <SlideWrapper backgroundColor="#f5f7f2">
      {/* Soft green gradient overlay */}
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

      {/* Subtle light spots */}
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: '25%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(181,206,172,0.1) 0%, transparent 60%)',
        }}
      />

      {/* Large Crafted logo top right */}
      {logoSrc && (
        <div style={{ position: 'absolute', top: 80, right: 100 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="Crafted"
            style={{
              height: 120,
              objectFit: 'contain',
              filter: 'sepia(1) saturate(3) hue-rotate(60deg) brightness(0.5)',
            }}
          />
        </div>
      )}

      {/* Main content */}
      <div
        style={{
          padding: '0 100px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#2B2B2B',
            margin: 0,
            marginBottom: 32,
            lineHeight: 1.08,
            letterSpacing: '-2.5px',
          }}
        >
          {data.backCoverMessage}
        </h2>

        {/* Body text */}
        <p
          style={{
            fontSize: 22,
            lineHeight: 1.75,
            color: '#666',
            margin: 0,
            marginBottom: 18,
            maxWidth: '60%',
            fontWeight: 300,
          }}
        >
          {data.backCoverBody}
        </p>

        {/* PM intro line */}
        <p
          style={{
            fontSize: 19,
            color: '#666',
            margin: 0,
            marginBottom: 44,
            fontWeight: 300,
          }}
        >
          Project manager will be your primary point of contact, and is available at:
        </p>

        {/* Contact info grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '28px 80px',
            maxWidth: '60%',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: 6,
              }}
            >
              PROJECT MANAGER
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#395C2D',
              }}
            >
              {data.contactName}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: 6,
              }}
            >
              PHONE NUMBER
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#395C2D',
              }}
            >
              {data.contactPhone}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: 6,
              }}
            >
              EMAIL
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#395C2D',
              }}
            >
              {data.contactEmail}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: 6,
              }}
            >
              FIND OUT
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#395C2D',
              }}
            >
              {data.contactWebsite}
            </div>
          </div>
        </div>
      </div>

      <SlideFooter pageNumber="09" />
    </SlideWrapper>
  )
}
