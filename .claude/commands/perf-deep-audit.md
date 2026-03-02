# Full-Stack Performance Deep Audit

Run an exhaustive performance analysis of the entire Pine Ten application covering React rendering, hooks, database queries, caching, bundle size, API routes, and infrastructure — without recommending any changes to frontend design or backend functionality.

Use the `perf-deep-audit` agent to perform the analysis.

## Scope

Analyze EVERYTHING in the codebase that affects performance:

- React component rendering efficiency (re-renders, memoization, state locality)
- Hook composition and state management overhead
- Database query patterns (N+1, missing indexes, over-fetching)
- API route efficiency (sequential awaits, missing caching, edge opportunities)
- Bundle size decomposition and code-splitting opportunities
- React Query cache configuration and invalidation patterns
- Server Component vs Client Component boundary optimization
- Font, image, and asset loading pipeline
- Middleware and edge function efficiency
- Third-party dependency weight analysis
- Next.js configuration optimization
- Memory leak patterns and runtime efficiency

## Constraints

The agent MUST NOT recommend changes that:

- Alter the visual design or layout of any page
- Change API contracts or business logic
- Remove or modify features
- Restructure the UI component hierarchy in ways visible to users

All recommendations must be **invisible to the end user** — the app must look and behave identically, just faster.

## Output

A structured deep audit report with:

- Overall score out of 100 across 10 categories
- Findings categorized by severity (CRITICAL / HIGH / MEDIUM / LOW)
- Each finding with: exact file locations, root cause, specific fix, effort estimate, and estimated impact
- Implementation roadmap in 3 waves (quick wins, high-impact, comprehensive)
- Metrics to track for validating improvements
