---
---

No release needed. This branch changes how versions are assigned, not what any
package ships: `.changeset/config.json` gains a `linked` group, and the demo
apps and root README stop labelling the enterprise feature set `v1.4+` — a
version it was never released under. `files` publishes `dist` alone, and no
`src` or package README file is touched, so all four tarballs are unchanged.

The next release is the one that acts on it: core goes 1.3.0 -> 1.5.0 and the
three adapters 1.4.0 -> 1.5.0, so the four packages share a version line from
then on. core never publishes a 1.4.0; the gap is the cost of closing the skew,
and `^1.3.0` consumers pick up 1.5.0 the usual way.
