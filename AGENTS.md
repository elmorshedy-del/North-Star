# Standing rules for anyone — human or AI — writing code in this repository

Read this before your packet. It is short on purpose, and every rule here exists
because breaking it has a specific, known cost.

## The one-paragraph summary

This codebase is built as ports and adapters, with a pure core that never reads a
clock, a sensor, or the network. The architecture is enforced by lint and
typecheck, not by good intentions. You will be given a **work packet** — a single
self-contained document describing one module cluster. Do that packet. Do not do
the next one, do not refactor around it, and do not improve things you were not
asked about.

## Hard rules

1. **Never edit a `*.contract.ts` or `*.port.ts` file.** These are architect-owned.
   They define the shape of the system, and several packets are written against
   each one. If a contract seems wrong or insufficient, **stop and escalate** —
   changing it silently breaks packets you cannot see.

2. **Never edit a test to make it pass.** In an implementation packet, tests are
   the specification. If you believe a test is wrong, stop and escalate, with the
   reasoning. Changing the target to match the arrow is the single most common way
   a codebase like this quietly rots.

3. **Never add an `eslint-disable` comment.** The lint rules in
   `eslint.config.js` are the architecture. A disable comment is an
   undiscussed architectural change. Escalate instead.

4. **Never widen `EphemerisPort`.** If your packet seems to need a new method,
   that is a signal to stop, not to add one. A port wide enough to expose
   everything is the same as having no port.

5. **Never add a runtime dependency** without it being named in your packet.
   `astronomy-engine` is the only one the core is permitted, and only inside
   `packages/core/src/infrastructure/ephemeris/`.

6. **Golden test values must come from an external source.** Every hard-coded
   expected number in a test cites where it came from, in a comment — NOAA, USNO,
   timeanddate.com, or a published almanac. **Generating an expected value by
   running our own code and pasting the output is forbidden.** It proves only that
   the code does what it does. See `docs/05-testing.md`.

7. **Degrees, everywhere.** Radians may exist inside one function and must never
   cross a module boundary. The type system enforces this; do not fight it by
   casting.

## Before you say you are done

Run this, and paste the result into your pull request:

```
npm run audit:self
```

**This is the reviewer's rubric, mechanised.** It checks that your branch carries
the latest `main`, that no architect-owned file was touched, that there are no
`eslint-disable` or `@ts-ignore` escape hatches, that every module with a contract
asserts it, and that tests asserting numbers cite a source — then runs `verify` and
the coverage thresholds.

The review runs exactly these checks. Running them first turns a day-long round
trip into ten seconds in your own terminal, which is the whole point of it existing.

It is mechanical only, and it cannot tell you whether an answer is *right*. That is
what your packet's probe is for. Run that too, and paste its output — a diff that
looks correct is not evidence that it is.

"It works on my branch" is not a status. The command output is.

## When to stop and ask

**First check `docs/07-standing-rulings.md`.** It records decisions already made in
earlier reviews — when to throw versus return a `Result`, where to validate, what
may depend on the environment. If a ruling covers your case, follow it and do not
raise it again.

Otherwise stop and escalate — do not improvise — if any of these happen:

- A contract or port does not have what you need.
- A test fails and you believe the test is wrong.
- A lint rule blocks something you believe is correct.
- The packet is ambiguous about behaviour a user would notice.
- You find a bug outside your packet's scope. Report it; do not fix it.

Escalating costs one message. Guessing costs a rewrite, and usually costs it three
packets later, when the wrong assumption has been built on.

## How to submit your work

One packet, one branch, one pull request. Never two packets in one PR — the review
gate exists to catch a wrong assumption before three packets are built on it, and
a PR spanning two packets defeats it.

1. Branch from `main`, named for the packet: `packet/P1-domain-primitives`.
2. Commit as you go, with messages that say *why*, not just what.
3. Open a pull request titled after the packet: `P1 — Domain primitives`.
4. **Paste the full output of `npm run audit:self` into the PR description**, plus
   your packet's probe output. The command output is the status; "it works on my
   branch" is not.
5. In the PR description, also state:
   - Anything the packet asked you to report (several do — sign conventions,
     external sources for golden values, platform behaviour you could not verify).
   - Anything you were unsure about and decided anyway. This is the most useful
     thing you can write, and it is never held against you.
6. **Do not merge your own pull request.** The architect audits it against the
   rubric in `docs/06-build-order.md` and replies with a numbered list of findings.
   The packet is done when those are resolved, and not before.

If the audit comes back with findings, push fixes to the same branch and reply on
the thread. Do not open a second PR for the same packet.

## Style

Match the surrounding code. Comments explain **why**, never **what** — the code
already says what. The comments in the contract files are the house style: they
record the reasoning that would otherwise be lost, and they are why the next
person does not repeat a solved argument.
