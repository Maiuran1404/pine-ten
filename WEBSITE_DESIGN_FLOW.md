# Website Design Flow — Full Implementation Plan

> This document contains everything a Claude Code instance needs to implement the website design flow from scratch. Read this entire document before starting any implementation.

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1: Inspiration Discovery](#3-phase-1-inspiration-discovery)
4. [Phase 2: Skeleton Builder](#4-phase-2-skeleton-builder)
5. [Phase 3: Approval & Timeline](#5-phase-3-approval--timeline)
6. [Phase 4: Framer Delivery](#6-phase-4-framer-delivery)
7. [Database Schema Changes](#7-database-schema-changes)
8. [API Routes](#8-api-routes)
9. [Hooks](#9-hooks)
10. [Components](#10-components)
11. [AI Prompts & State Machine](#11-ai-prompts--state-machine)
12. [Implementation Order](#12-implementation-order)
13. [Existing Code Reference](#13-existing-code-reference)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Product Vision

Replace the text-heavy chat briefing for website projects with a **visual-first, interactive design flow**. The user experience:

1. **Inspiration Discovery** — User pastes URLs or browses a curated gallery of website designs. System shows visually similar websites. User picks 2 favorites out of 5 suggestions and adds notes (e.g., "I liked these, but it's important that 'lawyers' comes across clearly").

2. **Skeleton Builder** — Crafted generates a section-by-section website skeleton on the right panel. AI provides proactive recommendations ("We think it's important to..."). User gives feedback, skeleton updates in real-time. Fidelity progresses from low-fi wireframes to mid-fi with placeholder content to high-fi with colors/typography as the user provides more input.

3. **Approval & Timeline** — User approves the skeleton. Shown a delivery timeline:
   - Day X: First edition (Framer preview link) with dummy content
   - 48 hours for feedback
   - Updated timeline based on feedback volume
   - If no feedback: text editing view + asset upload (48 hours)
   - Final version for approval
   - Transfer ownership of Framer project
   - Payment and production launch

### Key Principles

- This is a **separate flow** from the existing chat briefing (Option 1 — new flow, not adapting existing)
- Website-only for v1
- Visual output is always visible — user never leaves the experience
- Right panel evolves contextually through each phase
- The existing chat briefing flow remains untouched for other verticals (video, social, logo, branding)

---

## 2. Architecture Overview

### Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    WEBSITE DESIGN FLOW                        │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │     LEFT PANEL       │  │        RIGHT PANEL            │  │
│  │  (Interaction)       │  │  (Visual Output — evolves)    │  │
│  │                      │  │                                │  │
│  │  Phase 1:            │  │  Phase 1:                      │  │
│  │  - URL input         │  │  - Gallery grid of screenshots │  │
│  │  - "Show me" button  │  │  - Side-by-side comparison     │  │
│  │  - Notes textarea    │  │                                │  │
│  │                      │  │  Phase 2:                      │  │
│  │  Phase 2:            │  │  - Low-fi wireframe sections   │  │
│  │  - AI chat           │  │  - Mid-fi with content         │  │
│  │  - Quick options     │  │  - High-fi with styles         │  │
│  │  - Feedback input    │  │                                │  │
│  │                      │  │  Phase 3:                      │  │
│  │  Phase 3:            │  │  - Final skeleton preview      │  │
│  │  - Timeline display  │  │  - Section-by-section scroll   │  │
│  │  - Approve button    │  │                                │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Route

```
/dashboard/website-project          — New page for website design flow
/dashboard/website-project?draft=X  — Resume draft
```

### File Structure (new files)

```
src/
  app/(client)/dashboard/website-project/
    page.tsx                              # Entry page
  components/website-flow/
    website-flow.tsx                      # Main orchestrator component
    website-flow-layout.tsx               # Split-panel layout
    phases/
      inspiration-phase.tsx               # Phase 1: Discovery
      skeleton-phase.tsx                  # Phase 2: Builder
      approval-phase.tsx                  # Phase 3: Timeline
    inspiration/
      url-input.tsx                       # URL paste input with preview
      inspiration-gallery.tsx             # Curated gallery browser
      website-card.tsx                    # Single website preview card
      similar-websites.tsx                # "Similar to your picks" grid
      comparison-view.tsx                 # Side-by-side of selected sites
      industry-filter.tsx                 # Filter chips (Law, SaaS, etc.)
    skeleton/
      skeleton-renderer.tsx               # Main skeleton display (right panel)
      section-block.tsx                   # Individual section wireframe
      section-toolbar.tsx                 # Edit/reorder/delete per section
      fidelity-indicator.tsx              # Shows current fidelity level
      progressive-section.tsx             # Section that upgrades fidelity
      skeleton-chat.tsx                   # AI chat within skeleton phase
      ai-recommendation-card.tsx          # "We think..." card
    approval/
      timeline-view.tsx                   # Milestone timeline display
      milestone-card.tsx                  # Individual milestone
      approve-button.tsx                  # Final approve CTA
    shared/
      website-progress-bar.tsx            # Phase progress indicator
      notes-input.tsx                     # Rich notes textarea
      screenshot-frame.tsx               # Browser chrome frame for screenshots
  hooks/
    use-website-flow.ts                   # Facade hook (like useChatInterfaceData)
    use-website-inspirations.ts           # Inspiration state + API calls
    use-website-skeleton.ts              # Skeleton state + AI generation
    use-website-approval.ts              # Timeline + approval state
    use-website-draft.ts                  # Draft persistence
    use-screenshot-api.ts                 # Screenshot service integration
    use-visual-similarity.ts             # Similar website finding
  lib/
    ai/
      website-flow-prompts.ts             # AI system prompts for website flow
      website-state-machine.ts            # Website-specific state machine
    website/
      screenshot-service.ts               # Screenshot API wrapper
      similarity-engine.ts                # Visual similarity logic
      skeleton-generator.ts               # Section generation logic
      fidelity-levels.ts                  # Low/mid/high-fi definitions
      section-templates.ts                # Default section types & content
      framer-integration.ts               # Framer Server API client
      timeline-calculator.ts              # Deadline/milestone calculator
```

---

## 3. Phase 1: Inspiration Discovery

### User Experience

#### Step 1a: Input inspirations

User sees two options:

- **Paste URLs** — Input field accepting website URLs. On paste, system fetches a screenshot and displays it in the right panel as a clean browser-framed preview
- **"I don't have any" / "Show me inspirations"** — Opens the curated gallery

#### Step 1b: Browse curated gallery (if no URLs)

- Grid of website screenshots organized by industry/style
- Filter chips: Law Firm, SaaS, Agency, E-commerce, Portfolio, Restaurant, Healthcare, Finance, Real Estate, Education
- Style chips: Minimal, Bold, Corporate, Playful, Premium, Dark, Light, Editorial
- Each card shows: screenshot, site name, industry tag, style tags
- Click to expand/preview

#### Step 2: Similar websites

After user selects 1-2 inspirations (either pasted or from gallery):

- System shows 5 visually similar websites
- User picks their 2 favorites
- Selection creates a side-by-side comparison on the right panel

#### Step 3: Notes

- Text area: "Anything else we should know about your website?"
- Placeholder: "e.g., I liked these designs but it's important that our legal expertise comes across clearly"
- Notes are passed to the AI for skeleton generation

### Screenshot Service

Use **ScreenshotOne API** (https://screenshotone.com) — reliable, fast, good free tier.

```typescript
// src/lib/website/screenshot-service.ts

interface ScreenshotOptions {
  url: string
  viewport_width?: number // default: 1280
  viewport_height?: number // default: 800
  full_page?: boolean // default: false (above-fold only)
  format?: 'png' | 'webp' // default: 'webp'
  quality?: number // default: 80
}

interface ScreenshotResult {
  imageUrl: string // Stored in Supabase after capture
  thumbnailUrl: string // 400px wide version
  capturedAt: Date
  error?: string
}

// Flow:
// 1. User pastes URL
// 2. POST /api/website-flow/screenshot with URL
// 3. Server calls ScreenshotOne API
// 4. Upload result to Supabase storage: website-inspirations/{userId}/{hash}.webp
// 5. Return imageUrl to client
```

**Alternative**: If ScreenshotOne costs are a concern, use **Playwright** on a serverless function to capture screenshots. Slower but free.

**Environment variable** (add to `src/lib/env.ts`):

```
SCREENSHOT_API_KEY=...
SCREENSHOT_API_URL=https://api.screenshotone.com/take
```

### Visual Similarity Engine

#### Phase 1 approach (ship fast): Tag-based similarity

```typescript
// src/lib/website/similarity-engine.ts

interface WebsiteInspiration {
  id: string
  url: string
  screenshotUrl: string
  thumbnailUrl: string
  name: string
  industry: string[] // ['law', 'professional-services']
  styleTags: string[] // ['minimal', 'dark', 'corporate']
  colorTemperature: 'warm' | 'cool' | 'neutral'
  layoutStyle: 'hero-centric' | 'grid' | 'editorial' | 'single-page' | 'multi-section'
  hasAnimation: boolean
  typography: 'serif' | 'sans-serif' | 'mixed'
}

function findSimilar(
  selected: WebsiteInspiration[],
  pool: WebsiteInspiration[],
  limit: number = 5
): WebsiteInspiration[] {
  // Score each candidate by:
  // - Industry overlap (weight: 0.3)
  // - Style tag overlap (weight: 0.3)
  // - Color temperature match (weight: 0.15)
  // - Layout style match (weight: 0.15)
  // - Typography match (weight: 0.1)
  // Return top N by score, excluding already-selected
}
```

#### Phase 2 approach (future): CLIP embeddings

- Screenshot each website → generate CLIP embedding vector
- Store vectors in Supabase pgvector column
- Find nearest neighbors by cosine similarity
- This gives true visual similarity regardless of tags

### Curated Library Seeding

Start with ~100 hand-picked websites. Store in `websiteInspirations` table (see Schema section). Seed script populates:

**Industry Categories** (10):

- Law / Legal
- SaaS / Technology
- Creative Agency
- E-commerce / Retail
- Portfolio / Personal
- Restaurant / Food
- Healthcare / Medical
- Finance / Banking
- Real Estate
- Education

**Style Axes** (8):

- Minimal, Bold, Corporate, Playful, Premium, Dark, Light, Editorial

Each entry: URL, screenshot (via API), name, industry[], styleTags[], metadata.

> IMPORTANT: Do NOT run the seed script without explicit user permission. Create the seed script but only execute when asked.

---

## 4. Phase 2: Skeleton Builder

### User Experience

After inspiration selection + notes, the flow transitions to the Skeleton Builder:

1. **AI generates initial skeleton** based on:
   - Selected inspiration websites (style, layout, sections)
   - User notes
   - Industry context (inferred from inspirations or stated)

2. **Right panel shows skeleton** — starts as low-fi wireframe (labeled section blocks)

3. **AI proactive recommendation** — Left panel shows: "We think it's important for your website to have X. What do you think?" with quick option chips

4. **User feedback loop** — User responds, skeleton updates. Each round of feedback can:
   - Add/remove sections
   - Reorder sections
   - Modify section content
   - Increase fidelity of specific sections

5. **Progressive fidelity** — As more information is provided:
   - **Low-fi** (initial): Labeled boxes with section type icons. Gray placeholders.
   - **Mid-fi** (after 2-3 rounds): Layout with placeholder text, image placeholders with aspect ratios, navigation structure visible
   - **High-fi** (final rounds): Colors from brand/inspirations applied, typography selections, actual placeholder copy that reflects the business, CTA text

### Fidelity Levels

```typescript
// src/lib/website/fidelity-levels.ts

type FidelityLevel = 'low' | 'mid' | 'high'

interface SectionAtFidelity {
  // Low-fi
  type: string // 'hero' | 'features' | 'testimonials' | etc.
  label: string // 'Hero Section'

  // Mid-fi (added when fidelity >= 'mid')
  headline?: string // 'Trusted Legal Expertise'
  subheadline?: string // 'Over 20 years protecting...'
  ctaText?: string // 'Book a Consultation'
  contentBlocks?: ContentBlock[] // Feature items, testimonial cards, etc.
  imageLayout?: 'full-width' | 'side-by-side' | 'grid' | 'background'

  // High-fi (added when fidelity >= 'high')
  colorScheme?: {
    background: string // hex
    text: string // hex
    accent: string // hex
  }
  typography?: {
    headingFont: string
    bodyFont: string
    headingSize: string // 'xl' | '2xl' | '3xl' | '4xl'
  }
  spacing?: 'compact' | 'comfortable' | 'spacious'
}

interface ContentBlock {
  type: 'text' | 'image' | 'icon-text' | 'card' | 'stat' | 'quote'
  content: string
  subContent?: string
  iconHint?: string // 'shield' | 'clock' | 'users' — for Lucide icon selection
}

// Determine fidelity from interaction count + data completeness
function calculateFidelity(state: WebsiteFlowState): FidelityLevel {
  const { feedbackRounds, hasColors, hasTypography, hasCopy } = state
  if (hasColors && hasTypography && hasCopy) return 'high'
  if (feedbackRounds >= 2 || hasCopy) return 'mid'
  return 'low'
}
```

### Section Templates

```typescript
// src/lib/website/section-templates.ts

// Default section types a website can have
const SECTION_TYPES = [
  'navigation', // Header/nav bar
  'hero', // Main hero section
  'features', // Feature grid/list
  'about', // About us
  'services', // Service offerings
  'testimonials', // Social proof
  'team', // Team members
  'portfolio', // Work/case studies
  'pricing', // Pricing tiers
  'faq', // FAQ accordion
  'blog', // Blog preview
  'contact', // Contact form
  'cta', // Call-to-action banner
  'stats', // Number stats
  'partners', // Logo carousel
  'footer', // Page footer
] as const

// Industry-specific defaults
const INDUSTRY_DEFAULTS: Record<string, string[]> = {
  law: [
    'navigation',
    'hero',
    'services',
    'about',
    'team',
    'testimonials',
    'cta',
    'contact',
    'footer',
  ],
  saas: ['navigation', 'hero', 'features', 'pricing', 'testimonials', 'faq', 'cta', 'footer'],
  agency: [
    'navigation',
    'hero',
    'portfolio',
    'services',
    'about',
    'team',
    'testimonials',
    'contact',
    'footer',
  ],
  ecommerce: ['navigation', 'hero', 'features', 'stats', 'testimonials', 'faq', 'cta', 'footer'],
  portfolio: ['navigation', 'hero', 'portfolio', 'about', 'testimonials', 'contact', 'footer'],
  restaurant: [
    'navigation',
    'hero',
    'about',
    'features',
    'gallery',
    'testimonials',
    'contact',
    'footer',
  ],
  healthcare: [
    'navigation',
    'hero',
    'services',
    'about',
    'team',
    'testimonials',
    'faq',
    'contact',
    'footer',
  ],
  finance: [
    'navigation',
    'hero',
    'services',
    'stats',
    'testimonials',
    'about',
    'faq',
    'cta',
    'footer',
  ],
  realestate: [
    'navigation',
    'hero',
    'features',
    'portfolio',
    'testimonials',
    'stats',
    'contact',
    'footer',
  ],
  education: [
    'navigation',
    'hero',
    'features',
    'about',
    'testimonials',
    'pricing',
    'faq',
    'cta',
    'footer',
  ],
}
```

### Skeleton Rendering

Reuse and extend the existing wireframe primitives in `src/components/chat/wireframe/`. The existing `LayoutPreview` component in `src/components/chat/structure-panel.tsx` already has:

- Section type detection (hero, features, testimonials, CTA, footer, pricing, gallery, FAQ)
- Wireframe shapes (ImagePlaceholder, TextLines, NavBar, ButtonShape, etc.)
- Drag-to-reorder
- Edit notes per section

**Extend, don't rewrite.** The new skeleton renderer should:

1. Import wireframe primitives from `src/components/chat/wireframe/`
2. Add fidelity-aware rendering (low/mid/high variants per section type)
3. Add color/typography application for high-fi mode
4. Add smooth transitions between fidelity levels (framer-motion)

### AI Chat in Skeleton Phase

The left panel during Phase 2 has a lightweight chat interface (not the full briefing chat). It:

- Shows AI messages with recommendations
- Has quick option chips for common responses
- Accepts free-text feedback
- Each message round can trigger skeleton updates

```typescript
// Message types for skeleton chat
interface SkeletonMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  quickOptions?: QuickOption[]
  skeletonUpdate?: SkeletonDelta // Changes to apply to skeleton
  recommendation?: {
    title: string // "We think it's important to..."
    reasoning: string
    action: 'add_section' | 'modify_section' | 'change_style' | 'reorder'
    sectionType?: string
  }
}

interface SkeletonDelta {
  addSections?: SectionAtFidelity[]
  removeSections?: string[] // section IDs
  updateSections?: Partial<SectionAtFidelity>[]
  reorderSections?: string[] // ordered section IDs
  updateFidelity?: FidelityLevel
  updateColors?: { background: string; text: string; accent: string }
  updateTypography?: { headingFont: string; bodyFont: string }
}
```

---

## 5. Phase 3: Approval & Timeline

### User Experience

After the user is satisfied with the skeleton:

1. **Review summary** — Left panel shows:
   - Number of sections
   - Key design decisions (color, typography, layout)
   - Estimated project scope

2. **Timeline** — Milestone cards showing:

   ```
   Day 1 (Today)     ── You approved the design direction
   Day 5              ── First edition delivered (Framer preview link)
                         with dummy content
   Day 5-7 (48hrs)   ── Your feedback window
   Day 7-9            ── Based on feedback, updated timeline provided
                         OR if no feedback:
                         Text editing view + asset upload (48hrs)
   Day 12             ── Final version for your approval
   Day 14             ── Framer project ownership transferred
   Day 14             ── Payment processed, site goes to production
   ```

3. **Approve button** — Creates the task, deducts credits, starts the project

### Timeline Calculation

```typescript
// src/lib/website/timeline-calculator.ts

interface WebsiteTimeline {
  milestones: Milestone[]
  totalDays: number
  estimatedDelivery: Date
}

interface Milestone {
  id: string
  title: string
  description: string
  dayOffset: number // Days from approval
  date: Date
  status: 'upcoming' | 'active' | 'completed'
  isClientAction: boolean // True if client needs to do something
  durationHours?: number // Duration of this phase
}

function calculateTimeline(approvalDate: Date, sectionCount: number): WebsiteTimeline {
  // Base: 14-day delivery
  // Adjust for:
  // - Section count (>10 sections adds 2 days)
  // - Complexity (high-fi skeleton suggests more design work)
  // Simple calculation:
  const baseDays = sectionCount > 10 ? 16 : 14

  return {
    milestones: [
      { title: 'Design Direction Approved', dayOffset: 0, isClientAction: false },
      {
        title: 'First Edition Delivered',
        dayOffset: 5,
        isClientAction: false,
        description: 'Framer preview link with dummy content',
      },
      {
        title: 'Feedback Window',
        dayOffset: 5,
        isClientAction: true,
        durationHours: 48,
        description: 'Review and provide feedback',
      },
      {
        title: 'Revised Timeline or Text Editing',
        dayOffset: 7,
        isClientAction: true,
        description: 'Based on feedback volume',
      },
      { title: 'Final Version for Approval', dayOffset: baseDays - 2, isClientAction: true },
      { title: 'Ownership Transfer & Launch', dayOffset: baseDays, isClientAction: false },
    ],
    totalDays: baseDays,
    estimatedDelivery: addDays(approvalDate, baseDays),
  }
}
```

---

## 6. Phase 4: Framer Delivery

### Framer Server API Integration

The Framer Server API (open beta, Dec 2025) uses WebSocket connections to manipulate existing Framer projects. NPM package: `framer-api`.

**Key capabilities:**

- Connect to existing projects via project URL + API key
- Create frame nodes, insert components, set styles
- Manage CMS collections (add/update/delete items)
- Create and apply color + text styles
- Insert images, SVGs, files
- Publish preview deployments
- Deploy to production

**Key limitations:**

- Cannot create new projects via API — must pre-create template projects
- Cannot transfer ownership via API — manual step
- Project-scoped API keys only
- WebSocket connection (not REST)
- Beta status — breaking changes possible

### Integration Architecture

```typescript
// src/lib/website/framer-integration.ts

import { connect } from 'framer-api'

interface FramerDeliveryConfig {
  templateProjectUrl: string // Pre-created Framer template project URL
  apiKey: string // Project-scoped API key
}

// Environment variables (add to src/lib/env.ts):
// FRAMER_API_KEY — Default API key
// FRAMER_TEMPLATE_PROJECT_URL — Base template project URL

class FramerDelivery {
  private connection: Awaited<ReturnType<typeof connect>> | null = null

  async connect(config: FramerDeliveryConfig) {
    this.connection = await connect(config.templateProjectUrl, config.apiKey)
    return this
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.disconnect()
    }
  }

  // Push skeleton sections to Framer project
  async pushSkeleton(sections: SectionAtFidelity[]) {
    if (!this.connection) throw new Error('Not connected')

    for (const section of sections) {
      // Create frame nodes for each section
      // Set styles based on fidelity data
      // Insert placeholder content
    }
  }

  // Apply brand colors and typography
  async applyStyles(colors: ColorScheme, typography: TypographyConfig) {
    // Create color styles
    // Create text styles
    // Apply fonts
  }

  // Publish preview
  async publishPreview(): Promise<string> {
    if (!this.connection) throw new Error('Not connected')
    const result = await this.connection.publish()
    return result.deployment.id // Preview URL
  }

  // Deploy to production
  async deployToProduction() {
    if (!this.connection) throw new Error('Not connected')
    await this.connection.deploy()
  }
}
```

### Workflow

1. **Admin pre-creates** template Framer projects (one per industry/style)
2. **Admin generates** API key for each template project
3. **On task creation**: System selects best-matching template
4. **Freelancer** duplicates template in Framer (manual step)
5. **System connects** to the duplicated project via API
6. **System pushes** skeleton sections, styles, content from the approved skeleton
7. **Freelancer refines** the design in Framer editor
8. **System publishes** preview link for client review
9. **Client feedback** → freelancer updates → system re-publishes
10. **Final approval** → system deploys to production
11. **Admin transfers** Framer project ownership (manual)

> NOTE: Framer integration is Phase 4 and should be implemented last. The core product value is in Phases 1-3 (inspiration + skeleton builder + approval). Framer delivery is an enhancement.

---

## 7. Database Schema Changes

Add to `src/db/schema.ts`:

### New Tables

```typescript
// ============================================
// WEBSITE INSPIRATION LIBRARY
// ============================================

export const websiteInspirations = pgTable(
  'website_inspirations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    url: text('url').notNull(),
    name: text('name').notNull(), // 'Dentons Law Firm'
    screenshotUrl: text('screenshot_url').notNull(), // Full screenshot
    thumbnailUrl: text('thumbnail_url').notNull(), // 400px thumb

    // Classification
    industry: text('industry')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`), // ['law', 'professional-services']
    styleTags: text('style_tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`), // ['minimal', 'dark', 'corporate']
    colorTemperature: text('color_temperature', { enum: ['warm', 'cool', 'neutral'] }).default(
      'neutral'
    ),
    layoutStyle: text('layout_style', {
      enum: ['hero-centric', 'grid', 'editorial', 'single-page', 'multi-section'],
    }).default('multi-section'),
    hasAnimation: boolean('has_animation').default(false),
    typography: text('typography_style', { enum: ['serif', 'sans-serif', 'mixed'] }).default(
      'sans-serif'
    ),

    // Visual similarity (Phase 2: CLIP embeddings)
    // embeddingVector: vector('embedding_vector', { dimensions: 512 }),

    // Metadata
    colorSamples: text('color_samples')
      .array()
      .default(sql`'{}'::text[]`), // Extracted hex colors
    sectionTypes: text('section_types')
      .array()
      .default(sql`'{}'::text[]`), // ['hero', 'features', 'testimonials']
    description: text('description'), // Brief description of the site

    // Admin
    isActive: boolean('is_active').default(true),
    isFeatured: boolean('is_featured').default(false),
    displayOrder: integer('display_order').default(0),
    usageCount: integer('usage_count').default(0),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_website_inspirations_industry').on(table.industry),
    index('idx_website_inspirations_style').on(table.styleTags),
    index('idx_website_inspirations_active').on(table.isActive),
  ]
)

// ============================================
// WEBSITE PROJECTS (tracks the design flow)
// ============================================

export const websiteProjects = pgTable(
  'website_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    companyId: uuid('company_id').references(() => companies.id),
    taskId: uuid('task_id').references(() => tasks.id), // Created on approval

    // Current phase
    phase: text('phase', { enum: ['inspiration', 'skeleton', 'approval', 'delivery'] })
      .notNull()
      .default('inspiration'),

    // Phase 1: Inspiration data
    inspirationUrls: text('inspiration_urls')
      .array()
      .default(sql`'{}'::text[]`), // User-pasted URLs
    selectedInspirationIds: text('selected_inspiration_ids')
      .array()
      .default(sql`'{}'::text[]`), // From curated library
    similarWebsiteIds: text('similar_website_ids')
      .array()
      .default(sql`'{}'::text[]`), // System-suggested similar
    chosenInspirationIds: text('chosen_inspiration_ids')
      .array()
      .default(sql`'{}'::text[]`), // User's final 2 picks
    inspirationNotes: text('inspiration_notes'), // User's free-text notes

    // User-pasted URL screenshots (stored as JSONB array)
    userScreenshots: jsonb('user_screenshots')
      .$type<
        Array<{
          url: string
          screenshotUrl: string
          thumbnailUrl: string
          capturedAt: string
        }>
      >()
      .default([]),

    // Phase 2: Skeleton data
    skeleton: jsonb('skeleton').$type<{
      sections: Array<{
        id: string
        type: string
        label: string
        order: number
        headline?: string
        subheadline?: string
        ctaText?: string
        contentBlocks?: Array<{
          type: string
          content: string
          subContent?: string
          iconHint?: string
        }>
        imageLayout?: string
        colorScheme?: { background: string; text: string; accent: string }
        typography?: { headingFont: string; bodyFont: string; headingSize: string }
        spacing?: string
      }>
      fidelity: 'low' | 'mid' | 'high'
      globalColors?: { background: string; text: string; accent: string; secondary?: string }
      globalTypography?: { headingFont: string; bodyFont: string }
      industry?: string
    }>(),

    skeletonChatHistory: jsonb('skeleton_chat_history')
      .$type<
        Array<{
          id: string
          role: 'assistant' | 'user'
          content: string
          timestamp: string
          skeletonUpdate?: Record<string, unknown>
        }>
      >()
      .default([]),

    feedbackRounds: integer('feedback_rounds').default(0),

    // Phase 3: Approval data
    approvedAt: timestamp('approved_at'),
    timeline: jsonb('timeline').$type<{
      milestones: Array<{
        id: string
        title: string
        description: string
        dayOffset: number
        date: string
        status: string
        isClientAction: boolean
        durationHours?: number
      }>
      totalDays: number
      estimatedDelivery: string
    }>(),

    // Phase 4: Delivery data
    framerProjectUrl: text('framer_project_url'),
    framerPreviewUrl: text('framer_preview_url'),
    framerDeployedUrl: text('framer_deployed_url'),

    // Credits
    creditsRequired: integer('credits_required'),
    creditsUsed: integer('credits_used'),

    // Status
    status: text('status', {
      enum: ['draft', 'in_progress', 'approved', 'in_delivery', 'review', 'completed', 'cancelled'],
    })
      .notNull()
      .default('draft'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_website_projects_user').on(table.userId),
    index('idx_website_projects_status').on(table.status),
    index('idx_website_projects_phase').on(table.phase),
  ]
)
```

### Migration

After adding to schema.ts:

1. Run `npm run db:generate`
2. Review the generated migration (check for DROP statements — there should be none)
3. Run `npm run db:migrate`
4. Run `npm run typecheck`

---

## 8. API Routes

### New Routes

```
POST   /api/website-flow/screenshot        # Capture URL screenshot
GET    /api/website-flow/inspirations       # Browse curated gallery
POST   /api/website-flow/similar            # Find similar websites
POST   /api/website-flow/skeleton           # AI: Generate/update skeleton
POST   /api/website-flow/projects           # Create/update website project
GET    /api/website-flow/projects/[id]      # Get project state
POST   /api/website-flow/approve            # Approve skeleton → create task
```

### Route Implementations

#### POST /api/website-flow/screenshot

```typescript
// src/app/api/website-flow/screenshot/route.ts

import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { z } from 'zod'

const screenshotSchema = z.object({
  url: z.string().url(),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = screenshotSchema.parse(await request.json())

    // 1. Call screenshot service
    const screenshot = await captureScreenshot(body.url)

    // 2. Upload to Supabase storage
    // Path: website-inspirations/{userId}/{hash}.webp

    // 3. Return URLs
    return successResponse(
      {
        screenshotUrl: screenshot.imageUrl,
        thumbnailUrl: screenshot.thumbnailUrl,
      },
      201
    )
  })
}
```

#### GET /api/website-flow/inspirations

```typescript
// src/app/api/website-flow/inspirations/route.ts

import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { websiteInspirations } from '@/db/schema'
import { eq, and, arrayOverlaps } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  industry: z.string().optional(),
  style: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAuth()
    const params = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    // Build query with optional filters
    const conditions = [eq(websiteInspirations.isActive, true)]
    if (params.industry) {
      conditions.push(arrayOverlaps(websiteInspirations.industry, [params.industry]))
    }
    if (params.style) {
      conditions.push(arrayOverlaps(websiteInspirations.styleTags, [params.style]))
    }

    const results = await db
      .select()
      .from(websiteInspirations)
      .where(and(...conditions))
      .orderBy(websiteInspirations.displayOrder)
      .limit(params.limit)
      .offset(params.offset)

    return successResponse(results)
  })
}
```

#### POST /api/website-flow/similar

```typescript
// src/app/api/website-flow/similar/route.ts

const similarSchema = z.object({
  selectedIds: z.array(z.string()).min(1).max(5),
  excludeIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(10).default(5),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAuth()
    const body = similarSchema.parse(await request.json())

    // 1. Fetch selected inspirations
    // 2. Run similarity engine
    // 3. Return ranked similar websites

    const selected = await db
      .select()
      .from(websiteInspirations)
      .where(inArray(websiteInspirations.id, body.selectedIds))

    const pool = await db
      .select()
      .from(websiteInspirations)
      .where(
        and(
          eq(websiteInspirations.isActive, true),
          notInArray(websiteInspirations.id, [...body.selectedIds, ...(body.excludeIds || [])])
        )
      )

    const similar = findSimilar(selected, pool, body.limit)
    return successResponse(similar)
  })
}
```

#### POST /api/website-flow/skeleton

```typescript
// src/app/api/website-flow/skeleton/route.ts

const skeletonSchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(['assistant', 'user']),
      content: z.string(),
    })
  ),
  currentSkeleton: z.any().optional(), // Current skeleton state
  inspirations: z.array(z.any()).optional(), // Selected inspiration data
  userNotes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = skeletonSchema.parse(await request.json())

    // 1. Build system prompt with website flow context
    // 2. Include inspiration data + user notes
    // 3. Call Claude with structured output request
    // 4. Parse skeleton delta from response
    // 5. Apply delta to current skeleton
    // 6. Determine new fidelity level
    // 7. Generate AI recommendation for next step
    // 8. Update project in DB
    // 9. Return updated skeleton + AI message + quick options

    return successResponse({
      content: aiMessage,
      skeletonUpdate: skeletonDelta,
      skeleton: updatedSkeleton,
      quickOptions: nextQuickOptions,
      recommendation: aiRecommendation,
      fidelity: newFidelity,
    })
  })
}
```

#### POST /api/website-flow/projects

```typescript
// src/app/api/website-flow/projects/route.ts

