# Performance Audit

Run a comprehensive performance audit of the Pine Ten application and report findings with actionable recommendations.

Use the `perf-analyzer` agent to perform the analysis.

## Scope

Analyze infrastructure, configuration, and build-level performance — NOT frontend component code or backend API logic. The goal is to find improvements that can be made through config changes, dependency updates, caching tweaks, and deployment optimization.

## Steps

1. **Dispatch the perf-analyzer agent** to run the full audit
2. **Present the audit report** with the scoring table and categorized recommendations
3. **Highlight quick wins** — changes that are trivial to implement but have high impact

## Focus Areas

The agent should analyze (in order of typical impact):

1. Bundle size and dependency weight
2. Next.js configuration optimization
3. Caching strategy (HTTP headers + React Query + ISR)
4. Database connection pooling and query patterns
5. Image and font loading optimization
6. Third-party script loading
7. Rendering strategy (SSR vs SSG vs ISR vs client)
8. API route efficiency
9. Deployment and infrastructure config

## Output

A structured performance audit report with:

- Overall score out of 50
- Per-category scores and status
- Prioritized list of recommendations (config-only, no code rewrites)
- Expected impact for each recommendation
