# 00 — What this is

## The idea

Wayfinding and timekeeping by sun, moon and stars is a skill humans relied on for
thousands of years, and almost nobody alive has tried it. This app makes people try
it.

There are many planetarium apps. Every one of them *shows* you the sky. **None of
them makes you do something and then tells you how wrong you were.** That is the
entire gap this product occupies, and the reason it is not a fifth star chart.

## The core loop

The live sky is the exercise generator. Your position and the current time are the
answer key — the phone already knows the truth and simply refuses to say it until
you have committed to a guess.

> Go outside → measure with your hands or the phone → guess → get graded → find out
> what the sky was actually doing.

## Two modes, one engine

**Practice.** Challenges drawn from what is genuinely visible from where you are
standing, right now.

**Voyage** (later). Real historical voyages — Cook's *Endeavour*, Columbus in 1492,
Worsley navigating the *James Caird* 800 miles across the Southern Ocean on four
sextant sights — replayed as the same navigation problems, using the voyage's real
dates and positions instead of yours. It answers "why does this matter" by showing
the skill you practised in your garden carrying a ship across an ocean.

Both modes run the same code. A skill challenge is a pure function of *(position,
instant)*; voyage mode simply supplies a different pair. That is the architectural
spine, and it is described in `docs/01-architecture.md`.

## Honest positioning

**The practical utility is thin, and we do not pretend otherwise.** A phone with GPS
beats Polaris every time. Anyone selling this as survival gear is lying.

What it actually offers:

- **A performable skill.** Knowing which way is north in four seconds, or reading
  the time off your hand, is a genuine party trick that also permanently changes how
  you look at the sky.
- **Real redundancy.** Dead battery, no signal, no reception. Sailing schools still
  teach celestial navigation for exactly this reason.
- **Something to do outdoors.** It gives camping a purpose beyond being somewhere
  cold. That is the likeliest way people meet this product.

Sell the competence and the wonder. Do not sell the emergency.

## Scope of the first release

Two skills, complete, end to end:

- **Find north and your latitude from Polaris** (night)
- **Tell the time from the sun** (day)

One of each so that whatever hour someone first opens the app, there is something
they can go outside and do immediately.

Plus the thing that makes both work honestly: **hand calibration**, measuring the
user's own hand against a known angle, because the folk rules are wrong by roughly a
factor of two and vary from person to person.

## Explicit non-goals for the first release

- No account system, no cloud sync, no social features.
- No star chart or augmented-reality overlay. Other apps do that well, and adding
  it here would quietly turn this back into a planetarium.
- No southern-hemisphere skills yet — Sigma Octantis and the Southern Cross are
  specified and deferred, not forgotten.
- No voyage mode yet, though the seam it needs is built and tested from day one.
- No native app in the first phase. The browser prototype comes first.

## Why the browser prototype comes first

You can open it on your phone from a link, with no install and no app store. It also
turns out to be **fully testable in CI**: Playwright can override geolocation and
inject synthetic device-orientation events, so the whole prototype — sensors
included — can be verified headlessly. The native app then reuses `packages/core`
verbatim and re-implements four small adapters.

The prototype is not throwaway work. It is the same product with a different shell.

## Roadmap after the first release

1. Voyage mode, on the seam already built. Cook or Columbus first (northern
   latitude sailing, matching the launch skills); the *James Caird* once the
   southern-sky skills exist, because it deserves to be done properly.
2. More skills: the shadow-stick east–west line; the Big Dipper as a 24-hour star
   clock; the moon's horns as a pointer to the sun; Orion's belt rising due east;
   the Polynesian star compass; latitude sailing; and the longitude problem, which
   is the best story in the entire subject.
3. Native app via Expo, reusing the core unchanged.
