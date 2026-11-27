# Design System + Velvet Room Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace colour-named `mg-*` classes with role-based tokens, keep light mode as approved, and ship the Velvet Room dark theme behind a Light / Dark / System switch.

**Architecture:** Two token layers in CSS: raw primitives (`--mg-*`, `--velvet-*`) and semantic tokens (`--canvas`, `--fg`, `--brand`…) defined in `:root` and `.dark`, exposed to Tailwind v4 via `@theme inline`. shadcn variables point at the semantic tokens. `next-themes` (class strategy) switches themes; dark stays locked off until every screen is migrated. Light mode is guarded by Playwright screenshots, contrast by a unit test, raw colours by a scanner test.

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui, next-themes, Vitest, Playwright, tsx scripts.

**Spec:** `docs/superpowers/specs/2026-11-26-design-system-dark-theme-design.md` (token table in §5.2 is the source of truth for every value). Visual reference: design system artifact https://claude.ai/artifact/U6mVtyzdE5BdsccnsxeW6f and screens canvas https://claude.ai/artifact/UnfKLyXzmrvzBnUz2nttZA.

## Global Constraints

- Web app only (`src/`). Do not touch `mobile/`, `src/lib/pdf/*` documents or email templates.
- Light values = spec §5.2 "Light" column exactly, including the five **AA** values (`fg-muted #756a60`, `success #606e51`, `warning #8f5c33`, `brand-soft-strong`/`ring #af895f`, `line-control #998e85`).
- Dark values = spec §5.2 "Dark (Velvet)" column; a dark value may be nudged only to pass contrast.
- Themes change colour only. No `dark:` variants in new code; no shape, spacing or font changes.
- Brand tokens are `brand*`; shadcn's `--accent` keeps its meaning (hover fill → `surface-hover`).
- Contrast: normal text ≥ 4.5:1; large text, meaningful icons, focus ring, control borders ≥ 3:1; both themes.
- Until Task 9, users can only get light (`forcedTheme="light"` unless `NEXT_PUBLIC_DARK_MODE` is `"preview"` or `"on"`).
- One PR per task (or per area inside Task 7/8) from a feature branch into `dev`. Never commit to `main`.
- Project rule: no comments except non-obvious constraints.

## Review Focus

