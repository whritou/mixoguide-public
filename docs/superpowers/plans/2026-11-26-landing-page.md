# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the logged-out home with the "Tonight's drink is already on your shelf" landing page: photo hero, working shelf demo backed by the real matching engine, one-tap "Save my bar", shareable bar card, party menu PDF, seasonal collection, Android section, plus a "Can you make it?" box on recipe pages.

**Architecture:** A public preview API reuses `cocktailRepository.findMakeable` so the demo promises exactly what an account delivers. The visitor's ticked bottles live in `localStorage` (`mg:demo-bar`) and are imported into the pantry after sign-up (client import for Google, server import on email registration). Landing UI is a set of focused components under `src/components/home/landing/`, styled only with design-system tokens and jazz pieces.

**Tech Stack:** Next.js 16 App Router, React Query, Prisma, Zod, `next/og`, `@react-pdf/renderer`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-landing-page-design.md`. Visual reference: canvas https://claude.ai/artifact/UnfKLyXzmrvzBnUz2nttZA (page "Landing page", artboards `Landing-Light`, `Landing-Dark`). 3D renders and their source: `docs/design/landing-3d/`.

**Depends on:** design-system plan Task 1–4 merged (semantic tokens, ThemeProvider, Eyebrow, DecoDivider, `pill` button). Can run in parallel with design-system Tasks 5–9.

## Global Constraints

- Layered rule: pages/hooks → API → service → repository. No Prisma or repository import outside repositories/services.
- Routes use `withPublic` / `withUser` / `withOptionalUser`; public routes pass `{ rateLimit: … }`.
- Recipes stay public; nothing in this plan gates recipe content.
- Copy voice: short, warm, concrete; sentence case; no exclamation marks, no emoji. Exact strings in tasks below are the copy.
- Styling: semantic tokens only (`bg-canvas`, `text-fg-muted`…); no raw hex outside `RAW_COLOR_ALLOWLIST` (OG image and PDF are allowlisted). Hero and Android band are dark in both themes by design and use `surface-inverse` / `fg-on-inverse`.
- Demo storage key: `mg:demo-bar`. Imported pantry items: `isInPantry: true`, `isInfinite: true`.
- Preview limits: 1–40 ingredient ids; `top` ≤ 8; rate limit `makeable-preview` = 120 requests / 600 s per IP.
- Recipe page stays client-rendered (`'use client'`); SSR is out of scope.
- One PR per task into `dev`.

## Review Focus

1. Visitor ticks only garnish-like items (e.g. only "Limes"): API returns `makeableCount: 0`, `top: []`, and `oneBottleAway` may still be useful; UI shows the empty copy, never an error. Test in Task 1 and Task 6.
2. Stale or foreign ids in `localStorage` (ingredient deleted, tampered value, non-array JSON): hook returns `[]` instead of throwing; import skips unknown ids. Tests in Task 3 and Task 4.
3. User who already has a pantry signs in on a device with a demo bar: nothing is imported or overwritten, key is still cleared. Test in Task 4.
4. Bar card link with a huge or malformed `i=` param: page renders the "Try it with your own bar" state, no 500. Test in Task 8.
5. Rapid ticking (10 taps in a second): one debounced request, earlier responses never overwrite newer state. Test in Task 6 (query key includes the sorted ids; React Query cancels stale).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/services/cocktail.service.ts` (modify) | `previewMakeable` |
| `src/validations/makeable-preview.validation.ts` (new) | Zod body |
| `src/app/api/cocktails/makeable-preview/route.ts` (new) | `POST` preview, `GET` demo bottles |
| `src/lib/demo-bar/demo-bottles.ts` (new) | The 15 demo bottles (name, shelf, image) |
| `src/lib/demo-bar/bar-param.ts` (new) | Encode/decode ids for `/bar?i=` |
| `src/hooks/useDemoBar.ts` (new) | `localStorage` state |
| `src/hooks/queries/useMakeablePreview.ts` (new) | React Query for the preview |
| `src/services/pantry.service.ts` (modify) | `importDemoBar` |
| `src/app/api/user-pantry-items/import-demo-bar/route.ts` (new) | Logged-in import |
| `src/components/home/DemoBarImporter.tsx` (new) | One-shot import after sign-in |
| `src/app/api/auth/register/route.ts` (modify) | Server import on email sign-up |
| `src/components/home/landing/*.tsx` (new) | Page sections |
| `public/landing/*.png` (new) | 3D renders, hero photos |
| `src/app/(home)/bar/page.tsx`, `opengraph-image.tsx` (new) | Shareable bar card |
| `src/lib/pdf/PartyMenuDocument.tsx`, `src/app/api/planned-collections/[id]/menu/pdf/route.tsx` (new) | Party menu PDF |
| `src/components/home/cocktails/CanYouMakeIt.tsx` (new) | Recipe page box |
| `e2e/landing.spec.ts` (new) | End-to-end flow |