const createProjectSchema = z.object({
  // Phase 1 data
  inspirationUrls: z.array(z.string().url()).optional(),
  selectedInspirationIds: z.array(z.string().uuid()).optional(),
  chosenInspirationIds: z.array(z.string().uuid()).optional(),
  inspirationNotes: z.string().optional(),
  userScreenshots: z
    .array(
      z.object({
        url: z.string().url(),
        screenshotUrl: z.string(),
        thumbnailUrl: z.string(),
        capturedAt: z.string(),
      })
    )
    .optional(),

  // Phase transitions
  phase: z.enum(['inspiration', 'skeleton', 'approval', 'delivery']).optional(),
})

const updateProjectSchema = createProjectSchema.extend({
  id: z.string().uuid(),
  skeleton: z.any().optional(),
  skeletonChatHistory: z.array(z.any()).optional(),
  feedbackRounds: z.number().optional(),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = createProjectSchema.parse(await request.json())

    const project = await db
      .insert(websiteProjects)
      .values({
        userId: session.user.id,
        companyId: session.user.companyId,
        ...body,
      })
      .returning()

    return successResponse(project[0], 201)
  })
}

export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = updateProjectSchema.parse(await request.json())

    // Verify ownership
    const existing = await db
      .select()
      .from(websiteProjects)
      .where(and(eq(websiteProjects.id, body.id), eq(websiteProjects.userId, session.user.id)))
      .limit(1)

    if (!existing.length) throw Errors.notFound('Website project')

    const updated = await db
      .update(websiteProjects)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(websiteProjects.id, body.id))
      .returning()

    return successResponse(updated[0])
  })
}
```

#### POST /api/website-flow/approve

```typescript
// src/app/api/website-flow/approve/route.ts