1. A user with dark system setting loading any page: no white flash before hydration (`suppressHydrationWarning` + next-themes inline script). Task 3 test asserts the provider props; Task 8 `dark.spec.ts` screenshots catch a flash-styled first paint.
2. `text-white` on a photo or on a brand fill turned into `fg` (dark text on a photo in dark mode). Task 6 never auto-replaces `text-white`/`bg-white`; Task 8 classifies them and its dark screenshot of the cocktail grid catches mistakes.
3. Opacity modifiers (`bg-mg-ink/75`, `border-mg-caramel/25`) losing their `/NN` in the codemod. Task 6 unit test.
4. Variant prefixes (`hover:bg-mg-smoke`, `focus-visible:ring-mg-caramel`) losing their prefix. Task 6 unit test.
5. Native controls (date inputs, scrollbars, `<select>` popups) staying light in dark: `color-scheme` in `tokens.css` (Task 1), checked in Task 8 dark screenshots of the planner date field.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` (new) | Primitives, semantic tokens `:root` + `.dark`, `@theme inline` mapping, shadcn variable mapping |
| `src/app/globals.css` (modify) | Imports `tokens.css`; loses its old `@theme` palette and shadcn blocks |
| `src/styles/contrast-pairs.ts` (new) | Declared text/ground pairs and their minimum ratios |
| `src/lib/design/contrast.ts` (new) | `contrastRatio(a, b)` + `parseTokenBlocks(css)` |
| `src/providers/theme-provider.tsx` (new) | next-themes wrapper with the release gate |
| `src/components/ui/eyebrow.tsx`, `deco-divider.tsx` (new) | Jazz pieces |
| `src/components/ui/button.tsx` (modify) | `pill` variant |
| `src/components/layout/ThemeToggle.tsx` (new) | Light / Dark / System menu |
| `src/app/admin/design-system/page.tsx` (new) | Living reference |
| `scripts/design/mg-class-map.ts` (new) | 1:1 `mg-*` → semantic map + ambiguous list |
| `scripts/design/migrate-mg-classes.ts` (new) | Codemod over a directory |
| `scripts/design/find-raw-colors.ts` (new) | Scanner for raw colours (manual-pass report + guard) |
| `e2e/visual/light.spec.ts`, `e2e/visual/dark.spec.ts` (new) | Screenshot baselines |
| `tests/unit/design/*.test.ts` (new) | Contrast, codemod, scanner, components |
| `docs/design-system.md` (new) | Short token-role guide |

---

### Task 0: Repository and light baseline

**Files:**
- Create: `e2e/visual/light.spec.ts`, `e2e/visual/pages.ts`

**Interfaces:**
- Produces: `VISUAL_PAGES: { name: string; path: string; auth: boolean }[]` in `e2e/visual/pages.ts`, reused by `dark.spec.ts`.

- [ ] **Step 1:** Make sure the work happens in a git clone with `dev` checked out; create branch `feat/design-tokens`. If this folder is not a repo, stop and ask the owner which clone to use.
- [ ] **Step 2:** Write `pages.ts` with: home logged-out `/`, cocktails `/cocktails`, a cocktail detail (first seeded id), ingredients `/ingredients`, sign-in, and logged-in: home `/`, `/pantry`, `/planner`, `/stats`, `/admin/cocktails`. Logged-in pages reuse the login helper in `e2e/helpers`.
- [ ] **Step 3:** Write `light.spec.ts`: for each page, `await page.emulateMedia({ colorScheme: 'light' })`, wait for network idle, `await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, maxDiffPixelRatio: 0.001, animations: 'disabled' })`. Mask elements with live data (dates, counts) via `mask:`.
- [ ] **Step 4:** Run `npx playwright test e2e/visual/light.spec.ts --update-snapshots` against seeded dev DB (`pnpm db:seed`), then run again without the flag. Expected: all pass twice.
- [ ] **Step 5:** Commit baselines (`e2e/visual/light.spec.ts-snapshots/`).

### Task 1: Semantic tokens and contrast test

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/contrast-pairs.ts`, `src/lib/design/contrast.ts`, `tests/unit/design/contrast.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS custom properties named exactly as spec §5.2 tokens (`--canvas`, `--canvas-hover`, `--canvas-hover-alt`, `--surface`, `--surface-subtle`, `--surface-muted`, `--surface-muted-hover`, `--surface-hover`, `--surface-hover-alt`, `--surface-inverse`, `--fg`, `--fg-secondary`, `--fg-dim`, `--fg-muted`, `--fg-on-inverse`, `--fg-on-brand`, `--fg-on-image`, `--brand`, `--brand-soft`, `--brand-soft-strong`, `--brand-warm`, `--brand-gradient-from`, `--brand-gradient-to`, `--line`, `--line-strong`, `--line-control`, `--line-brass`, `--ring`, `--overlay`, `--success`, `--success-bg`, `--missing`, `--missing-bg`, `--warning`, `--warning-bg`, `--warning-accent`, `--danger`, `--danger-bg`, `--status-ready-dot`, `--status-partial-dot`, `--status-missing-dot`, `--chart-1..5`) and Tailwind colours `bg-canvas`, `text-fg-muted`, `border-line-control`… (each as `--color-<token>: var(--<token>)` in `@theme inline`). Utility `shadow-glow`.
- Produces: `contrastRatio(hexA: string, hexB: string): number`, `parseTokenBlocks(css: string): { light: Record<string,string>; dark: Record<string,string> }`, `CONTRAST_PAIRS: { fg: string; bg: string; min: 3 | 4.5 }[]`.

- [ ] **Step 1: Write the failing test** `tests/unit/design/contrast.test.ts`:

```ts
it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#81756a', '#fbf9f6')).toBeCloseTo(4.26, 1)
})
it.each(['light', 'dark'] as const)('every declared pair passes in %s', (theme) => {
    const blocks = parseTokenBlocks(readFileSync('src/styles/tokens.css', 'utf8'))
    for (const p of CONTRAST_PAIRS) {
        const ratio = contrastRatio(blocks[theme][p.fg], blocks[theme][p.bg])
        expect(ratio, `${p.fg} on ${p.bg} (${theme})`).toBeGreaterThanOrEqual(p.min)
    }
})
it('the old light fg-muted fails, proving the test bites', () => {
    expect(contrastRatio('#81756a', '#fbf9f6')).toBeLessThan(4.5)
})
```
- [ ] **Step 2:** Run `pnpm vitest run tests/unit/design/contrast.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement `contrast.ts` (WCAG relative luminance; `parseTokenBlocks` reads the first `:root {…}` semantic block and the `.dark {…}` block, hex values only; rgba tokens are skipped).
- [ ] **Step 4:** Write `contrast-pairs.ts`: 4.5 for `fg`, `fg-secondary`, `fg-dim`, `fg-muted` on each of `canvas`, `surface`, `surface-subtle`, `surface-muted`; `brand` on `canvas`, `surface`, `surface-muted`; `fg-on-brand` on `brand`; `success`/`missing`/`warning`/`danger` on their `-bg`; `danger` on `canvas` and `surface`; `fg-on-inverse` on `surface-inverse`. 3 for `brand-soft-strong`, `ring`, `line-control` on `canvas` and `surface`.
- [ ] **Step 5:** Write `tokens.css`: primitives (`--mg-*` with today's hex, `--velvet-*` with the dark hex), semantic `:root` (light) and `.dark` blocks with spec §5.2 values, `@theme inline` colour mapping, `@utility shadow-glow { box-shadow: var(--shadow-glow) }` with `--shadow-glow: none` light / `0 0 26px -6px rgb(214 178 110 / .45)` dark, `:root { color-scheme: light } .dark { color-scheme: dark }`. Keep the old `--color-mg-*` `@theme` entries for now (removed in Task 9). Import it from `globals.css` right after `@import "tailwindcss"`.
- [ ] **Step 6:** Run the contrast test. Expected: PASS. If a dark pair fails, nudge that dark value only and note it in the PR.
- [ ] **Step 7:** Run `npx playwright test e2e/visual/light.spec.ts`. Expected: PASS (nothing uses the new tokens yet).
- [ ] **Step 8:** Commit `feat(design): semantic colour tokens and contrast test`.

### Task 2: shadcn mapping, toasts and the approved light changes

**Files:**
- Modify: `src/styles/tokens.css` (shadcn block), `src/app/globals.css` (delete old shadcn `:root`/`.dark` blocks), `src/components/ui/*.tsx` (drop redundant `dark:` classes), `src/components/ui/sonner.tsx`

**Interfaces:**
- Consumes: Task 1 tokens.

- [ ] **Step 1:** In `tokens.css` map shadcn: `--background: var(--canvas)`, `--foreground: var(--fg)`, `--card`/`--popover: var(--surface)`, `--card-foreground`/`--popover-foreground: var(--fg)`, `--primary: var(--brand)`, `--primary-foreground: var(--fg-on-brand)`, `--secondary`/`--muted: var(--surface-muted)`, `--secondary-foreground: var(--fg)`, `--muted-foreground: var(--fg-muted)`, `--accent: var(--surface-hover)`, `--accent-foreground: var(--fg)`, `--destructive: var(--danger)`, `--border: var(--line)`, `--input: var(--line-control)`, `--ring: var(--ring)`, `--sidebar*` likewise, `--chart-1..5` brand-derived. Same block applies in both themes (values follow the semantic tokens).
- [ ] **Step 2:** Replace raw hex in `sonner.tsx` with tokens (`!bg-surface`, `!text-fg-secondary`, `!border-line`, `!text-danger`; action button uses the brand gradient and `!text-fg-on-brand`).
- [ ] **Step 3:** Remove `dark:` classes from `src/components/ui/*` that the tokens now cover (`grep -n "dark:" src/components/ui`). Expected afterwards: `grep -c "dark:" src/components/ui/*.tsx` all 0.
- [ ] **Step 4:** Run `npx playwright test e2e/visual/light.spec.ts`. Expected: FAIL only on pages using shadcn primitives (body background, primary buttons, admin) and on AA-nudged colours. Open the HTML report.
- [ ] **Step 5:** **Owner review:** send the report diff images to the owner. On approval, `--update-snapshots` and commit them in this PR. This is the new light baseline; from here on light diffs must be ≈ 0.
- [ ] **Step 6:** Commit `feat(design): theme shadcn and toasts from tokens`.

### Task 3: Theme provider with release gate

**Files:**
- Create: `src/providers/theme-provider.tsx`, `tests/unit/design/theme-provider.test.tsx`
- Modify: `src/app/layout.tsx`, `src/lib/env.ts`

**Interfaces:**
- Produces: `ThemeProvider({ children }: { children: React.ReactNode })`; `env.NEXT_PUBLIC_DARK_MODE: 'off' | 'preview' | 'on'` (default `'off'`); `isDarkModeAvailable(): boolean` (true for `'on'`, or `'preview'` when `NODE_ENV !== 'production'`).

- [ ] **Step 1: Write the failing test:** rendering `ThemeProvider` with `NEXT_PUBLIC_DARK_MODE=off` passes `forcedTheme="light"` to next-themes; with `on` passes `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange` and no `forcedTheme`. Mock `next-themes` and assert the props.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the provider and env entry; in `layout.tsx` add `suppressHydrationWarning` to `<html>` and wrap the body content (inside `AuthProvider`) with `ThemeProvider`.
- [ ] **Step 4:** Run the test and `npx playwright test e2e/visual/light.spec.ts`. Expected: PASS both.
- [ ] **Step 5:** Commit `feat(design): theme provider behind NEXT_PUBLIC_DARK_MODE`.

### Task 4: Jazz pieces

**Files:**
- Create: `src/components/ui/eyebrow.tsx`, `src/components/ui/deco-divider.tsx`, `tests/unit/design/jazz-pieces.test.tsx`
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Produces: `Eyebrow({ children, className }: { children: React.ReactNode; className?: string })` → `<span>` with `text-[10px] font-semibold uppercase tracking-[.28em] text-brand`; `DecoDivider({ className }: { className?: string })` → `aria-hidden` flex row: `line-brass` hairline, `◆` in `text-brand`, hairline; `buttonVariants({ variant: 'pill' })` → `rounded-full uppercase tracking-[.12em] text-[11px] bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand shadow-glow`.

- [ ] **Step 1: Write the failing test** with `renderToStaticMarkup`: Eyebrow output contains `tracking-[.28em]` and `text-brand`; DecoDivider has `aria-hidden="true"` and `◆`; `buttonVariants({ variant: 'pill' })` contains `rounded-full` and `shadow-glow`; default variant output unchanged from a snapshot taken before the edit.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the three pieces.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat(design): eyebrow, deco divider and pill button`.

### Task 5: Design system reference page

**Files:**
- Create: `src/app/admin/design-system/page.tsx`, `src/components/admin/design-system/TokenSwatches.tsx`, `docs/design-system.md`
- Modify: admin navigation (`src/components/app-sidebar.tsx`) to add "Design system"

**Interfaces:**
- Consumes: `parseTokenBlocks` is not used at runtime; the page reads tokens from a static list `DESIGN_TOKENS: { name: string; role: string }[]` exported from `src/styles/contrast-pairs.ts`'s sibling `src/styles/token-list.ts` (create it).

- [ ] **Step 1:** Write `token-list.ts` with every spec §5.2 token name and its role text. Add a unit test asserting every name in it exists in both blocks of `tokens.css` (reuse `parseTokenBlocks`; rgba tokens checked by name only).
- [ ] **Step 2:** Run the test. Expected: FAIL until the list is complete, then PASS.
- [ ] **Step 3:** Build the page (admin layout already gates access): two side-by-side panels, the second wrapped in `<div className="dark">`, each showing swatches (name, role, computed value via `getComputedStyle`), text samples, status pills, shadcn Button/Input/Select/Dialog trigger, Eyebrow, DecoDivider, a CocktailCard with sample data.
- [ ] **Step 4:** Write `docs/design-system.md` (≤ 1 page): two layers, "themes change colour only", decorative vs meaningful tokens, where to add a token, link to the artifact.
- [ ] **Step 5:** Run `pnpm type-check && pnpm lint`. Expected: no errors. Open `/admin/design-system` and check both panels render.
- [ ] **Step 6:** Commit `feat(design): admin design system page and guide`.

### Task 6: Codemod for `mg-*` classes

**Files:**
- Create: `scripts/design/mg-class-map.ts`, `scripts/design/migrate-mg-classes.ts`, `tests/unit/design/migrate-mg-classes.test.ts`

**Interfaces:**
- Produces: `MG_CLASS_MAP: Record<string, string>` (utility → utility, e.g. `'text-mg-ink': 'text-fg'`); `AMBIGUOUS: string[]`; `migrateClasses(source: string): { output: string; ambiguous: { line: number; token: string }[] }`; CLI `pnpm tsx scripts/design/migrate-mg-classes.ts <dir> [--write]` printing changed files and the ambiguous list.

Map (prefix stays: `bg-`, `text-`, `border-`, `ring-`, `from-`, `to-`, `via-`, `fill-`, `stroke-`, `outline-`, `divide-`, `placeholder-`, `shadow-`, `decoration-`):

| `mg-*` | becomes | note |
|---|---|---|
| `cream` | `canvas` | |
| `linen` | `surface-subtle` | |
| `parchment` | `surface-muted` | |
| `parchment-hover` | `surface-muted-hover` | |
| `smoke` | `surface-hover` | |
| `frost` | `surface-hover-alt` | |
| `haze` | `canvas-hover` | |
| `dusk` | `canvas-hover-alt` | |
| `ink` (text) | `fg` | `bg-mg-ink`, `via-mg-ink`, `from-mg-ink` → AMBIGUOUS |
| `charcoal` | `fg-secondary` | |
| `dim` | `fg-dim` | |
| `muted` | `fg-muted` | |
| `brown` | `brand` | `from-mg-brown` → `from-brand-gradient-from` |
| `caramel` | `brand-soft` | `text-`/`fill-` → AMBIGUOUS (may need `brand-soft-strong`); `ring-`/`outline-` → `ring`; `to-mg-caramel` → `to-brand-gradient-to` |
| `copper` | `brand-warm` | |
| `espresso` | AMBIGUOUS | |
| `sand` | `line` | `bg-mg-sand` → AMBIGUOUS (used as a fill) |
| `bone` | `line-strong` | `text-mg-bone` → `text-line-strong`; borders on inputs → AMBIGUOUS (`line-control`) |
| `sage` / `sage-light` | `success` / `success-bg` | |
| `rust` / `rust-light` | `missing` / `missing-bg` | |
| `amber` | `warning-accent` | `text-mg-amber` → `text-warning` |
| `amber-light` | `warning-bg` | |
| `danger` / `danger-light` | `danger` / `danger-bg` | |

- [ ] **Step 1: Write the failing tests:**

```ts
expect(migrateClasses('className="text-mg-ink bg-mg-cream"').output).toBe('className="text-fg bg-canvas"')
expect(migrateClasses('hover:bg-mg-smoke focus-visible:ring-mg-caramel').output).toBe('hover:bg-surface-hover focus-visible:ring-ring')
expect(migrateClasses('bg-mg-ink/75 border-mg-caramel/25').output).toBe('bg-mg-ink/75 border-brand-soft/25')
expect(migrateClasses('bg-mg-ink/75').ambiguous[0].token).toBe('bg-mg-ink/75')
expect(migrateClasses('from-mg-brown to-mg-caramel').output).toBe('from-brand-gradient-from to-brand-gradient-to')
expect(migrateClasses('text-mg-muted-foreground').output).toBe('text-mg-muted-foreground')
expect(migrateClasses('`${a ? "text-mg-sage" : "text-mg-rust"}`').output).toBe('`${a ? "text-success" : "text-missing"}`')
```
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement with one regex over `(^|[\s"'`:])((?:[a-z0-9-]+:)*)(<prefix>)-mg-([a-z-]+?)(\/\d+)?(?=[\s"'`]|$)`, looking up `prefix + '-mg-' + name` first, then the generic `mg-<name>` row; leave AMBIGUOUS tokens unchanged and report them with line numbers.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5:** Commit `chore(design): mg-* class codemod`.

### Task 7: Run the codemod, area by area

One PR per area, in this order: `src/components/ui`, `src/components/layout`, `src/components/home`, `src/app/(home)` + `src/app/(auth)`, `src/app/pantry` + `src/app/planner` + `src/app/stats` + `src/app/user`, `src/components` (rest), `src/app/admin`.

- [ ] **Step 1:** `pnpm tsx scripts/design/migrate-mg-classes.ts <area> --write`.
- [ ] **Step 2:** Resolve each reported AMBIGUOUS token by reading its context: `bg-mg-ink` band → `bg-surface-inverse` (+ its text → `text-fg-on-inverse`); `bg-mg-ink/75` on a photo → `bg-overlay`; meaningful caramel text/icon → `brand-soft-strong`; input/select/checkbox border → `border-line-control`; `bg-mg-sand` as a fill → `bg-line`; `espresso` → `brand` (hero gradient handled in Task 8).
- [ ] **Step 3:** Run `pnpm type-check && pnpm test:run && npx playwright test e2e/visual/light.spec.ts`. Expected: all PASS, light screenshots unchanged.
- [ ] **Step 4:** Commit `refactor(design): semantic tokens in <area>`.

### Task 8: Raw-colour scanner and manual pass

**Files:**
- Create: `scripts/design/find-raw-colors.ts`, `tests/unit/design/find-raw-colors.test.ts`, `e2e/visual/dark.spec.ts`
- Modify: files reported by the scanner; `.hero-gradient-animated` in `globals.css`; charts in `src/components/charts/*`

**Interfaces:**
- Produces: `findRawColors(source: string, file: string): { file: string; line: number; match: string; kind: 'mg-class' | 'palette-class' | 'white-black' | 'arbitrary-hex' | 'inline-hex' }[]`; `RAW_COLOR_ALLOWLIST: string[]` (file globs: `src/styles/tokens.css`, `src/lib/pdf/**`, `src/app/**/opengraph-image.tsx`).

- [ ] **Step 1: Write the failing tests:** flags `bg-white`, `text-white`, `text-black`, `text-stone-500`, `bg-red-50`, `bg-[#faf8f5]`, `'#78716c'` in a `.tsx`, any `-mg-` utility; does not flag `bg-surface`, `text-fg-on-image`, `#fff` inside an allowlisted file, or `white-space`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement. Run. Expected: PASS.
- [ ] **Step 3:** Write `dark.spec.ts` (same `VISUAL_PAGES`, `colorScheme: 'dark'`, `NEXT_PUBLIC_DARK_MODE=preview`), plus one assertion per page: no element larger than 200×200 px has a computed background with luminance > 0.8 (catches leftover white blocks).
- [ ] **Step 4:** Per area (same order as Task 7): run `pnpm tsx scripts/design/find-raw-colors.ts <area>`, classify each hit (card ground → `bg-surface`; text on photo → `text-fg-on-image`; text on brand → `text-fg-on-brand`; stone/red greys → nearest `fg-*`/`line*`/`danger*`; status dots → `bg-status-*-dot`), re-express `.hero-gradient-animated` and chart colours with tokens.
- [ ] **Step 5:** Run light visual (expect unchanged), then `npx playwright test e2e/visual/dark.spec.ts --update-snapshots`; review dark screenshots with the owner against the canvas; commit.
- [ ] **Step 6:** Commit per area `refactor(design): remove raw colours in <area>`.

### Task 9: Lock down and launch dark mode

**Files:**
- Create: `src/components/layout/ThemeToggle.tsx`, `tests/unit/design/no-raw-colors.test.ts`
- Modify: `src/app/globals.css` / `tokens.css` (drop `--color-mg-*` from `@theme`), `src/components/layout/Appbar.tsx`, `src/components/nav-user.tsx`, deployment env (`NEXT_PUBLIC_DARK_MODE=on`)

**Interfaces:**
- Produces: `ThemeToggle()` → icon button opening a menu with "Light", "Dark", "System" (`useTheme().setTheme`), current choice checked, `aria-label="Theme"`.

- [ ] **Step 1: Write the guard test:** scan every file under `src/` with `findRawColors`; expect `[]`.
- [ ] **Step 2:** Run. Expected: PASS (if not, fix the listed files).
- [ ] **Step 3:** Remove `--color-mg-*` entries from `@theme` (primitives stay as plain `--mg-*`). Run `pnpm build`. Expected: build succeeds and the guard still passes.
- [ ] **Step 4:** Add a unit test for `ThemeToggle` (three options, calls `setTheme('dark')` on click), implement it, render it in `Appbar` (desktop, next to the account avatar) and in the user menu.
- [ ] **Step 5:** Set `NEXT_PUBLIC_DARK_MODE=on` in `.env.example` and deployment config. Run both visual suites, `pnpm test:all`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(design): dark mode and theme switch`.