---

### Task 1: `previewMakeable` service

**Files:**
- Modify: `src/services/cocktail.service.ts`
- Test: `tests/services/cocktail.service.test.ts`

**Interfaces:**
- Produces: `cocktailService.previewMakeable(ingredientIds: string[], maxMissing: 0 | 1 = 1): Promise<MakeablePreview>`; type `MakeablePreview = { makeableCount: number; top: MakeableCocktail[]; oneBottleAway: { ingredient: { id: string; name: string }; unlocks: { id: string; name: string }[] } | null }` exported from `src/types/models/cocktail.ts`.

- [ ] **Step 1: Write the failing tests** (mocked repo as in the file's existing `vi.hoisted` block):

```ts
it('counts only fully makeable cocktails and sorts them like getBestMakeable', async () => {
    mockCocktailRepo.findMakeable.mockResolvedValue([
        mk('a', 0, 4.1), mk('b', 1, 5, [{ id: 'campari', name: 'Campari' }]), mk('c', 0, 4.8),
    ])
    const r = await cocktailService.previewMakeable(['gin', 'lime'])
    expect(r.makeableCount).toBe(2)
    expect(r.top.map(c => c.id)).toEqual(['c', 'a'])
    expect(mockCocktailRepo.findMakeable).toHaveBeenCalledWith(['gin', 'lime'], 1, expect.anything(), 200)
})
it('picks the missing ingredient that unlocks the most cocktails', async () => {
    mockCocktailRepo.findMakeable.mockResolvedValue([
        mk('n', 1, 4, [C]), mk('b', 1, 4, [C]), mk('x', 1, 4, [V]),
    ])
    const r = await cocktailService.previewMakeable(['gin'])
    expect(r.oneBottleAway).toEqual({ ingredient: C, unlocks: [{ id: 'n', name: 'n' }, { id: 'b', name: 'b' }] })
})
it('returns an empty preview when nothing matches', async () => {
    mockCocktailRepo.findMakeable.mockResolvedValue([])
    expect(await cocktailService.previewMakeable(['lime'])).toEqual({ makeableCount: 0, top: [], oneBottleAway: null })
})
it('dedupes ids before querying', async () => { /* ['gin','gin'] → findMakeable called with ['gin'] */ })
```
  (`mk(id, missingCount, avgRating, missingIngredients = [])` builds a `MakeableCocktail`; `C = { id: 'campari', name: 'Campari' }`, `V = { id: 'vodka', name: 'Vodka' }`.)
- [ ] **Step 2:** Run `pnpm vitest run tests/services/cocktail.service.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement: dedupe, `findMakeable(ids, maxMissing, await getDerivationMap(), 200)` without quantities; `top` = `missingCount === 0`, sorted by rating then rating count, first 8; `oneBottleAway` from `missingCount === 1` results grouped by `missingIngredients[0].id`, largest group wins (ties: first seen), `unlocks` ≤ 2.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(landing): previewMakeable service`.

### Task 2: Preview API and demo bottles

**Files:**
- Create: `src/validations/makeable-preview.validation.ts`, `src/app/api/cocktails/makeable-preview/route.ts`, `src/lib/demo-bar/demo-bottles.ts`
- Modify: `src/lib/rateLimit.ts` (`"makeable-preview": { maxRequests: 120, windowSeconds: 600 }`), `src/services/ingredient.service.ts` (`findIdsByNames`)
- Test: `tests/integration/api-domain-routes.test.ts` (add a `describe`), `tests/unit/rateLimit.test.ts`

**Interfaces:**
- Consumes: `cocktailService.previewMakeable` (Task 1).
- Produces: `POST /api/cocktails/makeable-preview` body `{ ingredientIds: string[]; maxMissing?: 0 | 1 }` → `ApiResponse.success(MakeablePreview)`; `GET /api/cocktails/makeable-preview` → `ApiResponse.success(DemoBottle[])` with `Cache-Control: public, max-age=3600`; `type DemoBottle = { key: string; ingredientId: string | null; label: string; shelf: 'spirits' | 'modifiers' | 'fresh'; image: string }`; `DEMO_BOTTLES` (15 entries, key/label/shelf/image/ingredientName) in `demo-bottles.ts`; `ingredientService.findIdsByNames(names: string[]): Promise<Record<string, string>>`.

- [ ] **Step 1: Write failing integration tests:** POST with 3 ids → 200 and `data.makeableCount` from mocked service; POST `{ ingredientIds: [] }` → 400; 41 ids → 400; non-string ids → 400; GET → 15 bottles, each with `ingredientId` resolved from the mocked `findIdsByNames` (null when a name is unknown); 121st POST from one IP → 429.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement schema (`z.object({ ingredientIds: z.array(z.string().min(1).max(64)).min(1).max(40), maxMissing: z.union([z.literal(0), z.literal(1)]).optional() })`), the rate-limit entry, `findIdsByNames` (case-insensitive exact match via the ingredient repository), and the route with `withPublic(…, { rateLimit: 'makeable-preview' })`. `DEMO_BOTTLES` ingredient names: Bourbon, Rye whiskey, Gin, White rum, Vodka, Tequila, Campari, Sweet vermouth, Dry vermouth, Triple sec, Angostura bitters, Lime, Lemon, Simple syrup, Soda water — the implementer confirms each against the seeded catalogue (`pnpm db:studio`) and adjusts the name, not the list.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(landing): public makeable preview API`.

### Task 3: Demo bar storage hook and preview query

**Files:**
- Create: `src/hooks/useDemoBar.ts`, `src/hooks/queries/useMakeablePreview.ts`
- Modify: `src/lib/query-keys.ts` (`makeablePreview: (ids: string[]) => ['makeable-preview', [...ids].sort()]`, `demoBottles: ['demo-bottles']`)
- Test: `tests/unit/hooks/useDemoBar.test.ts`

**Interfaces:**
- Also creates `src/lib/demo-bar/bar-param.ts` (moved here because Task 6 links to the bar card): `encodeBarParam(ids: string[]): string` (sorted, deduped, joined with `.`, base64url); `decodeBarParam(param: string | null | undefined): string[]` (never throws; ≤ 40 ids; `[]` on garbage or param > 2 000 chars). Tests in `tests/unit/utils/bar-param.test.ts`: round-trip; order-insensitive; `'%%%'` → `[]`; 3 000-char param → `[]`; 50 ids → 40.
- Produces: `readDemoBar(): string[]`, `writeDemoBar(ids: string[]): void`, `clearDemoBar(): void` (all try/catch, key `mg:demo-bar`, JSON array of strings, max 40); `useDemoBar(initial: string[]): { ids: string[]; toggle(id: string): void; isExample: boolean }` — returns `initial` with `isExample: true` until the first toggle or when storage already has ids; `useMakeablePreview(ids: string[])` (React Query, `enabled: ids.length > 0`, 250 ms debounce on the ids); `useDemoBottles()`.

- [ ] **Step 1: Write failing tests** for the pure functions with a fake `localStorage`: round-trip; malformed JSON → `[]`; non-array → `[]`; non-string entries dropped; > 40 entries truncated; `localStorage` throwing → `[]` and no throw.
- [ ] **Step 2:** Run. Expected: FAIL. Implement. Run. Expected: PASS.
- [ ] **Step 3:** Commit `feat(landing): demo bar storage and preview hooks`.

### Task 4: Import the demo bar after sign-up

**Files:**
- Modify: `src/services/pantry.service.ts`, `src/app/api/auth/register/route.ts`, `src/app/(home)/page.tsx` (mount importer for logged-in users)
- Create: `src/app/api/user-pantry-items/import-demo-bar/route.ts`, `src/components/home/DemoBarImporter.tsx`, `src/validations/demo-bar.validation.ts`
- Test: `tests/services/pantry.service.test.ts`, `tests/integration/api-auth-routes.test.ts`, `tests/integration/api-domain-routes.test.ts`

**Interfaces:**
- Consumes: `readDemoBar`, `clearDemoBar` (Task 3).
- Produces: `pantryService.importDemoBar(userId: string, ingredientIds: string[]): Promise<{ imported: number }>`; `demoBarSchema = z.array(z.string().min(1).max(64)).max(40)`; `POST /api/user-pantry-items/import-demo-bar` body `{ ingredientIds: string[] }` → `{ imported: number }` (`withUser`, `rateLimit: 'bulk-add'`); register body accepts optional `demoBar: string[]`.

- [ ] **Step 1: Write failing service tests:** empty pantry + 3 valid ids → creates 3 items with `isInPantry: true, isInfinite: true` and returns `{ imported: 3 }`; unknown ids skipped (`imported` counts only existing ingredients); user with ≥ 1 pantry item → `{ imported: 0 }`, nothing created; makeable cache invalidated when `imported > 0`.
- [ ] **Step 2:** Write failing route tests: import route unauthenticated → 401, CSRF missing → 403, happy path → 200 `{ imported }`; register with `demoBar: ['gin']` → `importDemoBar(newUserId, ['gin'])` called after `userService.create`; register with invalid `demoBar` (string) → 400; register without `demoBar` → import not called.
- [ ] **Step 3:** Run. Expected: FAIL.
- [ ] **Step 4:** Implement service (one transaction; existence check via pantry repository count; ingredients validated via ingredient repository), route, register change (parse `demoBarSchema.optional()` from `body.demoBar` separately from `registerSchema`).
- [ ] **Step 5:** Implement `DemoBarImporter` (renders nothing; on mount with a session, reads the bar, posts once, clears the key on any 2xx, shows toast "Your bar is saved: {n} bottles" when `n > 0`, invalidates pantry and makeable queries). Mount it in the logged-in branch of `src/app/(home)/page.tsx`. Make the email sign-up form send `demoBar: readDemoBar()`.
- [ ] **Step 6:** Run all three test files. Expected: PASS.
- [ ] **Step 7:** Commit `feat(landing): carry the demo bar into the new account`.

### Task 5: Landing assets and hero

**Files:**
- Create: `public/landing/` (15 bottle/fruit PNGs + `shelf.png` from `docs/design/landing-3d/`, hero photos re-encoded as WebP ≤ 250 KB from `public/hero*.jpg`), `src/components/home/landing/LandingHero.tsx`, `RecipeCard.tsx`, `LandingNav.tsx`
- Test: `tests/unit/components/landing-hero.test.tsx`

**Interfaces:**
- Produces: `LandingHero()`; `RecipeCard({ name, time, lines, method }: { name: string; time: string; lines: { qty: string; item: string }[]; method: string })`.

- [ ] **Step 1: Write failing render test** (`renderToStaticMarkup`): hero contains h1 "Tonight's drink is already on your shelf.", a link to `#shelf` labelled "See what you can make", a link to `/register` labelled "Create a free account", the recipe card with "60 ml" / "bourbon", "1 tsp" / "demerara syrup", "2 dashes" / "Angostura bitters", method "Stir over ice, 30 seconds. Strain over one large cube. Flame an orange peel across the glass.", and an `img` whose alt describes the photo.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement matching the canvas: `next/image` fill + `priority` for the photo, dark scrim, `surface-inverse` ground, Noto Serif italic headline `clamp(44px, 5.6vw, 78px)`, gold primary button, the index-card recipe (cream paper, ruled lines via CSS gradients, red header line, Courier Prime via `next/font/google`, `rotate-2`, drop shadow). Nav: logo, Cocktails, Android app, Sign in, Create account.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(landing): hero and recipe card`.

### Task 6: Shelf demo and tonight's menu

**Files:**
- Create: `src/components/home/landing/ShelfDemo.tsx`, `ShelfRow.tsx`, `BottleToggle.tsx`, `TonightMenu.tsx`, `SaveMyBar.tsx`
- Test: `tests/unit/components/shelf-demo.test.tsx`

**Interfaces:**
- Consumes: `useDemoBottles`, `useDemoBar`, `useMakeablePreview` (Task 3); `DemoBottle`, `MakeablePreview`.
- Produces: `ShelfDemo()`; `BottleToggle({ bottle, pressed, onToggle })` → `<button aria-pressed>`; `TonightMenu({ preview, loading })`; `SaveMyBar({ ids })` (Google `signIn('google', { callbackUrl: '/' })`, "Use email instead" → `/register`, "Share my bar" → `/bar?i=…` via Task 8's `encodeBarParam`).

- [ ] **Step 1: Write failing render tests:** three shelves labelled "Spirits", "Liqueurs, vermouth and bitters", "Fresh and pantry"; a pressed bottle renders its image without the `grayscale` class, an unpressed one with `grayscale opacity-35`; `TonightMenu` with `makeableCount: 4` shows "4", "cocktails with what you have", three menu lines and "and 1 more"; with `makeableCount: 1` shows "cocktail with what you have"; with 0 shows "Nothing yet. Add a spirit, then something sour and something sweet."; `oneBottleAway` renders "One bottle away: add Campari and you can also make Negroni and Boulevardier."; results region has `aria-live="polite"`; hint reads "This is an example bar. Tap to make it yours." when `isExample`, else "Your bar stays on this device until you save it."
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement per canvas: bottles as `next/image` (unoptimized PNG, `h-[200px]`), shelf image under each row, paper menu card with `line-brass` border, Eyebrow "Tonight you can make", count in Noto Serif 72 px, DecoDivider, dotted-leader menu lines linking to `/cocktails/{id}`. Example bar = bourbon, gin, lemon, lime, simple syrup, Angostura.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(landing): shelf demo`.

### Task 7: Unlock, season collection, Android, page assembly

**Files:**
- Create: `src/components/home/landing/UnlockSection.tsx`, `SeasonCollection.tsx`, `AndroidSection.tsx`, `PhoneFrame.tsx`, `LandingPage.tsx`, `public/landing/party-menu.png` (render of Task 9's PDF, or the canvas menu until Task 9 lands)
- Modify: `src/app/(home)/page.tsx` (logged-out branch → `<LandingPage />`); delete `src/components/home/homepage/{HeroSection,KpiDashboard,InstagramHomepageBanner,HomePageBody,FeaturesSection,BarToolsSection,RecommendationsSection}.tsx` once unused
- Add dependency: `qrcode` (+ `@types/qrcode`) for a server-rendered SVG QR
- Test: `tests/unit/components/landing-sections.test.tsx`, `e2e/home.spec.ts` (update)

**Interfaces:**
- Consumes: `PLAY_STORE_URL` (`src/lib/play-store.ts`), `/api/smart-collections` (existing; returns in-season themes first).
- Produces: `SeasonCollection()` — first returned collection with a `season`, else the first; shows its `title`, `subtitle`, 6 cocktails as menu lines, link "Browse all cocktails". `AndroidSection({ qrSvg }: { qrSvg: string })`; Play link = `${PLAY_STORE_URL}&referrer=utm_source%3Dlanding`.

- [ ] **Step 1: Write failing render tests:** Unlock heading "Keep your bar. Plan the evening.", entries "Your real pantry" and "Planned cocktails and events", one link "Create your account" with `shadow-glow`; Android heading "MixoGuide behind the bar", Play link href contains `referrer=utm_source%3Dlanding`, QR has `role="img"` and `aria-label="QR code to the Google Play listing"`, QR hidden below `md`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement sections per canvas (phone frame with metal edge, side buttons, punch-hole camera, app screen inside). Generate the QR in `LandingPage` (server component) with `QRCode.toString(url, { type: 'svg', margin: 0 })`.
- [ ] **Step 4:** Assemble `LandingPage` in order: Nav + Hero, ShelfDemo (`id="shelf"`), UnlockSection, SeasonCollection (`id="collection"`), AndroidSection (`id="app"`), existing Footer. Swap it into `page.tsx`; remove the old homepage components and their imports.
- [ ] **Step 5:** Update `e2e/home.spec.ts` for the new page (old selectors gone).
- [ ] **Step 6:** Run unit tests, `pnpm type-check`, `pnpm lint`, `npx playwright test e2e/home.spec.ts`. Expected: PASS.
- [ ] **Step 7:** Commit `feat(landing): new logged-out home`.

### Task 8: Shareable bar card

**Files:**
- Create: `src/app/(home)/bar/page.tsx`, `src/app/(home)/bar/opengraph-image.tsx`, `src/components/home/landing/ShareBarButton.tsx`

**Interfaces:**
- Consumes: `encodeBarParam`, `decodeBarParam` (Task 3), `cocktailService.previewMakeable` (Task 1).
- Produces: page reads `searchParams.i`, calls `cocktailService.previewMakeable`, shows "This bar makes {n} cocktails", "Signature: {top[0].name}", top 3 menu lines, button "Try it with your own bar" → `/?bar={param}#shelf` (landing preloads that bar). `ShareBarButton({ ids })`: Web Share API when available, else copy link + toast "Link copied".

- [ ] **Step 1:** Implement page (server component calling the service is allowed: services, not repositories), its empty state ("Start your own bar" + link to `/#shelf`) and the OG image (1200×630, Velvet Room: `#120d0e` ground, gold eyebrow, cream serif count, bottle renders from `public/landing`). Handle `?bar=` on the landing by seeding `useDemoBar` from it.
- [ ] **Step 2:** Add a Playwright check in `e2e/landing.spec.ts` (created here, extended in Task 11): `/bar?i=garbage` returns 200 and shows "Start your own bar"; `/bar?i=<encoded example>` shows "This bar makes".
- [ ] **Step 3:** Run `pnpm build`, the Playwright check, and open `/bar/opengraph-image?i=…`. Expected: PASS and the image renders.
- [ ] **Step 4:** Commit `feat(landing): shareable bar card`.

### Task 9: Party menu PDF

**Files:**
- Create: `src/lib/pdf/PartyMenuDocument.tsx`, `src/app/api/planned-collections/[id]/menu/pdf/route.tsx`
- Modify: planner collection actions (where the grocery PDF button lives) to add "Print the menu"
- Test: `tests/integration/api-domain-routes.test.ts`

**Interfaces:**
- Consumes: `plannedCollectionService.getById`, `assertOwnership` (as the grocery PDF route does).
- Produces: `PartyMenuDocument({ title, plannedFor, cocktails }: { title: string; plannedFor: Date | null; cocktails: { name: string; ingredients: string[] }[] })`; `GET …/menu/pdf` → `application/pdf`, filename `<slug>-menu.pdf`.

- [ ] **Step 1: Write failing route tests** mirroring the grocery PDF tests: unauthenticated 401, other user's collection 403, rate limit `pdf-export`, happy path 200 with `content-type: application/pdf`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the document (dark `#120d0e` page, gold date line in spaced capitals, italic serif title, ◆ divider, cocktail name + comma-joined ingredients, register Noto Serif via `Font.register`) and the route (pattern of `grocery/pdf/route.tsx`).
- [ ] **Step 4:** Run. Expected: PASS. Download one PDF manually and compare with the canvas menu.
- [ ] **Step 5:** Export page 1 to `public/landing/party-menu.png` for the landing; commit `feat(planner): printable party menu`.

### Task 10: "Can you make it?" on recipe pages

**Files:**
- Create: `src/components/home/cocktails/CanYouMakeIt.tsx`
- Modify: `src/app/(home)/cocktails/[id]/page.tsx` (render for `authStatus === 'unauthenticated'`, below the ingredients)
- Test: `tests/unit/components/can-you-make-it.test.tsx`

**Interfaces:**
- Consumes: `useDemoBar`, `useMakeablePreview`, `SaveMyBar` (Task 6).
- Produces: `CanYouMakeIt({ ingredients }: { ingredients: { id: string; name: string }[] })`.

- [ ] **Step 1: Write failing render tests:** a checkbox per ingredient, pre-checked from the stored bar; with 2 of 3 checked shows "You have 2 of 3. Missing: Campari."; with all checked shows "You can make it tonight."; shows "With these you can also make {n} cocktails" from the preview when `n > 0`; includes `SaveMyBar`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement (toggling writes to the shared `mg:demo-bar`). Run. Expected: PASS.
- [ ] **Step 3:** Commit `feat(recipes): can-you-make-it box for visitors`.

### Task 11: End-to-end flow

**Files:**
- Create: `e2e/landing.spec.ts`

- [ ] **Step 1:** Write tests: logged-out `/` shows the hero and, after scrolling to `#shelf`, the example count; tapping "White rum" changes the count and the menu; reload keeps the tapped state; "Share my bar" link opens `/bar?i=…` with the same count; a recipe page shows the box with the same bottles pre-checked; register with email (test helper) then sign in → toast "Your bar is saved" and `/pantry` lists the bottles; `/` with dark color scheme and `NEXT_PUBLIC_DARK_MODE=preview` has no element > 200×200 px with a near-white background outside the hero photo.
- [ ] **Step 2:** Run `npx playwright test e2e/landing.spec.ts`. Expected: PASS.
- [ ] **Step 3:** Commit `test(landing): end-to-end flow`.