const approveSchema = z.object({
  projectId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = approveSchema.parse(await request.json())

    // 1. Fetch project, verify ownership
    // 2. Verify project is in 'skeleton' or 'approval' phase
    // 3. Calculate credits required (website category base + section count modifier)
    // 4. Check user has enough credits
    // 5. Calculate timeline
    // 6. Create task record (similar to existing task creation flow)
    // 7. Deduct credits
    // 8. Log credit transaction
    // 9. Update project: phase='delivery', status='approved', approvedAt=now()
    // 10. Find and assign freelancer (use existing assignment algorithm)
    // 11. Return task + timeline

    return successResponse({
      taskId: task.id,
      timeline: calculatedTimeline,
      creditsUsed: creditsRequired,
      assignedArtist: freelancerMatch,
    })
  })
}
```

---

## 9. Hooks

### use-website-flow.ts (Facade)

```typescript
// src/hooks/use-website-flow.ts

// Composes all website flow hooks into a single facade
// Similar pattern to useChatInterfaceData

export function useWebsiteFlow(projectId?: string) {
  const inspirations = useWebsiteInspirations()
  const skeleton = useWebsiteSkeleton()
  const approval = useWebsiteApproval()
  const draft = useWebsiteDraft(projectId)

  // Current phase derived from state
  const currentPhase = useMemo(() => {
    if (approval.isApproved) return 'approval'
    if (skeleton.sections.length > 0) return 'skeleton'
    return 'inspiration'
  }, [approval.isApproved, skeleton.sections])

  return {
    // Phase
    currentPhase,

    // Inspiration
    ...inspirations,

    // Skeleton
    ...skeleton,

    // Approval
    ...approval,

    // Draft
    ...draft,

    // Phase transitions
    moveToSkeleton: () => {
      /* transition logic */
    },
    moveToApproval: () => {
      /* transition logic */
    },
  }
}
```

### use-website-inspirations.ts

```typescript
// src/hooks/use-website-inspirations.ts

