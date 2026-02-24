# Website Design Flow - V2 Backlog (Deferred from V1)

> Items listed here are described in `WEBSITE_DESIGN_FLOW.md` but will NOT be implemented in v1. This document tracks what's missing and why, so nothing falls through the cracks.

---

## 1. Framer Delivery Integration (Phase 4)

**What it is:** After a client approves the skeleton, the system would connect to a Framer project via their Server API (WebSocket), push the skeleton sections/styles/content, publish preview links, and eventually deploy to production.

**What's in the spec (WEBSITE_DESIGN_FLOW.md Section 6, lines 619-721):**

- `src/lib/website/framer-integration.ts` - FramerDelivery class with connect(), pushSkeleton(), applyStyles(), publishPreview(), deployToProduction()
- NPM package: `framer-api`
- Environment variables: `FRAMER_API_KEY`, `FRAMER_TEMPLATE_PROJECT_URL`
- Admin pre-creates template Framer projects per industry/style
- Freelancer duplicates template, system connects and pushes skeleton data
- Preview publishing for client review
- Production deployment on final approval
- Manual ownership transfer step

**Why deferred:**

- Framer Server API is in open beta (Dec 2025) - breaking changes possible
- Cannot create new projects via API - requires admin manual setup of templates
- Cannot transfer ownership via API - manual step
- Core product value is in Phases 1-3 (inspiration + skeleton + approval)
- The `framerProjectUrl`, `framerPreviewUrl`, `framerDeployedUrl` columns exist in the schema but will remain null

**Impact:** Freelancers will receive the approved skeleton data as part of the task brief and manually build in Framer. No automated Framer push, no preview links, no programmatic deployment. The delivery workflow is manual.

**To implement later:**

1. Install `framer-api` package
2. Create `src/lib/website/framer-integration.ts`
3. Add admin UI for template project management (URL + API key storage)
4. Create delivery API routes for push/preview/deploy
5. Add webhook listener for delivery status updates
6. Add `FRAMER_API_KEY` and `FRAMER_TEMPLATE_PROJECT_URL` to env.ts

---

## 2. CLIP Embeddings for Visual Similarity (Phase 2 of Similarity Engine)

**What it is:** Instead of tag-based similarity matching, use CLIP (Contrastive Language-Image Pre-training) to generate embedding vectors for each website screenshot, then find nearest neighbors via cosine similarity for true visual matching.

**What's in the spec (WEBSITE_DESIGN_FLOW.md Section 3, lines 257-263):**

- Screenshot each website -> generate CLIP embedding vector
- Store vectors in Supabase pgvector column
- `embeddingVector: vector('embedding_vector', { dimensions: 512 })` column (commented out in schema spec)
- Find nearest neighbors by cosine similarity
- Gives true visual similarity regardless of tags

**Why deferred:**

