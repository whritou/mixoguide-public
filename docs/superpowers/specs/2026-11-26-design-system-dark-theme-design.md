# MixoGuide design system: semantic tokens + "Velvet Room" dark theme

Date: 2026-11-26 · Scope: web app only (`/`, Next.js). Mobile (`mobile/`) is out of scope.
Follow-up (separate spec): new landing page for logged-out visitors, built on this system.

## 1. Intent and why

MixoGuide is used at home and in bars, often at night in dim light. Today's warm cream/brown light theme is bright in that setting. We want:

- a **dark theme** that feels like a **jazz club after hours: classy, warm, "Velvet Room"**: near-black with burgundy-velvet undertones, gold/brass accents, cream text;
- a **proper design system** underneath, so both themes stay in sync and future screens (starting with the new landing page) are built on it. The owner explicitly asked for good practice even if it means rewriting more code.

## 2. Goals, non-goals, anti-goals

**Goals**
- Semantic, role-based color tokens (surface, text, line, brand, status…) that every component uses.
- Light theme: **looks like today** after migration (same shapes, same type, same values), except for two deliberate, owner-approved changes made in phase 1: shadcn components take the brand look (§5.3), and a few light colors are darkened slightly to pass WCAG AA (§5.6).
- Dark theme: Velvet Room palette, applied through the same tokens. Every screen (public, user, planner, pantry, stats, admin) works in dark.
- Theme switching: follows the OS setting by default, with a manual Light / Dark / System toggle.
- shadcn/ui components (`src/components/ui/*`) themed from the same tokens (today they use stock neutral grey).
- Shared, opt-in "jazz" pieces usable in both themes (see §6).
- A living reference page showing tokens and components in both themes.
- Guard rails so raw colors don't creep back.

**Non-goals**
- Mobile app theming.
- Redesigning the landing page (next spec).
- Changing shapes, fonts, spacing or layout of existing screens.
- PDF exports (`@react-pdf/renderer`) and emails: they stay light.

**Anti-goals (failure even if it "works")**
- Light theme drifts visibly from today beyond the two approved changes.
- Dark mode with bright white blocks, white flashes on load (FOUC), or unreadable low-contrast text.
- Dark mode exposed to users while half the screens are still light-only.
- Two parallel color systems living on indefinitely (old `mg-*` utilities next to new tokens).

## 3. Current state (recon)

- Tailwind v4, tokens in `src/app/globals.css`. Brand palette `--color-mg-*` is **named by color, not role** (`mg-ink`, `mg-cream`, `mg-sand`…), used ~2,000 times in 134 files (`text-mg-muted` 378, `text-mg-ink` 253, `text-mg-brown` 216, `border-mg-sand` 178…).
- `mg-ink` is used both as text and as a dark background; `bg-white` ×225, `text-white` ×147 (many on photos/overlays, many as card backgrounds).
- Stray colors: Tailwind `stone-*`, `red-*`, `emerald/amber/orange-400` status dots (`CocktailCard.tsx`), 68 arbitrary `[#hex]` classes, raw hex in 35 `.tsx` files (incl. `sonner.tsx` toasts, charts).
- shadcn `:root` / `.dark` blocks are stock neutral; `dark:` variants exist only inside 9 `components/ui` files.
- `next-themes` is installed but no provider is mounted; only `sonner.tsx` calls `useTheme`.
- `.hero-gradient-animated` uses `mg-*` colors directly.
- Project is **not a git repository** locally (this spec is saved but not committed).

## 4. Approaches considered

| | Approach | Trade-off | Decision |
|---|---|---|---|
| A | **Semantic role tokens** over the existing palette; light keeps today's values, dark redefines the roles; migrate all classes | Most rewriting (~2,400 class edits, mostly scriptable), but one source of truth and both themes stay in sync | **Chosen**: owner wants good practice even at higher rewrite cost |
| B | Redefine `mg-*` values under `.dark` | Fast, but names become lies ("cream" is dark), `mg-ink`-as-background inverts wrongly, `white` stays white | Rejected |
| C | Add `dark:` variants to every class | Explicit but doubles class lists; every future screen must remember both themes; drift-prone | Rejected |

Dark mood explored visually (`.superpowers/brainstorm/`): Espresso, Candlelight, Leather & brass, then jazz variants Midnight set, **Velvet room**, Smoke & brass. **Owner chose Velvet room.**