export function useWebsiteInspirations() {
  // State
  const [pastedUrls, setPastedUrls] = useState<string[]>([])
  const [userScreenshots, setUserScreenshots] = useState<Screenshot[]>([])
  const [selectedInspirations, setSelectedInspirations] = useState<WebsiteInspiration[]>([])
  const [chosenInspirations, setChosenInspirations] = useState<WebsiteInspiration[]>([]) // Final 2
  const [similarWebsites, setSimilarWebsites] = useState<WebsiteInspiration[]>([])
  const [notes, setNotes] = useState('')
  const [activeFilter, setActiveFilter] = useState<{ industry?: string; style?: string }>({})

  // Queries
  const galleryQuery = useQuery({
    queryKey: ['website-inspirations', activeFilter],
    queryFn: () => fetchInspirations(activeFilter),
  })

  // Mutations
  const screenshotMutation = useMutation({
    mutationFn: (url: string) => captureScreenshot(url),
    onSuccess: (data) => setUserScreenshots((prev) => [...prev, data]),
  })

  const similarMutation = useMutation({
    mutationFn: (ids: string[]) => fetchSimilar(ids),
    onSuccess: (data) => setSimilarWebsites(data),
  })

  // Handlers
  const handlePasteUrl = (url: string) => {
    setPastedUrls((prev) => [...prev, url])
    screenshotMutation.mutate(url)
  }

  const handleSelectInspiration = (inspiration: WebsiteInspiration) => {
    setSelectedInspirations((prev) => {
      const next = prev.some((i) => i.id === inspiration.id)
        ? prev.filter((i) => i.id !== inspiration.id)
        : [...prev, inspiration]
      // Auto-fetch similar when we have 1-2 selections
      if (next.length >= 1 && next.length <= 2) {
        similarMutation.mutate(next.map((i) => i.id))
      }
      return next
    })
  }

  const handleChooseFromSimilar = (inspiration: WebsiteInspiration) => {
    setChosenInspirations((prev) => {
      if (prev.length >= 2) return prev // Max 2
      return [...prev, inspiration]
    })
  }

  return {
    // State
    pastedUrls,
    userScreenshots,
    selectedInspirations,
    chosenInspirations,
    similarWebsites,
    notes,
    activeFilter,

    // Loading states
    isCapturingScreenshot: screenshotMutation.isPending,
    isFetchingSimilar: similarMutation.isPending,
    isLoadingGallery: galleryQuery.isLoading,

    // Data
    galleryItems: galleryQuery.data ?? [],

    // Handlers
    handlePasteUrl,
    handleSelectInspiration,
    handleChooseFromSimilar,
    setNotes,
    setActiveFilter,

    // Computed
    isReadyForSkeleton: chosenInspirations.length >= 1 || selectedInspirations.length >= 1,
  }
}
```

### use-website-skeleton.ts

```typescript
// src/hooks/use-website-skeleton.ts

