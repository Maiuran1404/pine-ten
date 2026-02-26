/**
 * PDF rendering — CSS variables don't work in PDF context.
 * Hardcoded hex values: #293525/#3C612E/#5F7558/#4B624F = crafted cover palette,
 * #BDF945 = accent highlight, #ffffff = white
 */
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideWrapper } from './slide-wrapper'

interface SlideCoverProps {
  data: PitchDeckFormData
  figureLogoSrc?: string
}

export function SlideCover({ data, figureLogoSrc }: SlideCoverProps) {
  return (
    <SlideWrapper backgroundColor="#293525">
      {/* Base fill from Figma */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#4B624F',
        }}
      />

      {/* Linear gradient layer: #3C612E → #5F7558 → #293525 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #3C612E 0%, #5F7558 50%, #293525 100%)',
        }}
      />

      {/* Soft white glow - top left */}
      <div
        style={{
          position: 'absolute',
          top: -150,
          left: 50,
          width: 800,
          height: 800,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 40%, transparent 65%)',
        }}
      />

      {/* Secondary glow - center left */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 250,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 60%)',
        }}
      />

      {/* "Crafted with care™" pill badge */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 100,
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.35)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            fontSize: 15,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.3px',
          }}
        >
          Crafted with care™
        </div>
      </div>

      {/* Large gecko/figure logo - head in focus, bleeds off right and bottom */}
      {figureLogoSrc && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -280,
            zIndex: 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={figureLogoSrc}
            alt="Crafted figure"
            style={{ height: 1400, objectFit: 'contain', opacity: 0.95 }}
          />
        </div>
      )}

      {/* Main title text */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          bottom: 260,
          maxWidth: '50%',
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontSize: 110,
            fontWeight: 900,
            lineHeight: 0.95,
            margin: 0,
            color: '#ffffff',
            letterSpacing: '-3px',
          }}
        >
          {data.clientName} x<br />
          Crafted
        </h1>
      </div>

      {/* Bottom info */}
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: 100,
          display: 'flex',
          gap: 40,
          alignItems: 'flex-end',
          zIndex: 2,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#BDF945',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: 5,
            }}
          >
            PROVIDED BY
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: '#ffffff',
            }}
          >
            Crafted NO
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#BDF945',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: 5,
            }}
          >
            LAST UPDATED
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: '#ffffff',
            }}
          >
            {data.coverDate}
          </div>
        </div>
      </div>
    </SlideWrapper>
  )
}