Jazz details scope: **shared, opt-in pieces** (owner's choice), not a house-style change and not dark-only.

## 5. The design

### 5.1 Token architecture (two layers)

1. **Primitives** (raw palette, never used in components): `--mg-*` CSS variables, e.g. `--mg-cream: #fbf9f6`, plus new Velvet primitives (`--velvet-950`, `--gold-400`…). At the end of migration they are **not** exposed as Tailwind `--color-*` theme values, so `bg-mg-*` utilities stop existing.
2. **Semantic tokens**: CSS variables defined in `:root` (light) and `.dark` (Velvet), exposed to Tailwind via `@theme inline` as colors (`bg-surface`, `text-fg-muted`, `border-line`…). Components use **only** these.

Theme = colors only. Radius, spacing, fonts, shadows' geometry are shared across themes.

### 5.2 Semantic token set and values

Light values are today's hex values, except the ones marked **AA**, which are darkened just enough to pass contrast (today's value shown in brackets). Dark values are the Velvet Room palette from the approved mockup; the builder may nudge dark values to hit contrast targets (§5.6) but must keep the character: near-black with burgundy undertone, gold accent, cream text.

| Token | Role | Light (today) | Dark (Velvet) |
|---|---|---|---|
| `canvas` | page background | `#fbf9f6` (cream) | `#120d0e` |
| `surface` | cards, panels (replaces card `bg-white`) | `#ffffff` | `#1d1416` |
| `surface-subtle` | section bands (linen) | `#f5f0eb` | `#181012` |
| `surface-muted` | pill/stepper containers (parchment) | `#f2ede4` | `#2a1a1e` |
| `surface-muted-hover` | hover on muted (parchment-hover) | `#e7dfd4` | `#36232a` |
| `surface-hover` | hover over surface (smoke) | `#f5f3f0` | `#251a1d` |
| `surface-hover-alt` | hover over surface (frost) | `#f8f6f4` | `#221719` |
| `canvas-hover` | hover over canvas (haze) | `#f5f1ec` | `#1f1517` |
| `canvas-hover-alt` | hover over canvas (dusk) | `#f1ede8` | `#231819` |
| `surface-inverse` | deliberately dark bands (`bg-mg-ink`) | `#1b1c1a` | `#0a0708` |
| `fg` | primary text (ink) | `#1b1c1a` | `#f2e6d6` |
| `fg-secondary` | body text (charcoal) | `#4f453b` | `#d9c9b6` |
| `fg-dim` | deep muted text (dim) | `#6b6258` | `#b5a397` |
| `fg-muted` | secondary/meta text (muted) | **AA** `#756a60` (`#81756a`) | `#a8958e` |
| `fg-on-inverse` | text on `surface-inverse` | `#ffffff` | `#f2e6d6` |
| `fg-on-brand` | text on accent fills | `#ffffff` | `#1a1009` |
| `brand` | brand primary (brown → gold) | `#7a5830` | `#d6b26e` |
| `brand-soft` | caramel fills, gradients, decorative highlights | `#bc9366` | `#e6c88a` |
| `brand-soft-strong` | caramel used as meaningful icon/text color (filled favourite star, "x / y ingredients" highlight) | **AA** `#af895f` (`#bc9366`) | `#e6c88a` |
| `brand-warm` | copper recipe-step accent | `#c28355` | `#d99a6c` |
| `brand-gradient-from/to` | brand gradient (`from-mg-brown to-mg-caramel`) | `#7a5830` → `#bc9366` | `#b8924f` → `#e6c88a` |
| `line` | default border/divider (sand) | `#e4e2df` | `#33232a` |
| `line-strong` | stronger decorative borders/separators (bone) | `#d3c4b7` | `#4a3238` |
| `line-control` | borders that identify form controls (input, select, checkbox, radio, switch off-state) | **AA** `#998e85` (`#d3c4b7`) | `#7b6369` |
| `line-brass` | brass hairline (new, opt-in) | `rgb(188 147 102 / .45)` | `rgb(214 178 110 / .35)` |
| `ring` | focus ring (caramel) | **AA** `#af895f` (`#bc9366`) | `#d6b26e` |
| `overlay` | scrim/badge on photos (`mg-ink/75`) | `rgb(27 28 26 / .75)` | `rgb(10 7 8 / .75)` |
| `fg-on-image` | text on photos | `#ffffff` | `#f4ead9` |
| `success` / `success-bg` | ready / in pantry (sage) | **AA** `#606e51` (`#6a7a5a`) / `#e8ece0` | `#a8bf94` / `#1f2619` |
| `missing` / `missing-bg` | missing ingredient (rust) | `#a8472a` / `#f4dfd4` | `#ee9a86` / `#3a1b1e` |
| `warning` / `warning-bg` | partial / out of stock text on its pill (amber) | **AA** `#8f5c33` (`#d0854a`) / `#f2e6d2` | `#e6a86f` / `#33241a` |
| `warning-accent` | amber as a non-text accent (icons, bars, dots) | `#d0854a` | `#e6a86f` |
| `danger` / `danger-bg` | errors, destructive | `#ba1a1a` / `#ffdad6` | `#f2a198` / `#3d1a1c` |
| `status-ready-dot` / `-partial-dot` / `-missing-dot` | dots on image badges | emerald-400 / amber-400 / orange-400 | same (they sit on `overlay`) |
| `chart-1..5` | chart series | brand-derived, builder picks; must pass contrast on `surface` in both themes | |

