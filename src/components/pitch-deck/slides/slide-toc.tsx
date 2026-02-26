/**
 * PDF rendering — CSS variables don't work in PDF context.
 * Hardcoded hex values: #2B2B2B = foreground, #bbb = muted shades, #e8e8e8 = border
 */
import { SlideWrapper, SlideFooter } from './slide-wrapper'

const TOC_ITEMS = [
  { title: 'ABOUT', page: '03' },
  { title: 'PROJECT DETAILS', page: '04' },
  { title: 'SCOPE OF WORK', page: '05' },
  { title: 'TIMELINE', page: '06' },
  { title: 'PRICING', page: '08' },
  { title: 'CONTACT INFORMATION', page: '09' },
]

export function SlideToc() {
  return (
    <SlideWrapper backgroundColor="#ffffff">
      <div
        style={{
          padding: '100px 120px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
          paddingBottom: 100,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TOC_ITEMS.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '40px 0',
                borderBottom: '1px solid #e8e8e8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <span style={{ fontSize: 10, color: '#bbb' }}>•</span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: '#2B2B2B',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.title}
                </span>
              </div>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 300,
                  color: '#bbb',
                }}
              >
                {item.page}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SlideFooter pageNumber="02" />
    </SlideWrapper>
  )
}
