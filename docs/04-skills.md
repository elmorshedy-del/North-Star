# 04 — The two launch skills, specified

Two skills ship in the first slice: one for the night, one for the day. That
pairing is deliberate — whatever hour someone first opens the app, there is
something they can actually go outside and do. An app that says "come back after
dark" on first launch has lost most of its users before it taught them anything.

Teaching content below is **data**, not prose to be rewritten in components. It is
transcribed into the `TeachingScript` structure defined in `skill.contract.ts`.
Copy may be tightened during implementation; the *facts* may not be changed.

---

## Skill A — Find north, and your latitude, from Polaris

**id** `polaris-latitude` · **time of day** night · **prerequisites** none
**estimate kind** `angle` · **methods** `hand-span`, `device-sight`

### Availability gates

Checked in order; the first failure is the one reported.

| Condition | Reason shown to the user | `availableAt` |
|---|---|---|
| Latitude ≤ 0° | "Polaris sits below your horizon south of the equator. This one needs the northern hemisphere — the southern sky has its own pole star, and that skill is coming." | `null` |
| Sun altitude > −12° | "It is not dark enough yet. Polaris is up there, but you need nautical twilight before the stars come out properly." | next time the sun reaches −12° |
| Polaris apparent altitude < 10° | "You are far enough south that Polaris skims your horizon, where haze swallows it. This one needs you further north." | `null` |

Never hide an unavailable skill. "Polaris is below your horizon — you are too far
south for this one" teaches something real about the shape of the sky; a missing
tile teaches nothing.

### Grading

`GradeScale { unit: 'degrees', bullseye: 1, close: 3, fair: 5 }`

The truth is the observer's **latitude**, which is by definition the altitude of the
true celestial pole. The learner measures *Polaris*, which is up to 0.71° away from
it (see `docs/03-astronomy.md` §3) — so a perfect measurement of Polaris still
carries that offset. The app must therefore:

1. grade against true latitude, and
2. **show the pole correction explicitly** in the result. A learner who measured
   Polaris flawlessly and lands 0.6° out deserves to be told why, not marked down
   without explanation.

Feedback should name the error in body units the learner can feel: 1° is about a
little-finger width; 2° is roughly a finger.

### Teaching script

**Why:** "Every star in the sky wheels overhead through the night except one.
Polaris sits almost exactly above the North Pole, so it barely moves — and its
height above your horizon *is* your latitude. Sailors crossed oceans on that one
fact for centuries. It takes about ten seconds once you know it."

**Steps:**

1. **Find the Plough.** "Seven bright stars, shaped like a saucepan. High in the
   north for most of the year. If it is low or hidden, use Cassiopeia instead — a
   big W on the opposite side of Polaris — and Polaris sits between them."
2. **Use the pointers.** "The two stars forming the front edge of the pan, away
   from the handle, are Merak and Dubhe. Draw a line from Merak through Dubhe and
   keep going about five times that gap. You land on Polaris."
3. **Check you have the right star.** "Polaris is not especially bright — that is
   the commonest surprise. What confirms it is that it does not move. Everything
   around it turns; it does not."
4. **Measure its height.** "Stack your fists from the horizon up to Polaris,
   counting as you go, arm straight. Or hold the phone edge-on, sight along it, and
   let it read the angle."
5. **Read your latitude.** "That angle is your latitude, within a degree. You have
   just fixed your position on Earth using one star and no instruments."

**Common mistakes:**

- "Bending your arm. It shortens the distance to your hand and inflates every
  angle. Lock the elbow."
- "Measuring from the treeline or the rooftops rather than the true horizon.
  Anything in the way makes you read high."
- "Assuming Polaris is the brightest star in the sky. It is not — it is about the
  48th."
- "Grabbing the wrong end of the Plough. The pointers are the edge furthest from
  the handle."

---

## Skill B — Tell the time from the sun

**id** `sun-time` · **time of day** day · **prerequisites** none
**estimate kind** `instant` · **methods** `hand-span`, `device-sight`,
`direct-entry`

### Safety

**Required, non-skippable, shown before any measurement:**

"Never look directly at the sun, and never sight along the phone straight at it.
Judge its height by the shadow you cast, or glance only at the sky beside it. Eyes
do not heal from this."

Any UI that presents this skill must render `teach.safety` prominently. This is not
a formality.

### Availability gates

| Condition | Reason shown to the user | `availableAt` |
|---|---|---|
| Sun altitude < 5° | "The sun is too low to measure — below about five degrees, refraction and haze make it unreliable. Try again once it has climbed." | next time the sun reaches +5° |

### Grading

`GradeScale { unit: 'minutes', bullseye: 10, close: 20, fair: 40 }`

The truth is the **civil clock time** at the observer's location — what their phone
would say. That is the honest target, because it is the answer a person actually
wants, and it forces the app to confront the solar-versus-clock gap rather than
quietly grading against solar time and calling it a win.

The sun moves 15° per hour, so 1° of altitude error is roughly 4 minutes near the
horizon — and far more near noon, where altitude changes slowly and the method
degrades. Feedback must be honest about that: close to midday, altitude is a poor
clock, and the learner should be told so rather than blamed for a bad reading.

### The result screen carries the payoff

After grading, show the breakdown between solar and clock time — equation of time,
longitude offset within the zone, and DST, as three named contributions summing to
the total gap (see `docs/03-astronomy.md` §6). Madrid on the June solstice reaches
solar noon at 14:16 local; London on 3 November reaches it at 11:43.

This is the most memorable thing in the product, and it is a by-product of grading
honestly against clock time.

### Teaching script

**Why:** "Before clocks, the sun *was* the clock. You can still read it to within
about a quarter of an hour with nothing but your hands — and doing it once teaches
you something no watch will: your clock and the sky disagree, sometimes by more
than an hour, and there are three separate reasons why."

**Steps:**

1. **Find the sun without looking at it.** "Stand with your back to it and look at
   your shadow, or hold a hand up to block it. Never look straight at it."
2. **Judge its height.** "Stack fists from the horizon up to the sun — arm straight,
   eyes on your hands, not on the sun."
3. **Note whether it is climbing or falling.** "Morning and afternoon give the same
   height. Which side of noon you are on is yours to know, not the sun's to tell."
4. **Convert.** "The sun covers 15 degrees an hour — about one and a half fists.
   Count from its highest point and you have your hours from noon."
5. **Mind the gap.** "Solar noon is not clock noon. The app will show you how far
   apart they are today, where you are — the answer is often surprising."

**Common mistakes:**

- "Forgetting whether it is morning or afternoon. The sun's height alone cannot
  tell you; it is the same on both sides of noon."
- "Measuring near midday, when the sun's height barely changes and small errors
  become large ones in time."
- "Expecting the sun to be highest at twelve. It rarely is, and near a time-zone
  edge in summer it can be well over an hour out."
- "Measuring from a false horizon — a hillside or roofline reads high."

---

## What the home screen does with this

`availableNow` returns **every** skill with its availability, not just the possible
ones. The home screen shows what can be done now, and — beneath it, quieter — what
the sky is currently withholding and when it returns. That framing turns a refusal
into a reason to come back after dark, which is the behaviour this product wants.
