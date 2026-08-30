# 07 — Standing rulings

Decisions already made, binding on every packet. They came out of real review
rounds, and they are recorded here so nobody spends a round trip re-deriving them.

**If your situation matches one of these, follow it — do not escalate it again.**
Escalate only what is genuinely not covered.

---

## R1. Non-finite numeric input is programmer error — throw

`NaN` and `Infinity` reaching a constructor mean a bug at the call site, not
something a user did. Throw, with a message naming the value.

This is the one place exceptions are correct. Everything else uses `Result`.

## R2. Anything the world can cause is a `Result`, not an exception

A denied permission, a star that never rises at this latitude, a sun that does not
set in June, a latitude out of range: all ordinary outcomes. Model them.

The test: *could this happen to a careful user on a working device?* If yes, it is
a `Result`. At high latitudes "the sun does not rise today" is not an error, it is
Tuesday.

## R3. Validate where the bad value enters, not where it detonates

Reject at construction. A `NaN` that passes a constructor and throws three calls
later produces a stack trace that says nothing about where it came from — this
exact defect shipped in P1's first round via `geoPosition` accepting a non-finite
elevation and crashing later inside `horizonDip`.

Corollary: if a constructor can cheaply prove a value is usable, it should. `timeZone`
probes `Intl` at construction rather than letting an invalid id surface as a
`RangeError` somewhere unrelated.

## R4. Nothing may depend on the ambient environment

No `Date.now()`, no implicit time zone, no host locale, no `Math.random()`. Lint
catches the obvious forms; the subtle ones are yours to avoid.

The one that got through P1: `Date.parse('2026-06-21T12:00:00')` — a timestamp with
no offset is read as **host-local time**, so the same string means different
instants on different machines. Timestamps must carry `Z` or `±hh:mm`.

Ask of any parse, format, sort or comparison: *would this produce a different
answer on a machine in Tokyo?* If yes, it is wrong.

## R5. Prefer strict when it removes a rule the reader must otherwise know

P1 rejected date-only strings as well as offset-less ones. Date-only forms happen
to parse as UTC, so accepting them would have been defensible — but then everyone
touching the code has to know that exception. Rejecting them means the rule is
simply "timestamps carry an offset".

Fewer rules beats more permissiveness.

## R6. Clamp instead of throwing when the input is real but the model is not

`horizonDip` clamps below-sea-level elevations to zero: the dip formula assumes a
sea horizon, and Death Valley is a real place. Throwing would turn a valid
position into a crash.

This is not licence to swallow bad input — R1 and R3 still hold. It applies when
the value is legitimate and only the *model* has no meaning there. Say so in a
comment.

## R7. Memoise expensive platform constructors

`Intl.DateTimeFormat` is costly to construct and cheap to reuse. Cache per key at
module level. The same applies to any adapter-level object built from a fixed
configuration.

## R8. Import style

`.ts` suffix on every relative import, type and value alike.
`allowImportingTsExtensions` is enabled precisely so there is one style.

## R9. No enums

`erasableSyntaxOnly` is on. Use unions of string literals.

## R10. Escalate in writing, in the branch

When a packet leaves a behaviour unspecified and you have to choose, record it in
`docs/packets/PN-architect-review.md` on your branch: what you chose, why, where to
look, and what you want confirmed.

This is not bureaucracy — it is the single practice that has most reduced review
rounds. It converts an invisible assumption into a decision someone can accept or
reject in one line, and it is why P1 closed in one round rather than three.

---

## Adding to this file

Architect only. When a review settles something that will recur, it belongs here
rather than in a single packet, so the next packet inherits the answer instead of
the argument.
