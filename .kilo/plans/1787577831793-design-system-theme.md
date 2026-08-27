# Lore Canvas Design System Implementation Plan

## Current State
- Tailwind CSS v4 is configured via `@tailwindcss/vite`
- `index.css` only has `@import "tailwindcss"` and basic reset
- Google Fonts are not loaded
- Components use ad-hoc `neutral-*` classes
- React Flow uses default styling

## Goal
Apply the provided Lore Canvas design system (colors, typography, glassmorphism, spacing) across the entire frontend without breaking existing functionality.

## Task 1: Global Theme Setup
**File:** `client/src/index.css`
- Add Google Fonts link for Playfair Display (weights 400, 500, 600, 700) and Inter (weights 400, 500, 600)
- Use Tailwind v4 `@theme` to define custom tokens:
  - Colors: map all provided palette values (`surface`, `surface-container-*`, `on-surface`, `primary`, `primary-container`, `secondary`, `secondary-container`, `tertiary`, `error`, `inverse-surface`, `outline`, `slate-900`, `zinc-950`, `indigo-electric`, `violet-glow`)
  - Font families: `font-display` = Playfair Display, `font-body` = Inter
  - Spacing: extend with custom values if needed
- Set `body` background to `background` (#0c1324), text to `on-background` (#dce1fb)

## Task 2: Base Layout & Elevation Utilities
**File:** `client/src/index.css` (new utility classes)
- `.glass` = `background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(144, 143, 160, 0.15);`
- `.glass-strong` = higher opacity slate-900 with stronger blur
- `.glow-primary` = `box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.5), 0 0 15px rgba(99, 102, 241, 0.25);`
- Canvas dot-grid background pattern using radial-gradient at 32px intervals

## Task 3: Component Updates
**Files:** All `client/src/components/*.jsx`, `client/src/pages/*.jsx`

Apply these rules to every component:
- Replace all `neutral-*` and `slate-*` color references with the custom theme tokens
- Auth pages (`Login.jsx`, `Signup.jsx`): use `.glass` card, `font-display` for headings, `font-body` for form labels/inputs
- `AuthLayout.jsx`: add Lore Canvas branding with `font-display`, glass card container
- `Dashboard.jsx`: glass header, project cards with hover border transition to `indigo-electric`
- `Community.jsx`: project cards as glass panels with subtle border, active state with `.glow-primary`
- `Editor.jsx`: header as floating toolbar with `.glass-strong`, buttons with rounded-lg, primary buttons in `indigo-electric`
- `ProtectedRoute.jsx`: minimal, no visual changes needed

## Task 4: React Flow Theming
**File:** `client/src/pages/Editor.jsx`, `client/src/pages/PublicProject.jsx`
- Custom node style: `background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(144, 143, 160, 0.2); backdrop-filter: blur(8px); borderRadius: 0.25rem; fontFamily: Inter;`
- Selected node: add `.glow-primary` style via `style` prop
- Edge styling: S-curve paths, 1.5px stroke, gradient from `indigo-electric` to `violet-glow`
- Background: dot-grid using React Flow `<Background variant="dots" gap={32} size={1} color="rgba(144, 143, 160, 0.3)" />`

## Task 5: Typography Scale
- Apply `font-display` to: page titles, project titles, node headers, brand text
- Apply `font-body` to: all body text, descriptions, metadata, form inputs, buttons
- Use provided font sizes via Tailwind arbitrary values or extend theme

## Task 6: Input & Button Refinement
- Inputs: `bg-zinc-950/80` with `border-b-2 border-outline`, focus state `border-violet-glow`
- Primary buttons: `bg-indigo-electric text-white rounded-md`
- Secondary buttons: transparent with `border border-indigo-electric text-indigo-electric`
- Ghost buttons: no border/bg, `text-indigo-electric`

## Out of Scope
- Mobile bottom-sheet navigation (requires routing restructure)
- Focus Mode manuscript view
- Slide-out metadata panel
- Writing mode line-height adjustments

## Validation
- Verify all pages render without console errors
- Confirm glassmorphism layers render correctly in browser
- Check React Flow canvas interactions (pan, zoom, connect) work with custom node styles
- Ensure text contrast meets accessibility standards
