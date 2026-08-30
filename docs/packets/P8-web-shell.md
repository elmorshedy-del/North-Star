# P8 — Browser prototype: shell, routing, design tokens

**Depends on:** P1.
**You are building:** the frame the screens hang in. No skill logic, no sensors.

## Goal

A Vite + React + TypeScript app in `apps/web` that builds, typechecks, lints, and
serves a routed shell — ready for P9's adapters and P10's screens.

## Files you may create

Everything under `apps/web/`. You may add `apps/web` build scripts to the root
`package.json`.

## Files you must NOT touch

Anything in `packages/core/src`. Any `*.contract.ts` or `*.port.ts`.

## Constraints

- **React 19 + Vite + TypeScript.** No meta-framework: this is a static single-page
  app deployed to GitHub Pages, and Next.js would add a server that never runs.
- The app extends `tsconfig.base.json`. Strictness is not negotiable.
- **No UI component library.** Five screens do not justify the dependency, the
  bundle, or the design drift.
- `base` in `vite.config.ts` must be **`/North-Star/`** — GitHub Pages project
  paths are case-sensitive and the repository is `North-Star`, not `north-star`.
  Getting this wrong ships a blank page with 404s on every asset, which is the
  classic Pages failure and costs an hour to diagnose.
- The app imports core through the workspace package (`@north-star/core/application`),
  never by relative path into `packages/`.

## Design direction

This app is used **outdoors, at night, by someone whose eyes are dark-adapted.**
That is not a stylistic note; it is the governing constraint.

- **Dark theme is the default**, not a toggle. A white screen at night destroys
  night vision for twenty minutes and makes the sky unreadable — it would actively
  sabotage the thing the app is asking the user to do.
- Offer a **red-light mode**: red on near-black preserves dark adaptation. This is
  what actual astronomers use, and it is a genuine mark of taking the domain
  seriously.
- Large touch targets. The user is outdoors, possibly cold, probably one-handed,
  holding a phone at arm's length.
- High contrast, generous type. Do not go below 16px anywhere.
- Respect `prefers-reduced-motion`.

Define these as CSS custom properties in one place — colour, spacing, type scale,
radii. Screens consume tokens, never raw values.

## Routes

```
/                       Home — what the sky permits right now
/skill/:id              Teach — why, steps, common mistakes, safety
/skill/:id/measure      Measure — the input
/skill/:id/result       Result — the grade and the explanation
/calibrate              Hand calibration
/dev                    DevSky override panel (P11)
```

Use `react-router` with a hash or basename configuration that survives Pages
hosting. Stub each route with a placeholder naming itself; P10 fills them in.

## Acceptance tests

- `npm run build -w apps/web` succeeds
- The dev server serves the shell and every route renders its placeholder
- A component test asserts routing to each path
- A test asserts the design tokens are defined and the default theme is dark

## Definition of done

```
npm run verify
npm run build -w apps/web
```

Both green, output pasted. Confirm the Vite `base` is set for Pages, and say in
your handoff which value you used — P12 depends on it matching the deploy path.