Additional rules:
- `color-scheme: light` / `dark` set on `<html>` so native controls and scrollbars follow.
- Shadows: in dark, keep geometry but use black at higher opacity; the accent "glow" (`0 0 26px -6px` gold) is available as a `shadow-glow` utility for primary CTAs, opt-in.
- `.hero-gradient-animated` is re-expressed with tokens (dark version: velvet → burgundy → gold).

### 5.3 shadcn/ui mapping

Replace the stock neutral `:root` / `.dark` shadcn variables with references to the semantic tokens, e.g. `--background: var(--canvas)`, `--card: var(--surface)`, `--primary: var(--brand)`, `--primary-foreground: var(--fg-on-brand)`, `--muted-foreground: var(--fg-muted)`, `--border: var(--line)`, `--input: var(--line-control)`, `--ring: var(--ring)`, `--destructive: var(--danger)`, `--accent: var(--surface-hover)` (shadcn's accent = subtle hover fill), `--sidebar-*` similarly. Note: shadcn variables are used directly in ~14 files outside `components/ui` (admin pages, data table, `Appbar.tsx`, `PantryTableRow.tsx`) and `<body>` uses `bg-background`. **Owner decision:** this mapping applies in light too, so in light the body background becomes cream, shadcn primary buttons become brand brown, and admin pages / data tables / those 14 files take the warm palette. This is a deliberate visual change, reviewed as such (§5.9). Remove the hard-coded `dark:` variants in `components/ui/*` where tokens make them redundant. Toasts (`sonner.tsx`) move from raw hex to tokens.

### 5.4 Theme switching

- Mount `next-themes` `ThemeProvider` in the root layout: `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`; add `suppressHydrationWarning` on `<html>`. This prevents load flashes.
- Toggle (Light / Dark / System) in the Appbar and in the user menu.
- **Release gate:** until the whole migration is done, the provider forces `light` (`forcedTheme="light"`) and the toggle is hidden; dark can be previewed in development (e.g. env flag or a query param). Builder chooses the preview mechanism.

### 5.5 Jazz pieces (shared, opt-in, both themes)

Small components/utilities, used first on the landing page; existing screens are not changed to use them:
- `Eyebrow`: small spaced capitals label above a heading (`text-[10px] tracking-[.28em] uppercase text-brand`).
- `DecoDivider`: hairline - ◆ - hairline in `line-brass`.
- `border-line-brass` hairline borders and `shadow-glow` for hero CTAs.
- Optional `Button` variant `pill` (rounded-full, spaced caps) as a new variant; the default variant keeps today's shape.

### 5.6 Accessibility

- **Owner decision: both themes must pass.** All text/background token pairs meet WCAG 2.1 AA (4.5:1 normal text, 3:1 large text, meaningful icons, focus ring and control borders) in both themes. The light values that failed today are darkened in §5.2 (marked **AA**); computed results: `fg-muted` ≥ 4.5 on canvas/surface/surface-subtle/surface-muted, `success`/`warning` ≥ 4.5 on their pill backgrounds, `ring`/`brand-soft-strong`/`line-control` ≥ 3 on canvas and surface. Dark `line-strong` stays decorative; dark `line-control` `#7b6369` passes 3:1.
- Enforced by a unit test that computes contrast for a declared list of pairs (the list lives next to the tokens). Purely decorative pairs (`line`, `line-strong`, `line-brass`, `brand-soft` fills) are excluded by declaration.
- When migrating, each use of `mg-caramel`/`mg-amber`/`mg-bone` is classified: decorative → `brand-soft`/`warning-accent`/`line-strong`; meaningful text/icon/control border → `brand-soft-strong`/`warning`/`line-control`.
- Focus ring visible in both themes.

### 5.7 Migration of existing code

1. **Foundation:** add tokens, Velvet primitives, shadcn mapping, ThemeProvider (forced light), jazz pieces, reference page. The only light changes allowed are the two approved ones (shadcn re-skin, AA nudges); everything else pixel-identical.
2. **Codemod:** a script replaces `mg-*` utility classes with their semantic equivalents via an explicit 1:1 map (e.g. `text-mg-ink → text-fg`, `bg-mg-cream → bg-canvas`, `border-mg-sand → border-line`, `from-mg-brown → from-brand-gradient-from`). Class prefixes (`hover:`, `/75` opacity, etc.) are preserved. Ambiguous cases (`bg-mg-ink`, `text-mg-bone` used as a separator, etc.) are listed for manual review, not auto-replaced.
3. **Manual pass:** `bg-white` / `text-white` / `stone-*` / `red-*` / arbitrary hex / inline hex in charts and toasts. Each is classified: card surface → `surface`; text on a photo → `fg-on-image`; text on accent → `fg-on-brand`; etc. Admin panel included.
4. **Lock down:** stop exposing primitives as Tailwind colors (`bg-mg-*` no longer compiles to anything); add a lint/test check that fails on `mg-` utility classes, arbitrary `[#hex]` colors, `bg-white`/`text-black`, and Tailwind palette colors (`stone-`, `red-`…) in `src/` outside an allowlist (e.g. status dots defined in the token file). Then remove the release gate: dark mode and System default go live.

### 5.8 Design system reference page

Admin-only route (`/admin/design-system`) that renders: every semantic token as a swatch (name, light and dark value), text-on-surface samples, status pills, shadcn components (button variants, input, select, dialog, toast), the jazz pieces, and a cocktail card, with a side-by-side or toggle view of both themes. Plus a short `docs/design-system.md` explaining token roles and the "colors only differ by theme" rule.

### 5.9 Verification

- **Light:** Playwright screenshots of key pages (home logged-out, cocktails list, cocktail detail, pantry, planner, stats, an admin CRUD page, sign-in) captured **before** any change.
  - After phase 1 the diff is expected where shadcn re-skin and AA nudges apply; the owner reviews that diff once and approves it, and those screenshots become the **new baseline**.
  - From phase 2 on (codemod, manual pass, lock down), diff against the new baseline must be ≈ 0 (anti-aliasing only).
- **Dark:** same pages captured in dark; reviewed by the owner; no `#fff`-ish backgrounds left (automatable check on computed styles of large elements is a nice-to-have).
- Contrast test (§5.6), existing Vitest/Playwright suites stay green.

## 6. Decided by the owner

- Approach A (semantic tokens, full migration, good practice over less rewriting).
- Dark mood: warm "lounge at night" for dim-bar use; final pick **Velvet room**.
- Jazz details: shared, opt-in pieces; existing light look unchanged.
- shadcn components re-skinned with the brand palette in light too (body cream, primary brown, admin warm).
- WCAG AA in both themes: failing light colors darkened slightly.
- Mobile: nothing to do.

## 7. My calls (owner can override)

- next-themes, default = System, toggle in Appbar + user menu.
- Dark hidden behind a release gate until migration is complete.
- Primitives hidden from Tailwind after migration; lint/test guard.
- Reference page as an admin-only route + short markdown doc.
- Near-duplicate hover tints (smoke/frost, haze/dusk) are **kept 1:1** (`*-hover` / `*-hover-alt`) so the light screenshot baseline stays exact; merging them is a later, optional cleanup.
- Brand tokens are named `brand*` (not `accent`) so they don't collide with shadcn's `accent`, which means a subtle hover fill.
- PDFs/emails stay light.
- AA fixes split tokens instead of darkening every use: `brand-soft` vs `brand-soft-strong`, `warning` vs `warning-accent`, `line-strong` vs `line-control`, so decorative caramel/amber/bone keep today's look.
- Exact AA values computed as the smallest darkening of today's hue that passes.

## 8. Left to the builder

- Exact Tailwind naming syntax inside `@theme inline`, file split of the tokens (one file vs `tokens.css`).
- Chart series colors (within contrast rule).
- Dark preview mechanism during the release gate.
- Order of screens in the manual pass; how to batch the codemod.
- Small dark-value nudges to pass contrast.
