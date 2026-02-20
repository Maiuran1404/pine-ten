import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlidePricingProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlidePricing({ data, logoSrc }: SlidePricingProps) {
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
          Pricing
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
          {data.pricingTitle}
        </h2>

        {/* Pricing table */}
        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid #ffffff12',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr',
              padding: '20px 36px',
              backgroundColor: '#ffffff08',
              borderBottom: '1px solid #ffffff12',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff66',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Item
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff66',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Description
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff66',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textAlign: 'right',
              }}
            >
              Price
            </div>
          </div>

          {/* Line items */}
          {data.pricingItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 1fr',
                padding: '24px 36px',
                borderBottom: i < data.pricingItems.length - 1 ? '1px solid #ffffff08' : 'none',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 500, color: '#ffffff' }}>{item.item}</div>
              <div style={{ fontSize: 16, color: '#ffffff99', fontWeight: 300 }}>
                {item.description}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#ffffff',
                  textAlign: 'right',
                }}
              >
                {item.price}
              </div>
            </div>
          ))}

          {/* Total row */}
          {data.pricingTotal && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 1fr',
                padding: '24px 36px',
                backgroundColor: `${data.accentColor}15`,
                borderTop: `2px solid ${data.accentColor}40`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>Total</div>
              <div />
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: data.accentColor,
                  textAlign: 'right',
                }}
              >
                {data.pricingTotal}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {data.pricingNotes && (
          <p
            style={{
              fontSize: 15,
              color: '#ffffff66',
              marginTop: 24,
              fontStyle: 'italic',
              fontWeight: 300,
            }}
          >
            {data.pricingNotes}
          </p>
        )}
      </div>
    </SlideWrapper>
  )
}
