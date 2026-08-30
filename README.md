# North Star

A celestial navigation trainer. The live sky is the exercise generator; your
position and the current time are the answer key.

Planetarium apps show you the sky. This one makes you measure it, then tells you
how wrong you were.

Named for the star the first skill teaches you to find — and for the fact that its
height above your horizon *is* your latitude, which is how people crossed oceans
for centuries.

> Go outside → measure with your hands or the phone → guess → get graded → find out
> what the sky was actually doing.

## Status

Specification and enforced skeleton complete; no implementation yet. Work proceeds
one packet at a time, starting with
[`docs/packets/P1-domain-primitives.md`](./docs/packets/P1-domain-primitives.md).

See `docs/06-build-order.md` for the sequence and the review gate.

## If you are about to write code here

Read **`AGENTS.md` first.** It is short, and every rule in it exists because
breaking it has a known cost. Then read your assigned packet in `docs/packets/`,
and only your packet.

## Documentation

| Document | What it covers |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Standing rules for anyone writing code here |
| [`docs/00-product.md`](./docs/00-product.md) | What this is, and honestly what it is not |
| [`docs/01-architecture.md`](./docs/01-architecture.md) | Layers, ports, and the rules the build enforces |
| [`docs/02-domain-model.md`](./docs/02-domain-model.md) | Domain decisions and why they were made |
| [`docs/03-astronomy.md`](./docs/03-astronomy.md) | The domain knowledge, with measured values |
| [`docs/04-skills.md`](./docs/04-skills.md) | The two launch skills, including teaching copy |
| [`docs/05-testing.md`](./docs/05-testing.md) | How we stop tests from asserting their own output |
| [`docs/06-build-order.md`](./docs/06-build-order.md) | Packet sequence and the review gate |

## Commands

```
npm run verify            # typecheck + lint + architecture guardrails + tests
npm run verify:guardrails # proves the architecture rules still fire
npm run test:coverage     # coverage against the thresholds
```

`npm run verify` is the definition of done. All four stages must pass.

## Layout

```
packages/core/src/domain/          value objects — imports nothing
packages/core/src/application/     use cases and port interfaces
packages/core/src/infrastructure/  adapters; the only home for astronomy-engine
apps/web/                          browser prototype (phase 2)
apps/mobile/                       native app (phase 3)
```
