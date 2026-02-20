import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideScopeProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideScope({ data, logoSrc }: SlideScopeProps) {
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
          Deliverables
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
          {data.scopeTitle}
        </h2>

        {/* Scope items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data.scopeItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 24,
                padding: '28px 36px',
                borderRadius: 16,
                backgroundColor: '#ffffff06',
                border: `1px solid ${item.included ? data.accentColor + '30' : '#ffffff10'}`,
              }}
            >
              {/* Checkbox indicator */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: item.included ? data.accentColor : 'transparent',
                  border: `2px solid ${item.included ? data.accentColor : '#ffffff30'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {item.included && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8L6.5 11.5L13 5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </div>
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.5,
                    color: '#ffffff99',
                    margin: 0,
                    fontWeight: 300,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  )
}
