import type { ReactNode } from 'react'

interface SlideWrapperProps {
  children: ReactNode
  backgroundColor?: string
}

export function SlideWrapper({ children, backgroundColor = '#ffffff' }: SlideWrapperProps) {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor,
        fontFamily: "var(--font-satoshi, 'Satoshi'), 'Inter', 'Helvetica Neue', Arial, sans-serif",
        color: '#2B2B2B',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

interface SlideHeaderProps {
  date: string
  clientName?: string
  logoSrc?: string
}

export function SlideHeader({ date, clientName, logoSrc }: SlideHeaderProps) {
  return (
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
            {date}
          </div>
        </div>
        {clientName && (
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
              CLIENT
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#2B2B2B',
                textTransform: 'uppercase',
              }}
            >
              {clientName}
            </div>
          </div>
        )}
      </div>
      {logoSrc && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Crafted" style={{ height: 52, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

interface SlideFooterProps {
  pageNumber: string
}

export function SlideFooter({ pageNumber }: SlideFooterProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: 100,
        right: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #e0e0e0',
        paddingTop: 18,
      }}
    >
      <span style={{ fontSize: 15, color: '#aaa', fontWeight: 300 }}>Provided by Crafted™</span>
      <span style={{ fontSize: 15, color: '#aaa', fontWeight: 300 }}>{pageNumber}</span>
    </div>
  )
}
