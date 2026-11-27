## Run recipe

```
PLAYWRIGHT_CHROMIUM_PATH="<path-to-chrome-headless-shell>" npm run test:visual
```

- `PLAYWRIGHT_CHROMIUM_PATH` is only needed until the official Playwright chromium build is installed (`npx playwright install chromium`); unset it afterwards.
- Config: `playwright.visual.config.ts` (chromium only, starts or reuses `next dev` on port 3000, loads `.env` / `.env.local` for NEXTAUTH_SECRET).
- Baselines are win32 + chromium only (`*-chromium-win32.png`).
- Re-baseline: add `--update-snapshots`, e.g. `npm run test:visual -- --update-snapshots`. Delete the old PNG first when the change is tiny (under the 0.001 pixel tolerance), otherwise it is not rewritten.
- All `/api/**` calls are mocked (`mocks.ts`, `fixtures/public.json`); the run needs no database writes and no real sign-in.
