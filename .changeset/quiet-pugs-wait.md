---
---

No release needed. `packages/core` changed only its devDependencies and
`vitest.config.js` when it moved from vitest 0.34 to 1.6 — neither ships, since
`files` publishes `dist` alone, and the built output is unaffected. Recorded so
the changeset check has an answer for core rather than being satisfied by a
version bump that would publish an identical tarball.
