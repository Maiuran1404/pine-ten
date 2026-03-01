import * as dotenv from 'dotenv'

// Load environment variables first
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

/**
 * 18 curated visual style presets for Launch Video (and Feature Video).
 * Presets 1-8 UPDATE existing records; presets 9-18 INSERT new records.
 * Each preset has a detailed AI prompt guide for photorealistic style direction.
 */
const visualPresets = [
  // ─── 1. Bold & Kinetic ───
  {
    name: 'Bold & Kinetic',
    description: 'High-energy visuals with dynamic angles, saturated colors, and motion blur',
    imageUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'bold',
    semanticTags: ['bold', 'energetic', 'dynamic', 'vibrant', 'motion', 'impactful', 'kinetic'],
    colorTemperature: 'warm',
    energyLevel: 'energetic',
    formalityLevel: 'casual',
    moodKeywords: ['exciting', 'powerful', 'urgent', 'electric'],
    promptGuide: `Photograph the subject mid-action with a high-speed camera at 1/2000s shutter speed, freezing every micro-detail — fabric tension, hair displacement, spray particles. Use a 35mm wide-angle lens shot low from hip-height to exaggerate perspective and power. Light with a single hard key light at 45 degrees camera-left, creating razor-sharp shadows and specular highlights on skin and surfaces. Fill with a faint warm bounce from below to lift shadow detail without softening the contrast.

Color palette: electric blue (#0047AB), vivid red (#E63946), hot yellow (#FFD60A) against crushed blacks. Grade the image with lifted blacks at 5% and a subtle teal push in the shadows. Skin tones stay accurate — never color-cast.

Shoot against a dark or industrial background — concrete, raw metal, matte black. If motion blur is present, restrict it to the background using panning technique — the subject stays tack-sharp. Include real environmental texture: dust motes catching the light, condensation on metal, scuff marks on concrete. Grain structure should mimic Kodak Vision3 500T — visible but organic, never digital noise.

Think Red Bull "Gives You Wings" campaign meets Nike "Just Do It" photography by Marcus Smith. The image must feel like a real frame pulled from a high-budget commercial shoot.`,
    featuredOrder: 1,
    displayOrder: 1,
  },

  // ─── 2. Corporate Professional ───
  {
    name: 'Corporate Professional',
    description:
      'Polished business aesthetic with clean lines, neutral tones, and trustworthy framing',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'corporate',
    semanticTags: [
      'corporate',
      'professional',
      'business',
      'trustworthy',
      'polished',
      'enterprise',
      'clean',
    ],
    colorTemperature: 'cool',
    energyLevel: 'balanced',
    formalityLevel: 'formal',
    moodKeywords: ['reliable', 'authoritative', 'confident', 'established'],
    promptGuide: `Photograph the scene in a real modern office environment — glass-walled conference rooms, polished concrete or hardwood floors, minimal but expensive furniture. Use a 50mm or 85mm lens at f/2.8 to f/4 for natural perspective with gentle background separation. Light with large, even overhead softboxes or diffused window light — shadows should exist but be soft and open, never harsh. The overall exposure should feel bright and airy without being blown out.

Color palette: navy (#1B365D), charcoal (#36454F), white (#FFFFFF), with a single restrained accent — teal (#008080) or warm gold (#C5A55A). Grade with neutral-to-slightly-warm white balance (5800K). Skin tones must be natural and flattering.

Subjects wear business professional or smart business casual attire. Expressions are engaged, composed, and confident — not stiff or stock-photo-posed. Hands should be doing something purposeful: gesturing in conversation, holding a pen, touching a tablet screen. Include real environmental details: branded notebooks, a quality coffee cup, a plant, subtle reflections in glass walls.

Surfaces reflect competence: brushed aluminum, frosted glass, leather-bound notebooks. The image should look like an outtake from a McKinsey annual report or a Salesforce hero image — polished, trustworthy, and unmistakably real. No generic stock-photo lighting. No forced smiles.`,
    featuredOrder: 1,
    displayOrder: 2,
  },

  // ─── 3. Editorial Documentary ───
  {
    name: 'Editorial Documentary',
    description:
      'Story-driven compositions with natural light, intimate framing, and authentic textures',
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'editorial',
    semanticTags: [
      'editorial',
      'documentary',
      'authentic',
      'storytelling',
      'natural',
      'intimate',
      'narrative',
    ],
    colorTemperature: 'neutral',
    energyLevel: 'balanced',
    formalityLevel: 'formal',
    moodKeywords: ['truthful', 'contemplative', 'human', 'grounded'],
    promptGuide: `Capture the subject candidly, as if the photographer is a fly on the wall during a genuine moment. Shoot with a 35mm or 50mm prime lens at f/2 to f/2.8 for a natural field of view with soft but present background context. Use only available light — golden hour sunlight streaming through a window, overcast daylight, or practical room lighting. Never add a visible flash or studio strobe. Shadows should be deep and directional, embracing natural falloff.

Color grade: slightly desaturated with warm midtones and cool shadows, as if shot on Kodak Portra 400 or Fuji Pro 400H film. Lift the blacks gently to 8-10% for that analog film base. Keep skin tones warm and authentic. Subtle color shifts between highlights (warm) and shadows (cool-teal) create depth.

Composition follows rule of thirds with intentional negative space for text overlay. The subject should be framed contextually — in their environment, surrounded by the real textures of their world: wood grain, weathered surfaces, linen fabric, handwritten notes, worn leather. No artificial posing; the moment feels captured, not constructed.

Grain should be medium-fine and organic, consistent with pushed 35mm film. Think National Geographic intimate portraits meets Kinfolk magazine's environmental storytelling meets The New York Times documentary photography. The image should feel honest, editorial, and deeply human.`,
    featuredOrder: 1,
    displayOrder: 3,
  },

  // ─── 4. Clean & Minimal ───
  {
    name: 'Clean & Minimal',
    description:
      'Refined simplicity with generous whitespace, soft gradients, and understated motion',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'minimal',
    semanticTags: ['clean', 'minimal', 'whitespace', 'modern', 'elegant', 'simple', 'refined'],
    colorTemperature: 'cool',
    energyLevel: 'calm',
    formalityLevel: 'balanced',
    moodKeywords: ['serene', 'confident', 'sophisticated', 'breathable'],
    promptGuide: `Photograph the subject on a pure, uncluttered background — seamless white/light grey studio paper, or a real environment stripped to its most essential elements. Use a 90mm or 100mm macro-capable lens for product shots, or a 50mm for environmental scenes. Shoot at f/4 to f/5.6 for maximum sharpness across the subject with controlled depth of field.

Light with a single large softbox (4x6 ft minimum) positioned high and slightly behind the subject at 45 degrees, creating soft, wrapping light with a clean specular highlight. Add a white fill card opposite to open shadows gently. The lighting ratio should be no more than 2:1 — low contrast, high detail.

Color palette: off-white (#F5F5F0), warm grey (#E8E4E0), pale beige (#F0EBE3), with one precise accent if needed. White balance at 5600K, perfectly neutral. No color cast whatsoever.

Every element in frame is intentional — nothing superfluous. Surfaces are matte or lightly textured: unfinished wood, matte ceramic, brushed concrete. If the subject is a product, it sits on a clean surface with a single subtle shadow grounding it. Mathematical precision in spacing and alignment — the composition should feel like an Apple product page or a Braun design catalog. Absolutely zero visual noise.`,
    featuredOrder: 1,
    displayOrder: 4,
  },

  // ─── 5. Organic & Natural ───
  {
    name: 'Organic & Natural',
    description:
      'Earthy tones, natural textures, and warm golden-hour lighting with an artisanal feel',
    imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'organic',
    semanticTags: [
      'organic',
      'natural',
      'earthy',
      'warm',
      'sustainable',
      'artisanal',
      'handcrafted',
    ],
    colorTemperature: 'warm',
    energyLevel: 'calm',
    formalityLevel: 'casual',
    moodKeywords: ['grounded', 'authentic', 'warm', 'wholesome'],
    promptGuide: `Photograph the scene bathed in real golden-hour sunlight — the warm, directional light that occurs 30-60 minutes before sunset. Shoot with a vintage-character lens (a 50mm f/1.4 or similar) wide open for naturally soft rendering with gentle optical imperfections — subtle flare, smooth bokeh, mild vignetting. These optical qualities signal "real camera" not "digital render."

Color palette: terracotta (#C27D5A), sage green (#9CAF88), warm sand (#D4B896), cream (#FFF8E7), dried clay (#B8860B). Grade with warm highlights, lifted shadows with an amber cast, and gently pulled-back saturation in the greens to avoid artificiality. Skin tones stay golden and natural.

The environment is tactile and real. Include natural materials you can almost feel: raw linen with visible weave, hand-thrown ceramic with slight irregularities, rough-hewn wood with grain and knots, dried botanical elements, woven rattan baskets, cork surfaces. Backgrounds include natural stone, sun-warmed terracotta walls, or soft-focus garden greenery.

Soft directional light casting long, warm shadows. Slight golden grain throughout the image mimicking Kodak Gold 200. The composition feels effortless and discovered — as if stumbled upon in a craftsman's workshop or a sun-drenched Mediterranean kitchen. Think Aesop store photography meets Patagonia's editorial work meets Kinfolk's lifestyle storytelling. Honest, sustainable, warm.`,
    featuredOrder: 1,
    displayOrder: 5,
  },

  // ─── 6. Playful & Energetic ───
  {
    name: 'Playful & Energetic',
    description: 'Bright colors, fun compositions, and youthful energy with illustrated accents',
    imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'playful',
    semanticTags: ['playful', 'fun', 'colorful', 'energetic', 'creative', 'youthful', 'bright'],
    colorTemperature: 'warm',
    energyLevel: 'energetic',
    formalityLevel: 'casual',
    moodKeywords: ['joyful', 'friendly', 'approachable', 'whimsical'],
    promptGuide: `Photograph with a 24mm or 28mm wide-angle lens from slightly unconventional angles — shoot from below looking up, from a high overhead position, or tilted 5-10 degrees for dynamic energy. Use a fast shutter speed (1/1000s+) to freeze mid-action expressions: genuine laughter, surprised delight, enthusiastic gestures caught between poses.

Light with flat, even illumination from a large overhead source — think open shade or a giant silk diffuser — to minimize harsh shadows and keep the mood bright and approachable. Add a ring-light-style catchlight in the eyes for vibrancy.

Color palette: coral pink (#FF6B6B), sunshine yellow (#FFD93D), sky blue (#6EC6E6), mint green (#88D8B0), with pops of unexpected combinations. Grade warm and bright with lifted shadows and slightly boosted vibrance — but keep it photographic, not illustration-like. Skin tones stay natural and healthy.

Include real playful elements: confetti (but actual paper, not digital), colorful props with physical presence, bold patterned backgrounds (polka dots, stripes, geometric tiles). Props have texture — you can see the paper grain of a streamer, the matte finish of a painted surface, the glossy reflection on a balloon.

Subjects are in genuine motion — hair bouncing, fabric swinging, hands gesturing. The composition uses strong diagonals and asymmetry. Think Mailchimp's brand photography meets Headspace's campaign imagery meets a Glossier product launch. Approachable, optimistic, impossible not to smile at — but always a real photograph.`,
    featuredOrder: 1,
    displayOrder: 6,
  },

  // ─── 7. Premium Cinematic ───
  {
    name: 'Premium Cinematic',
    description:
      'Film-quality compositions with dramatic lighting, wide aspect ratios, and rich contrast',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'premium',
    semanticTags: ['cinematic', 'premium', 'dramatic', 'film', 'luxury', 'atmospheric', 'high-end'],
    colorTemperature: 'cool',
    energyLevel: 'calm',
    formalityLevel: 'formal',
    moodKeywords: ['epic', 'luxurious', 'atmospheric', 'immersive'],
    promptGuide: `Frame in 2.39:1 cinematic aspect ratio. Shoot with an anamorphic lens (or simulate the characteristics): horizontal lens flare streaks, oval bokeh, slight edge distortion, and natural breathing on focus pulls. Use a 40mm or 50mm anamorphic equivalent for intimate scenes, 75mm for portraits.

Light with dramatic chiaroscuro — a single motivated key light (practical lamp, window, screen glow) creating deep shadows that consume 40-60% of the frame. Add a subtle rim/edge light from behind at 1-2 stops below the key to separate the subject from the background. Use negative fill (black flags) to deepen shadow contrast.

Color grade: rich teal (#1A3A4A) and warm orange/amber (#C67A3C) split-toning — teal in shadows, amber in highlights. Crushed blacks with luminance at 3-5%. Creamy, desaturated highlights rolling off gently. Skin tones retain warmth within the grade. The look mimics a film print from an ARRI Alexa graded in DaVinci Resolve.

Surfaces have texture and reflection — leather, glass, water, polished metal, premium fabric weaves. Include atmospheric elements: volumetric haze, subtle lens condensation, anamorphic flare from a practical light source. Every frame looks like a still from a Christopher Nolan or Denis Villeneuve film — or a premium automotive commercial. Immersive, tactile, larger than life.`,
    featuredOrder: 1,
    displayOrder: 7,
  },

  // ─── 8. Tech Futuristic ───
  {
    name: 'Tech Futuristic',
    description:
      'Sleek digital aesthetic with neon accents, dark interfaces, and sci-fi atmosphere',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'tech',
    semanticTags: ['tech', 'futuristic', 'digital', 'neon', 'sci-fi', 'modern', 'gradient'],
    colorTemperature: 'cool',
    energyLevel: 'energetic',
    formalityLevel: 'balanced',
    moodKeywords: ['innovative', 'cutting-edge', 'electric', 'forward-thinking'],
    promptGuide: `Photograph in a dark, controlled environment with precise accent lighting. The subject is illuminated by colored LED edge lighting — electric cyan (#00E5FF), deep violet (#7B2FBE), hot magenta (#FF006E) — creating glowing rim outlines that separate the subject from a near-black background. The key light is cool and clinical: a small, hard source slightly above and in front, creating defined but not harsh shadows.

Surfaces are predominantly dark with high-tech materiality: brushed black aluminum, dark tempered glass with subtle reflections, carbon fiber weave visible at close inspection, polished obsidian. Include subtle holographic or prismatic reflections on glass surfaces — real light refractions, not digital overlays.

The background includes geometric patterns: hexagonal grids etched into surfaces, concentric circles in brushed metal, circuit-board-inspired line patterns — but all as real physical materials, not overlaid graphics. Subtle particle effects (dust catching colored light beams) add atmosphere.

Color grade: predominantly dark with lifted highlights in the accent colors. Skin tones (if present) stay natural but with cool undertones from the environment. Shadows are true black with no lifted base. Highlights are selective and precise.

The image should feel like walking into a Tesla showroom meets Blade Runner's practical set design — high-tech, visionary, and slightly otherworldly, but every element is a real material photographed in a real space. Never CGI, never 3D-rendered.`,
    featuredOrder: 1,
    displayOrder: 8,
  },

  // ══════════════════════════════════════════════════════════
  // PART 2: 10 NEW PRESETS
  // ══════════════════════════════════════════════════════════

  // ─── 9. Warm Storytelling ───
  {
    name: 'Warm Storytelling',
    description:
      'Authentic human moments with practical lighting, photojournalistic framing, and warm tones',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'editorial',
    subStyle: 'storytelling',
    semanticTags: ['story', 'team', 'warm', 'authentic', 'documentary', 'human', 'candid'],
    colorTemperature: 'warm',
    energyLevel: 'balanced',
    formalityLevel: 'casual',
    moodKeywords: ['intimate', 'genuine', 'collaborative', 'purposeful'],
    promptGuide: `Capture authentic human moments — team members mid-conversation, hands collaborating on a whiteboard, someone lost in focused thought with coffee going cold beside them. Shoot with an 85mm f/1.8 lens for flattering perspective and creamy background separation. Focus is tack-sharp on the subject's eyes; the background dissolves into soft, warm circles of light.

Light entirely with practicals and available light: the warm glow of desk lamps, laptop screens casting blue-white fill, afternoon sunlight filtering through blinds creating venetian-shadow patterns on walls. No visible studio equipment. The lighting should feel like the natural atmosphere of the space.

Color palette: warm amber (#D4915E), soft cream (#FFF5E6), muted terracotta (#B86B4A), deep espresso (#3C2415). Grade with a warm base, slightly lifted blacks (7-8%), and gentle roll-off in highlights. Mimic the look of Kodak Portra 800 pushed one stop — warm, grainy, slightly contrasty but with beautiful skin rendering.

Include the messy reality of creative work: sticky notes on monitors, marker-stained whiteboards, tangled headphone cables, half-eaten lunch. These imperfections make the image feel documented, not staged. Composition is loose and photojournalistic — slightly off-center framing, natural leading lines from desk edges or corridors.

Think WeWork editorial photography meets Airbnb's early team documentary style meets a Vice documentary still. The image tells a story of real people building something together.`,
    featuredOrder: 1,
    displayOrder: 9,
  },

  // ─── 10. Luxury & Refined ───
  {
    name: 'Luxury & Refined',
    description:
      'Extreme precision with tactile surface detail, restrained palette, and sculptural lighting',
    imageUrl: 'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'premium',
    subStyle: 'luxury',
    semanticTags: ['luxury', 'refined', 'product', 'premium', 'elegant', 'tactile', 'detail'],
    colorTemperature: 'warm',
    energyLevel: 'calm',
    formalityLevel: 'formal',
    moodKeywords: ['exclusive', 'meticulous', 'opulent', 'restrained'],
    promptGuide: `Photograph with extreme precision using a 100mm macro or 90mm tilt-shift lens for flawless sharpness and controlled depth of field. Every surface detail is rendered with almost tactile clarity: the grain of Italian leather, the weight of brushed gold hardware, the crisp fold of a linen pocket square, the specular highlight on hand-polished lacquer.

Light with a single, large, overhead softbox positioned to create one long, elegant gradient across the subject — brightest at the top-left, falling to rich shadow at the bottom-right. Add a small, focused accent light to create a single pristine specular highlight on the hero material. Negative fill on the shadow side to deepen contrast.

Color palette: black (#0A0A0A), ivory (#FFFFF0), champagne gold (#C9A96E), deep burgundy (#4A0E2C). The palette is restrained — no more than three colors visible in any frame. Grade with deep, rich blacks (crushed to 2%), warm, creamy highlights, and neutral midtones. Skin tones (if present) are magazine-perfect: retouched-feeling but not plastic.

Backgrounds are real luxury materials: Italian marble with natural veining, dark walnut burl wood, heavy weave linen in charcoal or cream. Compositions are geometrically precise with generous negative space. Every element is positioned with millimeter intention.

Think Hermès product photography meets Rolls-Royce campaign imagery. The image whispers quality; it never shouts.`,
    featuredOrder: 1,
    displayOrder: 10,
  },

  // ─── 11. Urban & Street ───
  {
    name: 'Urban & Street',
    description:
      'Gritty city energy with neon reflections, handheld framing, and cinematic film stock look',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'bold',
    subStyle: 'urban',
    semanticTags: ['urban', 'street', 'culture', 'gritty', 'neon', 'city', 'night'],
    colorTemperature: 'cool',
    energyLevel: 'energetic',
    formalityLevel: 'casual',
    moodKeywords: ['raw', 'alive', 'textured', 'nocturnal'],
    promptGuide: `Shoot handheld with a 28mm or 35mm lens at f/5.6 for deep depth of field that captures the full energy of an urban environment. The slight motion and imperfect framing of handheld shooting adds authenticity — a 1-2 degree tilt, a subject slightly off the mathematical center. Use available city light: neon signage, street lamps casting pools of sodium-vapor warmth, LED screens painting blue-white wash on wet pavement.

Color palette: charcoal concrete (#4A4A4A), neon highlights — pink (#FF3366), blue (#00BFFF), amber (#FFA500) — reflected in puddles, glass, and metallic surfaces. Grade with a cross-processed feel: pushed blue-greens in shadows, warm yellow in highlights, moderate contrast with punchy midtones. Mimic Cinestill 800T film stock — its distinctive halation glow around bright light sources is the signature look.

The environment is texturally rich: rain-slicked asphalt reflecting neon, weathered brick walls with peeling posters, steel fire escapes, steamed-up diner windows, grated subway vents. Include atmospheric depth: distant traffic lights out of focus, steam rising from manholes, visible breath in cold air.

Subjects are captured in-stride, mid-moment — walking through frame, turning a corner, illuminated by a passing car's headlights. The composition uses strong vanishing points down city streets and natural frames from doorways and alleys.

Think Humans of New York meets Brandon Stanton's documentary approach meets a Nike city campaign. Gritty, alive, textured, and unmistakably real street photography.`,
    featuredOrder: 1,
    displayOrder: 11,
  },

  // ─── 12. Bright Startup ───
  {
    name: 'Bright Startup',
    description:
      'Light-flooded workspaces with optimistic energy, clean whites, and fresh accent colors',
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'minimal',
    subStyle: 'startup',
    semanticTags: ['startup', 'saas', 'bright', 'optimistic', 'modern', 'workspace', 'clean'],
    colorTemperature: 'neutral',
    energyLevel: 'balanced',
    formalityLevel: 'casual',
    moodKeywords: ['fresh', 'accessible', 'innovative', 'building'],
    promptGuide: `Photograph in a light-flooded modern workspace — large windows, white or light wood surfaces, open floor plans with plants and natural elements. Shoot with a 35mm lens at f/2.8 for environmental context with gentle background softness. The overall exposure is bright and optimistic — expose for the highlights and let the shadows fill naturally from ambient bounce.

Light primarily with natural window light, supplemented with a large white bounce card or reflector to fill shadows on faces. The light should feel effortless and airy — soft, even, and flattering to both people and products. No dramatic shadows, no moody contrast.

Color palette: clean white (#FFFFFF), soft sky blue (#A7C7E7), fresh green (#7BC67E), light coral (#F8A4A4), warm wood (#D4A574). Grade bright and clean with a slight lift in the shadows (10-12%), subtle warmth in the midtones, and untouched highlights. The look is fresh and modern — think VSCO's "A6" preset but more polished.

Include real startup details: large monitors showing UI mockups (slightly out of focus), whiteboards with actual diagrams, colorful sticky notes in organized clusters, someone pointing at a laptop screen in animated discussion. People wear casual-smart clothing — clean sneakers, well-fitted tees, interesting accessories.

Composition is open and inviting, often shot slightly wider than expected to include environment. Think Notion's brand photography meets Figma's team imagery meets Y Combinator's documentary style. Optimistic, accessible, building-the-future energy.`,
    featuredOrder: 1,
    displayOrder: 12,
  },

  // ─── 13. Cinematic Noir ───
  {
    name: 'Cinematic Noir',
    description: 'Ultra-low-key dramatic lighting with near-monochrome palette and deep shadows',
    imageUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'premium',
    subStyle: 'noir',
    semanticTags: [
      'dramatic',
      'noir',
      'monochrome',
      'dark',
      'cinematic',
      'mysterious',
      'atmospheric',
    ],
    colorTemperature: 'cool',
    energyLevel: 'calm',
    formalityLevel: 'formal',
    moodKeywords: ['mysterious', 'powerful', 'atmospheric', 'magnetic'],
    promptGuide: `Shoot in near-monochrome or extremely desaturated color. Use a 50mm or 75mm lens at f/2 for intimate framing with shallow depth of field that pulls the subject from dark backgrounds. The exposure is deliberately low-key: 70-80% of the frame is in shadow. The subject is revealed by a single, hard light source — a desk lamp, a window blind casting sharp geometric shadows, a screen's glow — and everything else falls to darkness.

The key light is small and directional — a bare bulb or focused spot — creating razor-sharp shadow edges. No fill light. Let the shadows go completely black. If a secondary light exists, it's a subtle backlight creating a thin edge separation.

Color palette: pure black (#000000), stark white (#FFFFFF), one accent color at 15-20% saturation — perhaps a muted red (#8B0000) or cold blue (#2C3E50). Grade with extreme contrast, pure crushed blacks, and selective highlights. If color is present, it's barely there — like a hand-tinted black-and-white photograph.

Surfaces are hard and reflective: polished concrete, wet streets, chrome and glass, patent leather. Include film noir visual signatures: Venetian blind shadows, smoke or haze catching a light beam, reflections in dark windows, silhouettes in doorways. Faces are half-lit, half-hidden.

Grain is heavy and coarse — ISO 3200+ equivalent, adding grit and texture to the darkness. Think Roger Deakins' Blade Runner 2049 meets classic Kubrick compositions meets a Hasselblad X-Pan street photograph at midnight. Mysterious, powerful, and magnetically atmospheric.`,
    featuredOrder: 1,
    displayOrder: 13,
  },

  // ─── 14. Outdoor Adventure ───
  {
    name: 'Outdoor Adventure',
    description: 'Epic landscape scale with human subjects, natural drama, and rich outdoor color',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'organic',
    subStyle: 'adventure',
    semanticTags: ['adventure', 'lifestyle', 'outdoor', 'epic', 'landscape', 'nature', 'active'],
    colorTemperature: 'warm',
    energyLevel: 'energetic',
    formalityLevel: 'casual',
    moodKeywords: ['epic', 'free', 'authentic', 'adventurous'],
    promptGuide: `Photograph in vast, real outdoor environments — mountain ridgelines, coastal cliffs, dense forests, open desert. Shoot with a 16-24mm ultra-wide lens to emphasize the scale of the landscape against the human subject. The subject is positioned using rule of thirds — small in the frame but sharply defined, a human anchor point against nature's grandeur.

Light with the natural drama of the outdoors: golden hour front-light painting warm color on the subject, blue-hour ambient light creating cool backgrounds, midday overhead sun filtered through canopy for dappled light patterns. Include real weather elements: low-hanging clouds, mist in valleys, wind-blown hair and jackets, sun flare peeking over a ridge.

Color palette: forest green (#2D5016), earth brown (#6B4423), sky blue (#87CEEB), golden hour amber (#D4A44C), granite grey (#7B7B7B). Grade with moderate saturation — natural and real, not hyper-saturated landscape photography. Warm highlights, cool shadows, with strong separation between the two. Mimic Fujifilm Velvia 50 for landscapes or Portra 400 for human subjects.

Include the real physical details of outdoor life: scuffed hiking boots, a loaded backpack with straps showing wear, a carabiner catching light, condensation on a water bottle, trail dust on clothing. These material details ground the image in reality.

Composition emphasizes depth: foreground texture (rocks, grass, wildflowers) in soft focus, sharp subject in the mid-ground, dramatic background stretching to the horizon. Think Patagonia catalog photography meets National Geographic adventure documentation meets Apple "Shot on iPhone" outdoor winners. Epic but authentic.`,
    featuredOrder: 1,
    displayOrder: 14,
  },

  // ─── 15. Data & Dashboard ───
  {
    name: 'Data & Dashboard',
    description:
      'Screen-lit workspace with data visualizations, cool tones, and focused atmosphere',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    deliverableType: 'video_ad',
    styleAxis: 'tech',
    subStyle: 'dashboard',
    semanticTags: ['data', 'analytics', 'dashboard', 'tech', 'screen', 'workspace', 'digital'],
    colorTemperature: 'cool',
    energyLevel: 'balanced',
    formalityLevel: 'formal',
    moodKeywords: ['focused', 'precise', 'technical', 'mission-critical'],
    promptGuide: `Photograph a real screen or workspace environment displaying data visualizations. Shoot the scene, not the screen — include the physical context: the monitor's bezel, the desk surface, perhaps hands on a keyboard, a coffee cup reflecting screen light, ambient room lighting. Use a 50mm lens at f/2.8, focused on the screen content but including environmental blur.

The screen content shows clean, well-designed dashboard UI: charts, graphs, metrics, and data tables with a modern design language. Light the scene with the screen itself as the primary key light on the face/hands, supplemented by soft ambient room lighting. The screen glow should cast visible blue-white light on nearby surfaces — desk, keyboard, the operator's face.

Color palette: dark UI background (#1A1A2E), bright data colors — cyan (#00D4FF), green (#00FF88), amber (#FFB800), coral (#FF6B6B) — seen both on-screen and reflected in physical surfaces. Grade the overall scene cool and modern, with the screen as the warmest/brightest element. Room lighting is dim but visible.

Include real-world data work details: multiple browser tabs, a secondary monitor partially visible, hand-written notes on paper beside the keyboard, a stylus or pen on a tablet. The scene should feel like 2 AM during a product launch — focused, intense, the data glowing in a dim room.

Grain is minimal and fine — this is a modern digital camera look. Think Bloomberg terminal aesthetic meets a startup's mission-control moment meets Stripe's developer documentation photography. Technical, precise, and grounded in real workspace reality.`,
    featuredOrder: 1,
    displayOrder: 15,
  },

  // ─── 16. Heritage & Craft ───
  {
    name: 'Heritage & Craft',
    description:
      'Artisan workshop aesthetic with skilled hands, natural materials, and warm window light',
    imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'organic',
    subStyle: 'heritage',
    semanticTags: [
      'heritage',
      'craft',
      'artisan',
      'handmade',
      'traditional',
      'workshop',
      'brand-story',
    ],
    colorTemperature: 'warm',
    energyLevel: 'calm',
    formalityLevel: 'balanced',
    moodKeywords: ['patient', 'masterful', 'dignified', 'timeless'],
    promptGuide: `Photograph skilled hands at work — shaping, cutting, assembling, polishing. Shoot with a 50mm or 85mm macro-capable lens at f/2.8, focused tightly on the point of action: where tool meets material, where fingers shape a surface, where craft happens. The shallow depth of field melts the background into a warm, tonal wash while the work surface stays razor-sharp.

Light with a single window — north-facing for even, cool daylight, or south-facing for warmer, more directional light with defined shadows. The light should enter from the side, raking across surfaces to reveal every texture: wood grain, hammer marks on metal, flour on a marble counter, thread tension in fabric. Include visible dust particles floating in the light beam.

Color palette: aged wood (#8B6914), patina copper (#7B7554), worn leather (#8B4513), raw linen (#C8B88A), workshop grey (#6B6B6B). Grade warm with slightly desaturated colors — the palette of aged materials and time-worn surfaces. Lifted blacks (10%) to mimic the matte quality of a darkroom print. Skin tones are warm, showing the tan lines and calluses of working hands.

The workspace is authentically lived-in: organized chaos of a real workshop. Tools hanging on pegboard walls, wood shavings on the floor, a worn apron, measuring instruments with patina. Nothing is cleaned up for the camera.

Grain is moderate and warm, mimicking medium-format Portra film. Think a Patek Philippe "Handcraft" campaign meets Hermès artisan documentation meets a Monocle magazine feature on traditional trades. Every image communicates patience, mastery, and the quiet dignity of making things by hand.`,
    featuredOrder: 1,
    displayOrder: 16,
  },

  // ─── 17. Event & Launch Moment ───
  {
    name: 'Event & Launch Moment',
    description:
      'Decisive live moments with mixed event lighting, telephoto compression, and raw energy',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'bold',
    subStyle: 'event',
    semanticTags: ['event', 'launch', 'reveal', 'live', 'moment', 'stage', 'crowd'],
    colorTemperature: 'warm',
    energyLevel: 'energetic',
    formalityLevel: 'balanced',
    moodKeywords: ['electric', 'irreplicable', 'human', 'decisive'],
    promptGuide: `Capture the decisive moment: the curtain drop, the first reaction, the standing ovation, the handshake after the deal. Shoot with a 70-200mm f/2.8 zoom to isolate subjects from crowded environments with compressed perspective and beautiful bokeh. Alternate with a 24mm f/1.4 for wide establishing shots that capture the scale of the event.

Light with the event's own lighting: stage spots, LED walls casting colored wash, overhead house lights, phone screens in the audience glowing like scattered stars. The mixed-lighting environment is a feature, not a problem — it creates complex color temperature shifts that feel authentic and energetic.

Color palette: driven by the event's actual lighting — warm stage ambers (#FFB347), cool LED blues (#4169E1), magenta accent spots (#C71585), warm skin under mixed light. Grade to preserve the multi-temperature look: warm faces, cool shadows, colored spill from stage lights on nearby surfaces. Don't correct the mixed lighting — embrace it.

Include the real texture of live events: slightly sweaty foreheads under stage lights, creased programs held in hands, lanyards and badges, the blur of someone crossing frame. Audience shots show genuine emotion: wide eyes, open mouths, leaning-forward engagement. Stage shots capture gesture and movement.

Noise and grain are expected and welcome — ISO 3200-6400 shooting conditions produce natural digital noise that says "this was real, this was live." A slight motion blur on moving hands or a turning head is authentic. Think TED Talk photography meets Apple keynote documentation meets the decisive moments of a live product reveal. Electric, irreplicable, human.`,
    featuredOrder: 1,
    displayOrder: 17,
  },

  // ─── 18. Monochrome Editorial ───
  {
    name: 'Monochrome Editorial',
    description:
      'Pure black-and-white with silver-gelatin print aesthetic, bold composition, and visible grain',
    imageUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&q=80',
    deliverableType: 'launch_video',
    styleAxis: 'editorial',
    subStyle: 'monochrome',
    semanticTags: [
      'monochrome',
      'bw',
      'timeless',
      'editorial',
      'graphic',
      'classic',
      'silver-gelatin',
    ],
    colorTemperature: 'neutral',
    energyLevel: 'balanced',
    formalityLevel: 'formal',
    moodKeywords: ['authoritative', 'timeless', 'bold', 'unforgettable'],
    promptGuide: `Shoot in full black and white — or shoot in color and convert with intent, mapping specific colors to specific tonal values. Use a 50mm lens at f/2 for classic perspective with shallow depth of field. Without color, every compositional element must work harder: light, shadow, texture, line, shape, and contrast carry the entire image.

Light with hard, directional side light from a single source — a window, a bare bulb, a focused spot. The light-to-shadow transition should be sharp and defined, creating graphic, almost sculptural shapes on faces and objects. No fill light. Let shadows go deep. The tonal range should stretch from paper-white to ink-black with rich detail in the midtones.

Tonal palette: ink black (#0D0D0D), bright silver midtones (#A0A0A0), paper white (#F5F5F5). Grade with a true silver-gelatin print aesthetic: slightly warm in the highlights (a hint of cream), neutral midtones, slightly cool in the deep shadows. Contrast is high but controlled — no clipped highlights or blocked shadows.

Surfaces and textures become primary visual elements: concrete grain, fabric weave, skin pores, metal brushing, glass reflections, the rough edge of torn paper. Without color to distinguish elements, textural contrast is everything.

Grain should be prominent and beautiful — mimicking Ilford HP5+ or Tri-X 400 pushed to 800. The grain is part of the image's character, not a flaw. Composition is bold and graphic: strong lines, dramatic negative space, subjects placed at compositional extremes.

Think Richard Avedon's portrait work meets Peter Lindbergh's editorial style meets Sebastião Salgado's documentary gravity. Timeless, authoritative, and impossible to dismiss as trendy.`,
    featuredOrder: 1,
    displayOrder: 18,
  },
]

