import { SlideWrapper, SlideFooter } from '@/components/pitch-deck/slides/slide-wrapper'
import type { StoryboardPdfScene } from '@/lib/validations/storyboard-pdf-schema'

interface StoryboardScenePageProps {
  scenes: [StoryboardPdfScene] | [StoryboardPdfScene, StoryboardPdfScene]
  pageNumber: number
  totalPages: number
  logoSrc?: string
}

function SceneCard({ scene }: { scene: StoryboardPdfScene }) {
  const hasImage = !!scene.resolvedImageUrl

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        maxWidth: '50%',
      }}
    >
      {/* Scene header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#4a7c4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 900,
            color: '#ffffff',
          }}
        >
          {scene.sceneNumber}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#2B2B2B',
              lineHeight: 1.2,
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              fontSize: 13,
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

      {/* Image area — gradient placeholder always behind, image covers it if present */}
      <div
        style={{
          width: '100%',
          height: 340,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 16,
          position: 'relative',
          background: 'linear-gradient(135deg, #e8f0e4 0%, #d4e0cf 50%, #c0d1b9 100%)',
        }}
      >
        {/* Fallback text (always rendered, image covers it when present) */}
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
      </div>

      {/* Text content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scene.voiceover && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#4a7c4a',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: 3,
              }}
            >
              Voiceover / Script
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: '#444',
                fontWeight: 400,
              }}
            >
              {scene.voiceover.length > 200
                ? scene.voiceover.slice(0, 200) + '...'
                : scene.voiceover}
            </div>
          </div>
        )}

        {scene.visualNote && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#4a7c4a',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: 3,
              }}
            >
              Visual Direction
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: '#444',
                fontWeight: 400,
              }}
            >
              {scene.visualNote.length > 180
                ? scene.visualNote.slice(0, 180) + '...'
                : scene.visualNote}
            </div>
          </div>
        )}

        {scene.directorNotes && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#4a7c4a',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: 3,
              }}
            >
              Director Notes
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: '#666',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              {scene.directorNotes.length > 150
                ? scene.directorNotes.slice(0, 150) + '...'
                : scene.directorNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function StoryboardScenePage({
  scenes,
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
          padding: '40px 80px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#4a7c4a',
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

      {/* Scenes container */}
      <div
        style={{
          display: 'flex',
          gap: 60,
          padding: '30px 80px 0',
          height: 900,
        }}
      >
        {scenes.map((scene) => (
          <SceneCard key={scene.sceneNumber} scene={scene} />
        ))}
      </div>

      <SlideFooter
        pageNumber={`${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}
      />
    </SlideWrapper>
  )
}
