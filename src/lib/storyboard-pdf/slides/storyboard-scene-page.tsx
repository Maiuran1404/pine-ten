/**
 * PDF rendering — CSS variables don't work in PDF context.
 * Hardcoded hex values match design tokens:
 *   #4a7c4a = --crafted-green, #2B2B2B = foreground, #888/#666/#999/#444 = muted shades,
 *   #e8f0e4/#d4e0cf/#c0d1b9 = crafted-mint/sage gradients,
 *   #b8860b = --ds-role-hook (amber accent for hook data)
 */
import { SlideWrapper, SlideFooter } from '@/components/pitch-deck/slides/slide-wrapper'
import type { StoryboardPdfScene } from '@/lib/validations/storyboard-pdf-schema'

interface StoryboardScenePageProps {
  sceneA: StoryboardPdfScene
  sceneB?: StoryboardPdfScene
  pageNumber: number
  totalPages: number
  logoSrc?: string
}

/** Reusable section label — compact for dual layout */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: '#4a7c4a' /* --crafted-green */,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        marginBottom: 2,
      }}
    >
      {children}
    </div>
  )
}

/** Truncate text to a max length to prevent overflow */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

/** Single scene card rendered in compact form */
function SceneCard({ scene }: { scene: StoryboardPdfScene }) {
  const hasImage = !!scene.resolvedImageUrl
  const attribution = scene.resolvedImageAttribution

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Scene # badge + title + duration/transition row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: '#4a7c4a' /* --crafted-green */,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 900,
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          {String(scene.sceneNumber).padStart(2, '0')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#2B2B2B',
              lineHeight: 1.2,
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#888',
              marginTop: 1,
            }}
          >
            {scene.duration}
            {scene.transition && ` · ${scene.transition}`}
          </div>
        </div>
      </div>

      {/* Vertical layout: image on top, text below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Image row */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              width: '100%',
              height: 200,
              borderRadius: 10,
              overflow: 'hidden',
              position: 'relative',
              background: 'linear-gradient(135deg, #e8f0e4 0%, #d4e0cf 50%, #c0d1b9 100%)',
            }}
          >
            {/* Fallback text */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: 'rgba(74,124,74,0.25)',
                }}
              >
                Scene {scene.sceneNumber}
              </div>
            </div>
            {hasImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={scene.resolvedImageUrl}
                alt={scene.title}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            {attribution && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '6px 10px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 400,
                }}
              >
                {attribution.photographer
                  ? `${attribution.photographer} · ${attribution.sourceName}`
                  : attribution.filmTitle
                    ? `${attribution.filmTitle} · ${attribution.sourceName}`
                    : attribution.sourceName}
              </div>
            )}
          </div>
        </div>

        {/* Text row — script, visual direction, description, camera */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            columnGap: 32,
          }}
        >
          {scene.voiceover && (
            <div style={{ flex: '1 1 45%', minWidth: 200 }}>
              <SectionLabel>Script / Voiceover</SectionLabel>
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: '#444',
                  fontWeight: 400,
                }}
              >
                &ldquo;{truncate(scene.voiceover, 200)}&rdquo;
              </div>
            </div>
          )}

          {scene.visualNote && (
            <div style={{ flex: '1 1 45%', minWidth: 200 }}>
              <SectionLabel>Visual Direction</SectionLabel>
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: '#444',
                  fontWeight: 400,
                }}
              >
                {truncate(scene.visualNote, 180)}
              </div>
            </div>
          )}

          {scene.description && (
            <div style={{ flex: '1 1 45%', minWidth: 200 }}>
              <SectionLabel>Description</SectionLabel>
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: '#444',
                  fontWeight: 400,
                }}
              >
                {truncate(scene.description, 180)}
              </div>
            </div>
          )}

          {scene.cameraNote && (
            <div style={{ flex: '1 1 45%', minWidth: 200 }}>
              <SectionLabel>Camera</SectionLabel>
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: '#444',
                  fontWeight: 400,
                }}
              >
                {truncate(scene.cameraNote, 120)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hook data row if present */}
      {scene.hookData && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(184,134,11,0.3)' /* amber accent */,
            backgroundColor: 'rgba(184,134,11,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#b8860b' /* amber accent */,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              marginBottom: 4,
            }}
          >
            Hook Strategy
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: '#b8860b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 1,
                }}
              >
                Persona
              </div>
              <div style={{ fontSize: 11, color: '#2B2B2B' }}>{scene.hookData.targetPersona}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: '#b8860b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 1,
                }}
              >
                Pain Metric
              </div>
              <div style={{ fontSize: 11, color: '#2B2B2B' }}>{scene.hookData.painMetric}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: '#b8860b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 1,
                }}
              >
                Impact
              </div>
              <div style={{ fontSize: 11, color: '#2B2B2B', fontWeight: 600 }}>
                {scene.hookData.quantifiableImpact}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function StoryboardScenePage({
  sceneA,
  sceneB,
  pageNumber,
  totalPages,
  logoSrc,
}: StoryboardScenePageProps) {
  return (
    <SlideWrapper backgroundColor="#ffffff">
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '28px 60px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#4a7c4a' /* --crafted-green */,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}
          >
            Video Storyboard
          </span>
        </div>
        {logoSrc && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoSrc} alt="Crafted" style={{ height: 32, objectFit: 'contain' }} />
        )}
      </div>

      {/* Scene cards container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 60px 0',
          flex: 1,
        }}
      >
        {/* Scene A */}
        <SceneCard scene={sceneA} />

        {/* Divider + Scene B (if present) */}
        {sceneB && (
          <>
            <div
              style={{
                borderTop: '1px solid #e0e0e0',
                margin: '16px 0',
              }}
            />
            <SceneCard scene={sceneB} />
          </>
        )}
      </div>

      <SlideFooter
        pageNumber={`${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}
      />
    </SlideWrapper>
  )
}
