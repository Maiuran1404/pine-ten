import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper, SlideHeader, SlideFooter } from './slide-wrapper'

interface SlideProjectDetailsProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideProjectDetails({ data, logoSrc }: SlideProjectDetailsProps) {
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
            marginBottom: 64,
            lineHeight: 1.05,
            letterSpacing: '-2.5px',
          }}
        >
          {data.projectDetailsTitle}
        </h2>

        {/* Three columns */}
        <div style={{ display: 'flex', gap: 0 }}>
          {data.projectDetailsColumns.map((column, i) => (
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
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#2B2B2B',
                  margin: 0,
                  marginBottom: 18,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {column.title}
              </h3>
              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.75,
                  color: '#666',
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                {column.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <SlideFooter pageNumber="04" />
    </SlideWrapper>
  )
}
