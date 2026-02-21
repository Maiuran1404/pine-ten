import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper, SlideHeader, SlideFooter } from './slide-wrapper'

interface SlideScopeProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideScope({ data, logoSrc }: SlideScopeProps) {
  return (
    <SlideWrapper backgroundColor="#ffffff">
      <SlideHeader date={data.coverDate} clientName={data.clientName} logoSrc={logoSrc} />

      <div style={{ padding: '80px 100px 0' }}>
        {/* Title */}
        <h2
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#2B2B2B',
            margin: 0,
            marginBottom: 56,
            lineHeight: 1.05,
            letterSpacing: '-2.5px',
          }}
        >
          {data.scopeTitle}
        </h2>

        {/* Three category columns */}
        <div style={{ display: 'flex', gap: 0 }}>
          {data.scopeCategories.map((category, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '0 40px',
                borderLeft: i > 0 ? '2px solid #e8e8e8' : 'none',
                paddingLeft: i === 0 ? 0 : 40,
              }}
            >
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#2B2B2B',
                  margin: 0,
                  marginBottom: 24,
                }}
              >
                {category.title}
              </h3>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {category.items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      fontSize: 18,
                      lineHeight: 1.55,
                      color: '#666',
                      fontWeight: 300,
                    }}
                  >
                    <span style={{ marginTop: 2, flexShrink: 0 }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <SlideFooter pageNumber="06" />
    </SlideWrapper>
  )
}
