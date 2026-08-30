# P12 — End-to-end tests and the GitHub Pages deploy

**Depends on:** P10, P11.
**You are building:** the proof that the prototype works, and the link that puts it
on a phone.

## The point of this packet

Playwright can **override geolocation** (`context.setGeolocation`, with the
`geolocation` permission granted) and **inject synthetic device-orientation and
motion events** via `page.evaluate`. Combined with the DevSky panel from P11, that
means the entire browser prototype — sensors included — is verifiable headlessly in
CI, with no phone and no sky.

That is the main reason the web-first order was chosen, beyond letting a human open
a link.

## Files you may create

```
apps/web/playwright.config.ts
apps/web/e2e/*.spec.ts
.github/workflows/pages.yml
```

You may add an `e2e` script to the root `package.json` and an E2E step to
`.github/workflows/ci.yml`.

## Environment note

Chromium is pre-installed at `/opt/pw-browsers` with
`PLAYWRIGHT_BROWSERS_PATH` already set. **Do not run `playwright install`.** In CI,
install browsers with the standard action step or set `executablePath` explicitly.

## End-to-end journeys to cover

1. **Polaris, happy path.** Override to 51.5°N at a dark instant via DevSky → Home
   lists the Polaris skill as available → open it → read the teaching → measure by
   hand-span → submit → result shows a band, a signed error, and the pole
   correction.
2. **Sun time, happy path.** Override to Madrid, 2026-06-21 midday → sun skill
   available → measure → result shows the three-part solar-clock gap.
3. **Refusal explains itself.** Override to 51.5°N at midday → the Polaris skill is
   listed as unavailable, with a reason and a time to come back.
4. **Southern hemisphere.** Override to −33°S → Polaris is refused for the
   hemisphere reason, not the darkness one.
5. **Location denied.** Deny the permission → Home shows a real message and a way
   forward, not a spinner that never resolves.
6. **Device sighting.** Grant orientation, inject a synthetic gravity vector, and
   assert the displayed angle matches what P4's convention predicts. This is the
   only automated check that the sensor path is wired correctly end to end.
7. **Simulated banner.** With an override active, the banner is visible on every
   route; after reset it is gone.

## The deploy

`.github/workflows/pages.yml` — build `apps/web` and publish to GitHub Pages via
`actions/deploy-pages`, on pushes to the default branch.

- Requires `permissions: { pages: write, id-token: write }`.
- **HTTPS is a requirement, not a nicety.** Geolocation and motion sensors are
  unavailable in a non-secure context, so a Pages URL is what makes the prototype
  testable on a real phone at all.
- The Vite `base` comes from `pagesBasePath` in `@cnav/brand` and must match the
  repository name exactly, including its capitals. A mismatch ships a blank page
  with 404s on every asset — the classic Pages failure, and it reports no error.
  If the repository is ever renamed, `repositoryName` in that file is the only
  thing to change.

## Acceptance

- All seven journeys pass headlessly
- E2E runs in CI on every push
- The Pages deploy succeeds and the URL loads on a real phone

## Definition of done

```
npm run verify
npm run build -w apps/web
npm run e2e
```

All green, output pasted. **Put the deployed URL in your handoff** — that link is
the deliverable a human actually opens.

## After this packet

The prototype is real and shareable. What is left is a human standing outside on a
clear night checking that the latitude it grades them against is where they actually
are. **No amount of CI substitutes for that**, and it should be said plainly rather
than implied away.
