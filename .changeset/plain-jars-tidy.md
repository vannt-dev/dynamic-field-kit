---
---

No release needed. Everything this branch touches is repo tooling that never
reaches a tarball: `files` publishes `dist` alone, and the built `dist` for all
four packages is byte-identical to develop — checked by building both revisions
and diffing the hashes of every shipped file, including angular's `fesm2022`
bundle and `index.d.ts`.

Recorded so the changeset check has an answer, rather than being satisfied by
version bumps that would publish identical tarballs.
