# Security Audit

Run a comprehensive security audit of the codebase. Dispatches the `security-auditor` agent.

## Arguments

$ARGUMENTS — optional scope (e.g., "src/app/api/payments", "auth", "client components"). If omitted, audits the entire codebase.

## Steps

1. **Determine scope** — If arguments specify a directory or area, limit the audit. Otherwise, audit everything.

2. **Dispatch the `security-auditor` agent** to check all audit areas:

   **Authentication & Authorization**
   - Every API route has `auth.api.getSession()` or `requireAuth()` / `requireRole()`
   - Admin routes enforce ADMIN role via `requireAdmin()`
   - Freelancer routes enforce FREELANCER role via `requireFreelancer()` or `requireApprovedFreelancer()`
   - Client routes enforce CLIENT role via `requireClient()`
   - No auth bypasses or missing checks

   **Input Validation**
   - Every POST/PUT/PATCH API route validates with Zod before processing
   - No unsanitized user input reaching SQL or HTML
   - File upload validation (type, size) in place
   - URL/query parameters validated

   **Secrets & Environment**
   - `SUPABASE_SERVICE_ROLE_KEY` never imported in `"use client"` files
   - No hardcoded credentials, API keys, or tokens in source code
   - All env vars registered in `src/lib/env.ts`
   - No secrets in client-side bundles

   **API Security**
   - CSRF protection on all mutation endpoints (POST/PUT/PATCH/DELETE)
   - Rate limiting on public-facing endpoints
   - Error responses don't leak stack traces or internal details
   - No CORS misconfigurations

   **Database**
   - Drizzle ORM used exclusively (no raw SQL injection vectors)
   - No destructive operations without guards

3. **Present the audit report** with findings sorted by severity

## Output

### Findings Table

| #   | Severity | Location | Issue | Recommendation |
| --- | -------- | -------- | ----- | -------------- |

Severity levels: CRITICAL, HIGH, MEDIUM, LOW, INFO

### Summary

- Total findings by severity
- Top 3 most urgent items to fix
- Overall security posture assessment (Strong / Adequate / Needs Attention / Critical)
