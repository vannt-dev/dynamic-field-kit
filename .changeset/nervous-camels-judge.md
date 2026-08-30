---
---

No release needed. eslint and its plugins are devDependencies; `files` publishes
`dist` alone, and the built `dist` for all four packages is byte-identical to
the previous commit — including the vue bundle, since the stale
`/* eslint-disable import/order */` this branch deletes is a comment tsup
strips anyway.
