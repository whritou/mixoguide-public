# MixoGuide Mobile — Release & OTA Runbook

## Full Play Store Release

### Pre-flight checklist

- [ ] Bump `version` in `app.json` (semver: `1.0.0` → `1.1.0` for feature, `1.0.1` for patch)
- [ ] Bump `android.versionCode` in `app.json` by 1 (must always increase monotonically)
- [ ] `google-play-service-account.json` present at `mobile/google-play-service-account.json`
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set in EAS environment variables (Dashboard → project → env vars)
- [ ] CI passes (type-check, lint, tests)

### Build & submit

```bash
# From the mobile/ directory

# 1. Build signed AAB
npx eas build --profile production --platform android

# 2. Submit to Play Store internal track (once build completes)
npx eas submit --platform android --profile production
```

Both commands can be chained:
```bash
npx eas build --profile production --platform android --auto-submit
```

### Play Console manual steps (first release only)

1. **App listing** — Dashboard → app → Store listing
   - Title: `MixoGuide`
   - Short description: ≤ 80 characters
   - Full description: cocktail guide, recipes, pantry tracker
   - Screenshots: minimum 2 phone screenshots (1080×1920 or 1080×2400)
   - Feature graphic: 1024×500 px
2. **Content rating** — IARC questionnaire → declare alcohol content → 17+ / 18+ rating
3. **Privacy policy** — `https://mixoguide.com/privacy-policy`
4. **Data safety form** — declare:
   - Email address (account management)
   - Name (account management)
   - Device tokens (push notifications)
   - No location data, no contacts
5. **Internal testers** — add tester emails to the internal track before promoting

### Promotion track order

Internal → Closed → Open → Production

Do **not** promote until crash-free rate ≥ 99.5% (check Sentry or Play Console vitals).

---

## OTA Hotfix (JS-only, no store re-submit)

Use when the change is **JavaScript only** — no new native modules, no config plugin changes,
no `app.json` changes. If you're unsure, do a full release instead.

```bash
# Publish to production users
npx eas update --channel production --message "fix: <short description>"

# Publish to preview/QA users only
npx eas update --channel preview --message "fix: <short description>"
```

OTA updates are delivered on next app launch (`checkAutomatically: ON_LOAD`).
Runtime version is locked to `appVersion`, so an OTA update for `1.0.0` will never
be served to users on `1.1.0` — version bumps always require a new store build.

---

## OTA Rollback

### Option A — Roll back to a previous update

```bash
# List recent updates for the production channel
npx eas update:list --channel production

# Re-publish a specific update by its ID
npx eas update --channel production --republish --group <update-group-id>
```

### Option B — Emergency: force all users back to the embedded bundle

```bash
# Set rollout to 0% so no OTA update is served (users get the last store build's bundle)
npx eas channel:edit production --rollout-percent 0
```

Re-enable OTA once a fix is published:
```bash
npx eas channel:edit production --rollout-percent 100
```

---

## Version bump checklist (every release)

| File | Field | Rule |
|------|-------|------|
| `app.json` | `version` | semver — bump minor for features, patch for fixes |
| `app.json` | `android.versionCode` | integer — increment by 1, never skip, never reuse |

Example for a patch fix:
```json
"version": "1.0.1",
"android": {
  "versionCode": 2,
  ...
}
```
