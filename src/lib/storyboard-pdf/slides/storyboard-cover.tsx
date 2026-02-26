/**
 * PDF rendering — CSS variables don't work in PDF context.
 * Hardcoded hex values match design tokens:
 *   #293525/#3C612E/#5F7558/#4B624F = crafted forest/green cover palette,
 *   #BDF945 = accent highlight, #ffffff = white
 */
import { SlideWrapper } from '@/components/pitch-deck/slides/slide-wrapper'

interface StoryboardCoverProps {
  sceneCount: number
  totalDuration: string
  date: string
  figureLogoSrc?: string
}

export function StoryboardCover({
  sceneCount,
  totalDuration,
  date,
  figureLogoSrc,
}: StoryboardCoverProps) {
  return (
    <SlideWrapper backgroundColor="#293525">
      {/* Base fill */}
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

      {/* Linear gradient layer */}
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

      {/* Gecko/figure logo — rendered at native 632×649 to avoid upscale blur */}
      {figureLogoSrc && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: -40,
            zIndex: 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={figureLogoSrc}
            alt="Crafted figure"
            style={{
              height: 900,
              objectFit: 'contain',
              opacity: 0.92,
              imageRendering: 'auto',
            }}
          />
        </div>
      )}

      {/* Main title */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          bottom: 300,
          maxWidth: '55%',
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
          Video
          <br />
          Storyboard
        </h1>
      </div>

      {/* Stats row */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 100,
          display: 'flex',
          gap: 50,
          zIndex: 2,
        }}
      >
        <div
          style={{
            padding: '14px 28px',
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#BDF945',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: 4,
            }}
          >
            Scenes
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff' }}>{sceneCount}</div>
        </div>
        <div
          style={{
            padding: '14px 28px',
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#BDF945',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: 4,
            }}
          >
            Duration
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff' }}>{totalDuration}</div>
        </div>
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
          <div style={{ fontSize: 17, fontWeight: 900, color: '#ffffff' }}>Crafted AI</div>
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
            GENERATED
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#ffffff' }}>{date}</div>
        </div>
      </div>
    </SlideWrapper>
  )
}