- Requires pgvector extension in Supabase (may need plan upgrade)
- Requires CLIP model hosting (either self-hosted or API like OpenAI's CLIP endpoint)
- Tag-based matching is good enough for ~100 curated websites
- Adds significant infrastructure complexity

**Impact:** Similarity suggestions will be based on manually-tagged industry, style, color temperature, layout style, and typography metadata rather than actual visual similarity. Results may be less accurate for edge cases where visual style doesn't match tags.

**To implement later:**

1. Enable pgvector extension in Supabase
2. Add `embeddingVector` column to `websiteInspirations` table
3. Set up CLIP model API (OpenAI or self-hosted)
4. Create embedding generation pipeline for all screenshots
5. Replace `findSimilar()` with vector similarity search
6. Backfill embeddings for existing curated library

---

## 3. Curated Library Seed Script

**What it is:** A seed script to populate the `websiteInspirations` table with ~100 hand-picked websites across 10 industries and 8 style axes.

**What's in the spec (WEBSITE_DESIGN_FLOW.md Section 3, lines 266-287):**

- ~100 hand-picked websites
- 10 industry categories: Law, SaaS, Agency, E-commerce, Portfolio, Restaurant, Healthcare, Finance, Real Estate, Education
- 8 style axes: Minimal, Bold, Corporate, Playful, Premium, Dark, Light, Editorial
- Each entry: URL, screenshot (via API), name, industry[], styleTags[], metadata

**Why deferred:**

- CLAUDE.md explicitly forbids running seed scripts without user permission (377 deliverable style references were previously lost)
- Requires ScreenshotOne API key to capture screenshots
- Manual curation effort needed to select quality websites

**Impact:** The inspiration gallery will be empty until manually seeded. Users can still paste their own URLs. The gallery browse experience won't work without seed data.

**To implement later:**

1. Create `src/db/seeds/website-inspirations-seed.ts` with curated website list
2. Capture screenshots for each via ScreenshotOne API
3. Upload to Supabase storage
4. Insert records with proper tagging
5. **Only run with explicit user permission**

---

## 4. use-visual-similarity.ts (Separate Hook)

**What it is:** A dedicated hook for the visual similarity feature, separate from `useWebsiteInspirations`.

**What's in the spec (WEBSITE_DESIGN_FLOW.md file structure, line 131):**

- `src/hooks/use-visual-similarity.ts` - Similar website finding

**Why deferred:** The similarity logic is simple enough to fold into `useWebsiteInspirations` as a `useMutation`. A separate hook adds unnecessary abstraction for the v1 tag-based matching. When CLIP embeddings are added, this hook would make more sense as a standalone.

**Impact:** None functionally. The similarity feature works, just composed differently.

**To implement later:** Extract from `useWebsiteInspirations` when CLIP embeddings justify a more complex similarity workflow.

---

## 5. Progressive Section Fidelity Transitions (framer-motion)

**What it is:** Smooth animated transitions when a section upgrades from low-fi to mid-fi to high-fi, with crossfade effects showing the wireframe morphing into content.

**What's in the spec (WEBSITE_DESIGN_FLOW.md Section 4, line 488):**

- Add smooth transitions between fidelity levels (framer-motion)
- `progressive-section.tsx` component that handles the animation

**Why partially deferred:** The v1 will have basic `AnimatePresence mode="wait"` crossfades between fidelity levels. The fancy "morphing wireframe to content" animation described in the spec is deferred.

**Impact:** Fidelity changes will appear as clean crossfades rather than the idealized "wireframe boxes expanding into real content" animation. Still looks good, just less cinematic.

**To implement later:**

1. Create `src/components/website-flow/skeleton/progressive-section.tsx`
2. Add layout animations that morph wireframe shapes into content blocks
3. Use `framer-motion` layout animations for smooth size/position transitions

---

## 6. Skeleton Generator (Server-side)

**What it is:** A dedicated server-side module for generating and manipulating skeleton structures independent of the AI chat.

**What's in the spec (WEBSITE_DESIGN_FLOW.md file structure, line 139):**

- `src/lib/website/skeleton-generator.ts` - Section generation logic

**Why deferred:** In v1, all skeleton generation goes through the AI (Claude) via the `/api/website-flow/skeleton` route. A separate generator would be useful for non-AI skeleton creation (e.g., from templates) but is not needed when all generation is AI-driven.

**Impact:** Skeleton generation is always AI-mediated. No "quick template" option without AI.

**To implement later:** Create a rule-based skeleton generator that can produce initial skeletons from industry templates without AI, for faster first renders.

---

## Summary

| Feature                | Complexity | Business Impact          | Recommended Priority   |
| ---------------------- | ---------- | ------------------------ | ---------------------- |
| Framer Delivery        | High       | High (enables delivery)  | P1 - Next sprint       |
| Seed Script            | Low        | High (enables gallery)   | P0 - Run ASAP after v1 |
| CLIP Embeddings        | Medium     | Medium (better matching) | P2 - After launch data |
| Progressive Animations | Low        | Low (polish)             | P3 - Nice to have      |
| Visual Similarity Hook | Low        | Low (code quality)       | P3 - With CLIP         |
| Skeleton Generator     | Medium     | Low (template shortcuts) | P3 - Nice to have      |

**Total estimated effort for full v2:** ~2 sprints (primarily Framer integration + seed script curation)
