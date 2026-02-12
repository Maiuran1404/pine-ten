# Scaffold New Component

Create a new React component following project conventions.

## Arguments

$ARGUMENTS — the component name (e.g., "task-card") and optional flags: --client (for client component), --page (for page component)

## Steps

1. Parse the component name and flags from arguments
2. Convert to kebab-case for the file name, PascalCase for the component name
3. Determine the target directory:
   - Regular components: `src/components/{name}.tsx`
   - Feature components: `src/components/{feature}/{name}.tsx`
   - Page components: create in appropriate `src/app/` route group
4. Create the component file with:
   - `"use client"` directive if --client flag is set
   - Named export (not default, unless it is a page/layout)
   - TypeScript interface for props
   - Tailwind CSS classes for styling
   - Import from `@/components/ui/` for shadcn primitives
5. If the component uses client-side state or hooks, add `"use client"` at top
6. Run `npm run typecheck` to verify no type errors
