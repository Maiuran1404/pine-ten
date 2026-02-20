// =============================================================================
// EYECANNNDY TECHNIQUE DATA — static library of ~50 cinematic techniques
// Curated for interior design storyboard relevance
// =============================================================================

export interface EyecannndyTechnique {
  slug: string
  name: string
  keywords: string[] // Fuzzy match targets for AI-suggested visualTechniques
  pageUrl: string
}

export const TECHNIQUE_MAP: EyecannndyTechnique[] = [
  // ─── Camera Movement ──────────────────────────────────────────
  {
    slug: 'aerial',
    name: 'Aerial',
    keywords: ['aerial', 'drone', 'birds-eye', 'overhead', 'top-down'],
    pageUrl: 'https://eyecannndy.com/technique/aerial',
  },
  {
    slug: 'close-up',
    name: 'Close-Up',
    keywords: ['close-up', 'closeup', 'macro', 'detail', 'tight'],
    pageUrl: 'https://eyecannndy.com/technique/close-up',
  },
  {
    slug: 'dutch-angle',
    name: 'Dutch Angle',
    keywords: ['dutch-angle', 'dutch', 'tilted', 'canted', 'tension', 'disorientation'],
    pageUrl: 'https://eyecannndy.com/technique/dutch-angle',
  },
  {
    slug: 'wide-shot',
    name: 'Wide Shot',
    keywords: ['wide-shot', 'wide', 'establishing', 'landscape', 'panoramic'],
    pageUrl: 'https://eyecannndy.com/technique/wide-shot',
  },
  {
    slug: 'over-the-shoulder',
    name: 'Over the Shoulder',
    keywords: ['over-the-shoulder', 'ots', 'shoulder', 'perspective'],
    pageUrl: 'https://eyecannndy.com/technique/over-the-shoulder',
  },
  {
    slug: 'panning',
    name: 'Panning',
    keywords: ['panning', 'pan', 'horizontal-pan', 'sweep'],
    pageUrl: 'https://eyecannndy.com/technique/panning',
  },
  {
    slug: 'tilt',
    name: 'Tilt',
    keywords: ['tilt', 'tilt-up', 'tilt-down', 'vertical-pan'],
    pageUrl: 'https://eyecannndy.com/technique/tilt',
  },
  {
    slug: 'tracking',
    name: 'Tracking Shot',
    keywords: ['tracking', 'tracking-shot', 'follow', 'following'],
    pageUrl: 'https://eyecannndy.com/technique/tracking',
  },
  {
    slug: 'handheld',
    name: 'Handheld',
    keywords: ['handheld', 'shaky', 'documentary', 'raw', 'organic'],
    pageUrl: 'https://eyecannndy.com/technique/handheld',
  },
  {
    slug: 'dolly',
    name: 'Dolly',
    keywords: ['dolly', 'dolly-in', 'dolly-out', 'push-in', 'pull-out'],
    pageUrl: 'https://eyecannndy.com/technique/dolly',
  },
  {
    slug: 'steadicam',
    name: 'Steadicam',
    keywords: ['steadicam', 'stabilized', 'smooth', 'glide'],
    pageUrl: 'https://eyecannndy.com/technique/steadicam',
  },
  {
    slug: 'crane',
    name: 'Crane',
    keywords: ['crane', 'jib', 'boom', 'sweeping'],
    pageUrl: 'https://eyecannndy.com/technique/crane',
  },
  {
    slug: 'point-of-view',
    name: 'Point of View',
    keywords: ['pov', 'point-of-view', 'first-person', 'subjective'],
    pageUrl: 'https://eyecannndy.com/technique/point-of-view',
  },
  {
    slug: 'low-angle',
    name: 'Low Angle',
    keywords: ['low-angle', 'worms-eye', 'looking-up', 'power'],
    pageUrl: 'https://eyecannndy.com/technique/low-angle',
  },
  {
    slug: 'high-angle',
    name: 'High Angle',
    keywords: ['high-angle', 'looking-down', 'vulnerability'],
    pageUrl: 'https://eyecannndy.com/technique/high-angle',
  },

  // ─── Motion / Speed ───────────────────────────────────────────
  {
    slug: 'slow-motion',
    name: 'Slow Motion',
    keywords: ['slow-motion', 'slowmo', 'slow-mo', 'dramatic', 'slowed'],
    pageUrl: 'https://eyecannndy.com/technique/slow-motion',
  },
  {
    slug: 'time-lapse',
    name: 'Time-Lapse',
    keywords: ['time-lapse', 'timelapse', 'accelerated', 'passage-of-time'],
    pageUrl: 'https://eyecannndy.com/technique/time-lapse',
  },
  {
    slug: 'speed-ramp',
    name: 'Speed Ramp',
    keywords: ['speed-ramp', 'speed-ramping', 'variable-speed', 'tempo'],
    pageUrl: 'https://eyecannndy.com/technique/speed-ramp',
  },
  {
    slug: 'stop-motion',
    name: 'Stop Motion',
    keywords: ['stop-motion', 'stopmotion', 'frame-by-frame', 'animation'],
    pageUrl: 'https://eyecannndy.com/technique/stop-motion',
  },
  {
    slug: 'fast-motion',
    name: 'Fast Motion',
    keywords: ['fast-motion', 'hyperlapse', 'sped-up', 'fast'],
    pageUrl: 'https://eyecannndy.com/technique/fast-motion',
  },

  // ─── Effects / Optics ─────────────────────────────────────────
  {
    slug: 'shallow-focus',
    name: 'Shallow Focus',
    keywords: ['shallow-focus', 'bokeh', 'depth-of-field', 'blurred-background', 'selective-focus'],
    pageUrl: 'https://eyecannndy.com/technique/shallow-focus',
  },
  {
    slug: 'deep-focus',
    name: 'Deep Focus',
    keywords: ['deep-focus', 'everything-sharp', 'full-depth'],
    pageUrl: 'https://eyecannndy.com/technique/deep-focus',
  },
  {
    slug: 'vignette',
    name: 'Vignette',
    keywords: ['vignette', 'darkened-edges', 'focus-center'],
    pageUrl: 'https://eyecannndy.com/technique/vignette',
  },
  {
    slug: 'silhouette',
    name: 'Silhouette',
    keywords: ['silhouette', 'backlit', 'shadow-figure', 'outline'],
    pageUrl: 'https://eyecannndy.com/technique/silhouette',
  },
  {
    slug: 'reflections',
    name: 'Reflections',
    keywords: ['reflections', 'mirror', 'glass', 'water-reflection'],
    pageUrl: 'https://eyecannndy.com/technique/reflections',
  },
  {
    slug: 'shadow-box',
    name: 'Shadow Box',
    keywords: ['shadow-box', 'shadow', 'framing-shadow', 'light-shadow'],
    pageUrl: 'https://eyecannndy.com/technique/shadow-box',
  },
  {
    slug: 'spotlight',
    name: 'Spotlight',
    keywords: ['spotlight', 'pool-of-light', 'isolated-light', 'dramatic-lighting'],
    pageUrl: 'https://eyecannndy.com/technique/spotlight',
  },
  {
    slug: 'lens-flare',
    name: 'Lens Flare',
    keywords: ['lens-flare', 'flare', 'sun-flare', 'light-leak'],
    pageUrl: 'https://eyecannndy.com/technique/lens-flare',
  },
  {
    slug: 'anamorphic',
    name: 'Anamorphic',
    keywords: ['anamorphic', 'widescreen', 'cinematic-lens', 'oval-bokeh'],
    pageUrl: 'https://eyecannndy.com/technique/anamorphic',
  },

  // ─── Transitions ──────────────────────────────────────────────
  {
    slug: 'match-cut',
    name: 'Match Cut',
    keywords: ['match-cut', 'match', 'visual-match', 'graphic-match'],
    pageUrl: 'https://eyecannndy.com/technique/match-cut',
  },
  {
    slug: 'whip-pan',
    name: 'Whip Pan',
    keywords: ['whip-pan', 'swish-pan', 'fast-pan', 'snap'],
    pageUrl: 'https://eyecannndy.com/technique/whip-pan',
  },
  {
    slug: 'zoom',
    name: 'Zoom',
    keywords: ['zoom', 'zoom-in', 'zoom-out', 'punch-in'],
    pageUrl: 'https://eyecannndy.com/technique/zoom',
  },
  {
    slug: 'fade',
    name: 'Fade',
    keywords: ['fade', 'fade-in', 'fade-out', 'fade-to-black'],
    pageUrl: 'https://eyecannndy.com/technique/fade',
  },
  {
    slug: 'dissolve',
    name: 'Dissolve',
    keywords: ['dissolve', 'cross-dissolve', 'blend', 'overlap'],
    pageUrl: 'https://eyecannndy.com/technique/dissolve',
  },
  {
    slug: 'wipe',
    name: 'Wipe',
    keywords: ['wipe', 'wipe-transition', 'horizontal-wipe'],
    pageUrl: 'https://eyecannndy.com/technique/wipe',
  },

  // ─── Style / Aesthetic ────────────────────────────────────────
  {
    slug: 'vintage',
    name: 'Vintage',
    keywords: ['vintage', 'retro', 'film-grain', 'nostalgic', 'aged'],
    pageUrl: 'https://eyecannndy.com/technique/vintage',
  },
  {
    slug: 'photography',
    name: 'Photography',
    keywords: ['photography', 'photographic', 'still-frame', 'captured'],
    pageUrl: 'https://eyecannndy.com/technique/photography',
  },
  {
    slug: 'mixed-media',
    name: 'Mixed Media',
    keywords: ['mixed-media', 'collage', 'multimedia', 'layered'],
    pageUrl: 'https://eyecannndy.com/technique/mixed-media',
  },
  {
    slug: 'double-exposure',
    name: 'Double Exposure',
    keywords: ['double-exposure', 'superimposed', 'overlay', 'composite'],
    pageUrl: 'https://eyecannndy.com/technique/double-exposure',
  },
  {
    slug: 'projections',
    name: 'Projections',
    keywords: ['projections', 'projection-mapping', 'projected', 'light-mapping'],
    pageUrl: 'https://eyecannndy.com/technique/projections',
  },
  {
    slug: 'split-screen',
    name: 'Split Screen',
    keywords: ['split-screen', 'multi-panel', 'divided', 'side-by-side'],
    pageUrl: 'https://eyecannndy.com/technique/split-screen',
  },
  {
    slug: 'black-and-white',
    name: 'Black & White',
    keywords: ['black-and-white', 'monochrome', 'grayscale', 'bw'],
    pageUrl: 'https://eyecannndy.com/technique/black-and-white',
  },

  // ─── Composition / Framing ────────────────────────────────────
  {
    slug: 'symmetry',
    name: 'Symmetry',
    keywords: ['symmetry', 'symmetrical', 'balanced', 'centered'],
    pageUrl: 'https://eyecannndy.com/technique/symmetry',
  },
  {
    slug: 'leading-lines',
    name: 'Leading Lines',
    keywords: ['leading-lines', 'lines', 'convergence', 'depth-lines'],
    pageUrl: 'https://eyecannndy.com/technique/leading-lines',
  },
  {
    slug: 'framing',
    name: 'Framing',
    keywords: ['framing', 'frame-within-frame', 'doorway', 'window-frame'],
    pageUrl: 'https://eyecannndy.com/technique/framing',
  },
  {
    slug: 'negative-space',
    name: 'Negative Space',
    keywords: ['negative-space', 'minimalist', 'empty-space', 'breathing-room'],
    pageUrl: 'https://eyecannndy.com/technique/negative-space',
  },
  {
    slug: 'rule-of-thirds',
    name: 'Rule of Thirds',
    keywords: ['rule-of-thirds', 'thirds', 'off-center', 'composition'],
    pageUrl: 'https://eyecannndy.com/technique/rule-of-thirds',
  },

  // ─── Lighting ─────────────────────────────────────────────────
  {
    slug: 'chiaroscuro',
    name: 'Chiaroscuro',
    keywords: ['chiaroscuro', 'high-contrast', 'light-dark', 'dramatic-shadow'],
    pageUrl: 'https://eyecannndy.com/technique/chiaroscuro',
  },
  {
    slug: 'golden-hour',
    name: 'Golden Hour',
    keywords: ['golden-hour', 'magic-hour', 'warm-light', 'sunset'],
    pageUrl: 'https://eyecannndy.com/technique/golden-hour',
  },
  {
    slug: 'neon',
    name: 'Neon',
    keywords: ['neon', 'neon-lights', 'glow', 'cyberpunk', 'fluorescent'],
    pageUrl: 'https://eyecannndy.com/technique/neon',
  },
]
