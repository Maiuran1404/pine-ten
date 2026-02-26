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
  scene: StoryboardPdfScene
  pageNumber: number
  totalPages: number
  logoSrc?: string
}

/** Reusable section label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#4a7c4a' /* --crafted-green */,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  )
}

/** Single metadata cell for the bottom grid */
function MetadataCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#4a7c4a' /* --crafted-green */,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          color: '#444',
          fontWeight: 400,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function StoryboardScenePage({
  scene,
  pageNumber,
  totalPages,
  logoSrc,
}: StoryboardScenePageProps) {
  const hasImage = !!scene.resolvedImageUrl
  const attribution = scene.resolvedImageAttribution
  const hasFullScript = scene.fullScript && scene.fullScript !== scene.voiceover

  // Collect metadata columns that have data
  const metadataCells: Array<{ label: string; content: string }> = []
  if (scene.cameraNote) metadataCells.push({ label: 'Camera', content: scene.cameraNote })
  if (scene.directorNotes)
    metadataCells.push({ label: 'Director Notes', content: scene.directorNotes })
  if (hasFullScript) metadataCells.push({ label: 'Full Script', content: scene.fullScript! })

  return (
    <SlideWrapper backgroundColor="#ffffff">
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '36px 80px 0',
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
              fontSize: 13,
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
          <img src={logoSrc} alt="Crafted" style={{ height: 36, objectFit: 'contain' }} />
        )}
      </div>

      {/* Scene title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '24px 80px 0',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#4a7c4a' /* --crafted-green */,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 900,
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          {String(scene.sceneNumber).padStart(2, '0')}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#2B2B2B',
              lineHeight: 1.2,
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#888',
              marginTop: 2,
            }}
          >
            {scene.duration}
            {scene.transition && ` · ${scene.transition}`}
          </div>
        </div>
      </div>

      {/* Two-column layout: image left + script/visual right */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          padding: '20px 80px 0',
        }}
      >
        {/* Left column — image */}
        <div
          style={{
            width: '52%',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 460,
              borderRadius: 14,
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
                  fontSize: 42,
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
            {/* Image attribution overlay */}
            {attribution && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '8px 12px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  fontSize: 10,
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

        {/* Right column — script + visual direction */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            minWidth: 0,
          }}
        >
          {scene.voiceover && (
            <div>
              <SectionLabel>Script / Voiceover</SectionLabel>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#444',
                  fontWeight: 400,
                }}
              >
                &ldquo;{scene.voiceover}&rdquo;
              </div>
            </div>
          )}

          {scene.visualNote && (
            <div>
              <SectionLabel>Visual Direction</SectionLabel>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#444',
                  fontWeight: 400,
                }}
              >
                {scene.visualNote}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description — full width below the two columns */}
      {scene.description && (
        <div style={{ padding: '16px 80px 0' }}>
          <SectionLabel>Description</SectionLabel>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: '#444',
              fontWeight: 400,
            }}
          >
            {scene.description}
          </div>
        </div>
      )}

      {/* Metadata grid — conditional columns */}
      {metadataCells.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 24,
            padding: '16px 80px 0',
            borderTop: '1px solid #e0e0e0',
            marginLeft: 80,
            marginRight: 80,
            paddingLeft: 0,
            paddingRight: 0,
            marginTop: 16,
            paddingTop: 16,
          }}
        >
          {metadataCells.map((cell) => (
            <MetadataCell key={cell.label} label={cell.label}>
              {cell.content}
            </MetadataCell>
          ))}
        </div>
      )}

      {/* Hook data — scene 1 only */}
      {scene.hookData && (
        <div
          style={{
            margin: '16px 80px 0',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid rgba(184,134,11,0.3)' /* amber accent */,
            backgroundColor: 'rgba(184,134,11,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#b8860b' /* amber accent */,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              marginBottom: 8,
            }}
          >
            Hook Strategy
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#b8860b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 2,
                }}
              >
                Persona
              </div>
              <div style={{ fontSize: 12, color: '#2B2B2B' }}>{scene.hookData.targetPersona}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#b8860b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 2,
                }}
              >
                Pain Metric
              </div>
              <div style={{ fontSize: 12, color: '#2B2B2B' }}>{scene.hookData.painMetric}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#b8860b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 2,
                }}
              >
                Impact
              </div>
              <div style={{ fontSize: 12, color: '#2B2B2B', fontWeight: 600 }}>
                {scene.hookData.quantifiableImpact}
              </div>
            </div>
          </div>
        </div>
      )}

      <SlideFooter
        pageNumber={`${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}
      />
    </SlideWrapper>
  )
}