export function useWebsiteSkeleton() {
  const [sections, setSections] = useState<SectionAtFidelity[]>([])
  const [fidelity, setFidelity] = useState<FidelityLevel>('low')
  const [chatMessages, setChatMessages] = useState<SkeletonMessage[]>([])
  const [globalColors, setGlobalColors] = useState<ColorScheme | null>(null)
  const [globalTypography, setGlobalTypography] = useState<TypographyConfig | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [feedbackRounds, setFeedbackRounds] = useState(0)

  // Generate initial skeleton from inspirations
  const generateSkeleton = useMutation({
    mutationFn: async (input: {
      inspirations: WebsiteInspiration[]
      notes: string
      projectId: string
    }) => {
      return fetch('/api/website-flow/skeleton', {
        method: 'POST',
        body: JSON.stringify({
          projectId: input.projectId,
          messages: [],
          inspirations: input.inspirations,
          userNotes: input.notes,
        }),
      }).then((r) => r.json())
    },
    onSuccess: (data) => {
      setSections(data.skeleton.sections)
      setFidelity(data.fidelity)
      setChatMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
          quickOptions: data.quickOptions,
          recommendation: data.recommendation,
        },
      ])
    },
  })

  // Send feedback and get updated skeleton
  const sendFeedback = useMutation({
    mutationFn: async (message: string) => {
      const allMessages = [...chatMessages, { role: 'user' as const, content: message }]
      return fetch('/api/website-flow/skeleton', {
        method: 'POST',
        body: JSON.stringify({
          projectId: currentProjectId,
          messages: allMessages,
          currentSkeleton: { sections, fidelity, globalColors, globalTypography },
        }),
      }).then((r) => r.json())
    },
    onSuccess: (data) => {
      // Apply skeleton delta
      if (data.skeletonUpdate) {
        applySkeletonDelta(data.skeletonUpdate)
      }
      setFidelity(data.fidelity)
      setFeedbackRounds((prev) => prev + 1)
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
          quickOptions: data.quickOptions,
          recommendation: data.recommendation,
          skeletonUpdate: data.skeletonUpdate,
        },
      ])
    },
  })

  // Section manipulation (direct edits, not via AI)
  const addSection = (type: string, afterId?: string) => {
    /* ... */
  }
  const removeSection = (id: string) => {
    /* ... */
  }
  const reorderSections = (orderedIds: string[]) => {
    /* ... */
  }
  const updateSection = (id: string, updates: Partial<SectionAtFidelity>) => {
    /* ... */
  }

  return {
    sections,
    fidelity,
    chatMessages,
    globalColors,
    globalTypography,
    isGenerating: generateSkeleton.isPending || sendFeedback.isPending,
    feedbackRounds,

    generateSkeleton: generateSkeleton.mutate,
    sendFeedback: sendFeedback.mutate,
    addSection,
    removeSection,
    reorderSections,
    updateSection,

    isReadyForApproval: sections.length >= 3 && feedbackRounds >= 1,
  }
}
```

### use-website-approval.ts

```typescript
// src/hooks/use-website-approval.ts

export function useWebsiteApproval() {
  const [timeline, setTimeline] = useState<WebsiteTimeline | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)

  const approveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return fetch('/api/website-flow/approve', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      }).then((r) => r.json())
    },
    onSuccess: (data) => {
      setTimeline(data.timeline)
      setTaskId(data.taskId)
      setIsApproved(true)
    },
  })

  // Calculate preview timeline (before approval, just for display)
  const previewTimeline = (sectionCount: number) => {
    return calculateTimeline(new Date(), sectionCount)
  }

  return {
    timeline,
    isApproved,
    taskId,
    isApproving: approveMutation.isPending,
    approve: approveMutation.mutate,
    previewTimeline,
  }
}
```

### use-website-draft.ts

```typescript
// src/hooks/use-website-draft.ts

// Auto-save website project state to server
// Similar to useDraftPersistence but for website flow

