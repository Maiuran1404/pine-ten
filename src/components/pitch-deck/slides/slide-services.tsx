import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideServicesProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideServices({ data, logoSrc }: SlideServicesProps) {
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
          What We Do
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
          {data.servicesTitle}
        </h2>

        {/* Services grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 40,
          }}
        >
          {data.services.map((service, i) => (
            <div
              key={i}
              style={{
                padding: 36,
                borderRadius: 16,
                backgroundColor: '#ffffff08',
                border: '1px solid #ffffff12',
                transition: 'all 0.2s',
              }}
            >
              {/* Service number */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: data.accentColor,
                  marginBottom: 16,
                  letterSpacing: '2px',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>

              {/* Service name */}
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 12,
                  color: '#ffffff',
                }}
              >
                {service.name}
              </h3>

              {/* Service description */}
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: '#ffffff99',
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  )
}
