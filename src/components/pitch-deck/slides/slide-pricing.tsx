import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper, SlideHeader, SlideFooter } from './slide-wrapper'

interface SlidePricingProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlidePricing({ data, logoSrc }: SlidePricingProps) {
  return (
    <SlideWrapper backgroundColor="#ffffff">
      <SlideHeader date={data.coverDate} clientName={data.clientName} logoSrc={logoSrc} />

      <div style={{ padding: '60px 100px 0' }}>
        {/* Large "Pricing / For projects" title at top */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#2B2B2B',
              lineHeight: 1.0,
              letterSpacing: '-3px',
            }}
          >
            {data.pricingTitle}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 300,
              color: '#aaa',
              marginTop: 4,
            }}
          >
            {data.pricingSubtitle}
          </div>
        </div>

        {/* Pricing cards row */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            justifyContent: 'center',
          }}
        >
          {data.pricingCards.map((card, i) => (
            <div
              key={i}
              style={{
                width: 420,
                padding: '36px 36px 40px',
                borderRadius: 18,
                border: '1px solid #e0e0e0',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              }}
            >
              {/* Card label */}
              <div
                style={{
                  fontSize: 17,
                  color: '#888',
                  marginBottom: 14,
                  fontWeight: 400,
                }}
              >
                {card.label}
              </div>

              {/* Price */}
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  color: '#2B2B2B',
                  marginBottom: 8,
                  letterSpacing: '-1.5px',
                }}
              >
                {card.price}
              </div>

              {/* Price description */}
              <div
                style={{
                  fontSize: 15,
                  color: '#999',
                  marginBottom: 24,
                  fontWeight: 300,
                }}
              >
                {card.priceDescription}
              </div>

              {/* CTA Button */}
              <div
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 10,
                  backgroundColor: '#395C2D',
                  color: '#ffffff',
                  fontSize: 17,
                  fontWeight: 600,
                  textAlign: 'center',
                  marginBottom: 28,
                }}
              >
                {card.ctaText}
              </div>

              {/* Dashed divider */}
              <div
                style={{
                  borderTop: '1px dashed #d0d0d0',
                  marginBottom: 20,
                }}
              />

              {/* Included label */}
              <div
                style={{
                  fontSize: 14,
                  color: '#aaa',
                  marginBottom: 18,
                  fontWeight: 400,
                }}
              >
                Included in the pricing
              </div>

              {/* Included items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {card.includedItems.map((item, j) => (
                  <div
                    key={j}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {/* Green checkmark circle */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#395C2D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8L6.5 11.5L13 5"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: 16,
                        color: '#444',
                        fontWeight: 400,
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SlideFooter pageNumber="08" />
    </SlideWrapper>
  )
}
