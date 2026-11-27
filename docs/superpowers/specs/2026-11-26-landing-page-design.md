# MixoGuide landing page (logged-out) + "Can you make it?" on recipe pages

Date: 2026-11-26 · Scope: web app only. Depends on: [design system spec](2026-11-26-design-system-dark-theme-design.md), at least its phase 1 (semantic tokens, ThemeProvider, jazz pieces).
Visual design: on the "MixoGuide Screens" canvas (https://claude.ai/artifact/UnfKLyXzmrvzBnUz2nttZA), page "Landing page", artboards `Landing-Light` and `Landing-Dark` (Velvet Room) (interactive: the bottle demo works with a sample of 14 cocktails). That design is the reference for layout, copy and responsive behaviour.

Sequencing (my call): this work starts after design-system phase 1 is merged. While dark mode is behind the design system's release gate, the landing page ships in light; its dark version is verified with the same dark preview mechanism and goes live with the rest of dark mode.

## 1. Intent and why

Today's logged-out home (`src/app/(home)/page.tsx`: Hero, KPI strip, Instagram/Play banner, Features, Bar tools, Recommendations, CTA band) is a generic feature list. It tells visitors what MixoGuide does; it never lets them feel it, and the app's signature question, "what can I make with what I have?", is hidden behind sign-up.

The new page should feel like **a simple yet professional home bartender**: calm, precise, real measures, craft shown not claimed. Its goal: **the visitor finds a drink to make tonight**, using a pantry demo, and then **creates an account to unlock** their real pantry and planned cocktails + events.

## 2. Goals, non-goals, anti-goals

**Goals**
- A visitor gets a useful answer ("tonight you can make…") within ~30 seconds, without an account.
- Account creation is the natural next step, one tap (Google) from the demo, keeping what they ticked.
- The page also shows a public seasonal cocktail collection and promotes the Android app.
- The same "can I make it?" mechanism appears on public recipe pages, where most search traffic lands.
- Works in both themes; uses the jazz pieces (this is their first home).

**Non-goals**
- Changing the logged-in home (`TonightDashboard`).
- Guest-facing event invites (idea parked for a later project).
- "Social proof" usage counts (idea parked).
- Mobile app changes.

**Anti-goals**
- A demo whose promises the real app doesn't keep (the cocktails shown must be what the account will show for the same bottles).
- A wall of features, stats or marketing copy. If a section needs a paragraph to justify itself, it goes.
- Locking public content (recipes stay fully public and indexable).
- Losing what the visitor ticked when they sign up.

## 3. Decided with the owner

- Primary win: make a drink tonight via the pantry demo; account "unlocks" real pantry (300+ ingredients, quantities) and planned cocktails + events.
- Page shows: the demo (hero), an "unlock" section, a public cocktail collection, the Android app.
- Conversion ideas kept: (1) one-tap "Save my bar" with Google right under the demo results; (4) shareable bar card; (5) printable party menu shown as the planner "wow" (download needs an account); (6) desktop → phone QR to the Android app; (2) "Can you make it?" box on public recipe pages.
- Removed from today's page: KPI strip, three feature cards, bar-tools section, Instagram banner.
- Engine: **Approach A**, a public preview API that reuses the app's real matching.

## 4. Approaches considered (engine)

| | Approach | Trade-off | Decision |
|---|---|---|---|
| A | Public preview endpoint calling the existing `cocktailRepository.findMakeable(ingredientIds, maxMissing, derivationMap, …)` with visitor-supplied ingredient ids | Small server work; ~100 ms per change; identical answers to the logged-in app (substitutes/derivations included); also serves recipe pages and bar card | **Chosen** |
| B | Build-time JSON of 15 bottles → cocktails, matched in the browser | Instant, but a second copy of matching rules that drifts; no substitutes; cannot serve recipe pages | Rejected |
| C | Pre-computed answers per combination | 2^15 combinations; useless for recipe pages | Rejected |

## 5. The page (top to bottom)

Sketch; final layout comes from the canvas design.

0. **Hero (owner decision: the demo is not the hero).** Full-bleed bar photo (`public/hero.jpg`, the flamed Old Fashioned) with a dark scrim; identical in both themes. Headline "Tonight's drink is already on your shelf.", one line of copy, primary button "See what you can make" (scrolls to the shelf), secondary "Create a free account". A paper recipe card for the drink in the photo (real measures and method) sits bottom-right.
1. **First section: "What's on your shelf?"**
   - Heading + one line. ~15 common bottles/ingredients drawn as bottles standing on three labelled shelves (Spirits; Liqueurs, vermouth and bitters; Fresh and pantry); tapping fills the bottle (bourbon, rye, gin, white rum, vodka, tequila, Campari, sweet vermouth, dry vermouth, triple sec, limes, lemons, sugar syrup, Angostura, soda water; exact list: §9).
   - The results are a paper "tonight's menu" card beside the shelves (count, up to 3 drinks as menu lines, "and N more").
   - The seasonal collection further down is also a typographic menu list (name, dotted leader, time, ingredients) beside one photo, not a card grid.
   - Results update live beside/below: **"Tonight you can make"** = up to 3 cocktail cards (CocktailCard, real photos, link to public recipe), sorted like `getBestMakeable` (missing count, then rating). Count line: "You can make 14 cocktails".
   - **"One bottle away"**: the single ingredient that unlocks the most extra cocktails, with 2 names ("Add Campari → Negroni, Boulevardier").
   - Under results: **"Save my bar"** = Continue with Google (primary) + "or use email". Secondary: **"Share my bar"** (bar card).
   - Empty state (nothing ticked): pre-tick 3 example bottles so the first frame already shows results, clearly labelled as an example ("Example bar. Tick your own").
2. **Unlock: what an account adds.** Two brass-hairline cards:
   - *Your real pantry*: 300+ ingredients, quantities, running-low alerts, every match incl. substitutes.
   - *Planned cocktails & events*: guests, scaled recipes, grocery list, and the **printable party menu** as the visual (a rendered Velvet Room menu). "Download the menu" → sign-up.
   - One primary CTA: "Create your account" with `shadow-glow`.
3. **Collection: this season.** Current smart collection (`/api/smart-collections`, public via `withOptionalUser`; season picked by date, e.g. "Cozy Winter" now). 6–8 CocktailCards → public recipe pages. "See all cocktails" link.
4. **Android: "MixoGuide behind the bar".** Phone mockup of the app, Google Play badge (`PLAY_STORE_URL` in `src/lib/play-store.ts`), and on desktop a **QR code** to the Play Store ("Scan to continue on your phone"; your bar follows once you sign in).
5. Footer (existing).

Copy voice: the design system's (short, warm, concrete; no exclamation marks, no emoji).

## 6. Features in detail

### 6.1 Preview API
- `POST /api/cocktails/makeable-preview`, public (`withErrorHandler`, no session), rate-limited via `rateLimit` with a new `"makeable-preview"` config (proposal: 120 requests / 10 min per IP).
- Body (Zod): `{ ingredientIds: string[] (1–40, existing ids), maxMissing?: 0|1 (default 1) }`.
- Service: new `cocktailService.previewMakeable(ingredientIds, maxMissing)` → `cocktailRepository.findMakeable(ids, maxMissing, getDerivationMap(), limit)` with no quantities (treated as available). Sort like `getBestMakeable`.
- Response: `{ makeableCount, top: MakeableCocktail[] (≤ 8), oneBottleAway: { ingredient, unlocks: {id,name}[] } | null }`. `oneBottleAway` = the missing ingredient appearing in the most `missingCount === 1` results.
- Cacheable per sorted id list (Redis, short TTL) since it has no user data.
- Not used by logged-in users' real pantry (they keep `/api/cocktails/makeable`).

### 6.2 Keeping the ticked bar through sign-up
- Ticked ingredient ids are stored in `localStorage` (`mg:demo-bar`).
- After first sign-in (Google or email), a client effect on the logged-in home imports them once into the pantry (`POST /api/user-pantry-items` per id, or a new bulk endpoint if the builder prefers), then clears the key. Shows a toast: "Your bar is saved: 6 bottles".
- Only for a brand-new or empty pantry; never overwrites existing items.
- **Owner decision:** imported items are created as "have it, amount not tracked" (`isInPantry: true`, `isInfinite: true`), so `findMakeable` returns exactly the cocktails the demo promised. The pantry then nudges the user to add real amounts.
- Email sign-up can be verified on another device, which would lose `localStorage`. So the email registration request also carries the ticked ids (optional `demoBar: string[]` on the register body, validated against existing ingredients) and the server imports them when the account is created. Google sign-up happens on the same device and uses the client import. (My call.)

### 6.3 Bar card (share)
- Public route `/bar?i=<ids>` (ids short-encoded in the query), server-rendered: "This bar makes 14 cocktails · Signature: Old Fashioned" + the top cocktails + "Try it with your own bar" (→ landing demo pre-filled).
- Open Graph image via `next/og` `ImageResponse` in Velvet Room style, so links unfurl nicely in WhatsApp/Instagram/Slack.
- Nothing stored server-side; signature = top result.
- "Share" uses Web Share API on mobile, copy link on desktop.

### 6.4 Printable party menu
- New `@react-pdf` document `PartyMenuDocument` (beside `RecipeCardDocument`), Velvet Room look (dark ground, gold, Noto Serif), for a planned collection/event: event name, date, cocktails with one-line descriptions.
- Exposed for logged-in users on planned collections: `GET /api/planned-collections/[id]/menu/pdf` (pattern of the grocery PDF; `pdf-export` rate limit).
- Landing shows a static rendered example image of it; its button leads to sign-up.

### 6.5 Desktop → phone QR
- QR code to `PLAY_STORE_URL` rendered client-side (small QR lib or pre-generated SVG; builder's call). Desktop only; on mobile the Play badge is enough.

### 6.6 "Can you make it?" on recipe pages
- On public `src/app/(home)/cocktails/[id]` for **logged-out** visitors: a compact box listing this cocktail's ingredients as tick boxes. Ticking shows "You have 2 of 3 · Missing: Campari", using the same preview API (or simple client logic on this single recipe's ingredients plus the API for "with these you can also make…").
- Same "Save my bar" CTA and `mg:demo-bar` storage (ticks here and on the landing share one bar).
- Logged-in users see their real status as today.
- **Owner decision:** the recipe page stays client-rendered as it is today (`'use client'`); the box is a small addition. Moving the page to server rendering for SEO is a separate, later project.

## 7. Measuring success

- Track (existing analytics or simple server counters, builder's call): demo interaction rate, "Save my bar" clicks, sign-ups originating from landing vs recipe pages, bar-card shares and opens, QR scans (Play URL with a `referrer` param).
- Success = more sign-ups per logged-out visit than today's page; baseline captured before launch.

## 8. Accessibility and performance

- Bottle chips are real checkboxes/toggle buttons with labels; results region `aria-live="polite"`.
- First frame shows results (pre-ticked example), no empty hero.
- Hero images optimised (`next/image`); demo requests debounced (~250 ms).
- Both themes AA per the design system.

## 9. Left to the builder / open

- Exact demo bottle list (~15): pick the ingredients that maximise distinct makeable cocktails in the current catalogue; the list above is a starting point.
- Bulk import endpoint vs per-item POST.
- QR implementation.
- Analytics mechanism.
- Responsive layout details follow the canvas design.
