# Firecrawl Upgrade & Feature Integration Plan

## Overview

Upgrade Firecrawl SDK from `4.9.1` → `4.15.0` and integrate 7 new features across the brand extraction pipeline, admin scrapers, and new capabilities.

---

## Phase 1: SDK Upgrade + Branding v2 (Low Risk)

### 1a. Upgrade `@mendable/firecrawl-js` to `^4.15.0`

- `npm install @mendable/firecrawl-js@latest`
- Verify no breaking changes in existing scrape calls

### 1b. Consume Branding v2 fields in brand extraction

**File:** `src/app/api/brand/extract/route.ts`

The branding v2 response now includes richer data:

```
colorScheme: 'dark' | 'light'
typography.fontFamilies: { primary, heading, code }
typography.fontSizes: { h1, h2, body }
typography.fontWeights: { regular, medium, bold }
spacing: { baseUnit, borderRadius }
improved logo detection (Wix/Framer support)
```

Changes:

- Update `createDefaultBrandData()` to map `heading` font → `secondaryFont`
- Use `colorScheme` to inform Claude's personality analysis
- Use improved `branding.logo` (v2 handles Wix/Framer sites better)
- Pass typography/spacing data to the `BrandExtraction` response

### 1c. Add new fields to companies schema (migration)

**File:** `src/db/schema.ts`

New columns on `companies`:

- `colorScheme text('color_scheme')` — 'dark' | 'light'
- `headingFont text('heading_font')` — separate heading font from body
- `fontSizes jsonb('font_sizes')` — `{ h1, h2, body }` sizes
- `fontWeights jsonb('font_weights')` — `{ regular, medium, bold }`
- `spacingUnit integer('spacing_unit')` — base spacing (e.g. 8)
- `borderRadius text('border_radius')` — e.g. "8px"

These give the briefing flow richer brand context to pass to freelancers.

### 1d. Update brand dashboard Typography tab to show new fields

- Display heading font separately from body font
- Show font sizes and weights
- Show spacing unit and border radius

---

## Phase 2: `/agent` Endpoint for Enhanced Brand Extraction (Medium Risk)

### 2a. Add "deep extraction" mode to `/api/brand/extract`

**File:** `src/app/api/brand/extract/route.ts`

Current flow: `scrape single page → Claude analysis`
New flow: `agent navigates multi-page site → Claude analysis with richer context`

Add optional `deep: true` param to `extractBrandRequestSchema`:

When `deep: true`:

1. Use Firecrawl `/agent` with structured prompt to navigate homepage + about + pricing + careers
2. Pass multi-page findings to Claude for analysis (same prompt but with richer multi-page input)
3. Fallback to single-page scrape if agent fails or times out (60s max)
4. Use `spark-1-mini` model, cap at 500 credits

### 2b. Wire up "deep scan" toggle in the UI

- Onboarding brand input: add a subtle "Deep scan" toggle (off by default for speed)
- Brand dashboard rescan: add "Deep rescan" option
- Show appropriate loading states (deep scan takes ~30-60s vs ~10s)

---

## Phase 3: `/search` for Competitor Research (Medium Risk)

### 3a. New API route: `POST /api/brand/competitors/enrich`

**File:** `src/app/api/brand/competitors/enrich/route.ts` (new)

After brand extraction identifies competitors, this endpoint enriches them with real data:

- For each competitor name, use `firecrawl.search()` with `scrapeOptions: { formats: ['branding', 'markdown'] }`
- Extract: real website URL, actual brand colors, description, positioning
- Returns enriched competitor data with real websites and branding

### 3b. Add "Enrich competitors" button to brand dashboard Competitors tab

- Button triggers the enrichment API
- Shows loading state per competitor
- Updates competitor cards with real data (logos, colors, websites)

---

## Phase 4: Parallel Agents for Batch Competitor Scraping (Builds on Phase 3)

### 4a. Use `Promise.all` with `startAgent` for parallel competitor research

**File:** `src/app/api/brand/competitors/enrich/route.ts`

Instead of sequential search queries, fire parallel agent jobs for all competitors simultaneously:

- Use `firecrawl.startAgent()` per competitor
- Poll all jobs in parallel
- `spark-1-mini` model, 200 credits max per competitor
- This enriches all competitors simultaneously (~30s total) rather than one at a time

---

## Phase 5: PDF Brand Guidelines Parsing (Medium Risk)

### 5a. New API route: `POST /api/brand/extract-pdf`

**File:** `src/app/api/brand/extract-pdf/route.ts` (new)

Accept a PDF URL (from Supabase storage or direct URL) and extract brand data:

- Use `firecrawl.scrape(pdfUrl, { formats: ['markdown'], parsers: [{ type: 'pdf', mode: 'auto', maxPages: 30 }] })`
- Feed markdown to Claude with brand extraction prompt
- Merge extracted data with existing brand profile (additive, not replace)

### 5b. Add PDF upload to brand dashboard

- Brand dashboard gets a "Upload brand guidelines (PDF)" button
- Uploads PDF to Supabase → calls extract-pdf endpoint
- Shows extracted data for review before merging

---

## Phase 6: Cost Optimization with Firecrawl Branding Confidence (Low Risk)

### 6a. Skip Claude for visual fields when Firecrawl confidence is high

**File:** `src/app/api/brand/extract/route.ts`

Currently: always calls Claude for all fields, then optionally overrides with Firecrawl colors.
New approach: if `branding.confidence.overall >= 0.7`, use Firecrawl data directly for visual fields (colors, fonts, logo) and only call Claude for strategic analysis (audiences, competitors, positioning, voice, personality).

This reduces the Claude prompt size and cost when Firecrawl already has high-confidence visual data.

---

## Phase 7: Simplify Admin Image Scraper (Low Risk)

### 7a. Leverage Firecrawl's native capabilities in brand-references scraper

**File:** `src/app/api/admin/brand-references/scrape/route.ts`

The current ~300-line `extractImagesFromHtml()` with 20+ regex patterns handles background-image CSS extraction, CDN patterns, etc. Firecrawl v2.5+ handles background images natively.

Changes:

- When Firecrawl is available, request `formats: ['html', 'rawHtml', 'links']` — the returned HTML already resolves lazy-loaded images and CSS background images
- Keep the custom regex as fallback for the plain `fetch` path
- Keep Pinterest/Cosmos/Behance-specific patterns (domain-specific logic Firecrawl won't handle)

---

## File Change Summary

| File                                                 | Change                                                      | Phase      |
| ---------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| `package.json`                                       | Upgrade firecrawl-js 4.9.1 → 4.15.0                         | 1          |
| `src/db/schema.ts`                                   | Add 6 columns to companies table                            | 1          |
| Migration file (generated)                           | Schema migration                                            | 1          |
| `src/app/api/brand/extract/route.ts`                 | Branding v2 + agent mode + cost optimization                | 1, 2, 6    |
| `src/lib/validations/index.ts`                       | Add `deep` param to extractBrandRequestSchema               | 2          |
| `src/app/api/brand/competitors/enrich/route.ts`      | New route (search + parallel agents)                        | 3, 4       |
| `src/app/api/brand/extract-pdf/route.ts`             | New route (PDF parsing)                                     | 5          |
| `src/app/api/admin/brand-references/scrape/route.ts` | Simplify image extraction                                   | 7          |
| Brand dashboard components                           | UI for new fields, deep scan, competitor enrich, PDF upload | 1, 2, 3, 5 |
| Onboarding brand input component                     | Deep scan toggle                                            | 2          |

## Execution Order

1. **Phase 1** (SDK upgrade + branding v2 + schema) — foundation, everything else depends on this
2. **Phase 7** (simplify admin scraper) — quick win, independent
3. **Phase 6** (cost optimization) — quick win, independent
4. **Phase 2** (agent endpoint for deep extraction) — biggest product improvement
5. **Phase 3 + 4** (competitor research with search + parallel agents) — builds on Phase 2 patterns
6. **Phase 5** (PDF parsing) — independent, can be done anytime