async function seedVisualPresets() {
  const { db } = await import('./index')
  const { deliverableStyleReferences } = await import('./schema')
  const { eq, and } = await import('drizzle-orm')

  console.log('Seeding visual style presets (UPSERT mode)...\n')

  const existing = await db.select().from(deliverableStyleReferences)
  console.log(`Found ${existing.length} existing deliverable styles`)

  // Build lookup: name (lowercase) + deliverableType → existing record
  const existingLookup = new Map<string, (typeof existing)[number]>()
  for (const record of existing) {
    const key = `${record.name.toLowerCase()}::${record.deliverableType}`
    existingLookup.set(key, record)
  }

  let updatedCount = 0
  let insertedCount = 0
  const skippedCount = 0

  for (const preset of visualPresets) {
    const key = `${preset.name.toLowerCase()}::${preset.deliverableType}`
    const existingRecord = existingLookup.get(key)

    if (existingRecord) {
      // UPDATE existing — overwrite promptGuide and metadata
      await db
        .update(deliverableStyleReferences)
        .set({
          description: preset.description,
          promptGuide: preset.promptGuide,
          semanticTags: preset.semanticTags,
          colorTemperature: preset.colorTemperature,
          energyLevel: preset.energyLevel,
          formalityLevel: preset.formalityLevel,
          moodKeywords: preset.moodKeywords,
          featuredOrder: preset.featuredOrder,
          displayOrder: preset.displayOrder,
          ...(preset.subStyle !== undefined ? { subStyle: preset.subStyle ?? null } : {}),
        })
        .where(eq(deliverableStyleReferences.id, existingRecord.id))

      console.log(`  Updated: ${preset.name} (${preset.deliverableType}/${preset.styleAxis})`)
      updatedCount++
    } else {
      // INSERT new
      await db.insert(deliverableStyleReferences).values({
        name: preset.name,
        description: preset.description,
        imageUrl: preset.imageUrl,
        deliverableType: preset.deliverableType,
        styleAxis: preset.styleAxis,
        subStyle: ((preset as Record<string, unknown>).subStyle as string | undefined) ?? null,
        semanticTags: preset.semanticTags,
        colorTemperature: preset.colorTemperature,
        energyLevel: preset.energyLevel,
        formalityLevel: preset.formalityLevel,
        moodKeywords: preset.moodKeywords,
        promptGuide: preset.promptGuide,
        featuredOrder: preset.featuredOrder,
        displayOrder: preset.displayOrder,
        isActive: true,
      })

      console.log(`  Inserted: ${preset.name} (${preset.deliverableType}/${preset.styleAxis})`)
      insertedCount++
    }
  }

  console.log(`\n✓ Updated ${updatedCount} existing presets`)
  console.log(`✓ Inserted ${insertedCount} new presets`)
  if (skippedCount > 0) console.log(`○ Skipped ${skippedCount} presets`)

  const total = await db.select().from(deliverableStyleReferences)
  console.log(`\nTotal styles in database: ${total.length}`)
  process.exit(0)
}

seedVisualPresets().catch((error) => {
  console.error('Error seeding visual presets:', error)
  process.exit(1)
})
