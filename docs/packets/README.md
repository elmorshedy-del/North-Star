# Work packets

One packet, one implementer, one sitting.

Each packet is **self-contained**. It restates every interface it needs rather than
sending you to another document, because attention spent reconstructing context is
attention not spent on the problem. If a packet sends you hunting through the
repository to understand what to build, that is a defect in the packet — say so.

## Rules that apply to every packet

1. Read `AGENTS.md` first. It is 80 lines and it is not optional.
2. Do **only** your packet. Do not read ahead, work ahead, or tidy things you were
   not asked to touch.
3. Never edit a `*.contract.ts` or `*.port.ts` file.
4. Never edit a test to make it pass.
5. Never add an `eslint-disable`.
6. Finish with `npm run audit:self` and paste the output. It is the reviewer's
   rubric run against your own branch — contracts untouched, no escape hatches,
   contract assertions present, golden values cited, verify and coverage green.
7. Also run your packet's probe and paste that output. The self-audit proves the
   mechanics; the probe is the only thing that proves the answers.
8. Follow `docs/07-standing-rulings.md` rather than re-asking a settled question.

## Start from the latest `main`

`git fetch origin && git checkout -b packet/PN-name origin/main`.

A branch cut from a stale `main` can pass every check on its own and still be wrong
about what lands, because the checks it ran are not the checks the merged result
runs. Before asking for review, merge `main` in and re-run `npm run audit:self` on
the result — it fails outright if your branch is behind.

## Escalate rather than guess

Stop and ask if a contract lacks what you need, a test looks wrong, a lint rule
blocks something you believe is correct, or the packet is ambiguous about behaviour
a user would notice.

Escalating costs one message. Guessing costs a rewrite — usually three packets
later, once the wrong assumption has been built on.

## Sequence

Phase 1 (core): P1 → P2 → P3 → P4 → P5 → P6 → P7
Phase 2 (browser prototype): P8 → P9 → P10 → P11 → P12

Dependencies and the review gate are in `docs/06-build-order.md`.