export function useWebsiteDraft(projectId?: string) {
  // Load existing project on mount
  const projectQuery = useQuery({
    queryKey: ['website-project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  })

  // Auto-save with debounce (2 second delay)
  const saveMutation = useMutation({
    mutationFn: (data: WebsiteProjectUpdate) => {
      return fetch('/api/website-flow/projects', {
        method: projectId ? 'PUT' : 'POST',
        body: JSON.stringify({ id: projectId, ...data }),
      }).then((r) => r.json())
    },
  })

  // Debounced save function
  const debouncedSave = useDebouncedCallback((data: WebsiteProjectUpdate) => {
    saveMutation.mutate(data)
  }, 2000)

  return {
    project: projectQuery.data,
    isLoading: projectQuery.isLoading,
    isSaving: saveMutation.isPending,
    save: debouncedSave,
    createProject: saveMutation.mutate,
  }
}
```

### use-screenshot-api.ts

```typescript
// src/hooks/use-screenshot-api.ts

export function useScreenshotApi() {
  const capture = useMutation({
    mutationFn: async (url: string) => {
      const response = await csrfFetch('/api/website-flow/screenshot', {
        method: 'POST',
        body: JSON.stringify({ url }),
      })
      return response.json()
    },
  })

  return {
    capture: capture.mutate,
    captureAsync: capture.mutateAsync,
    isCapturing: capture.isPending,
    error: capture.error,
    lastScreenshot: capture.data,
  }
}
```

---

## 10. Components

### Main Page

```typescript
// src/app/(client)/dashboard/website-project/page.tsx

import { WebsiteFlow } from '@/components/website-flow/website-flow'

export default function WebsiteProjectPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  return <WebsiteFlow projectId={projectId ?? undefined} />
}
```

### WebsiteFlow (Orchestrator)

```typescript
// src/components/website-flow/website-flow.tsx

// Main component that manages phase transitions and renders the split-panel layout
// Pattern: Similar to ChatInterface but for website flow

export function WebsiteFlow({ projectId }: { projectId?: string }) {
  const flow = useWebsiteFlow(projectId)

  return (
    <WebsiteFlowLayout
      currentPhase={flow.currentPhase}
      leftPanel={
        flow.currentPhase === 'inspiration' ? (
          <InspirationPhase
            pastedUrls={flow.pastedUrls}
            galleryItems={flow.galleryItems}
            selectedInspirations={flow.selectedInspirations}
            chosenInspirations={flow.chosenInspirations}
            similarWebsites={flow.similarWebsites}
            notes={flow.notes}
            onPasteUrl={flow.handlePasteUrl}
            onSelectInspiration={flow.handleSelectInspiration}
            onChooseFromSimilar={flow.handleChooseFromSimilar}
            onNotesChange={flow.setNotes}
            onContinue={flow.moveToSkeleton}
            isCapturingScreenshot={flow.isCapturingScreenshot}
            isReadyForSkeleton={flow.isReadyForSkeleton}
          />
        ) : flow.currentPhase === 'skeleton' ? (
          <SkeletonPhase
            chatMessages={flow.chatMessages}
            isGenerating={flow.isGenerating}
            feedbackRounds={flow.feedbackRounds}
            onSendFeedback={flow.sendFeedback}
            isReadyForApproval={flow.isReadyForApproval}
            onMoveToApproval={flow.moveToApproval}
          />
        ) : (
          <ApprovalPhase
            timeline={flow.timeline}
            isApproved={flow.isApproved}
            taskId={flow.taskId}
            onApprove={() => flow.approve(projectId!)}
            isApproving={flow.isApproving}
            sectionCount={flow.sections.length}
            previewTimeline={flow.previewTimeline}
          />
        )
      }
      rightPanel={
        flow.currentPhase === 'inspiration' ? (
          <InspirationPreview
            userScreenshots={flow.userScreenshots}
            selectedInspirations={flow.selectedInspirations}
            chosenInspirations={flow.chosenInspirations}
            isCapturing={flow.isCapturingScreenshot}
          />
        ) : (
          <SkeletonRenderer
            sections={flow.sections}
            fidelity={flow.fidelity}
            globalColors={flow.globalColors}
            globalTypography={flow.globalTypography}
            onReorderSections={flow.reorderSections}
            onUpdateSection={flow.updateSection}
            onRemoveSection={flow.removeSection}
          />
        )
      }
    />
  )
}
```

### WebsiteFlowLayout

```typescript
// src/components/website-flow/website-flow-layout.tsx

// Split-panel layout with phase-aware progress bar
// Reuse patterns from src/components/chat/chat-layout.tsx:
// - Desktop: side-by-side (55% left / 45% right)
// - Mobile: tabs or bottom sheet for right panel
// - Animated transitions between phases
// - Progress bar at top showing phase completion

interface WebsiteFlowLayoutProps {
  currentPhase: 'inspiration' | 'skeleton' | 'approval'
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

// Progress bar shows 3 phases:
// [Inspiration] ─── [Design] ─── [Approve]
// Active phase has emerald accent, completed phases have check mark
```

### Phase 1 Components

#### InspirationPhase

```typescript
// src/components/website-flow/phases/inspiration-phase.tsx

// Left panel during inspiration discovery
// Layout:
// 1. Header: "Let's find your website style"
// 2. URL Input: "Paste a website URL you love" with paste button
//    - Shows loading skeleton while screenshot is being captured
// 3. OR divider
// 4. "Show me inspirations" button → expands to gallery
// 5. IndustryFilter chips (horizontal scroll)
// 6. InspirationGallery grid (when expanded)
// 7. Selected count badge: "2 selected"
// 8. Notes textarea (appears after selection)
// 9. Continue button (appears when ready)
```

#### InspirationGallery

```typescript
// src/components/website-flow/inspiration/inspiration-gallery.tsx

// Grid of website cards
// Layout: 2 cols on mobile, 3 on desktop
// Each card: WebsiteCard component
// Filter state from parent (industry, style)
// Infinite scroll or "Load more" button
// Empty state when no matches
```

#### WebsiteCard

```typescript
// src/components/website-flow/inspiration/website-card.tsx

// Single website preview card
// - ScreenshotFrame (browser chrome wrapper) around screenshot image
// - Site name + industry tag
// - Style tags as small badges
// - Hover: scale 1.02, show "Select" overlay
// - Selected state: emerald border + check badge
// - Click to toggle selection
// - Uses OptimizedImage for the screenshot

interface WebsiteCardProps {
  inspiration: WebsiteInspiration
  isSelected: boolean
  onSelect: () => void
  size?: 'sm' | 'md' | 'lg'
}
```

#### SimilarWebsites

```typescript
// src/components/website-flow/inspiration/similar-websites.tsx

// "Similar to your picks" section
// Header: "We found similar websites you might like"
// Grid of 5 WebsiteCards
// User can select up to 2
// Selection count: "Choose up to 2"
// Skeleton loading state while fetching
```

#### ComparisonView

```typescript
// src/components/website-flow/inspiration/comparison-view.tsx

// Right panel: Side-by-side comparison of chosen websites
// Shows 1-2 large ScreenshotFrame previews
// With labels underneath each
// If only 1 chosen, shows it larger
// Smooth transitions with framer-motion
```

#### InspirationPreview (Right Panel)

```typescript
// src/components/website-flow/inspiration/inspiration-preview.tsx

// Right panel during Phase 1
// Adapts based on what user has done:
//
// State 1 (nothing selected):
//   Empty state with illustration
//   "Your inspiration board will appear here"
//
// State 2 (URLs pasted, screenshots loading):
//   Skeleton cards with pulse animation
//
// State 3 (inspirations selected):
//   Gallery grid of selected screenshots in ScreenshotFrame
//
// State 4 (similar shown, choices made):
//   ComparisonView with the 2 final choices
//   Side-by-side large previews
```

#### ScreenshotFrame

```typescript
// src/components/website-flow/shared/screenshot-frame.tsx

// Wraps a screenshot in a browser chrome frame
// - Top bar with dots (red/yellow/green) + URL bar showing domain
// - Content area with the screenshot
// - Subtle shadow + rounded corners
// - Light/dark mode aware

interface ScreenshotFrameProps {
  url: string // For URL bar display
  imageUrl: string
  className?: string
}
```

### Phase 2 Components

#### SkeletonPhase

```typescript
// src/components/website-flow/phases/skeleton-phase.tsx

// Left panel during skeleton building
// Layout:
// 1. AI recommendation card at top (if recommendation exists)
// 2. Chat messages list (scrollable)
// 3. Quick option chips (when available)
// 4. Input area at bottom
// 5. "Ready to approve" button (when isReadyForApproval)

// Reuse patterns from:
// - src/components/chat/chat-message-list.tsx (message rendering)
// - src/components/chat/quick-options.tsx (chip buttons)
// - src/components/chat/chat-input-area.tsx (input field)
// But simplified — no file upload, no style grid, no moodboard integration
```

#### SkeletonRenderer (Right Panel)

```typescript
// src/components/website-flow/skeleton/skeleton-renderer.tsx

// THE CORE VISUAL COMPONENT
// Renders the full website skeleton with progressive fidelity
//
// Layout: Vertical scroll of SectionBlocks
// Each section renders differently based on fidelity level
//
// Features:
// - Drag-to-reorder sections (except nav + footer)
// - Click section to focus & show edit toolbar
// - Smooth transitions when sections update
// - Fidelity indicator in top-right corner
// - "Page scroll" feel — sections stack vertically
//
// Reuse from existing:
// - Wireframe primitives from src/components/chat/wireframe/
// - DnD from @dnd-kit
// - Layout patterns from src/components/chat/structure-panel.tsx
//
// IMPORTANT: This is the most complex component. Build it incrementally:
// 1. First: static rendering of low-fi sections
// 2. Then: drag-to-reorder
// 3. Then: mid-fi rendering with content
// 4. Then: high-fi rendering with colors/typography
// 5. Then: smooth transitions between fidelity levels
```

#### SectionBlock

```typescript
// src/components/website-flow/skeleton/section-block.tsx

// Single section in the skeleton
// Renders differently based on fidelity:
//
// LOW-FI:
//   - Labeled box with section type icon
//   - Gray background, dashed border
//   - Section name centered
//   - Type-specific wireframe shape inside
//
// MID-FI:
//   - Layout structure visible (columns, rows)
//   - Placeholder text (lorem ipsum or AI-generated relevant text)
//   - Image placeholders with aspect ratios
//   - Navigation items visible
//   - CTA buttons with placeholder text
//
// HIGH-FI:
//   - Colors applied (from globalColors or section-specific)
//   - Typography applied (heading font, body font)
//   - Real-ish copy that reflects the business
//   - Proper spacing and alignment
//   - Icon hints rendered as actual Lucide icons
//
// All fidelities:
//   - Hover: show section toolbar (edit, delete, drag handle)
//   - Focus state: emerald border
//   - Transition between fidelities: crossfade (300ms)

interface SectionBlockProps {
  section: SectionAtFidelity
  fidelity: FidelityLevel
  isActive: boolean
  onUpdate: (updates: Partial<SectionAtFidelity>) => void
  onRemove: () => void
  onFocus: () => void
}
```

#### AiRecommendationCard

```typescript
// src/components/website-flow/skeleton/ai-recommendation-card.tsx

// Card showing AI's proactive recommendation
// "We think it's important for your website to..."
// With action buttons: "Add this" / "Skip" / "Tell me more"
//
// Design: Similar to strategic-review-card.tsx but simpler
// - Emerald accent border on left
// - Light background
// - Title + reasoning text
// - Action button row
```

### Phase 3 Components

#### ApprovalPhase

```typescript
// src/components/website-flow/phases/approval-phase.tsx

// Left panel during approval
// Layout:
// 1. Header: "Your website design is ready"
// 2. Summary stats: X sections, estimated Y days, Z credits
// 3. TimelineView with milestones
// 4. Approve button (large, emerald, centered)
// 5. "Go back to edit" link
```

#### TimelineView

```typescript
// src/components/website-flow/approval/timeline-view.tsx

// Vertical timeline with milestone cards
// Connected by a vertical line (emerald when completed, gray when upcoming)
// Each milestone: MilestoneCard
//
// Design reference:
// - Vertical line on the left (2px, emerald-to-gray gradient)
// - Cards offset to the right
// - Dots on the line at each milestone
// - Date labels on the left of the line

interface TimelineViewProps {
  milestones: Milestone[]
  totalDays: number
  estimatedDelivery: Date
}
```

#### MilestoneCard

```typescript
// src/components/website-flow/approval/milestone-card.tsx

// Individual milestone in the timeline
// - Circle indicator (emerald for completed, gray-border for upcoming)
// - Title + description
// - Date + "Day X" label
// - If isClientAction: amber badge "Your action needed"
// - If has durationHours: shows time window

interface MilestoneCardProps {
  milestone: Milestone
}
```

---

## 11. AI Prompts & State Machine

### Website Flow State Machine

```typescript
// src/lib/ai/website-state-machine.ts

// Simpler than the briefing state machine — 5 stages (internal)
// Maps to 3 UI phases

type WebsiteFlowStage =
  | 'INITIAL_GENERATION' // First skeleton from inspirations
  | 'SECTION_FEEDBACK' // User giving section-level feedback
  | 'CONTENT_REFINEMENT' // Filling in mid-fi content
  | 'STYLE_APPLICATION' // Applying colors, typography, spacing
  | 'FINAL_REVIEW' // Last adjustments before approval

// Transitions:
// INITIAL_GENERATION → SECTION_FEEDBACK (after first skeleton shown)
// SECTION_FEEDBACK → CONTENT_REFINEMENT (after 1-2 rounds of structural feedback)
// CONTENT_REFINEMENT → STYLE_APPLICATION (after content is settled)
// STYLE_APPLICATION → FINAL_REVIEW (after styles applied)
// FINAL_REVIEW → (approval)

// Any stage can loop back to itself for multiple rounds
```

### System Prompts

```typescript
// src/lib/ai/website-flow-prompts.ts

// IMPORTANT: Follow the existing prompt patterns from src/lib/ai/briefing-prompts.ts
// Use the same marker-based protocol for structured outputs

export function buildWebsiteFlowSystemPrompt(
  stage: WebsiteFlowStage,
  context: {
    inspirations: WebsiteInspiration[]
    userNotes: string
    currentSkeleton?: WebsiteSkeleton
    feedbackRounds: number
    industry?: string
  }
): string {
  return `You are a senior web designer at Crafted, an AI-powered design agency.
You are helping a client design their website through an interactive skeleton builder.

## Your Role
- Make proactive design recommendations — don't ask open-ended questions
- When suggesting sections, explain WHY they matter for this specific business/industry
- Be opinionated but flexible — give strong recommendations with reasoning
- Keep responses concise (2-3 sentences max per recommendation)

## Context
${
  context.inspirations.length > 0
    ? `
### Selected Inspirations
The client selected these websites as inspiration:
${context.inspirations.map((i) => `- ${i.name} (${i.url}) — Style: ${i.styleTags.join(', ')}. Industry: ${i.industry.join(', ')}`).join('\n')}
`
    : ''
}

${
  context.userNotes
    ? `
### Client Notes
"${context.userNotes}"
`
    : ''
}

${
  context.currentSkeleton
    ? `
### Current Skeleton
${JSON.stringify(
  context.currentSkeleton.sections.map((s) => ({
    type: s.type,
    label: s.label,
    headline: s.headline,
  })),
  null,
  2
)}
Fidelity: ${context.currentSkeleton.fidelity}
`
    : ''
}

## Output Format
Your response MUST include a [SKELETON_UPDATE] marker with a JSON delta to apply to the skeleton:

[SKELETON_UPDATE]{
  "addSections": [...],
  "removeSections": [...],
  "updateSections": [...],
  "reorderSections": [...],
  "updateFidelity": "low" | "mid" | "high",
  "updateColors": { "background": "#...", "text": "#...", "accent": "#..." },
  "updateTypography": { "headingFont": "...", "bodyFont": "..." }
}[/SKELETON_UPDATE]

You may also include [QUICK_OPTIONS]{...}[/QUICK_OPTIONS] for chip buttons.

## Stage-Specific Instructions

${getStageInstructions(stage, context)}
`
}

function getStageInstructions(stage: WebsiteFlowStage, context: WebsiteFlowContext): string {
  switch (stage) {
    case 'INITIAL_GENERATION':
      return `
Generate the initial website skeleton based on the client's inspirations and notes.
- Analyze the inspiration websites' section patterns and layouts
- Create 6-10 sections appropriate for their industry
- Start at LOW fidelity (labeled boxes only)
- Make ONE proactive recommendation about a section they might not have considered
- Ask if the structure looks right before adding content
`
    case 'SECTION_FEEDBACK':
      return `
The client is giving feedback on the section structure.
- Apply their requested changes (add/remove/reorder sections)
- After applying changes, suggest ONE improvement
- If this is the 2nd+ round, start transitioning some sections to MID fidelity
- Keep the conversation moving forward — don't over-ask
`
    case 'CONTENT_REFINEMENT':
      return `
Now fill in section content (headlines, subheadlines, CTAs, content blocks).
- Generate business-appropriate placeholder copy
- Use the client's industry and notes for context
- All sections should be at MID fidelity or higher
- Suggest specific CTAs that align with their business goals
`
    case 'STYLE_APPLICATION':
      return `
Apply visual styling based on the inspiration websites.
- Extract color palette from inspiration screenshots (or suggest one)
- Recommend typography pairing
- Set spacing preferences
- Transition all sections to HIGH fidelity
- Show the complete picture
`
    case 'FINAL_REVIEW':
      return `
The client is doing a final review.
- Only make changes they explicitly request
- Confirm the design is ready for production
- Mention that approval will start the delivery process
`
  }
}
```

### Marker Parsing

```typescript
// Add to existing marker parsing or create new parser

// Parse [SKELETON_UPDATE]{...}[/SKELETON_UPDATE] from AI response
function parseSkeletonUpdate(content: string): SkeletonDelta | null {
  const match = content.match(/\[SKELETON_UPDATE\]([\s\S]*?)\[\/SKELETON_UPDATE\]/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as SkeletonDelta
  } catch {
    return null
  }
}

// Strip markers from display content (same pattern as existing marker stripping)
function cleanWebsiteFlowContent(content: string): string {
  return content
    .replace(/\[SKELETON_UPDATE\][\s\S]*?\[\/SKELETON_UPDATE\]/g, '')
    .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, '')
    .trim()
}
```

---

## 12. Implementation Order

### Sprint 1: Foundation (Days 1-3)

**Goal**: Database + API skeleton + page routing

1. **Schema changes** — Add `websiteInspirations` and `websiteProjects` tables to `src/db/schema.ts`
2. **Generate + apply migration** — `npm run db:generate && npm run db:migrate`
3. **Validation schemas** — Add Zod schemas for all new API routes in `src/lib/validations/`
4. **API route stubs** — Create all 6 API routes with basic request/response handling
5. **Page route** — Create `src/app/(client)/dashboard/website-project/page.tsx`
6. **Environment variables** — Add `SCREENSHOT_API_KEY` and `SCREENSHOT_API_URL` to `src/lib/env.ts`

**Test**: `npm run typecheck` passes, API routes return 200 with mock data

### Sprint 2: Inspiration Phase (Days 4-7)

**Goal**: Full Phase 1 working end-to-end

1. **Screenshot service** — `src/lib/website/screenshot-service.ts` — integrate ScreenshotOne API
2. **Screenshot API route** — Full implementation of `POST /api/website-flow/screenshot`
3. **Similarity engine** — `src/lib/website/similarity-engine.ts` — tag-based matching
4. **Inspirations API** — Full implementation of `GET /api/website-flow/inspirations` + `POST /api/website-flow/similar`
5. **Hooks** — `useWebsiteInspirations`, `useScreenshotApi`
6. **Components** — Build in this order:
   a. `ScreenshotFrame` (shared)
   b. `WebsiteCard`
   c. `InspirationGallery`
   d. `IndustryFilter`
   e. `SimilarWebsites`
   f. `ComparisonView`
   g. `InspirationPreview` (right panel)
   h. `InspirationPhase` (left panel)
   i. `WebsiteFlowLayout`
   j. `WebsiteFlow`
7. **Seed script** — Create seed script for 20-30 initial website inspirations (DO NOT RUN without permission)

**Test**: User can paste URLs, see screenshots, browse gallery, select inspirations, see similar websites, write notes, and see the right panel update

### Sprint 3: Skeleton Builder (Days 8-14)

**Goal**: Full Phase 2 working end-to-end

1. **Section templates** — `src/lib/website/section-templates.ts`
2. **Fidelity levels** — `src/lib/website/fidelity-levels.ts`
3. **AI prompts** — `src/lib/ai/website-flow-prompts.ts` + `website-state-machine.ts`
4. **Skeleton API** — Full implementation of `POST /api/website-flow/skeleton`
5. **Hooks** — `useWebsiteSkeleton`
6. **Components** — Build in this order:
   a. `SectionBlock` (low-fi only first)
   b. `SkeletonRenderer` (static, no DnD)
   c. `AiRecommendationCard`
   d. `SkeletonPhase` (left panel with chat)
   e. Add DnD to `SkeletonRenderer`
   f. Add mid-fi rendering to `SectionBlock`
   g. Add high-fi rendering to `SectionBlock`
   h. Add fidelity transitions (framer-motion)
7. **Marker parsing** — Add `[SKELETON_UPDATE]` parser

**Test**: User can see skeleton generated from inspirations, chat with AI, see skeleton update, drag-reorder sections, see fidelity progress

### Sprint 4: Approval & Polish (Days 15-18)

**Goal**: Full Phase 3 + draft persistence + polish

1. **Timeline calculator** — `src/lib/website/timeline-calculator.ts`
2. **Approval API** — Full implementation of `POST /api/website-flow/approve`
3. **Hooks** — `useWebsiteApproval`, `useWebsiteDraft`
4. **Components**:
   a. `MilestoneCard`
   b. `TimelineView`
   c. `ApprovalPhase`
   d. `WebsiteProgressBar`
5. **Draft persistence** — Auto-save project state
6. **Project API** — Full implementation of `POST/PUT /api/website-flow/projects`
7. **Polish**:
   - Phase transition animations
   - Loading/skeleton states for all async operations
   - Error handling and retry logic
   - Mobile responsive layout
   - Dark mode support
8. **Entry point** — Add "Website Project" button/card to client dashboard

**Test**: Full flow: inspiration → skeleton → approval → task created. Draft persistence works across page reloads.

### Sprint 5: Framer Integration (Days 19-22) — OPTIONAL

**Goal**: Framer delivery pipeline

1. **Install** `framer-api` package
2. **Framer client** — `src/lib/website/framer-integration.ts`
3. **Admin UI** — Template project management (URL + API key storage)
4. **Delivery API** — Push skeleton to Framer, publish preview
5. **Webhook** — Listen for delivery status updates

**Test**: Skeleton data pushes to a test Framer project, preview link is generated

---

## 13. Existing Code Reference

### Files to reuse/extend (DO NOT rewrite)

| Existing File                               | What to Reuse                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/chat/wireframe/`            | All wireframe primitives (ImagePlaceholder, TextLines, NavBar, ButtonShape, etc.) |
| `src/components/chat/structure-panel.tsx`   | LayoutPreview section detection logic, section type rendering                     |
| `src/components/chat/chat-layout.tsx`       | Split-panel layout patterns, responsive breakpoints, panel collapse               |
| `src/components/chat/quick-options.tsx`     | Quick option chip rendering                                                       |
| `src/components/chat/chat-input-area.tsx`   | Input field patterns                                                              |
| `src/components/chat/chat-message-list.tsx` | Message rendering with animations                                                 |
| `src/components/chat/typing-text.tsx`       | Typing animation for AI messages                                                  |
| `src/components/chat/progress-stepper.tsx`  | Phase progress indicator patterns                                                 |
| `src/components/ui/optimized-image.tsx`     | Image rendering with loading states                                               |
| `src/lib/errors.ts`                         | `withErrorHandling`, `successResponse`, `Errors`                                  |
| `src/lib/require-auth.ts`                   | Auth helpers for API routes                                                       |
| `src/lib/ai/briefing-prompts.ts`            | Prompt engineering patterns, marker protocol                                      |
| `src/lib/ai/briefing-quick-options.ts`      | Quick option generation patterns                                                  |
| `src/hooks/use-queries.ts`                  | Query key patterns, React Query configuration                                     |
| `src/providers/csrf-provider.tsx`           | `csrfFetch()` for mutations                                                       |

### Files to NOT touch

| File                                          | Reason                                                      |
| --------------------------------------------- | ----------------------------------------------------------- |
| `src/components/chat/chat-interface.tsx`      | Existing chat flow — completely separate                    |
| `src/components/chat/useChatInterfaceData.ts` | Existing hook composition — don't modify                    |
| `src/lib/ai/briefing-state-machine.ts`        | Existing state machine — website flow gets its own          |
| `src/lib/ai/chat.ts`                          | Existing AI integration — website flow uses its own prompts |
| `src/hooks/use-chat-messages.ts`              | Existing chat hook — website flow has its own chat          |

### Design tokens to match

```
Primary accent:    emerald-600 / green-600
Background cards:  bg-card with border-border
Muted elements:    bg-muted/20 with border-border/40
Font:              Satoshi (already loaded)
Border radius:     rounded-lg (cards), rounded-xl (panels)
Shadows:           shadow-sm (cards), shadow-lg (floating)
Animations:        framer-motion, 200-300ms duration
```

### Navigation integration

Add entry point in `src/components/dashboard/sidebar.tsx` (client sidebar):

- New nav item: "Website Project" with Globe/Layout icon
- Route: `/dashboard/website-project`
- Only show for clients (not freelancers/admin)

Also add a CTA card on the client dashboard (`src/app/(client)/dashboard/page.tsx`):

- "Design a Website" card with description and "Start" button
- Routes to `/dashboard/website-project`

---

## 14. Testing Strategy

### Unit Tests (co-located, Vitest)

```
src/lib/website/similarity-engine.test.ts     — Tag matching scoring
src/lib/website/timeline-calculator.test.ts    — Timeline date calculations
src/lib/website/fidelity-levels.test.ts        — Fidelity determination
src/lib/website/section-templates.test.ts      — Industry defaults
src/lib/ai/website-state-machine.test.ts       — Stage transitions
```

### API Route Tests

```
src/app/api/website-flow/screenshot/route.test.ts
src/app/api/website-flow/inspirations/route.test.ts
src/app/api/website-flow/similar/route.test.ts
src/app/api/website-flow/skeleton/route.test.ts
src/app/api/website-flow/projects/route.test.ts
src/app/api/website-flow/approve/route.test.ts
```

### Test patterns

Follow existing test patterns from the codebase:

- Use `createMockSupabaseClient` from `src/test/mocks/supabase.ts`
- Use factories from `src/test/factories.ts` (extend with website project factory)
- Mock Claude API responses for AI tests
- Test Zod validation schemas with valid + invalid inputs

---

## Summary

This document covers the complete implementation of the website design flow:

- **3 user-facing phases**: Inspiration Discovery, Skeleton Builder, Approval & Timeline
- **1 backend phase**: Framer Delivery (optional, build last)
- **2 new DB tables**: `websiteInspirations`, `websiteProjects`
- **6 new API routes**: screenshot, inspirations, similar, skeleton, projects, approve
- **5 new hooks**: useWebsiteFlow, useWebsiteInspirations, useWebsiteSkeleton, useWebsiteApproval, useWebsiteDraft
- **~25 new components**: across 4 directories (phases, inspiration, skeleton, approval)
- **New AI prompts**: Website-specific system prompts with `[SKELETON_UPDATE]` marker protocol
- **5 implementation sprints**: Foundation → Inspiration → Skeleton → Approval → Framer

The existing chat briefing flow remains completely untouched. This is a parallel flow for the website vertical only.
