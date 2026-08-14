---
---

No release needed for core, react or vue. Everything this branch changed in
them is tooling that never ships: `packages/core` swapped devDependencies and
`vitest.config.js` moving from vitest 0.34 to 1.6, and core and vue each lost a
stale `eslint-disable` comment during the eslint 9 migration. `files` publishes
`dist` alone, and the built `dist` for all three is byte-identical to develop —
checked by building both revisions and diffing.

Recorded so the changeset check has an answer for them, rather than being
satisfied by version bumps that would publish identical tarballs. Only
`@dynamic-field-kit/angular` genuinely changed what it ships, and it has its own
changeset.
