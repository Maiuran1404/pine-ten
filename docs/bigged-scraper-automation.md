# Bigged Scraper Automation Proposal

This document outlines the recommended approaches for automating the Bigged Ad Spy scraper for the reference library.

## Current Capabilities

The scraper currently supports:
- **Manual triggering** via CLI script (`scripts/scrape-bigged-to-library.ts`)
- **Admin UI triggering** via the Reference Library page (Upload tab)
- **Import logging** with full history visible in the Import History tab

## Recommended Automation Approaches

### Option 1: Vercel Cron Jobs (Recommended for Production)

**Best for:** Production deployments on Vercel

Vercel supports cron jobs that can trigger API endpoints on a schedule.

**Implementation:**

1. Create a cron API endpoint:

```typescript
// src/app/api/cron/scrape-bigged/route.ts
import { NextRequest, NextResponse } from "next/server";
import { scrapeBigged } from "@/lib/scrapers/bigged-scraper";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get search queries from env or database
  const queries = process.env.BIGGED_AUTO_QUERIES?.split(",") || ["marketing", "startup"];

  const results = [];
  for (const query of queries) {
    const result = await scrapeBigged({
      query: query.trim(),
      limit: 20,
      confidenceThreshold: 0.6,
      triggeredBy: null,
      triggeredByEmail: "cron@system",
    });
    results.push({ query, ...result.summary });
  }

  return NextResponse.json({ success: true, results });
}
```

2. Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-bigged",
      "schedule": "0 6 * * 1"  // Every Monday at 6 AM
    }
  ]
}
```

**Pros:**
- Zero infrastructure management
- Integrated with deployment platform
- Automatic scaling
- Built-in monitoring via Vercel dashboard

**Cons:**
- Limited to Vercel Pro/Enterprise plans for cron jobs
- Max 1 minute execution time for hobby, 5 mins for Pro

---

### Option 2: GitHub Actions (Recommended for Flexibility)

**Best for:** Teams wanting more control and free automation

**Implementation:**

1. Create GitHub Action workflow:

```yaml
# .github/workflows/scrape-bigged.yml
name: Scrape Bigged Ad Spy

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM UTC
  workflow_dispatch:  # Allow manual triggering
    inputs:
      query:
        description: 'Search query'
        required: true
        default: 'marketing'
      limit:
        description: 'Number of items to scrape'
        required: false
        default: '20'

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium

      - name: Run scraper
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx tsx scripts/scrape-bigged-to-library.ts \
            --query "${{ github.event.inputs.query || 'marketing' }}" \
            --limit ${{ github.event.inputs.limit || '20' }}
```

**Pros:**
- Free for public repos, generous limits for private
- Full control over execution environment
- Easy manual triggering via workflow_dispatch
- Access to full GitHub Actions ecosystem (notifications, etc.)

**Cons:**
- Requires managing secrets in GitHub
- Separate from main deployment platform
- Playwright browser installation adds to execution time

---

### Option 3: Admin-Scheduled Jobs via Database

**Best for:** Maximum flexibility and admin control

**Implementation:**

1. Create a scheduled jobs table:

```sql
CREATE TABLE scheduled_scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  limit_count INTEGER DEFAULT 20,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.60,
  schedule_cron TEXT NOT NULL,  -- e.g., "0 6 * * 1"
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

2. Add an admin UI to manage scheduled jobs in the Reference Library page.

3. Use an external cron service (like cron-job.org) or Vercel cron to check for due jobs every hour.

**Pros:**
- Full admin control without code changes
- Multiple queries with different schedules
- Easy pause/resume functionality
- Audit trail in database

**Cons:**
- More complex implementation
- Still requires external trigger mechanism

---

### Option 4: Inngest/Trigger.dev (Serverless Background Jobs)

**Best for:** Complex workflows with retries and monitoring

**Implementation with Inngest:**

```typescript
// src/inngest/functions.ts
import { inngest } from "./client";
import { scrapeBigged } from "@/lib/scrapers/bigged-scraper";

export const scheduledBiggedScrape = inngest.createFunction(
  {
    id: "scheduled-bigged-scrape",
    retries: 3,
  },
  { cron: "0 6 * * 1" },  // Every Monday at 6 AM
  async ({ event, step }) => {
    const queries = ["marketing", "fitness", "tech startup"];

    for (const query of queries) {
      await step.run(`scrape-${query}`, async () => {
        return await scrapeBigged({
          query,
          limit: 20,
          confidenceThreshold: 0.6,
        });
      });
    }
  }
);
```

**Pros:**
- Built-in retries and error handling
- Excellent monitoring dashboard
- Step-based execution (can pause/resume)
- Long-running job support

**Cons:**
- Additional service to manage
- Costs at scale

---

## Recommendation Summary

| Use Case | Recommended Approach |
|----------|---------------------|
| Simple, production Vercel deployment | **Vercel Cron Jobs** |
| Need flexibility + free automation | **GitHub Actions** |
| Want admin-configurable schedules | **Database + External Cron** |
| Complex workflows with monitoring | **Inngest/Trigger.dev** |

## Quick Start: GitHub Actions

For most teams, **GitHub Actions** provides the best balance of flexibility, cost, and ease of setup:

1. Copy the workflow file above to `.github/workflows/scrape-bigged.yml`
2. Add secrets to your GitHub repository:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
3. The scraper will run automatically every Monday at 6 AM UTC
4. You can also manually trigger it from GitHub Actions tab

## Monitoring

Regardless of which approach you choose:

1. **Check Import History** in the admin Reference Library page
2. **Set up notifications** for failed jobs (email, Slack, etc.)
3. **Monitor costs** - each image classification uses Claude API

## Environment Variables for Automation

```bash
# Required for automation
BIGGED_AUTO_QUERIES=marketing,fitness,skincare,tech  # Comma-separated queries
BIGGED_AUTO_LIMIT=20                                  # Items per query
BIGGED_CONFIDENCE_THRESHOLD=0.6                       # 60% minimum confidence
CRON_SECRET=your-secret-key                          # For verifying cron requests
```
