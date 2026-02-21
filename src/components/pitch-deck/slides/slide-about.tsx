import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'
import { ClientLogos } from './client-logos'

interface SlideAboutProps {
  data: PitchDeckFormData
  logoSrc?: string
  clientLogoBasePath?: string
  clientLogoDataMap?: Record<string, string>
}

export function SlideAbout({
  data,
  logoSrc,
  clientLogoBasePath,
  clientLogoDataMap,
}: SlideAboutProps) {
  return (
    <SlideWrapper backgroundColor="#ffffff">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '60px 100px 0',
        }}
      >
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end' }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: 4,
              }}
            >
              PROVIDED BY
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#2B2B2B',
                textTransform: 'uppercase',
              }}
            >
              CRAFTED AI
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: 4,
              }}
            >
              LAST UPDATED
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#2B2B2B',
                textTransform: 'uppercase',
              }}
            >
              {data.coverDate}
            </div>
          </div>
        </div>
        {logoSrc && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Crafted" style={{ height: 52, objectFit: 'contain' }} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ padding: '60px 100px 0' }}>
        {/* Title */}
        <h2
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#2B2B2B',
            margin: 0,
            marginBottom: 32,
            lineHeight: 1.08,
            maxWidth: '80%',
            letterSpacing: '-2.5px',
          }}
        >
          {data.aboutTitle}
        </h2>

        {/* Body text */}
        <p
          style={{
            fontSize: 22,
            lineHeight: 1.7,
            color: '#666',
            margin: 0,
            marginBottom: 56,
            maxWidth: '80%',
            fontWeight: 300,
          }}
        >
          {data.aboutBody}
        </p>

        {/* Chat input mockup */}
        <div
          style={{
            maxWidth: '80%',
            padding: '28px 36px',
            borderRadius: 20,
            border: '1px solid #e5e5e5',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            marginBottom: 56,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: '#bbb',
              marginBottom: 24,
              fontWeight: 300,
            }}
          >
            All your branding, marketing and content needs taken care of...
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Paperclip icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#bbb"
                strokeWidth="2"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
              {/* Image icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#bbb"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div style={{ width: 1, height: 22, backgroundColor: '#e0e0e0', margin: '0 8px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    backgroundColor: '#4dd0e1',
                  }}
                />
                <span style={{ fontSize: 16, color: '#999', fontWeight: 400 }}>
                  214 credits available
                </span>
              </div>
            </div>
            <div
              style={{
                padding: '14px 36px',
                borderRadius: 24,
                backgroundColor: '#3d4f5f',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              Start
            </div>
          </div>
        </div>

        {/* Client logos section */}
        <div>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#2B2B2B',
              marginBottom: 28,
            }}
          >
            Our team has crafted for clients such as:
          </p>
          <ClientLogos logoBasePath={clientLogoBasePath} logoDataMap={clientLogoDataMap} />
        </div>
      </div>
    </SlideWrapper>
  )
}
