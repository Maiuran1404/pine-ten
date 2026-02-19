# Design Review

Run a visual and structural design review on a component or page.

## Arguments

$ARGUMENTS — a component file path (e.g., `src/components/task-card.tsx`) or page route (e.g., `src/app/(client)/dashboard/page.tsx`)

## Steps

1. **Read the target file** and all components it imports from `src/components/`
2. **Read `src/app/globals.css`** to have the full token reference available
3. **Audit against every category** below. For each category, list issues found or confirm compliance.

### Brand & Design System

- Are all colors from design tokens? Flag any raw hex values or hardcoded colors.
- Are dashboard views using `--ds-*` tokens?
- Are gradients using the standard `.crafted-*` classes?
- Does typography follow the scale? Check font family (Satoshi for headings, Geist for body), size, and weight per level.

### Component Reuse

- Are shadcn/ui primitives used where they should be? Flag any hand-rolled replacements (e.g., custom dialog instead of `ui/dialog.tsx`).
- Is `cn()` from `@/lib/utils` used for class merging? Flag string concatenation.
- Are loading states using `Skeleton`? Empty states using `EmptyState`? Images using `OptimizedImage`?

### Visual Hierarchy & Layout

- Is there a clear focal point? Or do elements compete for attention?
- Is spacing consistent? Flag mixed spacing patterns within the same component.
- Is the layout mobile-first with responsive breakpoints (`sm:`, `md:`, `lg:`)?
- Are touch targets at least 44x44px on mobile?

### Dark Mode

- Are there any hardcoded color values that won't adapt to dark mode?
- Do custom backgrounds, borders, and shadows have dark mode variants?
- Check for `bg-white`, `text-black`, `border-gray-*`, or any Tailwind color classes that bypass CSS variables.

### Motion

- Do animations use standard presets (fadeUp, fadeIn, scaleIn, slideFromRight, stagger) or ad-hoc values?
- Does every animation serve a purpose (orientation, feedback, continuity, attention)?
- Is `prefers-reduced-motion` handled? Look for `useReducedMotion` usage.
- Flag any animations with durations over 500ms or under 100ms.

### Accessibility

- Do interactive elements have keyboard support? Check for `onClick` without `onKeyDown` on non-button elements.
- Are focus indicators visible? Look for `focus-visible:` utilities.
- Do images have `alt` text? Decorative images should use `alt=""`.
- Are icon-only buttons labeled with `aria-label`?
- Do form inputs have associated `<Label>` components with matching `htmlFor`/`id`?
- Is `aria-live` used for dynamic content updates?

### State Completeness

- Are all states handled: empty, loading, error, populated?
- Do loading skeletons match the populated layout shape?
- Do error states provide clear messaging and a recovery action?
- Do empty states guide users toward the primary action?

### Code Conventions

- Named exports (not default, except pages/layouts)?
- kebab-case filename?
- No `any` types? Check all props interfaces and type assertions.
- No inline styles? Everything should use Tailwind classes or `cn()`.
- No standalone CSS files?

4. **Output the review** in this format:

```
## Design Review: {component name}

### Score: {X}/10

### Summary
{2-3 sentence overall assessment}

### Issues Found

#### Critical (must fix)
- {issue}: {file:line} — {explanation and fix}

#### Recommended (should fix)
- {issue}: {file:line} — {explanation and fix}

#### Minor (nice to have)
- {issue}: {file:line} — {explanation and fix}

### What's Working Well
- {positive observation}
- {positive observation}
```

5. **Scoring guide:**
   - **9-10**: Fully compliant, no issues
   - **7-8**: Minor issues only, solid implementation
   - **5-6**: Some recommended fixes needed, functional but inconsistent
   - **3-4**: Critical issues present, needs significant rework
   - **1-2**: Major violations across multiple categories

6. If there are **Critical** issues, offer to fix them immediately.
