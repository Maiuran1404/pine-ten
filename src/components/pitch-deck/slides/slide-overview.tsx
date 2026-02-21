import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper, SlideHeader, SlideFooter } from './slide-wrapper'

interface SlideOverviewProps {
  data: PitchDeckFormData
  logoSrc?: string
}

export function SlideOverview({ data, logoSrc }: SlideOverviewProps) {
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
            marginBottom: 48,
            lineHeight: 1.05,
            letterSpacing: '-2.5px',
          }}
        >
          {data.overviewTitle}
        </h2>

        {/* Body text */}
        <p
          style={{
            fontSize: 24,
            lineHeight: 1.85,
            color: '#555',
            margin: 0,
            fontWeight: 300,
            maxWidth: '75%',
          }}
        >
          {data.overviewBody}
        </p>
      </div>

      <SlideFooter pageNumber="05" />
    </SlideWrapper>
  )
}
