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
6. Finish with `npm run verify` and paste the output.

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
